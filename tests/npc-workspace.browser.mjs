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
 await page.locator('[data-management-tab=npc]').click();
 await page.locator('[data-new]').click();await page.locator('[data-npc-brief]').fill('A 120 year old elven healer named Lysa with a forest clinic.');
 await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>document.querySelector('[name=name]').value==='Lysa');
 assert.equal(await page.locator('[name=age]').inputValue(),'120');assert.equal(await page.locator('[name="stats.level"]').inputValue(),'10');
 assert.equal(await page.locator('[name=roleIcon]').inputValue(),'healer');assert.equal(await page.locator('[data-ability=name]').inputValue(),'Heal');
 assert.equal((await page.evaluate(()=>counts())).saves,0);
 async function assertFooter(){const dialog=await page.locator('dialog').boundingBox(),actions=await page.locator('[data-editor-actions]').boundingBox(),record=await page.locator('.trpg-record').boundingBox();assert.ok(Math.abs(actions.y+actions.height-(dialog.y+dialog.height))<3);assert.ok(record.y+record.height<=actions.y+1);assert.equal(await page.locator('[data-editor-actions] button[type=submit]').getAttribute('form'),'trpg-npc-form');}
 await assertFooter();await page.locator('[name=name]').fill('Lysa');await assertFooter();
 let box=await page.locator('dialog').boundingBox();assert.ok(Math.abs(box.y)<2);assert.ok(Math.abs(box.height-844)<2);
 await page.setViewportSize({width:390,height:480});await page.waitForFunction(()=>document.querySelector('dialog').classList.contains('trpg-keyboard-open'));
 box=await page.locator('dialog').boundingBox();assert.ok(Math.abs(box.height-480)<2);
 assert.equal(await page.locator('.trpg-management-tabs').isVisible(),false);assert.equal(await page.locator('[data-editor-actions]').isVisible(),false);
 const recordBox=await page.locator('.trpg-record').boundingBox(),nameBox=await page.locator('[name=name]').boundingBox();
 assert.ok(recordBox.height>330);assert.ok(nameBox.y>=recordBox.y&&nameBox.y+nameBox.height<=recordBox.y+recordBox.height);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.querySelector('dialog').classList.contains('trpg-keyboard-open'));await assertFooter();
 await page.locator('button[type=submit]').click();await page.waitForFunction(()=>window.counts().saves===1);assert.equal((await page.evaluate(()=>counts())).stored[0].name,'Lysa');
 await page.locator('[data-back]').click();await page.locator('[data-new]').click();await page.locator('[name=name]').fill('Keep me');await page.locator('[data-npc-brief]').fill('Another healer');
 await page.evaluate(()=>window.badAI=true);await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('JSON'));
 assert.equal(await page.locator('[name=name]').inputValue(),'Keep me');
 await page.evaluate(()=>{window.badAI=false;window.waitForAI=true});await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>typeof window.resolveAI==='function');
 await page.locator('[data-close]').click();await page.evaluate(()=>{window.resolveAI();window.waitForAI=false});await page.waitForTimeout(100);
 assert.match(await page.evaluate(()=>window.lastPrompt),/blue crystal/);assert.equal((await page.evaluate(()=>counts())).saves,1);assert.equal(await page.locator('dialog').isVisible(),false);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>workspace.open());
 await page.locator('[data-generation-scope]').selectOption('character');assert.equal(await page.locator('[data-scope-select]').inputValue(),'character');
 await page.locator('[data-new]').click();assert.equal(await page.locator('[data-draft-scope]').inputValue(),'character');
 // Real canvas-generated image exercises upload preparation and request attachment.
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=8;const g=c.getContext('2d');g.fillStyle='red';g.fillRect(0,0,8,8);return c.toDataURL('image/png').split(',')[1];});
 await page.locator('form .trpg-section input[type=file]').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await page.waitForFunction(()=>!document.querySelector('fieldset').disabled);
 assert.equal(await page.locator('[data-send-portrait]').isChecked(),true, 'Uploading a portrait must enable image reading without an extra click');
 await page.evaluate(()=>window.noVision=true);const priorRequests=(await page.evaluate(()=>counts())).requests;
 await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Image inlining'));
 assert.equal((await page.evaluate(()=>counts())).requests,priorRequests);
 await page.evaluate(()=>window.noVision=false);await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>document.querySelector('[name=name]').value==='Lysa');
 assert.match(await page.evaluate(()=>window.lastVisionImage),/^data:image\/(webp|jpeg);base64,/);assert.match(await page.evaluate(()=>window.lastPrompt),/VISIBLE APPEARANCE/);
 assert.equal(await page.locator('[name=appearance]').inputValue(),'Short dark hair, brown eyes, and a green cloak.', 'Do not append the biography model\'s invented appearance');
 // A separate reference picture is not stored as the character portrait.
 await page.locator('[data-npc-reference]').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await page.waitForFunction(()=>!document.querySelector('fieldset').disabled);
 assert.equal(await page.locator('[data-reference-preview] img').count(),1);
 await page.evaluate(()=>window.imageUnavailable=true);await page.locator('[data-generate-npc]').click();await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('AI อ่านภาพไม่ได้'));
 assert.equal(await page.locator('[name=appearance]').inputValue(),'Short dark hair, brown eyes, and a green cloak.', 'Do not append the biography model\'s invented appearance');
 await page.evaluate(()=>window.imageUnavailable=false);
 await page.locator('button[type=submit]').click();await page.waitForFunction(()=>window.counts().shared.length===1);
 assert.equal((await page.evaluate(()=>counts())).shared[0].npcScope,'character');assert.equal((await page.evaluate(()=>counts())).stored.length,1);
 await page.locator('[data-back]').click();assert.equal(await page.locator('.trpg-person').count(),1);
 await page.locator('.trpg-person').click();await page.getByRole('button',{name:'แก้ไขข้อมูล',exact:true}).click();
 assert.equal(await page.locator('[data-send-portrait]').isChecked(),true, 'Reopened saved portraits must be available to vision');
 await page.locator('summary').filter({hasText:'ATTRIBUTES'}).click();await page.locator('[name="stats.hp"]').fill('0');
 await page.locator('[data-generate-attributes]').click();await page.waitForFunction(()=>document.querySelector('[name="stats.hp"]').value==='10');
 assert.equal(await page.evaluate(()=>window.lastImage),null);assert.equal(await page.locator('[name=name]').inputValue(),'Lysa');
 await page.locator('[data-close]').click();await page.evaluate(()=>workspace.open({name:'Previously unsaved speaker'}));
 await page.waitForFunction(()=>document.querySelector('[name=name]')?.value==='Previously unsaved speaker');
 assert.equal(await page.locator('[data-draft-scope]').inputValue(),'character');
 await page.locator('[data-back]').click();await page.locator('.trpg-person').click();
 await page.getByRole('button',{name:'ลบตัวละคร',exact:true}).click();await page.waitForFunction(()=>window.counts().shared.length===0);assert.equal((await page.evaluate(()=>counts())).stored.length,1);
 await page.locator('[data-scope-select]').selectOption('chat');await page.locator('.trpg-person').click();await page.getByRole('button',{name:'ลบตัวละคร',exact:true}).click();await page.waitForFunction(()=>window.counts().stored.length===0);
 assert.equal(await page.locator('[data-editor-actions]').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: wand, draft/save/stale responses, viewport, image-only vision, unsupported vision preservation, Character destination/list, attribute repair, unsaved header recovery.');
}finally{await browser?.close();server.close();}
