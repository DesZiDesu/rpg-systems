import test from 'node:test';
import assert from 'node:assert/strict';
import {npcEntryLimit,validateNpcOptions,hasNpcCapacity,assertNpcCapacity} from '../src/npc-capacity.js';
import {importCharacters,retainManualNpcEdits,npcReferenceProfiles} from '../src/npc-core.js';
import {hydrateScopedNpcs,packScopedNpcs,scopeEnvelope,routeNewStoryNpcs} from '../src/npc-scopes.js';
import {exportWorldPreset,importWorldPreset,readChatPreset,CHAT_PRESET_KEY} from '../src/world-presets.js';

const profiles=(count,scope='chat')=>Array.from({length:count},(_,i)=>({id:`npc_${i}`,name:`Archive NPC ${String(i).padStart(4,'0')}`,aliases:[`Alias ${String(i).padStart(4,'0')}`],enabled:i<20,npcScope:scope,npcOwner:scope==='character'?'card:archive.png':'',stats:{hp:100}}));

test('capacity defaults to unlimited, validates finite limits and permits existing over-limit edits/deletions',()=>{
 assert.equal(npcEntryLimit(),0);assert.deepEqual(validateNpcOptions({}),{entryLimit:0});
 for(const entryLimit of [0,1,500,10000,Number.MAX_SAFE_INTEGER])assert.deepEqual(validateNpcOptions({entryLimit,apiKey:'ignore'}),{entryLimit});
 for(const entryLimit of [-1,1.5,NaN,Infinity,'500',true,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>validateNpcOptions({entryLimit}));
 assert.equal(hasNpcCapacity(500,{entryLimit:0}),true);assert.equal(hasNpcCapacity(500,{entryLimit:500}),false);
 assert.doesNotThrow(()=>assertNpcCapacity(500,{entryLimit:20},500));assert.doesNotThrow(()=>assertNpcCapacity(499,{entryLimit:20},500));
 assert.throws(()=>assertNpcCapacity(501,{entryLimit:500},500),/500/);assert.throws(()=>assertNpcCapacity(501,{entryLimit:20},500),/20/);
});

test('500-record JSON import keeps disabled state and entries beyond the old cap',()=>{
 const imported=importCharacters({npcs:profiles(500)});assert.equal(imported.length,500);assert.equal(imported.at(-1).profile.name,'Archive NPC 0499');
 assert.equal(imported.filter(n=>n.profile.enabled!==false).length,20);
});

test('large Character overrides, shared IDs and hidden IDs survive pack/hydrate without truncation',()=>{
 const library=profiles(750,'character'),state=hydrateScopedNpcs({npcs:[]},library,'card:archive.png');
 assert.equal(state.npcs.length,750);for(const npc of state.npcs)npc.stats.hp=80;
 const packed=packScopedNpcs(state,library,'card:archive.png');assert.equal(Object.keys(packed.npcScopes.overrides).length,750);assert.equal(packed.npcScopes.sharedIds.length,750);
 const restored=hydrateScopedNpcs(packed,library,'card:archive.png');assert.equal(restored.npcs.at(-1).stats.hp,80);assert.equal(restored.npcs.filter(n=>n.enabled!==false).length,20);
 const envelope=scopeEnvelope({owner:'card:archive.png',overrides:packed.npcScopes.overrides,bases:state.npcScopes.bases,hidden:library.map(n=>n.id),sharedIds:library.map(n=>n.id)});
 assert.equal(envelope.hidden.length,750);assert.equal(Object.keys(envelope.bases).length,750);assert.equal(hydrateScopedNpcs({...packed,npcScopes:envelope},library,'card:archive.png').npcs.length,0);
 assert.equal(library.at(-1).stats.hp,100);
});

test('manual additions above 200/400 stay in swipe rollback snapshots',()=>{
 const before={npcs:profiles(500)},after={npcs:[...profiles(500),{id:'last',name:'Last arrival',stats:{hp:75}}]},history={entries:[{baseState:structuredClone(before),variants:{one:{state:structuredClone(before)}}}]};
 after.npcs[499].stats.hp=30;retainManualNpcEdits(history,before,after);
 for(const state of [history.entries[0].baseState,history.entries[0].variants.one.state]){assert.equal(state.npcs.length,501);assert.equal(state.npcs[499].stats.hp,30);assert.equal(state.npcs[500].name,'Last arrival');}
});

test('NPC limits round-trip through legacy-compatible world and chat preset formats',()=>{
 for(const entryLimit of [0,500]){const config={npcOptions:{entryLimit}},file=exportWorldPreset(config,'Character limit');assert.deepEqual(importWorldPreset(file).config,config);assert.deepEqual(readChatPreset({[CHAT_PRESET_KEY]:{version:1,config}}),config);}
 assert.throws(()=>importWorldPreset(JSON.stringify({format:'roleforge-world-preset',version:1,name:'Invalid',config:{npcOptions:{entryLimit:-1}}})));
});

test('story routing honors a custom capacity and accepts dossiers staged directly for Character scope',()=>{
 const library=profiles(500,'character'),previous={npcs:[]},fresh={id:'fresh',name:'Fresh arrival',npcScope:'character',npcOwner:'card:archive.png'};
 const unlimited=routeNewStoryNpcs({npcs:[fresh]},previous,library,'card:archive.png','character');assert.equal(unlimited.added,1);assert.equal(unlimited.library.length,501);
 const finite=routeNewStoryNpcs({npcs:[fresh]},previous,library,'card:archive.png','character',{entryLimit:500});assert.equal(finite.added,0);assert.equal(finite.overflow,1);assert.equal(finite.state.npcs[0].npcScope,'chat');assert.equal(library.length,500);
});

test('reference retrieval prioritizes mentioned disabled names/aliases without enabling them or loading every dossier',()=>{
 const records=profiles(500),before=JSON.stringify(records);
 const retrieved=npcReferenceProfiles(records,'Ask Alias 0499 about the archive.');assert.equal(retrieved.length,16);assert.equal(retrieved[0].id,'npc_499');assert.equal(retrieved[0].enabled,false);
 const named=npcReferenceProfiles(records,'Archive NPC 0300 enters the room.');assert.equal(named[0].id,'npc_300');
 const recent=npcReferenceProfiles(records,'Archive NPC 0000 spoke earlier. I now ask Alias 0499.');assert.equal(recent[0].id,'npc_499');
 assert.equal(npcReferenceProfiles(records,'Nothing relevant.').every(n=>n.enabled),true);assert.equal(JSON.stringify(records),before);
});
