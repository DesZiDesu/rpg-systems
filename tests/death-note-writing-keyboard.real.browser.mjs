// Actual SillyTavern import, Workshop controls, native renderer and Branch.
// Backend responses are controlled fixtures; no external model or voice API.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium,webkit}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18188',out=process.env.DN_ARTIFACTS||'/workspace/artifacts/death-note-writing/chromium';
const version=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out,{recursive:true});
const useWebKit=process.env.DN_BROWSER==='webkit';
const browser=useWebKit?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={version,browser:useWebKit?'WebKit':'Chromium',host:'SillyTavern 1.19.0',liveModel:false,liveVoice:false,devices:[],errors:[]};let p,device;
const ws=()=>p.locator('#roleforge-workshop');
async function ready(){await p.waitForFunction(()=>globalThis.RoleForgeWorkshop&&document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation,{},{timeout:120000});const done=()=>p.waitForFunction(()=>SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),{},{timeout:120000}),welcome=p.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');await Promise.race([done(),welcome.click({timeout:120000}).then(done)]);}
function fixture(){const humans=[['voss','Elias Voss'],['mara','Mara Hale'],['borrower','Kai Rowan'],['unknown','Nolan Pierce']].map(([id,name])=>({id,name,title:'ผู้ร่วมเหตุการณ์',occupation:'Investigator',race:'Human',met:true,enabled:true,age:'35',stats:{hp:100},identityColor:'#c9b077'}));return {spec:'chara_card_v2',spec_version:'2.0',data:{name:'Eyes & notebooks · '+device+' · '+Date.now(),description:'Fictional adult QA fixture. Lifespans are invented demonstration values, not canon.',personality:'',scenario:'',mes_example:'',first_mes:'<tr-header name="voss"/><tr-narrative>คุณเห็นใบหน้าชายสวมเสื้อคลุมชัดเจน</tr-narrative><tr-dialogue name="voss">ผมชื่อ Adrian Grey ครับ</tr-dialogue><tr-header name="mara"/><tr-dialogue name="mara">ฉันชื่อ Mara Hale ค่ะ</tr-dialogue><tr-header name="borrower"/><tr-dialogue name="borrower">ผมชื่อ Kai Rowan ครับ</tr-dialogue><tr-header name="unknown"/><tr-dialogue name="unknown">ผมชื่อ Nolan Pierce ครับ</tr-dialogue><tr-dialogue name="ryuk">ข้าชื่อ Ryuk</tr-dialogue>',extensions:{roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['death-note']},roleforge_death_note:{format:'roleforge-death-note-rules',version:1,books:[{bookId:'alpha',itemId:'alpha',ownerId:'player',holderId:'player',originalShinigamiId:'ryuk'},{bookId:'beta',itemId:'beta',ownerId:'mara',holderId:'borrower',originalShinigamiId:'rem',knownToPlayer:true,ownerKnownToPlayer:true}],actorEyes:{bb:{source:'innate'}},knownFaces:Object.fromEntries(humans.map(n=>[n.id,true])),originalLifespans:{player:{day:20000,time:'20:15'},voss:{date:'2050-04-18',time:'23:40'},mara:{date:'2049-08-12',day:12000,time:'09:00'},borrower:{date:'2056-01-25',time:'14:20'}}},roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:true,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{name:'Nox',age:'34'},inventory:[{id:'alpha',name:'Death Note',quantity:1,category:'Artifact',properties:['roleforge:addon:death-note']}],npcs:[...humans,{id:'bb',name:'Beyond Birthday',race:'Human',met:false,enabled:false},{id:'ryuk',name:'Ryuk',race:'Shinigami',met:true,enabled:true},{id:'rem',name:'Rem',race:'Shinigami',met:true,enabled:true}],worldClock:{day:1,time:'20:15'},location:{place:'Study',region:'Tokyo',continent:'Japan',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}}}};}
async function importCard(card){await p.evaluate(async card=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'fragment-'+Date.now()+'.json',{type:'application/json'}));const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await r.json();if(!r.ok||v.error)throw Error('Native card import failed');const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));},card);await p.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));await p.evaluate(()=>RoleForgeWorkshop.ready());await p.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);}
async function append(text){return p.evaluate(async text=>{const c=SillyTavern.getContext(),id=c.chat.length;c.chat.push({is_user:false,name:c.name2,mes:text,extra:{},send_date:new Date().toISOString()});c.addOneMessage(c.chat.at(-1));await c.eventSource.emit(c.eventTypes.MESSAGE_RECEIVED,id,'normal');await c.eventSource.emit(c.eventTypes.CHARACTER_MESSAGE_RENDERED,id);await c.saveChat();return id;},text);}

// Simulates iOS's visual-only keyboard resize while layout viewport stays tall.
// This does not claim that a physical phone keyboard was used.
async function simulatedViewport(ctx){await ctx.addInitScript(()=>{
 const real=window.visualViewport,events=new EventTarget();let current=null;
 for(const key of ['height','width','offsetTop','offsetLeft','pageTop','pageLeft','scale'])Object.defineProperty(events,key,{get:()=>current?.[key]??real[key]});
 Object.defineProperty(window,'visualViewport',{value:events,configurable:true});
 for(const type of ['resize','scroll'])real.addEventListener(type,()=>events.dispatchEvent(new Event(type)));
 window.__dnTestViewport=value=>{current=value;events.dispatchEvent(new Event('resize'));events.dispatchEvent(new Event('scroll'));};
});}
async function backend(){await p.evaluate(async()=>{const h=await import('/script.js'),o=await import('/scripts/openai.js');h.changeMainAPI('openai');Object.assign(o.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:18188/controlled',custom_model:'writing-fixture',stream_openai:true,openai_max_context:65536,openai_max_tokens:2000});h.setOnlineStatus('Death Note controlled QA');});}
async function keyboard(value){await p.evaluate(value=>window.__dnTestViewport(value),value);await p.waitForFunction(()=>{const text=document.activeElement;if(text?.tagName!=='TEXTAREA'||!text.closest('[data-dn-paper]'))return true;const paper=text.closest('[data-dn-paper]'),tools=paper.querySelector('[data-paper-tools]'),r=paper.getBoundingClientRect(),t=tools.getBoundingClientRect();return t.top>=r.top-1&&t.bottom<=r.bottom+1&&(text.selectionEnd!==text.value.length||text.getBoundingClientRect().bottom<=t.top+1);});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function writingBounds(container,stage){
 const data=await container.evaluate(n=>{const paper=n.querySelector('[data-dn-paper]'),text=paper.querySelector('textarea'),tools=paper.querySelector('[data-paper-tools]'),submit=n.querySelector('[data-dn-action=paper-inscribe]'),r=paper.getBoundingClientRect(),t=tools.getBoundingClientRect(),s=submit.getBoundingClientRect(),c=text.getBoundingClientRect(),vv=visualViewport;return {paper:{top:r.top,bottom:r.bottom,height:r.height},tools:{top:t.top,bottom:t.bottom},submit:{top:s.top,bottom:s.bottom},textBottom:c.bottom,textTop:c.top,textHeight:c.height,textScrollHeight:text.scrollHeight,textClientHeight:text.clientHeight,textScrollTop:text.scrollTop,font:getComputedStyle(text).font,lineHeight:getComputedStyle(text).lineHeight,viewportTop:vv.offsetTop,viewportBottom:vv.offsetTop+vv.height,value:text.value,scrollTop:paper.scrollTop,selectionEnd:text.selectionEnd,overflow:paper.scrollWidth>paper.clientWidth+1};});
 assert(data.textScrollHeight<=data.textClientHeight+1,stage+' auto-sized textarea never has an internal scroll '+JSON.stringify(data));assert(!data.overflow,stage+' no sideways overflow');assert(data.tools.top>=data.paper.top-1&&data.tools.bottom<=Math.min(data.paper.bottom,data.viewportBottom)+1,JSON.stringify({stage,data}));
 assert(data.submit.top>=data.viewportTop&&data.submit.bottom<=data.viewportBottom,stage+' Continue reachable above keyboard '+JSON.stringify(data));
 // At the end of the text, the final line must sit above the selection tools.
 assert(data.textBottom<=data.tools.top+1,stage+' final caret line must be above the tools '+JSON.stringify(data));
 return data;
}
try{
 for(const mobile of [false,true]){
  device=mobile?'mobile':'desktop';const ctx=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile});if(mobile)await simulatedViewport(ctx);
  await ctx.route('**/api/horde/**',r=>r.fulfill({json:[]}));await ctx.route('**/api/tokenizers/openai/count?*',r=>r.fulfill({json:{token_count:1500}}));p=await ctx.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base);await ready();await p.selectOption('#themes','Dark Lite',{force:true});await p.selectOption('#tretaresia-rpg-language','th',{force:true});
  const card=fixture();card.data.name='Long writing & keyboard · '+device+' · '+Date.now();await importCard(card);await backend();
  const root=p.locator('#roleforge-death-note-preview'),dock=p.locator('#roleforge-death-note-dock');await p.evaluate(()=>RoleForgeDeathNote.open('write'));
  const press=(n,opts)=>mobile?n.tap(opts):n.click(opts),details='หัวใจวาย หลังจาก 10 นาที\n'+Array.from({length:30},(_,i)=>'รายละเอียดบรรทัดที่ '+(i+1)).join('\n')+'\nFINAL-CONDITION',ink='Nolan Pierce\n'+details;
  await press(root.locator('[data-dn-paper]'),{position:{x:35,y:55}});await root.locator('textarea').fill(ink);await root.locator('textarea').evaluate(n=>{n.setSelectionRange(n.value.length,n.value.length);n.dispatchEvent(new Event('select',{bubbles:true}));});await p.waitForTimeout(200);
  let full,docked,offset;
  if(mobile){
   await keyboard({height:440,width:390,offsetTop:0,offsetLeft:0,scale:1});full=await writingBounds(root,'fullscreen keyboard');assert.equal(full.value,ink);await keyboard({height:330,width:390,offsetTop:0,offsetLeft:0,scale:1});await writingBounds(root,'compact keyboard');await keyboard({height:440,width:390,offsetTop:0,offsetLeft:0,scale:1});
   await p.screenshot({path:out+'/mobile-keyboard-full.png',clip:{x:0,y:0,width:390,height:440}});
   await keyboard({height:400,width:390,offsetTop:35,offsetLeft:0,scale:1});offset=await writingBounds(root,'panned viewport');
   // Moving the caret to the beginning must reveal it without rewriting ink.
   await root.locator('textarea').evaluate(n=>{n.setSelectionRange(0,0);n.dispatchEvent(new Event('select',{bubbles:true}));});await p.waitForTimeout(150);assert(await root.locator('[data-dn-paper]').evaluate(n=>n.scrollTop<80));
   await keyboard(null);
  }
  await press(root.locator('[data-paper-edit=accept]'));await press(root.locator('[data-dn-action=dock]'));await root.waitFor({state:'hidden'});
  await dock.locator('[data-paper-block]').press('Enter');await dock.locator('textarea').evaluate(n=>{n.setSelectionRange(n.value.length,n.value.length);n.dispatchEvent(new Event('select',{bubbles:true}));});
  if(mobile){
   await keyboard({height:440,width:390,offsetTop:0,offsetLeft:0,scale:1});docked=await writingBounds(dock,'chatbar keyboard');assert.equal(docked.value,ink);
   await p.screenshot({path:out+'/mobile-keyboard-chatbar.png',clip:{x:0,y:0,width:390,height:440}});
   // Size changes and selection tools remain usable while the keyboard is open.
   await dock.locator('[data-paper-size]').fill('20');await dock.locator('textarea').focus();await p.waitForTimeout(200);assert.equal(await dock.locator('textarea').inputValue(),ink);
  }else await p.screenshot({path:out+'/desktop-long-writing.png'});
  await press(dock.locator('[data-paper-edit=accept]'));if(mobile){await keyboard(null);await p.waitForTimeout(150);assert.equal(await p.locator('.rf-composer-dock[data-dn-keyboard]').count(),0);}
  await p.locator('#send_textarea').fill('UNSENT PLAYER DRAFT');const before=await p.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length);let received,generated=0;
  await p.route('**/api/backends/chat-completions/generate',async route=>{
   generated++;const body=route.request().postDataJSON(),text=(body.messages||[]).map(m=>typeof m.content==='string'?m.content:JSON.stringify(m.content)).join('\n'),match=[...text.matchAll(/INSCRIPTION: (\{[^\n]+\})/gu)].at(-1);assert(match,'native model payload contains inscription');received=JSON.parse(match[1]);assert.equal(received.details,details);assert(received.details.endsWith('FINAL-CONDITION'));
   const answer='<tr-narrative>คุณยังรอดูเหตุการณ์ของ Nolan Pierce อยู่ นาฬิกายังเดินไปไม่ถึงเวลาที่กำหนด</tr-narrative>';
   await route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{index:0,delta:{content:answer},finish_reason:null}]})+'\n\ndata: [DONE]\n\n'});
  });
  await press(dock.locator('[data-dn-action=paper-inscribe]'));await p.waitForFunction(()=>!RoleForgeDeathNote.debug().working);await p.waitForTimeout(500);assert.equal(generated,1);assert.equal(received.details,details);assert.equal(await p.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length),before);
  assert.equal(await p.evaluate(()=>RoleForgeDeathNote.records().at(-1).details),details);assert.equal(await p.locator('#send_textarea').inputValue(),'UNSENT PLAYER DRAFT');
  // A normal Send stages the same complete ink without synthesizing another User turn.
  const second=fixture();second.data.name='Next reply long writing · '+device+' · '+Date.now();await importCard(second);await backend();await p.evaluate(()=>RoleForgeDeathNote.open('write'));
  await press(root.locator('[data-dn-paper]'),{position:{x:35,y:55}});await root.locator('textarea').fill(ink);await press(root.locator('[data-paper-edit=accept]'));await press(root.locator('[data-dn-action=close]'));
  await p.locator('#send_textarea').fill('ฉันรอดูข่าวต่อ');const response=p.waitForResponse(r=>r.url().includes('/api/backends/chat-completions/generate'));await press(p.locator('#send_but'));await response;await p.waitForFunction(()=>RoleForgeDeathNote.records().length===1&&!document.querySelector('#mes_stop')?.offsetHeight);assert.equal(generated,2);assert.equal(received.details,details);
  assert.equal(await p.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length),1);assert.equal(await p.evaluate(()=>RoleForgeDeathNote.records()[0].trigger),'next-reply');
  await p.evaluate(()=>SillyTavern.getContext().saveChat());await p.reload();await ready();await p.evaluate(async name=>{const c=SillyTavern.getContext(),h=await import('/script.js');await h.selectCharacterById(String(c.characters.findIndex(n=>n.name===name)));},second.data.name);await p.evaluate(()=>RoleForgeWorkshop.ready());await p.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);
  assert.equal(await p.evaluate(()=>RoleForgeDeathNote.records()[0].details),details);assert.equal(await p.evaluate(()=>RoleForgeDeathNote.debug().paper.pages[0].blocks[0].text),ink);

  // The exported-chat failure: typed pickup was ignored and a localized,
  // zero-quantity existing inventory row never acquired the canonical item tag.
  await p.unroute('**/api/backends/chat-completions/generate');
  const pickup=fixture();pickup.data.name='Typed notebook pickup · '+device+' · '+Date.now();
  pickup.data.extensions.roleforge_death_note.books=[];
  pickup.data.extensions.roleforge_character_pack.initialState.player.name='คีริน วัฒนา';pickup.data.extensions.roleforge_character_pack.initialState.location.place='บ้านของคีริน';pickup.data.extensions.roleforge_character_pack.initialState.scene={position:'ระเบียงห้องนอน'};
  pickup.data.extensions.roleforge_character_pack.initialState.inventory=[{id:'balcony-book',name:'Death Note (สมุดปกสีดำ)',quantity:0,category:'Notebook',properties:['Supernatural','Death Note']}];
  const discovered='คุณเห็นสมุดปกดำวางอยู่บนพื้นระเบียง',evidence='ปลายนิ้วของคีรินสัมผัสปกสมุดโน้ตและหยิบมันขึ้นมาจากพื้นระเบียง';
  pickup.data.first_mes='<tr-narrative>'+discovered+'</tr-narrative><!--roleforge_death_note_world:'+JSON.stringify({events:[{type:'discover',bookId:'balcony-book',shinigamiId:'rem',location:'ระเบียงห้องนอน บ้านของคีริน',evidence:discovered}]})+'-->';
  await p.route('**/api/backends/chat-completions/generate',route=>route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{index:0,delta:{content:'<tr-narrative>'+evidence+'</tr-narrative><!--roleforge_death_note_world:'+JSON.stringify({events:[{type:'acquire',bookId:'balcony-book',actorId:'player',evidence}]})+'-->'},finish_reason:null}]})+'\n\ndata: [DONE]\n\n'}));
  const buttonPickup=structuredClone(pickup);buttonPickup.data.name+=' · button';await importCard(buttonPickup);await backend();await p.evaluate(()=>RoleForgeDeathNote.open('write'));await press(root.locator('[data-dn-action=dock]'));await root.waitFor({state:'hidden'});await dock.locator('.dn-discovery').waitFor();
  await press(dock.locator('[data-dn-action=take]'));await p.waitForFunction(()=>RoleForgeDeathNote.debug().owned&&!RoleForgeDeathNote.debug().working);assert.equal(await p.evaluate(()=>SillyTavern.getContext().chat.filter(m=>m.is_user).length),0);assert.equal(await p.evaluate(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.inventory.find(i=>i.id==='balcony-book').quantity),1);
  await importCard(pickup);await backend();await p.evaluate(()=>RoleForgeDeathNote.open('write'));await press(root.locator('[data-dn-action=dock]'));await root.waitFor({state:'hidden'});await dock.locator('.dn-discovery').waitFor();await p.screenshot({path:out+'/'+device+'-pickup-before.png'});
  await p.locator('#send_textarea').fill('*หยิบสมุดขึ้นมาดู*');await press(p.locator('#send_but'));await p.waitForFunction(()=>RoleForgeDeathNote.debug().owned);
  const acquired=await p.evaluate(()=>({book:RoleForgeDeathNote.world().books['balcony-book'],item:SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.inventory.find(i=>i.id==='balcony-book')}));
  assert.equal(acquired.book.holderId,'player');assert.equal(acquired.book.ownerId,'player');assert.equal(acquired.book.originalShinigamiId,'rem');assert.equal(acquired.item.quantity,1);assert(acquired.item.properties.includes('roleforge:addon:death-note'));assert(acquired.item.properties.includes('Supernatural'));
  await dock.locator('[data-dn-paper]').waitFor();await p.screenshot({path:out+'/'+device+'-pickup-after.png'});
  const original=await p.evaluate(()=>SillyTavern.getContext().getCurrentChatId());await p.evaluate(async()=>{await (await import('/scripts/bookmarks.js')).branchChat(0);});await p.waitForFunction(id=>SillyTavern.getContext().getCurrentChatId()!==id,original);await p.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);await p.evaluate(()=>RoleForgeDeathNote.open('write'));
  assert.equal(await p.evaluate(()=>RoleForgeDeathNote.world().books['balcony-book'].holderId),'');assert.equal(await p.evaluate(()=>RoleForgeDeathNote.debug().owned),false);assert.equal(await p.evaluate(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.inventory.find(i=>i.id==='balcony-book')?.quantity||0),0);
  report.devices.push({device,nativeContinueCompleteDetails:true,nativeNextReplyCompleteDetails:true,buttonPickupNestedScene:true,typedPickupRepairsInventory:true,originalShinigamiPreserved:true,nativeBranchBeforePickup:true,reloadRetainsInkAndDetails:true,unsentDraftPreserved:true,detailsLength:details.length,noSyntheticUserTurn:true,simulatedKeyboard:mobile,full,docked,offset});await ctx.close();console.log('PASS',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(p&&!p.isClosed())await p.screenshot({path:out+'/failed.png'});}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
