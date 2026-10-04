// Voice directions are speech instructions, never narrative or account data.
export const VOICE_MODELS = Object.freeze([
    {id:'eleven_v4',name:'Eleven v4'},
    {id:'eleven_v3',name:'Eleven v3'},
]);
const directions = new Set(('whispers|whispering|shouts|shouting|laughs|laughing|giggles|giggling|chuckles|sighs|sigh|sniff|sniffs|sniffling|crying|sobs|sobbing|gasps|coughs|clears throat|breathes|inhales|exhales|short pause|long pause|pause|warmly|softly|angry|sad|happy|excited|curious|calm|nervous|sarcastic|serious|cheerful|tired|fearful|surprised|confused|thoughtful|reassuring|frustrated|hesitant|dramatic|deadpan|mischievously|playfully').split('|'));
const direction = value => String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
const audioTag = value => directions.has(direction(value));

export function normalizeVoiceSettings(settings={}) {
    settings.enableVoiceAddon=settings.enableVoiceAddon===true;
    settings.voiceModel=VOICE_MODELS.some(model=>model.id===settings.voiceModel)?settings.voiceModel:'eleven_v4';
    settings.voiceDefaultId=typeof settings.voiceDefaultId==='string'?settings.voiceDefaultId.slice(0,160):'';
    settings.voiceBindings=settings.voiceBindings&&typeof settings.voiceBindings==='object'&&!Array.isArray(settings.voiceBindings)?settings.voiceBindings:{};
    settings.voiceSpeed=Math.max(.75,Math.min(1.5,Number(settings.voiceSpeed)||1));
    settings.voiceAutoplay=settings.voiceAutoplay===true;
    settings.voiceRememberKey=settings.voiceRememberKey===true;
    // A namespace is an opaque ID; it must never contain the API key.
    if(!/^[a-z0-9-]{8,100}$/i.test(settings.voiceVaultId||''))settings.voiceVaultId='';
    if(!/^[a-z0-9-]{8,100}$/i.test(settings.voiceCacheId||''))settings.voiceCacheId='';
    return settings;
}

export function speechDisplayText(value) {
    return String(value??'').replace(/\[([^\]\n]{1,60})\]/g,(tag,body)=>audioTag(body)?'':tag).replace(/ {2,}/g,' ').trim();
}
export function speechText(block={}) {
    const tags=String(block.delivery||'').split(/[,|]/).map(direction).filter(audioTag).slice(0,4);
    const prefix=tags.map(tag=>`[${tag}]`).join(' ');
    const text=String(block.text||'').replace(/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g,(_,strong,em)=>strong??em).trim();
    return [prefix,text].filter(Boolean).join(' ');
}
export function voiceInstructions(settings={}) {
    if(!settings.enableVoiceAddon||settings.chatPresentation===false)return '';
    return `ROLEFORGE VOICE ADDON: Produce speech directions in this SAME normal story reply; never request another model call to infer emotions. Keep using tr-header / tr-narrative / tr-dialogue. For tr-dialogue only, an optional delivery attribute may contain up to 4 comma-separated directions from: ${[...directions].join(', ')}. Example: <tr-dialogue name="Garrick" delivery="warmly">ห้องพร้อมแล้วครับ</tr-dialogue>. For an audible action at a specific position you may insert a matching bracket tag such as [sighs] or [laughs] inside tr-dialogue. These tags are hidden by the renderer and sent only with speech. Use directions sparingly, consistent with the scene and character. Keep the spoken words in the role-play language, including NPC incantations when actually spoken. Do not turn silent thoughts, narrative, receipts, skill data or system UI into dialogue. Never invent voice IDs, API keys, quotas, or voice assignments. Do not add delivery attributes or audio tags to narrative or plain text.`;
}

export function speakerVoiceKey(profile={},name='',context={}) {
    const owner=context.character?.avatar??context.characters?.[context.characterId]?.avatar??context.characterId??'';
    const chat=context.getCurrentChatId?.()||'';
    const scope=profile.npcScope==='character'?'character':'chat';
    const parts=[owner,scope,profile.npcOwner||(scope==='chat'?chat:owner),profile.id||String(name||profile.name||'NPC').normalize('NFKC').toLowerCase()];
    return 'npc:'+parts.map(value=>encodeURIComponent(String(value))).join(':');
}
export function voiceCacheKey(namespace,model,voice,text) {
    return JSON.stringify(['rf-voice-1',namespace,model,voice,text]);
}
export function splitSpeech(value,limit=1800) {
    let chars=Array.from(String(value||''));const parts=[];
    while(chars.length>limit){
        let end=limit;
        for(let i=limit-1;i>=Math.floor(limit*.65);i--)if(/[\s.!?。！？]/u.test(chars[i])){end=i+1;break;}
        // Never split an inline audio direction in half.
        const candidate=chars.slice(0,end).join(''),open=candidate.lastIndexOf('[');
        if(open>candidate.lastIndexOf(']')&&open>0)end=Array.from(candidate.slice(0,open)).length;
        parts.push(chars.splice(0,end).join('').trim());
    }
    if(chars.length)parts.push(chars.join('').trim());return parts.filter(Boolean);
}

export function subscriptionQuota(raw={}) {
    const used=Number(raw.character_count),limit=Number(raw.character_limit);
    const valid=raw.character_count!=null&&raw.character_limit!=null&&Number.isFinite(used)&&used>=0&&Number.isFinite(limit)&&limit>=0;
    const reset=Number(raw.next_character_count_reset_unix);
    return {tier:String(raw.tier||''),used:valid?used:null,limit:valid?limit:null,remaining:valid?Math.max(0,limit-used):null,
        percent:valid&&limit>0?Math.max(0,Math.min(100,(limit-used)/limit*100)):null,
        resetAt:Number.isFinite(reset)&&reset>0?reset*1000:null,
        overage:raw.current_overage||null,updatedAt:Date.now()};
}
