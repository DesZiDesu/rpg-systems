import test from 'node:test';
import assert from 'node:assert/strict';
import {branchDelta,applyBranchDelta,branchBundle,applyBranchBundle,branchPoints,captureBranchPoint,branchSnapshot,forkBranchHistory,sameBranchOrigin,BRANCH_ORIGIN_POINT} from '../src/chat-branches.js';
const STATE='tretaresia_rpg_state',origin={owner:'character:card.png',chatId:'Parent',integrity:'parent-id'};
const message=(mes,is_user=false)=>({mes,is_user});
const bundle=(n=0)=>({[STATE]:{player:{hp:100-n,hStats:{oralSexCount:n}},inventory:n?[{id:'key',quantity:n}]:[],npcs:[{id:'mira',met:true,trust:n}],relationships:{links:[{actorId:'mira',targetId:'player',trust:n}],history:[]},quests:[],location:{place:'Hall '+n}},roleforge_story_contracts:{}});
test('structural deltas round-trip scalars, array edits, deletions, empty, false and unknown values',()=>{
 const examples=[
  [{a:1,b:2},{a:0,c:false}],[[1,2,3],[0,1,9,3]],[[{id:'a',n:1},{id:'b',n:2}],[{id:'a',n:4}]],
  [{a:[{v:'x'},{v:2}]},{a:[{v:'x'},{v:null}]}],[{x:[1,2]},null],[{a:{}},{a:[]}],
  [[{id:'1',v:1},{id:'2',v:2}],[{id:'2',v:3},{id:'3',v:4}]],
 ];for(const [a,b]of examples){const before=structuredClone(a);assert.deepEqual(applyBranchDelta(a,branchDelta(a,b)),b);assert.deepEqual(a,before);}
});
test('sliding capped logs store a removal and append rather than duplicating all retained events',()=>{
 const a=Array.from({length:80},(_,i)=>({id:'e'+i,evidence:'a'.repeat(600)})),b=[...a.slice(1),{id:'e80',evidence:'new'}];
 const ops=branchDelta(a,b);assert.deepEqual(applyBranchDelta(a,ops),b);assert(JSON.stringify(ops).length<1000);
});
test('branch operations reject imported prototype paths, missing parents and invalid indices',()=>{
 for(const ops of [[['set',['__proto__','polluted'],true]],[['set',['constructor','prototype'],{}]],[['set',['missing','x'],1]],[['splice',['a'],-1,0,[]]],[['set',['a',-1],2]],[['splice',['a'],0,9,[]]]])assert.throws(()=>applyBranchDelta({a:[]},ops));
 assert.equal({}.polluted,undefined);
});
test('the journal keeps all observed points beyond the three live swipe checkpoints',()=>{
 const chat=[];let history=null;
 for(let i=0;i<40;i++){chat.push(message('reply '+i));history=captureBranchPoint(history,bundle(i),branchPoints(chat).at(-1),origin);}
 for(const i of [0,2,19,39])assert.deepEqual(branchSnapshot(history,branchPoints(chat.slice(0,i+1))).bundle,bundle(i));
 assert.equal(history.entries.length,40);
});
test('a fork drops future progress, future contracts and unselected swipes from the journal itself',()=>{
 const chat=[message('start'),message('old choice')];let history=captureBranchPoint(null,bundle(0),branchPoints(chat).at(-1),origin);
 chat[1].mes='chosen choice';history=captureBranchPoint(history,bundle(2),branchPoints(chat).at(-1),origin);
 chat.push(message('the future'));const future=bundle(99);future.roleforge_story_contracts={secret:{text:'future-only-secret'}};history=captureBranchPoint(history,future,branchPoints(chat).at(-1),origin);
 const selectedChat=chat.slice(0,2),points=branchPoints(selectedChat),selected=branchSnapshot(history,points),fork=forkBranchHistory(history,points,{...origin,chatId:'Branch',integrity:'branch-id'},selected);
 assert.deepEqual(selected.bundle,bundle(2));assert.deepEqual(branchSnapshot(fork,points).bundle,bundle(2));assert(!JSON.stringify(fork).includes('future-only-secret'));assert.equal(fork.entries.length,1);assert.equal(history.entries.length,3);
});
test('selected swipe and user-message prefixes resolve independently without borrowing another route',()=>{
 const chat=[message('start'),message('I help',true),message('A')];let history=captureBranchPoint(null,bundle(1),branchPoints(chat.slice(0,2)).at(-1),origin);
 history=captureBranchPoint(history,bundle(2),branchPoints(chat).at(-1),origin);chat[2].mes='B';history=captureBranchPoint(history,bundle(3),branchPoints(chat).at(-1),origin);
 assert.deepEqual(branchSnapshot(history,branchPoints([chat[0],chat[1],message('A')])).bundle,bundle(2));
 assert.deepEqual(branchSnapshot(history,branchPoints(chat.slice(0,2))).bundle,bundle(1));
 assert.equal(branchSnapshot(history,branchPoints([message('unrelated') ])),null);
});
test('same-point saves coalesce, including removal of a reverted edit; unknown old points stay unavailable',()=>{
 const chat=[message('initial'),message('second')],points=branchPoints(chat);let history=captureBranchPoint(null,bundle(0),points[0],origin);
 history=captureBranchPoint(history,bundle(1),points[1],origin);history=captureBranchPoint(history,bundle(8),points[1],origin);history=captureBranchPoint(history,bundle(1),points[1],origin);
 assert.equal(history.entries.length,2);assert.deepEqual(branchSnapshot(history,points).bundle,bundle(1));
 const late=captureBranchPoint(null,bundle(9),points[1],origin);assert.equal(branchSnapshot(late,points.slice(0,1)),null);
});
test('only authoritative RoleForge progress/configuration enters snapshots; other trackers and archive payloads remain untouched',()=>{
 const metadata={...bundle(3),roleforge_world_archive_payload:{data:'large'},other_tracker:{status:999},tretaresia_rpg_turn_history:{entries:[{future:true}]}};
 const picked=branchBundle(metadata);assert.deepEqual(picked,bundle(3));applyBranchBundle(metadata,bundle(1));assert.deepEqual(metadata.other_tracker,{status:999});assert.equal(metadata.roleforge_world_archive_payload.data,'large');
});
test('integrity survives renaming while owner changes and new native branch identities stay distinct',()=>{
 assert(sameBranchOrigin(origin,{...origin,chatId:'Renamed'}));assert(!sameBranchOrigin(origin,{...origin,integrity:'fork'}));assert(!sameBranchOrigin(origin,{...origin,owner:'another card'}));
});

test('an empty first message has an origin snapshot before character creation or the first user reply',()=>{
 let history=captureBranchPoint(null,bundle(0),BRANCH_ORIGIN_POINT,origin);
 const chat=[message('Registration',true),message('Welcome')],points=branchPoints(chat);
 history=captureBranchPoint(history,bundle(1),points[0],origin);
 history=captureBranchPoint(history,bundle(2),points[1],origin);
 assert.deepEqual(branchSnapshot(history,[],{through:-1}).bundle,bundle(0));
 const fork=forkBranchHistory(history,points.slice(0,1),{...origin,integrity:'fork'},branchSnapshot(history,points.slice(0,1)));
 assert.deepEqual(branchSnapshot(fork,points,{through:-1}).bundle,bundle(0));
 assert.deepEqual(branchSnapshot(fork,points.slice(0,1)).bundle,bundle(1));
});
test('large imported arrays apply without overflowing the argument stack',()=>{
 const values=Array.from({length:150000},(_,i)=>i);
 assert.deepEqual(applyBranchDelta({a:[]},[['splice',['a'],0,0,values]]),{a:values});
});

test('a corrupted journal cannot substitute a scalar or missing state for a historical point',()=>{
 const points=branchPoints([message('Opening')]),history=captureBranchPoint(null,bundle(1),points[0],origin);
 const invalid=structuredClone(history);invalid.base.tretaresia_rpg_state=null;
 assert.throws(()=>branchSnapshot(invalid,points),/state is missing/);
});
