// Production loader + real chat events + real persistence/UI; no model calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = new URL('../',import.meta.url), base = '/scripts/extensions/third-party/rpg-systems/';
const server = http.createServer(async(req,res) => {
 try { const url = new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));
  res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
const artifacts=process.env.AUCTION_SCREENSHOT_DIR || '/workspace/artifacts/auction-preview';await mkdir(artifacts,{recursive:true});
const place='หอประมูลแสงจันทร์',story='คุณเดินเข้าหอประมูลแสงจันทร์และนั่งลงในห้องประมูล เจ้าหน้าที่นำสินค้ารายการแรกขึ้นแสดงบนแท่น';
const offer={id:'moonhall-day-63',title:'หอประมูลแสงจันทร์',location:place,evidence:story,denomination:'gold',entryFee:2,deposit:5,lots:[
 {id:'moonblade',name:'ดาบจันทร์เงิน',category:'อาวุธ',rarity:'Rare · ตรวจสอบแล้ว',description:'ดาบเหล็กเงินตีด้วยมือ คมดาบสะท้อนแสงจันทร์ ผู้ประเมินยืนยันว่าใบดาบและด้ามยังสมบูรณ์ ไม่มีข้อมูลพลังลับที่เปิดเผย',quantity:1,openingBid:6,minIncrement:2,bidders:[{name:'คอร่า',maxBid:12}]},
 {id:'potions',name:'ยาฟื้นฟูคุณภาพสูง',category:'ไอเทมใช้แล้วหมด',rarity:'Uncommon',description:'ยาฟื้นฟูในขวดแก้วสองขวด ตรารับรองจากร้านโอสถประจำเมือง',quantity:2,openingBid:3,minIncrement:1,bidders:[]}
]};
async function capture(card,options){await card.page().waitForTimeout(200);const page=card.page(),style=await page.addStyleTag({content:'#tretaresia-event-stack{visibility:hidden!important}'});try{await card.screenshot(options);}finally{await style.evaluate(el=>el.remove());}}
async function draw(page){await page.evaluate(()=>{document.querySelector('#chat').replaceChildren(...window.host.chat.map((message,id)=>{const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes;row.append(text);return row;}));});}
async function setup(page){await page.evaluate(()=>{
 document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#chat').style.cssText='display:block;padding:12px;box-sizing:border-box;font-size:16px;line-height:1.5';
 window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
 window.notices=[];const seen=new WeakSet();new MutationObserver(()=>{for(const el of document.querySelectorAll('.tretaresia-event-toast'))if(!seen.has(el)){seen.add(el);window.notices.push({kind:el.dataset.kind,text:el.innerText});}}).observe(document.body,{childList:true,subtree:true});
});}
async function receive(page,patch,text=story){const id=await page.evaluate(({patch,text})=>{window.host.chat.push({is_user:true,name:'ผู้เล่น',mes:'ฉันเดินเข้าไปในหอประมูล'});const id=window.host.chat.length;const mes=`${text}\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`;window.host.chat.push({is_user:false,name:'ผู้บรรยาย',mes,swipe_id:0,swipes:[mes]});return id;},{patch,text});await draw(page);await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,id,'normal'),id);await page.waitForFunction(id=>!window.host.chat[id].mes.includes('tretaresia_patch')&&Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`)),id);return id;}
async function saved(page,revision){await page.waitForFunction(revision=>window.host.chatMetadata.tretaresia_rpg_state.auctions?.[0]?.revision===revision,revision);await page.waitForFunction(()=>!document.querySelector('.trpg-auction[aria-busy]')&&document.querySelector('.trpg-auction [data-auction-action]:not(:disabled)'));await page.waitForTimeout(130);}
async function panel(page,name){await page.evaluate(()=>document.querySelector('#preview-open').click());await page.waitForFunction(()=>document.querySelector('#tretaresia-rpg-overlay.is-ready'));const {target,active}=await page.evaluate(name=>{const tabs=[...document.querySelectorAll('.tretaresia-module-track [data-tab]')];return {target:tabs.findIndex(t=>t.dataset.tab===name),active:tabs.findIndex(t=>t.classList.contains('is-active'))};},name);for(let i=active;i!==target;i+=target>active?1:-1)await page.locator(`[data-action="${target>active?'tab-next':'tab-prev'}"]`).click();await page.locator(`[data-panel="${name}"]`).waitFor({state:'visible'});}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of (process.env.AUCTION_WIDTHS || '320,390,1280').split(',').map(Number)){
  const page=await browser.newPage({viewport:{width,height:1100},deviceScaleFactor:2,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(({place})=>{localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{enableAuctions:true,eventNotifications:true,language:'th',autoTrack:true,autoContinuity:false,chatPresentation:false,showSceneTracker:true,memoryAutoSummary:false,notificationDuration:1500}}));localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'ผู้เล่น'},npcs:[],quests:[],inventory:[],skills:[],location:{narrativeVersion:1,place},onboarding:{locationSeeded:true},progression:{currency:{name:'เหรียญเมือง',gold:60,silver:15,copper:0}}}}));},{place});
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));await setup(page);
  const id=await receive(page,{auction:offer,ops:[]}),card=page.locator('#chat .trpg-auction');await card.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),60);
  await capture(card,{path:`${artifacts}/01-offer-${width}.png`});
  await card.locator('.trpg-auction-detail-toggle').click();assert.match(await card.locator('.trpg-auction-details').innerText(),/ไม่มีข้อมูลพลังลับ/);
  await card.locator('[data-auction-action="join"]').click();await saved(page,1);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),58);
  await capture(card,{path:`${artifacts}/02-joined-${width}.png`});
  const retained=await card.locator('.trpg-auction-primary').evaluateHandle(el=>el);await card.locator('.trpg-auction-primary').click();await saved(page,2);
  assert.match(await card.locator('.trpg-auction-leader').innerText(),/คอร่า/);assert.match(await card.locator('.trpg-auction-funds').innerText(),/53/);
  await capture(card,{path:`${artifacts}/03-outbid-${width}.png`});await retained.evaluate(el=>el.click());assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.auctions[0].revision),2);
  await card.locator('input').fill('20');await card.locator('.trpg-auction-custom button').click();await saved(page,3);assert.match(await card.locator('.trpg-auction-leader').innerText(),/ผู้เล่น/);
  assert(await card.locator('[data-auction-action="leave"]').isDisabled());assert.match(await card.locator('.trpg-auction-funds').innerText(),/25/);
  await capture(card,{path:`${artifacts}/04-leading-${width}.png`});
  // A failed save restores bids, reservation, money and checkpoint; retry applies once.
  await page.evaluate(()=>{window.originalSave=window.host.saveMetadata;window.host.saveMetadata=async()=>{throw Error('Offline auction test');};});
  await card.locator('[data-auction-action="wait"]').click();await page.waitForFunction(()=>document.querySelector('.trpg-auction-status')?.textContent.includes('บันทึกไม่สำเร็จ'));
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.auctions[0].revision),3);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.auctions[0].lots[0].closingCount),0);
  await capture(card,{path:`${artifacts}/08-save-failure-${width}.png`});await page.evaluate(()=>{window.host.saveMetadata=window.originalSave;});
  await card.locator('[data-auction-action="wait"]').click();await saved(page,4);await capture(card,{path:`${artifacts}/05-count-${width}.png`});
  // Reload with persisted chat and active commitment; no round advances by itself.
  await page.evaluate(()=>{localStorage.setItem('auction-browser-chat',JSON.stringify(window.host.chat));localStorage.setItem('auction-browser-state',JSON.stringify(window.host.chatMetadata));});
  await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));await setup(page);
  await page.evaluate(async()=>{window.host.chat=JSON.parse(localStorage.getItem('auction-browser-chat'));window.host.chatMetadata=JSON.parse(localStorage.getItem('auction-browser-state'));await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);});await draw(page);await card.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.auctions[0].lots[0].closingCount),1);
  await card.locator('[data-auction-action="wait"]').click();await saved(page,5);
  await page.evaluate(()=>{window.originalSave=window.host.saveMetadata;window.host.saveMetadata=async()=>{throw Error('Offline settlement test');};});
  await card.locator('[data-auction-action="wait"]').click();await page.waitForFunction(()=>document.querySelector('.trpg-auction-status')?.textContent.includes('บันทึกไม่สำเร็จ'));
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),58);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.transactions.length),1);
  await page.evaluate(()=>{window.host.saveMetadata=window.originalSave;});
  await card.locator('[data-auction-action="wait"]').click();await saved(page,6);
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),38);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory[0].quantity),1);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.transactions.length),2);
  await capture(card,{path:`${artifacts}/06-won-${width}.png`});
  await page.waitForFunction(()=>window.notices.some(n=>n.kind==='inventory'));assert(await page.evaluate(()=>window.notices.some(n=>n.kind==='auction')));
  assert.doesNotMatch(await page.evaluate(()=>[...window.prompts.values()].join('\n')),/"name":"คอร่า"[^}]*"maxBid"/);
  // AI narration cannot pay/deliver the already-settled lot again or spend the deposit.
  await receive(page,{ops:[['inc','progression.currency.gold',-20,{reason:'Winning auction bid'}],['inc','inventory',{name:'ดาบจันทร์เงิน',quantity:1},{category:'auction'}],['set','progression.currency.gold',0,{reason:'Bought supplies'}]]},'คุณได้รับดาบจันทร์เงินจากการประมูลและเดินกลับมายังที่นั่ง');
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),38);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory[0].quantity),1);
  await card.locator('[data-auction-action="next"]').click();await saved(page,7);await capture(card,{path:`${artifacts}/07-next-lot-${width}.png`});
  await card.locator('.trpg-auction-primary').click();await saved(page,8);
  for(const revision of [9,10,11]){await card.locator('[data-auction-action="wait"]').click();if(revision<11)await saved(page,revision);else await page.waitForFunction(()=>document.querySelector('.trpg-auction')?.dataset.status==='Completed');}
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),35);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.find(i=>i.name==='ยาฟื้นฟูคุณภาพสูง').quantity),2);
  await capture(card,{path:`${artifacts}/09-completed-${width}.png`});
  const size=await card.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,doc:document.documentElement.scrollWidth}));assert(size.scroll<=size.client+1&&size.doc<=width+1,JSON.stringify(size));
  assert((await card.locator('.trpg-auction-collapse').boundingBox()).height>=44);
  await panel(page,'rank');assert.equal(await page.locator('[data-panel="rank"] .trpg-auction').count(),1);
  await page.locator('[data-panel="rank"] .trpg-auction').screenshot({path:`${artifacts}/10-wallet-${width}.png`});await page.evaluate(()=>document.querySelector('#tretaresia-rpg-close').click());
  const stale=await card.locator('.trpg-auction-collapse').evaluateHandle(el=>el);
  await page.evaluate(async()=>{window.host.chat=[];await window.hStatsPreview.switchChat('other-auction-chat',{tretaresia_rpg_state:{player:{name:'Other'},npcs:[],inventory:[],location:{narrativeVersion:1,place:'หอประมูลแสงจันทร์'},progression:{currency:{gold:10}}}});});await draw(page);await stale.evaluate(el=>el.click());assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),10);
  assert.deepEqual(errors,[],`Production errors at ${width}`);console.log(`PASS auction offer, join/fee, bids/outbid/reserve, save rollback/retry, reload, three counts, exactly-once wallet/inventory, two lots, AI replay guard, resume panel, chat isolation and layout at ${width}px`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
