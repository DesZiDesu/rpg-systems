// Exercise the native full-screen workspace, not an HTML mock of SillyTavern.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18182',out=process.env.WORKSHOP_ARTIFACTS||'/workspace/artifacts/workshop-v0.77.2';
const release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out+'/captures',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}),report={release,host:'SillyTavern 1.19.0',theme:'Dark Lite',checks:[],errors:[],modelCalls:0};let page;
const root=()=>page.locator('#roleforge-workshop');
async function shot(name){await page.evaluate(()=>{toastr.clear();document.activeElement?.blur();});await page.waitForTimeout(180);await page.screenshot({path:out+'/captures/'+name+'.png'});}
async function idle(){await page.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);}
async function layout(label,fullscreen){
 const data=await root().evaluate(n=>{
  const r=n.getBoundingClientRect(),main=n.querySelector('.rfws-main'),nav=n.querySelector('.rfws-sidebar'),close=n.querySelector('[data-ws-action=close]'),nr=nav?.getBoundingClientRect();
  return{width:innerWidth,height:innerHeight,dialog:{x:r.x,y:r.y,width:r.width,height:r.height},mainOverflow:main.scrollWidth>main.clientWidth+1,nav:nr?{x:nr.x,y:nr.y,right:nr.right,bottom:nr.bottom}:null,closeVisible:close.getBoundingClientRect().bottom<=innerHeight,overflows:[...n.querySelectorAll('.ws-card,.ws-install-box,.ws-chat-addon,.ws-backup-card')].filter(c=>c.scrollWidth>c.clientWidth+1).length};
 });
 assert.equal(data.mainOverflow,false,JSON.stringify({label,data}));assert.equal(data.overflows,0,label);assert.equal(data.closeVisible,true,label);
 if(fullscreen){assert(Math.abs(data.dialog.x)<1&&Math.abs(data.dialog.y)<1,label);assert(Math.abs(data.dialog.width-data.width)<1&&Math.abs(data.dialog.height-data.height)<1,label);if(data.nav)assert(Math.abs(data.nav.bottom-data.height)<1,label);}
 else assert(data.dialog.x>=0&&data.dialog.width<=data.width&&data.dialog.height<=data.height,label);
 report.checks.push({label,fullscreen,...data,pass:true});
}
try{
 for(const mobile of [true,false]){
  const device=mobile?'mobile':'desktop',context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));await context.route('**/api/backends/chat-completions/generate',r=>{report.modelCalls++;return r.abort();});
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/');await page.waitForFunction(()=>!!globalThis.RoleForgeWorkshop,{},{timeout:120000});
  const welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');if(await welcome.count())await welcome.click();
  await page.selectOption('#themes','Dark Lite',{force:true});await page.selectOption('#tretaresia-rpg-language','th',{force:true});
  await page.evaluate(async()=>{const s=await import('/script.js'),c=SillyTavern.getContext();await s.selectCharacterById(String(c.characters.findLastIndex(x=>x.name==='Tensura · Jura Forest')));});await page.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));
  await page.evaluate(()=>RoleForgeWorkshop.open());await root().waitFor({state:'visible'});
  assert.equal(await root().locator('[data-ws-nav=chat] .fa-comment-dots').count(),1);assert.equal(await root().locator('.ws-pack-icon.is-sage canvas').count(),1);assert.equal(await root().locator('svg').count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});const orb=root().locator('.ws-pack-icon.is-sage canvas'),first=await orb.evaluate(n=>n.toDataURL());await page.waitForTimeout(200);assert.notEqual(await orb.evaluate(n=>n.toDataURL()),first,'Great Sage uses its animated orb, not a generic emblem');await page.emulateMedia({reducedMotion:'reduce'});
  const font=await root().locator('[data-ws-nav=chat] .rfws-icon').evaluate(n=>({family:getComputedStyle(n).fontFamily,glyph:getComputedStyle(n,'::before').content}));assert(font.family.includes('Font Awesome'));assert(!['none','normal',''].includes(font.glyph));
  for(const size of mobile?[[320,568],[390,844],[430,932],[844,390],[390,420]]:[[768,900],[1024,768],[1440,1000]]){
   await page.setViewportSize({width:size[0],height:size[1]});await page.waitForTimeout(150);await layout(device+'-catalog-'+size.join('x'),mobile);
  }
  await page.setViewportSize({width:mobile?390:1440,height:mobile?844:1000});await page.waitForTimeout(120);await shot(device+'-workshop');
  await root().locator('[data-ws-action=detail][data-id=field-notes]').click();assert.equal(await root().locator('.ws-detail-head h1').innerText(),'Field Notes','the last catalog action stays reachable above the bottom navigation');await root().locator('[data-ws-action=detail-back]').click();
  await root().locator('[data-ws-action=detail][data-id=great-sage]').first().click();await layout(device+'-detail',mobile);assert.equal(await root().locator('[data-ws-nav=browse]').getAttribute('aria-current'),'page');await shot(device+'-detail');
  await root().locator('[data-ws-action=install]').click();await idle();await root().locator('[data-ws-nav=installed]').click();await layout(device+'-installed',mobile);await shot(device+'-installed');
  await root().locator('[data-ws-action=detail][data-id=great-sage]').click();await root().locator('[data-ws-action=detail-back]').click();assert.equal(await root().locator('[data-ws-nav=installed]').getAttribute('aria-current'),'page','detail returns to the collection it came from');
  await root().locator('[data-ws-nav=chat]').click();await layout(device+'-chat-off',mobile);await shot(device+'-chat-off');
  await root().locator('[data-ws-enable=great-sage]').check();await idle();assert((await page.evaluate(()=>RoleForgeWorkshop.snapshot())).profile.enabled.includes('great-sage'));await layout(device+'-chat-on',mobile);await shot(device+'-chat');
  assert.deepEqual(await root().locator('[data-ws-enable=great-sage]').evaluate(n=>{const s=getComputedStyle(n,'::before');return{clip:s.clipPath,radius:s.borderRadius,width:s.width};}),{clip:'none',radius:'50%',width:'18px'},'native checkbox check-mark clipping cannot distort the circular thumb');
  await root().locator('[data-ws-nav=backups]').click();await layout(device+'-backup',mobile);await shot(device+'-backup');
  const nativeScroll=await root().evaluate(n=>{const main=n.querySelector('.rfws-main'),nav=n.querySelector('.rfws-sidebar'),a=nav.getBoundingClientRect().y;main.scrollTop=main.scrollHeight;return{before:a,after:nav.getBoundingClientRect().y};});assert.equal(nativeScroll.before,nativeScroll.after,'navigation remains fixed while content scrolls');
  await page.evaluate(()=>RoleForgeWorkshop.openSage());await layout(device+'-sage',mobile);await shot(device+'-sage');
  if(mobile){await root().locator('[name=question]').fill('ข้อความร่างยังอยู่เมื่อพื้นที่แสดงผลเปลี่ยน');await page.setViewportSize({width:390,height:420});await page.waitForTimeout(150);await layout('mobile-sage-short-viewport',true);assert.equal(await root().locator('[name=question]').inputValue(),'ข้อความร่างยังอยู่เมื่อพื้นที่แสดงผลเปลี่ยน');await shot('mobile-sage-short');}
  await root().locator('[data-ws-action=close]').click();assert.equal(await root().isVisible(),false);assert.equal(report.modelCalls,0);
  await context.close();console.log('PASS full-screen Workshop layout and navigation',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(page&&!page.isClosed())await shot('failed-layout').catch(()=>{});}
finally{await writeFile(out+'/layout-validation.json',JSON.stringify(report,null,2));await browser.close();}
