import {identityBound} from './identity.js?v=0.94.0';
// A scrap is physical writing material, never a separate human ownership right.
import {localId} from '../core.js?v=0.94.0';
import {notebookInScene} from './location.js?v=0.94.0';
const safe=id=>typeof id==='string'&&id.length>0&&id.length<180&&!['__proto__','prototype','constructor'].includes(id);
export const fragmentItem=i=>i?.quantity>0&&i.properties?.includes('roleforge:addon:death-note-fragment');
export const writingMaterials=w=>[...Object.values(w.books||{}),...Object.values(w.fragments||{}).filter(f=>!f.destroyed)];
export function applyFragmentEvent(w,e){
 if(!['tear-page','fragment-register','fragment-transfer','fragment-drop','fragment-take','fragment-destroy'].includes(e.type))return false;
 w.fragments||={};const b=w.books[e.bookId],f=w.fragments[e.fragmentId];
 if(['tear-page','fragment-register'].includes(e.type)){
  const holder=e.type==='tear-page'?'player':e.actorId;
  if(!b||b.holderId!==holder||!safe(e.fragmentId)||f||w.books[e.fragmentId]||Object.values(w.fragments).filter(v=>v.parentBookId===b.id).length>=32)return true;
  if(e.public===true)b.knownToPlayer=true;
  w.fragments[e.fragmentId]={id:e.fragmentId,itemId:e.fragmentId,parentBookId:b.id,holderId:holder,location:'',knownToPlayer:e.type==='tear-page'||e.public===true,holderKnownToPlayer:e.type==='tear-page'||e.public===true,destroyed:false};return true;
 }
 if(!f||f.destroyed)return true;
 if(e.type==='fragment-transfer'&&f.holderId===e.fromId&&safe(e.toId)){f.holderId=e.toId;f.location='';f.holderKnownToPlayer=e.fromId==='player'||e.toId==='player'||e.public===true;if(e.fromId==='player'||e.toId==='player'||e.public===true)f.knownToPlayer=true;const parent=w.books[f.parentBookId];if(parent&&!parent.touchedBy.includes(e.toId))parent.touchedBy.push(e.toId);if(e.toId==='player')w.memoryLost=false;else w.actorMemoryLost[e.toId]=false;}
 if(e.type==='fragment-drop'&&f.holderId===e.actorId){f.holderId='';f.location=e.location||'';f.holderKnownToPlayer=e.actorId==='player'||e.public===true;if(e.public===true)f.knownToPlayer=true;}
 if(e.type==='fragment-take'&&!f.holderId){f.holderId=e.actorId;f.location='';f.holderKnownToPlayer=e.actorId==='player'||e.public===true;if(e.actorId==='player'||e.public===true)f.knownToPlayer=true;const parent=w.books[f.parentBookId];if(parent&&!parent.touchedBy.includes(e.actorId))parent.touchedBy.push(e.actorId);if(e.actorId==='player')w.memoryLost=false;else w.actorMemoryLost[e.actorId]=false;}
 if(e.type==='fragment-destroy'&&f.holderId===e.actorId){f.destroyed=true;f.holderId='';f.location='';}
 return true;
}
export function fragmentAction(w,state,input){
 const b=w.books[input.bookId],f=w.fragments?.[input.fragmentId];
 if(input.type==='tear-page'){
  if(!b||b.holderId!=='player'||!state.inventory?.some(i=>i.id===b.itemId&&i.quantity>0))throw Error('ต้องถือสมุดก่อนฉีกกระดาษ');
  if(Object.values(w.fragments||{}).filter(v=>v.parentBookId===b.id).length>=32)throw Error('สมุดเล่มนี้มีเศษกระดาษครบ 32 ชิ้นแล้ว');
  return {...input,fragmentId:'dn-scrap-'+localId()};
 }
 if(!f||f.destroyed)throw Error('ไม่พบเศษกระดาษนี้');
 if(input.type==='fragment-take'){if(f.holderId||!f.location||!notebookInScene(f.location,state))throw Error('เศษกระดาษไม่ได้อยู่ตรงนี้');return {...input,actorId:'player'};}
 if(f.holderId!=='player'||!state.inventory?.some(i=>i.id===f.itemId&&fragmentItem(i)))throw Error('คุณไม่ได้ถือเศษกระดาษนี้');
 if(input.type==='fragment-transfer'&&!state.npcs?.some(n=>n.id===input.targetId&&n.met&&n.inScene!==false&&n.enabled!==false&&n.stats?.hp!==0))throw Error('เลือก NPC ที่อยู่ในฉาก');
 if(input.type==='fragment-destroy'&&!input.confirm)throw Error('ยืนยันก่อนทำลายเศษกระดาษ');
 return {...input,actorId:'player',fromId:'player',toId:input.targetId,location:state.location?.place||''};
}
export function fragmentStoryEvent(e,npcs,state){
 if(!['fragment-register','fragment-transfer','fragment-drop','fragment-take','fragment-destroy'].includes(e.type)||!safe(e.fragmentId))return null;
 const actorId=e.type==='fragment-transfer'?e.fromId:e.actorId,actor=npcs.find(n=>n.id===actorId),quote=e.evidence||'';
 // An AI event cannot manufacture an action by the player.
 if(!actor||!identityBound(quote,actor,npcs)||/ยังไม่|ไม่ได้|อาจจะ|กำลังจะ|\b(?:not|would|will|might|if)\b/iu.test(quote)||!/กระดาษ|เศษ|scrap|fragment|torn page/iu.test(quote))return null;
 const patterns={'fragment-register':/ฉีก|tore|tears?|ripped/iu,'fragment-transfer':/ส่ง|ยื่น|มอบ|hand|pass|give|gave/iu,'fragment-drop':/วาง|ทิ้ง|drop|put|laid/iu,'fragment-take':/หยิบ|รับ|เก็บ|took|takes?|pick/iu,'fragment-destroy':/เผา|ทำลาย|burn|destroy/iu};
 if(!patterns[e.type].test(quote))return null;
 if(e.type==='fragment-register'&&!safe(e.bookId))return null;
 if(e.type==='fragment-transfer'){const to=npcs.find(n=>n.id===e.toId);if(e.toId==='player'?!/คุณ|ผู้เล่น|\byou\b/iu.test(quote):!to||!identityBound(quote,to,npcs))return null;}
 return {type:e.type,fragmentId:e.fragmentId,bookId:e.bookId,actorId,fromId:actorId,toId:e.toId,location:state.location?.place||'',evidence:quote,public:e.public===true&&/คุณ|ผู้เล่น|\byou\b/iu.test(quote)};
}
export function fragmentInstruction(w){return `\nTORN PAPER (private physical reference): ${JSON.stringify(Object.values(w.fragments||{}))}\nA registered fragment works like notebook paper when physically held, with the same true-name, remembered-face and story-time rules. It grants NO human rights or eye-deal eligibility. Giving/dropping/destroying a fragment never transfers or relinquishes the parent notebook rights, and never cancels an existing death inscription. Keep parentBookId immutable. For witnessed completed NPC actions WORLD supports fragment-register {bookId,fragmentId,actorId,evidence:'exact visible quote naming NPC tearing the page'}, fragment-transfer {fragmentId,fromId,toId,evidence}, fragment-drop/fragment-take/fragment-destroy {fragmentId,actorId,evidence}; public:true only if the player actually witnesses it. Never invent player actions or create a scrap by merely mentioning paper. NPC writing on a scrap still requires established face/name and normal story evidence; a fragment alone cannot bypass engine outcome verification.`;}
// A visible scrap must stay reachable even if its source notebook is secret.
export function preferredMaterial(w,selectedId=''){
 const books=Object.values(w.books||{}),fragments=Object.values(w.fragments||{}).filter(f=>!f.destroyed);
 return w.books?.[selectedId]||w.fragments?.[selectedId]||books.find(b=>b.holderId==='player')||fragments.find(f=>f.holderId==='player')||books.find(b=>b.ownerId==='player')||books.find(b=>b.firstHumanOwnerId==='player')||books.find(b=>b.knownToPlayer)||fragments.find(f=>f.knownToPlayer)||books[0];
}
