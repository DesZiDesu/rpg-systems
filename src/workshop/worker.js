import {validatePackage,normalizeProfile,LIMIT,compare,hashBytes} from './core.js?v=0.79.0';
let dbPromise;
// Keep the prototype database name so existing local installations retain data.
function db(){return dbPromise||=new Promise((resolve,reject)=>{const r=indexedDB.open('roleforge-workshop-preview-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('packs',{keyPath:'id'});r.result.createObjectStore('profiles',{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function read(store,key){const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction(store).objectStore(store)[key===undefined?'getAll':'get'](key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function write(stores,fn){const database=await db();return new Promise((resolve,reject)=>{const t=database.transaction(stores,'readwrite');t.oncomplete=()=>resolve();t.onabort=t.onerror=()=>reject(t.error||Error('บันทึกไม่สำเร็จ'));try{fn(t);}catch(e){t.abort();reject(e);}});}
self.onmessage=async({data:{id,type,payload}})=>{
 const progress=phase=>postMessage({id,progress:phase});
 try{
  let result;
  if(type==='snapshot')result={packs:await read('packs'),profile:payload.key?normalizeProfile(await read('profiles',payload.key),payload.key):null};
  else if(type==='install'){
   if(!(payload.bytes instanceof ArrayBuffer)||payload.bytes.byteLength>LIMIT)throw Error('แพ็กมีขนาดเกินกำหนด');progress('verify');
   if(await hashBytes(payload.bytes)!==payload.sha256)throw Error('ไฟล์ดาวน์โหลดไม่ตรงกับแพ็กเดิม คลังที่ติดตั้งอยู่ยังถูกเก็บไว้');
   const pack=validatePackage(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload.bytes)),payload.host);
   if(pack.id!==payload.expectedId||pack.version!==payload.expectedVersion)throw Error('แพ็กไม่ตรงกับรายการที่เลือก');
   const old=await read('packs',pack.id);if(old&&compare(old.version,pack.version)>0)throw Error('ไม่ติดตั้งเวอร์ชันเก่าทับเวอร์ชันใหม่');
   progress('save');await write(['packs'],t=>t.objectStore('packs').put(pack));result=pack;
  }else if(type==='profile'){
   const profile=normalizeProfile(payload.profile,payload.key),installed=new Set((await read('packs')).map(p=>p.id));
   if(profile.enabled.some(x=>!installed.has(x)))throw Error('กรุณาติดตั้ง Addon ก่อนเปิดใช้งาน');
   await write(['profiles'],t=>t.objectStore('profiles').put(profile));result=profile;
  }else if(type==='remove'){
   const profiles=await read('profiles');await write(['packs','profiles'],t=>{t.objectStore('packs').delete(payload.packId);for(const p of profiles){p.enabled=p.enabled.filter(x=>x!==payload.packId);if(!payload.keepData&&payload.packId==='great-sage'){p.history=[];delete p.sage;}t.objectStore('profiles').put(p);}});result=true;
  }else if(type==='backup')result={format:'roleforge-workshop-backup',version:1,createdAt:new Date().toISOString(),packages:await read('packs'),profile:payload.key?normalizeProfile(await read('profiles',payload.key),payload.key):null};
  else if(type==='restore'){
   const b=payload.backup;if(!['roleforge-workshop-backup','roleforge-workshop-preview-backup'].includes(b?.format)||b.version!==1||!Array.isArray(b.packages)||b.packages.length>8)throw Error('ไฟล์สำรองไม่ถูกต้อง');
   const packs=b.packages.map(p=>validatePackage(p,payload.host)),ids=new Set(packs.map(p=>p.id));if(ids.size!==packs.length)throw Error('ไฟล์สำรองมี Addon ซ้ำ');
   const profile=normalizeProfile(b.profile,payload.key);if(profile.enabled.some(id=>!ids.has(id)))throw Error('ไฟล์สำรองขาด Addon ที่เปิดใช้งาน');
   const existing=await read('packs');if(packs.some(p=>existing.some(e=>e.id===p.id&&compare(e.version,p.version)>0)))throw Error('ไฟล์สำรองมีรุ่นเก่ากว่าที่ติดตั้ง');
   await write(['packs','profiles'],t=>{for(const p of packs)t.objectStore('packs').put(p);if(payload.key)t.objectStore('profiles').put(profile);});result=true;
  }else throw Error('ไม่รองรับคำสั่งนี้');
  postMessage({id,result});
 }catch(error){postMessage({id,error:error.message,name:error.name});}
};
