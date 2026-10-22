// Actual SillyTavern import, Workshop controls, native renderer and Branch.
// Backend responses are controlled fixtures; no external model or voice API.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18186',out=process.env.DN_ARTIFACTS||'/workspace/artifacts/workshop-lifespan';
const version=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out,{recursive:true});
const useWebKit=process.env.DN_BROWSER==='webkit';
const browser=useWebKit?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={version,browser:useWebKit?'WebKit':'Chromium',host:'SillyTavern 1.19.0',liveModel:false,liveVoice:false,devices:[],errors:[]};let p,device;
const ws=()=>p.locator('#roleforge-workshop');
async function ready(){await p.waitForFunction(()=>globalThis.RoleForgeWorkshop&&document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation,{},{timeout:120000});const done=()=>p.waitForFunction(()=>SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),{},{timeout:120000}),welcome=p.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');await Promise.race([done(),welcome.click({timeout:120000}).then(done)]);}
function fixture(){const humans=[['voss','Elias Voss'],['mara','Mara Hale'],['borrower','Kai Rowan'],['unknown','Nolan Pierce']].map(([id,name])=>({id,name,title:'ผู้ร่วมเหตุการณ์',occupation:'Investigator',race:'Human',met:true,enabled:true,age:'35',stats:{hp:100},identityColor:'#c9b077'}));return {spec:'chara_card_v2',spec_version:'2.0',data:{name:'Eyes & notebooks · '+device+' · '+Date.now(),description:'Fictional adult QA fixture. Lifespans are invented demonstration values, not canon.',personality:'',scenario:'',mes_example:'',first_mes:'<tr-header name="voss"/><tr-narrative>คุณเห็นใบหน้าชายสวมเสื้อคลุมชัดเจน</tr-narrative><tr-dialogue name="voss">ผมชื่อ Adrian Grey ครับ</tr-dialogue><tr-header name="mara"/><tr-dialogue name="mara">ฉันชื่อ Mara Hale ค่ะ</tr-dialogue><tr-header name="borrower"/><tr-dialogue name="borrower">ผมชื่อ Kai Rowan ครับ</tr-dialogue><tr-header name="unknown"/><tr-dialogue name="unknown">ผมชื่อ Nolan Pierce ครับ</tr-dialogue><tr-dialogue name="ryuk">ข้าชื่อ Ryuk</tr-dialogue>',extensions:{roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['death-note']},roleforge_death_note:{format:'roleforge-death-note-rules',version:1,books:[{bookId:'alpha',itemId:'alpha',ownerId:'player',holderId:'player',originalShinigamiId:'ryuk'},{bookId:'beta',itemId:'beta',ownerId:'mara',holderId:'borrower',originalShinigamiId:'rem',knownToPlayer:true,ownerKnownToPlayer:true}],actorEyes:{bb:{source:'innate'}},knownFaces:Object.fromEntries(humans.map(n=>[n.id,true])),originalLifespans:{player:{day:20000,time:'20:15'},voss:{date:'2050-04-18',time:'23:40'},mara:{date:'2049-08-12',day:12000,time:'09:00'},borrower:{date:'2056-01-25',time:'14:20'}}},roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:true,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{name:'Nox',age:'34'},inventory:[{id:'alpha',name:'Death Note',quantity:1,category:'Artifact',properties:['roleforge:addon:death-note']}],npcs:[...humans,{id:'bb',name:'Beyond Birthday',race:'Human',met:false,enabled:false},{id:'ryuk',name:'Ryuk',race:'Shinigami',met:true,enabled:true},{id:'rem',name:'Rem',race:'Shinigami',met:true,enabled:true}],worldClock:{day:1,time:'20:15'},location:{place:'Study',region:'Tokyo',continent:'Japan',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}}}};}
async function importCard(card){await p.evaluate(async card=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'eyes.json',{type:'application/json'}));const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await r.json();if(!r.ok||v.error)throw Error('Native card import failed');const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));},card);await p.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));await p.evaluate(()=>RoleForgeWorkshop.ready());await p.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);}
async function config(){await p.evaluate(()=>RoleForgeWorkshop.open('chat'));await ws().locator('[data-ws-action=death-note-settings]').click();await ws().locator('[data-dn-config=actor]').waitFor();}
async function close(){await ws().locator('[data-ws-action=close]').click();await ws().waitFor({state:'hidden'});}
async function shot(name){await p.evaluate(()=>{toastr.clear();document.activeElement?.blur();});await p.evaluate(()=>document.fonts.ready);await p.locator('#tretaresia-activity-island.is-visible').waitFor({state:'hidden',timeout:12000});await p.screenshot({path:out+'/'+device+'-'+name+'.png'});}
async function append(text){return p.evaluate(async text=>{const c=SillyTavern.getContext(),id=c.chat.length;c.chat.push({is_user:false,name:c.name2,mes:text,extra:{},send_date:new Date().toISOString()});c.addOneMessage(c.chat.at(-1));await c.eventSource.emit(c.eventTypes.MESSAGE_RECEIVED,id,'normal');await c.eventSource.emit(c.eventTypes.CHARACTER_MESSAGE_RENDERED,id);await c.saveChat();return id;},text);}
try{
 for(const mobile of [false,true]){
  device=mobile?'mobile':'desktop';console.log('Lifespan & Workshop',device);
  const ctx=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1120},hasTouch:mobile,isMobile:mobile});
  p=await ctx.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>report.errors.push({device,error:e.message}));
  await ctx.route('**/api/horde/**',r=>r.fulfill({json:[]}));
  await p.goto(base);await ready();assert.equal(await p.evaluate(()=>TretaresiaRelease),version);await p.selectOption('#themes','Dark Lite',{force:true});await p.selectOption('#tretaresia-rpg-language','th',{force:true});await importCard(fixture());
  await p.evaluate(()=>toastr.remove());
  await p.evaluate(()=>RoleForgeWorkshop.open('browse'));await shot('workshop-square');
  assert.equal(await ws().evaluate(n=>getComputedStyle(n).borderRadius),'0px');
  assert((await ws().locator('.ws-card').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).borderRadius))).every(v=>v==='0px'));
  await config();await shot('death-note-settings');
  assert.equal(await ws().locator('[data-ws-launcher=deathNote]').count(),1);
  await ws().locator('[data-ws-launcher=deathNote]').uncheck();await p.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);
  assert.equal(await p.locator('[data-addon-launch=death-note]').isVisible(),false);
  const life=()=>ws().locator('.dn-player-life-settings');
  await life().locator('[name=years]').fill('40');await life().locator('[name=days]').fill('0');await life().locator('[name=hours]').fill('0');await life().locator('[name=minutes]').fill('0');
  await life().locator('[type=submit]').click();await p.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);
  assert.equal(await p.evaluate(()=>RoleForgeDeathNote.world().playerLifespan.locked),true);
  assert.equal(await ws().locator('.ws-notice.error').count(),0,await ws().innerText());await life().locator('[name=years]').scrollIntoViewIfNeeded();await shot('lifespan-configure');await close();
  await p.locator('[data-dock-panel=status]').click();
  await p.locator('.rf-stat-lifespan').waitFor();assert((await p.locator('.rf-stat-lifespan').innerText()).includes('40 ปี'));await p.evaluate(()=>toastr.remove());await shot('status-lifespan');
  await p.locator('[data-stat-life-details] summary').click();await p.locator('.rf-stat-lifespan details p').scrollIntoViewIfNeeded();await shot('status-lifespan-details');
  await p.locator('[data-stat-life-config]').click();await life().waitFor();await shot('status-shortcut-settings');await close();
  // Native reload retains the manual deadline and the relocated launcher switch.
  const prior=await p.evaluate(()=>({chat:SillyTavern.getContext().getCurrentChatId(),avatar:SillyTavern.getContext().characters[SillyTavern.getContext().characterId].avatar}));
  await p.reload();await ready();await p.evaluate(async info=>{const c=SillyTavern.getContext(),h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===info.avatar)));await h.openCharacterChat(info.chat);await RoleForgeWorkshop.ready();},prior);await p.waitForFunction(()=>RoleForgeDeathNote.debug().enabled);
  await p.locator('[data-dock-panel=status]').click();assert((await p.locator('.rf-stat-lifespan').innerText()).includes('40 ปี'));assert.equal(await p.locator('[data-addon-launch=death-note]').isVisible(),false);
  // Every Status layout keeps the addon row within its scrollable content.
  for(const layout of ['A','B','C']){await p.locator('#tretaresia-rpg-status-layout').first().evaluate((n,value)=>{n.value=value;n.dispatchEvent(new Event('change',{bubbles:true}));},layout);await p.waitForFunction(()=>!document.querySelector('#tretaresia-rpg-status-layout').disabled);await p.locator('.rf-stat-lifespan').waitFor();assert(await p.locator('.rf-stat-lifespan').evaluate(n=>n.scrollWidth<=n.clientWidth+1));if(!mobile)assert(await p.locator('.rf-stat-lifespan').evaluate(n=>n.getBoundingClientRect().width>n.parentElement.clientWidth*.9),'lifespan spans the desktop Status grid');}
  await p.evaluate(()=>RoleForgeWorkshop.open('chat'));assert.equal(await ws().locator('[data-ws-launcher]').count(),0);
  await ws().locator('[data-ws-enable=death-note]').uncheck();await p.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);await close();
  assert.equal(await p.locator('.rf-stat-lifespan').count(),0);assert.equal(await p.evaluate(()=>Object.values(SillyTavern.getContext().extensionPrompts).some(p=>p.value?.includes('PLAYER LIFESPAN'))),false);
  await p.evaluate(()=>RoleForgeWorkshop.open('chat'));await ws().locator('[data-ws-enable=death-note]').check();await p.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);await close();assert((await p.locator('.rf-stat-lifespan').innerText()).includes('40 ปี'));
  console.log(device,'disable/reload/layout checks passed');
  // Future manual changes cannot cross a native earlier-point Branch boundary.
  const earlier=await append('<tr-narrative>จุดก่อนเปลี่ยนอายุขัย</tr-narrative>');await append('<tr-narrative>เหตุการณ์ถัดมา</tr-narrative>');await config();await life().locator('[name=years]').fill('1');await life().locator('[type=submit]').click();await p.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);await close();assert((await p.locator('.rf-stat-lifespan').innerText()).includes('1 ปี'));
  await p.evaluate(async id=>{await (await import('/scripts/bookmarks.js')).branchChat(id);},earlier);await p.waitForFunction(chat=>SillyTavern.getContext().getCurrentChatId()!==chat,prior.chat);await p.waitForFunction(()=>RoleForgeDeathNote.debug().enabled);await p.locator('[data-dock-panel=status]').click();assert((await p.locator('.rf-stat-lifespan').innerText()).includes('40 ปี'));
  console.log(device,'native Branch passed');
  // Missing life is established through an actual controlled host Continue.
  const card=fixture();delete card.data.extensions.roleforge_death_note.originalLifespans.player;await importCard(card);
  await p.locator('[data-dock-panel=status]').click();assert((await p.locator('.rf-stat-lifespan').innerText()).includes('ยังไม่กำหนด'));
  let calls=0;await ctx.route('**/api/backends/chat-completions/generate',async route=>{
   calls++;const prompt=route.request().postDataJSON().messages.map(m=>typeof m.content==='string'?m.content:JSON.stringify(m.content)).join('\n');assert(prompt.includes('PLAYER LIFESPAN'));
   const event={type:'player-lifespan',actorId:'player',value:{day:14601,time:'20:15'},recordedClock:{day:1,time:'20:15'}};
   const content='\n<tr-narrative>ค่ำคืนนี้ดำเนินต่อในห้องทำงานอย่างเงียบงัน</tr-narrative><!--roleforge_death_note_world:'+JSON.stringify({events:[event]})+'-->';
   await route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{index:0,delta:{content},finish_reason:null}]})+'\n\ndata: [DONE]\n\n'});
  });
  await p.evaluate(async()=>{const h=await import('/script.js'),o=await import('/scripts/openai.js');h.changeMainAPI('openai');Object.assign(o.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:18186/controlled-lifespan',custom_model:'controlled-qa',stream_openai:true,openai_max_context:32768,openai_max_tokens:1600});h.setOnlineStatus('Controlled QA');});
  const users=await p.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length);await p.evaluate(()=>SillyTavern.getContext().generate('continue',{automatic_trigger:true,depth:1}));
  await p.waitForFunction(()=>Boolean(RoleForgeDeathNote.world().playerLifespan));await p.waitForFunction(()=>document.querySelector('.rf-stat-lifespan')?.textContent.includes('40 ปี'));
  assert.equal(calls,1);
  // Save settings before the first AI seed has been journalled (fast-click race).
  await p.evaluate(async()=>{const m=SillyTavern.getContext().chat.at(-1);m.extra.roleforge_death_note_world_preview=(m.extra.roleforge_death_note_world_preview||[]).filter(e=>e.type!=='player-lifespan');const form=new FormData();form.set('kind','lifespan');form.set('mode','preferences');form.set('allowAI','on');form.set('locked','on');await RoleForgeDeathNote.configure(form);});
  assert.equal(await p.evaluate(()=>RoleForgeDeathNote.world().playerLifespan.locked),true);assert((await p.locator('.rf-stat-lifespan').innerText()).includes('40 ปี'));
  assert.equal(await p.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length),users);await p.evaluate(()=>toastr.remove());await shot('ai-established-lifespan');
  await p.selectOption('#tretaresia-rpg-language','en',{force:true});await config();assert((await ws().innerText()).includes('Your lifespan'));assert((await ws().innerText()).includes('Draggable Death Note button'));await shot('settings-english');await close();
  const overflow=await p.locator('.rf-stat-lifespan').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth}));assert(overflow.scroll<=overflow.width+1);
  report.devices.push({device,squareSurfaces:true,launcherMoved:true,launcherRetainedOnReload:true,manualEdit:true,aiInitialAssignment:true,fastSettingsSavePreservesAI:true,aiCalls:calls,noSyntheticUser:true,disableHidesAndSuspends:true,reenableRetains:true,nativeBranch:true,bilingual:true,statusLayouts:['A','B','C'],overflow});await ctx.close();console.log('PASS',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){console.error(error);report.failure=error.stack;process.exitCode=1;if(p&&!p.isClosed())await p.screenshot({path:out+'/failed.png'});}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
