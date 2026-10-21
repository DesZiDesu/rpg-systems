import {faceKnowledge} from './faces.js?v=0.82.0';
import {trueNameOf} from './names.js?v=0.82.0';
const safeKey=id=>typeof id==='string'&&id.length<180&&!['__proto__','prototype','constructor'].includes(id);
export function originalLifespan(state,npcId,language='th'){
 if(!safeKey(npcId))return null;const v=state.deathNoteRules?.originalLifespans?.[npcId];if(!v||typeof v!=='object'||Array.isArray(v))return null;
 const time=String(v.time||'');if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(time))return null;
 const day=Number.isSafeInteger(v.day)&&v.day>0&&v.day<=10000000?v.day:null;let date='';
 if(typeof v.date==='string'&&/^\d{4}-\d{2}-\d{2}$/u.test(v.date)){const check=new Date(v.date+'T00:00:00Z');if(!Number.isNaN(check.getTime())&&check.toISOString().slice(0,10)===v.date)date=v.date;}
 if(!day&&!date)return null;return {day,date,time,text:(date||(language==='en'?'Day ':'วันที่ ')+day)+' · '+time};
}
export function eyeInsight(world,npc,state,language='th'){
 const human=/^(human|มนุษย์)$/iu.test(String(npc.race||'')),living=npc.stats?.hp!==0&&!/^(dead|deceased|เสียชีวิต)$/iu.test(npc.activity||'');
 if(!world.eyes||world.memoryLost||npc.met!==true||!faceKnowledge(world,npc,state).known||!human||!living||npc.id==='player')return null;
 const trueName=trueNameOf(state,npc);if(!trueName)return null;
 const owner=Object.values(world.books).some(b=>b.ownerId===npc.id),original=owner?null:originalLifespan(state,npc.id,language);
 return {trueName,lifespan:original?.text||'',lifespanReason:owner?'owner':original?'original':'unknown'};
}
export function lifespanSeconds(value){if(!value?.day)return null;const [h,m,s=0]=value.time.split(':').map(Number);return (value.day-1)*86400+h*3600+m*60+s;}
export function eyeLifeCost(world,state){const [h=0,m=0,s=0]=String(state.worldClock?.time||'00:00').split(':').map(Number),at=(Math.max(1,Number(state.worldClock?.day)||1)-1)*86400+h*3600+m*60+s;const before=world.lifeDeadlineSeconds??lifespanSeconds(originalLifespan(state,'player'));if(!Number.isFinite(before)||before<=at)return null;return {at,before,deadline:at+Math.floor((before-at)/2)};}
