// Production loader, real memory IndexedDB, controlled host generation, and a
// complete native new-chat handoff. No external model requests are made.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{
 try {const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));
  res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':/\.(m?js)$/.test(path)?'text/javascript':'image/webp');res.end(body);
 } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const artifacts='/workspace/artifacts/smart-memory-continuity';await mkdir(artifacts,{recursive:true});
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]) {
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-navigation-summary.html?lang=en&review=1`);
  await page.waitForFunction(()=>window.navigationSummaryPreview?.ready);
  await page.evaluate(()=>{
   window.smartCalls=[];
   window.host.generateQuietPrompt=async({quietPrompt,responseLength})=>{
    const batch=JSON.parse(quietPrompt.split('SOURCE SEGMENTS: ')[1]),source=batch[0],focus=quietPrompt.match(/extracts ONLY category (\w+)/)?.[1];
    const categories=focus?[focus]:['scene','locations','places','relations','characters','missions','quests','chapters','keywords','story','resources','lore','timeline','preferences','other'];
    window.smartCalls.push({focus:focus||'combined',responseLength});
    const prior=JSON.parse(quietPrompt.split('PRIOR FACT IDS (historical, may be incomplete): ')[1].split('\nPRIOR CONTINUITY RECAP')[0]);
    const previousLore=prior.find(fact=>fact.category==='lore');
    return JSON.stringify({summary:'A fishing trip and a meeting at the river.',recap:'Nova met Cora while fishing by the river at night.',events:categories.map(category=>({category,title:`${category}: river memory`,detail:source.text,kind:'Event',people:[source.name],places:['Moonlit River'],keywords:['river','fishing'],knownBy:[source.name],sourceKeys:[source.segmentKey],evidence:source.text.slice(0,90),speaker:source.name,quote:category==='keywords'?source.text.slice(0,90):'',importance:'High',status:category==='relations'?'Active':'Historical',threadKey:category==='relations'?'Nova river return':'',threadType:'Promise',timeline:{frame:category==='timeline'?'Flashback':'Current',day:category==='timeline'?2:null},visibility:category==='keywords'?'Private':'Unknown',knowledge:category==='keywords'?[{person:source.name,method:'Witnessed',sourceKeys:[source.segmentKey],evidence:source.text.slice(0,90)}]:[],topicKey:category==='lore'?'river rule':category==='preferences'?'Nova fishing preference':'',change:focus==='lore'&&previousLore?{type:'Correction',targets:[previousLore.id],reason:'The later visit clarified the rule'}:undefined}))});
   };
  });
  await page.evaluate(()=>window.navigationSummaryPreview.open('summaries'));
  let panel=page.locator('[data-memory-addons-panel]');
  await panel.locator('.rf-memory-settings>summary').click();
  await panel.locator('[name="memorySummaryStrategy"]').selectOption('single');
  await panel.locator('[name="memorySummaryOutputTokens"]').fill('4000');
  await panel.locator('[data-memory-settings-group="api"] [type="submit"]').click();
  await panel.locator('[data-action="memory-summary-run"]').click();
  await panel.locator('.rf-memory-job[data-status="ready"]').waitFor();
  assert.equal(await page.evaluate(()=>window.smartCalls.length),1);
  assert.equal(await page.evaluate(()=>window.smartCalls[0].responseLength),4000);
  await panel.locator('.rf-memory-atlas>summary').click();
  assert.equal(await panel.locator('.rf-memory-atlas [data-memory-section^="category:"]').count(),15);
  await panel.locator('[data-memory-section="category:keywords"]>summary').click();
  assert.match(await panel.locator('[data-memory-section="category:keywords"] blockquote').innerText(),/Nova/);
  await panel.locator('[data-memory-section="job"]>summary').click();
  assert.match(await panel.locator('[data-memory-api-calls]').innerText(),/1/);
  await panel.locator('.rf-memory-atlas').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${artifacts}/memory-atlas-${width}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.evaluate(()=>window.host.chat.push({is_user:true,name:'Nova',mes:'Nova visits the village market.'},{is_user:false,name:'Cora',mes:'Cora walks to the village market with Nova.'}));
  if (!await panel.locator('[name="memorySummaryStrategy"]').isVisible()) await panel.locator('.rf-memory-settings>summary').click();
  await panel.locator('[name="memorySummaryStrategy"]').selectOption('categories');
  await panel.locator('[data-memory-settings-group="api"] [type="submit"]').click();
  await panel.locator('[data-action="memory-summary-run"]').click();
  await panel.locator('.rf-memory-job[data-status="ready"]').waitFor();
  assert.equal(await page.evaluate(()=>window.smartCalls.length),16);
  assert.deepEqual(await page.evaluate(()=>window.smartCalls.slice(1).map(call=>call.focus)),['scene','locations','places','relations','characters','missions','quests','chapters','keywords','story','resources','lore','timeline','preferences','other']);
  await panel.locator('.rf-memory-insights>summary').click();
  for(const name of ['threads','timeline','knowledge','changes']) {
   const group=panel.locator(`[data-memory-section="insight:${name}"]`);
   await group.locator(':scope>summary').click();
   assert(await group.locator('.rf-memory-fact').count()>0,`${name} has linked production records`);
   if(name==='timeline')assert.match(await group.innerText(),/Day 2|Flashback/);
   if(name==='changes'){await group.locator('details>summary').first().click();assert.match(await group.innerText(),/Linked correction/);}
   await group.locator(':scope>summary').click();
  }
  await panel.locator('[data-memory-section="insight:threads"]>summary').click();
  const thread=panel.locator('[data-memory-section="insight:threads"] details').first();
  await thread.locator(':scope>summary').click();
  await thread.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${artifacts}/smart-insights-${width}.png`});
  await thread.locator('[data-action="memory-summary-force"]').first().click();
  assert.equal(await page.evaluate(()=>window.smartCalls.length),16,'local views and prioritization make no extra AI calls');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  // Force the full-state fallback store, while native chat metadata stays usable.
  await page.evaluate(()=>{
   const media=new Map(),oldChat=window.host.getCurrentChatId();window.fullMedia=media;window.oldFullChat=oldChat;
   window.SillyTavern.libs.localforage={async getItem(key){return media.get(key)||null;},async setItem(key,value){media.set(key,structuredClone(value));},async removeItem(key){media.delete(key);}};
   const set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key.startsWith('tretaresia-rpg:continuity:'))throw Error('Simulated local-storage limit');return set.call(this,key,value);};
   const state=window.host.chatMetadata.tretaresia_rpg_state;
   state.player.level=17;state.player.hStats={loyaltyHearts:4};state.progression.currency={gold:13,silver:2,copper:120};
   state.npcs.push({id:'den-local',name:'Den',met:true,npcScope:'chat',npcOwner:'',isHostile:false,stats:{level:9,hp:73,strength:21},hStats:{loyaltyHearts:3},activeAlternateId:'young',alternateProfiles:[{id:'young',label:'Earlier life',fields:{age:'10',background:'Saved earlier biography',hStats:{loyaltyHearts:2}}}],hasPortrait:true,portraitSource:'local'});
   state.social={party:{name:'River companions',memberIds:['den-local'],membershipStatus:'established'},guilds:[],household:{members:[]}};
   state.contacts=[{id:'den-contact',name:'Den',npcId:'den-local'}];state.inventory=[{id:'rod',name:'Fishing rod',quantity:2}];
   state.music={tracks:[{id:'river-song',name:'River song',fileName:'river.wav'}],currentId:'river-song',repeat:true,shuffle:false};
   media.set(`tretaresia-rpg:npc-portrait:${oldChat}:den-local`,new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="gold"/></svg>'],{type:'image/svg+xml'}));
   media.set(`tretaresia-rpg:audio:${oldChat}:river-song`,new Blob(['audio-fixture'],{type:'audio/wav'}));
   window.host.chatMetadata.tretaresia_rpg_visible_hstats_npcs=['den-local'];window.host.chatMetadata.tretaresia_rpg_selected_hstats_npc='den-local';
   window.host.extensionSettings.tretaresia_rpg.autoContinuity=true;
  });
  await panel.locator('[data-action="memory-summary-prepare"]').click();
  await panel.locator('.rf-memory-job[data-status="ready"]').waitFor();
  assert.equal(await page.evaluate(()=>window.smartCalls.length),16,'preparing completed archives does not call AI again');
  assert.equal(await page.evaluate(()=>[...window.fullMedia.keys()].some(key=>key.startsWith('tretaresia-rpg:continuity:'))),true);
  await page.evaluate(async()=>{
   window.host.chatMetadata={};window.host.chat=[{is_user:false,name:'Cora',mes:'New chat greeting.'}];window.host.getCurrentChatId=()=> 'full-handoff-next-chat';
   window.fullRestoreEvents=0;window.addEventListener('tretaresia-rpg:continuity-restored',()=>window.fullRestoreEvents++);
   await Promise.all([window.host.eventSource.emit('CHAT_CHANGED'),window.host.eventSource.emit('CHAT_CHANGED')]);
  });
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state?.player?.level===17);
  assert.equal(await page.evaluate(()=>window.fullRestoreEvents),1,'duplicate native chat-change events share one restore');
  const result=await page.evaluate(()=>{const state=window.host.chatMetadata.tretaresia_rpg_state,npc=state.npcs.find(npc=>npc.id==='den-local');return {
   level:state.player.level,hearts:state.player.hStats.loyaltyHearts,gold:state.progression.currency.gold,inventory:state.inventory.find(item=>item.id==='rod')?.quantity,
   npcScope:npc?.npcScope,hp:npc?.stats.hp,loyalty:npc?.hStats.loyaltyHearts,alternate:npc?.alternateProfiles[0].fields.background,
   party:state.social.party.memberIds,contacts:state.contacts.map(contact=>contact.npcId),roster:window.host.chatMetadata.tretaresia_rpg_visible_hstats_npcs,
   selection:window.host.chatMetadata.tretaresia_rpg_selected_hstats_npc,music:state.music.tracks.length,
   portraitCopied:window.fullMedia.has('tretaresia-rpg:npc-portrait:full-handoff-next-chat:den-local'),audioCopied:window.fullMedia.has('tretaresia-rpg:audio:full-handoff-next-chat:river-song'),link:window.host.chatMetadata.tretaresia_rpg_memory_link?.ancestry,
  };});
  assert.deepEqual({...result,link:undefined},{level:17,hearts:4,gold:13,inventory:2,npcScope:'chat',hp:73,loyalty:3,alternate:'Saved earlier biography',party:['den-local'],contacts:['den-local'],roster:['den-local'],selection:'den-local',music:1,portraitCopied:true,audioCopied:true,link:undefined});
  assert(result.link.includes(await page.evaluate(()=>window.oldFullChat)));
  await page.evaluate(()=>window.navigationSummaryPreview.open('hstats'));
  await page.screenshot({path:`${artifacts}/full-handoff-hstats-${width}.png`});
  await page.evaluate(()=>window.navigationSummaryPreview.open('summaries'));
  await page.waitForFunction(()=>document.querySelector('[data-memory-addons-panel] [data-memory-section="category:lore"] .rf-memory-fact'));
  assert.equal(await panel.locator('[data-memory-section^="category:"]').count(),15);
  assert(await panel.locator('[data-memory-section="insight:changes"] .rf-memory-fact').count()>0,'correction evidence survives the native new-chat handoff');
  assert.deepEqual(errors,[]);console.log(`PASS smart memory modes/call counts/output budget/categories/quotes and full native chat handoff with Chat NPCs, H-Stats, alternates, references, inventory and media/IndexedDB fallback at ${width}px`);
  await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
