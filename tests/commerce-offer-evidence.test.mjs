import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommerceSession,applyCommerceRoleplay,prepareCommerceAction,applyCommerceDecision,commerceRoleplayPrompt} from '../src/commerce-engine.js';
import {resolveMarketplaceReply} from '../src/marketplace-events.js';
import {walletValue} from '../src/commerce-currency.js';
import {mixedRoomUser,mixedRoomStory} from './fixtures/mixed-room-offer.mjs';
import {discountUser,discountCommerce,discountStory} from './fixtures/accepted-room-discount.mjs';
const state=()=>({player:{name:'Noah'},location:{place:'Oakland Inn'},worldClock:{day:1,time:'10:20'},progression:{currency:{gold:1,silver:10,copper:50}},inventory:[],commerce:{}});
function room(){
 const session=createCommerceSession(resolveMarketplaceReply({story:mixedRoomStory,user:mixedRoomUser,location:'Oakland Inn',options:{clock:{day:1,time:'10:20'}}}).event,{messageId:1,turnKey:'1',variant:'opening'});
 session.selectedId=session.items[1].id;session.quote=200;session.revision=1;return session;
}
function offer(s,session,{user=discountUser,decision={outcome:'accept',amount:190},...extra}={}){
 return applyCommerceRoleplay(s,session,{...discountCommerce,sessionId:session.id,revision:session.revision,evidence:user,decision,...extra},{user,userMessageId:4,narrative:discountStory,source:{messageId:5,turnKey:'5',variant:'discount'}});
}
test('reported acceptance without commerce.amount updates the room quote to 190 and settles only on confirmation',()=>{
 const before=state(),session=room(),result=offer(before,session);assert.equal(result.ok,true);assert.equal(result.session.quote,190);assert.equal(result.session.agreed,true);assert.equal(result.session.status,'open');assert.equal(result.session.revision,2);
 assert.equal(result.session.history.at(-1).amount,190);assert.deepEqual(result.next.inventory,before.inventory);assert.deepEqual(result.next.progression.currency,before.progression.currency);assert.equal(result.next.commerce.receipts.length,0);
 const prepared=prepareCommerceAction(result.next,result.session,'confirm');assert.equal(prepared.amount,190);
 const confirmed=applyCommerceDecision(result.next,prepared,{narrative:'<tr-narrative>การ์ริกรับเงิน 190 ทองแดงและส่งกุญแจห้องพักเดี่ยวชั้นบน</tr-narrative>',decision:{outcome:'accept',amount:190}});
 assert.equal(confirmed.ok,true);assert.equal(walletValue(confirmed.next.progression.currency),walletValue(before.progression.currency)-190);assert.equal(confirmed.next.commerce.receipts[0].amount,190);assert.equal(confirmed.next.commerce.rights[0].paid,190);assert.equal(confirmed.next.inventory[0].name,'กุญแจห้องพักเดี่ยวชั้นบน');
 assert.equal(prepareCommerceAction(confirmed.next,confirmed.session,'confirm').ok,false);assert.equal(offer(result.next,result.session,{revision:1}).error,'stale');
 assert.match(commerceRoleplayPrompt(session),/Emit both separately/);
});
test('missing player amount is read from player evidence, independently of NPC counter or rejection',()=>{
 const before=state(),session=room(),counter=offer(before,session,{decision:{outcome:'counter',amount:195}});assert.equal(counter.ok,true);assert.equal(counter.session.history.at(-1).amount,190);assert.equal(counter.session.quote,195);assert.equal(counter.session.agreed,false);assert.deepEqual(counter.next.progression.currency,before.progression.currency);
 assert.equal(offer(before,session,{decision:{outcome:'accept',amount:195}}).error,'consent');
 const rejected=offer(before,session,{decision:{outcome:'reject'}});assert.equal(rejected.ok,true);assert.equal(rejected.session.status,'rejected');assert.deepEqual(rejected.next.inventory,[]);assert.deepEqual(rejected.next.progression.currency,before.progression.currency);
});
test('inference converts explicitly stated currencies and accepts one equivalent price, not ambiguous prices',()=>{
 const before=state(),session=room();
 for(const user of ['ขอเสนอ 1 เหรียญเงิน','ขอเสนอหนึ่งเหรียญเงิน','ขอเสนอ 100 เหรียญทองแดง หรือหนึ่งเหรียญเงินเท่ากัน']){
  const result=offer(before,session,{user,decision:{outcome:'accept',amount:100}});assert.equal(result.ok,true,user);assert.equal(result.session.quote,100);
 }
 assert.equal(offer(before,session,{user:'ขอเสนอ 190 เหรียญทองแดงหรือ 195 เหรียญทองแดง'}).error,'amount');
 assert.equal(offer(before,session,{user:'ขอลดเหลือ 190 สำหรับ 2 คืน'}).error,'amount');
 const silver=structuredClone(session);silver.denomination='silver';
 assert.equal(offer(before,silver,{user:'ขอเสนอ 190 เหรียญทองแดงหรือ 2 เหรียญเงิน',decision:{outcome:'accept',amount:2}}).error,'amount','an unrepresentable alternative must not disappear into one apparent price');
});
test('NPC price alone, conflicting explicit amounts, refusal, hypothetical and foreign evidence never authorize a discount',()=>{
 const before=state(),session=room();
 for(const [extra,error] of [
  [{user:'ช่วยลดราคาหน่อยครับ'},'amount'],
  [{amount:195},'amount'],
  [{amount:'invalid'},'amount'],
  [{user:'ฉันไม่ขอเสนอ 190 เหรียญทองแดง'},'intent'],
  [{user:'สมมุติขอเสนอ 190 เหรียญทองแดง'},'intent'],
  [{evidence:'ขอเสนอ 180 เหรียญทองแดง'},'evidence']
 ]){const result=offer(before,session,extra);assert.equal(result.error,error,JSON.stringify(extra));assert.deepEqual(result.next,before);}
});
test('the same missing-amount recovery negotiates an owned-item sale without transferring it',()=>{
 const before=state();before.inventory=[{id:'blade',name:'ดาบเหล็ก',quantity:1}];
 const session=createCommerceSession({id:'sale',location:'Oakland Inn',kind:'npcPurchase',denomination:'copper',buyer:{name:'Garrick',budget:250},item:before.inventory[0],askPrice:180},{messageId:1,turnKey:'1',variant:'sale'});
 const result=offer(before,session,{user:'ขอขายดาบเหล็ก 190 เหรียญทองแดง'});assert.equal(result.ok,true);assert.equal(result.session.quote,190);assert.deepEqual(result.next.inventory,before.inventory);assert.deepEqual(result.next.progression.currency,before.progression.currency);
});
test('an auction bid omitted by the model still uses its explicit player price and preserves entry and rival rules',()=>{
 const before=state(),session=createCommerceSession({id:'auction',location:'Oakland Inn',denomination:'copper',entryFee:0,deposit:0,lots:[{id:'sword',name:'ดาบ',openingBid:100,minIncrement:10,bidders:[]}]},{messageId:1,turnKey:'1',variant:'auction'});
 const result=applyCommerceRoleplay(before,session,{sessionId:session.id,revision:0,evidence:'ฉันบิด 190 เหรียญทองแดง',action:'bid',decision:{outcome:'open',participants:[]}},{user:'ฉันบิด 190 เหรียญทองแดง',userMessageId:2,narrative:'<tr-narrative>ผู้จัดรับการเสนอราคา</tr-narrative>',source:{messageId:3,turnKey:'3',variant:'bid'}});
 assert.equal(result.ok,true);assert.equal(result.session.lots[0].price,190);assert.equal(result.session.lots[0].leader,'player');assert.equal(walletValue(result.next.progression.currency),walletValue(before.progression.currency));assert.deepEqual(result.next.inventory,[]);
});
