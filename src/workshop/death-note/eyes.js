import {playerLifeDeadline,deadlineValue} from './lifespan.js?v=0.85.2';
import {eyeAbility,isHuman,isShinigami,actorKey} from './actors.js?v=0.85.2';
import {faceKnowledge} from './faces.js?v=0.85.2';
import {trueNameOf} from './names.js?v=0.85.2';
const safeKey=id=>typeof id==='string'&&id.length<180&&!['__proto__','prototype','constructor'].includes(id);
export function originalLifespan(state,npcId,language='th',world={}){
 if(!safeKey(npcId))return null;const v=state.deathNoteRules?.originalLifespans?.[npcId]||world.originalLifespans?.[npcId];if(!v||typeof v!=='object'||Array.isArray(v))return null;
 const time=String(v.time||'');if(!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(time))return null;
 const day=Number.isSafeInteger(v.day)&&v.day>0&&v.day<=10000000?v.day:null;let date='';
 if(typeof v.date==='string'&&/^\d{4}-\d{2}-\d{2}$/u.test(v.date)){const check=new Date(v.date+'T00:00:00Z');if(!Number.isNaN(check.getTime())&&check.toISOString().slice(0,10)===v.date)date=v.date;}
 if(!day&&!date)return null;return {day,date,time,source:v.source==='simulation'?'simulation':'authored',text:(date||(language==='en'?'Day ':'วันที่ ')+day)+' · '+time};
}
export function eyeInsight(world,npc,state,language='th',viewerId='player'){
 const viewer=viewerId==='player'?{race:'Human'}:(state.npcs||[]).find(n=>n.id===viewerId),ability=eyeAbility(world,viewerId);
 const human=isHuman(npc),living=npc.stats?.hp!==0&&!/^(dead|deceased|เสียชีวิต)$/iu.test(npc.activity||'');
 const face=viewerId==='player'?faceKnowledge(world,npc,state).known:Boolean(world.actorFaces?.[viewerId]?.[npc.id]||state.deathNoteRules?.actorKnownFaces?.[viewerId]?.[npc.id]);
 if((!ability.active&&!isShinigami(viewer))||!face||!human||!living||npc.id===viewerId)return null;
 const trueName=trueNameOf(state,npc);if(!trueName)return null;
 const owner=!isShinigami(viewer)&&Object.values(world.books).some(b=>b.ownerId===npc.id),playerDeadline=npc.id==='player'?deadlineValue(playerLifeDeadline(world,state)):null,candidate=owner?null:playerDeadline?{...playerDeadline,source:world.playerLifespan?.source||originalLifespan(state,'player',language,world)?.source||'authored',text:(language==='en'?'Day ':'วันที่ ')+playerDeadline.day+' · '+playerDeadline.time}:originalLifespan(state,npc.id,language,world),original=candidate?.source==='simulation'&&world.settings?.lifespanMode!=='simulated'?null:candidate;
 return {trueName,lifespan:original?.text||'',lifespanSource:original?.source||'',lifespanReason:owner?'owner':original?'original':'unknown'};
}
export function lifespanSeconds(value){if(!value?.day)return null;const [h,m,s=0]=value.time.split(':').map(Number);return (value.day-1)*86400+h*3600+m*60+s;}
export function eyeLifeCost(world,state,actorId='player'){const [h=0,m=0,s=0]=String(state.worldClock?.time||'00:00').split(':').map(Number),at=(Math.max(1,Number(state.worldClock?.day)||1)-1)*86400+h*3600+m*60+s;const before=(actorId==='player'?playerLifeDeadline(world,state):null)??world.lifeDeadlines?.[actorId]??(actorId==='player'?world.lifeDeadlineSeconds:undefined)??lifespanSeconds(originalLifespan(state,actorId,'th',world));if(!Number.isFinite(before)||before<=at)return null;return {at,before,deadline:at+Math.floor((before-at)/2)};}

// A generated deadline is recorded once in this branch. It is a game value,
// never presented as an authored/canonical prediction and never rerolled by UI.
export function simulatedLifespan(actorId,state,seed=''){
 if(!actorKey(actorId))return null;let hash=2166136261;
 for(const char of seed+'::'+actorId){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}
 const day=Math.max(1,Number(state.worldClock?.day)||1)+365*(12+hash%64)+hash%365;
 const h=(hash>>>9)%24,m=(hash>>>17)%60;
 return {day,time:String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'),source:'simulation'};
}
