import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedMarketplaceEvent} from '../src/marketplace-events.js';
import {validateCommerceOpening} from '../src/commerce-opening.js';
import {createCommerceSession} from '../src/commerce-engine.js';
import {mainChatOutputContract,requestedCommerceKind} from '../src/main-chat-systems.js';
import {innUser,innEvidence,innStory,innOffer} from './fixtures/inn-offer.mjs';
const input={kind:'buy',user:innUser,story:innStory,location:'Oakland Inn'};
const confirm=(raw=innOffer(),story=innStory,user=innUser)=>confirmedMarketplaceEvent(raw,story,user,'Oakland Inn');
test('supplied inn quote opens both current room options from an inline reply without inventing stock',()=>{
    const event=confirm();assert.ok(event);assert.equal(event.seller.id,'garrick-innkeeper-1');
    assert.deepEqual(event.items.map(e=>[e.item.name,e.askPrice,e.stockKnown,e.negotiableKnown]),[['ห้องพักธรรมดาชั้นสอง',5,false,false],['ห้องกว้างหน่อย มีอ่างอาบน้ำส่วนตัว',10,false,false]]);
    assert.equal(createCommerceSession(event).kind,'buy');
});
test('the exact supplied opening recovery JSON is valid too',()=>assert.equal(validateCommerceOpening({marketplace:innOffer()},input).marketplace.items.length,2));
test('a missing evidence field can use the current innkeeper dialogue',()=>{const offer=innOffer();delete offer.evidence;assert.ok(confirm(offer));});
for(const [label,mutate]of [
    ['invented evidence',o=>o.evidence='Garrick shows two available rooms for rent.'],
    ['different speaker',o=>o.seller.name='Mira'],
    ['invented room',o=>o.items[0].name='ห้องราชา'],
    ['invented price',o=>o.items[0].price=9],
    ['wrong denomination',o=>o.denomination='gold'],
    ['prices swapped between rooms',o=>{o.items[0].price=10;o.items[1].price=5;}],
])test(`conditional-price exception rejects ${label}`,()=>{const offer=innOffer();mutate(offer);assert.equal(confirm(offer),null);});
for(const [label,prefix]of [['future room','พรุ่งนี้ '],['rumored prices','ข่าวลือว่า '],['no vacancy','ไม่มีห้องว่างแล้ว '],['hypothetical supply','ถ้ามีห้องว่าง ']])test(`room prices do not create an opening for ${label}`,()=>{
    const offer=innOffer();offer.evidence=prefix+innEvidence;assert.equal(confirm(offer,`<tr-dialogue name="Garrick">${offer.evidence}</tr-dialogue>`),null);
});
test('a current room menu does not validate a hypothetical or OOC player request',()=>{
    assert.equal(confirm(innOffer(),innStory,'ถ้าฉันจะเช่าห้องพักต้องจ่ายเท่าไหร่'),null);
    assert.equal(confirm(innOffer(),innStory,'OOC: buy a room'),null);
});
test('English current-option quotes follow the same rule',()=>{
    const evidence='If you want the single room, 5 silver. If you prefer the large room, 10 silver.';
    const offer={...innOffer(),evidence,items:[{name:'single room',price:5},{name:'large room',price:10}]};
    assert.equal(confirm(offer,`<tr-dialogue name="Garrick">${evidence}</tr-dialogue>`,'I book a room for one night.').items.length,2);
});
test('room rental and booking requests get the buy output contract while off/future requests do not',()=>{
    const settings={autoTrack:true,enableMarketplace:true};
    for(const user of [innUser,'เช่าห้อง 1 คืน','จองห้องพัก','ขอห้องพัก','I book accommodation for one night']){
        assert.equal(requestedCommerceKind(user,settings),'buy');const contract=mainChatOutputContract(user,settings,{location:'Oakland Inn'});
        assert.match(contract,/REQUIRED THIS REPLY: marketplace.kind="npcShop"/);assert.match(contract,/ROOMS \/ RENTALS \/ PRICED SERVICES/);assert.match(contract,/"marketplace":\{"kind":"npcShop"/);
    }
    assert.equal(requestedCommerceKind('พรุ่งนี้จะเช่าห้อง',settings),'');assert.equal(requestedCommerceKind('เช่าห้อง',{...settings,enableMarketplace:false}),'');
    assert.equal(requestedCommerceKind('I read a book.',settings),'');assert.equal(requestedCommerceKind('ฉันกลับที่พัก',settings),'');
});
