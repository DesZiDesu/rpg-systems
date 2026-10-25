import {createPhoneQueue} from './queue.js?v=0.87.0';
import {PHONE_FIELD,PHONE_PROMPT,normalizePhone,phoneConfig,clone,id,storyTime,hasDevice,callSpeech,fingerprint,contactFromNpc,publicProfile} from './model.js?v=0.87.0';
import {changePhone,phoneFinancial,registerArcade,loginArcade} from './engine.js?v=0.87.0';
import {phoneTask,phoneWorldPrompt,mergePhoneReply,storyPhoneData} from './ai.js?v=0.87.0';
import {savePhoneChat} from './persistence.js?v=0.87.0';
import {requestDataTask} from '../../task-generation.js?v=0.87.0';
import {uiLanguage} from '../../ui-language.js?v=0.87.0';
import {mountPhoneUI} from './ui.js?v=0.87.0';

export async function mountSmartphone({api,enabled,busy}){
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../../../styles/smartphone.css?v=0.87.0',import.meta.url);
 await new Promise((ok,no)=>{style.onload=ok;style.onerror=no;document.head.append(style);});
 let phone=normalizePhone(),scope='',nonce=null,revision=null,flight=null,queue,disposed=false,epoch=0,voiceQueue=Promise.resolve(),speechSeen=new Set(),error='',working=false,lastNotification='',replyTimer,pendingMain=null,requestedReplies=new Set();
 const host=()=>SillyTavern.getContext(),context=()=>api.context(),config=()=>phoneConfig(api.phoneConfiguration?.()),state=()=>context().state;
 const language=()=>config().language==='inherit'?uiLanguage():config().language;
 const active=()=>enabled()&&hasDevice(state(),config());
 const ticket=()=>({scope,nonce,epoch}),valid=t=>!disposed&&enabled()&&t.scope===context().key&&t.nonce===context().nonce&&t.epoch===epoch;
 let ui;
 function prompt(){host().setExtensionPrompt(PHONE_PROMPT,active()?phoneWorldPrompt(phone,state(),config()):'',1,1,false,0);}
 function refresh(){
  if(disposed)return;const c=context(),changed=scope!==c.key||nonce!==c.nonce;
  if(changed){scope=c.key;nonce=c.nonce;epoch++;working=false;flight=null;error='';queue?.reset();requestedReplies.clear();pendingMain=null;clearTimeout(replyTimer);phone=normalizePhone(host().chatMetadata?.[PHONE_FIELD]);revision=host().chatMetadata?.[PHONE_FIELD];speechSeen=new Set(phone.calls.flatMap(c=>c.transcript.map(r=>r.id)));api.voice?.stop?.('smartphone');ui?.reset();lastNotification=phone.notifications.at(-1)?.id||'';}
  else if(revision!==host().chatMetadata?.[PHONE_FIELD]){const next=normalizePhone(host().chatMetadata?.[PHONE_FIELD]);if(next.revision<phone.revision){epoch++;queue?.reset();ui?.reset();flight=null;working=false;}phone=next;revision=host().chatMetadata?.[PHONE_FIELD];}
  if(!enabled()){epoch++;working=false;flight=null;requestedReplies.clear();api.voice?.stop?.('smartphone');ui?.close();}
  prompt();ui?.render();
 }
 async function save(next,rpg){
  const t=ticket(),c=host(),old=c.chatMetadata[PHONE_FIELD];if(!valid(t))throw Error('The chat changed before saving');
  const saved=clone(next);delete saved.sessions;
  try{
   const ok=await api.commitState(rpg||state(),'smartphone',{prepareSave:()=>{if(!valid(t))throw Error('The chat changed before saving');c.chatMetadata[PHONE_FIELD]=saved;},saveMetadataOverride:()=>savePhoneChat(c)});
   if(!ok)throw Error('Phone changes were not saved. Wait for the current action, then retry.');
   if(!valid(t))return false;phone=next;revision=saved;error='';prompt();ui?.render();playNewSpeech();return true;
  }catch(e){if(c.chatMetadata[PHONE_FIELD]===saved){if(old===undefined)delete c.chatMetadata[PHONE_FIELD];else c.chatMetadata[PHONE_FIELD]=old;}throw e;}
 }
 function serial(operation){return queue.run(operation);}
 async function act(action){
  if(config().voiceAuto&&(['call-start','call-speech'].includes(action.type)||action.type==='call-state'&&action.status==='connected'))api.voice?.activate?.();
  const result=await serial(async()=>{
   if(!hasDevice(state(),config()))throw Error('Your character needs a phone, or enable “Assume a phone” in Workshop settings.');
   const row=changePhone(phone,action,{time:storyTime(state()),playerName:state().player?.name});await save(row.phone);return row.result;
  });
  if((['message-send','call-start','call-speech'].includes(action.type)||action.type==='call-state'&&action.status==='connected')&&(action.mode||config().replyMode)==='immediate')void respond(action.type==='message-send'?{threadId:action.threadId}:{callId:action.callId||result}).catch(report);
  if(action.type==='call-state'&&['ended','declined','missed'].includes(action.status))api.voice?.stop?.('smartphone');
  return result;
 }
 function report(e){error=e.message;ui?.render();}
 async function respond(target={}){
  const t=ticket(),requests=phone.pending.filter(q=>q.status==='pending'&&(!target.threadId||q.threadId===target.threadId)&&(!target.callId||q.callId===target.callId)&&(!target.ids||target.ids.includes(q.id))).slice(0,8);if(!requests.length)return;
  if(flight||busy()){for(const q of requests)requestedReplies.add(q.id);ui?.render();return flight;}
  for(const q of requests)requestedReplies.delete(q.id);
  working=true;error='';ui?.render();
  flight=(async()=>{
   await api.preparePhoneNpcs?.(phone.contacts.filter(c=>requests.some(r=>r.contactId===c.id||phone.threads.find(t=>t.id===r.threadId)?.members.includes(c.id))).map(c=>c.npcId).filter(Boolean));if(!valid(t))return;
   const args=phoneTask(phone,state(),config(),requests,{language:language(),contacts:api.phoneNpcReferences?.()||[]});
   const raw=await requestDataTask(host(),args,{quietPrompt:args.prompt,skipWIAN:true,removeReasoning:true},{task:'Phone reply'});
   if(!valid(t))return;
   await serial(async()=>{
    const still=requests.filter(r=>phone.pending.some(q=>q.id===r.id));if(!still.length)return;
    const result=mergePhoneReply(phone,state(),raw,config(),{requests:still,source:'task:'+requests.map(r=>r.id).join(','),time:storyTime(state())});await save(result.phone,result.state);
   });
  })().catch(e=>{if(valid(t))report(e);}).finally(()=>{if(valid(t)){working=false;flight=null;ui?.render();flushReplies();}});
  return flight;
 }
 function flushReplies(){if(disposed||!enabled()||busy()||flight||!requestedReplies.size)return;const ids=[...requestedReplies];requestedReplies.clear();if(ids.some(id=>phone.pending.some(q=>q.id===id)))void respond({ids}).catch(report);}
 async function incoming(messageId){
  if(!active())return;
  const c=host(),message=c.chat[Number(messageId)];if(!message||message.is_user||message.is_system)return;
  await api.preparePhoneNpcs?.([...new Set(storyPhoneData(message).flatMap(b=>[...(b.profiles||[]).map(r=>r.npcId),...(b.events||[]).map(e=>e.actorId)]).filter(Boolean))]);
  const source='story:'+fingerprint({index:Number(messageId),swipe:message.swipe_id||0,text:message.mes}),data=storyPhoneData(message);
  await serial(async()=>{
   if(phone.processed.includes(source))return;
   let next=phone,rpg=state();
   for(const block of data){const merged=mergePhoneReply(next,rpg,block,config(),{requests:next.pending,source,time:storyTime(state()),storyText:message.mes});next=merged.phone;rpg=merged.state;}
   const call=next.calls.find(v=>v.status==='connected'),contact=call&&next.contacts.find(v=>v.id===call.contactId);
   if(call&&contact&&['both','main'].includes(config().callInput)&&!data.some(block=>block.events?.some(e=>e.type==='call-speech'&&e.callId===call.id))){const text=callSpeech(message,contact,false);if(text&&!call.transcript.some(r=>r.source===source)){next=changePhone(next,{type:'call-speech',callId:call.id,from:contact.id,text,source},{time:storyTime(state())}).phone;}}
   if(data.length||next!==phone){next=clone(next);next.processed.push(source);await save(next,rpg);}
  });
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
 const runtime={get:()=>({phone,config:config(),state:state(),enabled:enabled(),hasDevice:hasDevice(state(),config()),working,error,language:language(),voices:api.voice?.catalog?.()||{enabled:false,connected:false,voices:[]}}),
  act,respond,preferences,financial,auth,replaySpeech,report,refresh,world:()=>clone(phone),
  open:view=>{refresh();ui.open(view||'home');},close:()=>ui.close(),
  async syncNpcContacts(){for(const n of api.phoneNpcReferences?.()||[]){const c=contactFromNpc(n);if(c&&!phone.contacts.some(v=>v.npcId===c.npcId))await act({type:'contact-save',contact:c});}},
  ownsSpeech(messageId,name){const call=phone.calls.find(c=>c.status==='connected'),contact=phone.contacts.find(c=>c.id===call?.contactId);if(!contact||!enabled()||!config().voiceAuto)return false;const n=(state().npcs||[]).find(v=>v.id===contact.npcId);return [contact.npcId,contact.label,n?.name].some(v=>v&&v.toLocaleLowerCase()===String(name).toLocaleLowerCase());},
  destroy(){disposed=true;epoch++;clearTimeout(replyTimer);api.voice?.stop?.('smartphone');for(const [type,fn]of subscriptions)host().eventSource.removeListener(type,fn);document.removeEventListener('tretaresia-rpg:continuity-captured',refresh);host().setExtensionPrompt(PHONE_PROMPT,'',1,1,false,0);ui.destroy();style.remove();if(globalThis.RoleForgePhone===runtime)delete globalThis.RoleForgePhone;}
 };
 queue=createPhoneQueue({capture:ticket,valid,before:refresh,onError:report});ui=mountPhoneUI(runtime);const subscriptions=[],on=(name,fn)=>{const type=host().eventTypes[name];if(type){host().eventSource.on(type,fn);subscriptions.push([type,fn]);}};
 on('CHAT_CHANGED',()=>refresh());const timelineChanged=()=>{epoch++;flight=null;working=false;pendingMain=null;requestedReplies.clear();clearTimeout(replyTimer);queue.reset();ui.reset();api.voice?.stop?.('smartphone');setTimeout(refresh,150);};on('MESSAGE_DELETED',timelineChanged);on('MESSAGE_SWIPED',timelineChanged);on('MESSAGE_EDITED',timelineChanged);
 on('USER_MESSAGE_RENDERED',i=>{void userSpeech(i).catch(report);});
 const finishMain=()=>{clearTimeout(replyTimer);replyTimer=setTimeout(async()=>{refresh();const i=pendingMain;pendingMain=null;if(i!==null)await incoming(i).catch(report);flushReplies();},150);};
 on('MESSAGE_RECEIVED',i=>{if(Number.isInteger(Number(i))&&host().chat[Number(i)]&&!host().chat[Number(i)].is_user){pendingMain=Number(i);finishMain();}});
 on('GENERATION_ENDED',()=>{if(pendingMain!==null||requestedReplies.size)finishMain();});
 document.addEventListener('tretaresia-rpg:continuity-captured',refresh);
 globalThis.RoleForgePhone=runtime;refresh();return runtime;
}
