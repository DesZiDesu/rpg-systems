// Only the active, visible greeting can establish an initial possession.
// Later rights events still decide who holds/owns the same physical notebook.
export const OPENING_BOOK='dn-opening-notebook';
const visible=s=>String(s||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?(?:-->|$)/gu,'');
export function openingPossession(chat){
 const first=(chat||[]).find(m=>!m.is_system);if(!first||first.is_user)return false;
 const text=visible(first.mes).replace(/<tr-dialogue\b[^>]*>[\s\S]*?<\/tr-dialogue>/giu,'').replace(/<[^>]+>/gu,' ').replace(/[^\S\n]+/gu,' ');
 if(!/ปกดำ|เดธโน้ต|เดธโน๊ต|ยมทูต|death note|shinigami|black notebook/iu.test(text))return false;
 const patterns=[/คุณ(?:ได้)?(?:รับ|มี|ครอบครอง|ถือ)\s*(?:สมุด(?:ปกดำ|โน้ต|โน๊ต)?|เดธโน้ต|เดธโน๊ต|Death Note)/giu,/สมุด(?:ปกดำ|โน้ต|โน๊ต)?(?:อีกเล่ม)?ที่คุณ(?:ได้)?รับ(?:มา|แล้ว)/gu,/\byou\s+(?:(?:already|now|still)\s+)?(?:own|hold|possess|have\s+(?:received|owned|held)|have|received)\s+(?:(?:a|the|your|black|notebook|copy\s+of)\s+){0,4}(?:death note|notebook)\b/giu];
 return patterns.some(pattern=>[...text.matchAll(pattern)].some(m=>!/ยังไม่|ไม่ได้(?:รับ|ครอบครอง|มี)|สมมติ|หาก|ถ้า|\b(?:if|would|will|not|never)\b/iu.test(text.slice(Math.max(0,m.index-18),m.index)+m[0])));
}
export function openingBook(chat,state,notebooks=[]){
 if(!openingPossession(chat))return null;
 const registers=(chat||[]).filter(m=>!m.is_user&&!m.is_system).flatMap(m=>(m.extra?.roleforge_death_note_world_preview||[]).filter(e=>e.swipe===(Number(m.swipe_id)||0)&&e.offset<=String(m.mes||'').replace(/<!--[\s\S]*?-->/gu,'').replace(/<[^>]*>/gu,' ').replace(/\s+/gu,' ').trim().length&&e.type==='register'&&e.firstHumanOwnerId==='player'));
 const candidates=[...new Map([...registers.map(e=>({id:e.bookId,itemId:e.itemId||e.bookId})),...notebooks.map(i=>({id:i.id,itemId:i.id}))].map(b=>[b.id,b])).values()];
 // Several notebooks require an explicit author binding; do not guess a copy.
 if(candidates.length>1)return null;
 const b=candidates[0]||{id:OPENING_BOOK,itemId:OPENING_BOOK};
 return {type:'register',bookId:b.id,itemId:b.itemId,ownerId:'player',holderId:'player',firstHumanOwnerId:'player',opening:true};
}
export function originalShinigamiEvents(source,npcs,books){
 const events=[];
 for(const m of visible(source).matchAll(/<tr-dialogue\b[^>]*\bname=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/tr-dialogue>/giu)){
  const speaker=m[1]||m[2],npc=npcs.find(n=>n.id===speaker||n.name===speaker);
  if(!npc||!/shinigami|ยมทูต/iu.test(npc.race||''))continue;
  const quote=m[3].replace(/<[^>]+>/gu,' ').replace(/\s+/gu,' ').trim();
  if(/ไม่ได้เป็นของข้า|ไม่ใช่ของข้า|สมมติ|\b(?:not mine|wasn't mine|if|pretend)\b/iu.test(quote))continue;
  if(!/(?:สมุด(?:เล่ม(?:นั้น|นี้))?|เดธโน้ต|เดธโน๊ต).{0,32}(?:เคยเป็นของข้า|เป็นของข้า|ข้า(?:เป็น|คือ)เจ้าของ)|(?:this|that|the)\s+(?:death note|notebook).{0,32}(?:was mine|used to be mine|belonged to me)|(?:I dropped|I am the shinigami (?:of|attached to)).{0,24}(?:notebook|death note)/iu.test(quote))continue;
  const explicit=books.filter(b=>quote.includes(b.id)),chosen=explicit.length===1?explicit[0]:books.length===1?books[0]:null;
  if(chosen)events.push({type:'bind-shinigami',bookId:chosen.id,shinigamiId:npc.id,evidence:quote});
 }
 return events;
}

// Author-defined facts belong only to the active greeting, never to unused
// alternatives. Physical books and NPC rights can be seeded without spoilers.
export function greetingBooks(chat,state){
 const first=(chat||[]).find(m=>!m.is_system);if(!first||first.is_user)return [];
 const match=(state.deathNoteRules?.greetingBooks||[]).find(row=>typeof row.text==='string'&&visible(row.text).replace(/\r\n?/gu,'\n').trim()===visible(first.mes).replace(/\r\n?/gu,'\n').trim());
 return Array.isArray(match?.books)?match.books.slice(0,6):[];
}
