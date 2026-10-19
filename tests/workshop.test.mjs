import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePackage,collectFacts,normalizeProfile,analysisPrompt,validateAnalysis,compare,validateCatalog,hashBytes} from '../src/workshop/core.js';
import {createStore} from '../src/workshop/client.js';
const raw=JSON.parse(await readFile(new URL('../src/workshop/packs/great-sage-1.0.0.json',import.meta.url)));
test('only declared capabilities and supported host versions can install',()=>{
 assert.equal(validatePackage(raw).id,'great-sage');
 assert.throws(()=>validatePackage({...raw,capabilities:[...raw.capabilities,'run-javascript']}),/ไม่รองรับ/);
 assert.throws(()=>validatePackage({...raw,code:'anything'}),/ข้อมูลที่กำหนด/);
 assert.throws(()=>validatePackage({...raw,minimumRoleForge:'0.78.0'},'0.77.3'),/0.78.0/);
 assert.equal(compare('1.10.0','1.9.0'),1);
});
test('analysis receives only selected data, never inactive NPC dossiers or private patches',()=>{
 const context={label:'Tensura',state:{player:{name:'Jino',hp:{current:80,max:100}},location:{place:'Forest'},inventory:[{id:'x',name:'Secret Sword',quantity:1}],skills:[{id:'s',name:'Water'}],npcs:[{name:'Unmet Secret NPC',history:'hidden-history'}]},chat:[{is_user:true,mes:'UNSENT USER TEXT'},{is_user:false,mes:'<think>private-reasoning</think><tr-narrative>The forest is quiet.</tr-narrative><!--tretaresia_patch:{"secret":"private-patch"}-->'}]};
 const full=collectFacts(context,{scene:true,stats:true,inventory:true,skills:true}),selected=collectFacts(context,{scene:true,stats:true,inventory:false,skills:false});
 assert.equal(full.inventory[0].name,'Secret Sword');assert.equal(full.stats.hp.current,80);assert.equal(selected.inventory,undefined);assert.equal(selected.skills,undefined);
 const prompt=analysisPrompt('What next?',selected,'calm');assert.doesNotMatch(JSON.stringify(prompt),/Secret Sword|hidden-history|Unmet Secret NPC|UNSENT USER TEXT|private-reasoning|private-patch/);
 assert.match(prompt.prompt,/The forest is quiet/);
});
test('rebind a portable profile without accepting arbitrary addon IDs or config values',()=>{
 const p=normalizeProfile({key:'old',enabled:['great-sage','arbitrary','great-sage'],launchers:{x:42,y:-1,wand:false},sage:{tone:'invalid',sources:{inventory:false}},history:[]},'new');
 assert.equal(p.key,'new');assert.deepEqual(p.enabled,['great-sage']);assert.equal(p.sage.tone,'calm');assert.equal(p.sage.sources.inventory,false);assert.equal(p.sage.sources.scene,true);
 assert.deepEqual(p.launchers,{x:1,y:0,wand:false,floating:true});assert.equal(p.sage.theme,'prismatic');
});
test('missing output is rejected and history is bounded before persistence',()=>{
 assert.throws(()=>validateAnalysis({observations:['partial']}),/คำตอบวิเคราะห์ไม่ครบ/);
 const history=Array.from({length:30},(_,i)=>({id:String(i),question:'q',result:{summary:'ok'}}));
 assert.equal(normalizeProfile({history},'k').history.length,20);assert.equal(normalizeProfile({history},'k').history[0].id,'10');
});

test('bundled releases match their catalog hashes and byte counts',async()=>{
 const catalog=validateCatalog(JSON.parse(await readFile(new URL('../src/workshop/catalog.json',import.meta.url))));
 assert.deepEqual(catalog.addons.map(a=>a.id),['great-sage','field-notes']);
 for(const addon of catalog.addons)for(const release of addon.releases){
  const bytes=await readFile(new URL('../src/workshop/'+release.path,import.meta.url));
  assert.equal(bytes.byteLength,release.bytes);assert.equal(await hashBytes(bytes),release.sha256);
  const pack=validatePackage(JSON.parse(bytes));assert.equal(pack.id,addon.id);assert.equal(pack.version,release.version);
 }
 const bad=structuredClone(catalog);bad.addons[0].releases[0].path='../other.json';assert.throws(()=>validateCatalog(bad),/ดาวน์โหลด/);
 const unordered=structuredClone(catalog);unordered.addons[0].releases.reverse();assert.throws(()=>validateCatalog(unordered),/ลำดับรุ่น/);
 assert.throws(()=>validateCatalog({...catalog,addons:[...catalog.addons,catalog.addons[0]]}),/รายการ Addon/);
});

test('hash verification also works on a LAN without secure-context crypto',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 try{
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:undefined});
  assert.equal(await hashBytes(new TextEncoder().encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 }finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto;}
});

test('pre-release backup packages remain readable without accepting unknown addons',()=>{
 assert.equal(validatePackage({...raw,format:'roleforge-workshop-addon-preview'}).format,'roleforge-workshop-addon');
 assert.throws(()=>validatePackage({...raw,id:'servant-sigils'}),/ไม่รองรับแพ็ก/);
});

test('a failed Worker rejects pending and later operations without hanging',async()=>{
 const original=globalThis.Worker;let instance;
 globalThis.Worker=class{constructor(){instance=this;}postMessage(){}terminate(){this.closed=true;}};
 const store=createStore();
 try{
  const pending=assert.rejects(store.call('snapshot',{}),/หยุดทำงาน/);
  instance.onerror({preventDefault(){}});await pending;
  assert.equal(instance.closed,true);await assert.rejects(store.call('snapshot',{}),/หยุดทำงาน/);
 }finally{store.destroy();if(original)globalThis.Worker=original;else delete globalThis.Worker;}
});

test('an unresponsive Worker times out and is terminated',async()=>{
 const original=globalThis.Worker;let instance;
 globalThis.Worker=class{constructor(){instance=this;}postMessage(){}terminate(){this.closed=true;}};
 const store=createStore({timeout:5});
 try{await assert.rejects(store.call('snapshot',{}),/นานเกินไป/);assert.equal(instance.closed,true);}
 finally{store.destroy();if(original)globalThis.Worker=original;else delete globalThis.Worker;}
});
