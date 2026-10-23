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
// Knowledge guides the model and identity interfaces; it never rewrites prose.
export const NAME_KNOWLEDGE_INSTRUCTIONS=`KNOWN NAME / DIRECTED KNOWLEDGE: nameKnowledge lists recorded knowledge by observer and subject id (player means the player). Each observer is independent. Explicit true/false entries and established roleplay govern that character's knowledge; inferred maps include met close relatives, spouses and longstanding childhood/best friends who need no new introduction. An absent NPC-to-NPC entry is unrecorded knowledge, not proof that canon partners or established acquaintances do not know one another. Use established story and canon relationships naturally; Light may call Ryuk by name in their own scene even if the player has not learned it. Keep dialogue, narration, thoughts and cutaways natural. Do not mechanically replace names with "that person", "you" or ??? just because a record is missing. When a character genuinely does not know a name, choose a natural address appropriate to the scene and respect explicit unknown choices. Reader knowledge is not player-character knowledge: a name in narration, a dialogue/header attribute or an off-scene conversation does not teach the player. Never grant names, faces or private information to an absent observer. Actual introductions, readable documents and disclosures heard by that observer may teach a name. Emit nameKnowledgeEvents:[{observerId,subjectId,knownName:true,evidence:"exact witnessed introduction or disclosure quote"}] separately for each actual listener. Include the disclosed subject name in the quote. Merely addressing someone by name is not evidence of learning it. Preserve manual settings; never edit knownNames through NPC upserts/scalar ops. Dossiers, met/enabled alone, occupations, affection and shared group membership do not grant player name knowledge. Unknown-name interface labels and notebook name/face eligibility are separate from how prose is displayed.`;
