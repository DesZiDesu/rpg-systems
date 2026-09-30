// Real production loader, message events, chat-scoped persistence and story UI.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/story-systems.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = new URL('../', import.meta.url);
const base = '/scripts/extensions/third-party/rpg-systems/';
const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname.startsWith('/api/')) {
            response.setHeader('content-type', 'application/json'); response.end('[]'); return;
        }
        if (!url.pathname.startsWith(base) || url.pathname.includes('..')) {
            response.writeHead(404).end(); return;
        }
        const path = url.pathname.slice(base.length);
        const contents = await readFile(new URL(path, root));
        response.setHeader('content-type', path.endsWith('.css') ? 'text/css'
            : path.endsWith('.html') ? 'text/html' : path.endsWith('.json') ? 'application/json'
                : /\.(m?js)$/.test(path) ? 'text/javascript' : 'image/webp');
        response.end(contents);
    } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const artifacts = process.env.MISSION_BOARD_SCREENSHOT_DIR || '/workspace/artifacts';
await mkdir(artifacts, {recursive: true});
const chatKey='roleforge-board-browser-chat';
const story='You walk up to the mission board in the Guild Hall and read the posted jobs.';
const board={title:'Guild Mission Board',location:'Guild Hall',evidence:story,missions:[
 {name:'Deliver medicine',description:'<img id="board-xss" src=x onerror="window.boardXSS=true"> Help Cora at the river.',objective:'Bring medicine to Cora',giver:'Guild clerk',reward:'5 silver',difficulty:'Beginner',deadline:'Tonight',objectives:[{title:'Collect medicine'},{title:'Find Cora'},{title:'Ask about fishing',optional:true}]},
 {name:'Gather herbs',objective:'Collect three moonleaf plants',reward:'2 silver'},
 {name:'Guard the caravan',objective:'Escort the caravan to Eastwatch',reward:'12 silver'},
 {name:'Repair a bridge',objective:'Help the bridge keeper',reward:'3 silver'},
 {name:'Fifth ignored',objective:'Never shown'},
]};
async function draw(page){await page.evaluate(()=>{
 document.querySelector('#chat').replaceChildren(...window.host.chat.map((message,id)=>{
  const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);
  const content=document.createElement('div');content.className='mes_text';content.textContent=message.mes;row.append(content);return row;
 }));
});}
async function setup(page){await page.evaluate(()=>{
 document.querySelector('#tretaresia-rpg-close').click();
 document.querySelector('.preview-host').style.display='none';
 document.querySelector('#chat').style.cssText='display:block;padding:12px;box-sizing:border-box;font-size:16px;line-height:1.5';
 window.notices=[];window.maxNotices=0;
 const seen=new WeakSet();new MutationObserver(()=>{
  const entries=[...document.querySelectorAll('.tretaresia-event-toast')];window.maxNotices=Math.max(window.maxNotices,entries.length);
  for(const item of entries)if(!seen.has(item)){seen.add(item);window.notices.push({kind:item.dataset.kind,text:item.innerText});}
 }).observe(document.body,{childList:true,subtree:true});
 window.prompts=new Map();window.host.setExtensionPrompt=(name,value)=>window.prompts.set(name,value);
});}
async function receive(page,patch,text=story,user='I walk up to the mission board and read it.'){
 const id=await page.evaluate(({patch,text,user})=>{
  window.host.chat.push({is_user:true,name:'Nova',mes:user});const id=window.host.chat.length;
  const mes=`${text}\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`;
  window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes]});return id;
 },{patch,text,user});await draw(page);
 await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,id,'normal'),id);
 await page.waitForFunction(id=>Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`))&&!window.host.chat[id].mes.includes('tretaresia_patch'),id);
 return id;
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{
   if(localStorage.getItem('roleforge-hstats-preview-metadata'))return;
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',autoTrack:true,autoContinuity:false,chatPresentation:false,showSceneTracker:true,notificationDuration:1500}}));
   localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],quests:[],skills:[],inventory:[],location:{narrativeVersion:1,place:'Guild Hall'},onboarding:{locationSeeded:true},progression:{currency:{gold:0,silver:20,copper:0}},proficiencies:{magic:{aura:99},sword:{swordplay:5}}}}));
  });
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));await setup(page);
  const id=await receive(page,{missionBoard:board,ops:[]});
  const card=page.locator('.trpg-mission-board');await card.waitFor({state:'visible'});
  assert.equal(await card.locator('.trpg-board-paper').count(),4);
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.quests.length),0);
  await card.locator('.trpg-board-paper').first().click();assert.equal(await page.locator('#board-xss').count(),0);assert.equal(await page.evaluate(()=>window.boardXSS),undefined);
  assert.match(await card.locator('.trpg-board-detail').innerText(),/Collect medicine/);
  assert.equal((await card.locator('.trpg-board-accept').boundingBox()).height>=44,true);
  await card.getByRole('button',{name:'Back',exact:true}).click();assert(await card.locator('.trpg-board-papers').isVisible());
  await card.locator('.trpg-board-paper').first().click();
  await page.screenshot({path:`${artifacts}/mission-board-detail-${width}.png`});
  const retained=await card.locator('.trpg-board-accept').evaluateHandle(element=>element);
  await card.locator('.trpg-board-accept').click();
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.quests.length===1);
  await retained.evaluate(element=>element.click());
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.quests.length),1);
  const accepted=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);
  assert.equal(accepted.quests[0].status,'Active');assert.equal(accepted.quests[0].objectives.length,3);assert.equal(accepted.quests[0].progress,0);
  assert.equal(accepted.progression.currency.silver,20);assert.equal(accepted.questRewardReceipts.length,0);
  assert.match(await page.evaluate(()=>[...window.prompts.values()].join('\n')),/Deliver medicine/);
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify(window.host.chat)),chatKey);
  await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));await setup(page);
  await page.evaluate(async key=>{window.host.chat=JSON.parse(localStorage.getItem(key));await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);},chatKey);await draw(page);
  await card.waitFor({state:'visible'});await card.locator('.trpg-board-paper').first().click();assert(await card.locator('.trpg-board-accept').isDisabled());
  const dimensions=await card.evaluate(element=>({doc:document.documentElement.scrollWidth,width:innerWidth,scroll:element.scrollWidth,client:element.clientWidth}));
  assert(dimensions.doc<=width+1,JSON.stringify(dimensions));assert(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));
  // An edited/replaced source cannot retain actionable board controls.
  await page.evaluate(async id=>{window.host.chat[id].swipes[1]='You leave the Guild Hall without reading any board.';window.host.chat[id].swipe_id=1;window.host.chat[id].mes=window.host.chat[id].swipes[1];await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_SWIPED,id);},id);await draw(page);
  await page.waitForFunction(()=>!document.querySelector('.trpg-mission-board')&&window.host.chatMetadata.tretaresia_rpg_state.quests.length===0);
  await page.evaluate(async id=>{window.host.chat[id].swipe_id=0;window.host.chat[id].mes=window.host.chat[id].swipes[0];await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_SWIPED,id);},id);await draw(page);
  await card.waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.quests.length),1);
  await page.evaluate(()=>{window.notices=[];});
  const ops=[['inc','inventory',{id:'potion',name:'Potion',quantity:2},{category:'purchase',reason:'Bought two potions'}],['inc','progression.currency.silver',-3,{category:'purchase',reason:'Paid for potions'}],
   ['upsert','skills',{id:'fishing',name:'Fishing',rank:'Beginner'},{category:'learning',reason:'Learned at the river'}],['inc','proficiencies.magic.aura',5,{category:'training',label:'Aura',reason:'Control practice'}],['inc','proficiencies.sword.swordplay',2,{category:'training',label:'Swordplay'}],
   ...Array.from({length:6},(_,i)=>['inc','inventory',{id:`herb-${i}`,name:`Herb ${i}`,quantity:1},{category:'loot',reason:'Gathered herbs'}])];
  const changesId=await receive(page,{ops},'You buy two potions, learn fishing, practice control and swordplay, and gather six herbs.','I finish my shopping and training.');
  await page.waitForFunction(()=>window.notices.filter(entry=>['learning','training','purchase','inventory','currency'].includes(entry.kind)).length>=11,null,{timeout:15000});
  const notices=await page.evaluate(()=>window.notices);assert(notices.some(item=>item.kind==='training'&&item.text.includes('+1%')));assert(notices.some(item=>item.kind==='purchase'&&item.text.includes('Potion')));
  assert(notices.some(item=>item.kind==='learning'&&item.text.includes('Fishing')));assert.equal(await page.evaluate(()=>window.maxNotices<=4),true);
  const count=notices.length;await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,id,'normal'),changesId);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.notices.length),count);
  await receive(page,{ops:[['inc','inventory',{id:'potion',quantity:-1},{category:'use',reason:'Drank a potion'}],['upsert','skills',{id:'fishing',name:'Fishing',rank:'Adept'},{category:'training',reason:'Fishing mastery improved'}]]},'You drink a potion and become adept at fishing.','I practice fishing.');
  await page.waitForFunction(()=>window.notices.some(item=>item.kind==='inventory'&&item.text.includes('Drank a potion'))&&window.notices.some(item=>item.kind==='training'&&item.text.includes('Fishing mastery improved')),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.notices.filter(item=>item.kind==='learning'&&item.text.includes('Fishing')).length),1);
  await page.evaluate(async id=>{const language=document.querySelector('#tretaresia-rpg-language');language.value='th';language.dispatchEvent(new Event('change',{bubbles:true}));await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);},id);
  await page.evaluate(()=>document.querySelector('#tretaresia-rpg-close').click());
  await page.waitForFunction(()=>document.querySelector('.trpg-board-paper small')?.textContent.includes('ภารกิจ'));
  await card.locator('.trpg-board-paper').nth(1).click();assert(await card.getByRole('button',{name:'ย้อนกลับ',exact:true}).isVisible());assert(await card.getByRole('button',{name:'รับภารกิจ',exact:true}).isVisible());
  await card.getByRole('button',{name:'ย้อนกลับ',exact:true}).click();
  const stale=await card.locator('.trpg-board-paper').nth(1).evaluateHandle(element=>element);
  await page.evaluate(async()=>{window.host.chat=[];await window.hStatsPreview.switchChat('separate-board-chat',{tretaresia_rpg_state:{player:{name:'Other'},npcs:[],quests:[],inventory:[],location:{narrativeVersion:1,place:'Guild Hall'},onboarding:{locationSeeded:true}}});});await draw(page);
  await stale.evaluate(element=>element.click());assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.quests.length),0);
  assert.deepEqual(errors,[],`Production errors at ${width}`);
  console.log(`PASS mission board 4 papers, details/back, escaped text, accept once/no payout, prompt, reload, swipe rollback, notification queue and chat isolation at ${width}px`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
