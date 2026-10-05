import test from 'node:test';
import assert from 'node:assert/strict';
import {mainChatOutputContract,requestedCommerceKind} from '../src/main-chat-systems.js';
import {resolveMarketplaceReply} from '../src/marketplace-events.js';
import {validItemLearning} from '../src/item-learning.js';
import {validStatEffects} from '../src/item-definition.js';
import {createCommerceSession,normalizeCommerce,prepareCommerceAction,applyCommerceDecision} from '../src/commerce-engine.js';
import {repairedBooks,repairUser,catalogQuote,bundleQuote,bookNames} from './fixtures/commerce-repair-books.mjs';
const settings={autoTrack:true,enableMarketplace:true,npcDiaryFrequency:'off'},location='Oakland Bookstore';
const quote=catalogQuote+'; '+bundleQuote,story=`<tr-dialogue name="Barth">${quote}</tr-dialogue>`;
const example=prompt=>JSON.parse(prompt.split('LITERAL OUTPUT EXAMPLE').at(-1).match(/<!--tretaresia_patch:(.*)-->/u)[1]);
function offer(){
 const raw=repairedBooks().marketplace;raw.evidence=quote;raw.items.forEach(i=>i.evidence=quote);
 raw.selection={evidence:repairUser,items:raw.items.map(i=>({itemId:i.id,quantity:1}))};
 raw.basketQuote={amount:40,denomination:'silver',evidence:bundleQuote};return raw;
}
const resolve=(raw=offer(),text=story,user=repairUser)=>resolveMarketplaceReply({marketplace:raw,story:text,user,location});
const state=()=>({player:{name:'Noah'},progression:{currency:{gold:0,silver:100,copper:0}},inventory:[],skills:[],npcs:[],location:{place:location},worldClock:{day:1,time:'16:00'},commerce:{sessions:[],receipts:[]}});
test('the final normal-output example includes usable book learning definitions and exact same-reply names, not a price-only skeleton',()=>{
 const prompt=mainChatOutputContract('ขอดูตำราเวทสามเล่ม',settings,{location}),item=example(prompt).marketplace.items[0];
 for(const key of ['id','itemName','quantity','category','description','rarity','properties','usage','price'])assert.ok(Object.hasOwn(item,key),key);
 for(const key of ['action','consumable','effect','conditions','target','cooldown','charges','stats','learns'])assert.ok(Object.hasOwn(item.usage,key),key);
 assert.equal(validStatEffects(item.usage.stats),true);assert.equal(validItemLearning(item.usage.learns),true);assert.equal(item.usage.learns.length,1);
 assert.match(prompt,/exactly the same itemName spelling/);assert.match(prompt,/shorten decorative narrative/);assert.match(prompt,/marketplace\.basketQuote/);assert.match(prompt,/Buying the book does not teach its skill/);
});
test('ordinary shop examples include complete usage while disabled shops and active interactions keep their existing routing',()=>{
 assert.deepEqual(example(mainChatOutputContract('ขอซื้อ Rope',settings,{location})).marketplace.items[0].usage.learns,[]);
 const off=mainChatOutputContract('ขอดูตำราเวท',{autoTrack:true,npcDiaryFrequency:'off'},{location});assert.doesNotMatch(off,/SAME-REPLY SHOP ITEMS/);assert.equal(example(off).marketplace,undefined);
 const patch=example(mainChatOutputContract('ขอดูตำราเวท',settings,{location,activeCommerce:{id:'existing',revision:2,kind:'buy'}}));assert.equal(patch.marketplace,undefined);assert.equal(patch.commerce.sessionId,'existing');
});
test('explicit Thai book browsing receives the item contract while ordinary reading and non-commerce NPC intent do not force a shop',()=>{
 for(const user of ['ขอดูตำราเวทสามเล่ม','ขอดูคัมภีร์','อยากเลือกหนังสือ'])assert.equal(requestedCommerceKind(user,settings),'buy');
 for(const user of ['ฉันอ่านหนังสือ','ฉันศึกษาตำราเวท','OOC: ขอดูตำราเวท'])assert.equal(requestedCommerceKind(user,settings),'');
 const r=resolveMarketplaceReply({marketplace:offer(),story,user:'ขอดูหนังสือในห้องสมุด',location,intent:{kind:'none'}});assert.equal(r.status,'no-intent');assert.equal(r.event,null);
});
test('one completed reply opens all three defined books and the quoted bundle total, with no ownership or learning before confirmation',()=>{
 const before=state(),result=resolve();assert.equal(result.status,'ready');const session=createCommerceSession(result.event,{messageId:1,variant:story});
 assert.deepEqual(session.items.map(e=>e.item.name),bookNames);assert.deepEqual(session.items.map(e=>e.askPrice),[15,20,10]);assert.deepEqual(session.basket.map(e=>e.quantity),[1,1,1]);assert.equal(session.quote,40);assert.equal(session.agreed,false);
 assert.ok(session.items.every(e=>e.item.usage.learns.length===1));assert.equal(before.progression.currency.silver,100);assert.deepEqual(before.inventory,[]);assert.deepEqual(before.skills,[]);
 const saved=normalizeCommerce({sessions:[session]},before);assert.equal(saved.sessions[0].quote,40);
 const s=state(),prepared=prepareCommerceAction(s,session,'confirm');assert.equal(prepared.amount,40);
 const completed=applyCommerceDecision(s,prepared,{narrative:'Barth accepts the confirmed forty silver and hands over the three books.',decision:{outcome:'accepted',amount:40}});
 assert.equal(completed.ok,true);assert.equal(completed.next.progression.currency.silver,60);assert.equal(completed.next.inventory.length,3);assert.deepEqual(completed.next.skills,[]);assert.ok(completed.next.inventory.every(i=>i.usage.learns.length===1));
});
test('an exact current whole-basket total can be read locally when the model omits the optional basketQuote field',()=>{
 const raw=offer();delete raw.basketQuote;const event=resolve(raw).event;assert.ok(event);assert.equal(createCommerceSession(event).quote,40);
});
for(const [name,change]of [
 ['invented discount',r=>r.basketQuote.amount=30],['different currency',r=>r.basketQuote.denomination='gold'],['hidden evidence',r=>r.basketQuote.evidence='planning: all three for 40 silver'],['obsolete total',r=>{r.basketQuote.amount=45;r.basketQuote.evidence=catalogQuote;}],
 ['different merchant',r=>r.seller.name='Mira'],['unspoken expanded title',r=>r.items[0].name='Advanced Wind Arrow Manual'],
])test(`same-reply catalog still rejects ${name}`,()=>{const raw=offer();change(raw);assert.equal(resolve(raw).event,null);});
test('a discounted bundle never applies to a subset, extra quantities, refusal or future plan',()=>{
 for(const user of ['ซื้อ Wind Arrow 1 เล่ม','ซื้อทั้งสามเล่มอย่างละสอง','ยังไม่ซื้อทั้งสามเล่ม'])assert.equal(resolve(offer(),story,user).event,null);
 for(const prefix of ['ข้าไม่ลดให้เหลือ','พรุ่งนี้ข้าลดให้เหลือ']){const raw=offer(),q=quote.replace('ข้าลดให้เหลือ',prefix);raw.evidence=q;raw.items.forEach(i=>i.evidence=q);raw.basketQuote.evidence=bundleQuote.replace('ข้าลดให้เหลือ',prefix);assert.equal(resolve(raw,`<tr-dialogue name="Barth">${q}</tr-dialogue>`).event,null);}
 const session=createCommerceSession(resolve().event);const changed=prepareCommerceAction(state(),session,'talk',{items:session.basket.slice(0,2)});assert.equal(changed.ok,true);assert.equal(changed.session.quote,35);assert.equal(changed.session.agreed,false);
});
