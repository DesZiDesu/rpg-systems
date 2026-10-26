import {linkPhoneContacts,phoneNpcForContact} from '../src/workshop/smartphone/identity.js';
import {phoneSceneSignal,phoneOwnershipInStory,phoneStorySource} from '../src/workshop/smartphone/story.js';
import test from 'node:test';
import {createPhoneQueue} from '../src/workshop/smartphone/queue.js';
import assert from 'node:assert/strict';
import {blankPhone,phoneConfig,hasDevice,normalizePhone,callSpeech,safeImage,PHONE_FIELD} from '../src/workshop/smartphone/model.js';
import {changePhone,applyIncoming,phoneFinancial,registerArcade,loginArcade} from '../src/workshop/smartphone/engine.js';
import {mergePhoneReply,phoneTask,parsePhoneReply,storyPhoneData} from '../src/workshop/smartphone/ai.js';
import {savePhoneChat} from '../src/workshop/smartphone/persistence.js';
import {branchBundle,applyBranchBundle} from '../src/chat-branches.js';
import {currencyValue} from '../src/currency-config.js';
import {normalizeProfile} from '../src/workshop/core.js';
const config=phoneConfig(),time={day:1,time:'16:42'},png='data:image/png;base64,aGVsbG8=';
const state=()=>({player:{name:'Mael'},inventory:[{name:'Smartphone',quantity:1}],npcs:[],worldClock:time,location:{place:'Shibuya'},progression:{currency:{name:'World credits',scheme:{version:1,units:[{id:'bank',name:'BANK',value:100},{id:'cash',name:'CASH',value:10},{id:'coin',name:'COIN',value:1}]},bank:10,cash:4,coin:3}}});
function setup(linked=true){
 let p=blankPhone();p=changePhone(p,{type:'contact-save',contact:{label:'Aoi at the café',number:'090-1428',npcId:linked?'aoi':''}}).phone;const contact=p.contacts[0];p=changePhone(p,{type:'thread-open',contactId:contact.id}).phone;return {p,contact,thread:p.threads[0]};
}
test('phone configuration is character scoped, bounded and retains the other addon settings',()=>{
 const raw=normalizeProfile({enabled:['smartphone'],phone:{replyMode:'immediate',incomingCalls:true,position:{x:99,y:-1}},deathNote:{actors:{}}},'character');
 assert.equal(raw.phone.replyMode,'immediate');assert(raw.phone.incomingCalls);assert.deepEqual(raw.phone.position,{x:1,y:0});assert.equal(raw.phone.callInput,'both');
 assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(raw)),'another-chat').phone,raw.phone);assert.equal(phoneConfig({replyMode:'secret',maxEvents:1000}).maxEvents,12);
});
test('a physical device is required unless the author explicitly configures otherwise',()=>{assert(hasDevice(state(),config));assert(!hasDevice({...state(),inventory:[]},config));assert(hasDevice({...state(),inventory:[]},phoneConfig({assumeDevice:true})));assert(!hasDevice({...state(),inventory:[{name:'Smartphone',quantity:0}]},config));});
test('adding a custom contact does not create an NPC or reveal a real identity',()=>{const {p,contact}=setup(false);assert.equal(contact.npcId,'');assert.equal(contact.label,'Aoi at the café');assert.equal(p.profiles[contact.id],undefined);});
test('contact editing retains a stable link, block preferences and a custom saved label',()=>{const {p,contact}=setup();const next=changePhone(p,{type:'contact-save',contact:{id:contact.id,label:'☕ friend',number:'090-new'}}).phone;assert.equal(next.contacts[0].id,contact.id);assert.equal(next.contacts[0].npcId,'aoi');assert.equal(next.contacts[0].label,'☕ friend');});
test('phone numbers are unique and duplicate submissions do not produce extra messages',()=>{const {p,contact,thread}=setup();assert.throws(()=>changePhone(p,{type:'contact-save',contact:{label:'Other',number:contact.number}}));const action={type:'message-send',id:'one',threadId:thread.id,text:'Hello'};const once=changePhone(p,action).phone;assert.equal(changePhone(once,action).phone.messages.length,1);});
test('messages queue for either immediate or next-turn replies without creating a user chat message',()=>{for(const mode of ['immediate','deferred']){const {p,thread}=setup();const next=changePhone(p,{type:'message-send',threadId:thread.id,text:'Coffee?',mode}).phone;assert.equal(next.pending[0].mode,mode);assert.equal(next.messages[0].status,'sent');assert.equal(p.messages.length,0);}});
test('a lazy custom NPC is created exactly once and can send several independent bubbles',()=>{
 const {p,thread,contact}=setup(false),sent=changePhone(p,{type:'message-send',threadId:thread.id,text:'Hi'}).phone,q=sent.pending[0];
 const reply={profiles:[{contactId:contact.id,npc:{name:'Aoi Sato',occupation:'Designer'},apps:{messages:{displayName:'Aoi'},murmur:{displayName:'midnight.toast',handle:'toast_after_dark'}}}],events:['Hi!','I’m at the café.','Want the window seat?'].map(text=>({type:'message',contactId:contact.id,requestId:q.id,threadId:thread.id,text}))};
 const once=mergePhoneReply(sent,state(),reply,config,{requests:sent.pending,source:'reply-1',time});assert.equal(once.phone.messages.length,4);assert.equal(once.state.npcs.length,1);assert.equal(once.phone.pending.length,0);assert.equal(once.phone.contacts[0].label,'Aoi at the café');assert.equal(once.phone.profiles[contact.id].murmur.displayName,'midnight.toast');
 const twice=mergePhoneReply(once.phone,once.state,reply,config,{requests:[],source:'reply-1',time});assert.equal(twice.state.npcs.length,1);assert.equal(twice.phone.messages.length,4);
});
test('forged request IDs, wrong threads and replies without a new NPC profile are rejected',()=>{
 const {p,thread,contact}=setup(false),sent=changePhone(p,{type:'message-send',threadId:thread.id,text:'Hi'}).phone;
 const reply={events:[{type:'message',contactId:contact.id,requestId:'made-up',threadId:thread.id,text:'Hacked'}]};assert.equal(mergePhoneReply(sent,state(),reply,config,{requests:sent.pending}).phone.messages.length,1);assert.equal(mergePhoneReply(sent,state(),{events:[{...reply.events[0],requestId:sent.pending[0].id}]},config,{requests:sent.pending}).phone.messages.length,1);
});
test('failed or unavailable replies keep the request retryable',()=>{const {p,thread}=setup();const sent=changePhone(p,{type:'message-send',threadId:thread.id,text:'Hello'}).phone;assert.equal(mergePhoneReply(sent,state(),{events:[]},config,{requests:sent.pending}).phone.pending.length,1);assert.throws(()=>parsePhoneReply('invalid response'));});
test('blocking cancels pending replies and active calls and suppresses all incoming activity',()=>{
 const {p,contact,thread}=setup();let next=changePhone(p,{type:'message-send',threadId:thread.id,text:'Hi'}).phone;next=changePhone(next,{type:'call-start',contactId:contact.id}).phone;next=changePhone(next,{type:'contact-flag',contactId:contact.id,field:'blocked',value:true}).phone;
 assert.equal(next.pending.length,0);assert.equal(next.calls[0].status,'ended');assert.throws(()=>changePhone(next,{type:'message-send',threadId:thread.id,text:'No'}));for(const type of ['message','call','post','follow'])assert.equal(applyIncoming(next,{type,contactId:contact.id,text:'No',app:'murmur'},{config}).revision,next.revision);
});
test('removing a contact does not erase its canonical NPC or a shared world profile',()=>{const {p,contact}=setup();const next=changePhone(p,{type:'contact-remove',contactId:contact.id}).phone;assert.equal(next.contacts.filter(c=>c.saved!==false).length,0);assert.equal(next.contacts[0].npcId,'aoi');assert.equal(next.contacts[0].label,'090-1428');});
test('proactive permissions are independent; a pending reply can still arrive with unsolicited messages off',()=>{
 const {p,contact,thread}=setup(),off=phoneConfig({incomingMessages:false,incomingCalls:false,socialActivity:false});
 assert.equal(applyIncoming(p,{type:'message',contactId:contact.id,text:'Hi'},{config:off}).messages.length,0);assert.equal(applyIncoming(p,{type:'message',contactId:contact.id,threadId:thread.id,requestId:'pending',text:'Hi'},{config:off}).messages.length,1);
 assert.equal(applyIncoming(p,{type:'call',contactId:contact.id},{config:off}).calls.length,0);
 assert.equal(applyIncoming(p,{type:'message',contactId:contact.id,text:'Offscreen',offscreen:true},{config}).messages.length,0);
});
test('sticker usage is constrained by the library, MIME type and NPC permission',()=>{
 const {p,contact,thread}=setup();const next=changePhone(p,{type:'sticker-save',name:'Wave',cue:'When greeting',image:png,npcAllowed:false}).phone;
 assert.equal(applyIncoming(next,{type:'message',contactId:contact.id,threadId:thread.id,stickerId:next.stickers[0].id},{config}).messages.length,0);
 assert(!safeImage('data:image/svg+xml;base64,AAAA'));assert(!safeImage('javascript:alert(1)'));assert(!safeImage('https://untrusted.invalid/tracker.png'));assert.throws(()=>changePhone(p,{type:'sticker-save',name:'Bad',image:'javascript:x'}));
});
test('Gather groups require real available members; only members may answer a group request',()=>{
 const {p,contact}=setup();let next=changePhone(p,{type:'install',app:'gather'}).phone;assert.throws(()=>changePhone(next,{type:'group-save',title:'Friends',members:[contact.id]}));next=changePhone(next,{type:'contact-save',contact:{label:'Ren',number:'080-1',npcId:'ren'}}).phone;
 const group=changePhone(next,{type:'group-save',title:'Study group',members:next.contacts.map(c=>c.id)});assert.equal(group.phone.threads.at(-1).members.length,3);assert.throws(()=>changePhone(next,{type:'group-save',title:'Bad',members:[contact.id,'invented']}));
});
test('message pin/edit/reply/delete and conversation deletion do not mutate unrelated threads',()=>{
 const {p,thread}=setup();let next=changePhone(p,{type:'message-send',threadId:thread.id,text:'One'}).phone;const mid=next.messages[0].id;next=changePhone(next,{type:'message-pin',id:mid}).phone;assert(next.messages[0].pinned);next=changePhone(next,{type:'message-edit',id:mid,text:'Edited'}).phone;assert(next.messages[0].edited);next=changePhone(next,{type:'thread-delete',id:thread.id}).phone;assert.equal(next.messages.length,0);assert.equal(next.pending.length,0);assert.equal(next.contacts.length,1);
});
test('calls allow only one active line and keep separate transcript/microphone/speaker state',()=>{
 const {p,contact}=setup();let next=changePhone(p,{type:'call-start',contactId:contact.id}).phone,call=next.calls[0];assert.throws(()=>changePhone(next,{type:'call-start',contactId:contact.id}));next=changePhone(next,{type:'call-state',callId:call.id,status:'connected',muted:true}).phone;assert.throws(()=>changePhone(next,{type:'call-speech',callId:call.id,text:'Secret'}));next=changePhone(next,{type:'call-state',callId:call.id,muted:false,speaker:true}).phone;next=changePhone(next,{type:'call-speech',callId:call.id,text:'Hello',source:'one'}).phone;next=changePhone(next,{type:'call-speech',callId:call.id,text:'Hello',source:'one'}).phone;assert.equal(next.calls[0].transcript.length,1);assert(next.calls[0].speaker);
});
test('phone speech never transmits private thoughts, action italics or other NPC dialogue',()=>{
 const c={npcId:'aoi',label:'Aoi'};assert.equal(callSpeech({mes:'|Do not say this| *waves* Hello.'},c,true),'Hello.');assert.equal(callSpeech({mes:'<tr-thought name="aoi">Secret</tr-thought><tr-dialogue name="ren">Other speaker</tr-dialogue><tr-dialogue name="aoi">Hello!</tr-dialogue>'},c,false),'Hello!');
});
test('social profiles remain independent from saved labels and preserve privacy/follow approvals',()=>{
 const {p,contact}=setup();let next=changePhone(p,{type:'install',app:'lumen'}).phone;next=changePhone(next,{type:'profile-save',actor:contact.id,app:'lumen',profile:{displayName:'moon.toast',private:true,bio:'Night photography'}}).phone;assert.equal(next.contacts[0].label,'Aoi at the café');next=changePhone(next,{type:'follow',app:'lumen',target:contact.id}).phone;assert(next.relationships[0].pending);next=changePhone(next,{type:'follow-approve',id:next.relationships[0].id}).phone;assert(!next.relationships[0].pending);
});
test('app install/uninstall keeps posts, profiles and chat data',()=>{const {p}=setup();let next=changePhone(p,{type:'install',app:'murmur'}).phone;next=changePhone(next,{type:'post-save',app:'murmur',text:'First post'}).phone;next=changePhone(next,{type:'uninstall',app:'murmur'}).phone;assert.equal(next.posts.length,1);assert(!next.installed.includes('murmur'));assert.throws(()=>changePhone(next,{type:'uninstall',app:'phone'}));});
test('likes, bookmarks, reposts and comments remain editable per post',()=>{let next=changePhone(blankPhone(),{type:'install',app:'murmur'}).phone;next=changePhone(next,{type:'post-save',app:'murmur',text:'Hello'}).phone;const pid=next.posts[0].id;for(const type of ['like','bookmark','repost'])next=changePhone(next,{type,id:pid}).phone;next=changePhone(next,{type:'comment',id:pid,text:'Reply'}).phone;assert.deepEqual(next.posts[0].likes,['player']);assert.equal(next.posts[0].comments.length,1);next=changePhone(next,{type:'like',id:pid}).phone;assert.equal(next.posts[0].likes.length,0);});
function arcade(){let p=registerArcade(blankPhone(),{username:'mael_world',pin:'fiction-only'});const accountId=loginArcade(p,'mael_world','fiction-only');return {p,accountId};}
test('fictional account authentication stores no plain PIN and clears sessions on reload/export',()=>{
 const {p,accountId}=arcade();assert(!JSON.stringify(p).includes('fiction-only'));assert.throws(()=>loginArcade(p,'mael_world','wrong'));p.sessions[accountId]=true;assert.deepEqual(normalizePhone(p).sessions,{});
});
test('wallet deposits and withdrawals conserve configured currency value across the wallet/site boundary',()=>{
 const {p,accountId}=arcade(),s=state(),initial=currencyValue(s.progression.currency);let out=phoneFinancial(p,s,{id:'deposit',type:'deposit',accountId,unit:'cash',amount:5},{time});assert.equal(currencyValue(out.state.progression.currency)+out.phone.accounts[0].balances.cash*10,initial);out=phoneFinancial(out.phone,out.state,{id:'withdraw',type:'withdraw',accountId,unit:'cash',amount:5},{time});assert.equal(currencyValue(out.state.progression.currency),initial);assert.equal(out.phone.accounts[0].balances.cash,0);
});
test('wallet retries, overdrafts and invalid currencies cannot charge or credit twice',()=>{
 const {p,accountId}=arcade(),s=state(),out=phoneFinancial(p,s,{id:'one',type:'deposit',accountId,unit:'cash',amount:1});const again=phoneFinancial(out.phone,out.state,{id:'one',type:'deposit',accountId,unit:'cash',amount:1});assert(again.result.duplicate);assert.deepEqual(again.state,out.state);assert.throws(()=>phoneFinancial(p,s,{id:'bad',type:'withdraw',accountId,unit:'cash',amount:1}));assert.throws(()=>phoneFinancial(p,s,{id:'x',type:'deposit',accountId,unit:'real-dollar',amount:1}));assert.deepEqual(s,state());
});
test('arcade bets consume site funds only and deterministic test rolls settle exactly once',()=>{
 const {p,accountId}=arcade(),s=state();let out=phoneFinancial(p,s,{id:'fund',type:'deposit',accountId,unit:'coin',amount:10});const before=clone(out.state);out=phoneFinancial(out.phone,out.state,{id:'bet',type:'bet',accountId,unit:'coin',amount:10,game:'dice'},{random:()=>0});assert.equal(out.phone.accounts[0].balances.coin,19);assert.equal(out.result.payout,19);assert.deepEqual(out.state,before);assert.throws(()=>phoneFinancial(out.phone,out.state,{id:'big',type:'bet',accountId,unit:'coin',amount:20,game:'dice'}));
});
const clone=v=>structuredClone(v);
test('Drift has separate tabs, history, favorites and no arbitrary executable or real web URL',()=>{let p=changePhone(blankPhone(),{type:'browser-go',url:'drift://news'}).phone;p=changePhone(p,{type:'browser-go',url:'drift://night-arcade',newTab:true}).phone;assert.equal(p.browser.tabs.length,2);assert.equal(p.browser.history.length,2);assert.throws(()=>changePhone(p,{type:'browser-go',url:'javascript:alert(1)'}));assert.throws(()=>changePhone(p,{type:'browser-go',url:'https://bank.invalid'}));});
test('branch snapshots restore phone data from the selected point rather than the future',()=>{const metadata={[PHONE_FIELD]:setup().p,tretaresia_rpg_state:state()},before=branchBundle(metadata);metadata[PHONE_FIELD]=changePhone(metadata[PHONE_FIELD],{type:'note-save',title:'Future',text:'Not yet known'}).phone;applyBranchBundle(metadata,before);assert.equal(metadata[PHONE_FIELD].notes.length,0);});
test('structured phone blocks parse without exposing them as player speech',()=>{const block={events:[]};assert.deepEqual(storyPhoneData({mes:'Story <rf-phone>'+JSON.stringify(block)+'</rf-phone>'}),[block]);assert.deepEqual(parsePhoneReply(String.fromCharCode(96).repeat(3)+'json\n'+JSON.stringify(block)+'\n'+String.fromCharCode(96).repeat(3)),block);});
test('phone AI context excludes uploaded image bytes and account PIN hashes',()=>{
 const {p,contact,thread}=setup();p.profiles[contact.id]={messages:{displayName:'Aoi',avatar:png}};p.accounts=arcade().p.accounts;const sent=changePhone(p,{type:'message-send',threadId:thread.id,text:'Hi'}).phone;const task=phoneTask(sent,state(),config,sent.pending);assert(!task.prompt.includes('base64'));assert(!task.prompt.includes('pinHash'));assert(task.systemPrompt.includes('1–6'));assert(task.systemPrompt.includes('No user speech'));
});
test('a phone save requires a server acknowledgement and never forces an integrity overwrite',async()=>{
 const metadata={[PHONE_FIELD]:blankPhone(),tretaresia_rpg_state:state()},ctx={chatMetadata:metadata,chat:[],characterId:0,characters:[{avatar:'card.png',name:'World'}],getCurrentChatId:()=> 'chat',getRequestHeaders:()=>({'content-type':'application/json'})};let body;
 await savePhoneChat(ctx,{current:()=>ctx,request:async(_url,args)=>{body=JSON.parse(args.body);return {ok:true};}});assert.equal(body.force,false);assert.deepEqual(body.chat[0].chat_metadata,metadata);
 await assert.rejects(savePhoneChat(ctx,{current:()=>ctx,request:async()=>({ok:false})}),/not saved/);
 await assert.rejects(savePhoneChat(ctx,{current:()=>({...ctx,getCurrentChatId:()=> 'other'})}),/changed/);
});
test('a linked phone transfer reuses the RoleForge gift ledger and canonical recipient name',()=>{
 const {p,contact}=setup(),s=state();s.npcs=[{id:'aoi',name:'Aoi Sato',enabled:true}];
 const out=phoneFinancial(p,s,{id:'gift-1',type:'transfer',contactId:contact.id,unit:'cash',amount:2},{time});assert.equal(currencyValue(out.state.progression.currency),currencyValue(s.progression.currency)-20);assert.equal(out.state.moneyTransfers.receipts[0].npcId,'aoi');assert.equal(out.state.moneyTransfers.receipts[0].amount,2);
});
test('a public social profile does not invent a private phone number or a new NPC identity',()=>{
 const s=state();s.npcs=[{id:'ren',name:'Ren Mori'}];let p=changePhone(blankPhone(),{type:'install',app:'murmur'}).phone;
 const result=mergePhoneReply(p,s,{profiles:[{source:'public',npcId:'ren',contactId:'social-ren',apps:{murmur:{displayName:'concrete.dreams',handle:'concrete_dreams'}}}],events:[{type:'post',contactId:'social-ren',app:'murmur',text:'A thought about the city.'}]},config,{source:'story:one'});
 assert.equal(result.state.npcs.length,1);assert.equal(result.phone.contacts[0].number,'');assert.equal(result.phone.contacts[0].label,'concrete.dreams');assert.equal(result.phone.posts.length,1);assert.throws(()=>changePhone(result.phone,{type:'call-start',contactId:'social-ren'}));assert.throws(()=>changePhone(result.phone,{type:'thread-open',contactId:'social-ren',app:'messages'}));
});
test('a shared phone number needs visible scene evidence, not just a hidden protocol claim',()=>{
 const s=state();s.npcs=[{id:'ren',name:'Ren Mori'}];const raw={events:[{type:'contact-share',actorId:'ren',displayName:'Ren',number:'080-0731'}]};
 assert.equal(mergePhoneReply(blankPhone(),s,raw,config,{source:'story:one',storyText:'<rf-phone>'+JSON.stringify(raw)+'</rf-phone>'}).phone.contacts.length,0);
 const yes=mergePhoneReply(blankPhone(),s,raw,config,{source:'story:two',storyText:'Ren shows you his number: 080-0731.'});assert.equal(yes.phone.contacts[0].number,'080-0731');
});
test('manual app profile edits are not overwritten by later NPC replies',()=>{
 const {p,contact,thread}=setup();let next=changePhone(p,{type:'profile-save',actor:contact.id,app:'murmur',profile:{displayName:'My preferred alias',handle:'manual'}}).phone;next=changePhone(next,{type:'message-send',threadId:thread.id,text:'Hi'}).phone;
 const result=mergePhoneReply(next,state(),{profiles:[{contactId:contact.id,apps:{murmur:{displayName:'AI replacement'}}}]},config,{requests:next.pending});assert.equal(result.phone.profiles[contact.id].murmur.displayName,'My preferred alias');
});

test('site credits survive world currency renaming and convert at the currently configured rate',()=>{const {p,accountId}=arcade(),s=state();let out=phoneFinancial(p,s,{id:'hold',type:'deposit',accountId,unit:'cash',amount:10});assert.equal(out.phone.accounts[0].credits,100);out.state.progression.currency.scheme={version:1,units:[{id:'token',name:'TOKEN',value:1}]};out.state.progression.currency.token=0;const after=phoneFinancial(out.phone,out.state,{id:'new-unit',type:'withdraw',accountId,unit:'token',amount:100});assert.equal(after.state.progression.currency.token,100);assert.equal(after.phone.accounts[0].credits,0);});
test('removing a saved contact does not silently block an otherwise valid incoming message',()=>{const {p,contact,thread}=setup();const removed=changePhone(p,{type:'contact-remove',contactId:contact.id}).phone;const next=applyIncoming(removed,{type:'message',contactId:contact.id,text:'Are you there?',threadId:thread.id},{config});assert.equal(next.messages.length,1);assert.equal(next.contacts[0].saved,false);assert(!next.contacts[0].blocked);});

test('photo attachments keep private gallery images out of NPC events until actually shared',()=>{const {p,contact,thread}=setup();let next=changePhone(p,{type:'photo-save',image:png,caption:'A quiet café'}).phone;const photo=next.photos[0];assert.equal(applyIncoming(next,{type:'message',contactId:contact.id,photoId:photo.id},{config}).messages.length,0);next=changePhone(next,{type:'message-send',threadId:thread.id,image:photo.image,text:'A photo for you'}).phone;assert(next.photos[0].sharedWith.includes(contact.id));next=applyIncoming(next,{type:'message',contactId:contact.id,threadId:thread.id,photoId:photo.id},{config});assert.equal(next.messages.length,2);assert.equal(next.messages[1].image,png);});
test('attachment drafts survive closing/reloading and are removed after a successful send',()=>{const {p,thread}=setup();let next=changePhone(p,{type:'attachment-draft',threadId:thread.id,image:png}).phone;assert.equal(normalizePhone(next).attachments[thread.id],png);next=changePhone(next,{type:'message-send',threadId:thread.id,image:png}).phone;assert.equal(next.attachments[thread.id],undefined);});

test('a queued contact edit cannot run under another chat after a pending save',async()=>{let owner='A',release;const errors=[],queue=createPhoneQueue({capture:()=>owner,valid:t=>t===owner,onError:e=>errors.push(e)}),block=new Promise(ok=>release=ok);const first=queue.run(()=>block);let changed=false;const old=queue.run(()=>changed=true);await new Promise(setImmediate);owner='B';release();await first.catch(()=>{});await assert.rejects(old,/chat changed/);assert(!changed);assert.equal(errors.length,0);});
test('a new scope can reset its queue without adopting actions from the old scope',async()=>{let owner='A',release;const queue=createPhoneQueue({capture:()=>owner,valid:t=>t===owner});const pending=queue.run(()=>new Promise(ok=>release=ok));await new Promise(setImmediate);owner='B';queue.reset();assert.equal(await queue.run(()=> 'new chat'),'new chat');release();await pending;});

test('an NPC can initiate a first message to a custom contact without a prior player request',()=>{
 const {p,contact}=setup(false);const result=mergePhoneReply(p,state(),{profiles:[{contactId:contact.id,npc:{name:'Aoi Sato'},apps:{messages:{displayName:'Aoi'}}}],events:[{type:'message',contactId:contact.id,text:'Made it home?'}]},config,{source:'story-first'});
 assert.equal(result.phone.messages.length,1);assert.equal(result.state.npcs.length,1);assert.equal(result.phone.contacts[0].npcId,result.state.npcs[0].id);assert.equal(result.phone.pending.length,0);
 const denied=mergePhoneReply(p,state(),{profiles:[{contactId:contact.id,npc:{name:'Aoi Sato'}}],events:[{type:'message',contactId:contact.id,text:'No permission'}]},{...config,incomingMessages:false},{source:'story-denied'});assert.equal(denied.phone.messages.length,0);assert.equal(denied.state.npcs.length,0);
});

test('explicit undercover aliases link a saved contact to one existing NPC without renaming its public label',()=>{
 const {p}=setup(false);p.contacts[0].label='Cassandra';const npc={id:'x-extreme',name:'X-Extreme',relationship:'Date Partner (Alias: Cassandra)',notes:'Using alias Cassandra with fabricated abilities.'};
 const linked=linkPhoneContacts(p,[npc]);assert.equal(linked.contacts[0].npcId,npc.id);assert.equal(linked.contacts[0].label,'Cassandra');assert.equal(linkPhoneContacts(linked,[npc]),linked);assert(!p.contacts[0].npcId);
 assert.equal(phoneNpcForContact(p.contacts[0],[{id:'unrelated',name:'Someone',background:'A friend called Cassandra'}]),null);
 assert.equal(phoneNpcForContact(p.contacts[0],[npc,{id:'other',name:'Other',aliases:['Cassandra']}]),null);
 const result=mergePhoneReply(p,{...state(),npcs:[npc]},{events:[{type:'message',contactId:p.contacts[0].id,text:'Made it home?'}]},config,{source:'alias-first'});assert.equal(result.phone.messages.length,1);assert.equal(result.state.npcs.length,1);assert.equal(result.phone.contacts[0].name,'X-Extreme');assert.equal(result.phone.contacts[0].label,'Cassandra');
});
test('confirmed phone activity in the story is recoverable, while private thoughts, drafts and unrelated senders are excluded',()=>{
 const {p,contact}=setup();p.contacts[0].label='Cassandra';const s=state(),message={mes:'<tr-header name="Cassandra"/><tr-thought>What should I text first?</tr-thought><tr-narrative>Cassandra taps out a sequence of messages. The transmission chimes.</tr-narrative>'},user={mes:'Aster notified me of a new message from Cassandra.'};
 assert.deepEqual(phoneSceneSignal(p,s,message,user,config).actors,[contact.id]);
 for(const mes of ['<tr-thought>Cassandra sent a text.</tr-thought>','<tr-narrative>Cassandra did not send a message.</tr-narrative>','<tr-narrative>Cassandra wants to send a message.</tr-narrative>','<tr-narrative>Someone else sent a text.</tr-narrative>'])assert.equal(phoneSceneSignal(p,s,{mes},{mes:'I get home.'},config),null,mes);
 assert.equal(phoneSceneSignal(p,s,message,user,{...config,incomingMessages:false}),null);p.contacts[0].blocked=true;assert.equal(phoneSceneSignal(p,s,message,user,config),null);
});
test('Thai phone message completion is recognized without treating an unsent draft as a delivery',()=>{
 const {p,contact}=setup();p.contacts[0].label='แคสซานดรา';assert(phoneSceneSignal(p,state(),{mes:'แคสซานดราส่งข้อความมาแล้ว โทรศัพท์ของคุณแจ้งเตือน'},{mes:''},config));assert.equal(phoneSceneSignal(p,state(),{mes:'แคสซานดรายังไม่ได้ส่งข้อความ แค่คิดว่าจะพิมพ์อะไร'},{mes:''},config),null);
});
test('the player using their own Aster is possession evidence without a synthetic inventory item',()=>{
 assert(phoneOwnershipInStory([{is_user:true,mes:'I have a thousand reels on my Aster.'}]));assert(phoneOwnershipInStory([{is_user:true,mes:'Aster notified me of a new message.'}]));assert(!phoneOwnershipInStory([{is_user:false,mes:'Cassandra looks at her phone.'}]));assert(!phoneOwnershipInStory([{is_user:true,mes:'|I wish I had my phone.|'}]));assert(!phoneOwnershipInStory([{is_user:true,mes:'I check my phone.'},{is_user:true,mes:'I lost my phone.'}]));
});
test('phone story sync attempts survive reload as retryable interruptions without auth sessions',()=>{
 const p=blankPhone();p.storySync={source:'story:one',messageId:5,status:'working',error:''};p.processed.push('story:one:repair');const reloaded=normalizePhone(p);assert.equal(reloaded.storySync.status,'interrupted');assert(reloaded.processed.includes('story:one:repair'));assert.deepEqual(reloaded.sessions,{});
});

test('editing a contact can replace its existing NPC link',()=>{
 const {p,contact}=setup(true);const next=changePhone(p,{type:'contact-save',contact:{...contact,npcId:'another-npc'}}).phone;assert.equal(next.contacts[0].npcId,'another-npc');assert.equal(p.contacts[0].npcId,'aoi');
});
test('deleting a conversation clears its notifications and opening a message notification reads its thread',()=>{
 const {p,contact,thread}=setup(true);const received=applyIncoming(p,{type:'message',contactId:contact.id,threadId:thread.id,text:'Hello'},{config,time,source:'notice-test'});
 const read=changePhone(received,{type:'notification-read',id:received.notifications[0].id}).phone;assert(read.messages.every(m=>m.read));
 const deleted=changePhone(received,{type:'thread-delete',id:thread.id}).phone;assert.equal(deleted.messages.length,0);assert.equal(deleted.notifications.length,0);
});
