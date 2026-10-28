import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium,webkit}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18230',out=process.env.PHONE_ARTIFACTS||'/workspace/artifacts/identity-phone-fix/native';
const web=process.env.PHONE_BROWSER==='webkit';
await mkdir(out,{recursive:true});
const browser=await(web?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}));
const report={host:'SillyTavern',browser:web?'WebKit':'Chromium',generation:'Native normal/regenerate; provider responses intercepted locally',mobileEmulation:true,devices:[],errors:[]};
let context;
try{for(const mobile of [false,true]){
 const device=mobile?'mobile':'desktop';if(process.env.PHONE_DEVICE&&process.env.PHONE_DEVICE!==device)continue;
 context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1920,height:1080},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage();page.on('dialog',d=>d.accept());page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
 await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
 // Layout verification never sends a request to a real model or voice provider.
 let held=false,release;let replyContent='',holdNext=false,entered;const modelCalls=[];await context.route('**/api/backends/chat-completions/generate',async r=>{const body=r.request().postDataJSON();modelCalls.push(body.messages?.map(m=>typeof m.content==='string'?m.content:'').join('\n').slice(0,60));if(holdNext){holdNext=false;held=true;entered?.();await new Promise(ok=>release=ok);}await r.fulfill({json:{choices:[{message:{role:'assistant',content:replyContent||'{"ops":[]}'},finish_reason:'stop'}]}});});
 await page.goto(base);
 await page.waitForFunction(()=>globalThis.RoleForgeWorkshop&&document.querySelector('#tretaresia-rpg-settings')?.rfSettingsNavigation,null,{timeout:120000});
 const done=()=>page.waitForFunction(()=>SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),null,{timeout:120000});
 await Promise.race([done(),page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok').click({timeout:120000}).then(done)]);
 await page.evaluate(async ({name,tracking})=>{
  const c=SillyTavern.getContext(),card={spec:'chara_card_v2',spec_version:'2.0',data:{name,description:'A modern fictional city. All characters are adults.',first_mes:'You check your Aster One at home.',extensions:{
   roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['smartphone']},
   roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:tracking,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{age:'25'},inventory:[{id:'aster',name:'Aster One Smartphone',quantity:1}],npcs:[{id:'cassandra',name:'Cassandra',age:'27',met:true}],worldClock:{day:1,time:'19:30'},location:{place:'Home'},progression:{currency:{name:'Credits',scheme:{version:1,units:[{id:'cash',name:'CASH',value:1}]},cash:100}},onboarding:{identitySeeded:false,locationSeeded:true,loadoutSeeded:true}}}
  }}};
  const f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'phone-layout.json',{type:'application/json'}));
  const response=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await response.json();if(!response.ok||v.error)throw Error('Card import failed');
  const h=await import('/script.js');await h.getCharacters();h.setUserName('Mael Persona',{toastPersonaNameChange:false});await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));await RoleForgeWorkshop.ready();
 },{name:'Persona profile QA · '+device+' · '+Date.now(),tracking:true});
 await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);
 const fixture=await page.evaluate(async()=>{
  const p=RoleForgePhone;await p.preferences({theme:'dark',language:'en',motion:false,replyMode:'deferred'});
  const id=await p.act({type:'contact-save',contact:{label:'Cassandra',number:'090-5369',npcId:'cassandra'}}),thread=await p.act({type:'thread-open',contactId:id});
  for(const app of ['gather','lumen','murmur'])await p.act({type:'install',app});
  const c=SillyTavern.getContext(),world=p.world();world.messages=['You better be back home in one piece.',"Today wasn’t completely terrible, I guess.","Don’t make me wait forever next time."].map((text,i)=>({id:'layout-'+i,threadId:thread,from:id,text,time:{day:1,time:'19:30'},read:true}));world.revision++;c.chatMetadata.roleforge_smartphone=world;await c.saveMetadata();p.refresh();p.open('store');return {id,thread};
 });


 const initialName=await page.evaluate(()=>RoleForgePhone.get().state.player.name);assert.equal(initialName,'Mael Persona');
 await page.evaluate(async()=>{const h=await import('/script.js'),o=await import('/scripts/openai.js');h.changeMainAPI('openai');Object.assign(o.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:18230/local-fixture',custom_model:'profile-fixture',stream_openai:false,openai_max_context:32768,openai_max_tokens:4000});h.setOnlineStatus('profile-fixture');});
 const picture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=40;const g=c.getContext('2d');g.fillStyle='#335f9a';g.fillRect(0,0,40,40);return c.toDataURL('image/png');});
 const profile={displayName:'Mael After Hours',handle:'mael.after.hours',bio:'A profile that I edited myself.',status:'Available tomorrow',private:true,avatar:picture,banner:picture};
 await page.evaluate(async ({fixture,profile})=>{const p=RoleForgePhone;await p.act({type:'message-send',threadId:fixture.thread,text:'Hello from my phone',mode:'deferred'});for(const app of ['messages','gather','lumen','murmur'])await p.act({type:'profile-save',actor:'player',app,profile:{...profile,handle:profile.handle+'.'+app}});await p.act({type:'profile-save',actor:fixture.id,app:'messages',profile:{displayName:'Cassandra · saved by me',bio:'An NPC profile I customized.'}});p.open('messages');},{fixture,profile});
 const before=await page.evaluate(()=>RoleForgePhone.world().profiles);
 const messageText=tag=>'<tr-narrative>Cassandra sends a reply.</tr-narrative><rf-phone>'+JSON.stringify({profiles:[{contactId:fixture.id,apps:{messages:{displayName:'Unwanted AI name',bio:'Unwanted AI bio'}}}],events:[{type:'message',contactId:fixture.id,text:'Phone reply '+tag} ]})+'</rf-phone><!--tretaresia_patch:'+JSON.stringify({ops:[['set','worldClock.time','19:31']]})+'-->';
 const waitForProvider=promise=>new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Native generation did not reach fixture provider')),60000);promise.then(()=>{clearTimeout(timer);ok();},error=>{clearTimeout(timer);no(error);});});
 const hold=content=>{held=false;holdNext=true;replyContent=content;return new Promise(ok=>entered=ok);};
 let reached=hold(messageText('A'));
 await page.evaluate(()=>{document.getElementById('send_textarea').value='PROFILE QA fresh turn: I check my messages.';void import('/script.js').then(h=>h.Generate('normal')).then(()=>globalThis.__profileGenerationDone=true).catch(e=>globalThis.__profileGenerationError=e.message);});
 await waitForProvider(reached);
 const inFlight={...profile,displayName:'Mael Latest Profile',bio:'Saved while a main reply was generating.'};
 await page.evaluate(async profile=>{await RoleForgePhone.act({type:'profile-save',actor:'player',app:'messages',profile});RoleForgePhone.open('messages');},inFlight);
 const phone=page.locator('#rf-aster-phone');await phone.locator('[data-phone=profile][data-actor=player]').first().click();await phone.locator('[data-phone=profile-edit]').click();const edit=phone.locator('[data-phone-form=profile]');await edit.locator('[name=bio]').fill('An unsaved edit that should stay in the editor.');release();
 await page.waitForFunction(()=>globalThis.__profileGenerationDone||globalThis.__profileGenerationError,null,{timeout:90000});assert.equal(await page.evaluate(()=>globalThis.__profileGenerationError),undefined);await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Phone reply A'));await page.waitForTimeout(700);
 assert.equal(await edit.locator('[name=bio]').inputValue(),'An unsaved edit that should stay in the editor.');await phone.locator('[data-phone=sheet-close]').click();
 const afterNormal=await page.evaluate(()=>RoleForgePhone.world().profiles);assert.deepEqual(afterNormal.player.messages,{...inFlight,locked:true,voiceId:''});for(const app of ['gather','lumen','murmur'])assert.deepEqual(afterNormal.player[app],before.player[app]);assert.deepEqual(afterNormal[fixture.id],before[fixture.id]);
 await page.evaluate(()=>RoleForgePhone.close());await page.locator('[data-dock-panel=status]').click();assert.match(await page.locator('.rf-user-status').innerText(),/Mael Persona/);await page.screenshot({path:out+'/'+device+'-persona-status.png'});
 reached=hold(messageText('B'));await page.evaluate(()=>{globalThis.__profileGenerationDone=false;void import('/script.js').then(h=>h.Generate('regenerate')).then(()=>globalThis.__profileGenerationDone=true).catch(e=>globalThis.__profileGenerationError=e.message);});await waitForProvider(reached);
 assert.deepEqual(await page.evaluate(()=>RoleForgePhone.world().profiles),afterNormal);release();await page.waitForFunction(()=>globalThis.__profileGenerationDone,null,{timeout:90000});await page.waitForFunction(()=>RoleForgePhone.world().messages.some(m=>m.text==='Phone reply B'));assert.deepEqual(await page.evaluate(()=>RoleForgePhone.world().profiles),afterNormal);assert(!await page.evaluate(()=>RoleForgePhone.world().messages.some(m=>m.text==='Phone reply A')));
 const avatar=await page.evaluate(async()=>{RoleForgePhone.close();const c=SillyTavern.getContext();await c.saveMetadata();return c.characters[c.characterId].avatar;});await page.reload();await page.waitForFunction(avatar=>globalThis.RoleForgeWorkshop&&SillyTavern.getContext().characters?.some(n=>n.avatar===avatar),avatar,{timeout:120000});await page.evaluate(async avatar=>{const c=SillyTavern.getContext(),h=await import('/script.js');await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===avatar)));await RoleForgeWorkshop.ready();},avatar);await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);assert.deepEqual(await page.evaluate(()=>RoleForgePhone.world().profiles),afterNormal);assert.equal(await page.evaluate(()=>RoleForgePhone.get().state.player.name),'Mael Persona');
 await page.evaluate(()=>RoleForgePhone.open('messages'));await phone.locator('[data-phone=profile][data-actor=player]').first().click();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'/'+device+'-saved-profile.png'});
 report.devices.push({device,initialName,realNormalGeneration:true,realRegeneration:true,savedDuringGeneration:true,unsavedEditorRetained:true,allAppProfilesRetained:true,customNpcProfileRetained:true,storyMessagesUndo:true,reload:true,pass:true});console.log('PASS',device);await context.close();context=null;
}assert.deepEqual(report.errors,[]);
}catch(error){if(context){const p=context.pages().at(-1);await p.screenshot({path:out+'/failure.png'});console.log('PHONE ERROR',await p.evaluate(()=>document.querySelector('#rf-aster-phone .ap-error')?.textContent||''));}throw error;}finally{await context?.close().catch(()=>{});await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
