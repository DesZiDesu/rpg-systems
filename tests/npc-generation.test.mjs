import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELDS, STATS, RELATIONS, generatedDraft, generatedNpcDraft } from '../npc-core.js';
const complete=()=>({...Object.fromEntries(Object.keys(FIELDS).map(k=>[k,`${k} detail`])),aliases:['Lysa'],abilities:[{name:'Heal',category:'Magic',level:'2',description:'Restores health',proficiency:75}],isHostile:false,identityColor:'#abcdef',roleIcon:'healer',portraitSize:96,...Object.fromEntries(RELATIONS.map(k=>[k,25])),stats:{rank:'Basic',...Object.fromEntries(STATS.map(k=>[k,10]))}});
test('description draft covers the full form and preserves requested fictional details',()=>{
 const raw=complete();raw.name='ลิซ่า';raw.age='120';raw.background='Forest clinic';
 const p=generatedDraft(raw);assert.equal(p.name,raw.name);assert.equal(p.age,'120');assert.equal(p.background,raw.background);
 for(const key of Object.keys(FIELDS))assert.equal(p[key],raw[key]);
 assert.deepEqual(p.stats,raw.stats);assert.deepEqual(p.abilities,raw.abilities);assert.equal(p.isHostile,false);assert.equal(p.portraitSize,96);
});
test('incomplete or malformed AI output fails before replacing the draft',()=>{
 for(const key of [...Object.keys(FIELDS),...RELATIONS,'stats','aliases','abilities','isHostile','identityColor','roleIcon','portraitSize']){
  const raw=complete();delete raw[key];assert.throws(()=>generatedDraft(raw),/incomplete/);
 }
 assert.throws(()=>generatedDraft([]),/NPC object/);
 const raw=complete();raw.abilities=[{name:'Heal'}];assert.throws(()=>generatedDraft(raw),/abilities/);
});
test('AI cannot overwrite NPC identity, scope, portrait storage, or inject extra fields',()=>{
 const raw={...complete(),id:'stolen',npcScope:'character',npcOwner:'another-card',portraitPath:'/user/images/evil.png',hasPortrait:true,portraitView:{zoom:5},unexpected:'bad'};
 const p=generatedDraft(raw);for(const key of ['id','npcScope','npcOwner','portraitPath','hasPortrait','portraitView','unexpected'])assert.equal(p[key],undefined);
});
test('generated numeric values respect field bounds',()=>{
 const raw=complete();raw.trust=1000;raw.fear=-1;raw.portraitSize=1000;raw.stats.level=999999;raw.abilities[0].proficiency=200;
 const p=generatedDraft(raw);assert.equal(p.trust,100);assert.equal(p.fear,0);assert.equal(p.portraitSize,144);assert.equal(p.stats.level,9999);assert.equal(p.abilities[0].proficiency,100);
});
test('a useful partial JSON reply creates a reviewable NPC without losing existing facts or accepting storage identity',()=>{
 const result=generatedNpcDraft({name:'Melissia',appearance:'Short silver hair and a green cloak',background:'An innkeeper',id:'unsafe',portraitPath:'/user/images/evil.png',stats:{level:3}},
  {name:'Melissia',relationship:'Old friend',stats:{hp:85}});
 assert.equal(result.appearance,'Short silver hair and a green cloak');assert.equal(result.relationship,'Old friend');
 assert.equal(result.stats.level,3);assert.equal(result.stats.hp,85);assert.equal(result.stats.rank,'Unranked');
 assert.equal(result.portraitPath,undefined);assert.equal(result.id,undefined);
 assert.throws(()=>generatedNpcDraft({name:'Name only'}),/no usable character details/);
});
