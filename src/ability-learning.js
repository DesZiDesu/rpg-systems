import {normalizeAbility} from './incantation-core.js?v=0.58.15';
const text=value=>typeof value==='string'?value.trim():'';
const missing=value=>!text(value)||/^(?:ไม่มีรายละเอียด|ยังไม่มีรายละเอียด|no description)$/iu.test(text(value));
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:null;

export function needsAbilityDetails(target){
    return ['skill','technique'].includes(target?.kind)&&(missing(target.description)||!text(target.ability?.effect));
}
export function normalizeTrainingDetails(raw){
    if(!record(raw)||!text(raw.targetId))return null;
    const description=text(raw.description).slice(0,2000),ability=normalizeAbility(record(raw.ability));
    if(!description||!ability?.effect)return null;
    return {targetId:text(raw.targetId).slice(0,120),description,ability};
}
// Quiet understanding explains an existing record; it never acquires an ability,
// changes resource counters, grants extra mastery, or overwrites established lore.
export function applyUnderstandingDetails(state,target,choice,raw){
    if(choice!=='understanding'||!needsAbilityDetails(target))return 'unchanged';
    const entries=target.kind==='skill'?state.skills:state.proficiencies?.techniques;
    const entry=entries?.find(value=>`${target.kind}:${value.id}`===target.id);
    if(!entry)return 'missing';
    const details=normalizeTrainingDetails(raw);
    if(!details||details.targetId!==target.id)return 'missing';
    let changed=false;
    if(missing(entry.description)){entry.description=details.description;changed=true;}
    const previous=normalizeAbility(entry.ability),next=previous?structuredClone(previous):structuredClone(details.ability);
    if(!previous){changed=true;next.incantation.silent={available:false,reason:next.incantation.silent.reason};}
    else {
        for(const key of ['kind','effect','element','range','target']){
            if((key==='kind'?previous.kind==='other':!previous[key])&&details.ability[key]){next[key]=details.ability[key];changed=true;}
        }
        for(const key of ['conditions','strengths','weaknesses','advantages','disadvantages']){
            if(!previous[key].length&&details.ability[key].length){next[key]=details.ability[key];changed=true;}
        }
        if(!previous.costKnown&&!previous.costs.length&&details.ability.costKnown){next.costs=details.ability.costs;next.costKnown=true;changed=true;}
        if(!previous.cooldown&&details.ability.cooldown){next.cooldown=details.ability.cooldown;changed=true;}
        const chant=next.incantation,learned=details.ability.incantation;
        if(chant.required===null&&learned.required!==null){chant.required=learned.required;changed=true;}
        for(const key of ['language','short','full'])if(!chant[key]&&learned[key]&&chant.required!==false){chant[key]=learned[key];changed=true;}
        // Silent casting is a capability, not an automatic unlock from metadata.
    }
    if(['physical','passive'].includes(next.kind)&&previous?.incantation.required!==true)next.incantation={required:false,language:'',short:'',full:'',silent:{available:false,reason:''}};
    if(changed)entry.ability=normalizeAbility(next);
    return changed?'saved':'unchanged';
}

export function understandingDetailsPrompt(target,choice,chantLanguage='the supplied role-play language'){
    const id=typeof choice==='string'?choice:choice?.id;
    if(id!=='understanding'||!needsAbilityDetails(target))return '';
    return `UNDERSTANDING METADATA: The player authorized learning the missing description of this EXISTING ability. In the SAME training JSON add abilityDetails:{targetId:${JSON.stringify(target.id)},description,ability:{kind,effect,element,range,target,costKnown,costs:[{resource,amount,note}],cooldown:{value,unit,remaining,ready,condition,startedAt},conditions:[],strengths:[],weaknesses:[],advantages:[],disadvantages:[],incantation:{required,language,short,full,silent:{available,reason}}}}. Explain function and limits coherently from the ability name, character and supplied world canon. Preserve every existing detail. Unknown costs: costKnown:false with amount:null; unknown cooldown: unit:unknown. Do not invent numeric fees, damage, cooldowns, new abilities, casts, resource spending or silent-casting capability. Physical/sword/passive abilities have required:false and empty chants. When world canon requires magical chanting, provide distinct short and genuinely longer full chants in ${JSON.stringify(chantLanguage)}. Full casting trades speed for effectiveness; skilled short/silent casting can be powerful. Report actual practice outcome independently of metadata; no extra mastery reward for explaining it. Do not postpone to another request.`;
}
