import {normalizeItemLearning,validItemLearning,ITEM_LEARNING_INSTRUCTIONS} from './item-learning.js?v=0.58.3';
// Shared item metadata: no commerce/runtime dependencies, so catalogs and inventory use the same definition.
const clean=(s,n=300)=>typeof s==='string'?s.trim().slice(0,n):'';
const whole=(n,max=99999)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const list=(v,n=8)=>Array.isArray(v)?v.map(x=>clean(x,300)).filter(Boolean).slice(0,n):[];
const units=['none','seconds','minutes','hours','days','turns','unknown'];
const actions=['use','eat','drink','unknown','passive'];
const forbidden=new Set(['__proto__','prototype','constructor']);
export function itemStatPath(path){
 if(typeof path!=='string'||path.split('.').some(p=>forbidden.has(p)))return false;
 return /^(?:player\.(?:hp|mp|stamina)\.(?:current|max)|player\.survival\.(?:hunger|thirst)|player\.aura\.(?:output|control|efficiency|recovery|color)|player\.fitness\.(?:lungCapacity|aerobicSessions)|player\.(?:condition|powerType|originSkill|race|age|profession|title|gender|standing|affiliation|homeContinent|birthplace|level)|player\.appearance\.(?:hair|eyes|height|build)|player\.hStats\.[a-zA-Z0-9_.-]+|progression\.(?:experience|reputation)|customPowers\.[a-zA-Z0-9_-]+)$/u.test(path);
}
export function normalizeStatEffects(raw){
 if(!Array.isArray(raw))return[];const seen=new Set();
 return raw.slice(0,24).flatMap(e=>{
  if(!e||!itemStatPath(e.stat)||seen.has(e.stat)||!['inc','set'].includes(e.operation)||!(typeof e.value==='number'&&Number.isFinite(e.value)&&Math.abs(e.value)<=999999||e.operation==='set'&&(typeof e.value==='string'&&e.value.trim().length>0&&e.value.length<=200||typeof e.value==='boolean')))return[];
  const input=e.duration||{unit:'none',value:0};if(!['none','turns','minutes','hours','days'].includes(input.unit)||!whole(input.value,52560000)||input.unit!=='none'&&!input.value)return[];
  const overflow=e.overflow==='temporary'?'temporary':'clamp';if(overflow==='temporary'&&(input.unit==='none'||e.operation!=='inc'||typeof e.value!=='number'||e.value<=0||!/^player\.(?:hp|mp|stamina)\.current$/u.test(e.stat)))return[];
  seen.add(e.stat);return[{stat:e.stat,operation:e.operation,value:typeof e.value==='string'?e.value.trim():e.value,overflow,duration:{unit:input.unit,value:input.unit==='none'?0:input.value}}];
 });
}
export function validStatEffects(raw){return Array.isArray(raw)&&raw.length<=24&&normalizeStatEffects(raw).length===raw.length;}
export function normalizeItemUsage(raw,entry={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)){
  const category=clean(entry.category).toLowerCase();
  if(/^(?:food|อาหาร)$/u.test(category))return{action:'eat',consumable:true,effect:clean(entry.description,600),conditions:[],target:'self',cooldown:{unit:'none',value:0},charges:null};
  if(entry.commerceRightId||/^(?:key|weapon|armor|tool|equipment|กุญแจ|อาวุธ|เครื่องมือ|เกราะ)$/u.test(category))return{action:'use',consumable:false,effect:clean(entry.description,600),conditions:[],target:'',cooldown:{unit:'none',value:0},charges:null};
  return{action:'unknown',consumable:false,effect:clean(entry.description,600),conditions:[],target:'',cooldown:{unit:'unknown',value:0},charges:null};
 }
 const action=actions.includes(raw.action)?raw.action:'unknown';
 const consumable=['eat','drink'].includes(action)||raw.consumable===true;
 const input=raw.cooldown||{},unit=units.includes(input.unit)?input.unit:'unknown',value=whole(input.value,52560000)?input.value:0;
 const lastUse=input.lastUse&&whole(input.lastUse.day,1000000)&&input.lastUse.day>0&&/^([01]\d|2[0-3]):[0-5]\d$/u.test(input.lastUse.time||'')&&whole(input.lastUse.turn,9999999)?{day:input.lastUse.day,time:input.lastUse.time,turn:input.lastUse.turn}:null;
 const charges=raw.charges&&whole(raw.charges.max)&&raw.charges.max>0&&whole(raw.charges.remaining)&&raw.charges.remaining<=raw.charges.max?{max:raw.charges.max,remaining:raw.charges.remaining}:null;
 return{action,consumable,effect:clean(raw.effect,600)||clean(entry.description,600),conditions:list(raw.conditions),target:clean(raw.target,160),cooldown:{unit,value,...(lastUse?{lastUse}:{})},charges,...(raw.configured===true?{configured:true}:{}),...(Array.isArray(raw.stats)?{stats:normalizeStatEffects(raw.stats)}:{}),...(Array.isArray(raw.learns)?{learns:normalizeItemLearning(raw.learns)}:{}),...(raw.learningInvalid||raw.learns!==undefined&&!validItemLearning(raw.learns)?{learningInvalid:true}:{})};
}

export function completeItemDefinition(raw={}){
 const name=clean(raw.name||raw.itemName,100),category=clean(raw.category,60)||'Other',thai=/[\u0e00-\u0e7f]/u.test(name);
 const item={...raw,name,category,description:clean(raw.description,600)||`${name} · ${category}`,rarity:clean(raw.rarity,80)||'Common',properties:list(raw.properties,12)};
 let usage=normalizeItemUsage(raw.usage,item);
 const hint=(name+' '+category).toLowerCase();
 const learns=normalizeItemLearning(raw.usage?.learns);
 if(learns.length&&(!raw.usage?.action||usage.action==='passive'))usage={...usage,action:'use',consumable:raw.usage?.consumable!==false};
 if(!raw.usage||!raw.usage.action){
  if(/water|น้ำดื่ม|น้ำเปล่า|เครื่องดื่ม|drink|beverage|potion|โพชั่น|น้ำยา|ยา.*ฟื้น/iu.test(hint))usage={...usage,action:'drink',consumable:true};
  else if(/food|อาหาร|cake|pie|bread|fruit|เค้ก|พาย|ขนม|ผลไม้/iu.test(hint))usage={...usage,action:'eat',consumable:true};else if(usage.action==='unknown'&&!/(?:skill.?book|spell.?book|manual|scroll|คัมภีร์|ตำรา|ปลุกพลัง)/iu.test(hint))usage={...usage,action:'passive'};
 }
 const stats=Array.isArray(raw.usage?.stats)?normalizeStatEffects(raw.usage.stats):usage.consumable&&!learns.length?
  usage.action==='eat'?[['player.survival.hunger',20],['player.stamina.current',5]]:
  /water|น้ำดื่ม|น้ำเปล่า/iu.test(hint)?[['player.survival.thirst',25]]:
  /mana|มานา|ออร่า/iu.test(hint)?[['player.mp.current',20]]:
  /stamina|กำลัง|สตามิน่า/iu.test(hint)?[['player.stamina.current',20]]:
  /potion|โพชั่น|น้ำยา|ยา/iu.test(hint)?[['player.hp.current',20]]:[['player.survival.thirst',15]]:[];
 const effects=stats.map(e=>Array.isArray(e)?{stat:e[0],operation:'inc',value:e[1],overflow:'clamp',duration:{unit:'none',value:0}}:e);
 usage={...usage,learns,stats:effects,effect:usage.effect|| (effects.length?effects.map(e=>`${e.stat} ${e.operation==='inc'?'+':''}${e.value}`).join(' · '):(thai?'ไม่มีผลสเตตัสโดยตรง · ใช้หรือเก็บไว้ตามประเภทไอเทม':'No direct stat changes; use or retain according to item type.')),conditions:usage.conditions.length?usage.conditions:[thai?'ไม่มีเงื่อนไขเพิ่มเติม':'No additional conditions'],target:usage.target||(usage.consumable?'self':'appropriate object'),cooldown:usage.cooldown.unit==='unknown'&&usage.action!=='unknown'?{unit:'none',value:0}:usage.cooldown,charges:usage.charges};
 item.usage=usage;return item;
}
export const ITEM_DEFINITION_INSTRUCTIONS=ITEM_LEARNING_INSTRUCTIONS+'\n'+`COMPLETE ITEM DEFINITIONS: Author plausible item properties now within this world's canon; this player authorizes you to design new items and numerical effects. Every new inventory item, Loot item, shop item, auction lot and delivered/crafted item MUST include name, category, description, rarity, properties:[], and usage:{action:"use|eat|drink|passive",consumable:boolean,effect:"human-readable full effect",conditions:[],target,cooldown:{unit:"none|seconds|minutes|hours|days|turns",value:0},charges:null,learns:[],stats:[{stat:"canonical path",operation:"inc|set",value:number|string,overflow:"clamp|temporary",duration:{unit:"none|turns|minutes|hours|days",value:0}}]}. Include every field even when []/null/none is the correct value. Design balanced amounts per ONE item; ONE item may affect several stats. Water restores player.survival.thirst; food restores player.survival.hunger; medicine may restore player.hp.current, player.mp.current, player.stamina.current. Hunger/thirst are fullness/hydration, positive means replenishment. You may also configure existing player aura/fitness/H-Stats, customPowers.<existing id>, progression.experience/reputation and player.condition/powerType/originSkill/race/profession/appearance. Divine Mana is {stat:"player.powerType",operation:"set",value:"Divine Mana",overflow:"clamp",duration:{unit:"none",value:0}}. For HP/MP/stamina restoration that temporarily exceeds the base maximum use overflow:"temporary" with an explicit positive duration; e.g. hp +20 for 3 turns makes full 100/100 into 120/100 temporarily, without permanent max growth. Other temporary modifiers use a positive duration; permanent effects use none/0. Keep already established/configured properties, depleted charges and cooldown history. Do not change ownership/player stats merely by displaying or defining an item. stats:[] explicitly means no direct stat changes and the effect text must explain its tool/equipment/passive function. Say the item name, count and full stat benefits in the visible story, including duration and overflow when applicable. Shop/auction catalogs have complete definitions before purchase; never defer details to a second button.`;

export function itemDefinitionKey(raw){const i=completeItemDefinition(raw),u=i.usage;return JSON.stringify([i.name,i.category,i.description,i.rarity,i.properties,i.commerceRightId||'',u.action,u.consumable,u.effect,u.conditions,u.target,u.stats,u.learns,Boolean(u.learningInvalid),{unit:u.cooldown.unit,value:u.cooldown.value},u.charges?{max:u.charges.max}:null]);}

export function itemDefinitionsMergeable(a,b){
 if(itemDefinitionKey(a)===itemDefinitionKey(b))return JSON.stringify(a.usage?.cooldown?.lastUse||null)===JSON.stringify(b.usage?.cooldown?.lastUse||null)&&JSON.stringify(a.usage?.charges||null)===JSON.stringify(b.usage?.charges||null);
 const legacy=(!a.usage||a.usage.action!=='unknown')&&!a.description&&!a.usage?.effect&&!a.usage?.configured&&!a.usage?.charges&&!a.usage?.cooldown?.lastUse&&!a.usage?.stats?.length&&!a.usage?.learns?.length;
 return legacy&&a.name===b.name&&(!a.category||['Other','Item'].includes(a.category)||a.category===b.category)&&!a.commerceRightId&&!b.commerceRightId;
}
