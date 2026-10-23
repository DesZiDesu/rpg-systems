import {CANON_NAME_SPELLINGS} from './canon-spellings.js?v=0.85.3';
const key=s=>String(s||'').normalize('NFKC').replace(/\s+/gu,' ').trim().toLocaleLowerCase();
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
// Only author-declared equivalents of a true name are usable. Reported names,
// generic NPC aliases, codenames and partial names never acquire this authority.
export function trueNameSpellings(state,npc){
 const name=trueNameOf(state,npc);if(!name)return [];
 let declared=state.deathNoteRules?.trueNameSpellings?.[npc.id];
 if(declared&&typeof declared==='object'&&!Array.isArray(declared))declared=Object.hasOwn(declared.versions||{},npc.activeAlternateId)?declared.versions[npc.activeAlternateId]:declared.default;
 const fallback=CANON_NAME_SPELLINGS[npc.id],compatible=state.deathNoteRules?.format==='roleforge-death-note-rules'&&fallback&&key(fallback.name)===key(name)?fallback.names:[];
 return [...new Map([name,...(Array.isArray(declared)?declared:[]),...compatible].filter(v=>typeof v==='string'&&v.trim()&&v.length<=160).map(v=>[key(v),v.trim()])).values()];
}
export function matchesTrueName(state,npc,written){return trueNameSpellings(state,npc).some(name=>key(name)===key(written));}
