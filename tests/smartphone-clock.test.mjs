import test from 'node:test';
import assert from 'node:assert/strict';
import {advancePhoneClock,phoneActionMinutes,phoneReplyMinutes} from '../src/workshop/smartphone/clock.js';
import {blankPhone,phoneConfig} from '../src/workshop/smartphone/model.js';
import {changePhone} from '../src/workshop/smartphone/engine.js';
import {mergePhoneReply,phoneTask,phoneWorldPrompt} from '../src/workshop/smartphone/ai.js';
const cfg=phoneConfig();
function fixture(){
 const state={player:{name:'Mael'},npcs:[{id:'riley',name:'Riley'}],worldClock:{day:4,dayName:'Monday',time:'15:20',phase:'Afternoon'}};
 let p=changePhone(blankPhone(),{type:'contact-save',contact:{label:'Riley',number:'090-1',npcId:'riley'}}).phone;
 p=changePhone(p,{type:'thread-open',contactId:p.contacts[0].id}).phone;
 p=changePhone(p,{type:'message-send',threadId:p.threads[0].id,text:'See you tonight at 10 PM.'},{time:{day:4,time:'15:21'}}).phone;
 return {state,p,reply:(text='See you then!',extra={})=>({type:'message',contactId:p.contacts[0].id,threadId:p.threads[0].id,requestId:p.pending[0].id,text,...extra})};
}
test('phone typing duration stays modest and does not enact plans mentioned in dialogue',()=>{
 for(const text of ['See you tomorrow at 10 PM','I slept for eight hours','เดินทางพรุ่งนี้นะ','คืนนี้เจอกัน'])assert.equal(phoneActionMinutes({type:'message-send',text}),1);
 assert.equal(phoneActionMinutes({type:'message-send',text:'x'.repeat(400)}),2);
 assert.equal(phoneActionMinutes({type:'call-speech',text:'x'.repeat(1300)}),3);
 for(const type of ['draft','read','profile-save','message-edit','call-state'])assert.equal(phoneActionMinutes({type,text:'hello'}),0);
 assert.equal(phoneActionMinutes({type:'call-speech',from:'riley',text:'hi'}),0);
});
test('shared phone clock rolls over days, phases and English/Thai weekdays without mutating its input',()=>{
 for(const [dayName,next] of [['Monday','Tuesday'],['วันจันทร์','วันอังคาร'],['Day 4','Day 5']]){
  const state={worldClock:{day:4,dayName,time:'23:59',phase:'Night'}};
  assert.deepEqual(advancePhoneClock(state,2).worldClock,{day:5,dayName:next,time:'00:01',phase:'Night'});assert.equal(state.worldClock.time,'23:59');
 }
 assert.equal(advancePhoneClock({worldClock:{day:1,time:'16:59'}},2).worldClock.phase,'Evening');
 assert.equal(advancePhoneClock({worldClock:{day:1,time:'04:59'}},1).worldClock.phase,'Morning');
 const state={worldClock:{time:'--:--'}};assert.equal(advancePhoneClock(state,1),state);
});
test('accepted standalone bubbles advance the same clock and receive sequential timestamps',()=>{
 const {p,state,reply}=fixture();const result=mergePhoneReply(p,state,{events:[reply('Hello',{elapsedMinutes:1}),reply('A longer reply',{elapsedMinutes:2}),reply('Tonight at 10 PM',{elapsedMinutes:1})]},cfg,{requests:p.pending,source:'timed',advanceTime:true});
 assert.equal(result.state.worldClock.time,'15:24');assert.deepEqual(result.phone.messages.slice(-3).map(m=>m.time.time),['15:21','15:23','15:24']);assert.equal(result.phone.pending.length,0);assert.equal(state.worldClock.time,'15:20');
 const again=mergePhoneReply(result.phone,result.state,{events:[reply('Hello',{elapsedMinutes:1})]},cfg,{requests:[],source:'timed',advanceTime:true});assert.equal(again.state.worldClock.time,'15:24');assert.equal(again.phone.messages.length,result.phone.messages.length);
});
test('old model replies without timing still advance; invalid or blocked events and empty retries do not',()=>{
 const {p,state,reply}=fixture();assert.equal(mergePhoneReply(p,state,{events:[reply()]},cfg,{requests:p.pending,advanceTime:true}).state.worldClock.time,'15:21');
 for(const events of [[],[reply('',{elapsedMinutes:9})],[reply('Bad request',{requestId:'made-up',elapsedMinutes:9})]])assert.equal(mergePhoneReply(p,state,{events},cfg,{requests:p.pending,advanceTime:true}).state.worldClock.time,'15:20');
 p.contacts[0].blocked=true;assert.equal(mergePhoneReply(p,state,{events:[reply()]},cfg,{requests:p.pending,advanceTime:true}).state.worldClock.time,'15:20');
 for(const value of [-50,0,Infinity,NaN,'999',undefined])assert(phoneReplyMinutes({type:'message',elapsedMinutes:value})>=1);
 assert.equal(phoneReplyMinutes({type:'message',elapsedMinutes:999999}),10);
});
test('main-chat events and historical recovery never count time twice or obey absolute model clocks',()=>{
 const {p,state,reply}=fixture();const result=mergePhoneReply(p,state,{worldClock:{day:99,time:'23:00'},events:[reply('Tomorrow at 10 PM',{elapsedMinutes:10})]},cfg,{requests:p.pending,time:{day:4,time:'15:20'}});
 assert.equal(result.state.worldClock.time,'15:20');assert.equal(result.state.worldClock.day,4);assert.equal(result.phone.messages.at(-1).time.time,'15:20');
});
test('phone prompts share the clock and timestamped exchanges while retaining private-thread boundaries',()=>{
 const {p,state}=fixture();const prompt=phoneWorldPrompt(p,state,cfg);assert.match(prompt,/15:20/);assert.match(prompt,/15:21/);assert.match(prompt,/See you tonight/);assert.match(prompt,/not other private threads/);
 const task=phoneTask(p,state,cfg,p.pending);assert.match(task.systemPrompt,/elapsedMinutes/);assert.match(task.systemPrompt,/future appointment/);assert.match(task.prompt,/15:21/);
});
test('exaggerated model delays are bounded while each accepted bubble still advances time',()=>{
 const {p,state,reply}=fixture(),events=Array.from({length:6},(_,i)=>reply('Message '+i,{elapsedMinutes:999999}));
 const result=mergePhoneReply(p,state,{events},cfg,{requests:p.pending,advanceTime:true});
 assert.equal(result.state.worldClock.time,'15:50');const times=result.phone.messages.slice(-6).map(m=>m.time.time);for(let i=1;i<times.length;i++)assert(times[i]>times[i-1]);
});
