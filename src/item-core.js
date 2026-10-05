import {normalizeItemUsage,completeItemDefinition,validStatEffects,normalizeStatEffects,itemDefinitionKey,ITEM_DEFINITION_INSTRUCTIONS} from './item-definition.js?v=0.57.0';
import {applyItemStats,itemStatOptions,normalizeItemBuffs,expireItemBuffs} from './item-effects.js?v=0.57.0';
export {normalizeItemUsage} from './item-definition.js?v=0.57.0';
import {itemSaleBlocked,rightsView,storyMinute} from './commerce-rights.js?v=0.57.0';
import {commerceInventoryValid} from './commerce-engine.js?v=0.57.0';
import {marketplaceInventoryValid} from './marketplace-core.js?v=0.57.0';
import {evidenceText} from './interaction-evidence.js?v=0.57.0';
const clean=(s,n=300)=>typeof s==='string'?s.trim().slice(0,n):'';
const clone=s=>structuredClone(s);
const whole=(n,max=99999)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const list=(v,n=8)=>Array.isArray(v)?v.map(x=>clean(x,300)).filter(Boolean).slice(0,n):[];
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.codePointAt(0),16777619);return(h>>>0).toString(36);};
const units=['none','seconds','minutes','hours','days','turns','unknown'];
const actions=['use','eat','drink','unknown','passive'];
// Descriptive corrections may refine known facts, but cannot refill charges or erase use history.
export function mergeItemUsage(previous, update, entry={}){
 const prior=normalizeItemUsage(previous,entry),raw=update&&typeof update==='object'?update:{};
 return normalizeItemUsage({...prior,...raw,cooldown:{...prior.cooldown,...raw.cooldown,...(prior.cooldown.lastUse?{lastUse:prior.cooldown.lastUse}:{})},charges:prior.charges||raw.charges,...(prior.configured?{...prior,configured:true}:{} )},entry);
}
export function itemRecord(raw){
 if(!raw||typeof raw!=='object'||!clean(raw.name,100)||!clean(raw.id,100)||!whole(raw.quantity))return null;
 const item={id:clean(raw.id,100),name:clean(raw.name,100),category:clean(raw.category,60)||'Other',quantity:raw.quantity,description:clean(raw.description,600),...(raw.rarity?{rarity:clean(raw.rarity,80)}:{}),...(Array.isArray(raw.properties)?{properties:list(raw.properties,12)}:{}),...(raw.commerceRightId?{commerceRightId:clean(raw.commerceRightId,180)}:{})};
 item.usage=normalizeItemUsage(raw.usage,item);return item;
}
const identity=itemDefinitionKey;
export function normalizeItemSystem(raw){
 const out={version:1,loot:[],transfers:[],receipts:[],buffs:normalizeItemBuffs(raw?.buffs),checks:(Array.isArray(raw?.checks)?raw.checks:[]).filter(c=>c?.id&&['found','empty'].includes(c.outcome)).slice(-240).map(c=>({...c}))},ids=new Set();
 for(const p of Array.isArray(raw?.loot)?raw.loot:[]){
  if(!p||!clean(p.id,180)||ids.has(p.id)||!whole(p.revision,9999999)||!clean(p.location,180))continue;
  const seen=new Set(),entries=[];
  for(const e of Array.isArray(p.entries)?p.entries:[]){const item=itemRecord(e?.item);if(!item||item.commerceRightId||!clean(e.id,100)||seen.has(e.id)||!whole(e.initial)||!whole(e.remaining)||e.remaining>e.initial)continue;entries.push({id:e.id,item,initial:e.initial,remaining:e.remaining});seen.add(e.id);}
  if(!entries.length)continue;ids.add(p.id);out.loot.push({id:p.id,title:clean(p.title,180),location:p.location,origin:p.origin==='drop'?'drop':'found',revision:p.revision,source:p.source&&typeof p.source==='object'?clone(p.source):{},sourceId:clean(p.sourceId,100),kind:clean(p.kind,30)||'discovery',evidence:clean(p.evidence,2000),entries});
 }
 out.loot=out.loot.slice(-120);
 for(const r of Array.isArray(raw?.receipts)?raw.receipts:[]){if(!clean(r?.id,180)||out.receipts.some(x=>x.id===r.id)||!['success','refused','failed'].includes(r.outcome))continue;out.receipts.push({...clone(r),id:r.id});}out.receipts=out.receipts.slice(-240);
 out.transfers=(Array.isArray(raw?.transfers)?raw.transfers:[]).filter(r=>clean(r?.id,180)&&clean(r?.npcId,100)&&itemRecord(r?.item)).slice(-160).map(r=>({...clone(r),item:itemRecord(r.item)}));
 return out;
}
const includes=(hay,needle)=>Boolean(clean(needle))&&evidenceText(hay).includes(evidenceText(needle));
// Uncollected is the expected state of Loot, not a denial of discovery.
const lootSourceActivity={combat:/(?:สังหาร|ฆ่า|กำจัด|ปราบ|ล้ม(?:ลงแน่นิ่ง|ตาย|ศัตรู|ก็อบลิน)|ศพ|slain|killed|defeated|corpse)/iu,dungeon:/(?:พิชิต|เคลียร์|clear|conquer|completed)/iu,container:/(?:เปิด|งัด|ค้น|open|unlock|search)/iu,search:/(?:เดิน|เข้า|มาถึง|ดู|ค้น|สำรวจ|approach|reach|inspect|search|examine)/iu,gathering:/(?:ขุด|เก็บเกี่ยว|ตกปลา|จับปลา|เด็ด|ตัดไม้|สมุนไพร|mine|harvest|forage|fish|gather|chop)/iu};
const denial=/(?:ยังไม่(?:ได้)?พบ|ไม่ได้พบ|ไม่พบ|ไม่มี(?:ไอเทม|สิ่งของ)|\b(?:hypothetical|did not find|not found)\b)/iu;
export function ingestLoot(state,input,{story='',source={},location=state.location?.place||''}={}){
 const next=clone(state);next.itemSystem=normalizeItemSystem(next.itemSystem);const errors=[],added=[];
 for(const raw of (Array.isArray(input)?input:input?[input]:[]).slice(0,12)){
  const evidence=clean(raw?.evidence,2000),title=clean(raw?.title,180)||clean(raw?.items?.[0]?.name,100),place=clean(raw?.location,180)||clean(location,180);
  if(!title||!place||!evidence||!includes(story,evidence)||denial.test(evidence)){errors.push('loot-evidence');continue;}
  const sourceId=clean(raw.sourceId,100),id=clean(raw.id,100)||hash([title,evidence,place].join('|')),key='loot-'+hash(sourceId?[place,sourceId].join('|'):[source.turnKey,source.variant,id].join('|'));
  const generated=Boolean(lootSourceActivity[raw.kind]?.test(evidence))&&!/(?:ยังไม่(?:ได้)?(?:พบ|เปิด|ฆ่า|สังหาร|พิชิต)|ไม่ได้(?:พบ|เปิด|ฆ่า|สังหาร|พิชิต)|สมมุติ|วางแผน|จะ(?:ฆ่า|สังหาร|เปิด|พิชิต)|\b(?:not yet|did not|hypothetical|will|would|might)\b)/iu.test(evidence);
  if(next.itemSystem.loot.some(p=>p.id===key))continue;
  const entries=[];
  for(const [index,value]of (Array.isArray(raw.items)?raw.items:[]).entries()){
   const name=clean(value?.name,100),quantity=value?.quantity;
   if(!name||!whole(quantity)||!quantity||!includes(evidence,name)&&!generated||value.commerceRightId){errors.push('loot-item');continue;}
   const item=itemRecord(completeItemDefinition({...value,id:clean(value.id,100)||'loot-item-'+hash([key,index,name].join('|')),quantity}));
   if(!item)continue;entries.push({id:hash([key,index,item.id].join('|')),item,initial:quantity,remaining:quantity});
  }
  if(!entries.length||entries.length>30){errors.push('loot-items');continue;}
  if(next.itemSystem.loot.length>=120){const old=next.itemSystem.loot.findIndex(p=>p.entries.every(e=>!e.remaining));if(old<0){errors.push('capacity');continue;}next.itemSystem.loot.splice(old,1);}
  const pool={id:key,title,location:place,origin:'found',revision:0,source:clone(source),sourceId,kind:raw.kind||'discovery',evidence,entries};next.itemSystem.loot.push(pool);added.push(pool);
 }
 return{next,added,errors};
}
export function lootErrorText(errors,language='en'){
 const th=language==='th',reasons={
  'loot-evidence':th?'ไม่มีคำยืนยันว่าพบของในบทโรล':'missing or mismatched discovery quote',
  'loot-item':th?'ชื่อไม่อยู่ในคำยืนยัน หรือจำนวนไม่ใช่จำนวนเต็มบวก':'item absent from the quote or quantity is not a positive integer',
  'loot-items':th?'ไม่มีรายการที่ยืนยันได้ หรือเกิน 30 รายการต่อแหล่ง':'no valid items or more than 30 items per source',
  capacity:th?'แหล่ง Loot ที่ยังไม่เก็บครบถึงขีดจำกัด 120 แหล่ง':'120 uncollected loot sources already stored',
 };
 return(th?'ข้าม Loot เฉพาะรายการที่ยืนยันไม่ได้: ':'Skipped unconfirmed Loot: ')+[...new Set(errors)].map(e=>reasons[e]||e).join(' · ');
}
export function currentItemNpcs(state,participants=[]){
 const names=new Set(list(participants,30).map(evidenceText));return(state.npcs||[]).filter(n=>n.enabled!==false&&[n.name,...n.aliases||[]].some(name=>names.has(evidenceText(name))));
}
export function itemReserved(state,itemId,quantity=1){
 if(itemSaleBlocked(state,itemId))return false;
 const trial={...state,inventory:(state.inventory||[]).map(i=>i.id===itemId?{...i,quantity:i.quantity-quantity}:i)};
 return !marketplaceInventoryValid(trial)||!commerceInventoryValid(trial);
}
export function itemAvailability(state,item,{turn=0}={}){
 const usage=normalizeItemUsage(item?.usage,item),cooldown=usage.cooldown,last=cooldown.lastUse;
 if(!item||!whole(item.quantity)||!item.quantity)return{ok:false,error:'inventory',usage};
 if(item.commerceRightId){const r=rightsView(state).find(r=>r.id===item.commerceRightId);if(!r||r.effectiveStatus!=='active')return{ok:false,error:'expired',usage};if(r.terms.uses)return{ok:false,error:'provider',usage};}
 else if(itemSaleBlocked(state,item.id))return{ok:false,error:'ownership',usage};
 if(usage.consumable&&itemReserved(state,item.id))return{ok:false,error:'reserved',usage};
 if(['unknown','passive'].includes(usage.action))return{ok:false,error:usage.action,usage};
 if(usage.charges?.remaining===0)return{ok:false,error:'charges',usage};
 if(last&&cooldown.value&&cooldown.unit!=='unknown'&&cooldown.unit!=='none'){
  const now=storyMinute(state.worldClock),previous=storyMinute(last),elapsed=cooldown.unit==='turns'?turn-last.turn:now===null||previous===null?null:(now-previous)*60;
  const required=cooldown.unit==='turns'?cooldown.value:cooldown.value*({seconds:1,minutes:60,hours:3600,days:86400}[cooldown.unit]||0);
  if(elapsed===null||elapsed<required)return{ok:false,error:'cooldown',remaining:elapsed===null?null:required-elapsed,usage};
 }
 return{ok:true,usage};
}
export function prepareItemAction(state,input,{participants=[],turn=0,requestId='item-'+globalThis.crypto?.randomUUID?.(),location=state.location?.place}={}){
 if(!input||!['collect','use','drop','gift'].includes(input.action))return{ok:false,error:'action'};
 const system=normalizeItemSystem(state.itemSystem),id=clean(requestId,180);if(!id||system.receipts.some(r=>r.id===id))return{ok:false,error:'duplicate'};
 let data={id,action:input.action,location:clean(location,180),turn};if(!data.location)return{ok:false,error:'location'};
 if(input.action==='collect'){
  const pool=system.loot.find(p=>p.id===input.poolId);if(!pool||pool.revision!==input.revision||evidenceText(pool.location)!==evidenceText(data.location))return{ok:false,error:'stale'};
  const seen=new Set(),entries=[];
  for(const pick of Array.isArray(input.entries)?input.entries:[]){const e=pool.entries.find(e=>e.id===pick.id);if(!e||seen.has(e.id)||!whole(pick.quantity)||!pick.quantity||pick.quantity>e.remaining)return{ok:false,error:'inventory'};seen.add(e.id);entries.push({id:e.id,quantity:pick.quantity,item:clone(e.item)});}
  if(!entries.length)return{ok:false,error:'inventory'};data={...data,poolId:pool.id,revision:pool.revision,entries,title:pool.title};
 }else{
  const item=state.inventory?.find(i=>i.id===input.itemId);if(!item||!whole(input.quantity)||!input.quantity||input.quantity>item.quantity)return{ok:false,error:'inventory'};
  if(input.action==='use'){const availability=itemAvailability(state,item,{turn});if(!availability.ok)return availability;if(availability.usage.charges&&input.quantity>availability.usage.charges.remaining)return{ok:false,error:'charges'};if(!availability.usage.consumable&&input.quantity!==1)return{ok:false,error:'quantity'};}
  if((input.action!=='use'||normalizeItemUsage(item.usage,item).consumable)&&itemReserved(state,item.id,input.quantity))return{ok:false,error:'reserved'};
  if(input.action!=='use'&&itemSaleBlocked(state,item.id))return{ok:false,error:'ownership'};
  const npc=input.action==='gift'?currentItemNpcs(state,participants).find(n=>n.id===input.npcId):null;if(input.action==='gift'&&!npc)return{ok:false,error:'npc'};
  data={...data,item:itemRecord(completeItemDefinition(item)),quantity:input.quantity,target:clean(input.target,300),...(npc?{npc:{id:npc.id,name:npc.name}}:{})};
 }
 return{ok:true,request:data};
}
export function validateItemResponse(raw,request,{storyOnly=false}={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return{ok:false,error:'response'};
 const narrative=typeof raw.narrative==='string'?raw.narrative.trim():'',d=raw.itemAction||raw;
 if(d.requestId!==request.id||!['success','refused','failed'].includes(d.outcome)||!clean(d.reason,600))return{ok:false,error:'response'};
 if(!storyOnly&&(!narrative||narrative.length>18000||!/^\s*<(?:tr-narrative|tr-dialogue|tr-header)\b/u.test(narrative)||/tretaresia_patch|<script|<iframe|<style|<!--/iu.test(narrative)))return{ok:false,error:'narrative'};
 if(!storyOnly&&narrative.replace(/<(tr-narrative|tr-dialogue)\b[^>]*>[\s\S]*?<\/\1\s*>|<tr-header\b[^>]*\/\s*>/gu,'').trim())return{ok:false,error:'narrative'};
 const evidence=clean(d.evidence,2000),story=storyOnly?raw.story:narrative;
 if(!evidence||!includes(story,evidence))return{ok:false,error:'evidence'};
 const names=request.action==='collect'?request.entries.map(e=>e.item.name):[request.item.name];
 if(!names.every(name=>includes(story,name))||request.npc&&!includes(story,request.npc.name))return{ok:false,error:'evidence'};
 const effects=d.stats===undefined?null:d.stats;if(effects!==null&&!validStatEffects(effects))return{ok:false,error:'effects'};
 const meters=[];for(const v of Array.isArray(d.meters)?d.meters:[]){if(meters.some(m=>m.meter===v?.meter)||!['hp','mp','stamina','hunger','thirst'].includes(v?.meter)||!Number.isFinite(v.delta)||Math.abs(v.delta)>99999||!clean(v.reason,300)||!includes(story,v.evidence||''))return{ok:false,error:'effects'};meters.push({meter:v.meter,delta:v.delta,reason:clean(v.reason,300)});}
 if(effects?.length&&(request.action!=='use'||d.outcome!=='success'))return{ok:false,error:'effects'};
 if(meters.length&&request.action!=='use'||meters.length&&d.outcome!=='success')return{ok:false,error:'effects'};
 return{ok:true,decision:{outcome:d.outcome,reason:clean(d.reason,600),evidence,meters,stats:effects},narrative};
}
export function applyItemDecision(state,request,result){
 if(!result?.ok)return{ok:false,error:result?.error||'response'};
 const next=clone(state);next.itemSystem=normalizeItemSystem(next.itemSystem);
 if(next.itemSystem.receipts.some(r=>r.id===request.id))return{ok:false,error:'duplicate'};
 const prepared=prepareItemAction(next,request.action==='collect'?{action:'collect',poolId:request.poolId,revision:request.revision,entries:request.entries}:{action:request.action,itemId:request.item.id,quantity:request.quantity,npcId:request.npc?.id,target:request.target},{requestId:request.id,participants:request.npc?[request.npc.name]:[],turn:request.turn,location:request.location});
 if(!prepared.ok)return prepared;
 if(identity(prepared.request.item||{usage:{}})!==identity(request.item||{usage:{}}))return{ok:false,error:'stale'};
 const events=[];if(result.decision.outcome==='success'){
  if(request.action==='collect'){
   const pool=next.itemSystem.loot.find(p=>p.id===request.poolId);
   for(const pick of request.entries){const e=pool.entries.find(e=>e.id===pick.id);if(!e||identity(e.item)!==identity(pick.item))return{ok:false,error:'stale'};
    let existing=next.inventory.find(i=>i.id===e.item.id);
    if(existing&&identity(itemRecord(existing))!==identity(e.item))existing=null;
    existing ||= next.inventory.find(i=>identity(itemRecord(i))===identity(e.item));
    if(existing){if(existing.quantity+pick.quantity>99999)return{ok:false,error:'capacity'};existing.quantity+=pick.quantity;existing.usage=mergeItemUsage(existing.usage,e.item.usage,existing);existing.rarity=e.item.rarity;existing.properties=e.item.properties;}else{if(next.inventory.length>=200)return{ok:false,error:'capacity'};const item=clone(e.item);if(next.inventory.some(i=>i.id===item.id))item.id='item-'+hash(request.id+e.id);item.quantity=pick.quantity;next.inventory.push(item);}
    e.remaining-=pick.quantity;events.push({action:'picked',title:e.item.name,delta:pick.quantity});
   }pool.revision++;
  }else{const item=next.inventory.find(i=>i.id===request.item.id),usage=normalizeItemUsage(request.item.usage,request.item);item.usage=usage;
   const consumed=request.action!=='use'||usage.consumable;if(consumed){item.quantity-=request.quantity;events.push({action:request.action==='gift'?'gifted':request.action==='drop'?'dropped':'used',title:item.name,delta:-request.quantity});}
   else events.push({action:'used',title:item.name,delta:0});
   if(request.action==='drop'){
    if(next.itemSystem.loot.length>=120){const old=next.itemSystem.loot.findIndex(p=>p.entries.every(e=>!e.remaining));if(old<0)return{ok:false,error:'capacity'};next.itemSystem.loot.splice(old,1);}
    const dropped=clone(request.item);dropped.quantity=request.quantity;const pool={id:'drop-'+hash(request.id),title:item.name,location:request.location,origin:'drop',revision:0,source:clone(request.source||{}),evidence:result.decision.evidence,entries:[{id:hash(request.id+item.id),item:dropped,initial:request.quantity,remaining:request.quantity}]};next.itemSystem.loot.push(pool);
   }
   if(request.action==='gift'){next.itemSystem.transfers.push({id:request.id,npcId:request.npc.id,npcName:request.npc.name,item:{...clone(request.item),quantity:request.quantity},location:request.location,source:clone(request.source||{})});next.itemSystem.transfers=next.itemSystem.transfers.slice(-160);}
   if(request.action==='use'){
    if(usage.charges)usage.charges.remaining-=usage.consumable?request.quantity:1;
    if(storyMinute(next.worldClock)!==null)usage.cooldown.lastUse={...next.worldClock,day:next.worldClock.day,time:next.worldClock.time,turn:request.turn};item.usage=usage;
    const configured=usage.stats;
    const legacy=result.decision.meters.map(m=>({stat:['hunger','thirst'].includes(m.meter)?'player.survival.'+m.meter:'player.'+m.meter+'.current',operation:'inc',value:m.delta,overflow:'clamp',duration:{unit:'none',value:0}}));
    // Authored per-item effects are authoritative; legacy result deltas never add a second restoration.
    const applied=applyItemStats(next,Array.isArray(configured)?configured:result.decision.stats||legacy,{quantity:Array.isArray(configured)||result.decision.stats?request.quantity:1,requestId:request.id,itemName:item.name,turn:request.turn});
    if(!applied.ok)return applied;Object.assign(next,applied.next);events.push(...applied.events);
   }
   if(!item.quantity)next.inventory=next.inventory.filter(i=>i.id!==item.id);
  }
 }
 const receipt={id:request.id,action:request.action,outcome:result.decision.outcome,reason:result.decision.reason,location:request.location,source:clone(request.source||{}),events:clone(events),npc:request.npc||null};next.itemSystem.receipts.push(receipt);next.itemSystem.receipts=next.itemSystem.receipts.slice(-240);

 return{ok:true,next,receipt,events,narrative:result.narrative};
}
export const ITEM_INSTRUCTIONS=ITEM_DEFINITION_INSTRUCTIONS+'\n'+`RoleForge Loot/Items: put all discovered-but-uncollected named items in the SAME normal reply's hidden tretaresia_patch. Schema loot:[{id,title,location,evidence:exact visible quote,items:[{id,name,quantity:positive integer,category,description,usage:{action:"use|eat|drink|unknown|passive",consumable:boolean,effect,conditions:[],target,cooldown:{unit:"none|seconds|minutes|hours|days|turns|unknown",value:0},charges:null}}]}]. Finding or defeating does not collect items: no inventory increment until picked up, received or acquired. Show item names and effects in visible narrative. A confirmed combat/dungeon/search source quote may anchor newly authored rewards; otherwise include each item name in the evidence quote. Include only items with confirmed positive integer quantities; omit unknown contents rather than sending null, zero or invented quantities. Author appropriate confirmed item counts and complete properties for newly revealed recoverable goods. Preserve intentional unknown properties on existing unidentified items. Reusable weapons/tools/keys have consumable:false. Include usage metadata with every inventory acquisition or metadata correction. For direct collection of a KNOWN loot pool use itemEvents.collect with its IDs and revision so its remaining quantities are decremented. Other items already acquired directly in the story use existing inventory ops, never duplicate them as uncollected loot. Preserve stable IDs and existing unknowns. For confirmed user-initiated collect/use/drop/gift output itemEvents:[{id,action,outcome:"success|refused|failed",itemId,quantity,npcId,target,poolId,revision,entries:[{id,quantity}],userEvidence:exact latest user quote,evidence:exact visible outcome quote,reason,meters:[]}]. These events replace inventory ops for the SAME items; do not emit both. For collect refer to known loot pool and entry IDs. Gift recipients must be current scene participants; refusal does not transfer items. Drop moves items to the current location, not deletion. meters only on successful use: [{meter:"hp|mp|stamina|hunger|thirst",delta:number,reason,evidence:exact visible quote}]; do not invent numerical restoration if unknown. Do not reset cooldown/charges. Only confirmed current outcomes, never hypothetical/future plans or thoughts. After every completed combat victory, killed enemy or conquered dungeon provide appropriate uncollected Loot in this same reply. Consider containers, shelves, drawers, desks, ruins, nests, corpses, caches, altars, mining, fishing and harvesting; exploratory sources can be empty. Emit kind and stable sourceId identifying the actual encounter/container; reuse sourceId on revisits so depleted sources cannot refill. For combat/dungeon/search Loot evidence may quote the completed source event rather than enumerate all item names. Ordinary roads, ongoing fights, failed/locked unopened chests, plans/OOC and a shop catalog are not Loot. Never duplicate an item already granted as a quest reward or direct inventory receipt. Include positive integer quantities, never null/unknown; derive appropriate counts and complete definitions now. No separate loot API is needed when this payload is valid.`;
export function itemPromptReference(state){const system=normalizeItemSystem(state.itemSystem);return{inventory:(state.inventory||[]).slice(-60).map(i=>({id:i.id,name:i.name,quantity:i.quantity,category:i.category,description:i.description,usage:normalizeItemUsage(i.usage,i),rarity:i.rarity,properties:i.properties,commerceRightId:i.commerceRightId||''})),loot:system.loot.filter(p=>p.entries.some(e=>e.remaining)&&evidenceText(p.location)===evidenceText(state.location?.place)).slice(-12),transfers:system.transfers.slice(-16),receipts:system.receipts.slice(-12).map(({id,action,outcome})=>({id,action,outcome}))};}
const actionWords={use:/(?:ใช้|กิน|ดื่ม|use|eat|drink|consume)/iu,drop:/(?:ทิ้ง|วาง|drop|discard|leave)/iu,gift:/(?:ให้|มอบ|ส่ง|give|gift|hand|offer)/iu,collect:/(?:เก็บ|หยิบ|รับ|collect|pick|take|loot)/iu};
const deniedUser=/(?:สมมุติ|ถ้า|หาก|แค่พูด|พูดเฉย|ไม่(?:ได้)?(?:กิน|ดื่ม|ใช้|ทิ้ง|มอบ|เก็บ|หยิบ)|\bif\b|hypothetical|just saying|do not|don't|did not)/iu;
export function applyStoryItemEvents(state,input,{story='',user='',source={},participants=[],turn=0}={}){
 let next=clone(state);const events=[],errors=[],owned=new Set(),statPaths=[];let changes=0;
 for(const raw of Array.isArray(input)?input.slice(0,12):[]){
  const userEvidence=clean(raw?.userEvidence,1800);if(!raw?.id||!actionWords[raw.action]||!includes(user,userEvidence)||deniedUser.test(userEvidence)||!actionWords[raw.action].test(userEvidence)){errors.push('consent');continue;}
  const id='story-item-'+hash([source.turnKey,source.variant,raw.id].join('|'));
  if(normalizeItemSystem(next.itemSystem).receipts.some(r=>r.id===id))continue;
  const prepared=prepareItemAction(next,{...raw,itemId:raw.itemId},{participants,turn,requestId:id});
  if(!prepared.ok){errors.push(prepared.error);continue;}
  const request={...prepared.request,source};
  if(request.action!=='collect'&&!includes(userEvidence,request.item.name)||request.npc&&!includes(userEvidence,request.npc.name)){errors.push('consent');continue;}
  const checked=validateItemResponse({story,itemAction:{...raw,requestId:id} },request,{storyOnly:true});
  const result=applyItemDecision(next,request,checked);if(!result.ok){errors.push(result.error);continue;}
  next=result.next;changes++;events.push(...result.events);statPaths.push(...result.events.filter(e=>e.action==='stat').map(e=>e.title));
  for(const item of request.entries?.map(e=>e.item)||[request.item]){owned.add(item.id);owned.add(item.name);}
 }
 return{next,events,errors,owned,changes,statPaths};
}

const unknownValue=value=>!clean(value)||/^(?:unknown|none known|no details|no description|ยังไม่ทราบ|ไม่ทราบ|ไม่มีรายละเอียด|ไม่มีข้อมูล|ไม่ระบุ|—|-)$/iu.test(clean(value));
export function itemMissingFields(item){
 const u=normalizeItemUsage(item?.usage,item),fields=[];if(u.consumable&&!Array.isArray(u.stats))fields.push('stats');
 if(unknownValue(item?.description))fields.push('description');
 if(u.action==='unknown')fields.push('action');
 if(unknownValue(u.effect)||u.effect===item?.description)fields.push('effect');
 if(!u.conditions.length)fields.push('conditions');
 if(unknownValue(u.target))fields.push('target');
 if(u.cooldown.unit==='unknown')fields.push('cooldown');
 return fields;
}
export function missingInventoryDetails(state){return(state.inventory||[]).filter(i=>i.quantity>0&&itemMissingFields(i).length).map(i=>({item:clone(i),missing:itemMissingFields(i)}));}
// This task can fill descriptive gaps only. The response cannot change ownership,
// quantities, existing effects/conditions, cooldown history, or remaining charges.
export function applyItemDetails(state,request,raw){
 if(!raw||raw.requestId!==request.id||!Array.isArray(raw.items)||raw.items.length!==request.items.length)return{ok:false,error:'response'};
 const next=clone(state),seen=new Set(),updated=[],unresolved=[];
 for(const data of raw.items){
  const requested=request.items.find(x=>x.item.id===data?.id),current=next.inventory.find(i=>i.id===data?.id);
  if(!requested||!current||seen.has(data.id)||Object.keys(data).some(k=>!['id','description','usage'].includes(k)))return{ok:false,error:'response'};seen.add(data.id);
  if(identity(itemRecord(current))!==identity(itemRecord(requested.item))||current.quantity!==requested.item.quantity)return{ok:false,error:'stale'};
  const missing=itemMissingFields(current),previous=JSON.stringify(current),u=normalizeItemUsage(current.usage,current),incoming=data.usage;
  if(data.description!==undefined&&(typeof data.description!=='string'||data.description.length>600))return{ok:false,error:'response'};
  if(missing.includes('description')&&!unknownValue(data.description))current.description=clean(data.description,600);
  if(incoming!==undefined){
   if(!incoming||typeof incoming!=='object'||Array.isArray(incoming)||Object.keys(incoming).some(k=>!['action','consumable','effect','conditions','target','cooldown','charges','stats'].includes(k)))return{ok:false,error:'response'};
   if(incoming.stats!==undefined&&!validStatEffects(incoming.stats))return{ok:false,error:'response'};
   if(missing.includes('stats')&&incoming.stats!==undefined)u.stats=normalizeStatEffects(incoming.stats);
   if(incoming.action!==undefined&&!actions.includes(incoming.action)||incoming.consumable!==undefined&&typeof incoming.consumable!=='boolean'||incoming.effect!==undefined&&typeof incoming.effect!=='string'||incoming.target!==undefined&&typeof incoming.target!=='string'||incoming.conditions!==undefined&&(!Array.isArray(incoming.conditions)||incoming.conditions.some(c=>typeof c!=='string'))||incoming.cooldown!==undefined&&(!incoming.cooldown||!units.includes(incoming.cooldown.unit)||!whole(incoming.cooldown.value,52560000)))return{ok:false,error:'response'};
   if(missing.includes('action')&&incoming.action&&incoming.action!=='unknown'){u.action=incoming.action;u.consumable=['eat','drink'].includes(u.action)||incoming.consumable===true;}
   if(missing.includes('effect')&&!unknownValue(incoming.effect))u.effect=clean(incoming.effect,600);
   if(missing.includes('target')&&!unknownValue(incoming.target))u.target=clean(incoming.target,160);
   if(missing.includes('conditions')&&incoming.conditions?.length)u.conditions=list(incoming.conditions);
   if(missing.includes('cooldown')&&incoming.cooldown?.unit!=='unknown'&&incoming.cooldown){u.cooldown={...incoming.cooldown,...(u.cooldown.lastUse?{lastUse:u.cooldown.lastUse}:{})};}
   current.usage=normalizeItemUsage(u,current);
  }
  if(JSON.stringify(current)!==previous)updated.push(current.id);if(itemMissingFields(current).length)unresolved.push(current.id);
 }
 return{ok:true,next,updated,unresolved};
}

export function configureItemUsage(state,itemId,usage){
 const current=state.inventory?.find(i=>i.id===itemId);if(!current)return{ok:false,error:'inventory'};
 if(!usage||!actions.includes(usage.action)||typeof usage.consumable!=='boolean'||!validStatEffects(usage.stats))return{ok:false,error:'effects'};
 const options=itemStatOptions(state);if(usage.stats.some(e=>!options.some(o=>o.stat===e.stat&&o.type===typeof e.value)))return{ok:false,error:'effects'};
 const next=clone(state),entry=next.inventory.find(i=>i.id===itemId);
 entry.usage=normalizeItemUsage({...mergeItemUsage(current.usage,{...usage,configured:false},current),...usage,cooldown:{...usage.cooldown,...(current.usage?.cooldown?.lastUse?{lastUse:current.usage.cooldown.lastUse}:{})},charges:current.usage?.charges||usage.charges,stats:normalizeStatEffects(usage.stats),configured:true},current);
 return{ok:true,next};
}
