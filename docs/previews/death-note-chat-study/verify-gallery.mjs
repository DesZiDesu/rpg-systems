import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.DN_STUDY_URL||'http://127.0.0.1:18182/scripts/extensions/third-party/rpg-systems/docs/previews/death-note-chat-study/index.html';
const out=process.env.DN_STUDY_OUTPUT||'/workspace/artifacts/death-note-theme-study';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={pass:false,devices:[],errors:[],liveModel:false};
try{
 for(const width of [1440,390,320,768]){
  const mobile=width<500,context=await browser.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);await page.locator('.dn-study-turn').first().waitFor();
  for(const theme of ['notebook','casefile']){
   await page.locator('button[data-design="'+theme+'"]').click();
   assert.equal(await page.locator('.dn-study-turn').count(),3);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
   for(const lang of ['en','th']){
    await page.locator('button[data-language="'+lang+'"]').click();
    assert.equal(await page.locator('.dn-study-turn[lang="'+lang+'"]').count(),3);
    for(const actor of ['npc','user','shinigami']){
     const turn=page.locator('.dn-study-turn[data-dn-actor="'+actor+'"]'),toggle=turn.locator('.dn-study-thought-toggle');
     await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert(!await turn.locator('.dn-study-thought-body').isVisible());
     await toggle.click();assert(await turn.locator('.dn-study-thought-body').isVisible());
    }
   }
   await page.locator('#type-size').evaluate(n=>{n.value='24';n.dispatchEvent(new Event('input',{bubbles:true}));});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'large type stays within viewport');
   await page.locator('#type-size').evaluate(n=>{n.value='18';n.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.locator('#addon').uncheck();assert.equal(await page.locator('.dn-study-turn').count(),0);assert(await page.locator('#off').isVisible());
   await page.locator('#addon').check();assert.equal(await page.locator('.dn-study-turn').count(),3);
   if([1440,390].includes(width)){
    await page.evaluate(()=>document.body.dataset.capture='true');
    if(width===1440)await page.locator('.dn-gallery-main').screenshot({path:out+'/gallery-'+theme+'-desktop.png',animations:'disabled'});
    else{
     await page.locator('.dn-gallery-main').screenshot({path:out+'/gallery-'+theme+'-mobile.png',animations:'disabled'});
     for(const actor of ['npc','user','shinigami'])await page.locator('.dn-gallery-card[data-actor="'+actor+'"]').screenshot({path:out+'/gallery-'+theme+'-mobile-'+actor+'.png',animations:'disabled'});
    }
    await page.evaluate(()=>delete document.body.dataset.capture);
   }
  }
  await page.locator('.dn-study-identity').first().click();assert(await page.locator('dialog[open]').isVisible());await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  // Long identifiers and unbroken text must not escape the component.
  await page.evaluate(()=>{for(const n of document.querySelectorAll('.dn-study-name strong,.dn-study-dialogue p'))n.textContent+=' '+('VeryLongUnbrokenName').repeat(12);});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.dn-study-thought-body').first().evaluate(n=>getComputedStyle(n).animationName),'none');
  report.devices.push({width,touchEmulation:mobile,designs:2,languages:2,allFourComponents:true,foldableThoughts:true,addonGate:true,longText:true,largeType:true,reducedMotion:true,noHorizontalOverflow:true});
  await context.close();console.log('PASS gallery',width);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await writeFile(out+'/gallery-validation.json',JSON.stringify(report,null,2));await browser.close();}
