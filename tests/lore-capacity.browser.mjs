// Production loader, archive persistence and one-card reimport in a controlled
// SillyTavern host. No user server or model connection is accessed.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {uiText} from '../src/ui-language.js';
import {parseLoreFile,mergeLore,LORE_FILE_LIMIT} from '../src/lore-transfer.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/',output=new URL('../docs/previews/lore-capacity/',import.meta.url);
await mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const file=new URL(req.url,'http://localhost').pathname;
 if(file.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!file.startsWith(base)||file.includes('..')){res.writeHead(404).end();return;}
 const name=file.slice(base.length);res.setHeader('content-type',name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':name.endsWith('.json')?'application/json':name.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(await readFile(new URL(name,root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`,results=[];
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:width===320?700:width===390?844:960},hasTouch:width<650}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await page.route('https://**/*',route=>route.abort());
  await page.addInitScript(()=>localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',autoContinuity:false,autoTrack:false,enableMemorySummaries:false}})));
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
  await page.evaluate(async()=>{
   document.querySelector('#tretaresia-rpg-close')?.click();document.querySelector('.preview-host').style.display='none';document.querySelector('#extensions_settings2').style.display='block';document.querySelector('#tretaresia-rpg-settings .inline-drawer-content').style.display='block';
   const lore=Array.from({length:2500},(_,i)=>({id:`world-${i}`,title:`World entry ${i}`,content:`Established fact ${i}`,enabled:false,keywords:[],always:false}));
   const data={name:'Large Lore fixture',extensions:{tretaresia_rpg_lore:lore,roleforge_character_pack:{format:'roleforge-character-pack',version:1,loreOptions:{mode:'relevant',budget:3000,entryLimit:0}}}};
   window.host.characters=[{avatar:'large-lore.png',name:data.name,data,json_data:JSON.stringify({spec:'chara_card_v2',spec_version:'2.0',data})}];window.host.characterId=0;window.host.groupId=null;window.cardRequests=[];
   window.host.fetch=async(url,options)=>{window.cardRequests.push(JSON.parse(options.body));return{ok:true,status:200};};
   await window.hStatsPreview.switchChat('large-lore',{});document.querySelectorAll('#tretaresia-rpg-settings details').forEach(node=>node.open=true);
  });
  const manager=page.locator('dialog.trpg-manager'),lore=manager.locator('[data-lore-panel]'),menu=manager.locator('[data-archive-menu]');
  const data=()=>page.evaluate(()=>window.host.characters[window.host.characterId].data.extensions.tretaresia_rpg_lore);
  async function open(){await page.locator('#tretaresia-rpg-settings [data-trpg-open]').click();await manager.waitFor({state:'visible'});await manager.locator('[data-management-tab=lore]').click();}
  async function saved(){await page.waitForFunction(()=>document.querySelector('dialog.trpg-manager')?.getAttribute('aria-busy')!=='true'&&document.querySelector('[data-lore-panel]')?.getAttribute('aria-busy')!=='true');}
  async function tools(){if(!await menu.isVisible())await manager.locator('[data-archive-options-toggle]').click();}
  async function closeTools(){if(await menu.isVisible())await menu.locator('[data-archive-menu-close]').click();}
  async function preferences(){await tools();if(!await menu.locator('[data-lore-preferences]').evaluate(n=>n.open))await menu.locator('[data-lore-preferences] summary').click();}
  async function setLimit(value){await preferences();await menu.locator('[name=loreCapacity]').selectOption(value?'limited':'unlimited');if(value)await menu.locator('[name=loreEntryLimit]').fill(String(value));await menu.getByRole('button',{name:'Save Lore settings',exact:true}).click();await saved();}
  async function create(){await tools();await menu.getByRole('button',{name:uiText('＋ สร้าง Lore ใหม่',[],'en'),exact:true}).click();await lore.locator('[name=loreTitle]').fill('New large world fact');await lore.locator('[name=loreContent]').fill('A fact added beyond the former 200-entry limit.');}
  async function back(){await lore.getByRole('button',{name:uiText('กลับรายการ',[],'en'),exact:true}).click();}
  async function submit(){await lore.locator('.trpg-lore-editor button[type=submit]').click();await saved();}
  await open();assert.match(await lore.locator('[data-archive-filter=all]').innerText(),/2500/);assert.equal(await lore.locator('.trpg-lore-row').count(),20);
  await setLimit(200);assert.equal((await data()).length,2500);await closeTools();
  await lore.locator('[data-lore-search]').fill('World entry 2499');await lore.locator('.trpg-lore-title').click();await lore.locator('[name=loreContent]').fill('Updated final world fact');await submit();
  assert.equal((await data()).at(-1).content,'Updated final world fact');assert.equal((await data()).length,2500);
  const before=await page.evaluate(()=>window.cardRequests.length);await create();await submit();assert.match(await manager.locator('[role=status]').innerText(),/200/);assert.equal(await page.evaluate(()=>window.cardRequests.length),before);assert.equal((await data()).length,2500);
  await back();await setLimit(0);await closeTools();await create();await submit();assert.equal((await data()).length,2501);assert.equal((await data()).at(-1).title,'New large world fact');
  await setLimit(3000);assert.equal(await menu.locator('[name=loreCapacity]').inputValue(),'limited');assert.equal(await menu.locator('[name=loreEntryLimit]').inputValue(),'3000');
  const bounds=await menu.evaluate(node=>{const body=node.querySelector('.trpg-archive-options-body');return{scroll:body.scrollWidth,width:body.clientWidth};});assert.ok(bounds.scroll<=bounds.width+2);
  await menu.locator('[name=loreCapacity]').scrollIntoViewIfNeeded();await manager.screenshot({path:new URL(`settings-${width}.png`,output).pathname});
  await closeTools();await manager.locator('[data-close]').click();
  const pack=page.locator('#roleforge-character-pack');await pack.locator('[data-pack-save]').click();await page.waitForFunction(()=>document.querySelector('[data-pack-status]').textContent.includes('Saved.'));
  assert.equal(await page.evaluate(()=>window.host.characters[0].data.extensions.roleforge_character_pack.loreOptions.entryLimit),3000);
  const exported=await page.evaluate(()=>window.host.characters[0].json_data);
  await page.evaluate(async json=>{const card=JSON.parse(json);window.host.characters.push({avatar:'large-reimported.png',name:card.data.name,data:card.data,json_data:json});window.host.characterId=1;await window.hStatsPreview.switchChat('large-reimported',{});document.querySelectorAll('#tretaresia-rpg-settings details').forEach(node=>node.open=true);},exported);
  await open();assert.match(await lore.locator('[data-archive-filter=all]').innerText(),/2501/);await preferences();assert.equal(await menu.locator('[name=loreEntryLimit]').inputValue(),'3000');await closeTools();
  await lore.locator('[data-lore-search]').fill('New large world fact');await lore.locator('.trpg-lore-title').click();assert.match(await lore.locator('[name=loreContent]').inputValue(),/former 200-entry/);await back();
  if(width===390){
   await manager.locator('[data-close]').click();await page.evaluate(()=>{window.host.characters[1].data.extensions.tretaresia_rpg_lore=Array.from({length:400},(_,i)=>({id:`unicode-${i}`,title:`ข้อมูล ${i}`,content:'ก'.repeat(12000),enabled:false,keywords:['world'],always:i%2===0}));});
   await open();await tools();await menu.getByRole('button',{name:'Export JSON',exact:true}).click();await saved();const buttons=menu.getByRole('button',{name:/Download Lore part/});assert.equal(await buttons.count(),2);
   let restored=[];for(let index=0;index<2;index++){const event=page.waitForEvent('download');await buttons.nth(index).click();const download=await event,bytes=await readFile(await download.path());assert.ok(bytes.length<=LORE_FILE_LIMIT);assert.match(download.suggestedFilename(),/-of-2\.json$/);restored=mergeLore(restored,parseLoreFile(bytes.toString('utf8'))).entries;}
   assert.equal(restored.length,400);assert.equal(restored.at(-1).title,'ข้อมูล 399');assert.ok(restored.every(item=>item.content.length===12000));
   await buttons.last().scrollIntoViewIfNeeded();await manager.screenshot({path:new URL('export-parts-390.png',output).pathname});
  }
  assert.deepEqual(errors,[]);results.push({width,records:2501,pass:true});console.log(`PASS ${width}px: 2,500-card Lore, lower-limit edits and blocked growth, unlimited creation, preset/card reimport, settings fit${width===390?', split-file downloads and round trip':''}`);await page.close();
 }
 await writeFile(new URL('validation.json',output),JSON.stringify({version:JSON.parse(await readFile(new URL('manifest.json',root),'utf8')).version,testedAt:new Date().toISOString(),viewports:results,liveUserServerAccess:false,aiRequests:0},null,2)+'\n');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
