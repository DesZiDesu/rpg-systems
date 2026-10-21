import test from 'node:test';
import assert from 'node:assert/strict';
import {worldState,storyEvents,perceivedName,playerIdentity} from '../src/workshop/death-note/world.js';
import {faceKnowledge} from '../src/workshop/death-note/faces.js';
import {eligibleTarget,ledger,replyAnchor,INSCRIPTIONS,RESULTS,continuationInstruction} from '../src/workshop/death-note/core.js';
import {blankPaper,nextPaper,paperInputs,paperRows,readPaper,PAPER} from '../src/workshop/death-note/paper.js';
import {stageWrittenPaper} from '../src/workshop/death-note/deferred.js';
const state=()=>({inventory:[{id:'book',name:'Death Note',quantity:1}],worldClock:{day:1,time:'12:00'},deathNoteRules:{knownFaces:{suspect:false},trueNames:{suspect:'Elias Voss'}},npcs:[{id:'suspect',name:'Elias Voss',aliases:['อีเลียส วอสส์'],title:'ชายสวมเสื้อคลุม',race:'Human',met:false,enabled:false,stats:{hp:100}},{id:'mara',name:'Mara Hale',race:'Human',met:false,stats:{hp:100}}]});
const message=mes=>({mes,is_user:false,extra:{}});
const news='คุณเปิดข่าวอ่าน รายงานระบุชื่อคนร้ายว่า Elias Voss และแสดงภาพถ่ายใบหน้าของเขาให้คุณเห็นชัดเจน';
const english='You read the news report identifying the suspect as Elias Voss. His clear photograph shows his face on the screen.';
const paper=(text='Elias Voss')=>{const p=blankPaper();p.pages[0].blocks=[{id:'ink',text,x:.1,y:.1,size:24,submittedText:''}];return p;};
for(const [lang,quote]of [['Thai',news],['English',english],['Thai alias','คุณอ่านข่าวที่ระบุชื่อ อีเลียส วอสส์ พร้อมภาพถ่ายใบหน้าให้เห็นชัดเจน']])test(`${lang} news teaches a reported name and photographed face without a physical meeting`,()=>{
 const s=state(),before=JSON.stringify(s),w=worldState([message('<tr-narrative>'+quote+'</tr-narrative>')],s);
 assert.notEqual(perceivedName(w,s.npcs[0]),'???');assert.equal(faceKnowledge(w,s.npcs[0],s).known,true);
 const input=paperInputs(paper(),s,w)[0].input;assert.equal(eligibleTarget(s,input).ok,true);assert.equal(s.npcs[0].met,false);assert.equal(s.npcs[0].enabled,false);assert.equal(JSON.stringify(s),before);
});
test('existing chats recover news knowledge from their visible prefix, without needing a new protocol',()=>{
 const s=state(),m=message(news);assert.equal(perceivedName(worldState([m],s),s.npcs[0]),'Elias Voss');
 m.mes='คุณยังไม่ได้เปิดข่าว';assert.equal(perceivedName(worldState([m],s),s.npcs[0]),'???');
 assert.equal(faceKnowledge(worldState([],s),s.npcs[0],s).known,false);
});
test('explicit completed player news reading can establish knowledge but a plan cannot',()=>{
 const s=state(),w=worldState([{is_user:true,mes:news}],s);assert.equal(perceivedName(w,s.npcs[0]),'Elias Voss');assert(faceKnowledge(w,s.npcs[0],s).known);
 assert.equal(perceivedName(worldState([{is_user:true,mes:'ถ้าฉันเปิดข่าวอ่าน รายงานระบุชื่อ Elias Voss และเห็นใบหน้า'}],s),s.npcs[0]),'???');
});
test('an explicitly remembered name and face or an actual third-party disclosure is accepted',()=>{
 const s=state(),w=worldState([{is_user:true,mes:'ฉันรู้ชื่อและหน้าตาของ Elias Voss แล้ว'}],s);
 assert.equal(perceivedName(w,s.npcs[0]),'Elias Voss');assert(faceKnowledge(w,s.npcs[0],s).known);
 for(const evidence of ['เจ้าหน้าที่บอกคุณว่าชายสวมเสื้อคลุมชื่อ Adrian Grey','The officer tells you the cloaked man is named Adrian Grey.']){
  s.npcs[0].title=evidence.startsWith('The')?'cloaked man':'ชายสวมเสื้อคลุม';
  const source=evidence+'<!--roleforge_death_note_world:'+JSON.stringify({events:[{type:'name-learned',npcId:'suspect',claimedName:'Adrian Grey',evidence}]})+'-->';
  assert.equal(perceivedName(worldState([message(source)],s),s.npcs[0]),'Adrian Grey');
 }
});
test('name-only news does not grant a face; a clear face without a disclosure does not grant a name',()=>{
 const s=state(),w=worldState([message('คุณอ่านข่าวที่ระบุชื่อ Elias Voss')],s);assert.equal(perceivedName(w,s.npcs[0]),'Elias Voss');assert.equal(faceKnowledge(w,s.npcs[0],s).known,false);
 const face=worldState([message('ชายสวมเสื้อคลุมเผยใบหน้าให้คุณเห็นชัดเจน')],s);assert(faceKnowledge(face,s.npcs[0],s).known);assert.equal(perceivedName(face,s.npcs[0]),'???');
});
test('blurred, masked, unseen, future and hidden photographs do not unlock a face',()=>{
 for(const quote of ['คุณอ่านข่าวที่ระบุชื่อ Elias Voss แต่ภาพถ่ายใบหน้าเบลอ','คุณยังไม่เห็นใบหน้าของ Elias Voss','You will see a clear photograph of Elias Voss.','You cannot see the face of Elias Voss.','<think>'+news+'</think>','<!--'+news+'-->'])assert.equal(faceKnowledge(worldState([message(quote)],state()),state().npcs[0],state()).known,false,quote);
});
test('a false name in an evidenced report is stored as a claim and never rewrites the private name',()=>{
 const s=state(),evidence='คุณอ่านข่าวที่ระบุว่าชายสวมเสื้อคลุมชื่อ Adrian Grey พร้อมภาพถ่ายใบหน้าให้เห็นชัดเจน',source=evidence+'<!--roleforge_death_note_world:'+JSON.stringify({events:[{type:'name-learned',npcId:'suspect',claimedName:'Adrian Grey',evidence}]})+'-->',w=worldState([message(source)],s);
 assert.equal(perceivedName(w,s.npcs[0]),'Adrian Grey');const input=paperInputs(paper('Adrian Grey'),s,w)[0].input;assert.equal(eligibleTarget(s,input).validName,false);assert.equal(s.npcs[0].name,'Elias Voss');
});
test('unbound protocol, unrelated face and library labels cannot disclose identity',()=>{
 const s=state(),evidence='คุณอ่านข่าวที่ระบุชื่อ Elias Voss';const source=evidence+'<!--roleforge_death_note_world:'+JSON.stringify({events:[{type:'name-learned',npcId:'mara',claimedName:'Elias Voss',evidence},{type:'face-seen',npcId:'mara',evidence}]})+'-->';
 const w=worldState([message(source)],s);assert.equal(perceivedName(w,s.npcs[1]),'???');assert.equal(faceKnowledge(w,s.npcs[1],s).known,false);
 assert.deepEqual(storyEvents('<tr-header name="Elias Voss"></tr-header><tr-narrative>A quiet room.</tr-narrative>',s),[]);
});
test('Shinigami eyes can read a witnessed photograph without met=true and still require face evidence',()=>{
 const s=state(),w=worldState([message(news)],s);w.eyes=true;assert.equal(playerIdentity(w,s.npcs[0],s).sight.trueName,'Elias Voss');delete w.faces.suspect;assert.equal(playerIdentity(w,s.npcs[0],s).sight,null);
});
test('new ink can stage the next normal reply without generating or appending any chat message',()=>{
 const s=state(),chat=[message(news),{is_user:true,mes:'ฉันรอดูข่าวต่อ'}],w=worldState(chat,s),before=JSON.stringify(chat),staged=stageWrittenPaper(paper(),s,w,[],'book');
 assert.equal(staged.requests.length,1);assert.equal(staged.requests[0].trigger,'next-reply');assert.equal(staged.requests[0].validName,true);assert.equal(staged.requests[0].delaySeconds,40);assert.equal(staged.paper.pages[0].blocks[0].submittedText,'Elias Voss');assert.equal(JSON.stringify(chat),before);
 assert.match(continuationInstruction(staged.requests[0],{pending:true}),/normal reply, answer the actual latest User turn/);
});
test('all written pages can wait, and moving submitted ink or retrying a waiting request cannot duplicate it',()=>{
 const s=state(),w=worldState([message(news)],s),p=nextPaper(paper()),first=stageWrittenPaper(p,s,w);assert.equal(first.requests.length,1);assert.equal(first.paper.active,1);
 first.paper.pages[0].blocks[0].x=.5;first.paper.pages[0].blocks[0].size=32;
 assert.equal(stageWrittenPaper(first.paper,s,w,first.requests.map(r=>({...r,status:'waiting'}))).requests.length,0);
 const copy=paper();assert.equal(stageWrittenPaper(copy,s,w,first.requests.map(r=>({...r,status:'resolved'}))).requests.length,0);
});
test('unseen faces stay unsubmitted and become eligible after a later actual face witness',()=>{
 const s=state(),p=paper(),stage=stageWrittenPaper(p,s,worldState([],s));assert.equal(stage.requests.length,0);assert(stage.errors[0].includes('ใบหน้า'));assert.equal(stage.paper.pages[0].blocks[0].submittedText,'');
 assert.equal(stageWrittenPaper(stage.paper,s,worldState([message(news)],s)).requests.length,1);
});
test('a shared block does not lose a second name whose face is learned later',()=>{
 const s=state(),w=worldState([message(news)],s),p=paper('Elias Voss\nMara Hale'),first=stageWrittenPaper(p,s,w);
 assert.equal(first.requests.length,1);assert.equal(first.paper.pages[0].blocks[0].submittedText,'');
 w.faces.mara={evidence:'You see the face of Mara Hale clearly.'};
 const second=stageWrittenPaper(first.paper,s,w,first.requests.map(r=>({...r,status:'waiting'})));
 assert.equal(second.requests.length,1);assert.equal(second.requests[0].targetId,'mara');assert.equal(second.paper.pages[0].blocks[0].submittedText,p.pages[0].blocks[0].text);
});
test('a completed wrong-name attempt in a partially submitted block is not silently retried',()=>{
 const s=state(),w=worldState([message(news)],s);w.claims.suspect={name:'Adrian Grey'};
 const first=stageWrittenPaper(paper('Adrian Grey\nMara Hale'),s,w);assert.equal(first.requests.length,1);assert.equal(first.requests[0].validName,false);
 const records=first.requests.map(r=>({...r,status:'ineffective'}));assert.equal(stageWrittenPaper(first.paper,s,w,records).requests.length,0);
 w.faces.mara={evidence:'Her face is seen clearly.'};const second=stageWrittenPaper(first.paper,s,w,records);assert.equal(second.requests.length,1);assert.equal(second.requests[0].targetId,'mara');
});
test('ordinary notes, erased ink, ambiguous names and lack of possession do not create requests',()=>{
 const s=state(),w=worldState([message(news)],s);assert.equal(stageWrittenPaper(paper('Notes about the case'),s,w).requests.length,0);assert.equal(stageWrittenPaper(blankPaper(),s,w).requests.length,0);
 s.npcs.push({...s.npcs[0],id:'duplicate'});assert.equal(stageWrittenPaper(paper(),s,w).requests.length,0);
 s.npcs.pop();s.inventory=[];assert.equal(stageWrittenPaper(paper(),s,w).requests.length,0);
});
test('paper and staged journal restore only their chat prefix and selected swipe',()=>{
 const s=state(),w=worldState([message(news)],s),stage=stageWrittenPaper(paper(),s,w),m=message(news);
 m.extra[INSCRIPTIONS]=stage.requests.map(r=>({...r,offset:news.length,swipe:0}));m.extra[PAPER]=paperRows(m,'book',stage.paper);
 assert.equal(ledger([m]).length,1);assert.equal(readPaper([m],'book').pages[0].blocks[0].submittedText,'Elias Voss');m.swipe_id=1;assert.equal(ledger([m]).length,0);assert.equal(readPaper([m],'book').pages[0].blocks.length,0);assert.equal(ledger([]).length,0);
});
test('a deferred request and its submitted ink require the actual Send, not just the preceding assistant',()=>{
 const s=state(),m=message(news),chat=[m,{is_user:true,mes:'ฉันรู้ชื่อและหน้าตาของ Elias Voss แล้ว ฉันรอดูข่าวต่อ'}],sourceTurn=replyAnchor(chat),p=paper(),stage=stageWrittenPaper(p,s,worldState(chat,s));
 m.extra[PAPER]=paperRows(m,'book',p);
 m.extra[PAPER]=paperRows(m,'book',stage.paper,{sourceTurn});
 m.extra[INSCRIPTIONS]=stage.requests.map(r=>({...r,sourceTurn,swipe:0,offset:news.length}));
 assert.equal(ledger(chat).length,1);assert.equal(readPaper(chat,'book').pages[0].blocks[0].submittedText,'Elias Voss');
 assert.equal(ledger([m]).length,0);assert.equal(readPaper([m],'book').pages[0].blocks[0].submittedText,'');
 chat[1].mes='ข้อความที่ถูกแก้แล้ว';assert.equal(ledger(chat).length,0);assert.equal(readPaper(chat,'book').pages[0].blocks[0].submittedText,'');
 assert.equal(replyAnchor([m]),null);
});
