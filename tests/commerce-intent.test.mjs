import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceRequestHint,commerceDiscussionOnly,confirmedCommerceIntent} from '../src/commerce-intent.js';
import {requestedCommerceKind,requestedChatSystems,mainChatOutputContract,missingChatSystems} from '../src/main-chat-systems.js';
import {confirmedMarketplaceEvent,recoverMarketplaceShop} from '../src/marketplace-events.js';
import {roomUser,roomQuote,roomStory} from './fixtures/disclosed-rooms.mjs';
const settings={autoTrack:true,enableMarketplace:true,enableAuctions:true};
const stock={kind:'npcShop',location:'Shop',seller:{name:'Rally'},denomination:'silver',items:[{name:'Potion',price:2}]};
const stockStory='<tr-dialogue name="Rally">I show goods for sale in my shop. Potion: 2 silver.</tr-dialogue>';

test('mentions, refusal, future plans and historical trade do not route to a new purchase window',()=>{
    for(const user of ['ของนี้ขายยาก','คำว่าซื้อหมายความว่าอะไร','ฉันยังไม่อยากซื้อ','ฉันไม่ได้จะขายดาบ','ฉันพูดถึงเรื่องการซื้อขายเฉยๆ','พรุ่งนี้ฉันจะซื้อยา','If I buy a sword, what happens?','I discuss buying and selling','I am not interested in buying this']){
        assert.equal(requestedCommerceKind(user,settings),'',user);
        assert.deepEqual(requestedChatSystems(user,settings),[],user);
        assert.doesNotMatch(mainChatOutputContract(user,settings),/REQUIRED THIS REPLY: marketplace/);
    }
});
test('real catalog requests, prices, rent and owned-item sales remain requests rather than implicit payments',()=>{
    for(const user of ['ฉันขอซื้อยา','ฉันขอเช่าห้องพัก','ขอดูสินค้าที่ขาย','ต่อรองราคาสินค้า','ห้องพักราคาเท่าไหร่','I buy a house','Show me your goods'])assert.equal(commerceRequestHint(user),'buy',user);
    for(const user of ['ฉันขอขายดาบ','อยากขายของพวกนี้','I sell my sword'])assert.equal(commerceRequestHint(user),'sell',user);
    assert.equal(commerceRequestHint('ฉันไม่ซื้อดาบ แต่ขอซื้อยา'),'buy');
    assert.equal(commerceRequestHint('ฉันพูดถึงของที่ขายยาก แต่ขอซื้อยาในร้านนี้'),'buy');
    assert.equal(commerceDiscussionOnly('ฉันยังไม่อยากซื้อ'),true);
});
test('the same normal reply supplies validated AI intent; none or a conflicting direction suppresses opening',()=>{
    const user='ฉันพูดว่า “ซื้อ” เฉยๆ ยังไม่ได้เลือกอะไร';
    const intent=confirmedCommerceIntent({kind:'none',evidence:'“ซื้อ” เฉยๆ'},user);assert.equal(intent.kind,'none');
    assert.equal(confirmedCommerceIntent({kind:'buy',evidence:'invented user decision'},user),null);
    assert.equal(confirmedCommerceIntent({kind:'pay',evidence:'“ซื้อ”'},user),null);
    assert.equal(confirmedCommerceIntent({kind:'buy',evidence:'ยังไม่อยากซื้อ'},'ฉันยังไม่อยากซื้อ'),null);
    assert.equal(confirmedMarketplaceEvent(stock,stockStory,'ขอดูสินค้า','Shop',[],intent),null);
    assert.equal(confirmedMarketplaceEvent(stock,stockStory,'ขอดูสินค้า','Shop',[],{kind:'sell'}),null);
    assert.ok(confirmedMarketplaceEvent(stock,stockStory,'ขอดูสินค้า','Shop',[],{kind:'buy'}));
    assert.ok(confirmedMarketplaceEvent(stock,stockStory,'ฉันพูดถึงเรื่องซื้อ แล้วตัดสินใจขอดูสินค้าในร้านนี้','Shop',[],{kind:'buy',evidence:'ขอดูสินค้าในร้านนี้'}),'a validated current AI intent is authoritative over a lexical discussion hint');
    assert.deepEqual(missingChatSystems('ขอดูสินค้า',stockStory,settings,{commerceIntent:intent}),[]);
    const prompt=mainChatOutputContract('ขอดูสินค้า',settings);assert.match(prompt,/Read the WHOLE latest player role-play/);assert.match(prompt,/Never make a separate API call to classify intent/);
});
test('a complete public Thai room menu compiles locally with its quoted prices, keys and exact checkout',()=>{
    const event=recoverMarketplaceShop(roomStory,roomUser,'Oakland Inn',[],{clock:{day:4,time:'18:30'}});
    assert.ok(event);assert.equal(event.seller.name,'Garrick');assert.deepEqual(event.items.map(x=>x.askPrice),[5,10]);
    for(const entry of event.items){assert.equal(entry.terms.mode,'access');assert.deepEqual(entry.terms.validUntil,{day:5,time:'12:00'});assert.equal(entry.terms.durationMinutes,0);assert.equal(entry.terms.delivery.name,`กุญแจ${entry.item.name}`);assert.equal(entry.terms.delivery.category,'Key');assert.equal(entry.stockKnown,false);assert.equal(entry.negotiableKnown,false);assert.ok(entry.item.description);assert.equal(entry.termsRequired,false);}
    assert.ok(event.items[0].item.description.includes('ซุปร้อน'));assert.ok(event.items[1].item.description.includes('ระเบียง'));
});
test('room compilation never invents an omitted key, deadline, clock, deposit, seller or price',()=>{
    for(const story of [roomStory.replace(/<tr-narrative>[\s\S]*?<\/tr-narrative>/u,''),roomStory.replace('กฎมีแค่','มัดจำสามเหรียญเงิน กฎมีแค่'),roomStory.replace('ถ้าเป็นห้อง','สมมุติถ้าเป็นห้อง'),roomStory.replace('คืนละห้าเหรียญเงิน','ไม่ว่าง'),roomStory.replace('คืนละสิบเหรียญเงิน','คืนละสิบเหรียญทอง')])assert.equal(recoverMarketplaceShop(story,roomUser,'Oakland Inn',[],{clock:{day:1,time:'18:30'}}),null);
    const oneNight=recoverMarketplaceShop(roomStory.replace('คืนกุญแจก่อนเที่ยงวันพรุ่งนี้','คืนกุญแจภายหลัง'),roomUser,'Oakland Inn',[],{clock:{day:1,time:'18:30'}});
    assert.ok(oneNight);assert.ok(oneNight.items.every(entry=>entry.terms.mode==='rental'&&entry.terms.validUntil===null&&entry.terms.durationMinutes===0),'a stated one-night rental does not invent an exact checkout');
    assert.equal(recoverMarketplaceShop(roomStory,'ยังไม่อยากซื้อห้อง แค่พูดถึง','Oakland Inn',[],{clock:{day:1,time:'18:30'}}),null);
    assert.equal(recoverMarketplaceShop(roomStory,roomUser,'Oakland Inn'),null);
});
test('AI typed room data accepts a derived scoped key label without requiring its full UI name spoken',()=>{
    const raw={...stock,location:'Oakland Inn',seller:{name:'Garrick'},evidence:roomQuote,items:[{name:'ห้องพักเดี่ยวธรรมดาชั้นสอง',price:5,category:'Access',terms:{mode:'access',scope:'ห้องพักเดี่ยวธรรมดาชั้นสอง · Oakland Inn',validUntil:{day:2,time:'12:00'},delivery:{name:'กุญแจห้องพักเดี่ยวธรรมดาชั้นสอง',category:'Key'}}}]};
    assert.ok(confirmedMarketplaceEvent(raw,roomStory,roomUser,'Oakland Inn'));
    assert.equal(confirmedMarketplaceEvent({...raw,items:[{...raw.items[0],terms:{...raw.items[0].terms,delivery:{name:'กุญแจปราสาทที่ไม่เกี่ยวข้อง',category:'Key'}}}]},roomStory,roomUser,'Oakland Inn'),null);
});
test('price-only room objects use already disclosed terms only when all exact names/prices agree',()=>{
    const legacy={kind:'npcShop',location:'Oakland Inn',seller:{name:'Garrick'},evidence:roomQuote,denomination:'silver',items:[{name:'ห้องพักเดี่ยวธรรมดาชั้นสอง',price:5},{name:'ห้องพักพิเศษชั้นสอง',price:10}]};
    const options={clock:{day:7,time:'18:30'}};
    const event=confirmedMarketplaceEvent(legacy,roomStory,roomUser,'Oakland Inn',[],{kind:'buy'},options);assert.ok(event);
    assert.deepEqual(event.items.map(x=>x.terms.mode),['access','access']);assert.ok(event.items.every(x=>!x.termsRequired));assert.deepEqual(event.items[0].terms.validUntil,{day:8,time:'12:00'});
    assert.equal(event.items[0].terms.includes[0],'ซุปร้อนมื้อเช้ากับน้ำอุ่น');assert.match(event.items[0].terms.conditions,/อย่าก่อเรื่องวิวาท/);
    const wrong=confirmedMarketplaceEvent({...legacy,items:[{...legacy.items[0],price:7},legacy.items[1]]},roomStory,roomUser,'Oakland Inn',[],{kind:'buy'},options);
    assert.equal(wrong,null);
    const unstated=confirmedMarketplaceEvent(legacy,roomStory.replace('คืนกุญแจก่อนเที่ยงวันพรุ่งนี้','คืนกุญแจภายหลัง'),roomUser,'Oakland Inn',[],{kind:'buy'},options);
    assert.ok(!unstated||unstated.items.every(x=>x.termsRequired),'no invented checkout');
});
