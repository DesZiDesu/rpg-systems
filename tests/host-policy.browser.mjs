import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const mode of ['loader','direct']){
  const page=await browser.newPage(),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const url=new URL(route.request().url());requests.push(url.pathname);if(url.pathname==='/'){await route.fulfill({contentType:'text/html',body:`<html><head></head><body><div id="extensions_settings2"></div><script>window.hostCalls=0;window.SillyTavern={getContext(){window.hostCalls++;throw Error('Blocked runtime accessed host data')}};window.toastr={warning(){}};</script><script type="module" src="${base}${mode==='loader'?'loader.js':'index.js'}"></script></body></html>`});return;}if(!url.pathname.startsWith(base)||url.pathname.includes('..')){await route.fulfill({status:403,body:'Unexpected request'});return;}const file=url.pathname.slice(base.length);try{await route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'text/plain',body:await readFile(new URL(file,root),'utf8')});}catch{await route.fulfill({status:404,body:'Not found'});}});
  await page.goto('https://chat.rolezy.com/');await page.waitForSelector('#roleforge-host-blocked');await page.waitForLoadState('networkidle');
  assert.match(await page.locator('#roleforge-host-blocked').innerText(),/ไม่รองรับการใช้งานบนเซิร์ฟเวอร์สาธารณะ/);assert.equal(await page.evaluate(()=>window.hostCalls),0);assert.equal(await page.locator('#tretaresia-rpg-settings,#tretaresia-rpg-overlay,.rf-composer-dock').count(),0);assert.equal(requests.some(p=>p.startsWith('/api/')),false);assert.equal(requests.some(p=>p.endsWith('.css')),false);
  if(mode==='loader'){assert.equal(requests.some(p=>p.endsWith('index.js')||p.endsWith('manifest.json')),false);await page.evaluate(async base=>(await import(base+'loader.js')).onUpdate(),base);assert.equal(requests.some(p=>p.endsWith('manifest.json')),false);}else{await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor([],0,()=>{}));assert.equal(await page.evaluate(()=>window.hostCalls),0);}
  assert.deepEqual(errors,[]);console.log(`PASS blocked host: ${mode} entry and update hook cannot initialize UI, styles, host reads or API calls`);await page.close();
 }
}finally{await browser?.close();}
