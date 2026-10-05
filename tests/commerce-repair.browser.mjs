import {repairedBooks,bookChat,bookNames} from './fixtures/commerce-repair-books.mjs';
// Explicit offer repair through the production loader and real composer controls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.COMMERCE_ARTIFACT_DIR||new URL('docs/previews/commerce-repair-v0582/',root).pathname;
await mkdir(artifacts,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
    const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
async function setup(page){
    await page.evaluate(()=>{
        document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
        document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
        const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';
        const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;min-height:65px;box-sizing:border-box';form.append(input);document.body.append(form);
        window.calls=[];window.host.generateRaw=window.host.generateQuietPrompt=async args=>{window.calls.push(args);throw Error('Unexpected secondary API request');};
        window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
    });
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:false,enableIncantation:false,eventNotifications:false,enableMemorySummaries:false}}));
   if(!localStorage.getItem('roleforge-hstats-preview-metadata'))localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],inventory:[],location:{place:'Oakland Bookstore',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},worldClock:{day:1,time:'21:15'},progression:{currency:{name:'Coins',gold:0,silver:100,copper:0}}}}));
  });
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);await setup(page);
  const chat=bookChat();await page.evaluate(async chat=>{window.host.chat.splice(0,window.host.chat.length,...chat);window.host.chatMetadata.tretaresia_rpg_social_events={};window.responses=[];window.quietCalls=0;window.defer=false;
   window.host.generateQuietPrompt=async()=>{window.quietCalls++;throw Error('Unexpected preset fallback');};
   window.host.generateRaw=async args=>{window.calls.push(args);const response=window.responses.shift();if(window.defer){window.defer=false;await new Promise(r=>window.release=r);}if(response===undefined)throw Error('Unexpected API');return JSON.stringify(response);};
   window.host.updateMessageBlock=()=>{};await window.host.eventSource.emit('CHAT_CHANGED');
  },chat);
  const bar=page.locator('.rf-commerce-composer'),repair=bar.locator('[data-commerce-repair]');await repair.waitFor({state:'visible'});
  assert.match(await bar.innerText(),/กดเมื่อ NPC เสนอสินค้าและราคาแล้ว/);assert.match(await bar.innerText(),/ใช้ API 1 ครั้ง/);assert.match(await bar.innerText(),/หลังเติมสำเร็จ/);
  assert.equal(await page.evaluate(()=>window.calls.length),0);
  // Invalid data leaves money/items unchanged and requires an explicit retry.
  const invalid=repairedBooks();delete invalid.marketplace.items[0].usage;await page.evaluate(r=>window.responses.push(r),invalid);await repair.click();await bar.locator('[role="alert"]').waitFor();
  assert.equal(await page.evaluate(()=>window.calls.length),1);assert.match(await bar.innerText(),/ลองใหม่ได้/);assert.equal(await repair.isEnabled(),true);
  // A real host metadata-save failure must roll back the tentative session.
  await page.evaluate(r=>{window.responses.push(r);const save=window.host.saveMetadata.bind(window.host);window.failSave=true;window.host.saveMetadata=async()=>{if(window.failSave){window.failSave=false;throw Error('Injected metadata save failure');}return save();};},repairedBooks());
  await repair.click();await page.waitForFunction(()=>document.querySelector('.rf-commerce-error')?.textContent.includes('บันทึกรายการไม่สำเร็จ'));
  assert.equal(await page.evaluate(()=>window.calls.length),2);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce?.sessions?.length||0),0);
  const before=await page.evaluate(()=>structuredClone(window.host.chatMetadata.tretaresia_rpg_state));assert.equal(before.progression.currency.silver,100);assert.equal(before.inventory.length,0);
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`repair-error-${width}.png`});
  await page.evaluate(r=>{window.responses.push(r);window.defer=true;},repairedBooks());await repair.click();await page.waitForFunction(()=>window.calls.length===3);
  assert.equal(await repair.isDisabled(),true);assert.match(await bar.innerText(),/AI กำลังอ่านบทโรล/);
  await page.evaluate(()=>window.release());await bar.locator('[data-commerce-action="confirm"]').waitFor({state:'visible'});
  assert.equal(await repair.count(),0);assert.equal(await page.evaluate(()=>window.calls.length),3);assert.equal(await page.evaluate(()=>window.quietCalls),0);
  const reference=await page.evaluate(()=>JSON.parse(window.calls[2].prompt.split('COMMERCE REPAIR REFERENCE DATA:\n')[1]));assert.ok(reference.facts.includes('Wind Arrow'));assert.ok(reference.story.includes('สี่สิบเหรียญเงิน'));assert.equal(reference.location,'Oakland Bookstore');
  await bar.locator('.rf-commerce-summary').click();assert.equal(await bar.locator('.rf-commerce-basket-row').count(),3);assert.equal(await bar.locator('.rf-commerce-amount').inputValue(),'40');
  for(let i=0;i<3;i++){assert.equal(await bar.locator(`[data-basket-quantity="book-${i}"]`).inputValue(),'1');assert.match(await bar.innerText(),new RegExp(bookNames[i]));}
  assert.match(await bar.innerText(),/เรียน Wind Arrow/);assert.match(await bar.innerText(),/ราคาตามรายการ\s+45 เงิน/);assert.match(await bar.innerText(),/ข้อเสนอทั้งชุด\s+40 เงิน/);
  let saved=await page.evaluate(()=>structuredClone(window.host.chatMetadata.tretaresia_rpg_state));assert.equal(saved.progression.currency.silver,100);assert.equal(saved.inventory.length,0);assert.equal(saved.skills.length,0);assert.equal(saved.commerce.receipts.length,0);assert.equal(saved.commerce.sessions[0].quote,40);
  assert.deepEqual(await page.evaluate(()=>window.host.chat.map(m=>({is_user:m.is_user,mes:m.mes}))),chat.map(m=>({is_user:m.is_user,mes:m.mes})));
  const geometry=await bar.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,bottom:el.getBoundingClientRect().bottom,top:document.querySelector('#send_form').getBoundingClientRect().top}));assert.ok(geometry.scroll<=geometry.width+1&&geometry.bottom<=geometry.top+1,JSON.stringify(geometry));
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`repaired-books-${width}.png`});
  // Metadata-only repair survives reload with no regeneration or payment.
  await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready);await setup(page);
  await page.evaluate(async chat=>{window.host.chat.splice(0,window.host.chat.length,...chat);window.host.updateMessageBlock=()=>{};window.host.generateRaw=async args=>{window.calls.push(args);return JSON.stringify({narrative:'<tr-narrative>Barth รับเงินสี่สิบเหรียญเงินและส่งมอบตำราทั้งสามเล่ม</tr-narrative>',decision:{outcome:'accept',amount:40}});};await window.host.eventSource.emit('CHAT_CHANGED');},chat);
  await bar.locator('[data-commerce-action="confirm"]').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.calls.length),0);
  await bar.locator('.rf-commerce-summary').click();assert.equal(await bar.locator('.rf-commerce-amount').inputValue(),'40');assert.equal(await bar.locator('.rf-commerce-basket-row').count(),3);
  await bar.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce?.receipts?.length===1);
  saved=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.equal(saved.progression.currency.silver,60);assert.equal(saved.inventory.length,3);assert.equal(saved.skills.length,0);assert.equal(saved.commerce.receipts[0].amount,40);assert.equal(saved.commerce.receipts[0].quantity,3);assert.ok(saved.inventory.every(i=>i.quantity===1&&i.usage.learns.length===1));assert.equal(await page.evaluate(()=>window.calls.length),1);
  await page.evaluate(async()=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',3,'normal');await window.host.eventSource.emit('GENERATION_ENDED');});
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),60);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.receipts.length),1);assert.equal(await page.evaluate(()=>window.calls.length),1);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: when-to-press guidance, one explicit repair request, malformed response, save rollback and manual retry, disabled double-click, earlier named books, 15/20/10 unit prices and 40 total, complete learning metadata, no payment or teaching during repair, saved reload, one confirmed purchase and receipt, no duplicate payment or overflow`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
