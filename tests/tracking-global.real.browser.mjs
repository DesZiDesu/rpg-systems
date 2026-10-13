// Native SillyTavern UI and server persistence. Use an isolated local dataRoot.
// Legacy fixtures use the real card/metadata APIs; no replacement host or model.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const base=process.env.ST_REAL_URL,folder=process.env.ST_TRACKING_ARTIFACTS||'/workspace/artifacts/tracking-global';
assert(base&&['127.0.0.1','localhost'].includes(new URL(base).hostname),'Set ST_REAL_URL to an isolated local SillyTavern server.');
const release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8')).version;
await mkdir(folder,{recursive:true});
const report={release,host:'Real SillyTavern frontend/server with isolated test data',browser:'Chromium mobile viewport and desktop',cases:[],errors:[],generation:[]};
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
async function ready(page){
 await page.waitForFunction(()=>window.SillyTavern?.getContext?.().addOneMessage&&document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation,{},{timeout:60000});
 await page.waitForFunction(()=>![...document.querySelectorAll('.popup')].some(p=>p.textContent.includes('Initializing')));
 assert.equal(await page.evaluate(()=>TretaresiaRelease),release);
}
async function reloadChat(page){
 const title=await page.evaluate(()=>{const ctx=SillyTavern.getContext();return ctx.characters[ctx.characterId]?.name;});
 await page.reload();await ready(page);
 // Native SillyTavern opens its landing chat on reload; reopen the same card.
 await selectCard(page,title);
 await page.waitForFunction(title=>{const ctx=SillyTavern.getContext();return !!ctx.getCurrentChatId()&&ctx.chat.some(m=>!m.is_user&&m.name===title)&&!!ctx.chatMetadata.tretaresia_rpg_state;},title);
 // The drawer mounts before CHAT_CHANGED completes. Wait for its chat controls.
 await page.waitForFunction(()=>{const ctx=SillyTavern.getContext(),systems=ctx.chatMetadata.roleforge_chat_presets?.config.systems;return systems&&document.getElementById('tretaresia-rpg-inject-state').checked===(systems.injectState??ctx.extensionSettings.tretaresia_rpg.injectState);});
}
async function createLegacyCards(page,titles){
 await page.evaluate(async titles=>{
  const ctx=SillyTavern.getContext(),{getCharacters}=await import('/script.js');
  for(const [index,title] of titles.entries()){
   if(!ctx.characters.some(c=>c.name===title)){
    const body=new FormData();body.set('ch_name',title);body.set('description','Local tracking preference test');body.set('first_mes','Welcome to the local tracking test.');body.set('fav','false');
    const created=await fetch('/api/characters/create',{method:'POST',headers:ctx.getRequestHeaders({omitContentType:true}),body});if(!created.ok)throw Error('Test card creation failed.');await getCharacters();
   }
   const card=ctx.characters.find(c=>c.name===title);
   const response=await fetch('/api/characters/merge-attributes',{method:'POST',headers:ctx.getRequestHeaders(),body:JSON.stringify({avatar:card.avatar,data:{extensions:{roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:index!==0,showSceneTracker:index!==0}}}}})});
   if(!response.ok)throw Error('Legacy card fixture save failed.');
  }
  await getCharacters();
 },titles);
}
async function selectCard(page,title){
 if(!await page.locator('#right-nav-panel').isVisible())await page.locator('#rightNavDrawerIcon').click();
 await page.locator('#right-nav-panel').waitFor({state:'visible'});await page.locator('#rm_button_characters').click();
 const card=page.locator('.character_select').filter({hasText:title}).first();await card.scrollIntoViewIfNeeded();await card.click();
 await page.waitForFunction(title=>{const ctx=SillyTavern.getContext();return !!ctx.getCurrentChatId()&&ctx.chat.some(m=>!m.is_user&&m.name===title);},title);
 await page.waitForTimeout(700);
}
async function tracking(page){
 if(!await page.locator('#rm_extensions_block').isVisible()){await page.locator('#extensions-settings-button').click();await page.locator('#rm_extensions_block').waitFor({state:'visible'});await page.waitForTimeout(200);}
 if(!await page.locator('#tretaresia-rpg-settings .inline-drawer-content').isVisible()){await page.locator('#tretaresia-rpg-settings .inline-drawer-toggle').click();await page.locator('#tretaresia-rpg-settings .inline-drawer-content').waitFor({state:'visible'});}
 await page.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.open('tracking',{direct:true}));
 return page.locator('#tretaresia-rpg-auto-track');
}
async function settingSave(page,action){const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/settings/save'&&r.status()===200);await action();await saved;}
async function seedLegacyChat(page,on){
 await page.evaluate(async on=>{const ctx=SillyTavern.getContext();ctx.chatMetadata.roleforge_chat_presets={version:1,config:{systems:{autoTrack:on,injectState:on}}};await ctx.saveMetadata();},on);
 // Read the fixture through the normal CHAT_CHANGED/initialization path.
 await reloadChat(page);
}
async function progress(page){return page.evaluate(()=>{const s=SillyTavern.getContext().chatMetadata.tretaresia_rpg_state;return s?JSON.stringify({player:s.player,currency:s.progression.currency}):null;});}
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/\/api\/.*\/generate(?:\?|$)/.test(r.url()))report.generation.push(r.url());});
  await page.route('**/api/horde/text-models',r=>r.fulfill({json:[]}));await page.route('**/api/horde/status',r=>r.fulfill({json:{ok:false}}));
  await page.goto(base);await ready(page);report.sillyTavern||=await (await page.request.get(new URL('/version',base).href)).json();
  const titles=[`RoleForge Tracking Legacy A ${width}`,`RoleForge Tracking Legacy B ${width}`];await createLegacyCards(page,titles);
  await selectCard(page,titles[0]);await seedLegacyChat(page,false);
  // A profile with no saved tracking choice starts on, even with an old off preset.
  await settingSave(page,()=>page.evaluate(()=>{const ctx=SillyTavern.getContext();delete ctx.extensionSettings.tretaresia_rpg.autoTrack;ctx.saveSettingsDebounced();}));
  await reloadChat(page);assert.equal(await (await tracking(page)).isChecked(),true);assert.equal(await page.locator('#tretaresia-rpg-inject-state').isChecked(),false);
  const beforeA=await progress(page);assert.ok(beforeA,'Native chat initialization keeps RPG state.');
  await settingSave(page,async()=>{await (await tracking(page)).uncheck();});assert.equal(await page.evaluate(()=>SillyTavern.getContext().extensionSettings.tretaresia_rpg.autoTrack),false);
  assert.equal(await progress(page),beforeA,'Changing the preference keeps RPG progress.');
  await selectCard(page,titles[1]);await seedLegacyChat(page,true);assert.equal(await (await tracking(page)).isChecked(),false,'Global off overrides a legacy card/chat on flag');assert.equal(await page.locator('#tretaresia-rpg-inject-state').isChecked(),true);
  const beforeB=await progress(page);await reloadChat(page);assert.equal(await (await tracking(page)).isChecked(),false,'Global off survives a real server reload');
  await settingSave(page,async()=>{await (await tracking(page)).check();});assert.equal(await progress(page),beforeB);
  await selectCard(page,titles[0]);assert.equal(await (await tracking(page)).isChecked(),true,'Switching back to the legacy off chat keeps tracking on');assert.equal(await progress(page),beforeA);
  await reloadChat(page);assert.equal(await (await tracking(page)).isChecked(),true,'Global on survives a real server reload');assert.equal(await page.locator('#tretaresia-rpg-inject-state').isChecked(),false,'World settings remain separate');
  const root=page.locator('#tretaresia-rpg-settings'),fit=await root.evaluate(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,viewport:innerWidth,overflow:n.scrollWidth-n.clientWidth}));assert.ok(fit.left>=-1&&fit.right<=fit.viewport+1&&fit.overflow<=1,JSON.stringify(fit));
  await page.locator('#roleforge-auto-track-scope').scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/${width===390?'mobile':'pc'}.png`});
  report.cases.push({width,defaultOn:true,legacyOffIgnored:true,globalOffAcrossCardsAndReload:true,globalOnAcrossCardsAndReload:true,chatProgressPreserved:true,worldSettingsRemainPerChat:true,fit});await page.close();console.log(`PASS global tracking ${width}px`);
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.generation,[],'Preference changes do not call AI.');report.success=true;await writeFile(`${folder}/validation.json`,JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
