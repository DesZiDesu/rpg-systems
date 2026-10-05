import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMarketplaceReply} from '../src/marketplace-events.js';
import {createCommerceSession} from '../src/commerce-engine.js';
import {validateCommerceRepair} from '../src/commerce-repair.js';
import {selectionFromShopRequest,validateShopSelection} from '../src/commerce-stock-selection.js';
import {user,story,names,offer} from './fixtures/barth-thai-offer.mjs';
const location='Oakland Bookstore';
const resolve=marketplace=>resolveMarketplaceReply({marketplace,story,user,location});
test('the reported Barth dialogue accepts all three current Thai titles at 13+18+9, without using planning or old prices',()=>{
 const result=resolve(offer().marketplace);assert.equal(result.status,'ready');
 const session=createCommerceSession(result.event,{});assert.deepEqual(session.items.map(e=>e.item.name),names);assert.deepEqual(session.basket.map(e=>e.quantity),[1,1,1]);assert.equal(session.quote,40);assert.equal(session.agreed,false);
 const reference={kind:'buy',story,facts:story,user,location,inventory:[],eventId:'repair'};
 assert.equal(validateCommerceRepair(offer(),reference,{}).session.quote,40);
});
test('invalid inline data identifies the exact product and price evidence instead of hiding the cause',()=>{
 const raw=offer().marketplace;raw.items[0].price=15;const r=resolve(raw);assert.equal(r.status,'invalid-data');assert.equal(r.event,null);
 assert.ok(r.details.reasons.some(reason=>reason.code==='item-price-evidence'&&reason.item===names[0]&&reason.amount===15));
 raw.items[0].name='Wind Arrow';assert.ok(resolve(raw).details.reasons.some(reason=>reason.code==='item-not-public'&&reason.item==='Wind Arrow'));
});
test('wrong scene and incomplete data receive diagnostic reasons and remain rejected',()=>{
 const raw=offer().marketplace;raw.location='Other shop';assert.ok(resolve(raw).details.reasons.some(reason=>reason.code==='location'));
 assert.deepEqual(resolve({kind:'npcShop'}).details.reasons,[{code:'offer-format'}]);
});
test('all three cannot select three of every book, a subset, four products or a different request',()=>{
 const event=resolve(offer().marketplace).event,entries=event.items;
 assert.equal(validateShopSelection({evidence:user,items:entries.map(e=>({itemId:e.id,quantity:3}))},entries,user),null);
 assert.equal(selectionFromShopRequest(entries,'ซื้อทั้งสี่เล่ม'),null);
 assert.equal(selectionFromShopRequest(entries,'ซื้อคัมภีร์ศรวายุทั้งหมด'),null);
 assert.equal(selectionFromShopRequest(entries,'ยังไม่ซื้อทั้งสามเล่ม'),null);
});
