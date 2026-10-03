import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/png');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/main-chat-systems.html`;
const artifacts='/workspace/artifacts/roleforge-rebuild';await mkdir(artifacts,{recursive:true});
const sections=['scene','buy','sell','auction','missions','groups','invitations','records','resources','summary'];
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='warning')console.log(msg.text());});await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.goto(url);await page.waitForFunction(()=>window.galleryReady);
  for(const section of sections){
   await page.evaluate(section=>window.galleryShow(section),section);await page.waitForTimeout(400);
   assert.equal(await page.evaluate(()=>window.gallerySection),section);
   if(['buy','sell','auction'].includes(section)){await page.locator('.rf-commerce-composer').waitFor();if(section==='auction'){await page.locator('.rf-commerce-summary').click();await page.locator('[data-commerce-action="join"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer[aria-busy="true"]'));assert.equal(await page.locator('.rf-commerce-error').count(),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions[0].revision),1);await page.locator('.rf-commerce-summary').click();}await page.screenshot({path:`${artifacts}/${section}-collapsed-${width}.png`});await page.locator('.rf-commerce-summary').click();}
   if(section==='records'){await page.locator('.trpg-story-events').waitFor();await page.locator('.trpg-story-events>summary').click();}
   if(section==='missions')await page.locator('.trpg-mission-board').waitFor();
   if(section==='groups')await page.locator('.trpg-group-board').waitFor();
   if(section==='resources')await page.locator('.trpg-resource-events').waitFor();
   if(section==='summary')await page.locator('.rf-memory-composer-status').waitFor();
   const focus={records:'.trpg-story-events',missions:'.trpg-mission-board',groups:'.trpg-group-board',invitations:'.gallery-extra',resources:'.trpg-resource-events'}[section];if(focus){await page.locator(focus).waitFor();await page.locator(focus).evaluate(el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(200);}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${section} overflows at ${width}`);
   await page.screenshot({path:`${artifacts}/${section}-${width}.png`});console.log(`PASS gallery ${section} at ${width}px`);
  }
  // Both native-flow and fixed chatbars must coexist with Summary without
  // overlapping controls or two observers endlessly swapping the bars.
  await page.evaluate(async()=>{await window.galleryShow('buy');const {createMemoryComposerStatus}=await import('../../src/memory-composer-status.js');window.coexist=createMemoryComposerStatus({language:()=> 'th'});window.coexist.update({chatId:'coexist',enabled:true,settings:{language:'th',enableMemorySummaries:true},job:{status:'summarizing',startedAt:new Date().toISOString(),totalMessages:20,processedMessages:10}});});
  await page.waitForTimeout(550);
  assert.equal(await page.evaluate(()=>{const a=document.querySelector('.rf-commerce-composer').getBoundingClientRect(),b=document.querySelector('.rf-memory-composer-status').getBoundingClientRect();return a.bottom<=b.top;}),true,'fixed bars do not overlap');
  await page.evaluate(()=>{const form=document.querySelector('#send_form'),parent=document.createElement('div');parent.id='form_sheld';parent.style.cssText='white-space:nowrap;margin:auto;width:min(760px,100%)';form.before(parent);parent.append(form);Object.assign(form.style,{position:'static',transform:'none',left:'auto'});});await page.waitForTimeout(550);
  assert.equal(await page.evaluate(()=>{const form=document.querySelector('#send_form'),memory=form.previousElementSibling,commerce=memory.previousElementSibling;return memory.classList.contains('rf-memory-composer-status')&&commerce.classList.contains('rf-commerce-composer')&&!commerce.classList.contains('is-fixed')&&commerce.getBoundingClientRect().bottom<=memory.getBoundingClientRect().top;}),true,'native-flow bars have stable order');
  await page.evaluate(()=>window.coexist.destroy());console.log(`PASS composer / Summary coexistence in fixed and native flow at ${width}px`);
  assert.deepEqual(errors,[]);await page.close();
 }
 // A portable visual review file with embedded screenshots; no local server needed.
 const labels=['Scene / NPC','Buy / negotiate','Sell / negotiate','Auction / NPC budgets','Mission board','Party / guild board','Invitations','Story / appointments / objectives','Wallet / inventory','Memory summary'];
 const cards=await Promise.all(sections.map(async(section,index)=>`<section><h2>${labels[index]}</h2><img alt="${labels[index]}" src="data:image/png;base64,${(await readFile(`${artifacts}/${section}-390.png`)).toString('base64')}"></section>`));
 const html=`<!doctype html><html><meta charset="utf-8"><title>RoleForge Main Chat preview</title><style>body{background:#10100d;color:#dbc994;font:16px system-ui;margin:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,390px));gap:20px;justify-content:center}h1{font-size:22px;text-align:center}h2{font-size:15px;font-weight:500}img{width:100%;border:1px solid #c3a86133;border-radius:10px}section{break-inside:avoid}@media print{body{background:#fff;color:#222}main{display:block}section{page-break-after:always;width:350px;margin:auto}img{width:350px}}</style><h1>RoleForge · Main Chat UI</h1><p style="text-align:center">Production UI with simulated data and NPC replies · No live API calls in this preview</p><main>${cards.join('')}</main></html>`;
 await writeFile(`${artifacts}/all-systems.html`,html);
 const pdf=await browser.newPage();await pdf.setContent(html);await pdf.pdf({path:`${artifacts}/all-systems.pdf`,format:'A4',printBackground:true,margin:{top:'8mm',bottom:'8mm'}});await pdf.close();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
