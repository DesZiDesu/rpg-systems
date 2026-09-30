import test from 'node:test';
import assert from 'node:assert/strict';
import {questRewardGuard,normalizeQuestRewardReceipts} from '../src/quest-rewards.js';
const quest={id:'escort',name:'Urgent Merchant Caravan Escort',status:'Completed',rewardClaimed:true};
const state=()=>({quests:[{...quest}],questRewardReceipts:[],inventory:[],progression:{currency:{gold:6,silver:0,copper:120},experience:0}});
const pay=(value,meta={},verb='inc')=>[verb,'progression.currency.gold',value,{reason:'Caravan escort mission reward share',category:'quest-reward',...meta}];
test('claimed quest rewards reject paraphrased reasons and changed amount without questId',()=>{
 const guard=questRewardGuard(state(),[pay(7)]);assert.equal(guard.inspect(pay(7)).blocked,true);
});
test('claimed rewards cannot bypass receipts with a set balance, category change or another reward type',()=>{
 const current=state(),ops=[pay(13,{category:'currency',questId:'escort'},'set'),
  ['upsert','proficiencies.customMagic',{id:'spell',name:'Reward spell'},{questId:'escort',category:'learning'}]];
 const guard=questRewardGuard(current,ops);for(const op of ops)assert.equal(guard.inspect(op).blocked,true);
});
test('first reward accepts all distinct components, but deduplicates a repeated denomination regardless of prose or verb',()=>{
 const current=state();current.quests[0].rewardClaimed=false;
 const ops=[pay(6,{questId:'escort'}),pay(7,{questId:'escort',reason:'Different explanation'}),pay(20,{questId:'escort'},'set'),
  ['inc','progression.currency.silver',5,{questId:'escort'}],['inc','progression.experience',20,{questId:'escort'}]];
 const guard=questRewardGuard(current,ops),accepted=[];
 for(const op of ops){const decision=guard.inspect(op);if(!decision.blocked){accepted.push(op);guard.accept(decision);}}
 assert.equal(accepted.length,3);const candidate=structuredClone(current);guard.finish(candidate);
 assert.equal(candidate.questRewardReceipts.length,1);assert.equal(candidate.quests[0].rewardClaimed,true);
 assert.equal(questRewardGuard(candidate,[pay(7)]).inspect(pay(7)).blocked,true);
});
test('payment receipt survives removal and a recreated quest with a different id',()=>{
 const current=state();current.questRewardReceipts=normalizeQuestRewardReceipts([],current.quests);current.quests=[];
 const op=['upsert','quests',{id:'new-id',name:quest.name,status:'Completed'}],reward=pay(7,{questId:'new-id'});
 assert.equal(questRewardGuard(current,[op,reward]).inspect(reward).blocked,true);
});
test('expenses, ordinary sales and independent combat rewards remain allowed',()=>{
 const ops=[pay(-2,{questId:'escort'}),pay(4,{category:'currency',reason:'Sold an iron sword'}),
  ['inc','progression.experience',5,{category:'reward',reason:'Defeated a wolf'}]];
 const guard=questRewardGuard(state(),ops);for(const op of ops)assert.equal(guard.inspect(op).blocked,false);
});
test('ambiguous or unknown quest identity cannot create a new payment; exact different quests can',()=>{
 const current=state();current.quests.push({id:'escort-2',name:'Urgent Merchant Caravan Escort North',rewardClaimed:false});
 const guard=questRewardGuard(current,[]);
 assert.equal(guard.inspect(pay(7)).blocked,true);assert.equal(guard.inspect(pay(7,{questId:'unrelated-new-id'})).blocked,true);
 assert.equal(guard.inspect(pay(7,{questId:'escort-2'})).blocked,false);
});
test('a sole completion in this patch can identify a first reward and malformed aliases do not throw',()=>{
 const current=state();current.quests=[];const complete=['upsert','quests',{id:'new',name:'Unrelated Rescue',status:'Completed',aliases:{bad:true}}];
 const op=pay(7,{reason:'Mission reward'}),guard=questRewardGuard(current,[complete,op]);assert.equal(guard.inspect(op).blocked,false);
 assert.equal(guard.inspect(op).record.id,'new');
});
test('malformed saved receipt and quest values cannot prevent receipt migration',()=>{
 const values=[null,undefined,3,'bad',[],{}, {questId:'escort',name:quest.name,aliases:{bad:true}}];
 const normalized=normalizeQuestRewardReceipts(values,[null,undefined,3,{...quest}]);
 assert.equal(normalized.length,1);assert.equal(normalized[0].questId,'escort');
 assert.deepEqual(normalizeQuestRewardReceipts({bad:true},{bad:true}),[]);
 const malformed={...state(),quests:[null,{...quest}],questRewardReceipts:{bad:true}};
 const guard=questRewardGuard(malformed,[pay(7)]);assert.equal(guard.inspect(pay(7)).blocked,true);
 const candidate={...state()};assert.doesNotThrow(()=>guard.finish(candidate));
});
