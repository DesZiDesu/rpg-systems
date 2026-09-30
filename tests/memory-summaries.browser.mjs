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
 const path=url.pathname.slice(base.length),content=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':/\.(m?js)$/.test(path)?'text/javascript':'image/webp');res.end(content);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const widths=process.env.MEMORY_WIDTHS?process.env.MEMORY_WIDTHS.split(',').map(Number):[320,390,1280];
async function panel(page){
 const info=await page.evaluate(()=>{const tabs=[...document.querySelectorAll('.tretaresia-module-track [data-tab]')];return {target:tabs.findIndex(tab=>tab.dataset.tab==='summaries'),active:tabs.findIndex(tab=>tab.classList.contains('is-active'))};});
 for(let i=info.active;i!==info.target;i+=info.target>info.active?1:-1)await page.locator(`[data-action="${info.target>info.active?'tab-next':'tab-prev'}"]`).click();
 await page.waitForFunction(()=>document.querySelector('[data-panel="summaries"].is-active .rf-memory-workspace'));
 return page.locator('[data-panel="summaries"].is-active');
}
async function search(page,value){const current=await panel(page);await current.locator('[name="query"]').fill(value);await current.locator('[data-form="memory-summary-search"] [type="submit"]').click();}
async function setupApi(page){await page.evaluate(()=>{
 window.memoryCalls=[];window.memoryPrompts=new Map();window.memoryNotices=[];window.toastr.error=message=>window.memoryNotices.push(message);window.host.extensionSettings.tretaresia_rpg.autoContinuity=true;window.host.getTokenCountAsync=async value=>Math.ceil(value.length/3);
 window.host.setExtensionPrompt=(name,value)=>window.memoryPrompts.set(name,value);
 window.host.generateRaw=async({prompt})=>{window.memoryCalls.push(prompt);if(window.memoryFail)return '{}';return new Promise(resolve=>{window.memoryResolve=()=>{
 const batch=JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1]),source=batch.find(item=>item.text.includes('Cora'))||batch.at(-1);
 resolve(JSON.stringify({summary:'Nova met Cora while fishing at the river at night.',recap:'Nova first met Cora at the river while fishing at night. They spoke privately.',events:[{title:'First meeting with Cora <img src=x onerror=alert(1)>',detail:'Nova met Cora while fishing at the river at night.',kind:'Event',people:['Cora','Nova','คอร่า'],places:['River','แม่น้ำ'],keywords:['fishing','ตกปลา','กลางคืน'],knownBy:['Cora','Nova'],whenText:'Day 7, night',sourceKeys:[source.segmentKey],evidence:source.text.slice(0,100)}]}));window.memoryResolve=null;
 };});};
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
 await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-open.is-ready'));
 await setupApi(page);
 await page.evaluate(async()=>{window.host.chat=[{is_user:true,name:'Nova',mes:'I go fishing at the river at night.'},{is_user:false,name:'Cora',mes:'Cora meets Nova at the river that night. It is their first meeting.'}];await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);});
 let current=await panel(page);await page.waitForFunction(()=>document.querySelector('.rf-memory-job')?.textContent.includes('Original messages: 2'));await page.evaluate(()=>localStorage.setItem('memory-original-chat',JSON.stringify(window.host.chat)));
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
 const backupDownload=page.waitForEvent('download');await current.locator('[data-action="memory-summary-export"]').click();const download=await backupDownload;const backupPath=await download.path();const backup=JSON.parse(await readFile(backupPath,'utf8'));
 assert(backup.chats.some(chat=>chat.messages.some(message=>message.raw.includes('first meeting'))));assert.equal(backup.capsules.length,1);
 const measurements=await current.evaluate(node=>({page:document.documentElement.scrollWidth,panel:node.scrollWidth,width:node.clientWidth}));assert(measurements.page<=width+1,JSON.stringify(measurements));assert(measurements.panel<=measurements.width+1,JSON.stringify(measurements));
 for(const control of await current.locator('button,input:not([type=hidden]):not([type=checkbox]):not([type=file]),select,textarea,summary').all())if(await control.isVisible())assert((await control.boundingBox()).height>=43.9,await control.getAttribute('data-action')||'control');
 await current.locator('.rf-memory-settings summary').click();assert(await current.locator('[name="memorySummaryProfile"]').isVisible());
 await current.locator('[name="memorySummaryBudget"]').fill('800');await current.locator('[data-form="memory-summary-settings"] [type=submit]').click();
 assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBudget),800);
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
 await new Promise(resolve=>setTimeout(resolve,400));await panel(page);assert.match(await current.innerText(),/สรุปความจำสำหรับย้ายแชต/);
 // An unrelated branch of the same card receives no implicit history.
 await page.evaluate(async()=>{window.host.extensionSettings.tretaresia_rpg.autoContinuity=false;window.host.saveSettingsDebounced();window.host.chat=[{is_user:true,mes:'A separate story branch.'}];await window.hStatsPreview.switchChat('memory-alternate',{tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],location:{place:'Elsewhere',narrativeVersion:1}}});});
 await new Promise(resolve=>setTimeout(resolve,400));await search(page,'Cora');assert.equal(await current.locator('.rf-memory-hit').count(),0);
 // Reload on the original fixture chat; explicit inclusion recovers the archive from IndexedDB.
 await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));await setupApi(page);await page.evaluate(async()=>{window.host.chat=JSON.parse(localStorage.getItem('memory-original-chat'));await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);});await new Promise(resolve=>setTimeout(resolve,400));current=await panel(page);
 await current.locator('details').filter({has:page.locator('summary', {hasText:'เลือกประวัติที่จะใช้ในแชตนี้'})}).first().locator('summary').first().click();
 const include=current.locator('[data-action="memory-summary-link"][data-id="h-stats-preview"][data-include="true"]');if(await include.count())await include.click();
 await search(page,'Cora');assert((await current.locator('.rf-memory-hit').count())>0);
 assert.deepEqual(errors,[]);await mkdir('/workspace/artifacts',{recursive:true});await page.screenshot({path:`/workspace/artifacts/memory-summaries-${width}.png`});
 console.log(`PASS production memory summary progress/failure/cancel, source evidence/search, Thai/English, token budgets, full backup, IndexedDB reload, new-chat continuity without reward replay and branch isolation at ${width}px`);
 await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
