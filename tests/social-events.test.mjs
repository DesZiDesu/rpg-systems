import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedDiaryOps, eligibleNpc, householdOffers} from '../social-events.js';

const people = [
    {id:'kohaku',name:'Kohaku',met:true,diary:[]},
    {id:'lore',name:'Lore Only',met:false,diary:[]},
    {id:'enemy',name:'Enemy',met:true,isHostile:true,diary:[]},
];

test('family invitation requires a named met friendly NPC and a specific role',()=>{
    const ops=[['offer','householdInvitation',{npcId:'kohaku',role:'คู่ชีวิต'}],
        ['offer','householdInvitation',{npcId:'lore',role:'Friend'}],
        ['offer','householdInvitation',{npcId:'enemy',role:'Brother'}]];
    assert.deepEqual(householdOffers(ops,people,'Kohaku asked to join the family',[],[]),
        [{npcId:'kohaku',npcName:'Kohaku',role:'คู่ชีวิต',status:'pending'}]);
    assert.equal(householdOffers(ops,people,'Nobody here',['Kohaku'],[]).length,1);
    assert.equal(householdOffers(ops,people,'Kohaku asked',[],[{npcId:'kohaku'}]).length,0);
    assert.equal(householdOffers(ops,people,'Kohakusan asked',[],[]).length,0);
});

test('diary respects turn cooldown, visibility, duplicates, and the off setting',()=>{
    const operation=['append','npcDiary',{npcId:'kohaku',text:'วันนี้เจอหมีด้วยแหะ น่ารักจัง'}];
    assert.equal(allowedDiaryOps([operation],people,'Kohaku spotted a bear',[],'off',20).length,0);
    assert.equal(allowedDiaryOps([operation],people,'No NPCs mentioned',[],'normal',20).length,0);
    assert.equal(allowedDiaryOps([operation],people,'Kohaku spotted a bear',[],'normal',20).length,1);
    const withEntry=[{...people[0],diary:[{text:'old thought',sourceTurn:18}]},...people.slice(1)];
    assert.equal(allowedDiaryOps([operation],withEntry,'Kohaku spotted a bear',[],'normal',20).length,0);
    assert.equal(allowedDiaryOps([operation],withEntry,'Kohaku spotted a bear',[],'often',20).length,1);
    const duplicate=[{...people[0],diary:[{text:operation[2].text,sourceTurn:1}]},...people.slice(1)];
    assert.equal(allowedDiaryOps([operation],duplicate,'Kohaku spotted a bear',[],'often',20).length,0);
    assert.equal(eligibleNpc(people,{npcId:'lore'},'Lore Only greeted us',[]),null);
});
