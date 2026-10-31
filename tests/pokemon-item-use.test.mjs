import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition} from '../src/workshop/pokemon/core.js';
import {itemEffect} from '../src/workshop/pokemon/items.js';
import {maxPP} from '../src/workshop/pokemon/item-use.js';

const raw=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url)));
raw.expansion=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/expansion.json',import.meta.url)));
const dex=catalogIndex(raw);
let n=0;const act=(s,type,p={})=>transition(s,{id:'item-'+(++n),type,engine:4,...p},dex);
const stock={'rare-candy':3,'exp-candy-m':1,protein:2,'health-wing':1,'pomeg-berry':1,'pp-up':2,'pp-max':1,'adamant-mint':1,'ability-capsule':1,'ability-patch':1,'gold-bottle-cap':1,'x-attack':2,'dire-hit':1,'poke-doll':1,repel:1,'escape-rope':1,'helix-fossil':1,'fire-tera-shard':50,'sacred-ash':1,lemonade:1};
const start=(party=[{speciesId:25,level:10}])=>initialGame(dex,{engineVersion:4,started:true,initialParty:party,initialInventory:stock});
const lead=s=>s.pokemon[s.party[0]];

test('the Bag knows every new use',()=>{
 for(const [id,kind] of [['rare-candy','growth'],['protein','growth'],['x-attack','battle-item'],['repel','field'],['helix-fossil','fossil'],['lemonade','medicine'],['nugget','reference']])assert.equal(itemEffect(id).kind,kind,id);
});

test('Rare Candy raises one level; EXP Candy adds experience',()=>{
 let s=start();const uid=s.party[0];
 s=act(s,'use-item',{item:'rare-candy',uid});assert.equal(lead(s).level,11);assert.equal(s.inventory['rare-candy'],2);
 s=act(s,'use-item',{item:'exp-candy-m',uid});assert(lead(s).level>11);
 assert.equal(s.logs.at(-1).key,'used-item');
});

test('vitamins, wings and EV berries move EVs within the limits',()=>{
 let s=start();const uid=s.party[0];
 s=act(s,'use-item',{item:'protein',uid});assert.equal(lead(s).traits.evs[1],10);
 s=act(s,'use-item',{item:'health-wing',uid});assert.equal(lead(s).traits.evs[0],1);
 s=act(s,'use-item',{item:'pomeg-berry',uid});assert.equal(lead(s).traits.evs[0],0);
});

test('PP Up and PP Max raise a move\'s maximum PP',()=>{
 let s=start();const uid=s.party[0],move=lead(s).moves[0],base=dex.moves[move.id].pp;
 s=act(s,'use-item',{item:'pp-up',uid,moveId:move.id});
 assert.equal(maxPP(dex,lead(s).moves[0]),Math.floor(base*1.2));
 s=act(s,'use-item',{item:'pp-max',uid,moveId:move.id});
 assert.equal(maxPP(dex,lead(s).moves[0]),Math.floor(base*1.6));
 assert.throws(()=>act(s,'use-item',{item:'pp-up',uid,moveId:move.id}),/no effect/);
});

test('mints change stat nature; Ability Patch switches to the hidden ability; Gold Bottle Cap needs Lv. 50',()=>{
 let s=start();const uid=s.party[0];
 s=act(s,'use-item',{item:'adamant-mint',uid});assert.equal(lead(s).traits.mintNature,'Adamant');
 s=act(s,'use-item',{item:'ability-patch',uid});assert.equal(lead(s).ability,'lightning-rod');
 assert.throws(()=>act(s,'use-item',{item:'gold-bottle-cap',uid}),/Lv\. 50/);
 let high=start([{speciesId:25,level:60}]);high=act(high,'use-item',{item:'gold-bottle-cap',uid:high.party[0]});
 assert.deepEqual(lead(high).traits.ivs,[31,31,31,31,31,31]);
 high=act(high,'use-item',{item:'fire-tera-shard',uid:high.party[0]});
 assert.equal(lead(high).teraType,'fire');assert.equal(high.inventory['fire-tera-shard'],0);
});

test('X items and Dire Hit work in battle and cost the turn; Poké Doll escapes wild battles',()=>{
 let s=act(start(),'encounter',{speciesId:10,level:3,source:'story',context:{place:'Route 1'}});
 const uid=s.battle.activeUid;
 s=act(s,'use-item',{item:'x-attack',uid});assert.equal(s.pokemon[uid].stages[1],2);assert.equal(s.battle.round,2);
 s=act(s,'use-item',{item:'dire-hit',uid});assert.equal(s.pokemon[uid].focusEnergy,2);
 assert.throws(()=>act(start(),'use-item',{item:'x-attack',uid}),/during a battle/);
 s=act(s,'use-item',{item:'poke-doll'});assert.equal(s.battle,null);assert.equal(s.lastBattle.result,'run');
});

test('Repel keeps weaker wild Pokémon away for a few replies',()=>{
 let s=act(start(),'use-item',{item:'repel'});
 assert.equal(s.repel,3);
 assert.throws(()=>act(s,'encounter',{speciesId:10,level:3,source:'story',context:{place:'Route 1'}}),/Repel/);assert(act(s,'encounter',{speciesId:10,level:3,source:'user',context:{place:'Route 1'}}).battle,'the player can still choose to fight');
 const strong=act(s,'encounter',{speciesId:10,level:30,source:'story',context:{place:'Route 1'}});
 assert(strong.battle);
});

test('fossils revive only at a lab or museum; Sacred Ash revives the whole party; drinks heal',()=>{
 let s=start();
 assert.throws(()=>act(s,'use-item',{item:'helix-fossil',context:{place:'Route 1'}}),/lab or museum/);
 s=act(s,'use-item',{item:'helix-fossil',context:{place:'Pewter Museum of Science'}});
 const fossil=Object.values(s.pokemon).find(m=>m.key==='omanyte');assert.equal(fossil.level,20);assert(s.caught.includes(138));
 s.pokemon[s.party[0]].hp=0;s=act(s,'use-item',{item:'sacred-ash',uid:s.party[0]});assert.equal(lead(s).hp,lead(s).stats[0]);
 s.pokemon[s.party[0]].hp=1;s=act(s,'use-item',{item:'lemonade',uid:s.party[0]});assert(lead(s).hp>1);
});
