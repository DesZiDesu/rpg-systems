import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium,webkit}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18230',out=process.env.PHONE_ARTIFACTS||'/workspace/artifacts/phone-optimization';
const baseline=process.env.PHONE_BASELINE==='1',web=process.env.PHONE_BROWSER==='webkit';
await mkdir(out,{recursive:true});
const browser=await(web?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}));
const report={host:'SillyTavern',browser:web?'WebKit':'Chromium',baseline,mobileEmulation:true,keyboard:'Focus tests and reduced visual viewport; no physical iOS keyboard',devices:[],errors:[]};
let context;
try{for(const mobile of [false,true]){
 const device=mobile?'mobile':'desktop';if(process.env.PHONE_DEVICE&&process.env.PHONE_DEVICE!==device)continue;
 context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1920,height:1080},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
 await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
 // Layout verification never sends a request to a real model or voice provider.
 await context.route('**/api/backends/chat-completions/generate',r=>r.fulfill({json:{choices:[{message:{role:'assistant',content:'{"events":[]}'},finish_reason:'stop'}]}}));
 await page.goto(base);
 await page.waitForFunction(()=>globalThis.RoleForgeWorkshop&&document.querySelector('#tretaresia-rpg-settings')?.rfSettingsNavigation,null,{timeout:120000});
 const done=()=>page.waitForFunction(()=>SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),null,{timeout:120000});
 await Promise.race([done(),page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok').click({timeout:120000}).then(done)]);
 await page.evaluate(async name=>{
  const c=SillyTavern.getContext(),card={spec:'chara_card_v2',spec_version:'2.0',data:{name,description:'A modern fictional city. All characters are adults.',first_mes:'You check your Aster One at home.',extensions:{
   roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['smartphone']},
   roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:false,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{name:'Mael',age:'25'},inventory:[{id:'aster',name:'Aster One Smartphone',quantity:1}],npcs:[{id:'cassandra',name:'Cassandra',age:'27',met:true}],worldClock:{day:1,time:'19:30'},location:{place:'Home'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}
  }}};
  const f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'phone-layout.json',{type:'application/json'}));
  const response=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await response.json();if(!response.ok||v.error)throw Error('Card import failed');
  const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));await RoleForgeWorkshop.ready();
 },'Phone layout QA · '+device+' · '+Date.now());
 await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);
 const fixture=await page.evaluate(async()=>{
  const p=RoleForgePhone;await p.preferences({theme:'dark',language:'en',motion:false,replyMode:'deferred'});
  const id=await p.act({type:'contact-save',contact:{label:'Cassandra',number:'090-5369',npcId:'cassandra'}}),thread=await p.act({type:'thread-open',contactId:id});
  for(const app of ['gather','lumen','murmur'])await p.act({type:'install',app});
  const c=SillyTavern.getContext(),world=p.world();world.messages=['You better be back home in one piece.',"Today wasn’t completely terrible, I guess.","Don’t make me wait forever next time."].map((text,i)=>({id:'layout-'+i,threadId:thread,from:id,text,time:{day:1,time:'19:30'},read:true}));world.revision++;c.chatMetadata.roleforge_smartphone=world;await c.saveMetadata();p.refresh();p.open('store');return {id,thread};
 });
 const phone=page.locator('#rf-aster-phone');
 const shot=async name=>{await page.evaluate(()=>{toastr.remove();for(const node of document.querySelectorAll('.tretaresia-event-toast'))node.remove();});await page.screenshot({path:out+'/'+device+'-'+name+'.png'});};
 const colors=async()=>phone.locator('.ap-store-hero').evaluate(n=>{
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),lum=s=>rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
  const fg=getComputedStyle(n.querySelector('h1')).color,bg=getComputedStyle(n).backgroundImage.match(/rgb\([^)]*\)/g)||[];
  return {text:fg,background:bg,contrast:bg.map(c=>(Math.max(lum(fg),lum(c))+.05)/(Math.min(lum(fg),lum(c))+.05))};
 });
 const darkContrast=await colors();await shot('store-dark');
 if(!baseline)assert(darkContrast.contrast.length&&Math.min(...darkContrast.contrast)>=4.5,'Store banner is readable in dark mode');
 await page.evaluate(()=>RoleForgePhone.preferences({theme:'light'}));const lightContrast=await colors();await shot('store-light');
 if(!baseline)assert(Math.min(...lightContrast.contrast)>=4.5);
 await page.evaluate(()=>{RoleForgePhone.open('messages');});await phone.locator('[data-phone=conversation]').first().click();await page.evaluate(()=>RoleForgePhone.preferences({theme:'dark'}));
 const composer=phone.locator('[data-phone-form=message] textarea');await composer.fill('Yeah—my bad… anyway, it was nice talking with you. It was super fun.');await phone.locator('[data-phone-form=message] [type=submit]').click();await page.waitForFunction(()=>RoleForgePhone.world().pending.length===1);await shot('conversation');
 if(!baseline)assert.equal(await composer.evaluate(n=>getComputedStyle(n).resize),'none','Host styles must not add a resize handle to the auto-growing composer');
 if(!baseline)assert(await composer.evaluate(n=>n.scrollHeight<=n.clientHeight+1),'An empty composer must not have a vertical scrollbar');
 await composer.fill('A draft that must survive updates.');
 const performanceResult=await page.evaluate(async()=>{
  // First paint the new local draft; the measured refreshes then have identical input.
  RoleForgePhone.refresh();const root=document.querySelector('#rf-aster-phone .ap-content'),input=root.querySelector('textarea');input.focus();input.setSelectionRange(4,9);
  let mutations=0,totalMutations=0;const observer=new MutationObserver(rows=>mutations+=rows.filter(r=>r.type==='childList').length),all=new MutationObserver(rows=>totalMutations+=rows.length);observer.observe(root,{childList:true,subtree:true});all.observe(document.querySelector('#rf-aster-phone'),{childList:true,subtree:true,attributes:true});
  const start=performance.now();for(let i=0;i<20;i++)RoleForgePhone.refresh();await new Promise(r=>requestAnimationFrame(r));const elapsed=performance.now()-start;
  observer.disconnect();all.disconnect();return {refreshes:20,mutations,totalMutations,elapsedMs:elapsed,sameComposer:input===root.querySelector('textarea'),selection:[document.activeElement.selectionStart,document.activeElement.selectionEnd]};
 });
 if(!baseline){assert.equal(performanceResult.mutations,0,'Unchanged refresh does not rebuild the screen');assert.equal(performanceResult.totalMutations,0,'Unchanged refresh also leaves status and layout attributes untouched');assert(performanceResult.sameComposer);assert.deepEqual(performanceResult.selection,[4,9]);}
 await page.waitForFunction(()=>Object.values(RoleForgePhone.world().drafts).includes('A draft that must survive updates.'));
 const draftStable=await composer.evaluate(n=>n===document.activeElement&&n.value==='A draft that must survive updates.');if(!baseline)assert(draftStable);
 if(!baseline){
  await composer.fill('The message being saved.');
  const count=await page.evaluate(()=>RoleForgePhone.world().messages.length);
  await page.evaluate(()=>{const p=RoleForgePhone,original=p.act;p.act=async action=>{if(action.type==='message-send')await new Promise(ok=>globalThis.__phoneReleaseSave=ok);return original(action);};globalThis.__phoneOriginalAct=original;});
  await phone.locator('[data-phone-form=message] [type=submit]').click();await page.waitForFunction(()=>typeof globalThis.__phoneReleaseSave==='function');
  await composer.fill('The next draft, typed while saving.');
  await phone.locator('[data-phone-form=message]').evaluate(n=>n.requestSubmit());
  await page.evaluate(()=>{globalThis.__phoneReleaseSave();});
  await page.waitForFunction(()=>Object.values(RoleForgePhone.world().drafts).includes('The next draft, typed while saving.'));
  assert.equal(await composer.inputValue(),'The next draft, typed while saving.');assert.equal(await page.evaluate(()=>RoleForgePhone.world().messages.length),count+1);
  await page.evaluate(()=>{RoleForgePhone.act=globalThis.__phoneOriginalAct;delete globalThis.__phoneOriginalAct;delete globalThis.__phoneReleaseSave;});
 }
 await phone.locator('[data-phone=close]').filter({visible:true}).first().click();
 const focusAfterClose=await page.evaluate(()=>({phoneFocused:document.querySelector('#rf-aster-phone').contains(document.activeElement),hostFocused:document.activeElement?.id==='send_textarea'}));
 if(!baseline){assert(!focusAfterClose.phoneFocused);assert(!focusAfterClose.hostFocused,'Closing the phone must not open the main chat keyboard');}
 const hidden=await page.evaluate(async()=>{
  const root=document.querySelector('#rf-aster-phone .ap-content');let mutations=0;const observer=new MutationObserver(rows=>mutations+=rows.length);observer.observe(root,{childList:true,subtree:true,attributes:true});for(let i=0;i<20;i++)RoleForgePhone.refresh();await new Promise(r=>requestAnimationFrame(r));observer.disconnect();return {refreshes:20,mutations,phoneFocused:document.querySelector('#rf-aster-phone').contains(document.activeElement)};
 });if(!baseline){assert.equal(hidden.mutations,0);assert(!hidden.phoneFocused);}
 await shot('closed');
 // A long inbox should remain usable without mounting thousands of bubbles at once.
 await page.evaluate(async ({id,thread})=>{const c=SillyTavern.getContext(),world=RoleForgePhone.world();world.messages=Array.from({length:1000},(_,i)=>({id:'history-'+i,threadId:thread,from:i%3?'player':id,text:'Message '+i+' · ข้อความที่ '+i,time:{day:1,time:'19:30'},read:true}));world.revision++;c.chatMetadata.roleforge_smartphone=world;await c.saveMetadata();RoleForgePhone.refresh();RoleForgePhone.open('messages');},fixture);
 await phone.locator('[data-phone=conversation]').first().click();
 const mounted=await phone.locator('.ap-message').count();
 if(!baseline){assert(mounted<=100);await phone.locator('[data-phone=earlier-messages]').click();assert((await phone.locator('.ap-message').count())>mounted);}
 await phone.locator('.ap-chat-body').evaluate(n=>n.scrollTop=80);
 const scrollResult=await page.evaluate(async()=>{
  const body=document.querySelector('#rf-aster-phone .ap-chat-body'),input=document.querySelector('#rf-aster-phone [data-phone-form=message] textarea');input.focus();input.value='Still typing';input.dispatchEvent(new Event('input',{bubbles:true}));
  const before=body.scrollTop,selection=3;input.setSelectionRange(selection,selection);const c=SillyTavern.getContext(),world=RoleForgePhone.world(),thread=world.threads[0];world.messages.push({id:'history-new',threadId:thread.id,from:thread.members.find(id=>id!=='player'),text:'An update while you are reading.',time:{time:'19:31'},read:true});world.revision++;c.chatMetadata.roleforge_smartphone=world;RoleForgePhone.refresh();await new Promise(r=>requestAnimationFrame(r));
  return {before,after:document.querySelector('#rf-aster-phone .ap-chat-body').scrollTop,sameComposer:document.querySelector('#rf-aster-phone [data-phone-form=message] textarea')===input,value:input.value,focused:document.activeElement===input,selection:input.selectionStart};
 });
 if(!baseline){assert(Math.abs(scrollResult.before-scrollResult.after)<2,'An incoming message does not pull the reader to the bottom');assert(scrollResult.sameComposer&&scrollResult.focused);assert.equal(scrollResult.selection,3);assert.equal(scrollResult.value,'Still typing');}
 if(mobile){
  // WebKit desktop automation does not open a real iOS keyboard. Exercise its smaller viewport and offset explicitly.
  await page.evaluate(()=>{Object.defineProperties(visualViewport,{height:{configurable:true,value:430},offsetTop:{configurable:true,value:32}});visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(100);
  const keyboardBox=await phone.locator('.ap-device').boundingBox(),composerBox=await composer.boundingBox();
  if(!baseline){assert.equal(Math.round(keyboardBox.y),32);assert.equal(Math.round(keyboardBox.height),430);assert(composerBox.y>=32&&composerBox.y+composerBox.height<=462);}
  await shot('keyboard-viewport');
  await page.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(100);
  if(!baseline)for(const width of [320,375,390,430]){await page.setViewportSize({width,height:844});await page.waitForTimeout(60);const fits=await phone.locator('.ap-device').evaluate(n=>n.scrollWidth<=n.clientWidth+1);assert(fits,'Fits mobile width '+width);const close=await phone.locator('[data-phone=close]').filter({visible:true}).first().boundingBox();assert(close.width>=44&&close.height>=44);}
  await page.setViewportSize({width:390,height:844});
 }
 report.devices.push({device,darkContrast,lightContrast,unchanged:performanceResult,draftStable,nextDraftDuringSave:!baseline,doubleSubmitGuard:!baseline,focusAfterClose,hidden,mountedMessages:mounted,historyMessages:1000,scrollResult,pass:true});
 await context.close();context=null;console.log('PASS',device,JSON.stringify(report.devices.at(-1)));
}assert.deepEqual(report.errors,[]);
}finally{await context?.close().catch(()=>{});await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
