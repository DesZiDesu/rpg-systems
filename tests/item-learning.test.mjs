import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeItemLearning,validItemLearning,applyItemLearning,duplicateItemLearningOperation} from '../src/item-learning.js';
import {completeItemDefinition} from '../src/item-definition.js';
import {learnedAbilities,abilityTrainingTargets} from '../src/incantation-core.js';
import {normalizeItemSystem,itemRecord,mergeItemUsage,prepareItemAction,validateItemResponse,applyItemDecision,applyStoryItemEvents,ingestLoot,applyItemDetails,itemMissingFields,configureItemUsage} from '../src/item-core.js';
import {createCommerceSession,normalizeCommerce,prepareCommerceAction,applyCommerceDecision} from '../src/commerce-engine.js';
import {normalizeMarketplaceEvent} from '../src/marketplace-events.js';
import {normalizeAuctionOffer} from '../src/auction-core.js';
const grant=(extra={})=>({kind:'skill',id:'fire',name:'Fire Ball',type:'Magic',description:'Launch a fireball.',mastery:5,ability:{kind:'magic',effect:'Burn one distant enemy.',element:'Fire',range:'20m',target:'Enemy',costKnown:true,costs:[{resource:'mp',amount:10,note:''}],cooldown:{unit:'turns',value:2,remaining:0,ready:true},incantation:{required:true,language:'en',short:'Ignite!',full:'Flames gather.\nRise and ignite!',silent:{available:false,reason:'Requires training'}}},duplicate:{mode:'reject',amount:0},...extra});
const book=(learns=[grant()])=>itemRecord(completeItemDefinition({id:'book',name:'Fire Spellbook',category:'Skill Book',quantity:3,usage:{action:'use',consumable:true,effect:'Learn Fire Ball; already known cannot use.',stats:[],learns}}));
const state=()=>({player:{hp:{current:50,max:100},mp:{current:100,max:100},stamina:{current:100,max:100},survival:{hunger:50,thirst:40}},progression:{currency:{gold:0,silver:100,copper:0}},skills:[],proficiencies:{techniques:[]},customPowers:{},worldClock:{day:1,time:'10:00'},location:{place:'Hall'},inventory:[book()],itemSystem:normalizeItemSystem(),commerce:normalizeCommerce()});
function use(s,{quantity=1,outcome='success',id='use'}={}){
 const p=prepareItemAction(s,{action:'use',itemId:'book',quantity},{requestId:id,turn:1});if(!p.ok)return p;
 const evidence='ใช้ Fire Spellbook แล้ว';return applyItemDecision(s,p.request,validateItemResponse({narrative:`<tr-narrative>${evidence}</tr-narrative>`,itemAction:{requestId:id,outcome,reason:'Read the book',evidence}},p.request));
}
test('using a skill book creates a usable, trainable ability with full costs and chants, consumes once, and leaves presets alone',()=>{
 const s=state(),r=use(s);assert.equal(r.ok,true);assert.equal(r.next.inventory[0].quantity,2);assert.equal(r.next.skills[0].mastery,5);assert.equal(r.next.skills[0].ability.costs[0].amount,10);
 assert.equal(learnedAbilities(r.next)[0].key,'skill:fire');assert.equal(abilityTrainingTargets(r.next)[0].id,'skill:fire');assert.match(r.next.skills[0].ability.incantation.full,/\n/);assert.deepEqual(r.next.customPowers,{});assert.equal(r.next.player.mp.current,100);assert.equal(s.skills.length,0);
 assert.equal(use(r.next,{id:'again'}).error,'learned');assert.equal(r.next.inventory[0].quantity,2);
});
test('one item grants multiple skills, techniques and stat effects in the same transaction',()=>{
 const s=state();s.inventory=[book([grant(),grant({kind:'technique',id:'sword',name:'Sword Arc',ability:{kind:'physical',effect:'Strike a nearby enemy.',costKnown:true,costs:[],incantation:{required:false}}})])];
 s.inventory[0].usage.stats=[{stat:'player.hp.current',operation:'inc',value:20,overflow:'clamp',duration:{unit:'none',value:0}}];const r=use(s);assert.equal(r.ok,true);assert.equal(r.next.player.hp.current,70);assert.equal(r.next.proficiencies.techniques[0].proficiency,5);assert.equal(learnedAbilities(r.next).length,2);
});
for(const outcome of ['failed','refused'])test(`${outcome} grants no abilities and consumes nothing`,()=>{const s=state(),r=use(s,{outcome});assert.equal(r.ok,true);assert.deepEqual(r.next.skills,[]);assert.equal(r.next.inventory[0].quantity,3);});
test('duplicate reject is atomic even when another ability and stats could be granted first',()=>{
 const s=state();s.skills=applyItemLearning(s,[grant()]).next.skills;s.inventory=[book([grant({id:'ice',name:'Ice Lance'}),grant()])];s.inventory[0].usage.stats=[{stat:'player.hp.current',operation:'inc',value:20,duration:{unit:'none',value:0}}];const before=structuredClone(s);assert.equal(use(s).error,'learned');assert.deepEqual(s,before);
});
test('multiple copies with mastery policy add only the remaining copies, cap at 100, and match existing names across IDs',()=>{
 const s=state(),g=grant({duplicate:{mode:'mastery',amount:20}});s.inventory=[book([g])];const r=use(s,{quantity:3});assert.equal(r.next.skills[0].mastery,45);assert.equal(r.next.inventory.length,0);
 const existing=applyItemLearning(r.next,[{...g,id:'new-id'}],{quantity:3});assert.equal(existing.next.skills.length,1);assert.equal(existing.next.skills[0].id,'fire');assert.equal(existing.next.skills[0].mastery,100);assert.equal(applyItemLearning(existing.next,[g]).error,'learned');
});
test('upgrade preserves live cooldown and cannot downgrade mastery',()=>{
 const s=applyItemLearning(state(),[grant()]).next;s.skills[0].mastery=40;s.skills[0].ability.cooldown={unit:'turns',value:2,remaining:1,ready:false,startedAt:'day 1',condition:''};
 const r=applyItemLearning(s,[grant({duplicate:{mode:'upgrade'},ability:{...grant().ability,effect:'A larger fireball.',cooldown:{unit:'minutes',value:1,remaining:0,ready:true}}})]);assert.equal(r.ok,true);assert.equal(r.next.skills[0].mastery,40);assert.equal(r.next.skills[0].ability.cooldown.remaining,1);assert.equal(r.next.skills[0].ability.cooldown.ready,false);assert.equal(r.next.skills[0].ability.cooldown.unit,'turns');assert.equal(r.next.skills[0].ability.cooldown.value,2);
});
test('quantity and canonical collection capacity guards reject without mutation',()=>{
 const s=state();assert.equal(use(s,{quantity:2}).error,'learned');s.skills=Array.from({length:100},(_,n)=>({id:'s'+n,name:'Skill '+n}));assert.equal(use(s).error,'capacity');
 s.proficiencies.techniques=Array.from({length:149},(_,n)=>({id:'t'+n,name:'Technique '+n}));assert.equal(applyItemLearning(s,[grant({kind:'technique'})]).ok,true);s.proficiencies.techniques.push({id:'last',name:'Last'});assert.equal(applyItemLearning(s,[grant({kind:'technique'})]).error,'capacity');
});
test('malformed authored learning never silently consumes the item and remains eligible for AI repair',()=>{
 for(const learns of [null,[grant({kind:'invalid'})],[grant({mastery:NaN})],[grant({ability:{}})],[grant({duplicate:{mode:'mastery',amount:0}})],[grant(),grant()]]){
  assert.equal(validItemLearning(learns),false);const s=state();s.inventory=[book(learns)];assert.equal(use(s).ok,false);assert.equal(s.inventory[0].quantity,3);assert.ok(itemMissingFields(s.inventory[0]).includes('learns'));s.inventory[0].usage=mergeItemUsage(s.inventory[0].usage,{learns:[grant()]},s.inventory[0]);assert.equal(use(s).ok,true);
 }
 const s=state();s.inventory=[itemRecord({id:'book',name:'Fire Spellbook',quantity:1,category:'Skill Book'})];const request={id:'repair',items:[{item:structuredClone(s.inventory[0])}]};
 const r=applyItemDetails(s,request,{requestId:'repair',items:[{id:'book',description:'Teaches fire.',usage:{action:'use',consumable:true,effect:'Learn Fire Ball.',target:'self',conditions:['Read'],cooldown:{unit:'none',value:0},stats:[],learns:[grant()]}}]});assert.equal(r.ok,true);assert.equal(r.next.inventory[0].usage.learns.length,1);assert.equal(use(r.next).ok,true);
});
test('learning scrolls never receive invented thirst restoration and normalizing metadata is idempotent',()=>{const d=completeItemDefinition({name:'Fire Scroll',usage:{learns:[grant()]}});assert.deepEqual(d.usage.stats,[]);assert.equal(d.usage.action,'use');assert.deepEqual(completeItemDefinition(d),d);assert.equal(normalizeItemLearning(d.usage.learns).length,1);});
test('typed use teaches once; inline ops for the same granted abilities are suppressed without removing unrelated learning',()=>{
 const s=state(),user='ฉันใช้ Fire Spellbook',story='ใช้ Fire Spellbook แล้ว',event={id:'learn',action:'use',itemId:'book',quantity:1,outcome:'success',reason:'Read',userEvidence:user,evidence:story};
 const r=applyStoryItemEvents(s,[event],{user,story,source:{turnKey:'turn',variant:'v'},turn:1});assert.equal(r.next.skills.length,1);assert.equal(applyStoryItemEvents(r.next,[event],{user,story,source:{turnKey:'turn',variant:'v'},turn:1}).changes,0);
 assert.equal(duplicateItemLearningOperation(['upsert','skills',{id:'fire',mastery:99}],r.events),true);assert.equal(duplicateItemLearningOperation(['set','skills.fire.mastery',99],r.events),true);assert.equal(duplicateItemLearningOperation(['upsert','skills',{id:'ice',name:'Ice'}],r.events),false);
});
test('Loot collection, shop purchase and auction delivery preserve authored abilities without teaching them',()=>{
 const s=state();s.inventory=[];const item=book(),story='Found Fire Spellbook';const loot=ingestLoot(s,[{id:'chest',evidence:story,items:[item]}],{story,source:{turnKey:'t',variant:'v'}});assert.equal(loot.added.length,1);
 const p=prepareItemAction(loot.next,{action:'collect',poolId:loot.added[0].id,revision:loot.added[0].revision,entries:[{id:loot.added[0].entries[0].id,quantity:1}]},{requestId:'pick'});
 const picked=applyItemDecision(loot.next,p.request,{ok:true,decision:{outcome:'success',reason:'Picked',evidence:story,meters:[]}});assert.equal(picked.ok,true);assert.deepEqual(picked.next.skills,[]);assert.deepEqual(picked.next.inventory[0].usage.learns,item.usage.learns);
 const event=normalizeMarketplaceEvent({kind:'npcShop',id:'shop',location:'Hall',denomination:'silver',seller:{name:'Mage'},items:[{...item,price:5,stock:3}]}),session=createCommerceSession(event);
 const bought=applyCommerceDecision(s,prepareCommerceAction(s,session,'confirm'),{narrative:'Delivered',decision:{outcome:'accept',amount:5}});assert.equal(bought.ok,true);assert.deepEqual(bought.next.skills,[]);assert.deepEqual(bought.next.inventory[0].usage.learns,item.usage.learns);
 const auction=createCommerceSession(normalizeAuctionOffer({id:'auction',location:'Hall',denomination:'silver',lots:[{...item,id:'lot',quantity:1,openingBid:5,minIncrement:1,bidders:[]}]}));
 const joined=applyCommerceDecision(s,prepareCommerceAction(s,auction,'join'),{narrative:'Joined',decision:{outcome:'joined'}}),won=applyCommerceDecision(joined.next,prepareCommerceAction(joined.next,joined.session,'bid',{amount:5}),{narrative:'Sold',decision:{outcome:'sold',participants:[]}});assert.equal(won.ok,true);assert.deepEqual(won.next.skills,[]);assert.deepEqual(won.next.inventory[0].usage.learns,item.usage.learns);
});
test('stat configuration preserves the AI-authored teaching formula',()=>{const s=state(),r=configureItemUsage(s,'book',{...s.inventory[0].usage,stats:[]});assert.equal(r.ok,true);assert.deepEqual(r.next.inventory[0].usage.learns,s.inventory[0].usage.learns);});

test('a teaching book missing its learning payload is blocked and repairable rather than consumed for no ability',()=>{const s=state();s.inventory=[book([])];assert.equal(use(s).error,'learning');assert.ok(itemMissingFields(s.inventory[0]).includes('learns'));});
