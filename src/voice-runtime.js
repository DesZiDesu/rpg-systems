import {normalizeVoiceSettings,splitSpeech,voiceCacheKey,assignedVoice} from './voice-core.js?v=0.62.0';
import {isMp3Blob} from './voice-download.js?v=0.62.0';

export function createVoiceRuntime({settings,storage,client,changed=()=>{},notify=()=>{},audio:makeAudio=()=>new Audio(),url=globalThis.URL}={}) {
    let credential='',connectionTicket=0,playTicket=0,connectionController,controller,player,releasePlayer,unlockedPlayer;
    let restored='',lowWarning='',quotaTicket=0,testTicket=0;
    const state={connected:false,connecting:false,error:'',voices:[],quota:null,quotaError:'',phase:'idle',currentId:'',queue:false,previewId:'',testClip:null};
    const emit=()=>changed(state);
    const th=()=>settings().language==='th';
    const say=(en,thai)=>th()?thai:en;
    function stop(){
        playTicket++;controller?.abort();controller=null;
        player?.pause();if(unlockedPlayer&&unlockedPlayer!==player)unlockedPlayer.pause();releasePlayer?.();player=null;releasePlayer=null;
        Object.assign(state,{phase:'idle',currentId:'',queue:false,previewId:''});emit();
    }
    const hasKey=()=>Boolean(credential);
    function clearTest(){testTicket++;state.testClip=null;if(state.currentId==='voice-test')stop();else emit();}
    const selectedVoice=entry=>assignedVoice(settings(),entry);
    async function quota(){
        const ticket=connectionTicket,read=++quotaTicket;
        try{const result=await client.quota(connectionController?.signal);if(ticket!==connectionTicket||read!==quotaTicket||!settings().enableVoiceAddon)return;
            state.quota=result;state.quotaError='';
            const warning=`${settings().voiceVaultId}:${result.resetAt}`;
            if(result.percent!==null&&result.percent<=10&&lowWarning!==warning){lowWarning=warning;notify('warning',say('ElevenLabs quota is below 10%.','โควตา ElevenLabs เหลือต่ำกว่า 10%'));}
        }catch(error){if(ticket!==connectionTicket||read!==quotaTicket||error.name==='AbortError')return;state.quotaError=error.message;}
        emit();
    }
    async function connect(value,{remember=false,restore=false}={}) {
        if(!settings().enableVoiceAddon)return false;
        value=String(value||'').trim();if(!value)return false;
        stop();connectionController?.abort();connectionController=new AbortController();
        const ticket=++connectionTicket,config=normalizeVoiceSettings(settings()),priorId=config.voiceVaultId;
        const createId=()=>globalThis.crypto?.randomUUID?.()||`voice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const namespace=(!restore&&value!==credential)?createId():priorId||createId();
        credential=value;Object.assign(state,{connecting:true,connected:false,error:'',quota:null,quotaError:'',voices:[]});emit();
        const results=await Promise.allSettled([client.voices(connectionController.signal),client.quota(connectionController.signal)]);
        if(ticket!==connectionTicket||!config.enableVoiceAddon)return false;
        if(results[0].status==='rejected'){
            state.error=results[0].reason.message;state.connecting=false;credential='';restored=priorId;emit();notify('error',state.error);return false;
        }
        let remembered=false;
        try{
            remembered=Boolean(remember&&await storage.saveKey(namespace,value));
        }catch{if(ticket===connectionTicket)notify('warning',say('Key connected for this session; local key storage is unavailable.','เชื่อม key สำหรับรอบนี้แล้ว แต่บันทึก key ในเครื่องไม่ได้'));}
        if(ticket!==connectionTicket||!config.enableVoiceAddon){if(remembered)await storage.forgetKey(namespace);return false;}
        config.voiceVaultId=namespace;config.voiceRememberKey=remembered;
        config.voiceCacheId ||= namespace;
        if(priorId&&(!remembered||priorId!==namespace))await storage.forgetKey(priorId).catch(()=>{});
        if(ticket!==connectionTicket)return false;
        state.voices=results[0].value;state.connected=true;state.connecting=false;
        if(results[1].status==='fulfilled'){state.quota=results[1].value;state.quotaError='';}else state.quotaError=results[1].reason.message;
        if(state.quota?.percent!==null&&state.quota?.percent<=10){lowWarning=`${namespace}:${state.quota.resetAt}`;notify('warning',say('ElevenLabs quota is below 10%.','โควตา ElevenLabs เหลือต่ำกว่า 10%'));}
        restored=namespace;emit();return true;
    }
    async function refreshVoices(){
        if(!settings().enableVoiceAddon||!state.connected)return;
        const ticket=connectionTicket;
        try{const voices=await client.voices(connectionController.signal);if(ticket!==connectionTicket)return;state.voices=voices;state.error='';emit();}
        catch(error){if(error.name!=='AbortError'){state.error=error.message;notify('error',error.message);emit();}}
    }
    function disconnect({forget=false}={}) {
        stop();clearTest();connectionTicket++;connectionController?.abort();credential='';
        restored='';
        Object.assign(state,{connected:false,connecting:false,error:'',voices:[],quota:null,quotaError:''});
        if(forget){settings().voiceRememberKey=false;void storage.forgetKey(settings().voiceVaultId).catch(()=>{});}
        emit();
    }
    async function update(){
        const config=normalizeVoiceSettings(settings());
        if(!config.enableVoiceAddon){if(state.connected||state.connecting||state.phase!=='idle')disconnect();return;}
        if(!credential&&config.voiceRememberKey&&config.voiceVaultId&&restored!==config.voiceVaultId){
            const namespace=config.voiceVaultId;restored=namespace;
            const key=await storage.readKey(namespace);
            if(key&&settings().enableVoiceAddon&&settings().voiceVaultId===namespace)await connect(key,{remember:true,restore:true});
        }
    }
    // Call during the actual click/submit gesture, before any account or TTS
    // awaits. Safari grants playback permission per element; reuse that element.
    function activate(){
        if(unlockedPlayer)return;
        unlockedPlayer=makeAudio();
        const data=new ArrayBuffer(204),view=new DataView(data),word=(offset,value)=>[...value].forEach((char,i)=>view.setUint8(offset+i,char.charCodeAt(0)));
        word(0,'RIFF');view.setUint32(4,196,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,160,true);
        const source=url.createObjectURL(new Blob([data],{type:'audio/wav'})),sound=unlockedPlayer;sound.src=source;
        const finish=()=>{if(sound.src===source){sound.pause();sound.removeAttribute?.('src');}url.revokeObjectURL(source);};
        try{Promise.resolve(sound.play()).then(finish,finish);}catch{finish();}
    }
    function playSource(source,ticket,owned=false){
        return new Promise((resolve,reject)=>{
            if(ticket!==playTicket){if(owned)url.revokeObjectURL(source);resolve();return;}
            const sound=unlockedPlayer||makeAudio();let finished=false;
            player=sound;sound.preload='auto';sound.src=source;sound.playbackRate=settings().voiceSpeed||1;
            const finish=error=>{if(finished)return;finished=true;sound.pause();sound.removeAttribute?.('src');if(owned)url.revokeObjectURL(source);
                if(player===sound){player=null;releasePlayer=null;}if(error)reject(error);else resolve();};
            releasePlayer=()=>finish();sound.onended=()=>finish();sound.onerror=()=>finish(new Error(say('Audio could not play. Try again.','เล่นเสียงไม่สำเร็จ ลองกดฟังอีกครั้ง')));
            state.phase='playing';emit();
            Promise.resolve(sound.play()).catch(()=>finish(new Error(say('Tap Play to allow audio playback in this browser.','เบราว์เซอร์ยังไม่อนุญาตเสียง กรุณากดฟังด้วยตัวเอง'))));
        });
    }
    const playBlob=(blob,ticket)=>playSource(url.createObjectURL(blob),ticket,true);
    async function listen(entries,{queue=false,captureTest=false}={}) {
        const config=settings();if(!config.enableVoiceAddon)return;
        if(!state.connected){notify('warning',say('Connect ElevenLabs in Voice Addon settings first.','เชื่อม ElevenLabs ในตั้งค่า Voice Addon ก่อน'));return;}
        const items=entries.map(entry=>({...entry,voice:selectedVoice(entry)}));
        if(items.some(entry=>!entry.voice)){notify('warning',say('Choose a voice for this NPC or a default voice first.','เลือกเสียงให้ NPC หรือเสียงสำรองก่อน'));return;}
        if(items.some(entry=>!state.voices.some(voice=>voice.voice_id===entry.voice))){notify('warning',say('The selected voice is not in My Voices. Refresh or choose another voice.','เสียงที่เลือกไม่อยู่ใน My Voices กรุณารีเฟรชหรือเลือกเสียงใหม่'));return;}
        stop();const ticket=playTicket,exportTicket=testTicket,namespace=config.voiceCacheId||config.voiceVaultId,model=config.voiceModel;
        const voiceNames=new Map(state.voices.map(voice=>[voice.voice_id,voice.name]));state.error='';
        controller=new AbortController();const signal=controller.signal;state.queue=queue;emit();
        try{
            for(const item of items){
                if(ticket!==playTicket||!config.enableVoiceAddon||item.valid?.()===false)break;
                state.currentId=item.id;
                // The test form is bounded to 2,000 characters and requests one
                // complete MP3, not concatenated independently encoded chunks.
                for(const text of captureTest?[item.text]:splitSpeech(item.text)){
                    if(ticket!==playTicket||item.valid?.()===false)break;
                    const key=voiceCacheKey(namespace,model,item.voice,text);state.phase='loading';emit();
                    let blob=await storage.audio(key);
                    if(captureTest&&blob&&!await isMp3Blob(blob))blob=null;
                    if(ticket!==playTicket||item.valid?.()===false)break;
                    if(!blob){
                        blob=await client.speech(text,item.voice,model,signal);
                        if(captureTest&&!await isMp3Blob(blob))throw Error(say('The provider did not return an MP3. Generate the test again.','ผู้ให้บริการไม่ได้ส่ง MP3 กรุณาสร้างเสียงทดลองใหม่'));
                        await storage.saveAudio(key,blob);void quota();
                    }
                    if(ticket!==playTicket||item.valid?.()===false)break;
                    if(captureTest){
                        if(ticket!==playTicket||exportTicket!==testTicket||!config.enableVoiceAddon)break;
                        state.testClip={blob:new Blob([blob],{type:'audio/mpeg'}),voiceId:item.voice,voiceName:voiceNames.get(item.voice)||item.voice,model,text,createdAt:Date.now()};emit();
                    }
                    await playBlob(blob,ticket);
                }
            }
        }catch(error){if(ticket===playTicket&&error.name!=='AbortError'){state.error=error.message;notify('error',error.message);}}
        finally{if(ticket===playTicket){controller=null;Object.assign(state,{phase:'idle',currentId:'',queue:false});emit();}}
    }
    async function generateTest(value){
        const text=String(value??'').trim();
        if(!text || Array.from(text).length>2000){notify('warning',say('Enter a test dialogue of 1–2,000 characters.','ใส่บทพูดทดลอง 1–2,000 ตัวอักษรก่อน'));return;}
        return listen([{id:'voice-test',speakerKey:'',text}],{captureTest:true});
    }
    async function toggle(entry){
        if(state.currentId!==entry.id)return listen([entry]);
        if(state.phase==='loading'){stop();return;}
        if(state.phase==='playing'){player?.pause();state.phase='paused';emit();return;}
        if(state.phase==='paused'&&player){try{await player.play();state.phase='playing';emit();}catch{stop();notify('warning',say('Tap Play again to allow audio.','กดฟังอีกครั้งเพื่ออนุญาตเสียง'));}}
    }
    async function preview(voice){
        if(!settings().enableVoiceAddon||!voice.preview_url)return;
        let source;try{source=new URL(voice.preview_url);if(source.protocol!=='https:'&&!(source.protocol==='blob:'&&source.origin===globalThis.location?.origin))return;}catch{return;}
        stop();const ticket=playTicket;state.previewId=voice.voice_id;state.phase='loading';emit();controller=new AbortController();
        try{
            // Native media playback needs no fetch CORS permission. Preview URLs
            // never receive the API key; the provider owns their existing audio.
            if(ticket===playTicket)await playSource(source.href,ticket);
        }catch(error){if(ticket===playTicket&&error.name!=='AbortError')notify('error',error.message);}
        finally{if(ticket===playTicket)stop();}
    }
    return {state,key:()=>credential,hasKey,connect,disconnect,update,refreshVoices,quota,selectedVoice,listen,toggle,stop,preview,activate,generateTest,clearTest,
        setSpeed(value){settings().voiceSpeed=value;if(player)player.playbackRate=value;},destroy(){disconnect();}};
}
