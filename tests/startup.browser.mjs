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
window.host={extensionSettings:{},chatMetadata:{},chat:[],characters:[],characterId:null,eventTypes,
 eventSource:{on(type,fn){const list=callbacks.get(type)||[];list.push(fn);callbacks.set(type,list);},emit(type,...args){for(const fn of callbacks.get(type)||[])fn(...args);}},
 getCurrentChatId:()=> 'startup-test',getRequestHeaders:()=>({'Content-Type':'application/json'}),
 saveSettingsDebounced(){},saveMetadata:async()=>{},setExtensionPrompt(){},
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
 for(const legacy of [true,false])for(const mobile of [320,390,false]){
  const page=await browser.newPage({viewport:mobile?{width:mobile,height:844}:{width:1440,height:1000},isMobile:Boolean(mobile),hasTouch:Boolean(mobile),reducedMotion:'reduce'});
  const errors=[],missing=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)missing.push(response.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}/?${legacy?'legacy=1':''}`);
  await page.waitForFunction(()=>window.TretaresiaRelease&&document.getElementById('tretaresia-rpg-settings'));
  assert.equal(await page.locator('#tretaresia-rpg-settings .tretaresia-settings-grid').evaluate(node=>getComputedStyle(node).display),'grid');
  await page.locator('#tretaresia-rpg-wand-launcher').click();
  await page.waitForFunction(()=>document.getElementById('tretaresia-rpg-overlay')?.classList.contains('is-ready'));
  assert.equal(await page.locator('#extensionsMenu').evaluate(node=>getComputedStyle(node).display),'none');
  const overlay=page.locator('#tretaresia-rpg-overlay');
  assert.equal(await overlay.evaluate(node=>getComputedStyle(node).position),'fixed');
  const box=await overlay.boundingBox();assert.ok(box&&box.width>300&&box.height>600);
  if(mobile)await page.addStyleTag({content:'html{font-size:32px}'});
  const checkWidth=async()=>{
   const result=await overlay.evaluate(node=>{const close=document.getElementById('tretaresia-rpg-close').getBoundingClientRect(),shell=node.querySelector('.tretaresia-app-shell');return {closeRight:close.right,closeLeft:close.left,width:innerWidth,shell:shell.getBoundingClientRect().width};});
   assert.ok(result.closeLeft>=0&&result.closeRight<=result.width,JSON.stringify(result));
   assert.ok(result.shell<=result.width,JSON.stringify(result));
  };
  await checkWidth();
  for(const tab of await page.locator('#tretaresia-rpg-overlay [data-tab]').evaluateAll(nodes=>nodes.map(node=>node.dataset.tab))){
   await page.locator(`#tretaresia-rpg-overlay [data-tab="${tab}"]`).evaluate(node=>node.click());
   assert.ok(await page.locator(`#tretaresia-rpg-overlay [data-panel="${tab}"]`).evaluate(node=>node.classList.contains('is-active')&&node.childElementCount>0),tab);
   await checkWidth();
  }
  await page.locator('#tretaresia-rpg-close').click();
  await page.locator('#extensionsMenuButton').click();
  await page.locator('#tretaresia-npc-wand-launcher').click();
  await page.waitForSelector('.trpg-manager[open]');
  assert.ok((await page.locator('.trpg-manager').evaluate(node=>getComputedStyle(node).borderTopColor)).includes('156, 128, 66'));
  assert.deepEqual(missing,[],`missing assets (${legacy},${mobile})`);
  assert.deepEqual(errors,[],`runtime errors (${legacy},${mobile})`);
  console.log(`PASS full startup, settings, all tabs, NPC Manager: ${legacy?'cached legacy':'current'} loader / ${mobile?'mobile':'desktop'}`);
  await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
