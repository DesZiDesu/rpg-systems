import {normalizeAbility,abilityMastery,abilityLevel} from './incantation-core.js?v=0.58.14';

const text=(value,max=300)=>typeof value==='string'?value.trim().slice(0,max):'';
const key=value=>text(value,1000).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu,' ');
const hash=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.codePointAt(0),16777619);return(n>>>0).toString(36);};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);

// Every granted ability uses the same metadata as acquired skills and Powers.
export function normalizeItemLearning(raw){
 if(!Array.isArray(raw))return[];
 const seen=new Set();
 return raw.slice(0,8).flatMap(input=>{
  if(!object(input)||!['skill','technique'].includes(input.kind)||!text(input.name,100))return[];
  const identity=input.kind+':'+key(input.name);if(seen.has(identity))return[];
  const mastery=input.mastery??1;if(typeof mastery!=='number'||!Number.isFinite(mastery)||mastery<0||mastery>100)return[];
  const repeat=input.duplicate||{mode:'reject'},mode=repeat.mode,amount=repeat.amount??0;
  if(!['reject','mastery','upgrade'].includes(mode)||typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>100||mode==='mastery'&&amount<=0)return[];
  const ability=normalizeAbility(input.ability);if(!ability?.effect)return[];
  seen.add(identity);
  return[{kind:input.kind,id:text(input.id,100)||'item-ability-'+hash(identity),name:text(input.name,100),type:text(input.type,60)||'General',category:text(input.category,80)||'General',description:text(input.description,300)||ability.effect.slice(0,300),mastery,ability,duplicate:{mode,amount:mode==='mastery'?amount:0}}];
 });
}
export const validItemLearning=raw=>Array.isArray(raw)&&raw.length<=8&&normalizeItemLearning(raw).length===raw.length;

function applyLearning(state,raw,quantity){
 if(!validItemLearning(raw)||!Number.isSafeInteger(quantity)||quantity<1||quantity>99999)return{ok:false,error:'learning'};
 const next=structuredClone(state),events=[];next.skills ||= [];next.proficiencies ||= {};next.proficiencies.techniques ||= [];
 for(const grant of normalizeItemLearning(raw)){
  const list=grant.kind==='skill'?next.skills:next.proficiencies.techniques,field=grant.kind==='skill'?'mastery':'proficiency';
  let entry=list.find(e=>e.id===grant.id||key(e.name)===key(grant.name));
  if(entry&&key(entry.name)!==key(grant.name))return{ok:false,error:'learning'};
  const existed=Boolean(entry);let remaining=quantity;
  if(!entry){
   if(list.length>=(grant.kind==='skill'?100:150))return{ok:false,error:'capacity'};
   entry={id:grant.id,name:grant.name,description:grant.description,ability:structuredClone(grant.ability),[field]:grant.mastery,...(grant.kind==='skill'?{type:grant.type,rank:abilityLevel(grant.mastery)}:{category:grant.category})};
   list.push(entry);remaining--;
  }
  if(remaining){
   if(grant.duplicate.mode==='reject')return{ok:false,error:'learned'};
   if(grant.duplicate.mode==='mastery'){
    const before=abilityMastery(entry[field]),after=abilityMastery(before+grant.duplicate.amount*remaining);
    if(after===before)return{ok:false,error:'learned'};
    entry[field]=after;if(grant.kind==='skill')entry.rank=abilityLevel(after);
   }else{
    if(remaining!==1)return{ok:false,error:'quantity'};
    const before=JSON.stringify(entry),cooldown=entry.ability?.cooldown;
    entry.description=grant.description;entry[field]=Math.max(abilityMastery(entry[field]),grant.mastery);
    entry.ability=normalizeAbility(grant.ability,entry.ability);
    // Receiving an upgrade cannot reset an already running casting cooldown.
    if(cooldown&&entry.ability.cooldown){if(cooldown.ready===false||cooldown.remaining>0)entry.ability.cooldown=structuredClone(cooldown);else for(const property of ['remaining','ready','startedAt'])entry.ability.cooldown[property]=cooldown[property];}
    if(grant.kind==='skill'){entry.type=grant.type;entry.rank=abilityLevel(entry[field]);}else entry.category=grant.category;
    if(before===JSON.stringify(entry))return{ok:false,error:'learned'};
   }
  }
  events.push({action:existed?'improved':'learned',title:entry.name,kind:grant.kind,abilityId:entry.id,path:grant.kind==='skill'?'skills':'proficiencies.techniques',value:entry[field],delta:0});
 }
 return{ok:true,next,events};
}
export function applyItemLearning(state,raw,{quantity=1}={}){return applyLearning(state,raw,quantity);}
export function itemLearningMissing(item){const u=item?.usage;return u?.action==='use'&&!u.learns?.length&&/(?:skill.?book|spell.?book|คัมภีร์|ตำรา|ปลุกพลัง)/iu.test((item.name||'')+' '+(item.category||''));}
export function itemLearningAvailability(state,item,quantity=1){
 if(item?.usage?.learningInvalid||itemLearningMissing(item))return{ok:false,error:'learning'};
 const raw=item?.usage?.learns;if(raw===undefined)return{ok:true};
 if(!validItemLearning(raw))return{ok:false,error:'learning'};
 if(!raw.length)return{ok:true};
 return applyLearning({skills:state.skills,proficiencies:{techniques:state.proficiencies?.techniques}},raw,quantity);
}
export function itemLearningSummary(grant,language='en'){
 const th=language==='th',repeat=grant.duplicate||{mode:'reject'};
 return`${th?'เรียนรู้':'Learn'} ${grant.name} · ${th?'ความชำนาญ':'Mastery'} ${grant.mastery}% · ${repeat.mode==='mastery'?(th?'รู้แล้วเพิ่มความชำนาญ':'If known, mastery')+' +'+repeat.amount+'%':repeat.mode==='upgrade'?(th?'รู้แล้วอัปเกรดวิชา':'Upgrade if known'):(th?'รู้แล้วใช้ไม่ได้ ไม่เสียไอเทม':'Already known: blocked without consuming')}`;
}
export function itemLearningDetails(grant,language='en'){
 const th=language==='th',a=grant.ability,unknown=th?'ยังไม่ทราบ':'Unknown';
 return [grant.description,a.effect,a.element,a.range,a.target,
  (th?'ค่าใช้จ่าย: ':'Costs: ')+(a.costKnown?(a.costs.length?a.costs.map(c=>`${c.resource} ${c.amount??unknown}${c.note?' ('+c.note+')':''}`).join(' · '):(th?'ไม่มี':'None')):unknown),
  'Cooldown: '+(a.cooldown?(a.cooldown.unit==='none'?(th?'ไม่มี':'None'):`${a.cooldown.value??unknown} ${a.cooldown.unit}`):unknown),
  ...a.conditions,...a.strengths,...a.weaknesses,...a.advantages,...a.disadvantages,
  a.incantation.short,a.incantation.full,a.incantation.silent.reason].filter(Boolean).join(' · ');
}
export const ITEM_LEARNING_INSTRUCTIONS=`ITEM-GRANTED ABILITIES: usage.learns is an array (max 8) of {kind:"skill|technique",id,name,type,category,description,mastery:1,ability:{kind:"magic|physical|passive|other",effect,element,range,target,costKnown:true,costs:[{resource:"mp",amount:10,note:""}],cooldown:{value:0,unit:"none",remaining:0,ready:true,condition:"",startedAt:""},conditions:[],strengths:[],weaknesses:[],advantages:[],disadvantages:[],incantation:{required:false,language:"",short:"",full:"",silent:{available:false,reason:""}}},duplicate:{mode:"reject|mastery|upgrade",amount:0}}. Author complete usable skills, powers, spells and techniques appropriate to a skill book, scroll, manual, awakening crystal or power-granting item. Include real function, limits, costs, cooldown and chants where canon requires them. Use stable ability IDs and modest initial mastery. reject blocks known abilities without consuming anything; mastery adds amount (positive 1–100) to existing mastery; upgrade explicitly improves metadata/mastery without erasing current casting cooldown. Explain this rule BEFORE use. One item may grant several abilities plus stats. Do not create user-owned custom power preset definitions. Merely finding, collecting or buying this item never teaches it. Only a confirmed successful use grants the authored abilities atomically with consumption/stats. For these same abilities NEVER also emit skills/techniques upserts or proficiency ops: the item engine applies them. usage.learns:[] means no new ability; setting player.powerType/originSkill alone does not create a usable learned skill. Preserve established item formulas.`;

export function duplicateItemLearningOperation(operation,events){
 const [verb,path,value]=operation;
 return events.some(event=>['learned','improved'].includes(event.action)&&((path===event.path&&['upsert','inc','delete'].includes(verb)&&(value?.id===event.abilityId||key(value?.name)===key(event.title)||value===event.abilityId))||path.startsWith(event.path+'.'+event.abilityId+'.')));
}
