// Actual loader/settings/renderer: presentation priority, persistence and safe status.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/presentation-settings.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){response.setHeader('content-type','application/json');response.end('[]');return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){response.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length);let body=await readFile(new URL(path,root));
  if(path==='docs/previews/h-stats-fixture.js')body=body.toString().replace("'MESSAGE_DELETED',","'MESSAGE_DELETED','MESSAGE_EDITED','MESSAGE_UPDATED',");
  response.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');response.end(body);
 }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const artifacts=process.env.PRESENTATION_SCREENSHOT_DIR;
if(artifacts)await mkdir(artifacts,{recursive:true});
const oldBody='PRIVATE_OLD_BODY: They leave the city through its gate.';
const taggedBody='<tr-header name="Cora"/><tr-narrative>PRIVATE_NEW_BODY: She waits beside the river.</tr-narrative><tr-dialogue name="Cora">Welcome back.</tr-dialogue>';
async function ready(page){
 await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));
 await page.evaluate(()=>{
  document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
  document.querySelector('#chat').style.cssText='display:block;padding:12px;box-sizing:border-box;font-size:16px;line-height:1.5';
  document.querySelector('#extensions_settings2').style.display='block';
  window.presentationPrompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.presentationPrompts.set(key,value);
 });
}
function control(page,key){return page.locator(`#tretaresia-rpg-settings [data-presentation-setting="${key}"]`);}
async function toggle(page,key,value){
 if(key==='chatRegexMode')await control(page,key).selectOption(value);
 else if(value)await control(page,key).check();else await control(page,key).uncheck();
 await page.waitForFunction(({key,value})=>window.host.extensionSettings.tretaresia_rpg[key]===value,{key,value});
 await page.waitForTimeout(180);
}
async function reply(page,source,{rich=false}={}){
 const id=await page.evaluate(({source,rich})=>{
  if(!window.host.chat.length)window.host.chat.push({is_user:true,name:'Nova',mes:'Continue the story.'});
  const id=window.host.chat.length;window.host.chat.push({is_user:false,name:'Narrator',mes:source,swipes:[source],swipe_id:0});
  const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);
  const body=document.createElement('div');body.className='mes_text';row.append(body);document.querySelector('#chat').append(row);
  if(rich){
   body.innerHTML='<section class="custom-display-regex" data-native-widget="true"><p>Display regex changed this reply.</p><button type="button">Native action</button></section>';
   window.presentationNative=body.firstChild;window.presentationNativeClicks=0;window.presentationNative.querySelector('button').addEventListener('click',()=>window.presentationNativeClicks++);
  }else body.textContent=source;
  return id;
 },{source,rich});
 await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id),id);
 await page.waitForTimeout(180);return id;
}
async function status(page,pattern){
 const text=await page.locator('.trpg-presentation-status').innerText();assert.match(text,pattern);
 assert.doesNotMatch(text,/PRIVATE_OLD_BODY|PRIVATE_NEW_BODY|Display regex changed this reply|Welcome back/,'status never exposes reply contents');return text;
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of (process.env.PRESENTATION_WIDTHS||'320,390,1280').split(',').map(Number)){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{
   const key='roleforge-hstats-preview-settings';
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({tretaresia_rpg:{language:'en',autoTrack:false,injectState:false,autoContinuity:false,chatPresentation:false,showSceneTracker:false,memoryAutoSummary:false}}));
  });
  await page.goto(url);await ready(page);
  assert.equal(await page.locator('[data-presentation-setting]').count(),7);
  assert.equal(await control(page,'chatRegexMode').inputValue(),'shared','missing preference composes with native Regex');
  assert.match(await page.locator('.trpg-presentation-help').innerText(),/Shared mode keeps Regex UI/);
  await status(page,/RoleForge \d+\.\d+\.\d+.*is off.*No character reply yet/);
  await toggle(page,'chatPresentation',true);await status(page,/RoleForge \+ Regex.*Shared.*No character reply yet/);
  const oldId=await reply(page,oldBody);await status(page,/Latest reply has no readable presentation blocks/);
  assert.equal(await page.locator(`[mesid="${oldId}"] .trpg-header,[mesid="${oldId}"] .trpg-narrative`).count(),0,'old untagged replies are never inferred or rewritten');
  assert.equal(await page.locator(`[mesid="${oldId}"] .mes_text`).innerText(),oldBody);
  const id=await reply(page,taggedBody,{rich:true});
  await page.locator(`[mesid="${id}"] .trpg-header`).waitFor();
  await status(page,/RoleForge \+ Regex.*Shared.*Latest reply has presentation blocks/);
  assert.equal(await page.locator(`[mesid="${id}"] .trpg-narrative`).count(),0,'whole-message Regex remains intact without duplicating the original story');
  assert.equal(await page.evaluate(()=>document.querySelector('.custom-display-regex')===window.presentationNative),true);
  await windowPromptCheck(page,true);
  await toggle(page,'chatRegexMode','native');
  await status(page,/Preserve regex \/ SillyTavern formatting.*Latest reply has presentation blocks/);
  assert.equal(await page.locator(`[mesid="${id}"] .trpg-header`).count(),0,'explicit compatibility keeps conflicting native presentation');
  assert.equal(await page.evaluate(()=>document.querySelector('.custom-display-regex')===window.presentationNative),true,'native DOM reference restored');
  await page.locator('.custom-display-regex button').click();
  await page.waitForFunction(()=>window.presentationNativeClicks===1,null,{timeout:5000});
  assert.equal(await page.evaluate(()=>window.presentationNativeClicks),1);
  await toggle(page,'chatRegexMode','roleforge');await page.locator(`[mesid="${id}"] .trpg-header`).waitFor();
  await toggle(page,'chatPresentation',false);await status(page,/is off.*Latest reply has presentation blocks/);
  assert.equal(await page.locator(`[mesid="${id}"] .trpg-header`).count(),0);await windowPromptCheck(page,false);
  assert.equal(await page.evaluate(()=>document.querySelector('.custom-display-regex')===window.presentationNative),true);
  await toggle(page,'chatPresentation',true);await toggle(page,'chatRegexMode','native');await windowPromptCheck(page,true);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('roleforge-hstats-preview-settings')).tretaresia_rpg);
  assert.equal(saved.preserveNativeChat,true);assert.equal(saved.chatPresentation,true);
  await page.reload();await ready(page);
  assert.equal(await control(page,'chatRegexMode').inputValue(),'native','explicit compatibility preference persists across reload');
  // This isolated fixture intentionally forces presentation OFF on startup.
  // Re-enable via the actual checkbox; production persistence above was saved.
  await toggle(page,'chatPresentation',true);await status(page,/Preserve regex \/ SillyTavern formatting.*No character reply yet/);
  await reply(page,oldBody);await status(page,/has no readable presentation blocks/);
  await page.evaluate(async()=>{window.host.chat=[];document.querySelector('#chat').replaceChildren();await window.hStatsPreview.switchChat('presentation-new-chat');});
  await status(page,/No character reply yet/);
  await reply(page,taggedBody);await status(page,/Latest reply has presentation blocks/);
  await toggle(page,'chatRegexMode','roleforge');
  await page.locator('#tretaresia-rpg-language').selectOption('th');
  await status(page,/รูปแบบ RoleForge เดิม.*คำตอบล่าสุดมีบล็อกจัดรูปแบบ/);
  assert.match(await control(page,'chatRegexMode').locator('..').innerText(),/การแสดงแชทร่วมกับ Regex \/ HTML/);
  assert.match(await page.locator('.trpg-presentation-help').innerText(),/โหมดแสดงร่วมกันเก็บ UI และปุ่มของ Regex/);
  assert.equal(await page.locator('[data-presentation-setting]').count(),7,'language refresh does not duplicate presentation controls');
  if(artifacts){await page.locator('.trpg-settings').screenshot({path:`${artifacts}/presentation-settings-${width}.png`});}
  const bounds=await page.locator('.trpg-settings').evaluate(group=>({left:group.getBoundingClientRect().left,right:group.getBoundingClientRect().right,width:innerWidth,scroll:group.scrollWidth,client:group.clientWidth}));
  assert(bounds.left>=-1&&bounds.right<=bounds.width+1&&bounds.scroll<=bounds.client+1,`presentation settings/status fit the viewport: ${JSON.stringify(bounds)}`);
  assert.deepEqual(errors,[]);console.log(`PASS presentation default priority, live settings, persistence, safe status, tagless/tagged replies and chat switch at ${width}px`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
async function windowPromptCheck(page,enabled){
 await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor());
 const prompt=await page.evaluate(()=>[...window.presentationPrompts.values()].join('\n'));
 if(enabled)assert.match(prompt,/ROLEFORGE CHAT PRESENTATION/);else assert.doesNotMatch(prompt,/ROLEFORGE CHAT PRESENTATION/);
}
