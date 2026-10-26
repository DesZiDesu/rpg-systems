import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileRelationshipTurn,recoverRelationshipEvents} from '../src/relationship-tracking.js';
import {relationshipLink,normalizeRelationships,editRelationship} from '../src/relationship-core.js';
import {hStats} from '../src/h-stats.js';
import {blankPhone,phoneConfig,normalizePhone} from '../src/workshop/smartphone/model.js';
import {changePhone} from '../src/workshop/smartphone/engine.js';
import {mergePhoneReply,phoneTask} from '../src/workshop/smartphone/ai.js';
import {applyPhoneRelationships,phoneRelationshipRows,recoverPhoneRelationships} from '../src/workshop/smartphone/relationships.js';
const cfg=phoneConfig(),base=()=>({player:{name:'Jino',age:'25',hStats:hStats()},npcs:[{id:'riley',name:'Riley',age:'27',met:true,enabled:true,affection:0,trust:10,loyalty:0,hStats:hStats()},{id:'sam',name:'Sam',age:'28',enabled:true,hStats:hStats()}],worldClock:{day:1,dayName:'Day 1',time:'08:00',phase:'Morning'},location:{place:'Home'},relationships:normalizeRelationships()});
const apply=(state,story,extra={})=>reconcileRelationshipTurn(state,extra.events||[],{story,participants:['riley'],source:'turn:'+story,...extra});
function phoneFixture(){let p=changePhone(blankPhone(),{type:'contact-save',contact:{label:'Riley 🎨',number:'090-1',npcId:'riley'}}).phone;p=changePhone(p,{type:'thread-open',contactId:p.contacts[0].id}).phone;return p;}
test('prose-only emotional changes recover without requiring an AI event block',()=>{
 for(const story of ['Riley trusts Jino more.','<tr-dialogue name="Riley">I trust you.</tr-dialogue>','<tr-header name="Riley"/><tr-narrative>She trusts you more.</tr-narrative>','ไรลีย์ไว้ใจคุณมากขึ้น']){
  const state=base();if(story.startsWith('ไรลีย์'))state.npcs[0].aliases=['ไรลีย์'];const result=apply(state,story);assert.equal(relationshipLink(result.next,'riley','player').trust,11,story);assert.equal(result.recovered,1);
 }
});
test('names emitted in place of IDs resolve only when unambiguous and do not apply twice with recovery',()=>{
 const story='Riley trusts Jino more.',event={actorId:'Riley',targetId:'Jino',kind:'support',evidence:story,changes:{trust:2}};
 const result=apply(base(),story,{events:[event]});assert.equal(relationshipLink(result.next,'riley','player').trust,12);assert.equal(result.recovered,0);
 const again=apply(result.next,story,{events:[event]});assert.equal(relationshipLink(again.next,'riley','player').trust,12);
});
test('feelings do not grow from neutral chat, requests, questions, negation, fantasy or ambiguous groups',()=>{
 for(const story of ['Riley and Jino discuss the weather.','<tr-dialogue name="Riley">Can you trust me?</tr-dialogue>','Riley will trust Jino.','Riley does not trust Jino.','If Riley loves Jino.','Riley imagined loving Jino.','<tr-dialogue name="Riley">I trust you.</tr-dialogue>']){
  const result=apply(base(),story,{participants:story.includes('<tr-dialogue')?['riley','sam']:['riley']});assert.equal(result.changed,0,story);
 }
});
test('explicit loss of affection and attraction can decrease instead of being filtered unconditionally',()=>{
 const s=editRelationship(base(),{actorId:'riley',targetId:'player',values:{love:10,interest:10,trust:10}});
 let result=apply(s,'<tr-dialogue name="Riley">I no longer love you.</tr-dialogue>');assert.equal(relationshipLink(result.next,'riley','player').love,9);
 result=apply(result.next,'<tr-dialogue name="Riley">I am no longer attracted to you.</tr-dialogue>');assert.equal(relationshipLink(result.next,'riley','player').interest,9);
});
test('diminishing gains retain fractions, remain paced and expose the scene cap in history',()=>{
 let s=base();s=apply(s,'Riley trusts Jino more.',{source:'first'}).next;s=apply(s,'Riley trusts Jino more.',{source:'second'}).next;assert.equal(relationshipLink(s,'riley','player').trust,11.5);
 for(let i=0;i<100;i++)s=apply(s,'Riley trusts Jino more.',{source:'repeat-'+i}).next;
 assert(relationshipLink(s,'riley','player').trust<=13);assert(s.relationships.history.some(h=>h.reason==='scene_limit'));
});
test('direct phone metadata and plain delivered feelings update the same RPG graph',()=>{
 let phone=phoneFixture(),s=base();phone=changePhone(phone,{type:'message-send',threadId:phone.threads[0].id,text:'How are you?'}).phone;
 const q=phone.pending[0],reply={events:[{type:'message',contactId:phone.contacts[0].id,threadId:q.threadId,requestId:q.id,text:'I trust you.'}]};
 const result=mergePhoneReply(phone,s,reply,cfg,{requests:phone.pending,source:'phone-1',advanceTime:true});assert.equal(relationshipLink(result.state,'riley','player').trust,11);assert.equal(result.phone.relationshipSync.checks[0].reason,'updated');assert.equal(result.state.worldClock.time,'08:01');
 const prompt=phoneTask(phone,s,cfg,phone.pending);assert.match(prompt.systemPrompt,/relationshipEvents/);assert.match(prompt.prompt,/"relationships"/);
});
test('100 actual phone deliveries advance confirmed feelings across scenes without changing physical counters',()=>{
 let phone=phoneFixture(),s=base();
 for(let i=0;i<100;i++){
  if(i===34)s.worldClock.time='14:00';if(i===67)s.worldClock.time='20:00';
  phone=changePhone(phone,{type:'message-send',threadId:phone.threads[0].id,text:'Message '+i},{time:{day:1,time:s.worldClock.time}}).phone;const q=phone.pending.at(-1);
  const text=i<34?'I trust you, Jino.':i<67?'I feel attracted to you, Jino.':'I love you, Jino.';
  const result=mergePhoneReply(phone,s,{events:[{type:'message',contactId:phone.contacts[0].id,threadId:q.threadId,requestId:q.id,text}]},cfg,{requests:[q],source:'phone-100-'+i,advanceTime:true});phone=result.phone;s=result.state;
 }
 const link=relationshipLink(s,'riley','player');assert(link.trust>10);assert(link.interest>0);assert(link.love>0);assert.equal(phone.messages.length,200);assert.equal(link.encounters,0);assert.deepEqual(s.player.hStats,base().player.hStats);
});
test('phone claims, sexting and forged relationship metadata cannot count as a physical encounter or another NPC feeling',()=>{
 const phone=phoneFixture(),s=base(),c=phone.contacts[0],text='Riley and Jino had an intimate encounter.';
 const result=mergePhoneReply(phone,s,{events:[{type:'message',contactId:c.id,text}],relationshipEvents:[{actorId:'riley',targetId:'player',kind:'intimacy',evidence:text,hStats:[{ownerId:'player',field:'oralSexCount',verb:'inc',value:1}]},{actorId:'sam',targetId:'player',kind:'support',evidence:'I trust you',changes:{trust:10}}]},cfg,{source:'remote'});
 assert.equal(relationshipLink(result.state,'riley','player').encounters,0);assert.equal(relationshipLink(result.state,'sam','player').trust,null);assert.deepEqual(result.state.player.hStats,s.player.hStats);
});
test('tracking off and blocked delivery cannot advance phone relationships',()=>{
 const p=phoneFixture(),s=base(),events=[{type:'message',contactId:p.contacts[0].id,text:'I trust you.'}];
 assert.equal(relationshipLink(mergePhoneReply(p,s,{events},cfg,{trackRelationships:false}).state,'riley','player').trust,10);p.contacts[0].blocked=true;assert.equal(relationshipLink(mergePhoneReply(p,s,{events},cfg).state,'riley','player').trust,10);
});
test('legacy saved phone messages recover once, preserve current time and manual edits, and stay branch bounded',()=>{
 const p=phoneFixture(),s=base();p.relationshipRoutingVersion=0;p.messages=[{id:'old-1',threadId:p.threads[0].id,from:p.contacts[0].id,text:'I trust you.',time:{day:1,time:'08:00'}},{id:'future',threadId:p.threads[0].id,from:p.contacts[0].id,text:'I love you.',deleted:true,time:{day:2,time:'09:00'}}];s.worldClock.time='20:00';
 const result=recoverPhoneRelationships(normalizePhone(p),s);assert.equal(relationshipLink(result.state,'riley','player').trust,11);assert.equal(result.state.worldClock.time,'20:00');assert.equal(relationshipLink(result.state,'riley','player').love,0);assert.equal(result.phone.relationshipRoutingVersion,1);
 const again=recoverPhoneRelationships(result.phone,result.state);assert.equal(again.state,result.state);
 const manual=editRelationship(s,{actorId:'riley',targetId:'player',values:{trust:80}});assert.equal(relationshipLink(recoverPhoneRelationships(p,manual).state,'riley','player').trust,80);
});
test('completed visible encounters recover without counting spoken, imagined, continuing or remote claims',()=>{
 const positive=apply(base(),'Riley and Jino shared a consensual kiss.');assert.equal(relationshipLink(positive.next,'riley','player').encounters,1);assert.equal(relationshipLink(positive.next,'player','riley').encounters,1);assert.equal(positive.next.relationships.history[0].reason,'');assert.deepEqual(positive.next.player.hStats,base().player.hStats);
 for(const story of ['If Riley kissed Jino.','Riley imagined she kissed Jino.','Riley continues kissing Jino.','<tr-dialogue name="Riley">I kissed Jino.</tr-dialogue>'])assert.equal(relationshipLink(apply(base(),story).next,'riley','player').encounters,0,story);
 const text='Riley and Jino shared a consensual kiss.';assert.equal(relationshipLink(apply(base(),text,{recoverBody:false}).next,'riley','player').encounters,0);
});
test('AI-proposed gradual attraction can use an actual reaction without a literal love declaration',()=>{
 const story='You make me blush, Jino.',event={actorId:'riley',targetId:'player',kind:'romance',evidence:story,changes:{interest:1}};
 const result=reconcileRelationshipTurn(base(),[event],{story,participants:['riley'],exchanges:[{speakerId:'riley',targetId:'player',text:story}],source:'reaction'});assert.equal(relationshipLink(result.next,'riley','player').interest,1);
});
test('a phone call applies delivered speech feelings and does not count physical claims',()=>{
 let p=phoneFixture();p=changePhone(p,{type:'call-start',contactId:p.contacts[0].id}).phone;let q=p.pending[0];let result=mergePhoneReply(p,base(),{events:[{type:'call-result',contactId:q.contactId,callId:q.callId,requestId:q.id,status:'connected'}]},cfg,{requests:[q],source:'call-start'});p=result.phone;p=changePhone(p,{type:'call-speech',callId:q.callId,from:'player',text:'How do you feel?'}).phone;q=p.pending.at(-1);
 result=mergePhoneReply(p,result.state,{events:[{type:'call-speech',contactId:q.contactId,callId:q.callId,requestId:q.id,text:'I trust you.'}]},cfg,{requests:[q],source:'call-reply'});assert.equal(relationshipLink(result.state,'riley','player').trust,11);
});
test('phone hearsay cannot change another NPC feeling and possessive relatives do not mean the player',()=>{
 const p=phoneFixture(),s=base(),contactId=p.contacts[0].id;
 for(const text of ['I heard Sam trusts you.','Sam trusts Jino.','I trust your brother.','ฉันไว้ใจแม่ของคุณ']){
  const r=mergePhoneReply(p,s,{events:[{type:'message',contactId,text}]},cfg,{source:'reported-'+text});assert.equal(relationshipLink(r.state,'riley','player').trust,10,text);assert.equal(relationshipLink(r.state,'sam','player').trust,null,text);
 }
});
test('fictional NPC thoughts may establish feelings but cannot create an imagined physical encounter',()=>{
 const thought='<tr-thought name="Riley">I trust Jino more.</tr-thought>';assert.equal(relationshipLink(apply(base(),thought).next,'riley','player').trust,11);
 const story='<tr-thought name="Riley">I kissed Jino.</tr-thought>',event={actorId:'riley',targetId:'player',kind:'intimacy',evidence:'I kissed Jino.'};assert.equal(relationshipLink(apply(base(),story,{events:[event]}).next,'riley','player').encounters,0);
});
test('player private thought bars cannot create a physical encounter',()=>{
 const state=base(),text='|Riley and Jino shared a consensual kiss.|',r=reconcileRelationshipTurn(state,[],{story:'Riley waits.',user:text,participants:['riley'],source:'thought-bars'});assert.equal(relationshipLink(r.next,'riley','player').encounters,0);
});

test('main-chat call transcripts share the main relationship source and cannot apply a feeling twice',()=>{
 let phone=phoneFixture();phone=changePhone(phone,{type:'call-start',contactId:phone.contacts[0].id}).phone;phone=changePhone(phone,{type:'call-state',callId:phone.calls[0].id,status:'connected'}).phone;const call=phone.calls[0],story='<tr-dialogue name="Riley">I trust you, Jino.</tr-dialogue>',source='shared-main-call';
 const main=apply(base(),story,{source}),next=changePhone(phone,{type:'call-speech',callId:call.id,from:phone.contacts[0].id,text:'I trust you, Jino.'}).phone;
 const once=applyPhoneRelationships(base(),next,phoneRelationshipRows(next,phone),{source});assert.equal(relationshipLink(once.state,'riley','player').trust,11);
 const twice=applyPhoneRelationships(main.next,next,phoneRelationshipRows(next,phone),{source});assert.equal(relationshipLink(twice.state,'riley','player').trust,11);assert.equal(twice.state.relationships.history.length,1);
});
