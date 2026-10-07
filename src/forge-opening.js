// Opening generation is a normal story request, with a transient user instruction.
// It must not create a synthetic player chat turn or alter connection settings.
export const FORGE_OPENING_PROMPT_KEY='tretaresia_rpg_forge_opening';
export const FORGE_OPENING_USER_PROMPT='Write the first RoleForge role-play scene using the registered player profile and opening scene (fields.fScene). Start with a normal assistant story reply, leave the player a choice, and do not show a registration form or confirmation.';

const messageText=message=>typeof message?.content==='string'?message.content:Array.isArray(message?.content)?message.content.filter(part=>part?.type==='text').map(part=>part.text||'').join('\n'):'';
const emptyMessage=message=>{
    if(!message||typeof message!=='object')return true;
    // Retain tool calls, signatures, media and other opaque host metadata.
    if(Object.keys(message).some(key=>!['role','content','name'].includes(key)))return false;
    if(Array.isArray(message.content))return !message.content.some(part=>part?.type!=='text'||String(part.text||'').trim());
    return message.content==null||typeof message.content==='string'&&!message.content.trim();
};
function safeText(value,limit=700){
    return String(value??'').replace(/Bearer\s+[^\s"']+/giu,'Bearer [redacted]')
        .replace(/\bsk-[\w-]+|\bAIza[\w-]{20,}/gu,'[redacted]')
        .replace(/(["'](?:api[_-]?key|access[_-]?token|authorization|(?:proxy[_-]?)?password|cookie)["']\s*:\s*)["'][^"']*["']/giu,'$1"[redacted]"')
        .replace(/((?:api[_-]?key|access[_-]?token|authorization|(?:proxy[_-]?)?password|cookie)["']?\s*[=:]\s*["']?)[^\s"'&,;]+/giu,'$1[redacted]').slice(0,limit);
}

export function prepareForgeOpeningRequest(request){
    if(!request||request.type&&request.type!=='normal'||!Array.isArray(request.messages))return null;
    const original=request.messages,messages=original.filter(message=>!emptyMessage(message));
    const index=messages.findLastIndex(message=>message.role==='user'&&messageText(message).includes(FORGE_OPENING_USER_PROMPT));
    // A preset can put system instructions/prefill after chat history. Keep the
    // opening instruction last for strict proxies, preserving every other prompt.
    if(index<0)messages.push({role:'user',content:FORGE_OPENING_USER_PROMPT});
    else if(index!==messages.length-1)messages.push(...messages.splice(index,1));
    const changed=messages.length!==original.length||messages.some((message,i)=>message!==original[i]);
    if(changed)request.messages=messages;
    const roles=Object.create(null);for(const message of messages)roles[message.role]=(roles[message.role]||0)+1;
    return {model:safeText(request.model,120),source:safeText(request.chat_completion_source,60),messages:messages.length,roles,lastRole:messages.at(-1)?.role,emptyRemoved:original.filter(emptyMessage).length,adjusted:changed};
}

export function forgeOpeningFailure(error,{language='en',request}={}){
    const parts=[],seen=new Set();let status;
    for(let current=error,depth=0;current!=null&&depth<5&&!seen.has(current);depth++,current=current?.cause){
        seen.add(current);
        const code=Number(current?.status??current?.statusCode??current?.response?.status);
        if(status==null&&Number.isInteger(code)&&code>=400&&code<=599)status=code;
        for(const part of [typeof current==='string'?current:current.message,current?.error?.message,typeof current?.error==='string'?current.error:'',current?.details?.providerError])if(typeof part==='string'&&part.trim())parts.push(safeText(part));
    }
    const providerError=[...new Set(parts)].join(' · ').slice(0,700)||'No error details returned';
    status??=Number(providerError.match(/\b(?:HTTP|status|error)\s*[:=]?\s*([45]\d{2})\b/iu)?.[1]??(/\bbad request\b/iu.test(providerError)?400:undefined));
    const thai=language==='th',label=[Number.isInteger(status)&&status>=400&&status<=599?`HTTP ${status}`:thai?'เริ่มเรื่องไม่สำเร็จ':'Opening failed',request?.model?safeText(request.model,120):''].filter(Boolean).join(' · ');
    const genericBadRequest=/^(?:Bad Request|Got response status 400)$/iu.test(providerError.trim());
    const explanation=status===400&&genericBadRequest
        ? thai?'ข้อมูลตัวละครยังอยู่ โฮสต์ไม่ส่งสาเหตุละเอียด ตรวจชื่อโมเดลและพารามิเตอร์ที่ Proxy รองรับ':'Your draft is saved. The host returned no detailed cause. Check the model ID and parameters supported by the proxy.'
        : thai?'ข้อมูลตัวละครยังอยู่ กดเริ่มเพื่อลองใหม่หลังแก้การเชื่อมต่อ':'Your character draft is saved. Press BEGIN to retry after fixing the connection.';
    const message=[label,providerError.slice(0,240),explanation].join('\n').slice(0,500);
    return {message,details:{code:status===400?'FORGE_OPENING_BAD_REQUEST':'FORGE_OPENING_FAILED',...(Number.isInteger(status)&&status>=400&&status<=599?{status}:{}),providerError,...(request?{request}: {})}};
}
