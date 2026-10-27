import {parseStory,npcRole,usableNpcName,keyName,npcAttributeDefaults,resolveNpcSpeaker} from '../../npc-core.js?v=0.89.2';
import {trueNameOf} from './names.js?v=0.89.2';

const plain=s=>String(s||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?(?:-->|$)/gu,'').replace(/<[^>]*>/gu,' ').replace(/\s+/gu,' ').trim();
const privateScene=/ตัดภาพ|ฉากอื่น|คุณไม่ได้อยู่|คุณมองไม่เห็น|\b(?:cutaway|off[- ]scene|elsewhere|unseen by you)\b/iu;
const concealed=/ปิดบังใบหน้า|สวมหน้ากาก|ไม่เห็นหน้า|เบลอ|\b(?:masked|blurred|face concealed|cannot see)\b/iu;
const speculative=/สมมติ|ถ้าหาก|อาจจะ|\b(?:hypothetical|would|could|imagine)\b/iu;
const stableId=name=>{let h=2166136261;for(const c of keyName(name))h=Math.imul(h^c.codePointAt(0),16777619);return 'dn-observed-'+(h>>>0).toString(16);};

export function disclosedEyeName(text) {
 const evidence=plain(text);if(privateScene.test(evidence)||concealed.test(evidence)||speculative.test(evidence))return null;
 const pattern=/(?:ชื่อจริง(?:ตามทะเบียนราษฎร์|ที่ปรากฏ)?|นามแท้จริง|true\s+name|real\s+name)\s*(?:(?:คือ|ว่า|เป็น|reads?|is)\s*[—–:：=\-]?|[—–:：=\-])\s*[“"「『]?([^”"」』\n,，;；:：]{1,160})/iu;
 const match=pattern.exec(evidence);if(!match)return null;
 const name=match[1].split(/\s+(?:เคียงคู่|ควบคู่|พร้อมกับ|ลอย|ปรากฏ|อยู่เหนือ|เหนือ|พร้อม|with|alongside|above|appears|floats|and his|and her)\b|(?:เคียงคู่|ควบคู่|พร้อมกับ|ปรากฏอยู่|ตัวเลข)/iu)[0].trim().replace(/[.!。]+$/u,'');
 if(!name||name.length>100||!usableNpcName(name)||!/^[\p{L}\p{M}][\p{L}\p{M}\p{N} .・·'’\-]{0,99}$/u.test(name))return null;
 return {name,evidence};
}

export function eyeIdentityProposals(source,npcs=[]) {
 const blocks=parseStory(String(source||''))||[],proposals=[];let header='';
 for(let i=0;i<blocks.length;i++){
  const block=blocks[i];if(block.type==='header'){header=block.name;continue;}
  if(!['narrative','plain'].includes(block.type))continue;
  const disclosure=disclosedEyeName(block.text);if(!disclosure)continue;
  const following=blocks.slice(i+1).find(b=>b.type==='header')?.name||'';
  const direct=npcs.filter(n=>keyName(n.name)===keyName(disclosure.name));
  const label=[header,following].find(v=>v&&disclosure.evidence.includes(v))||header||following;
  const bound=npcs.filter(n=>[n.id,n.name,n.title,n.occupation].filter(Boolean).some(v=>keyName(v)===keyName(label)));
  if(direct.length>1||bound.length>1||!direct.length&&!bound.length&&!npcRole(label)&&keyName(label)!==keyName(disclosure.name))continue;
  proposals.push({...disclosure,label,npcId:direct[0]?.id||bound[0]?.id||stableId(disclosure.name)});
 }
 return proposals;
}

// A visible, explicit name is authoritative for a role-labelled placeholder.
// Existing proper names/canon true-name overrides are never silently replaced.
export function repairEyeIdentities(state,source) {
 const next=structuredClone(state),events=[];let changed=0;
 for(const p of eyeIdentityProposals(source,next.npcs)){
  let npc=next.npcs.find(n=>n.id===p.npcId);
  if(npc&&Object.hasOwn(state.deathNoteRules?.trueNames||{},npc.id)&&keyName(trueNameOf(state,npc))!==keyName(p.name))continue;
  if(npc&&usableNpcName(npc.name)&&keyName(npc.name)!==keyName(p.name))continue;
  if(!npc){npc={id:p.npcId,name:p.name,title:p.label,occupation:p.label,race:'Human',met:false,enabled:true,npcScope:'chat',...npcAttributeDefaults()};next.npcs.push(npc);changed++;}
  else if(keyName(npc.name)!==keyName(p.name)){const role=npc.name;npc.name=p.name;if(npcRole(role)){npc.title=role;if(!npc.occupation)npc.occupation=role;}changed++;}
  events.push({type:'name-learned',npcId:npc.id,claimedName:p.name,evidence:p.evidence,source:'visible-eyes'},...(!concealed.test(p.evidence)?[{type:'face-seen',npcId:npc.id,evidence:p.evidence}]:[]));
 }
 return {next,changed,events};
}

export function eyeRepairCandidates(state,source) {
 const visible=plain(source);if(privateScene.test(visible)||concealed.test(visible)||speculative.test(visible))return [];
 if(!/เห็น|มอง|ตรงหน้า|สายตา|ใบหน้า|\b(?:you see|before you|in front of you|face)\b/iu.test(visible))return [];
 const labels=[...new Set((parseStory(source)||[]).filter(b=>b.type==='header').map(b=>b.name).filter(v=>npcRole(v)))];
 return labels.map(label=>({label,npc:resolveNpcSpeaker(state.npcs,label)||state.npcs.find(n=>keyName(n.name)===keyName(label))})).filter(r=>!r.npc||!usableNpcName(r.npc.name)).slice(0,4);
}
export function identityRepairPrompt(candidates,source,canon) {
 return {systemPrompt:'Return one JSON object only. This is fictional NPC bookkeeping, not a new chat turn.',prompt:'The player has just enabled Shinigami Eyes. Complete only the visible human NPCs listed below. Use their established proper names from canon/current prose; for a genuinely new incidental fictional person, author one plausible proper name. Never put an occupation, role, ??? or description into name. Never introduce off-scene people or change story events. Return {"npcs":[{"label":"exact listed label","name":"proper name","race":"Human","appearance":"visible facts only"}]}. Omit masked, unseen or nonhuman people.\nCANON '+JSON.stringify(canon)+'\nCANDIDATES '+JSON.stringify(candidates.map(r=>({label:r.label,id:r.npc?.id})))+'\nLATEST COMPLETED SCENE\n'+String(source).slice(-12000),responseLength:1200,trimNames:false};
}
export function applyGeneratedEyeIdentities(state,source,candidates,response) {
 let value;try{value=typeof response==='string'?JSON.parse(response.replace(/^\s*```(?:json)?\s*|\s*```\s*$/gu,'')):response;}catch{return {next:state,changed:0,events:[]};}
 const next=structuredClone(state),events=[];let changed=0;
 for(const row of (Array.isArray(value?.npcs)?value.npcs:[]).slice(0,4)){
  const c=candidates.find(c=>c.label===row.label),name=String(row.name||'').trim();
  if(!c||!usableNpcName(name)||name.length>100||!/^Human$/iu.test(row.race||''))continue;
  let npc=next.npcs.find(n=>n.id===c.npc?.id);
  if(npc&&Object.hasOwn(state.deathNoteRules?.trueNames||{},npc.id)&&keyName(trueNameOf(state,npc))!==keyName(name))continue;
  if(npc&&usableNpcName(npc.name))continue;
  if(!npc){npc={id:stableId(name),name,title:c.label,occupation:c.label,race:'Human',met:false,enabled:true,npcScope:'chat',...npcAttributeDefaults()};if(next.npcs.some(n=>n.id===npc.id))continue;next.npcs.push(npc);}else {npc.title=npcRole(npc.name)?npc.name:npc.title;npc.name=name;}
  npc.appearance=String(row.appearance||npc.appearance||'').slice(0,1000);changed++;
  events.push({type:'name-learned',npcId:npc.id,claimedName:name,evidence:plain(source).slice(0,1200),source:'configured-eyes'},{type:'face-seen',npcId:npc.id,evidence:plain(source).slice(0,1200)});
 }
 return {next,changed,events};
}
