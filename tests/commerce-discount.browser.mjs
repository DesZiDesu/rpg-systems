// Exact reported normal-roleplay discount -> saved quote -> button settlement.
// Inventory redesign CSS is injected only in this review page, never runtime.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {mixedRoomUser,mixedRoomStory} from './fixtures/mixed-room-offer.mjs';
import {discountUser,discountCommerce,discountStory} from './fixtures/accepted-room-discount.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=new URL('docs/previews/inventory-rights-v0554/',root).pathname;await mkdir(artifacts,{recursive:true});
const prototype=await readFile(new URL('docs/previews/inventory-rights-v0554/prototype.css',root),'utf8');
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
 const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
async function start(page,user){await page.evaluate(async user=>{
 window.host.chat.push({is_user:true,name:'Noah',mes:user});await window.host.eventSource.emit('MESSAGE_SENT',window.host.chat.length-1);await window.host.eventSource.emit('GENERATION_STARTED','normal',{},false);await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat),100000,()=>{},'normal');
},user);}
async function finish(page,story,patch=null){
 const id=await page.evaluate(({story,patch})=>{const id=window.host.chat.length,mes=story+(patch?`\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`:'');window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes]});const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const text=document.createElement('div');text.className='mes_text';text.textContent=story;row.append(text);document.querySelector('#chat').append(row);return id;},{story,patch});
 await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',id,'normal');await window.host.eventSource.emit('GENERATION_ENDED');},id);await page.waitForFunction(id=>Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`)),id);return id;
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:false,enableIncantation:false,eventNotifications:false,enableMemorySummaries:false}}));
   localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],inventory:[{id:'apple',name:'Red Apple',category:'Food',quantity:1,description:'A fresh, crisp red apple.'}],location:{place:'Oakland Inn',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},worldClock:{day:1,time:'10:20'},progression:{currency:{gold:1,silver:10,copper:50}}}}));
  });
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
  await page.evaluate(()=>{
   document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
   const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;min-height:65px;box-sizing:border-box';form.append(input);document.body.append(form);
   window.calls=[];window.responses=[];window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);window.host.generateRaw=async args=>{window.calls.push(args);const response=window.responses.shift();if(response===undefined)throw Error('Unexpected extra API request');return JSON.stringify(response);};window.host.updateMessageBlock=(id,message)=>document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes;
  });
  await start(page,mixedRoomUser);await finish(page,mixedRoomStory);const commerce=page.locator('.rf-commerce-composer');await commerce.locator('[data-commerce-action="confirm"]').waitFor();
  // Save the user's explicit room selection through normal role-play first.
  let session=await page.evaluate(()=>Object.values(window.host.chatMetadata.tretaresia_rpg_social_events).flatMap(Object.values).find(r=>r.marketplace?.event)?.marketplace.event);
  const selected=session.items[1].id;
  // Candidate IDs depend on the native saved variant; read it from the dock.
  const id=await commerce.getAttribute('data-session');
  const selectionUser='ผมขอห้องพักเดี่ยวชั้นบน';await start(page,selectionUser);await finish(page,'<tr-dialogue name="Garrick">ห้องพักเดี่ยวชั้นบน 2 เงิน รอเจ้าตัดสินใจ</tr-dialogue>',{commerce:{sessionId:id,revision:0,action:'talk',itemId:selected,evidence:selectionUser,decision:{outcome:'unchanged'}}});
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions[0]?.quote===200);
  session=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions[0]);assert.equal(session.revision,1);
  await start(page,discountUser);const discountId=await finish(page,discountStory,{commerce:{...discountCommerce,sessionId:session.id,revision:session.revision}});
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions[0]?.quote===190);
  let saved=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.equal(saved.commerce.sessions[0].agreed,true);assert.deepEqual([saved.progression.currency.gold,saved.progression.currency.silver,saved.progression.currency.copper],[1,10,50]);assert.equal(saved.inventory.length,1);assert.equal(saved.commerce.receipts.length,0);assert.equal(await page.evaluate(()=>window.calls.length),0);
  assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'190');assert.match(await commerce.innerText(),/190 ทองแดง/);assert.match(await commerce.innerText(),/ตกลงราคาแล้ว/);assert.equal(await commerce.locator('[data-commerce-action="confirm"]').isEnabled(),true);
  assert.equal(await commerce.locator('.rf-commerce-unit').inputValue(),'copper');await commerce.locator('.rf-commerce-unit').selectOption('gold');assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'','an inexact unit conversion must not fabricate a one-coin price');await commerce.locator('.rf-commerce-unit').selectOption('copper');assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'190');
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`discount-agreed-${width}.png`});
  // Duplicate processing never resets the negotiated price or adds another turn.
  await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',id,'normal');await window.host.eventSource.emit('GENERATION_ENDED');},discountId);assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'190');
  await page.evaluate(()=>window.responses.push({narrative:'<tr-narrative>การ์ริกรับเงินร้อยเก้าสิบเหรียญทองแดงแล้วส่งกุญแจห้องพักเดี่ยวชั้นบน</tr-narrative>',decision:{outcome:'accept',amount:190}}));await commerce.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));
  saved=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.deepEqual([saved.progression.currency.gold,saved.progression.currency.silver,saved.progression.currency.copper],[1,8,60]);assert.equal(saved.commerce.rights[0].paid,190);assert.equal(saved.commerce.receipts[0].amount,190);assert.equal(saved.inventory.find(e=>e.category==='Key').name,'กุญแจห้องพักเดี่ยวชั้นบน');assert.equal(await page.evaluate(()=>window.calls.length),1);assert.ok(await page.evaluate(()=>window.calls[0].prompt.includes('"amount":190')));
  await page.evaluate(()=>document.querySelector('#tretaresia-rpg-wand-launcher').click());await page.locator('#tretaresia-rpg-overlay').waitFor({state:'visible'});await page.evaluate(()=>document.querySelector('[data-tab="inventory"]').click());
  const rights=page.locator('.rf-rights-inventory');await rights.waitFor();await rights.locator('.rf-right-card').scrollIntoViewIfNeeded();assert.match(await rights.textContent(),/กุญแจห้องพักเดี่ยวชั้นบน/);
  const runtimeStyles=await page.evaluate(()=>[...document.styleSheets].map(s=>s.href||'').filter(Boolean));assert.ok(runtimeStyles.every(href=>!href.includes('prototype.css')),'the review design is not enabled in the extension');
  // Review-only styling retains real state and real native expand/collapse.
  await page.addStyleTag({content:prototype});await page.evaluate(()=>{
   document.querySelector('#tretaresia-rpg-overlay').classList.add('rf-inventory-rights-preview');
   for(const card of document.querySelectorAll('.rf-right-card')){
    const timing=card.querySelector('.rf-right-validity strong')?.textContent.trim();for(const p of card.querySelectorAll('details>p'))if(p.textContent.trim()===timing)p.remove();
    const details=card.querySelector('details');details.addEventListener('toggle',()=>details.querySelector('summary').textContent=details.open?'ซ่อนสิทธิ์และเงื่อนไข':'ดูสิทธิ์และเงื่อนไข');
   }
  });
  await page.evaluate(async base=>{
   const {commerceIconMarkup}=await import(base+'src/commerce-icons.js');
   for(const card of document.querySelectorAll('.rf-right-card')){
    const state=window.host.chatMetadata.tretaresia_rpg_state,right=state.commerce.rights.find(r=>r.id===card.dataset.rightId),linked=state.inventory.find(i=>i.id===right?.inventoryItemId);
    if(linked?.category?.toLowerCase()==='key')card.querySelector('.rf-right-icon').innerHTML=commerceIconMarkup('key');
   }
   // Host icon fonts are not provided by the isolated review fixture.
   for(const icon of document.querySelectorAll('.tretaresia-item-icon'))icon.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V8M12 13v10"/></svg>';
  },base);
  const card=rights.locator('.rf-right-card');await card.scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:artifacts+`inventory-collapsed-${width}.png`});assert.equal(await card.locator('details').getAttribute('open'),null);
  await card.locator('summary').click();assert.equal(await card.locator('details').getAttribute('open'),'');assert.match(await card.innerText(),/190 ทองแดง/);
  const fit=await card.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));assert.ok(fit.scroll<=fit.client+1,JSON.stringify(fit));await page.screenshot({animations:'disabled',path:artifacts+`inventory-expanded-${width}.png`});
  if(width===390)await writeFile(artifacts+'prototype-content.html',await page.evaluate(()=>document.querySelector('.rf-rights-inventory').outerHTML+document.querySelector('.tretaresia-item-grid').outerHTML));
  await card.locator('summary').click();assert.equal(await card.locator('details').getAttribute('open'),null);assert.equal(await page.evaluate(()=>window.calls.length),1,'review controls add no API calls');assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: exact missing-amount acceptance saves 190 copper without payment; confirm debits 190 once and persists matching key/right; duplicate protection; review-only themed inventory expands/collapses within its frame`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
