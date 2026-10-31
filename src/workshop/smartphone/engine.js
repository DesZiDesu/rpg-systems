import {keitaiAction,messageChannel,mailAddress,isKeitai} from './handset.js?v=0.96.0';
import {clone,id,clean,key,safeImage,contactLabel,publicProfile,SOCIAL_APPS,APPS,fingerprint,plainSpeech} from './model.js?v=0.96.0';
import {currencyScheme,currencyValue} from '../../currency-config.js?v=0.96.0';
import {applyMoneyTransfer,quoteWalletDebit} from '../../money-transfer.js?v=0.96.0';

const requireValue=(v,m)=>{if(!v)throw Error(m);return v;};
const whole=n=>Number.isSafeInteger(n)&&n>0&&n<=999999999;
export function threadFor(phone,contactId,app='messages',channel=''){
 let t=phone.threads.find(t=>t.app===app&&messageChannel(t.channel)===channel&&t.members.length===2&&t.members.includes(contactId)&&!t.deleted);
 if(!t){t={id:id(),app,...(channel?{channel}:{}),title:channel?`${channel==='mail'?'Mail':'SMS'} · ${contactLabel(phone.contacts.find(c=>c.id===contactId))}`:'',members:['player',contactId],pinned:false,archived:false,deleted:false};phone.threads.push(t);}
 return t;
}
export function notification(phone,type,title,text,target,time){
 const row={id:id(),type,title:clean(title,120),text:clean(text,300),target,time,read:false};phone.notifications.push(row);return row;
}
function actorAllowed(phone,contactId){const c=phone.contacts.find(c=>c.id===contactId);return c&&!c.blocked;}
export function changePhone(current,action,{time={},playerName='You',location={}}={}){
 const special=keitaiAction(current,action,{time,location});if(special)return special;
 const p=clone(current),type=action.type,now={...time};
 let result;
 if(type==='contact-save'){
  const c=action.contact||{},old=p.contacts.find(n=>n.id===c.id)||p.contacts.find(n=>n.saved===false&&n.number===clean(c.number,50));
  requireValue(clean(c.label,100)&&(clean(c.number,50)||mailAddress(c.email)||old?.source==='incoming'||old?.channels),'Enter a contact name and phone number');
  if(clean(c.number,50)&&p.contacts.some(n=>n.id!==old?.id&&n.number===clean(c.number,50)))throw Error('That phone number is already in Contacts');
  if(mailAddress(c.email)&&p.contacts.some(n=>n.id!==old?.id&&n.email?.toLocaleLowerCase()===c.email.toLocaleLowerCase()))throw Error('That email address is already in Contacts');
  if(c.email&&!mailAddress(c.email))throw Error('Enter a valid mobile email address');
  const next={...old,id:old?.id||id(),label:clean(c.label,100),name:clean(c.name||old?.name,100),number:clean(c.number,50),email:mailAddress(c.email===undefined?old?.email:c.email),avatar:safeImage(c.avatar===undefined?old?.avatar:c.avatar),notes:clean(c.notes,2000),blocked:old?.blocked===true,muted:old?.muted===true,npcId:(key(c.npcId)?c.npcId:old?.npcId||''),created:old?.created===true,source:old?.source||'custom',saved:true,voiceId:clean(c.voiceId===undefined?old?.voiceId:c.voiceId,160)};
  if(old)Object.assign(old,next);else p.contacts.push(next);result=next.id;
 }else if(type==='contact-flag'){
  const c=requireValue(p.contacts.find(c=>c.id===action.contactId),'Contact not found');
  requireValue(['blocked','muted','favorite'].includes(action.field),'Invalid contact setting');c[action.field]=typeof action.value==='boolean'?action.value:!c[action.field];
  if(c.blocked){p.pending=p.pending.filter(q=>q.contactId!==c.id);for(const call of p.calls)if(call.contactId===c.id&&['ringing','connected'].includes(call.status)){call.status='ended';call.endedAt=now;}}
 }else if(type==='contact-remove'){
  requireValue(p.contacts.some(c=>c.id===action.contactId),'Contact not found');
  const removed=p.contacts.find(c=>c.id===action.contactId);removed.saved=false;removed.formerLabel=removed.label;removed.label=removed.number||removed.name||'Unsaved account';removed.avatar='';removed.notes='';removed.favorite=false;
 }else if(type==='profile-save'){
  requireValue(action.actor==='player'||p.contacts.some(c=>c.id===action.actor),'Profile not found');
  requireValue(['messages',...SOCIAL_APPS].includes(action.app),'Unknown profile app');
  const data=action.profile||{},next={displayName:clean(data.displayName,80),handle:clean(data.handle,48),bio:clean(data.bio,800),avatar:safeImage(data.avatar),banner:safeImage(data.banner),status:clean(data.status,160),private:data.private===true,locked:true,voiceId:clean(data.voiceId,160)};
  requireValue(next.displayName,'Enter a display name');p.profiles[action.actor]||={};p.profiles[action.actor][action.app]=next;
 }else if(type==='thread-open'){
  requireValue(actorAllowed(p,action.contactId),'Contact is missing or blocked');const channel=messageChannel(action.channel);requireValue(action.app==='gather'||p.contacts.some(c=>c.id===action.contactId&&(channel==='mail'?(mailAddress(c.email)||c.channels?.mail):(c.number||c.channels?.[action.app||'messages']))),'This contact has not shared the requested contact channel');result=threadFor(p,action.contactId,action.app||'messages',channel).id;
 }else if(type==='group-save'){
  requireValue(p.installed.includes('gather'),'Install Gather first');
  const members=[...new Set(['player',...(action.members||[])])];requireValue(members.length>=3&&members.slice(1).every(c=>actorAllowed(p,c)),'Choose at least two available contacts');
  requireValue(clean(action.title,100),'Give the group a name');const old=p.threads.find(t=>t.id===action.id&&t.app==='gather');
  if(old){old.title=clean(action.title,100);old.members=members;}else{const group={id:id(),app:'gather',title:clean(action.title,100),members,pinned:false,deleted:false,archived:false};p.threads.push(group);result=group.id;}
 }else if(type==='message-send'){
  const thread=requireValue(p.threads.find(t=>t.id===action.threadId&&!t.deleted),'Conversation not found');
  requireValue(thread.members.some(c=>c!=='player'&&actorAllowed(p,c)),'No available contact in this conversation');
  const sticker=action.stickerId?p.stickers.find(s=>s.id===action.stickerId):null;
  const photo=action.photoId?p.photos.find(v=>v.id===action.photoId):null,attachment=safeImage(action.image||photo?.image);requireValue(clean(action.text,6000)||sticker||attachment||photo,'Write a message, choose a photo or a sticker');
  const row={id:action.id||id(),threadId:thread.id,from:'player',text:clean(action.text,6000),...(thread.channel?{channel:thread.channel,subject:thread.channel==='mail'?clean(action.subject,180):''}:{}),...(photo?{photoId:photo.id}:{}),stickerId:sticker?.id||'',image:attachment,replyTo:clean(action.replyTo,160),pinned:false,deleted:false,status:'sent',time:now};
  if(p.messages.some(m=>m.id===row.id))return {phone:current,result:row.id};
  p.messages.push(row);thread.archived=false;if(!sticker){p.drafts[thread.id]='';delete p.attachments[thread.id];}if(photo)photo.sharedWith=[...new Set([...photo.sharedWith||[],...thread.members.filter(m=>m!=='player')])];if(attachment){const photo=p.photos.find(v=>v.image===attachment);if(photo)photo.sharedWith=[...new Set([...photo.sharedWith||[],...thread.members.filter(m=>m!=='player')])];}
  p.pending.push({id:id(),type:'message',threadId:thread.id,contactId:thread.members.find(c=>c!=='player'),messageId:row.id,mode:action.mode||'deferred',status:'pending',time:now,...(thread.channel?{channel:thread.channel,subject:row.subject}:{} )});
  if(thread.channel)p.keitaiDraft=null;result=row.id;
 }else if(type==='message-edit'){
  const row=requireValue(p.messages.find(m=>m.id===action.id&&m.from==='player'&&!m.deleted),'Only your own messages can be edited');requireValue(clean(action.text,6000),'Write a message');row.text=clean(action.text,6000);row.edited=true;
 }else if(type==='message-delete'||type==='message-pin'){
  const row=requireValue(p.messages.find(m=>m.id===action.id),'Message not found');if(type==='message-delete'){row.deleted=true;row.text='';row.stickerId='';row.image='';row.photoId='';p.pending=p.pending.filter(q=>q.messageId!==row.id);}else row.pinned=!row.pinned;
 }else if(type==='thread-flag'){
  const t=requireValue(p.threads.find(t=>t.id===action.id),'Conversation not found');requireValue(['pinned','archived'].includes(action.field),'Unknown conversation setting');t[action.field]=!t[action.field];
 }else if(type==='thread-delete'){
  const t=requireValue(p.threads.find(t=>t.id===action.id),'Conversation not found');t.deleted=true;p.messages=p.messages.filter(m=>m.threadId!==t.id);p.pending=p.pending.filter(q=>q.threadId!==t.id);delete p.drafts[t.id];delete p.attachments[t.id];p.deletedThreads.push(t.id);p.notifications=p.notifications.filter(n=>n.target!==t.id);
 }else if(type==='read'){
  for(const m of p.messages)if(m.threadId===action.threadId)m.read=true;
  for(const n of p.notifications)if(n.target===action.threadId||action.all)n.read=true;
 }else if(type==='attachment-draft'){p.attachments[action.threadId]=safeImage(action.image);
 }else if(type==='draft'){p.drafts[action.threadId]=clean(action.text,6000);
 }else if(type==='call-start'){
  requireValue(actorAllowed(p,action.contactId),'Contact is missing or blocked');
  requireValue(p.contacts.some(c=>c.id===action.contactId&&(c.number||c.channels?.calls)),'This contact has not shared a phone number');
  requireValue(!p.calls.some(c=>['ringing','connected'].includes(c.status)),'End the current call first');
  const call={id:id(),contactId:action.contactId,direction:'outgoing',status:'ringing',transcript:[],muted:false,speaker:false,time:now};
  p.calls.push(call);p.pending.push({id:id(),type:'call',callId:call.id,contactId:call.contactId,mode:action.mode||'immediate',status:'pending',time:now});result=call.id;
 }else if(type==='call-state'){
  const c=requireValue(p.calls.find(c=>c.id===action.callId),'Call not found'),previousStatus=c.status;
  if(action.status){requireValue(['connected','declined','ended','missed'].includes(action.status),'Unknown call status');requireValue(['ringing','connected'].includes(c.status),'Call has already ended');c.status=action.status;if(['ended','declined','missed'].includes(c.status)){c.endedAt=now;p.pending=p.pending.filter(q=>q.callId!==c.id);}}
  if(action.status==='connected'&&previousStatus==='ringing'&&c.direction==='incoming')p.pending.push({id:id(),type:'call-speech',callId:c.id,contactId:c.contactId,text:'The player accepted the incoming call. The caller may begin.',mode:action.mode||'deferred',status:'pending'});
  if(['muted','speaker'].includes(action.toggle))c[action.toggle]=!c[action.toggle];
  if(typeof action.muted==='boolean')c.muted=action.muted;if(typeof action.speaker==='boolean')c.speaker=action.speaker;
 }else if(type==='call-speech'){
  const c=requireValue(p.calls.find(c=>c.id===action.callId&&c.status==='connected'),'No active call');if((action.from||'player')==='player'&&c.muted)throw Error('Your microphone is muted');
  const text=plainSpeech(action.text);requireValue(text,'Write what you say on the call');
  if(!action.source||!c.transcript.some(r=>r.source===action.source)){c.transcript.push({id:id(),from:action.from||'player',text,time:now,source:action.source||''});if((action.from||'player')==='player')p.pending.push({id:id(),type:'call-speech',callId:c.id,contactId:c.contactId,text,mode:action.mode||'deferred',status:'pending'});}
 }else if(type==='install'||type==='uninstall'){
  requireValue(SOCIAL_APPS.includes(action.app),'This built-in app cannot be removed');
  if(type==='install')p.installed=[...new Set([...p.installed,action.app])];else p.installed=p.installed.filter(a=>a!==action.app);
 }else if(type==='post-save'){
  requireValue(['lumen','murmur'].includes(action.app)&&p.installed.includes(action.app),'Install the app first');
  const actor=action.actor||'player';requireValue(actor==='player'||actorAllowed(p,actor),'Profile not found');
  requireValue(clean(action.text,action.app==='murmur'?500:4000)||safeImage(action.image),'Write a caption or add an image');
  const old=p.posts.find(v=>v.id===action.id&&v.actor===actor);
  if(old){old.text=clean(action.text,action.app==='murmur'?500:4000);old.image=safeImage(action.image);old.edited=true;}
  else{const row={id:action.id||id(),app:action.app,actor,text:clean(action.text,action.app==='murmur'?500:4000),image:safeImage(action.image),kind:action.kind==='story'?'story':'post',time:now,likes:[],bookmarks:[],comments:[],reposts:[],deleted:false};p.posts.push(row);result=row.id;}
 }else if(type==='post-delete'){const post=requireValue(p.posts.find(v=>v.id===action.id),'Post not found');post.deleted=true;
 }else if(['like','bookmark','repost','comment'].includes(type)){
  const post=requireValue(p.posts.find(v=>v.id===action.id&&!v.deleted),'Post not found');requireValue(post.actor==='player'||actorAllowed(p,post.actor),'Author unavailable');
  const actor=action.actor||'player';
  if(type==='comment'){requireValue(clean(action.text,2000),'Write a reply');post.comments.push({id:id(),actor,text:clean(action.text,2000),time:now});}
  else{const field={like:'likes',bookmark:'bookmarks',repost:'reposts'}[type];if(post[field].includes(actor))post[field]=post[field].filter(v=>v!==actor);else post[field].push(actor);}
 }else if(type==='follow'){
  requireValue(SOCIAL_APPS.includes(action.app),'Unknown app');requireValue(actorAllowed(p,action.target),'Contact unavailable');
  const actor=action.actor||'player',target=action.target;
  requireValue(actor==='player'||actorAllowed(p,actor),'Profile unavailable');
  const old=p.relationships.find(r=>r.app===action.app&&r.actor===actor&&r.target===target);
  if(old)p.relationships=p.relationships.filter(r=>r!==old);else p.relationships.push({id:id(),app:action.app,actor,target,pending:publicProfile(p,target,action.app).private&&actor==='player',time:now});
 }else if(type==='follow-approve'){
  const r=requireValue(p.relationships.find(r=>r.id===action.id),'Request not found');r.pending=false;
 }else if(type==='sticker-save'){
  requireValue(clean(action.name,80)&&safeImage(action.image),'Upload a PNG, JPG, GIF or WebP and give it a name');
  const next={id:action.id||id(),name:clean(action.name,80),cue:clean(action.cue,400),image:safeImage(action.image),npcAllowed:action.npcAllowed!==false};
  const old=p.stickers.find(s=>s.id===next.id);if(old)Object.assign(old,next);else{requireValue(p.stickers.length<64,'Sticker library is full (64)');p.stickers.push(next);}
 }else if(type==='sticker-delete'){p.stickers=p.stickers.filter(s=>s.id!==action.id);
 }else if(type==='photo-save'){requireValue(safeImage(action.image),'Choose an image');p.photos.push({id:id(),image:safeImage(action.image),caption:clean(action.caption,300),sharedWith:[],time:now});
 }else if(type==='photo-delete'){p.photos=p.photos.filter(v=>v.id!==action.id);
 }else if(type==='note-save'){const old=p.notes.find(n=>n.id===action.id),row={id:action.id||id(),title:clean(action.title,100)||'Note',text:clean(action.text,12000),time:now};if(old)Object.assign(old,row);else p.notes.push(row);result=row.id;
 }else if(type==='note-delete'){p.notes=p.notes.filter(v=>v.id!==action.id);
 }else if(type==='browser-go'){
  const url=clean(action.url,300);requireValue(/^drift:\/\//u.test(url),'Drift uses in-world sites: drift://news, drift://night-arcade');
  let tab=p.browser.tabs.find(t=>t.id===p.browser.activeTab);if(action.newTab||!tab){tab={id:id(),url};p.browser.tabs.push(tab);p.browser.activeTab=tab.id;}tab.url=url;p.browser.history.push({url,time:now});
 }else if(type==='browser-tab'){requireValue(p.browser.tabs.some(t=>t.id===action.id),'Tab not found');p.browser.activeTab=action.id;
 }else if(type==='browser-close-tab'){p.browser.tabs=p.browser.tabs.filter(t=>t.id!==action.id);if(!p.browser.tabs.length)p.browser.tabs=[{id:id(),url:'drift://start'}];if(!p.browser.tabs.some(t=>t.id===p.browser.activeTab))p.browser.activeTab=p.browser.tabs[0].id;
 }else if(type==='browser-bookmark'){const url=clean(action.url,300);if(p.browser.bookmarks.includes(url))p.browser.bookmarks=p.browser.bookmarks.filter(v=>v!==url);else p.browser.bookmarks.push(url);
 }else if(type==='browser-clear-history'){p.browser.history=[];
 }else if(type==='notification-read'){for(const n of p.notifications)if(n.id===action.id||action.all){n.read=true;if(action.id&&n.type==='message')for(const m of p.messages)if(m.threadId===n.target)m.read=true;}
 }else throw Error('Unknown phone action');
 p.revision++;requireValue(JSON.stringify(p).length<12*1024*1024,'Phone storage is full. Remove unused photos or stickers before saving.');
 return {phone:p,result};
}

export function applyIncoming(current,event,{time={},config,source=''}={}){
 const p=clone(current);const identity=source?source+':'+fingerprint(event):clean(event.id,180);
 if(identity&&p.processed.includes(identity))return p;
 const c=p.contacts.find(c=>c.id===event.contactId||c.npcId&&c.npcId===event.actorId);
 if(!c||c.blocked||event.offscreen&&!config.offscreenActivity)return p;
 const text=event.type==='call-speech'?plainSpeech(event.text):clean(event.text,6000),author=contactLabel(c);
 if(isKeitai(config)&&(['post','follow','unfollow'].includes(event.type)||event.app==='gather'))return p;
 if(event.type==='message'){
  if(!config.incomingMessages&&!event.requestId)return p;
  const t=event.threadId?p.threads.find(t=>t.id===event.threadId&&!t.deleted&&t.members.includes(c.id)):threadFor(p,c.id,event.app==='gather'?'gather':'messages',messageChannel(event.channel,isKeitai(config)?'sms':''));
  if(!t||!['messages','gather'].includes(t.app)||!p.installed.includes(t.app))return p;
  const sticker=p.stickers.find(s=>s.id===event.stickerId&&s.npcAllowed);
  const photo=event.photoId?p.photos.find(s=>s.id===event.photoId&&s.sharedWith?.includes(c.id)):null;if(!text&&!sticker&&!photo)return p;
  const m={id:id(),threadId:t.id,from:c.id,text,...(t.channel?{channel:t.channel,subject:t.channel==='mail'?clean(event.subject,180):''}:{}),...(photo?{photoId:photo.id}:{}),stickerId:sticker?.id||'',image:photo?.image||'',pinned:false,deleted:false,read:false,time};p.messages.push(m);t.archived=false;if(photo)photo.sharedWith=[...new Set([...photo.sharedWith,...t.members.filter(v=>v!=='player')])];
  if(!c.muted)notification(p,'message',author,text||sticker?.name||'Photo',t.id,time);
 }else if(event.type==='call'){
  if(!config.incomingCalls||p.calls.some(v=>['connected','ringing'].includes(v.status)))return p;
  const call={id:id(),contactId:c.id,direction:'incoming',status:'ringing',transcript:[],muted:false,speaker:false,time};p.calls.push(call);if(!c.muted)notification(p,'call',author,'Incoming call',call.id,time);
 }else if(event.type==='call-result'){
  const call=p.calls.find(v=>v.id===event.callId&&v.contactId===c.id&&v.status==='ringing'&&v.direction==='outgoing');if(!call||!['connected','declined','missed'].includes(event.status))return p;call.status=event.status;
 }else if(event.type==='call-speech'){
  const call=p.calls.find(v=>v.id===event.callId&&v.contactId===c.id&&v.status==='connected');if(!call||!text)return p;call.transcript.push({id:id(),from:c.id,text,time,source:identity});if(!c.muted)notification(p,'call-speech',author,text,call.id,time);
 }else if(event.type==='post'){
  if(!config.socialActivity||!['lumen','murmur'].includes(event.app)||!p.installed.includes(event.app)||!text)return p;
  p.posts.push({id:id(),app:event.app,actor:c.id,text:text.slice(0,event.app==='murmur'?500:4000),image:'',kind:event.kind==='story'?'story':'post',time,likes:[],bookmarks:[],comments:[],reposts:[],deleted:false});if(!c.muted)notification(p,'social',author,text,event.app,time);
 }else if(event.type==='follow'||event.type==='unfollow'){
  if(!config.socialActivity||!SOCIAL_APPS.includes(event.app)||!p.installed.includes(event.app))return p;
  p.relationships=p.relationships.filter(r=>!(r.actor===c.id&&r.target==='player'&&r.app===event.app));
  if(event.type==='follow'){p.relationships.push({id:id(),actor:c.id,target:'player',app:event.app,pending:publicProfile(p,'player',event.app).private,time});if(!c.muted)notification(p,'social',author,'Started following you',event.app,time);}
 }else return p;
 if(identity)p.processed.push(identity);p.revision++;return p;
}

export function registerArcade(phone,{username,pin,accountId=id(),salt=id()}){
 requireValue(/^[\p{L}\p{N}_-]{3,32}$/u.test(username||''),'Use a 3–32 character account name');requireValue(typeof pin==='string'&&pin.length>=4&&pin.length<=64,'Use a fictional PIN of 4–64 characters');
 requireValue(!phone.accounts.some(a=>a.username===username),'That account name is taken');
 const p=clone(phone);p.accounts.push({id:accountId,username,salt,pinHash:fingerprint(salt+':'+pin),credits:0,balances:{},site:'night-arcade'});p.revision++;return p;
}
export function loginArcade(phone,username,pin){
 const a=phone.accounts.find(a=>a.username===username);requireValue(a&&fingerprint(a.salt+':'+pin)===a.pinHash,'Incorrect account name or fictional PIN');return a.id;
}
export function phoneFinancial(current,state,action,{time={},random=()=>globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296}={}){
 const p=clone(current),next=clone(state),requestId=requireValue(clean(action.id,160),'Missing transaction ID');
 if(p.receipts.includes(requestId))return {phone:current,state,result:{duplicate:true}};
 const unit=currencyScheme(state.progression?.currency).units.find(u=>u.id===action.unit);requireValue(unit,'Select a configured world currency');requireValue(whole(action.amount),'Enter a positive whole amount');
 if(action.type==='transfer'){
  const contact=requireValue(p.contacts.find(c=>c.id===action.contactId&&!c.blocked&&c.npcId),'Message this contact first to establish their NPC');
  const result=applyMoneyTransfer(state,{id:'phone-'+requestId,npcId:contact.npcId,unit:unit.id,amount:action.amount},{participants:[state.npcs.find(n=>n.id===contact.npcId)?.name].filter(Boolean)});requireValue(result.ok,'Transfer unavailable: '+result.error);
  Object.assign(next,result.next);
 }else{
  const account=requireValue(p.accounts.find(a=>a.id===action.accountId),'Register and log in to Night Arcade first');
  const units=currencyScheme(state.progression.currency).units;
  let credits=account.credits;
  if(credits===undefined){requireValue(Object.keys(account.balances).every(k=>units.some(u=>u.id===k)),'Old site currency needs an author migration');credits=units.reduce((sum,u)=>sum+(account.balances[u.id]||0)*u.value,0);}
  const cost=action.amount*unit.value;
  requireValue(Number.isSafeInteger(credits)&&credits>=0&&Number.isSafeInteger(cost),'Invalid site balance');
  if(action.type==='deposit'){
   const debit=quoteWalletDebit(state,action.amount,unit.id);requireValue(!debit.error,'Insufficient available wallet funds');next.progression.currency=debit.wallet;credits+=cost;
  }else if(action.type==='withdraw'){
   requireValue(credits>=cost,'Insufficient site balance');requireValue(Number.isSafeInteger((next.progression.currency[unit.id]||0)+action.amount)&&(next.progression.currency[unit.id]||0)+action.amount<=999999999,'Wallet limit reached');credits-=cost;next.progression.currency[unit.id]=(next.progression.currency[unit.id]||0)+action.amount;
  }else if(action.type==='bet'){
   requireValue(credits>=cost,'Insufficient site balance');
   const rolls=Array.from({length:action.game==='slots'?3:1},()=>Math.floor(Math.max(0,Math.min(.999999999,random()))*6)+1);
   const won=action.game==='slots'?rolls.every(v=>v===rolls[0]):rolls[0]<=3;
   const payout=won?Math.floor(action.amount*(action.game==='slots'?50:1.9)):0;
   credits=credits-cost+payout*unit.value;action={...action,rolls,payout,won};
  }else throw Error('Unknown wallet action');
  requireValue(Number.isSafeInteger(credits)&&credits>=0,'Site balance limit reached');
  account.credits=credits;account.balances=Object.fromEntries(units.map(u=>[u.id,Math.floor(credits/u.value)]));
 }
 requireValue(Number.isSafeInteger(currencyValue(next.progression.currency)),'Invalid wallet total');
 p.receipts.push(requestId);const receipt={id:requestId,type:action.type,unit:unit.id,unitValue:unit.value,unitName:unit.symbol||unit.name,amount:action.amount,accountId:action.accountId||'',contactId:action.contactId||'',time,...(action.rolls?{rolls:action.rolls,payout:action.payout,won:action.won}:{})};p.ledger.push(receipt);p.revision++;
 return {phone:p,state:next,result:receipt};
}
