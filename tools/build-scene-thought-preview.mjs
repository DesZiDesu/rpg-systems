// Capture production components and make a portable, offline review page.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18180',out=process.env.ST_SCENE_ARTIFACTS||'/workspace/artifacts/scene-thought-update',root=new URL('../',import.meta.url);
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:2000,height:1100},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/scripts/extensions/third-party/rpg-systems/docs/previews/scene-thought-review/index.html');await page.waitForFunction(()=>window.sceneThoughtPreview?.ready);await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>document.body.dataset.sheet='');
 const height=await page.locator('footer').evaluate(n=>Math.ceil(n.getBoundingClientRect().bottom+20));
 await page.screenshot({path:out+'/five-designs.png',clip:{x:0,y:0,width:2000,height}});
 await page.evaluate(()=>delete document.body.dataset.sheet);await page.setViewportSize({width:430,height:1100});
 for(const theme of ['roleforge','folio','chapter','codex','aincrad']){
  await page.selectOption('#theme',theme);await page.locator(`article[data-theme=${theme}]`).screenshot({path:out+'/preview-'+theme+'.png'});
 }
 await page.selectOption('#theme','all');
 let css='';
 for(const file of ['styles/npc-ui.css','styles/chat-scene-thought.css','styles/chat-themes.css','styles/chat-illustrated.css']){
  let source=await readFile(new URL(file,root),'utf8');source=source.replace(/@import[^;]+;/gu,'');
  for(const [full,path] of source.matchAll(/url\(['"]?([^)'"\s]+\.woff2)['"]?\)/gu)){
   const data=(await readFile(new URL(path,new URL(file,root)))).toString('base64');source=source.replace(full,`url('data:font/woff2;base64,${data}')`);
  }
  css+='\n'+source;
 }
 await page.evaluate(css=>{
  document.querySelectorAll('link[rel=stylesheet],script').forEach(n=>n.remove());const style=document.createElement('style');style.textContent=css;document.head.append(style);
  const script=document.createElement('script');script.textContent=`document.getElementById('theme').onchange=e=>{for(const n of document.querySelectorAll('article[data-theme]'))n.hidden=e.target.value!=='all'&&n.dataset.theme!==e.target.value;};document.getElementById('size').onchange=e=>document.body.dataset.size=e.target.value;window.sceneThoughtPreview={ready:true};`;document.body.append(script);
 },css);
 const html='<!doctype html>\n'+await page.evaluate(()=>document.documentElement.outerHTML);await writeFile(out+'/scene-thought-preview.html',html);
 let requests=0;const url=base+'/scene-thought-offline-review';await page.route(url,r=>r.fulfill({contentType:'text/html',body:html}));page.on('request',r=>{if(r.url().startsWith('http')&&r.url()!==url)requests++;});
 await page.goto(url);await page.waitForFunction(()=>window.sceneThoughtPreview?.ready);await page.selectOption('#theme','codex');assert.equal(await page.locator('article:visible').count(),1);
 await page.locator('article[data-theme=codex] summary').click();assert.equal(await page.locator('article[data-theme=codex] details').evaluate(n=>n.open),true);
 await page.selectOption('#size','desktop');assert.equal(await page.locator('body').getAttribute('data-size'),'desktop');assert.equal(requests,0);assert.deepEqual(errors,[]);
 await writeFile(out+'/portable-preview-validation.json',JSON.stringify({pass:true,externalAssetRequests:requests,themeSelector:true,sizeSelector:true,sceneDetails:true,errors},null,2));
 console.log('PASS offline five-theme preview, selectors, details, embedded fonts; no external asset requests');
}finally{await browser.close();}
