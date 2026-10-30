import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition} from '../src/workshop/pokemon/core.js';
import {battleSteps,newLogEntries,stepDuration} from '../src/workshop/pokemon/battle-vfx.js';
import {motionSequence} from '../src/workshop/pokemon/motion.js';
const read=name=>readFile(new URL('../src/workshop/pokemon/data/'+name,import.meta.url)).then(JSON.parse);
const dex=catalogIndex({...await read('catalog.json'),expansion:await read('expansion.json')});
const moveId=name=>Object.values(dex.moves).find(m=>m.name===name).id;
const rules={engineVersion:4,started:true,initialParty:[{speciesId:39,level:60},{speciesId:906,level:60}]};
let n=0;const act=(s,type,p={})=>transition(s,{id:'v'+(++n),type,engine:4,...p},dex,rules);
const fight=(level=50)=>act(initialGame(dex,rules),'encounter',{speciesId:19,level});
const use=(s,name)=>{s=structuredClone(s);s.pokemon[s.battle.activeUid].moves=[{id:moveId(name),pp:10}];return [s,act(s,'attack',{moveId:moveId(name)})];};

test('a new battle throws the partner out of its ball; a trainer throws first',()=>{
 const wild=fight();assert.deepEqual(battleSteps(initialGame(dex,rules),wild,{type:'encounter'},dex).map(s=>[s.kind,s.side,s.ball]),[['send-out','ally','poke-ball']]);
 const trainer=act(initialGame(dex,rules),'trainer-offer',{source:'story',trainerKey:'npc-mira',name:'Mira',place:'',team:[{key:'pidgey',level:5},{key:'rattata',level:5}],equipment:{},mode:'immediate'});
 assert.deepEqual(battleSteps(initialGame(dex,rules),trainer,{type:'trainer-offer'},dex).map(s=>[s.kind,s.side]),[['send-out','foe'],['send-out','ally']]);
});

test('moves carry their type, category and the effects they caused',()=>{
 let [s,after]=use(fight(),'Thunder Wave');let hit=battleSteps(s,after,{type:'attack'},dex).find(v=>v.side==='ally');
 assert.deepEqual([hit.kind,hit.type,hit.category,hit.status,hit.target],['hit','electric','status','paralysis','foe']);
 [s,after]=use(fight(),'Charm');hit=battleSteps(s,after,{type:'attack'},dex).find(v=>v.side==='ally');
 assert.equal(hit.hearts,true);assert.deepEqual(hit.stages,[{stat:2,delta:-2,side:'foe'}]);
 [s,after]=use(fight(),'Swords Dance');hit=battleSteps(s,after,{type:'attack'},dex).find(v=>v.side==='ally');
 assert.equal(hit.target,'ally');assert.deepEqual(hit.stages,[{stat:2,delta:2,side:'ally'}]);
 [s,after]=use(fight(),'Ice Beam');hit=battleSteps(s,after,{type:'attack'},dex).find(v=>v.side==='ally');
 assert.deepEqual([hit.type,hit.category,hit.damage>0],['ice','special',true]);
 [s,after]=use(fight(),'Toxic');const steps=battleSteps(s,after,{type:'attack'},dex);
 assert(steps.some(v=>v.kind==='status'&&v.status==='poison'&&v.side==='foe'),'poison damage at the end of the turn');
});

test('a fainted partner is recalled before the next one is thrown, on the right states',()=>{
 let s=fight(100);s=structuredClone(s);const first=s.battle.activeUid;s.pokemon[first].hp=1;
 let after=s;for(let i=0;i<10&&after.battle?.activeUid===first;i++){s=after;after=act(s,'attack',{moveId:s.pokemon[first].moves[0].id});}
 const steps=battleSteps(s,after,{type:'attack'},dex),faint=steps.findIndex(v=>v.kind==='faint'),out=steps.findIndex(v=>v.kind==='send-out');
 assert(faint>=0&&out>faint,'faint then send-out');assert.equal(steps[faint].battle.activeUid,first);assert.notEqual(steps[out].battle.activeUid,first);assert.equal(steps[faint].recall,true);
});

test('a trainer recalls each fainted Pokémon and throws the next; a switch recalls then throws',()=>{
 let s=act(initialGame(dex,rules),'trainer-offer',{source:'story',trainerKey:'npc-kai',name:'Kai',place:'',team:[{key:'rattata',level:2},{key:'pidgey',level:2}],equipment:{},mode:'immediate'});
 s=structuredClone(s);s.pokemon[s.battle.activeUid].moves=[{id:moveId('Ice Beam'),pp:10}];
 const after=act(s,'attack',{moveId:moveId('Ice Beam')});
 assert.deepEqual(battleSteps(s,after,{type:'attack'},dex).filter(v=>v.kind!=='hit').map(v=>[v.kind,v.side]),[['faint','foe'],['send-out','foe']]);
 const swapped=act(after,'switch',{uid:'initial-1'});
 const kinds=motionSequence(after,swapped,{id:'x',type:'switch'},dex).map(v=>v.kind);
 assert.deepEqual(kinds.slice(0,2),['recall','send-out']);
});

test('log matching survives the capped log and every step has a duration',()=>{
 const old={logs:Array.from({length:40},(_,i)=>({key:'k',i}))},now={logs:[...old.logs.slice(2),{key:'new',i:40},{key:'new',i:41}]};
 assert.deepEqual(newLogEntries(old,now).map(v=>v.i),[40,41]);
 for(const step of[{kind:'send-out'},{kind:'recall'},{kind:'faint'},{kind:'hit'},{kind:'hit',status:'sleep',stages:[{}]},{kind:'status'}])assert(stepDuration(step)>=700);
});

test('a Pokémon that cannot move shows its own condition, and only real protection shows a shield',()=>{
 const before={battle:{activeUid:'a',wild:{key:'bidoof'}},pokemon:{a:{key:'pikachu'}},logs:[]};
 const after=log=>({...before,logs:log});
 assert.deepEqual(battleSteps(before,after([{key:'enemy-hit',name:'Bidoof',target:'Pikachu',damage:0,move:'Tackle',blocked:'paralysis'}]),{type:'attack'},dex).map(s=>[s.kind,s.side,s.status]),[['status','foe','paralysis']]);
 assert.deepEqual(battleSteps(before,after([{key:'player-hit',name:'Pikachu',target:'Bidoof',damage:0,move:'Tackle',blocked:'sleep'}]),{type:'attack'},dex).map(s=>[s.kind,s.side,s.status]),[['status','ally','sleep']]);
 const guarded=battleSteps(before,after([{key:'enemy-hit',name:'Bidoof',target:'Pikachu',damage:0,move:'Protect',blocked:'guard'}]),{type:'attack'},dex)[0];
 assert.deepEqual([guarded.kind,guarded.blocked],['hit','guard']);
});
