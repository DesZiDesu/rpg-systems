// Regression for DOM.append(null) leaking a hidden commerce notice into NPC prose.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url);
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><meta charset="utf-8"><div id="chat"></div>');return;}
 if(!path.startsWith('/src/')||path.includes('..'))throw Error('Not found');
 res.setHeader('content-type','text/javascript');res.end(await readFile(new URL(path.slice(1),root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1280])for(const presentation of [true,false]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async presentation=>{
   const {createChatPresentation}=await import('/src/npc-chat.js');
   const statuses=[{keys:['marketplace']},{keys:['auction']},{keys:['missionBoard']},{keys:['marketplace','groupBoard']},null];
   const chat=statuses.map((_,i)=>({is_user:false,name:'Rally',mes:`<tr-dialogue name="Rally">${i===4?'คำว่า null อยู่ในบทพูดนี้โดยตั้งใจ':'ลองเสนอราคาของที่ต้องการขาย'}</tr-dialogue>`}));
   document.querySelector('#chat').replaceChildren(...chat.map((message,id)=>{const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const body=document.createElement('div');body.className='mes_text';body.textContent=message.mes;row.append(body);return row;}));
   window.ui=createChatPresentation({context:()=>({chat,getCurrentChatId:()=> 'null-regression'}),settings:()=>({chatPresentation:presentation,language:'th',enableMarketplace:true,enableAuctions:true}),state:()=>({npcs:[]}),visible:v=>v,portrait:async()=>null,systemStatusForMessage:id=>statuses[id]},()=>{});
  },presentation);
  await page.locator('.trpg-system-status').first().waitFor();
  const inspect=()=>page.evaluate(()=>[...document.querySelectorAll('.mes_text')].map(host=>({plainInjected:[...host.querySelectorAll('.trpg-chat')].flatMap(root=>[...root.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent)),cards:host.querySelectorAll('.trpg-system-status').length,text:host.textContent})));
  let rows=await inspect();assert.deepEqual(rows[0].plainInjected,[],'hidden shop status must not inject literal null');assert.deepEqual(rows[1].plainInjected,[],'hidden auction status must not inject literal null');assert.equal(rows[0].cards,0);assert.equal(rows[1].cards,0);assert.equal(rows[2].cards,1);assert.equal(rows[3].cards,1);assert.match(rows[4].text,/คำว่า null อยู่ในบทพูดนี้โดยตั้งใจ/);assert.equal(await page.locator('.trpg-system-status button').count(),0);assert.doesNotMatch(rows[2].text,/เตรียมข้อความขอดูรายการ/);
  await page.evaluate(()=>window.ui.refresh());await page.waitForTimeout(150);rows=await inspect();assert.deepEqual(rows[0].plainInjected,[]);assert.equal(rows[2].cards,1);assert.deepEqual(errors,[]);
  console.log(`PASS hidden commerce notices inject no null; board notices and intentional prose retained; refresh stable at ${width}px, presentation=${presentation}`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
