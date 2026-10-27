import {CANON_NAME_SPELLINGS} from './canon-spellings.js?v=0.89.3';
import {CANON_DISPLAY_NAMES} from './name-labels.js?v=0.89.3';
const key=s=>String(s||'').normalize('NFKC').replace(/\s+/gu,' ').trim().toLocaleLowerCase();
const clean=s=>typeof s==='string'&&s.trim().length<=160?s.trim():'';
function versionValue(value,npc){return value&&typeof value==='object'&&!Array.isArray(value)?Object.hasOwn(value.versions||{},npc.activeAlternateId)?value.versions[npc.activeAlternateId]:value.default:value;}
// Optional author-owned translations, kept separate from NPC aliases and claims.
// {npcId: [{name:'Light Yagami', en:'Light Yagami', th:'ไลท์ ยางามิ'}]}
// The same version/default envelope as trueNameSpellings is supported.
function translations(state,npc){const rows=versionValue(state.deathNoteRules?.nameTranslations?.[npc.id],npc);return (Array.isArray(rows)?rows:[]).slice(0,64).filter(r=>r&&clean(r.name)).map(r=>({name:clean(r.name),en:clean(r.en),th:clean(r.th)}));}
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
 const translated=translations(state,npc).filter(r=>key(r.name)===key(name)).flatMap(r=>[r.en,r.th]);
 return [...new Map([name,...(Array.isArray(declared)?declared:[]),...compatible,...translated].filter(v=>typeof v==='string'&&v.trim()&&v.length<=160).map(v=>[key(v),v.trim()])).values()];
}
export function matchesTrueName(state,npc,written){return trueNameSpellings(state,npc).some(name=>key(name)===key(written));}
// Projection only. Never rename an NPC, alter knowledge, or translate arbitrary
// model aliases into a true name. Unsupported translations retain the source.
export function localizedNpcName(state,npc,value,language='original'){
 const raw=String(value||'');if(!['th','en'].includes(language)||!raw||raw==='???')return raw;
 const accepts=language==='th'?s=>/[\u0e00-\u0e7f]/u.test(s):s=>/[a-z]/iu.test(s)&&!/[\u0e00-\u0e7f]/u.test(s),spellings=trueNameSpellings(state,npc);
 const groups=state.deathNoteRules?.format==='roleforge-death-note-rules'?CANON_DISPLAY_NAMES[npc.id]||[]:[],label=groups.find(g=>g.some(s=>key(s)===key(raw)))?.find(accepts);
 if(spellings.some(s=>key(s)===key(raw))){const authored=translations(state,npc).find(r=>key(r.name)===key(trueNameOf(state,npc)))?.[language];return authored||spellings.find(accepts)||label||raw;}
 const authored=translations(state,npc).find(r=>[r.name,r.th,r.en].some(s=>s&&key(s)===key(raw)));
 if(authored)return authored[language]||raw;
 return label||raw;
}
