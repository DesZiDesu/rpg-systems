import {sha256} from '../../vendor/js-sha256/index.js?v=0.85.5';
import {containsIdentity} from './identity.js?v=0.85.5';
export const pickupText=s=>String(s||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?-->/gu,'').replace(/<[^>]+>/gu,' ').replace(/\s+/gu,' ').trim();
const actionText=s=>pickupText(s).replace(/\(\([\s\S]*?\)\)|\(ooc:[\s\S]*?\)/giu,' ').trim();
const negated=s=>/ยังไม่|ไม่ได้|ไม่ยอม|ไม่เคย|ไม่(?:หยิบ|เก็บ|รับ|เอา|แตะ)|กำลังจะ|อาจจะ|สมมติ|หาก|\b(?:not|never|don't|doesn't|didn't|won't|cannot|can't|will|would|if|plans? to)\b/iu.test(s);
// A completed stow of the notebook corroborates the player's actual pickup,
// including Thai passive narration that does not repeat the persona's name.
const stowed=/(?:สมุด|หนังสือ|เดธโน[้๊็]?ต).{0,70}?(?:สอด|เก็บ|ใส่).{0,24}?(?:กระเป๋า|เป้)|(?:notebook|death note).{0,60}?(?:put|placed|tucked|slid|stowed).{0,30}?\byour (?:bag|backpack)\b/iu;
export function confirmedPlayerPickup(quote,state,npcs,{playerAction='',allowStowed=false}={}){
 if(!quote||negated(quote))return false;
 const action=actionText(playerAction),name=String(state.player?.name||'').trim(),first=name.split(/\s+/u)[0];
 const labels=[name,...state.player?.aliases||[],...(first&&first.length>1&&!npcs.some(n=>[n.name,...n.aliases||[]].some(v=>containsIdentity(v,first)))?[first]:[])].filter(Boolean);
 const playerMention=/คุณ|ผู้เล่น|\byou\b/iu.test(quote)||labels.some(label=>containsIdentity(quote,label));
 const escape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
 const otherPickup=text=>npcs.some(n=>[n.name,...n.aliases||[]].filter(Boolean).some(label=>new RegExp('(?:โดย|\\bby\\s+)'+escape(label)+'|'+escape(label)+'.{0,24}(?:หยิบ|เก็บสมุด|รับสมุด|สอดสมุด|ใส่สมุด|picks? up|takes? (?:the |this )?notebook|puts? (?:the |this )?notebook|stows? (?:the |this )?notebook)','iu').test(text)));
 const completedStow=/(?:ก็|แล้ว)(?:หยิบ|เก็บ|สอด|ใส่)(?:มัน|สมุด|หนังสือ)?(?:เข้า|ลง|ใส่|ไว้|ใน|ขึ้นมา){1,4}(?:ใน)?(?:กระเป๋า|เป้)/u.test(action);
 const pickup=/(?:หยิบ|เก็บ|รับ)(?:เอา)?(?:สมุด|หนังสือ|โน้ต|โน๊ต|เดธโน|มัน)|(?:หยิบ|เก็บ)(?:มัน|เล่มนี้|เล่มนั้น)?ขึ้นมา|เก็บใส่(?:กระเป๋า|เป้)|\b(?:pick(?:s|ed)?\s+(?:it|the notebook|the death note)\s+up|pick(?:s|ed)?\s+up|take|takes|took|grab(?:s|bed)?|receiv(?:e|es|ed))\b/iu;
 return Boolean(action&&!negated(action)&&!otherPickup(action)&&!otherPickup(quote)&&(completedStow||!/(?:อยาก|ต้องการ|จะ)(?:หยิบ|เก็บ|รับ)|\b(?:want|intend|going to)\b/iu.test(action))&&!/บอกให้|ขอให้|สั่งให้|\b(?:ask|tell|told|order)\b/iu.test(action)&&pickup.test(action)&&(completedStow||!/ก่อน(?:ที่จะ|จะ)?(?:หยิบ|เก็บ|รับ)|\bbefore (?:I |you )?(?:pick|take|grab)/iu.test(action))&&(pickup.test(quote)&&playerMention||allowStowed&&stowed.test(quote)));
}

// Infer only one already-discovered physical book. Ambiguous/multiple books,
// NPC-held books and scraps require their explicit, separately validated events.
export function recoverNarratedPickup(source,world,state,{playerAction=''}={}){
 const books=Object.values(world.books);if(books.length!==1)return null;
 const b=books[0];if(!b.knownToPlayer||b.holderId||b.destroyed)return null;
 const action=actionText(playerAction);
 if(/เศษกระดาษ|กระดาษแผ่น|อีกเล่ม|\b(?:scrap|fragment|another notebook|other notebook)\b/iu.test(action))return null;
 if(!/(?:สมุด|หนังสือ|เดธโน|โน้ต|โน๊ต)|\b(?:notebook|death note|pick it up|take it|grab it)\b/iu.test(action))return null;
 const visible=String(source||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?-->/gu,'');
 const tagged=[...visible.matchAll(/<tr-narrative\b[^>]*>([\s\S]*?)<\/tr-narrative>/giu)].map(m=>m[1]);
 const passages=tagged.length?tagged:/<tr-dialogue\b/iu.test(visible)?[]:[visible];
 for(const raw of passages){
 const quote=pickupText(raw);if(!quote||quote.length>1200)continue;
  if(confirmedPlayerPickup(quote,state,state.npcs||[],{playerAction,allowStowed:true}))return {type:'take',bookId:b.id,source:'visible-player-pickup',consentHash:sha256(playerAction),evidence:quote};
 }
 return null;
}
