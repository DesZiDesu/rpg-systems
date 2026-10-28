import test from 'node:test';
import assert from 'node:assert/strict';
import {APPS,blankPhone,phoneConfig} from '../src/workshop/smartphone/model.js';
import {phoneEnvironment,phoneAppChannel,publicPhonePosts,PHONE_WORLD_KNOWLEDGE} from '../src/workshop/smartphone/context.js';
import {phoneTask,phoneWorldPrompt} from '../src/workshop/smartphone/ai.js';
const config=phoneConfig(),state={player:{name:'Mael'},npcs:[],worldClock:{day:1,time:'15:20'}};
function fixture(){
 const p=blankPhone();p.installed.push('gather','lumen','murmur');p.contacts=[{id:'riley',npcId:'riley-npc',label:'Riley',name:'SECRET CANONICAL NAME'}];
 p.threads=[{id:'sms',app:'messages',members:['player','riley']},{id:'group',app:'gather',members:['player','riley','friend']}];
 p.messages=[{id:'m1',threadId:'sms',from:'player',text:'Send it on Gather',time:{day:1,time:'15:19'}},{id:'m2',threadId:'group',from:'riley',text:'Meet in the group chat',time:{day:1,time:'15:20'}}];
 p.profiles.riley={lumen:{displayName:'riley.art',handle:'riley',private:false},murmur:{displayName:'Quiet account',private:true}};
 p.posts=[{id:'public-post',actor:'riley',app:'lumen',text:'A new painting',kind:'post',time:{day:1,time:'15:18'},likes:['player'],reposts:[],comments:[{actor:'player',text:'Looks great!',time:{day:1,time:'15:19'}}]},{id:'private-post',actor:'riley',app:'murmur',text:'PRIVATE POST'}];
 return p;
}
test('phone catalog derives actual UI names and distinguishes the Aster brand, model, apps and sites',()=>{
 const p=blankPhone(),environment=phoneEnvironment(p);assert.deepEqual(environment.device,{brand:'Aster',model:'Aster One',type:'smartphone'});
 assert.equal(environment.apps.length,APPS.length);for(const app of APPS){const entry=environment.apps.find(a=>a.id===app.id);assert.equal(entry.name,app.name);assert.equal(entry.thaiName,app.th);assert.equal(entry.installed,p.installed.includes(app.id));assert(entry.purpose);}
 for(const name of ['Gather','Lumen','Murmur','Drift','Harbor Store'])assert(environment.apps.some(a=>a.name===name));
 assert.equal(environment.apps.find(a=>a.id==='gather').installed,false);p.installed.push('gather');assert.equal(phoneEnvironment(p).apps.find(a=>a.id==='gather').installed,true);
 assert.equal(environment.sites.find(s=>s.name==='Night Arcade').insideApp,'browser');assert.match(PHONE_WORLD_KNOWLEDGE,/brand names in both Thai and English/);
});
test('message channels preserve the difference between Messages and Gather, including queued requests',()=>{
 const p=fixture();assert.deepEqual(phoneAppChannel(p,'sms'),{app:'messages',appName:'Messages'});assert.deepEqual(phoneAppChannel(p,'group'),{app:'gather',appName:'Gather'});assert.deepEqual(phoneAppChannel(p,'absent'),{});
 p.pending=[{id:'q',type:'message',threadId:'group',contactId:'riley',status:'pending'}];
 const task=phoneTask(p,state,config,p.pending),data=JSON.parse(task.prompt.slice('ROLEFORGE_PHONE_TASK\n'.length));assert.equal(data.requests[0].appName,'Gather');assert.equal(data.references[0].messages[0].appName,'Messages');assert.equal(data.references[0].messages[1].appName,'Gather');assert.equal(data.environment.device.brand,'Aster');assert.match(task.systemPrompt,/not a messaging app named Aster/);
});
test('main and phone tasks see recorded public activity with app and public account names',()=>{
 const p=fixture(),posts=publicPhonePosts(p);assert.equal(posts.length,1);assert.equal(posts[0].appName,'Lumen');assert.equal(posts[0].account.displayName,'riley.art');assert.equal(posts[0].comments[0].text,'Looks great!');assert.doesNotMatch(JSON.stringify(posts),/SECRET CANONICAL|PRIVATE POST/);
 const main=phoneWorldPrompt(p,state,config);assert.match(main,/Aster One/);assert.match(main,/Harbor Store/);assert.match(main,/A new painting/);assert.match(main,/riley.art/);assert.match(main,/Gather/);assert.doesNotMatch(main,/PRIVATE POST|SECRET CANONICAL/);
 const task=phoneTask(p,state,config,[]);assert.match(task.prompt,/A new painting/);assert.doesNotMatch(task.prompt,/PRIVATE POST|SECRET CANONICAL/);
});
test('blocked, private, deleted and unsupported posts stay out of shared public activity',()=>{
 const p=fixture();p.posts.push({...p.posts[0],id:'deleted',deleted:true,text:'DELETED'},{...p.posts[0],id:'not-social',app:'notes',text:'PRIVATE NOTE'});
 assert.deepEqual(publicPhonePosts(p).map(v=>v.id),['public-post']);p.contacts[0].blocked=true;assert.equal(publicPhonePosts(p).length,0);p.contacts[0].blocked=false;p.contacts.push({id:'blocked-alias',npcId:'riley-npc',blocked:true});assert.equal(publicPhonePosts(p).length,0);
});
test('app context is bounded and does not serialize private device data or image payloads',()=>{
 const p=fixture();p.notes=[{text:'PRIVATE NOTE'}];p.photos=[{image:'data:image/png;base64,PRIVATE',caption:'PRIVATE PHOTO'}];p.accounts=[{username:'PRIVATE LOGIN',pin:'PRIVATE PIN'}];
 p.posts=Array.from({length:20},(_,i)=>({...p.posts[0],id:'p'+i,text:'x'.repeat(5000),comments:Array.from({length:8},()=>({actor:'player',text:'c'.repeat(1000)}))}));
 const posts=publicPhonePosts(p);assert.equal(posts.length,8);assert.equal(posts[0].text.length,1200);assert.equal(posts[0].comments.length,3);assert.equal(posts[0].comments[0].text.length,400);
 assert.doesNotMatch(JSON.stringify({environment:phoneEnvironment(p),posts}),/PRIVATE|data:image/);assert.match(PHONE_WORLD_KNOWLEDGE,/never invent player taps, posts, follows or installations/);
});
