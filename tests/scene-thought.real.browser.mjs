// Actual local SillyTavern and native card/Generate/events. SSE is a local
// deterministic reply; no external model is used. Mobile is Chromium emulation.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18180',out=process.env.ST_SCENE_ARTIFACTS||'/workspace/artifacts/scene-thought-update';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out,{recursive:true});
const desktop=process.env.ST_SCENE_DEVICE==='desktop';
const release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
const report={release,host:null,theme:'Dark Lite',errors:[],checks:[],layouts:[],nativeGenerations:0,device:desktop?'Desktop Chromium (mouse, no touch)':'Chromium touch/mobile emulation, not a physical iPhone'};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:!desktop,hasTouch:!desktop,deviceScaleFactor:desktop?1:1.5,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(30000);
page.on('pageerror',e=>report.errors.push(e.stack));page.on('dialog',d=>d.accept());
await page.route('**/api/horde/text-models',r=>r.fulfill({json:[]}));await page.route('**/api/horde/status',r=>r.fulfill({json:{ok:false}}));
const scene={dn:'Day 1',d:1,mo:'October',yr:'1431',er:'Common Era',cal:'Gregorian',t:'22:26',per:'Night',se:'Autumn',loc:'La Charité Outskirts',reg:'Orléans Region',con:'France',pos:'Beside the campfire',w:'Clear skies',temp:12,light:'Firelight',who:['Mash Kyrielight','Jino'],goal:'Reach the nearby camp',safe:'Safe',mood:'Quiet and watchful',dt:'15 min'};
const reply='<tr-header name="Mash Kyrielight"/><tr-narrative>แสงไฟจากค่ายพักส่องผ่านแนวต้นไม้ ทุกคนหยุดพักก่อนเดินทางต่อ</tr-narrative><tr-dialogue name="Mash Kyrielight">ข้างหน้ามีค่ายพักค่ะรุ่นพี่ เราเข้าไปพักกันก่อนดีไหมคะ?</tr-dialogue>\n<!--tretaresia_patch:'+JSON.stringify({sceneTracker:scene,ops:[]})+'-->';
await page.route('**/api/backends/chat-completions/generate',r=>{report.nativeGenerations++;const body='data: '+JSON.stringify({choices:[{index:0,delta:{content:reply},finish_reason:null}]})+'\n\ndata: [DONE]\n\n';return r.fulfill({status:200,contentType:'text/event-stream',body});});
async function ready(){
 await page.waitForFunction(()=>document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation&&document.getElementById('tretaresia-npc-wand-launcher')?.onclick,{},{timeout:120000});
 await page.evaluate(()=>{window.__sceneReady=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>window.__sceneReady=true);});
 const loaded=page.waitForFunction(()=>window.__sceneReady,{},{timeout:120000}),welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');
 await Promise.race([loaded,welcome.click({timeout:120000}).then(()=>loaded)]);assert.equal(await page.evaluate(()=>TretaresiaRelease),release);
}
async function importCard(card){
 const path=out+'/fixture-card.json';await writeFile(path,JSON.stringify(card));
 await page.evaluate(()=>{const n=document.createElement('input');n.type='file';n.id='scene-test-import';n.hidden=true;document.body.append(n);});await page.locator('#scene-test-import').setInputFiles(path);
 await page.evaluate(async()=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',document.getElementById('scene-test-import').files[0]);const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f});if(!r.ok)throw Error('Card import failed');await(await import('/script.js')).getCharacters();});
 await page.evaluate(async name=>{const h=await import('/script.js');await h.selectCharacterById(String(SillyTavern.getContext().characters.findIndex(c=>c.name===name)));},card.data.name);
 await page.waitForFunction(()=>!!SillyTavern.getContext().getCurrentChatId?.());await page.waitForTimeout(1800);
}
async function control(key,value){const n=page.locator(`[data-presentation-setting="${key}"]`);await n.evaluate((n,value)=>{if(n.type==='checkbox')n.checked=value;else n.value=value;n.dispatchEvent(new Event('change',{bubbles:true}));},value);await page.waitForTimeout(250);}
async function theme(value){await control('chatTheme',value);await page.waitForFunction(value=>{const nodes=[...document.querySelectorAll('#chat .trpg-scene-ledger')];return nodes.length>0&&nodes.every(n=>n.dataset.rfChatTheme===value&&getComputedStyle(n).gridTemplateColumns.includes('px'));},value);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function scrollTo(n){await n.scrollIntoViewIfNeeded();await page.waitForTimeout(100);}
try{
 await page.goto(base);await ready();report.host=await(await page.request.get(base+'/version')).json();console.log('Native host ready',release);
 const themePath='/tmp/roleforge-story-review/profile/default-user/themes/Dark Lite.json',hostTheme=JSON.parse(await readFile(themePath));
 await page.selectOption('#themes','Dark Lite',{force:true});assert.equal(await page.evaluate(()=>SillyTavern.getContext().powerUserSettings.custom_css),hostTheme.custom_css);
 const training={version:1,hidden:[],definitions:['Energy Control','Research Literacy','Field Investigation','Physical Control'].map((name,i)=>({id:'practice-'+i,name,unit:'practice points',description:'Practice proficiency',methods:['Careful supervised practice'],initial:0,min:0,max:999999,gain:1,showTraining:true,showStatus:true}))};
 await importCard({spec:'chara_card_v2',spec_version:'2.0',data:{name:'Scene Themes '+Date.now(),description:'Local presentation test',personality:'',scenario:'',mes_example:'',first_mes:reply,tags:[],extensions:{roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{showSceneTracker:true},trainingPreset:training,initialState:{player:{name:'Jino',level:2,profession:'Master candidate',customStats:Object.fromEntries(training.definitions.map(d=>[d.id,0]))},onboarding:{identitySeeded:true,loadoutSeeded:true,locationSeeded:true}}}}}});
 await control('userChatPresentation',true);
 await page.evaluate(async()=>{const h=await import('/script.js'),o=await import('/scripts/openai.js');h.changeMainAPI('openai');Object.assign(o.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:18180/local-fixture',custom_model:'scene-fixture',stream_openai:true,openai_max_context:32768,openai_max_tokens:1000});h.setOnlineStatus('scene-fixture');document.getElementById('send_textarea').value='|ค่ายพักอยู่ใกล้แล้ว แต่เรายังควรระวังตัวไว้ก่อน|\n"ไปกันเถอะครับ ถ้าพร้อมแล้ว"';await h.Generate('normal');});
 await page.waitForFunction(()=>!document.getElementById('send_but')?.classList.contains('disabled'));await page.waitForTimeout(1200);
 assert.equal(report.nativeGenerations,1);assert(await page.locator('#chat .trpg-user-thought').count()>0);assert(await page.locator('#chat .trpg-scene-ledger').count()>0);
 assert.equal(await page.locator('#chat .trpg-user-header').count(),0);
 const sourceBefore=await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chat.map(m=>m.mes))),stateBefore=await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state));
 report.checks.push('Native card import and completed Generate create real Scene Tracker and user thoughts; no duplicated player header.');
 const themes=['roleforge','folio','chapter','codex','aincrad'];
 for(const width of (desktop?[1440]:[320,390,430,1440])){
  await page.setViewportSize({width,height:width>700?1000:844});
  for(const value of themes){
   await theme(value);const card=page.locator('#chat .trpg-scene-ledger').last(),thought=page.locator('#chat .trpg-user-thought').last();
   assert.equal(await thought.evaluate(n=>n.closest('[data-rf-chat-theme]').dataset.rfChatTheme),value);
   const measure=n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,overflow:n.scrollWidth>n.clientWidth+2};};
   const metrics={width,theme:value,scene:await card.evaluate(measure),thought:await thought.evaluate(measure)};
   for(const box of [metrics.scene,metrics.thought]){assert(box.width>0&&!box.overflow,JSON.stringify(metrics));assert(box.left>=-1&&box.right<=width+1,JSON.stringify(metrics));}
   await card.locator('summary').click();assert(await card.locator('details').evaluate(n=>n.open));assert.match(await card.innerText(),/Beside the campfire/);assert.match(await card.innerText(),/Orléans Region/);
   assert.equal(await card.evaluate(n=>n.scrollWidth<=n.clientWidth+2),true);await card.locator('summary').click();
   if(width===390||width===1440){
    const device=width===390?'mobile':'desktop';await scrollTo(card);await card.screenshot({path:`${out}/${device}-${value}-scene.png`});await scrollTo(thought);await thought.screenshot({path:`${out}/${device}-${value}-thought.png`});
    if(value==='codex'){await scrollTo(card);await page.screenshot({path:`${out}/${device}-sillytavern.png`});}
   }
   report.layouts.push(metrics);
  }
  console.log('PASS real scene/thought themes',width);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chat.map(m=>m.mes))),sourceBefore,'Themes never rewrite saved messages');
 assert.equal(await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state)),stateBefore,'Themes never mutate character state');
 report.checks.push('All 5 themes fit '+(desktop?'1440 desktop':'320/390/430/1440')+'; expand/collapse retains every scene field; stored text and RPG state stay unchanged.');
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-dock-panel=status]').click();
 const chips=page.locator('.rf-stat-custom-values>span');assert.equal(await chips.count(),4);assert.match(await chips.first().innerText(),/0\s+practice points/);
 assert.equal(await chips.first().evaluate(n=>n.scrollWidth<=n.clientWidth),true);await page.locator('.rf-user-status').screenshot({path:out+'/mobile-stats.png'});
 await page.locator('[data-dock-panel=stats]').click();assert.equal(await page.locator('.rf-stat-training .rf-ability-heading .fa-dumbbell').count(),1);assert.equal(await page.locator('.rf-stat-start .fa-dumbbell').count(),1);
 assert.match(await page.locator('.rf-stat-start .fa-dumbbell').evaluate(n=>getComputedStyle(n).fontFamily),/Font Awesome/);
 assert.equal(await page.locator('.rf-stat-training').evaluate(n=>n.scrollWidth<=n.clientWidth+2),true);await page.locator('.rf-stat-training').screenshot({path:out+'/mobile-training.png'});
 assert.equal(report.nativeGenerations,1,'Visual actions make no extra model requests');
 report.checks.push('Fate-style custom units retain authored data and visible spacing; training uses the installed Font Awesome dumbbell in both locations.');
 // A late-loaded legacy sheet is a realistic NPC Management lifecycle.
 await page.evaluate(async()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/scripts/extensions/third-party/rpg-systems/styles/npc-ui.css?late-scene-test';document.head.append(link);await new Promise((r,j)=>{link.onload=r;link.onerror=j;});});
 await theme('aincrad');await page.waitForFunction(()=>{const n=[...document.querySelectorAll('#chat .trpg-scene-ledger')].at(-1);return n?.isConnected&&getComputedStyle(n).gridTemplateColumns.split(' ')[0]==='43px';});
 assert.equal(await page.locator('#chat .trpg-user-thought').last().evaluate(n=>getComputedStyle(n,':after').content),'none');
 await control('showChatHeader',false);await control('showChatDialogue',false);await control('showChatNarrative',false);
 assert.equal(await page.locator('#chat .trpg-header').count(),0);assert(await page.locator('#chat .trpg-dialogue.trpg-unframed').count()>0);assert(await page.locator('#chat .trpg-user-thought').count()>0);assert(await page.locator('#chat .trpg-scene-ledger').count()>0);
 await control('showChatHeader',true);await control('showChatDialogue',true);await control('showChatNarrative',true);
 report.checks.push('Late NPC stylesheet cannot override the new shapes; Header/Dialogue/Narrative toggles still act independently.');
 const activeName=await page.evaluate(()=>SillyTavern.getContext().characters[SillyTavern.getContext().characterId].name);
 await page.reload();await ready();await page.evaluate(async name=>{const h=await import('/script.js');await h.selectCharacterById(String(SillyTavern.getContext().characters.findIndex(c=>c.name===name)));},activeName);
 await page.locator('#chat .trpg-user-thought').last().waitFor();
 assert.equal(await page.locator('#chat .trpg-user-header').count(),0);
 assert.equal(await page.locator('#chat .trpg-scene-ledger').last().getAttribute('data-rf-chat-theme'),'aincrad');
 assert.equal(await page.locator('#chat .trpg-user-thought').last().evaluate(n=>n.closest('[data-rf-chat-theme]').dataset.rfChatTheme),'aincrad');
 assert.equal(await page.evaluate(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.statTraining.definitions.length),4);
 report.checks.push('Native reload/reopen restores scene/thought theme and custom stats without editing a message.');
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;console.error(error);await page.screenshot({path:out+'/failed.png'});process.exitCode=1;}
finally{await writeFile(out+'/scene-thought-real.json',JSON.stringify(report,null,2));await browser.close();}
