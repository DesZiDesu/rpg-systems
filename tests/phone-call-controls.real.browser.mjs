import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium,webkit}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18230',out=process.env.PHONE_ARTIFACTS||'/workspace/artifacts/aster-call-controls';
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
 },'Call controls QA · '+device+' · '+Date.now());
 await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);

 const contactId=await page.evaluate(async()=>{
  await RoleForgePhone.preferences({theme:'dark',language:'en',motion:false,replyMode:'deferred'});
  return RoleForgePhone.act({type:'contact-save',contact:{label:'Cassandra',number:'090-5369',npcId:'cassandra'}});
 });
 const phone=page.locator('#rf-aster-phone');
 const seed=()=>page.evaluate(async contactId=>{
  const c=SillyTavern.getContext(),world=RoleForgePhone.world();
  world.calls=[{id:'call-layout',contactId,direction:'incoming',status:'ringing',time:{day:1,time:'19:30'},transcript:[],muted:false,speaker:false}];world.pending=[];world.revision++;
  c.chatMetadata.roleforge_smartphone=world;await c.saveMetadata();RoleForgePhone.refresh();RoleForgePhone.open('phone');
 },contactId);
 const check=async()=>{
  const boxes=await phone.locator('.ap-call-control').evaluateAll(nodes=>nodes.map(n=>{
   const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   return {button:rect(n),icon:rect(n.querySelector('.ap-call-control-icon')),label:rect(n.querySelector('.ap-call-control-label')),font:parseFloat(getComputedStyle(n.querySelector('.ap-call-control-label')).fontSize)};
  }));
  for(const b of boxes){assert(b.label.y>=b.icon.bottom+8,'Caption is separated from icon');assert(b.label.bottom<=b.button.bottom+1,'Caption stays within tap target');assert(b.font>=13,'Caption remains readable');assert(b.button.w>=44&&b.button.h>=44);}
  for(let i=1;i<boxes.length;i++)assert(boxes[i].button.x>=boxes[i-1].button.right+10,'Actions do not overlap');
 };
 for(const language of ['en','th'])for(const theme of ['dark','light']){
  await page.evaluate(v=>RoleForgePhone.preferences(v),{language,theme});await seed();await phone.locator('[data-phone=call-open]').first().click();await page.evaluate(()=>document.fonts.ready);await check();
  await page.screenshot({path:out+'/'+device+'-'+language+'-'+theme+'-incoming.png'});
  await phone.locator('[data-phone=call-state][data-status=connected]').click();await page.waitForFunction(()=>RoleForgePhone.world().calls[0].status==='connected');await check();
  await phone.locator('[data-phone=call-mute]').click();await page.waitForFunction(()=>RoleForgePhone.world().calls[0].muted);await phone.locator('[data-phone=call-speaker]').click();await page.waitForFunction(()=>RoleForgePhone.world().calls[0].speaker);
  await page.screenshot({path:out+'/'+device+'-'+language+'-'+theme+'-connected.png'});
  await phone.locator('[data-phone=call-state][data-status=ended]').click();await page.waitForFunction(()=>RoleForgePhone.world().calls[0].status==='ended');
  await seed();await phone.locator('[data-phone=call-open]').first().click();await phone.locator('[data-phone=call-state][data-status=declined]').click();await page.waitForFunction(()=>RoleForgePhone.world().calls[0].status==='declined');
 }
 report.devices.push({device,languages:['en','th'],themes:['dark','light'],captionGeometry:true,accept:true,decline:true,mute:true,speaker:true,end:true,pass:true});console.log('PASS',device);await context.close();context=null;
}assert.deepEqual(report.errors,[]);
}catch(error){if(context?.pages().at(-1))await context.pages().at(-1).screenshot({path:out+'/failure.png'});throw error;}finally{await context?.close().catch(()=>{});await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
