import test from 'node:test';
import assert from 'node:assert/strict';
import {headerBadge,npcHeaderVitals} from '../src/chat-folio.js';

test('occupation badge uses overall NPC rank and works outside magic settings',()=>{
 assert.deepEqual(headerBadge({occupation:'Detective',stats:{rank:'Senior'},abilities:[{name:'Deduction',level:'Novice'}]}),{label:'Detective',level:'Senior'});
 assert.deepEqual(headerBadge({occupation:'Sniper',stats:{rank:'Sergeant'}}),{label:'Sniper',level:'Sergeant'});
});
test('Aincrad reads finite NPC HP and level, distinguishes zero from missing and never invents a maximum',()=>{
 assert.deepEqual(npcHeaderVitals({stats:{hp:0,level:' 7 ',mp:30,hpMax:500}}),[{key:'hp',label:'HP',value:0},{key:'level',label:'Lv',value:7}]);
 assert.deepEqual(npcHeaderVitals({stats:{hp:17.5,level:2}}),[{key:'hp',label:'HP',value:17.5},{key:'level',label:'Lv',value:2}]);
 for(const value of [undefined,null,'','  ',true,{},[],NaN,Infinity,-1,'unknown'])assert.deepEqual(npcHeaderVitals({stats:{hp:value,level:value}}),[]);
 assert.deepEqual(npcHeaderVitals(),[]);
 assert.deepEqual(npcHeaderVitals({stats:{hp:100,level:7}},{npcVitals:false}),[]);
});
test('a selected ability uses its own mastery, never the overall rank',()=>{
 const npc={occupation:'Water Mage',stats:{rank:'S'},abilities:[{name:'Water Arrow',category:'Water Magic',level:'Intermediate'},{name:'Swimming',category:'Physical',level:'Basic'}]};
 assert.deepEqual(headerBadge(npc,{badgeMode:'ability',badgeAbility:'  WATER ARROW  '}),{label:'Water Arrow',level:'Intermediate'});
 assert.deepEqual(headerBadge(npc,{badgeMode:'ability',badgeAbility:'Water Magic'}),{label:'Water Arrow',level:'Intermediate'});
 assert.equal(headerBadge(npc,{badgeMode:'ability',badgeAbility:'Fireball'}),null);
 assert.equal(headerBadge(npc,{badgeMode:'ability',badgeAbility:''}),null);
});
test('ambiguous categories do not pick an arbitrary skill, while exact names still work',()=>{
 const npc={abilities:[{name:'River Flow',category:'Water Magic',level:'Basic'},{name:'Water Magic',category:'Water Magic',level:'Intermediate'}]};
 assert.deepEqual(headerBadge(npc,{badgeMode:'ability',badgeAbility:'Water Magic'}),{label:'Water Magic',level:'Intermediate'});
 npc.abilities[1].name='Tidal Wave';assert.equal(headerBadge(npc,{badgeMode:'ability',badgeAbility:'Water Magic'}),null);
 npc.abilities.push({...npc.abilities[0]});assert.equal(headerBadge(npc,{badgeMode:'ability',badgeAbility:'River Flow'}),null);
});
test('unknown facts and placeholder ranks are hidden without inventing replacements',()=>{
 assert.equal(headerBadge({}),null);assert.equal(headerBadge({occupation:'Unknown'}),null);
 assert.deepEqual(headerBadge({occupation:'Merchant',stats:{rank:'Unranked'}}),{label:'Merchant',level:''});
 assert.deepEqual(headerBadge({occupation:'Merchant',stats:{rank:'—'}}),{label:'Merchant',level:''});
 assert.equal(headerBadge({occupation:'Merchant'},{badgeMode:'off'}),null);
 assert.equal(headerBadge({occupation:{name:'bad'}}),null);
 assert.deepEqual(headerBadge({stats:{rank:'S'},abilities:[{name:'Water Magic',level:'Unknown'}]},{badgeMode:'ability',badgeAbility:'Water Magic'}),{label:'Water Magic',level:''});
});
