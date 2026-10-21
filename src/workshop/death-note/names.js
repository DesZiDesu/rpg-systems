// A canonical codename is not a birth name. Explicit null means unpublished;
// per-version overrides keep adaptations from borrowing each other's secrets.
export function trueNameOf(state,npc){
 const table=state.deathNoteRules?.trueNames||{};
 if(!Object.hasOwn(table,npc.id))return String(npc.name||'').trim();
 let value=table[npc.id];
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const versions=value.versions||{};value=Object.hasOwn(versions,npc.activeAlternateId)?versions[npc.activeAlternateId]:value.default;
 }
 return typeof value==='string'?value.trim().slice(0,160):'';
}
