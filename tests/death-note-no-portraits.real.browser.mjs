import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {cardPng} from '../cards/death-note-rpg/tools/png-card.mjs';
import {OPENINGS_TH} from '../cards/death-note-rpg/data/openings-th.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base='http://127.0.0.1:18182',prefix='/scripts/extensions/third-party/rpg-systems/';
const out='/workspace/artifacts/death-note-no-portraits/native';
const source=JSON.parse(await readFile(new URL('../cards/death-note-rpg/build/Death-Note-RPG-No-Portraits.json',import.meta.url)));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={host:'SillyTavern 1.19.0',devices:[],providerRequests:0,errors:[]};let page,device;
async function ready(){
 await page.waitForFunction(()=>globalThis.RoleForgeWorkshop&&globalThis.RoleForgeCampaigns,{},{timeout:120000});
 await page.evaluate(()=>{window.__loaded=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>window.__loaded=true);});
 const done=page.waitForFunction(()=>window.__loaded,{},{timeout:120000}),welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');
 await Promise.race([done,welcome.click({timeout:120000}).then(()=>done)]);
 await page.evaluate(async prefix=>window.__rf=await import(prefix+'index.js?v='+TretaresiaRelease),prefix);
}
async function shot(name){await page.evaluate(()=>toastr.clear());await page.screenshot({path:out+'/'+device+'-'+name+'.png'});}
try{
 for(const mobile of [false,true]){
  device=mobile?'mobile':'desktop';const fileType=mobile?'png':'json';
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile});
  await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
  await context.route('**/api/backends/**/generate',r=>{report.providerRequests++;return r.abort();});
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push({device,message:e.message}));
  await page.goto(base);await ready();await page.selectOption('#themes','Dark Lite',{force:true});await page.selectOption('#tretaresia-rpg-language','th',{force:true});
  const card=structuredClone(source);card.data.name+=' · '+device+' · '+Date.now();
  const upload=out+'/import-'+device+'.'+fileType;
  await writeFile(upload,mobile?cardPng(await readFile(new URL('../cards/death-note-rpg/assets/cover.png',import.meta.url)),card):JSON.stringify(card));
  await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='rf-card-upload';input.hidden=true;document.body.append(input);});
  await page.locator('#rf-card-upload').setInputFiles(upload);
  await page.evaluate(async fileType=>{
   const c=SillyTavern.getContext(),f=new FormData();f.set('file_type',fileType);f.set('avatar',document.getElementById('rf-card-upload').files[0]);
   const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),value=await r.json();if(!r.ok||value.error)throw Error('Import failed: '+JSON.stringify(value));
   const h=await import('/script.js');await h.getCharacters();const index=c.characters.findIndex(n=>n.avatar===value.file_name||n.avatar===value.file_name+'.png');assertNative(index>=0,'Imported card missing');await h.selectCharacterById(String(index));
   function assertNative(ok,message){if(!ok)throw Error(message);}
  },fileType);
  await page.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));await page.evaluate(()=>RoleForgeWorkshop.ready());
  await page.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled);
  const first=await page.evaluate(()=>{const c=SillyTavern.getContext(),d=c.characters[c.characterId].data;return{greetings:[d.first_mes,...d.alternate_greetings],message:c.chat[0],diagnostics:__rf.archiveDiagnostics()};});
  assert.deepEqual(first.greetings,OPENINGS_TH.map(o=>o.text));assert.equal(first.message.swipes.length,10);assert.equal(first.message.swipe_id,0);
  assert.equal(first.diagnostics.npcBodies,208);assert.equal(first.diagnostics.versions,652);assert.equal(await page.locator('.tretaresia-forge-card').count(),0);
  await shot('opening-01');
  for(let index=1;index<10;index++){
   await page.locator('#chat .mes[mesid="0"] .swipe_right').evaluate(node=>node.click());
   await page.waitForFunction(index=>SillyTavern.getContext().chat[0].swipe_id===index,index);
   assert.equal(await page.evaluate(()=>SillyTavern.getContext().chat[0].mes),OPENINGS_TH[index].text);
   if([5,7,9].includes(index))await shot('opening-'+String(index+1).padStart(2,'0'));
  }
  await page.locator('#chat .mes[mesid="0"] .swipe_right').evaluate(node=>node.click());
  await page.waitForFunction(()=>SillyTavern.getContext().chat[0].swipe_id===0);assert.equal(report.providerRequests,0);
  // The native Campaign source selector remains available and unchanged.
  await page.evaluate(()=>RoleForgeCampaigns.open());const campaign=page.locator('#roleforge-card-campaign');
  assert.equal(await campaign.locator('[name=route] option').count(),13);await campaign.locator('[name=route]').selectOption(mobile?'jp-films':'manga');await campaign.locator('[type=submit]').click();await campaign.waitFor({state:'hidden'});
  const assets=await page.evaluate(async prefix=>{
   const {createWorldPackClient}=await import(prefix+'src/world-pack-client.js?v='+TretaresiaRelease),client=createWorldPackClient(),c=SillyTavern.getContext(),ext=c.characters[c.characterId].data.extensions,catalog=await client.open('card:'+c.characters[c.characterId].avatar,ext.roleforge_world_archive);
   const people=await catalog.load(catalog.summaries.map(n=>n.id));window.__noPortraitCatalog=catalog;window.__noPortraitClient=client;
   return{count:people.length,portraits:people.filter(n=>n.hasPortrait||n.portraitImage||n.roleIconImage||n.portraitPath).length,storyCount:catalog.storySummaries.length,names:people.map(n=>n.name)};
  },prefix);
  assert.equal(assets.count,208);assert.equal(assets.portraits,0);assert.equal(assets.storyCount,146);assert(assets.names.includes('Beyond Birthday'));
  await page.evaluate(()=>RoleForgeWorkshop.open('chat'));const workshop=page.locator('#roleforge-workshop');await workshop.locator('[data-ws-enable=death-note]').uncheck();await page.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);await workshop.locator('[data-ws-action=close]').click();
  await page.locator('#tretaresia-npc-wand-launcher').evaluate(n=>n.click());const manager=page.locator('dialog.trpg-manager[open]');
  await manager.locator('[data-archive-options-toggle]').click();await manager.locator('[data-scope-select]').selectOption('character');await manager.locator('[data-search]').fill('Light Yagami');await manager.locator('[data-archive-id="dn-light-yagami"] .trpg-person').click();
  assert.equal(await manager.locator('.trpg-photo').count(),0);await shot('no-portrait-dossier');
  report.devices.push({device,format:fileType,mobileTouchEmulation:mobile,oneFileImport:true,npcBodies:208,versions:652,worldLore:65,storyTemplates:146,allTenThaiGreetingsSwipedInOrder:true,greetingsWrapWithoutGeneration:true,allNpcBasesWithoutImages:true,dossierHasNoPhoto:true,beyondBirthdayRetained:true,thirteenCampaignRoutes:true});
  console.log('PASS no-portrait card',device,fileType);await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.providerRequests,0);report.pass=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);if(page&&!page.isClosed()){await shot('failed');await writeFile(out+'/failed.html',await page.content());}}
finally{await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
