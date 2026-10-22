import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {OPENINGS_TH} from '../cards/death-note-rpg/data/openings-th.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18186',out=process.env.DN_ARTIFACTS||'/workspace/artifacts/death-note-repair/native';
const source=JSON.parse(await readFile(new URL('../cards/death-note-rpg/build/Death-Note-RPG-No-Portraits.json',import.meta.url)));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={realSillyTavern:true,liveModel:false,devices:[],errors:[]};let page,device;
async function ready(){
 await page.waitForFunction(()=>document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation&&globalThis.RoleForgeWorkshop,{},{timeout:120000});
 await page.evaluate(()=>{window.__ready=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>window.__ready=true);});
 const done=page.waitForFunction(()=>window.__ready||SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),{},{timeout:120000}),welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');
 await Promise.race([done,welcome.click({timeout:120000}).then(()=>done)]);
 await page.selectOption('#themes','Dark Lite',{force:true});
}
async function importCard(){
 const card=structuredClone(source);card.data.name+=' · ownership · '+device+' · '+Date.now();
 await page.evaluate(async card=>{
  const c=SillyTavern.getContext(),form=new FormData();form.set('file_type','json');form.set('avatar',new File([JSON.stringify(card)],'notebook.json',{type:'application/json'}));
  const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:form}),value=await r.json();if(!r.ok||value.error)throw Error('Card import failed');
  const host=await import('/script.js');await host.getCharacters();const id=c.characters.findIndex(n=>n.avatar===value.file_name||n.avatar===value.file_name+'.png');if(id<0)throw Error('Imported avatar missing');await host.selectCharacterById(String(id));
 },card);
 await page.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));
 await page.evaluate(()=>RoleForgeWorkshop.ready());await page.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);
}
async function importChat(path){
 await page.evaluate(()=>{const input=document.createElement('input');input.id='private-chat-import';input.type='file';input.hidden=true;document.body.append(input);});
 await page.locator('#private-chat-import').setInputFiles(path);
 await page.evaluate(async()=>{
  const c=SillyTavern.getContext(),form=new FormData();form.set('file_type','jsonl');form.set('avatar_url',c.characters[c.characterId].avatar);form.set('character_name',c.characters[c.characterId].name);form.set('user_name',c.name1);form.set('avatar',document.getElementById('private-chat-import').files[0]);
  const r=await fetch('/api/chats/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:form}),v=await r.json();if(!r.ok||v.error)throw Error('Chat import failed');
  await (await import('/script.js')).openCharacterChat(v.fileNames[0].replace(/\.jsonl$/u,''));
 });
 await page.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);await page.evaluate(()=>RoleForgeDeathNote.open('rights'));
}
async function sparseHp(){return page.evaluate(()=>{const s=SillyTavern.getContext().chatMetadata.tretaresia_rpg_state,id='dn-kurou-otoharada';return s.npcs?.find(n=>n.id===id)?.stats?.hp??s.npcScopes?.overrides?.[id]?.stats?.hp;});}
try{
 for(const mobile of [false,true]){
  device=mobile?'mobile':'desktop';console.log('Start native ownership checks',device);
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile});page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push({device,message:e.message}));await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
  let requests=0;await context.route('**/api/backends/**/generate',r=>{requests++;return r.abort();});
  await page.goto(base);await ready();await page.selectOption('#tretaresia-rpg-language',mobile?'en':'th',{force:true});await importCard();
  for(let i=0;i<10;i++){
   if(i){await page.locator('#chat .mes[mesid="0"] .swipe_right').evaluate(n=>n.click());await page.waitForFunction(i=>SillyTavern.getContext().chat[0].swipe_id===i,i);}
   await page.waitForFunction(expected=>globalThis.RoleForgeDeathNote?.debug().owned===expected,[4,9].includes(i));
   assert.equal(await page.evaluate(()=>SillyTavern.getContext().chat[0].mes),OPENINGS_TH[i].text);
  }
  await page.evaluate(()=>RoleForgeDeathNote.open('rights'));const modal=page.locator('#roleforge-death-note-preview');
  await page.waitForFunction(()=>RoleForgeDeathNote.world().books[RoleForgeDeathNote.debug().bookId]?.originalShinigamiId==='dn-ryuk');
  assert(!/ยังมองไม่เห็น|Not yet visible/.test(await modal.innerText()));await page.screenshot({path:out+'/'+device+'-opening-10-rights.png'});
  await modal.locator('[data-dn-action=close]').click();await page.locator('#chat .mes[mesid="0"] .swipe_right').evaluate(n=>n.click());await page.waitForFunction(()=>!RoleForgeDeathNote.debug().owned);
  assert.equal(requests,0,'greeting initialization never calls a model');
  const checks={device,mobileTouchEmulation:mobile,allTenGreetings:true,openingFiveAndTenImmediateBook:true,otherGreetingsNoBook:true,ryukAttached:true,swipeBackRemovesAutomaticBook:true,noModelRequest:true};
  if(process.env.DN_CHAT_EXPORT){
   const original=(await readFile(process.env.DN_CHAT_EXPORT,'utf8')).trim().split('\n').map(JSON.parse),originalMessages=original.slice(1).map(m=>m.mes);
   await importChat(process.env.DN_CHAT_EXPORT);
   await page.waitForFunction(()=>RoleForgeDeathNote.records().some(r=>r.recovered&&r.status==='resolved'),{},{timeout:90000});
   const result=await page.evaluate(()=>({messages:SillyTavern.getContext().chat.map(m=>m.mes),records:RoleForgeDeathNote.records(),world:RoleForgeDeathNote.world(),paper:RoleForgeDeathNote.debug().paper}));
   assert.deepEqual(result.messages,originalMessages,'repair never rewrites the roleplay');
   assert(result.records.some(r=>r.name==='คุโร่ โอโตฮาราดะ'&&r.status==='ineffective'),'historical failed attempt retained');
   assert(result.records.some(r=>r.name==='Kurou Otoharada'&&r.status==='resolved'),'English written request recovered');
   assert.equal(result.world.books['item-death-note'].originalShinigamiId,'dn-ryuk');assert.equal(await sparseHp(),0);
   await page.screenshot({path:out+'/'+device+'-repaired-rights.png'});await page.evaluate(()=>RoleForgeDeathNote.open('records'));await page.screenshot({path:out+'/'+device+'-repaired-records.png'});
   const ink=result.paper.pages.flatMap(p=>p.blocks).find(b=>b.text.startsWith('Kurou Otoharada'));assert.equal(ink.submittedText,ink.text);
   const entries=result.records.length,reopen=await page.evaluate(()=>{const c=SillyTavern.getContext();return{avatar:c.characters[c.characterId].avatar,chat:c.getCurrentChatId()};});await page.reload();await ready();await page.evaluate(async reopen=>{const c=SillyTavern.getContext(),host=await import('/script.js');await host.getCharacters();await host.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===reopen.avatar)));await host.openCharacterChat(reopen.chat);await RoleForgeWorkshop.ready();},reopen);await page.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);await page.evaluate(()=>RoleForgeDeathNote.open('records'));
   assert.equal((await page.evaluate(()=>RoleForgeDeathNote.records())).length,entries,'reload must not duplicate a repaired request');assert.equal(await sparseHp(),0);
   Object.assign(checks,{suppliedExportImportedNatively:true,legacyEnglishSuccessRecovered:true,failedThaiHistoryPreserved:true,canonicalHPZero:true,originalMessagesUnchanged:true,inkPreservedAndSubmitted:true,reloadNoDuplicate:true});
  }
  report.devices.push(checks);await context.close();console.log('PASS',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(page&&!page.isClosed())await page.screenshot({path:out+'/failed.png'});}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
