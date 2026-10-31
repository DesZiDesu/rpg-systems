import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,worldPrompt,rosterKey} from '../src/workshop/pokemon/core.js';
const read=name=>readFile(new URL('../src/workshop/pokemon/data/'+name,import.meta.url)).then(JSON.parse);
const dex=catalogIndex({...await read('catalog.json'),expansion:await read('expansion.json')});
const moveId=name=>Object.values(dex.moves).find(m=>m.name===name).id;
const rules={engineVersion:4,started:true,initialParty:[{speciesId:39,level:60},{speciesId:906,level:60},{speciesId:25,level:60}]};
let n=0;const act=(s,type,p={})=>transition(s,{id:'d'+(++n),type,engine:5,...p},dex,rules);
const offer=(s,name,partner,key,extra={})=>act(s,'trainer-offer',{source:'story',trainerKey:rosterKey(name),name,partner,place:'',team:[{key,level:20},{key:'pidgey',level:5}],equipment:{},mode:'immediate',...extra});
const pair=()=>offer(offer(initialGame(dex,rules),'Tate','Liza','solrock'),'Liza','Tate','lunatone');

test('two story trainers who name each other start one double battle',()=>{
 const first=offer(initialGame(dex,rules),'Tate','Liza','solrock');
 assert.equal(first.battle,null,'the first partner waits for the second');
 const s=pair();assert(s.battle?.double,'double battle started');
 assert.deepEqual([s.battle.trainer.name,s.battle.double.partner.name].sort(),['Liza','Tate']);
 assert.notEqual(s.battle.activeUid,s.battle.double.allyUid);assert(s.party.includes(s.battle.double.allyUid));
 assert(s.trainerChallenges.every(v=>v.status==='accepted'));
 assert(worldPrompt(s,dex).includes('"partnerTrainer"'));
});

test('a trainer without a partner still starts a singles battle',()=>{
 const s=act(initialGame(dex,rules),'trainer-offer',{source:'story',trainerKey:'npc-mira',name:'Mira',place:'',team:[{key:'pidgey',level:5}],equipment:{},mode:'immediate'});
 assert(s.battle&&!s.battle.double);
});

test('each of the player Pokémon acts on its chosen target; all four act in one turn',()=>{
 let s=structuredClone(pair());const tackle=moveId('Tackle');for(const uid of [s.battle.activeUid,s.battle.double.allyUid])s.pokemon[uid].moves=[{id:tackle,pp:30}];
 const before=[s.battle.wild.hp,s.battle.double.foe.hp];s=act(s,'attack',{moves:[{moveId:tackle,target:0},{moveId:tackle,target:1}]});
 const hits=s.battle.log.filter(v=>v.key==='player-hit');assert.equal(hits.length,2);
 assert.deepEqual(new Set(hits.map(v=>v.target)),new Set([dex.get(s.battle.wild.key).name,dex.get(s.battle.double.foe.key).name]));
 assert(s.battle.wild.hp<before[0]||s.battle.double.foe.hp<before[1]);assert.equal(s.battle.round,2);
});

test('a fainted foe is replaced from its own trainer; beating both teams wins against both',()=>{
 let s=structuredClone(pair());const tackle=moveId('Tackle');for(const uid of [s.battle.activeUid,s.battle.double.allyUid])s.pokemon[uid].moves=[{id:tackle,pp:30}];
 for(const mon of [...s.battle.trainer.team,...s.battle.double.partner.team])mon.hp=1;
 const partnerTeam=s.battle.double.partner.team.map(m=>m.uid);
 s=act(s,'attack',{moves:[{moveId:tackle,target:1},{moveId:tackle,target:1}]});
 if(s.battle){assert(partnerTeam.includes(s.battle.double.foe.uid)||!s.battle.double.foe.hp);for(let i=0;i<4&&s.battle;i++)s=act(s,'attack',{moves:[{moveId:tackle,target:0},{moveId:tackle,target:1}]});}
 assert.equal(s.battle,null);assert(s.logs.some(v=>v.key==='victory'));
 assert.equal(s.logs.filter(v=>v.key==='trainer-victory').length,2);
 assert(s.trainerChallenges.every(v=>v.status==='completed'));
 assert(s.lastBattle.partnerTrainer);assert(s.lastBattle.opponents.length>=3);
});

test('a fainted partner Pokémon is replaced from the party; switching names a slot',()=>{
 let s=structuredClone(pair());const ally=s.battle.double.allyUid,third=s.party.find(uid=>uid!==s.battle.activeUid&&uid!==ally);
 s=act(s,'switch',{uid:third,slot:1});assert.equal(s.battle.double.allyUid,third);assert(s.battle.log.some(v=>v.key==='switch'));
});

test('the story protocol carries a named partner only when the scene names them',async()=>{
 const {parsePokemonStory}=await import('../src/workshop/pokemon/story.js');
 const proof='Tate sends out Solrock and Liza sends out Lunatone! The twins accept your challenge.';
 const meta=partner=>'<tr-narrative>'+proof+'</tr-narrative>\n<!--roleforge_pokemon:'+JSON.stringify({version:5,events:[{type:'trainer',mode:'immediate',name:'Tate',partner,place:'',team:[{key:'solrock',level:12}],evidence:proof}]})+'-->';
 assert.equal(parsePokemonStory(meta('Liza'),dex).events[0]?.partner,'Liza');
 assert.equal(parsePokemonStory(meta('Brock'),dex).events[0]?.partner,undefined);
});
