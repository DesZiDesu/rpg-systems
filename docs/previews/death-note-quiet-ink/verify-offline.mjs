import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const url=process.env.DN_QUIET_OFFLINE_URL||'http://127.0.0.1:18182/scripts/extensions/third-party/rpg-systems/docs/previews/death-note-quiet-ink/Death-Note-Refined-Preview.html';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={pass:false,selfContained:true,liveModel:false,requests:[],errors:[],widths:[]};
try{for(const width of [1440,390,320]){
 const ctx=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500});await ctx.route('**/*',r=>{if(r.request().isNavigationRequest()&&r.request().url()===url)return r.continue();report.requests.push(r.request().url());return r.abort();});
 const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.locator('.dnr-turn').first().waitFor();await p.evaluate(()=>document.fonts.ready);assert.equal(await p.locator('#voice').isChecked(),false);assert.equal(await p.locator('.dnr-voice-tools').count(),0);
 for(const voice of [true,false])for(const lang of ['en','th']){
  await p.locator('#voice').setChecked(voice);await p.locator('[data-lang='+lang+']').click();assert.equal(await p.locator('.dnr-voice-play').count(),voice?4:0);assert.equal(await p.locator('.dnr-scene').count(),1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.locator('.dnr-scene summary').click();assert.equal(await p.locator('.dnr-scene dd').count(),11);await p.locator('.dnr-scene summary').click();
 }
 await p.locator('#addon').uncheck();assert.equal(await p.locator('.dnr-turn,.dnr-scene').count(),0);await p.locator('#addon').check();
 await p.locator('#native-label').click();await p.evaluate(()=>Promise.all([...document.querySelectorAll('#native-shots img')].map(i=>i.decode())));assert.equal(await p.locator('#native-shots img').count(),4);report.widths.push(width);await ctx.close();console.log('PASS offline refined preview',width);
}assert.deepEqual(report.requests,[]);assert.deepEqual(report.errors,[]);report.pass=true;}catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}finally{await writeFile(new URL('./validation/offline-validation.json',import.meta.url),JSON.stringify(report,null,2));await browser.close();}
