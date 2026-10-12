// Actual NPC/Lore workspaces and CSS with isolated sample archives. No model or
// user server is contacted; host persistence is checked separately in unit tests.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname),output=path.join(root,'docs/previews/archive-delete');await mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
 if(name.includes('..')){res.writeHead(404).end();return;}
 res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':name.endsWith('.json')?'application/json':'application/octet-stream');res.end(await readFile(path.join(root,name)));
}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/docs/previews/archive-qol/index.html`,report=[];let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:width===320?700:width===390?844:960},hasTouch:width<650}),errors=[],prompts=[];let accept=true;
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{prompts.push(dialog.message());if(accept)await dialog.accept();else await dialog.dismiss();});
  const manager=page.locator('dialog.trpg-manager'),npc=manager.locator('.trpg-browser'),lore=manager.locator('[data-lore-panel]'),menu=manager.locator('[data-archive-menu]');
  const state=()=>page.evaluate(()=>window.previewState());
  async function load(){await page.goto(url);await page.waitForFunction(()=>window.previewReady);await npc.locator('.trpg-archive-row').first().waitFor();}
  async function saved(){await page.waitForFunction(()=>document.querySelector('dialog.trpg-manager')?.getAttribute('aria-busy')!=='true'&&document.querySelector('[data-lore-panel]')?.getAttribute('aria-busy')!=='true');}
  async function choice(container,key){const button=container.locator(`[data-archive-${key}]`);if(!await button.isVisible())await container.locator('[data-archive-selection-menu]').click();await button.click();}
  async function select(container){await container.locator('[data-archive-select-mode]').click();}
  async function openTools(){if(!await menu.isVisible())await manager.locator('[data-archive-options-toggle]').click();}
  async function layout(){const bounds=await manager.evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth,overflow:[...node.querySelectorAll('.trpg-archive-selection-tools,.trpg-archive-dock,.trpg-archive-row')].filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+2).map(n=>n.className)}));assert.ok(bounds.scroll<=bounds.width+2,JSON.stringify(bounds));assert.deepEqual(bounds.overflow,[]);}
  await load();await npc.locator('.trpg-archive-switch').first().click();await saved();const initial=await state();assert.equal(initial.character.length,48);
  await select(npc);assert.equal(await npc.locator('[data-archive-delete]').isDisabled(),true);await choice(npc,'select-page');
  const ids=await npc.locator('.trpg-archive-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.archiveId));
  await npc.locator('[data-pagination] button').last().click();const extra=await npc.locator('[data-archive-select]').first().getAttribute('data-archive-select');await npc.locator('[data-archive-select]').first().check();ids.push(extra);assert.match(await npc.locator('.trpg-archive-selected-count').innerText(),/21/);
  await npc.locator('[data-archive-selection-menu]').click();await layout();assert.equal(await npc.locator('[data-archive-delete]').evaluate(n=>getComputedStyle(n).color),'rgb(255, 182, 170)');await manager.screenshot({path:path.join(output,`npc-menu-${width}.png`)});
  accept=false;await choice(npc,'delete');assert.match(prompts.at(-1),/21/);assert.match(prompts.at(-1),/Six-Faced World/);assert.match(prompts.at(-1),/Undo/);assert.deepEqual((await state()).character,initial.character);assert.equal((await state()).persistCount,initial.persistCount);
  accept=true;await page.evaluate(()=>window.failSave=true);await choice(npc,'delete');await saved();assert.deepEqual((await state()).character,initial.character);assert.match(await npc.locator('.trpg-archive-selected-count').innerText(),/21/);assert.equal(await npc.locator('[data-archive-delete]').isDisabled(),false);
  await page.evaluate(()=>window.failSave=false);await choice(npc,'delete');await saved();const deleted=await state();assert.equal(deleted.persistCount,initial.persistCount+1);assert.deepEqual(deleted.character,initial.character.filter(n=>!ids.includes(n.id)));assert.deepEqual(deleted.local,initial.local);assert.deepEqual(deleted.lore,initial.lore);assert.equal(await npc.locator('[data-archive-undo]').evaluate(n=>n.hidden),true);assert.equal(await npc.locator('[data-archive-delete]').isDisabled(),true);
  await openTools();await menu.locator('[data-scope-select]').selectOption('chat');await npc.locator('[data-archive-filter=disabled]').click();await select(npc);await choice(npc,'select-results');const beforeChat=await state();await choice(npc,'delete');await saved();const afterChat=await state();assert.deepEqual(afterChat.character,beforeChat.character);assert.deepEqual(afterChat.local,beforeChat.local.filter(n=>n.enabled!==false));assert.equal(afterChat.persistCount,beforeChat.persistCount+1);assert.match(prompts.at(-1),/จาก แชต/);
  await manager.locator('[data-management-tab=lore]').click();await lore.locator('[data-archive-toggle]').first().click();await saved();const beforeLore=await state();await lore.locator('[data-archive-filter=disabled]').click();await select(lore);await choice(lore,'select-results');
  accept=false;await choice(lore,'delete');assert.match(prompts.at(-1),/Lore/);assert.match(prompts.at(-1),/ทุกแชท/);assert.deepEqual((await state()).lore,beforeLore.lore);
  accept=true;await page.evaluate(()=>window.failSave=true);await choice(lore,'delete');await saved();assert.deepEqual((await state()).lore,beforeLore.lore);assert.equal(await lore.locator('[data-archive-delete]').isDisabled(),false);
  await page.evaluate(()=>window.failSave=false);await choice(lore,'delete');await saved();const afterLore=await state();assert.deepEqual(afterLore.lore,beforeLore.lore.filter(item=>item.enabled));assert.equal(afterLore.persistCount,beforeLore.persistCount+1);assert.deepEqual(afterLore.character,beforeLore.character);assert.deepEqual(afterLore.local,beforeLore.local);assert.equal(await lore.locator('[data-archive-undo]').evaluate(n=>n.hidden),true);
  await lore.locator('[data-archive-filter=all]').click();await choice(lore,'select-results');await lore.locator('[data-lore-pagination] button').last().click();assert.match(await lore.locator('.trpg-archive-selected-count').innerText(),new RegExp(String(afterLore.lore.length)));
  await lore.locator('[data-archive-selection-menu]').click();await layout();await manager.screenshot({path:path.join(output,`lore-menu-${width}.png`)});await choice(lore,'delete');await saved();assert.deepEqual((await state()).lore,[]);assert.equal(await lore.locator('.trpg-lore-row').count(),0);assert.match(await lore.locator('[data-lore-pagination]').innerText(),/1\s*\/\s*1/);assert.equal(await lore.locator('[data-archive-delete]').isDisabled(),true);
  // Confirmation can run external hooks synchronously. Neither workspace may
  // apply the old selected IDs after the chat/card changes in that hook.
  for(const kind of ['npc','lore']){
   await load();const container=kind==='npc'?npc:lore;if(kind==='lore')await manager.locator('[data-management-tab=lore]').click();await select(container);await choice(container,'select-page');const before=await state();
   await page.evaluate(()=>{window.deleteCalls=0;for(const key of ['persistScope','persistLore']){const original=window.previewData[key];window.previewData[key]=(...args)=>{window.deleteCalls++;return original(...args);};}window.confirm=()=>{window.previewSwitch('another-card','another-chat');return true;};});
   await choice(container,'delete');await page.waitForFunction(()=>!document.querySelector('dialog.trpg-manager')?.open);assert.equal(await page.evaluate(()=>window.deleteCalls),0);const after=await state();assert.deepEqual(after.character,before.character);assert.deepEqual(after.local,before.local);
   await page.evaluate(({owner,chat})=>window.previewSwitch(owner,chat),before);assert.deepEqual((await state()).lore,before.lore);
  }
  // A late response after opening another chat cannot update that chat's UI.
  await load();await select(npc);await choice(npc,'select-page');const pendingBefore=await state();await page.evaluate(()=>window.deferSave=true);await choice(npc,'delete');await page.waitForFunction(()=>typeof window.finishSave==='function');await page.evaluate(()=>{window.previewSwitch('another-card','another-chat');window.finishSave();window.deferSave=false;});await page.waitForFunction(()=>!document.querySelector('dialog.trpg-manager')?.open);assert.deepEqual((await state()).character,pendingBefore.character);assert.equal((await state()).persistCount,pendingBefore.persistCount);
  // English labels use the same controls and confirmations.
  await page.goto(url+'?lang=en');await page.waitForFunction(()=>window.previewReady);await select(npc);await choice(npc,'select-page');accept=false;await choice(npc,'delete');assert.match(prompts.at(-1),/Delete 20 NPC records/);assert.match(prompts.at(-1),/cannot be undone/);assert.equal((await state()).character.length,48);
  assert.deepEqual(errors,[]);report.push({width,pass:true,languages:['th','en'],selectionAcrossPages:21});console.log(`PASS ${width}px: NPC/Lore bulk deletion, scope/filtered targets, cancel/retry, empty-page clamp, cleared Undo, stale confirmations/responses and mobile menu`);await page.close();
 }
 await writeFile(path.join(output,'validation.json'),JSON.stringify({version:JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')).version,testedAt:new Date().toISOString(),viewports:report,liveUserServerAccess:false,aiRequests:0},null,2)+'\n');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
