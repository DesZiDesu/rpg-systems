// Face evidence is separate from learning a name and never shown on the paper.
export function faceKnowledge(world,npc,state){
 const event=world.faces?.[npc.id],seed=state.deathNoteRules?.knownFaces?.[npc.id];
 if(event)return {known:true,source:'story',evidence:event.evidence||''};
 if(seed===true||seed?.known===true)return {known:true,source:'card',evidence:typeof seed?.evidence==='string'?seed.evidence:''};
 if(seed===false||seed?.known===false)return {known:false,source:'card',evidence:''};
 // Existing RoleForge cards used met as the face witness. Keep that meaning
 // unless a mask/concealment is recorded or the card explicitly overrides it.
 const concealed=/\bmasked\b|face (?:hidden|concealed)|สวมหน้ากาก|ปิดบังใบหน้า|ไม่เห็นใบหน้า/iu.test([npc.title,npc.appearance].filter(Boolean).join(' '));
 return {known:npc.met===true&&!concealed,source:'met',evidence:''};
}
