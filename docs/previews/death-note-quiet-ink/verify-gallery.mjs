import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const url=process.env.DN_QUIET_URL||'http://127.0.0.1:18182/scripts/extensions/third-party/rpg-systems/docs/previews/death-note-quiet-ink/index.html',out=process.env.DN_QUIET_OUTPUT||'/workspace/artifacts/death-note-quiet-ink';
await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={pass:false,liveModel:false,voiceProvider:false,widths:[],errors:[]};
try{for(const width of [1440,390,320,768]){
 const ctx=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500}),p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.locator('.dnr-turn').first().waitFor();await p.evaluate(()=>document.fonts.ready);
 assert.equal(await p.locator('#voice').isChecked(),false,'review defaults to Voice off');assert.equal(await p.locator('.dnr-voice-tools').count(),0);const plainHeight=await p.locator('.dnr-turn[data-actor=npc]').evaluate(n=>n.getBoundingClientRect().height);
 for(const voice of [false,true]){
  await p.locator('#voice').setChecked(voice);assert.equal(await p.locator('.dnr-voice-tools').count(),voice?4:0);assert.equal(await p.locator('.dnr-turn[data-actor=user] .dnr-voice-tools').count(),0,'Voice matches native assistant-only support');
  for(const language of ['en','th']){
   await p.locator('[data-lang='+language+']').click();assert.equal(await p.locator('.dnr-turn[lang='+language+']').count(),3);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page fits '+width+' '+language);
   const scene=p.locator('.dnr-scene');await scene.locator('summary').click();assert.equal(await scene.locator('dl dd').count(),11);assert(await scene.locator('dl').isVisible());assert(await scene.evaluate(n=>n.scrollWidth<=n.clientWidth+1));await scene.locator('summary').click();
   for(const actor of ['npc','user','shinigami']){const toggle=p.locator('.dnr-turn[data-actor='+actor+'] .dnr-thought-toggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();}
  }
  if(voice){
   const button=p.locator('.dnr-voice-play').first();await button.click();assert.equal(await button.getAttribute('data-phase'),'playing');assert.equal(await button.locator('svg').getAttribute('data-icon'),'pause');await button.click();assert.equal(await button.getAttribute('data-phase'),'paused');
   const bounds=await p.locator('.dnr-voice-tools button').evaluateAll(ns=>ns.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert(bounds.every(n=>n.width>=44&&n.height>=44),'all audio controls have 44px hit targets');
   assert(await p.locator('.dnr-turn[data-actor=npc]').evaluate((n,h)=>n.getBoundingClientRect().height>h,plainHeight));
  }
  await p.locator('#size').evaluate(n=>{n.value='24';n.dispatchEvent(new Event('input',{bubbles:true}));});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.locator('#size').evaluate(n=>{n.value='18';n.dispatchEvent(new Event('input',{bubbles:true}));});
  await p.locator('[data-lang=th]').click();
  if(width===1440){await p.evaluate(()=>document.body.dataset.capture='true');await p.locator('main').screenshot({path:out+'/desktop-voice-'+(voice?'on':'off')+'.png',animations:'disabled'});await p.evaluate(()=>delete document.body.dataset.capture);}
  if(width===390)for(const actor of ['npc','user','shinigami']){
   await p.locator('[data-filter='+actor+']').click();await p.evaluate(()=>document.body.dataset.capture='true');await p.locator('main').screenshot({path:out+'/mobile-voice-'+(voice?'on':'off')+'-'+actor+'.png',animations:'disabled'});await p.evaluate(()=>delete document.body.dataset.capture);
  }
  await p.locator('[data-filter=all]').click();
 }
 await p.locator('.dnr-identity').first().click();await p.locator('dialog[open]').waitFor();await p.keyboard.press('Escape');await p.locator('dialog').waitFor({state:'detached'});
 await p.locator('#addon').uncheck();assert.equal(await p.locator('.dnr-turn,.dnr-scene').count(),0);await p.locator('#addon').check();
 await p.evaluate(()=>{for(const n of document.querySelectorAll('.dnr-name,.dnr-scene-place strong,.dnr-dialogue p'))n.textContent+=' '+('VeryLongUnbrokenText').repeat(12);});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.dnr-thought-body').first().evaluate(n=>getComputedStyle(n).animationName),'none');
 report.widths.push({width,touchEmulation:width<500,voiceOnOff:true,noVoiceRowWhenDisabled:true,sceneAllDetails:true,languages:2,longText:true,largeText:true,accessibleVoiceVectors:true,foldableThoughts:true,addonGate:true,reducedMotion:true});await ctx.close();console.log('PASS refined gallery',width);
}assert.deepEqual(report.errors,[]);report.pass=true;}catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}finally{await writeFile(out+'/gallery-validation.json',JSON.stringify(report,null,2));await browser.close();}
