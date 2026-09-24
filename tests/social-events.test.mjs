import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedDiaryOps, eligibleNpc, householdOffers, groupOffers} from '../social-events.js';

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

test('group invitations require an eligible inviter, named group, offered role and only confirmed members',()=>{
    const party = ['offer','partyInvitation',{npcId:'kohaku',name:'Ashtrail',role:'Scout',memberCount:4,
        members:[{name:'Rhea',role:'Leader'}],leaderName:'Rhea'}];
    const guild = ['offer','guildInvitation',{npcId:'kohaku',name:'Dawnspire',role:'Initiate',
        members:[{name:'Sera'}],memberCount:128}];
    const offers = groupOffers([party,guild],people,'Kohaku and Rhea offered an invitation to a party with 4 people and a guild with 128 people',[],{party:null,guilds:[]});
    assert.equal(offers.length,2);
    assert.deepEqual(offers[0].members.map(person=>person.name),['Kohaku','Rhea']);
    assert.equal(offers[0].memberCount,4);
    assert.equal(offers[1].memberCount,128);
    assert.equal(groupOffers([guild],people,'Kohaku invited you; no total was stated',[],{} )[0].memberCount,null);
    assert.equal(groupOffers([['offer','guildInvitation',{npcId:'kohaku',name:'Guild',role:'Member',members:[{name:'Sera'}]}]],people,'Kohaku invited you',[],{} )[0].memberCount,null);
    assert.equal(groupOffers([party],people,'No one asked',[],{}).length,0);
    assert.equal(groupOffers([party],people,'Kohaku spoke',[],{party:{name:'Elsewhere'}}).length,0);
    assert.equal(groupOffers([['offer','partyInvitation',{npcId:'kohaku',name:'Ashtrail'}]],people,'Kohaku spoke',[],{}).length,0);
    assert.equal(groupOffers([['offer','guildInvitation',{npcId:'enemy',name:'Guild',role:'Member'}]],people,'Enemy spoke',[],{}).length,0);
});

test('explicit diary request bypasses cadence but still respects off and duplicate entries', () => {
    const npc = {id:'kohaku',name:'Kohaku',met:true,diary:[{text:'Earlier thought',sourceTurn:19}]};
    const op = ['append','npcDiary',{npcId:'kohaku',text:'I need to speak honestly today.'}];
    assert.equal(allowedDiaryOps([op],[npc],'Kohaku writes in her journal',[],'normal',20).length,0);
    assert.equal(allowedDiaryOps([op],[npc],'Kohaku writes in her journal',[],'normal',20,true).length,1);
    assert.equal(allowedDiaryOps([op],[npc],'Kohaku writes in her journal',[],'off',20,true).length,0);
});
