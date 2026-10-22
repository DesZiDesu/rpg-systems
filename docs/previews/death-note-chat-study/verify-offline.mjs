import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const url=process.env.DN_STUDY_OFFLINE_URL||'http://127.0.0.1:18182/scripts/extensions/third-party/rpg-systems/docs/previews/death-note-chat-study/Death-Note-Chat-Themes-Preview.html';
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={pass:false,selfContained:true,liveModel:false,requests:[],errors:[],widths:[]};
try{
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
  await context.route('**/*',route=>{if(route.request().isNavigationRequest()&&route.request().url()===url)return route.continue();report.requests.push(route.request().url());return route.abort();});
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.locator('.dn-study-turn').first().waitFor();await p.evaluate(()=>document.fonts.ready);
  for(const design of ['notebook','casefile'])for(const lang of ['th','en']){
   await p.locator('button[data-design='+design+']').click();await p.locator('button[data-language='+lang+']').click();assert.equal(await p.locator('.dn-study-turn[lang='+lang+']').count(),3);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow: '+width+' '+design+' '+lang);
   assert(await p.locator('.dn-study-seal').evaluate(n=>n.complete&&n.naturalWidth>0));
  }
  await p.locator('#addon').uncheck();assert.equal(await p.locator('.dn-study-turn').count(),0);await p.locator('#addon').check();
  await p.locator('.dn-gallery-footer summary').click();await p.evaluate(()=>Promise.all([...document.querySelectorAll('#native-shots img')].map(i=>i.decode())));assert.equal(await p.locator('#native-shots img').count(),4);
  report.widths.push(width);await context.close();console.log('PASS self-contained HTML',width);
 }
 assert.deepEqual(report.requests,[]);assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}
finally{await writeFile(new URL('./validation/offline-validation.json',import.meta.url),JSON.stringify(report,null,2));await browser.close();}
