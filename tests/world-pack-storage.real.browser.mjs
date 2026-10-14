// Production Worker/IndexedDB and native card writes in an isolated SillyTavern.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {zipSync} from '../src/vendor/fflate/index.js';
import {worldHash} from '../src/world-pack-core.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL,output=process.env.WORLD_PACK_STORAGE_ARTIFACTS||'/tmp/roleforge-world-storage-validation';
assert(base&&['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use an isolated local SillyTavern.');
await mkdir(output,{recursive:true});const report={release:JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version,checks:[],errors:[],providerCalls:[]};
async function nativeReady(page){
    await page.evaluate(()=>{window.__rfAppReady=false;const c=SillyTavern.getContext();const ready=()=>{window.__rfAppReady=true;c.eventSource.removeListener(c.eventTypes.APP_READY,ready);};c.eventSource.on(c.eventTypes.APP_READY,ready);});
    const done=page.waitForFunction(()=>window.__rfAppReady,{},{timeout:120000});
    await Promise.race([done,page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok').click({timeout:120000}).then(()=>done)]);
}
async function pack(revision,{invalid=false,large=false}={}){
    const data={'npcs/a/base.json':{id:invalid?'wrong':'a',name:'Storage Test',enabled:false,met:false,stats:{hp:100},abilities:[]},'indexes/npcs.json':[{id:'a',name:'Storage Test',basePath:'npcs/a/base.json',defaultVersionId:'',versions:[]}],
        'presets.json':{},'indexes/lore.json':[]};
    const count=large?100:1;
    for(let i=0;i<count;i++){const path=`lore/l${i}.json`;data[path]={id:'l'+i,title:'Storage lore '+i,content:('World fact '+i+' ').repeat(large?1000:5),enabled:true};data['indexes/lore.json'].push({id:'l'+i,title:data[path].title,path});}
    const files=[],zipped={};for(const [path,value]of Object.entries(data)){const raw=new TextEncoder().encode(JSON.stringify(value));files.push({path,bytes:raw.length,sha256:await worldHash(raw)});zipped[path]=raw;}
    zipped['manifest.json']=new TextEncoder().encode(JSON.stringify({format:'roleforge-world-pack',version:1,archiveId:'storage-failure-test',revision,counts:{npcBodies:1,nativeVersions:0,worldLore:count},indexes:{npcs:'indexes/npcs.json',lore:'indexes/lore.json'},presets:'presets.json',files}));
    const path=output+'/'+revision+'.zip';await writeFile(path,zipSync(zipped,{level:1}));return path;
}
const browser=await chromium.launchPersistentContext(output+'/chromium-'+Date.now(),{headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await browser.newPage();
page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/\/api\/.*\/generate(?:\?|$)/u.test(r.url()))report.providerCalls.push(r.url());});page.on('dialog',d=>d.accept());
await page.addLocatorHandler(page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}),async popup=>{await popup.locator('.popup-button-ok').click();});
await page.route('**/api/horde/text-models',r=>r.fulfill({json:[]}));await page.route('**/api/horde/status',r=>r.fulfill({json:{ok:false}}));
try{
    await page.goto(base);await page.waitForFunction(()=>document.getElementById('roleforge-world-pack')?.children.length&&document.getElementById('tretaresia-npc-wand-launcher')?.onclick);await nativeReady(page);
    await page.evaluate(async()=>{const link=[...document.querySelectorAll('link[href]')].find(n=>n.href.includes('rpg-systems/ui-polish.css')),root=new URL('.',link.href),module=await import(new URL('src/world-pack-client.js?v='+TretaresiaRelease,root));window.__storageClient=module.createWorldPackClient();});
    await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='rf-storage-fixture';input.hidden=true;document.body.append(input);});
    const upload=async path=>page.locator('#rf-storage-fixture').setInputFiles(path);
    await upload(await pack('installed'));const installed=await page.evaluate(()=>__storageClient.import({zip:document.getElementById('rf-storage-fixture').files[0]}));
    assert.equal((await page.evaluate(()=>__storageClient.list())).length,1);
    await upload(await pack('invalid',{invalid:true}));const invalid=await page.evaluate(async()=>{try{await __storageClient.import({zip:document.getElementById('rf-storage-fixture').files[0]});return 'accepted';}catch(e){return e.message;}});
    assert.match(invalid,/identity mismatch/u);assert.equal((await page.evaluate(()=>__storageClient.list())).length,1);report.checks.push('Valid-hash but invalid NPC schema is rejected before readiness; old library remains installed.');
    await upload(await pack('cancel',{large:true}));const cancelled=await page.evaluate(async()=>{let cancel;const task=__storageClient.import({zip:document.getElementById('rf-storage-fixture').files[0]},()=>cancel());cancel=()=>task.cancel();try{await task;return 'accepted';}catch(e){return e.message;}});
    assert.match(cancelled,/cancelled/u);assert.equal((await page.evaluate(()=>__storageClient.list())).length,1);report.checks.push('Cancellation during staged writes rejects the import and publishes no partial library.');
    const worker=page.workers().find(w=>w.url().includes('world-pack-worker'));assert(worker);
    await worker.evaluate(()=>{self.__originalPut=IDBObjectStore.prototype.put;let writes=0;IDBObjectStore.prototype.put=function(...args){if(this.name==='files'&&++writes===35)throw new DOMException('Injected storage quota exhaustion','QuotaExceededError');return self.__originalPut.apply(this,args);};});
    await upload(await pack('quota',{large:true}));const quota=await page.evaluate(async()=>{try{await __storageClient.import({zip:document.getElementById('rf-storage-fixture').files[0]});return {name:'accepted'};}catch(e){return {name:e.name,message:e.message};}});
    await worker.evaluate(()=>{IDBObjectStore.prototype.put=self.__originalPut;});assert.equal(quota.name,'QuotaExceededError');assert.equal((await page.evaluate(()=>__storageClient.list())).length,1);
    const old=await page.evaluate(async ref=>{const c=await __storageClient.open('test-owner',ref);return (await c.load(['a']))[0];},installed.ref);assert.equal(old.name,'Storage Test');
    const staged=await page.evaluate(async()=>{const database=await new Promise((resolve,reject)=>{const r=indexedDB.open('roleforge-world-packs',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise((resolve,reject)=>{const r=database.transaction('files').objectStore('files').getAllKeys();r.onsuccess=()=>{resolve(r.result.filter(key=>key[0].includes('#')).length);database.close();};r.onerror=()=>reject(r.error);});});assert.equal(staged,0);
    report.checks.push('Injected IndexedDB QuotaExceededError after the first committed staging batch aborts the next transaction, cleans partial files and leaves the prior archive readable. This is failure injection, not physical disk exhaustion.');
    const title='RF native migration '+Date.now(),fixture={spec:'chara_card_v2',spec_version:'2.0',data:{name:title,first_mes:'Migration test',extensions:{
        tretaresia_rpg_npcs:[{id:'migration-a',name:'Migration NPC',enabled:false,met:false,identityColor:'#cc8844',activeAlternateId:'later',abilities:[{id:'power',name:'Power',description:'Long canary '.repeat(100)}],alternateProfiles:[{id:'later',label:'Later',fields:{age:'30',notes:'Keep the selected version'}}]}],
        tretaresia_rpg_lore:[{id:'migration-lore',title:'World canary',content:'Unique world lore.',enabled:true}],roleforge_character_pack:{format:'roleforge-character-pack',version:1,npcOptions:{entryLimit:0}},
    }}};
    await page.evaluate(async card=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'migration.json',{type:'application/json'}));const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f});if(!r.ok)throw Error('Native import failed');const host=await import('/script.js');await host.getCharacters();await host.selectCharacterById(String(SillyTavern.getContext().characters.findIndex(x=>x.name===card.data.name)));},fixture);
    if(!await page.locator('#rm_extensions_block').isVisible())await page.locator('#extensions-settings-button').click();
    if(!await page.locator('#tretaresia-rpg-settings .inline-drawer-content').isVisible())await page.locator('#tretaresia-rpg-settings .inline-drawer-toggle').click();
    await page.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.open('card-pack',{direct:true}));
    const move=page.locator('#roleforge-world-pack button').filter({hasText:/Move embedded|ย้ายคลังฝัง/u}),saved=()=>page.waitForFunction(()=>document.getElementById('roleforge-world-pack').dataset.busy==='false');
    const unchanged=async()=>page.evaluate(()=>{const c=SillyTavern.getContext();return c.characters[c.characterId].data.extensions;});
    await page.route('**/api/characters/merge-attributes',r=>r.fulfill({status:503,body:'Test write failure'}));await move.click();await saved();let fields=await unchanged();assert.equal(fields.tretaresia_rpg_npcs.length,1);assert.equal(fields.roleforge_world_archive,undefined);assert.match(await page.locator('#roleforge-world-pack [role=status]').innerText(),/503/u);
    await page.unroute('**/api/characters/merge-attributes');report.checks.push('Native card-save failure after archive storage keeps embedded NPC/Lore and the old card reference intact.');
    await move.click();await saved();fields=await unchanged();assert.equal(fields.tretaresia_rpg_npcs.length,0);assert.equal(fields.tretaresia_rpg_lore.length,0);assert.equal(fields.roleforge_world_archive.required,true);assert.deepEqual(fields.roleforge_character_pack,fixture.data.extensions.roleforge_character_pack);
    const migrated=await page.evaluate(async ref=>{const c=SillyTavern.getContext(),catalog=await __storageClient.open('card:'+c.characters[c.characterId].avatar,ref);return {npc:(await catalog.load(['migration-a']))[0],lore:await catalog.loreRecord('migration-lore')};},fields.roleforge_world_archive);
    for(const [key,value]of Object.entries(fixture.data.extensions.tretaresia_rpg_npcs[0]))assert.deepEqual(migrated.npc[key],value,key);assert.deepEqual(migrated.lore,fixture.data.extensions.tretaresia_rpg_lore[0]);
    await page.reload();await page.waitForFunction(()=>document.getElementById('roleforge-world-pack')?.children.length);await nativeReady(page);await page.evaluate(async title=>{const host=await import('/script.js');await host.getCharacters();await host.selectCharacterById(String(SillyTavern.getContext().characters.findIndex(c=>c.name===title)));},title);const restored=await unchanged();assert.equal(restored.roleforge_world_archive.manifestSha256,fields.roleforge_world_archive.manifestSha256);assert.equal(restored.tretaresia_rpg_npcs.length,0);report.checks.push('Explicit native migration stores all base/selected-version/long-ability/Lore fields before clearing embedded arrays, retains presets and survives real server reload.');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.providerCalls,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(error);process.exitCode=1;}
finally{await writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
