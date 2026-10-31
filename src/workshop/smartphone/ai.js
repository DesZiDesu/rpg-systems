import {isKeitai,KEITAI_INSTRUCTIONS,mailAddress,phoneRequestAvailable} from './handset.js?v=0.94.1';
import {PHONE_RELATIONSHIP_INSTRUCTIONS,phoneRelationshipReference,applyPhoneRelationships,phoneRelationshipRows} from './relationships.js?v=0.94.1';
import {RELATIONSHIP_INSTRUCTIONS} from '../../relationship-core.js?v=0.94.1';
import {incomingContactId,routeIncomingPhoneData} from './incoming.js?v=0.94.1';
import {usableNpcName} from '../../npc-core.js?v=0.94.1';
import {clean,clone,fingerprint,publicProfile,contactLabel,storyTime} from './model.js?v=0.94.1';
import {advancePhoneClock,phoneReplyMinutes} from './clock.js?v=0.94.1';
import {applyIncoming} from './engine.js?v=0.94.1';
import {linkPhoneContacts,phoneNpcForContact} from './identity.js?v=0.94.1';
import {PHONE_WORLD_KNOWLEDGE,phoneEnvironment,phoneAppChannel,publicPhonePosts} from './context.js?v=0.94.1';

export function parsePhoneReply(raw){
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
 const text=String(raw||'').replace(/<think\b[^>]*>[\s\S]*?<\/think>/giu,''),fence=String.fromCharCode(96).repeat(3);
 const block=text.match(/<rf-phone>([\s\S]*?)<\/rf-phone>/iu)?.[1]||text.replace(new RegExp('^\\s*'+fence+'(?:json)?\\s*|\\s*'+fence+'\\s*$','g'),'').trim();
 let parsed;try{parsed=JSON.parse(block);}catch{throw Error('The phone response was not valid JSON. Your sent message is saved; retry the reply.');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('The phone response must be a JSON object');return parsed;
}
export const PHONE_SCHEMA='{"relationshipEvents":[{"actorId":"stable NPC id","targetId":"player or stable NPC id","kind":"support|romance|promise|conflict|establish|separate|values|repair|discovery","evidence":"exact delivered line","changes":{"trust":1}}],"profiles":[{"contactId":"id","source":"incoming|public","npcId":"existing NPC id or empty","displayName":"public caller/account name","number":"only if established","email":"only if established","npc":{"name":"","occupation":"","personality":"","description":""},"apps":{"messages":{"displayName":"","handle":"","bio":"","status":""},"gather":{},"lumen":{},"murmur":{}}}],"events":[{"type":"message|call-result|call-speech|call|post|follow|unfollow","contactId":"","actorId":"existing NPC id when available","displayName":"public sender name for a new contact","requestId":"","threadId":"","callId":"","text":"","channel":"sms|mail","subject":"for mobile mail","elapsedMinutes":1,"stickerId":"","app":"messages|gather|lumen|murmur","status":"connected|declined|missed","kind":"post|story"}],"pages":[{"requestId":"pending web request ID","title":"","body":"","source":""}],"news":[{"id":"","title":"","body":"","source":""}]}';
const visibleApps=profiles=>Object.fromEntries(Object.entries(profiles||{}).map(([app,p])=>[app,{displayName:p.displayName,handle:p.handle,bio:p.bio,status:p.status,private:p.private===true}]));
const rules=[
 'Use exact supplied IDs for known entities; choose one stable contactId for a genuinely new sender. For a pending request, include its requestId and target threadId/callId. Reply with 1–6 separate message events when natural, not a single combined bubble. Someone may be busy, miss or decline a call.',
 'A phone can receive its FIRST message or call even with an empty contact list. For an existing NPC, emit the incoming event with actorId equal to its stable NPC id; use its supplied contactId when one exists. The engine creates its contact and conversation. For a new sender, include profiles:[{source:incoming,contactId,npc:{name,occupation,personality,description},apps:{messages:{displayName,handle}}}] and the matching event. Reuse a known identity and its aliases. An anonymous sender can use an explicit contactId and public displayName without revealing a true name. Contact creation is engine bookkeeping, never an invented player action. A first message omits threadId; the engine creates it. Do not require the player to save a contact or exchange numbers first when an incoming channel is already established. Only use phone numbers actually established in the roleplay; otherwise leave number empty.',
 'Only contacts marked needsNpc or genuinely new incoming senders get a new NPC profile. Reuse existing identities. A new custom contact needs a complete npc profile before it can answer. Group replies come only from members of that thread.',
 'Keep player-saved contact labels separate from NPC self-chosen app profiles. Depending on personality, public names can be plain names, initials, nicknames, playful/weird handles or professional identities. Do not make everyone use a joke name.',
 'Never reveal secret true names or private thoughts. NPCs know their own conversations and shared public posts, not other private threads. Do not invent image URLs. Sticker events use only supplied allowed IDs and usage cues.',
 'Call-speech is only for a connected call. Call-result resolves the outstanding outgoing call with connected, declined or missed. Do not create an incoming call while another is active.',
 'Proactive messages, calls, posts and follows need explicit scene grounds and enabled permissions. Do not invent unseen offscreen actions unless allowed. No automatic polling. Respect blocked contacts and installed apps.',
 'For a known NPC with no saved phone contact, a public social profile can use profiles:[{source:public,npcId,contactId:social-NPC_ID,apps:{lumen:{displayName,handle},murmur:{displayName,handle}}}]. Reuse existing NPC IDs; public account names do not reveal a secret identity. To register a number explicitly shared in the visible scene, use an event {type:contact-share,actorId,displayName,number}; both number and displayName must appear in visible prose.',
 'A photo attachment is described by its user caption; do not claim pixel-level vision. You may send photoId only for a supplied photo already shared with that sender. Do not invent image URLs or access the private gallery.',
 'Player-saved app profiles are authoritative configuration. Never rename or rewrite them. Use the player profile for the app involved when addressing that account; a handle does not change their canonical persona identity.',
 'For standalone phone replies, each message/call speech/call result may supply elapsedMinutes: a positive integer. Usually 1 minute for a quick bubble, 2–3 for reading/composing a longer message, up to 10 only for a grounded delay. Multiple bubbles share one continuous exchange; keep total elapsed time modest (maximum 30 minutes). The engine has already advanced time for each player send. Never jump to a future appointment merely because someone mentions it, and do not treat words such as sleep, travel or tomorrow in dialogue as completed actions. Main-chat events and story-repair recover the time already established by that scene and must not advance it again.',
 'No user speech/actions, world-state patches, item grants, money or gambling wins. Wallet actions are already settled by the engine; never debit or reward twice.',
].join('\n');
const phoneRules=config=>(isKeitai(config)?KEITAI_INSTRUCTIONS:PHONE_WORLD_KNOWLEDGE)+'\n'+rules+'\nFor a pending web request, return pages:[{requestId,title,body,source}] using that exact request ID. Write a concise fictional in-world page about the requested news, weather or travel section using the supplied location, world and clock. No real Internet access is implied. Do not change the story calendar or invent player movement. Keep pages private to the player until shared.';
export function phoneTask(phone,state,config,requests,{kind='reply',language='en',contacts=[],actors:storyActors=[],story=null,trackRelationships=true}={}){
 const actors=[...new Set([...storyActors,...requests.flatMap(r=>phone.threads.find(t=>t.id===r.threadId)?.members.filter(v=>v!=='player')||[r.contactId])])];
 const references=actors.map(actor=>{
  const candidate=contacts.find(n=>incomingContactId(n.id)===actor)||(state.npcs||[]).find(n=>incomingContactId(n.id)===actor);
  const c=phone.contacts.find(c=>c.id===actor)||(candidate?{id:incomingContactId(candidate.id),npcId:candidate.id,label:candidate.name,number:candidate.phone||candidate.phoneNumber||'',notes:''}:null);if(!c||c.blocked||phone.contacts.some(v=>v.npcId===c.npcId&&v.blocked))return null;
  const npc=contacts.find(n=>n.id===c.npcId)||(state.npcs||[]).find(n=>n.id===c.npcId);
  return {contactId:c.id,npcId:c.npcId||'',savedLabel:c.label,number:c.number,email:c.email||'',notes:c.notes,needsNpc:!c.npcId,
   character:npc?{name:npc.name,aliases:npc.aliases,occupation:npc.occupation,description:npc.background||npc.description,personality:npc.personality,relationship:npc.relationship}:null,
   appProfiles:visibleApps(phone.profiles[c.id]),
   messages:phone.messages.filter(m=>!m.deleted&&phone.threads.some(t=>t.id===m.threadId&&t.members.includes(c.id))).slice(-24).map(m=>({id:m.id,threadId:m.threadId,...phoneAppChannel(phone,m.threadId),from:m.from,text:m.text,subject:m.subject,photoId:m.photoId,time:m.time,stickerId:m.stickerId,photo:m.image?{id:phone.photos.find(v=>v.image===m.image)?.id,caption:phone.photos.find(v=>v.image===m.image)?.caption||'Photo attachment'}:undefined})),
   sharedPhotos:phone.photos.filter(p=>p.sharedWith?.includes(c.id)).map(p=>({id:p.id,caption:p.caption})),activeCall:phone.calls.find(v=>v.contactId===c.id&&v.status==='connected')||null};
 }).filter(Boolean);
 return {systemPrompt:'You are the in-world phone narrator for RoleForge. Return one JSON object, no main-chat prose and no user message. Speak '+(language==='th'?'Thai':'English')+'. Schema: '+PHONE_SCHEMA+'\n'+phoneRules(config)+'\n'+PHONE_RELATIONSHIP_INSTRUCTIONS+'\n'+RELATIONSHIP_INSTRUCTIONS+(kind==='story-repair'?'\nRecover only phone activity already completed in the supplied scene. Use the preceding user turn as context, never create user actions. Copy explicitly sent message text exactly. If the scene confirms an NPC sent messages but omits their words, compose 1–6 brief NPC bubbles consistent with that completed action. Thinking about a message, typing a draft, future plans, quotations and hypothetical actions do not count as sending. Do not disclose the canonical identity behind a saved alias. Return empty events when nothing qualifies. Do not replay phone actions or message text already recorded in the supplied recent conversations. This is a one-time reconciliation, not a new scene.':''),
  prompt:'ROLEFORGE_PHONE_TASK\n'+JSON.stringify({kind,relationshipTrackingEnabled:trackRelationships,relationships:phoneRelationshipReference(phone,state),environment:phoneEnvironment(phone,config),requests:requests.map(r=>({...r,...phoneAppChannel(phone,r.threadId)})),references,story,playerProfiles:visibleApps(phone.profiles.player),scene:{location:state.location,clock:state.worldClock,player:publicProfile(phone,'player','messages',state.player?.name).displayName},
   stickers:phone.stickers.filter(s=>s.npcAllowed).map(s=>({id:s.id,name:s.name,useWhen:s.cue})),
   permissions:{messages:config.incomingMessages,calls:config.incomingCalls,social:!isKeitai(config)&&config.socialActivity,offscreen:config.offscreenActivity},
   publicPosts:isKeitai(config)?[]:publicPhonePosts(phone)}),responseLength:3500,trimNames:false};
}
export function phoneWorldPrompt(phone,state,config){
 const pending=phone.pending.filter(q=>q.status==='pending'&&phoneRequestAvailable(phone,q,config)),call=phone.calls.find(c=>c.status==='connected');
 const contacts=phone.contacts.filter(c=>!c.blocked).map(c=>({contactId:c.id,npcId:c.npcId,savedLabel:c.label,number:c.number,email:c.email||'',needsNpc:!c.npcId,apps:visibleApps(phone.profiles[c.id])}));
 return '[ASTER PHONE · PRIVATE ENGINE CONTEXT]\n'+phoneRules(config)+
  '\nIf resolving pending requests or appropriate phone/social activity in this scene, append one hidden <rf-phone>JSON</rf-phone> block using this schema: '+PHONE_SCHEMA+
  '\nThe shared clock and timestamped recent messages include phone-only exchanges. Continue from this current time; do not reset it to the last main-chat timestamp. NPCs remember their own phone conversation and established arrangements. Main prose may acknowledge notifications, but must also emit their event records. Different NPCs must not learn private content from this context. Only confirmed in-world news belongs in news. Return no phone block when nothing happened.\n'+
  JSON.stringify({environment:phoneEnvironment(phone,config),publicPosts:isKeitai(config)?[]:publicPhonePosts(phone),clock:state.worldClock,recentAlarms:phone.notifications.filter(n=>n.type==='alarm').slice(-3).map(n=>({title:n.title,time:n.time})),recentMessages:phone.messages.filter(m=>!m.deleted).slice(-12).map(m=>({threadId:m.threadId,...phoneAppChannel(phone,m.threadId),from:m.from,text:clean(m.text,1200),subject:m.subject,photoId:m.photoId,time:m.time})),availableNpcs:(state.npcs||[]).filter(n=>!phone.contacts.some(c=>c.npcId===n.id&&c.blocked)).slice(0,32).map(n=>({npcId:n.id,contactId:phone.contacts.find(c=>c.npcId===n.id)?.id||incomingContactId(n.id),name:n.name,aliases:n.aliases})),pending,playerName:state.player?.name,playerProfiles:visibleApps(phone.profiles.player),activeCall:call?{id:call.id,contactId:call.contactId,muted:call.muted,transcript:call.transcript.slice(-12)}:null,contacts,installed:isKeitai(config)?['phone','messages','contacts','photos','browser','notes','settings']:phone.installed,
   permissions:{incomingMessages:config.incomingMessages,incomingCalls:config.incomingCalls,socialActivity:!isKeitai(config)&&config.socialActivity,offscreenActivity:config.offscreenActivity,maxEvents:config.maxEvents},
   stickers:phone.stickers.filter(s=>s.npcAllowed).map(s=>({id:s.id,name:s.name,cue:s.cue})),sharedPhotos:phone.photos.filter(p=>p.sharedWith?.length).map(p=>({id:p.id,caption:p.caption,sharedWith:p.sharedWith})),recentMoneyReceipts:phone.ledger.slice(-4)});
}
export function storyPhoneData(message){
 return [...String(message?.mes||'').matchAll(/<rf-phone>([\s\S]*?)<\/rf-phone>/giu)].map(m=>{try{return parsePhoneReply(m[1]);}catch{return null;}}).filter(Boolean);
}
export function mergePhoneReply(current,state,raw,config,{requests=[],source='',time={},storyText='',advanceTime=false,relationshipSource='',trackRelationships=true}={}){
 if(isKeitai(config))config={...config,socialActivity:false};
 let data=parsePhoneReply(raw),rpg=clone(state);const incomingEvents=Array.isArray(data.events)?data.events:[];const pending=new Map(requests.map(r=>[r.id,r])),phone=clone(linkPhoneContacts(current,rpg.npcs||[]));
 const visibleStory=String(storyText).replace(/<rf-phone>[\s\S]*?<\/rf-phone>/giu,'');
 for(const event of Array.isArray(data.events)?data.events:[])if(event.type==='contact-share'){
  const npc=rpg.npcs.find(n=>n.id===event.actorId),number=clean(event.number,50),name=clean(event.displayName,100);
  if(npc&&number&&name&&visibleStory.includes(number)&&visibleStory.includes(name)&&!phone.contacts.some(c=>c.npcId===npc.id||c.number===number))phone.contacts.push({id:'npc-'+npc.id,npcId:npc.id,name:npc.name,label:name,number,avatar:'',blocked:false,muted:false,source:'story',notes:'Shared in the story',created:false});
 }
 for(const row of Array.isArray(data.profiles)?data.profiles:[])if(row.source==='public'&&config.socialActivity&&row.npcId&&row.contactId==='social-'+row.npcId&&!phone.contacts.some(c=>c.id===row.contactId||c.npcId===row.npcId)){
  const npc=rpg.npcs.find(n=>n.id===row.npcId),publicName=clean(row.apps?.lumen?.displayName||row.apps?.murmur?.displayName,80);
  if(npc&&publicName)phone.contacts.push({id:row.contactId,npcId:npc.id,name:npc.name,label:publicName,number:'',avatar:'',blocked:false,muted:false,source:'public',notes:'Public social profile',created:false});
 }
 const routed=routeIncomingPhoneData(phone,rpg,{...data,events:(Array.isArray(data.events)?data.events:[]).slice(0,Math.max(config.maxEvents,requests.length*6))},config,{time,source});data={...data,...routed};
 const relevant=new Set([...routed.accepted,...requests.flatMap(r=>phone.threads.find(t=>t.id===r.threadId)?.members.filter(v=>v!=='player')||[r.contactId])]),completed=new Set(),created=[];
 // A first incoming message has no player request. Validate its permissions and
 // destination before accepting a profile for that existing contact.
 for(const event of Array.isArray(data.events)?data.events:[])if(!event.requestId&&!relevant.has(event.contactId)&&data.profiles.some(r=>r.contactId===event.contactId)&&phone.contacts.some(c=>c.id===event.contactId&&!c.blocked)&&applyIncoming(phone,event,{time,config,source}).revision!==phone.revision)relevant.add(event.contactId);
 for(const row of (Array.isArray(data.profiles)?data.profiles:[]).slice(0,12)){
  const c=phone.contacts.find(c=>c.id===row.contactId&&!c.blocked);if(!c||!relevant.has(c.id)&&!(row.source==='public'&&config.socialActivity&&Boolean(c.npcId)))continue;
  const known=!c.npcId&&(phoneNpcForContact(c,rpg.npcs)||rpg.npcs.find(n=>n.id===row.npcId));
  if(known){c.npcId=known.id;c.name=known.name;c.created=false;}
  if(!c.npcId&&row.npc&&usableNpcName(row.npc.name)){
   const existing=phoneNpcForContact({label:row.npc.name},rpg.npcs);
   const npcId=existing?.id||(typeof row.npcId==='string'&&/^[\p{L}\p{N}_.:-]{1,100}$/u.test(row.npcId)&&!['player','__proto__','constructor','prototype'].includes(row.npcId)?row.npcId:'phone-npc-'+c.id);
   if(!rpg.npcs.some(n=>n.id===npcId))rpg.npcs.push({id:npcId,name:clean(row.npc.name,120),race:'Human',occupation:clean(row.npc.occupation,120)||'Phone contact',background:clean(row.npc.description,2000),personality:clean(row.npc.personality,2000),relationship:'Phone contact',met:false,enabled:true,lifeMode:'Active',notes:'Created through phone contact '+c.number,stats:{hp:100,maxHp:100},themeColor:'#8aab9c'});
   c.npcId=npcId;c.name=clean(row.npc.name,120);c.created=!existing;if(!existing)created.push(npcId);
  }
  if(mailAddress(row.email)&&c.source==='incoming')c.email=mailAddress(row.email);phone.profiles[c.id]||={};
  for(const app of ['messages','gather','lumen','murmur'])if(row.apps?.[app]&&!phone.profiles[c.id][app]?.locked){
   const value=row.apps[app];phone.profiles[c.id][app]={...phone.profiles[c.id][app],displayName:clean(value.displayName,80)||c.label,handle:clean(value.handle,48),bio:clean(value.bio,800),status:clean(value.status,160),avatar:phone.profiles[c.id][app]?.avatar||c.avatar||''};
  }
 }
 const events=(Array.isArray(data.events)?data.events:[]).slice(0,Math.max(config.maxEvents,requests.length*6));
 let next=phone,elapsed=0;
 for(const [i,event]of events.entries()){
  const c=next.contacts.find(c=>c.id===event.contactId&&!c.blocked);if(!c)continue;
  const request=pending.get(event.requestId),thread=request?.threadId?next.threads.find(t=>t.id===request.threadId):null;
  if(event.requestId&&(!request||request.contactId!==c.id&&!thread?.members.includes(c.id)))continue;
  if(request&&['call-result','call-speech'].includes(event.type)&&request.callId!==event.callId)continue;
  if(request&&event.type==='message'&&request.threadId!==event.threadId)continue;
  if(!c.npcId&&c.source!=='incoming')continue;
  // Reserve a minute for each later bubble instead of freezing the end of an
  // unusually verbose reply at the batch limit. Batched requests may exceed 30 bubbles.
  const requested=advanceTime?phoneReplyMinutes(event):0;
  const duration=requested?Math.min(requested,Math.max(1,Math.max(30,events.length)-elapsed-(events.length-i-1))):0,advanced=advancePhoneClock(rpg,duration);
  const before=next.revision;next=applyIncoming(next,event,{time:advanceTime?storyTime(advanced):time,config,source:source+':'+i});
  if(next.revision!==before){if(request)completed.add(request.id);rpg=advanced;elapsed+=duration;}
 }
 for(const a of (Array.isArray(data.news)?data.news:[]).slice(0,6))if(clean(a.title,180)&&clean(a.body,6000)){
  const articleId=clean(a.id,160)||fingerprint(a.title);if(!next.news.some(n=>n.id===articleId))next.news.push({id:articleId,title:clean(a.title,180),body:clean(a.body,6000),source:clean(a.source,100)||'Local desk',time});
 }
 for(const page of (Array.isArray(data.pages)?data.pages:[]).slice(0,3)){const q=pending.get(page.requestId);if(!q||q.type!=='web'||!clean(page.title,180)||!clean(page.body,6000))continue;const entry={id:q.id,section:q.section,title:clean(page.title,180),body:clean(page.body,6000),source:clean(page.source,100)||'Aster Portal',time:{...time}};next.webPages=next.webPages.filter(p=>p.section!==q.section);next.webPages.push(entry);completed.add(q.id);}
 next.pending=next.pending.filter(r=>!completed.has(r.id));next.incomingRoutingVersion=1;next.revision++;
 const unresolved=incomingEvents.some(e=>['message','call'].includes(e?.type)&&!e.requestId&&(e.type==='message'?config.incomingMessages:config.incomingCalls)&&!next.contacts.some(c=>(c.id===e.contactId||e.actorId&&c.npcId===e.actorId)&&(c.npcId||c.source==='incoming')))&&!next.messages.slice(current.messages.length).length&&!next.calls.slice(current.calls.length).length;
 const assessed=applyPhoneRelationships(rpg,next,phoneRelationshipRows(next,current),{events:data.relationshipEvents,source:relationshipSource,enabled:trackRelationships});rpg=assessed.state;
 if(assessed.checks.length)next.relationshipSync={checkedAt:assessed.checkedAt,checks:assessed.checks.slice(-24)};
 return {phone:next,state:rpg,created,completed:[...completed],unresolved};
}
