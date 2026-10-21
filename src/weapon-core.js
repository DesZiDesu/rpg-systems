import {WEAPON_CATEGORIES,WEAPON_CATEGORY_IDS,weaponCategory,namedWeaponModel,SPECIAL_WEAPON_MODELS,weaponModelUrl} from './weapon-catalog.js?v=0.81.0';
import {evidenceText,interactionEvidence} from './interaction-evidence.js?v=0.81.0';

const clean=(v,n=160)=>typeof v==='string'?v.trim().slice(0,n):'';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000;
const amount=v=>integer(v)?v:null;
const key=v=>evidenceText(v).toLocaleLowerCase();
const hash=v=>{let h=2166136261;for(const c of String(v))h=Math.imul(h^c.codePointAt(0),16777619);return(h>>>0).toString(36);};
const modes=new Set(['none','magazine','rounds','arrows','energy','quantity','charges']);
export function weaponImageSource(raw){
 const s=clean(raw,98305);if(!s||s.length>98304)return '';
 if(/^data:image\/(?:png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/]+=*$/u.test(s))return s;
 if(s.length<=2048&&/^https:\/\/[^\s<>"']+$/u.test(s)){try{const u=new URL(s);return !u.username&&!u.password?u.href:'';}catch{}}
 if(/^\/(?:user\/images|scripts\/extensions)\/[A-Za-z0-9_./% -]+\.(?:png|webp|jpg|jpeg|gif|avif)$/iu.test(s)&&!s.includes('..'))return s;
 return '';
}
export async function prepareWeaponImage(file,{document:doc=globalThis.document}={}){
 if(!file||file.size>8*1024*1024||!/^image\/(?:png|jpeg|webp|gif|avif|svg\+xml)$/u.test(file.type))throw Error('Choose an image up to 8 MiB.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not decode this weapon image.'));img.src=url;});
  if(img.naturalWidth*img.naturalHeight>32000000)throw Error('This image is too large. Use an image under 32 megapixels.');
  const ratio=Math.min(1,768/img.naturalWidth,320/img.naturalHeight),c=doc.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*ratio));c.height=Math.max(1,Math.round(img.naturalHeight*ratio));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  for(const quality of [.88,.76,.64]){const data=c.toDataURL('image/webp',quality);if(weaponImageSource(data))return data;}
  throw Error('Choose a simpler image; the portable weapon image must fit in 96 KiB.');
 }finally{URL.revokeObjectURL(url);}
}
export function normalizeWeaponMetadata(raw){
 if(!object(raw))return null;
 const category=WEAPON_CATEGORY_IDS.includes(raw.category)?raw.category:'relic',mode=modes.has(raw.mode)?raw.mode:weaponCategory(category).resourceMode,capacity=amount(raw.capacity),current=amount(raw.current);
 return{category,modelId:['auto','generic','excalibur','ea','excalibur-morgan','custom'].includes(raw.modelId)?raw.modelId:'auto',profileId:clean(raw.profileId,80),mode,capacity,current:current===null?null:capacity===null?current:Math.min(current,capacity),ammoItemId:clean(raw.ammoItemId,100),ammoType:clean(raw.ammoType,80),active:raw.active===true,condition:clean(raw.condition,100)};
}
export function normalizeAmmoMetadata(raw){
 if(!object(raw)||!['round','magazine','cell','arrow','bolt'].includes(raw.kind))return null;
 const roundsPerUnit=raw.kind==='round'||raw.kind==='arrow'||raw.kind==='bolt'?1:amount(raw.roundsPerUnit),capacity=amount(raw.capacity);
 if(roundsPerUnit!==null&&capacity!==null&&roundsPerUnit>capacity)return null;
 return{kind:raw.kind,type:clean(raw.type,80),roundsPerUnit,capacity};
}
export function validateWeaponPreset(raw){
 if(!object(raw)||raw.version!==1||!Array.isArray(raw.definitions)||raw.definitions.length>64)throw Error('Invalid weapon preset.');
 const ids=new Set(),definitions=raw.definitions.map(d=>{
  if(!object(d)||!/^[a-z0-9_-]{1,80}$/iu.test(d.id||'')||ids.has(d.id)||!clean(d.name,100)||!WEAPON_CATEGORY_IDS.includes(d.category)||!modes.has(d.mode)||!['auto','generic','excalibur','ea','excalibur-morgan','custom'].includes(d.modelId))throw Error('Every weapon profile needs a unique ID, name, category and model.');
  if(d.image&&!weaponImageSource(d.image)||d.capacity!==null&&d.capacity!==undefined&&!integer(d.capacity))throw Error('Invalid weapon image or capacity.');
  ids.add(d.id);return{id:d.id,name:clean(d.name,100),aliases:(Array.isArray(d.aliases)?d.aliases:[]).map(v=>clean(v,100)).filter(Boolean).slice(0,12),category:d.category,mode:d.mode,modelId:d.modelId,image:weaponImageSource(d.image),capacity:amount(d.capacity),ammoType:clean(d.ammoType,80)};
 });
 const result={version:1,definitions};if(new TextEncoder().encode(JSON.stringify(result)).length>768*1024)throw Error('Weapon profiles exceed the portable 768 KiB budget.');return result;
}
export const emptyWeaponPreset=()=>({version:1,definitions:[]});
export function normalizeWeaponSystem(raw){
 const entries=[],ids=new Set();for(const e of (Array.isArray(raw?.entries)?raw.entries:[]).slice(0,200)){
  const itemId=clean(e?.itemId,100),metadata=normalizeWeaponMetadata(e);if(!itemId||!metadata||ids.has(itemId))continue;ids.add(itemId);entries.push({itemId,...metadata});
 }
 const receipts=(Array.isArray(raw?.receipts)?raw.receipts:[]).filter(r=>object(r)&&clean(r.key,240)).slice(-240).map(r=>({key:clean(r.key,240),itemId:clean(r.itemId,100),action:clean(r.action,30)}));
 return{version:1,equippedItemId:clean(raw?.equippedItemId,100),entries,receipts};
}
const categoryHints=[
 ['revolver',/\brevolver\b|ลูกโม่|\bm686\b/iu],['smg',/\b(?:smg|submachine|mp5|uzi)\b|ปืนกลมือ/iu],['machine-gun',/\b(?:machine.?gun|lmg|m249|m60)\b|ปืนกลหนัก|ปืนกลเบา/iu],
 ['shotgun',/\bshotgun\b|ลูกซอง/iu],['sniper',/\b(?:sniper|precision rifle)\b|ซุ่มยิง/iu],['rifle',/\b(?:rifle|akm|ak[- ]?47|m4|m16)\b|ไรเฟิล/iu],['pistol',/\b(?:pistol|handgun|glock)\b|ปืนพก/iu],['launcher',/\b(?:launcher|rpg[- ]?7)\b|เครื่องยิง/iu],
 ['crossbow',/\bcrossbow\b|หน้าไม้/iu],['bow',/\b(?:(?:long|short|compound|recurve)\s*)?bow\b|ธนู/iu],['greatsword',/\b(?:greatsword|claymore)\b|ดาบใหญ่/iu],['katana',/\bkatana\b|คาตานะ/iu],['rapier',/\brapier\b|เรเปียร์/iu],['dual-blades',/\bdual blades?\b|ดาบคู่/iu],
 ['dagger',/\b(?:dagger|knife)\b|กริช|มีด/iu],['axe',/\baxe\b|ขวาน/iu],['hammer',/\bhammer\b|ค้อน/iu],['mace',/\b(?:mace|club)\b|กระบอง/iu],['polearm',/\b(?:halberd|polearm|glaive)\b|ง้าว/iu],['spear',/\b(?:spear|lance)\b|หอก|ทวน/iu],['scythe',/\bscythe\b|เคียว/iu],['whip',/\bwhip\b|แส้/iu],['chain',/\b(?:chain|nunchaku)\b|โซ่/iu],['gauntlet',/\b(?:gauntlet|knuckles)\b|สนับมือ|ถุงมือเกราะ/iu],['throwing',/\b(?:throwing|shuriken)\b|ดาวกระจาย|มีดขว้าง/iu],['boomerang',/\bboomerang\b|บูมเมอแรง/iu],
 ['grimoire',/\bgrimoire\b|คัมภีร์เวท/iu],['staff',/\bstaff\b|คทาเวท/iu],['wand',/\bwand\b|ไม้กายสิทธิ์/iu],['catalyst',/\b(?:catalyst|orb)\b|ลูกแก้ว|สื่อเวท/iu],['shield',/\bshield\b|โล่/iu],['energy',/\b(?:energy weapon|ion caster|blaster|laser)\b|อาวุธพลังงาน/iu],['sword',/\bsword\b|ดาบ|กระบี่/iu],
];
export function inferWeaponCategory(item){
 if(item?.ammo||item?.commerceRightId||/ammo|ammunition|กระสุน|magazine|แม็ก|แม็ค/iu.test(item?.category||''))return '';
 if(item?.weapon)return normalizeWeaponMetadata(item.weapon)?.category||'relic';
 const category=key(item?.category);if(WEAPON_CATEGORY_IDS.includes(category))return category;
 const special=namedWeaponModel(item?.name);if(special)return SPECIAL_WEAPON_MODELS[special].category;
 if(!/^(?:weapon|อาวุธ|equipment|อุปกรณ์|tool|เครื่องมือ|other|อื่น ๆ|item)?$/iu.test(category))return '';
 // Specific hints precede broader knife/sword names.
 if(/throwing|shuriken|ขว้าง|ดาวกระจาย/iu.test(item?.name||''))return 'throwing';
 return categoryHints.find(([,re])=>re.test(item?.name||''))?.[0]||(/weapon|อาวุธ/iu.test(category)?'relic':'');
}
export function ownedWeaponViews(state,preset=emptyWeaponPreset()){
 const system=normalizeWeaponSystem(state?.weaponSystem),profiles=preset?.definitions||[];
 return(state?.inventory||[]).filter(i=>i?.quantity>0&&!i.commerceRightId&&!i.ammo).flatMap(item=>{
  const profile=profiles.find(d=>d.id===item.weapon?.profileId||[d.name,...d.aliases||[]].some(n=>key(n)===key(item.name))),saved=system.entries.find(e=>e.itemId===item.id),category=profile?.category||saved?.category||inferWeaponCategory(item);
  if(!category)return[];
  const metadata=normalizeWeaponMetadata({category,...item.weapon,...saved,...(profile?{category:profile.category,mode:profile.mode,modelId:profile.modelId,capacity:profile.capacity,ammoType:profile.ammoType,profileId:profile.id}:{})});
  const named=namedWeaponModel(item.name),requested=metadata.modelId,modelId=profile&&['excalibur','ea','excalibur-morgan'].includes(profile.modelId)?profile.modelId:requested==='generic'?'generic':requested==='custom'&&profile?.image?'custom':named&&['auto',named].includes(requested)?named:'generic';
  const actual=modelId==='custom'?'custom':modelId;
  return[{itemId:item.id,name:item.name,quantity:item.quantity,...metadata,modelId:actual,image:actual==='custom'?profile.image:SPECIAL_WEAPON_MODELS[actual]?.image||weaponModelUrl(category),equipped:system.equippedItemId===item.id,profile:profile||null,current:metadata.mode==='quantity'?item.quantity:metadata.current}];
 });
}
export function equippedWeapon(state,preset){return ownedWeaponViews(state,preset).find(w=>w.equipped)||null;}
export function assertWeaponPresetCompatible(state,preset){
 const system=normalizeWeaponSystem(state.weaponSystem);
 for(const view of ownedWeaponViews(state,preset)){
  const raw=normalizeWeaponMetadata(system.entries.find(e=>e.itemId===view.itemId)||state.inventory.find(i=>i.id===view.itemId)?.weapon);
  if(view.profile&&view.capacity!==null&&raw?.current!==null&&raw?.current>view.capacity)throw Error(`Existing ${view.name} resources exceed the preset capacity. Adjust the capacity or loaded resources first.`);
 }
}
export function configureWeapon(state,itemId,metadata,{equip=false}={}){
 const item=state.inventory?.find(i=>i.id===itemId&&i.quantity>0&&!i.commerceRightId&&!i.ammo);if(!item)throw Error('Choose an owned inventory item.');
 if(metadata?.current!==null&&metadata?.current!==undefined&&!integer(metadata.current)||metadata?.capacity!==null&&metadata?.capacity!==undefined&&!integer(metadata.capacity)||integer(metadata?.current)&&integer(metadata?.capacity)&&metadata.current>metadata.capacity)throw Error('Loaded resources must be within capacity.');
 const normalized=normalizeWeaponMetadata(metadata);if(!normalized)throw Error('Invalid weapon details.');
 const next=structuredClone(state),system=normalizeWeaponSystem(next.weaponSystem),i=system.entries.findIndex(e=>e.itemId===itemId),entry={itemId,...normalized};if(i<0)system.entries.push(entry);else system.entries[i]=entry;
 if(equip)system.equippedItemId=itemId;next.weaponSystem=system;return next;
}
export function equipWeapon(state,itemId,preset){
 if(itemId&&!ownedWeaponViews(state,preset).some(w=>w.itemId===itemId))throw Error('This weapon is no longer owned.');
 const next=structuredClone(state);next.weaponSystem=normalizeWeaponSystem(next.weaponSystem);next.weaponSystem.equippedItemId=itemId;return next;
}
export function compatibleAmmo(weapon,item){
 const ammo=normalizeAmmoMetadata(item?.ammo);if(!ammo||!item.quantity||!ammo.roundsPerUnit||!weapon.ammoType&&weapon.ammoItemId!==item.id)return false;
 const type=v=>key(v).replace(/[\s×x]/gu,'');if(weapon.ammoType&&type(ammo.type)!==type(weapon.ammoType))return false;
 return weapon.mode==='magazine'?ammo.kind==='magazine':weapon.mode==='energy'?ammo.kind==='cell':weapon.mode==='arrows'?['arrow','bolt'].includes(ammo.kind):weapon.mode==='rounds'?ammo.kind==='round':false;
}
export function weaponReserve(state,weapon){
 const rows=(state.inventory||[]).filter(i=>compatibleAmmo(weapon,i)&&(!weapon.ammoItemId||i.id===weapon.ammoItemId));
 return{items:rows,units:rows.reduce((n,i)=>n+i.quantity,0),rounds:rows.reduce((n,i)=>n+i.quantity*normalizeAmmoMetadata(i.ammo).roundsPerUnit,0),kind:['magazine','energy'].includes(weapon.mode)?'packs':'rounds'};
}
export function weaponPromptReference(state,preset){
 const rows=ownedWeaponViews(state,preset),selected=rows.find(w=>w.equipped),owned=selected?[selected,...rows.filter(w=>w!==selected)]:rows,ammo=(state.inventory||[]).filter(i=>i.ammo&&i.quantity>0);
 if(selected)ammo.sort((a,b)=>Number(compatibleAmmo(selected,b))-Number(compatibleAmmo(selected,a)));
 return{equippedItemId:selected?.itemId||'',owned:owned.slice(0,40).map(({itemId,name,category,mode,current,capacity,ammoItemId,ammoType,active})=>({itemId,name,category,mode,current,capacity,ammoItemId,ammoType,active})),ammunition:ammo.slice(0,40).map(({id,name,quantity,ammo})=>({id,name,quantity,ammo}))};
}
const words={equip:/สวม|ถือ|หยิบ|ชัก|เปลี่ยนอาวุธ|\b(?:equip|draw|wield|take|switch|ready|hold)\b/iu,unequip:/เก็บ|ปลด|วาง|\b(?:unequip|sheathe|holster|put away|stow)\b/iu,use:/ยิง|โจมตี|ฟัน|แทง|ขว้าง|ใช้|ปล่อย|\b(?:fire|shoot|attack|strike|slash|stab|throw|use|cast|release)\b/iu,reload:/บรรจุ|รีโหลด|ใส่.*(?:แม็ก|แม็ค|ลูก|กระสุน|เซลล์)|\b(?:reload|load|nock|replace.*cell)\b/iu,activate:/ปลุก|ปลดปล่อย|เปิดใช้|ใช้โฮกุ|\b(?:activate|unleash|release|noble phantasm)\b/iu,deactivate:/ดับ|จาง|หยุด|พัก|เก็บ|\b(?:deactivate|fade|stop|power down|cease)\b/iu,recharge:/ฟื้น|เติม|ชาร์จ|\b(?:recharge|replenish|restore|refill)\b/iu,describe:/ตรวจ|ดู|สำรวจ|\b(?:inspect|check|examine|look)\b/iu};
const denied=/(?:สมมุติ|ถ้า|หาก|วางแผน|ยังไม่|ไม่ได้|ไม่(?:ยิง|ใช้|โจมตี|บรรจุ|รีโหลด)|\b(?:if|hypothetical|would|will|not yet|did not|do not|don't|watch|watches)\b)/iu;
function confirmedEvent(raw,weapon,{story,user,playerName='',authorization}){
 if(authorization){story=authorization.story;user='';}
 const evidence=clean(raw.evidence,2000),quote=evidenceText(evidence),userQuote=clean(raw.userEvidence,1000),action=words[raw.action];
 if(!action||!quote||!key(quote).includes(key(weapon.name))||denied.test(quote)||denied.test(user))return false;
 const subject=/\b(?:you|your|player)\b|คุณ|ผู้เล่น/iu;
 const player=key(playerName);const hasPlayer=subject.test(quote)||player&&key(quote).includes(player);
 const narrative=String(story).replace(/<tr-dialogue\b[^>]*>[\s\S]*?<\/tr-dialogue\s*>/giu,'');
 if(!interactionEvidence(evidence,narrative,user,{test:()=>hasPlayer},action))return false;
 if(authorization)return true;
 if(raw.action==='describe')return true;
 if(raw.action==='deactivate'&&weapon.active)return true;
 return Boolean(userQuote&&evidenceText(user).includes(evidenceText(userQuote))&&action.test(evidenceText(userQuote))&&!denied.test(userQuote));
}
const countWords=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
const thaiCounts=['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'];
function explicitCount(evidence,count){return count===1||new RegExp(`(?:^|[^0-9])${count}(?:[^0-9]|$)`,'u').test(evidence)||count<11&&(new RegExp(`\\b${countWords[count]}\\b`,'iu').test(evidence)||String(evidence).includes(thaiCounts[count]));}
export function applyWeaponEvents(state,input,{enabled=false,preset=emptyWeaponPreset(),story='',user='',source={},reserved=()=>false,authorizedActions=[]}={}){
 const accepted=[],errors=[],managedInventory=new Set();if(!enabled||!Array.isArray(input)||!input.length)return{next:state,accepted,errors,managedInventory};
 let next=structuredClone(state);next.weaponSystem=normalizeWeaponSystem(next.weaponSystem);
 for(const raw of (Array.isArray(input)?input:[]).slice(0,128)){
  if(!object(raw)||!clean(raw.id,100)||raw.actor!=='player'||raw.outcome!=='success')continue;
  const authorization=authorizedActions.find(r=>r.id===raw.requestId&&r.itemId===raw.itemId&&r.action===raw.action);
  if(raw.requestId&&!authorization){errors.push('request');continue;}
  // Continuing changes the content variant of this SAME assistant message.
  // A button nonce is single-use across those content variants, not per hash.
  const receiptKey=authorization?[source.turnKey||source.messageId||'','button',authorization.id].join('|'):[source.turnKey||source.messageId||'',source.variant||'',raw.id].join('|');if(next.weaponSystem.receipts.some(r=>r.key===receiptKey))continue;
  const weapon=ownedWeaponViews(next,preset).find(w=>w.itemId===raw.itemId);if(!weapon||!confirmedEvent(raw,weapon,{story,user,playerName:state.player?.name,authorization})){errors.push('evidence');continue;}
  const trial=structuredClone(next),system=normalizeWeaponSystem(trial.weaponSystem),metadata=normalizeWeaponMetadata(weapon);let affected=[];
  if(raw.action==='equip')system.equippedItemId=weapon.itemId;
  else if(raw.action==='unequip'){if(system.equippedItemId===weapon.itemId)system.equippedItemId='';}
  else if(raw.action==='activate'||raw.action==='deactivate')metadata.active=raw.action==='activate';
  else if(raw.action==='describe'){
   const d=normalizeWeaponMetadata(raw.weapon);if(!d){errors.push('definition');continue;}
   // Inspection can fill unknown numeric fields only when visible numerals agree.
   for(const field of ['current','capacity'])if(metadata[field]===null&&d[field]!==null&&new RegExp(`(?:^|[^0-9])${d[field]}(?:[^0-9]|$)`,'u').test(raw.evidence))metadata[field]=d[field];
   if(!weapon.profile&&weapon.category==='relic'&&WEAPON_CATEGORY_IDS.includes(raw.weapon.category)){metadata.category=d.category;metadata.mode=d.mode;}
   if(!metadata.ammoType&&key(raw.evidence).includes(key(d.ammoType)))metadata.ammoType=d.ammoType;
  }else if(raw.action==='use'){
   const count=raw.count;if(!integer(count)||count<1||!explicitCount(raw.evidence,count)){errors.push('count');continue;}
   if(weapon.mode==='quantity'){
    const item=trial.inventory.find(i=>i.id===weapon.itemId);if(item.quantity<count||reserved(next,item.id,count)){errors.push('inventory');continue;}item.quantity-=count;affected=[item.id];if(!item.quantity)trial.inventory=trial.inventory.filter(i=>i.quantity>0);
   }else if(weapon.mode!=='none'){
    if(metadata.current===null||metadata.current<count){errors.push('resource');continue;}metadata.current-=count;
   }
  }else if(raw.action==='reload'){
   const ammo=trial.inventory.find(i=>i.id===(raw.ammoItemId||weapon.ammoItemId)),a=normalizeAmmoMetadata(ammo?.ammo),count=raw.count;
   if(!compatibleAmmo(weapon,ammo)||!integer(count)||count<1||metadata.capacity===null||metadata.current===null){errors.push('ammo');continue;}
   const pack=['magazine','energy'].includes(weapon.mode),consume=pack?1:count;
   if(ammo.quantity<consume||reserved(next,ammo.id,consume)||pack&&(count!==a.roundsPerUnit||count>metadata.capacity)||!pack&&(count>metadata.capacity-metadata.current||!explicitCount(raw.evidence,count))){errors.push('ammo');continue;}
   if(pack){
    // Retain the removed magazine/cell, including an empty one.
    const oldId='weapon-return-'+hash(receiptKey),baseName=ammo.name.replace(/ · \d+\/\d+$/u,''),old={...structuredClone(ammo),id:oldId,name:(baseName+' · '+metadata.current+'/'+metadata.capacity).slice(0,100),quantity:1,ammo:{...a,roundsPerUnit:metadata.current,capacity:metadata.capacity}};
    const stack=trial.inventory.find(i=>i.name===old.name&&JSON.stringify(normalizeAmmoMetadata(i.ammo))===JSON.stringify(old.ammo)&&i.quantity<99999);
    if(trial.inventory.length-Number(ammo.quantity===consume)+(stack?0:1)>200){errors.push('capacity');continue;}if(stack)stack.quantity++;else trial.inventory.push(old);
   }
   ammo.quantity-=consume;if(!ammo.quantity)trial.inventory=trial.inventory.filter(i=>i.quantity>0);metadata.current=pack?count:metadata.current+count;affected=[ammo.id];
  }else if(raw.action==='recharge'){
   if(weapon.mode!=='charges'||!integer(raw.count)||raw.count<1||metadata.current===null||metadata.capacity===null||raw.count>metadata.capacity-metadata.current||!explicitCount(raw.evidence,raw.count)){errors.push('resource');continue;}metadata.current+=raw.count;
  }else continue;
  const pos=system.entries.findIndex(e=>e.itemId===weapon.itemId),entry={itemId:weapon.itemId,...metadata};if(pos<0)system.entries.push(entry);else system.entries[pos]=entry;
  if(!trial.inventory.some(i=>i.id===system.equippedItemId&&i.quantity>0))system.equippedItemId='';
  system.receipts.push({key:receiptKey,itemId:weapon.itemId,action:raw.action});system.receipts=system.receipts.slice(-240);trial.weaponSystem=system;next=trial;accepted.push(raw.id);for(const id of affected)managedInventory.add(id);
 }
 return{next,accepted,errors,managedInventory};
}
export function weaponActionText(weapon,action,language='en'){
 const th=language==='th',name=weapon.name;
 return ({use:th?`ฉันใช้อาวุธ ${name} โจมตีตามสถานการณ์ตรงหน้า`:`I use my ${name} against the current threat.`,reload:th?`ฉันบรรจุกระสุนหรือพลังงานให้ ${name} จากของที่มีในคลัง`:`I reload my ${name} using compatible ammunition or a cell I actually have.`,activate:th?`ฉันปลดปล่อยพลังของ ${name} ตามความสามารถและเงื่อนไขที่มีจริงในโรล`:`I activate my ${name}, respecting its established abilities and conditions.`,deactivate:th?`ฉันพักพลังของ ${name}`:`I deactivate my ${name}.`,describe:th?`ฉันตรวจสอบ ${name} ของฉัน รวมถึงจำนวนที่บรรจุ ความจุ และกระสุนที่ใช้ได้`:`I inspect my ${name}, including its loaded resources, capacity and compatible ammunition.`})[action]||'';
}
export const WEAPON_INSTRUCTIONS=`OPTIONAL WEAPON TRACKING: Only owned positive-quantity Inventory items can appear in the weapon dock. Models are visuals, never grants. Categories: ${WEAPON_CATEGORY_IDS.join(', ')}. New inventory weapon definitions may include weapon:{category,mode:"none|magazine|rounds|arrows|energy|quantity|charges",capacity:null,current:null,ammoType:"",ammoItemId:""}; preserve unknown null counts, never assume a full weapon or spare magazines. Ammunition is a SEPARATE inventory item with ammo:{kind:"round|magazine|cell|arrow|bolt",type:"caliber or energy type",roundsPerUnit:integer|null,capacity:integer|null}. A magazine/cell stack quantity counts packs, roundsPerUnit is its actual contents. Other ammo units contain one round/arrow. Exact owned names Excalibur/Ea automatically select their art; never add these weapons because they exist in the visual catalog, and never emit images/URLs. In the SAME role-play reply emit weaponEvents:[{id,actor:"player",outcome:"success",action:"describe|equip|unequip|use|reload|activate|deactivate|recharge",itemId,userEvidence:exact latest typed user action quote (or requestId from a verified weapon-button continuation),evidence:exact visible player outcome quote naming the weapon,count:positive integer,ammoItemId,weapon:{...known inspection metadata}}]. Equip only on an actual draw/equip; owning a weapon is not equipping it. Inspection fills unknown values, never refills. use decrements loaded count (or quantity for thrown weapons); count must be stated in the visible outcome when above one. reload consumes only existing compatible inventory ammo; one magazine/cell swaps its actual contents, loose ammo adds count within capacity. Retain the removed magazine/cell, including an empty one. Do not ALSO emit inventory ops/itemEvents for the SAME ammo or thrown quantity consumed by weaponEvents. Do not apply NPC actions, dialogue, plans or hypothetical attacks to the player's weapon. Activate/deactivate visuals only for actual player-owned effects in the scene. Do not invent mana costs/cooldowns for named weapons; existing world rules control those separately. No extra API call is needed.`;
