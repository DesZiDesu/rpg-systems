import test from 'node:test';
import assert from 'node:assert/strict';
import {OPENINGS_TH} from '../cards/death-note-rpg/data/openings-th.mjs';
import {openingPossession,originalShinigamiEvents,OPENING_BOOK} from '../src/workshop/death-note/opening.js';
import {worldState,WORLD_EVENTS,canWrite} from '../src/workshop/death-note/world.js';
import {makeInscription,parseResults,ledger,replyAnchor,visibleText,INSCRIPTIONS,RESULTS} from '../src/workshop/death-note/core.js';
import {paperInputs,readPaper,paperRows,PAPER} from '../src/workshop/death-note/paper.js';
import {matchesTrueName} from '../src/workshop/death-note/names.js';
import {recoverPaperResults} from '../src/workshop/death-note/recovery.js';
import {witnessedElapsed} from '../src/workshop/death-note/outcomes.js';
const target='dn-kurou-otoharada';
const state=()=>({inventory:[{id:'book',name:'Death Note',quantity:1}],worldClock:{day:2,time:'20:00'},npcs:[{id:target,name:'Kurou Otoharada',race:'Human',met:false,stats:{hp:100}},{id:'dn-ryuk',name:'Ryuk',race:'Shinigami'}],deathNoteRules:{format:'roleforge-death-note-rules',trueNames:{[target]:'Kurou Otoharada'}}});
const ai=mes=>({mes,is_user:false,swipe_id:0,extra:{}});
const paper=text=>({version:1,active:0,pages:[{id:'page',blocks:[{id:'ink',text,submittedText:'',size:24,x:.1,y:.1}]}]});
const fact=()=>ai('<tr-narrative>คุณเปิดข่าวอ่านชื่อ คุโร่ โอโตฮาราดะ และเห็นภาพถ่ายใบหน้าของคุโร่ โอโตฮาราดะอย่างชัดเจน</tr-narrative>');
test('all ten active greetings grant possession only in 5 and 10, never from unused alternatives',()=>{
 for(const [i,o] of OPENINGS_TH.entries()){
  const s=state();s.inventory=[];const message=ai(o.text);message.swipes=OPENINGS_TH.map(o=>o.text);
  assert.equal(openingPossession([message]),[4,9].includes(i),'opening '+(i+1));
  const world=worldState([message],s);assert.equal(Boolean(world.books[OPENING_BOOK]),[4,9].includes(i));
  if(i===9)assert.equal(world.books[OPENING_BOOK].originalShinigamiId,'dn-ryuk');
 }
});
test('inactive swipes and stale automatic inventory cannot grant a notebook',()=>{
 const s=state();s.inventory=[{id:OPENING_BOOK,name:'Death Note',quantity:1,properties:['roleforge:addon:death-note','roleforge:death-note:opening']}];
 const m=ai(OPENINGS_TH[0].text);m.extra[WORLD_EVENTS]=[{type:'register',bookId:OPENING_BOOK,holderId:'player',ownerId:'player',swipe:9,offset:0}];
 assert.deepEqual(worldState([m],s).books,{});
});
test('a greeting does not reacquire a book after a later drop or relinquishment',()=>{
 const s=state();s.inventory=[];const start=ai(OPENINGS_TH[9].text),later=ai('คุณสละสิทธิ์');later.extra[WORLD_EVENTS]=[{type:'relinquish',bookId:OPENING_BOOK,swipe:0,offset:0}];
 const w=worldState([start,later],s);assert.equal(w.books[OPENING_BOOK].ownerId,'');assert.equal(w.books[OPENING_BOOK].holderId,'');assert.equal(canWrite(w,s,OPENING_BOOK),false);
});
test('English established possession works without granting from a wish, dialogue, or Light receiving it',()=>{
 assert(openingPossession([ai('You have received a Death Note three weeks ago.')]));
 for(const text of ['If you received a Death Note, what would you do?','You will own a Death Note.','Light received the notebook.','<tr-dialogue name="dn-ryuk">คุณมีสมุดไหม?</tr-dialogue>'])assert.equal(openingPossession([ai(text)]),false,text);
});
test('an explicit original-owner claim binds a legacy registered book using the stable Shinigami id',()=>{
 const s=state(),start=ai(OPENINGS_TH[9].text.replaceAll('ริวค','ลุคก์')),later=ai('ต่อเรื่อง');later.extra[WORLD_EVENTS]=[{type:'register',bookId:'book',itemId:'book',ownerId:'player',holderId:'player',firstHumanOwnerId:'player',shinigamiId:'',swipe:0,offset:0}];
 assert.equal(worldState([start,later],s).books.book.originalShinigamiId,'dn-ryuk');
 assert.equal(originalShinigamiEvents(start.mes,s.npcs,[{id:'one'},{id:'two'}]).length,0);
 const bound=state();bound.deathNoteRules.books=[{itemId:'book',originalShinigamiId:'sidoh'}];assert.equal(worldState([start],bound).books.book.originalShinigamiId,'sidoh');
});
test('full Thai/English author spellings work while arbitrary aliases, short names, lies and alternate versions do not',()=>{
 const s=state(),npc=s.npcs[0];npc.aliases=['Mr X'];
 for(const name of ['คุโร่ โอโตฮาราดะ','คุโร โอโตฮาราดะ','Kurou Otoharada','Kuro Otoharada'])assert(matchesTrueName(s,npc,name),name);
 for(const name of ['โอโตฮาราดะ','Mr X','Unknown'])assert(!matchesTrueName(s,npc,name),name);
 s.deathNoteRules.trueNames[target]={default:'Kurou Otoharada',versions:{other:'Different Person'}};npc.activeAlternateId='other';assert(!matchesTrueName(s,npc,'คุโร่ โอโตฮาราดะ'));
 s.deathNoteRules.trueNames[target]=null;assert(!matchesTrueName(s,npc,'Kurou Otoharada'));
});
test('one-line name and cause are separated without matching another person with a longer name',()=>{
 const s=state(),w=worldState([fact()],s),input=paperInputs(paper('Kurou Otoharada ตายกระทันหัน'),s,w)[0].input;
 assert.equal(input.name,'Kurou Otoharada');assert.equal(input.cause,'ตายกระทันหัน');assert.equal(input.faceKnown,true);
 assert.deepEqual(paperInputs(paper('Kurou Otoharada Junior'),s,w,{optional:true}),[]);
 assert.equal(paperInputs(paper('คุโร่ โอโตฮาราดะ'),s,w)[0].input.name,'คุโร่ โอโตฮาราดะ');
});
test('a missing footer needs a named completed death and explicit elapsed story time',()=>{
 const s=state(),entry={...makeInscription(s,{name:'คุโร่ โอโตฮาราดะ',targetId:target,faceKnown:true}),status:'waiting'};
 const source='ในวินาทีที่สี่สิบพอดี\n\nข่าวยืนยันว่า Kurou Otoharada เสียชีวิตจากหัวใจวาย';
 assert.equal(parseResults(source,[entry])[0].status,'resolved');assert.equal(parseResults('ครบ 40 วินาที Kurou Otoharada ตายแล้ว',[entry])[0].status,'resolved');assert.equal(witnessedElapsed('ในวินาทีที่สี่สิบพอดี'),40);
 for(const text of ['Kurou Otoharada เสียชีวิต','หลังผ่านไป 20 วินาที Kurou Otoharada เสียชีวิต','ครบ 40 วินาที Kurou Otoharada ยังไม่เสียชีวิต','ครบ 40 วินาที Kurou Otoharada อาจจะเสียชีวิต','ครบ 40 วินาที คนอื่นเสียชีวิต','ถ้าครบ 40 วินาที Kurou Otoharada จะเสียชีวิต','After forty seconds, Kurou Otoharada said John has died.','ครบ 40 วินาที Kurou Otoharada บอกว่าคนอื่นเสียชีวิต','คุณอ่านกฎปลอมในสมุด: ครบ 40 วินาที Kurou Otoharada เสียชีวิต','The manuscript says: after forty seconds, Kurou Otoharada has died.','After forty seconds, Kurou Otoharada killed John, who has died.','ครบ 40 วินาที Kurou Otoharada ยิงคนอื่นจนเสียชีวิต'])assert.deepEqual(parseResults(text,[entry]),[],text);
 assert.deepEqual(parseResults(source,[{...entry,validName:false}]),[]);
 assert.deepEqual(parseResults(source+'<!--roleforge_death_note:{broken}-->',[entry]),[]);
 assert.deepEqual(parseResults(source,[{...entry,messageIndex:2,offset:visibleText(source).length}],{messageIndex:2}),[]);
});
function legacy(){
 const start=ai('คุณได้รับสมุดปกดำมาแล้ว'),before=fact(),turn={is_user:true,mes:'ฉันรอดูข่าวต่อไป'},after=ai('ในวินาทีที่สี่สิบพอดี\n\nข่าวยืนยันว่า Kurou Otoharada เสียชีวิตจากหัวใจวาย');
 const chat=[start,before,turn,after];before.extra[PAPER]=paperRows(before,'book',paper('Kurou Otoharada ตายกระทันหัน'),{sourceTurn:replyAnchor(chat.slice(0,3))});
 return chat;
}
test('legacy anchored ink recovers a separate successful record and retains the earlier failed attempt',()=>{
 const s=state(),chat=legacy(),failed={...makeInscription(s,{name:'Wrong Name',targetId:target,faceKnown:true}),id:'failed',swipe:0,offset:0};
 chat[0].extra[INSCRIPTIONS]=[failed];chat[0].extra[RESULTS]=[{requestId:'failed',status:'ineffective',swipe:0,offset:0}];
 const [r]=recoverPaperResults(chat,s);assert.equal(r.requestIndex,1);assert.equal(r.resultIndex,3);assert.equal(r.requests[0].name,'Kurou Otoharada');assert.equal(r.results[0].status,'resolved');
 chat[1].extra[INSCRIPTIONS]=r.requests.map(q=>({...q,swipe:0,offset:0}));chat[3].extra[RESULTS]=r.results.map(q=>({...q,swipe:0,offset:0}));
 assert.deepEqual(ledger(chat).map(r=>r.status),['ineffective','resolved']);assert.deepEqual(recoverPaperResults(chat,s),[]);
 assert.equal(ledger(chat.slice(0,2)).length,1);assert.equal(ledger(chat.slice(0,3))[1].status,'waiting');
 assert.equal(readPaper(chat,'book').pages[0].blocks[0].text,'Kurou Otoharada ตายกระทันหัน');
});
test('legacy recovery rejects future ink, changed User turns, unknown faces, and prose without a saved request',()=>{
 const s=state();for(const change of [chat=>chat[2].mes+=' changed',chat=>delete chat[1].extra[PAPER],chat=>chat[1].mes='ชื่อ Kurou Otoharada ไม่มีภาพใบหน้า',chat=>chat[3].mes='Kurou Otoharada เสียชีวิต']){const chat=legacy();change(chat);assert.deepEqual(recoverPaperResults(chat,s),[]);}
 const chat=legacy();assert.deepEqual(recoverPaperResults(chat.slice(0,2),s),[]);assert.deepEqual(recoverPaperResults(chat.slice(0,3),s),[]);
});
