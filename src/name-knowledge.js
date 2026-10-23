import {resolveNpcSpeaker} from './npc-core.js?v=0.85.2';
// Directed knowledge: A knowing B's name never implies B knows A, or that C
// knows either name. These maps belong to the observer's shared identity.
const blocked=new Set(['__proto__','constructor','prototype']);
export function normalizeKnownNames(value){return Object.fromEntries(Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{}).filter(([id,known])=>id&&id.length<=120&&!blocked.has(id)&&typeof known==='boolean'));}
// relationship is explicitly relative to the player. Only established close
// relationships with a met person supply prior familiarity; a profession,
// affinity score, shared scene or generic "friend" label is not enough.
const familiarRelation=/^(?:mother|mom|mum|father|dad|parent|parents|biological mother|biological father|adoptive mother|adoptive father|stepmother|stepfather|sister|brother|sibling|daughter|son|child|grandmother|grandfather|grandparent|wife|husband|spouse|childhood friend|lifelong friend|best friend|แม่|มารดา|แม่แท้ๆ|แม่บุญธรรม|แม่เลี้ยง|พ่อ|บิดา|พ่อแท้ๆ|พ่อบุญธรรม|พ่อเลี้ยง|พ่อแม่|พี่สาว|น้องสาว|พี่ชาย|น้องชาย|พี่น้อง|ลูกสาว|ลูกชาย|ลูก|ย่า|ยาย|ปู่|ตา|ภรรยา|สามี|คู่สมรส|เพื่อนวัยเด็ก|เพื่อนสมัยเด็ก|เพื่อนสนิท)$/iu;
export function priorNameKnowledge(state,observerId,subjectId){
 if(observerId===subjectId)return {known:true,source:'self'};
 const observer=observerId==='player'?state.player:state.npcs?.find(n=>n.id===observerId),declared=observer?.knownNames;
 if(declared&&typeof declared==='object'&&!Array.isArray(declared)&&!blocked.has(subjectId)&&Object.hasOwn(declared,subjectId)&&typeof declared[subjectId]==='boolean')return {known:declared[subjectId],source:'explicit'};
 const relative=observerId==='player'?state.npcs?.find(n=>n.id===subjectId):subjectId==='player'?observer:null;
 if(relative?.met===true&&familiarRelation.test(String(relative.relationship||'').normalize('NFKC').trim()))return {known:true,source:'familiar'};
 return {known:false,source:'unknown'};
}
export function knowsName(state,observerId,subjectId){
 return priorNameKnowledge(state,observerId,subjectId).known;
}
export function nameLabel(state,subjectId,{observerId='player',language='en'}={}){
 const subject=subjectId==='player'?state.player:state.npcs?.find(n=>n.id===subjectId);
 if(!subject)return language==='th'?'ไม่ทราบชื่อ':'Unknown name';
 return knowsName(state,observerId,subjectId)?subject.name:subject.occupation||subject.title||(language==='th'?'คนที่ยังไม่รู้ชื่อ':'Unknown person');
}
const escaped=s=>String(s).replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
function introduction(text,name,{selfOnly=false}={}){
 const source=String(text||'').normalize('NFKC'),target=escaped(String(name||'').normalize('NFKC').trim());if(!target)return false;
 if(/\(\(|\bOOC\s*:|\[OOC|\*|(?:สมมติ|ถ้า|ยังไม่|ไม่ได้|อย่า|กำลังจะ).{0,35}(?:ชื่อ|แนะนำ)|\b(?:if|pretend|would|will|not|don't)\b.{0,35}(?:\b(?:name|introduc\w*|called)\b|\bI(?: am|'m|’m)\b)|ล้อเล่น|แกล้ง|just kidding/iu.test(source))return false;
 const firstPerson=String.raw`my name is|call me|I(?: am|'m|’m)|I am named|I am called|ชื่อ(?:ของ)?(?:ฉัน|ผม|ข้า|เรา|หนู|กระผม|ดิฉัน)(?:คือ)?|(?:ฉัน|ผม|ข้า|เรา|หนู|กระผม|ดิฉัน)ชื่อ`;
 const disclosure=selfOnly?'':String.raw`|(?:his|her|their) name is|ชื่อ(?:ว่า|คือ)?|named|called`;
 return new RegExp(`(?:${firstPerson}${disclosure})\\s*["“‘']?${target}(?:(?=(?:ครับ|ค่ะ|คะ|นะ|จ้ะ|จ้า|เอง)(?:$|[\\s,.!?ฯ]))|(?![\\p{L}\\p{N}_]))`,'iu').test(source);
}
export function applyNameKnowledge(state,events,{story='',user='',participants=[],userName=state.player?.name,speeches=[]}={}){
 let next=state,actors=new Map([['player',state.player],...(state.npcs||[]).map(n=>[n.id,n])]),changed=false;const present=new Set(['player',...participants]);
 const publicText=String(story||'').replace(/<[^>]*>/gu,' '),userText=String(user||'').replace(/<[^>]*>/gu,' ');
 const proposals=Array.isArray(events)?events.slice(0,100):[];
 for(const speech of [{speakerId:'player',text:userText},...speeches]){
  const subject=actors.get(speech.speakerId);if(!subject||!present.has(speech.speakerId)||!introduction(speech.text,speech.speakerId==='player'?userName:subject.name,{selfOnly:true}))continue;
  const quote=String(speech.text).trim();if(!quote||quote.length>1000)continue;
  for(const listener of present)if(listener!==speech.speakerId)proposals.push({observerId:listener,subjectId:speech.speakerId,knownName:true,evidence:quote});
 }
 for(const e of proposals){
  const observer=actors.get(e?.observerId),subject=actors.get(e?.subjectId),quote=typeof e?.evidence==='string'?e.evidence.trim():'';
  if(!observer||!subject||observer===subject||e.knownName!==true||observer.enabled===false||!present.has(e.observerId)||!quote||quote.length>1000)continue;
  const name=e.subjectId==='player'?userName:subject.name;
  const normalize=s=>s.replace(/\s+/gu,' ').trim();
  if(!normalize(publicText).includes(normalize(quote))&&!normalize(userText).includes(normalize(quote)))continue;
  if(!introduction(quote,name))continue;
  if(knowsName(state,e.observerId,e.subjectId))continue;
  if(!changed){next=structuredClone(state);actors=new Map([['player',next.player],...(next.npcs||[]).map(n=>[n.id,n])]);changed=true;}
  const recipient=actors.get(e.observerId);recipient.knownNames={...normalizeKnownNames(recipient.knownNames),[e.subjectId]:true};
 }
 return{next:changed?next:state,changed};
}
export function nameKnowledgeReference(state,subjects=state.npcs||[]){
 const ids=new Set(['player',...subjects.map(n=>n.id)]);
 const reference=(id,actor)=>{const knownNames=Object.fromEntries(Object.entries(normalizeKnownNames(actor?.knownNames)).filter(([key])=>ids.has(key)));
  for(const subject of id==='player'?subjects.map(n=>n.id):['player'])if(subject!==id&&!Object.hasOwn(knownNames,subject)&&knowsName(state,id,subject))knownNames[subject]=true;
  return {id,knownNames};};
 return[reference('player',state.player),...subjects.map(n=>reference(n.id,n))];
}
export function guardNameDialogue(text,speaker,state){
 const actor=resolveNpcSpeaker(state.npcs||[],speaker)||{id:'__unknown_speaker',name:String(speaker||''),knownNames:{}};
 const self=new Set([actor.name,...actor.aliases||[]].map(s=>String(s).normalize('NFKC').toLocaleLowerCase())),thai=/[ก-๙]/u.test(text);let guarded=String(text||'');
 for(const subject of [{...state.player,id:'player'},...state.npcs||[]]){
  if(knowsName(state,actor.id,subject.id))continue;
  for(const name of [subject.name,...subject.aliases||[]].filter(Boolean).sort((a,b)=>b.length-a.length)){
   if(self.has(String(name).normalize('NFKC').toLocaleLowerCase())||Array.from(name).length<2)continue;
   const latin=/^[\p{Script=Latin}\p{N}\s.'’_-]+$/u.test(name),thaiName=/[\p{Script=Thai}]/u.test(name),edge=latin||thaiName?'[A-Za-z0-9_]':'[\\p{L}\\p{N}_]',honorific=thai?'(?:นางสาว|คุณ|ท่าน|นาย|นาง|น้อง|พี่)?':'';
   const pattern=new RegExp('(?<!'+edge+')'+honorific+escaped(name)+'(?!'+edge+')','giu'),replacement=subject.id==='player'?(thai?'คุณ':'you'):(thai?'คนนั้น':'that person');
   guarded=guarded.split(/(<[^>]+>)/gu).map((part,i)=>i%2?part:part.replace(pattern,replacement)).join('');
  }
 }
 return guarded;
}
export function guardTaggedNameDialogue(source,state){return String(source||'').replace(/(<tr-dialogue\b[^>]*\bname=(?:"([^"]+)"|'([^']+)')[^>]*>)([\s\S]*?)(<\/tr-dialogue>|(?=<tr-(?:header|narrative|dialogue)\b)|$)/giu,(_,open,doubleName,singleName,body,close)=>open+guardNameDialogue(body,doubleName||singleName,state)+close);}
export const NAME_KNOWLEDGE_INSTRUCTIONS='KNOWN NAME / DIRECTED KNOWLEDGE: nameKnowledge lists each observer and their knownNames map keyed by subject id (player means the player). The supplied knownNames maps include explicit knowledge and established prior familiarity with a met close relative, spouse or longstanding childhood/best friend. Such people do not need to introduce themselves again. Self is known; absent/false otherwise means unknown. Explicit false overrides inferred familiarity. This applies to player->NPC, NPC->player, and NPC->NPC separately. Dossiers, hidden names, headers, met/enabled alone, an occupation, generic friendship, transfers, shared scenes, party/guild membership and knowing a third person never grant names. While false, use a visible role, description or neutral form of address rather than the subject\'s proper name in that observer\'s speech, thoughts and viewpoint. An explicit introduction, name disclosure or readable name in the visible scene may teach listeners. Emit nameKnowledgeEvents:[{observerId,subjectId,knownName:true,evidence:"exact visible or latest user introduction/name disclosure quote"}] separately for each actual listener. Include the exact disclosed subject name in the quote. Merely greeting someone by name or mentioning a private dossier is not evidence of learning it. Never edit knownNames through NPC upserts/scalar ops. Preserve manual user choices and do not grant off-scene observers knowledge.';
