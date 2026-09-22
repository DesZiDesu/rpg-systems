// Optional UI regression: npm install --no-save playwright && npx playwright install chromium
// Run: node tests/npc-workspace.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const source=await readFile(new URL('../index.js',import.meta.url),'utf8');
const launchers=source.slice(source.indexOf('function syncLauncherVisibility()'),source.indexOf('function bindCheckbox('));
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="extensionsMenu"></div><div id="chat"></div><script type="module">
import {createNpcWorkspace} from '/npc-workspace.js';
import {FIELDS,STATS,RELATIONS} from '/npc-core.js';
let stored=[],saves=0,requests=0;const settings={showWandLauncher:true,chatPresentation:false};
const generated={...Object.fromEntries(Object.keys(FIELDS).map(k=>[k,k+' detail'])),name:'Lysa',age:'120',aliases:['Forest healer'],abilities:[{name:'Heal',category:'Magic',level:'2',description:'Restore health',proficiency:75}],isHostile:false,identityColor:'#abcdef',roleIcon:'healer',portraitSize:96,...Object.fromEntries(RELATIONS.map(k=>[k,25])),stats:{rank:'Basic',...Object.fromEntries(STATS.map(k=>[k,10]))}};
const context={getCurrentChatId:()=> 'chat-1',chat:[],generateQuietPrompt:async options=>{requests++;window.lastPrompt=options.quietPrompt;if(window.waitForAI)await new Promise(r=>window.resolveAI=r);return JSON.stringify(window.badAI?{name:'Bad'}:generated);}};
const api={context:()=>context,scopeInfo:()=>({key:'card-1',label:'Card'}),settings:()=>settings,state:()=>({npcs:stored}),listScope:()=>stored,portrait:async()=>null,profile:v=>v,persistScope:async(_scope,npcs)=>{stored=npcs;saves++;return true},visible:s=>s,parseJson:JSON.parse,recordRequest(){},notify(){},updatePrompt(){}};
const npcWorkspace=createNpcWorkspace(api);window.workspace=npcWorkspace;
const getSettings=()=>settings,LAUNCHER_BIND_VERSION='test',notify=()=>{},openInterface=()=>{};
${launchers}
createWandLauncher();
window.toggle=on=>{settings.showWandLauncher=on;syncLauncherVisibility()};window.counts=()=>({saves,requests,stored});window.ready=true;
</script>`;
const server=http.createServer(async(req,res)=>{
 try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/'){res.setHeader('content-type','text/html');res.end(fixture);return}
 if(!/^\/[a-z-]+\.(js|css)$/.test(pathname)){res.writeHead(404).end();return}
 const file=await readFile(new URL('..'+pathname,import.meta.url));res.setHeader('content-type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(file);
 }catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready);
 await page.evaluate(()=>toggle(false));assert.equal(await page.locator('#tretaresia-npc-wand-launcher').isVisible(),false);
 await page.evaluate(()=>toggle(true));await page.locator('#tretaresia-npc-wand-launcher').press('Enter');
 await page.locator('[data-new]').click();await page.locator('[data-npc-brief]').fill('A 120 year old elven healer named Lysa with a forest clinic.');
 await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>document.querySelector('[name=name]').value==='Lysa');
 assert.equal(await page.locator('[name=age]').inputValue(),'120');assert.equal(await page.locator('[name="stats.level"]').inputValue(),'10');
 assert.equal(await page.locator('[name=roleIcon]').inputValue(),'healer');assert.equal(await page.locator('[data-ability=name]').inputValue(),'Heal');
 assert.equal((await page.evaluate(()=>counts())).saves,0);
 let box=await page.locator('dialog').boundingBox();assert.ok(Math.abs(box.y)<2);assert.ok(Math.abs(box.height-844)<2);
 await page.setViewportSize({width:390,height:480});await page.waitForTimeout(100);box=await page.locator('dialog').boundingBox();assert.ok(Math.abs(box.height-480)<2);
 await page.locator('button[type=submit]').click();await page.waitForFunction(()=>window.counts().saves===1);assert.equal((await page.evaluate(()=>counts())).stored[0].name,'Lysa');
 await page.locator('[data-back]').click();await page.locator('[data-new]').click();await page.locator('[name=name]').fill('Keep me');await page.locator('[data-npc-brief]').fill('Another healer');
 await page.evaluate(()=>window.badAI=true);await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('incomplete'));
 assert.equal(await page.locator('[name=name]').inputValue(),'Keep me');
 await page.evaluate(()=>{window.badAI=false;window.waitForAI=true});await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>typeof window.resolveAI==='function');
 await page.locator('[data-close]').click();await page.evaluate(()=>{window.resolveAI();window.waitForAI=false});await page.waitForTimeout(100);
 assert.equal((await page.evaluate(()=>counts())).saves,1);assert.equal(await page.locator('dialog').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: wand toggle/keyboard, full draft, explicit save, invalid response preservation, stale result rejection, mobile viewport resize.');
}finally{await browser?.close();server.close();}
