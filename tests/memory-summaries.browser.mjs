// Production loader and real IndexedDB with a deterministic generation API fixture.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
 const path=url.pathname.slice(base.length);let content=await readFile(new URL(path,root));
 if(path==='docs/previews/preview-h-stats.html')content=content.toString().replace('<textarea id="send_textarea"></textarea>','<section id="form_sheld"><form id="send_form"><textarea id="send_textarea" aria-label="Story message" placeholder="Type a message, or /? for help"></textarea><div id="send_controls"><button id="send_but" type="button" aria-label="Send story message">➤</button><button id="mes_stop" type="button" hidden aria-label="Stop story generation">■</button></div></form></section>').replace('</style>','#form_sheld{position:fixed;bottom:12px;left:12px;right:12px;white-space:nowrap}#send_form{border:1px solid #444;border-radius:20px;background:#151515;padding:12px;display:flex;flex-wrap:wrap;gap:8px;box-sizing:border-box}#send_form #send_textarea{display:block;flex:1 1 100%;width:100%;min-height:64px;border:0;background:transparent;color:#eee;resize:none;font:inherit}#send_controls{margin-left:auto;display:flex;gap:6px}#send_but,#mes_stop{width:44px;height:44px;border-radius:50%;font-size:22px;border:0;background:#ddd;color:#111}</style>');
 res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':/\.(m?js)$/.test(path)?'text/javascript':'image/webp');res.end(content);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const widths=process.env.MEMORY_WIDTHS?process.env.MEMORY_WIDTHS.split(',').map(Number):[320,390,1280];
async function panel(page){
 await page.evaluate(()=>{document.querySelector('#tretaresia-rpg-close')?.click();document.querySelector('#extensions_settings2').style.cssText='display:block;position:fixed;inset:0;z-index:100010;overflow-y:auto;max-width:540px;margin:0 auto;padding:12px;background:#171717';document.querySelector('#tretaresia-rpg-settings').style.display='none';document.querySelector('.preview-host').style.display='none';const drawer=document.querySelector('#roleforge-memory-addons>details');if(!drawer.open)drawer.querySelector('summary').click();});
 await page.locator('#roleforge-memory-addons .rf-memory-workspace').waitFor();return page.locator('[data-memory-addons-panel]');
}
async function expand(current,section){const node=current.locator(`[data-memory-section="${section}"]`);if(!await node.evaluate(n=>n.open))await node.locator(':scope>summary').click();}
async function saveSettings(current,group){await current.locator(`[data-memory-settings-group="${group}"] [type=submit]`).click();}

async function search(page,value){const current=await panel(page);await expand(current,'archive');await current.locator('[name="query"]').fill(value);await current.locator('[data-form="memory-summary-search"] [type="submit"]').click();}
async function setupApi(page){await page.evaluate(()=>{
 window.memoryCalls=[];window.memoryPrompts=new Map();window.memoryNotices=[];window.toastr.error=message=>window.memoryNotices.push(message);window.host.extensionSettings.tretaresia_rpg.autoContinuity=true;window.host.getTokenCountAsync=async value=>Math.ceil(value.length/3);
 window.host.setExtensionPrompt=(name,value)=>window.memoryPrompts.set(name,value);
 window.host.generateRaw=async({prompt})=>{window.memoryCalls.push(prompt);if(window.memoryFail)return '{}';return new Promise(resolve=>{window.memoryResolve=()=>{
 const batch=JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1]),source=batch.find(item=>item.text.includes('Cora'))||batch.at(-1);
 resolve(JSON.stringify({summary:'Nova met Cora while fishing at the river at night.',recap:'Nova first met Cora at the river while fishing at night. They spoke privately.',events:[{title:'First meeting with Cora <img src=x onerror=alert(1)>',detail:'Nova met Cora while fishing at the river at night.',kind:'Event',people:['Cora','Nova','คอร่า'],places:['River','แม่น้ำ'],keywords:['fishing','ตกปลา','กลางคืน'],knownBy:['Cora','Nova'],whenText:'Day 7, night',sourceKeys:[source.segmentKey],evidence:source.text.slice(0,100)}]}));window.memoryResolve=null;
 };});};
 window.host.generateQuietPrompt=({quietPrompt})=>window.host.generateRaw({prompt:quietPrompt});
});}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of widths){
 const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
 await page.addInitScript(()=>{
 if(localStorage.getItem('roleforge-hstats-preview-metadata'))return;
 localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{enableMemorySummaries:true,language:'en',autoTrack:false,autoContinuity:true,memoryAutoSummary:false,chatPresentation:false}}));
 localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],progression:{currency:{gold:6,silver:0,copper:120}},location:{place:'River',narrativeVersion:1},worldClock:{day:7,time:'23:00'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}));
 });
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('#roleforge-memory-addons>details'));assert.equal(await page.locator('#roleforge-memory-addons>details').evaluate(node=>node.open),false,'saved enabled Memory starts collapsed');assert.equal(await page.locator('[data-memory-addons-panel]').isVisible(),false);await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-open.is-ready'));
 await setupApi(page);
 await page.evaluate(async()=>{window.host.chat=[{is_user:true,name:'Nova',mes:'I go fishing at the river at night.'},{is_user:false,name:'Cora',mes:'Cora meets Nova at the river that night. It is their first meeting.'}];await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);});
 let current=await panel(page);await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='2');await page.evaluate(()=>localStorage.setItem('memory-original-chat',JSON.stringify(window.host.chat)));
 assert.equal(await page.evaluate(()=>window.memoryCalls.length),0);
 await current.locator('[data-action="memory-summary-prepare"]').click();await page.waitForFunction(()=>typeof window.memoryResolve==='function');
 assert.equal(await current.locator('.rf-memory-job').getAttribute('data-status'),'summarizing');assert.equal(await current.locator('.rf-memory-job').getAttribute('aria-busy'),'true');
 await page.evaluate(()=>window.memoryResolve());await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.dataset.status==='ready');
 assert.equal(await page.evaluate(()=>window.memoryCalls.length),1);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),6);
 await search(page,'คอร่า แม่น้ำ ตกปลา');current=await panel(page);assert((await current.locator('.rf-memory-hit').count())>0);
 assert.equal(await current.locator('.rf-memory-hit img').count(),0);
 await current.locator('[data-action="memory-summary-source"]').first().click();assert.match(await current.locator('.rf-memory-source pre').innerText(),/river/);
 await current.locator('[data-action="memory-summary-force"]').first().click();await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor());
 assert.match(await page.evaluate(()=>window.memoryPrompts.get('tretaresia_rpg_roleplay_state')),/roleforge_past_memory/);
 const backupDownload=page.waitForEvent('download');await expand(current,'backup');await current.locator('[data-action="memory-summary-export"]').click();const download=await backupDownload;const backupPath=await download.path();const backup=JSON.parse(await readFile(backupPath,'utf8'));
 assert(backup.chats.some(chat=>chat.messages.some(message=>message.raw.includes('first meeting'))));assert.equal(backup.capsules.length,1);
 const measurements=await current.evaluate(node=>({page:document.documentElement.scrollWidth,panel:node.scrollWidth,width:node.clientWidth}));assert(measurements.page<=width+1,JSON.stringify(measurements));assert(measurements.panel<=measurements.width+1,JSON.stringify(measurements));
 for(const control of await current.locator('button,input:not([type=hidden]):not([type=checkbox]):not([type=file]),select,textarea,summary').all())if(await control.isVisible())assert((await control.boundingBox()).height>=31.9,await control.getAttribute('data-action')||'control');
 await expand(current,'settings');await expand(current,'auto');await expand(current,'context');assert(await current.locator('[name="memorySummaryProfile"]').isVisible());
 await current.locator('[data-memory-batch-size="5"]').click();assert.equal(await current.locator('[name="memorySummaryBatchSize"]').inputValue(),'5');
 assert.equal(await current.locator('[name="memorySummaryTimeoutSeconds"]').inputValue(),'240');
 await current.locator('[name="memorySummaryTimeoutSeconds"]').fill('60');
 await current.locator('[name="memorySummaryBudget"]').fill('800');await saveSettings(current,'api');await saveSettings(current,'auto');await saveSettings(current,'context');
 assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBudget),800);
 assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBatchSize),5);
 assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryTimeoutSeconds),60);
 // The real continuity bridge carries an ancestry link, not a whole archive in every turn.
 await page.evaluate(async()=>{window.TretaresiaRpgContinuity.capture();window.host.chat=[{is_user:false,name:'Narrator',mes:'The next scene begins.'}];await window.hStatsPreview.switchChat('memory-continued',{});});
 await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_memory_link?.ancestry?.includes('h-stats-preview'));
 await page.evaluate(()=>window.host.chat.push({is_user:true,name:'Nova',mes:'Cora, remember our night fishing by the river?'}));
 await new Promise(resolve=>setTimeout(resolve,400));await search(page,'Cora');current=await panel(page);assert((await current.locator('.rf-memory-hit').count())>0);
 await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor());assert.match(await page.evaluate(()=>window.memoryPrompts.get('tretaresia_rpg_roleplay_state')),/first met Cora/);
 assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),6);
 // Fail a new request, keep earlier history, then cancel a retry while its API response is pending.
 await page.evaluate(async()=>{window.memoryFail=true;await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,window.host.chat.length-1,'normal');});
 await new Promise(resolve=>setTimeout(resolve,700));await current.locator('[data-action="memory-summary-run"]').click();await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.dataset.status==='error');
 assert(await current.locator('[data-action="memory-summary-retry"]').isVisible());assert.match(await current.locator('.rf-memory-error').innerText(),/complete summary/);
 await page.evaluate(()=>{window.memoryFail=false;});await current.locator('[data-action="memory-summary-retry"]').click();await page.waitForFunction(()=>typeof window.memoryResolve==='function');await current.locator('[data-action="memory-summary-cancel"]').click();await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.dataset.status==='cancelled');
 await page.evaluate(()=>window.memoryResolve());await search(page,'Cora');assert((await current.locator('.rf-memory-hit').count())>0);
 await page.evaluate(async()=>{window.host.extensionSettings.tretaresia_rpg.language='th';window.host.saveSettingsDebounced();await window.hStatsPreview.switchChat('memory-continued',window.host.chatMetadata);});
 await new Promise(resolve=>setTimeout(resolve,400));await panel(page);assert.match(await current.innerText(),/สรุปข้อความที่เหลือ/);
 // An unrelated branch of the same card receives no implicit history.
 await page.evaluate(async()=>{window.host.extensionSettings.tretaresia_rpg.autoContinuity=false;window.host.saveSettingsDebounced();window.host.chat=[{is_user:true,mes:'A separate story branch.'}];await window.hStatsPreview.switchChat('memory-alternate',{tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],location:{place:'Elsewhere',narrativeVersion:1}}});});
 await new Promise(resolve=>setTimeout(resolve,400));await search(page,'Cora');assert.equal(await current.locator('.rf-memory-hit').count(),0);
 // Reload on the original fixture chat; explicit inclusion recovers the archive from IndexedDB.
 await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));await setupApi(page);await page.evaluate(async()=>{window.host.chat=JSON.parse(localStorage.getItem('memory-original-chat'));await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);});await new Promise(resolve=>setTimeout(resolve,400));current=await panel(page);
 await expand(current,'history');
 const include=current.locator('[data-action="memory-summary-link"][data-id="h-stats-preview"][data-include="true"]');if(await include.count())await include.click();
 await search(page,'Cora');assert((await current.locator('.rf-memory-hit').count())>0);
 // A long backlog is processed as original-message batches, persisted before the next call.
 await page.evaluate(async batchId=>{
  window.host.extensionSettings.tretaresia_rpg.language='en';window.host.extensionSettings.tretaresia_rpg.autoContinuity=false;window.host.extensionSettings.tretaresia_rpg.memoryAutoSummary=false;window.host.saveSettingsDebounced();
  window.host.chat=Array.from({length:23},(_,index)=>({is_user:index%2===0,name:index%2===0?'Nova':'Cora',mes:`Batch message ${index+1}: Nova and Cora continue their river journey.`}));
  localStorage.setItem('memory-batch-originals',JSON.stringify(window.host.chat));
  await window.hStatsPreview.switchChat(batchId,{tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],location:{place:'River',narrativeVersion:1}}});
 },`memory-batch-${width}`);
 current=await panel(page);await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='23');
 await expand(current,'auto');await expand(current,'context');await expand(current,'archive');await expand(current,'job');await expand(current,'settings');
 await current.locator('[data-memory-batch-size="20"]').click();await saveSettings(current,'auto');
 assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBatchSize),20);
 await current.locator('[data-memory-batch-size="10"]').click();await saveSettings(current,'auto');
 assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBatchSize),10);
 const batchStart=await page.evaluate(()=>window.memoryCalls.length);
 await current.locator('[data-action="memory-summary-run"]').click();await page.waitForFunction(()=>typeof window.memoryResolve==='function');
 const firstBatch=await page.evaluate(()=>JSON.parse(window.memoryCalls.at(-1).split('SOURCE SEGMENTS: ')[1]));assert.equal(new Set(firstBatch.map(source=>source.key)).size,10);
 await expand(current,'auto');await expand(current,'context');await expand(current,'archive');await expand(current,'job');await expand(current,'settings');
 await current.locator('[name="memorySummaryBudget"]').fill('1234');await current.locator('[name="query"]').fill('unsaved river search');
 await page.waitForFunction(()=>document.querySelector('[data-memory-elapsed]')?.textContent!=='0:00');
 await page.evaluate(()=>window.memoryResolve());await page.waitForFunction(()=>document.querySelector('[data-memory-processed]')?.textContent==='10/23'&&typeof window.memoryResolve==='function');
 assert.equal(await current.locator('[data-memory-pending]').innerText(),'13');assert.equal(await page.evaluate(()=>window.memoryCalls.length),batchStart+2);
 assert.equal(await current.locator('[name="memorySummaryBudget"]').inputValue(),'1234');assert.equal(await current.locator('[name="query"]').inputValue(),'unsaved river search');assert(await current.locator('.rf-memory-settings').evaluate(node=>node.open));
 assert.equal(await page.evaluate(()=>document.activeElement.name),'query');
 await expand(current,'job');await expand(current,'settings');
 await current.evaluate(node=>{for(let parent=node;parent;parent=parent.parentElement)parent.scrollTop=0;window.scrollTo(0,0);});
 await mkdir('/workspace/artifacts',{recursive:true});await page.screenshot({path:`/workspace/artifacts/memory-batch-progress-${width}.png`});
 // The live summary remains visible in the main composer after closing RoleForge.
 await page.evaluate(()=>{window.originalStorySend=document.querySelector('#send_but');window.storySendClicks=0;window.originalStorySend.addEventListener('click',()=>window.storySendClicks++);});
 await page.evaluate(()=>{document.querySelector('#extensions_settings2').style.display='none';document.querySelector('#tretaresia-rpg-close').click();});
 const composer=page.locator('.rf-memory-composer-status');await composer.waitFor({state:'visible'});assert.equal(await composer.getAttribute('data-status'),'summarizing');
 assert.match(await composer.innerText(),/10\s*\/\s*23/);assert(await page.locator('.rf-memory-composer-stop').isVisible());
 assert.equal(await page.evaluate(()=>document.querySelector('#send_but')===window.originalStorySend),true);
 assert.equal(await page.locator('#send_but').isVisible(),false);
 const composerGeometry=await composer.evaluate(node=>({scroll:node.scrollWidth,width:node.clientWidth,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right}));
 assert(composerGeometry.scroll<=composerGeometry.width+1&&composerGeometry.left>=0&&composerGeometry.right<=width,JSON.stringify(composerGeometry));
 await page.screenshot({path:`/workspace/artifacts/memory-main-chat-progress-${width}.png`});
 await page.locator('.rf-memory-composer-stop').click();await page.waitForFunction(()=>document.querySelector('.rf-memory-composer-status')?.dataset.status==='cancelled');
 assert.equal(await page.locator('#send_but').isVisible(),true);await page.locator('#send_but').click();assert.equal(await page.evaluate(()=>window.storySendClicks),1);
 await composer.locator('[data-memory-composer-action="open"]').click();current=await panel(page);await current.locator('[data-memory-pending]').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.dataset.status==='cancelled'&&document.querySelector('[data-memory-pending]')?.textContent==='13');
 await page.evaluate(()=>window.memoryResolve());assert.equal(await current.locator('[data-memory-pending]').innerText(),'13');
 // Reload, restore the same chat, and resume the thirteen remaining originals from IndexedDB.
 await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));await setupApi(page);
 await page.evaluate(async batchId=>{window.host.chat=JSON.parse(localStorage.getItem('memory-batch-originals'));await window.hStatsPreview.switchChat(batchId,{tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],location:{place:'River',narrativeVersion:1}}});},`memory-batch-${width}`);
 current=await panel(page);await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='13');assert.equal(await current.locator('[data-memory-chapters]').innerText(),'1');
 assert.equal(await page.evaluate(()=>window.memoryCalls.length),0);
 await current.locator('[data-action="memory-summary-run"]').click();await page.waitForFunction(()=>typeof window.memoryResolve==='function');
 const resumedFirst=await page.evaluate(()=>JSON.parse(window.memoryCalls.at(-1).split('SOURCE SEGMENTS: ')[1]));assert.equal(new Set(resumedFirst.map(source=>source.key)).size,10);assert.deepEqual([...new Set(resumedFirst.map(source=>source.key))],Array.from({length:10},(_,index)=>String(index+10)));
 await page.evaluate(()=>window.memoryResolve());await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='3'&&typeof window.memoryResolve==='function');
 const resumedLast=await page.evaluate(()=>JSON.parse(window.memoryCalls.at(-1).split('SOURCE SEGMENTS: ')[1]));assert.deepEqual([...new Set(resumedLast.map(source=>source.key))],['20','21','22']);
 await page.evaluate(()=>window.memoryResolve());await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.dataset.status==='ready');
 assert.equal(await current.locator('[data-memory-pending]').innerText(),'0');assert.equal(await current.locator('[data-memory-chapters]').innerText(),'3');assert.equal(await page.evaluate(()=>window.memoryCalls.length),2);
 // An API deadline identifies the failed phase, retains the saved batch, and does not auto-spend another call.
 await page.evaluate(async timeoutId=>{window.host.chat=Array.from({length:15},(_,index)=>({is_user:index%2===0,name:index%2===0?'Nova':'Cora',mes:`Timeout journey message ${index+1}: Nova and Cora visit the river.`}));await window.hStatsPreview.switchChat(timeoutId,{tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],location:{place:'River',narrativeVersion:1}}});},`memory-timeout-${width}`);
 current=await panel(page);await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='15');
 const timeoutCalls=await page.evaluate(()=>window.memoryCalls.length);
 await current.locator('[data-action="memory-summary-run"]').click();await page.waitForFunction(()=>typeof window.memoryResolve==='function');
 await page.evaluate(()=>{window.memoryNativeTimeout=window.setTimeout;window.setTimeout=(callback,delay,...args)=>window.memoryNativeTimeout(callback,delay===60000?500:delay,...args);window.memoryResolve();});
 await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.dataset.status==='error');
 await page.evaluate(()=>{window.setTimeout=window.memoryNativeTimeout;});
 assert.match(await current.locator('.rf-memory-error').innerText(),/summary API|API.*summary/i);
 await current.locator('.rf-memory-diagnostics summary').click();assert.equal(await current.locator('[data-memory-error-code]').innerText(),'MEMORY_API_TIMEOUT');
 assert.equal(await current.locator('[data-memory-failed-stage]').innerText(),'Summarizing with SillyTavern’s API');
 assert.match(await current.locator('.rf-memory-diagnostics').innerText(),/Previously saved chapters are kept/);
 assert.equal(await current.locator('[data-memory-pending]').innerText(),'5');assert.match(await current.locator('[data-memory-retry-size]').innerText(),/2 messages/);
 assert.equal(await page.evaluate(()=>window.memoryCalls.length),timeoutCalls+2);
 await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.memoryCalls.length),timeoutCalls+2);
 await page.evaluate(()=>window.memoryResolve());assert.equal(await current.locator('[data-memory-pending]').innerText(),'5');assert.equal(await current.locator('[data-memory-chapters]').innerText(),'1');
 await current.locator('[data-action="memory-summary-retry"]').click();await page.waitForFunction(()=>typeof window.memoryResolve==='function');
 assert.equal(await page.evaluate(()=>new Set(JSON.parse(window.memoryCalls.at(-1).split('SOURCE SEGMENTS: ')[1]).map(source=>source.key)).size),2);
 assert.match(await current.locator('[data-memory-adaptive]').innerText(),/2 messages/);
 assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBatchSize),10);
 await page.evaluate(()=>window.memoryResolve());await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='3'&&typeof window.memoryResolve==='function');
 await page.evaluate(()=>window.memoryResolve());await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='1'&&typeof window.memoryResolve==='function');
 await page.evaluate(()=>window.memoryResolve());await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.dataset.status==='ready');
 assert.equal(await current.locator('[data-memory-pending]').innerText(),'0');assert.equal(await page.evaluate(()=>window.memoryCalls.length),timeoutCalls+5);
 assert.deepEqual(errors,[]);await mkdir('/workspace/artifacts',{recursive:true});await page.screenshot({path:`/workspace/artifacts/memory-summaries-${width}.png`});
 // Segments are explanatory: one long original remains one pending message.
 await page.evaluate(async longId=>{window.host.chat=[{is_user:false,name:'Cora',mes:'Cora remembers the river adventure. '.repeat(400)}];await window.hStatsPreview.switchChat(longId,{tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],location:{place:'River',narrativeVersion:1}}});},`memory-long-${width}`);
 current=await panel(page);await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='1');
 await expand(current,'job');assert.match(await current.locator('[data-memory-section="job"]').innerText(),/A long original message can contain several segments/);assert.equal(await page.evaluate(()=>window.memoryCalls.length),timeoutCalls+5);
 // Delete a linked archive through the actual UI, then attempt a stale tab write in real IndexedDB.
 await expand(current,'history');const deleteCalls=await page.evaluate(()=>window.memoryCalls.length);await current.locator('[data-action="memory-summary-delete-preview"][data-id="h-stats-preview"]').click();assert(await current.locator('.rf-memory-delete-confirm').isVisible());
 const deleteFit=await current.evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth}));assert(deleteFit.scroll<=deleteFit.width+1,JSON.stringify(deleteFit));await page.evaluate(async({base,owner})=>{const {createMemoryStore}=await import(base+'src/memory-store.js');window.deleteDB=createMemoryStore();window.deleteOwner=owner;window.beforeDelete=await window.deleteDB.get(owner);window.host.chatMetadata.tretaresia_rpg_memory_link={owner,ancestry:['h-stats-preview',window.host.getCurrentChatId()]};const save=window.host.saveMetadata;window.host.saveMetadata=async()=>{window.host.saveMetadata=save;window.deleteSaveFailed=true;throw Error('test metadata failure');};},{base,owner:backup.owner});
 await current.locator('[data-action="memory-summary-delete-confirm"]').click();await page.waitForFunction(async()=>window.deleteSaveFailed&&JSON.stringify(await window.deleteDB.get(window.deleteOwner))===JSON.stringify(window.beforeDelete));assert.equal(await current.locator('[data-action="memory-summary-delete-preview"][data-id="h-stats-preview"]').count(),1);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_memory_link.ancestry.includes('h-stats-preview')),true);
 await current.locator('[data-action="memory-summary-delete-confirm"]').click();await page.waitForFunction(()=>!document.querySelector('[data-action="memory-summary-delete-preview"][data-id="h-stats-preview"]'));assert.equal(await page.evaluate(()=>window.memoryCalls.length),deleteCalls);
 const stored=await page.evaluate(async({base,owner,stale})=>{const {createMemoryStore}=await import(base+'src/memory-store.js');const db=createMemoryStore();const before=await db.get(owner);if(!before.deletedChats.includes('h-stats-preview'))throw Error('Missing deletion tombstone');await db.put(owner,stale);const after=await db.get(owner);let rejected=false;try{await db.put(owner,stale,{rollback:true,expected:'wrong version'});}catch{rejected=true;}return {after,rejected};},{base,owner:backup.owner,stale:backup});
 assert(stored.rejected);assert(!stored.after.chats.some(c=>c.id==='h-stats-preview'));assert(stored.after.deletedChats.includes('h-stats-preview'));assert(!stored.after.chapters.some(c=>c.chatId==='h-stats-preview'));assert.equal(await page.evaluate(()=>window.memoryCalls.length),deleteCalls);assert.deepEqual(errors,[]);
 await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#roleforge-memory-addons>details')&&document.querySelector('#tretaresia-rpg-settings'));current=await panel(page);await expand(current,'history');assert.equal(await current.locator('[data-action="memory-summary-delete-preview"][data-id="h-stats-preview"]').count(),0);
 console.log(`PASS production memory batches, persisted save/reload/resume, API deadline diagnostics/manual adaptive retry, composer progress/native-send preservation/Stop with overlay closed, unsaved drafts, source evidence/search, Thai/English, token budgets, backup, continuity, branch isolation, per-chat deletion/metadata rollback, stale-tab tombstones and deletion after reload at ${width}px`);
 await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
