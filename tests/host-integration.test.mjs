import * as auctionCore from '../src/auction-core.js';
import {auctionErrorText} from '../src/auction-ui.js';
import * as marketplaceCore from '../src/marketplace-core.js';
import * as marketplaceEvents from '../src/marketplace-events.js';
import {renderMarketplacePanel} from '../src/marketplace-ui.js';
import * as missionBoard from '../src/mission-board.js';
import * as groupBoard from '../src/group-board.js';
import {growthInventoryNotifications} from '../src/growth-notifications.js';
import {questRewardGuard,normalizeQuestRewardReceipts} from '../src/quest-rewards.js';
import * as uiLanguage from '../src/ui-language.js';
import * as powers from '../src/power-presets.js';
import * as forgePresets from '../src/forge-presets.js';
import {normalizeModuleNavigationMode} from '../src/module-navigation.js';
import * as memory from '../src/memory-summaries.js';
import {memorySummaryNativeGenerationActive,requestMemorySummary} from '../src/memory-summary-runtime.js';
import {hostReplyGenerating,loadHostGenerationModule} from '../src/host-generation-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { identity, CHAT_INSTRUCTIONS, ATTRIBUTE_INSTRUCTIONS, npcAttributeDefaults, resolveNpc, resolveNpcSpeaker, keyName, parseStory, retainManualNpcEdits, npcRole, usableNpcName, NPC_FIELD_INSTRUCTIONS } from '../src/npc-core.js';
import {H_FIELDS,H_FIELD_MAP,hStats,updateHStat} from '../src/h-stats.js';
import * as scopes from '../src/npc-scopes.js';
import * as npcAlternates from '../src/npc-alternates.js';
import * as lore from '../src/lore-core.js';
import * as archive from '../src/character-archive.js';
import * as storyMemory from '../src/story-memory.js';
import * as storyAgenda from '../src/story-agenda.js';
import * as questObjectives from '../src/quest-objectives.js';
import * as storyWorkspace from '../src/story-workspace.js';
import {sceneSnapshot,sceneTrackerOperations,missingSceneFields,expandScene,normalizeNarrativeLocation,narrativeLocationLabel} from '../src/scene-tracker.js';
import * as locationMemory from '../src/location-memory.js';
import * as masteryTraining from '../src/mastery-training.js';
import * as powerMastery from '../src/power-mastery.js';
import {normalizeAdultSettings,writingPreferencePrompt} from '../src/nsfw-enhance.js';
import {allowedDiaryOps,diaryRates,householdOffers,groupOffers,confirmedGroupMembership,establishedGroupOperations,groupMembershipEnded} from '../src/social-events.js';

// Evaluate the real host integration without startup or network. No reimplementation of its parser.
const context={extensionSettings:{tretaresia_rpg:{enableMissionBoard:true,enableAuctions:true,enableStoryMemory:true,enableStoryAgenda:true,enableQuestObjectives:true,enableMemorySummaries:true,eventNotifications:true}},chatMetadata:{},chat:[{is_user:true,mes:'Hello'}],getCurrentChatId:()=> 'test-chat',getRequestHeaders:()=>({'Content-Type':'application/json'}),fetch:async()=>({ok:true,status:200}),setExtensionPrompt:(...args)=>{context.lastPrompt=args;},saveSettingsDebounced(){}};
const sandbox={normalizeMemoryStrategy:memory.normalizeMemoryStrategy,normalizeMemoryOutputTokens:memory.normalizeMemoryOutputTokens,memorySummaryNativeGenerationActive,hostReplyGenerating,loadHostGenerationModule,normalizeModuleNavigationMode,...npcAlternates,...auctionCore,auctionErrorText,...marketplaceCore,...marketplaceEvents,renderMarketplacePanel,...missionBoard,...groupBoard,...masteryTraining,growthInventoryNotifications,...storyMemory,...storyAgenda,...questObjectives,...storyWorkspace,...locationMemory,questRewardGuard,normalizeQuestRewardReceipts,...uiLanguage,...powers,...forgePresets,mountPowerWorkspace(){},mountForgeWorkspace(){},...scopes,...lore,...archive,fetch:async()=>({ok:true,status:200}),sceneSnapshot,sceneTrackerOperations,missingSceneFields,expandScene,normalizeNarrativeLocation,narrativeLocationLabel,normalizeAdultSettings,writingPreferencePrompt,allowedDiaryOps,diaryRates,householdOffers,groupOffers,confirmedGroupMembership,establishedGroupOperations,groupMembershipEnded,H_FIELDS,H_FIELD_MAP,hStats,updateHStat,console,structuredClone,setTimeout,clearTimeout,URL,Blob,TextEncoder,crypto:globalThis.crypto,npcIdentity:identity,CHAT_INSTRUCTIONS,ATTRIBUTE_INSTRUCTIONS,npcAttributeDefaults,resolveNpc,resolveNpcSpeaker,keyName,parseStory,retainManualNpcEdits,npcRole,usableNpcName,NPC_FIELD_INSTRUCTIONS,
    createNpcWorkspace(){},...powerMastery,SillyTavern:{getContext:()=>context,libs:{}},document:{readyState:'loading',addEventListener(){},getElementById(){return null;},querySelectorAll(){return[];}},localStorage:{getItem(){return null;},setItem(){}},globalThis:null};
sandbox.globalThis=sandbox;
const source=readFileSync(new URL('../index.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
 vm.createContext(sandbox);vm.runInContext(`${source}\n globalThis.testHost={writeContinuitySnapshot,copyContinuityMedia,activeContinuityKey,changeOptionalSystem,renderPanel,runAuctionAction,auctionForMessage,rememberAuctionOffer,missionBoardForMessage,acceptBoardMission,rememberMissionBoard,eventNotificationEnabled,portableState,aiState,storyAgendaAlerts,storyAgendaNotice,manualSyncHistoricalOperations,onSubmit,onPanelClick,renderQuestCard,getPowerPreset,powerPresetOwner,statePrompt,liveReplyPreview,setLiveGeneration(value){liveGeneration=value;},markCompleted(message){completedAssistantMessages.add(message);},npcProfile,normalize,defaultState,applyStatePatch,extractStatePatch,confirmedLocationMemory,getSettings,updatePrompt,roleplayState,friendlyNpcs,metFriendlyNpcs,getState,characterNpcLibrary,storedNpcState,persistNpcScope,requestUsage,recordExtensionRequest,routeStoryNpcState,registerStorySpeakers,activeCharacterLore,activeLorePrompt,persistCharacterLore,parseJson,synchronizeWorldState,advanceActiveTravelFromUserMessage,travelProgress,rememberScene,sceneForMessage,socialEventsForMessage,diaryForMessage,answerHouseholdOffer,answerGroupOffer,renderGroups,renderHousehold,onInterfaceSettingChange,processAssistantPatch,assistantCheckpoint,saveCurrentChatMetadata,replaceAssistantTurnState,analyzeChat,manualSyncMarkers,manualSyncSelection,manualSyncHistory,renderScene,trackedStateSnapshot,appendStateAudit,renderHStats,chooseHStatsNpc,removeHStatsNpc,visibleHStatsNpcs,getHStatsLayout,setHStatsLayout,toggleHStatsManage,requestHideHStatsNpc,cancelHideHStatsNpc,confirmHideHStatsNpc,undoHideHStatsNpc,hStatsFormValues,hStatsMissingFields,completeHStatsBaseline,catchUpGroupMemberships,confirmedSocialOperations,npcProgressionCandidates,npcProgressionOperations,parseRegistrationMessage,forgeEligible,forgeDraft,applyForgeProfile,startForgeOpening,forgeSession};`,sandbox);
const host=sandbox.testHost;

test('native summary task temporarily removes only RoleForge story instructions and restores them afterwards',async()=>{
 const pending=requestMemorySummary({generateQuietPrompt:async()=>{
  host.updatePrompt(host.defaultState());assert.equal(context.lastPrompt[1],'');
  assert.equal(context.lastPrompt[0],'tretaresia_rpg_roleplay_state');
  return '{}';
 }},'Summarize','','signal');
 await pending;host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/tretaresia_rpg_state/);
});

test('RPG handoff persists exact stats, inventory, money and receipts without summary reconstruction',()=>{
 const previous=context.character,originalStorage=sandbox.localStorage;
 const records=new Map();sandbox.localStorage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
 try {
  context.character={avatar:'handoff-test.png'};
  const state=host.defaultState();state.player.level=17;state.progression.experience=1234;state.player.hp={current:61,max:130};
  state.progression.currency={gold:13,silver:2,copper:120};state.inventory=[{id:'rod',name:'Fishing rod',category:'Tool',quantity:2,description:'A gift from Cora'}];
  state.skills=[{id:'fishing',name:'Fishing',type:'Passive',level:3,description:'Practised with Cora'}];state.questRewardReceipts=[{questId:'caravan',name:'Caravan escort',claimedAt:'2026-10-01'}];
  const canonical=host.normalize(state);assert.equal(host.writeContinuitySnapshot(canonical),true);
  const saved=JSON.parse([...records.values()][0]);
  assert.equal(saved.state.player.level,17);assert.deepEqual(saved.state.player.hp,JSON.parse(JSON.stringify(canonical.player.hp)));assert.deepEqual(saved.state.skills,JSON.parse(JSON.stringify(canonical.skills)));assert.deepEqual(saved.state.progression,JSON.parse(JSON.stringify(canonical.progression)));
  assert.deepEqual(saved.state.inventory,JSON.parse(JSON.stringify(canonical.inventory)));assert.deepEqual(saved.state.questRewardReceipts,JSON.parse(JSON.stringify(canonical.questRewardReceipts)));
  assert.equal(saved.sourceChatId,'test-chat');assert.equal(saved.state.npcs.length,0);
  sandbox.localStorage.setItem=()=>{throw Error('Quota exhausted');};assert.equal(host.writeContinuitySnapshot(canonical),false);
 } finally {context.character=previous;sandbox.localStorage=originalStorage;}
});

const alternateFixture=()=>host.npcProfile({id:'cora',name:'Cora',aliases:['コーラ'],met:true,age:'28',appearance:'Adult profile marker',background:'Adult background marker',personality:'Reserved',isHostile:false,
 stats:{level:8,strength:18,mp:40},abilities:[{id:'adult-skill',name:'Tracking',proficiency:60}],customMeters:[{id:'focus',name:'Focus',value:50}],
 hasPortrait:true,portraitSource:'server',portraitPath:'/user/images/tretaresia-npc/adult.webp',activeAlternateId:'child',alternateProfiles:[
  {id:'child',label:'Childhood',fields:{age:'9',appearance:'Child profile marker',background:'Child background marker',stats:{level:1,strength:3,mp:0},abilities:[],customMeters:[{id:'focus',name:'Focus',value:12}]},hasPortrait:true,portraitSource:'server',portraitPath:'/user/images/tretaresia-npc/child.webp'},
  {id:'future',label:'Later',fields:{age:'40',background:'Inactive future marker',stats:{strength:30}}}
 ]});

test('complete handoff uses durable fallback storage without dropping Chat NPCs, legacy H-Stats selection or alternate dossiers',async()=>{
 const previous=context.character,originalStorage=sandbox.localStorage,originalLibs=sandbox.SillyTavern.libs,metadata=context.chatMetadata;
 const records=new Map();
 try {
  context.character={avatar:'large-handoff.png'};
  sandbox.localStorage={getItem:()=>null,setItem(){throw Error('Quota exhausted');}};
  sandbox.SillyTavern.libs={localforage:{async setItem(key,value){records.set(key,structuredClone(value));}}};
  context.chatMetadata={tretaresia_rpg_selected_hstats_npc:'cora'};
  const state=host.normalize({...host.defaultState(),npcs:[{...alternateFixture(),npcScope:'chat',hStats:{loyaltyHearts:4}}]});
  assert.equal(await host.writeContinuitySnapshot(state),true);
  const saved=[...records.values()][0];assert.equal(saved.npcTransfer,'all');assert.equal(saved.state.npcs[0].npcScope,'chat');
  assert.equal(saved.state.npcs[0].hStats.loyaltyHearts,4);assert.equal(saved.state.npcs[0].alternateProfiles.length,2);
  assert.equal(saved.state.npcs[0].alternateProfiles[0].portraitPath,'/user/images/tretaresia-npc/child.webp');
  assert.deepEqual(Array.from(saved.hStatsRoster.visible),['cora']);assert.equal(saved.hStatsRoster.selected,'cora');
 } finally {context.character=previous;sandbox.localStorage=originalStorage;sandbox.SillyTavern.libs=originalLibs;context.chatMetadata=metadata;}
});

test('unavailable media retains every dossier and track with original references across repeated handoffs',async()=>{
 const originalLibs=sandbox.SillyTavern.libs;
 try {
  sandbox.SillyTavern.libs={};
  const state=host.normalize({...host.defaultState(),npcs:[{...alternateFixture(),npcScope:'chat',hasPortrait:true,portraitSource:'local',portraitPath:'',
   alternateProfiles:[{id:'child',label:'Childhood',fields:{background:'Saved childhood'},hasPortrait:true,portraitSource:'local'}]}],
   music:{tracks:[{id:'river',name:'River song',fileName:'river.wav'}],currentId:'river'}});
  const carried=await host.copyContinuityMedia(state,'first','second');
  assert.equal(carried.npcs.length,1);assert.equal(carried.npcs[0].hasPortrait,true);assert.equal(carried.npcs[0].portraitChatId,'first');
  assert.equal(carried.npcs[0].alternateProfiles[0].hasPortrait,true);assert.equal(carried.npcs[0].alternateProfiles[0].portraitChatId,'first');
  assert.equal(carried.music.tracks.length,1);assert.equal(carried.music.tracks[0].sourceChatId,'first');
  const again=await host.copyContinuityMedia(carried,'second','third');
  assert.equal(again.npcs[0].portraitChatId,'first');assert.equal(again.npcs[0].alternateProfiles[0].portraitChatId,'first');assert.equal(again.music.tracks[0].sourceChatId,'first');
 } finally {sandbox.SillyTavern.libs=originalLibs;}
});

test('alternate NPC normalization and both model contexts use selected information without inactive biographies or images',()=>{
 const state=host.normalize({...host.defaultState(),npcs:[alternateFixture()]});const npc=state.npcs[0];
 assert.equal(npc.age,'28');assert.equal(npc.alternateProfiles.length,2);assert.equal(npc.id,'cora');assert.equal(npc.activeAlternateId,'child');
 const tracker=host.aiState(state).npcs[0],roleplay=host.roleplayState(state).privateTrackerReferenceIndex.npcProfiles[0];
 for(const view of [tracker,roleplay]){assert.equal(view.age,'9');assert.equal(view.appearance,'Child profile marker');assert.equal(view.activeAlternateId,'child');assert.equal(view.activeAlternateLabel,'Childhood');assert.doesNotMatch(JSON.stringify(view),/Adult profile marker|Adult background marker|Inactive future marker|user\/images|portraitView/);}
 assert.equal(tracker.stats.mp,0);assert.deepEqual(Array.from(tracker.abilities),[]);
 assert.equal(state.npcs[0].age,'28');
});

test('story upserts change only active alternate fields and cannot replace or select saved versions',()=>{
 const state=host.normalize({...host.defaultState(),npcs:[alternateFixture()]});const future=JSON.stringify(state.npcs[0].alternateProfiles[1]);
 const result=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:'cora',name:'Cora',age:'10',personality:'Curious',stats:{mp:5},isHostile:true,activeAlternateId:'future',alternateProfiles:[]}]]});
 assert.equal(result.accepted,1);assert.equal(result.next.npcs.length,1);const npc=result.next.npcs[0],view=npcAlternates.effectiveNpc(npc);
 assert.equal(npc.activeAlternateId,'child');assert.equal(npc.age,'28');assert.equal(npc.personality,'Reserved');assert.equal(view.age,'10');assert.equal(view.personality,'Curious');assert.equal(view.stats.mp,5);assert.equal(view.stats.strength,3);assert.equal(npc.stats.strength,18);assert.equal(npc.isHostile,true);assert.equal(JSON.stringify(npc.alternateProfiles[1]),future);
 assert.equal(npc.portraitPath,'/user/images/tretaresia-npc/adult.webp');assert.equal(view.portraitPath,'/user/images/tretaresia-npc/child.webp');
});

test('relationship, attribute, skill and custom meter operations evolve active alternate without overwriting base',()=>{
 const state=host.normalize({...host.defaultState(),npcs:[alternateFixture()]});const before=state.npcs[0];
 const {accepted,next}=host.applyStatePatch(state,{ops:[['inc','npcValues',{npcId:'cora',field:'stats.strength',amount:1}],['inc','npcValues',{npcId:'cora',field:'trust',amount:2}],['upsert','npcAbilities',{npcId:'cora',id:'child-skill',name:'Fishing',proficiency:10}],['inc','npcAbilities',{npcId:'cora',id:'child-skill',amount:3}],['upsert','npcMeters',{npcId:'cora',id:'focus',name:'Focus',value:15}]]});
 assert.equal(accepted,5);const npc=next.npcs[0],view=npcAlternates.effectiveNpc(npc);
 assert.equal(view.stats.strength,4);assert.equal(view.trust,before.trust+2);assert.equal(view.abilities[0].name,'Fishing');assert.equal(view.abilities[0].proficiency,13);assert.equal(view.customMeters[0].value,15);
 assert.equal(npc.stats.strength,18);assert.equal(npc.trust,before.trust);assert.equal(npc.abilities[0].id,'adult-skill');assert.equal(npc.customMeters[0].value,50);
 const restored=npcAlternates.effectiveNpc({...npc,activeAlternateId:''});assert.equal(restored.age,'28');assert.equal(restored.abilities[0].name,'Tracking');
});

test('progression follow-up compares selected alternate values and rejects a second update already in the main reply',()=>{
 const base=host.normalize({...host.defaultState(),npcs:[alternateFixture()]});const skill=host.applyStatePatch(base,{ops:[['upsert','npcAbilities',{npcId:'cora',id:'fishing',name:'Fishing',proficiency:10}]]}).next;
 const current=host.applyStatePatch(skill,{ops:[['inc','npcValues',{npcId:'cora',field:'stats.strength',amount:1}]]}).next;
 const ops=host.npcProgressionOperations([['inc','npcValues',{npcId:'cora',field:'stats.strength',amount:1}],['inc','npcAbilities',{npcId:'cora',id:'fishing',amount:2}]],host.npcProgressionCandidates(current,{mes:'Cora learns fishing.'}),current,skill);
 assert.equal(ops.length,1);assert.equal(ops[0][1],'npcAbilities');
});

test('portable data retains server image references for every alternate and marks local-only portraits unavailable',()=>{
 const state=host.normalize({...host.defaultState(),npcs:[alternateFixture()]});state.npcs[0].alternateProfiles[1].hasPortrait=true;state.npcs[0].alternateProfiles[1].portraitSource='local';
 const exported=host.portableState(state).npcs[0];assert.equal(exported.id,'cora');assert.equal(exported.activeAlternateId,'child');assert.equal(exported.hasPortrait,true);assert.equal(exported.alternateProfiles[0].portraitPath,'/user/images/tretaresia-npc/child.webp');assert.equal(exported.alternateProfiles[0].hasPortrait,true);assert.equal(exported.alternateProfiles[1].portraitSource,'none');assert.equal(exported.alternateProfiles[1].hasPortrait,false);
 assert.equal(state.npcs[0].alternateProfiles[1].portraitSource,'local');
});

test('fresh settings opt out of all all optional systems and popups, with no optional state or protocol in prompts',()=>{
 const previous=context.extensionSettings;
 try{
  context.extensionSettings={};const settings=host.getSettings();
  for(const key of ['enableMissionBoard','enableAuctions','enableStoryMemory','enableStoryAgenda','enableQuestObjectives','enableMemorySummaries','eventNotifications'])assert.equal(settings[key],false,key);
  assert.equal(settings.preserveNativeChat,false);
  const state=host.defaultState();state.storyMemories=[{id:'secret',title:'Secret',detail:'Unique paused fact marker',status:'Active',kind:'Fact'}];state.storyAgenda=[{id:'visit',title:'Visit',status:'Scheduled',dueDay:1}];
  const prompt=host.statePrompt(state,{includeState:true,track:true});assert.doesNotMatch(prompt,/Mission Board:|Auction UI:|Story memory: upsert|Appointments and deadlines:|Quest objectives: include|Unique paused fact marker/);
  assert.equal(host.roleplayState(state).sceneContext.auctions,undefined);assert.equal(host.aiState(state).storyMemories,undefined);
  settings.enableMissionBoard=true;settings.enableAuctions=true;settings.enableStoryMemory=true;
  const enabled=host.statePrompt(state,{includeState:true,track:true});assert.match(enabled,/Mission Board:/);assert.match(enabled,/Auction UI:/);assert.match(enabled,/Story memory: upsert/);
 }finally{context.extensionSettings=previous;}
});

test('disabled optional updates cannot create records or overwrite saved checklists; ordinary quest payment still works once',()=>{
 const previous=context.extensionSettings;
 try{
  context.extensionSettings={};let state=host.defaultState();state.quests=[{id:'old',name:'Old quest',status:'Active',progress:25,rewardClaimed:false,objectives:[{id:'step',title:'Meet Cora',status:'Pending',optional:false}]}];
  const result=host.applyStatePatch(state,{ops:[['upsert','storyMemories',{title:'Ignore',detail:'Ignore'}],['upsert','storyAgenda',{title:'Ignore'}],['upsert','questObjectives',{questId:'old',id:'step',status:'Completed'}],['upsert','quests',{id:'old',status:'Completed',objectives:[]}],['inc','progression.currency.gold',3,{questId:'old',category:'quest-reward',reason:'Old quest payment'}]]});
  assert.equal(result.next.storyMemories.length,0);assert.equal(result.next.storyAgenda.length,0);assert.equal(result.next.quests[0].objectives[0].status,'Pending');assert.equal(result.next.quests[0].status,'Completed');assert.equal(result.next.progression.currency.gold,3);
  assert.equal(host.applyStatePatch(result.next,{ops:[['inc','progression.currency.gold',3,{questId:'old',category:'quest-reward',reason:'Old quest payment'}]]}).next.progression.currency.gold,3);
  host.getSettings().enableQuestObjectives=true;const restored=host.normalize(result.next);assert.equal(restored.quests[0].objectives[0].title,'Meet Cora');
 }finally{context.extensionSettings=previous;}
});

test('optional switches preserve explicit saved choices and active auction reserves after turning off',async()=>{
 const previous={settings:context.extensionSettings,state:context.chatMetadata};
 try{
  context.extensionSettings={tretaresia_rpg:{enableMissionBoard:true,enableMemorySummaries:false,eventNotifications:true,preserveNativeChat:true}};const settings=host.getSettings();assert.equal(settings.preserveNativeChat,true);assert.equal(settings.enableMissionBoard,true);assert.equal(settings.eventNotifications,true);assert.equal(settings.enableAuctions,false);
  const offer={id:'held',title:'Hall',location:'Hall',denomination:'gold',deposit:5,lots:[{id:'blade',name:'Blade',openingBid:6,minIncrement:1}]};let state=host.defaultState();state.progression.currency.gold=30;state=auctionCore.applyAuctionAction(state,offer,'join').next;state=auctionCore.applyAuctionAction(state,offer,'bid',{amount:20,revision:1}).next;
  context.chatMetadata={tretaresia_rpg_state:state};const result=host.applyStatePatch(state,{ops:[['inc','progression.currency.gold',-6,{reason:'Purchase'}],['inc','progression.currency.gold',-20,{reason:'Auction payment'}]]});assert.equal(result.accepted,0);assert.equal(result.next.progression.currency.gold,30);
  assert.equal((await host.runAuctionAction(null,'held','resume:held','bid',21,2)).error,'disabled');assert.equal(auctionCore.auctionAvailable(host.getState()).gold,5);
 }finally{context.extensionSettings=previous.settings;context.chatMetadata=previous.state;}
});

test('display regex keeps enabled header/narrative/dialogue instructions and only explicit presentation OFF removes them',()=>{
 const settings=host.getSettings(),prior={regex:context.extensionSettings.regex,presentation:settings.chatPresentation};
 try{
  settings.chatPresentation=true;context.extensionSettings.regex=[{disabled:false,placement:[2],markdownOnly:true,promptOnly:false,findRegex:'foo',replaceString:'bar'}];
  const prompt=host.statePrompt(host.defaultState(),{includeState:true,track:true});
  for(const tag of ['tr-header','tr-narrative','tr-dialogue'])assert.match(prompt,new RegExp('<'+tag));
  assert.match(prompt,/ROLEFORGE PATCH PROTOCOL/);
  host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/<tr-dialogue/);
  const presentationOnly=host.statePrompt(host.defaultState(),{includeState:false,track:false});assert.match(presentationOnly,/<tr-header/);assert.doesNotMatch(presentationOnly,/must be upserted/);
  settings.chatPresentation=false;const off=host.statePrompt(host.defaultState(),{includeState:true,track:true});assert.doesNotMatch(off,/<tr-dialogue|<tr-narrative|<tr-header/);assert.match(off,/ROLEFORGE PATCH PROTOCOL/);
 }finally{settings.chatPresentation=prior.presentation;if(prior.regex===undefined)delete context.extensionSettings.regex;else context.extensionSettings.regex=prior.regex;}
});

test('auction patches survive state export and cannot replay locally settled money/items or spend reserves',()=>{
 let start=host.defaultState();start.progression.currency.gold=30;
 const offer={id:'test-auction',title:'Hall Auction',location:'Hall',denomination:'gold',entryFee:0,deposit:4,lots:[{id:'blade',name:'Blade',openingBid:5,minIncrement:1,bidders:[]}]};
 start=auctionCore.applyAuctionAction(start,offer,'join').next;
 start=auctionCore.applyAuctionAction(start,offer,'bid',{revision:1,amount:20}).next;
 const held=host.normalize(JSON.parse(JSON.stringify(start)));assert.equal(held.auctions[0].lots[0].highestBidder,'player');assert.equal(auctionCore.auctionAvailable(held).gold,6);
 const denied=host.applyStatePatch(held,{ops:[['inc','progression.currency.gold',-7,{reason:'Dinner'}],['set','progression.currency.name','Other currency'],['delete','auctions',{id:'test-auction'}]]});
 assert.equal(denied.accepted,0);assert.equal(denied.next.progression.currency.gold,30);
 const freePurchase=host.applyStatePatch(held,{ops:[['inc','inventory',{name:'Shield',quantity:1},{category:'purchase',reason:'Bought a shield'}],['inc','progression.currency.gold',-7,{reason:'Shield purchase',category:'purchase'}]]});
 assert.equal(freePurchase.accepted,0);assert.equal(freePurchase.next.inventory.length,0);
 for(let i=0;i<3;i++)start=auctionCore.applyAuctionAction(start,offer,'wait',{revision:start.auctions[0].revision}).next;
 const reloaded=host.normalize(JSON.parse(JSON.stringify(start)));
 const replay=host.applyStatePatch(reloaded,{ops:[['inc','progression.currency.gold',-20,{reason:'Auction payment'}],['inc','inventory',{name:'Blade',quantity:1},{category:'auction'}]]});
 assert.equal(replay.accepted,0);assert.equal(replay.next.progression.currency.gold,10);assert.equal(replay.next.inventory[0].quantity,1);
 assert.doesNotMatch(JSON.stringify(host.roleplayState(reloaded)),/maxBid|"bidders"/);
 assert.equal(host.portableState(reloaded).auctions[0].status,'Completed');
 const parsed=host.extractStatePatch(`Arrived. <!--tretaresia_patch:${JSON.stringify({auction:offer})}-->`);assert.equal(parsed.patch.auction.id,'test-auction');
});

test('a concurrent metadata save waits for auction failure and commits the restored wallet and inventory',async()=>{
 const prior={metadata:context.chatMetadata,chat:context.chat,settings:context.extensionSettings,save:context.saveMetadata,get:sandbox.document.getElementById};
 try{
  const tracker={hidden:true};sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?tracker:null;
  context.extensionSettings={tretaresia_rpg:{enableAuctions:true,eventNotifications:false,autoContinuity:false}};
  const offer={id:'atomic-auction',title:'Hall Auction',location:'Hall',denomination:'gold',entryFee:0,deposit:4,lots:[{id:'blade',name:'Blade',openingBid:5,minIncrement:1,bidders:[]}]};
  let state=host.defaultState();state.progression.currency.gold=30;state.location.place='Hall';state.onboarding.locationSeeded=true;
  state=auctionCore.applyAuctionAction(state,offer,'join').next;state=auctionCore.applyAuctionAction(state,offer,'bid',{amount:20,revision:1}).next;
  for(let i=0;i<2;i++)state=auctionCore.applyAuctionAction(state,offer,'wait',{revision:state.auctions[0].revision}).next;
  context.chatMetadata={tretaresia_rpg_state:state};context.chat=[{is_user:true,mes:'I enter.'},{is_user:false,mes:'You enter the auction hall.',swipe_id:0}];
  host.rememberAuctionOffer(1,context.chat[1],offer);const view=host.auctionForMessage(1,context.chat[1]);
  let rejectSave,started;const begun=new Promise(resolve=>{started=resolve;});const writes=[];
  context.saveMetadata=async()=>{writes.push(JSON.parse(JSON.stringify(context.chatMetadata.tretaresia_rpg_state)));if(writes.length===1){started();await new Promise((_resolve,reject)=>{rejectSave=reject;});}};
  const action=host.runAuctionAction(1,offer.id,view.token,'wait',undefined,4);await begun;
  assert.equal(writes[0].progression.currency.gold,10);assert.equal(writes[0].inventory.length,1);
  const anotherSave=host.saveCurrentChatMetadata(context);await Promise.resolve();assert.equal(writes.length,1);
  rejectSave(Error('Offline atomic auction test'));assert.equal((await action).ok,false);assert.equal(await anotherSave,true);
  assert.equal(writes.length,2);assert.equal(writes[1].progression.currency.gold,30);assert.equal(writes[1].inventory.length,0);assert.equal(writes[1].auctions[0].lots[0].closingCount,2);
 }finally{context.chatMetadata=prior.metadata;context.chat=prior.chat;context.extensionSettings=prior.settings;context.saveMetadata=prior.save;sandbox.document.getElementById=prior.get;}
});

test('quest payout is recorded once across paraphrased turns, set balances, archive removal and reload',()=>{
 const start=host.defaultState();start.quests=[{id:'escort',name:'Urgent Merchant Caravan Escort',status:'Active',rewardClaimed:false}];
 const first=host.applyStatePatch(start,{ops:[['upsert','quests',{id:'changed-id',name:'Urgent Merchant Caravan Escort',status:'Completed',rewardClaimed:true}],
  ['inc','progression.currency.gold',6,{category:'quest-reward',questId:'changed-id',reason:'Fair share from Urgent Merchant Caravan Escort quest'}],
  ['inc','progression.experience',20,{category:'quest-reward',questId:'changed-id',reason:'Mission experience'}]]});
 assert.equal(first.next.progression.currency.gold,6);assert.equal(first.next.progression.experience,20);
 assert.equal(first.next.quests[0].id,'escort');assert.equal(first.next.quests[0].rewardClaimed,true);
 assert.equal(first.next.transactions.length,1);assert.equal(first.next.transactions[0].questId,'escort');
 const reloaded=host.normalize(JSON.parse(JSON.stringify(first.next)));
 const again=host.applyStatePatch(reloaded,{ops:[['inc','progression.currency.gold',7,{category:'quest-reward',reason:'Caravan escort mission reward share'}],
  ['set','progression.currency.gold',13,{category:'currency',questId:'escort',reason:'Escort payout'}]]});
 assert.equal(again.accepted,0);assert.equal(again.next.progression.currency.gold,6);assert.equal(again.next.transactions.length,1);
 const deleted=host.applyStatePatch(reloaded,{ops:[['delete','quests',{id:'escort'}]]}).next;
 const recreated=host.applyStatePatch(deleted,{ops:[['upsert','quests',{id:'recreated',name:'Urgent Merchant Caravan Escort',status:'Completed'}],
  ['inc','progression.currency.gold',7,{category:'quest-reward',questId:'recreated',reason:'Final share'}]]}).next;
 assert.equal(recreated.progression.currency.gold,6);assert.equal(recreated.quests[0].rewardClaimed,true);
});
test('completion without payment permits one delayed first reward; separate quests and manual corrections remain possible',()=>{
 let state=host.applyStatePatch(host.defaultState(),{ops:[['upsert','quests',{id:'rescue',name:'Rescue Mira',status:'Completed',rewardClaimed:true}]]}).next;
 assert.equal(state.quests[0].rewardClaimed,false);
 state=host.applyStatePatch(state,{ops:[['inc','progression.currency.gold',3,{category:'quest-reward',questId:'rescue',reason:'Rescue reward'}]]}).next;
 assert.equal(state.progression.currency.gold,3);assert.equal(state.quests[0].rewardClaimed,true);
 state=host.applyStatePatch(state,{ops:[['upsert','quests',{id:'delivery',name:'Deliver the Letter',status:'Completed'}],
  ['inc','progression.currency.gold',3,{category:'quest-reward',questId:'delivery',reason:'Delivery reward'}],
  ['inc','progression.currency.gold',2,{category:'currency',reason:'Sold a sword'}]]}).next;
 assert.equal(state.progression.currency.gold,8);assert.equal(state.questRewardReceipts.length,2);
 state.progression.currency.gold=5;state=host.normalize(state);assert.equal(state.progression.currency.gold,5);assert.equal(state.questRewardReceipts.length,2);
});
test('an expense earlier in a patch cannot hide a repeated quest payout through a SET balance',()=>{
 const state=host.normalize({...host.defaultState(),quests:[{id:'escort',name:'Urgent Merchant Caravan Escort',status:'Completed',rewardClaimed:true}],
  progression:{currency:{gold:6,silver:0,copper:120}}});
 const result=host.applyStatePatch(state,{ops:[['inc','progression.currency.gold',-2,{category:'purchase',reason:'Bought supplies'}],
  ['set','progression.currency.gold',6,{category:'quest-reward',questId:'escort',reason:'Caravan escort mission reward share'}]]});
 assert.equal(result.accepted,1);assert.equal(result.next.progression.currency.gold,4);
 assert.equal(result.next.transactions.length,1);assert.equal(result.next.transactions[0].amounts.gold,-2);
});
test('old atlas contamination is removed while actual locations, wealth and local room layouts survive',()=>{
 const old=host.defaultState();delete old.location.narrativeVersion;
 Object.assign(old.location,{atlasVersion:4,place:'Central Crown',detail:"Gaia Manor - Girls’ Bedroom",region:'Central Continent · Central Continent',continent:'Central Continent',mapX:100,mapY:200,pins:[{id:'pin'}]});
 old.world={id:'present-world'};old.progression.currency.gold=13;old.onboarding.locationSeeded=true;
 old.sceneMap={activeMapId:'manor',activeFloorId:'floor',playerRoomId:'room',maps:[{id:'manor',name:'Gaia Manor',place:'Gaia Manor',floors:[{id:'floor',name:'Floor',rooms:[{id:'room',name:'Bedroom'}],connections:[]}]}]};
 const migrated=host.normalize(old);
 assert.equal(migrated.location.place,"Gaia Manor - Girls’ Bedroom");assert.equal(migrated.location.region,'');assert.equal(migrated.location.continent,'');
 assert.equal(migrated.progression.currency.gold,13);assert.equal(migrated.sceneMap.maps[0].floors[0].rooms[0].name,'Bedroom');
 assert.equal(Object.hasOwn(migrated,'world'),false);assert.equal(Object.hasOwn(migrated.location,'mapX'),false);assert.equal(Object.hasOwn(migrated.location,'pins'),false);
 assert.equal(host.normalize(migrated).location.place,migrated.location.place);
 const prompt=host.statePrompt(migrated);assert.doesNotMatch(prompt,/Central Crown|Central Continent|AUTHOR-ONLY ATLAS REFERENCE|2400 by 1800/);
 const rejected=host.applyStatePatch(migrated,{ops:[['set','location.mapX',44],['set','world.id','alternate-present-world'],['add','location.discovered','Made-up city']]});assert.equal(rejected.accepted,0);
});

test('opening an old atlas chat migrates past scene cards once while preserving new confirmed geography',()=>{
 const metadata=context.chatMetadata;
 try {
  const old=host.defaultState();delete old.location.narrativeVersion;old.location.atlasVersion=4;
  context.chatMetadata={tretaresia_rpg_state:old,tretaresia_rpg_scene_history:{turn:{
   legacy:{location:'Gaia Manor',region:'Central Crown · Central Continent · Central Continent · Gaia Manor',continent:'Central Continent'},
   confirmed:{location:'New House',region:'Central Crown',continent:'Central Continent',narrativeVersion:1},
  }}};
  host.getState();const history=context.chatMetadata.tretaresia_rpg_scene_history.turn;
  assert.equal(history.legacy.location,'Gaia Manor');assert.equal(history.legacy.region,'');assert.equal(history.legacy.continent,'');
  assert.equal(history.legacy.narrativeVersion,1);assert.equal(context.chatMetadata.tretaresia_rpg_location_migration,1);
  assert.equal(history.confirmed.region,'Central Crown');assert.equal(history.confirmed.continent,'Central Continent');
  history.legacy.region='Moon District';host.getState();assert.equal(history.legacy.region,'Moon District');
 }finally{context.chatMetadata=metadata;}
});
test('legacy travel cannot restore removed atlas names or repeated location breadcrumbs',()=>{
 const old=host.defaultState();delete old.location.narrativeVersion;
 Object.assign(old.location,{atlasVersion:4,place:'Central Crown',region:'Central Continent · Central Continent',continent:'Central Continent'});
 Object.assign(old.travel,{status:'Traveling',origin:'Central Crown',originRegion:'Central Continent · Central Continent',originContinent:'Central Continent',
  destination:'Gaia Manor',destinationPlace:'Gaia Manor',destinationRegion:'Central Continent · Crown Heartlands',destinationContinent:'Central Continent',
  totalDays:1,remainingDays:.25});
 const migrated=host.normalize(old);assert.equal(migrated.travel.origin,'');assert.equal(migrated.travel.originRegion,'');
 assert.equal(migrated.travel.destinationPlace,'Gaia Manor');assert.equal(migrated.travel.destinationRegion,'');
 host.synchronizeWorldState(migrated,migrated);assert.equal(migrated.location.region,'');assert.equal(migrated.location.continent,'');
 const arrived=host.applyStatePatch(migrated,{ops:[['set','travel.remainingDays',0]]}).next;
 assert.equal(arrived.travel.status,'Arrived');assert.equal(arrived.location.place,'Gaia Manor');
 assert.equal(arrived.location.region,'');assert.equal(arrived.location.continent,'');
 assert.doesNotMatch(host.statePrompt(arrived),/Central Crown|Central Continent|Crown Heartlands/);
});

test('real NPC normalization preserves new profile fields and existing dossier data',()=>{
 const p=host.npcProfile({id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',background:'Archive',goals:'Find a book',speechStyle:'Formal',identityColor:'#7788aa',roleIcon:'scholar',aliases:['Lys'],portraitSize:100,portraitSource:'local',hasPortrait:true,notes:'Existing note',mapX:10,mapY:20,stats:{level:3},abilities:[{id:'a',name:'Read runes'}]});
 const state=host.normalize({...host.defaultState(),npcs:[p]});const result=state.npcs[0];
 assert.equal(result.personality,'Calm');assert.equal(result.portraitSize,100);assert.equal(result.portraitSource,'local');assert.equal(Object.hasOwn(result,'mapX'),false);assert.equal(result.abilities[0].name,'Read runes');assert.equal(result.stats.level,3);
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
test('AI can change an existing manually created friendly NPC to Hostile and back without replacing its dossier',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'cora',name:'Cora',enabled:true,met:true,isHostile:false,appearance:'Blue cloak',background:'Met at the river'})];
 assert.equal(host.metFriendlyNpcs(state).length,1);
 const hostile=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:'cora',name:'Cora',isHostile:true,relationship:'Enemy'}]]}).next;
 assert.equal(hostile.npcs.length,1);assert.equal(hostile.npcs[0].id,'cora');assert.equal(hostile.npcs[0].appearance,'Blue cloak');
 assert.equal(hostile.npcs[0].background,'Met at the river');assert.equal(hostile.npcs[0].isHostile,true);assert.equal(host.metFriendlyNpcs(hostile).length,0);
 const peaceful=host.applyStatePatch(hostile,{ops:[['upsert','npcs',{id:'cora',name:'Cora',isHostile:false,relationship:'Neutral'}]]}).next;
 assert.equal(host.metFriendlyNpcs(peaceful).length,1);assert.equal(peaceful.npcs[0].id,'cora');
});
test('notification categories preserve a disabled legacy training preference and can be changed independently',()=>{
 const saved=context.extensionSettings.tretaresia_rpg;
 try {
  context.extensionSettings.tretaresia_rpg={eventNotifications:true,notifyLearning:false};
  const settings=host.getSettings();assert.equal(settings.notifyTraining,false);assert.equal(host.eventNotificationEnabled('learning'),false);
  settings.notifyTraining=true;assert.equal(host.eventNotificationEnabled('training'),true);assert.equal(host.eventNotificationEnabled('learning'),false);
  settings.notifyInventory=false;assert.equal(host.eventNotificationEnabled('inventory'),false);assert.equal(host.eventNotificationEnabled('purchase'),true);
  settings.eventNotifications=false;assert.equal(host.eventNotificationEnabled('purchase'),false);
 } finally {context.extensionSettings.tretaresia_rpg=saved;}
});

test('main reply board offers stay unaccepted, persist per variant, accept once and give no immediate reward',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,get:sandbox.document.getElementById};const settings=host.getSettings();const notices=settings.eventNotifications;settings.eventNotifications=false;
 try {
  context.saveMetadata=async()=>{};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const start=host.defaultState();start.location.place='Guild Hall';start.onboarding.locationSeeded=true;
  context.chatMetadata={tretaresia_rpg_state:start};
  const story='You walk up to the mission board and read the papers.';
  const board={title:'Guild Board',location:'Guild Hall',evidence:story,missions:[{name:'Deliver medicine',objective:'Bring medicine to Cora',reward:'5 silver'}]};
  context.chat=[{is_user:true,mes:'I read the mission board.'},{is_user:false,name:'Narrator',mes:`${story}\n<!--tretaresia_patch:${JSON.stringify({missionBoard:board,ops:[['upsert','quests',{id:'mistaken',name:'Deliver medicine',status:'Active'}]]})}-->`}];
  await host.processAssistantPatch(1);
  const shown=host.missionBoardForMessage(1,context.chat[1]);assert(shown);assert.equal(shown.missions.length,1);assert.equal(shown.available,true);
  assert.equal(host.getState().quests.length,0);assert(!context.chat[1].mes.includes('tretaresia_patch'));
  assert.equal(await host.acceptBoardMission(1,shown.missions[0].id,'stale-token'),false);
  host.setLiveGeneration(true);assert.equal(await host.acceptBoardMission(1,shown.missions[0].id,shown.token),false);host.setLiveGeneration(false);
  context.saveMetadata=async()=>{throw Error('Offline test');};
  assert.equal(await host.acceptBoardMission(1,shown.missions[0].id,shown.token),false);
  assert.equal(host.getState().quests.length,0,'Failed save restores the unaccepted state');
  assert.equal(host.assistantCheckpoint(1).variants[host.assistantCheckpoint(1).activeVariant].state.quests.length,0);
  context.saveMetadata=async()=>{};
  assert.equal(await host.acceptBoardMission(1,shown.missions[0].id,shown.token),true);
  assert.equal(await host.acceptBoardMission(1,shown.missions[0].id,shown.token),false);
  let state=host.getState();assert.equal(state.quests.length,1);assert.equal(state.quests[0].status,'Active');assert.equal(state.progression.currency.silver,0);
  assert.equal(state.quests[0].rewardClaimed,false);assert.equal(state.questRewardReceipts.length,0);assert.equal(state.progression.experience,0);
  assert.match(context.lastPrompt[1],/Deliver medicine/);
  context.chatMetadata=JSON.parse(JSON.stringify(context.chatMetadata));
  assert.equal(host.missionBoardForMessage(1,context.chat[1]).missions[0].questStatus,'Active');
  state=host.getState();state.location.place='Street';context.chatMetadata.tretaresia_rpg_state=state;
  assert.equal(host.missionBoardForMessage(1,context.chat[1]).available,false);
  const variant=context.chat[1].mes;context.chat[1].mes='An unrelated replacement reply.';assert.equal(host.missionBoardForMessage(1,context.chat[1]),null);context.chat[1].mes=variant;
  context.chatMetadata={};assert.equal(host.missionBoardForMessage(1,context.chat[1]),null);
 } finally {host.setLiveGeneration(false);context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.get;settings.eventNotifications=notices;}
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
test('one completed reply updates the full scene, diary and group invitations without a second AI call',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const settings=host.getSettings(), prior=settings.autoTrack, oldRate=settings.npcDiaryFrequency;
 const originalGet=sandbox.document.getElementById;
 try{
  settings.autoTrack=true;settings.npcDiaryFrequency='often';
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  let requests=0;context.generateQuietPrompt=async()=>{requests++;throw Error('Unexpected second AI call');};context.saveMetadata=async()=>{};
  const early={sceneTracker:{loc:'Kohaku room',t:'08:30',w:'Rain',temp:24},ops:[]};
  const final={sceneTracker:{...fullScene,loc:'Kohaku room',t:'08:30',w:'Rain',temp:24},ops:[
   ['offer','partyInvitation',{npcId:'kohaku',name:'Moonlight',role:'Scout',memberCount:4}],
   ['offer','guildInvitation',{npcId:'kohaku',name:'Silver Dawn',role:'Member',memberCount:20}],
   ['append','npcDiary',{npcId:'kohaku',text:'I hope they will join us tomorrow.'}]]};
  context.chat=[{is_user:true,mes:'Talk to Kohaku.'},{is_user:false,mes:`Kohaku invites you to party “Moonlight” and guild “Silver Dawn”. <!--tretaresia_patch:${JSON.stringify(early)}--> She writes in her diary. <!--tretaresia_patch:${JSON.stringify(final)}-->`}];
  await host.processAssistantPatch(1,'normal');
  const card=host.sceneForMessage(1,context.chat[1]);
  assert.equal(card.location,'Kohaku room');assert.equal(card.time,'08:30');assert.equal(card.weather,'Rain');
  assert.deepEqual(card.missing,[]);assert.equal(host.diaryForMessage(1,context.chat[1]).length,1);
  assert.equal(host.socialEventsForMessage(1,context.chat[1]).groupOffers.length,2);
  assert.equal(host.getState().social.party,null);assert.equal(host.getState().social.guilds.length,0);
  assert.equal(requests,0);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;settings.autoTrack=prior;settings.npcDiaryFrequency=oldRate;sandbox.document.getElementById=originalGet;}
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
test('confirmed existing party and guild membership joins immediately without accepting an offer or founding fee',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,get:sandbox.document.getElementById};
 const settings=host.getSettings(),prior=settings.autoTrack;
 try{
  settings.autoTrack=true;
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'rhea',name:'Rhea',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.saveMetadata=async()=>{};sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const partyLine='You are already a member of the Ashtrail party.';
  const guildLine='You have joined the Dawnspire guild.';
  const ops=[
   ['upsert','party',{name:'Ashtrail',leaderId:'rhea',leaderName:'Rhea',playerRole:'Scout',memberCount:4,membershipStatus:'established',membershipEvidence:partyLine}],
   ['upsert','guilds',{name:'Dawnspire',leaderId:'rhea',leaderName:'Rhea',playerRole:'Initiate',memberCount:128,membershipStatus:'established',membershipEvidence:guildLine}],
  ];
  context.chat=[{is_user:true,mes:'I am with Rhea.'},{is_user:false,mes:`${partyLine} ${guildLine}<!--tretaresia_patch:${JSON.stringify({ops,sceneTracker:fullScene})}-->`}];
  await host.processAssistantPatch(1,'normal');
  const current=host.getState();
  assert.equal(current.social.party.name,'Ashtrail');assert.equal(current.social.party.playerRole,'Scout');
  assert.equal(current.social.party.leaderId,'rhea');assert.equal(current.social.party.memberCount,4);
  assert.equal(current.social.guilds[0].name,'Dawnspire');assert.equal(current.social.guilds[0].memberCount,128);
  assert.equal(current.player.party,'Ashtrail');assert.equal(current.player.guild,'Dawnspire');
  assert.equal(current.progression.currency.gold,0);
  assert.equal(host.socialEventsForMessage(1,context.chat[1])?.groupOffers?.length||0,0);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.get;settings.autoTrack=prior;}
});
test('normal replies recover current party and guild membership from story without group patch metadata or extra requests',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,generate:context.generateQuietPrompt,get:sandbox.document.getElementById};
 const settings=host.getSettings(),prior=settings.autoTrack;let requests=0;
 try{
  settings.autoTrack=true;context.saveMetadata=async()=>{};context.generateQuietPrompt=async()=>{requests++;throw Error('Unexpected extra request');};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  for(const [story,name,leaderId] of [
   ['Your party, Moonlight, is led by Rhea. You are already a member of the Dawnspire guild.','Moonlight','rhea'],
   ['คุณมีปาร์ตี้ “แสงจันทร์” อยู่แล้ว โดยมี Rhea เป็นหัวหน้า คุณคือสมาชิกของกิลด์ “รุ่งอรุณ” อยู่แล้ว','แสงจันทร์','rhea'],
   ['คุณเป็นหัวหน้าปาร์ตี้ “นักเดินทาง” อยู่แล้ว','นักเดินทาง','player'],
   ['คุณอยู่ในปาร์ตี้อยู่แล้ว โดยมี Rhea เป็นหัวหน้า','Party','rhea'],
  ]){
   const state=host.defaultState();state.player.name='Yuki';state.progression.currency.gold=23;
   state.npcs=[host.npcProfile({id:'rhea',name:'Rhea',met:true})];
   context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
   context.chat=[{is_user:true,mes:'Continue the journey.'},{is_user:false,mes:story}];
   await host.processAssistantPatch(1,'normal');
   const current=host.getState();
   assert.equal(current.social.party.name,name,story);
   assert.equal(current.social.party.leaderId,leaderId,story);
   assert.equal(current.social.party.playerRole,leaderId==='player'?'Leader':'Member');
   assert.equal(current.social.party.joinedByInvitation,leaderId!=='player');
   assert.equal(current.player.party,name);
   if(story.includes('Dawnspire'))assert.equal(current.social.guilds[0].name,'Dawnspire');
   if(story.includes('รุ่งอรุณ'))assert.equal(current.social.guilds[0].name,'รุ่งอรุณ');
   assert.equal(current.progression.currency.gold,23);
   assert.equal(host.socialEventsForMessage(1,context.chat[1])?.groupOffers?.length||0,0);
  }
  const malformedState=host.defaultState();malformedState.progression.currency.gold=23;
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(malformedState)};
  context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:`You are a member of the Moonlight party. You are already a member of the Dawnspire guild.<!--tretaresia_patch:${JSON.stringify({ops:[
   ['upsert','party',{name:42}],['upsert','guilds',{name:'Dawnspire',createdByPlayer:true}],
  ]})}-->`}];
  await host.processAssistantPatch(1,'normal');
  assert.equal(host.getState().social.party.name,'Moonlight');
  assert.equal(host.getState().social.guilds[0].name,'Dawnspire');
  assert.equal(host.getState().progression.currency.gold,23);
  assert.equal(requests,0);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.generateQuietPrompt=saved.generate;sandbox.document.getElementById=saved.get;settings.autoTrack=prior;}
});

test('current-membership recovery does not accept recruitment or revive membership ended by the completed reply',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,get:sandbox.document.getElementById};
 const settings=host.getSettings(),prior=settings.autoTrack;
 try{
  settings.autoTrack=true;context.saveMetadata=async()=>{};sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  for(const [user,story] of [
   ['Talk to Rhea.','<tr-dialogue name="Rhea">I invite you to join the party “Moonlight”.</tr-dialogue>'],
   ['I am a member of the Moonlight party.','You left the Moonlight party.'],
   ['Continue.','Rhea is already a member of the Moonlight party.'],
  ]){
   const state=host.defaultState();state.npcs=[host.npcProfile({id:'rhea',name:'Rhea',met:true})];
   context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
   const invalid=[['upsert','party',{name:'Moonlight',leaderId:'player'}]];
   context.chat=[{is_user:true,mes:user},{is_user:false,mes:`${story}<!--tretaresia_patch:${JSON.stringify({ops:invalid})}-->`}];
   await host.processAssistantPatch(1,'normal');
   assert.equal(host.getState().social.party,null,story);
   if(story.includes('invite'))assert.equal(host.socialEventsForMessage(1,context.chat[1]).groupOffers[0].status,'pending');
  }
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.get;settings.autoTrack=prior;}
});

test('Manual Sync repairs current external group membership without accepting an offer or charging a founding fee',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,generate:context.generateQuietPrompt,get:sandbox.document.getElementById};
 const settings=host.getSettings(),prior=settings.autoTrack;
 try{
  settings.autoTrack=true;context.saveMetadata=async()=>{};sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const state=host.defaultState();state.progression.currency.gold=18;state.npcs=[host.npcProfile({id:'rhea',name:'Rhea',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  const party='คุณมีปาร์ตี้ “แสงจันทร์” อยู่แล้ว โดยมี Rhea เป็นหัวหน้า';
  const guild='You are already a member of the Dawnspire guild.';
  context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:`${party}. ${guild}`}];
  context.generateQuietPrompt=async()=>JSON.stringify({ops:[
   ['upsert','party',{name:'แสงจันทร์',leaderId:'rhea',playerRole:'Scout',memberCount:4}],
   ['upsert','guilds',{name:'Dawnspire',leaderId:'rhea',playerRole:'Initiate',memberCount:128}],
  ]});
  await host.analyzeChat({manual:true,startIndex:0,endIndex:1});
  const current=host.getState();
  assert.equal(current.social.party.name,'แสงจันทร์');assert.equal(current.social.party.playerRole,'Scout');
  assert.equal(current.social.party.memberCount,4);assert.equal(current.social.party.leaderId,'rhea');
  assert.equal(current.social.guilds[0].name,'Dawnspire');assert.equal(current.social.guilds[0].memberCount,128);
  assert.equal(current.progression.currency.gold,18);
  for(const [ending,recover] of [['You continue the journey.',true],['You left the แสงจันทร์ party and the Dawnspire guild.',false]]){
   context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
   context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:`${party}. ${guild}`},{is_user:true,mes:'Continue.'},{is_user:false,mes:ending}];
   await host.analyzeChat({manual:true,startIndex:0,endIndex:1});
   assert.equal(Boolean(host.getState().social.party),recover,ending);
   assert.equal(host.getState().social.guilds.length,recover?1:0,ending);
   assert.equal(host.getState().progression.currency.gold,18);
  }
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.generateQuietPrompt=saved.generate;sandbox.document.getElementById=saved.get;settings.autoTrack=prior;}
});

test('opening an existing chat locally restores missing groups once and honors departures, deletions and recorded removals',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,generate:context.generateQuietPrompt,get:sandbox.document.getElementById,getId:context.getCurrentChatId};
 const settings=host.getSettings(),prior=settings.autoTrack;
 try{
  settings.autoTrack=true;context.getCurrentChatId=()=> 'existing-group-recovery-test';context.saveMetadata=async()=>{};
  context.generateQuietPrompt=()=>{throw Error('Recovery must stay local');};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'rhea',name:'Rhea',met:true})];state.progression.currency.gold=12;
  const joined='You are a member of the Moonlight party led by Rhea. You are a member of the Dawnspire guild.';
  context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:joined}];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  assert.equal(await host.catchUpGroupMemberships(),true);
  assert.equal(host.getState().social.party.name,'Moonlight');assert.equal(host.getState().social.guilds[0].name,'Dawnspire');
  assert.equal(host.getState().progression.currency.gold,12);
  const removed=host.getState();removed.social.party=null;removed.player.party='Solo';
  context.chatMetadata.tretaresia_rpg_state=host.storedNpcState(removed);
  assert.equal(await host.catchUpGroupMemberships(),false);
  assert.equal(host.getState().social.party,null);

  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:false,mes:'คุณมีปาร์ตี้ “แสงจันทร์” อยู่แล้ว โดยมี Rhea เป็นหัวหน้า'},
   {is_user:true,mes:'Continue.'},{is_user:false,mes:'The group continues the journey.'}];
  assert.equal(await host.catchUpGroupMemberships(),true);
  assert.equal(host.getState().social.party.name,'แสงจันทร์');
  assert.equal(host.getState().social.party.leaderId,'rhea');

  for(const ending of ['You left the Moonlight party and the Dawnspire guild.',
   '<!--tretaresia_patch:{"ops":[["delete","party",{}],["delete","guilds",{"name":"Dawnspire"}]]}-->']){
   context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
   context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:joined},{is_user:true,mes:'Continue.'},{is_user:false,mes:ending}];
   assert.equal(await host.catchUpGroupMemberships(),false,ending);
   assert.equal(host.getState().social.party,null);assert.equal(host.getState().social.guilds.length,0);
  }
  const auditState=host.normalize(state);
  auditState.systems.audit=[{id:'removed-party',source:'party',summary:'Removed',at:'2026-09-30',messageId:1,
   changes:[{path:'party',before:'Moonlight: Rhea',after:'Solo',reason:'Manual removal',confidence:100}]}];
  context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:'You are a member of the Moonlight party.'}];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(auditState)};
  assert.equal(await host.catchUpGroupMemberships(),false);
  assert.equal(host.getState().social.party,null);

  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  const checkpoint=host.assistantCheckpoint(1,{create:true});
  checkpoint.baseState=host.normalize({...state,social:{...state.social,party:{name:'Moonlight',leaderId:'rhea'}}});
  checkpoint.activeVariant='removed';checkpoint.variants.removed={state:host.normalize(state)};
  assert.equal(await host.catchUpGroupMemberships(),false);
  assert.equal(host.getState().social.party,null);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.generateQuietPrompt=saved.generate;sandbox.document.getElementById=saved.get;context.getCurrentChatId=saved.getId;settings.autoTrack=prior;}
});

test('history recovery keeps an unrelated guild when a later named deletion omits an id',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,get:sandbox.document.getElementById,getId:context.getCurrentChatId};
 const settings=host.getSettings(),prior=settings.autoTrack;
 try{
  settings.autoTrack=true;context.getCurrentChatId=()=> 'selective-guild-recovery-test';context.saveMetadata=async()=>{};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const state=host.defaultState();context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:'You are a member of the Moonlight guild. You are a member of the Dawnspire guild.'},
   {is_user:true,mes:'Continue.'},{is_user:false,mes:'<!--tretaresia_patch:{"ops":[["delete","guilds",{"name":"Dawnspire"}]]}-->'}];
  assert.equal(await host.catchUpGroupMemberships(),true);
  assert.deepEqual(Array.from(host.getState().social.guilds,group=>group.name),['Moonlight']);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.get;context.getCurrentChatId=saved.getId;settings.autoTrack=prior;}
});

test('group recovery stops before writing markers or saving another chat after a chat switch',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,get:sandbox.document.getElementById,getId:context.getCurrentChatId};
 const settings=host.getSettings(),prior=settings.autoTrack;let chatId='group-recovery-a',saves=0;
 try{
  settings.autoTrack=true;context.getCurrentChatId=()=>chatId;context.saveMetadata=async()=>{saves++;};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const state=host.defaultState();context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:true,mes:'Continue.'},{is_user:false,mes:'You are a member of the Moonlight party.'}];
  const otherMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  const recovery=host.catchUpGroupMemberships();
  chatId='group-recovery-b';context.chatMetadata=otherMetadata;
  assert.equal(await recovery,false);
  assert.equal(host.getState().social.party,null);
  assert.equal(otherMetadata.tretaresia_rpg_group_recovery,undefined);
  assert.equal(saves,0);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.get;context.getCurrentChatId=saved.getId;settings.autoTrack=prior;}
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
  assert.match(panel.innerHTML,/No character selected/);
  assert.match(panel.innerHTML,/<option value="lysa">Lysa<\/option>/);
  assert.doesNotMatch(panel.innerHTML,/data-id="lysa"|data-id="lore"|data-id="player"/);
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
  assert.equal(host.removeHStatsNpc('rin',base),true);
  host.renderHStats(panel,base);
  assert.match(panel.innerHTML,/No character selected/);
  assert.deepEqual(Array.from(context.chatMetadata.tretaresia_rpg_visible_hstats_npcs),[]);
  chatId='another-chat';context.chatMetadata={};
  host.renderHStats(panel,base);
  assert.match(panel.innerHTML,/No character selected/);
  assert.doesNotMatch(panel.innerHTML,/data-id="rin" class="is-active"/);
 }finally{context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.getCurrentChatId=saved.getId;}
});
test('H-Stats layouts persist valid choices and safely fall back from invalid settings',()=>{
 const settings=host.getSettings();
 const saved={layout:settings.hStatsLayout,saveSettings:context.saveSettingsDebounced,metadata:context.chatMetadata,save:context.saveMetadata,getId:context.getCurrentChatId};
 const state=host.defaultState(),panel={innerHTML:''};
 state.npcs=[host.npcProfile({id:'rin',name:'Rin',met:true})];
 let saves=0;
 context.saveSettingsDebounced=()=>{saves++;};
 context.chatMetadata={};context.getCurrentChatId=()=> 'h-stats-layout-test';context.saveMetadata=async()=>{};
 try{
  delete settings.hStatsLayout;
  assert.equal(host.getHStatsLayout(),'tabs');
  settings.hStatsLayout='obsolete-layout';
  assert.equal(host.getHStatsLayout(),'tabs');
  assert.equal(saves,0);
  host.chooseHStatsNpc('rin',state);
  for(const [index,layout] of ['cards','compact','tabs'].entries()){
   host.setHStatsLayout(layout);
   assert.equal(host.getHStatsLayout(),layout);
   assert.equal(settings.hStatsLayout,layout);
   assert.equal(saves,index+1);
   host.renderHStats(panel,state);
   assert.match(panel.innerHTML,new RegExp(`data-h-layout="${layout}"`));
   assert.match(panel.innerHTML,/data-action="toggle-hstats-manage"/);
   assert.doesNotMatch(panel.innerHTML,/data-action="(?:remove-hstats-npc|request-hide-hstats-npc|confirm-hide-hstats-npc)"|fa-xmark/);
  }
  host.setHStatsLayout('invalid');
  assert.equal(settings.hStatsLayout,'tabs');
  assert.equal(saves,3);
 }finally{
  if(saved.layout===undefined)delete settings.hStatsLayout;else settings.hStatsLayout=saved.layout;
  context.saveSettingsDebounced=saved.saveSettings;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.getCurrentChatId=saved.getId;
 }
});

test('H-Stats hides require management and confirmation, and undo restores roster order and selection without changing dossiers',()=>{
 const state=host.defaultState(),panel={innerHTML:''};
 state.npcs=[host.npcProfile({id:'lysa',name:'Lysa',met:true,hStats:{oralSexCount:3,loyaltyHearts:4}}),
  host.npcProfile({id:'rin',name:'Rin',met:true,hStats:{mouthQuality:'Established',pregnant:false},hasPortrait:true,portraitSource:'server'}),
  host.npcProfile({id:'ashe',name:'Ashe',met:true}),host.npcProfile({id:'lore',name:'Lore only',met:false})];
 const before=JSON.stringify(state.npcs);
 const saved={metadata:context.chatMetadata,save:context.saveMetadata,getId:context.getCurrentChatId};
 context.chatMetadata={};context.getCurrentChatId=()=> 'h-stats-safe-hide-test';context.saveMetadata=async()=>{};
 const roster=()=>Array.from(context.chatMetadata.tretaresia_rpg_visible_hstats_npcs);
 try{
  for(const id of ['lysa','rin','ashe','rin'])host.chooseHStatsNpc(id,state);
  host.renderHStats(panel,state);
  assert.deepEqual(roster(),['lysa','rin','ashe']);
  assert.equal(context.chatMetadata.tretaresia_rpg_selected_hstats_npc,'rin');
  assert.doesNotMatch(panel.innerHTML,/remove-hstats-npc|request-hide-hstats-npc|confirm-hide-hstats-npc|fa-xmark/);
  host.requestHideHStatsNpc('rin',state);
  host.confirmHideHStatsNpc(state);
  assert.deepEqual(roster(),['lysa','rin','ashe']);

  host.toggleHStatsManage();
  host.renderHStats(panel,state);
  assert.match(panel.innerHTML,/data-action="request-hide-hstats-npc"/);
  assert.doesNotMatch(panel.innerHTML,/data-action="confirm-hide-hstats-npc"/);
  host.requestHideHStatsNpc('lore',state);
  host.confirmHideHStatsNpc(state);
  assert.deepEqual(roster(),['lysa','rin','ashe']);
  host.requestHideHStatsNpc('rin',state);
  host.renderHStats(panel,state);
  assert.match(panel.innerHTML,/data-action="confirm-hide-hstats-npc"/);
  assert.match(panel.innerHTML,/Rin/);
  assert.deepEqual(roster(),['lysa','rin','ashe']);
  host.cancelHideHStatsNpc();
  host.renderHStats(panel,state);
  assert.doesNotMatch(panel.innerHTML,/data-action="confirm-hide-hstats-npc"/);
  host.confirmHideHStatsNpc(state);
  assert.deepEqual(roster(),['lysa','rin','ashe']);

  host.requestHideHStatsNpc('rin',state);
  host.confirmHideHStatsNpc(state);
  assert.deepEqual(roster(),['lysa','ashe']);
  assert.equal(context.chatMetadata.tretaresia_rpg_selected_hstats_npc,'lysa');
  assert.equal(JSON.stringify(state.npcs),before);
  host.renderHStats(panel,state);
  assert.match(panel.innerHTML,/data-action="undo-hide-hstats-npc"/);
  host.undoHideHStatsNpc(state);
  assert.deepEqual(roster(),['lysa','rin','ashe']);
  assert.equal(context.chatMetadata.tretaresia_rpg_selected_hstats_npc,'rin');
  assert.equal(JSON.stringify(state.npcs),before);
  host.undoHideHStatsNpc(state);
  assert.deepEqual(roster(),['lysa','rin','ashe']);
  host.toggleHStatsManage();
  host.renderHStats(panel,state);
  assert.doesNotMatch(panel.innerHTML,/request-hide-hstats-npc|confirm-hide-hstats-npc|remove-hstats-npc|fa-xmark/);
 }finally{context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.getCurrentChatId=saved.getId;}
});

test('switching chats clears H-Stats management, pending confirmation and undo',()=>{
 const state=host.defaultState(),panel={innerHTML:''};
 state.npcs=[host.npcProfile({id:'lysa',name:'Lysa',met:true}),host.npcProfile({id:'rin',name:'Rin',met:true})];
 const saved={metadata:context.chatMetadata,save:context.saveMetadata,getId:context.getCurrentChatId};
 let chatId='h-stats-hide-chat-a';const chatA={};
 context.chatMetadata=chatA;context.getCurrentChatId=()=>chatId;context.saveMetadata=async()=>{};
 try{
  host.chooseHStatsNpc('lysa',state);host.chooseHStatsNpc('rin',state);
  host.toggleHStatsManage();host.requestHideHStatsNpc('rin',state);host.confirmHideHStatsNpc(state);
  host.requestHideHStatsNpc('lysa',state);
  host.renderHStats(panel,state);
  assert.match(panel.innerHTML,/confirm-hide-hstats-npc/);
  assert.match(panel.innerHTML,/undo-hide-hstats-npc/);

  chatId='h-stats-hide-chat-b';
  context.chatMetadata={tretaresia_rpg_visible_hstats_npcs:['rin','lysa'],tretaresia_rpg_selected_hstats_npc:'rin'};
  const chatBBefore=JSON.stringify(context.chatMetadata);
  host.renderHStats(panel,state);
  assert.doesNotMatch(panel.innerHTML,/request-hide-hstats-npc|confirm-hide-hstats-npc|undo-hide-hstats-npc/);
  host.confirmHideHStatsNpc(state);host.undoHideHStatsNpc(state);
  assert.equal(JSON.stringify(context.chatMetadata),chatBBefore);

  chatId='h-stats-hide-chat-a';context.chatMetadata=chatA;
  const chatABefore=JSON.stringify(chatA);
  host.renderHStats(panel,state);
  assert.doesNotMatch(panel.innerHTML,/request-hide-hstats-npc|confirm-hide-hstats-npc|undo-hide-hstats-npc/);
  host.confirmHideHStatsNpc(state);host.undoHideHStatsNpc(state);
  assert.equal(JSON.stringify(chatA),chatABefore);
  assert.deepEqual(Array.from(chatA.tretaresia_rpg_visible_hstats_npcs),['lysa']);
 }finally{context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.getCurrentChatId=saved.getId;}
});

test('H-Stats keeps selection, layouts and protected management available while a missing-field profile loads or fails',()=>{
 const state=host.defaultState(),panel={innerHTML:''},settings=host.getSettings();
 state.npcs=[host.npcProfile({id:'lysa',name:'Lysa',met:true}),host.npcProfile({id:'rin',name:'Rin',met:true})];
 const dossiersBefore=JSON.stringify(state.npcs);
 const saved={metadata:context.chatMetadata,save:context.saveMetadata,getId:context.getCurrentChatId,
  getElement:sandbox.document.getElementById,generate:context.generateQuietPrompt,layout:settings.hStatsLayout};
 const globals=vm.runInContext('({activeTabIndex,hStatsSelectionChatId,selectedHStatsNpcId,selectedHStatsSection,hStatsEditing,hStatsManageOpen,hStatsPendingRemovalId,hStatsLastHiddenNpc})',sandbox);
 let calls=0,baselineFlags=[];
 context.chatMetadata={};context.getCurrentChatId=()=> 'h-stats-loading-directory-test';context.saveMetadata=async()=>{};
 context.generateQuietPrompt=()=>{calls++;throw Error('Unexpected profile request in loading UI test');};
 sandbox.document.getElementById=id=>id==='tretaresia-rpg-overlay'?{classList:{contains:()=>true}}:null;
 try{
  baselineFlags=vm.runInContext("['lysa','rin'].map(id=>{const key=hStatsBaselineKey(id);return {key,failed:hStatsBaselineFailures.has(key),running:hStatsBaselineJobs.has(key)};})",sandbox);
  sandbox.hLoadingTestKeys=baselineFlags.map(({key})=>key);
  vm.runInContext("activeTabIndex=TAB_ORDER.indexOf('hstats');globalThis.hLoadingTestKeys.forEach(key=>hStatsBaselineFailures.add(key));",sandbox);
  settings.hStatsLayout='cards';
  host.chooseHStatsNpc('lysa',state);host.chooseHStatsNpc('rin',state);host.toggleHStatsManage();
  host.renderHStats(panel,state);
  assert.match(panel.innerHTML,/data-action="retry-hstats-baseline"/);
  assert.match(panel.innerHTML,/data-h-layout="cards"/);
  assert.match(panel.innerHTML,/data-action="select-hstats-npc" data-id="lysa"/);
  assert.match(panel.innerHTML,/data-id="rin" class="is-active"/);
  assert.equal((panel.innerHTML.match(/data-action="set-hstats-layout"/g)||[]).length,3);
  assert.match(panel.innerHTML,/data-action="toggle-hstats-manage"/);
  assert.match(panel.innerHTML,/data-action="request-hide-hstats-npc" data-id="rin"/);
  host.requestHideHStatsNpc('rin',state);host.renderHStats(panel,state);
  assert.match(panel.innerHTML,/data-action="confirm-hide-hstats-npc"/);
  assert.match(panel.innerHTML,/data-action="cancel-hide-hstats-npc"/);

  host.chooseHStatsNpc('lysa',state);
  settings.hStatsLayout='compact';
  vm.runInContext('globalThis.hLoadingTestKeys.forEach(key=>{hStatsBaselineFailures.delete(key);hStatsBaselineJobs.add(key);});',sandbox);
  host.requestHideHStatsNpc('lysa',state);host.renderHStats(panel,state);
  assert.match(panel.innerHTML,/role="status"/);
  assert.doesNotMatch(panel.innerHTML,/data-action="retry-hstats-baseline"/);
  assert.match(panel.innerHTML,/data-h-layout="compact"/);
  assert.match(panel.innerHTML,/<select name="hStatsSelectedNpc">/);
  assert.match(panel.innerHTML,/<option value="lysa" selected>Lysa<\/option>/);
  assert.match(panel.innerHTML,/<option value="rin">Rin<\/option>/);
  assert.equal((panel.innerHTML.match(/data-action="set-hstats-layout"/g)||[]).length,3);
  assert.match(panel.innerHTML,/data-action="toggle-hstats-manage"/);
  assert.match(panel.innerHTML,/data-action="request-hide-hstats-npc" data-id="lysa"/);
  assert.match(panel.innerHTML,/data-action="confirm-hide-hstats-npc"/);
  assert.equal(calls,0);
  assert.deepEqual(Array.from(context.chatMetadata.tretaresia_rpg_visible_hstats_npcs),['lysa','rin']);
  assert.equal(context.chatMetadata.tretaresia_rpg_selected_hstats_npc,'lysa');
  assert.equal(JSON.stringify(state.npcs),dossiersBefore);
 }finally{
  sandbox.hLoadingTestFlags=baselineFlags;sandbox.hLoadingTestGlobals=globals;
  vm.runInContext('globalThis.hLoadingTestFlags.forEach(({key,failed,running})=>{if(failed)hStatsBaselineFailures.add(key);else hStatsBaselineFailures.delete(key);if(running)hStatsBaselineJobs.add(key);else hStatsBaselineJobs.delete(key);});({activeTabIndex,hStatsSelectionChatId,selectedHStatsNpcId,selectedHStatsSection,hStatsEditing,hStatsManageOpen,hStatsPendingRemovalId,hStatsLastHiddenNpc}=globalThis.hLoadingTestGlobals);',sandbox);
  delete sandbox.hLoadingTestKeys;delete sandbox.hLoadingTestFlags;delete sandbox.hLoadingTestGlobals;
  settings.hStatsLayout=saved.layout;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.getCurrentChatId=saved.getId;
  sandbox.document.getElementById=saved.getElement;context.generateQuietPrompt=saved.generate;
 }
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
  host.chooseHStatsNpc('kohaku',state);
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
  const panel={innerHTML:''};host.chooseHStatsNpc('kohaku',host.getState());host.renderHStats(panel,host.getState());
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
test('provider reasoning envelopes stay out of visible story and patch evidence',()=>{
 const parsed=host.extractStatePatch('{CoT}\nS1 · INGEST\nprivate planning notes\n\nS2 · LOCK\nFirewall: hidden\n\nA merchant sets a lantern on the counter.\n<!--tretaresia_patch:{"ops":[]}-->');
 assert.equal(parsed.visible,'A merchant sets a lantern on the counter.');
 assert.doesNotMatch(parsed.visible,/CoT|INGEST|LOCK|Firewall|planning notes/iu);
 const tagged=host.extractStatePatch('<thinking>do not show this</thinking>Visible reply');
 assert.equal(tagged.visible,'Visible reply');
 const bare=host.extractStatePatch('S1 · INGEST: private prompt\nS2 · LOCK: hidden constraints\nS7 · CONTINUITY: secret notes\n\n<tr-narrative>A merchant opens the shop.</tr-narrative>');
 assert.equal(bare.visible,'<tr-narrative>A merchant opens the shop.</tr-narrative>');
 const spaced=host.extractStatePatch('{CoT}\nS1 · INGEST\nIdentity and world\n\nstyle · facts · so far\n\nAuthor Notes: hidden\nS2 · LOCK\nFirewall: sealed\n\n<tr-dialogue name="Rally">Welcome.</tr-dialogue>');
 assert.equal(spaced.visible,'<tr-dialogue name="Rally">Welcome.</tr-dialogue>');
});
test('presentation prompt works independently; disabled tracking does not request an NPC patch',()=>{
 const settings=host.getSettings();settings.injectState=false;settings.autoTrack=false;settings.chatPresentation=true;host.updatePrompt(host.defaultState());
 assert.match(context.lastPrompt[1],/<tr-dialogue/);assert.doesNotMatch(context.lastPrompt[1],/must be upserted/);
 settings.chatPresentation=false;host.updatePrompt(host.defaultState());assert.equal(context.lastPrompt[1],'');
 settings.autoTrack=true;settings.chatPresentation=true;host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/must be upserted/);assert.doesNotMatch(context.lastPrompt[1],/upsert only relevant named friendly NPCs/);
});
test('host prompt sends adult preferences only while enabled and follows the player language',()=>{
 const settings=host.getSettings();
 const before={injectState:settings.injectState,autoTrack:settings.autoTrack,chatPresentation:settings.chatPresentation,nsfwEnhance:settings.nsfwEnhance,nsfwPromptMode:settings.nsfwPromptMode,nsfwTags:settings.nsfwTags,roleplayLanguage:settings.roleplayLanguage};
 const previousChat=context.chat;
 try{
  settings.injectState=false;settings.autoTrack=false;settings.chatPresentation=false;
  settings.nsfwEnhance=false;settings.nsfwPromptMode='auto';settings.nsfwTags=['Romance'];settings.roleplayLanguage='auto';
  host.updatePrompt(host.defaultState());assert.equal(context.lastPrompt[1],'');
  settings.nsfwEnhance=true;context.chat=[{is_user:true,mes:'ตอบเป็นภาษาไทยนะ'}];
  host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/Write narrative and character dialogue in Thai/);
  assert.doesNotMatch(context.lastPrompt[1],/"Romance"|OPTIONAL ADULT/);
  context.chat=[{is_user:true,mes:'จูบเธออย่างอ่อนโยน'}];
  host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/"Romance"/);
  context.chat=[{is_user:true,mes:'Please continue in English.'}];
  host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/Write narrative and character dialogue in English/);
 }finally{Object.assign(settings,before);context.chat=previousChat;}
});
test('manual profiles reach the canonical model prompt without portrait bytes',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',background:'Archive',goals:'Book',speechStyle:'Formal',hasPortrait:true})];
 const prompt=JSON.stringify(host.roleplayState(state));assert.match(prompt,/Silver hair/);assert.match(prompt,/Formal/);assert.doesNotMatch(prompt,/data:image|portraitView|hasPortrait/);
});
test('production asset references and release version stay in sync',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));assert.equal(manifest.version,'0.50.1');
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
test('role-play prompt contains provider reasoning and escapes markup-like reference data',()=>{
 const settings=host.getSettings();settings.autoTrack=true;settings.chatPresentation=true;
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'warden',name:'Warden',met:true,appearance:'<thinking>private note</thinking>',background:'<planning>route</planning>'})];
 const prompt=host.statePrompt(state,{includeState:true,track:true});
 assert.match(prompt,/VISIBLE OUTPUT BOUNDARY/);
 assert.doesNotMatch(prompt,/<(?:thinking|planning)>/i);
 assert.match(prompt,new RegExp('\\\\u003c(?:thinking|planning)'));
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
 const confirmed=host.defaultState();confirmed.onboarding.locationSeeded=true;confirmed.location.place='Story Capital';
 assert.equal(host.roleplayState(confirmed).sceneContext.location.place,'Story Capital');
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
 assert.equal(next.onboarding.locationSeeded,true);assert.equal(next.location.region,'');
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

test('a stale generation event does not leave an invitation disabled or a diary unsaved',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,save:context.saveMetadata,isGenerating:context.isGenerating};
 const settings=host.getSettings(), prior=settings.autoTrack, rate=settings.npcDiaryFrequency;
 const originalGet=sandbox.document.getElementById;
 try{
  settings.autoTrack=true;settings.npcDiaryFrequency='often';
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'kohaku',name:'Kohaku',met:true})];
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(state)};
  context.chat=[{is_user:true,mes:'Talk to Kohaku.'},{is_user:false,mes:`<tr-dialogue name="Kohaku">I invite you to join the party "Moonlight".</tr-dialogue><!--tretaresia_patch:${JSON.stringify({sceneTracker:fullScene,ops:[['offer','partyInvitation',{npcId:'kohaku',name:'Moonlight',memberCount:3}],['append','npcDiary',{npcId:'kohaku',text:'I want us to travel together.'}]]})}-->`}];
  context.isGenerating=()=>true;context.saveMetadata=async()=>{};
  host.setLiveGeneration(true);
  host.markCompleted(context.chat[1]); // MESSAGE_RECEIVED is authoritative even if host busy state lingers.
  await host.processAssistantPatch(1,'normal');
  assert.equal(host.sceneForMessage(1,context.chat[1]).missing.length,0);
  assert.equal(host.socialEventsForMessage(1,context.chat[1]).groupOffers[0].preview,undefined);
  assert.equal(host.diaryForMessage(1,context.chat[1]).length,1);
  assert.equal(host.getState().npcs.find(npc=>npc.id==='kohaku').diary.length,1);
  assert.equal(host.getState().social.party,null);
  assert.equal(await host.answerGroupOffer(1,'party:moonlight',true),true);
  assert.equal(host.getState().social.party.name,'Moonlight');
  assert.notEqual(host.getState().social.party.leaderId,'player');
 }finally{host.setLiveGeneration(false);context.chat=saved.chat;context.chatMetadata=saved.metadata;context.saveMetadata=saved.save;context.isGenerating=saved.isGenerating;settings.autoTrack=prior;settings.npcDiaryFrequency=rate;sandbox.document.getElementById=originalGet;}
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

test('role-only model upserts and dialogue fallback cannot create fake named dossiers',()=>{
 const state=host.defaultState();
 for(const name of ['Father','พ่อ','Innkeeper','Gate Keeper']){
  const result=host.applyStatePatch(state,{ops:[['upsert','npcs',{name,occupation:name}]]});
  assert.equal(result.next.npcs.length,0);assert.equal(result.accepted,0);
  host.registerStorySpeakers(state,{mes:`<tr-dialogue name="${name}">Hello</tr-dialogue>`},context);
  assert.equal(state.npcs.length,0);
 }
});
test('role references update canonical people without duplicates or renaming',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'dad',name:'Arthur',relationship:'พ่อ'}),host.npcProfile({id:'inn',name:'Lysa',occupation:'Innkeeper'})];
 const result=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:'dad',name:'Father',activity:'At home'}],['upsert','npcs',{name:'Innkeeper',met:true}]]});
 assert.equal(result.next.npcs.length,2);assert.equal(result.next.npcs[0].name,'Arthur');assert.equal(result.next.npcs[1].name,'Lysa');
 assert.equal(result.next.npcs[0].aliases.includes('Father'),false);
 host.registerStorySpeakers(result.next,{mes:'<tr-dialogue name="Father">Hello</tr-dialogue><tr-dialogue name="Innkeeper">Welcome</tr-dialogue>'},context);
 assert.equal(result.next.npcs.length,2);assert.equal(result.next.npcs[0].met,true);
});
test('an explicit id can repair a legacy role name while retaining the dossier and portrait',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'old',name:'Gate Keeper',hasPortrait:true,portraitSource:'server',portraitPath:'/user/images/tretaresia-npc/a.webp',background:'Veteran',stats:{hp:65}})];
 const result=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:'old',name:'Darin'}]]});
 const npc=result.next.npcs[0];assert.equal(npc.id,'old');assert.equal(npc.name,'Darin');assert.equal(npc.occupation,'Gate Keeper');
 assert.equal(npc.stats.hp,65);assert.equal(npc.background,'Veteran');assert.equal(npc.hasPortrait,true);
});

test('legacy and medallion selections survive real host normalization and AI patches',()=>{
 for(const roleIcon of ['book','mage','scholar','medallion:knight','emblem:nun']){
  const state=host.defaultState();state.npcs=[host.npcProfile({id:'lysa',name:'Lysa',roleIcon,hasPortrait:true,portraitSource:'local'})];
  const before=JSON.stringify(state);
  const normalized=host.normalize(JSON.parse(before));assert.equal(normalized.npcs[0].roleIcon,roleIcon);
  const result=host.applyStatePatch(state,{ops:[['upsert','npcs',{id:'lysa',name:'Lysa',occupation:'Councillor',roleIcon:'medallion:politician'}]]});
  assert.equal(result.next.npcs[0].roleIcon,roleIcon);assert.equal(result.next.npcs[0].hasPortrait,true);assert.equal(JSON.stringify(state),before);
 }
});


test('custom preset connects Forge, actual inline patches, normalization and prompt without legacy power updates',()=>{
 const settings=host.getSettings(),owner=host.powerPresetOwner();
 const config={mode:'custom',name:'Another world',definitions:[powers.powerDefinition({id:'chakra',name:'จักระ',description:'Energy',type:'resource',max:500,initial:25}),powers.powerDefinition({id:'gift',name:'Gift',description:'',type:'toggle',max:1,initial:false})]};
 try{
  powers.writePowerConfig(settings,config,owner,owner);
  const draft=host.forgeDraft({fields:{fName:'Alex'},power:['chakra','Aura']});assert.deepEqual(Array.from(draft.power),['chakra']);
  const state=host.applyForgeProfile(host.defaultState(),draft);assert.equal(state.player.powerType,'จักระ');assert.equal(state.customPowers.chakra,25);assert.equal(state.customPowers.gift,false);
  const result=host.applyStatePatch(state,{ops:[['inc','customPowers.chakra',15],['set','customPowers.gift',true],['set','customPowers.unknown',44],['set','proficiencies.magic.aura',88]]});
  assert.equal(result.accepted,2);assert.equal(result.next.customPowers.chakra,40);assert.equal(result.next.customPowers.gift,true);assert.equal(result.next.proficiencies.magic.aura,0);
  assert.equal(host.normalize(JSON.parse(JSON.stringify(result.next))).customPowers.chakra,40);
  const prompt=host.statePrompt(result.next);assert.match(prompt,/customPowers/);assert.match(prompt,/จักระ/);assert.doesNotMatch(prompt,/Great War shattered|AUTHOR-ONLY ATLAS REFERENCE/);
  config.definitions[0].initial=0;powers.writePowerConfig(settings,config,owner,owner);
  const zero=host.applyForgeProfile(host.defaultState(),draft);assert.equal(zero.customPowers.chakra,0);assert.equal(zero.player.powerType,'จักระ');assert.deepEqual(Array.from(host.normalize(zero).customPowerSelections),['chakra']);
  powers.writePowerConfig(settings,{mode:'custom',name:'Empty',definitions:[]},owner,owner);
  assert.equal(host.forgeDraft({fields:{fName:'Alex'},power:['Aura','chakra']}).power.length,0);
  assert.equal(host.applyForgeProfile(host.defaultState(),{fields:{fName:'Alex'}}).player.powerType,'None');
  assert.equal(host.normalize(result.next).customPowers.chakra,40);
 }finally{delete settings.roleforgePowerPresets[owner];}
});

test('custom Forge choices save origin, skill mastery, and named Path rank without old world canon',()=>{
 const settings=host.getSettings(),owner=host.powerPresetOwner();
 try{
  forgePresets.writeForgePreset(settings,{mode:'custom',name:'Another setting',origins:['Arcadia'],standings:['Citizen'],skillCategories:['Alchemy'],masteryRanks:['Seed','Bloom'],pathRanks:['Bronze','Silver','Gold']},owner,owner);
  const draft=host.forgeDraft({fields:{fName:'Ari',fCont:'Arcadia',fBirth:'Silver Harbor',fOrigin:'Dawn',fOriginCat:'Alchemy',fMastery:'Bloom'},stand:'Citizen',rank:'Silver'});
  const state=host.normalize(host.applyForgeProfile(host.defaultState(),draft));
  assert.equal(state.player.homeContinent,'Arcadia');assert.equal(state.player.birthplace,'Silver Harbor');assert.equal(state.player.standing,'Citizen');
  assert.equal(state.skills[0].type,'Alchemy');assert.equal(state.skills[0].rank,'Bloom');
  assert.equal(state.progression.adventurerRank,'Custom Rank');assert.equal(state.progression.customRankName,'Silver');
  const prompt=host.statePrompt(state);assert.match(prompt,/Arcadia/);assert.match(prompt,/Silver Harbor/);
  assert.doesNotMatch(prompt,/Great War shattered|AUTHOR-ONLY ATLAS REFERENCE|Teleport and warp canon:/);
 }finally{delete settings.roleforgeForgePresets[owner];}
});

test('interface language does not rewrite AI state instructions or saved custom content',()=>{
 const settings=host.getSettings(),before=settings.language,state=host.defaultState();
 state.player.name='Name ชื่อเดิม';state.player.profession='ผู้รักษา';
 try{settings.language='en';const en=host.statePrompt(state);settings.language='th';assert.equal(host.statePrompt(state),en);assert.equal(state.player.name,'Name ชื่อเดิม');assert.equal(state.player.profession,'ผู้รักษา');}
 finally{settings.language=before;}
});

test('story systems migrate old saves without changing legacy quest progress or balances',()=>{
 const old=host.defaultState();delete old.storyMemories;delete old.storyAgenda;
 old.quests=[{id:'legacy',name:'An older quest',status:'Active',progress:61}];old.progression.currency.gold=17;
 const migrated=host.normalize(JSON.parse(JSON.stringify(old)));
 assert.deepEqual(Array.from(migrated.storyMemories),[]);assert.deepEqual(Array.from(migrated.storyAgenda),[]);
 assert.equal(migrated.quests[0].progress,61);assert.equal(migrated.quests[0].objectives.length,0);assert.equal(migrated.progression.currency.gold,17);
 assert.deepEqual(Array.from(host.defaultState().storyMemories),[]);assert.deepEqual(Array.from(host.defaultState().storyAgenda),[]);
});

test('story patches preserve canonical identities and host provenance across duplicates, partial updates and reload',()=>{
 const first=host.applyStatePatch(host.defaultState(),{ops:[['set','worldClock.day',7],
  ['upsert','storyMemories',{id:'promise',title:'Return Mira’s book',kind:'Promise',detail:'Return it intact.',people:['Mira'],evidence:'I promise to return it.',sourceMessageId:999,sourceDay:999,source:'spoof'}],
  ['upsert','storyAgenda',{id:'meeting',title:'Meet Mira',dueDay:8,dueTime:'09:00',location:'Library',evidence:'See you tomorrow at nine.',sourceMessageId:999,source:'spoof'}],
  ['upsert','quests',{id:'books',name:'Recover the books',status:'Active',objectives:[{id:'find',title:'Find the book'},{id:'return',title:'Return the book'}]}],
 ]},{sourceMessageId:5,source:'main-reply'}).next;
 assert.equal(first.storyMemories[0].sourceMessageId,5);assert.equal(first.storyMemories[0].sourceDay,7);assert.equal(first.storyMemories[0].source,'main-reply');
 assert.equal(first.storyAgenda[0].sourceMessageId,5);assert.equal(first.storyAgenda[0].sourceDay,7);assert.equal(first.storyAgenda[0].source,'main-reply');
 const repeated=host.applyStatePatch(first,{ops:[
  ['upsert','storyMemories',{id:'fresh-ai-id',title:'RETURN MIRA’S BOOK',kind:'Promise'}],
  ['upsert','storyAgenda',{id:'fresh-ai-id',title:'MEET MIRA',dueDay:8,dueTime:'09:00'}],
  ['upsert','quests',{id:'fresh-ai-id',name:'Recover the books',objectives:[{id:'find',notes:'Search the archive'}]}],
 ]},{sourceMessageId:9,source:'main-reply'}).next;
 assert.equal(repeated.storyMemories.length,1);assert.equal(repeated.storyMemories[0].id,'promise');
 assert.equal(repeated.storyAgenda.length,1);assert.equal(repeated.storyAgenda[0].id,'meeting');
 assert.equal(repeated.quests[0].id,'books');assert.equal(repeated.quests[0].objectives.length,2);
 const reloaded=host.normalize(JSON.parse(JSON.stringify(repeated)));
 const updated=host.applyStatePatch(reloaded,{ops:[
  ['upsert','storyMemories',{id:'promise',status:'Resolved',resolution:'Mira accepted the book.'}],
  ['upsert','storyAgenda',{id:'meeting',status:'Completed',resolution:'Met at the library.'}],
  ['upsert','questObjectives',{questId:'books',id:'find',status:'Completed',evidence:'Found in the archive.'}],
 ]},{sourceMessageId:11,source:'main-reply'}).next;
 assert.equal(updated.storyMemories[0].status,'Resolved');assert.equal(updated.storyMemories[0].detail,'Return it intact.');assert.equal(updated.storyMemories[0].sourceMessageId,11);
 assert.equal(updated.storyAgenda[0].status,'Completed');assert.equal(updated.storyAgenda[0].dueTime,'09:00');assert.equal(updated.storyAgenda[0].location,'Library');assert.equal(updated.storyAgenda[0].sourceMessageId,11);
 assert.equal(updated.quests[0].progress,50);assert.equal(updated.quests[0].objectives[1].status,'Pending');
 assert.equal(updated.quests[0].status,'Active');assert.equal(updated.progression.currency.gold,0);
 const portable=host.portableState(updated);
 assert.equal(portable.storyMemories[0].resolution,'Mira accepted the book.');assert.equal(portable.storyAgenda[0].status,'Completed');
 assert.equal(portable.quests[0].objectives[0].evidence,'Found in the archive.');
 const duplicate=host.applyStatePatch(updated,{ops:[['upsert','storyMemories',{id:'promise',status:'Resolved'}],['upsert','storyAgenda',{id:'meeting',status:'Completed'}]]},{sourceMessageId:20,source:'main-reply'});
 assert.equal(duplicate.accepted,0);assert.equal(duplicate.next.storyMemories[0].sourceMessageId,11);assert.equal(duplicate.next.storyAgenda[0].sourceMessageId,11);
});

test('required objective gating blocks premature quest completion and payouts in either operation order',()=>{
 const base=host.normalize({...host.defaultState(),quests:[{id:'delivery',name:'Deliver a package',status:'Active',objectives:[
  {id:'collect',title:'Collect the package',status:'Completed'},{id:'deliver',title:'Give it to the recipient',status:'Pending'}]}]});
 const complete=['upsert','quests',{id:'delivery',name:'Deliver a package',status:'Completed'}];
 const payment=['inc','progression.currency.gold',6,{category:'quest-reward',questId:'delivery',reason:'Delivery reward'}];
 const pending=['upsert','questObjectives',{questId:'delivery',id:'deliver',status:'Pending'}];
 for(const ops of [[complete,payment,pending],[payment,pending,complete]]){
  const result=host.applyStatePatch(base,{ops:structuredClone(ops)}).next;
  assert.equal(result.quests[0].status,'Active');assert.equal(result.quests[0].progress,50);
  assert.equal(result.progression.currency.gold,0);assert.equal(result.questRewardReceipts.length,0);assert.equal(result.transactions.length,0);
 }
 const ready=host.applyStatePatch(base,{ops:[['upsert','questObjectives',{questId:'delivery',id:'deliver',status:'Completed',evidence:'The recipient accepts it.'}]]}).next;
 assert.equal(ready.quests[0].progress,100);assert.equal(ready.quests[0].status,'Active');assert.equal(ready.quests[0].rewardClaimed,false);
 assert.equal(ready.progression.currency.gold,0);assert.equal(ready.questRewardReceipts.length,0);
 for(const ops of [[complete,payment], [payment,complete,['upsert','questObjectives',{questId:'delivery',id:'deliver',status:'Completed'}]]]){
  const paid=host.applyStatePatch(ops.length===2?ready:base,{ops:structuredClone(ops)}).next;
  assert.equal(paid.quests[0].status,'Completed');assert.equal(paid.progression.currency.gold,6);assert.equal(paid.questRewardReceipts.length,1);
  const replay=host.applyStatePatch(host.normalize(JSON.parse(JSON.stringify(paid))),{ops:[structuredClone(payment)]}).next;
  assert.equal(replay.progression.currency.gold,6);assert.equal(replay.transactions.length,1);
 }
});

test('skipped required goals block completion, optional goals do not, and terminal quests stay archived',()=>{
 let state=host.normalize({...host.defaultState(),quests:[{id:'trail',name:'Find the trail',status:'Active',objectives:[
  {id:'path',title:'Locate the path',status:'Skipped'},{id:'flower',title:'Find a flower',status:'Pending',optional:true}]}]});
 state=host.applyStatePatch(state,{ops:[['upsert','quests',{id:'trail',name:'Find the trail',status:'Completed'}]]}).next;
 assert.equal(state.quests[0].status,'Active');assert.equal(state.quests[0].progress,0);
 state=host.applyStatePatch(state,{ops:[['upsert','questObjectives',{questId:'trail',id:'path',optional:true}]]}).next;
 assert.equal(state.quests[0].progress,100);assert.equal(state.quests[0].status,'Active');assert.equal(state.progression.currency.gold,0);
 state=host.applyStatePatch(state,{ops:[['upsert','quests',{id:'trail',name:'Find the trail',status:'Completed'}]]}).next;
 assert.equal(state.quests[0].status,'Completed');
 for(const status of ['Completed','Failed']){
  const archived=host.normalize({...state,quests:[{...state.quests[0],status}]});
  const replay=host.applyStatePatch(archived,{ops:[['upsert','questObjectives',{questId:'trail',id:'path',status:'Pending',optional:false}],
   ['upsert','quests',{id:'trail',name:'Find the trail',status:'Active'}]]}).next;
  assert.equal(replay.quests[0].status,status);assert.equal(replay.quests[0].objectives[0].optional,true);
 }
});

test('host context selects relevant memories and keeps closed outcomes distinct from active commitments',()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata};
 try{
  context.chat=[{is_user:true,mes:'Meet Mira at the library.'},{is_user:false,mes:'Mira shows us the old book.'}];context.chatMetadata={};
  const state=host.normalize({...host.defaultState(),storyMemories:[
   {id:'relevant',title:'Mira’s book',kind:'Fact',detail:'The book is damaged.',people:['Mira']},
   {id:'secret',title:'Levi’s concealed identity',kind:'Secret',detail:'UNRELATED_SECRET_TOKEN',people:['Levi']},
   {id:'closed',title:'Return Mira’s book',kind:'Promise',status:'Resolved',resolution:'Mira accepted it.',people:['Mira']},
   {id:'archived',title:'Old library mystery',kind:'Thread',status:'Archived',resolution:'The case was dismissed.',keywords:['library']},
   {id:'unrelated-closed',title:'The mountain debt',kind:'Promise',status:'Resolved',people:['Evan']},
  ]});
  const references=host.roleplayState(state).privateTrackerReferenceIndex.storyMemories;
  assert.deepEqual(references.map(entry=>entry.id).sort(),['archived','closed','relevant']);
  assert.equal(references.find(entry=>entry.id==='closed').status,'Resolved');assert.equal(references.find(entry=>entry.id==='archived').status,'Archived');
  assert.doesNotMatch(JSON.stringify(references),/UNRELATED_SECRET_TOKEN|unrelated-closed/);
  const focused=host.aiState(state,{privateTracker:true,focusTranscript:'Levi asks about his identity.'}).storyMemories;
  assert.equal(focused.some(entry=>entry.id==='secret'),true);assert.equal(focused.some(entry=>entry.id==='relevant'),false);
  host.updatePrompt(state);assert.doesNotMatch(context.lastPrompt[1],/UNRELATED_SECRET_TOKEN/);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;}
});

test('agenda alerts use narrative time transitions once and never auto fail quests or alter money',()=>{
 const state=host.normalize({...host.defaultState(),worldClock:{...host.defaultState().worldClock,day:9,time:'08:59'},storyAgenda:[
  {id:'exact',title:'Meet Mira',dueDay:10,dueTime:'09:00',questId:'deadline-quest'},
  {id:'day-only',title:'Finish the letter',kind:'Deadline',dueDay:10,dueTime:''},
  {id:'vague',title:'Meet when ready',dueDay:null,dueTime:'',whenText:'After the rain stops'},
  {id:'closed',title:'A finished meeting',status:'Completed',dueDay:1,dueTime:'09:00'},
 ],quests:[{id:'deadline-quest',name:'Meet before dawn',status:'Active',progress:20}],progression:{...host.defaultState().progression,currency:{gold:12,silver:0,copper:0}}});
 assert.equal(host.storyAgendaAlerts(state,state).length,0);
 const due=host.applyStatePatch(state,{ops:[['set','worldClock.day',10],['set','worldClock.time','09:00']]}).next;
 assert.deepEqual(Array.from(host.storyAgendaAlerts(due,state).map(entry=>entry.id)).sort(),['day-only','exact']);
 assert.equal(host.storyAgendaAlerts(due,due).length,0);assert.match(host.storyAgendaNotice(due),/2/);
 const overdue=host.applyStatePatch(due,{ops:[['set','worldClock.time','09:01']]}).next;
 assert.deepEqual(Array.from(host.storyAgendaAlerts(overdue,due).map(entry=>entry.id)),['exact']);
 assert.equal(host.storyAgendaAlerts(overdue,overdue).length,0);
 const unknownTime={...due,worldClock:{...due.worldClock,time:''}};
 assert.equal(storyAgenda.storyAgendaState(unknownTime.storyAgenda[0],unknownTime.worldClock),'Today');
 assert.equal(storyAgenda.storyAgendaState(unknownTime.storyAgenda[2],unknownTime.worldClock),'Unscheduled');
 const later=host.applyStatePatch(overdue,{ops:[['set','worldClock.day',11]]}).next;
 assert.equal(later.storyAgenda.every(entry=>entry.id==='closed'?entry.status==='Completed':entry.status==='Scheduled'),true);
 assert.equal(later.quests[0].status,'Active');assert.equal(later.quests[0].progress,20);assert.equal(later.progression.currency.gold,12);
 assert.equal(later.transactions.length,0);assert.equal(later.questRewardReceipts.length,0);
});

test('tracked snapshots and audit include memory, agenda and objective changes',()=>{
 const before=host.defaultState();
 const after=host.applyStatePatch(before,{ops:[
  ['upsert','storyMemories',{title:'A promise to Mira',kind:'Promise',detail:'Return tomorrow.'}],
  ['upsert','storyAgenda',{title:'Library meeting',dueDay:2,dueTime:'10:00'}],
  ['upsert','quests',{id:'ledger',name:'Find the ledger',objectives:[{id:'search',title:'Search the desk'}]}],
 ]},{sourceMessageId:1,source:'main-reply'}).next;
 const snapshot=host.trackedStateSnapshot(after);
 assert.match(snapshot['story.memory'],/Active:Return tomorrow/);assert.match(snapshot['story.agenda'],/Scheduled:2:10:00/);assert.match(snapshot['quest.objectives'],/ledger:search:Pending:false/);
 const audit=host.appendStateAudit(after,before,'main-reply');
 for(const path of ['story.memory','story.agenda','quest.objectives'])assert.equal(audit.changes.some(change=>change.path===path),true);
 assert.equal(after.systems.audit.at(-1).source,'main-reply');
});

test('one main reply updates all three story systems with canonical provenance and no extra AI request',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata,get:sandbox.document.getElementById};
 const settings=host.getSettings(),prior=settings.autoTrack,priorNotifications=settings.eventNotifications;
 try{
  settings.autoTrack=true;settings.eventNotifications=false;context.chatMetadata={};let requests=0;
  context.generateQuietPrompt=async()=>{requests++;throw Error('Unexpected second AI request');};context.saveMetadata=async()=>{};
  sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const ops=[['upsert','storyMemories',{id:'mira-promise',title:'Return Mira’s book',kind:'Promise',people:['Mira'],detail:'Return the borrowed book.',sourceMessageId:999,source:'spoof'}],
   ['upsert','storyAgenda',{id:'mira-meeting',title:'Meet Mira',dueDay:2,dueTime:'09:00',location:'Library',sourceMessageId:999}],
   ['upsert','quests',{id:'borrowed',name:'Recover the borrowed book',status:'Active',objectives:[{id:'search',title:'Find the book'}]}],
   ['upsert','questObjectives',{questId:'borrowed',id:'search',status:'Completed',evidence:'The book is in your hands.'}]];
  context.chat=[{is_user:true,mes:'Promise Mira and find the book.'},{is_user:false,mes:`You promise to return Mira’s book. Mira agrees to meet tomorrow at nine. You find the book.<!--tretaresia_patch:${JSON.stringify({ops,sceneTracker:{...fullScene,participants:[]}})}-->`}];
  await host.processAssistantPatch(1,'normal');await host.processAssistantPatch(1,'normal');
  const state=host.getState();assert.equal(state.storyMemories.length,1);assert.equal(state.storyAgenda.length,1);
  assert.equal(state.storyMemories[0].sourceMessageId,1);assert.equal(state.storyMemories[0].source,'main-reply');assert.equal(state.storyAgenda[0].sourceMessageId,1);
  assert.equal(state.quests[0].objectives[0].sourceMessageId,1);assert.equal(state.quests[0].objectives[0].source,'main-reply');
  assert.equal(state.quests[0].progress,100);assert.equal(state.quests[0].status,'Active');assert.equal(state.progression.currency.gold,0);assert.equal(requests,0);
  const savedAt=state.storyMemories[0].updatedAt;
  context.chatMetadata=JSON.parse(JSON.stringify(context.chatMetadata));context.chat=JSON.parse(JSON.stringify(context.chat));
  await host.processAssistantPatch(1,'normal');
  assert.equal(host.getState().storyMemories[0].updatedAt,savedAt);assert.equal(host.getState().storyAgenda.length,1);assert.equal(requests,0);
 }finally{await new Promise(resolve=>setTimeout(resolve,0));context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.get;settings.autoTrack=prior;settings.eventNotifications=priorNotifications;}
});

test('Manual Sync fills story records in chronological order while protecting closed and manually edited records',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata,get:sandbox.document.getElementById};
 const settings=host.getSettings(),prior=settings.autoTrack,priorNotifications=settings.eventNotifications;
 try{
  settings.autoTrack=true;settings.eventNotifications=false;sandbox.document.getElementById=id=>id==='tretaresia-travel-tracker'?{hidden:true}:null;
  const seed=host.normalize({...host.defaultState(),storyMemories:[
   {id:'closed-memory',title:'An old promise',kind:'Promise',status:'Resolved',resolution:'Already fulfilled.',sourceMessageId:9,source:'main-reply'},
   {id:'manual-memory',title:'My personal note',kind:'Fact',detail:'PLAYER_EDIT_TOKEN',sourceMessageId:9,source:'manual-memory'},
  ],storyAgenda:[{id:'cancelled-agenda',title:'Cancelled dinner',status:'Cancelled',dueDay:3,dueTime:'18:00',resolution:'Player cancelled.',sourceMessageId:9,source:'manual-appointment'}]});
  seed.location.place='Current Hall';seed.onboarding.locationSeeded=true;
  context.chatMetadata={tretaresia_rpg_state:host.storedNpcState(seed)};
  context.chat=[{is_user:true,mes:'Agree to meet Mira.'},{is_user:false,mes:'You promise Mira a book and agree to meet at the library.'},
   {is_user:true,mes:'Deliver the book and attend the meeting.'},{is_user:false,mes:'Mira accepts the book at the library. The meeting has occurred.'},
   {is_user:true,mes:'Continue.'},{is_user:false,mes:'You are now in Current Hall.'}];
  const olderChanges=[['upsert','storyMemories',{id:'closed-memory',status:'Active',resolution:''}],
   ['upsert','storyMemories',{id:'manual-memory',detail:'AI_OVERWRITE_TOKEN'}],
   ['upsert','storyAgenda',{id:'cancelled-agenda',status:'Scheduled',dueDay:1}]];
  const patches=[{ops:[...olderChanges,
   ['upsert','storyMemories',{id:'historic-promise',title:'Return Mira’s book',kind:'Promise',detail:'Return it intact.',people:['Mira']}],
   ['upsert','storyAgenda',{id:'historic-meeting',title:'Meet Mira',dueDay:2,dueTime:'09:00',location:'Library'}],
   ['upsert','quests',{id:'historic-quest',name:'Recover Mira’s book',status:'Active',objectives:[{id:'deliver',title:'Give Mira the book'}]}],
  ],sceneTracker:{...fullScene,location:'Old Library',participants:[]}},
  {ops:[['upsert','storyMemories',{id:'historic-promise',status:'Resolved',resolution:'Mira accepted it.'}],
   ['upsert','storyAgenda',{id:'historic-meeting',status:'Completed',resolution:'The meeting occurred.'}],
   ['upsert','questObjectives',{questId:'historic-quest',id:'deliver',status:'Completed',evidence:'Mira accepted the book.'}],
  ],sceneTracker:{...fullScene,location:'Old Library',participants:[]}},
  {ops:[],sceneTracker:{...fullScene,location:'Current Hall',participants:[]}}];
  let requests=0,writes=0;context.saveMetadata=async()=>{writes++;};
  context.generateQuietPrompt=async()=>JSON.stringify(patches[requests++%3]);
  await host.analyzeChat({manual:true,startIndex:0,endIndex:5});
  const state=host.getState();assert.equal(requests,3);assert.equal(writes,1);
  assert.equal(state.storyMemories.find(entry=>entry.id==='historic-promise').status,'Resolved');
  assert.equal(state.storyMemories.find(entry=>entry.id==='historic-promise').sourceMessageId,3);
  assert.equal(state.storyAgenda.find(entry=>entry.id==='historic-meeting').status,'Completed');
  assert.equal(state.storyAgenda.find(entry=>entry.id==='historic-meeting').sourceMessageId,3);
  assert.equal(state.quests.find(entry=>entry.id==='historic-quest').progress,100);assert.equal(state.quests.find(entry=>entry.id==='historic-quest').status,'Active');
  assert.equal(state.storyMemories.find(entry=>entry.id==='closed-memory').status,'Resolved');assert.equal(state.storyMemories.find(entry=>entry.id==='closed-memory').resolution,'Already fulfilled.');
  assert.equal(state.storyMemories.find(entry=>entry.id==='manual-memory').detail,'PLAYER_EDIT_TOKEN');
  assert.equal(state.storyAgenda.find(entry=>entry.id==='cancelled-agenda').status,'Cancelled');assert.equal(state.storyAgenda.find(entry=>entry.id==='cancelled-agenda').dueDay,3);
  assert.equal(state.location.place,'Current Hall');assert.equal(state.progression.currency.gold,0);
  const promiseUpdatedAt=state.storyMemories.find(entry=>entry.id==='historic-promise').updatedAt;
  await host.analyzeChat({manual:true,startIndex:0,endIndex:5});
  assert.equal(host.getState().storyMemories.find(entry=>entry.id==='historic-promise').updatedAt,promiseUpdatedAt);
  assert.equal(host.getState().storyMemories.filter(entry=>entry.id==='historic-promise').length,1);
  assert.equal(host.getState().storyAgenda.filter(entry=>entry.id==='historic-meeting').length,1);
  assert.equal(requests,6);assert.equal(writes,2);
 }finally{await new Promise(resolve=>setTimeout(resolve,0));context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;sandbox.document.getElementById=saved.get;settings.autoTrack=prior;settings.eventNotifications=priorNotifications;}
});

test('terminal quests reject objective edits through both objective and quest upserts',()=>{
 for(const status of ['Completed','Failed']){
  const base=host.normalize({...host.defaultState(),quests:[{id:'archive',name:'An archived quest',status,objectives:[
   {id:'done',title:'Deliver the letter',status:'Completed',sourceMessageId:5,sourceDay:2,source:'main-reply'}]}]});
  const result=host.applyStatePatch(base,{ops:[['upsert','quests',{id:'archive',name:'An archived quest',objectives:[{id:'done',status:'Pending',title:'A new goal'}]}],
   ['upsert','questObjectives',{questId:'archive',id:'done',status:'Skipped',evidence:'Attempted rewrite'}]]},{sourceMessageId:9,source:'main-reply'}).next;
  assert.equal(result.quests[0].status,status);assert.equal(result.quests[0].objectives[0].status,'Completed');
  assert.equal(result.quests[0].objectives[0].title,'Deliver the letter');assert.equal(result.quests[0].objectives[0].sourceMessageId,5);
 }
});

test('a completion request followed by a new required pending goal cannot pay even if the earlier goals were ready',()=>{
 const base=host.normalize({...host.defaultState(),quests:[{id:'late-goal',name:'Secure the ledger',status:'Active',objectives:[{id:'find',title:'Find the ledger',status:'Completed'}]}]});
 const complete=['upsert','quests',{id:'late-goal',name:'Secure the ledger',status:'Completed'}];
 const newGoal=['upsert','questObjectives',{questId:'late-goal',id:'return',title:'Return it to its owner',status:'Pending'}];
 const payout=['inc','progression.currency.gold',7,{category:'quest-reward',questId:'late-goal',reason:'Ledger mission reward'}];
 for(const ops of [[complete,newGoal,payout],[payout,complete,newGoal]]){
  const result=host.applyStatePatch(base,{ops:structuredClone(ops)}).next;
  assert.equal(result.quests[0].objectives.length,2);assert.equal(result.quests[0].progress,50);assert.equal(result.quests[0].status,'Active');
  assert.equal(result.progression.currency.gold,0);assert.equal(result.questRewardReceipts.length,0);assert.equal(result.transactions.length,0);
 }
});

test('objective provenance comes from the host and only advances when objective content changes',()=>{
 const value={id:'trusted-step',title:'Talk to Mira',sourceMessageId:999,sourceDay:999,source:'spoof'};
 const created=host.applyStatePatch(host.defaultState(),{ops:[['upsert','quests',{id:'trusted-quest',name:'Ask Mira',objectives:[value]}]]},
  {sourceMessageId:5,sourceDay:3,source:'main-reply'}).next;
 assert.equal(created.quests[0].objectives[0].sourceMessageId,5);assert.equal(created.quests[0].objectives[0].sourceDay,3);assert.equal(created.quests[0].objectives[0].source,'main-reply');
 const repeated=host.applyStatePatch(created,{ops:[['upsert','questObjectives',{questId:'trusted-quest',...value}]]},
  {sourceMessageId:9,sourceDay:4,source:'main-reply'});
 assert.equal(repeated.accepted,0);assert.equal(repeated.next.quests[0].objectives[0].sourceMessageId,5);
 const nestedRepeat=host.applyStatePatch(created,{ops:[['upsert','quests',{id:'trusted-quest',name:'Ask Mira',objectives:[value]}]]},
  {sourceMessageId:9,sourceDay:4,source:'main-reply'}).next;
 assert.equal(nestedRepeat.quests[0].objectives[0].sourceMessageId,5);assert.equal(nestedRepeat.quests[0].objectives[0].sourceDay,3);
 const updated=host.applyStatePatch(host.normalize(JSON.parse(JSON.stringify(created))),{ops:[
  ['upsert','questObjectives',{questId:'trusted-quest',id:'trusted-step',status:'Completed',evidence:'Mira answered.'}],
 ]},{sourceMessageId:11,sourceDay:5,source:'main-reply'}).next;
 assert.equal(updated.quests[0].objectives[0].sourceMessageId,11);assert.equal(updated.quests[0].objectives[0].sourceDay,5);
 assert.equal(updated.quests[0].objectives[0].source,'main-reply');assert.equal(updated.quests[0].progress,100);assert.equal(updated.quests[0].status,'Active');
});

test('historical sync can complete older pending steps but cannot overwrite newer or manual objective edits',()=>{
 const state=host.normalize({...host.defaultState(),quests:[{id:'historical-owner',name:'A historical quest',status:'Active',objectives:[
  {id:'older',title:'An older step',status:'Pending',sourceMessageId:1,source:'main-reply'},
  {id:'newer',title:'A newer step',status:'Pending',sourceMessageId:9,source:'main-reply'},
  {id:'manual',title:'A player edited step',status:'Pending',sourceMessageId:9,source:'manual-quest-objective'},
  {id:'manual-older',title:'An earlier player edited step',status:'Pending',sourceMessageId:1,source:'manual-quest-objective'},
  {id:'finished',title:'An already finished step',status:'Completed',sourceMessageId:1,source:'main-reply'},
 ]}]});
 const ops=['older','newer','manual','manual-older'].map(id=>['upsert','questObjectives',{questId:'historical-owner',id,status:'Completed'}]);
 ops.push(['upsert','questObjectives',{questId:'historical-owner',id:'finished',status:'Pending'}]);
 const filtered=host.manualSyncHistoricalOperations(ops,true,state,false,3);
 assert.deepEqual(Array.from(filtered.map(operation=>operation[2].id)),['older']);
 const applied=host.applyStatePatch(state,{ops:filtered},{sourceMessageId:3,sourceDay:2,source:'manual-sync'}).next;
 assert.equal(applied.quests[0].objectives.find(entry=>entry.id==='older').status,'Completed');
 assert.equal(applied.quests[0].objectives.find(entry=>entry.id==='newer').status,'Pending');
 assert.equal(applied.quests[0].objectives.find(entry=>entry.id==='manual').status,'Pending');
 assert.equal(applied.quests[0].objectives.find(entry=>entry.id==='finished').status,'Completed');
 assert.equal(applied.quests[0].objectives.find(entry=>entry.id==='older').sourceMessageId,3);
});


test('auction opt-out permits normal story purchases without engine history while explicit engine records stay protected',()=>{
 const settings=host.getSettings(),prior=settings.enableAuctions;settings.enableAuctions=false;
 try {
  const base=host.normalize({...host.defaultState(),progression:{currency:{gold:30}}});
  const ops=[['inc','progression.currency.gold',-7,{category:'purchase',reason:'Bought a bow at the auction'}],
   ['upsert','inventory',{id:'bow',name:'Auction bow',quantity:1},{category:'purchase',reason:'Bought at the auction'}]];
  const result=host.applyStatePatch(base,{ops}).next;
  assert.equal(result.progression.currency.gold,23);assert.equal(result.inventory[0].quantity,1);
  const spoof=host.applyStatePatch(result,{ops:[['inc','progression.currency.gold',-7,{auctionId:'fake'}],
   ['upsert','inventory',{id:'copy',name:'Duplicate bow',quantity:1},{lotId:'fake'}],['upsert','auctions',{id:'fake'}]]}).next;
  assert.equal(spoof.progression.currency.gold,23);assert.equal(spoof.inventory.length,1);assert.equal(spoof.auctions.length,0);
  const recorded=host.normalize({...base,auctionReceipts:[{id:'paid',auctionId:'old',lotId:'bow',winner:'player',amount:7,denomination:'gold',itemName:'Bow',quantity:1,savedAt:'2026-09-30'}]});
  assert.equal(recorded.auctionReceipts.length,1);
  const replay=host.applyStatePatch(recorded,{ops}).next;assert.equal(replay.progression.currency.gold,30);assert.equal(replay.inventory.length,0);
 }finally{settings.enableAuctions=prior;}
});


test('foreign command text survives extraction while only marked RoleForge bookkeeping is consumed',()=>{
 const foreign='A status display from another preset.\nsex_stage: sex_scene\nSET clock.time 21:22\nSET rng.last 8\nSET npc.Melisia.task Resting\nSET npc.Melisia.next Speak tomorrow\nSET sex.stage sex_scene\nSET sex.arousal 100';
 const bare=host.extractStatePatch(foreign);assert.equal(bare.found,false);assert.equal(bare.patch,null);assert.equal(bare.visible,foreign);
 const mixed=host.extractStatePatch(foreign+'\n<!--tretaresia_patch:{"ops":[["set","worldClock.time","21:22"]]}-->');
 assert.equal(mixed.found,true);assert.equal(mixed.visible,foreign);assert.deepEqual(Array.from(mixed.patch.ops[0]),['set','worldClock.time','21:22']);
});

test('location memory patches require quoted evidence and preserve hierarchy across revisits',()=>{
 const quote='The party enters Beviter Road within Asura Kingdom.';
 const parsed=host.extractStatePatch(`Story. <!--tretaresia_patch:${JSON.stringify({locations:[{id:'beviter',name:'Beviter Road',kind:'Place',parentName:'Asura Kingdom',detail:'Market street',evidence:quote}]})}-->`);
 assert.equal(parsed.patch.locations.length,1);
 const state=host.normalize(host.defaultState());
 const applied=host.applyStatePatch(state,parsed.patch);
 assert.equal(applied.accepted,1);
 const place=applied.next.locationMemory.find(entry=>entry.id==='beviter');
 const parent=applied.next.locationMemory.find(entry=>entry.name==='Asura Kingdom');
 assert.equal(place.parentId,parent.id);
 const rejected=host.extractStatePatch(`<!--tretaresia_patch:${JSON.stringify({locations:[{name:'Rumor Road',evidence:'A rumor says this exists.'}]})}-->`);
 assert.equal(rejected.patch.locations.length,1);
 assert.equal(host.confirmedLocationMemory(rejected.patch.locations,rejected.visible).length,0);
});

test('journey progress stays fixed for plans and same-place dialogue, then advances on a completed movement',()=>{
 const base=host.normalize({...host.defaultState(),location:{place:'Asura Gate'},onboarding:{locationSeeded:true},travel:{status:'Traveling',origin:'Asura Gate',destination:'Rameer Street',destinationPlace:'Rameer Street',route:'Road',totalDays:10,remainingDays:10,lastUserProgressMessage:'',trackedUserTurns:0}});
 const planned=host.advanceActiveTravelFromUserMessage(1,{mes:'I plan to travel to Rameer Street tomorrow.'},base);
 assert.equal(planned,null,'plans do not consume route distance');
 const dialogue=host.advanceActiveTravelFromUserMessage(2,{mes:'I ask the guard about the weather while remaining at the gate.'},base);
 assert.equal(dialogue,null,'same-place dialogue does not consume route distance');
 const moved=host.advanceActiveTravelFromUserMessage(3,{mes:'I walk along the road toward Rameer Street for one hour.'},base);
 assert.equal(moved.travel.remainingDays,10,'movement alone has no distance until a roll/time result confirms it');
 assert.equal(Math.round(host.travelProgress(moved)*100),0);
 const elapsed=host.advanceActiveTravelFromUserMessage(4,{mes:'I walk along the road; after 2 days, the roll confirms we covered the route.'},base);
 assert.equal(elapsed.travel.remainingDays,8);
 assert.equal(Math.round(host.travelProgress(elapsed)*100),20);
});
