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
  page.setDefaultTimeout(10000);page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER',e.message);});page.on('dialog',d=>d.accept());
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.TretaresiaRelease==='0.44.4');
  const frame=page.frameLocator('#tretaresia-character-forge iframe');await frame.locator('#trapp').waitFor();
  await frame.locator('#trapp').evaluate(()=>window.TR.skip());
  assert.equal(await page.locator('#tretaresia-rpg-wand-launcher').innerText(),'RoleForge');
  await frame.locator('#tab_t3').click();assert.equal(await frame.locator('#managePowers').count(),0);
  await page.locator('#roleforge-power-settings summary').click();
  const panel=page.locator('#roleforge-power-editor'),values=page.locator('[data-panel=techniques]');await panel.locator('.rf-power-workspace').waitFor();
  assert.equal(await panel.getByLabel('Power preset',{exact:true}).inputValue(),'tretaresia');
  await panel.getByLabel('Power preset',{exact:true}).selectOption('custom');
  await panel.getByText('Custom is empty',{exact:false}).waitFor();assert.equal(await panel.locator('.tretaresia-proficiency-card').count(),0);
  assert.equal(await frame.locator('#powerGrid .pcard').count(),0);await frame.locator('[onclick=\"TR.rnd()\"]').click();assert.equal(await frame.locator('#powerGrid .pcard').count(),0);
  async function create(name,type,initial,max){
   await panel.getByRole('button',{name:'＋ Create power',exact:true}).click();const form=panel.locator('.rf-power-editor');
   await form.locator('[name=name]').fill(name);await form.locator('[name=description]').fill('World-specific power');
   await form.locator('[name=type]').selectOption(type);await form.locator('[name=max]').fill(String(max));await form.locator('[name=initial]').fill(String(initial));
   await form.getByRole('button',{name:'Save power',exact:true}).click();await panel.locator('.rf-power-card').filter({has:page.getByRole('heading',{name,exact:true})}).waitFor();
  }
  await create('จักระ','resource',20,500);await create('Spirit Sight','toggle',0,1);
  const chakra=panel.locator('.rf-power-card').filter({has:page.getByRole('heading',{name:'จักระ',exact:true})});
  const id=await chakra.getAttribute('data-power-id');
  assert.equal(await panel.getByLabel('จักระ value',{exact:true}).count(),0);
  await page.locator('#tretaresia-rpg-wand-launcher').click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Next module',exact:true}).click();
  assert.equal(await values.getByLabel('Power preset',{exact:true}).count(),0);assert.equal(await values.getByRole('button',{name:'Edit',exact:true}).count(),0);
  await values.getByLabel('จักระ value',{exact:true}).fill('80');await values.getByLabel('จักระ value',{exact:true}).press('Tab');
  await page.waitForFunction(id=>window.host.chatMetadata.tretaresia_rpg_state?.customPowers?.[id]===80,id);
  await page.locator('#tretaresia-rpg-close').click();
  await chakra.getByRole('button',{name:'Edit',exact:true}).click();await panel.locator('.rf-power-editor [name=name]').fill('Chakra');await panel.getByRole('button',{name:'Save power',exact:true}).click();
  assert.equal(await page.evaluate(id=>window.host.chatMetadata.tretaresia_rpg_state.customPowers[id],id),80);assert.equal(await panel.locator('.rf-power-card').first().getAttribute('data-power-id'),id);
  if(process.env.RF_SCREENSHOT)await page.screenshot({path:process.env.RF_SCREENSHOT+'-'+width+'.png'});
  const downloadEvent=page.waitForEvent('download');await panel.getByRole('button',{name:'Export JSON',exact:true}).click();const download=await downloadEvent;
  const data=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(data.preset.definitions.length,2);assert.equal(data.preset.definitions[0].id,id);assert.equal(data.preset.definitions[0].initial,20);
  await panel.locator('.rf-power-card').first().getByRole('button',{name:'Remove',exact:true}).click();assert.equal(await panel.locator('.rf-power-card').count(),1);
  await panel.getByLabel('Import Power Preset',{exact:true}).setInputFiles({name:'preset.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await panel.getByRole('heading',{name:'Chakra',exact:true}).waitFor();assert.equal(await page.evaluate(id=>window.host.chatMetadata.tretaresia_rpg_state.customPowers[id],id),80);
  assert.equal(await frame.locator('#powerGrid .pcard').count(),2);assert.equal(await frame.locator('#powerGrid').innerText(),'Chakra\nWorld-specific power\nSpirit Sight\nWorld-specific power');
  assert(!/TRETARESIA|Tretaresia|เตรทาเรเซีย/.test(await frame.locator('body').innerText()));
  await frame.getByText('Chakra',{exact:true}).click();await frame.locator('#tab_t1').click();await frame.locator('#fName').fill('Rin');
  await page.waitForFunction(id=>window.host.chatMetadata.tretaresia_rpg_character_creation?.draft?.power.includes(id),id);
  await page.reload();await page.waitForFunction(()=>window.TretaresiaRelease==='0.44.4');
  await page.locator('#tretaresia-rpg-wand-launcher').click();for(let i=0;i<4;i++)await page.getByRole('button',{name:'Next module',exact:true}).click();
  assert.equal(await values.getByLabel('Chakra value',{exact:true}).inputValue(),'80');
  await page.locator('#tretaresia-rpg-close').click();await page.locator('#roleforge-power-settings summary').click();
  await page.evaluate(()=>{window.host.characterId=1;window.host.chatMetadata={};window.host.eventSource.emit('CHAT_CHANGED');});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Power preset"]')?.value==='tretaresia');
  await panel.getByLabel('Power preset',{exact:true}).selectOption('custom');await panel.getByText('Custom is empty',{exact:false}).waitFor();
  assert.equal(await panel.locator('.rf-power-card').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS RoleForge custom creation/edit/delete/import/export, Forge hydration, values, reload, card isolation at '+width+'px');
  await page.close();
 }
}finally{await browser?.close();server.close();}
