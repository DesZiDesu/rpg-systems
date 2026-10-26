import {clean,key,fingerprint} from './model.js?v=0.88.6';
import {phoneNpcForContact} from './identity.js?v=0.88.6';
import {applyIncoming} from './engine.js?v=0.88.6';
import {playerNpc} from '../../npc-visibility.js?v=0.88.6';

export function incomingContactId(npcId){
 const value='npc-'+npcId;return key(value)?value:'npc-'+fingerprint(String(npcId)).slice(0,24);
}

// Register a first inbound channel only when its accompanying event can really
// be delivered. Profiles alone cannot create an incoming caller or conversation.
export function routeIncomingPhoneData(phone,state,data,config,{time={},source=''}={}){
 const rows=(Array.isArray(data.profiles)?data.profiles:[]).slice(0,12),npcs=state.npcs||[],aliases=new Map(),accepted=new Set();
 const events=(Array.isArray(data.events)?data.events:[]).map(original=>{
  if(!original||typeof original!=='object')return null;
  const event={...original},row=rows.find(r=>r&&r.contactId&&r.contactId===event.contactId||r?.npcId&&(r.npcId===event.actorId||r.npcId===event.npcId));
  const explicit=event.actorId||event.npcId||row?.npcId;
  const npc=npcs.find(n=>n.id===explicit)||(!explicit?npcs.find(n=>incomingContactId(n.id)===event.contactId):null)
   ||(row?.npc?.name?phoneNpcForContact({label:row.npc.name},npcs):null);
  const byId=phone.contacts.find(c=>c.id===event.contactId||!event.contactId&&c.id===event.actorId),byNpc=npc&&phone.contacts.find(c=>c.npcId===npc.id);
  if(byId?.npcId&&npc&&byId.npcId!==npc.id)return null;
  let contact=byNpc||byId;
  const number=clean(row?.number||event.number||npc?.phone||npc?.phoneNumber,50);
  if(!contact&&number){const same=phone.contacts.find(c=>c.number===number);if(same?.npcId&&npc&&same.npcId!==npc.id)return null;contact=same;}
  if(contact?.blocked||npc&&phone.contacts.some(c=>c.npcId===npc.id&&c.blocked))return null;
  const proactive=!event.requestId&&['message','call','post','follow','unfollow'].includes(event.type);
  if(!contact){
   if(!proactive||(explicit&&!npc&&!row?.npc?.name)||(row?.source==='public'&&!npc))return null;
   const label=clean(event.displayName||row?.displayName||row?.apps?.[event.app||'messages']?.displayName||row?.apps?.messages?.displayName||playerNpc(npc)?.name||row?.npc?.name,100);
   if(!label||label==='???'||/^(?:unknown|unknown caller|unknown sender)$/iu.test(label)){
    // An anonymous account still needs an explicit routing identifier.
    if(!npc&&(!key(event.contactId)||event.contactId==='player'))return null;
   }
   if(!npc&&!row&&!clean(event.displayName,100))return null;
   const contactId=npc?incomingContactId(npc.id):key(event.contactId)&&event.contactId!=='player'?event.contactId:'incoming-'+fingerprint(label+'|'+number).slice(0,24);
   if(contactId==='player'||phone.contacts.some(c=>c.id===contactId))return null;
   contact={id:contactId,npcId:npc?.id||'',name:label||'Unknown sender',label:label||'Unknown sender',number,avatar:'',blocked:false,muted:false,source:'incoming',saved:true,created:false,notes:''};
  }
  if(key(event.contactId))aliases.set(event.contactId,contact.id);
  event.contactId=contact.id;
  // The model cannot know a new thread's generated ID. Use the engine's direct
  // conversation, retaining validation for real, deleted and requested threads.
  if(proactive&&event.type==='message'&&event.threadId&&!phone.threads.some(t=>t.id===event.threadId)&&!phone.deletedThreads.includes(event.threadId))event.threadId='';
  const existing=phone.contacts.find(c=>c.id===contact.id),channel=event.type==='message'?(event.app==='gather'?'gather':'messages'):event.type==='call'?'calls':'';
  if(proactive&&(!existing||channel&&!contact.number&&!contact.channels?.[channel])){
   const candidate=existing?phone:{...phone,contacts:[...phone.contacts,contact]};
   if(applyIncoming(candidate,event,{time,config,source}).revision!==candidate.revision){
    let saved=existing;if(!saved){saved=contact;phone.contacts.push(saved);}
    if(channel)saved.channels={...saved.channels,[channel]:true};
    accepted.add(saved.id);
   }
  }
  return event;
 }).filter(Boolean);
 const profiles=rows.filter(r=>r&&typeof r==='object').map(row=>{
  const known=row.npcId&&phone.contacts.find(c=>c.npcId===row.npcId),contactId=known?.id||aliases.get(row.contactId)||row.contactId;
  return {...row,contactId};
 });
 return {events,profiles,accepted};
}
