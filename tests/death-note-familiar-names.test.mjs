import test from 'node:test';
import assert from 'node:assert/strict';
import {worldState,playerIdentity,perceivedName,applyEvent,worldInstruction} from '../src/workshop/death-note/world.js';
import {knowsName,nameKnowledgeReference} from '../src/name-knowledge.js';
const fixture=()=>({player:{name:'Alex Vale',knownNames:{}},inventory:[],worldClock:{day:1,time:'18:00'},deathNoteRules:{settings:{maskUnknownNames:true},originalLifespans:{mom:{day:19000,time:'09:31'}}},npcs:[{id:'mom',name:'Mara Vale',relationship:'แม่',occupation:'Homemaker',met:true,race:'Human',knownNames:{},stats:{hp:100}},{id:'friend',name:'Elias Voss',relationship:'Acquaintance',met:true,race:'Human',knownNames:{},stats:{hp:100}},{id:'stranger',name:'Nolan Pierce',relationship:'Acquaintance',met:true,race:'Human',knownNames:{},stats:{hp:100}}]});
const mom=s=>s.npcs[0];
test('a met mother is already known without an introduction or Shinigami Eyes',()=>{
 const s=fixture(),before=JSON.stringify(s),w=worldState([],s),v=playerIdentity(w,mom(s),s);assert.equal(v.name,'Mara Vale');assert.equal(v.sight,null);assert.equal(w.claims.mom,undefined);assert.equal(JSON.stringify(s),before);
 assert.equal(knowsName(s,'player','mom'),true);assert.equal(knowsName(s,'mom','player'),true);
});
test('English and Thai close family and longstanding relationships need no repeated introduction',()=>{
 for(const relationship of ['Mother','Father','Sister','Spouse','Childhood friend','แม่','พ่อ','ภรรยา','สามี','เพื่อนวัยเด็ก']){const s=fixture();mom(s).relationship=relationship;assert.equal(perceivedName(worldState([],s),mom(s)),'Mara Vale',relationship);}
});
test('explicit Known Name true works for any person independently of meeting or kinship',()=>{
 const s=fixture();s.player.knownNames.friend=true;s.npcs[1].met=false;const w=worldState([],s);assert.equal(playerIdentity(w,s.npcs[1],s).name,'Elias Voss');assert.equal(playerIdentity(w,s.npcs[1],s).face.known,false);assert.equal(perceivedName(w,s.npcs[2]),'???');
});
test('manual false wins over inferred family knowledge, independently in each direction',()=>{
 const s=fixture();s.player.knownNames.mom=false;assert.equal(playerIdentity(worldState([],s),mom(s),s).name,'???');assert.equal(knowsName(s,'player','mom'),false);assert.equal(knowsName(s,'mom','player'),true);
 mom(s).knownNames.player=false;assert.equal(knowsName(s,'mom','player'),false);
});
test('meeting, occupations, high affection and family words in a private biography alone do not grant a name',()=>{
 const s=fixture(),n=s.npcs[1];n.occupation='Mother';n.background="Alex Vale's mother";n.affection=100;n.trust=100;assert.equal(perceivedName(worldState([],s),n),'???');mom(s).met=false;assert.equal(perceivedName(worldState([],s),mom(s)),'???');
});
test('family familiarity never becomes NPC-to-NPC knowledge or exposes an unrelated person',()=>{
 const s=fixture();assert.equal(knowsName(s,'mom','friend'),false);assert.equal(knowsName(s,'friend','mom'),false);assert.equal(knowsName(s,'friend','player'),false);
 const refs=nameKnowledgeReference(s);assert.equal(refs[0].knownNames.mom,true);assert.equal(refs.find(n=>n.id==='mom').knownNames.player,true);assert.deepEqual(refs.find(n=>n.id==='stranger').knownNames,{});
});
test('known names and eyes remain separate; eyes still require a witnessed face',()=>{
 const s=fixture();s.deathNoteRules.knownFaces={mom:false};s.deathNoteRules.actorEyes={player:{source:'innate'}};let w=worldState([],s);assert.equal(playerIdentity(w,mom(s),s).name,'Mara Vale');assert.equal(playerIdentity(w,mom(s),s).sight,null);
 applyEvent(w,{type:'face-seen',npcId:'mom',evidence:'You see your mother’s face clearly.'});const v=playerIdentity(w,mom(s),s);assert.equal(v.name,'Mara Vale');assert.equal(v.sight.trueName,'Mara Vale');assert.match(v.sight.lifespan,/19000/);
});
test('prior familiarity reveals a known public name, never a separate secret true name',()=>{
 const s=fixture();s.deathNoteRules.trueNames={mom:'Mara Secret Birthname'};let w=worldState([],s);assert.equal(playerIdentity(w,mom(s),s).name,'Mara Vale');assert.equal(playerIdentity(w,mom(s),s).sight,null);
 s.deathNoteRules.actorEyes={player:{source:'gift'}};w=worldState([],s);assert.equal(playerIdentity(w,mom(s),s).name,'Mara Vale');assert.equal(playerIdentity(w,mom(s),s).sight.trueName,'Mara Secret Birthname');
});
test('a later claimed alias cannot erase a familiar person’s established name, while an unknown person can still lie',()=>{
 const s=fixture(),w=worldState([],s);applyEvent(w,{type:'introduce',npcId:'mom',claimedName:'Someone Else'});applyEvent(w,{type:'introduce',npcId:'friend',claimedName:'Adrian Grey'});assert.equal(perceivedName(w,mom(s)),'Mara Vale');assert.equal(perceivedName(w,s.npcs[1]),'Adrian Grey');
});
test('manual edits and branch-specific profile changes recompute prior knowledge without mutating journals',()=>{
 const s=fixture();assert.equal(perceivedName(worldState([],s),mom(s)),'Mara Vale');s.player.knownNames.mom=false;assert.equal(perceivedName(worldState([],s),mom(s)),'???');s.player.knownNames.mom=true;assert.equal(perceivedName(worldState([],s),mom(s)),'Mara Vale');
 const earlier=fixture();mom(earlier).relationship='Acquaintance';assert.equal(perceivedName(worldState([],earlier),mom(earlier)),'???');assert.equal(worldState([],earlier).claims.mom,undefined);
});
test('known-name author controls and AI references agree with the projected NPC name',()=>{
 const s=fixture(),w=worldState([],s);assert.equal(nameKnowledgeReference(s)[0].knownNames.mom,true);assert.match(worldInstruction(w,s),/"perceivedName":"Mara Vale"/);s.player.knownNames.mom=false;assert.equal(nameKnowledgeReference(s)[0].knownNames.mom,false);assert.equal(playerIdentity(worldState([],s),mom(s),s).name,'???');
});
