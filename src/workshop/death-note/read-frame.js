// Reuse derived data only during one synchronous read transaction. Never keep a
// snapshot across awaits or user events: edits, swipes and branches stay live.
export function createNotebookReads(readContext,buildWorld,buildRecords){
 let frame=null;
 const read=(key,load)=>{if(!frame)return load();if(!Object.hasOwn(frame,key))frame[key]=load();return frame[key];};
 const context=()=>read('context',readContext);
 const state=()=>read('state',()=>{const v=context();return {...v.state,deathNoteRules:v.deathNoteRules||{}};});
 const chat=()=>context().chat||[];
 return {context,state,chat,world:()=>read('world',()=>buildWorld(chat(),state())),records:()=>read('records',()=>buildRecords(chat())),
  run(callback){if(frame)return callback();frame=Object.create(null);try{return callback();}finally{frame=null;}}
 };
}

// Keep references to transcript strings instead of serializing a second copy of
// the whole chat. Notebook metadata is serialized to detect in-place edits too.
export function notebookInputStamp(facts,messages,eventKeys){
 return {facts:JSON.stringify(facts),turns:messages.map(m=>[m.mes,m.is_user,m.is_system,m.swipe_id,JSON.stringify(eventKeys.map(key=>m.extra?.[key]))])};
}
export function sameNotebookInputs(a,b){return Boolean(a&&b&&a.facts===b.facts&&a.turns.length===b.turns.length&&a.turns.every((row,i)=>row.every((v,j)=>v===b.turns[i][j])));}
