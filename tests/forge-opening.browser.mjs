// Production loader and Character Forge iframe with a controlled strict proxy.
// No paid model calls, secrets or connection changes are used by this fixture.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.FORGE_OPENING_SCREENSHOT_DIR||'/workspace/artifacts/forge-opening-proxy';
await mkdir(artifacts,{recursive:true});
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--SmartThemeBodyColor:#ddd;--SmartThemeBlurTintColor:#202020;--SmartThemeBorderColor:#555}
*{box-sizing:border-box}body{margin:0;background:#202020;color:#ddd;font:14px system-ui;height:100dvh;display:flex;flex-direction:column}
header{height:48px;flex-shrink:0;padding:12px}#chat{flex:1;min-height:0;overflow:auto;padding:0;display:flex;flex-direction:column}
#send_form{flex-shrink:0;padding:8px;height:96px}#send_textarea{width:100%;height:70px;background:#222;border:1px solid #555;color:#ddd;border-radius:12px}
#extensions_settings2,#extensionsMenu,#extensionsMenuButton{display:none}
.text_pole,.menu_button{background:#222;border:1px solid #555;color:#ddd}
</style><header>SillyTavern · Character Forge</header><button id="extensionsMenuButton"></button><div id="extensionsMenu"></div><div id="extensions_settings2"></div><div id="chat"></div><form id="send_form"><textarea id="send_textarea" placeholder="Type a message"></textarea></form>
<script>
const callbacks=new Map(),eventTypes=Object.fromEntries(['CHAT_CHANGED','MESSAGE_SENT','GENERATION_STARTED','GENERATION_AFTER_COMMANDS','MESSAGE_RECEIVED','MESSAGE_SWIPED','MESSAGE_DELETED','CHARACTER_MESSAGE_RENDERED','GENERATION_ENDED','GENERATION_STOPPED','STREAM_TOKEN_RECEIVED','CHAT_COMPLETION_SETTINGS_READY'].map(k=>[k,k]));
window.prompts={};window.requests=[];window.generationCount=0;window.proxyMode='fail';
window.host={extensionSettings:{tretaresia_rpg:{language:'en',autoTrack:false,injectState:true,autoContinuity:false,chatPresentation:false,enableMemorySummaries:false}},chatMetadata:{},chat:[],characters:[{name:'Forge',avatar:'forge.png',first_mes:'',data:{extensions:{}}}],characterId:0,eventTypes,
 eventSource:{on(t,f){const list=callbacks.get(t)||[];list.push(f);callbacks.set(t,list)},async emit(t,...args){for(const f of callbacks.get(t)||[])await f(...args)}},
 getCurrentChatId:()=> 'forge-proxy-test',getRequestHeaders:()=>({'Content-Type':'application/json'}),saveSettingsDebounced(){},saveMetadata:async()=>{},
 setExtensionPrompt(...args){window.prompts[args[0]]=args},
 async generate(type,options){
  window.generationCount++;window.generateOptions={type,options};
  await this.eventSource.emit(eventTypes.GENERATION_STARTED,type);
  const messages=[{role:'system',content:'Default host instruction'},...Object.values(window.prompts).filter(args=>args[1]).map(args=>({role:args[5]===1?'user':'system',content:args[1]})),{role:'assistant',content:''},{role:'system',content:'Native preset suffix'}];
  const payload={type,model:'proxy-model-3.8',messages,chat_completion_source:'custom',temperature:.7,max_tokens:2048,stream:false,reasoning_effort:'medium'};
  await this.eventSource.emit(eventTypes.CHAT_COMPLETION_SETTINGS_READY,payload);
  window.requests.push(structuredClone(payload));
  if(payload.messages.at(-1)?.role!=='user'||!payload.messages.some(m=>m.role==='user'&&m.content.trim())||payload.messages.some(m=>!m.content.trim()))throw Error('Strict proxy rejected the first-turn message shape');
  if(window.proxyMode==='fail')throw Error('Bad Request');
  if(window.proxyMode==='hold')await new Promise(resolve=>window.finishOpening=resolve);
  this.chat.push({is_user:false,mes:'The royal palace doors open before Jino.'});
 },
 renderExtensionTemplateAsync:async(folder,name)=>(await fetch('/scripts/extensions/'+folder+'/'+name+'.html')).text()};
window.SillyTavern={getContext:()=>window.host,libs:{}};window.toastr={error:console.error,warning(){},info(){},success(){}};
</script><script type="module" src="${base}loader.js"></script>`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end(fixture);return;}
  if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length);res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':'text/javascript');res.end(await readFile(new URL(path,root)));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:width<600,reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(12000);
  page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#tretaresia-character-forge iframe').waitFor();
  const f=page.frameLocator('#tretaresia-character-forge iframe');await f.locator('#trSkip').evaluate(n=>n.click());await f.locator('#trapp:not(.loading)').waitFor();
  await f.locator('#fName').fill('Jino');await f.locator('#tab_t5').click();await f.locator('#fScene').fill('ปี 1042 ณ เมืองอาสีรา เข้าพบกษัตริย์ที่วังหลวง');
  await f.locator('#trapp').evaluate(()=>{window.TR.send();window.TR.send();});
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_character_creation?.phase==='failed');
  await f.locator('#trStatus').filter({hasText:'HTTP 400'}).waitFor();
  assert.match(await f.locator('#trStatus').textContent(),/proxy-model-3\.8/);assert.match(await f.locator('#trStatus').textContent(),/draft is saved/);
  assert.equal(await f.locator('#fName').inputValue(),'Jino');assert.match(await f.locator('#fScene').inputValue(),/1042/);
  assert.equal(await f.locator('.foot .btn.prime').getAttribute('aria-disabled'),'false');
  assert.equal(await f.locator('#trSnd').evaluate(n=>n.classList.contains('on')),false);
  const failed=await page.evaluate(()=>({count:window.generationCount,session:window.host.chatMetadata.tretaresia_rpg_character_creation,prompt:window.prompts.tretaresia_rpg_forge_opening,chat:window.host.chat}));
  assert.equal(failed.count,1,'no automatic retries or double-click requests');assert.equal(failed.session.errorDetails.status,400);assert.equal(failed.prompt[1],'');assert.deepEqual(failed.chat,[]);
  const fit=await f.locator('#trapp').evaluate(n=>{n.scrollTop=n.scrollHeight;return {width:n.clientWidth,scrollWidth:n.scrollWidth,status:getComputedStyle(document.getElementById('trStatus')).whiteSpace}});
  assert.ok(fit.scrollWidth<=fit.width+1,JSON.stringify(fit));assert.equal(fit.status,'pre-line');
  if(width!==320)await page.screenshot({path:`${artifacts}/opening-error-${width}.png`});
  await page.evaluate(()=>window.proxyMode='hold');
  await f.locator('#trapp').evaluate(()=>{window.TR.send();window.TR.send();});
  await page.waitForFunction(()=>window.requests.length===2&&typeof window.finishOpening==='function');
  assert.equal(await page.evaluate(()=>window.generationCount),2);
  // The same native hook must remain inert for quiet background requests.
  const quietUnchanged=await page.evaluate(async()=>{const payload={type:'quiet',model:'background',messages:[{role:'system',content:'Summarize'}]},before=JSON.stringify(payload);await window.host.eventSource.emit('CHAT_COMPLETION_SETTINGS_READY',payload);return before===JSON.stringify(payload)});
  assert.equal(quietUnchanged,true);
  await page.evaluate(()=>window.finishOpening());
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_character_creation?.phase==='completed');
  await page.locator('#tretaresia-character-forge').waitFor({state:'detached'});
  const finished=await page.evaluate(()=>({count:window.generationCount,session:window.host.chatMetadata.tretaresia_rpg_character_creation,prompt:window.prompts.tretaresia_rpg_forge_opening,chat:window.host.chat,requests:window.requests,options:window.generateOptions}));
  assert.equal(finished.count,2);assert.equal(finished.chat.length,1);assert.equal(finished.chat.some(m=>m.is_user),false);assert.equal(finished.prompt[1],'');assert.equal('errorDetails' in finished.session,false);
  assert.deepEqual(finished.options,{type:'normal',options:{automatic_trigger:true}});
  for(const request of finished.requests){
   assert.equal(request.model,'proxy-model-3.8');assert.equal(request.temperature,.7);assert.equal(request.max_tokens,2048);assert.equal(request.reasoning_effort,'medium');
   assert.equal(request.messages.at(-1).role,'user');assert.match(request.messages.at(-1).content,/first RoleForge/);
   assert.equal(request.messages.filter(m=>m.role==='user').length,1);assert.equal(request.messages.some(m=>!m.content.trim()),false);
   assert.ok(request.messages.some(m=>m.content.includes('Native preset suffix')));assert.ok(request.messages.some(m=>m.content.includes('1042')));
  }
  assert.equal(await page.evaluate(async()=>{const payload={type:'normal',messages:[{role:'user',content:'A normal later player turn'},{role:'assistant',content:'Intentional prefill'}]},before=JSON.stringify(payload);await window.host.eventSource.emit('CHAT_COMPLETION_SETTINGS_READY',payload);return before===JSON.stringify(payload)}),true);
  assert.deepEqual(errors,[]);await page.close();console.log(`Forge proxy ${width}px: request hook, saved draft, explicit retry, cleanup, no duplicate turns and unchanged model settings passed`);
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
