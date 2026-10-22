import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18186',out=process.env.DN_ARTIFACTS||'/workspace/artifacts/death-note-repair/thai';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={nativeSillyTavern:true,liveModel:false,controlledSSE:true,devices:[],errors:[]};let page,device;
async function ready(){
 await page.waitForFunction(()=>document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation&&globalThis.RoleForgeWorkshop,{},{timeout:120000});
 await page.evaluate(()=>{window.__ready=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>window.__ready=true);});
 const done=page.waitForFunction(()=>window.__ready||SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),{},{timeout:120000}),welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');
 await Promise.race([done,welcome.click({timeout:120000}).then(()=>done)]);
}
try{
 for(const mobile of [false,true]){
  device=mobile?'mobile':'desktop';console.log('Native Thai inscription',device);
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile});page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push({device,message:e.message}));await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
  let requests=0,request;
  await context.route('**/api/backends/chat-completions/generate',async route=>{
   requests++;const messages=route.request().postDataJSON().messages.map(m=>typeof m.content==='string'?m.content:JSON.stringify(m.content)).join('\n');
   const rows=[...messages.matchAll(/INSCRIPTION: (\{[^\n]+\})/gu)].map(m=>JSON.parse(m[1])),unique=[...new Map(rows.map(r=>[r.id,r])).values()];
   assert.equal(unique.length,1);request=unique[0];assert.equal(request.name,'คุโร่ โอโตฮาราดะ');assert.equal(request.cause,'ตายกระทันหัน');assert.equal(request.validName,true);assert.equal(request.faceKnown,true);assert.equal(request.trigger,'next-reply');
   // Intentionally omit both the model result footer and the ordinary HP patch.
   const text='<tr-narrative>หลังผ่านไป 40 วินาที ข่าวยืนยันว่า Kurou Otoharada เสียชีวิตจากภาวะหัวใจวาย</tr-narrative>';
   await route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{index:0,delta:{content:text},finish_reason:null}]})+'\n\ndata: [DONE]\n\n'});
  });
  await page.goto(base);await ready();await page.selectOption('#themes','Dark Lite',{force:true});await page.selectOption('#tretaresia-rpg-language',mobile?'en':'th',{force:true});
  const title='Death Note Thai regression · '+device+' · '+Date.now(),person={id:'dn-kurou-otoharada',name:'Kurou Otoharada',race:'Human',age:'42',met:false,enabled:false,stats:{hp:100}},card={spec:'chara_card_v2',spec_version:'2.0',data:{name:title,description:'Fictional supernatural investigation. Adults only.',personality:'',scenario:'',mes_example:'',first_mes:'<tr-narrative>คุณได้รับสมุดปกดำมาแล้ว คุณเปิดข่าวอ่านชื่อคนร้าย คุโร่ โอโตฮาราดะ และเห็นภาพถ่ายใบหน้าของคุโร่ โอโตฮาราดะอย่างชัดเจน</tr-narrative>',extensions:{roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['death-note']},roleforge_death_note:{format:'roleforge-death-note-rules',version:1,trueNames:{'dn-kurou-otoharada':'Kurou Otoharada'},knownFaces:{}},tretaresia_rpg_npcs:mobile?[person]:[],roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:true,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{name:'Nox',age:'34'},inventory:[],npcs:mobile?[]:[person],worldClock:{day:1,time:'20:15'},location:{place:'ห้องทำงาน',region:'Tokyo',continent:'Japan',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}}}};
  await page.evaluate(async card=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'thai.json',{type:'application/json'}));const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await r.json();if(!r.ok||v.error)throw Error('Import failed');const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));},card);
  await page.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));await page.evaluate(()=>RoleForgeWorkshop.ready());await page.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().owned);
  await page.waitForFunction(()=>RoleForgeDeathNote.world().claims['dn-kurou-otoharada']?.name==='คุโร่ โอโตฮาราดะ'&&RoleForgeDeathNote.world().faces['dn-kurou-otoharada']);
  await page.evaluate(()=>RoleForgeDeathNote.open('write'));const modal=page.locator('#roleforge-death-note-preview'),sheet=modal.locator('[data-dn-paper]'),box=await sheet.boundingBox();
  if(mobile)await sheet.tap({position:{x:box.width*.1,y:box.height*.1}});else await sheet.click({position:{x:box.width*.1,y:box.height*.1}});
  await modal.locator('.is-selected textarea').fill('คุโร่ โอโตฮาราดะ ตายกระทันหัน');await modal.locator('[data-dn-action=close]').click();await modal.waitFor({state:'hidden'});
  await page.evaluate(async()=>{const h=await import('/script.js'),o=await import('/scripts/openai.js');h.changeMainAPI('openai');Object.assign(o.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:18186/controlled-only',custom_model:'notebook-regression',stream_openai:true,openai_max_context:32768,openai_max_tokens:1600});h.setOnlineStatus('Controlled notebook regression');});
  assert.equal(requests,0);const before=await page.evaluate(()=>({users:SillyTavern.getContext().chat.filter(m=>m.is_user).length,total:SillyTavern.getContext().chat.length}));
  await page.evaluate(()=>{window.__ended=false;window.__events=[];const c=SillyTavern.getContext();for(const type of [c.eventTypes.GENERATION_STARTED,c.eventTypes.GENERATION_AFTER_COMMANDS,c.eventTypes.MESSAGE_SENT,c.eventTypes.GENERATION_ENDED])c.eventSource.on(type,(...args)=>window.__events.push({type,args:args.map(v=>typeof v==='object'?undefined:v),input:document.getElementById('send_textarea').value.length,users:c.chat.filter(m=>m.is_user).length}));c.eventSource.once(c.eventTypes.GENERATION_ENDED,()=>window.__ended=true);});await page.locator('#send_textarea').fill('ฉันรอดูรายงานข่าวต่อไป');assert.equal(await page.locator('#send_textarea').inputValue(),'ฉันรอดูรายงานข่าวต่อไป');if(mobile)await page.locator('#send_but').tap();else await page.locator('#send_but').click();
  await page.waitForFunction(()=>RoleForgeDeathNote.records().some(r=>r.name==='คุโร่ โอโตฮาราดะ'&&r.status==='resolved'),{},{timeout:90000});
  await page.waitForFunction(()=>window.__ended,{},{timeout:90000});const result=await page.evaluate(()=>{const c=SillyTavern.getContext(),s=c.chatMetadata.tretaresia_rpg_state,id='dn-kurou-otoharada';return{users:c.chat.filter(m=>m.is_user).length,total:c.chat.length,hp:s.npcs?.find(n=>n.id===id)?.stats?.hp??s.npcScopes?.overrides?.[id]?.stats?.hp,records:RoleForgeDeathNote.records(),paper:RoleForgeDeathNote.debug().paper};});
  console.log(JSON.stringify({device,before,users:result.users,total:result.total,hp:result.hp,recordCount:result.records.length}));assert.equal(requests,1);assert.equal(result.users,before.users+1);assert.equal(result.total,before.total+2);assert.equal(result.hp,0);assert.equal(result.records.length,1);assert.equal(result.paper.pages[0].blocks[0].submittedText,'คุโร่ โอโตฮาราดะ ตายกระทันหัน');
  await page.evaluate(()=>RoleForgeDeathNote.open('records'));await page.screenshot({path:out+'/'+device+'-thai-result.png'});
  // Simulate an older completed reply whose result journal was not persisted.
  const reopen=await page.evaluate(async()=>{const c=SillyTavern.getContext(),last=c.chat.at(-1);delete last.extra.roleforge_death_note_results_preview;for(const s of last.swipe_info||[])if(s.extra)delete s.extra.roleforge_death_note_results_preview;await c.saveChat();return{avatar:c.characters[c.characterId].avatar,chat:c.getCurrentChatId()};});
  await page.reload();await ready();await page.evaluate(async reopen=>{const c=SillyTavern.getContext(),h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===reopen.avatar)));await h.openCharacterChat(reopen.chat);await RoleForgeWorkshop.ready();},reopen);
  await page.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);await page.evaluate(()=>RoleForgeDeathNote.open('records'));await page.waitForFunction(()=>RoleForgeDeathNote.records()[0]?.status==='resolved');assert.equal((await page.evaluate(()=>RoleForgeDeathNote.records())).length,1);assert.equal(requests,1,'reopening a pending journal never calls the model');
  report.devices.push({device,mobileTouchEmulation:mobile,archivedNpc:mobile,thaiNewsNameAndFace:true,openingSeedsBook:true,thaiNameAndSameLineCause:true,noConfirmRequired:true,oneRealUserTurn:true,oneModelRequest:true,englishOutcomeMatchesThaiInscription:true,noFooterFallbackVerified:true,journalResolved:true,hpZero:true,inkPreserved:true,reopenRepairsMissingResultWithoutGeneration:true});
  await context.close();console.log('PASS Thai inscription',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(page&&!page.isClosed()){await page.screenshot({path:out+'/failed.png'});await writeFile(out+'/fixture-debug.json',JSON.stringify(await page.evaluate(()=>({chat:SillyTavern.getContext().chat.map(m=>({user:m.is_user,mes:m.mes,extraKeys:Object.keys(m.extra||{})})),debug:RoleForgeDeathNote.debug(),records:RoleForgeDeathNote.records(),events:window.__events})),null,2));}}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
