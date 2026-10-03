import test from 'node:test';
import assert from 'node:assert/strict';
import {growthInventoryNotifications as events} from '../src/growth-notifications.js';
const state = () => ({skills:[],inventory:[],proficiencies:{magic:{aura:99},sword:{swordplay:5},customMagic:[],customSword:[],techniques:[]}});
test('skill updates do not masquerade as new learning; every discipline increase reports actual clamped delta',()=>{
    const before = state(); before.skills=[{id:'fish',name:'Fishing',rank:'Beginner'}];
    const after = structuredClone(before); after.skills[0].description='Updated description';
    assert.equal(events(before,after,[['upsert','skills',after.skills[0]]]).length,0);
    after.skills[0].rank='Adept'; after.skills.push({id:'first-aid',name:'First Aid',rank:'Beginner'});
    after.proficiencies.magic.aura=100; after.proficiencies.sword.swordplay=7;
    const result = events(before,after,[['inc','proficiencies.magic.aura',5,{reason:'Control practice',label:'Aura'}]]);
    assert.equal(result.filter(event=>event.kind==='learning').length,1);
    assert.equal(result.filter(event=>event.kind==='training').length,3);
    assert.equal(result.find(event=>event.title==='Aura').value,'+1%');
    assert.equal(events(after,after,[]).length,0);
});
test('purchases, gifts, consumption, sale and deletion show saved inventory deltas with causes',()=>{
    const before = state();before.inventory=[{id:'apple',name:'Apple',quantity:3},{id:'ring',name:'Ring',quantity:1}];
    const after = structuredClone(before);after.inventory=[{id:'apple',name:'Apple',quantity:2},{id:'potion',name:'Potion',quantity:2}];
    const result = events(before,after,[['inc','inventory',{id:'potion',quantity:2},{category:'purchase',reason:'Bought two potions'}],['delete','inventory',{id:'ring'},{category:'sale',reason:'Sold the ring'}]]);
    assert.equal(result.length,3);assert.equal(result.find(event=>event.title==='Potion').kind,'purchase');
    assert.equal(result.find(event=>event.title==='Apple').value,'-1');assert.equal(result.find(event=>event.title==='Ring').value,'-1');
    assert.equal(result.find(event=>event.title==='Ring').detail,'Sold the ring');
    assert.equal(events(before,after,[], 'th').find(event=>event.title==='Potion').eyebrow,'ได้รับไอเทม');
});
test('item lifecycle metadata is retained for the Main Chat ledger',()=>{
    const before=state();before.inventory=[{id:'rope',name:'Rope',quantity:2},{id:'torch',name:'Torch',quantity:3}];
    const after=structuredClone(before);after.inventory[0].quantity=1;after.inventory[1].quantity=2;
    const result=events(before,after,[
        ['inc','inventory',{id:'rope',quantity:-1},{category:'use',reason:'Used rope to secure the bridge'}],
        ['inc','inventory',{id:'torch',quantity:-1},{category:'drop',reason:'Dropped the spent torch'}],
    ]);
    assert.deepEqual(result.map(entry=>entry.action),['used','dropped']);
    assert.equal(result[0].eyebrow,'ITEM USED');
    assert.equal(result[1].eyebrow,'ITEM DROPPED');
    assert.equal(result[0].balance,1);
});
test('multiple custom skills report increases and ignore reductions or unchanged metadata',()=>{
    const before = state();before.proficiencies.customMagic=[{id:'fire',name:'Fire',proficiency:10}];before.proficiencies.techniques=[{id:'dash',name:'Dash',proficiency:20}];
    const after = structuredClone(before);after.proficiencies.customMagic[0].proficiency=12;after.proficiencies.techniques[0].proficiency=19;
    const result=events(before,after,[]);assert.equal(result.length,1);assert.equal(result[0].kind,'training');assert.equal(result[0].value,'+2%');
});
test('custom power rank progress is named and resource replenishment is not treated as training',()=>{
 const before={customPowers:{control:1,mana:2}},after={customPowers:{control:2,mana:10}};
 const definitions=[{id:'control',name:'Mana Control',type:'rank',ranks:['Dormant','Initiate','Adept'],initial:0},{id:'mana',name:'Mana',type:'resource',initial:0}];
 const result=events(before,after,[],'en',definitions);assert.equal(result.length,1);assert.equal(result[0].title,'Mana Control');assert.equal(result[0].detail,'Initiate → Adept');
});
test('confirmed aerobic fallback increases notify training even without an AI patch',()=>{
 const before={player:{fitness:{lungCapacity:100,aerobicSessions:0}}},after={player:{fitness:{lungCapacity:101,aerobicSessions:1}}};
 const result=events(before,after,[]);assert.equal(result.length,2);assert(result.every(entry=>entry.kind==='training'));
 assert.equal(result[0].title,'Lung capacity');assert.equal(result[1].title,'Aerobic training');
});
