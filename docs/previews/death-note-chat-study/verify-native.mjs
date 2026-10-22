// Review fixtures only: this script never sends a message to a model provider.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {SAMPLES} from './theme.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.DN_ST_HOST||'http://127.0.0.1:18182';
const root='/scripts/extensions/third-party/rpg-systems/';
const out=process.env.DN_STUDY_OUTPUT||'/workspace/artifacts/death-note-theme-study';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={pass:false,realSillyTavern:true,previewOnly:true,liveModel:false,devices:[],errors:[]};let page;
const nativeText=a=>'<tr-header name="'+a.name+'"/><tr-narrative>'+a.narrative.th+'</tr-narrative><tr-dialogue name="'+a.name+'">'+a.dialogue.th+'</tr-dialogue><tr-narrative>ความคิด: '+a.thought.th+'</tr-narrative>';
function card(name){return{spec:'chara_card_v2',spec_version:'2.0',data:{name,description:'Local UI design fixture. Fictional characters. No live model requests.',personality:'',scenario:'',mes_example:'',first_mes:'<tr-header name="L"/><tr-dialogue name="L">ผมชื่อ L ครับ</tr-dialogue>'+nativeText(SAMPLES[0]),extensions:{
 roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['death-note']},
 roleforge_death_note:{format:'roleforge-death-note-rules',version:1,knownFaces:{detective:true,shinigami:true}},
 roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:true,eventNotifications:false,enableMemorySummaries:false},initialState:{player:{name:'Akira',age:'30'},inventory:[{id:'death-note-book',name:'Death Note',quantity:1,category:'Artifact',properties:['roleforge:addon:death-note']}],npcs:SAMPLES.filter(a=>a.kind==='npc').map(a=>({id:a.id,name:a.name,race:a.race,age:'30',met:true,enabled:true,profession:a.role.th,stats:{hp:100}})),worldClock:{day:1,time:'00:14'},location:{place:'ห้องทำงาน',region:'Tokyo',continent:'Japan',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}
}}};}
async function ready(){
 await page.waitForFunction(()=>document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation&&globalThis.RoleForgeWorkshop,{}, {timeout:120000});
 await page.evaluate(()=>{window.__dnStudyReady=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>__dnStudyReady=true);});
 const loaded=page.waitForFunction(()=>__dnStudyReady,{}, {timeout:120000}),welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');
 await Promise.race([loaded,welcome.click({timeout:120000}).then(()=>loaded)]);
}
async function addon(value){
 await page.evaluate(()=>RoleForgeWorkshop.open('chat'));const ws=page.locator('#roleforge-workshop');
 await ws.locator('[data-ws-enable=death-note]').setChecked(value);
 await page.waitForFunction(value=>!RoleForgeWorkshop.debug().busy&&RoleForgeWorkshop.debug().enabled.includes('death-note')===value,value);
 await ws.locator('[data-ws-action=close]').click();
}
async function stable(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function showActor(id){
 await page.evaluate(id=>{const node=document.querySelector('#chat .mes[data-dn-study-actor="'+id+'"]'),chat=document.getElementById('chat');chat.scrollTo({top:node.offsetTop-12,behavior:'instant'});},id);await stable();
}
try{
 for(const mobile of [false,true]){
  const device=mobile?'mobile':'desktop',context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?1000:1000},isMobile:mobile,hasTouch:mobile});
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push({device,message:e.message}));
  await page.route('**/api/backends/chat-completions/generate',route=>{report.errors.push({device,message:'Unexpected model call'});return route.abort();});
  await page.goto(base);await ready();console.log('Host ready',device);
  await page.selectOption('#themes','Dark Lite',{force:true});await page.selectOption('#tretaresia-rpg-language','th',{force:true});
  await page.locator('#chat_width_slider').evaluate((n,width)=>{n.value=width;globalThis.$(n).trigger('input',{forced:true});},mobile?100:62);
  const name='Death Note RPG · Design Study';
  await page.evaluate(async ccard=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(ccard)],'death-note-study.json',{type:'application/json'}));const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),value=await r.json();if(!r.ok||value.error)throw Error('Fixture card import failed');const host=await import('/script.js');await host.getCharacters();await host.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===value.file_name||n.avatar===value.file_name+'.png')));await RoleForgeWorkshop.ready();},card(name));
  await page.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));
  if(!await page.evaluate(()=>RoleForgeWorkshop.debug().enabled.includes('death-note')))await addon(true);
  await page.locator('[data-presentation-setting=userChatPresentation]').evaluate(n=>{n.checked=true;n.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.evaluate(async({samples,text})=>{
   const c=SillyTavern.getContext();c.chat[0].extra={...c.chat[0].extra,roleforge_theme_study:'detective'};
   const user=samples.find(a=>a.kind==='user'),uid=c.chat.length;c.chat.push({name:'Akira',is_user:true,mes:'*'+user.narrative.th+'*\n"'+user.dialogue.th+'"\n|'+user.thought.th+'|',send_date:new Date().toISOString(),extra:{roleforge_theme_study:'player'}});c.addOneMessage(c.chat.at(-1));await c.eventSource.emit(c.eventTypes.MESSAGE_SENT,uid);await c.eventSource.emit(c.eventTypes.USER_MESSAGE_RENDERED,uid);
   const aid=c.chat.length;c.chat.push({name:c.name2,is_user:false,mes:'<tr-header name="Ryuk"/><tr-dialogue name="Ryuk">ข้าชื่อ Ryuk นะ</tr-dialogue>'+text,send_date:new Date().toISOString(),extra:{roleforge_theme_study:'shinigami'}});c.addOneMessage(c.chat.at(-1));await c.eventSource.emit(c.eventTypes.MESSAGE_RECEIVED,aid,'normal');await c.eventSource.emit(c.eventTypes.CHARACTER_MESSAGE_RENDERED,aid);await c.saveChat();
  },{samples:SAMPLES,text:nativeText(SAMPLES[2])});
  await page.locator('#chat .trpg-header').first().waitFor();
  await page.waitForFunction(()=>!document.getElementById('tretaresia-activity-island')?.classList.contains('is-visible'));
  // Move the actual draggable addon launcher above the text with its pointer controls.
  const launcher=await page.locator('[data-addon-launch=death-note]').boundingBox();
  await page.mouse.move(launcher.x+launcher.width/2,launcher.y+launcher.height/2);await page.mouse.down();await page.mouse.move(launcher.x+launcher.width/2,90,{steps:12});await page.mouse.up();
  await page.locator('#send_textarea').fill('ร่างข้อความที่ยังไม่ส่ง');
  await page.evaluate(async root=>{const css=document.createElement('link');css.rel='stylesheet';css.href=root+'docs/previews/death-note-chat-study/theme.css';document.head.append(css);const m=await import(root+'docs/previews/death-note-chat-study/theme.js');window.__dnDesign='notebook';window.__dnLanguage='th';window.__dnScopeExtra='';window.__dnThemePreview=m.mountNativeStudy({enabled:()=>RoleForgeWorkshop.debug().enabled.includes('death-note'),design:()=>__dnDesign,language:()=>__dnLanguage,seal:root+'assets/workshop/death-note/rules-seal.png',scope:()=>RoleForgeWorkshop.debug().key+__dnScopeExtra});window.__dnClassifier=m.actorType;},root);
  await page.waitForFunction(()=>__dnThemePreview.debug().styled===3);await page.evaluate(()=>document.fonts.ready);
  const snapshot=()=>page.evaluate(()=>({source:JSON.stringify(SillyTavern.getContext().chat.map(m=>m.mes)),state:JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state),draft:document.getElementById('send_textarea').value}));
  const before=await snapshot();
  for(const design of ['notebook','casefile']){
   await page.evaluate(design=>{__dnDesign=design;__dnThemePreview.refresh();},design);await page.evaluate(()=>document.fonts.ready);
   for(const actor of ['npc','user','shinigami']){
    await showActor(actor);await page.screenshot({path:out+'/native-'+design+'-'+device+'-'+actor+'.png',animations:'disabled'});
    const metrics=await page.locator('.dn-study-turn[data-dn-actor="'+actor+'"]').evaluate(n=>({width:n.getBoundingClientRect().width,scroll:n.scrollWidth,client:n.clientWidth,body:getComputedStyle(n.querySelector('.dn-study-dialogue p')).color}));
    assert(metrics.width>200&&metrics.width<=901,'readable line length on desktop: '+JSON.stringify(metrics));assert(metrics.scroll<=metrics.client+1,JSON.stringify(metrics));
    const toggle=page.locator('.dn-study-turn[data-dn-actor="'+actor+'"] .dn-study-thought-toggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();
   }
   assert.equal(await page.locator('.mes[data-dn-study-actor=user] .dn-study-header:visible').count(),0,'one native user name only');
   await page.evaluate(()=>{__dnLanguage='en';__dnThemePreview.refresh();});assert.equal(await page.locator('.dn-study-turn[lang=en]').count(),3);
   await page.evaluate(()=>{__dnLanguage='th';__dnThemePreview.refresh();});
  }
  assert.deepEqual(await snapshot(),before,'viewing themes and folding thoughts must preserve chat, state and draft');
  assert.equal(await page.evaluate(()=>__dnClassifier({name:'Ryuk',race:'Human',kind:'npc'})),'npc','display name alone never grants Shinigami style');
  assert.equal(await page.evaluate(()=>__dnClassifier({race:'Shinigami',kind:'npc'},false)),null);
  const nativeHeaders=await page.locator('#chat .trpg-header').count();await addon(false);
  await page.waitForFunction(()=>__dnThemePreview.debug().styled===0);assert.equal(await page.locator('.dn-study-native-host').count(),0);assert.equal(await page.locator('#chat .trpg-header').count(),nativeHeaders);
  assert.deepEqual(await snapshot(),before);await page.screenshot({path:out+'/native-disabled-'+device+'.png',animations:'disabled'});
  await addon(true);await page.waitForFunction(()=>__dnThemePreview.debug().styled===3);
  // A host re-render can replace its DOM at any time; source stays unchanged.
  await page.evaluate(()=>document.querySelector('.dn-study-native-layer').remove());await page.waitForFunction(()=>document.querySelectorAll('.dn-study-native-layer').length===3);
  await page.evaluate(()=>{__dnScopeExtra='new-chat';__dnThemePreview.refresh();});assert.equal(await page.locator('.dn-study-native-layer').count(),3);assert.deepEqual(await snapshot(),before);
  const switched=card('Plain chat · '+Date.now());switched.data.first_mes='This is an ordinary chat without the Death Note addon.';switched.data.extensions.roleforge_workshop.enabled=[];switched.data.extensions.roleforge_character_pack.initialState.inventory=[];
  await page.evaluate(async ccard=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(ccard)],'plain-study.json',{type:'application/json'}));const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),value=await r.json();if(!r.ok||value.error)throw Error('Plain fixture card import failed');const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===value.file_name||n.avatar===value.file_name+'.png')));await RoleForgeWorkshop.ready();},switched);
  await page.waitForFunction(()=>!RoleForgeWorkshop.debug().enabled.includes('death-note'));assert.equal(await page.locator('.dn-study-native-layer,.mes[data-dn-study-actor]').count(),0);
  await page.waitForFunction(()=>__dnThemePreview.debug().styled===0);await page.evaluate(()=>__dnThemePreview.destroy());assert.equal(await page.locator('.dn-study-native-layer').count(),0);
  report.version=await page.evaluate(()=>TretaresiaRelease);report.host=await(await page.request.get(base+'/version')).json();
  report.devices.push({device,viewport:mobile?'390 × 1000':'1440 × 1000',themeReadingWidth:'max 900px',mobileTouchEmulation:mobile,actors:3,components:4,designs:2,realAddonToggle:true,sourceUnchanged:true,stateUnchanged:true,draftUnchanged:true,scopeCleanup:true,realChatSwitch:true,remountAfterRerender:true,noDuplicatedUserHeader:true,thoughtToggle:true,englishAndThai:true,noOverflow:true});
  await context.close();console.log('PASS real SillyTavern',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;if(page&&!page.isClosed()){await page.screenshot({path:out+'/native-failed.png'});await writeFile(out+'/native-failed.txt',await page.locator('body').innerText());}}
finally{await writeFile(out+'/native-validation.json',JSON.stringify(report,null,2));await browser.close();}
