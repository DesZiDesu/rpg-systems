import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMarketplaceReply} from '../src/marketplace-events.js';
import {publicInclusions} from '../src/commerce-dialogue-facts.js';
import {currentRoomUser,currentRoomStory,currentRoomQuote} from './fixtures/current-room-offer.mjs';
const resolve=(story=currentRoomStory,extra={})=>resolveMarketplaceReply({story,user:currentRoomUser,location:'Oakland Inn',options:{clock:{day:1,time:'10:16'}},...extra});
test('exact latest player and public NPC reply yield a one-night five-silver key without patch, checkout guess or another API',()=>{
    const {event,status,source}=resolve();assert.equal(status,'ready');assert.equal(source,'public-dialogue');assert.ok(event);
    const entry=event.items[0];assert.equal(event.items.length,1);assert.equal(entry.item.name,'ห้องพักธรรมดา');assert.equal(entry.askPrice,5);
    assert.equal(entry.terms.delivery.name,'กุญแจห้องพักธรรมดา');assert.equal(entry.terms.validUntil,null);assert.equal(entry.terms.mode,'rental');
    assert.deepEqual(entry.terms.includes,['น้ำร้อนสำหรับอาบตอนเช้า']);assert.match(entry.terms.conditions,/ไม่รวมอาหารเช้า/);assert.match(entry.item.description,/เลี้ยวขวา/);
});
test('price connectors and currency digits do not depend on one sentence template',()=>{
    for(const price of ['ราคาห้าเหรียญเงิน','คืนละห้าเหรียญเงิน','คิดราคา 5 เงิน','ราคา ๕ เหรียญเงิน','ราคา ５ เงิน']){
        const result=resolve(currentRoomStory.replace(currentRoomQuote,currentRoomQuote.replace('ราคาห้าเหรียญเงิน',price)));
        assert.equal(result.status,'ready',price);assert.equal(result.event.items[0].askPrice,5);
    }
    const bathroom=resolve(currentRoomStory.replace('ห้องพักธรรมดาสำหรับหนึ่งคืน','ห้องพักธรรมดา มีห้องน้ำส่วนตัว สำหรับหนึ่งคืน'));
    assert.equal(bathroom.event.items[0].item.name,'ห้องพักธรรมดา');assert.match(bathroom.event.items[0].item.description,/ห้องน้ำส่วนตัว/);
    for(const quote of ['ข้าขายดาบเหล็ก ราคา 12 เหรียญเงิน','ดาบเหล็ก ราคา 12 เงิน','ข้ามีเชือก ราคา 6 เหรียญเงิน']){
        const name=quote.includes('เชือก')?'เชือก':'ดาบเหล็ก',r=resolve(`<tr-dialogue name="Garrick">${quote}</tr-dialogue>`,{user:`ฉันขอซื้อ${name}`});
        assert.equal(r.status,'ready',quote);assert.equal(r.event.items[0].item.name,name);
    }
});
test('intent, contradictory structured data and a different speaker never turn into an accepted sale',()=>{
    assert.equal(resolve(currentRoomStory,{intent:{kind:'none'}}).status,'no-intent');
    assert.equal(resolve(currentRoomStory,{user:'ฉันแค่พูดถึงซื้อห้องพัก ไม่ได้จะซื้อ'}).event,null);
    const wrong={kind:'npcShop',seller:{name:'Garrick'},evidence:currentRoomQuote,denomination:'silver',items:[{name:'ห้องพักธรรมดา',price:50}]};
    assert.equal(resolve(currentRoomStory,{marketplace:wrong}).status,'invalid-data');
    const other=resolve(currentRoomStory.replace('<tr-dialogue name="Garrick">"ราคานี้','<tr-dialogue name="Other">"ราคานี้')).event;
    assert.deepEqual(other.items[0].terms.includes,[]);assert.doesNotMatch(other.items[0].terms.conditions,/ไม่รวมอาหารเช้า/);
    assert.equal(resolve(currentRoomStory.replace('ราคาห้าเหรียญเงิน','ไม่มีห้องว่าง ราคาห้าเหรียญเงิน')).event,null);
    assert.deepEqual(publicInclusions('ราคานี้รวมน้ำร้อนแล้ว แต่ไม่รวมอาหารเช้า'),['น้ำร้อน']);assert.deepEqual(publicInclusions('ไม่ได้รวมอาหารเช้า'),[]);
});
