import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { identity, CHAT_INSTRUCTIONS, ATTRIBUTE_INSTRUCTIONS, npcAttributeDefaults, resolveNpc, resolveNpcSpeaker, keyName, parseStory, retainManualNpcEdits } from '../src/npc-core.js';
import {H_FIELDS,H_FIELD_MAP,hStats,updateHStat} from '../src/h-stats.js';
import * as scopes from '../src/npc-scopes.js';
import * as lore from '../src/lore-core.js';
import * as archive from '../src/character-archive.js';
import {sceneSnapshot,sceneTrackerOperations,missingSceneFields,expandScene} from '../src/scene-tracker.js';
import {normalizeAdultSettings,writingPreferencePrompt} from '../src/nsfw-enhance.js';
import {allowedDiaryOps,diaryRates,householdOffers,groupOffers} from '../src/social-events.js';

// Evaluate the real host integration without startup or network. No reimplementation of its parser.
const context={extensionSettings:{},chatMetadata:{},chat:[{is_user:true,mes:'Hello'}],getCurrentChatId:()=> 'test-chat',getRequestHeaders:()=>({'Content-Type':'application/json'}),fetch:async()=>({ok:true,status:200}),setExtensionPrompt:(...args)=>{context.lastPrompt=args;},saveSettingsDebounced(){}};
const sandbox={...scopes,...lore,...archive,fetch:async()=>({ok:true,status:200}),sceneSnapshot,sceneTrackerOperations,missingSceneFields,expandScene,normalizeAdultSettings,writingPreferencePrompt,allowedDiaryOps,diaryRates,householdOffers,groupOffers,H_FIELDS,H_FIELD_MAP,hStats,updateHStat,console,structuredClone,setTimeout,clearTimeout,URL,Blob,TextEncoder,crypto:globalThis.crypto,npcIdentity:identity,CHAT_INSTRUCTIONS,ATTRIBUTE_INSTRUCTIONS,npcAttributeDefaults,resolveNpc,resolveNpcSpeaker,keyName,parseStory,retainManualNpcEdits,
    createNpcWorkspace(){},SillyTavern:{getContext:()=>context,libs:{}},document:{readyState:'loading',addEventListener(){},getElementById(){return null;},querySelectorAll(){return[];}},localStorage:{getItem(){return null;},setItem(){}},globalThis:null};
sandbox.globalThis=sandbox;
const source=readFileSync(new URL('../index.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
 vm.createContext(sandbox);vm.runInContext(`${source}\n globalThis.testHost={liveReplyPreview,setLiveGeneration(value){liveGeneration=value;},npcProfile,normalize,defaultState,applyStatePatch,extractStatePatch,getSettings,updatePrompt,roleplayState,friendlyNpcs,metFriendlyNpcs,getState,characterNpcLibrary,storedNpcState,persistNpcScope,requestUsage,recordExtensionRequest,routeStoryNpcState,registerStorySpeakers,activeCharacterLore,activeLorePrompt,persistCharacterLore,parseJson,synchronizeWorldState,rememberScene,sceneForMessage,socialEventsForMessage,diaryForMessage,answerHouseholdOffer,answerGroupOffer,renderGroups,renderHousehold,onInterfaceSettingChange,processAssistantPatch,assistantCheckpoint,saveCurrentChatMetadata,replaceAssistantTurnState,analyzeChat,manualSyncMarkers,manualSyncSelection,manualSyncHistory,renderScene,trackedStateSnapshot,appendStateAudit,renderHStats,chooseHStatsNpc,hStatsFormValues,hStatsMissingFields,completeHStatsBaseline,npcProgressionCandidates,npcProgressionOperations,parseRegistrationMessage,forgeEligible,forgeDraft,applyForgeProfile,startForgeOpening,forgeSession};`,sandbox);
const host=sandbox.testHost;

test('real NPC normalization preserves new profile fields and existing dossier data',()=>{
 const p=host.npcProfile({id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',background:'Archive',goals:'Find a book',speechStyle:'Formal',identityColor:'#7788aa',roleIcon:'scholar',aliases:['Lys'],portraitSize:100,portraitSource:'local',hasPortrait:true,notes:'Existing note',mapX:10,mapY:20,stats:{level:3},abilities:[{id:'a',name:'Read runes'}]});
 const state=host.normalize({...host.defaultState(),npcs:[p]});const result=state.npcs[0];
 assert.equal(result.personality,'Calm');assert.equal(result.portraitSize,100);assert.equal(result.portraitSource,'local');assert.equal(result.mapX,10);assert.equal(result.abilities[0].name,'Read runes');assert.equal(result.stats.level,3);
});
test('real model patch creates NPC in shared state and preserves manual appearance on later patches',()=>{
 const initial=host.defaultState();const created=host.applyStatePatch(initial,{ops:[['upsert','npcs',{id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',identityColor:'#7788aa',roleIcon:'scholar'}]]});
 assert.equal(created.accepted,1);assert.equal(created.next.npcs.length,1);assert.equal(created.next.npcs[0].personality,'Calm');
 const previous=created.next.npcs[0];previous.hasPortrait=true;previous.portraitSource='local';previous.portraitSize=100;previous.portraitView.mobile={x:35,y:40,zoom:1.8};
 const changed=host.applyStatePatch(created.next,{ops:[['upsert','npcs',{id:'lysa',name:'Lysa',location:'Library',identityColor:'#ffffff',roleIcon:'mage',hasPortrait:false,portraitSource:'none'}]]});
 const p=changed.next.npcs[0];assert.equal(p.location,'Library');assert.equal(p.personality,'Calm');assert.equal(p.identityColor,'#7788aa');assert.equal(p.roleIcon,'scholar');assert.equal(p.hasPortrait,true);assert.equal(p.portraitSource,'local');assert.equal(p.portraitView.mobile.zoom,1.8);
});
test('hostile NPC remains in Management state but not friendly roster',()=>{
 const {next}=host.applyStatePatch(host.defaultState(),{ops:[['upsert','npcs',{id:'enemy',name:'Enemy',isHostile:true}]]});assert.equal(next.npcs.length,1);assert.equal(host.friendlyNpcs(next).length,0);
});
test('NPC Codex requires a recorded meeting, while all genders retain H-Stats',()=>{
 const state=host.defaultState();state.npcs=[
  host.npcProfile({id:'f',name:'Female',gender:'Female',met:false}),
  host.npcProfile({id:'m',name:'Male',gender:'Male',met:true}),
  host.npcProfile({id:'futa',name:'Futa',gender:'Futanari',met:true}),
 ];
 assert.deepEqual(host.metFriendlyNpcs(state).map(n=>n.id),['m','futa']);
 assert.equal(state.npcs[0].hStats.penisSize,'');
 assert.ok(Object.hasOwn(state.npcs[2].hStats,'vaginaQuality'));
});
test('Household retains its layout, lists only met NPCs, and accepts a free-text family role',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'met',name:'Met Friend',met:true}),host.npcProfile({id:'lore',name:'Lore Friend',met:false})];
 const panel={innerHTML:''};host.renderHousehold(panel,state);
 assert.match(panel.innerHTML,/data-action="select-household-npc" data-id="met"/);
 assert.doesNotMatch(panel.innerHTML,/data-action="select-household-npc" data-id="lore"/);
 assert.match(panel.innerHTML,/name="role"[^>]*type="text"/);
 assert.doesNotMatch(panel.innerHTML,/select name="role"/);
});

test('an inline invitation waits for the player, stays on the message, and the diary stays with its source reply',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const originalGet=sandbox.document.getElementById;
 const settings=host.getSettings(), oldTrack=settings.autoTrack, oldRate=settings.npcDiaryFrequency;
 try{
  settings.autoTrack=true;settings.npcDiaryFrequency='normal';
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true}),host.npcProfile({id:'lore',name:'Lore Only',met:false})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  const ops=[['offer','householdInvitation',{npcId:'kohaku',role:'คู่ชีวิต'}],
   ['upsert','householdMembers',{npcId:'kohaku',role:'คู่ชีวิต'}],
   ['append','npcDiary',{npcId:'kohaku',text:'วันนี้เจอหมีด้วยแหะ น่ารักจัง'}],
   ['append','npcDiary',{npcId:'lore',text:'I was not in this scene.'}]];
  context.chat=[{is_user:true,mes:'Talk to Kohaku.'},{is_user:false,mes:`Kohaku asks to join your household.<!--tretaresia_patch:${JSON.stringify({ops,sceneTracker:fullScene})}-->`}];
  context.saveMetadata=async()=>{};context.generateQuietPrompt=async()=>JSON.stringify({ops:[]});
  await host.processAssistantPatch(1,'normal');
  assert.equal(host.getState().social.household.members.length,0);
  assert.equal(host.socialEventsForMessage(1,context.chat[1]).offers[0].role,'คู่ชีวิต');
  assert.equal(host.diaryForMessage(1,context.chat[1]).length,1);
  assert.equal(host.diaryForMessage(1,context.chat[1])[0].sourceChatId,'test-chat');
  assert.equal(host.getState().npcs.find(npc=>npc.id==='lore').diary.length,0);
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  await host.answerHouseholdOffer(1,'kohaku',true);
  assert.equal(host.getState().social.household.members[0].role,'คู่ชีวิต');
  assert.equal(host.socialEventsForMessage(1,context.chat[1]).offers[0].status,'accepted');
  assert.equal(await host.answerHouseholdOffer(1,'kohaku',true),false);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;sandbox.document.getElementById=originalGet;settings.autoTrack=oldTrack;settings.npcDiaryFrequency=oldRate;}
});
test('NPC party and famous guild offers wait for consent and retain credible member counts',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const settings=host.getSettings(), prior=settings.autoTrack, originalGet=sandbox.document.getElementById;
 try{
  settings.autoTrack=true;
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'rhea',name:'Rhea',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  const ops=[['offer','partyInvitation',{npcId:'rhea',name:'Ashtrail',role:'Scout',rank:'Silver',completedQuests:7,memberCount:4,members:[{name:'Rhea',role:'Leader'}],leaderName:'Rhea'}],
   ['offer','guildInvitation',{npcId:'rhea',name:'Dawnspire',role:'Initiate',rank:'A',completedQuests:214,memberCount:128,members:[{name:'Rhea'}]}],
   ['upsert','guilds',{name:'Dawnspire',leaderId:'rhea',memberIds:['rhea']}]];
  context.chat=[{is_user:true,mes:'Talk to Rhea.'},{is_user:false,mes:`Rhea invites you into Ashtrail (4 members) and Dawnspire guild (128 members).<!--tretaresia_patch:${JSON.stringify({ops,sceneTracker:fullScene})}-->`}];
  context.saveMetadata=async()=>{};context.generateQuietPrompt=async()=>JSON.stringify({ops:[]});
  await host.processAssistantPatch(1,'normal');
  assert.equal(host.getState().social.party,null);
  assert.equal(host.getState().social.guilds.length,0);
  const offers=host.socialEventsForMessage(1,context.chat[1]).groupOffers;
  assert.equal(offers.length,2);
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  assert.equal(await host.answerGroupOffer(1,offers[0].key,true),true);
  assert.equal(await host.answerGroupOffer(1,offers[1].key,true),true);
  assert.equal(await host.answerGroupOffer(1,offers[1].key,true),false);
  const current=host.getState();
  assert.equal(current.social.party.playerRole,'Scout');assert.equal(current.social.party.memberCount,5);
  assert.equal(current.social.party.rank,'Silver');assert.equal(current.social.party.completedQuests,7);
  assert.notEqual(current.social.party.leaderId,'player');
  assert.equal(current.social.guilds[0].playerRole,'Initiate');assert.equal(current.social.guilds[0].memberCount,129);
  assert.equal(current.social.guilds[0].rank,'A');assert.equal(current.social.guilds[0].completedQuests,214);
  assert.notEqual(current.social.guilds[0].leaderId,'player');
  assert.equal(current.npcs.length,1);
  const panel={innerHTML:''};host.renderGroups(panel,current);
  assert.match(panel.innerHTML,/129 members/);assert.match(panel.innerHTML,/Initiate/);
  assert.match(panel.innerHTML,/214/);assert.match(panel.innerHTML,/Silver/);
  assert.equal(host.socialEventsForMessage(1,context.chat[1]).groupOffers[1].status,'accepted');
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;sandbox.document.getElementById=originalGet;settings.autoTrack=prior;}
});
test('group rank and completed quests survive reloads and partial updates',()=>{
 const initial=host.defaultState();
 initial.social.party={name:'Wayfarers',leaderId:'player',memberIds:[],rank:'Bronze',completedQuests:3};
 initial.social.guilds=[{id:'g1',name:'Lantern Guild',leaderId:'player',memberIds:[],rank:'A',completedQuests:42}];
 const restored=host.normalize(initial);
 assert.equal(restored.social.party.rank,'Bronze');assert.equal(restored.social.party.completedQuests,3);
 assert.equal(restored.social.guilds[0].rank,'A');assert.equal(restored.social.guilds[0].completedQuests,42);
 const edited=host.applyStatePatch(restored,{ops:[['upsert','party',{name:'Wayfarers',completedQuests:4}],['upsert','guilds',{id:'g1',completedQuests:43}]]}).next;
 assert.equal(edited.social.party.rank,'Bronze');assert.equal(edited.social.party.completedQuests,4);
 assert.equal(edited.social.guilds[0].name,'Lantern Guild');assert.equal(edited.social.guilds[0].completedQuests,43);
 const panel={innerHTML:''};host.renderGroups(panel,edited);
 assert.match(panel.innerHTML,/Party name/);assert.match(panel.innerHTML,/Guild name/);
 assert.match(panel.innerHTML,/Completed quests/);
});
test('H-Stats shows a met NPC instead of the player and keeps the chosen NPC in this chat',async()=>{
 const base=host.defaultState();
 const panel={innerHTML:''};
 host.renderHStats(panel,base);
 assert.match(panel.innerHTML,/tretaresia-h-empty/);
 assert.doesNotMatch(panel.innerHTML,/data-id="player"/);
 base.npcs=[host.npcProfile({id:'lore',name:'Lore only',met:false}),host.npcProfile({id:'lysa',name:'Lysa',met:true}),host.npcProfile({id:'rin',name:'Rin',met:true,hasPortrait:true,portraitSource:'server'})];
 const saved={metadata:context.chatMetadata,save:context.saveMetadata,getId:context.getCurrentChatId};
 let chatId='h-stats-test';context.chatMetadata={};context.getCurrentChatId=()=>chatId;context.saveMetadata=async()=>{};
 try{
  host.renderHStats(panel,base);
  assert.match(panel.innerHTML,/data-id="lysa"/);
  assert.doesNotMatch(panel.innerHTML,/data-id="lore"|data-id="player"/);
  assert.equal(host.chooseHStatsNpc('lore',base),false);
  assert.equal(host.chooseHStatsNpc('rin',base),true);
  host.renderHStats(panel,base);
  assert.match(panel.innerHTML,/data-id="rin" class="is-active"/);
  assert.match(panel.innerHTML,/data-npc-portrait="rin"/);
  assert.match(panel.innerHTML,/tretaresia-h-photo/);
  assert.match(panel.innerHTML,/M12 21\.35l-1\.45-1\.32C5\.4 15\.36 2 12\.28 2 8\.5/);
  assert.match(panel.innerHTML,/ยังไม่ทราบ/);
  assert.equal(context.chatMetadata.tretaresia_rpg_selected_hstats_npc,'rin');
  const updated=host.applyStatePatch(base,{ops:[['set','npcHStats',{npcId:'rin',field:'loyaltyHearts',value:4}]]});
  host.renderHStats(panel,updated.next);
  assert.match(panel.innerHTML,/Loyalty 4 of 5/);
  assert.equal((panel.innerHTML.match(/class="is-filled"/g)||[]).length,4);
  chatId='another-chat';context.chatMetadata={};
  host.renderHStats(panel,base);
  assert.match(panel.innerHTML,/data-id="lysa" class="is-active"/);
  assert.doesNotMatch(panel.innerHTML,/data-id="rin" class="is-active"/);
 }finally{context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.getCurrentChatId=saved.getId;}
});
test('editing one H-Stats category preserves values in the other categories',()=>{
 const previous=hStats({oralSexCount:3,loyaltyHearts:5,mouthQuality:'Known'});
 const patch=host.hStatsFormValues({npcId:'lysa',mouthQuality:'Updated',pregnant:'false'});
 const next=hStats(patch,previous);
 assert.equal(next.mouthQuality,'Updated');assert.equal(next.pregnant,false);
 assert.equal(next.oralSexCount,3);assert.equal(next.loyaltyHearts,5);
 assert.equal(Object.hasOwn(patch,'condition'),false);
});
test('H-Stats hydrates the selected NPC image from the same stored portrait source',async()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true,hasPortrait:true,portraitSource:'server'})];
 const savedRead=sandbox.readServerPortrait,savedCreate=sandbox.document.createElement;
 const node={dataset:{npcPortrait:'kohaku'},isConnected:true,classList:{contains:()=>true,add(){}},
  querySelector:()=>null,appendChild(image){this.image=image;}};
 const panel={innerHTML:'',querySelectorAll:()=>[node]};
 try{
  sandbox.readServerPortrait=async entry=>{assert.equal(entry.id,'kohaku');return new Blob(['portrait'],{type:'image/png'});};
  sandbox.document.createElement=tag=>({tag});
  host.renderHStats(panel,state);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(node.image.alt,'Kohaku portrait');
  assert.match(node.image.src,/^blob:/);
 }finally{sandbox.readServerPortrait=savedRead;sandbox.document.createElement=savedCreate;}
});

test('generated H-Stats fill every missing field and confirmed values replace generated sources',async()=>{
 const saved={metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata,getElement:sandbox.document.getElementById};
 let calls=0,writes=0;
 try{
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',gender:'Female',met:true,
   hStats:{mouthQuality:'Confirmed by story',oralSexCount:2}})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.saveMetadata=async()=>{writes++;};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  context.generateQuietPrompt=async({quietPrompt})=>{
   calls++;assert.match(quietPrompt,/fictional INITIAL H-Stats/);
   return JSON.stringify({hStats:{favoritePosition:'Story-consistent preference',penisQuality:'Unknown',birthCount:0,condition:'forbidden'}});
  };
  await host.completeHStatsBaseline('kohaku');
  const entry=host.getState().npcs[0];
  assert.equal(calls,1);assert.equal(writes,1);assert.equal(host.hStatsMissingFields(entry).length,0);
  assert.equal(entry.hStats.mouthQuality,'Confirmed by story');assert.equal(entry.hStats.oralSexCount,2);
  assert.equal(entry.hStats.favoritePosition,'Story-consistent preference');
  assert.equal(entry.hStats.penisQuality,'ไม่มีอวัยวะส่วนนี้');
  assert.ok(entry.hStatsGenerated.includes('favoritePosition'));assert.ok(!entry.hStatsGenerated.includes('mouthQuality'));
  assert.equal(Object.hasOwn(entry.hStats,'condition'),false);
  const changed=host.applyStatePatch(host.getState(),{ops:[
   ['set','npcHStats',{npcId:'kohaku',field:'favoritePosition',value:'Story-consistent preference'}],
   ['inc','npcHStats',{npcId:'kohaku',field:'analSexCount',amount:1}],
  ]}).next.npcs[0];
  assert.equal(changed.hStats.analSexCount,1);
  assert.ok(!changed.hStatsGenerated.includes('favoritePosition'));
  assert.ok(!changed.hStatsGenerated.includes('analSexCount'));
  const panel={innerHTML:''};host.renderHStats(panel,host.getState());
  assert.match(panel.innerHTML,/ค่าเริ่มต้น AI/);
 }finally{context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.getElement;}
});

test('H-Stats use a complete neutral baseline when the profile model is unavailable',async()=>{
 const saved={metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata,getElement:sandbox.document.getElementById};
 try{
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',gender:'Female',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.saveMetadata=async()=>{};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  context.generateQuietPrompt=async()=>{throw Error('Provider unavailable');};
  await host.completeHStatsBaseline('kohaku');
  const entry=host.getState().npcs[0];
  assert.equal(host.hStatsMissingFields(entry).length,0);
  assert.equal(entry.hStatsGenerated.length,H_FIELDS.length);
  assert.equal(entry.hStats.pregnant,false);
  assert.equal(entry.hStats.analSexCount,0);
 }finally{context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.getElement;}
});
test('same-turn patches update NPC relationships, skills and H-Stats without resetting other values',()=>{
 const base=host.defaultState();base.npcs=[host.npcProfile({id:'a',name:'Aria',met:true,trust:10,
  abilities:[{id:'skill',name:'Aura Weaving',category:'Aura',level:'Novice',proficiency:20,description:'Established skill'}]})];
 const result=host.applyStatePatch(base,{ops:[
  ['inc','npcValues',{npcId:'a',field:'trust',amount:3}],
  ['inc','npcAbilities',{npcId:'a',name:'Aura Weaving',amount:4}],
  ['set','npcHStats',{npcId:'a',field:'loyaltyHearts',value:5}],
  ['inc','npcHStats',{npcId:'a',field:'oralSexCount',amount:1}],
  ['set','npcHStats',{npcId:'a',field:'pregnant',value:false}],
 ]});
 const npc=result.next.npcs[0];
 assert.equal(result.accepted,5);assert.equal(npc.trust,13);
 assert.equal(npc.abilities[0].proficiency,24);assert.equal(npc.abilities[0].category,'Aura');
 assert.equal(npc.hStats.loyaltyHearts,5);assert.equal(npc.hStats.oralSexCount,1);assert.equal(npc.hStats.pregnant,false);
 const later=host.applyStatePatch(result.next,{ops:[['upsert','npcs',{id:'a',name:'Aria',stats:{hp:88},hStats:{favoritePosition:'Established preference'}}],
  ['upsert','npcAbilities',{npcId:'a',name:'Aura Weaving',proficiency:29}]]}).next.npcs[0];
 assert.equal(later.hStats.oralSexCount,1);assert.equal(later.hStats.favoritePosition,'Established preference');
 assert.equal(later.abilities[0].category,'Aura');assert.equal(later.abilities[0].proficiency,29);
});

test('Character Forge generates the first assistant scene without posting a user message and seeds selected powers',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,characters:context.characters,characterId:context.characterId,
  generate:context.generate,save:context.saveMetadata,query:sandbox.document.querySelector,element:sandbox.document.getElementById,input:sandbox.HTMLInputElement,autoTrack:host.getSettings().autoTrack};
 const draft={fields:{fName:'Ari',fTitle:'The Dawn',fOrigin:'Sun Ward',fOriginCat:'Intrinsic Skill',fMastery:'Adept',fScene:'The old temple opens.',fBack:'Born in the forest.'},
  power:['Divine Mana','Aura'],ab:[{n:'Healing',cat:'Common Skill',tier:'Adept',d:'Restore wounds'}],it:[{n:'Prayer Bell',t:'Tool',d:'Small bell'}]};
 let requests=0,writes=0;
 try{
  context.chat=[{is_user:false,mes:''}];context.chatMetadata={};context.characters=[{data:{first_mes:''}}];context.characterId=0;
  context.saveMetadata=async()=>{writes++;};sandbox.document.querySelector=()=>null;
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  sandbox.HTMLInputElement=class HTMLInputElement {};
  context.generate=async(type,options)=>{
   requests++;assert.equal(type,'normal');assert.equal(options.automatic_trigger,true);
   assert.equal(context.chat.some(message=>message.is_user),false);
   assert.match(context.lastPrompt[1],/Divine Mana/);assert.match(context.lastPrompt[1],/old temple opens/);
   context.chat.push({is_user:false,mes:'Ari stands before the old temple.'});
  };
  assert.equal(host.forgeEligible(context),true);
  assert.equal(await host.startForgeOpening(draft),true);
  assert.equal(requests,1);assert.ok(writes>=2);
  const state=host.getState();
  assert.equal(state.player.name,'Ari');assert.equal(state.player.title,'The Dawn');
  assert.match(state.player.powerType,/Divine Mana/);assert.match(state.player.powerType,/Aura/);
  assert.equal(state.proficiencies.magic.divineMana,1);assert.equal(state.player.aura.color,'#ffffff');
  assert.deepEqual(Array.from(state.skills,x=>x.name),['Sun Ward','Healing']);
  assert.equal(state.inventory[0].name,'Prayer Bell');
  assert.equal(host.forgeSession(context).phase,'completed');
  assert.equal(context.chat.filter(message=>message.is_user).length,0);
  assert.equal(host.forgeEligible(context),false);
  assert.equal(host.manualSyncSelection(context.chat,1,1).assistants[0].index,1);
  host.getSettings().autoTrack=false;
  await host.processAssistantPatch(1,'normal');
  assert.ok(host.sceneForMessage(1,context.chat[1]));
  assert.equal(host.forgeSession({...context,chatMetadata:structuredClone(context.chatMetadata)}).draft.fields.fName,'Ari');
 }finally{Object.assign(context,{chat:saved.chat,chatMetadata:saved.metadata,characters:saved.characters,characterId:saved.characterId,generate:saved.generate,saveMetadata:saved.save});host.getSettings().autoTrack=saved.autoTrack;sandbox.document.querySelector=saved.query;sandbox.document.getElementById=saved.element;sandbox.HTMLInputElement=saved.input;}
});

test('Character Forge keeps the chat draft after a provider error and retries only on the next click',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,characters:context.characters,characterId:context.characterId,
  generate:context.generate,save:context.saveMetadata,query:sandbox.document.querySelector,element:sandbox.document.getElementById,input:sandbox.HTMLInputElement};
 let requests=0;
 try{
  context.chat=[];context.chatMetadata={};context.characters=[{first_mes:''}];context.characterId=0;
  context.saveMetadata=async()=>{};sandbox.document.querySelector=()=>null;
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  sandbox.HTMLInputElement=class HTMLInputElement {};
  const draft={fields:{fName:'Nami',fScene:'A rainy afternoon.'},power:['Sage Mana']};
  context.generate=async()=>{requests++;throw Error('Provider offline');};
  assert.equal(await host.startForgeOpening(draft),false);
  assert.equal(requests,1);assert.equal(host.forgeSession(context).phase,'failed');
  assert.equal(host.forgeSession(context).draft.fields.fName,'Nami');
  assert.equal(host.forgeEligible(context),true);
  assert.equal(host.getState().player.name,'Nami');
  context.generate=async()=>{requests++;};
  assert.equal(await host.startForgeOpening(host.forgeSession(context).draft),false);
  assert.equal(host.forgeSession(context).phase,'failed');
  context.generate=async()=>{requests++;context.chat.push({is_user:false,mes:'Rain falls around Nami.'});};
  assert.equal(await host.startForgeOpening(host.forgeSession(context).draft),true);
  assert.equal(requests,3);assert.equal(host.getState().proficiencies.magic.sageMana,1);
  assert.equal(host.forgeEligible({...context,chat:[],characters:[{first_mes:'A prewritten greeting'}]}),false);
 }finally{Object.assign(context,{chat:saved.chat,chatMetadata:saved.metadata,characters:saved.characters,characterId:saved.characterId,generate:saved.generate,saveMetadata:saved.save});sandbox.document.querySelector=saved.query;sandbox.document.getElementById=saved.element;sandbox.HTMLInputElement=saved.input;}
});
test('NPC field history includes old and new relationship, stat, skill and H-Stats values',()=>{
 const before=host.defaultState();before.npcs=[host.npcProfile({id:'a',name:'Aria',trust:10,stats:{hp:100},abilities:[{name:'Aura',proficiency:10}]})];
 const after=structuredClone(before);after.npcs[0].trust=15;after.npcs[0].stats.hp=80;after.npcs[0].abilities[0].proficiency=20;after.npcs[0].hStats.loyaltyHearts=4;
 const audit=host.appendStateAudit(after,before,'npc-test');
 const paths=audit.changes.map(change=>change.path);
 for(const path of ['npcs.a.trust','npcs.a.stats.hp','npcs.a.abilities','npcs.a.hStats.loyaltyHearts'])assert.ok(paths.includes(path),path);
 assert.equal(audit.changes.find(change=>change.path==='npcs.a.trust').before,'10');
 assert.equal(audit.changes.find(change=>change.path==='npcs.a.trust').after,'15');
});
test('registration keeps a character name separate from title',()=>{
 const parsed=host.parseRegistrationMessage('Identity\nCharacter Name: Aria Vale\nGender: Female\nRace: Human\nTitle: Knight');
 assert.equal(parsed.name,'Aria Vale');assert.equal(parsed.race,'Human');assert.equal(parsed.title,undefined);
});
test('patch extraction leaves story blocks intact and does not expose patch JSON',()=>{
 const parsed=host.extractStatePatch('<tr-dialogue name="Lysa">Hello.</tr-dialogue><!-- tretaresia_patch: {"ops":[["upsert","npcs",{"name":"Lysa"}]]} -->');
 assert.equal(parsed.visible,'<tr-dialogue name="Lysa">Hello.</tr-dialogue>');assert.equal(parsed.patch.ops.length,1);
});
test('presentation prompt works independently; disabled tracking does not request an NPC patch',()=>{
 const settings=host.getSettings();settings.injectState=false;settings.autoTrack=false;settings.chatPresentation=true;host.updatePrompt(host.defaultState());
 assert.match(context.lastPrompt[1],/<tr-dialogue/);assert.doesNotMatch(context.lastPrompt[1],/must be upserted/);
 settings.chatPresentation=false;host.updatePrompt(host.defaultState());assert.equal(context.lastPrompt[1],'');
 settings.autoTrack=true;settings.chatPresentation=true;host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/must be upserted/);assert.doesNotMatch(context.lastPrompt[1],/upsert only relevant named friendly NPCs/);
});
test('host prompt sends adult preferences only while enabled and follows the player language',()=>{
 const settings=host.getSettings();
 const before={injectState:settings.injectState,autoTrack:settings.autoTrack,chatPresentation:settings.chatPresentation,nsfwEnhance:settings.nsfwEnhance,nsfwTags:settings.nsfwTags,roleplayLanguage:settings.roleplayLanguage};
 const previousChat=context.chat;
 try{
  settings.injectState=false;settings.autoTrack=false;settings.chatPresentation=false;
  settings.nsfwEnhance=false;settings.nsfwTags=['Romance'];settings.roleplayLanguage='auto';
  host.updatePrompt(host.defaultState());assert.equal(context.lastPrompt[1],'');
  settings.nsfwEnhance=true;context.chat=[{is_user:true,mes:'ตอบเป็นภาษาไทยนะ'}];
  host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/Write narrative and character dialogue in Thai/);
  assert.match(context.lastPrompt[1],/"Romance"/);
  context.chat=[{is_user:true,mes:'Please continue in English.'}];
  host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/Write narrative and character dialogue in English/);
 }finally{Object.assign(settings,before);context.chat=previousChat;}
});
test('manual profiles reach the canonical model prompt without portrait bytes',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',background:'Archive',goals:'Book',speechStyle:'Formal',hasPortrait:true})];
 const prompt=JSON.stringify(host.roleplayState(state));assert.match(prompt,/Silver hair/);assert.match(prompt,/Formal/);assert.doesNotMatch(prompt,/data:image|portraitView|hasPortrait/);
});
test('production asset references and release version stay in sync',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));assert.equal(manifest.version,'0.43.0');
 for(const file of ['index.js','npc-workspace.js','npc-chat.js','npc-portraits.js','npc-media.js','npc-scopes.js']){const s=readFileSync(new URL(`../${file === 'index.js' ? file : 'src/' + file}`,import.meta.url),'utf8');const refs=[...s.matchAll(/\/(?:src\/)?npc-[a-z]+\.(?:js|css)\?v=([\d.]+)/g)];assert.ok(refs.length);for(const ref of refs)assert.equal(ref[1],manifest.version);}
});
test('host getState merges only the current card library and leaves legacy NPCs Chat-scoped',()=>{
 context.characters=[{name:'Same display name',avatar:'first.png'},{name:'Same display name',avatar:'second.png'}];context.characterId=0;
 host.getSettings().npcCharacterLibraries={'card:first.png':[host.npcProfile({id:'shared',name:'Shared',background:'Card history'})]};
 context.chatMetadata.tretaresia_rpg_state={...host.defaultState(),npcs:[{id:'local',name:'Local'}]};
 const state=host.getState();assert.equal(state.npcs.length,2);assert.equal(state.npcs[0].npcScope,'chat');assert.equal(state.npcs[1].npcScope,'character');
 context.characterId=1;assert.equal(host.getState().npcs.length,1);
 context.characterId=0;context.chatMetadata={};assert.equal(host.getState().npcs.length,1);assert.equal(host.getState().npcs[0].name,'Shared');
});

test('AI cannot replace a server portrait and image paths stay outside model context',()=>{
 const p=host.npcProfile({id:'server-photo',name:'Photo NPC',hasPortrait:true,portraitSource:'server',portraitPath:'/user/images/tretaresia-npc/abc.webp'});
 const state={...host.defaultState(),npcs:[p]};
 const changed=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:p.id,name:p.name,portraitSource:'none',portraitPath:'/user/images/tretaresia-npc/evil.webp'}]]});
 assert.equal(changed.next.npcs[0].portraitSource,'server');assert.equal(changed.next.npcs[0].portraitPath,p.portraitPath);
 assert.ok(!JSON.stringify(host.roleplayState(state)).includes(p.portraitPath));
});
test('real AI patch cannot choose Character scope or modify the shared library',()=>{
 context.characterId=0;context.chatMetadata={};const current=host.getState();
 const result=host.applyStatePatch(current,{ops:[['upsert','npcs',{id:'shared',name:'Shared',location:'New scene',npcScope:'chat'}],['upsert','npcs',{id:'new',name:'AI created',npcScope:'character',npcOwner:'card:first.png'}]]});
 assert.equal(result.next.npcs.find(p=>p.id==='shared').npcScope,'character');assert.equal(result.next.npcs.find(p=>p.id==='new').npcScope,'chat');
 context.chatMetadata.tretaresia_rpg_state=host.storedNpcState(result.next);
 assert.equal(context.chatMetadata.tretaresia_rpg_state.npcs.length,1);assert.equal(host.getState().npcs.find(p=>p.id==='shared').location,'New scene');
 assert.notEqual(host.characterNpcLibrary()[0].location,'New scene');
 context.chatMetadata={};assert.notEqual(host.getState().npcs[0].location,'New scene');assert.equal(host.getState().npcs.some(p=>p.name==='AI created'),false);
});
test('scope save rejects a stale chat or card before mutation',async()=>{
 const before=JSON.stringify(host.getSettings().npcCharacterLibraries);
 await assert.rejects(host.persistNpcScope('character',[],'npc-management','other-chat','card:first.png'));
 await assert.rejects(host.persistNpcScope('character',[],'npc-management','test-chat','card:second.png'));
 assert.equal(JSON.stringify(host.getSettings().npcCharacterLibraries),before);
});
test('a rejected Character NPC write leaves the older library and current chat unchanged',async()=>{
 const previousFetch=context.fetch,previousMetadata=context.chatMetadata;
 context.characterId=0;context.chatMetadata={};
 const owner='card:first.png',prior=JSON.stringify(host.characterNpcLibrary(owner));
 context.fetch=async()=>({ok:false,status:503});
 try{
  await assert.rejects(host.persistNpcScope('character',[host.npcProfile({id:'failed',name:'Unsaved'})],'npc-management','test-chat',owner),/503/);
  assert.equal(JSON.stringify(host.characterNpcLibrary(owner)),prior);
  assert.deepEqual(context.chatMetadata,{});
 }finally{context.fetch=previousFetch;context.chatMetadata=previousMetadata;}
});
test('preserves upstream v0.30.1: request diagnostics never save global settings',()=>{
 let saves=0;const original=context.saveSettingsDebounced;context.saveSettingsDebounced=()=>{saves++;};
 const before=JSON.stringify(host.getSettings().requestUsage);const total=host.requestUsage().total;
 host.recordExtensionRequest('npcDraft','draft');host.recordExtensionRequest('manualSync','sync');
 assert.equal(saves,0);assert.equal(host.requestUsage().total,total+2);assert.equal(JSON.stringify(host.getSettings().requestUsage),before);context.saveSettingsDebounced=original;
});
test('preserves upstream v0.30.2: Safari safe mode prevents startup and prompt injection',async()=>{
 let listeners=0,prompts=0;
 const safe={...sandbox,globalThis:null,location:{search:'?tretaresia-safe=1'},document:{readyState:'complete',addEventListener(){listeners++;}},SillyTavern:{getContext:()=>({...context,setExtensionPrompt(){prompts++;}})},console:{...console,warn(){}}};safe.globalThis=safe;
 vm.createContext(safe);vm.runInContext(source,safe);await safe.TretaresiaRpgGenerateInterceptor();assert.equal(listeners,0);assert.equal(prompts,0);
});
test('hidden or foreign-card Character contacts cannot resurrect as Chat NPCs',()=>{
 context.characterId=0;context.chatMetadata={};const active=host.getState();active.contacts=[{id:'contact',npcId:'shared',name:'Shared'}];active.npcs=[];
 context.chatMetadata.tretaresia_rpg_state=host.storedNpcState(active);assert.equal(host.getState().npcs.length,0);
 context.characterId=1;assert.equal(host.getState().npcs.length,0);
});

test('new NPCs receive complete missing attributes; explicit zeros and partial updates are preserved',()=>{
 const state=host.applyStatePatch(host.defaultState(),{ops:[['upsert','npcs',{name:'New guard',stats:{level:4}}]]}).next;
 const p=state.npcs[0];assert.equal(p.stats.level,4);assert.equal(p.stats.hp,100);assert.equal(p.stats.mp,30);assert.equal(p.trust,10);
 const next=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:p.id,stats:{hp:0,mp:0},trust:0}]]}).next.npcs[0];
 assert.equal(next.stats.hp,0);assert.equal(next.stats.mp,0);assert.equal(next.trust,0);assert.equal(next.stats.level,4);
});
test('dialogue-only speakers are registered once, aliases and player names are excluded',()=>{
 const state=host.defaultState();state.player.name='Player';state.npcs=[host.npcProfile({name:'Alice',aliases:['Al']})];
 const message={mes:'<tr-dialogue name="Al">Hi</tr-dialogue><tr-dialogue name="Player">Hi</tr-dialogue><tr-dialogue name="New guard">Hi</tr-dialogue><tr-dialogue name="New guard">Again</tr-dialogue>'};
 assert.equal(host.registerStorySpeakers(state,message,context),2);assert.equal(host.registerStorySpeakers(state,message,context),0);
 assert.equal(state.npcs.length,2);assert.equal(state.npcs[0].met,true);assert.equal(state.npcs[1].met,true);assert.equal(state.npcs[1].stats.hp,100);
});
test('story Character destination persists in library and survives fresh chats without leaking to another card',async()=>{
 context.characters=[{name:'First',avatar:'first.png'},{name:'Second',avatar:'second.png'}];context.characterId=0;context.chatMetadata={};
 const settings=host.getSettings();settings.npcCharacterLibraries={};settings.npcGenerationScope='character';
 const before=host.getState();const result=host.applyStatePatch(before,{ops:[['upsert','npcs',{id:'generated',name:'Generated',stats:{hp:82}}]]});
 const routed=await host.routeStoryNpcState(result.next,before,context);
 context.chatMetadata.tretaresia_rpg_state=host.storedNpcState(routed);
 assert.equal(context.chatMetadata.tretaresia_rpg_state.npcs.length,0);assert.equal(host.characterNpcLibrary()[0].name,'Generated');assert.equal(host.getState().npcs[0].stats.hp,82);
 context.chatMetadata={};assert.equal(host.getState().npcs[0].name,'Generated');context.characterId=1;assert.equal(host.getState().npcs.length,0);
 settings.npcGenerationScope='chat';settings.npcCharacterLibraries={};context.chatMetadata={};
});
test('tracking prompt requests full stats even when chat presentation is off',()=>{
 const settings=host.getSettings();settings.autoTrack=true;settings.chatPresentation=false;host.updatePrompt(host.defaultState());
 assert.match(context.lastPrompt[1],/Every new NPC needs complete stats/);assert.doesNotMatch(context.lastPrompt[1],/Zero stats mean unknown/);settings.chatPresentation=true;
});
test('speaker fallback does not resurrect an NPC intentionally removed in this turn',()=>{
 const previous={npcs:[host.npcProfile({id:'gone',name:'Gone'})]},state=host.defaultState();
 assert.equal(host.registerStorySpeakers(state,{mes:'<tr-dialogue name="Gone">Goodbye.</tr-dialogue>'},context,previous),0);assert.equal(state.npcs.length,0);
});

test('Character Lore feeds main generation independently and stops immediately when disabled or card changes',async()=>{
 context.characters=[{avatar:'lore-a.png'},{avatar:'lore-b.png'}];context.characterId=0;context.groupId=null;
 const settings=host.getSettings();settings.injectState=false;settings.autoTrack=false;settings.chatPresentation=false;
 await host.persistCharacterLore([{id:'moon',title:'Moon law',content:'The moon is a blue crystal.',enabled:true}],'card:lore-a.png');
 assert.match(context.lastPrompt[1],/blue crystal/);assert.match(host.activeLorePrompt(),/blue crystal/);
 context.characterId=1;host.updatePrompt(host.defaultState());assert.equal(context.lastPrompt[1],'');
 await assert.rejects(host.persistCharacterLore([],'card:lore-a.png'));
 context.characterId=0;await host.persistCharacterLore([{id:'moon',title:'Moon law',content:'The moon is a blue crystal.',enabled:false}],'card:lore-a.png');assert.equal(context.lastPrompt[1],'');
});

test('Thai duplicate creation reuses canonical NPC without resetting its dossier or shared scope',()=>{
 const canonical=host.npcProfile({id:'kohaku',name:'Kohaku',background:'Established history',stats:{hp:83},npcScope:'character',npcOwner:'card:first.png'});
 const state={...host.defaultState(),npcs:[canonical]};
 const result=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:'new-thai-id',name:'โคฮาคุ',background:'Replacement history',stats:{hp:100}}],['set','npcValues',{npcName:'โคฮาคุ',field:'trust',value:44}]]});
 assert.equal(result.next.npcs.length,1);const p=result.next.npcs[0];assert.equal(p.id,'kohaku');assert.equal(p.name,'Kohaku');assert.equal(p.background,'Established history');assert.equal(p.stats.hp,83);assert.equal(p.trust,44);assert.equal(p.npcScope,'character');assert.ok(p.aliases.includes('โคฮาคุ'));
 assert.equal(host.registerStorySpeakers(state,{mes:'<tr-dialogue name="โคฮาคุ">Hello</tr-dialogue>'},context),1);assert.equal(state.npcs[0].met,true);
});
test('full name index includes NPCs outside the detailed context shortlist',()=>{
 const state={...host.defaultState(),npcs:Array.from({length:40},(_,i)=>host.npcProfile({id:`npc-${i}`,name:`NPC ${i}`,aliases:[`Alias ${i}`]}))};
 assert.equal(host.roleplayState(state).privateTrackerReferenceIndex.npcNames.length,40);assert.ok(JSON.stringify(host.roleplayState(state).privateTrackerReferenceIndex.npcNames).includes('Alias 39'));
});
test('disabled NPC remains identifiable but an AI patch cannot reactivate or duplicate them',()=>{
 const state={...host.defaultState(),npcs:[host.npcProfile({id:'kohaku',name:'Kohaku',enabled:false})]};
 const next=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:'thai-id',name:'โคฮาคุ',enabled:true,personality:'Overwrite'}],['upsert','partyMembers',{npcName:'โคฮาคุ'}]]});
 assert.equal(next.next.npcs.length,1);assert.equal(next.next.npcs[0].enabled,false);
 assert.equal(host.friendlyNpcs(next.next).length,0);
});
test('completed travel does not reset a later scene to the old destination',()=>{
 const old=host.defaultState();old.travel.status='Arrived';old.travel.destination='Central Crown';old.travel.destinationPlace='Central Crown';
 const next=structuredClone(old);next.location.place='The Great Academy';next.location.region='Crown Heartlands';
 host.synchronizeWorldState(next,old);
 assert.equal(next.location.place,'The Great Academy');
});
test('unconfirmed opening coordinates are hidden from the roleplay prompt',()=>{
 const scene=host.roleplayState(host.defaultState()).sceneContext;
 assert.equal(scene.location.place,'Unknown');assert.equal(Object.hasOwn(scene.location,'mapX'),false);
 const confirmed=host.defaultState();confirmed.onboarding.locationSeeded=true;
 assert.equal(host.roleplayState(confirmed).sceneContext.location.place,'Central Crown');
});
test('JSON parser accepts one balanced object with trailing model commentary',()=>{
 assert.equal(host.parseJson('```json\n{"name":"Lysa"}\n```\nextra text').name,'Lysa');
 assert.throws(()=>host.parseJson('{"name":'),/valid JSON/);
});
test('scene snapshots survive swipes without showing another reply variant',async()=>{
 const previousChat=context.chat,previousMetadata=context.chatMetadata;
 try{
  const message={mes:'<tr-dialogue name="Kohaku">Hello</tr-dialogue>',swipe_id:0};
  context.chat=[{is_user:true,mes:'Hello'},message];context.chatMetadata={};
  const state=host.defaultState();state.onboarding.locationSeeded=true;state.location.place='Academy';
  await host.rememberScene(1,message,state,{participants:['Kohaku']});
  assert.equal(host.sceneForMessage(1,message).location,'Academy');
  assert.equal(host.sceneForMessage(1,message).sequence,1);
  message.swipe_id=1;message.mes='<tr-dialogue name="Lysa">Goodbye</tr-dialogue>';state.location.place='Library';
  assert.equal(host.sceneForMessage(1,message),null);
  await host.rememberScene(1,message,state,{participants:['Lysa']});
  assert.equal(host.sceneForMessage(1,message).location,'Library');
  message.swipe_id=0;message.mes='<tr-dialogue name="Kohaku">Hello</tr-dialogue>';
  assert.equal(host.sceneForMessage(1,message).location,'Academy');
 }finally{context.chat=previousChat;context.chatMetadata=previousMetadata;}
});

test('theme slider previews many inputs but saves global settings once on release',()=>{
 class Input {constructor(){this.dataset={uiSetting:'glassOpacity'};this.type='range';this.value='80';}closest(selector){return selector==='[data-ui-setting]'?this:null;}}
 sandbox.HTMLInputElement=Input;sandbox.HTMLSelectElement=class {};
 vm.runInContext('applyAppearance=()=>{};',sandbox);
 const original=context.saveSettingsDebounced;let saves=0;context.saveSettingsDebounced=()=>{saves++;};
 try{
  const slider=new Input();for(const value of ['60','65','70','75']){slider.value=value;host.onInterfaceSettingChange({type:'input',target:slider});}
  assert.equal(host.getSettings().glassOpacity,75);assert.equal(saves,0);
  host.onInterfaceSettingChange({type:'change',target:slider});host.onInterfaceSettingChange({type:'change',target:slider});
  assert.equal(saves,1);
 }finally{context.saveSettingsDebounced=original;}
});

test('a completed reply and a rollback each save chat metadata only once',async()=>{
 vm.runInContext('renderAll=()=>{};setSync=()=>{};writeContinuitySnapshot=()=>{};queueCharacterLifeSkillSync=()=>{};',sandbox);
 sandbox.CustomEvent=class {constructor(name,options){this.name=name;this.detail=options.detail;}};
 sandbox.dispatchEvent=()=>{};
 const beforeChat=context.chat,beforeMetadata=context.chatMetadata,beforeSave=context.saveMetadata;
 let writes=0;
 try{
  context.chat=[{is_user:true,mes:'Hello'}, {is_user:false,mes:'A quiet evening.'}];context.chatMetadata={};
  context.saveMetadata=async()=>{writes++;};
  host.assistantCheckpoint(1,{create:true});
  await host.processAssistantPatch(1,'normal');
  assert.equal(writes,1);
  assert.equal(Object.keys(context.chatMetadata.tretaresia_rpg_scene_history).length,1);
  await host.replaceAssistantTurnState(1,{reuseVariant:false});
  assert.equal(writes,2);
 }finally{context.chat=beforeChat;context.chatMetadata=beforeMetadata;context.saveMetadata=beforeSave;}
});

test('scene-only patch seeds a non-atlas place and updates canonical environment',()=>{
 const patch=host.extractStatePatch('Story<!--tretaresia_patch:{"sceneTracker":{"location":"ห้องพักของโคฮาคุ","position":"ข้างหน้าต่าง","weather":"ฝนตก","temperature":24}}-->').patch;
 assert.ok(patch);
 const {next,accepted}=host.applyStatePatch(host.defaultState(),patch);
 assert.equal(accepted,4);assert.equal(next.location.place,'ห้องพักของโคฮาคุ');
 assert.equal(next.onboarding.locationSeeded,true);assert.equal(next.location.region,'Unknown');
 assert.equal(next.scene.weather,'ฝนตก');assert.equal(next.scene.temperature,24);
 assert.equal(sceneSnapshot(next).location,next.location.place);
 assert.equal(sceneSnapshot(next).region,'');
});
test('explicit scene ops win over supplements and seed even a repeated opening place',()=>{
 const state=host.defaultState();
 const {next}=host.applyStatePatch(state,{ops:[['set','scene.currentPlace','Central Crown'],['set','scene.weather','Snow']],sceneTracker:{location:'Other room',weather:'Rain',temperature:null}});
 assert.equal(next.location.place,'Central Crown');assert.equal(next.onboarding.locationSeeded,true);
 assert.equal(next.scene.weather,'Snow');assert.equal(next.scene.temperature,null);
});
test('scene supplements cannot write unrelated state or replace a known location with unknown',()=>{
 const state=host.defaultState();state.onboarding.locationSeeded=true;state.location.place='Library';state.scene.temperature=18;
 const {next,accepted}=host.applyStatePatch(state,{ops:[],sceneTracker:{location:'Unknown',temperature:'',day:-1,time:'99:99',player:{hp:{current:0}}}});
 assert.equal(accepted,0);assert.equal(next.location.place,'Library');assert.equal(next.scene.temperature,18);assert.equal(next.player.hp.current,100);
});

test('manual sync reads earlier scene context, refreshes latest card, and saves once',async()=>{
 vm.runInContext('notify=()=>{};showEventNotifications=()=>{};',sandbox);
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 let writes=0;
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'We are in the Moon Library.'},{is_user:false,mes:'The lamps glow.'},{is_user:true,mes:'Hello'},{is_user:false,mes:'Welcome.'}];
  context.saveMetadata=async()=>{writes++;};
  context.generateQuietPrompt=async({quietPrompt})=>{
   assert.match(quietPrompt,/Moon Library/);assert.match(quietPrompt,/never replay earlier rewards/);
   return JSON.stringify({sceneTracker:{location:'Moon Library',position:'Reading table',weather:'Rain'}});
  };
  await host.analyzeChat({manual:true});
  assert.equal(host.getState().location.place,'Moon Library');
  assert.equal(host.sceneForMessage(3,context.chat[3]).location,'Moon Library');
  assert.equal(writes,1);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;}
});
test('manual sync discards results after a newer message arrives',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 let writes=0;
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'Hello'},{is_user:false,mes:'Welcome.'}];
  context.saveMetadata=async()=>{writes++;};
  context.generateQuietPrompt=async()=>{context.chat.push({is_user:true,mes:'We leave.'});return JSON.stringify({sceneTracker:{location:'Old room'}});};
  await host.analyzeChat({manual:true});
  assert.notEqual(host.getState().location.place,'Old room');assert.equal(writes,0);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;}
});
test('reply card uses canonical state over conflicting scene display fields',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata};
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'Hello'},{is_user:false,mes:'Welcome.'}];
  const state=host.defaultState();state.onboarding.locationSeeded=true;state.location.place='Library';state.scene.weather='Snow';
  await host.rememberScene(1,context.chat[1],state,{location:'Garden',weather:'Rain',lighting:'Lanterns'});
  const card=host.sceneForMessage(1,context.chat[1]);
  assert.equal(card.location,'Library');assert.equal(card.weather,'Snow');assert.equal(card.lighting,'Lanterns');
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;}
});
test('scene panel does not show an unconfirmed bootstrap place as current',()=>{
 sandbox.SVGElement=class {};
 const panel={innerHTML:'',querySelector:()=>null};
 host.renderScene(panel,host.defaultState());
 const cards=panel.innerHTML.split('<section class="tretaresia-scene-grid">')[1].split('</section>')[0];
 assert.doesNotMatch(cards,/Central Crown|Crown Heartlands|Central Continent/);
 const state=host.applyStatePatch(host.defaultState(),{ops:[],sceneTracker:{location:'Moon Library',region:'Moon District'}}).next;
 host.renderScene(panel,state);
 const updated=panel.innerHTML.split('<section class="tretaresia-scene-grid">')[1].split('</section>')[0];
 assert.match(updated,/Moon Library/);assert.match(updated,/Moon District/);
});

const fullScene={dayName:'Day 1',day:1,month:'Harvest',year:'1286',era:'Silver Age',calendar:'Moon Calendar',
 time:'08:00',period:'Morning',season:'Spring',location:'Moon Hall',region:'East Quarter',continent:'Central Continent',
 position:'At the window',weather:'Rain',temperature:21,lighting:'Lanterns',participants:['Kohaku'],
 objective:'Find the ledger',safety:'Safe',atmosphere:'Quiet',elapsed:'0 minutes'};

test('Manual Sync markers use actual main-chat indexes and require a completed reply inside the range',()=>{
 const chat=[{is_user:false,mes:'First message'},{is_system:true,mes:'Hidden'},{is_user:true,mes:'Start here'},
  {is_user:false,mes:'<tr-dialogue name="Kohaku">Answer</tr-dialogue>'},{is_user:true,mes:'Pending'}];
 assert.deepEqual(JSON.parse(JSON.stringify(host.manualSyncMarkers(chat).map(marker=>marker.index))),[0,2,3,4]);
 assert.deepEqual(JSON.parse(JSON.stringify(host.manualSyncSelection(chat,2,3)?.assistants.map(marker=>marker.index))),[3]);
 assert.equal(host.manualSyncSelection(chat,4,4),null);
 assert.equal(host.manualSyncSelection(chat,4,2),null);
});

test('Manual Sync audits an older selected interval, updates multiple tabs once, and preserves the live scene',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 let requests=0,writes=0;
 try{
  const state=host.defaultState();state.onboarding.locationSeeded=true;state.location.place='Present Hall';
  state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true,
   hStats:{mouthQuality:'Generated profile',oralSexCount:0},hStatsGenerated:['mouthQuality','oralSexCount']})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:true,mes:'Earlier journey'}, {is_user:false,mes:'Earlier hall'},
   {is_user:true,mes:'Ask Kohaku about an old event'}, {is_user:false,mes:'Kohaku confirms a recorded detail and a quest in Old Hall.'},
   {is_user:true,mes:'Walk to Present Hall'}, {is_user:false,mes:'We are in Present Hall.'}];
  context.saveMetadata=async()=>{writes++;};
  context.generateQuietPrompt=async({quietPrompt})=>{
   requests++;assert.match(quietPrompt,/ONE completed reply \(#4\)/);assert.doesNotMatch(quietPrompt,/Walk to Present Hall/);
   return JSON.stringify({ops:[['set','npcHStats',{npcId:'kohaku',field:'mouthQuality',value:'Established'}],
    ['inc','npcHStats',{npcId:'kohaku',field:'oralSexCount',amount:1}],
    ['upsert','quests',{id:'archival',name:'Archival Quest',type:'Quest',status:'Offered',objective:'Find a page'}],
    ['set','location.place','Old Hall']],sceneTracker:{...fullScene,location:'Old Hall',day:2,time:'09:00'}});
  };
  await host.analyzeChat({manual:true,startIndex:2,endIndex:3});
  assert.equal(requests,1);assert.equal(writes,1);
  assert.equal(host.getState().location.place,'Present Hall');
  assert.equal(host.getState().npcs[0].hStats.mouthQuality,'Established');
  assert.equal(host.getState().npcs[0].hStats.oralSexCount,1);
  assert.ok(!host.getState().npcs[0].hStatsGenerated.includes('mouthQuality'));
  assert.ok(!host.getState().npcs[0].hStatsGenerated.includes('oralSexCount'));
  assert.equal(host.getState().quests[0].name,'Archival Quest');
  assert.equal(host.sceneForMessage(3,context.chat[3]).location,'Old Hall');
  assert.equal(host.sceneForMessage(3,context.chat[3]).day,2);
  await host.analyzeChat({manual:true,startIndex:2,endIndex:3});
  assert.equal(host.getState().npcs[0].hStats.oralSexCount,1);
  assert.equal(host.getState().quests.length,1);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;}
});

test('Manual Sync selected turns advance story driven data across tabs in order with one metadata save',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 let requests=0,writes=0;
 try{
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true,trust:8})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:true,mes:'Receive a quest'}, {is_user:false,mes:'Kohaku offers a quest in Old Hall.'},
   {is_user:true,mes:'Accept and head out'}, {is_user:false,mes:'Kohaku trusts us. We reach Moon Hall.'}];
  context.saveMetadata=async()=>{writes++;};
  context.generateQuietPrompt=async()=>{
   requests++;
   return requests===1 ? JSON.stringify({ops:[['upsert','quests',{id:'one',name:'Quest One',type:'Quest',status:'Offered',objective:'Find clue'}]],sceneTracker:{...fullScene,location:'Old Hall'}})
    : JSON.stringify({ops:[['inc','npcValues',{npcId:'kohaku',field:'trust',amount:2}],
     ['inc','inventory',{id:'page',name:'Page',quantity:1,category:'Quest'}]],sceneTracker:fullScene});
  };
  await host.analyzeChat({manual:true,startIndex:0,endIndex:3});
  assert.equal(requests,2);assert.equal(writes,1);
  assert.equal(host.getState().quests[0].name,'Quest One');
  assert.equal(host.getState().npcs[0].trust,10);
  assert.equal(host.getState().inventory[0].quantity,1);
  assert.equal(host.getState().location.place,'Moon Hall');
  assert.equal(host.sceneForMessage(1,context.chat[1]).location,'Old Hall');
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;}
});

test('Manual Sync backfills a missing H-Stats field without recounting an auto tracked event',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const priorTrack=host.getSettings().autoTrack;host.getSettings().autoTrack=true;
 try{
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:true,mes:'Kohaku confirms the encounter.'},
   {is_user:false,mes:`Kohaku speaks about an oral event.<!--tretaresia_patch:${JSON.stringify({ops:[['inc','npcHStats',{npcId:'kohaku',field:'oralSexCount',amount:1}]],sceneTracker:fullScene})}-->`}];
  context.saveMetadata=async()=>{};
  context.generateQuietPrompt=async()=>JSON.stringify({ops:[]});
  await host.processAssistantPatch(1,'normal');
  assert.equal(host.getState().npcs[0].hStats.oralSexCount,1);
  context.generateQuietPrompt=async()=>JSON.stringify({ops:[
   ['inc','npcHStats',{npcId:'kohaku',field:'oralSexCount',amount:1}],
   ['set','npcHStats',{npcId:'kohaku',field:'mouthQuality',value:'Recorded'}],
  ],sceneTracker:fullScene});
  await host.analyzeChat({manual:true,startIndex:0,endIndex:1});
  assert.equal(host.getState().npcs[0].hStats.oralSexCount,1);
  assert.equal(host.getState().npcs[0].hStats.mouthQuality,'Recorded');
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;host.getSettings().autoTrack=priorTrack;}
});

test('NPC progression recovery targets only met participants and rejects unrelated or repeated changes',()=>{
 const base=host.defaultState();base.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true,trust:10,
  abilities:[{id:'holy',name:'Holy Light',level:'Adept',proficiency:0}]}),
 host.npcProfile({id:'amy',name:'Amy',met:true}),host.npcProfile({id:'lore',name:'Lore',met:false})];
 const candidates=host.npcProgressionCandidates(base,{mes:'<tr-dialogue name="Kohaku">I practiced Holy Light.</tr-dialogue> A story about Lore and Amy.'});
 assert.deepEqual([...candidates.map(npc=>npc.id)],['kohaku','amy']);
 const later=host.applyStatePatch(base,{ops:[['inc','npcValues',{npcId:'kohaku',field:'trust',amount:2}]]}).next;
 const operations=host.npcProgressionOperations([
  ['inc','npcValues',{npcId:'kohaku',field:'trust',amount:2}],
  ['inc','npcAbilities',{npcId:'kohaku',name:'Holy Light',amount:3}],
  ['inc','npcAbilities',{npcId:'kohaku',id:'holy',amount:3}],
  ['inc','npcAbilities',{npcId:'kohaku',name:'Invented Skill',amount:3}],
  ['inc','npcValues',{npcId:'lore',field:'trust',amount:2}],
  ['set','npcHStats',{npcId:'kohaku',field:'condition',value:'extra'}],
 ],candidates,later,base);
 assert.deepEqual(JSON.parse(JSON.stringify(operations)),[['inc','npcAbilities',{npcId:'kohaku',name:'Holy Light',amount:3}]]);
});

test('NPC H-Stats recovery retains more than twelve distinct confirmed fields',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true})];
 const fields=H_FIELDS.filter(field=>field.type==='text').slice(0,14);
 const raw=fields.map(field=>['set','npcHStats',{npcId:'kohaku',field:field.key,value:`Confirmed ${field.key}`}]);
 const recovered=host.npcProgressionOperations(raw,state.npcs,state,state);
 assert.equal(recovered.length,14);
 const {next,accepted}=host.applyStatePatch(state,{ops:recovered});
 assert.equal(accepted,14);
 assert.equal(next.npcs[0].hStats[fields.at(-1).key],`Confirmed ${fields.at(-1).key}`);
});

test('inline NPC progression is applied without any recovery generation',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const settings=host.getSettings(), prior=settings.autoTrack;settings.autoTrack=true;
 try{
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true,trust:10})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  const ops=[['inc','npcValues',{npcId:'kohaku',field:'trust',amount:2}]];
  context.chat=[{is_user:true,mes:'Talk.'},{is_user:false,mes:`Kohaku trusts you.<!--tretaresia_patch:${JSON.stringify({ops,sceneTracker:fullScene})}-->`}];
  let requests=0;context.generateQuietPrompt=async()=>{requests++;throw Error('Unexpected generation');};context.saveMetadata=async()=>{};
  await host.processAssistantPatch(1,'normal');await host.processAssistantPatch(1,'normal');
  assert.equal(host.getState().npcs[0].trust,12);assert.equal(requests,0);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;settings.autoTrack=prior;}
});

test('compact scene delta inherits all previous fields and keeps freeform group roles',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata};
 const settings=host.getSettings(),old=settings.autoTrack;settings.autoTrack=true;
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'Enter Moon Hall.'},{is_user:false,mes:`The hall is quiet.<!--tretaresia_patch:${JSON.stringify({ops:[],sceneTracker:fullScene})}-->`}];
  context.saveMetadata=async()=>{};await host.processAssistantPatch(1,'normal');
  context.chat.push({is_user:true,mes:'Walk to the library.'},{is_user:false,mes:'We reach the library.<!--tretaresia_patch:{"ops":[],"sceneTracker":{"loc":"Library","t":"08:15","pos":"Reading desk","dt":"15 minutes"}}-->'});
  await host.processAssistantPatch(3,'normal');
  const scene=host.sceneForMessage(3,context.chat[3]);
  assert.deepEqual([...scene.missing],[]);assert.equal(scene.location,'Library');assert.equal(scene.calendar,fullScene.calendar);
  assert.equal(host.getState().location.place,'Library');
  const party=host.normalize({...host.getState(),social:{...host.getState().social,party:{name:'Moon Guard',memberIds:['kohaku'],roles:{kohaku:'Spirit Guide'}}}}).social.party;
  assert.equal(party.roles.kohaku,'Spirit Guide');
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;settings.autoTrack=old;}
});

test('each complete normal reply records a distinct full scene without an extra AI call',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const priorTrack=host.getSettings().autoTrack;host.getSettings().autoTrack=true;
 let requests=0,writes=0;
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'Enter Moon Hall.'},
   {is_user:false,mes:`Moon Hall is quiet.<!--tretaresia_patch:${JSON.stringify({ops:[],sceneTracker:fullScene})}-->`}];
  context.generateQuietPrompt=async()=>{requests++;throw Error('should not be called');};
  context.saveMetadata=async()=>{writes++;};
  await host.processAssistantPatch(1,'normal');
  const first=host.sceneForMessage(1,context.chat[1]);
  assert.deepEqual([...first.missing],[]);assert.equal(first.calendar,'Moon Calendar');assert.equal(first.location,'Moon Hall');
  context.chat.push({is_user:true,mes:'Walk to the observatory.'},
   {is_user:false,mes:`We are at the observatory.<!--tretaresia_patch:${JSON.stringify({ops:[],sceneTracker:{...fullScene,location:'Observatory',position:'At the telescope',time:'08:10',elapsed:'10 minutes'}})}-->`});
  await host.processAssistantPatch(3,'normal');
  assert.equal(host.sceneForMessage(3,context.chat[3]).location,'Observatory');
  assert.equal(host.sceneForMessage(1,context.chat[1]).location,'Moon Hall');
  assert.equal(host.getState().location.place,'Observatory');
  assert.equal(requests,0);assert.equal(writes,2);
  host.updatePrompt(host.getState());assert.match(context.lastPrompt[1],/PREVIOUS SCENE.*Observatory/);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;host.getSettings().autoTrack=priorTrack;}
});

test('missing scene, diary and invitation data never trigger an extra AI request',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const settings=host.getSettings(), prior=settings.autoTrack;settings.autoTrack=true;
 try{
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:true,mes:'Invite me to the guild and write a diary.'},{is_user:false,mes:'<tr-dialogue name="Kohaku">I invite you to join the guild "Dawnspire".</tr-dialogue>'}];
  let requests=0;context.generateQuietPrompt=async()=>{requests++;throw Error('Unexpected generation');};context.saveMetadata=async()=>{};
  await host.processAssistantPatch(1,'normal');
  assert.equal(requests,0);assert.equal(host.getState().social.guilds.length,0);
  assert.equal(host.socialEventsForMessage(1,context.chat[1]).groupOffers[0].name,'Dawnspire');
  assert.ok(host.sceneForMessage(1,context.chat[1]).missing.length>0);
  assert.equal(host.diaryForMessage(1,context.chat[1]).length,0);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;settings.autoTrack=prior;}
});

test('stream previews scene and social data without persisting or accepting before completion',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata};
 const settings=host.getSettings(), prior=settings.autoTrack;settings.autoTrack=true;
 try{
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  const ops=[['offer','guildInvitation',{npcId:'kohaku',name:'Dawnspire',memberCount:120}],['append','npcDiary',{npcId:'kohaku',text:'I hope our new friend will stay.'}]];
  context.chat=[{is_user:true,mes:'Talk.'},{is_user:false,mes:`<!--tretaresia_patch:${JSON.stringify({ops:[],sceneTracker:fullScene})}--><tr-dialogue name="Kohaku">Join our guild.</tr-dialogue><!--tretaresia_patch:${JSON.stringify({ops})}--><tr-narrative>The invitation glows`}];
  let writes=0;context.saveMetadata=async()=>{writes++;};
  host.setLiveGeneration(true);
  const snapshot=JSON.stringify(context.chatMetadata);
  assert.equal(host.sceneForMessage(1,context.chat[1]).location,'Moon Hall');
  assert.equal(host.socialEventsForMessage(1,context.chat[1]).groupOffers[0].preview,true);
  assert.equal(host.diaryForMessage(1,context.chat[1])[0].npcName,'Kohaku');
  assert.equal(await host.answerGroupOffer(1,'guild:dawnspire',true),false);
  await host.processAssistantPatch(1,'normal');
  assert.equal(writes,0);assert.equal(JSON.stringify(context.chatMetadata),snapshot);
  host.setLiveGeneration(false);await host.processAssistantPatch(1,'normal');
  assert.equal(writes,1);assert.equal(host.socialEventsForMessage(1,context.chat[1]).groupOffers[0].preview,undefined);
  assert.equal(host.diaryForMessage(1,context.chat[1]).length,1);
  assert.equal(host.getState().social.guilds.length,0);
 }finally{host.setLiveGeneration(false);context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;settings.autoTrack=prior;}
});

test('a partial scene preserves supplied facts and leaves missing data open without calls',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const priorTrack=host.getSettings().autoTrack;host.getSettings().autoTrack=true;
 let requests=0,writes=0;
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'Hello.'},
   {is_user:false,mes:`The rain reaches Moon Hall.<!--tretaresia_patch:${JSON.stringify({ops:[],sceneTracker:{location:'Moon Hall',weather:'Rain'}})}-->`}];
  context.saveMetadata=async()=>{writes++;};
  context.generateQuietPrompt=async()=>{requests++;throw Error('Got response status 524');};
  await host.processAssistantPatch(1,'normal');
  const scene=host.sceneForMessage(1,context.chat[1]);
  assert.equal(scene.location,'Moon Hall');assert.equal(scene.weather,'Rain');
  assert.ok(scene.missing.includes('month'));assert.ok(scene.missing.includes('temperature'));
  assert.equal(requests,0);assert.equal(writes,1);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;host.getSettings().autoTrack=priorTrack;}
});
