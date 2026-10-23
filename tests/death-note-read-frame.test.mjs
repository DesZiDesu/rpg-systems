import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotebookReads,notebookInputStamp,sameNotebookInputs} from '../src/workshop/death-note/read-frame.js';
import {worldState,WORLD_EVENTS} from '../src/workshop/death-note/world.js';
const fixture=()=>({key:'a',nonce:{},chat:[{mes:'A scene.',swipe_id:0,extra:{[WORLD_EVENTS]:[{type:'eye-ability',actorId:'player',source:'innate',swipe:0,offset:8}]}}],state:{player:{name:'A'},npcs:[],inventory:[],worldClock:{day:1,time:'12:00'}},deathNoteRules:{}});
test('nested rendering reads the host and builds world/ledger once per transaction',()=>{
 let loads=0,builds=0,ledgers=0;const v=fixture(),r=createNotebookReads(()=>{loads++;return v;},(...a)=>{builds++;return worldState(...a);},chat=>{ledgers++;return chat.length;});
 r.run(()=>{assert.equal(r.world().eyes,true);for(let i=0;i<100;i++)r.run(()=>{assert.equal(r.world().eyes,true);r.state();r.chat();r.records();});});
 assert.deepEqual([loads,builds,ledgers],[1,1,1]);r.run(()=>r.world());assert.deepEqual([loads,builds],[2,2]);
});
test('in-place edits, swipes, event replacements and Branch context replacement are fresh on the next read',()=>{
 let v=fixture();const r=createNotebookReads(()=>v,worldState,chat=>chat.length);assert.equal(r.run(()=>r.world().eyes),true);
 v.chat[0].swipe_id=1;assert.equal(r.run(()=>r.world().eyes),false);v.chat[0].swipe_id=0;
 v.chat[0].mes='A';assert.equal(r.run(()=>r.world().eyes),false);v.chat[0].mes='A scene.';
 v.chat[0].extra[WORLD_EVENTS][0].source='none';assert.equal(r.run(()=>r.world().eyes),false);
 v={...fixture(),key:'branch',nonce:{},chat:[]};assert.equal(r.run(()=>r.world().eyes),false);assert.equal(r.run(()=>r.context().key),'branch');
});
test('exceptions and asynchronous continuations cannot retain a stale frame',async()=>{
 let v=fixture(),calls=0;const r=createNotebookReads(()=>{calls++;return v;},worldState,chat=>chat.length);
 assert.throws(()=>r.run(()=>{r.world();throw Error('fail');}));v={...v,key:'new'};assert.equal(r.run(()=>r.context().key),'new');
 let resume;const gate=new Promise(resolve=>resume=resolve);const task=r.run(async()=>{r.context();await gate;return r.context().key;});v={...v,key:'after await'};resume();assert.equal(await task,'after await');assert.equal(calls,4);
});

test('initialization signatures detect in-place notebook edits without duplicating transcript text',()=>{
 const m={mes:'Long story '.repeat(1000),swipe_id:0,extra:{world:[{value:1}]}},facts={inventory:['book']},snapshot=notebookInputStamp(facts,[m],['world']);
 assert.equal(snapshot.turns[0][0],m.mes);assert(!snapshot.facts.includes('Long story'));
 assert(sameNotebookInputs(snapshot,notebookInputStamp(facts,[m],['world'])));
 m.extra.world[0].value=2;assert(!sameNotebookInputs(snapshot,notebookInputStamp(facts,[m],['world'])));m.extra.world[0].value=1;
 m.swipe_id=1;assert(!sameNotebookInputs(snapshot,notebookInputStamp(facts,[m],['world'])));m.swipe_id=0;
 m.mes+=' Edited';assert(!sameNotebookInputs(snapshot,notebookInputStamp(facts,[m],['world'])));m.mes=snapshot.turns[0][0];
 assert(!sameNotebookInputs(snapshot,notebookInputStamp({inventory:[]},[m],['world'])));assert(!sameNotebookInputs(snapshot,notebookInputStamp(facts,[],['world'])));
});
