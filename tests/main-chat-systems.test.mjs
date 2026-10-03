import test from 'node:test';
import assert from 'node:assert/strict';
import {mainChatSystemInstructions, requestedChatSystems, missingChatSystems} from '../src/main-chat-systems.js';
import {confirmedMarketplaceEvent, recoverMarketplaceShop} from '../src/marketplace-events.js';
import {confirmedAuctionOffer} from '../src/auction-core.js';
import {confirmedMissionBoard} from '../src/mission-board.js';
import {confirmedGroupBoard} from '../src/group-board.js';

const settings = {enableMarketplace:true,enableAuctions:true,enableMissionBoard:true,enableGroupBoard:true};
const shop = {kind:'npcShop',location:'Guild',seller:{name:'Rally'},denomination:'silver',items:[{itemName:'Potion',price:2,stock:4}]};

test('Thai haggling keeps the shop open when a separate sentence has conditional pricing', () => {
    const evidence = 'Rally แสดงสินค้าที่ขายในร้านให้ดู. ถ้าซื้อสองขวดจะลดราคาให้';
    assert.ok(confirmedMarketplaceEvent({...shop,evidence},evidence,'ขอต่อรองราคาสินค้า','Guild'));
    assert.equal(confirmedMarketplaceEvent({...shop,evidence:'ถ้าคุณเข้าไปดูสินค้าในร้าน Rally จะลดราคาให้'},'ถ้าคุณเข้าไปดูสินค้าในร้าน Rally จะลดราคาให้','ขอดูสินค้า','Guild'),null);
});
test('named dialogue headers identify the seller without forcing the NPC to say their own name', () => {
    const evidence = 'ข้าแสดงสินค้าที่ขายในร้านให้เจ้าดู';
    const story = `<tr-header name="Rally"></tr-header><tr-dialogue name="Rally">${evidence}</tr-dialogue>`;
    assert.ok(confirmedMarketplaceEvent({...shop,evidence},story,'ขอดูสินค้า','Guild'));
    assert.equal(confirmedMarketplaceEvent({...shop,evidence},story,'ขอดูสินค้า','Other'),null);
    assert.equal(confirmedMarketplaceEvent({...shop,evidence:'Rally opens a shop.'},story,'ขอดูสินค้า','Guild'),null);
});
test('omitted evidence and location are repaired from affirmative reply text and current scene only', () => {
    const story = 'Rally shows goods for sale in the shop.';
    const event = confirmedMarketplaceEvent({...shop,location:undefined},story,'Show me the shop.','Guild');
    assert.equal(event.location,'Guild'); assert.ok(story.includes(event.evidence));
    assert.equal(confirmedMarketplaceEvent({...shop,evidence:'I made this up'},story,'Show me the shop.','Guild'),null);
});
test('no-patch catalogs recover explicit prices without inventing a seller or converting currency', () => {
    const story = '<tr-header name="Rally"></tr-header>Rally shows the goods for sale in his shop.\n- Potion: 2 silver\n- Antidote — 4 silver';
    const event = recoverMarketplaceShop(story,'ขอดูสินค้าที่ขาย','Guild');
    assert.equal(event.seller.name,'Rally'); assert.equal(event.items.length,2); assert.equal(event.items[0].askPrice,2);
    assert.equal(event.items[0].stockKnown,false);
    assert.equal(recoverMarketplaceShop(story.replace('4 silver','4 gold'),'ขอดูสินค้า','Guild'),null);
    assert.equal(recoverMarketplaceShop(story.replace(/<tr-header.*?<\/tr-header>/u,''),'ขอดูสินค้า','Guild'),null);
    assert.equal(recoverMarketplaceShop(story,'OOC: show a shop','Guild'),null);
    assert.equal(recoverMarketplaceShop(story.replace('Rally shows','Rally plans to show'),'ขอดูสินค้า','Guild'),null);
});
test('stationary auction previews and board reading work with formatted evidence', () => {
    const evidence = 'The auctioneer displays the auction catalog.';
    const auction = {location:'Guild',evidence,denomination:'gold',lots:[{name:'Blade',openingBid:5,minIncrement:1}]};
    assert.ok(confirmedAuctionOffer(auction,evidence,'Show the auction catalog.','Guild'));
    assert.equal(confirmedAuctionOffer({...auction,evidence:'Tomorrow we will enter the auction.'},'Tomorrow we will enter the auction.','Show the auction.','Guild'),null);
    const read = 'You read the mission board and its tasks.';
    assert.ok(confirmedMissionBoard({location:'Guild',evidence:read,missions:[{name:'Delivery',objective:'Deliver a letter'}]},'You <b>read</b> the mission board and its tasks.','Read the mission board.','Guild'));
    const group = 'You browse the guild board in front of you.';
    assert.ok(confirmedGroupBoard({entries:[{name:'Dawn',kind:'guild'}]},group,'Read the guild board.','Guild'));
});
test('request-specific contract and missing-detail feedback follow enabled switches', () => {
    assert.deepEqual(requestedChatSystems('ขอดูสินค้าและกระดานภารกิจ',settings),['marketplace','missionBoard']);
    const prompt = mainChatSystemInstructions('ต่อรองราคาสินค้า',settings);
    assert.match(prompt,/latest player action concerns marketplace/); assert.match(prompt,/top-level object/);
    assert.equal(mainChatSystemInstructions('Buy',{}),'');
    assert.deepEqual(missingChatSystems('ขอดูสินค้า','Rally แสดงสินค้าที่ขาย',settings,{}),['marketplace']);
    assert.deepEqual(missingChatSystems('ขอดูสินค้า','Rally แสดงสินค้าที่ขาย',settings,{marketplace:shop}),[]);
    assert.deepEqual(missingChatSystems('ขอดูสินค้า','พรุ่งนี้จะเข้าไปดูสินค้าในร้าน',settings,{}),[]);
    assert.deepEqual(missingChatSystems('OOC: ขอดูสินค้า','Rally แสดงสินค้าที่ขาย',settings,{}),[]);
    assert.deepEqual(missingChatSystems('ขอดูสินค้า','Rally แสดงสินค้าที่ขาย',{},{}),[]);
});
