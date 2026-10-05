import {subscriptionQuota} from './voice-core.js?v=0.58.5';

const origin='https://api.elevenlabs.io';
export function createElevenLabsClient({key,fetch:request=globalThis.fetch,notice=()=>{},language=()=> 'en'}={}) {
    async function call(path,{method='GET',body,signal,audio=false,label='ElevenLabs'}={}) {
        const credential=key();if(!credential)throw new Error(language()==='th'?'กรุณาเชื่อม ElevenLabs API key ก่อน':'Connect an ElevenLabs API key first');
        notice(audio?'voiceSpeech':'voiceAccount',label);
        let response;
        try{response=await request(origin+path,{method,headers:{'xi-api-key':credential,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal,credentials:'omit',referrerPolicy:'no-referrer'});}
        catch(error){if(error.name==='AbortError')throw error;throw new Error(language()==='th'?'เชื่อมต่อ ElevenLabs ไม่สำเร็จ ตรวจเครือข่ายแล้วลองใหม่':'Could not reach ElevenLabs. Check your connection and retry.');}
        if(!response.ok){
            let detail='';try{const value=await response.json();detail=typeof value.detail==='string'?value.detail:value.detail?.message||'';}catch{/* No provider JSON. */}
            const th=language()==='th';
            const labels={401:th?'API key ไม่ถูกต้องหรือหมดอายุ':'Invalid or expired API key',403:th?'บัญชีหรือ API key ไม่มีสิทธิ์ใช้งานนี้':'This account or API key does not permit this operation',429:th?'โควตาหรือจำนวนคำขอถึงขีดจำกัด กรุณาตรวจบัญชี':'Quota or request limit reached. Check your account'};
            const safe=String(detail).split(credential).join('[key]').replace(/[<>]/g,'').slice(0,240);
            throw new Error(`ElevenLabs ${response.status}: ${labels[response.status]||safe||(th?'คำขอไม่สำเร็จ':'Request failed')}`);
        }
        if(audio){const blob=await response.blob();if(!blob.size)throw new Error('ElevenLabs returned empty audio');return blob;}
        return response.json();
    }
    async function voices(signal){
        const results=[],seen=new Set();let token='';
        while(true){
            const params=new URLSearchParams({page_size:'100',include_total_count:'false'});if(token)params.set('next_page_token',token);
            const data=await call('/v2/voices?'+params,{signal,label:'My Voices'});results.push(...(data.voices||[]));
            if(!data.has_more||!data.next_page_token||seen.has(data.next_page_token))break;token=data.next_page_token;seen.add(token);
        }return results;
    }
    return {voices,
        quota:async signal=>subscriptionQuota(await call('/v1/user/subscription',{signal,label:'Usage'})),
        library:(search='',page=0,signal,customRates=false)=>call('/v1/shared-voices?'+new URLSearchParams({page_size:'20',search,page:String(page),include_custom_rates:String(customRates)}),{signal,label:'Voice Library'}),
        addVoice:(voice,signal)=>call(`/v1/voices/add/${encodeURIComponent(voice.public_owner_id)}/${encodeURIComponent(voice.voice_id)}`,{method:'POST',body:{new_name:voice.name},signal,label:'Add library voice'}),
        speech:(text,voiceId,model,signal)=>call('/v1/text-to-dialogue?output_format=mp3_44100_128',{method:'POST',body:{model_id:model,inputs:[{text,voice_id:voiceId}]},signal,audio:true,label:'Dialogue'}),
    };
}
