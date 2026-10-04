import {startNavigationSummaryPreview} from './navigation-summary-fixture.js';

// This demo runs the production loader. ElevenLabs responses are local fixtures;
// entering a key here never contacts ElevenLabs and cannot spend real quota.
export async function startVoicePreview(){
    async function waitFor(predicate){const until=Date.now()+15000;while(!predicate()){if(Date.now()>until)throw Error('Voice preview setup timed out');await new Promise(resolve=>setTimeout(resolve,20));}}
    const original=window.fetch.bind(window),calls=[],sounds=[],quota={used:1800,limit:30000},speech='[whispers] ทางเดินข้างหน้ามืดมาก ระวังด้วยนะคะ';
    const NativeAudio=window.Audio;window.Audio=function(...args){const sound=new NativeAudio(...args);sounds.push(sound);return sound;};
    const previewUrl=URL.createObjectURL(new Blob([wav(1)],{type:'audio/wav'}));
    const voices=[{voice_id:'demo-cora',name:'Cora · Soft & Clear',labels:{gender:'female',accent:'neutral'},preview_url:previewUrl},
        {voice_id:'demo-garrick',name:'Garrick · Warm & Steady',labels:{gender:'male',accent:'British'},preview_url:previewUrl}];
    const shared={voice_id:'demo-library',public_owner_id:'demo-owner',name:'Mira · Calm storyteller',language:'English',gender:'female',preview_url:previewUrl};
    let waitSpeech=null,failQuota=false;
    function wav(seconds=5){
        const size=8000*seconds,buffer=new ArrayBuffer(44+size*2),view=new DataView(buffer),word=(offset,value)=>[...value].forEach((letter,index)=>view.setUint8(offset+index,letter.charCodeAt(0)));
        word(0,'RIFF');view.setUint32(4,36+size*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,size*2,true);
        // Quiet tone only, not a simulated ElevenLabs voice.
        for(let i=0;i<size;i++)view.setInt16(44+i*2,Math.sin(i/8000*Math.PI*440)*350,true);return buffer;
    }
    window.fetch=async(input,options={})=>{
        const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
        if(url.hostname==='example.invalid')return new Response(wav(1),{headers:{'content-type':'audio/wav'}});
        if(url.origin!=='https://api.elevenlabs.io')return original(input,options);
        calls.push({path:url.pathname,query:url.search,method:options.method||'GET',body:options.body?JSON.parse(options.body):null,headers:options.headers});
        if(url.pathname==='/v2/voices')return Response.json({voices,has_more:false});
        if(url.pathname==='/v1/user/subscription')return failQuota?Response.json({detail:{message:'Usage permission denied'}},{status:403}):Response.json({tier:'starter',character_count:quota.used,character_limit:quota.limit,next_character_count_reset_unix:Math.floor(Date.now()/1000)+20*86400});
        if(url.pathname==='/v1/shared-voices')return Response.json({voices:[shared],has_more:false});
        if(url.pathname.startsWith('/v1/voices/add/')){if(!voices.some(v=>v.voice_id===shared.voice_id))voices.push(shared);return Response.json({voice_id:shared.voice_id});}
        if(url.pathname==='/v1/text-to-dialogue'){
            if(waitSpeech)await new Promise((resolve,reject)=>{waitSpeech.resolve=resolve;const abort=()=>reject(new DOMException('Aborted','AbortError'));options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();});
            const body=JSON.parse(options.body);quota.used+=body.inputs.reduce((sum,turn)=>sum+turn.text.length,0);return new Response(wav(),{headers:{'content-type':'audio/wav'}});
        }
        return Response.json({detail:'Unexpected demo endpoint'},{status:404});
    };
    await startNavigationSummaryPreview({enableMemorySummaries:false,chatPresentation:true});
    await waitFor(()=>document.querySelector('[data-optional-setting="enableVoiceAddon"]')&&document.querySelector('[data-voice-panel]'));
    document.querySelector('#tretaresia-rpg-close')?.click();
    const local=window.host.chatMetadata.tretaresia_rpg_state;
    local.npcs ||= [];if(!local.npcs.some(npc=>npc.id==='garrick'))local.npcs.push({id:'garrick',name:'Garrick',gender:'male',aliases:['Garrick Oak'],npcScope:'chat',met:true,title:'Innkeeper',occupation:'Merchant',race:'Human',relationship:'Acquaintance',identityColor:'#aaa',location:'Oakland Inn'});
    const cora=local.npcs.find(n=>n.name==='Cora');if(cora)cora.gender='female';
    const story='<tr-header name="Cora"/><tr-narrative>คอร่าหยุดตรงประตู ก่อนหันกลับมาพูดกับคุณเบา ๆ</tr-narrative><tr-dialogue name="Cora" delivery="whispers">'+speech.replace('[whispers] ','')+'</tr-dialogue><tr-header name="Garrick"/><tr-dialogue name="Garrick" delivery="warmly">ห้องพักพร้อมแล้วครับ พรุ่งนี้เช้าข้าจะเตรียมอาหารไว้ให้</tr-dialogue>';
    window.host.chat=[{name:'Nova',is_user:true,mes:'ฉันเดินตามคอร่าไปดูห้องพัก'},{name:'Narrator',is_user:false,mes:story,swipe_id:0,swipes:[story]}];
    const chat=document.querySelector('#chat');chat.replaceChildren(...window.host.chat.map((message,id)=>{const row=document.createElement('article');row.className='mes';row.setAttribute('mesid',id);const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes;row.append(text);return row;}));
    await window.host.eventSource.emit('CHARACTER_MESSAGE_RENDERED',1);
    document.querySelector('#preview-summarize').onclick=async()=>{window.navigationSummaryPreview.openSettings();const toggle=document.querySelector('[data-optional-setting="enableVoiceAddon"]');if(!toggle.checked)toggle.click();document.querySelector('#roleforge-voice-addons>details').open=true;document.querySelector('#roleforge-voice-addons').scrollIntoView();};
    window.voicePreview={calls,sounds,voices,quota,ready:false,story,
        finishAudio(){sounds.at(-1)?.dispatchEvent(new Event('ended'));},
        holdSpeech(){waitSpeech={};},releaseSpeech(){waitSpeech?.resolve?.();waitSpeech=null;},
        failQuota(value){failQuota=value;},
        async enable(){const toggle=document.querySelector('[data-optional-setting="enableVoiceAddon"]');if(toggle&&!toggle.checked)toggle.click();},
        async connect(){const panel=document.querySelector('[data-voice-panel]');panel.querySelector('[name="key"]').value='sk_demo-not-a-real-key';panel.querySelector('[data-voice-connect]').requestSubmit();await waitFor(()=>document.querySelector('[data-voice-connection]')?.textContent==='เชื่อมแล้ว');},
    };
    document.querySelector('#preview-status').textContent='Voice Addon · ตัวอย่าง UI จริง / เสียงตัวอย่างเป็นโทนสั้นในเครื่อง';
    if(new URLSearchParams(location.search).get('connected')==='1'){
        await window.voicePreview.enable();await window.voicePreview.connect();
        for(const [name,value]of [['default','demo-cora'],['male','demo-garrick'],['female','demo-cora'],['narrator','demo-garrick']]){const select=document.querySelector(`[data-voice-panel] [name="${name}"]`);select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    window.voicePreview.ready=true;
}
