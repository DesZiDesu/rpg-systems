import test from 'node:test';
import assert from 'node:assert/strict';
import {npcRole,usableNpcName,resolveNpcSpeaker,validateGeneratedNpcName} from '../src/npc-core.js';
import {npcCanonContext} from '../src/npc-generation.js';

test('role-only labels are not names; proper names containing role words are preserved',()=>{
 for(const label of ['Father','พ่อ','คุณพ่อ','my father','พ่อของผม','Innkeeper','Gate Keeper','ยามเฝ้าประตู','the innkeeper'])assert.equal(usableNpcName(label),false,label);
 for(const name of ['Arthur','สมชาย','Father Thomas','King Arthur','Gatewood','พ่อขุนรามคำแหง'])assert.equal(usableNpcName(name),true,name);
 assert.equal(npcRole('Father').field,'relationship');assert.equal(npcRole('Gate Keeper').field,'occupation');
});
test('unique roles resolve bilingual headers to the canonical person, never the first of shared roles',()=>{
 const father={id:'dad',name:'Arthur',relationship:'พ่อ'},inn={id:'inn',name:'Lysa',occupation:'Innkeeper'};
 assert.equal(resolveNpcSpeaker([father],'Father'),father);assert.equal(resolveNpcSpeaker([inn],'เจ้าของโรงเตี๊ยม'),inn);
 assert.equal(resolveNpcSpeaker([inn,{id:'other',name:'Bob',occupation:'Innkeeper'}],'Innkeeper'),null);
 assert.equal(resolveNpcSpeaker([{name:'Father'},father],'Father'),father);
 assert.equal(resolveNpcSpeaker([father,{name:'Robert',relationship:'Father'}],'พ่อ'),null);
 assert.equal(resolveNpcSpeaker([{name:'Robert',relationship:'father of Lysa'}],'Father'),null);
 assert.equal(resolveNpcSpeaker([father],{id:'dad',name:'Innkeeper'}),father);
});
test('generated roles go to their proper fields without replacing a known name',()=>{
 const fixed=validateGeneratedNpcName({name:'Father',background:'A farmer'},{name:'Arthur'});
 assert.equal(fixed.name,'Arthur');assert.equal(fixed.relationship,'Father');
 assert.equal(validateGeneratedNpcName({name:'Innkeeper'},{name:'Lysa'}).occupation,'Innkeeper');
 assert.equal(validateGeneratedNpcName({name:'Lysa'},{name:'Innkeeper'}).occupation,'Innkeeper');
 assert.throws(()=>validateGeneratedNpcName({name:'Gate Keeper'}),error=>error.code==='NPC_NAME_INVALID');
 assert.throws(()=>validateGeneratedNpcName({name:{role:'Father'}}),error=>error.code==='NPC_NAME_INVALID');
 assert.throws(()=>validateGeneratedNpcName({name:'Unknown'}),error=>error.code==='NPC_NAME_INVALID');
});
test('raw generation receives active card canon but never its image or host secrets',()=>{
 const context={characterId:0,characters:[{avatar:'private.png',data:{name:'World',description:'The player’s father is Arthur.',scenario:'At home',extensions:{image:'data:image/png;base64,private'}}}],secret:'private'};
 assert.deepEqual(npcCanonContext(context),{name:'World',description:'The player’s father is Arthur.',scenario:'At home'});
});
