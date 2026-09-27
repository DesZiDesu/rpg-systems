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
import {createNpcWorkspace} from '/src/npc-workspace.js';
import {FIELDS,STATS,RELATIONS} from '/src/npc-core.js';
import {characterLore,lorePrompt,writeCharacterLore,loreOptions,writeLoreOptions} from '/src/lore-core.js';
let stored=[],shared=[],savedPhoto=null,saves=0,requests=0;const settings={showWandLauncher:true,chatPresentation:false,npcGenerationScope:'chat'};
const generated={...Object.fromEntries(Object.keys(FIELDS).map(k=>[k,k+' detail'])),name:'Lysa',age:'120',aliases:['Forest healer'],abilities:[{name:'Heal',category:'Magic',level:'2',description:'Restore health',proficiency:75}],isHostile:false,identityColor:'#abcdef',roleIcon:'healer',portraitSize:96,...Object.fromEntries(RELATIONS.map(k=>[k,25])),stats:{rank:'Basic',...Object.fromEntries(STATS.map(k=>[k,10]))}};
const context={mainApi:'openai',getCurrentChatId:()=> 'chat-1',chat:[],generateQuietPrompt:async options=>{requests++;window.lastPrompt=options.quietPrompt;window.lastImage=options.quietImage;if(options.quietImage){window.lastVisionImage=options.quietImage;return window.imageUnavailable?'IMAGE_UNAVAILABLE':'Short dark hair, brown eyes, and a green cloak.';}if(window.waitForAI)await new Promise(r=>window.resolveAI=r);return window.badAI?'broken {':JSON.stringify(window.shortAI?{name:'Lysa',appearance:'Green cloak',background:'A healer'}:generated);},generateRaw:async options=>{requests++;window.lastPrompt=options.prompt;window.lastImage=null;if(window.waitForAI)await new Promise(r=>window.resolveAI=r);return window.badAI?'broken {':JSON.stringify(window.shortAI?{name:'Lysa',appearance:'Green cloak',background:'A healer'}:generated);}};
const api={loreOptions:()=>loreOptions(settings,'card-1'),persistLoreOptions:(options,owner)=>writeLoreOptions(settings,options,owner,'card-1'),listLore:()=>characterLore(settings,'card-1'),lorePrompt:()=>lorePrompt(characterLore(settings,'card-1')),persistLore:(entries,owner)=>writeCharacterLore(settings,entries,owner,'card-1'),context:()=>context,scopeInfo:()=>({key:'card-1',label:'Card'}),settings:()=>settings,state:()=>({npcs:[...stored,...shared]}),listScope:scope=>scope==='character'?shared:stored,portrait:async p=>p.hasPortrait?savedPhoto:null,profile:v=>v,supportsPortraitVision:async()=>!window.noVision,savePortrait:async blob=>{savedPhoto=blob;return{hasPortrait:true,portraitSource:'server',portraitPath:'/user/images/tretaresia-npc/test.webp'}},persistScope:async(scope,npcs)=>{if(scope==='character')shared=npcs;else stored=npcs;saves++;return true},visible:s=>s,parseJson:JSON.parse,recordRequest(){},notify(){},updatePrompt(){}};
const npcWorkspace=createNpcWorkspace(api);window.workspace=npcWorkspace;
const getSettings=()=>settings,LAUNCHER_BIND_VERSION='test',notify=()=>{},openInterface=()=>{};
${launchers}
createWandLauncher();
window.toggle=on=>{settings.showWandLauncher=on;syncLauncherVisibility()};window.counts=()=>({saves,requests,stored,shared});window.ready=true;
</script>`;
const server=http.createServer(async(req,res)=>{
 try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/'){res.setHeader('content-type','text/html');res.end(fixture);return}
 if(!/^\/(?:src|styles)\/[a-z-]+\.(js|css)$/.test(pathname)){res.writeHead(404).end();return}
 const file=await readFile(new URL('..'+pathname,import.meta.url));res.setHeader('content-type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(file);
 }catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready);
 await page.evaluate(()=>toggle(false));assert.equal(await page.locator('#tretaresia-npc-wand-launcher').isVisible(),false);
 await page.evaluate(()=>toggle(true));await page.locator('#tretaresia-npc-wand-launcher').press('Enter');
 await page.locator('[data-management-tab=lore]').click();
 await page.locator('[name=loreBudget]').fill('2000000');await page.getByRole('button',{name:'บันทึกงบและโหมด',exact:true}).click();assert.equal(await page.locator('[name=loreBudget]').inputValue(),'2000000');
 await page.getByRole('button',{name:'＋ สร้าง Lore ใหม่',exact:true}).click();
 await page.locator('[name=loreTitle]').fill('Moon law');await page.locator('[name=loreContent]').fill('The moon is a blue crystal.');
 await page.getByRole('button',{name:'บันทึก Lore',exact:true}).click();
 await page.getByRole('button',{name:'Moon law',exact:true}).click();assert.equal(await page.locator('[name=loreContent]').inputValue(),'The moon is a blue crystal.');
 await page.getByRole('button',{name:'กลับรายการ',exact:true}).click();
 await page.getByRole('checkbox',{name:'เปิด Lore Moon law',exact:true}).uncheck();
 assert.equal(await page.getByRole('checkbox',{name:'เปิด Lore Moon law',exact:true}).isChecked(),false);
 await page.getByRole('checkbox',{name:'เปิด Lore Moon law',exact:true}).check();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();
 const download=await downloadEvent;assert.equal(download.suggestedFilename(),'roleforge-lore.json');
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.format,'tretaresia-lore');assert.equal(exported.entries[0].content,'The moon is a blue crystal.');
 const upload=page.getByLabel('Import Lore JSON', {exact:true});
 await upload.setInputFiles({name:'lore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
 await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('ไม่มีรายการใหม่'));
 exported.entries[0]={...exported.entries[0],title:'เมืองจันทร์',content:'กฎเมือง\nบรรทัดสอง',keywords:['จันทร์'],enabled:false,always:true};
 await upload.setInputFiles({name:'lore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
 await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('นำเข้า Lore แล้ว'));
 assert.equal(await page.getByRole('checkbox',{name:'เปิด Lore เมืองจันทร์',exact:true}).isChecked(),false);
 await page.getByRole('button',{name:'เมืองจันทร์',exact:true}).click();assert.equal(await page.locator('[name=loreContent]').inputValue(),'กฎเมือง\nบรรทัดสอง');assert.equal(await page.locator('[name=loreKeywords]').inputValue(),'จันทร์');assert.equal(await page.locator('[name=loreAlways]').isChecked(),true);
 await page.getByRole('button',{name:'กลับรายการ',exact:true}).click();
 await upload.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{')});
 await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('JSON'));
 assert.equal(await page.getByRole('button',{name:'Moon law',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'เมืองจันทร์',exact:true}).count(),1);
 console.log('PASS Lore browser export/download, duplicate import, Unicode import, flags and invalid-file protection');
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server.close();}
