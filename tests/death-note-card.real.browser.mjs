// Import the delivered single-file card in fresh browsers on actual SillyTavern.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {cardPng} from '../cards/death-note-rpg/tools/png-card.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base='http://127.0.0.1:18182',prefix='/scripts/extensions/third-party/rpg-systems/',out='/workspace/artifacts/death-note-rpg/native';
const cardFile=process.env.DN_CARD_FILE||'/workspace/artifacts/death-note-rpg/download/Death-Note-RPG.json';
const card=JSON.parse(await readFile('/workspace/artifacts/death-note-rpg/download/Death-Note-RPG.json'));
const version=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const report={version,host:'SillyTavern 1.19.0',devices:[],errors:[],providerRequests:0};let page;
async function ready(){
 await page.waitForFunction(()=>globalThis.RoleForgeWorkshop&&globalThis.RoleForgeCampaigns,{},{timeout:120000});
 await page.evaluate(()=>{window.__loaded=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>{window.__loaded=true;});});
 const done=page.waitForFunction(()=>__loaded,{},{timeout:120000}),welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');await Promise.race([done,welcome.click({timeout:120000}).then(()=>done)]);
 await page.evaluate(async prefix=>{window.__rf=await import(prefix+'index.js?v='+TretaresiaRelease);},prefix);
}
async function select(title){await page.evaluate(async title=>{const h=await import('/script.js');await h.getCharacters();const c=SillyTavern.getContext();await h.selectCharacterById(String(c.characters.findIndex(n=>n.name===title)));},title);await page.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));await page.evaluate(()=>RoleForgeWorkshop.ready());}
async function importCard(title){
 const copy=structuredClone(card);copy.data.name=title;const file=out+'/import-'+(cardFile.endsWith('.png')?'png.png':'json.json');await writeFile(file,cardFile.endsWith('.png')?cardPng(await readFile(cardFile),copy):JSON.stringify(copy));
 await page.evaluate(()=>{const i=document.createElement('input');i.type='file';i.id='rf-card-upload';i.hidden=true;document.body.append(i);});await page.locator('#rf-card-upload').setInputFiles(file);
 await page.evaluate(async({title,isPng})=>{const c=SillyTavern.getContext(),file=document.getElementById('rf-card-upload').files[0],f=new FormData();f.set('file_type',isPng?'png':'json');f.set('avatar',file);const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),result=await r.json();if(!r.ok||result.error)throw Error('Import failed: '+JSON.stringify(result));window.__cardAvatar=result.file_name;const h=await import('/script.js');await h.getCharacters();const row=c.characters.find(n=>n.avatar===result.file_name||n.avatar===result.file_name+'.png');if(!row)throw Error('Imported avatar not found '+result.file_name);window.__originalCardName=row.name;window.__testCardTitle=row.name;}, {title,isPng:cardFile.endsWith('.png')});
 const name=await page.evaluate(()=>__testCardTitle);await select(name);return name;
}
async function shot(name){await page.evaluate(()=>{toastr.clear();document.activeElement?.blur();});await page.screenshot({path:out+'/'+name+'.png'});}
try{
 for(const mobile of [false,true]){
  const device=mobile?'mobile':'desktop',context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
  await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));await context.route('**/api/backends/**/generate',r=>{report.providerRequests++;return r.abort();});
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base);await ready();await page.selectOption('#themes','Dark Lite',{force:true});await page.selectOption('#tretaresia-rpg-language',mobile?'th':'en',{force:true});
  console.log('Importing single card',device);const title=await importCard('DN card '+device+' '+Date.now());
  await page.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled,{},{timeout:45000});
  assert.deepEqual((await page.evaluate(()=>RoleForgeWorkshop.snapshot())).profile.enabled,['death-note']);
  assert.equal(await page.evaluate(()=>RoleForgeDeathNote.debug().owned),false);
  const diag=await page.evaluate(()=>__rf.archiveDiagnostics());report.devices.push({device,diagnostics:diag});console.log('Archive ready',device,JSON.stringify(diag));
  await page.evaluate(()=>RoleForgeCampaigns.open());const dialog=page.locator('#roleforge-card-campaign');await dialog.waitFor({state:'visible'});await shot(device+'-campaign');
  assert.equal(await dialog.locator('select[name=route] option').count(),13);
  await dialog.locator('[name=route]').selectOption(mobile?'jp-films':'anime');await dialog.locator('[type=submit]').click();await dialog.waitFor({state:'hidden'});
  const state=await page.evaluate(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state);
  assert.equal(state.storyMissions.flags['["death-note-rpg","continuity"]'],mobile?'jp-films':'anime');assert.equal(state.storyMissions.flags['["death-note-rpg","mode"]'],'canon');
  assert.equal(state.npcScopes.overrides['dn-light-yagami'].activeAlternateId,mobile?'jp-films-opening':'anime-opening');assert.equal(state.inventory.length,0);
  // Independent production Worker reads the same pinned portable archive.
  const assets=await page.evaluate(async prefix=>{
   const {createWorldPackClient}=await import(prefix+'src/world-pack-client.js?v='+TretaresiaRelease),client=createWorldPackClient(),c=SillyTavern.getContext(),card=c.characters[c.characterId],catalog=await client.open('card:'+card.avatar,card.data.extensions.roleforge_world_archive);
   const ids=['dn-light-yagami','dn-l','dn-beyond-birthday','dn-misa-amane'],people=await catalog.load(ids);
   const {embeddedPortraitBlob}=await import(prefix+'src/embedded-portrait.js?v='+TretaresiaRelease);
   const result={count:catalog.size,portraitValid:people.slice(0,2).every(n=>embeddedPortraitBlob(n.portraitImage)?.size>0),beyond:Boolean(people.find(n=>n.id==='dn-beyond-birthday')),storyCount:catalog.storySummaries.length};
   window.__catalog=catalog;window.__cardClient=client;return result;
  },prefix);
  assert(assets.portraitValid);assert(assets.beyond);assert.equal(assets.storyCount,146);
  await page.evaluate(()=>RoleForgeCampaigns.open());assert(await dialog.locator('[name=route]').isDisabled());await dialog.locator('[data-campaign-close]').click();
  // Authoring view uses the real portable raster files. Explicitly disable name
  // concealment for a screenshot, then re-enable; this is a test-only user choice.
  await page.evaluate(()=>RoleForgeWorkshop.open('chat'));const ws=page.locator('#roleforge-workshop');await ws.locator('[data-ws-enable=death-note]').uncheck();await page.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);await ws.locator('[data-ws-action=close]').click();
  await page.locator('#tretaresia-npc-wand-launcher').evaluate(n=>n.click());const manager=page.locator('dialog.trpg-manager[open]');await manager.waitFor();
  await manager.locator('[data-archive-options-toggle]').click();await manager.locator('[data-scope-select]').selectOption('character');
  await shot(device+'-characters');await manager.locator('[data-search]').fill('Light Yagami');await manager.locator('[data-archive-id="dn-light-yagami"] .trpg-person').click();
  await manager.locator('.trpg-photo').waitFor({state:'visible'});assert(await manager.locator('.trpg-photo').evaluate(i=>i.complete&&i.naturalWidth>0));await shot(device+'-portrait');await manager.evaluate(d=>d.close());
  await page.reload();await ready();await select(title);assert(!(await page.evaluate(()=>RoleForgeWorkshop.snapshot())).profile.enabled.includes('death-note'),'explicit disable survives card-default reload');
  const after=await page.evaluate(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state);assert.equal(after.storyMissions.flags['["death-note-rpg","continuity"]'],mobile?'jp-films':'anime');
  assert.equal(after.npcScopes.overrides['dn-light-yagami'].activeAlternateId,mobile?'jp-films-opening':'anime-opening');
  const route=mobile?'jp-films':'anime';
  await page.evaluate(async({route})=>{
   const c=SillyTavern.getContext();c.chatMetadata.tretaresia_rpg_state.onboarding={identitySeeded:true,locationSeeded:true,loadoutSeeded:true};c.chatMetadata.tretaresia_rpg_state.player.name='Test investigator';
   const quote='A young student finds a strange black notebook on the school grounds.',patch={ops:[],storyEvents:[{action:'trigger',templateId:route+'-01',eventId:'chapter-context',evidence:quote}]},mes='<tr-narrative>'+quote+'</tr-narrative>\n<!--tretaresia_patch:'+JSON.stringify(patch)+'-->';
   c.chat.push({name:'Test investigator',is_user:true,mes:'I watch the school grounds.',extra:{}});c.addOneMessage(c.chat.at(-1));
   window.__fixtureMessage=c.chat.length;c.chat.push({name:c.name2,is_user:false,mes,extra:{}});c.addOneMessage(c.chat.at(-1));await c.eventSource.emit(c.eventTypes.MESSAGE_RECEIVED,__fixtureMessage,'normal');await c.eventSource.emit(c.eventTypes.CHARACTER_MESSAGE_RENDERED,__fixtureMessage);
  },{route});
  await page.waitForFunction(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.storyMissions.instances.length>0);
  const missions=await page.evaluate(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.storyMissions.instances);
  assert.equal(missions.length,1);assert.equal(missions[0].templateId,route+'-01');assert.equal(missions[0].status,'Offered');
  report.devices.at(-1).checks={singleFileImport:true,emptyBrowserAddonBootstrap:true,noFreeBook:true,thirteenRoutes:true,exclusiveSavedContinuity:true,selectedNpcVersions:true,embeddedPortraits:true,beyondBirthday:true,storyTemplates:146,explicitDisableSurvivesReload:true,routeAndNpcVersionsPersist:true,completedReplyOffersOnlySelectedRoute:true};
  console.log('PASS Death Note RPG card',device);await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.providerRequests,0);report.pass=true;
}catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;if(page&&!page.isClosed())await shot('failed').catch(()=>{});}
finally{await writeFile(out+'/'+(cardFile.endsWith('.png')?'png-validation.json':'validation.json'),JSON.stringify(report,null,2));await browser.close();}
