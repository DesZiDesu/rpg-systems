// Native Continue stores the host's prompt copy of the reply plus the new text.
// Prompt-only regexes, attachments or name trimming can change that copy, which
// replaces the visible reply. Splice the new text back onto the original instead.
const textOf=content=>typeof content==='string'?content:Array.isArray(content)?content.map(part=>typeof part?.text==='string'?part.text:'').join(''):'';
const joined=(before,tail)=>{
 if(!tail.trim())return before;
 if(/^\s/u.test(tail)||/\s$/u.test(before))return before+tail;
 return before+(tail.startsWith('<')?'\n\n':' ')+tail;
};

export function mergeContinuation(before,after,{prompts=[],streamed=''}={}){
 before=String(before??'');after=String(after??'');
 if(!before||after.startsWith(before))return after;
 const copies=[...new Set(prompts.map(textOf).flatMap(v=>[v,v.trimEnd(),v.trim(),v.trimStart(),v.trim().replace(/^[^\n:]{1,60}:\s*/u,'')]))].filter(v=>v.trim().length>=8).sort((a,b)=>b.length-a.length);
 const copy=copies.find(v=>after.startsWith(v));
 if(copy!==undefined)return joined(before,after.slice(copy.length));
 const raw=String(streamed??'').trim();
 if(raw){const at=after.lastIndexOf(raw.slice(0,60));return joined(before,at>=0?after.slice(at):raw);}
 return null;
}

// Observe one native Continue of `message` and repair it before RoleForge's
// reply processing runs (that work is scheduled after MESSAGE_RECEIVED).
export function guardContinuation(host,message){
 const before=String(message?.mes??''),prompts=[];let streamed='',stopped=false;
 const types=host.eventTypes||{},listeners=[];
 const on=(type,fn)=>{if(type&&host.eventSource?.on){host.eventSource.on(type,fn);listeners.push([type,fn]);}};
 const repair=()=>{
  if(stopped||!message||String(message.mes??'').startsWith(before))return false;
  const merged=mergeContinuation(before,message.mes,{prompts,streamed});
  if(merged===null||merged===message.mes)return false;
  message.mes=merged;
  if(Array.isArray(message.swipes)&&Number.isInteger(message.swipe_id))message.swipes[message.swipe_id]=merged;
  const id=host.chat?.indexOf(message);
  if(id>=0)try{host.updateMessageBlock?.(id,message);}catch(error){console.warn('[RoleForge Pokémon] Could not redraw the continued reply.',error);}
  return true;
 };
 on(types.CHAT_COMPLETION_PROMPT_READY,data=>{if(!data?.dryRun&&Array.isArray(data?.chat))for(const row of data.chat)if(row?.role==='assistant')prompts.push(row.content);});
 on(types.STREAM_TOKEN_RECEIVED,text=>{if(typeof text==='string')streamed=text;});
 // Streaming reports 'continue'; the non-streaming path saves it as 'appendFinal'.
 on(types.MESSAGE_RECEIVED,(id,type)=>{if(['continue','appendFinal'].includes(type)&&host.chat?.[Number(id)]===message)repair();});
 return {repair,before,stop(){stopped=true;for(const [type,fn]of listeners)host.eventSource.removeListener(type,fn);}};
}
