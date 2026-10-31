import {confirmedPlayerPickup} from './pickup.js?v=0.94.1';
import {actorKey,isShinigami,isHuman,EYE_SOURCES,loseFinalRights,syncPlayerEyes,eyeAbility,defaultDeathNoteSettings} from './actors.js?v=0.94.1';
import {sha256} from '../../vendor/js-sha256/index.js?v=0.94.1';
export function applyNotebookEvent(w,e){
 const b=w.books[e.bookId];
 // Later witnessed ownership can identify an already-known physical book.
 // It cannot replace a conflicting owner or silently move a held notebook.
 if(e.type==='register'&&b&&e.source==='visible-notebook'&&e.knownToPlayer===true){
  b.knownToPlayer=true;
  if(e.ownerKnownToPlayer===true&&actorKey(e.ownerId)&&(b.ownerId===e.ownerId||!b.ownerId&&b.holderId===e.holderId)){
   b.ownerId=e.ownerId;b.firstHumanOwnerId||=e.ownerId;b.ownerKnownToPlayer=true;
  }
  return true;
 }
 if(e.type==='ability-knowledge'&&actorKey(e.actorId)){(w.knownAbilities||={})[e.actorId]=e.knownToPlayer===true;return true;}
 if(e.type==='settings'){w.settings=defaultDeathNoteSettings({...w.settings,...e.settings});return true;}
 if(e.type==='eye-ability'&&actorKey(e.actorId)&&EYE_SOURCES.includes(e.source)&&e.source!=='deal'){
  (w.actorEyes||={})[e.actorId]={source:e.source};(w.knownAbilities||={})[e.actorId]=e.knownToPlayer===true;syncPlayerEyes(w);return true;
 }
 if(e.type==='lifespan-record'&&actorKey(e.actorId)&&e.value&&typeof e.value==='object'){
  w.originalLifespans||={};if(!w.originalLifespans[e.actorId])w.originalLifespans[e.actorId]={...e.value,source:'simulation'};return true;
 }
 if(e.type==='actor-face-seen'&&actorKey(e.actorId)&&actorKey(e.npcId)){
  w.actorFaces||={};(w.actorFaces[e.actorId]||={})[e.npcId]={evidence:e.evidence||''};return true;
 }
 if(e.type==='shinigami-exchange'){
  const other=w.books[e.otherBookId];if(!b||!other||b.id===other.id||!b.currentShinigamiId||!other.currentShinigamiId||e.fromShinigamiId!==b.currentShinigamiId||e.toShinigamiId!==other.currentShinigamiId)return true;
  [b.currentShinigamiId,other.currentShinigamiId]=[other.currentShinigamiId,b.currentShinigamiId];
  // The exchange protocol specifies whether attendants move with ownership.
  if(e.exchangeAttachment===true)[b.attachedShinigamiId,other.attachedShinigamiId]=[other.attachedShinigamiId,b.attachedShinigamiId];
  b.knownToPlayer=true;other.knownToPlayer=true;return true;
 }
 if(e.type==='configure-book'&&b){for(const key of ['originalShinigamiId','currentShinigamiId','attachedShinigamiId'])if(e[key]===''||actorKey(e[key]))b[key]=e[key];return true;}
 if(e.type==='shinigami-transfer'&&b&&b.currentShinigamiId===e.fromShinigamiId&&actorKey(e.toShinigamiId)){b.currentShinigamiId=e.toShinigamiId;if(e.transferAttachment===true)b.attachedShinigamiId=e.toShinigamiId;return true;}
 if(e.type==='attach-shinigami'&&b&&actorKey(e.shinigamiId)){b.attachedShinigamiId=e.shinigamiId;return true;}
 if(e.type==='acquire'&&b&&!b.holderId&&actorKey(e.actorId)&&e.actorId!=='player'){
  const claimed=!b.ownerId;(w.actorMemoryLost||={})[e.actorId]=false;b.holderId=e.actorId;if(!b.ownerId){b.ownerId=e.actorId;b.firstHumanOwnerId||=e.actorId;}if(!b.touchedBy.includes(e.actorId))b.touchedBy.push(e.actorId);b.location='';b.knownToPlayer=true;if(claimed)b.ownerKnownToPlayer=true;return true;
 }
 if(e.type==='rights-transfer'&&b&&b.ownerId===e.fromId&&e.fromId!=='player'&&actorKey(e.toId)){
  b.ownerId=e.toId;b.ownerKnownToPlayer=true;b.firstHumanOwnerId||=e.toId;b.knownToPlayer=true;loseFinalRights(w,e.fromId);return true;
 }
 if(e.type==='npc-relinquish'&&b&&b.ownerId===e.actorId&&e.actorId!=='player'){
  b.ownerKnownToPlayer=true;b.ownerId=b.holderId!==e.actorId?b.holderId:'';if(b.holderId===e.actorId){b.holderId='';b.location=e.location||'';}loseFinalRights(w,e.actorId);b.knownToPlayer=true;return true;
 }
 if(e.type==='npc-drop'&&b&&b.holderId===e.actorId&&e.actorId!=='player'){b.holderId='';b.location=e.location||'';b.knownToPlayer=true;return true;}
 if(e.type==='npc-eye-deal'&&b&&b.ownerId===e.actorId&&b.attachedShinigamiId&&e.shinigamiId===b.attachedShinigamiId&&b.touchedBy.includes(e.actorId)&&!eyeAbility(w,e.actorId).active){
  (w.actorMemoryLost||={})[e.actorId]=false;(w.actorEyes||={})[e.actorId]={source:'deal'};(w.lifeFractions||={})[e.actorId]=(w.lifeFractions[e.actorId]??1)/2;
  if(Number.isFinite(e.lifeCost?.deadline))(w.lifeDeadlines||={})[e.actorId]=e.lifeCost.deadline;
  (w.knownAbilities||={})[e.actorId]=true;return true;
 }
 return false;
}
const visible=s=>String(s||'').replace(/<!--[\s\S]*?-->/gu,'').replace(/<[^>]+>/gu,' ').replace(/\s+/gu,' ').trim();
const negated=s=>/ยังไม่|ไม่ได้|ไม่ยอม|ไม่เคย|กำลังจะ|อาจจะ|สมมติ|หาก|\b(?:not|never|will|would|if|plans? to)\b/iu.test(s);
// These are proposals from the visible story, not authority from private lore.
export function notebookStoryEvent(e,npcs,state,{playerAction=''}={}){
 const quote=visible(e.evidence);const entry=Object.fromEntries(['type','bookId','otherBookId','actorId','npcId','fromId','toId','fromShinigamiId','toShinigamiId','shinigamiId','location','evidence'].filter(key=>typeof e[key]==='string').map(key=>[key,e[key].slice(0,key==='evidence'?1200:180)]));if(!quote||negated(quote))return null;
 const actor=id=>npcs.find(n=>n.id===id),bound=id=>{const n=actor(id);return n&&[n.id,n.name,n.title,n.occupation,...n.aliases||[]].filter(Boolean).some(name=>quote.includes(name));};
 const god=id=>isShinigami(actor(id)),human=id=>isHuman(actor(id));
 const book=actorKey(e.bookId),bookMention=id=>quote.includes(id)||/สมุด|notebook|death note/iu.test(quote);
 if(!book||!bookMention(e.bookId))return null;
 // A witnessed pickup may follow the player's actual typed roleplay instead
 // of the dock button. Discovery alone, touch alone and AI-only consent fail.
 if(e.type==='acquire'&&e.actorId==='player')return confirmedPlayerPickup(quote,state,npcs,{playerAction})?{...entry,type:'take',source:'visible-player-pickup',consentHash:sha256(playerAction)}:null;
 if(e.type==='npc-register'&&e.actorId!=='player'&&human(e.actorId)&&bound(e.actorId)&&/(?:ถือ|ครอบครอง|หยิบ|เก็บ|รับ).{0,50}(?:สมุด|เดธโน)|(?:holds?|owns?|picks? up|receives?).{0,50}(?:notebook|death note)/iu.test(quote))return {...entry,type:'register',source:'visible-notebook',ownerId:e.rightsEstablished===true&&/เจ้าของสิทธิ์|เป็นเจ้าของ|owns?|ownership|rights/iu.test(quote)?e.actorId:'',holderId:e.actorId,firstHumanOwnerId:e.rightsEstablished===true&&/เจ้าของสิทธิ์|เป็นเจ้าของ|owns?|ownership|rights/iu.test(quote)?e.actorId:'',shinigamiId:god(e.shinigamiId)&&bound(e.shinigamiId)?e.shinigamiId:'',knownToPlayer:true,ownerKnownToPlayer:e.rightsEstablished===true&&/เจ้าของสิทธิ์|เป็นเจ้าของ|owns?|ownership|rights/iu.test(quote)};
 if(e.type==='shinigami-exchange'&&actorKey(e.otherBookId)&&god(e.fromShinigamiId)&&god(e.toShinigamiId)&&bound(e.fromShinigamiId)&&bound(e.toShinigamiId)&&/แลก|สลับ|exchang|swap/iu.test(quote))return {...entry,exchangeAttachment:e.exchangeAttachment===true&&/ประจำ|ติดตาม|attached|attendant|accompan/iu.test(quote)};
 if(e.type==='shinigami-transfer'&&god(e.fromShinigamiId)&&god(e.toShinigamiId)&&bound(e.fromShinigamiId)&&bound(e.toShinigamiId)&&/โอน|มอบ|ยก.{0,20}สิทธิ์|transfer|gives?.{0,30}ownership/iu.test(quote))return {...entry,transferAttachment:e.transferAttachment===true&&/ประจำ|ติดตาม|attached|attendant|accompan/iu.test(quote)};
 if(e.type==='attach-shinigami'&&god(e.shinigamiId)&&bound(e.shinigamiId)&&/ประจำสมุด|ติดตาม.{0,24}สมุด|attached|accompan|attend/iu.test(quote))return entry;
 if(['acquire','npc-drop','npc-relinquish','npc-eye-deal'].includes(e.type)&&e.actorId!=='player'&&human(e.actorId)&&bound(e.actorId)){
  const verbs={acquire:/หยิบ|เก็บ|รับสมุด|picks? up|takes? the|receives?/iu,'npc-drop':/วาง|ทิ้ง|drops?|leaves?/iu,'npc-relinquish':/สละสิทธิ์|ยกเลิกสิทธิ์|relinquish|renounc/iu,'npc-eye-deal':/แลกดวงตา|ข้อตกลงดวงตา|eye deal|eye bargain/iu};
  if(verbs[e.type].test(quote)&&(e.type!=='npc-eye-deal'||god(e.shinigamiId)&&bound(e.shinigamiId)&&/ครึ่ง|half/iu.test(quote)))return {...entry,lifeCost:undefined};
 }
 if(e.type==='rights-transfer'&&e.fromId!=='player'&&human(e.fromId)&&bound(e.fromId)&&(e.toId==='player'||human(e.toId)&&bound(e.toId))&&/โอนสิทธิ์|มอบสิทธิ์|ยกสิทธิ์|transfers?.{0,20}(?:ownership|rights)|gives?.{0,20}(?:ownership|rights)/iu.test(quote))return entry;
 return null;
}
