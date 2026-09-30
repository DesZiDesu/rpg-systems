import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedDiaryOps, eligibleNpc, householdOffers, groupOffers, confirmedGroupMembership, establishedGroupOperations, groupMembershipEnded} from '../src/social-events.js';

test('only an exact current membership statement permits direct group registration',()=>{
 const value={membershipStatus:'established',membershipEvidence:'You are already a member of the Ashtrail party.'};
 assert.equal(confirmedGroupMembership(value,'You are already a member of the Ashtrail party.'),true);
 assert.equal(confirmedGroupMembership({...value,membershipEvidence:'Rhea invites you to the Ashtrail party.'},'Rhea invites you to the Ashtrail party.'),false);
 assert.equal(confirmedGroupMembership({...value,membershipEvidence:'You might join the Ashtrail party.'},'You might join the Ashtrail party.'),false);
 assert.equal(confirmedGroupMembership({...value,membershipEvidence:'You were already a member of the Ashtrail party.'},'You were already a member of the Ashtrail party.'),false);
 assert.equal(confirmedGroupMembership({...value,membershipEvidence:'You joined the Ashtrail party but later left.'},'You joined the Ashtrail party but later left.'),false);
 assert.equal(confirmedGroupMembership(value,'Rhea invites you to the Ashtrail party.'),false);
 assert.equal(confirmedGroupMembership({...value,membershipEvidence:'คุณอยู่ในกิลด์รุ่งอรุณอยู่แล้ว'},'คุณอยู่ในกิลด์รุ่งอรุณอยู่แล้ว'),true);
});

test('existing Thai and English memberships recover the stated party or guild without model hints',()=>{
 const cases=[
  ['คุณมีปาร์ตี้ “แสงจันทร์” อยู่แล้ว','party','แสงจันทร์'],
  ['คุณมีปาร์ตี้แสงจันทร์อยู่แล้ว','party','แสงจันทร์'],
  ['คุณอยู่ในกิลด์รุ่งอรุณอยู่แล้ว','guilds','รุ่งอรุณ'],
  ['You already have a party called Moonlight.','party','Moonlight'],
  ['You are already a member of the Moonlight party.','party','Moonlight'],
  ['You have joined guild “Dawnspire”.','guilds','Dawnspire'],
 ];
 for(const [story,path,name] of cases){
  const operations=establishedGroupOperations([],[],story,'','Player');
  assert.equal(operations.length,1,story);
  const [verb,actualPath,value]=operations[0];
  assert.equal(verb,'upsert');assert.equal(actualPath,path);assert.equal(value.name,name);
  assert.equal(value.membershipStatus,'established');assert.equal(value.membershipEvidence,story);
  assert.equal(value.playerRole,'Member');assert.notEqual(value.leaderId,'player');
 }
 const own=establishedGroupOperations([],[],'','I am already a member of guild “Dawnspire”.','Player');
 assert.equal(own.length,1);assert.equal(own[0][2].name,'Dawnspire');
});

test('recovered memberships preserve matching confirmed details without making the player leader',()=>{
 const hints=[['upsert','party',{name:'Moonlight',playerRole:'Scout',leaderId:'ashe',leaderName:'Ashe',memberCount:4,
  knownMembers:[{name:'Ashe',role:'Leader'}]}]];
 const operations=establishedGroupOperations(hints,[],'You are already a member of the Moonlight party.','','Player');
 assert.equal(operations.length,1);
 const value=operations[0][2];
 assert.equal(value.playerRole,'Scout');assert.equal(value.leaderId,'ashe');assert.equal(value.memberCount,4);
 assert.deepEqual(value.knownMembers,[{name:'Ashe',role:'Leader'}]);
 assert.equal(value.joinedByInvitation,true);
 const mistakenLeader=establishedGroupOperations([['offer','partyInvitation',{name:'Moonlight',role:'Leader',leaderId:'player'}]],[],
  'You are already a member of the Moonlight party.','','Player')[0][2];
 assert.equal(mistakenLeader.playerRole,'Member');assert.equal(mistakenLeader.leaderId,'unidentified-leader');
});

test('English group labels match whole words and do not create membership from locations or proper names',()=>{
 for(const story of ['You are in Guildford.','You are in a guildhall.','You are in Partyville.'])
  assert.deepEqual(establishedGroupOperations([],[],story,'','Yuki'),[],story);
 const operations=establishedGroupOperations([],[],'You are a member of guild “Guildford”.','','Yuki');
 assert.equal(operations.length,1);
 assert.equal(operations[0][1],'guilds');assert.equal(operations[0][2].name,'Guildford');
});

test('possessive and unnamed memberships keep an established NPC leader and truthful group name',()=>{
 const npcs=[{id:'ashe',name:'Ashe',met:true,enabled:true}];
 const named=establishedGroupOperations([],npcs,'Your party, Moonlight, is led by Ashe.','','Player');
 assert.equal(named.length,1);assert.equal(named[0][2].name,'Moonlight');
 assert.equal(named[0][2].leaderId,'ashe');assert.equal(named[0][2].leaderName,'Ashe');
 assert.equal(named[0][2].playerRole,'Member');
 for(const [story,path,name] of [['Your guild is led by Ashe.','guilds','Guild'],
  ['คุณอยู่ในปาร์ตี้ที่มี Ashe เป็นหัวหน้าแล้ว','party','Party']]){
  const operations=establishedGroupOperations([],npcs,story,'','Player');
  assert.equal(operations.length,1,story);assert.equal(operations[0][1],path);
  assert.equal(operations[0][2].name,name);assert.equal(operations[0][2].leaderId,'ashe');
  assert.equal(operations[0][2].playerRole,'Member');assert.deepEqual(operations[0][2].knownMembers,[{name:'Ashe',role:'Leader'}]);
 }
});

test('player leadership requires an assertion about leading or founding the group itself',()=>{
 for(const story of ['You lead party “Moonlight”.','You founded guild “Dawnspire”.']){
  const operations=establishedGroupOperations([],[],story,'','Player');
  assert.equal(operations.length,1,story);assert.equal(operations[0][2].leaderId,'player');
  assert.equal(operations[0][2].playerRole,'Leader');
 }
 for(const story of ['You formed an opinion about guild “Dawnspire”.','You created a charter for party “Moonlight”.'])
  assert.deepEqual(establishedGroupOperations([],[],story,'','Player'),[],story);
});

test('invitations, plans, negations and another speaker cannot become player memberships',()=>{
 for(const story of ['Ashe invites you to party “Moonlight”.','You might join guild “Dawnspire”.',
  'You plan to join party “Moonlight”.','You are not a member of guild “Dawnspire”.',
  'คุณอยากเข้าร่วมปาร์ตี้ “แสงจันทร์”','คุณไม่ได้เป็นสมาชิกกิลด์ “รุ่งอรุณ”',
  'Ashe is already a member of party “Moonlight”.','You are in the party room at the tavern.',
  'NotDesZiDesu is a member of guild “Dawnspire”.'])
  assert.deepEqual(establishedGroupOperations([],[],story,'','DesZiDesu'),[],story);
 const npcSpeech='<tr-dialogue name="Ashe">I am a member of guild “Dawnspire”.</tr-dialogue>';
 assert.deepEqual(establishedGroupOperations([],[],npcSpeech,'','Player'),[]);
 assert.deepEqual(establishedGroupOperations([],[],'',npcSpeech,'Player'),[]);
});

test('compound sentences register only the player group and its own leadership',()=>{
 const npcs=[{id:'ashe',name:'Ashe',met:true}];
 for(const story of ['You are a member of party “Moonlight”, while guild “Dawnspire” is led by Ashe.',
  'You are a member of party “Moonlight” and Rhea is a member of guild “Dawnspire”.',
  'You are in the Moonlight party and Rhea stayed in the Dawnspire guild.']){
  const operations=establishedGroupOperations([],npcs,story,'','Player');
  assert.equal(operations.length,1,story);assert.equal(operations[0][1],'party');
  assert.equal(operations[0][2].name,'Moonlight');assert.equal(operations[0][2].leaderId,'unidentified-leader');
 }
});

test('malformed hint names do not throw or replace the group named in the story',()=>{
 const hints=[['upsert','party',{name:42}],['offer','partyInvitation',{name:{value:'Moonlight'}}],
  ['upsert','party',{name:null}]];
 const operations=establishedGroupOperations(hints,[],'You are a member of party “Moonlight”.','','Player');
 assert.equal(operations.length,1);assert.equal(operations[0][2].name,'Moonlight');
});

test('departure guards recognize confirmed departures and dissolution of the named group',()=>{
 const group={kind:'guild',name:'Moonlight'};
 for(const story of ['You left the Moonlight guild.','You no longer belong to the Moonlight guild.',
  'The Moonlight guild was disbanded.','Your Moonlight guild disbanded.','กิลด์ “Moonlight” ถูกยุบแล้ว'])
  assert.equal(groupMembershipEnded(story,'',group,'Player'),true,story);
 assert.equal(groupMembershipEnded('','I left the Moonlight guild.',group,'Player'),true);
 assert.equal(groupMembershipEnded('คุณออกจากปาร์ตี้ “แสงจันทร์” แล้ว','',{kind:'party',name:'แสงจันทร์'},'Player'),true);
 assert.equal(groupMembershipEnded('You left the Moonlight guild.','I am a member of the Moonlight guild.',group,'Player'),true);
});

test('hypothetical, negated, NPC-only and unrelated-group departures do not end player membership',()=>{
 const group={kind:'guild',name:'Moonlight'};
 for(const story of ['If you left the Moonlight guild, Ashe would be lonely.','You never left the Moonlight guild.',
  'Your Moonlight guild has not disbanded.','Ashe left the Moonlight guild.',
  'You left the Dawnspire guild.','You left guild “Dawnspire”.',
  '<tr-dialogue name="Ashe">I left the Moonlight guild.</tr-dialogue>'])
  assert.equal(groupMembershipEnded(story,'',group,'Player'),false,story);
 assert.equal(groupMembershipEnded('','<tr-dialogue name="Ashe">I left the Moonlight guild.</tr-dialogue>',group,'Player'),false);
});

test('a departure applies only to the player clause and preserves another guild named by an NPC clause',()=>{
 const story='You left the Dawnspire guild and Rhea stayed in the Moonlight guild.';
 assert.equal(groupMembershipEnded(story,'',{kind:'guild',name:'Dawnspire'},'Yuki'),true);
 assert.equal(groupMembershipEnded(story,'',{kind:'guild',name:'Moonlight'},'Yuki'),false);
 const ownGroups='You left the Dawnspire guild and the Moonlight guild.';
 for(const name of ['Dawnspire','Moonlight'])assert.equal(groupMembershipEnded(ownGroups,'',{kind:'guild',name},'Yuki'),true);
});

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

test('group invitations resolve eligible inviters, default roles and retain total membership separately',()=>{
    const party = ['offer','partyInvitation',{npcId:'kohaku',name:'Ashtrail',role:'Scout',rank:'Silver',completedQuests:7,memberCount:4,
        members:[{name:'Rhea',role:'Leader'}],leaderName:'Rhea'}];
    const guild = ['offer','guildInvitation',{npcId:'kohaku',name:'Dawnspire',role:'Initiate',
        members:[{name:'Sera'}],memberCount:128}];
    const offers = groupOffers([party,guild],people,'Kohaku and Rhea offered an invitation to a party with 4 people and a guild with 128 people',[],{party:null,guilds:[]});
    assert.equal(offers.length,2);
    assert.deepEqual(offers[0].members.map(person=>person.name),['Kohaku','Rhea']);
    assert.equal(offers[0].memberCount,4);
    assert.equal(offers[0].rank,'Silver');
    assert.equal(offers[0].completedQuests,7);
    assert.equal(offers[1].memberCount,128);
    assert.equal(offers[1].completedQuests,null);
    assert.equal(groupOffers([guild],people,'Kohaku invited you; no total was stated',[],{} )[0].memberCount,128);
    assert.equal(groupOffers([['offer','guildInvitation',{npcId:'kohaku',name:'Guild',role:'Member',members:[{name:'Sera'}]}]],people,'Kohaku invited you',[],{} )[0].memberCount,null);
    assert.equal(groupOffers([party],people,'No one asked',[],{}).length,0);
    assert.equal(groupOffers([party],people,'Kohaku spoke',[],{party:{name:'Elsewhere'}}).length,0);
    assert.equal(groupOffers([['offer','partyInvitation',{npcId:'kohaku',name:'Ashtrail'}]],people,'Kohaku spoke',[],{} )[0].role,'Member');
    assert.equal(groupOffers([['offer','guildInvitation',{npcId:'enemy',name:'Guild',role:'Member'}]],people,'Enemy spoke',[],{}).length,0);
});

test('explicit diary request bypasses cadence but still respects off and duplicate entries', () => {
    const npc = {id:'kohaku',name:'Kohaku',met:true,diary:[{text:'Earlier thought',sourceTurn:19}]};
    const op = ['append','npcDiary',{npcId:'kohaku',text:'I need to speak honestly today.'}];
    assert.equal(allowedDiaryOps([op],[npc],'Kohaku writes in her journal',[],'normal',20).length,0);
    assert.equal(allowedDiaryOps([op],[npc],'Kohaku writes in her journal',[],'normal',20,true).length,1);
    assert.equal(allowedDiaryOps([op],[npc],'Kohaku writes in her journal',[],'off',20,true).length,0);
});

test('direct spoken invitations recover locally and exclude hypothetical or rejected invitations',()=>{
 const line=text=>`<tr-dialogue name="Kohaku">${text}</tr-dialogue>`;
 assert.equal(groupOffers([],people,line('I invite you to join the guild "Dawnspire".'),[],{})[0].name,'Dawnspire');
 assert.equal(groupOffers([],people,line('ขอเชิญคุณเข้าร่วมกิลด์ “รุ่งอรุณ”'),[],{})[0].kind,'guild');
 assert.deepEqual(groupOffers([],people,line('ชวนเธอเข้าปาร์ตี้ “แสงจันทร์” และกิลด์ “รุ่งอรุณ”'),[],{}).map(offer=>offer.kind),['party','guild']);
 assert.equal(groupOffers([],people,line('Would you join our party “Moonlight”?'),[],{})[0].name,'Moonlight');
 for(const text of ['If I invite you to join the guild "Dawnspire".','I do not invite you to join the guild "Dawnspire".','ชวนคุณเข้ากิลด์ แต่ยังไม่ตัดสินใจ'])assert.equal(groupOffers([],people,line(text),[],{}).length,0);
 const offers=groupOffers([['offer','guildInvitation',{npcName:'Kohaku',name:'Dawnspire',role:'Leader'}]],people,line('I invite you to join the guild "Dawnspire".'),[],{});
 assert.equal(offers.length,1);assert.equal(offers[0].role,'Member');
});
