// Remove originals and every derived summary that can still contain the source.
export function removeMemoryChat(library,chatId){
 const targets=new Set(Array.isArray(chatId)?chatId:chatId?[chatId]:[]);
 const next=structuredClone(library),removed=new Set(library.deletedChapters||[]),records=new Set(library.deletedRecords||[]);
 for(const c of next.chapters||[])if(removed.has(c.id))for(const e of c.events||[]){records.add(e.id);records.add(c.id+'::'+e.id);}
 // An unqualified event ID may have been reused in a newly rebuilt chapter.
 // Keep corrections referring to that live event; full chapter references remain tombstoned.
 const removedReference=id=>{
  const live=typeof id==='string'&&!id.includes('::')&&(next.chapters||[]).some(c=>!removed.has(c.id)&&!targets.has(c.chatId)
   &&!(c.sources||[]).some(s=>targets.has(s.chatId||c.chatId))&&(c.events||[]).some(e=>e.id===id));
  return records.has(id)&&!live||typeof id==='string'&&removed.has(id.split('::')[0]);
 };
 let changed=true;
 while(changed){
  changed=false;
  for(const chapter of next.chapters||[]){
   if(removed.has(chapter.id))continue;
   const dependent=targets.has(chapter.chatId)||(chapter.sources||[]).some(s=>targets.has(s.chatId||chapter.chatId))||removed.has(chapter.parentId)
    ||(chapter.events||[]).some(e=>[...(e.change?.targets||[]),...(e.resolves||[])].some(removedReference));
   if(dependent){removed.add(chapter.id);for(const event of chapter.events||[]){records.add(event.id);records.add(chapter.id+'::'+event.id);}changed=true;}
  }
 }
 const affected=new Set([...targets,...(next.chapters||[]).filter(c=>removed.has(c.id)).map(c=>c.chatId)]);
 const counts={chats:next.chats.filter(c=>targets.has(c.id)).length,messages:0,chapters:(next.chapters||[]).filter(c=>removed.has(c.id)).length,capsules:0,drafts:0};
 for(const chat of next.chats.filter(c=>targets.has(c.id)))counts.messages+=(chat.messages?.length||0)+(chat.removed?.length||0)+chat.messages.reduce((n,m)=>n+(m.variants?.length||0),0);
 next.chats=next.chats.filter(c=>!targets.has(c.id));
 next.chapters=next.chapters.filter(c=>!removed.has(c.id));
 const capsules=(next.capsules||[]).filter(c=>affected.has(c.chatId)||c.ancestry?.some(id=>targets.has(id))||(next.deletedCapsules||[]).includes(c.id));
 counts.capsules=capsules.length;next.capsules=next.capsules.filter(c=>!capsules.includes(c));
 const drafts=(next.drafts||[]).filter(d=>affected.has(d.chatId));counts.drafts=drafts.length;
 next.drafts=(next.drafts||[]).filter(d=>!drafts.includes(d));
 for(const id of affected)delete next.jobs?.[id];
 next.deletedChapters=[...removed];next.deletedRecords=[...records].filter(id=>typeof id==='string'&&id);next.deletedCapsules=[...new Set([...(next.deletedCapsules||[]),...capsules.map(c=>c.id)])];
 next.deletedChats=[...new Set([...(next.deletedChats||[]),...targets])];
 next.updatedAt=new Date().toISOString();
 return{next,counts,removedCapsules:capsules.map(c=>c.id)};
}
