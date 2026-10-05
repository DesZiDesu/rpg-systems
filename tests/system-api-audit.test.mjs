import test from 'node:test';
import assert from 'node:assert/strict';
import {requestItemDecision,requestItemDetails} from '../src/item-generation.js';
import {requestPowerTraining} from '../src/power-mastery.js';
import {resolveReplyLoot} from '../src/loot-discovery.js';
import {requestMemorySummary} from '../src/memory-summary-runtime.js';
import {normalizeItemSystem} from '../src/item-core.js';
import {requestNpcDraft} from '../src/npc-generation.js';
import {requestMetadataTask,requestDataTask} from '../src/task-generation.js';
function provider(reply='{}'){
 let calls=0,cleaned=0;
 return{mainApi:'openai',chatCompletionSettings:{openai_max_tokens:4096},generateRawData:async()=>{calls++;return{choices:[{message:{content:reply},finish_reason:'stop'}]};},extractMessageFromData:data=>data.choices[0].message.content,
  generateRaw:async()=>{cleaned++;throw Error('No message generated');},generateQuietPrompt:async()=>assert.fail('An API failure must not trigger another call'),calls:()=>calls,cleaned:()=>cleaned};
}
const state=()=>({player:{hp:{current:100,max:100}},progression:{currency:{silver:100}},npcs:[],skills:[],inventory:[],location:{place:'Forest'},worldClock:{day:1,time:'10:00'},itemSystem:normalizeItemSystem()});
for(const [name,run]of [
 ['item action',h=>requestItemDecision(h,{id:'item',action:'use',item:{name:'Potion'}},{state:state(),story:''})],
 ['item details',h=>requestItemDetails(h,{id:'details',items:[]},{state:state()})],
 ['power training',h=>requestPowerTraining(h,{power:{name:'Fire Ball'},choice:'control',language:'th'})],
 ['compact Memory',h=>requestMemorySummary(h,'SOURCE','',null,'compact')],
 ['NPC draft',h=>requestNpcDraft(h,'Create an NPC draft',1800)],
 ['NPC baseline',h=>requestMetadataTask(h,{quietPrompt:'Fill initial NPC metadata',responseLength:2600,skipWIAN:true},'NPC baseline')],
 ['Manual Sync',h=>requestMetadataTask(h,{quietPrompt:'Synchronize this completed turn',responseLength:3200,skipWIAN:true},'manual synchronization')],
])test(`${name} reads JSON before story regexes using one provider request`,async()=>{
 const h=provider();assert.equal(await run(h),'{}');assert.equal(h.calls(),1);assert.equal(h.cleaned(),0);
});
test('automatic Loot recovery reads provider data, leaves ownership unchanged and records one completed check',async()=>{
 const s=state(),before=structuredClone(s),story='เปิดหีบไม้';
 const h=provider(JSON.stringify({loot:[],emptyReason:'หีบว่าง ไม่มีของที่เก็บได้'}));
 const result=await resolveReplyLoot({state:s,story,user:'เปิดหีบ',source:{messageId:1,turnKey:'1',variant:'story'},location:'Forest',context:h,parse:JSON.parse});
 assert.equal(result.checked,true);assert.equal(result.check.outcome,'empty');assert.equal(h.calls(),1);assert.equal(h.cleaned(),0);assert.deepEqual(s,before);
});
test('already cancelled compact Memory and selected profiles never dispatch a provider request',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const h={generateRaw:async()=>{calls++;return '{}';},extensionSettings:{connectionManager:{profiles:[{id:'summary'}]}},ConnectionManagerRequestService:{sendRequest:async()=>{calls++;return '{}';}}};
 for(const profile of ['', 'summary'])await assert.rejects(requestMemorySummary(h,'SOURCE',profile,controller.signal,'compact'),/MEMORY_CANCELLED/);
 assert.equal(calls,0);
});
test('compact Memory retains its own selected response budget independently of the chat reply length',async()=>{
 const h=provider();h.chatCompletionSettings.openai_max_tokens=512;
 h.generateRawData=async args=>{assert.equal(args.responseLength,4800);return{choices:[{message:{content:'{}'},finish_reason:'stop'}]};};
 assert.equal(await requestMemorySummary(h,'SOURCE','',null,'compact',4800),'{}');
});
test('task failures preserve provider HTTP status for Memory advice without exposing the API key',async()=>{
 const h=provider();h.generateRawData=async()=>{throw Object.assign(Error('Quota exceeded Bearer secret api_key=hidden'),{status:429});};
 await assert.rejects(requestDataTask(h,{prompt:'TASK',responseLength:2400}),error=>error.status===429&&error.details.status===429&&!/secret|hidden/.test(error.message));
});
test('native data-only hosts can run tasks, and legacy parsed objects remain usable',async()=>{
 const h=provider();delete h.generateRaw;delete h.generateQuietPrompt;assert.equal(await requestNpcDraft(h,'draft',1800),'{}');
 const value={outcome:'retry',narration:'Continue practicing.'};assert.deepEqual(await requestPowerTraining({generateRaw:async()=>value},{power:{name:'Aura'},choice:'control'}),value);
});
