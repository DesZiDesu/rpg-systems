import {parseStory} from './npc-core.js?v=0.90.0';

const escape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const resource='(?:HP|health|MP|mana|aura|stamina|ST|พลังชีวิต|มานา|ออร่า|เรี่ยวแรง|ความอึด)';

// A bare mention of an NPC's injury, dialogue, a memory or a stat in model
// bookkeeping is not a player's consequence. Automatic numeric fallback only
// reads a directly owned stat statement; structured patches remain explicit.
export function playerResourceNarrative(story,{names=[]}={}){
    const aliases=[...new Set(names.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];
    const actor=`(?:${['you','your','player','คุณ','ผู้เล่น','ตัวละครผู้เล่น',...aliases].map(escape).sort((a,b)=>b.length-a.length).join('|')})`;
    const own=new RegExp(`^(?:now\\s+)?${actor}(?:['’]s)?\\s*(?:(?:current|remaining|has|have|now|is|are|มี|เหลือ|ตอนนี้|ปัจจุบัน|:)\\s*)*(${resource})(?![a-z])`,'iu');
    const loss=new RegExp(`^${actor}\\s*(?:lose|loses|lost|เสีย|สูญเสีย|ลด)\\s*(?:(\\d+(?:\\.\\d+)?)\\s*(${resource})|(${resource})\\s*[-–—]?\\s*(\\d+(?:\\.\\d+)?))`,'iu');
    const thaiOwner=new RegExp(`^(${resource})\\s*(?:ของ)${actor}(?=\\s|เหลือ|อยู่ที่|=|:|\\d)`,'iu');
    const numeric=/^\s*(?:is|=|เหลือ|อยู่ที่|:|[-–—])?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/iu;
    const snapshot=new RegExp(`^(${resource})`,'iu');
    const denied=/\b(?:not|never|didn't|haven't|hypothetical|imagine|remember|memory|dream|previously|if|will|would|could|may|might|tomorrow|plan|plans|planned|expected|prediction)\b|(?:ไม่ได้|ไม่เสีย|ไม่ลด|สมมุติ|สมมติ|ความทรงจำ|ฝัน|ในอดีต|เคย|หาก|ถ้า|พรุ่งนี้|คาดว่า|คาดการณ์|วางแผน)/iu;
    const blocks=parseStory(story)||[{type:'narrative',text:String(story||'')}];
    const collected=[];let playerHeader=false;
    for(const block of blocks){
        if(block.type==='header'){playerHeader=aliases.some(n=>n.normalize('NFKC').toLocaleLowerCase()===String(block.name||'').normalize('NFKC').toLocaleLowerCase());continue;}
        if(!['narrative','plain'].includes(block.type))continue;
        // Inline quotes are speech, not confirmation, even in a prose block.
        const prose=String(block.text||'').replace(/"[^"\n]*"|“[^”\n]*”|`[^`]*`/gu,'').replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/gu,(_,a,b)=>a??b);
        for(const raw of prose.split(/[\r\n]+|(?<=[.!?。！？])\s+(?=\p{L})/u)){
            const line=raw.trim();if(!line||denied.test(line)||/[<>]|\b(?:years?|met(?:er|re)s?|radius)\b/iu.test(line))continue;
            const lost=loss.exec(line);
            if(lost){collected.push(`lose ${lost[1]||lost[4]} ${lost[2]||lost[3]}`);continue;}
            const owned=own.exec(line)||thaiOwner.exec(line)||playerHeader&&snapshot.exec(line);
            if(owned){
                // Capture this owned value only, not an enemy's later stat in
                // the same sentence. A ':' is normalized for the numeric reader.
                const amount=numeric.exec(line.slice(owned[0].length));
                if(amount)collected.push(owned[1]+amount[0].replace(':','='));
            }
        }
    }
    return collected.join('\n');
}

export function effectTargetsPlayer(value,{names=[]}={}){
    const target=value?.targetName??value?.target;
    if(target===undefined||target===null||target==='')return !value?.npcId;
    if(typeof target!=='string')return false;
    const key=v=>String(v).trim().normalize('NFKC').toLocaleLowerCase();
    return ['player','self','user','you','คุณ','ผู้เล่น','ตัวละครผู้เล่น','ตนเอง',...names.filter(Boolean)].some(n=>key(n)===key(target));
}

const legacySpecs={
    Bleeding:{type:'Injury',damage:2,stamina:0,treatment:'Bandage or healing'},
    Poisoned:{type:'Ailment',damage:2,stamina:0,treatment:'Antidote or detoxification'},
    Burned:{type:'Injury',damage:1,stamina:0,treatment:'Cool and treat the burn'},
    Fracture:{type:'Injury',damage:0,stamina:2,treatment:'Immobilize and receive medical care'},
};
// The old keyword fallback has a specific fingerprint and a matching synthetic
// damage log. Do not remove arbitrary custom, imported or explicitly edited
// effects. No HP is refunded: historical real damage cannot be guessed safely.
export function isLegacyGuessedEffect(effect,logs,hash){
    const spec=Object.hasOwn(legacySpecs,effect?.name)?legacySpecs[effect.name]:null;if(!spec||effect.origin==='declared')return false;
    if(effect.id!==`effect-${hash(effect.name)}`||effect.type!==spec.type||effect.treatment!==spec.treatment
        ||effect.damagePerTurn!==spec.damage||effect.staminaPerTurn!==spec.stamina
        ||!['Moderate','Severe'].includes(effect.severity)||!Number.isInteger(effect.remainingTurns)||effect.remainingTurns<0||effect.remainingTurns>4
        ||typeof effect.source!=='string'||!effect.source.trim()||effect.source.length>220)return false;
    const applied=Date.parse(effect.appliedAt);if(!Number.isFinite(applied))return false;
    return Array.isArray(logs)&&logs.some(log=>log&&log.source==='turn-reconcile'&&[7,15].includes(log.finalDamage)&&log.baseDamage===log.finalDamage
        &&log.attacker==='Role-play event'&&log.summary===`Confirmed injury dealt ${log.finalDamage} HP damage`
        &&Math.abs(Date.parse(log.at)-applied)<=1500);
}
