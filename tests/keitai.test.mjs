import test from 'node:test';
import assert from 'node:assert/strict';
import {blankPhone,normalizePhone,phoneConfig,hasDevice} from '../src/workshop/smartphone/model.js';
import {changePhone,applyIncoming} from '../src/workshop/smartphone/engine.js';
import {mergePhoneReply,phoneTask,phoneWorldPrompt} from '../src/workshop/smartphone/ai.js';
import {phoneEnvironment,phoneAppChannel} from '../src/workshop/smartphone/context.js';
import {smsParts,checkPhoneAlarms} from '../src/workshop/smartphone/handset.js';
import {normalizeProfile} from '../src/workshop/core.js';
import {phoneSceneSignal} from '../src/workshop/smartphone/story.js';
const config=phoneConfig({deviceType:'keitai',incomingCalls:true}),time={day:3,time:'18:42'},world=()=>({player:{name:'Kai',age:'26'},npcs:[{id:'misaki',name:'Misaki',age:'25',enabled:true,trust:10}],worldClock:{...time},location:{place:'Harbor Station'},inventory:[{name:'Aster K06 flip phone',quantity:1}]});
function fixture(){let p=blankPhone();p=changePhone(p,{type:'contact-save',contact:{label:'Misaki',number:'090-123',email:'misaki@aster.example',npcId:'misaki'}}).phone;return p;}
test('handset selection belongs to the character, does not impose a calendar, and recognizes flip-phone inventory',()=>{
 const profile=normalizeProfile({enabled:['smartphone'],phone:config},'character');assert.equal(profile.phone.deviceType,'keitai');assert.equal(phoneConfig(profile.phone).deviceType,'keitai');assert(hasDevice(world(),config));assert(hasDevice({...world(),inventory:[{name:'มือถือฝาพับ',quantity:1}]},config));assert.equal(phoneConfig({deviceType:'unknown'}).deviceType,'smartphone');
 const env=phoneEnvironment(blankPhone(),config);assert.equal(env.device.model,'Aster K06');assert(!env.apps.some(a=>a.id==='gather'));assert.doesNotMatch(JSON.stringify(env),/2006|2007/);assert.equal(phoneEnvironment(blankPhone()).device.type,'smartphone');
});
test('mail and SMS have separate stable conversations with subjects and preserve existing smartphone threads',()=>{
 let p=fixture(),id=p.contacts[0].id;for(const channel of ['', 'sms','mail'])p=changePhone(p,{type:'thread-open',contactId:id,channel}).phone;
 assert.equal(p.threads.length,3);const mail=p.threads.find(t=>t.channel==='mail'),sms=p.threads.find(t=>t.channel==='sms');p=changePhone(p,{type:'thread-open',contactId:id,channel:'mail'}).phone;assert.equal(p.threads.length,3);
 p=changePhone(p,{type:'message-send',threadId:mail.id,text:'See you by the station',subject:'On my way'}).phone;assert.equal(p.messages[0].subject,'On my way');assert.equal(p.pending[0].channel,'mail');assert.equal(phoneAppChannel(p,mail.id).appName,'Mobile Mail');assert.equal(phoneAppChannel(p,sms.id).appName,'SMS');
});
test('a mail-only contact is valid, invalid or duplicate addresses are rejected, and no number is fabricated',()=>{
 let p=changePhone(blankPhone(),{type:'contact-save',contact:{label:'Mail friend',email:'friend@aster.example'}}).phone;assert.equal(p.contacts[0].number,'');assert.throws(()=>changePhone(p,{type:'thread-open',contactId:p.contacts[0].id,channel:'sms'}));p=changePhone(p,{type:'thread-open',contactId:p.contacts[0].id,channel:'mail'}).phone;assert.equal(p.threads[0].channel,'mail');assert.throws(()=>changePhone(p,{type:'contact-save',contact:{label:'Bad',email:'not-an-email'}}));assert.throws(()=>changePhone(p,{type:'contact-save',contact:{label:'Duplicate',email:'friend@aster.example'}}));
});
test('the first unsolicited mobile mail creates a real linked contact and a replyable email channel',()=>{
 const result=mergePhoneReply(blankPhone(),world(),{profiles:[{contactId:'first',npcId:'misaki',source:'incoming',email:'misaki@aster.example'}],events:[{type:'message',actorId:'misaki',contactId:'first',channel:'mail',subject:'Where are you?',text:'I am by the bridge.'}]},config,{time,source:'incoming-mail'});
 assert.equal(result.phone.messages.length,1);assert.equal(result.phone.contacts.length,1);assert.equal(result.phone.contacts[0].npcId,'misaki');assert.equal(result.phone.contacts[0].email,'misaki@aster.example');assert.equal(result.phone.threads[0].channel,'mail');const replyable=changePhone(result.phone,{type:'thread-open',contactId:result.phone.contacts[0].id,channel:'mail'});assert.equal(replyable.phone.threads.length,1);
});
test('SMS uses GSM extension septets and Unicode UTF-16 units to count multipart messages accurately',()=>{
 assert.equal(smsParts('a'.repeat(160)).parts,1);assert.equal(smsParts('a'.repeat(161)).parts,2);assert.equal(smsParts('^'.repeat(81)).parts,2);assert.equal(smsParts('ก'.repeat(70)).parts,1);assert.equal(smsParts('ก'.repeat(71)).parts,2);assert.equal(smsParts('😀'.repeat(36)).parts,2);assert.equal(smsParts('😀').units,2);assert.equal(smsParts('😀').characters,1);
});
test('saved mail drafts, alarms and web pages survive normalize/reload without changing settings or old social data',()=>{
 let p=fixture();p.installed.push('gather');p=changePhone(p,{type:'keitai-draft',draft:{contactId:p.contacts[0].id,channel:'mail',subject:'Draft',text:'A long note',photoId:''}}).phone;p=changePhone(p,{type:'alarm-save',time:'19:00',enabled:true},{time}).phone;
 const restored=normalizePhone(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored.keitaiDraft,p.keitaiDraft);assert.equal(restored.alarms[0].time,'19:00');assert(restored.installed.includes('gather'));assert.deepEqual(restored.sessions,{});
});
test('blocked identities, incoming permissions and unavailable smartphone apps are enforced on the flip phone',()=>{
 const p=fixture(),id=p.contacts[0].id;p.installed.push('gather','lumen','murmur');for(const event of [{type:'message',app:'gather',text:'No'},{type:'post',app:'lumen',text:'No'},{type:'follow',app:'murmur'}])assert.equal(applyIncoming(p,{...event,contactId:id},{config,time}).revision,p.revision);
 const blocked=changePhone(p,{type:'contact-flag',contactId:id,field:'blocked',value:true}).phone;assert.equal(applyIncoming(blocked,{type:'message',contactId:id,channel:'mail',text:'No'},{config,time}).messages.length,0);
});
test('mobile mail replies retain subjects, resolve requests and still update the actual relationship graph',()=>{
 let p=fixture(),id=p.contacts[0].id;p=changePhone(p,{type:'thread-open',contactId:id,channel:'mail'}).phone;p=changePhone(p,{type:'message-send',threadId:p.threads[0].id,text:'How are you?',subject:'Evening'}).phone;const q=p.pending[0];const result=mergePhoneReply(p,world(),{events:[{type:'message',contactId:id,threadId:q.threadId,requestId:q.id,channel:'mail',subject:'Re: Evening',text:'I trust you, Kai.'}]},config,{requests:p.pending,source:'mail-reply',advanceTime:true});assert.equal(result.phone.pending.length,0);assert.equal(result.phone.messages.at(-1).subject,'Re: Evening');assert.equal(result.state.worldClock.time,'18:43');assert.equal(result.state.relationships.links.find(l=>l.actorId==='misaki'&&l.targetId==='player').trust,11);
});
test('the model receives the flip handset and requested mail channel without an unconditional smartphone instruction',()=>{
 let p=fixture();p=changePhone(p,{type:'thread-open',contactId:p.contacts[0].id,channel:'mail'}).phone;p=changePhone(p,{type:'message-send',threadId:p.threads[0].id,text:'Hello',subject:'A note'}).phone;const task=phoneTask(p,world(),config,p.pending),payload=JSON.parse(task.prompt.split('\n').slice(1).join('\n'));assert.equal(payload.environment.device.model,'Aster K06');assert.equal(payload.requests[0].channel,'mail');assert.doesNotMatch(task.systemPrompt,/current handset model\. It is a smartphone/);assert.match(task.systemPrompt,/imposes NO year/);assert.match(phoneWorldPrompt(p,world(),config),/Aster K06/);
});
test('portal pages answer only a real pending request and cannot inject unrelated state or unsolicited pages',()=>{
 let p=blankPhone();p=changePhone(p,{type:'browser-query',section:'weather',mode:'immediate'},{time}).phone;const q=p.pending[0];assert.equal(changePhone(p,{type:'browser-query',section:'weather'}).phone,p);const result=mergePhoneReply(p,world(),{pages:[{requestId:q.id,title:'Evening weather',body:'Clear and cool at Harbor Station.'},{requestId:'forged',title:'No',body:'No'}],ops:[['set','player.name','intruder']]},config,{requests:p.pending,time});assert.equal(result.phone.pending.length,0);assert.equal(result.phone.webPages.length,1);assert.equal(result.phone.webPages[0].section,'weather');assert.equal(result.state.player.name,'Kai');
});
test('camera captures a scene record or an explicitly selected reference, never invents private image vision',()=>{
 const p=blankPhone(),captured=changePhone(p,{type:'camera-capture',caption:'The station gate'},{time,location:{place:'Harbor Station'}}).phone;assert.equal(captured.photos[0].image,'');assert.equal(captured.photos[0].scene.place,'Harbor Station');assert.deepEqual(captured.photos[0].sharedWith,[]);const reference=changePhone(p,{type:'photo-save',image:'data:image/png;base64,aGVsbG8=',caption:'User reference'}).phone;const next=changePhone(reference,{type:'camera-capture',photoId:reference.photos[0].id,caption:'In-world photograph'},{time}).phone;assert.equal(next.photos[1].image,reference.photos[0].image);
});
test('scene photographs can be explicitly shared by mail without exposing the remaining private gallery',()=>{
 let p=fixture();p=changePhone(p,{type:'camera-capture',caption:'A station photograph'},{time}).phone;const ph=p.photos[0];p=changePhone(p,{type:'thread-open',contactId:p.contacts[0].id,channel:'mail'}).phone;p=changePhone(p,{type:'message-send',threadId:p.threads[0].id,photoId:ph.id,subject:'Photo'}).phone;assert.equal(p.messages[0].photoId,ph.id);assert(p.photos[0].sharedWith.includes(p.contacts[0].id));const task=phoneTask(p,world(),config,p.pending);assert.match(task.prompt,/A station photograph/);assert.doesNotMatch(task.prompt,/data:image/);
});
test('alarms fire once across midnight, do not fire on backwards time and keep a reversible receipt in phone state',()=>{
 let p=changePhone(blankPhone(),{type:'alarm-save',time:'00:05',label:'Meet friend'},{time:{day:3,time:'23:58'}}).phone;p=checkPhoneAlarms(p,{day:4,time:'00:06'});assert.equal(p.notifications.length,1);assert.equal(p.notifications[0].type,'alarm');assert.equal(checkPhoneAlarms(p,{day:4,time:'00:06'}),p);p=checkPhoneAlarms(p,{day:4,time:'00:00'});p=checkPhoneAlarms(p,{day:4,time:'00:06'});assert.equal(p.notifications.length,1);p=checkPhoneAlarms(p,{day:5,time:'00:06'});assert.equal(p.notifications.length,2);
});
test('editing flip-phone contact details preserves an existing portrait and assigned call voice',()=>{
 let p=fixture(),c=p.contacts[0];p=changePhone(p,{type:'contact-save',contact:{...c,avatar:'data:image/png;base64,aGVsbG8=',voiceId:'assigned-voice'}}).phone;c=p.contacts[0];p=changePhone(p,{type:'contact-save',contact:{id:c.id,label:'A new saved label',number:c.number,email:c.email}}).phone;assert.equal(p.contacts[0].avatar,c.avatar);assert.equal(p.contacts[0].voiceId,'assigned-voice');
});
test('opening a smartphone conversation after a mail-only thread does not silently select the mail transport',()=>{
 let p=fixture(),id=p.contacts[0].id;p=changePhone(p,{type:'thread-open',contactId:id,channel:'mail'}).phone;p=changePhone(p,{type:'thread-open',contactId:id}).phone;assert.equal(p.threads.length,2);assert.equal(p.threads[1].channel,undefined);
});
test('Thai mobile-mail prose can request story recovery while unsent plans remain ineligible',()=>{
 const p=fixture(),s=world();s.npcs[0].name='มิซากิ';assert(phoneSceneSignal(p,s,{mes:'มิซากิส่งเมลมาแล้ว'},{mes:''},config));assert.equal(phoneSceneSignal(p,s,{mes:'มิซากิยังไม่ได้ส่งเมล แค่คิดว่าจะเขียนอะไร'},{mes:''},config),null);
});
test('malformed imported alarm and portal records cannot break an otherwise valid phone save',()=>{
 const p=blankPhone();p.alarms=[null,{id:'bad',time:'99:99'},{id:'good',time:'07:00',enabled:true}];p.webPages=[null,{section:'unknown'},{section:'weather',title:'Clear',body:'Cool'}];const n=normalizePhone(p);assert.equal(n.alarms.length,1);assert.equal(n.webPages.length,1);
});
test('rescheduling an alarm after it has fired permits its new time on the same story day',()=>{
 let p=changePhone(blankPhone(),{type:'alarm-save',time:'08:00'},{time:{day:1,time:'07:50'}}).phone;p=checkPhoneAlarms(p,{day:1,time:'08:01'});assert.equal(p.notifications.length,1);p=changePhone(p,{type:'alarm-save',id:p.alarms[0].id,time:'09:00'},{time:{day:1,time:'08:02'}}).phone;p=checkPhoneAlarms(p,{day:1,time:'09:01'});assert.equal(p.notifications.length,2);
});
test('unavailable social-app profiles do not create phantom phone contacts on K06',()=>{
 const result=mergePhoneReply(blankPhone(),world(),{profiles:[{source:'public',npcId:'misaki',contactId:'social-misaki',apps:{lumen:{displayName:'Misaki photos'}}}],events:[{type:'post',contactId:'social-misaki',app:'lumen',text:'New post'}]},config,{time});assert.equal(result.phone.contacts.length,0);assert.equal(result.phone.posts.length,0);
});
