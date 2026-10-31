import {validatePackage,normalizeProfile,LIMIT,compare,verifiedPackageBytes} from './core.js?v=0.94.1';
let dbPromise;
// Keep the prototype database name so existing local installations retain data.
function db(){return dbPromise||=new Promise((resolve,reject)=>{const r=indexedDB.open('roleforge-workshop-preview-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('packs',{keyPath:'id'});r.result.createObjectStore('profiles',{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function read(store,key){const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction(store).objectStore(store)[key===undefined?'getAll':'get'](key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function write(stores,fn){const database=await db();return new Promise((resolve,reject)=>{const t=database.transaction(stores,'readwrite');t.oncomplete=()=>resolve();t.onabort=t.onerror=()=>reject(t.error||Error('บันทึกไม่สำเร็จ'));try{fn(t);}catch(e){t.abort();reject(e);}});}
async function profileIfMissing(profile){const database=await db();return new Promise((resolve,reject)=>{const t=database.transaction('profiles','readwrite'),store=t.objectStore('profiles'),request=store.get(profile.key);let result=profile;t.oncomplete=()=>resolve(result);t.onabort=t.onerror=()=>reject(t.error||Error('บันทึกไม่สำเร็จ'));request.onsuccess=()=>{if(request.result)result=normalizeProfile(request.result,profile.key);else store.put(profile);};});}
self.onmessage=async({data:{id,type,payload}})=>{
 const progress=phase=>postMessage({id,progress:phase});
 try{
  let result;
  if(type==='snapshot'){const stored=payload.key?await read('profiles',payload.key):null;let inherited;
   if(!stored&&payload.legacyPrefix){const legacy=(await read('profiles')).filter(p=>p.key.startsWith(payload.legacyPrefix));inherited=legacy.find(p=>p.key===payload.activeLegacyKey)||legacy.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)||b.key.localeCompare(a.key))[0];}
   result={packs:await read('packs'),profile:payload.key?normalizeProfile(stored||inherited,payload.key):null,profileStored:Boolean(stored),inherited:Boolean(inherited)};}
  else if(type==='install'){
   if(!(payload.bytes instanceof ArrayBuffer)||payload.bytes.byteLength>LIMIT)throw Error('แพ็กมีขนาดเกินกำหนด');progress('verify');
   const verified=await verifiedPackageBytes(payload.bytes,payload.sha256);
   const pack=validatePackage(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(verified)),payload.host);
   if(pack.id!==payload.expectedId||pack.version!==payload.expectedVersion)throw Error('แพ็กไม่ตรงกับรายการที่เลือก');
   const old=await read('packs',pack.id);if(old&&compare(old.version,pack.version)>0)throw Error('ไม่ติดตั้งเวอร์ชันเก่าทับเวอร์ชันใหม่');
   progress('save');await write(['packs'],t=>t.objectStore('packs').put(pack));result=pack;
  }else if(type==='profile'){
   const profile=normalizeProfile(payload.profile,payload.key),installed=new Set((await read('packs')).map(p=>p.id));
   profile.updatedAt=Date.now();
   if(profile.enabled.some(x=>!installed.has(x)))throw Error('กรุณาติดตั้ง Addon ก่อนเปิดใช้งาน');
   if(payload.ifMissing)result=await profileIfMissing(profile);else{await write(['profiles'],t=>{t.objectStore('profiles').put(profile);if(payload.settingsKey&&payload.settingsKey!==payload.key)t.objectStore('profiles').put(normalizeProfile({...profile,history:[]},payload.settingsKey));});result=profile;}
  }else if(type==='remove'){
   const profiles=await read('profiles');await write(['packs','profiles'],t=>{t.objectStore('packs').delete(payload.packId);for(const p of profiles){p.enabled=p.enabled.filter(x=>x!==payload.packId);if(!payload.keepData&&payload.packId==='great-sage'){p.history=[];delete p.sage;}t.objectStore('profiles').put(p);}});result=true;
  }else if(type==='backup')result={format:'roleforge-workshop-backup',version:1,createdAt:new Date().toISOString(),packages:await read('packs'),profile:payload.key?normalizeProfile(payload.profile||await read('profiles',payload.key),payload.key):null};
  else if(type==='restore'){
   const b=payload.backup;if(!['roleforge-workshop-backup','roleforge-workshop-preview-backup'].includes(b?.format)||b.version!==1||!Array.isArray(b.packages)||b.packages.length>8)throw Error('ไฟล์สำรองไม่ถูกต้อง');
   const packs=b.packages.map(p=>validatePackage(p,payload.host)),ids=new Set(packs.map(p=>p.id));if(ids.size!==packs.length)throw Error('ไฟล์สำรองมี Addon ซ้ำ');
   const profile=normalizeProfile(b.profile,payload.key);if(profile.enabled.some(id=>!ids.has(id)))throw Error('ไฟล์สำรองขาด Addon ที่เปิดใช้งาน');
   const existing=await read('packs');if(packs.some(p=>existing.some(e=>e.id===p.id&&compare(e.version,p.version)>0)))throw Error('ไฟล์สำรองมีรุ่นเก่ากว่าที่ติดตั้ง');
   await write(['packs','profiles'],t=>{for(const p of packs)t.objectStore('packs').put(p);if(payload.key)t.objectStore('profiles').put(profile);if(payload.settingsKey&&payload.settingsKey!==payload.key)t.objectStore('profiles').put(normalizeProfile({...profile,history:[]},payload.settingsKey));});result=true;
  }else throw Error('ไม่รองรับคำสั่งนี้');
  postMessage({id,result});
 }catch(error){postMessage({id,error:error.message,name:error.name});}
};
