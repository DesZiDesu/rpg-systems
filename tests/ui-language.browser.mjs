// Full production startup in a minimal SillyTavern host, not extracted functions.
// Optional: CHROMIUM_EXECUTABLE=/path/to/chromium node tests/startup.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const root = new URL('../', import.meta.url);
const base = '/scripts/extensions/third-party/rpg-systems/';
// This is the pre-0.41 bootstrap protocol: unversioned loader, fresh manifest,
// ROOT ui-polish.css, and a versioned index.js. The root path must stay valid.
const legacyLoader = `const root=new URL('./',import.meta.url);
const response=await fetch(new URL('manifest.json?legacy=1',root),{cache:'no-store'});
const {version}=await response.json();
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('ui-polish.css?v='+version,root);document.head.append(style);
await import(new URL('index.js?v='+version,root));window.TretaresiaRelease=version;`;
const fixture = legacy => `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#111;color:white}#extensionsMenu{position:fixed;inset:40px 0 auto;z-index:50;background:#111}#extensionsMenu[hidden]{display:none}.inline-drawer-content{display:block}</style>
<button id="extensionsMenuButton" aria-expanded="true">Extensions</button><div id="extensionsMenu"></div>
<div id="extensions_settings2"></div><div id="chat"></div><textarea id="send_textarea"></textarea>
<script>
const callbacks=new Map();window.menuToggles=0;
document.getElementById('extensionsMenuButton').onclick=()=>{
 window.menuToggles++;const menu=document.getElementById('extensionsMenu');menu.style.display=getComputedStyle(menu).display==='none'?'block':'none';
 document.getElementById('extensionsMenuButton').setAttribute('aria-expanded',String(menu.style.display!=='none'));
};
const eventTypes=Object.fromEntries(['CHAT_CHANGED','MESSAGE_SENT','GENERATION_STARTED','GENERATION_AFTER_COMMANDS','MESSAGE_RECEIVED','MESSAGE_SWIPED','MESSAGE_DELETED','CHARACTER_MESSAGE_RENDERED','GENERATION_ENDED','GENERATION_STOPPED','STREAM_TOKEN_RECEIVED'].map(k=>[k,k]));
window.host={extensionSettings:JSON.parse(localStorage.getItem('rf-test-settings')||'{}'),chatMetadata:JSON.parse(localStorage.getItem('rf-test-metadata')||'{}'),chat:[],characters:[{name:'World A',avatar:'world-a.png',first_mes:''},{name:'World B',avatar:'world-b.png',first_mes:''}],characterId:0,eventTypes,
 eventSource:{on(type,fn){const list=callbacks.get(type)||[];list.push(fn);callbacks.set(type,list);},emit(type,...args){for(const fn of callbacks.get(type)||[])fn(...args);}},
 getCurrentChatId:()=> 'startup-test',getRequestHeaders:()=>({'Content-Type':'application/json'}),
 saveSettingsDebounced(){localStorage.setItem('rf-test-settings',JSON.stringify(this.extensionSettings));},saveMetadata:async()=>{localStorage.setItem('rf-test-metadata',JSON.stringify(window.host.chatMetadata));},setExtensionPrompt(key,value){window.lastPrompt=value;},
 renderExtensionTemplateAsync:async(folder,name)=>{const r=await fetch('/scripts/extensions/'+folder+'/'+name+'.html');if(!r.ok)throw Error('Template '+r.status);return r.text();}};
window.SillyTavern={getContext:()=>window.host,libs:{}};
window.toastr={error:message=>console.error('TOAST: '+message),warning(){},info(){},success(){}};
</script><script type="module" src="${base}${legacy?'legacy-loader.js':'loader.js'}"></script>`;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end(fixture(url.searchParams.has('legacy')));return;}
  if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
  if(url.pathname===base+'legacy-loader.js'){res.setHeader('content-type','text/javascript');res.end(legacyLoader);return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length),data=await readFile(new URL(path,root));
  res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(data);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.TretaresiaRelease==='0.44.3');
 const settings=page.locator('#tretaresia-rpg-settings'),power=page.locator('#roleforge-power-editor');
 await settings.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 assert(!/[ก-๛]/.test(await settings.innerText()),'English settings must not contain Thai labels');
 await page.locator('#tretaresia-rpg-roleplay-language').selectOption('th');
 await page.locator('#roleforge-power-settings').evaluate(n=>n.open=true);
 await power.getByLabel('Power preset',{exact:true}).selectOption('custom');
 await power.getByRole('button',{name:'＋ Create power',exact:true}).click();
 const name=power.locator('[name=name]'),description=power.locator('[name=description]');
 await name.fill('พลังผู้ใช้');await description.fill('User prose ภาษาไทย');
 await page.locator('#tretaresia-rpg-language').selectOption('th');
 assert.equal(await name.inputValue(),'พลังผู้ใช้');assert.equal(await description.inputValue(),'User prose ภาษาไทย');
 await power.getByRole('button',{name:'บันทึกพลัง',exact:true}).waitFor();
 assert.equal(await page.locator('#tretaresia-rpg-roleplay-language').inputValue(),'th');
 const frame=page.frameLocator('#tretaresia-character-forge iframe');await frame.locator('#trapp').evaluate(()=>window.TR.skip());
 await frame.locator('#tab_t3').click();assert.equal(await frame.locator('#tab_t3').innerText(),'พลัง');
 assert(!/[a-z]/i.test((await frame.locator('#powerGrid').innerText()).replaceAll('RoleForge','')),'Thai empty-state text');
 await frame.locator('#tab_t1').click();await frame.locator('#fName').fill('Name ชื่อผู้เล่น');
 await page.locator('#tretaresia-rpg-language').selectOption('en');
 await power.getByRole('button',{name:'Save power',exact:true}).click();
 assert.equal(await power.locator('h4').innerText(),'พลังผู้ใช้');
 assert.equal(await frame.locator('#fName').inputValue(),'Name ชื่อผู้เล่น');
 assert.equal(await page.locator('#tretaresia-rpg-roleplay-language').inputValue(),'th');
 await page.locator('#tretaresia-rpg-wand-launcher').click();
 for(let i=0;i<14;i++){
  const text=await page.locator('[data-panel].is-active').innerText();
  assert(!/[ก-๛]/.test(text.replaceAll('พลังผู้ใช้','').replaceAll('User prose ภาษาไทย','')),`English RPG tab ${i}`);
  await page.locator('[data-action=tab-next]').click();
 }
 await page.locator('#tretaresia-rpg-close').click();
 await page.locator('[data-trpg-open]').first().click();await page.locator('[data-new]').click();
 assert(!/[ก-๛]/.test(await page.locator('.trpg-manager').innerText()),'English NPC editor');
 await page.locator('.trpg-manager [data-close]').click();
 await page.locator('#tretaresia-rpg-language').selectOption('th');
 await page.locator('[data-trpg-open]').first().click();await page.locator('[data-new]').click();
 await page.locator('.trpg-manager').getByRole('button',{name:'บันทึกตัวละคร',exact:true}).waitFor();
 const labels=await page.locator('.trpg-manager label,.trpg-manager summary').allTextContents();
 assert(!labels.some(x=>/NPC Management|ATTRIBUTES|CHAT APPEARANCE|Chronicler|Classic|Medallion|Emblem/.test(x)),'Thai NPC editor');
 await page.locator('.trpg-manager [data-close]').click();
 await page.reload();await page.waitForFunction(()=>window.TretaresiaRelease==='0.44.3');
 assert.equal(await page.locator('#tretaresia-rpg-language').inputValue(),'th');
 assert.equal(await page.locator('#tretaresia-rpg-roleplay-language').inputValue(),'th');
 assert.deepEqual(errors,[]);console.log('PASS interface isolation, both languages, unsaved values, story language, Forge, all tabs, NPC editor and reload at '+width+'px');
 await page.close();
 }
}finally{await browser?.close();server.close();}
