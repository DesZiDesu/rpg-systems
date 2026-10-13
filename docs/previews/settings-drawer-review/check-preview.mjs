import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const folder=new URL('./',import.meta.url);
const html=await readFile(new URL('index.html',folder),'utf8');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const validation=[];
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
  await page.setContent(html);await page.waitForFunction(()=>window.settingsDrawerPreview);
  assert.equal(await page.locator('[data-rf-settings-groups]>button').count(),6);
  const routes=await page.locator('[data-rf-settings-page]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rfSettingsPage));
  assert.equal(routes.length,20);
  for(const id of routes){
   await page.evaluate(id=>window.settingsDrawerPreview.navigation.open(id,{direct:true}),id);await page.waitForTimeout(25);
   const fit=await page.evaluate(()=>{const drawer=document.getElementById('extensions_settings2');return{document:document.documentElement.scrollWidth-innerWidth,drawer:drawer.scrollWidth-drawer.clientWidth};});
   assert.ok(fit.document<=1&&fit.drawer<=1,`Offline ${width}px ${id}: ${JSON.stringify(fit)}`);
  }
  await page.evaluate(()=>window.settingsDrawerPreview.navigation.home());
  await page.locator('#roleforge-settings-search').fill('ค่าเงิน');
  await page.locator('#roleforge-settings-search').press('Enter');
  assert.equal(await page.evaluate(()=>window.settingsDrawerPreview.navigation.current),'currency');
  await page.locator('#roleforge-currency-editor [name=currencyName]').fill('My draft');
  await page.locator('[data-rf-settings-back]').click();
  assert.equal(await page.locator('#roleforge-settings-search').inputValue(),'ค่าเงิน');
  await page.locator('[data-rf-settings-results] [data-rf-settings-open=currency]').click();
  assert.equal(await page.locator('#roleforge-currency-editor [name=currencyName]').inputValue(),'My draft');
  await page.locator('#roleforge-currency-editor button[type=submit]').click();
  assert.equal(await page.locator('.review-toast').isVisible(),true,'Save is clearly preview-only');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[],'Self-contained preview needs no external requests');
  validation.push({width,pages:20,navigation:true,search:true,drafts:true,overflow:false,externalRequests:0,errors:[]});
  console.log(`PASS offline review ${width}px: menu, search, Back, drafts, all pages fit, no external requests`);
  await page.close();
 }
 // Show the actual production screenshots together; the drawer UI is unaltered.
 const screenshots=await Promise.all(['mobile-home','mobile-world','mobile-currency'].map(async name=>({name,image:(await readFile(new URL(`screenshots/${name}.png`,folder))).toString('base64')})));
 const composition=await browser.newPage({viewport:{width:1242,height:1194},deviceScaleFactor:1});
 await composition.setContent(`<!doctype html><html lang="th"><meta charset="utf-8"><style>html,body{margin:0;background:#181818;color:#ddd;font:16px/1.6 system-ui,sans-serif}.caption{padding:18px 20px 14px;display:flex;align-items:center;justify-content:space-between}.caption strong{font-size:22px}.caption span{color:#aaa;font-size:13px}.screens{display:grid;grid-template-columns:repeat(3,390px);gap:16px;margin:0 20px}.screens figure{margin:0}.screens figcaption{height:31px;color:#bbb;font-size:14px}.screens img{display:block;width:390px;height:1100px;border:1px solid #383838;box-sizing:border-box}.note{font-size:12px;color:#aaa;padding:10px 20px}</style><div class="caption"><strong>RoleForge · จัดหน้าตั้งค่าใหม่</strong><span>มือถือ · ภาพจากส่วนเสริมที่แก้จริง · 0.68.0</span></div><div class="screens">${screenshots.map((shot,i)=>`<figure><figcaption>${['1 · หน้าแรก 6 หมวด','2 · เลือกระบบในหมวด','3 · หน้าจัดการเต็ม drawer'][i]}</figcaption><img src="data:image/png;base64,${shot.image}"></figure>`).join('')}</div></html>`);
 await composition.screenshot({path:new URL('mobile-organization.png',folder).pathname});
 await composition.close();
 await writeFile(new URL('offline-validation.json',folder),JSON.stringify(validation,null,2));
}finally{await browser.close();}
