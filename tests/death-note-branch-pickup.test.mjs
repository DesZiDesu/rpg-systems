import test from 'node:test';import assert from 'node:assert/strict';
import {worldState,validateAction,WORLD_EVENTS} from '../src/workshop/death-note/world.js';
import {greetingBooks} from '../src/workshop/death-note/opening.js';
const greeting='คุณเห็นสมุดปกดำตกลงบนพื้น\n\nบนปกเขียนว่า DEATH NOTE';
const action='ฉันมองหนังสือที่ตกอยู่ก่อนที่จะเก็บขึ้นมาใส่กระเป๋าอย่างง่ายดาย เหมือนในเรื่อง Death Note ก็เก็บใส่กระเป๋าอย่างดี';
const proof='สัมผัสของสมุดเล่มนั้นที่เพิ่งสอดเก็บลงในกระเป๋ายังคงทิ้งความรู้สึกหนักและผิวสัมผัสของปกหนังสีดำ มันนอนนิ่งอยู่ท่ามกลางสิ่งของเครื่องใช้ส่วนตัว';
const fixture=()=>({player:{name:'Adventurer'},location:{place:'Unknown'},scene:{position:'Unknown'},inventory:[],npcs:[{id:'npc',name:'Elias Voss',race:'Human'}],deathNoteRules:{greetingBooks:[{text:greeting,books:[{bookId:'fallen-book',knownToPlayer:true,location:''}]}]}});
const ai=mes=>({mes,is_user:false,extra:{}}),user=mes=>({mes,is_user:true}),reply=()=>ai('<tr-narrative>'+proof+'</tr-narrative><!--roleforge_death_note_world:{"events":[{"type":"acquire","bookId":"dn-opening-notebook","actorId":"player","evidence":"'+action+'"}]}-->');
const chat=()=>[ai(greeting.replaceAll('\n','\r\n')),user(action),reply()];
test('CRLF, LF and CR greetings bind the same active author facts',()=>{for(const ending of ['\n','\r\n','\r'])assert.equal(greetingBooks([ai(greeting.replaceAll('\n',ending))],fixture())[0].bookId,'fallen-book');});
test('an unrelated or unused alternate greeting never seeds another notebook',()=>{assert.deepEqual(greetingBooks([ai('A quiet classroom.')],fixture()),[]);assert.equal(Object.keys(worldState([ai('A quiet classroom.')],fixture()).books).length,0);});
test('discovery is available with an uninitialized scene tracker but does not grant ownership',()=>{const w=worldState(chat().slice(0,1),fixture());assert.equal(w.books['fallen-book'].holderId,'');assert.equal(validateAction(w,fixture(),{type:'take',bookId:'fallen-book'}).type,'take');});
test('Thai completed stowage and actual user pickup recover the real discovered book despite a wrong protocol id and quote',()=>{const s=fixture(),before=JSON.stringify(s),w=worldState(chat(),s);assert.equal(w.books['fallen-book'].holderId,'player');assert.equal(w.books['fallen-book'].ownerId,'player');assert.equal(w.books['dn-opening-notebook'],undefined);assert.equal(JSON.stringify(s),before);});
test('completed narration alone cannot invent user consent',()=>{const s=fixture();for(const text of ['', 'ฉันมองสมุดเฉยๆ','ฉันแตะปกสมุด','ฉันจะเก็บสมุด','ก่อนที่จะเก็บสมุด ฉันขอดูก่อน','ฉันบอกให้ Elias Voss หยิบสมุด','((ฉันหยิบสมุดขึ้นมา))','I would pick up the notebook.']){const rows=chat();rows[1]=user(text);assert.equal(worldState(rows,s).books['fallen-book'].holderId,'',text);}});
test('user intent alone, dialogue quotes and hidden comments do not prove a completed pickup',()=>{for(const mes of ['The notebook remains on the ground.','<tr-dialogue name="npc">'+proof+'</tr-dialogue>','<!--'+proof+'-->','<tr-narrative>สมุดยังไม่ได้เก็บลงในกระเป๋า</tr-narrative>']){const rows=chat();rows[2]=ai(mes);assert.equal(worldState(rows,fixture()).books['fallen-book'].holderId,'');}});
test('NPC holders, multiple notebooks and scraps are never guessed into player possession',()=>{for(const kind of ['held','many','scrap']){const s=fixture(),rows=chat();if(kind==='held')s.deathNoteRules.greetingBooks[0].books[0].holderId='npc';if(kind==='many')s.deathNoteRules.greetingBooks[0].books.push({bookId:'second',knownToPlayer:true});if(kind==='scrap')rows[1]=user('ฉันหยิบเศษกระดาษสมุดขึ้นมา');assert.notEqual(worldState(rows,s).books['fallen-book'].holderId,'player');}});
test('recovery does not replace an existing human rights owner',()=>{const s=fixture();s.deathNoteRules.greetingBooks[0].books[0].ownerId='npc';const b=worldState(chat(),s).books['fallen-book'];assert.equal(b.holderId,'player');assert.equal(b.ownerId,'npc');});
test('editing the user or confirmation, and branching before it, removes inferred possession',()=>{const s=fixture(),rows=chat();assert.equal(worldState(rows,s).books['fallen-book'].holderId,'player');assert.equal(worldState(rows.slice(0,2),s).books['fallen-book'].holderId,'');rows[1].mes='ฉันไม่หยิบสมุด';assert.equal(worldState(rows,s).books['fallen-book'].holderId,'');rows[1].mes=action;rows[2].mes='A quiet street.';assert.equal(worldState(rows,s).books['fallen-book'].holderId,'');});
test('a late registration snapshot and stale inventory cannot replace the greeting timeline',()=>{const s=fixture(),rows=chat();s.inventory=[{id:'fallen-book',name:'Death Note',quantity:1,properties:['roleforge:addon:death-note']}];rows.push(ai('Later.'));rows.at(-1).extra[WORLD_EVENTS]=[{type:'register',bookId:'fallen-book',itemId:'fallen-book',holderId:'player',ownerId:'player',swipe:0,offset:0}];assert.equal(worldState(rows,s).books['fallen-book'].holderId,'player');rows[2].mes='The book stays on the ground.';assert.equal(worldState(rows,s).books['fallen-book'].holderId,'');assert.equal(worldState(rows.slice(0,1),s).books['fallen-book'].holderId,'');});
test('an NPC pickup or NPC stowage cannot be substituted for the player action',()=>{for(const text of ['Elias Voss picks up the notebook.','Elias Voss puts the notebook in your bag.','The notebook is placed in your bag by Elias Voss.']){const rows=chat();rows[2]=ai('<tr-narrative>'+text+'</tr-narrative>');assert.equal(worldState(rows,fixture()).books['fallen-book'].holderId,'');}});
test('English completed stowage works without relying on a model event',()=>{const rows=chat();rows[1]=user('I pick up the black notebook.');rows[2]=ai('<tr-narrative>The notebook is tucked into your bag.</tr-narrative>');assert.equal(worldState(rows,fixture()).books['fallen-book'].holderId,'player');});
const recovered=(act,narration)=>worldState([ai(greeting),user(act),ai('<tr-narrative>'+narration+'</tr-narrative>')],fixture()).books['fallen-book'].holderId;
for(const [label,act,narration] of [
 ['Thai grab','ฉันคว้าสมุดเล่มนั้นขึ้นมา','คุณคว้าสมุดปกดำขึ้นจากพื้น'],
 ['Thai lift','ฉันยกสมุดขึ้นจากพื้น','คุณยกสมุดขึ้นมาไว้ในมือ'],
 ['Thai pick pronoun','สมุดปกดำเหรอ ฉันหยิบมันขึ้นมา','คุณหยิบมันขึ้นมาพิจารณา'],
 ['Thai bag','ฉันสอดสมุดลงในกระเป๋า','สมุดปกดำถูกสอดลงในกระเป๋าเรียบร้อย'],
 ['Thai hold outcome','ฉันเก็บเล่มนั้นขึ้นมา เป็นสมุดนี่เอง','สมุดปกดำมาอยู่ในมือคุณเรียบร้อย'],
 ['Thai unrelated negative','ฉันไม่สนใจข่าวบนจอ ฉันคว้าสมุดขึ้นมา','คุณไม่สนใจฝน คุณคว้าสมุดขึ้นมาดู'],
 ['Thai prior refusal','ฉันไม่หยิบสมุด แต่ฉันเก็บสมุดขึ้นมาในที่สุด','คุณลังเล จากนั้นคุณเก็บสมุดขึ้นมา'],
 ['English lift','I lift the black notebook from the ground.','You lift the black notebook and examine its cover.'],
 ['English scoop','I scoop up the notebook.','You scoop up the notebook.'],
 ['English pocket','I pocket the notebook.','The notebook now rests in your pocket.'],
 ['English retrieve','I retrieve the fallen notebook.','You retrieve the fallen notebook.'],
 ['English tuck','I tuck the notebook into my bag.','The notebook is tucked into your bag.'],
 ['English unrelated negative','I am not afraid. I pick up the notebook.','The notebook is not wet. You pick up the notebook.'],
 ['English before unrelated movement','I collect the notebook before I leave.','You collect the notebook before walking away.'],
])test('narration supports '+label,()=>assert.equal(recovered(act,narration),'player'));
test('long Thai and English role paragraphs retain the actual completed pickup',()=>{
 for(const [act,narration] of [
  ['ฉันคว้าสมุดขึ้นมา','ฝนตกบนหลังคาและสายลมพัดผ่านต้นไม้ '.repeat(90)+'คุณคว้าสมุดเล่มนั้นขึ้นมาจากพื้น'],
  ['I lift the notebook.','Rain falls across the rooftops. '.repeat(90)+'You lift the notebook from the ground. '+ 'The street stays quiet. '.repeat(90)],
 ])assert.equal(recovered(act,narration),'player');
});
for(const [label,act,narration] of [
 ['Thai refusal','ฉันไม่คว้าสมุด','คุณคว้าสมุดขึ้นมา'],
 ['Thai plan','ฉันจะยกสมุดขึ้นมา','คุณยกสมุดขึ้นมา'],
 ['Thai attempt proof','ฉันหยิบสมุด','คุณพยายามหยิบสมุดแต่ยังหยิบไม่สำเร็จ'],
 ['English refusal','I do not lift the notebook.','You lift the notebook.'],
 ['English plan','I will retrieve the notebook.','You retrieve the notebook.'],
 ['English question','Can I pick up the notebook?','You pick up the notebook.'],
 ['English attempted proof','I pick up the notebook.','You try to pick up the notebook.'],
 ['English photo','I take a photo of the notebook.','You take a photo of the notebook.'],
 ['English NPC lift','I lift the notebook.','Elias Voss lifts the notebook.'],
 ['Thai NPC grab','ฉันคว้าสมุด','Elias Voss คว้าสมุดขึ้นมา'],
 ['English failed after reach','I pick up the notebook.','You reach to pick up the notebook, but cannot lift it.'],
 ['English denial later','I pick up the notebook.','You pick up the notebook. But you did not actually pick up the notebook.'],
 ['Thai denial later','ฉันหยิบสมุด','คุณหยิบสมุด แต่คุณไม่ได้หยิบสมุดขึ้นมาจริง'],
])test('narration does not grant ownership for '+label,()=>assert.equal(recovered(act,narration),''));
test('a single discovered notebook supports Thai omitted objects and English it',()=>{for(const act of ['ฉันหยิบขึ้นมา','เก็บขึ้นมา','เก็บใส่กระเป๋า','I lift it.','I pick it up.'])assert.equal(recovered(act,'คุณหยิบสมุดขึ้นมาจากพื้น'),'player',act);});
test('the final narrated result wins across separate narrative blocks',()=>{
 const rows=[ai(greeting),user('ฉันหยิบสมุด'),ai('<tr-narrative>คุณหยิบสมุด</tr-narrative><tr-narrative>แต่คุณไม่ได้หยิบสมุดขึ้นมาจริง</tr-narrative>')];
 assert.equal(worldState(rows,fixture()).books['fallen-book'].holderId,'');
});
test('a final player refusal overrides an earlier pickup statement',()=>assert.equal(recovered('I pick up the notebook. But I do not pick up the notebook.','You pick up the notebook.'),''));
test('unrelated objects and touching or inspecting never imply taking the notebook',()=>{for(const act of ['ฉันหยิบโทรศัพท์ขึ้นมาใส่กระเป๋า','ฉันอ่านสมุด','I take my phone.','I touch the notebook.','I look at it.'])assert.equal(recovered(act,'You pick up the notebook.'),'',act);});
test('unrelated Thai and English negative phrases do not cancel completed actions in the same sentence',()=>{
 for(const [act,proof] of [
  ['ฉันไม่ได้สนใจฝนและหยิบสมุดขึ้นมา','คุณไม่ได้สนใจฝนและหยิบสมุดขึ้นมา'],
  ['ฉันยังไม่หิวจึงเก็บสมุดขึ้นมา','คุณยังไม่หิวจึงเก็บสมุดขึ้นมา'],
  ['I never hesitate and lift the notebook.','You never hesitate and lift the notebook.'],
 ])assert.equal(recovered(act,proof),'player',act);
});
