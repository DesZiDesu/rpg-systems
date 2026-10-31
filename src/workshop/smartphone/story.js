import {incomingContactId} from './incoming.js?v=0.94.2';
import {fingerprint} from './model.js?v=0.94.2';
import {phoneNpcNames} from './identity.js?v=0.94.2';

export function phoneSceneText(value){
 return String(value||'').replace(/<(?:think|thinking|planning|tr-thought)\b[^>]*>[\s\S]*?<\/(?:think|thinking|planning|tr-thought)>/giu,'').replace(/\|[^|]*\|/gu,'').replace(/<rf-phone>[\s\S]*?<\/rf-phone>/giu,'').trim();
}
const mentions=(text,name)=>{
 if(!name||name.length<2)return false;
 if(/[^\x00-\x7f]/u.test(name))return text.normalize('NFKC').toLocaleLowerCase().includes(name.normalize('NFKC').toLocaleLowerCase());
 return new RegExp('(?:^|[^\\p{L}\\p{M}\\p{N}])'+name.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')+'(?=$|[^\\p{L}\\p{M}\\p{N}])','iu').test(text);
};
export function phoneSceneSignal(phone,state,message,user,config){
 if(!config.incomingMessages&&!config.incomingCalls)return null;
 const assistant=phoneSceneText(message?.mes),preceding=phoneSceneText(user?.mes);
 const prose=assistant.replace(/<[^>]+>/gu,' '),context=prose+'\n'+preceding+'\n'+(assistant.match(/<tr-header\b[^>]*>/giu)||[]).join(' ');
 const completed=text=>{
  let messages=false,calls=false;
  for(const part of text.split(/[.!?\n。]+/u)){
   if(/\b(?:did(?:n['’]t| not)|has(?:n['’]t| not)|never|not yet|without|wants? to|plans? to|going to|will|would|could|should|might)\b[^.!?\n]{0,60}\b(?:send|sent|text|message|call|ring)|(?:ยังไม่ได้|ยังไม่|ไม่ได้|คิดจะ|อยากจะ|วางแผนจะ|กำลังจะ)[^\n]{0,40}(?:ส่ง|โทร)/iu.test(part))continue;
   messages||=/\b(?:hits?|hit|press(?:es|ed)?|taps?|tapped)\s+(?:the\s+)?send\b|\b(?:phone|aster|screen)\b[^.!?\n]{0,50}\b(?:buzzes?|buzzed|vibrates?|vibrated|lights? up|lit up)\b[^.!?\n]{0,70}\b(?:messages?|texts?|notifications?)\b|(?:มือถือ|โทรศัพท์)[^\n]{0,40}(?:สั่น|ดังแจ้งเตือน)[^\n]{0,40}ข้อความ|\b(?:sent|texted|messaged)\b|\b(?:sends|texts|messages)\b[^.!?\n]{0,80}\b(?:message|text|phone|him|her|you|me)\b|\b(?:transmission|notification)\s+chimes?\b|\b(?:notified|notifies|received|receives)\b[^.!?\n]{0,100}\b(?:messages?|texts?|emails?|mail)\b|\b(?:messages?|texts?|emails?|mail)\b[^.!?\n]{0,60}\b(?:arrives?|arrived|pops? up|appears?|appeared)\b|(?:ส่ง(?:ข้อความ|เมล|อีเมล|SMS)(?:มา|ไป|หา|แล้ว)|ส่งแชท(?:มา|ไป|แล้ว)|(?:ข้อความ|เมล|อีเมล)(?:ใหม่|จาก)[^\n]{0,50}(?:แจ้งเตือน|เด้ง|เข้ามา)|แจ้งเตือน[^\n]{0,60}ข้อความ)/iu.test(part);
   calls||=/\b(?:called|calls|is calling)\s+(?:you|me)\b|\b(?:your|my|the)\s+(?:phone|aster)\b[^.!?\n]{0,50}\b(?:rings?|rang|ringing|incoming call)\b|\bincoming call\b|(?:โทรเข้ามา|โทรมาแล้ว|กดโทรหา|โทรหา(?:คุณ|ฉัน|ผม|เรา)|สายเรียกเข้า|โทรศัพท์[^\n]{0,35}(?:ดังขึ้น|ดังมา|มีสาย))/iu.test(part);
  }
  return {messages,calls};
 };
 const sent=completed(prose),received=/\b(?:received|notified|got a (?:text|message)|my phone)\b|ได้รับ(?:ข้อความ|เมล|อีเมล)|มีสายเข้า|โทรศัพท์ของ(?:ฉัน|ผม|เรา)/iu.test(preceding)?completed(preceding):{};
 const eligible=config.incomingMessages&&(sent.messages||received.messages)||config.incomingCalls&&(sent.calls||received.calls);
 const hasPhone=/\b(?:phone|smartphone|aster|texts?|messages?|emails?|mail|transmission|notification|calls?|calling|ringing)\b|โทรศัพท์|ข้อความ|เมล|อีเมล|SMS|แชท|แจ้งเตือน|โทรเข้า|โทรหา|สายเรียกเข้า/iu.test(prose);
 if(!hasPhone||!eligible)return null;
 const actors=[],npcIds=[];
 const matched=c=>{const npc=(state.npcs||[]).find(n=>n.id===c.npcId);return [c.label,c.name,...(npc?phoneNpcNames(npc):[])].some(name=>mentions(context,name));};
 for(const c of phone.contacts)if(!c.blocked&&matched(c)){actors.push(c.id);if(c.npcId)npcIds.push(c.npcId);if(actors.length>=4)break;}
 for(const npc of state.npcs||[]){
  if(actors.length>=4)break;
  if(phone.contacts.some(c=>c.npcId===npc.id)||!phoneNpcNames(npc).some(name=>mentions(context,name)))continue;
  actors.push(incomingContactId(npc.id));npcIds.push(npc.id);
 }
 const blocked=phone.contacts.some(c=>c.blocked&&matched(c));
 const namedHeader=/<tr-header\b[^>]*\bname=["'][^"']+["']/iu.test(assistant);
 const toPlayer=/\b(?:your|my)\s+(?:phone|aster)|\b(?:sent|sends|texted|messaged|called|calls)\s+(?:you|me)\b|\b(?:message|text|call)\s+(?:from|to you|to me)\b|(?:โทรศัพท์|มือถือ)ของ(?:คุณ|ฉัน|ผม)|ส่งข้อความ(?:มาหา|ถึง)(?:คุณ|ฉัน|ผม)|สายเรียกเข้า/iu.test(prose);
 return actors.length||!blocked&&(namedHeader||toPlayer)?{actors,npcIds,story:{assistant,user:preceding}}:null;
}
export function phoneOwnershipInStory(chat,playerName=''){
 let owned=false;
 const device='(?:Aster(?: One| K06)?|(?:smart|mobile |cell|flip )?phone|keitai|มือถือฝาพับ|โทรศัพท์(?:มือถือ)?|สมาร์ทโฟน)';
 for(const message of chat||[]){
  if(message?.is_system||!message?.mes)continue;const text=phoneSceneText(message.mes).replace(/<[^>]+>/gu,' ');
  const owner=message.is_user?'(?:my|our)':'your';
  const possessive=new RegExp('\\b'+owner+'\\s+'+device+'\\b|'+(message.is_user?'(?:โทรศัพท์|มือถือ|สมาร์ทโฟน)ของ(?:ฉัน|ผม|เรา)':'(?:โทรศัพท์|มือถือ|สมาร์ทโฟน)ของคุณ'),'iu');
  const received=new RegExp(device+'\\s+(?:notified|notifies|alerted|alerts)\\s+'+(message.is_user?'me':'you')+'\\b','iu');
  const name=playerName&&playerName!=='Adventurer'?playerName.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&'):'';
  const named=!!name&&new RegExp('(?:^|[^\\p{L}\\p{N}])'+name+'[’\u0027]s\\s+'+device,'iu').test(text);
  if(!possessive.test(text)&&!received.test(text)&&!named)continue;
  if(/\b(?:lost|destroyed|gave away|sold|no longer (?:have|has)|do not have|don['’]t have)\b[^.!?\n]{0,70}(?:phone|aster)|(?:ทำหาย|ไม่มี|ขาย|ทิ้ง|ทำลาย)[^\n]{0,40}(?:โทรศัพท์|มือถือ|แอสเตอร์)/iu.test(text))owned=false;
  else owned=true;
 }
 return owned;
}
export function phoneStorySource(message,index,visible){
 const story=phoneSceneText(visible??message.mes);
 // Core trackers may remove their own patch before the phone listener runs.
 // Source identity depends on story + phone data, never on another tracker's patch.
 const protocol=[...String(message.mes||'').matchAll(/<rf-phone>([\s\S]*?)<\/rf-phone>/giu)].map(m=>{try{return JSON.parse(m[1]);}catch{return m[1];}});
 return 'story:'+fingerprint({index,swipe:message.swipe_id||0,story,protocol});
}
