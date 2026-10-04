import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverMarketplaceShop} from '../src/marketplace-events.js';
import {splitRoomUser,splitRoomStory} from './fixtures/split-room-offer.mjs';
import {confirmedMarketplaceEvent} from '../src/marketplace-events.js';
import {disclosedRoomCatalog} from '../src/commerce-room-catalog.js';

test('reported two-dialogue inn reply opens both rooms from the same reply without a patch or invented checkout',()=>{
    const event=recoverMarketplaceShop(splitRoomStory,splitRoomUser,'Oakland Inn',[],{clock:{day:1,time:'10:25'}});
    assert.ok(event,'a current one-night room menu must not disappear because the two prices are in separate dialogue blocks');
    assert.deepEqual(event.items.map(entry=>entry.askPrice),[5,10]);
    assert.deepEqual(event.items.map(entry=>entry.item.name),['ห้องพักธรรมดา','ห้องพักขนาดใหญ่']);
    for(const entry of event.items){assert.equal(entry.terms.mode,'rental');assert.equal(entry.terms.validUntil,null);assert.equal(entry.terms.durationMinutes,0);assert.match(entry.terms.conditions,/1 คืน/);assert.equal(entry.terms.delivery.name,`กุญแจ${entry.item.name}`);assert.equal(entry.termsRequired,false);}
    assert.match(event.items[0].item.description,/เตียงเดี่ยว/);assert.match(event.items[1].item.description,/อ่างน้ำร้อน/);
    assert.ok(event.items.every(entry=>entry.terms.includes.some(detail=>detail.includes('อาหารเช้า'))));
});

test('the AI can supply per-option exact evidence for a split room catalog without merging noncontiguous quotes',()=>{
    const options={clock:{day:1,time:'10:25'}},raw=disclosedRoomCatalog(splitRoomStory,splitRoomUser,'Oakland Inn',options);
    assert.ok(confirmedMarketplaceEvent(raw,splitRoomStory,splitRoomUser,'Oakland Inn',[],{kind:'buy'},options));
    const forged=structuredClone(raw);forged.items[1].evidence='This quote never appeared';assert.equal(confirmedMarketplaceEvent(forged,splitRoomStory,splitRoomUser,'Oakland Inn',[],{kind:'buy'},options),null);
    assert.equal(recoverMarketplaceShop(splitRoomStory.replace('จ่ายเงินมาแล้ว','คืนกุญแจก่อนเที่ยงวันพรุ่งนี้ จ่ายเงินมาแล้ว'),splitRoomUser.replaceAll('1 คืน','2 คืน'),'Oakland Inn',[],options),null);
});

test('one-night terms do not guess an hour, charge two nights as one, ignore surcharges or take another speaker prices',()=>{
    for(const [story,user]of [[splitRoomStory,splitRoomUser.replaceAll('1 คืน','2 คืน')],[splitRoomStory,splitRoomUser.replaceAll('1 คืน','')],[splitRoomStory.replace('ราคานี้รวม','มัดจำสองเหรียญเงิน ราคานี้รวม'),splitRoomUser],[splitRoomStory.replace('<tr-dialogue name="Garrick">แต่ถ้า','<tr-dialogue name="Other">แต่ถ้า'),splitRoomUser],[splitRoomStory,'ฉันไม่ซื้อห้องพัก แค่พูดถึงราคา']])assert.equal(recoverMarketplaceShop(story,user,'Oakland Inn',[],{clock:{day:1,time:'10:25'}}),null);
});

test('explicit ordinary goods quotes open without a machine object while refusing unrelated mentions and wrong evidence',()=>{
    const story='<tr-dialogue name="Garrick">ข้าขายดาบเหล็ก ราคา 12 เหรียญเงิน</tr-dialogue>',user='ฉันขอซื้อดาบเหล็ก';
    const event=recoverMarketplaceShop(story,user,'Shop');assert.ok(event);assert.equal(event.items[0].item.name,'ดาบเหล็ก');assert.equal(event.items[0].askPrice,12);
    for(const quote of ['ข้าจะขายดาบเหล็ก ราคา 12 เหรียญเงิน','ข้าไม่ขายดาบเหล็ก ราคา 12 เหรียญเงิน','ข้าขายดาบเหล็ก ราคา 12 เหรียญเงิน แต่ค่าบริการเพิ่ม 3 เหรียญเงิน'])assert.equal(recoverMarketplaceShop(`<tr-dialogue name="Garrick">${quote}</tr-dialogue>`,user,'Shop'),null);
    assert.equal(recoverMarketplaceShop(story,'ฉันพูดคำว่าซื้อเฉยๆ ยังไม่อยากซื้อ','Shop'),null);
    assert.equal(confirmedMarketplaceEvent(event,story,user,'Shop',[],{kind:'none'}),null);
});

test('per-option evidence cannot import another NPC price or contradict an explicit price in an otherwise current catalog',()=>{
    const first='I show goods for sale. Potion: 2 silver.',second='I show goods for sale. Rope: 4 silver.',story=`<tr-dialogue name="Garrick">${first}</tr-dialogue><tr-dialogue name="Other">${second}</tr-dialogue>`;
    const raw={kind:'npcShop',location:'Shop',seller:{name:'Garrick'},evidence:first,denomination:'silver',items:[{name:'Potion',price:2,evidence:first},{name:'Rope',price:4,evidence:second}]};
    assert.equal(confirmedMarketplaceEvent(raw,story,'Show me your goods','Shop'),null);
    raw.items=[{name:'Potion',price:3,evidence:first}];assert.equal(confirmedMarketplaceEvent(raw,story,'Show me your goods','Shop'),null);
});

test('a genuine NPC buy offer for owned items opens a sale list from split dialogue without selling anything',()=>{
    const inventory=[{id:'sword',name:'ดาบเหล็ก',quantity:1,category:'Weapon'},{id:'shield',name:'โล่ไม้',quantity:1,category:'Armor'}];
    const story='<tr-dialogue name="Garrick">ข้ารับซื้อดาบเหล็ก 12 เหรียญเงิน</tr-dialogue><tr-narrative>เขาชี้ไปที่โล่</tr-narrative><tr-dialogue name="Garrick">ข้ารับซื้อโล่ไม้ 4 เหรียญเงิน</tr-dialogue>';
    const event=recoverMarketplaceShop(story,'ฉันขอขายดาบเหล็กกับโล่ไม้','Shop',[],{inventory});assert.ok(event);assert.equal(event.kind,'npcPurchase');assert.deepEqual(event.items.map(entry=>[entry.item.id,entry.askPrice]),[['sword',12],['shield',4]]);assert.equal(event.buyer.budget,undefined);assert.equal(inventory.length,2);
    assert.equal(recoverMarketplaceShop(story,'ฉันไม่ได้จะขาย แค่ถามเรื่องขายของ','Shop',[],{inventory}),null);
    assert.equal(recoverMarketplaceShop(story,'ฉันขอขายดาบเหล็กกับโล่ไม้','Shop',[],{inventory:[]}),null);
});

// Ellipsis and a separate checkout/key dialogue must not suppress a real offer.
import {latestRoomStory} from './fixtures/latest-room-offer.mjs';
test('latest exact no-patch reply opens a five-silver room and uses the separately spoken checkout',()=>{
    const event=recoverMarketplaceShop(latestRoomStory,splitRoomUser,'Oakland Inn',[],{clock:{day:1,time:'10:16'}});
    assert.ok(event);assert.equal(event.items.length,1);const entry=event.items[0];
    assert.equal(entry.item.name,'ห้องพักธรรมดา');assert.equal(entry.askPrice,5);assert.equal(entry.denomination,'silver');
    assert.deepEqual(entry.terms.validUntil,{day:2,time:'12:00'});assert.equal(entry.terms.delivery.name,'กุญแจห้องพักธรรมดา');
    assert.match(entry.item.description,/เตียงเดี่ยว.*โต๊ะเล็ก/s);assert.ok(entry.terms.includes.some(x=>x.includes('อาหารเช้า')));
    const other=latestRoomStory.replace('name="Garrick" delivery="calm"','name="Other" delivery="calm"');
    assert.equal(recoverMarketplaceShop(other,splitRoomUser,'Oakland Inn',[],{clock:{day:1,time:'10:16'}}),null,'another speaker cannot authorize this seller key');
});
