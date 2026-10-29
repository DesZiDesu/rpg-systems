import {applyPhoneRelationships,phoneRelationshipRows,recoverPhoneRelationships} from './relationships.js?v=0.90.16';
import {linkPhoneContacts,phoneNpcForContact} from './identity.js?v=0.90.16';
import {phoneSceneSignal,phoneStorySource,phoneOwnershipInStory} from './story.js?v=0.90.16';
import {createPhoneQueue} from './queue.js?v=0.90.16';
import {PHONE_FIELD,PHONE_PROMPT,normalizePhone,phoneConfig,clone,id,storyTime,hasDevice,callSpeech,fingerprint,contactFromNpc,publicProfile} from './model.js?v=0.90.16';
import {changePhone,phoneFinancial,registerArcade,loginArcade} from './engine.js?v=0.90.16';
import {phoneTask,phoneWorldPrompt,mergePhoneReply,storyPhoneData,parsePhoneReply} from './ai.js?v=0.90.16';
import {savePhoneChat} from './persistence.js?v=0.90.16';
import {requestDataTask} from '../../task-generation.js?v=0.90.16';
import {uiLanguage} from '../../ui-language.js?v=0.90.16';
import {mountPhoneShell} from './shell.js?v=0.90.16';
import {checkPhoneAlarms,isKeitai,phoneRequestAvailable} from './handset.js?v=0.90.16';
import {advancePhoneClock,phoneActionMinutes} from './clock.js?v=0.90.16';

export async function mountSmartphone({api,enabled,busy}){
 const keitaiStyle=document.createElement('link');keitaiStyle.rel='stylesheet';keitaiStyle.href=new URL('../../../styles/keitai.css?v=0.90.16',import.meta.url);await new Promise((ok,no)=>{keitaiStyle.onload=ok;keitaiStyle.onerror=no;document.head.append(keitaiStyle);});
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../../../styles/smartphone.css?v=0.90.16',import.meta.url);
 await new Promise((ok,no)=>{style.onload=ok;style.onerror=no;document.head.append(style);});
 let phone=normalizePhone(),scope='',nonce=null,revision=null,flight=null,queue,disposed=false,epoch=0,voiceQueue=Promise.resolve(),speechSeen=new Set(),error='',working=false,lastNotification='',replyTimer,pendingMain=null,requestedReplies=new Set(),linking=false,deviceCache={},catchupChecked=false,relationshipRecovery=false,alarmRecovery=false;
 const host=()=>SillyTavern.getContext(),context=()=>api.phoneContext?.()||api.context(),config=()=>phoneConfig(api.phoneConfiguration?.()),state=()=>context().state;
 const language=()=>config().language==='inherit'?uiLanguage():config().language;
 const knownNpcs=()=>[...new Map([...(api.phoneNpcReferences?.()||[]),...(state().npcs||[])].map(n=>[n.id,n])).values()];
 const ownsDevice=(current=state(),conf=config())=>{if(hasDevice(current,conf))return true;const c=host(),last=c.chat.at(-1),name=c.name1||current.player?.name;if(deviceCache.chat!==c.chat||deviceCache.count!==c.chat.length||deviceCache.text!==last?.mes||deviceCache.name!==name)deviceCache={chat:c.chat,count:c.chat.length,text:last?.mes,name,owned:phoneOwnershipInStory(c.chat,name)};return deviceCache.owned;};
 const active=()=>enabled()&&ownsDevice();
 const ticket=()=>({scope,nonce,epoch}),valid=t=>!disposed&&enabled()&&t.scope===context().key&&t.nonce===context().nonce&&t.epoch===epoch;
 let ui;
 function prompt(){host().setExtensionPrompt(PHONE_PROMPT,active()?phoneWorldPrompt(phone,state(),config()):'',1,1,false,0);}
 function refresh(){
  if(disposed)return;const c=context(),changed=scope!==c.key||nonce!==c.nonce;
  if(changed){catchupChecked=false;deviceCache={};scope=c.key;nonce=c.nonce;epoch++;working=false;flight=null;error='';queue?.reset();requestedReplies.clear();pendingMain=null;clearTimeout(replyTimer);phone=normalizePhone(host().chatMetadata?.[PHONE_FIELD]);revision=host().chatMetadata?.[PHONE_FIELD];speechSeen=new Set(phone.calls.flatMap(c=>c.transcript.map(r=>r.id)));api.voice?.stop?.('smartphone');ui?.reset();lastNotification=phone.notifications.at(-1)?.id||'';}
  else if(revision!==host().chatMetadata?.[PHONE_FIELD]){const next=normalizePhone(host().chatMetadata?.[PHONE_FIELD]);if(next.revision<phone.revision){epoch++;queue?.reset();ui?.reset();flight=null;working=false;}phone=next;revision=host().chatMetadata?.[PHONE_FIELD];}
  if(enabled()&&!linking&&linkPhoneContacts(phone,knownNpcs())!==phone){linking=true;void serial(async()=>{const next=linkPhoneContacts(phone,knownNpcs());if(next!==phone)await save(next);}).catch(report).finally(()=>linking=false);}
  if(enabled()&&!relationshipRecovery&&!busy()&&api.relationshipTrackingEnabled?.()!==false&&phone.relationshipRoutingVersion!==1){
   relationshipRecovery=true;const authority=ticket();
   void serial(async()=>{
    if(phone.relationshipRoutingVersion===1)return;
    await api.preparePhoneNpcs?.([...new Set(phone.contacts.map(c=>c.npcId).filter(Boolean))]);if(!valid(authority))return;
    const repaired=recoverPhoneRelationships(phone,state());await save(repaired.phone,repaired.state);
   }).catch(report).finally(()=>{relationshipRecovery=false;});
  }
  if(!catchupChecked&&enabled()&&host().chatMetadata?.[PHONE_FIELD]){
   catchupChecked=true;
   if(phone.incomingRoutingVersion===0){
    // Older builds acknowledged unroutable first messages. Retry only the last
    // completed reply of an empty phone, once per saved migration.
    void serial(async()=>{
     if(phone.incomingRoutingVersion!==0)return;
     const next=clone(phone),c=host(),i=c.chat.findLastIndex(m=>m&&!m.is_user&&!m.is_system),message=c.chat[i];let retry=false;
     if(active()&&!busy()&&!phone.contacts.length&&!phone.messages.length&&!phone.calls.length&&!phone.posts.length&&i>0&&c.chat.at(-1)===message){
      const user=c.chat.slice(0,i).findLast(m=>m?.is_user&&!m.is_system),signal=phoneSceneSignal(phone,{...state(),npcs:knownNpcs()},message,user,config());
      retry=Boolean(signal||storyPhoneData(message).some(b=>b.events?.some(e=>['message','call'].includes(e?.type))));
      if(retry){const source=phoneStorySource(message,i,api.visible?.(message.mes));next.processed=next.processed.filter(v=>v!==source&&v!==source+':repair');next.storySync=null;}
     }
     next.incomingRoutingVersion=1;next.revision++;await save(next);
     if(retry&&c.chat[i]===message){pendingMain=i;finishMain();}
    }).catch(report);
   }else if(!phone.processed.length&&!phone.messages.length&&!phone.calls.length&&!phone.posts.length){const i=host().chat.findLastIndex(m=>m&&!m.is_user&&!m.is_system);if(i>0&&host().chat.at(-1)===host().chat[i]){pendingMain=i;finishMain();}}
  }
  if(!enabled()){epoch++;working=false;flight=null;requestedReplies.clear();api.voice?.stop?.('smartphone');ui?.close();}
  if(enabled()&&!alarmRecovery&&phone.alarms.some(a=>a.enabled)&&JSON.stringify(phone.alarmClock)!==JSON.stringify({day:state().worldClock?.day,time:state().worldClock?.time})){alarmRecovery=true;void serial(async()=>{const next=checkPhoneAlarms(phone,state().worldClock);if(next!==phone)await save(next);}).catch(report).finally(()=>alarmRecovery=false);}
  prompt();ui?.render();
 }
 async function save(next,rpg){
  const t=ticket(),c=host(),old=c.chatMetadata[PHONE_FIELD];if(!valid(t))throw Error('The chat changed before saving');
  next=checkPhoneAlarms(next,(rpg||state()).worldClock);const saved=clone(next);delete saved.sessions;if(JSON.stringify(saved).length>12*1024*1024)throw Error('Phone storage is full. Remove unused photos or stickers before saving.');
  try{
   const ok=await api.commitState(rpg||state(),'smartphone',{guard:()=>valid(t),prepareSave:()=>{if(!valid(t))throw Error('The chat changed before saving');c.chatMetadata[PHONE_FIELD]=saved;},saveMetadataOverride:()=>savePhoneChat(c)});
   if(!ok)throw Error('Phone changes were not saved. Wait for the current action, then retry.');
   if(!valid(t))return false;phone=next;revision=saved;error='';prompt();ui?.render();playNewSpeech();return true;
  }catch(e){if(c.chatMetadata[PHONE_FIELD]===saved){if(old===undefined)delete c.chatMetadata[PHONE_FIELD];else c.chatMetadata[PHONE_FIELD]=old;}throw e;}
 }
 function serial(operation){return queue.run(operation);}
 async function act(action){
  if(config().voiceAuto&&(['call-start','call-speech'].includes(action.type)||action.type==='call-state'&&action.status==='connected'))api.voice?.activate?.();
  const result=await serial(async()=>{
   if(action.type==='draft'&&(phone.drafts[action.threadId]||'')===String(action.text||'').trim())return;
   if(action.type==='read'&&!phone.messages.some(m=>m.threadId===action.threadId&&!m.read)&&!phone.notifications.some(n=>(n.target===action.threadId||action.all)&&!n.read))return;
   if(!ownsDevice())throw Error('Your character needs a phone, or enable “Assume a phone” in Workshop settings.');
   if(isKeitai(config())&&['install','uninstall','group-save','post-save','post-delete','like','bookmark','repost','comment','follow','follow-approve'].includes(action.type))throw Error('This app is not supported by the Aster K06 handset');
   const current=state(),next=advancePhoneClock(current,phoneActionMinutes(action)),linked=linkPhoneContacts(phone,knownNpcs());
   const row=changePhone(linked,action,{time:storyTime(next),playerName:current.player?.name,location:current.location});
   if(row.phone!==linked){const changed=linkPhoneContacts(row.phone,knownNpcs()),assessed=applyPhoneRelationships(next,changed,phoneRelationshipRows(changed,linked),{enabled:api.relationshipTrackingEnabled?.()!==false});if(assessed.checks.length)changed.relationshipSync={checkedAt:assessed.checkedAt,checks:assessed.checks.slice(-24)};await save(changed,assessed.state);}return row.result;
  });
  if(action.type==='browser-query'&&(action.mode||config().replyMode)==='immediate')void respond({ids:[result]}).catch(report);
  if((['message-send','call-start','call-speech'].includes(action.type)||action.type==='call-state'&&action.status==='connected')&&(action.mode||config().replyMode)==='immediate')void respond(action.type==='message-send'?{threadId:action.threadId}:{callId:action.callId||result}).catch(report);
  if(action.type==='call-state'&&['ended','declined','missed'].includes(action.status))api.voice?.stop?.('smartphone');
  return result;
 }
 function report(e){error=e.message;ui?.render();}
 async function respond(target={}){
  const t=ticket(),requests=phone.pending.filter(q=>q.status==='pending'&&phoneRequestAvailable(phone,q,config())&&(!target.threadId||q.threadId===target.threadId)&&(!target.callId||q.callId===target.callId)&&(!target.ids||target.ids.includes(q.id))).slice(0,8);if(!requests.length)return;
  if(flight||busy()){for(const q of requests)requestedReplies.add(q.id);ui?.render();return flight;}
  for(const q of requests)requestedReplies.delete(q.id);
  working=true;error='';ui?.render();
  flight=(async()=>{
   await api.preparePhoneNpcs?.(phone.contacts.filter(c=>requests.some(r=>r.contactId===c.id||phone.threads.find(t=>t.id===r.threadId)?.members.includes(c.id))).map(c=>c.npcId).filter(Boolean));if(!valid(t))return;
   await serial(async()=>{const linked=linkPhoneContacts(phone,knownNpcs());if(linked!==phone)await save(linked);});if(!valid(t))return;
   const args=phoneTask(phone,state(),config(),requests,{language:language(),contacts:api.phoneNpcReferences?.()||[],trackRelationships:api.relationshipTrackingEnabled?.()!==false});
   const raw=await requestDataTask(host(),args,{quietPrompt:args.prompt,skipWIAN:true,removeReasoning:true},{task:'Phone reply'});
   if(!valid(t))return;await prepareReplyNpcs([parsePhoneReply(raw)]);if(!valid(t))return;
   await serial(async()=>{
    const still=requests.filter(r=>phone.pending.some(q=>q.id===r.id));if(!still.length)return;
    const result=mergePhoneReply(phone,state(),raw,config(),{requests:still,source:'task:'+requests.map(r=>r.id).join(','),time:storyTime(state()),advanceTime:true,trackRelationships:api.relationshipTrackingEnabled?.()!==false});await save(result.phone,result.state);
   });
  })().catch(e=>{if(valid(t))report(e);}).finally(()=>{if(valid(t)){working=false;flight=null;ui?.render();if(pendingMain!==null)finishMain();flushReplies();}});
  return flight;
 }
 function flushReplies(){if(disposed||!enabled()||busy()||flight||!requestedReplies.size)return;const ids=[...requestedReplies];requestedReplies.clear();if(ids.some(id=>phone.pending.some(q=>q.id===id)))void respond({ids}).catch(report);}
 async function prepareReplyNpcs(blocks){
  const known=knownNpcs(),ids=[];
  for(const data of blocks){
   for(const row of Array.isArray(data.profiles)?data.profiles:[]){if(!row||typeof row!=='object')continue;const npc=phoneNpcForContact({npcId:row.npcId,label:row.npc?.name||row.displayName||''},known)||phoneNpcForContact({label:row.npc?.name||row.displayName||''},known);if(npc)ids.push(npc.id);else if(row.npcId)ids.push(row.npcId);}
   for(const event of Array.isArray(data.events)?data.events:[])if(event?.actorId||event?.npcId)ids.push(event.actorId||event.npcId);
  }
  if(ids.length)await api.preparePhoneNpcs?.([...new Set(ids)]);
 }
 async function incoming(messageId){
  if(!active())return;const authority=ticket();
  const c=host(),message=c.chat[Number(messageId)];if(!message||message.is_user||message.is_system)return;
  await api.awaitReplyState?.(Number(messageId));if(!valid(authority)||c.chat[Number(messageId)]!==message)return;
  await prepareReplyNpcs(storyPhoneData(message));
  if(!valid(authority)||c.chat[Number(messageId)]!==message)return;
  const source=phoneStorySource(message,Number(messageId),api.visible?.(message.mes)),data=storyPhoneData(message);let unresolved=false;
  if(phone.processed.includes(source))return;
  await serial(async()=>{
   if(phone.processed.includes(source))return;
   let next=linkPhoneContacts(phone,knownNpcs()),rpg=state();
   for(const block of data){const merged=mergePhoneReply(next,rpg,block,config(),{requests:next.pending,source,time:storyTime(state()),storyText:message.mes,trackRelationships:api.relationshipTrackingEnabled?.()!==false,relationshipSource:api.relationshipSource?.(Number(messageId))||''});next=merged.phone;rpg=merged.state;unresolved||=merged.unresolved;}
   const call=next.calls.find(v=>v.status==='connected'),contact=call&&next.contacts.find(v=>v.id===call.contactId);
   if(call&&contact&&['both','main'].includes(config().callInput)&&!data.some(block=>block.events?.some(e=>e.type==='call-speech'&&e.callId===call.id))){const text=callSpeech(message,contact,false);if(text&&!call.transcript.some(r=>r.source===source)){const previous=next;next=changePhone(next,{type:'call-speech',callId:call.id,from:contact.id,text,source},{time:storyTime(state())}).phone;const assessed=applyPhoneRelationships(rpg,next,phoneRelationshipRows(next,previous),{enabled:api.relationshipTrackingEnabled?.()!==false,source:api.relationshipSource?.(Number(messageId))||''});rpg=assessed.state;if(assessed.checks.length)next.relationshipSync={checkedAt:assessed.checkedAt,checks:assessed.checks.slice(-24)};}}
   if(data.length||next!==phone){next=clone(next);if(data.length&&!unresolved)next.processed.push(source);await save(next,rpg);}
  });
  if(valid(authority)&&(!data.length||unresolved))await recoverStory(Number(messageId));
 }
 async function recoverStory(messageId,manual=false){
  if(!active()||!Number.isInteger(messageId)||messageId<1)return;
  const message=host().chat[messageId];if(!message||message.is_user||message.is_system)return;
  const source=phoneStorySource(message,messageId,api.visible?.(message.mes)),attempt=source+':repair';
  const retryEmpty=manual&&!phone.contacts.length&&!phone.messages.length&&!phone.calls.length;
  if(phone.processed.includes(source)&&!retryEmpty||!manual&&phone.processed.includes(attempt))return;
  const user=host().chat.slice(0,messageId).findLast(m=>m?.is_user&&!m.is_system),signal=phoneSceneSignal(phone,{...state(),npcs:knownNpcs()},{...message,mes:api.visible?.(message.mes)??message.mes},user?{...user,mes:api.visible?.(user.mes)??user.mes}:null,config());if(!signal)return;
  if(flight||busy()){if(!manual)pendingMain=messageId;else throw Error(language()==='th'?'รอคำตอบปัจจุบันให้จบก่อน':'Wait for the current reply to finish');return;}
  const t=ticket(),same=()=>valid(t)&&host().chat[messageId]===message&&phoneStorySource(message,messageId,api.visible?.(message.mes))===source;
  working=true;error='';ui?.render();
  flight=(async()=>{
   if(signal.npcIds?.length)await api.preparePhoneNpcs?.(signal.npcIds);if(!same())return;
   await serial(async()=>{const next=clone(linkPhoneContacts(phone,knownNpcs()));if(retryEmpty)next.processed=next.processed.filter(v=>v!==source);if(!next.processed.includes(attempt))next.processed.push(attempt);next.storySync={source,messageId,status:'working',error:''};next.revision++;await save(next);});if(!same())return;
   const args=phoneTask(phone,state(),config(),[],{kind:'story-repair',actors:signal.actors,story:signal.story,language:language(),contacts:knownNpcs()});
   const raw=await requestDataTask(host(),args,{quietPrompt:args.prompt,skipWIAN:true,removeReasoning:true},{task:'Phone story sync'});if(!same())return;await prepareReplyNpcs([parsePhoneReply(raw)]);if(!same())return;
   await serial(async()=>{
    const result=mergePhoneReply(phone,state(),raw,config(),{source,time:storyTime(state()),storyText:message.mes,trackRelationships:api.relationshipTrackingEnabled?.()!==false,relationshipSource:api.relationshipSource?.(Number(messageId))||''});
    const delivered=result.phone.messages.length>phone.messages.length||result.phone.calls.length>phone.calls.length||result.phone.posts.length>phone.posts.length;
    const detail=delivered?'':language()==='th'?'AI ยังไม่ได้ส่งข้อมูลข้อความที่ยืนยันแล้ว ลองซิงก์อีกครั้งได้':'The AI did not provide the confirmed phone messages. You can retry the sync.';
    result.phone.storySync={source,messageId,status:delivered?'done':'empty',error:detail};if(delivered)result.phone.processed.push(source);await save(result.phone,result.state);error=detail;ui?.render();
   });
  })().catch(async e=>{if(!same())return;report(e);await serial(async()=>{const next=clone(phone);next.storySync={source,messageId,status:'failed',error:e.message};next.revision++;await save(next);error=e.message;ui?.render();}).catch(()=>{});}).finally(()=>{if(valid(t)){working=false;flight=null;ui?.render();if(pendingMain!==null)finishMain();flushReplies();}});
  return flight;
 }
 async function userSpeech(messageId){
  if(!active()||!['both','user'].includes(config().callInput))return;const message=host().chat[Number(messageId)];if(!message?.is_user)return;
  const call=phone.calls.find(v=>v.status==='connected'&&!v.muted);if(!call)return;
  const contact=phone.contacts.find(v=>v.id===call.contactId);if(!contact||contact.blocked)return;
  const text=callSpeech(message,contact,true),source='user:'+fingerprint({id:messageId,text:message.mes});
  if(text&&!call.transcript.some(r=>r.source===source))await serial(async()=>{const next=changePhone(phone,{type:'call-speech',callId:call.id,from:'player',text,source,mode:'deferred'},{time:storyTime(state())}).phone;await save(next);});
 }
 async function playNewSpeech(){
  const call=phone.calls.find(c=>c.status==='connected');if(!call)return;if(!config().voiceAuto){for(const r of call.transcript)speechSeen.add(r.id);return;}
  const contact=phone.contacts.find(c=>c.id===call.contactId),v=api.voice?.catalog?.();if(!contact||!v?.enabled||!v.connected)return;
  for(const row of call.transcript.filter(r=>r.from!=='player'&&!speechSeen.has(r.id))){
   speechSeen.add(row.id);const t=ticket(),callId=call.id;
   const voice=contact.voiceId||publicProfile(phone,contact.id,'messages').voiceId||api.voice?.forNpc?.((state().npcs||[]).find(n=>n.id===contact.npcId)||{})||config().voiceFallback;
   if(!voice){error=language()==='th'?'เลือกเสียงของผู้ติดต่อหรือเสียงสำรองก่อน':'Choose a contact voice or a fallback voice first';ui?.render();continue;}
   voiceQueue=voiceQueue.catch(()=>{}).then(async()=>{const live=()=>valid(t)&&phone.calls.some(c=>c.id===callId&&c.status==='connected')&&config().voiceAuto;while(live()&&api.voice.catalog().phase!=='idle')await new Promise(ok=>setTimeout(ok,100));if(live()){api.voice.activate?.();await api.voice.speak(row.text,voice,live,'smartphone');}}).catch(report);
  }
 }
 async function replaySpeech(callId,rowId){
  const call=phone.calls.find(c=>c.id===callId),row=call?.transcript.find(r=>r.id===rowId&&r.from!=='player'),c=phone.contacts.find(c=>c.id===call?.contactId);
  if(!row||!c)throw Error('No NPC speech to replay');const v=api.voice?.catalog?.();if(!v?.enabled||!v.connected)throw Error('Enable and connect Voice Addon first');
  const voice=c.voiceId||api.voice?.forNpc?.((state().npcs||[]).find(n=>n.id===c.npcId)||{})||config().voiceFallback;if(!voice)throw Error('Choose a contact voice or fallback voice');
  const t=ticket();api.voice.activate?.();return api.voice.speak(row.text,voice,()=>valid(t),'smartphone');
 }
 async function preferences(raw){if(raw.voiceAuto===true)api.voice?.activate?.();await api.savePhoneConfiguration?.(phoneConfig({...config(),...raw}));refresh();}
 function financial(action){
  return serial(async()=>{if(action.type!=='transfer'&&!phone.sessions[action.accountId])throw Error('Log in to this fictional account first');const result=phoneFinancial(phone,state(),{...action,id:action.id||id()},{time:storyTime(state())});await save(result.phone,result.state);return result.result;});
 }
 function auth(action){
  return serial(async()=>{if(action.type==='logout'){delete phone.sessions[action.accountId];ui?.render();return;}
   if(action.type==='register'){await save(registerArcade(phone,action));return;}
   const accountId=loginArcade(phone,action.username,action.pin);phone.sessions[accountId]=true;ui?.render();return accountId;
  });
 }
 const runtime={get:()=>{const conf=config(),current=state();return {phone,config:conf,state:current,enabled:enabled(),hasDevice:ownsDevice(current,conf),working,error,language:conf.language==='inherit'?uiLanguage():conf.language,voices:api.voice?.catalog?.()||{enabled:false,connected:false,voices:[]}};},
  act,respond,preferences,financial,auth,replaySpeech,report,refresh,retryStory:()=>{const sync=phone.storySync,old=sync&&host().chat[sync.messageId],retry=old&&['failed','empty','interrupted'].includes(sync.status)&&phoneStorySource(old,sync.messageId,api.visible?.(old.mes))===sync.source;return recoverStory(retry?sync.messageId:host().chat.findLastIndex(m=>m&&!m.is_user&&!m.is_system),true);},world:()=>clone(phone),
  open:view=>{refresh();ui.open(view||'home');},close:()=>ui.close(),
  async syncNpcContacts(){for(const n of api.phoneNpcReferences?.()||[]){const c=contactFromNpc(n);if(c&&!phone.contacts.some(v=>v.npcId===c.npcId))await act({type:'contact-save',contact:c});}},
  ownsSpeech(messageId,name){const call=phone.calls.find(c=>c.status==='connected'),contact=phone.contacts.find(c=>c.id===call?.contactId);if(!contact||!enabled()||!config().voiceAuto)return false;const n=(state().npcs||[]).find(v=>v.id===contact.npcId);return [contact.npcId,contact.label,n?.name].some(v=>v&&v.toLocaleLowerCase()===String(name).toLocaleLowerCase());},
  destroy(){disposed=true;epoch++;clearTimeout(replyTimer);api.voice?.stop?.('smartphone');for(const [type,fn]of subscriptions)host().eventSource.removeListener(type,fn);document.removeEventListener('tretaresia-rpg:continuity-captured',refresh);host().setExtensionPrompt(PHONE_PROMPT,'',1,1,false,0);ui.destroy();style.remove();keitaiStyle.remove();if(globalThis.RoleForgePhone===runtime)delete globalThis.RoleForgePhone;}
 };
 queue=createPhoneQueue({capture:ticket,valid,before:refresh,onError:report});ui=mountPhoneShell(runtime);const subscriptions=[],on=(name,fn)=>{const type=host().eventTypes[name];if(type){host().eventSource.on(type,fn);subscriptions.push([type,fn]);}};
 on('CHAT_CHANGED',()=>refresh());const timelineChanged=(messageId,waitForReply=false)=>{deviceCache={};epoch++;flight=null;working=false;pendingMain=null;requestedReplies.clear();clearTimeout(replyTimer);queue.reset();ui.reset();api.voice?.stop?.('smartphone');void (async()=>{await api.awaitTimeline?.();if(disposed)return;refresh();const i=host().chat.findLastIndex(m=>m&&!m.is_user&&!m.is_system);if(!waitForReply&&i===host().chat.length-1&&i>=0){pendingMain=i;finishMain();}})().catch(report);};on('MESSAGE_DELETED',i=>timelineChanged(i));on('MESSAGE_SWIPED',i=>timelineChanged(i));on('MESSAGE_EDITED',i=>timelineChanged(i));
 on('GENERATION_STARTED',type=>{if(/regenerat|swipe/i.test(typeof type==='string'?type:JSON.stringify(type||'')))timelineChanged(undefined,true);});
 on('USER_MESSAGE_RENDERED',i=>{void userSpeech(i).catch(report);});
 const finishMain=()=>{clearTimeout(replyTimer);replyTimer=setTimeout(async()=>{refresh();if(busy()||flight)return;const i=pendingMain;pendingMain=null;if(i!==null)await incoming(i).catch(report);flushReplies();},150);};
 on('MESSAGE_RECEIVED',(i,type)=>{if(['quiet','impersonate'].includes(type))return;if(Number.isInteger(Number(i))&&host().chat[Number(i)]&&!host().chat[Number(i)].is_user){pendingMain=Number(i);finishMain();}});
 on('GENERATION_ENDED',()=>{if(pendingMain!==null||requestedReplies.size)finishMain();});
 document.addEventListener('tretaresia-rpg:continuity-captured',refresh);
 globalThis.RoleForgePhone=runtime;refresh();return runtime;
}
