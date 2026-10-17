import test from 'node:test';
import assert from 'node:assert/strict';
import {continueWeaponAction,weaponButtonAuthorizations,WEAPON_BUTTON_KEY} from '../src/weapon-continuation.js';
import {applyWeaponEvents,equippedWeapon} from '../src/weapon-core.js';
const state=()=>({player:{name:'Alex'},inventory:[{id:'gun',name:'AKM',quantity:1,category:'Weapon',weapon:{category:'rifle',mode:'magazine',current:6,capacity:30,ammoType:'7.62'}}],weaponSystem:{version:1,equippedItemId:'gun',entries:[],receipts:[]}});
const event=(requestId,overrides={})=>({id:'event-one',requestId,itemId:'gun',actor:'player',outcome:'success',action:'use',count:2,evidence:'You fire 2 rounds from your AKM.',...overrides});
function host(){
 const context={chat:[{is_user:true,mes:'Stay here.'},{is_user:false,mes:'The room is quiet.   ',swipe_id:0}],prompts:new Map(),calls:[],draft:'This is my unsent draft',setExtensionPrompt(key,value){this.prompts.set(key,value);},async generate(type,options){this.calls.push(type);assert.deepEqual(options,{automatic_trigger:true,depth:1});this.chat.at(-1).mes+='\nYou fire 2 rounds from your AKM.';}};
 return context;
}
const start=(context,action='use',extra={})=>continueWeaponAction({context,weapon:equippedWeapon(state()),action,scope:()=> 'same-owner-chat',id:()=> 'unit-action-1234',...extra});
test('all weapon buttons call native Continue without a User turn or draft change',async()=>{
 for(const action of ['use','reload','activate','deactivate','describe']){
  const context=host(),before=context.chat[0].mes;await start(context,action);
  assert.deepEqual(context.calls,['continue']);assert.equal(context.chat.length,2);assert.equal(context.chat.filter(m=>m.is_user).length,1);assert.equal(context.chat[0].mes,before);assert.equal(context.draft,'This is my unsent draft');
  assert([...context.prompts.values()].every(value=>value===''));
  const auth=weaponButtonAuthorizations(context.chat[1]);assert.equal(auth.length,1);assert.equal(auth[0].action,action);assert.doesNotMatch(auth[0].story,/room is quiet/);assert.match(auth[0].story,/2 rounds/);
 }
});
test('missing assistant, empty continuation and provider failures never fall back to sending a user',async()=>{
 const context=host();context.chat.pop();await assert.rejects(start(context),/assistant reply/);assert.deepEqual(context.calls,[]);
 for(const fail of [false,true]){
  const c=host();c.generate=async type=>{c.calls.push(type);if(fail)throw Error('provider failed');};
  await assert.rejects(start(c),fail?/provider failed/:/No continuation/);assert.deepEqual(c.calls,['continue']);assert.equal(c.chat.length,2);assert.equal(c.chat[1].extra[WEAPON_BUTTON_KEY].length,0);assert([...c.prompts.values()].every(value=>!value));
 }
});
test('successive actions reuse a single empty prompt slot',async()=>{
 const c=host();for(let i=0;i<4;i++)await start(c,'describe',{id:()=> 'bounded-action-'+i});
 assert.equal(c.prompts.size,1);assert([...c.prompts.values()].every(value=>!value));
});
test('button requests persist as bounded receipts and stay tied to the selected swipe',async()=>{
 const c=host();await start(c);const saved=JSON.parse(JSON.stringify(c.chat[1]));
 assert.equal(weaponButtonAuthorizations(saved).length,1);saved.mes+=' Later unrelated story.';assert.doesNotMatch(weaponButtonAuthorizations(saved)[0].story,/Later/);saved.swipe_id=1;assert.deepEqual(weaponButtonAuthorizations(saved),[]);
});
test('continuation boundaries follow visible prose when trackers rewrite private metadata',async()=>{
 const c=host(),visible=value=>String(value).replace(/<!--[^]*?-->/gu,'');
 c.chat[1].mes+='<!--private metadata '+('x'.repeat(1500))+'-->';
 await start(c,'use',{visible});const source=c.chat[1];
 source.mes=source.mes.replace(/<!--[^]*?-->/gu,'<!--updated-->');
 const auth=weaponButtonAuthorizations(source,visible);assert.equal(auth.length,1);assert.match(auth[0].story,/2 rounds/);assert.doesNotMatch(auth[0].story,/room is quiet/);
 source.mes+=' A later unrelated scene.';assert.doesNotMatch(weaponButtonAuthorizations(source,visible)[0].story,/unrelated/);
});
test('changing chat during continuation rejects the stale request and clears its prompt',async()=>{
 const c=host();let current='old',listener,removed=false;c.eventTypes={CHAT_CHANGED:'changed'};c.eventSource={on(event,fn){listener=fn;},removeListener(event,fn){assert.equal(fn,listener);removed=true;}};
 c.generate=async()=>{c.chat.at(-1).mes+=' An outcome.';current='new';listener();assert([...c.prompts.values()].every(value=>!value),'the old prompt clears immediately on chat switch');};
 await assert.rejects(start(c,'use',{scope:()=>current}),/chat changed/);assert.equal(c.chat.length,2);assert([...c.prompts.values()].every(value=>!value));
 assert.equal(removed,true);
});
test('only matching button consent and new visible evidence can spend resources',async()=>{
 const c=host();await start(c);const auth=weaponButtonAuthorizations(c.chat[1]),requestId=auth[0].id;
 const options={enabled:true,source:{turnKey:'turn',variant:'one'},story:c.chat[1].mes,user:'Stay here.',authorizedActions:auth};
 const result=applyWeaponEvents(state(),[event(requestId)],options);assert.equal(equippedWeapon(result.next).current,4);assert.equal(result.accepted.length,1);
 for(const raw of [event('forged-request'),event(requestId,{itemId:'other'}),event(requestId,{action:'reload'}),event(requestId,{evidence:'You plan to fire your AKM twice.'})])assert.equal(applyWeaponEvents(state(),[raw],options).accepted.length,0);
 assert.equal(applyWeaponEvents(state(),[event(requestId)],{...options,authorizedActions:[{...auth[0],story:'Nothing happens.'}]}).accepted.length,0);
 assert.equal(applyWeaponEvents(state(),[event(requestId)],{...options,authorizedActions:[]}).accepted.length,0);
});
test('one button receipt cannot be spent twice under different model event IDs',async()=>{
 const c=host();await start(c);const auth=weaponButtonAuthorizations(c.chat[1]),raw=event(auth[0].id),options={enabled:true,source:{turnKey:'turn',variant:'one'},story:c.chat[1].mes,authorizedActions:auth};
 const result=applyWeaponEvents(state(),[raw,{...raw,id:'duplicate-other-id'}],options);assert.equal(equippedWeapon(result.next).current,4);assert.equal(result.accepted.length,1);
 assert.equal(equippedWeapon(applyWeaponEvents(result.next,[raw],options).next).current,4);
 assert.equal(equippedWeapon(applyWeaponEvents(result.next,[{...raw,id:'echo-in-continuation'}],{...options,source:{...options.source,variant:'changed-content'}}).next).current,4,'a new content hash must not spend the same button again');
});
