import {itemStatPath,normalizeStatEffects,validStatEffects} from './item-definition.js?v=0.63.0';
const copy=s=>structuredClone(s);
const minute=clock=>Number.isInteger(clock?.day)&&/^\d\d:\d\d$/u.test(clock?.time||'')?(clock.day-1)*1440+Number(clock.time.slice(0,2))*60+Number(clock.time.slice(3)):null;
const leaf=(state,path)=>{if(!itemStatPath(path))return null;const keys=path.split('.'),key=keys.pop();let owner=state;for(const k of keys){if(!owner||typeof owner!=='object'||!Object.hasOwn(owner,k))return null;owner=owner[k];}return owner&&Object.hasOwn(owner,key)&&['number','string','boolean'].includes(typeof owner[key])?{owner,key,value:owner[key]}:null;};
export function itemStatOptions(state){
 const out=[];function visit(value,path){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){const p=path+'.'+k;if(itemStatPath(p)&&['number','string','boolean'].includes(typeof v))out.push({stat:p,type:typeof v});else if(v&&typeof v==='object'&&!Array.isArray(v))visit(v,p);}}
 for(const root of ['player','progression','customPowers'])visit(state[root],root);return out;
}
export function normalizeItemBuffs(raw){
 const seen=new Set();return(Array.isArray(raw)?raw:[]).flatMap(b=>{
  if(!b?.id||seen.has(b.id)||!itemStatPath(b.stat)||!['cap','inc','set'].includes(b.kind)||!Number.isFinite(b.expiresTurn)&&!Number.isFinite(b.expiresMinute)||!['number','string','boolean'].includes(typeof b.before)||!['number','string','boolean'].includes(typeof b.applied)||!Number.isFinite(b.amount))return[];
  seen.add(b.id);return[{id:String(b.id).slice(0,180),itemName:String(b.itemName||'').slice(0,100),stat:b.stat,kind:b.kind,before:b.before,applied:b.applied,amount:b.amount,expiresTurn:Number.isFinite(b.expiresTurn)?b.expiresTurn:null,expiresMinute:Number.isFinite(b.expiresMinute)?b.expiresMinute:null}];
 }).slice(-240);
}
export function itemResourceCap(state,resource){return Number(state.player?.[resource]?.max||0)+normalizeItemBuffs(state.itemSystem?.buffs).filter(b=>b.kind==='cap'&&b.stat===`player.${resource}.current`).reduce((sum,b)=>sum+Math.max(0,b.amount),0);}
export function expireItemBuffs(state,{turn=null}={}){
 const next=copy(state),now=minute(next.worldClock),all=normalizeItemBuffs(next.itemSystem?.buffs),expired=all.filter(b=>turn!==null&&b.expiresTurn!==null&&turn>=b.expiresTurn||now!==null&&b.expiresMinute!==null&&now>=b.expiresMinute),ids=new Set(expired.map(b=>b.id));
 next.itemSystem ||= {};next.itemSystem.buffs=all.filter(b=>!ids.has(b.id));
 for(const b of expired){const target=leaf(next,b.stat);if(!target)continue;if(b.kind==='inc'&&typeof target.value==='number')target.owner[target.key]-=b.amount;else if(b.kind==='set'&&target.value===b.applied)target.owner[target.key]=b.before;}
 for(const b of expired){const target=leaf(next,b.stat);if(target&&typeof target.value==='number'){const [min,max]=bounds(next,b.stat);target.owner[target.key]=Math.max(min,Math.min(max,target.value));}}
 for(const resource of ['hp','mp','stamina'])if(next.player?.[resource])next.player[resource].current=Math.max(0,Math.min(itemResourceCap(next,resource),next.player[resource].current));
 return{next,expired};
}
function bounds(state,stat){
 const meter=stat.match(/^player\.(hp|mp|stamina)\.current$/u);if(meter)return[0,itemResourceCap(state,meter[1])];
 if(/^player\.survival\.|^player\.aura\.(output|control|efficiency|recovery)$/u.test(stat))return[0,100];
 if(stat==='player.level')return[1,9999];
 if(/^player\.(hp|mp|stamina)\.max$|^player\.fitness\.lungCapacity$/u.test(stat))return[1,999999];
 return stat==='progression.reputation'?[-999999,999999]:[0,999999999];
}
export function applyItemStats(state,raw,{quantity=1,requestId='',itemName='',turn=0}={}){
 if(!validStatEffects(raw)||!Number.isSafeInteger(quantity)||quantity<1)return{ok:false,error:'effects'};
 const next=expireItemBuffs(state,{turn}).next,events=[];next.itemSystem.buffs=normalizeItemBuffs(next.itemSystem.buffs);
 for(const [index,e]of normalizeStatEffects(raw).entries()){
  let target=leaf(next,e.stat);if(!target||typeof target.value!==typeof e.value||e.operation==='inc'&&typeof target.value!=='number')return{ok:false,error:'effects'};
  if(e.stat==='player.mp.current'&&next.player.aura?.infinite)continue;
  // Temporary sets replace the previous temporary set on this same stat, so expiry cannot resurrect another potion's expired trait.
  const replaced=e.operation==='set'?next.itemSystem.buffs.filter(b=>b.stat===e.stat&&b.kind==='set'):[];
  if(replaced.length){target.owner[target.key]=replaced[0].before;next.itemSystem.buffs=next.itemSystem.buffs.filter(b=>!replaced.includes(b));target=leaf(next,e.stat);}
  const before=target.value,proposed=e.operation==='inc'?before+e.value*quantity:e.value;
  let applied=proposed,kind=e.operation,amount=typeof proposed==='number'?proposed-before:0;
  const temporary=e.duration.unit!=='none',clock=minute(next.worldClock),expiresTurn=e.duration.unit==='turns'?turn+e.duration.value:null,expiresMinute=temporary&&e.duration.unit!=='turns'&&clock!==null?clock+e.duration.value*({minutes:1,hours:60,days:1440}[e.duration.unit]||0):null;
  if(temporary&&expiresTurn===null&&expiresMinute===null)return{ok:false,error:'effects'};
  if(typeof proposed==='number'){
   const [min,max]=bounds(next,e.stat);
   if(e.overflow==='temporary'&&proposed>max){applied=Math.min(999999,proposed);amount=applied-max;kind='cap';}
   else{applied=Math.max(min,Math.min(max,proposed));amount=applied-before;}
  }
  target.owner[target.key]=applied;
  if(temporary&&(kind==='cap'||e.overflow!=='temporary')&&applied!==before){if(next.itemSystem.buffs.length>=240)return{ok:false,error:'capacity'};next.itemSystem.buffs.push({id:`${requestId}:stat:${index}`,itemName,stat:e.stat,kind,before,applied,amount,expiresTurn,expiresMinute});}
  events.push({action:'stat',title:e.stat,intendedDelta:e.operation==='inc'?e.value*quantity:null,delta:typeof applied==='number'?applied-before:0,value:applied,previous:before,temporary:temporary&&(kind==='cap'||e.overflow!=='temporary'),duration:e.duration,itemName});
 }
 return{ok:true,next,events};
}
export function itemStatLabel(stat,language='en'){
 const attributes={'player.attributes.intelligence':'INT','player.attributes.strength':'STR','player.attributes.defense':'DF','player.attributes.agility':'AG'};if(attributes[stat])return attributes[stat];
 const th=language==='th',labels={'player.hp.current':'HP','player.hp.max':th?'HP สูงสุด':'Max HP','player.mp.current':'MP','player.mp.max':th?'MP สูงสุด':'Max MP','player.stamina.current':th?'สตามิน่า':'Stamina','player.stamina.max':th?'สตามิน่าสูงสุด':'Max stamina','player.survival.hunger':th?'ความอิ่ม':'Hunger','player.survival.thirst':th?'น้ำในร่างกาย':'Thirst','player.powerType':th?'ประเภทพลัง':'Power type','player.condition':th?'สภาพร่างกาย':'Condition','progression.experience':'EXP','progression.reputation':th?'ชื่อเสียง':'Reputation'};
 return labels[stat]||stat.replace(/^(player|progression|customPowers)\./u,'').replace(/\./gu,' · ');
}
export function itemStatSummary(effect,language='en'){
 const th=language==='th',value=effect.operation==='inc'&&Number(effect.value)>0?`+${effect.value}`:String(effect.value),duration=effect.duration||{unit:'none',value:0},units={turns:th?'เทิร์น':'turns',minutes:th?'นาที':'minutes',hours:th?'ชั่วโมง':'hours',days:th?'วัน':'days'};
 return`${itemStatLabel(effect.stat,language)} ${value}${duration.unit!=='none'?` · ${duration.value} ${units[duration.unit]}`:''}${effect.overflow==='temporary'?(th?' · เกินเพดานชั่วคราว':' · temporary overflow'):''}`;
}

// Suppress a repeated item benefit, while keeping distinct damage/exertion on the same stat.
export function duplicateItemStatOperation(operation,events){
 const [verb,path,value,meta]=operation;
 if(/^(?:combat|damage|cost|training|power)$/u.test(meta?.category||''))return false;
 const changes=events.filter(e=>e.action==='stat'&&e.title===path);if(!changes.length)return false;
 if(verb==='inc'&&typeof value==='number')return changes.some(e=>value===e.delta||value===e.intendedDelta)||value===changes.reduce((n,e)=>n+e.delta,0)||value===changes.reduce((n,e)=>n+(e.intendedDelta||0),0);
 return verb==='set'&&value===changes.at(-1).value;
}
