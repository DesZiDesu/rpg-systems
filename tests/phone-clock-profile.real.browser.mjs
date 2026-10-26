import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium,webkit}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18230',out=process.env.PHONE_ARTIFACTS||'/workspace/artifacts/aster-clock-profile';
const web=process.env.PHONE_BROWSER==='webkit';
await mkdir(out,{recursive:true});
const browser=await(web?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}));
const report={host:'SillyTavern',browser:web?'WebKit':'Chromium',mobileEmulation:true,provider:'Controlled local responses; no paid API',devices:[],errors:[]};
let context;
try{for(const mobile of [false,true]){
 const device=mobile?'mobile':'desktop';if(process.env.PHONE_DEVICE&&process.env.PHONE_DEVICE!==device)continue;
 context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1920,height:1080},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
 await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
 let taskCalls=0,bodyCalls=0,mainPrompt='',bodyRelease;
 let bodyGate=new Promise(resolve=>{bodyRelease=resolve;});
 // Controlled local provider responses exercise actual host generation without a paid API.
 await context.route('**/api/backends/chat-completions/generate',async route=>{
  const input=route.request().postDataJSON(),texts=(input.messages||[]).flatMap(m=>typeof m.content==='string'?[m.content]:Array.isArray(m.content)?m.content.filter(p=>p.type==='text').map(p=>p.text):[]),task=texts.find(t=>t.startsWith('ROLEFORGE_PHONE_TASK\n'));
  let content='<tr-header name="Riley"/><tr-narrative>Riley remembers your phone conversation and the plans for tonight.</tr-narrative>';
  if(task){taskCalls++;const data=JSON.parse(task.slice('ROLEFORGE_PHONE_TASK\n'.length));content=JSON.stringify({events:data.requests.flatMap(r=>[{type:'message',requestId:r.id,contactId:r.contactId,threadId:r.threadId,text:'Tonight at 10 PM works for me.',elapsedMinutes:1},{type:'message',requestId:r.id,contactId:r.contactId,threadId:r.threadId,text:'Pick me up at 9:45. See you then!',elapsedMinutes:2}])});}
  else if(texts.some(t=>t.includes('fictional INITIAL H-Stats'))){bodyCalls++;await bodyGate;content=JSON.stringify({hStats:{mouthState:'',favoritePosition:'A comfortable position',birthCount:0}});}
  else mainPrompt=texts.join('\n');
  await route.fulfill({json:{choices:[{message:{role:'assistant',content},finish_reason:'stop'}]}});
 });
 await page.goto(base);
 await page.waitForFunction(()=>globalThis.RoleForgeWorkshop&&document.querySelector('#tretaresia-rpg-settings')?.rfSettingsNavigation,null,{timeout:120000});
 const done=()=>page.waitForFunction(()=>SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),null,{timeout:120000});
 await Promise.race([done(),page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok').click({timeout:120000}).then(done)]);
 await page.evaluate(async name=>{
  const c=SillyTavern.getContext(),card={spec:'chara_card_v2',spec_version:'2.0',data:{name,description:'A modern fictional city. All characters are adults.',first_mes:'You check your Aster One at home.',extensions:{
   roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['smartphone']},
   roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:false,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{name:'Mael',age:'25'},inventory:[{id:'aster',name:'Aster One Smartphone',quantity:1}],npcs:[{id:'cassandra',name:'Riley',age:'27',gender:'Female',met:true,hStats:{mouthQuality:'Established trait',oralSexCount:2}}],worldClock:{day:1,time:'15:20'},location:{place:'Home'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}
  }}};
  const f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'phone-layout.json',{type:'application/json'}));
  const response=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await response.json();if(!response.ok||v.error)throw Error('Card import failed');
  const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));await RoleForgeWorkshop.ready();
 },'Aster clock QA · '+device+' · '+Date.now());
 await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);

 await page.evaluate(async()=>{
  const lang=document.getElementById('tretaresia-rpg-language');lang.value='en';lang.dispatchEvent(new Event('change',{bubbles:true}));
  await RoleForgePhone.preferences({language:'en',theme:'light',motion:true,incomingMessages:true,replyMode:'deferred'});
  const h=await import('/script.js'),o=await import('/scripts/openai.js');h.changeMainAPI('openai');Object.assign(o.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:18230/fixture-only',custom_model:'clock-fixture',stream_openai:false,openai_max_context:32768,openai_max_tokens:3000});h.setOnlineStatus('local-fixture');
 });
 const phone=page.locator('#rf-aster-phone'),clock=()=>page.evaluate(()=>RoleForgePhone.get().state.worldClock.time);
 const thread=await page.evaluate(async()=>{const id=await RoleForgePhone.act({type:'contact-save',contact:{label:'Riley 🎨',number:'090-5369',npcId:'cassandra'}});return RoleForgePhone.act({type:'thread-open',contactId:id});});
 await page.evaluate(()=>RoleForgePhone.open('messages'));await phone.locator('[data-phone=conversation]').first().click();
 const send=async text=>{await phone.locator('[data-phone-form=message] textarea').fill(text);await phone.locator('[data-phone-form=message] [type=submit]').click();};
 await send('When are we going?');await page.waitForFunction(()=>RoleForgePhone.world().messages.length===1);assert.equal(await clock(),'15:21');
 await page.evaluate(()=>RoleForgePhone.respond());await page.waitForFunction(()=>RoleForgePhone.world().messages.length===3);assert.equal(await clock(),'15:24');
 await send('See you tonight!');await page.waitForFunction(()=>RoleForgePhone.world().messages.length===4);assert.equal(await clock(),'15:25');await page.evaluate(()=>RoleForgePhone.respond());await page.waitForFunction(()=>RoleForgePhone.world().messages.length===6);assert.equal(await clock(),'15:28');
 assert.deepEqual(await page.evaluate(()=>RoleForgePhone.world().messages.map(m=>m.time.time)),['15:21','15:22','15:24','15:25','15:26','15:28']);assert.equal(taskCalls,2);
 await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>{toastr.remove();for(const n of document.querySelectorAll('.tretaresia-event-toast'))n.remove();});if(mobile){const rect=await phone.locator('.ap-device').boundingBox();assert(Math.abs(rect.y)<1&&Math.abs(rect.height-844)<1,'Phone stays within the visual viewport after typing');}await page.screenshot({path:out+'/'+device+'-conversation-en.png'});
 await page.evaluate(()=>RoleForgePhone.open('settings'));await page.screenshot({path:out+'/'+device+'-settings-en-light.png'});
 const toggle=phone.locator('[data-phone-config=incomingCalls]');await toggle.check();await page.waitForFunction(()=>RoleForgePhone.get().config.incomingCalls);assert.equal(await clock(),'15:28');
 const track=await toggle.evaluate(n=>{const r=n.nextElementSibling.getBoundingClientRect(),thumb=n.nextElementSibling.firstElementChild.getBoundingClientRect();return {width:r.width,thumb:thumb.x-r.x,right:thumb.right-r.right,inputOpacity:getComputedStyle(n).opacity};});assert.equal(track.width,50);assert.equal(track.inputOpacity,'0');assert(Math.abs(track.right+2)<1,'Checked thumb rests inside the right edge');
 await toggle.uncheck();await page.waitForFunction(()=>!RoleForgePhone.get().config.incomingCalls);
 await page.evaluate(()=>RoleForgePhone.preferences({language:'th',theme:'dark'}));await page.screenshot({path:out+'/'+device+'-settings-th-dark.png'});assert.doesNotMatch(await phone.locator('.ap-body').innerText(),/Appearance & replies|Allow incoming calls|deferred|inherit/);
 await page.evaluate(()=>RoleForgePhone.close());
 await page.evaluate(async()=>{const box=document.getElementById('send_textarea');box.value='I check the time after our phone conversation.';await(await import('/script.js')).Generate('normal');});
 await page.waitForFunction(()=>!document.querySelector('#send_but')?.hidden);assert.match(mainPrompt,/15:28|15:29|15:31/);assert.match(mainPrompt,/Pick me up at 9:45/);assert((await clock())>='15:28');

 // Phone-only elapsed time belongs to the active main-chat variant, like wallet progress.
 await page.waitForTimeout(350);
 const baseClock=await clock();
 await page.evaluate(()=>RoleForgePhone.open('messages'));await phone.locator('[data-phone=conversation]').first().click();await send('One more thing.');await page.waitForFunction(()=>RoleForgePhone.world().messages.length===7);await page.evaluate(()=>RoleForgePhone.respond());await page.waitForFunction(()=>RoleForgePhone.world().messages.length===9);const variantClock=await clock();assert(variantClock>baseClock);
 const variant=await page.evaluate(async()=>{RoleForgePhone.close();const c=SillyTavern.getContext(),i=c.chat.length-1,m=c.chat[i],original=m.mes;m.swipe_id=0;m.swipes=[original,'<tr-narrative>An alternate continuation.</tr-narrative>'];m.swipe_info=[{extra:{}},{extra:{}}];m.mes=m.swipes[1];m.swipe_id=1;await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED,i);return {i,original};});
 await page.waitForFunction(()=>RoleForgePhone.world().messages.length===6);assert.equal(await clock(),'15:28');
 await page.evaluate(async({i,original})=>{const c=SillyTavern.getContext(),m=c.chat[i];m.mes=original;m.swipe_id=0;await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED,i);},variant);await page.waitForFunction(()=>RoleForgePhone.world().messages.length===9);assert.equal(await clock(),variantClock);
 await page.evaluate(async({i})=>{const c=SillyTavern.getContext();c.chat.splice(i);await c.eventSource.emit(c.eventTypes.MESSAGE_DELETED,i);},variant);await page.waitForFunction(()=>RoleForgePhone.world().messages.length===6);assert.equal(await clock(),'15:28');
 await page.locator('#tretaresia-rpg-open-from-settings').evaluate(n=>n.click());if(await page.locator('[data-action=skip-intro]').count())await page.locator('[data-action=skip-intro]').evaluate(n=>n.click());await page.locator('#tretaresia-intro-gate').waitFor({state:'hidden'});await page.locator('[data-tab=hstats]').evaluate(n=>n.click());
 const panel=page.locator('[data-panel=hstats]');
 if(await panel.locator('[name=hStatsNpcId]').count()){await panel.locator('[name=hStatsNpcId]').selectOption('cassandra');await panel.locator('[data-action=add-hstats-npc]').click();}
 const fill=panel.locator('[data-action=retry-hstats-baseline]');await fill.waitFor();assert.equal(await fill.innerText(),'Fill missing body profile');assert.doesNotMatch(await panel.innerText(),/[ก-๙]/);
 await fill.click();await page.waitForFunction(()=>document.querySelector('[data-action=retry-hstats-baseline]')?.disabled);assert.equal(await fill.getAttribute('aria-busy'),'true');await page.screenshot({path:out+'/'+device+'-body-loading-en.png'});bodyRelease();
 await page.waitForFunction(()=>!document.querySelector('[data-action=retry-hstats-baseline]'),null,{timeout:90000});assert.equal(bodyCalls,1);
 const hstats=await page.evaluate(()=>RoleForgePhone.get().state.npcs.find(n=>n.id==='cassandra').hStats);assert.equal(hstats.mouthQuality,'Established trait');assert.equal(hstats.oralSexCount,2);assert.equal(hstats.mouthState,'Normal');await page.evaluate(()=>toastr.remove());await page.screenshot({path:out+'/'+device+'-body-filled-en.png'});
 // Switch the RoleForge language through its real setting, not the phone override.
 await page.evaluate(()=>{const n=document.getElementById('tretaresia-rpg-language');n.value='th';n.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForFunction(()=>document.querySelector('[data-panel=hstats] .tretaresia-h-generated')?.textContent==='ค่าเริ่มต้น AI');assert.doesNotMatch(await panel.innerText(),/Mouth quality|Oral sex|Fill missing body profile|Add to H-Stats/);await page.screenshot({path:out+'/'+device+'-body-filled-th.png'});
 const finalClock=await clock(),avatar=await page.evaluate(async()=>{const c=SillyTavern.getContext();await c.saveMetadata();return c.characters[c.characterId].avatar;});await page.reload();await page.waitForFunction(a=>globalThis.RoleForgeWorkshop&&SillyTavern.getContext().characters.some(c=>c.avatar===a),avatar,{timeout:120000});await page.evaluate(async a=>{const c=SillyTavern.getContext(),h=await import('/script.js');await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===a)));await RoleForgeWorkshop.ready();},avatar);await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);assert.equal(await clock(),finalClock);assert.equal(await page.evaluate(()=>RoleForgePhone.world().messages.length),6);
 report.devices.push({device,clockAdvances:true,sequentialTimestamps:true,noAppointmentJump:true,settingsDoNotAdvanceTime:true,sharedMainChatPrompt:true,clockSwipeAndDeleteUndo:true,bodyFillClick:true,loadingState:true,preserveConfirmedBodyValues:true,singleLanguage:true,switchInteraction:true,reload:true,pass:true});console.log('PASS',device);await context.close();context=null;
}assert.deepEqual(report.errors,[]);
}catch(error){if(context?.pages().at(-1)){await context.pages().at(-1).screenshot({path:out+'/failure.png'});console.error(await context.pages().at(-1).evaluate(()=>({clock:globalThis.RoleForgePhone?.get().state.worldClock,body:document.querySelector('[data-panel=hstats]')?.innerText,error:document.querySelector('#rf-aster-phone .ap-error')?.textContent})));}throw error;}finally{await context?.close().catch(()=>{});await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
