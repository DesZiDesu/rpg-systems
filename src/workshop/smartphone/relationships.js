import {reconcileRelationshipTurn} from '../../relationship-tracking.js?v=0.93.0';
import {relationshipPromptReference,relationshipLink} from '../../relationship-core.js?v=0.93.0';

export const PHONE_RELATIONSHIP_INSTRUCTIONS='On every completed phone reply, evaluate confirmed feelings and agreements, not just message delivery. Emit top-level relationshipEvents with stable NPC/player IDs, kind, exact evidence from a delivered message/call line, and small changes such as trust:1 or interest:1. Use the supplied relationship reference. Only the actual speaker may declare their own feelings; do not invent the player’s feelings or reciprocal affection. A direct conversation identifies the addressee; group “you” is ambiguous unless named. Remote text, sexting, a claim about an encounter, a sticker or an attachment is NOT an actual physical act: never change encounters, body counters, pregnancy or H-Stats from it. Ordinary greetings and logistical plans require no gain. Keep established partners and configured pacing. Do not use NPC profile fields or npcValues for feelings.';
export function phoneRelationshipReference(phone,state){
 const ids=new Set(phone.contacts.filter(c=>!c.blocked).map(c=>c.npcId));
 return relationshipPromptReference(state,(state.npcs||[]).filter(n=>ids.has(n.id)).slice(-24));
}
export function applyPhoneRelationships(current,phone,rows,{events=[],source='',enabled=true,recovery=false}={}){
 let state=current;const checks=[];
 const stable=actor=>{if(actor==='player')return actor;const contact=phone.contacts.find(c=>c.id===actor||c.npcId===actor);if(contact?.npcId)return contact.npcId;const names=[...(current.npcs||[]),{...current.player,id:'player'}].filter(n=>[n.name,...n.aliases||[]].some(v=>v&&v.toLocaleLowerCase()===String(actor).toLocaleLowerCase()));return names.length===1?names[0].id:actor;};
 for(const row of rows){
  const speakerId=stable(row.from),thread=phone.threads.find(t=>t.id===row.threadId&&!t.deleted),call=phone.calls.find(c=>c.id===row.callId),members=thread?.members||(call?['player',call.contactId]:[]),ids=members.map(stable),other=ids.filter(id=>id!==speakerId);
  if(!row.text||!ids.includes(speakerId)||speakerId!=='player'&&!(state.npcs||[]).some(n=>n.id===speakerId&&n.enabled!==false))continue;
  const targetId=other.length===1?other[0]:'',participants=ids.filter(id=>id!=='player'),eventSource=source||'phone:'+row.id;
  const scoped=(Array.isArray(events)?events:[]).filter(e=>!['intimacy','history','betrayal'].includes(e?.kind)).map(e=>({...e,actorId:stable(e.actorId),targetId:stable(e.targetId),hStats:[]})).filter(e=>e.actorId===speakerId&&ids.includes(e.targetId));
  const options={allowedActors:[speakerId],recoverBody:false,story:row.text,userName:state.player?.name,participants,exchanges:[{speakerId,targetId,text:row.text}],source:eventSource};
  const result=enabled?reconcileRelationshipTurn(state,scoped,options):{next:state,changed:0,proposed:0,recovered:0,diagnostics:[]};
  // A model cannot turn a second-person claim into the player's own feelings.
  // During legacy recovery preserve author-edited pairs and already recorded facts.
  if(recovery&&(relationshipLink(state,speakerId,targetId)?.origin==='manual'||(result.next.relationships?.history||[]).some(h=>h.source===eventSource.slice(0,200)&&relationshipLink(state,h.actorId,h.targetId)?.origin==='manual')||(state.relationships?.history||[]).some(h=>h.actorId===speakerId&&h.targetId===targetId&&h.evidence===row.text)))continue;
  const changes=(result.next.relationships?.history||[]).filter(h=>h.source===eventSource.slice(0,200)).flatMap(h=>Object.entries(h.changes||{}));
  checks.push({actorId:speakerId,targetId,source:eventSource.slice(0,200),enabled,proposed:result.proposed,recovered:result.recovered,applied:result.changed,changedMetrics:changes.length,reason:!enabled?'disabled':result.next.relationships?.config?.enabled===false?'disabled':result.changed?changes.length?'updated':result.next.relationships.history.at(-1)?.reason||'no_metric_change':changes.length?'already_recorded':'no_confirmed_change',diagnostics:result.diagnostics});
  state=result.next;
 }
 return {state,checks,checkedAt:new Date().toISOString()};
}
export function phoneRelationshipRows(phone,previous){
 const oldMessages=new Set(previous.messages.map(m=>m.id)),oldSpeech=new Set(previous.calls.flatMap(c=>c.transcript.map(r=>r.id)));
 return [...phone.messages.filter(m=>!m.deleted&&!oldMessages.has(m.id)).map(m=>({...m})),...phone.calls.flatMap(c=>c.transcript.filter(r=>!oldSpeech.has(r.id)).map(r=>({...r,callId:c.id})))];
}
export function recoverPhoneRelationships(phone,current,{enabled=true}={}){
 if(!enabled||phone.relationshipRoutingVersion===1)return {phone,state:current,checks:[]};
 const rows=[...phone.messages.filter(m=>!m.deleted&&m.text),...phone.calls.flatMap(c=>c.transcript.map(r=>({...r,callId:c.id})))].slice(-200);
 let state=current;const checks=[];
 for(const row of rows){
  const clock=state.worldClock,location=state.location;
  // Preserve the current scene while using the saved historical message time for pacing.
  const timed={...state,worldClock:{...clock,...row.time}};
  const result=applyPhoneRelationships(timed,phone,[row],{enabled,recovery:true});state={...result.state,worldClock:clock,location};checks.push(...result.checks);
 }
 const next={...phone,relationshipRoutingVersion:1,relationshipSync:{checkedAt:new Date().toISOString(),recovered:true,checks:checks.slice(-24)},revision:phone.revision+1};
 return {phone:next,state,checks};
}
