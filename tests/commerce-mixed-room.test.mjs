import test from 'node:test';
import assert from 'node:assert/strict';
import {mixedRoomUser,mixedRoomStory,mixedRoomThoughts} from './fixtures/mixed-room-offer.mjs';
import {resolveMarketplaceReply} from '../src/marketplace-events.js';
import {createCommerceSession,normalizeCommerce,commerceBasketQuote,prepareCommerceAction,applyCommerceDecision} from '../src/commerce-engine.js';
import {walletValue} from '../src/commerce-currency.js';
const resolve=(story=mixedRoomStory)=>resolveMarketplaceReply({story,user:mixedRoomUser,location:'Oakland Inn',options:{clock:{day:1,time:'10:20'}}});
const source={messageId:1,turnKey:'1',variant:'v'};
const state=()=>({player:{name:'Noah'},location:{place:'Oakland Inn'},worldClock:{day:1,time:'10:20'},progression:{currency:{gold:0,silver:10,copper:30}},inventory:[],commerce:{}});
test('exact reported room menu opens both mixed-unit options without a patch or a displayed key',()=>{
 const {event,status}=resolve();assert.equal(status,'ready');assert.equal(event.items.length,2);
 assert.deepEqual(event.items.map(e=>[e.item.name,e.askPrice,e.denomination]),[['ห้องพักรวมเตียงเดี่ยว',5,'copper'],['ห้องพักเดี่ยวชั้นบน',2,'silver']]);
 assert.doesNotMatch(event.items[0].item.description,/หน้าต่าง|อาหารเช้า|ห้องพักเดี่ยวชั้นบน/);assert.match(event.items[0].item.description,/ล็อกเกอร์/);
 assert.deepEqual(event.items[0].terms.includes,[]);assert.deepEqual(event.items[1].terms.includes,['อาหารเช้าเป็นซุปเนื้อแกะกับขนมปังแข็งๆ หนึ่งมื้อ']);
 assert.ok(event.items.every(e=>e.terms.validUntil===null&&e.terms.mode==='rental'&&!e.termsRequired));
 assert.equal(resolve(mixedRoomThoughts).event,null,'planning alone is not a sale');
 assert.equal(resolve('{CoT}'+mixedRoomStory+'\n> end {CoT}').event,null,'dialogue markup inside planning is not public evidence');
 const longMenu=resolve(mixedRoomStory.replace('นอนรวมกับคนอื่น',('รายละเอียดห้องพักรวม '.repeat(35))+'นอนรวมกับคนอื่น'));assert.equal(longMenu.event.items.length,2,'a long public menu keeps scoped price evidence');
});
test('canonical mixed prices preserve displayed units, basket value and per-option confirmation',()=>{
 const session=createCommerceSession(resolve().event,source),before=state();assert.equal(session.denomination,'copper');
 assert.deepEqual(session.items.map(e=>[e.askPrice,e.quotedPrice,e.quotedDenomination]),[[5,5,'copper'],[200,2,'silver']]);
 assert.equal(commerceBasketQuote(session,session.items.map(e=>({itemId:e.id,quantity:1}))),205);
 for(const [index,amount,key]of [[0,5,'กุญแจห้องพักรวมเตียงเดี่ยว'],[1,200,'กุญแจห้องพักเดี่ยวชั้นบน']]){
  const selected=session.items[index],prepared=prepareCommerceAction(before,session,'confirm',{items:[{itemId:selected.id,quantity:1}],itemId:selected.id});assert.equal(prepared.ok,true);assert.equal(prepared.session.quote,amount);
  const result=applyCommerceDecision(before,prepared,{narrative:'<tr-narrative>การ์ริกรับเงินแล้วส่งกุญแจห้องที่เลือก</tr-narrative>',decision:{outcome:'accept',amount}});assert.equal(result.ok,true);
  assert.equal(walletValue(result.next.progression.currency),walletValue(before.progression.currency)-amount);assert.deepEqual(before.inventory,[]);
  assert.equal(result.next.inventory.length,1);assert.equal(result.next.inventory[0].name,key);assert.equal(result.next.commerce.rights[0].ends,null);
  assert.equal(prepareCommerceAction(result.next,result.session,'confirm').ok,false,'settled offers cannot be charged twice');
 }
});
test('general goods and owned-item sales use the same mixed-unit accounting including buyer budget',()=>{
 const input={user:'ฉันขอซื้อเชือกและดาบ',location:'Shop',story:'<tr-dialogue name="Mira">เชือก ราคา 5 เหรียญทองแดง ดาบ ราคา 2 เหรียญเงิน</tr-dialogue>'};
 const buy=resolveMarketplaceReply(input);assert.equal(buy.status,'ready');assert.equal(createCommerceSession(buy.event,source).items[1].askPrice,200);
 const inventory=[{id:'rope',name:'เชือก',quantity:1},{id:'sword',name:'ดาบ',quantity:1}];
 const sale=resolveMarketplaceReply({...input,user:'ฉันขอขายเชือกและดาบ',inventory,story:'<tr-dialogue name="Mira">ข้ารับซื้อเชือก 5 เหรียญทองแดง และรับซื้อดาบ 2 เหรียญเงิน</tr-dialogue>'});assert.equal(sale.status,'ready');
 sale.event.denomination='silver';sale.event.buyer.budget=3;const session=createCommerceSession(sale.event,source);assert.equal(session.quote,205);assert.equal(session.npcBudget,300);
 const oversized=structuredClone(sale.event);oversized.buyer.budget=999999999;assert.equal(createCommerceSession(oversized,source),null,'an unrepresentable known budget cannot become unknown');
 const fresh=state();fresh.location.place='Shop';fresh.inventory=inventory;const result=applyCommerceDecision(fresh,prepareCommerceAction(fresh,session,'confirm'),{narrative:'Mira รับของและจ่ายเงิน',decision:{outcome:'accept',amount:205}});assert.equal(result.ok,true);assert.equal(walletValue(result.next.progression.currency),walletValue(fresh.progression.currency)+205);assert.equal(result.next.inventory.length,0);
});

test('old open mixed-unit sessions correct listed totals and preserve real negotiated value without rewriting completed payments',()=>{
 const session=createCommerceSession(resolve().event,source),legacy=structuredClone(session);
 legacy.denomination='copper';legacy.quote=2;legacy.selectedId=legacy.items[1].id;legacy.items.forEach(e=>{e.askPrice=e.quotedPrice;e.floorPrice=e.quotedPrice;e.denomination=e.quotedDenomination;delete e.quotedPrice;delete e.quotedDenomination;});
 const current=normalizeCommerce({sessions:[legacy]}).sessions[0];assert.equal(current.quote,200);assert.equal(current.agreed,false);assert.equal(current.priceUnitsUpdated,true);assert.equal(current.revision,legacy.revision+1);
 assert.equal(normalizeCommerce({sessions:[current]}).sessions[0].revision,current.revision,'migration does not repeat on rendering');
 legacy.history=[{action:'offer',decision:{outcome:'accept'}}];legacy.quote=250;legacy.agreed=true;
 const agreed=normalizeCommerce({sessions:[legacy]}).sessions[0];assert.equal(agreed.quote,250);assert.equal(agreed.agreed,false);
 legacy.status='completed';assert.deepEqual(normalizeCommerce({sessions:[legacy]}).sessions[0].items,legacy.items,'past settlements remain historical');
});
