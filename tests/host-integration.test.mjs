import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { identity, CHAT_INSTRUCTIONS, ATTRIBUTE_INSTRUCTIONS, npcAttributeDefaults, resolveNpc, resolveNpcSpeaker, keyName, parseStory, retainManualNpcEdits } from '../npc-core.js';
import {H_FIELDS,H_FIELD_MAP,hStats,updateHStat} from '../h-stats.js';
import * as scopes from '../npc-scopes.js';
import * as lore from '../lore-core.js';
import * as archive from '../character-archive.js';
import {sceneSnapshot,sceneTrackerOperations,missingSceneFields} from '../scene-tracker.js';
import {normalizeAdultSettings,writingPreferencePrompt} from '../nsfw-enhance.js';

// Evaluate the real host integration without startup or network. No reimplementation of its parser.
const context={extensionSettings:{},chatMetadata:{},chat:[{is_user:true,mes:'Hello'}],getCurrentChatId:()=> 'test-chat',getRequestHeaders:()=>({'Content-Type':'application/json'}),fetch:async()=>({ok:true,status:200}),setExtensionPrompt:(...args)=>{context.lastPrompt=args;},saveSettingsDebounced(){}};
const sandbox={...scopes,...lore,...archive,fetch:async()=>({ok:true,status:200}),sceneSnapshot,sceneTrackerOperations,missingSceneFields,normalizeAdultSettings,writingPreferencePrompt,H_FIELDS,H_FIELD_MAP,hStats,updateHStat,console,structuredClone,setTimeout,clearTimeout,URL,Blob,TextEncoder,crypto:globalThis.crypto,npcIdentity:identity,CHAT_INSTRUCTIONS,ATTRIBUTE_INSTRUCTIONS,npcAttributeDefaults,resolveNpc,resolveNpcSpeaker,keyName,parseStory,retainManualNpcEdits,
    createNpcWorkspace(){},SillyTavern:{getContext:()=>context,libs:{}},document:{readyState:'loading',addEventListener(){},querySelectorAll(){return[];}},localStorage:{getItem(){return null;},setItem(){}},globalThis:null};
sandbox.globalThis=sandbox;
const source=readFileSync(new URL('../index.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
 vm.createContext(sandbox);vm.runInContext(`${source}\n globalThis.testHost={npcProfile,normalize,defaultState,applyStatePatch,extractStatePatch,getSettings,updatePrompt,roleplayState,friendlyNpcs,metFriendlyNpcs,getState,characterNpcLibrary,storedNpcState,persistNpcScope,requestUsage,recordExtensionRequest,routeStoryNpcState,registerStorySpeakers,activeCharacterLore,activeLorePrompt,persistCharacterLore,parseJson,synchronizeWorldState,rememberScene,sceneForMessage,onInterfaceSettingChange,processAssistantPatch,assistantCheckpoint,saveCurrentChatMetadata,replaceAssistantTurnState,analyzeChat,renderScene,trackedStateSnapshot,appendStateAudit,renderHStats,parseRegistrationMessage};`,sandbox);
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
test('player H-Stats render and survive confirmed story updates',()=>{
 const base=host.defaultState();
 const panel={innerHTML:''};
 host.renderHStats(panel,base);
 assert.match(panel.innerHTML,/data-form="npc-hstats"/);
 assert.match(panel.innerHTML,/data-id="player"/);
 assert.equal((panel.innerHTML.match(/<svg viewBox="0 0 24 24"/g)||[]).length,5);
 const updated=host.applyStatePatch(base,{ops:[
  ['set','playerHStats',{field:'loyaltyHearts',value:4}],
  ['inc','playerHStats',{field:'oralSexCount',amount:1}],
  ['set','playerHStats',{field:'pregnant',value:false}],
 ]});
 assert.equal(updated.accepted,3);
 assert.equal(updated.next.player.hStats.loyaltyHearts,4);
 assert.equal(updated.next.player.hStats.oralSexCount,1);
 assert.equal(updated.next.player.hStats.pregnant,false);
 host.renderHStats(panel,updated.next);
 assert.match(panel.innerHTML,/Loyalty 4 of 5/);
 assert.equal((panel.innerHTML.match(/class="is-filled"/g)||[]).length,4);
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
 const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));assert.equal(manifest.version,'0.40.0');
 for(const file of ['index.js','npc-workspace.js','npc-chat.js','npc-portraits.js','npc-media.js','npc-scopes.js']){const s=readFileSync(new URL(`../${file}`,import.meta.url),'utf8');const refs=[...s.matchAll(/\.\/npc-[a-z]+\.(?:js|css)\?v=([\d.]+)/g)];assert.ok(refs.length);for(const ref of refs)assert.equal(ref[1],manifest.version);}
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
 assert.equal(scene.location.place,'Unknown');assert.equal(scene.location.mapX,null);
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

test('missing scene fields are requested once and stored with the same reply',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata};
 const priorTrack=host.getSettings().autoTrack;host.getSettings().autoTrack=true;
 let requests=0,writes=0;
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'Go to Moon Hall.'},{is_user:false,mes:'Kohaku waits in Moon Hall.'}];
  context.saveMetadata=async()=>{writes++;};
  context.generateQuietPrompt=async({quietPrompt})=>{requests++;assert.match(quietPrompt,/ACTUAL current location/);return JSON.stringify({sceneTracker:fullScene});};
  await host.processAssistantPatch(1,'normal');
  const scene=host.sceneForMessage(1,context.chat[1]);
  assert.equal(scene.location,'Moon Hall');assert.deepEqual([...scene.missing],[]);
  assert.equal(host.getState().location.place,'Moon Hall');assert.equal(requests,1);assert.equal(writes,1);
  await host.processAssistantPatch(1,'normal');assert.equal(requests,1);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;host.getSettings().autoTrack=priorTrack;}
});

test('a scene completion for an obsolete chat cannot overwrite the next chat',async()=>{
 const saved={chat:context.chat,metadata:context.chatMetadata,generate:context.generateQuietPrompt,save:context.saveMetadata,getId:context.getCurrentChatId};
 const priorTrack=host.getSettings().autoTrack;host.getSettings().autoTrack=true;
 let writes=0;
 try{
  context.chatMetadata={};context.chat=[{is_user:true,mes:'Go outside.'},{is_user:false,mes:'The gates open.'}];
  context.saveMetadata=async()=>{writes++;};
  let currentId='test-chat';context.getCurrentChatId=()=>currentId;
  context.generateQuietPrompt=async()=>{currentId='other-chat';return JSON.stringify({sceneTracker:fullScene});};
  await host.processAssistantPatch(1,'normal');
  assert.equal(writes,0);assert.equal(context.chatMetadata.tretaresia_rpg_scene_history,undefined);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;context.getCurrentChatId=saved.getId;host.getSettings().autoTrack=priorTrack;}
});

test('a failed scene-completion request preserves known facts and marks missing fields',async()=>{
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
  assert.equal(requests,1);assert.equal(writes,1);
 }finally{context.chat=saved.chat;context.chatMetadata=saved.metadata;context.generateQuietPrompt=saved.generate;context.saveMetadata=saved.save;host.getSettings().autoTrack=priorTrack;}
});
