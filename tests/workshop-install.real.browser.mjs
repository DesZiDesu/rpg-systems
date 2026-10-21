// Native Worker + Workshop UI regression for Windows checkouts and stale bytes.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base='http://127.0.0.1:18182',prefix='/scripts/extensions/third-party/rpg-systems/',out='/workspace/artifacts/workshop-install-fix';
const version=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
const catalog=JSON.parse(await readFile(new URL('../src/workshop/catalog.json',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={host:'SillyTavern 1.19.0',version,devices:[],errors:[]};await mkdir(out,{recursive:true});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),device=mobile?'mobile':'desktop';
  const requested=[];
  await context.route('**/src/workshop/packs/**',async route=>{
   const url=new URL(route.request().url()),filename=url.pathname.split('/').at(-1);
   requested.push({filename,hash:url.searchParams.get('sha256')});
   const text=await readFile(new URL('../src/workshop/packs/'+filename,import.meta.url),'utf8');
   await route.fulfill({status:200,contentType:'application/json',body:'\ufeff'+text.replace(/\n/g,'\r\n')});
  });
  await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base);
  await page.waitForFunction(()=>!!globalThis.RoleForgeWorkshop,{},{timeout:120000});
  const welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');if(await welcome.count())await welcome.click();
  await page.selectOption('#themes','Dark Lite',{force:true});
  for(const addon of catalog.addons){
   await page.evaluate(()=>RoleForgeWorkshop.open());
   await page.locator(`[data-ws-action=detail][data-id="${addon.id}"]`).first().click();
   await page.locator('[data-ws-action=install]').click();await page.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);
   const snapshot=await page.evaluate(()=>RoleForgeWorkshop.snapshot());
   assert(snapshot.packs.some(p=>p.id===addon.id),'CRLF/BOM package installs: '+addon.id);
   assert.equal(requested.at(-1).hash,addon.releases.at(-1).sha256);
  }
  const retained=await page.evaluate(async({prefix,version,release})=>{
   const {createStore}=await import(prefix+'src/workshop/client.js?v='+version),store=createStore();
   try{
    const before=await store.call('snapshot',{}),text=await (await fetch(prefix+'src/workshop/'+release.path)).text();
    const changed=text.replace('"name":','"modifiedName":'),bytes=new TextEncoder().encode(changed).buffer;let error='';
    try{await store.call('install',{bytes,sha256:release.sha256,host:version,expectedId:'death-note',expectedVersion:release.version});}catch(e){error=e.message;}
    const after=await store.call('snapshot',{});return{error,retained:JSON.stringify(before.packs)===JSON.stringify(after.packs)};
   }finally{store.destroy();}
  },{prefix,version,release:catalog.addons.find(p=>p.id==='death-note').releases.at(-1)});
  assert.match(retained.error,/ไม่ตรงกับแพ็ก/);assert(retained.retained);
  await page.screenshot({path:out+'/'+device+'.png'});
  await page.reload();await page.waitForFunction(()=>!!globalThis.RoleForgeWorkshop,{},{timeout:120000});
  const persisted=await page.evaluate(()=>RoleForgeWorkshop.snapshot());assert.equal(persisted.packs.length,3);
  report.devices.push({device,allThreeInstallWithCrlfAndBom:true,hashQualifiedUrls:true,tamperingRejected:true,existingPackagesRetained:true,reloadPersists:true});
  console.log('PASS Workshop Windows install',device);await context.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
