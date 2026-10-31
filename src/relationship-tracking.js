import {applyRelationshipEvents,relationshipPeople} from './relationship-core.js?v=0.97.0';
import {parseStory} from './npc-core.js?v=0.97.0';

const key=v=>String(v||'').normalize('NFKC').toLocaleLowerCase().trim();
const aliases=(p,id,userName)=>[p?.name,...p?.aliases||[],...(id==='player'?[userName,...String(userName||'').split(/\s*[\/|]\s*/u)]:[])].filter(v=>typeof v==='string'&&v.trim());
const first=/^\s*[*“"'\s]*(?:I\b|I'm\b|I've\b|ฉัน|ผม|เรา|หนู|ข้า|ดิฉัน)/iu;
const third=/^\s*[*“"'\s]*(?:she\b|he\b|they\b|เธอ|เขา|หล่อน)/iu;
const second=/\byou(?:r|rs|rself)?\b|คุณ|เธอ|นาย/iu;
const cues=[
 ['conflict','trust',-1,/\b(?:no longer trust\w*|lost (?:my |her |his |their )?trust|don['’]t trust|doesn['’]t trust)\b|ไม่(?:เชื่อใจ|เชื่อมั่น|ไว้ใจ|ไว้วางใจ)|หมด(?:ความ)?(?:เชื่อใจ|ไว้ใจ)/iu],
 ['conflict','interest',-1,/\b(?:no longer (?:attracted|interested)|lost interest|not attracted)\b|เลิกสนใจ|หมดความสนใจ|ไม่สนใจอีก/iu],
 ['conflict','love',-1,/\b(?:no longer love\w*|stopped loving|lost (?:her |his |their |my )?feelings)\b|หมดรัก|เลิกรัก|ไม่รักอีก/iu],
 ['support','trust',1,/\b(?:trust(?:s|ed|ing)?|confid(?:e|es|ed)|open(?:s|ed)? up)\b|ไว้ใจ|ไว้วางใจ|เชื่อใจ|เชื่อมั่น|เปิดใจ/iu],
 ['romance','interest',1,/\b(?:attracted|attraction|crush on|drawn to|romantically interested)\b|หลงใหล|เสน่หา|หวั่นไหว|ตกหลุมรัก/iu],
 ['romance','love',1,/\b(?:love(?:s|d)?|loving|fond of|affection for|feels? closer to|felt closer to)\b|ผูกพัน|รัก|คิดถึง/iu],
 ['promise','commitment',1,/\b(?:kept|honou?red|fulfilled) (?:my |her |his |their |the |a )?(?:promise|word)|stayed faithful\b|รักษา(?:คำ)?สัญญา|ทำตามคำมั่น/iu],
];
function occurrence(name,text){
 const needle=key(name),hay=key(text);let at=hay.indexOf(needle),found=-1;
 while(at>=0){if(!/[a-z0-9]/u.test(needle[0])||(!/[a-z0-9]/u.test(hay[at-1]||'')&&!/[a-z0-9]/u.test(hay[at+needle.length]||'')))found=at;at=hay.indexOf(needle,at+1);}return found;
}

export function recoverRelationshipEvents(state,{story='',user='',userName=state.player?.name,participants=[],exchanges=[],recoverBody=true}={}){
 const people=relationshipPeople(state),names=new Map([...people].map(([id,p])=>[id,aliases(p,id,userName)]));
 const resolve=name=>{if(people.has(name))return name;const ids=[...names].filter(([,list])=>list.some(v=>key(v)===key(name))).map(([id])=>id);return ids.length===1?ids[0]:'';};
 const candidates=[];
 const rows=[];
 for(const row of exchanges)if(people.has(row.speakerId))rows.push({text:row.text,speaker:row.speakerId,target:row.targetId||'',own:row.speakerId==='player'});
 for(const [source,own]of [[story,false],[user,true]]){
  let header='';for(const block of parseStory(source)||[{type:'plain',text:source}]){
   if(block.type==='header'){header=resolve(block.name);continue;}
   rows.push({type:block.type,text:block.text,speaker:own?'player':['dialogue','thought'].includes(block.type)?resolve(block.name):'',target:own&&participants.length===1?participants[0]:'',own,narrator:!own&&participants.length===1&&participants[0]===header?header:''});
  }
 }
 const seen=new Set();
 for(const block of rows)for(const match of String(block.text||'').slice(0,40000).matchAll(/[^.!?。\n]+[.!?。]?/gu)){
  const evidence=match[0].trim();if(!evidence||evidence.length>1500)continue;
  if(recoverBody&&['plain','narrative'].includes(block.type)&&!/[|"“”]/u.test(evidence)&&!/\b(?:said|says|told|claims?|texted|messaged|wrote|imagined|continue[sd]?|still|yesterday|previously|recalled|remembered|earlier|last night)\b|พูด|บอก|เล่าว่า|อ้างว่า|จินตนาการ|ยังคง|เมื่อวาน|คืนก่อน|ก่อนหน้านี้|เคย|จำได้/iu.test(evidence)&&/\b(?:kiss(?:ed|es)?|had (?:consensual )?(?:sex|intercourse)|shared (?:a |an )?(?:consensual )?(?:kiss|intimate encounter))\b|จูบ|ร่วมรัก|มีเพศสัมพันธ์/iu.test(evidence)){
   const pair=[...names].filter(([,list])=>list.some(n=>occurrence(n,evidence)>=0)).map(([id])=>id);
   if(pair.length===2){const actorId=pair.find(id=>id!=='player')||pair[0],targetId=pair.find(id=>id!==actorId);candidates.push({actorId,targetId,kind:'intimacy',evidence,changes:{}});}
  }

  for(const [kind,metric,amount,cue]of cues){
   const hit=cue.exec(evidence);if(!hit)continue;
   if(amount>0&&cues.some(([k,m,n,re])=>m===metric&&n<0&&re.test(evidence)))continue;
   const before=evidence.slice(0,hit.index),after=evidence.slice(hit.index+hit[0].length);
   if(/\b(?:heard|said|says|told|claims?|reported|read)\b|ได้ยิน|บอกว่า|เล่าว่า|อ่านว่า|อ้างว่า/iu.test(before))continue;
   if(/\b(?:imagined|dream(?:s|ed|ing)? of|fantasiz(?:e|ed|ing)|pretended)\b|จินตนาการ|เพ้อฝัน|สมมติ/iu.test(before))continue;
   let actorId=block.speaker&&first.test(evidence)?block.speaker:block.narrator&&third.test(evidence)?block.narrator:'';
   if(!actorId){const subjects=[...names].map(([id,list])=>({id,at:Math.max(-1,...list.map(n=>occurrence(n,before)))})).filter(v=>v.at>=0).sort((a,b)=>b.at-a.at);actorId=subjects[0]?.id||'';}
   if(!actorId||actorId==='player'&&!block.own)continue;
   const targets=[...names].filter(([id,list])=>id!==actorId&&list.some(n=>occurrence(n,after)>=0)).map(([id])=>id);
   let targetId=targets.length===1?targets[0]:'';
   if(!targets.length&&second.test(after)&&!/\byour\s+(?:mother|father|brother|sister|friend|partner|wife|husband|boss|colleague)\b|(?:แม่|พ่อ|พี่|น้อง|เพื่อน|แฟน|สามี|ภรรยา)(?:ของ)?คุณ/iu.test(after))targetId=block.target||(actorId!=='player'&&(!block.speaker||participants.length===1&&participants[0]===block.speaker)?'player':'');
   if(!targetId||actorId===targetId)continue;
   const signature=JSON.stringify([actorId,targetId,kind,metric,evidence]);if(seen.has(signature))continue;seen.add(signature);
   candidates.push({actorId,targetId,kind,evidence,changes:{[metric]:amount},...(kind==='promise'?{milestone:'kept_promise'}:kind==='support'&&/confid|open(?:s|ed)? up|เปิดใจ|ความลับ/iu.test(evidence)?{milestone:'openness'}:{})});
  }
 }
 return candidates.slice(0,100);
}

export function reconcileRelationshipTurn(state,raw,options={}){
 const people=relationshipPeople(state),userName=options.userName||state.player?.name;
 const resolve=value=>{if(people.has(value))return value;const matches=[...people].filter(([id,p])=>aliases(p,id,userName).some(v=>key(v)===key(value))).map(([id])=>id);return matches.length===1?matches[0]:value;};
 const proposed=(Array.isArray(raw)?raw:[]).map(e=>e&&typeof e==='object'?{...e,actorId:resolve(e.actorId),targetId:resolve(e.targetId)}:e);
 const allowed=e=>!Array.isArray(options.allowedActors)||options.allowedActors.includes(e?.actorId);
 const explicit=applyRelationshipEvents(state,proposed.filter(allowed),options),history=explicit.next.relationships?.history||[];
 const recovered=recoverRelationshipEvents(explicit.next,options).filter(allowed).filter(e=>!history.some(h=>h.source===String(options.source||'').slice(0,200)&&h.actorId===e.actorId&&h.targetId===e.targetId&&h.kind===e.kind&&Object.hasOwn(h.changes||{},Object.keys(e.changes)[0])));
 const fallback=applyRelationshipEvents(explicit.next,recovered,options);
 return {next:fallback.next,changed:explicit.changed+fallback.changed,errors:explicit.errors,diagnostics:[...explicit.diagnostics,...fallback.diagnostics],proposed:proposed.length,recovered:fallback.changed};
}
