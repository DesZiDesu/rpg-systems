// Optional Workshop failures must leave native RoleForge usable and retryable.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18182',out=process.env.WORKSHOP_ARTIFACTS||'/workspace/artifacts/workshop-v0.77.1';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}),report={release:'0.77.1',checks:[],errors:[]};
try{
 for(const fault of ['catalog','storage']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});let broken=true,modelCalls=0;
  await context.route('**/api/horde/**',route=>route.fulfill({json:[]}));
  await context.route('**/api/backends/chat-completions/generate',route=>{modelCalls++;return route.abort();});
  await context.route('**/src/workshop/catalog.json',route=>fault==='catalog'&&broken?route.fulfill({status:503,body:'fixture unavailable'}):route.continue());
  await context.route('**/src/workshop/worker.js?*',async route=>{
   if(fault!=='storage'||!broken)return route.continue();
   const response=await route.fetch();return route.fulfill({response,body:"indexedDB.open=()=>{throw new DOMException('Local storage blocked','SecurityError');};\n"+await response.text()});
  });
  const page=await context.newPage(),messages=[];page.on('console',message=>messages.push(message.text()));page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base+'/');await page.waitForFunction(()=>!!document.getElementById('rfws-open-workshop'),{},{timeout:120000});
  const welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');if(await welcome.count())await welcome.click();
  await page.waitForFunction(()=>!globalThis.RoleForgeWorkshop&&!document.querySelector('link[href*="styles/workshop.css"]'));
  assert(messages.some(message=>message.includes('Role-play interface v0.77.1 loaded')));
  assert.equal(await page.locator('#roleforge-workshop,.rfsg-cinema,.rfws-addon-orbits').count(),0,'failed mounts clean up their UI and listeners');
  // Trigger the real native settings entry; it retries without reinitializing RoleForge.
  broken=false;await page.evaluate(()=>document.getElementById('rfws-open-workshop').click());
  await page.waitForFunction(()=>!!globalThis.RoleForgeWorkshop,{},{timeout:120000});
  await page.locator('#roleforge-workshop[open]').waitFor();assert.equal(await page.locator('#roleforge-workshop').count(),1);
  assert.equal(page.workers().filter(worker=>new URL(worker.url()).pathname.endsWith('/workshop/worker.js')).length,1);
  assert.equal(modelCalls,0);report.checks.push({fault,hostInitialized:true,cleanup:true,retry:true,noModelCalls:true,pass:true});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;console.log('PASS native Workshop catalog/storage failure and retry');
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await writeFile(out+'/startup-validation.json',JSON.stringify(report,null,2));await browser.close();}
