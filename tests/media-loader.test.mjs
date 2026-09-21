import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {uploadPortrait,readServerPortrait,portraitPath,collectPortraitBackups} from '../npc-media.js';
import {identity} from '../npc-core.js';
import {releaseUrl} from '../loader.js';
globalThis.crypto ||= webcrypto;

test('migration preserves originals, reports missing/failed photos, and skips server-backed profiles',async()=>{
 const records=['good','missing','failed','server'].map(id=>({id,hasPortrait:true,portraitSource:id==='server'?'server':'local'}));const before=JSON.stringify(records);
 const result=await collectPortraitBackups(records,{valid:()=>true,read:async p=>p.id==='missing'?null:new Blob([p.id]),upload:async blob=>{if(await blob.text()==='failed')throw Error('offline');return {portraitSource:'server',portraitPath:'/user/images/tretaresia-npc/good.webp'};}});
 assert.equal(result.updates.size,1);assert.equal(result.missing,2);assert.equal(result.aborted,false);assert.equal(JSON.stringify(records),before);
 assert.equal(result.updates.get('good').original,JSON.stringify(records[0]));
});
test('migration aborts after a scope change without publishing references',async()=>{
 let active=true,uploads=0;
 const result=await collectPortraitBackups([{id:'a',hasPortrait:true,portraitSource:'local'}],{valid:()=>active,read:async()=>{active=false;return new Blob(['image']);},upload:async()=>{uploads++;}});
 assert.equal(result.aborted,true);assert.equal(result.updates.size,0);assert.equal(uploads,0);
});

test('server upload stores only a compact reference and content-addressed filename',async()=>{
 const blob=new Blob(['small image'],{type:'image/webp'});let body;
 const options={prepare:async()=>blob,headers:{'X-CSRF-Token':'test'},fetcher:async(url,request)=>{
  assert.equal(url,'/api/images/upload');assert.equal(request.headers['X-CSRF-Token'],'test');body=JSON.parse(request.body);
  return {ok:true,json:async()=>({path:`user/images/tretaresia-npc/${body.filename}.webp`})};
 }};
 const a=await uploadPortrait(blob,options),b=await uploadPortrait(blob,options);
 assert.deepEqual(a,b);assert.match(body.filename,/^[a-f0-9]{64}$/);assert.equal(body.ch_name,'tretaresia-npc');assert.equal(a.portraitSource,'server');assert.ok(JSON.stringify(a).length<250);
 assert.equal(identity(a).portraitPath,a.portraitPath);
});
test('server portraits survive an empty browser store and use only same-origin paths',async()=>{
 const blob=new Blob(['image']);let requested;
 const entry={portraitSource:'server',portraitPath:'/user/images/tretaresia-npc/abc.webp'};
 assert.equal(await readServerPortrait(entry,async(path,options)=>{requested=path;assert.equal(options.credentials,'same-origin');return {ok:true,blob:async()=>blob};}),blob);
 assert.equal(requested,entry.portraitPath);
 for(const value of ['https://evil.test/p.png','//evil.test/a.png','/user/images/tretaresia-npc/../secret.png','data:image/png,hello','/user/images/other/x.png']){
  assert.equal(portraitPath(value),'');assert.equal(identity({portraitPath:value}).portraitPath,'');
  assert.equal(await readServerPortrait({portraitPath:value},()=>{throw Error('must not fetch');}),null);
 }
});
test('failed uploads and oversized images never produce a server reference',async()=>{
 const blob=new Blob(['x'],{type:'image/webp'});
 await assert.rejects(uploadPortrait(blob,{prepare:async()=>blob,fetcher:async()=>({ok:false,status:500})}),/upload failed/);
 await assert.rejects(uploadPortrait(blob,{prepare:async()=>new Blob([new Uint8Array(262145)]),fetcher:()=>{throw Error('must not upload');}}),/256 KB/);
 await assert.rejects(uploadPortrait(blob,{prepare:async()=>blob,fetcher:async()=>({ok:true,json:async()=>({path:'https://bad.test/x.webp'})})}),/unexpected/);
});
test('plain HTTP iPhone connections can upload without crypto.subtle',async()=>{
 const blob=new Blob(['image'],{type:'image/jpeg'});
 const result=await uploadPortrait(blob,{cryptoProvider:{getRandomValues:bytes=>bytes.fill(42)},prepare:async()=>blob,fetcher:async(_url,request)=>{
  const body=JSON.parse(request.body);assert.equal(body.filename.length,48);assert.equal(body.format,'jpg');
  return {ok:true,json:async()=>({path:`/user/images/tretaresia-npc/${body.filename}.jpg`})};
 }});assert.equal(result.portraitSource,'server');
});
test('release URLs invalidate the entry point as well as styles; manifest selects stable bootstrap',()=>{
 assert.notEqual(releaseUrl('index.js','0.31.0'),releaseUrl('index.js','0.32.0'));
 assert.match(releaseUrl('ui-polish.css','0.32.0'),/v=0.32.0$/);
 assert.throws(()=>releaseUrl('index.js','../../evil'));
 const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));
 assert.equal(manifest.js,'loader.js');assert.equal(manifest.hooks.update,'onUpdate');assert.equal(manifest.css,'');
 const loader=readFileSync(new URL('../loader.js',import.meta.url),'utf8');
 assert.match(loader,/cache:'no-store'/);assert.doesNotMatch(loader,/localStorage|indexedDB|caches\.delete/);
 assert.match(readFileSync(new URL('../ui-polish.css',import.meta.url),'utf8'),new RegExp('style\\.css\\?v='+manifest.version.replaceAll('.','\\.')));
});

test('bootstrap requests a fresh descriptor, loads one runtime, and never starts in safe mode',async()=>{
 const source=readFileSync(new URL('../loader.js',import.meta.url),'utf8').replaceAll('export ','').replaceAll('import.meta.url',JSON.stringify('https://host/scripts/extensions/third-party/rpg-systems/loader.js')).replace('await import(', 'await loadRuntime(');
 for(const safe of [false,true]){
  const calls=[],styles=[],modules=[];
  const sandbox={URL,console,location:{search:safe?'?tretaresia-safe=1':''},document:{createElement:()=>({}),head:{append:s=>styles.push(s)}},fetch:async(url,options)=>{calls.push({url:String(url),options});return {ok:true,json:async()=>({version:'0.32.0'})};},loadRuntime:async url=>modules.push(url)};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);await new Promise(resolve=>setImmediate(resolve));
  if(safe){assert.equal(calls.length,0);assert.equal(modules.length,0);continue;}
  assert.equal(calls[0].options.cache,'no-store');assert.match(calls[0].url,/manifest.json\?_=/);assert.match(modules[0],/index.js\?v=0.32.0$/);assert.match(styles[0].href,/ui-polish.css\?v=0.32.0$/);
  await vm.runInContext('boot()',sandbox);assert.equal(modules.length,1);assert.equal(sandbox.TretaresiaRelease,'0.32.0');
 }
});

test('update hook offers one explicit reload action and never reloads a draft automatically',async()=>{
 const source=readFileSync(new URL('../loader.js',import.meta.url),'utf8').replaceAll('export ','').replaceAll('import.meta.url',JSON.stringify('https://host/scripts/extensions/third-party/rpg-systems/loader.js'));
 let button,reloads=0,accepted=false;
 const sandbox={URL,console,TretaresiaBootStarted:true,TretaresiaRelease:'0.31.0',location:{search:'',reload(){reloads++;}},confirm:()=>accepted,fetch:async()=>({ok:true,json:async()=>({version:'0.32.0'})}),document:{getElementById:()=>button,createElement:()=>({style:{}}),body:{append:b=>{button=b;}}}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);await vm.runInContext('onUpdate()',sandbox);
 assert.match(button.textContent,/0.32.0/);assert.equal(reloads,0);const original=button;
 await vm.runInContext('onUpdate()',sandbox);assert.equal(button,original);
 button.onclick();assert.equal(reloads,0);accepted=true;button.onclick();assert.equal(reloads,1);
});
