import test from 'node:test';
import assert from 'node:assert/strict';
import {characterOwner,hydrateScopedNpcs,packScopedNpcs,withoutChatNpcContinuity,scopedPortraitKey,scopeEnvelope} from '../npc-scopes.js';

const owner='card:first.png';
const library=[{id:'s1',name:'Archivist',personality:'Calm',location:'Library',stats:{hp:100,level:5},npcScope:'character',npcOwner:owner,hasPortrait:true}];
const local={id:'l1',name:'Traveler',location:'Forest'};
test('card ownership uses filename, supports index zero, and never guesses in group chats',()=>{
 assert.equal(characterOwner({characterId:0,characters:[{name:'A',avatar:'first.png'}]}).key,owner);
 assert.equal(characterOwner({characterId:0,characters:[{name:'A',avatar:'second.png'}]}).key,'card:second.png');
 assert.equal(characterOwner({character:{name:'A'}}),null);assert.equal(characterOwner({groupId:'group',character:{avatar:'first.png'}}),null);
});
test('legacy NPCs are local; shared records are hydrated without mutating inputs',()=>{
 const state={npcs:[local]},s=hydrateScopedNpcs(state,library,owner);
 assert.equal(s.npcs[0].npcScope,'chat');assert.equal(s.npcs[1].npcScope,'character');assert.equal(state.npcs[0].npcScope,undefined);assert.equal(state.npcs.length,1);
});
test('packing stores only Chat NPCs and sparse Character deltas',()=>{
 const state=hydrateScopedNpcs({npcs:[local]},library,owner);state.npcs[1].location='Market';state.npcs[1].stats.hp=80;
 const stored=packScopedNpcs(state,library,owner);
 assert.equal(stored.npcs.length,1);assert.deepEqual(stored.npcScopes.overrides.s1,{location:'Market',stats:{hp:80}});assert.equal(stored.npcScopes.bases,undefined);
 const restored=hydrateScopedNpcs(stored,library,owner);assert.equal(restored.npcs[1].location,'Market');assert.equal(restored.npcs[1].stats.level,5);assert.equal(library[0].location,'Library');
});
test('Character edits propagate to other chats while scene deltas stay local',()=>{
 const chatA=hydrateScopedNpcs({npcs:[]},library,owner);chatA.npcs[0].location='Town';
 const storedA=packScopedNpcs(chatA,library,owner),edited=[{...library[0],personality:'Wise',stats:{hp:100,level:6}}];
 const a=hydrateScopedNpcs(storedA,edited,owner),b=hydrateScopedNpcs({npcs:[]},edited,owner);
 assert.equal(a.npcs[0].location,'Town');assert.equal(b.npcs[0].location,'Library');assert.equal(a.npcs[0].personality,'Wise');assert.equal(b.npcs[0].personality,'Wise');assert.equal(a.npcs[0].stats.level,6);
});
test('another card never consumes the previous card overrides',()=>{
 const a=hydrateScopedNpcs({npcs:[]},library,owner);a.npcs[0].personality='Local override';const stored=packScopedNpcs(a,library,owner);
 const other=hydrateScopedNpcs(stored,[{...library[0],personality:'Other card'}],'card:other.png');assert.equal(other.npcs[0].personality,'Other card');
 assert.equal(hydrateScopedNpcs(stored,[],null).npcs.length,0);
});
test('same-name Chat record takes priority without deleting the Character original',()=>{
 const state=hydrateScopedNpcs({npcs:[{...local,name:'Ａrchivist'}]},library,owner);assert.equal(state.npcs.length,1);assert.equal(state.npcs[0].id,'l1');
 const stored=packScopedNpcs(state,library,owner);assert.deepEqual(stored.npcScopes.hidden,[]);
 stored.npcs=[];assert.equal(hydrateScopedNpcs(stored,library,owner).npcs[0].id,'s1');
});
test('turn snapshots do not roll back later shared-template edits',()=>{
 const snapshot=hydrateScopedNpcs({npcs:[]},library,owner);snapshot.npcs[0].stats.hp=50;
 const edited=[{...library[0],personality:'New shared biography',stats:{hp:100,level:10}}];
 const restored=hydrateScopedNpcs(packScopedNpcs(snapshot,edited,owner),edited,owner);
 assert.equal(restored.npcs[0].personality,'New shared biography');assert.equal(restored.npcs[0].stats.hp,50);assert.equal(restored.npcs[0].stats.level,10);
});
test('AI removal hides a shared NPC in that chat only',()=>{
 const state=hydrateScopedNpcs({npcs:[]},library,owner);state.npcs=[];const stored=packScopedNpcs(state,library,owner);
 assert.deepEqual(stored.npcScopes.hidden,['s1']);assert.equal(hydrateScopedNpcs(stored,library,owner).npcs.length,0);assert.equal(hydrateScopedNpcs({npcs:[]},library,owner).npcs.length,1);
});
test('a shared NPC created after a turn checkpoint is not hidden by rollback',()=>{
 const snapshot=hydrateScopedNpcs({npcs:[]},[],owner);
 const stored=packScopedNpcs(snapshot,library,owner);assert.deepEqual(stored.npcScopes.hidden,[]);
 assert.equal(hydrateScopedNpcs(stored,library,owner).npcs[0].id,'s1');
});
test('continuity removes Chat NPCs, linked contacts and social references without changing the source',()=>{
 const source={npcs:[local,...library],contacts:[{npcId:'l1'},{npcId:'s1'}],social:{party:{memberIds:['l1','s1']},guilds:[{memberIds:['l1','s1']}],household:{members:[{npcId:'l1'},{npcId:'s1'}]}},npcScopes:{owner,overrides:{s1:{location:'Old chat'}}}};
 const next=withoutChatNpcContinuity(source);assert.equal(next.npcs.length,0);assert.deepEqual(next.npcScopes,{});assert.equal(next.contacts.length,1);assert.deepEqual(next.social.party.memberIds,['s1']);assert.equal(next.social.household.members.length,1);assert.equal(source.npcs.length,2);
});
test('portrait keys isolate chat, card and distinct card files',()=>{
 assert.notEqual(scopedPortraitKey(local,'chat-A'),scopedPortraitKey(local,'chat-B'));
 assert.equal(scopedPortraitKey(library[0],'chat-A'),scopedPortraitKey(library[0],'chat-B'));
 assert.notEqual(scopedPortraitKey(library[0],'chat-A'),scopedPortraitKey(library[0],'chat-A','card:other.png'));
});
test('scope metadata refuses prototype keys and scope spoofing',()=>{
 const result=scopeEnvelope(JSON.parse('{"owner":"card:first.png","overrides":{"__proto__":{"polluted":true},"s1":{"id":"evil","npcScope":"chat","personality":"Calm"}}}'));
 assert.deepEqual(result.overrides,{s1:{personality:'Calm'}});assert.equal({}.polluted,undefined);
});

test('deletion unlinks references and snapshots; deleted Character contacts cannot resurrect dossiers',async()=>{
 const {pruneNpcReferences,retainNpcDeletions}=await import('../npc-scopes.js');
 const state={npcs:[local,...library],contacts:[{id:'c',npcId:'s1',name:'Archivist'}],social:{party:{memberIds:['l1','s1'],roles:{s1:'Mage'},leaderId:'s1'},guilds:[{memberIds:['s1']}],household:{members:[{npcId:'s1'}]}}};
 const clean=pruneNpcReferences(state,['s1']);assert.equal(clean.contacts[0].npcId,'');assert.deepEqual(clean.social.party.memberIds,['l1']);assert.deepEqual(clean.social.party.roles,{});assert.equal(state.contacts[0].npcId,'s1');
 const history={entries:[{baseState:structuredClone(state),variants:{one:{state:structuredClone(state)}}}]};retainNpcDeletions(history,['s1']);assert.equal(history.entries[0].baseState.npcs.length,1);assert.equal(history.entries[0].variants.one.state.contacts[0].npcId,'');
 const packed=packScopedNpcs(hydrateScopedNpcs(state,library,owner),library,owner);const restored=hydrateScopedNpcs(packed,[],owner);assert.equal(restored.contacts[0].npcId,'');assert.deepEqual(restored.social.party.memberIds,['l1']);
});
