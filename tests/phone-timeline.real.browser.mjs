import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium,webkit}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18230',out=process.env.PHONE_ARTIFACTS||'/workspace/artifacts/aster-upgrade/timeline';
const web=process.env.PHONE_BROWSER==='webkit';
await mkdir(out,{recursive:true});
const browser=await(web?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}));
const report={host:'SillyTavern',browser:web?'WebKit':'Chromium',controlledEvents:true,mobileEmulation:true,devices:[],errors:[]};
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
 await page.evaluate(async ({name,tracking})=>{
  const c=SillyTavern.getContext(),card={spec:'chara_card_v2',spec_version:'2.0',data:{name,description:'A modern fictional city. All characters are adults.',first_mes:'You check your Aster One at home.',extensions:{
   roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['smartphone']},
   roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:tracking,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{name:'Mael',age:'25'},inventory:[{id:'aster',name:'Aster One Smartphone',quantity:1}],npcs:[{id:'cassandra',name:'Cassandra',age:'27',met:true}],worldClock:{day:1,time:'19:30'},location:{place:'Home'},progression:{currency:{name:'Credits',scheme:{version:1,units:[{id:'cash',name:'CASH',value:1}]},cash:100}},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}
  }}};
  const f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'phone-layout.json',{type:'application/json'}));
  const response=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await response.json();if(!response.ok||v.error)throw Error('Card import failed');
  const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));await RoleForgeWorkshop.ready();
 },{name:'Phone timeline QA · '+device+' · '+Date.now(),tracking:process.env.PHONE_TRACKING_QA==='1'});
 await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);
 const fixture=await page.evaluate(async()=>{
  const p=RoleForgePhone;await p.preferences({theme:'dark',language:'en',motion:false,replyMode:'deferred'});
  const id=await p.act({type:'contact-save',contact:{label:'Cassandra',number:'090-5369',npcId:'cassandra'}}),thread=await p.act({type:'thread-open',contactId:id});
  for(const app of ['gather','lumen','murmur'])await p.act({type:'install',app});
  const c=SillyTavern.getContext(),world=p.world();world.messages=['You better be back home in one piece.',"Today wasn’t completely terrible, I guess.","Don’t make me wait forever next time."].map((text,i)=>({id:'layout-'+i,threadId:thread,from:id,text,time:{day:1,time:'19:30'},read:true}));world.revision++;c.chatMetadata.roleforge_smartphone=world;await c.saveMetadata();p.refresh();p.open('store');return {id,thread};
 });

 await page.evaluate(()=>RoleForgePhone.preferences({incomingCalls:true}));
 const snap=()=>page.evaluate(()=>{const p=RoleForgePhone.world();return {messages:p.messages.map(m=>m.text),posts:p.posts.map(m=>m.text),news:p.news.map(m=>m.title),calls:p.calls.map(c=>c.status),follows:p.relationships.length,cash:RoleForgePhone.get().state.progression.currency.cash,credits:p.accounts[0]?.credits||0,receipts:p.receipts.length};});
 const add=async message=>page.evaluate(async message=>{const c=SillyTavern.getContext(),h=await import('/script.js');c.chat.push(message);h.addOneMessage(message);await c.eventSource.emit(message.is_user?c.eventTypes.USER_MESSAGE_RENDERED:c.eventTypes.MESSAGE_RECEIVED,c.chat.length-1);return c.chat.length-1;},message);
 await add({is_user:true,is_system:false,name:'Mael',mes:'I check my Aster.',send_date:new Date().toISOString(),extra:{}});
 const text=tag=>'<tr-narrative>Cassandra shares an update.</tr-narrative><rf-phone>'+JSON.stringify({events:[{type:'message',contactId:fixture.id,text:'Inbox '+tag},{type:'post',contactId:fixture.id,app:'lumen',text:'Post '+tag},{type:'follow',contactId:fixture.id,app:'lumen'},{type:'call',contactId:fixture.id}],news:[{id:'news-'+tag,title:'News '+tag,body:'A confirmed story headline.'}]})+'</rf-phone>'+(process.env.PHONE_TRACKING_QA==='1'?'<!--tretaresia_patch:'+JSON.stringify({ops:[['set','worldClock.time','19:31']]})+'-->':'');
 const a=text('A'),b=text('B');
 const index=await add({is_user:false,is_system:false,name:'Narrator',mes:a,swipe_id:0,swipes:[a,b],swipe_info:[{extra:{}},{extra:{}}],send_date:new Date().toISOString(),extra:{}});
 await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Inbox A'));
 await page.waitForTimeout(800);const afterA=await snap();
 await page.evaluate(async()=>{await RoleForgePhone.auth({type:'register',username:'audit_user',pin:'fixture-pin'});const accountId=await RoleForgePhone.auth({type:'login',username:'audit_user',pin:'fixture-pin'});await RoleForgePhone.financial({type:'deposit',id:'audit-deposit',accountId,unit:'cash',amount:5});});
 const afterDeposit=await snap();
 await page.evaluate(async ({index,b})=>{const c=SillyTavern.getContext(),m=c.chat[index];m.mes=b;m.swipe_id=1;await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED,index);},{index,b});await page.waitForTimeout(1300);const afterCachedSwipeB=await snap();
 await page.evaluate(async index=>{const c=SillyTavern.getContext();await c.eventSource.emit(c.eventTypes.MESSAGE_RECEIVED,index);},index);await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Inbox B'));const afterGeneratedB=await snap();
 await page.evaluate(async ({index,a})=>{const c=SillyTavern.getContext();c.chat[index].mes=a;c.chat[index].swipe_id=0;await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED,index);},{index,a});await page.waitForTimeout(1300);const afterBackA=await snap();
 await page.evaluate(async index=>{const c=SillyTavern.getContext();c.chat.splice(index);await c.eventSource.emit(c.eventTypes.MESSAGE_DELETED,index);},index);await page.waitForTimeout(1300);const afterDelete=await snap();
 const initial=afterDelete.messages;
 assert.deepEqual(afterCachedSwipeB.messages,[...initial,'Inbox B']);assert.deepEqual(afterCachedSwipeB.posts,['Post B']);assert.deepEqual(afterCachedSwipeB.news,['News B']);assert.equal(afterCachedSwipeB.cash,100);assert.equal(afterCachedSwipeB.credits,0);
 assert.deepEqual(afterGeneratedB,afterCachedSwipeB,'A repeated receive event must not replay a cached swipe');
 assert.deepEqual(afterBackA.messages,[...initial,'Inbox A']);assert.equal(afterBackA.cash,95);assert.equal(afterBackA.credits,5);assert.equal(afterBackA.receipts,1);
 assert.equal(afterDelete.messages.length,3);for(const field of ['posts','news','calls'])assert.deepEqual(afterDelete[field],[]);assert.equal(afterDelete.follows,0);assert.equal(afterDelete.cash,100);assert.equal(afterDelete.credits,0);
 // Edit an assistant reply, then delete a range beyond the three recent RPG checkpoints.
 const editId=await add({is_user:false,is_system:false,name:'Narrator',mes:a,swipe_id:0,swipes:[a],swipe_info:[{extra:{}}],send_date:new Date().toISOString(),extra:{}});
 await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Inbox A'));
 await page.evaluate(async ({editId,text})=>{const c=SillyTavern.getContext(),m=c.chat[editId];m.mes=text;m.swipes[0]=text;await c.eventSource.emit(c.eventTypes.MESSAGE_EDITED,editId);},{editId,text:text('Edited')});
 await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Inbox Edited'));
 const edited=await snap();assert.deepEqual(edited.messages,[...initial,'Inbox Edited']);assert.deepEqual(edited.posts,['Post Edited']);
 await page.evaluate(async()=>{const c=SillyTavern.getContext();await c.eventSource.emit(c.eventTypes.GENERATION_STARTED,'regenerate');});
 await page.waitForFunction(()=>!RoleForgePhone.world().messages.some(m=>m.text==='Inbox Edited'));
 await page.evaluate(async ({id,text})=>{const c=SillyTavern.getContext(),m=c.chat[id];m.mes=text;m.swipes[m.swipe_id]=text;await c.eventSource.emit(c.eventTypes.MESSAGE_RECEIVED,id);},{id:editId,text:text('Regenerated')});
 await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Inbox Regenerated'));const regenerated=await snap();assert.deepEqual(regenerated.messages,[...initial,'Inbox Regenerated']);
 for(let i=0;i<6;i++){
  await add({is_user:true,is_system:false,name:'Mael',mes:'Turn '+i,send_date:new Date().toISOString(),extra:{}});
  await add({is_user:false,is_system:false,name:'Narrator',mes:'<rf-phone>'+JSON.stringify({events:[{type:'message',contactId:fixture.id,text:'Range '+i}]})+'</rf-phone>',send_date:new Date().toISOString(),extra:{}});
  await page.waitForFunction(text=>RoleForgePhone.world().messages.some(m=>m.text===text),'Range '+i);
 }
 await page.evaluate(async id=>{const c=SillyTavern.getContext();c.chat.splice(id);await c.eventSource.emit(c.eventTypes.MESSAGE_DELETED,id);},editId);
 await page.waitForFunction(()=>!RoleForgePhone.world().messages.some(m=>m.text?.startsWith('Range ')||m.text==='Inbox Edited'||m.text==='Inbox Regenerated'));
 const afterRange=await snap();assert.deepEqual(afterRange,afterDelete);
 const avatar=await page.evaluate(async()=>{const c=SillyTavern.getContext();await c.saveMetadata();return c.characters[c.characterId].avatar;});
 await page.reload();await page.waitForFunction(()=>globalThis.RoleForgeWorkshop,null,{timeout:120000});await page.evaluate(async avatar=>{const c=SillyTavern.getContext(),h=await import('/script.js');await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===avatar)));await RoleForgeWorkshop.ready();},avatar);await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);assert.deepEqual(await snap(),afterDelete);
 // A swipe during an acknowledged wallet save must wait, then restore both balances.
 await page.evaluate(async()=>{await RoleForgePhone.auth({type:'register',username:'race_user',pin:'fixture-pin'});await RoleForgePhone.auth({type:'login',username:'race_user',pin:'fixture-pin'});});
 const raceId=await add({is_user:false,is_system:false,name:'Narrator',mes:a,swipe_id:0,swipes:[a,b],swipe_info:[{extra:{}},{extra:{}}],send_date:new Date().toISOString(),extra:{}});
 await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Inbox A'));
 let held=false,release;
 await context.route('**/api/chats/save',async route=>{const body=route.request().postDataJSON();if(body.chat?.[0]?.chat_metadata?.roleforge_smartphone?.ledger?.at(-1)?.id==='race-deposit'&&!held){held=true;await new Promise(ok=>release=ok);}await route.continue();});
 await page.evaluate(()=>{const p=RoleForgePhone;globalThis.__asterPendingSave=p.financial({type:'deposit',id:'race-deposit',accountId:p.world().accounts[0].id,unit:'cash',amount:5});});
 for(let n=0;n<200&&!held;n++)await new Promise(ok=>setTimeout(ok,10));assert(held,'Wallet save reached the controlled acknowledgement barrier');
 await page.evaluate(async ({raceId,b})=>{const c=SillyTavern.getContext();c.chat[raceId].mes=b;c.chat[raceId].swipe_id=1;await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED,raceId);},{raceId,b});release();
 await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Inbox B')&&!RoleForgePhone.world().messages.some(m=>m.text==='Inbox A'));
 const race=await snap();assert.equal(race.cash,100);assert.equal(race.credits,0);assert.equal(race.receipts,0);await context.unroute('**/api/chats/save');
 report.devices.push({device,afterA,afterDeposit,afterCachedSwipeB,afterGeneratedB,afterBackA,afterDelete,edited,regenerated,afterRange,race,reload:true,pass:true});console.log('PASS',device,'swipe/edit/regenerate/delete/reload/wallet-save race');await context.close();context=null;
} }finally{await context?.close().catch(()=>{});await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
