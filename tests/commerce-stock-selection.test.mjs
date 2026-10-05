import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMarketplaceReply,normalizeMarketplaceEvent,MARKETPLACE_EVENT_INSTRUCTIONS} from '../src/marketplace-events.js';
import {createCommerceSession,prepareCommerceAction,applyCommerceDecision,commercePublicSummary} from '../src/commerce-engine.js';
import {disclosedShopStock,commerceQuantityFacts,validateShopSelection} from '../src/commerce-stock-selection.js';
const names=['น้ำยาฟื้นฟูแผลระดับพื้นฐาน','น้ำยาถอนพิษทั่วไป'];
const story=`<tr-dialogue name="Teresina">${names[0]} ขวดละ 30 เหรียญทองแดง มีอยู่ 12 ขวด</tr-dialogue><tr-dialogue name="Teresina">${names[1]} ขวดละ 50 เหรียญทองแดง คงเหลือ 8 ขวด</tr-dialogue>`;
const request=`ขอซื้อ${names[0]}กับ${names[1]}อย่างละ 3 ขวดครับ`;
const catalog=()=>({id:'pharmacy',kind:'npcShop',location:'Oakland Pharmacy',seller:{name:'Teresina'},denomination:'copper',evidence:`${names[0]} ขวดละ 30 เหรียญทองแดง มีอยู่ 12 ขวด`,items:names.map((name,i)=>({id:i?'antidote':'healing',name,price:i?50:30,stock:i?8:12,stockKnown:true,evidence:i?`${name} ขวดละ 50 เหรียญทองแดง คงเหลือ 8 ขวด`:undefined,terms:{mode:'permanent'}}))});
const resolve=(marketplace,user=request)=>resolveMarketplaceReply({marketplace,story,user,location:'Oakland Pharmacy'});
const state=()=>({player:{name:'Noah'},location:{place:'Oakland Pharmacy'},inventory:[],progression:{currency:{gold:0,silver:10,copper:0}}});

test('AI catalog opens the exact requested 3+3 basket, independent of 12/8 stock and one-bottle prices',()=>{
    const raw=catalog();raw.selection={evidence:'ขอซื้อยาฟื้นฟูกับยาแก้พิษอย่างละ 3 ขวดครับ',items:[{itemId:'healing',quantity:3},{itemId:'antidote',quantity:3}]};
    const event=resolve(raw,raw.selection.evidence).event;assert.ok(event);const session=createCommerceSession(event);
    assert.deepEqual(session.basket,[{itemId:'healing',quantity:3},{itemId:'antidote',quantity:3}]);assert.equal(session.quote,240);
    assert.deepEqual(session.items.map(entry=>entry.stock),[12,8]);assert.deepEqual(session.items.map(entry=>entry.item.quantity),[1,1]);
    const s=state(),paid=applyCommerceDecision(s,prepareCommerceAction(s,session,'confirm'),{narrative:'<tr-narrative>เทเรซินารับเงินและส่งยาหกขวด</tr-narrative>',decision:{outcome:'accept',amount:240}});
    assert.equal(paid.ok,true,paid.error);assert.deepEqual(paid.session.items.map(entry=>entry.stock),[9,5]);assert.deepEqual(paid.next.inventory.map(item=>item.quantity),[3,3]);
    assert.deepEqual(commercePublicSummary(paid.next)[0].catalog.map(entry=>entry.stock),[9,5]);
});
test('omitted selection derives exact named quantities from player request, including Thai numbers',()=>{
    for(const user of [request,request.replace('3','สาม')]){const event=resolve(catalog(),user).event;assert.equal(createCommerceSession(event).quote,240);assert.deepEqual(event.selection.items.map(line=>line.quantity),[3,3]);}
    const user=`ขอซื้อ${names[0]} 2 ขวด และ${names[1]} 4 ขวด`;assert.deepEqual(resolve(catalog(),user).event.selection.items.map(line=>line.quantity),[2,4]);
    assert.equal(resolve(catalog(),`ขอซื้อ 3 ขวด ${names[0]} กับ 5 ขวด ${names[1]}`).event.selection,undefined,'ambiguous positional quantities are not silently assigned to the previous product');
});
test('AI cannot increase requested quantities or use NPC words, prices, duplicate lines or another user request as evidence',()=>{
    const entries=normalizeMarketplaceEvent(catalog()).items;
    for(const selection of [
        {evidence:request,items:[{itemId:'healing',quantity:12}]},
        {evidence:'Teresina มี 12 ขวด',items:[{itemId:'healing',quantity:12}]},
        {evidence:request,items:[{itemId:'unknown',quantity:3}]},
        {evidence:request,items:[{itemId:'healing',quantity:3},{itemId:'healing',quantity:3}]},
        {evidence:'ขอซื้อยา 240 เหรียญทองแดง',items:[{itemId:'healing',quantity:240}]},
    ])assert.equal(validateShopSelection(selection,entries,request),null);
    const raw=catalog();raw.selection={evidence:request,items:[{itemId:'healing',quantity:12}]};const result=resolve(raw);assert.ok(result.event);assert.deepEqual(result.event.selection.items.map(line=>line.quantity),[3,3],'invalid AI counts fall back to the actual exact named request without suppressing the shop');
});
test('stock shortages preserve the requested quantities and total, then block confirmation without partial settlement',()=>{
    const raw=catalog();raw.items[1].stock=2;const session=createCommerceSession(resolve(raw).event),s=state();assert.equal(session.basket[1].quantity,3);assert.equal(session.quote,240);assert.equal(prepareCommerceAction(s,session,'confirm').error,'inventory');assert.deepEqual(s.inventory,[]);
});
test('public dialogue fallback reads each disclosed stock and fills a named 3+3 basket without another API',()=>{
    const result=resolve(undefined);assert.ok(result.event,result.status);const session=createCommerceSession(result.event);assert.deepEqual(session.items.map(entry=>entry.stock),[12,8]);assert.equal(session.quote,240);assert.deepEqual(session.basket.map(line=>line.quantity),[3,3]);
});
test('explicit counts distinguish stock from unit prices, order counts and story time',()=>{
    assert.equal(disclosedShopStock('คงเหลือ 0 ขวด'),0);assert.equal(disclosedShopStock('มีอยู่สิบสองขวด'),12);assert.equal(disclosedShopStock('ราคา 30 ทองแดง ขอซื้อ 3 ขวด ตอน 12:00'),null);
    assert.equal(disclosedShopStock('มี 12 ขวด เหลือ 8 ขวด'),null);assert.deepEqual(commerceQuantityFacts('ขอ ๓ ขวด ราคา 30 ทองแดง').map(f=>f.quantity),[3]);
});
test('browsing does not select the full AI stock or fabricate a three-item request',()=>{
    const event=resolve(catalog(),'ขอดูรายการยาในร้านครับ').event;assert.ok(event);assert.equal(event.selection,undefined);const session=createCommerceSession(event);assert.equal(session.basket,undefined);assert.equal(session.quote,30);assert.deepEqual(session.items.map(entry=>entry.stock),[12,8]);
    assert.match(MARKETPLACE_EVENT_INSTRUCTIONS,/establish realistic actual remaining stock/);
});
