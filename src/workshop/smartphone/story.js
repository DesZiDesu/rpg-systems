import {fingerprint} from './model.js?v=0.88.2';
import {phoneNpcNames} from './identity.js?v=0.88.2';

export function phoneSceneText(value){
 return String(value||'').replace(/<(?:think|thinking|planning|tr-thought)\b[^>]*>[\s\S]*?<\/(?:think|thinking|planning|tr-thought)>/giu,'').replace(/\|[^|]*\|/gu,'').replace(/<rf-phone>[\s\S]*?<\/rf-phone>/giu,'').trim();
}
const mentions=(text,name)=>{
 if(!name||name.length<2)return false;
 if(/[^\x00-\x7f]/u.test(name))return text.normalize('NFKC').toLocaleLowerCase().includes(name.normalize('NFKC').toLocaleLowerCase());
 return new RegExp('(?:^|[^\\p{L}\\p{M}\\p{N}])'+name.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')+'(?=$|[^\\p{L}\\p{M}\\p{N}])','iu').test(text);
};
export function phoneSceneSignal(phone,state,message,user,config){
 if(!config.incomingMessages)return null;
 const assistant=phoneSceneText(message?.mes),preceding=phoneSceneText(user?.mes);
 const prose=assistant.replace(/<[^>]+>/gu,' '),context=prose+'\n'+preceding+'\n'+(assistant.match(/<tr-header\b[^>]*>/giu)||[]).join(' ');
 const completed=text=>text.split(/[.!?\n。]+/u).some(part=>{
  if(/\b(?:did(?:n['’]t| not)|has(?:n['’]t| not)|never|not yet|without|wants? to|plans? to|going to|would|could|should|might)\b[^.!?\n]{0,60}\b(?:send|sent|text|message|call)|(?:ยังไม่ได้|ยังไม่|ไม่ได้|คิดจะ|อยากจะ|วางแผนจะ)[^\n]{0,40}(?:ส่ง|โทร)/iu.test(part))return false;
  return /\b(?:sent|texted|messaged)\b|\b(?:sends|texts)\b[^.!?\n]{0,80}\b(?:message|text|phone|him|her|you|me)\b|\b(?:transmission|notification)\s+chimes?\b|\b(?:notified|notifies|received|receives)\b[^.!?\n]{0,100}\b(?:messages?|texts?)\b|\b(?:messages?|texts?)\b[^.!?\n]{0,60}\b(?:arrives?|arrived|pops? up|appears?|appeared)\b|(?:ส่งข้อความ(?:มา|ไป|หา|แล้ว)|ส่งแชท(?:มา|ไป|แล้ว)|ข้อความ(?:ใหม่|จาก)[^\n]{0,50}(?:แจ้งเตือน|เด้ง|เข้ามา)|แจ้งเตือน[^\n]{0,60}ข้อความ)/iu.test(part);
 });
 const hasPhone=/\b(?:phone|smartphone|aster|texts?|messages?|transmission|notification)\b|โทรศัพท์|ข้อความ|แชท|แจ้งเตือน/iu.test(prose);
 if(!hasPhone||!completed(prose)&&!completed(preceding))return null;
 const actors=phone.contacts.filter(c=>!c.blocked&&c.number).filter(c=>{
  const npc=(state.npcs||[]).find(n=>n.id===c.npcId),names=[c.label,c.name,...(npc?phoneNpcNames(npc):[])];return names.some(name=>mentions(context,name));
 }).map(c=>c.id).slice(0,4);
 return actors.length?{actors,story:{assistant,user:preceding}}:null;
}
export function phoneOwnershipInStory(chat,playerName=''){
 let owned=false;
 const device='(?:Aster(?: One)?|(?:smart|mobile |cell)?phone|โทรศัพท์(?:มือถือ)?|สมาร์ทโฟน)';
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
