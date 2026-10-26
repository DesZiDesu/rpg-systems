import {sha256} from '../../vendor/js-sha256/index.js?v=0.88.1';
import {containsIdentity} from './identity.js?v=0.88.1';
const visibleText=s=>String(s||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?-->/gu,'').replace(/<[^>]+>/gu,' ');
export const pickupText=s=>visibleText(s).replace(/\s+/gu,' ').trim();
const actionText=s=>visibleText(s).replace(/\(\([\s\S]*?\)\)|\(ooc:[\s\S]*?\)/giu,' ').trim();
// Keep unrelated background, other actors and negative sentences out of the
// actual pickup evidence. Thai often uses paragraph/contrast boundaries instead
// of full stops; never discard a whole long narrative just because of its size.
const clauses=s=>String(s).split(/\n+|[.!?。！？;]+|\s+\b(?:but|however|then|afterwards)\b\s+|(?:แต่(?=ฉัน|ผม|เรา|คุณ|ผู้เล่น)|จากนั้น|แล้วจึง)/iu).map(v=>v.replace(/\s+/gu,' ').trim()).filter(Boolean);
const thVerb='(?:หยิบ|เก็บ|คว้า|ฉวย|รับ|ยก|สอด|ใส่|พก)';
const enVerb='(?:pick(?:s|ed|ing)?|tak(?:e|es|ing)|took|grab(?:s|bed|bing)?|lift(?:s|ed|ing)?|scoop(?:s|ed|ing)?|pocket(?:s|ed|ing)?|retriev(?:e|es|ed|ing)|collect(?:s|ed|ing)?|receiv(?:e|es|ed|ing)|tuck(?:s|ed|ing)?|slip(?:s|ped|ping)?|stow(?:s|ed|ing)?|put(?:s|ting)?|plac(?:e|es|ed|ing))';
const book='(?:สมุด|หนังสือ|เดธโน[้๊็]?ต|โน[้๊]?ต|เล่มนี้|เล่มนั้น|มัน)';
const enBook='(?:(?:the|this|that|a|black|fallen|old|small|closed|leather|dark|my|your)\\s+){0,5}(?:notebook|death note|book|it)';
const pickup=new RegExp('(?:หยิบ|เก็บ|คว้า|ฉวย|รับ|ยก)(?:เอา)?\\s*'+book+'|(?:หยิบ|เก็บ|คว้า|ยก)(?:มัน|เล่มนี้|เล่มนั้น)?ขึ้นมา|\\b(?:pick(?:s|ed)?(?:\\s+up)?|take|takes|took|grab(?:s|bed)?|lift(?:s|ed)?|scoop(?:s|ed)?(?:\\s+up)?|retrieve[sd]?|collect(?:s|ed)?|receive[sd]?|pocket(?:s|ed)?)\\s+'+enBook+'\\b','iu');
const bagStore=new RegExp('(?:เก็บ|สอด|ใส่)(?:เอา)?(?:'+book+')?(?:เข้า|ลง|ใส่|ไว้|ใน){1,4}(?:ใน)?(?:กระเป๋า|เป้)|\\b(?:tuck(?:s|ed)?|slip(?:s|ped)?|stow(?:s|ed)?|put|puts|placed?)\\s+'+enBook+'.{0,24}\\b(?:into|inside|in) (?:my|your) (?:bag|backpack|pocket)\\b','iu');
const negatedPattern=new RegExp('(?:ยังไม่|ไม่ได้|ไม่ยอม|ไม่เคย|ไม่)(?:คิดจะ|อยาก|ต้องการ)?\\s*(?:ถูก)?\\s*'+thVerb+'|กำลังจะ|อาจจะ|สมมติ|หาก|\\b(?:would|if|plans? to)\\b|\\b(?:never|not|don[’\u0027]t|doesn[’\u0027]t|didn[’\u0027]t|won[’\u0027]t|cannot|can[’\u0027]t)\\s+(?:(?:yet|actually|really|even|ever|going to|manage to|able to)\\s+){0,3}'+enVerb,'iu');
const negated=s=>negatedPattern.test(s);
const plannedPattern=new RegExp('(?:อยาก|ต้องการ|พยายาม|จะ(?:ถูก)?|น่าจะ|คงจะ|ก่อนที่จะ|ก่อนจะ)\\s*'+thVerb+'|\\b(?:want|intend|going to|will|might|may|could|tr(?:y|ies|ied) to|reach(?:es|ed)? to|attempt(?:s|ed)? to|before (?:I |you )?(?:pick|take|grab)|can I|could I|should I)\\b','iu');
const planned=s=>plannedPattern.test(s);
const requested=s=>/บอกให้|ขอให้|สั่งให้|\b(?:ask|tell|told|order)\b/iu.test(s);
const completedStow=s=>/(?:ก็|แล้ว)(?:หยิบ|เก็บ|สอด|ใส่)(?:มัน|สมุด|หนังสือ)?(?:เข้า|ลง|ใส่|ไว้|ใน|ขึ้นมา){1,4}(?:ใน)?(?:กระเป๋า|เป้)/u.test(s);
const escape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const npcLabels=npcs=>npcs.flatMap(n=>[n.name,...n.aliases||[]]).filter(Boolean);
const otherPickup=(text,labels)=>labels.some(label=>new RegExp('(?:โดย|\\bby\\s+)'+escape(label)+'|'+escape(label)+'.{0,24}(?:'+thVerb+'|'+enVerb+')','iu').test(text));
const actionOccurred=(text,labels)=>!negated(text)&&!otherPickup(text,labels)&&!requested(text)&&(completedStow(text)||!planned(text))&&(pickup.test(text)||bagStore.test(text));
function pickupEvidence(quote,state,npcs,{playerAction='',allowStowed=false}={}){
 const action=actionText(playerAction),others=npcLabels(npcs);
 let consent=false;
 for(const text of clauses(action))if(pickup.test(text)||bagStore.test(text))consent=actionOccurred(text,others);
 if(!consent)return '';
 const name=String(state.player?.name||'').trim(),first=name.split(/\s+/u)[0];
 const labels=[name,...state.player?.aliases||[],...(first&&first.length>1&&!others.some(v=>containsIdentity(v,first))?[first]:[])].filter(Boolean);
 let evidence='';
 for(const text of clauses(visibleText(quote))){
  const relevant=pickup.test(text)||bagStore.test(text)||/(?:สมุด|หนังสือ|notebook|death note)/iu.test(text);
  if(negated(text)||planned(text)||requested(text)||otherPickup(text,others)){if(relevant)evidence='';continue;}
  const playerMention=/คุณ|ผู้เล่น|\byou\b/iu.test(text)||labels.some(label=>containsIdentity(text,label));
  // Passive stowage/holding is confirmation only after a real player action.
  const stowed=/(?:สมุด|หนังสือ|เดธโน[้๊็]?ต).{0,70}?(?:สอด|เก็บ|ใส่).{0,24}?(?:กระเป๋า|เป้)|(?:notebook|death note).{0,60}?(?:put|placed|tucked|slid|stowed).{0,30}?\byour (?:bag|backpack|pocket)\b/iu.test(text);
  const held=/(?:สมุด|หนังสือ).{0,35}(?:อยู่|มาอยู่).{0,15}(?:ในมือ|ในกระเป๋า|ในเป้)(?:ของ)?(?:คุณ|ผู้เล่น)|\b(?:notebook|death note)\b.{0,35}\b(?:now|rests?|lies?|is)\b.{0,20}\bin your (?:hands?|bag|backpack|pocket)\b/iu.test(text);
  if(playerMention&&(pickup.test(text)||bagStore.test(text))||allowStowed&&(stowed||held))evidence=pickupText(text);
 }
 return evidence;
}
export function confirmedPlayerPickup(quote,state,npcs,options={}){return Boolean(pickupEvidence(quote,state,npcs,options));}

// Infer only one already-discovered physical book. Ambiguous/multiple books,
// NPC-held books and scraps require their explicit, separately validated events.
export function recoverNarratedPickup(source,world,state,{playerAction=''}={}){
 const books=Object.values(world.books);if(books.length!==1)return null;
 const b=books[0];if(!b.knownToPlayer||b.holderId||b.destroyed)return null;
 const action=actionText(playerAction);
 if(/เศษกระดาษ|กระดาษแผ่น|อีกเล่ม|\b(?:scrap|fragment|another notebook|other notebook)\b/iu.test(action))return null;
 const visible=String(source||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?-->/gu,'');
 const tagged=[...visible.matchAll(/<tr-narrative\b[^>]*>([\s\S]*?)<\/tr-narrative>/giu)].map(m=>m[1]);
 const passages=tagged.length?tagged:/<tr-dialogue\b/iu.test(visible)?[]:[visible];
 const evidence=pickupEvidence(passages.join('\n'),state,state.npcs||[],{playerAction,allowStowed:true});
 return evidence?{type:'take',bookId:b.id,source:'visible-player-pickup',consentHash:sha256(playerAction),evidence}:null;
}
