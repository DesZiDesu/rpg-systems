// Story-clock life accounting. Nothing here runs a real-time death timer.
const DAY=86400,MAX=10000000*DAY;
export function clockSeconds(clock={}){
 if(!clock||typeof clock!=='object'||Array.isArray(clock))return null;
 const day=Number(clock.day??1),time=String(clock.time??'00:00');
 if(!Number.isSafeInteger(day)||day<1||day>10000000||!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(time))return null;
 const [h,m,s=0]=time.split(':').map(Number);return (day-1)*DAY+h*3600+m*60+s;
}
export function deadlineValue(seconds){
 if(!Number.isSafeInteger(seconds)||seconds<0||seconds>=MAX)return null;
 const day=Math.floor(seconds/DAY)+1,rest=seconds%DAY,h=Math.floor(rest/3600),m=Math.floor(rest%3600/60),s=rest%60;
 return {day,time:[h,m,s].map(v=>String(v).padStart(2,'0')).join(':')};
}
function baseline(w,state){const value=w.playerLifespan?.natural||state.deathNoteRules?.originalLifespans?.player||w.originalLifespans?.player;return value&&typeof value==='object'&&!Array.isArray(value)&&((Number.isSafeInteger(value.day)&&value.day>0)||typeof value.date==='string')&&typeof value.time==='string'?value:null;}
function paidDeadline(w,natural,defaultAt){
 if(w.playerLifeBargains?.length){let deadline=natural;for(const bargain of w.playerLifeBargains){const at=bargain.at??defaultAt;if(at!==null)deadline=at+Math.floor(Math.max(0,deadline-at)/2);}return deadline;}
 const fraction=w.lifeFractions?.player??w.lifespanFraction??1;
 return fraction<1&&defaultAt!==null?defaultAt+Math.floor(Math.max(0,natural-defaultAt)*fraction):natural;
}
export function playerLifeDeadline(w,state){
 const saved=w.lifeDeadlines?.player??w.lifeDeadlineSeconds;
 if(Number.isSafeInteger(saved)&&saved>=0&&saved<MAX)return saved;
 const natural=clockSeconds(baseline(w,state)?.day?baseline(w,state):{day:0});if(natural===null)return null;
 // Legacy bargains with no authored deadline still retain their paid fraction.
 const at=w.playerLifespan?.at??clockSeconds(state.worldClock);
 return paidDeadline(w,natural,at);
}
export function lifeDuration(seconds,language='th'){
 const th=language!=='en';let days=Math.floor(Math.max(0,seconds)/DAY);const years=Math.floor(days/365);days%=365;
 const hours=Math.floor(Math.max(0,seconds)%DAY/3600),minutes=Math.floor(Math.max(0,seconds)%3600/60);
 return years||days?[years?years+(th?' ปี':' yr'):'',days?days+(th?' วัน':' d'):''].filter(Boolean).join(' '):hours?hours+(th?' ชม.':' h')+' '+minutes+(th?' นาที':' min'):minutes+(th?' นาที':' min');
}
// A display choice never rewrites the authored deadline or bargain accounting.
// Calendar-only dates have no implicit relationship to the story-day counter.
export function lifespanDisplay(value,storyClock,language='th',format='story'){
 const th=language!=='en',raw=value?.text||((value?.date||(value?.day?(th?'วันที่ ':'Day ')+value.day:''))+(value?.time?' · '+value.time:''));
 if(!raw)return {text:'',detail:'',remainingSeconds:null};
 const now=clockSeconds(storyClock||{day:0}),deadline=clockSeconds(value?.day?value:{day:0}),known=now!==null&&deadline!==null;
 const remaining=known?Math.max(0,deadline-now):null;
 const human=known?(th?'เหลือ ':'Remaining ')+lifeDuration(remaining,language):raw;
 const current=now!==null?(th?'วันที่ ':'Day ')+storyClock.day+' · '+storyClock.time:'';
 const detail=known?(th?'กำหนดเดิม: ':'Original deadline: ')+raw+'; '+(th?'นาฬิกาในเรื่อง: ':'Story clock: ')+current+'; '+(th?'เวลาที่เหลือ = กำหนดเดิม − เวลาในเรื่อง (365 วัน = 1 ปี)':'Remaining time = original deadline − story time (365 days = 1 year)'):
  (th?'กำหนดเดิม: ':'Original deadline: ')+raw+'; '+(th?'ยังแปลงเป็นเวลาที่เหลือไม่ได้ เพราะไม่มีวันอ้างอิงในนาฬิกาเรื่อง':'Remaining time needs a matching story-day reference');
 return {text:format==='human'?human:format==='both'&&known?human+' · '+raw:raw,detail,remainingSeconds:remaining};
}
export function playerLifespanInfo(w,state,language='th'){
 const now=clockSeconds(state.worldClock),deadline=playerLifeDeadline(w,state),natural=baseline(w,state),naturalSeconds=clockSeconds(natural?.day?natural:{day:0}),value=deadlineValue(deadline),th=language!=='en';
 const label=v=>v?(th?'วันที่ ':'Day ')+v.day+' · '+v.time:'—';
 return {known:deadline!==null&&now!==null,remainingSeconds:deadline!==null&&now!==null?Math.max(0,deadline-now):null,
 remaining:deadline!==null&&now!==null?lifeDuration(deadline-now,language):(th?'ยังไม่กำหนด':'Not established'),
 deadline:value,deadlineText:label(value),natural,naturalText:naturalSeconds!==null?label(natural):natural?.date?natural.date+' · '+natural.time:'—',
 source:w.playerLifespan?.source||(natural?.source==='simulation'?'simulation':natural?'authored':'unknown'),
 fraction:w.lifeFractions?.player??w.lifespanFraction??1,locked:w.playerLifespan?.locked===true,
 allowAI:w.playerLifespan?.allowAI!==false,at:now};
}
export function playerLifespanEvent(form,w,state){
 const now=clockSeconds(state.worldClock);if(now===null)throw Error('Invalid story clock / เวลาในเรื่องไม่ถูกต้อง');
 if(form.get('mode')==='preferences')return {type:'player-lifespan-preferences',allowAI:form.has('allowAI'),locked:form.has('locked')};
 const years=Number(form.get('years')),days=Number(form.get('days')),hours=Number(form.get('hours')||0),minutes=Number(form.get('minutes')||0);
 if(![years,days,hours,minutes].every(Number.isSafeInteger)||years<0||years>20000||days<0||days>364||hours<0||hours>23||minutes<0||minutes>59)throw Error('Enter valid remaining time / ระบุเวลาที่เหลือให้ถูกต้อง');
 const remaining=((years*365+days)*24+hours)*3600+minutes*60,deadline=now+remaining;
 if(remaining<=0||!deadlineValue(deadline))throw Error('Remaining lifespan must be positive / อายุขัยต้องมากกว่า 0');
 return {type:'player-lifespan',source:'manual',at:now,deadline,allowAI:form.has('allowAI'),locked:form.has('locked')};
}
export function aiLifespanEvent(e){
 if(e.type!=='player-lifespan'||e.actorId!=='player'||![e.value,e.recordedClock].every(v=>v&&Number.isSafeInteger(v.day)&&typeof v.time==='string'))return null;
 const deadline=clockSeconds(e.value||{day:0}),at=clockSeconds(e.recordedClock||{day:0});
 if(deadline===null||at===null||deadline<=at)return null;
 return {type:'player-lifespan',source:'ai',actorId:'player',at,deadline};
}
export function applyPlayerLifespan(w,e,state={}){
 if(e.type==='player-lifespan-preferences'){
  w.playerLifespan={...w.playerLifespan,allowAI:e.allowAI!==false,locked:e.locked===true};return true;
 }
 if(e.type!=='player-lifespan')return false;
 if(!['manual','ai'].includes(e.source)||!deadlineValue(e.deadline)||!Number.isSafeInteger(e.at)||e.at<0||e.deadline<=e.at)return true;
 if(e.source==='ai'&&(w.playerLifespan?.locked||w.playerLifespan?.allowAI===false||playerLifeDeadline(w,state)!==null||baseline(w,state)))return true;
 const first=playerLifeDeadline(w,state)===null,natural=baseline(w,state)||deadlineValue(e.deadline);
 w.playerLifespan={...w.playerLifespan,natural,at:e.at,source:e.source,...(e.source==='manual'?{locked:e.locked===true,allowAI:e.allowAI!==false}:{})};
 w.originalLifespans||={};w.originalLifespans.player=natural;
 // AI establishes a natural baseline; unpaid initialization cannot undo deals.
 (w.lifeDeadlines||={}).player=e.source==='ai'&&first?paidDeadline(w,e.deadline,e.at):e.deadline;
 w.lifeDeadlineSeconds=w.lifeDeadlines.player;return true;
}
export function lifespanInstruction(w,state){
 const info=playerLifespanInfo(w,state,'en');
 return ' PLAYER LIFESPAN (private author data): '+JSON.stringify({...info,storyClock:state.worldClock})+'. Status is out-of-character information; it grants no character knowledge or eye power. '+
 (!info.known&&!baseline(w,state)&&info.allowAI&&!info.locked?'Establish one plausible natural lifespan for the player on this reply using the private WORLD event {type:"player-lifespan",actorId:"player",value:{day:positiveStoryDeadlineDay,time:"HH:MM"},recordedClock:{day:currentStoryDay,time:"HH:MM"}}. This initial author fact needs no visible disclosure. Use story days, not a calendar year; choose a future natural deadline consistent with age/species/story. Never announce it through an NPC without that NPC independently qualifying to read it. ':'')+
 'Never overwrite an established or locked player lifespan with another initial event. Story time reduces remaining life; eye bargains halve current remaining life and never reset it. A notebook alone grants NO eyes. A human with active eyes must see the face, cannot read their own lifespan or the lifespan of a human notebook RIGHTS owner. Shinigami may read human owners. A nonowner player can be read by a qualified NPC; this is private to that viewer. Lifespan expiry alone does not authorize an automatic HP/death patch. 365 story days are one displayed year.';
}
