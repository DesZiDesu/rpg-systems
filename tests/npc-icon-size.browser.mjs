// Browser regression: all role artwork, host overrides, and an upgrade with warm cache.
// npm install --no-save playwright @fortawesome/fontawesome-free
// CHROMIUM_EXECUTABLE=/path/to/chromium node tests/npc-icon-size.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fontRoot=process.env.FONT_AWESOME_ROOT||new URL('./', 'file://'+require.resolve('@fortawesome/fontawesome-free/package.json')).pathname;
const root=new URL('../',import.meta.url);
const {version:release}=JSON.parse(await readFile(new URL('manifest.json',root)));
let installed='0.43.6';
const requests=[];
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/font/css/all.min.css"><style>body{background:#111;color:#eee;margin:16px}.trpg-role{margin:10px 0}.trpg-list-emblem{margin:8px}</style>
<main id="chat"></main><script type="module">
const {version}=await (await fetch('/manifest.json',{cache:'no-store'})).json();
const [{createNpcWorkspace},{roleIcon},{CLASSIC_ROLE_ICONS},{MEDALLION_ROLES}]=await Promise.all([
import('/src/npc-workspace.js?v='+version),import('/src/npc-chat.js?v='+version),import('/src/npc-core.js?v='+version),import('/src/npc-medallions.js?v='+version)]);
createNpcWorkspace({context:()=>({chat:[]}),settings:()=>({}),state:()=>({npcs:[]})});
const keys=[...Object.keys(CLASSIC_ROLE_ICONS),...Object.keys(MEDALLION_ROLES).flatMap(k=>['medallion:'+k,'emblem:'+k])];
for(const container of ['trpg-role','trpg-list-emblem'])for(const key of keys){const row=document.createElement('div');row.className=container;const icon=roleIcon(key);icon.dataset.key=key;row.append(icon);if(container==='trpg-role')row.append(document.createTextNode(' '+key));document.querySelector('main').append(row);}
await Promise.all([...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.sheet?Promise.resolve():new Promise((resolve,reject)=>{l.onload=resolve;l.onerror=reject})));
await document.fonts.ready;window.ready=true;
</script>`;
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');requests.push(u.pathname+u.search);
  if(u.pathname==='/'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html');res.end(fixture);return;}
  if(u.pathname==='/manifest.json'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:installed}));return;}
  if(u.pathname.startsWith('/font/')){res.setHeader('Content-Type',u.pathname.endsWith('.css')?'text/css':'font/woff2');res.end(await readFile(fontRoot+'/'+u.pathname.slice(6)));return;}
  if(!/^\/(src|styles)\/[a-z-]+\.(js|css)$/.test(u.pathname)){res.writeHead(404).end();return;}
  let source=await readFile(new URL('.'+u.pathname,root),'utf8');
  if(u.searchParams.get('v')==='0.43.6'){
   source=source.replaceAll(release,'0.43.6');
   if(u.pathname==='/styles/npc-ui.css')source=source.slice(0,source.indexOf('/* Static SVG role artwork'))+'\n.trpg-role-art{display:inline-flex;width:40px;height:40px;flex:0 0 40px}.trpg-role-art svg{width:100%;height:100%}.trpg-list-emblem .trpg-role-art{width:34px;height:34px;flex-basis:34px}';
  }
  res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.setHeader('Content-Type',u.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(source);
 }catch(error){res.writeHead(500).end(String(error));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port;
  const visit=async()=>{await page.goto(url);await page.waitForFunction(()=>window.ready);assert.deepEqual(errors,[]);};
  installed='0.43.6';await visit();
  const before=await page.locator('.trpg-role .trpg-role-art').first().evaluate(e=>e.getBoundingClientRect().width);assert.equal(before,40);
  // Same URLs remain cached even after an update on disk without a version bump.
  const cachedStart=requests.length;await visit();assert.equal(await page.locator('.trpg-role .trpg-role-art').first().evaluate(e=>e.getBoundingClientRect().width),40);
  assert(!requests.slice(cachedStart).some(r=>r.startsWith('/styles/npc-ui.css')),'old stylesheet should be served from browser cache');
  installed=release;const start=requests.length;await visit();
  assert(requests.slice(start).includes('/styles/npc-ui.css?v='+release));
  assert(!requests.slice(start).some(r=>/^\/(src|styles)\//.test(r)&&!r.endsWith('?v='+release)),'all module and stylesheet URLs must use the new release');
  // Reproduce old compatibility rules and common host SVG rules after our sheet.
  await page.addStyleTag({content:'.trpg-role-art{width:40px;height:40px;flex:0 0 40px}.trpg-list-emblem .trpg-role-art{width:34px;height:34px;flex-basis:34px}svg{min-width:0;width:100px;height:100px}'});
  const measurements=await page.evaluate(()=>[...document.querySelectorAll('[data-key]')].map(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('svg')?.getBoundingClientRect();return{key:e.dataset.key,container:e.parentElement.className,w:r.width,h:r.height,font:parseFloat(getComputedStyle(e.parentElement).fontSize),svg:s?{w:s.width,h:s.height}:null};}));
  assert.equal(measurements.filter(m=>m.key.includes(':')).length,216);
  for(const m of measurements){assert(Math.abs(m.h-m.font)<0.1,JSON.stringify(m));if(m.svg){assert(Math.abs(m.w-m.font)<0.1,JSON.stringify(m));assert(Math.abs(m.svg.w-m.font)<0.1&&Math.abs(m.svg.h-m.font)<0.1,JSON.stringify(m));}}
  console.log(JSON.stringify({viewport:width,rolesPerStyle:54,before,headerAfter:measurements.find(m=>m.svg&&m.container==='trpg-role').w,rosterAfter:measurements.find(m=>m.svg&&m.container==='trpg-list-emblem').w,warmCacheUpgrade:'passed'}));
  if(process.env.ICON_SCREENSHOT){
   await page.evaluate(()=>{for(const e of document.querySelectorAll('[data-key]'))if(!['healer','medallion:maid','emblem:maid'].includes(e.dataset.key))e.parentElement.style.display='none';});
   await page.screenshot({path:process.env.ICON_SCREENSHOT+'-'+width+'.png'});
  }
  await page.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
