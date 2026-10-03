import test from 'node:test';
import assert from 'node:assert/strict';
import {mainChatOutputContract} from '../src/main-chat-systems.js';
import {readCommercePrices} from '../src/commerce-prices.js';
import {confirmedAuctionOffer} from '../src/auction-core.js';
import {confirmedMarketplaceEvent} from '../src/marketplace-events.js';
const settings={autoTrack:true,chatPresentation:true,enableAuctions:true,enableMarketplace:true,enableMissionBoard:true,enableGroupBoard:true,enableStoryMemory:true,enableStoryAgenda:true,enableQuestObjectives:true,enableMemorySummaries:true,npcDiaryFrequency:'normal'};
const example=prompt=>JSON.parse(prompt.split('LITERAL OUTPUT EXAMPLE').at(-1).match(/<!--tretaresia_patch:(.*)-->/u)[1]);
test('the normal reply teaches core trackers and every enabled optional system with a concrete output destination',()=>{
 const prompt=mainChatOutputContract('เข้าร่วมประมูล',settings,{location:'Hall'});
 for(const route of ['HEADER / DIALOGUE / NARRATIVE','SCENE TRACKER','PLAYER IDENTITY','HP / MANA','EXP / LEVEL','MONEY / INVENTORY','PLAYER SKILLS','NPC DOSSIER','AURA CONTROL / FITNESS / CUSTOM POWERS:','NPC KNOWLEDGE / WORLD ACTIVITY:','CONTACTS / PHYSICAL LETTERS','PARTY / GUILD / HOUSEHOLD','QUESTS / MISSIONS','COMBAT / EFFECTS','TRAVEL / JOURNEY','H-STATS','LOCAL USER CONTROLS','NPC DIARY','AUCTION:','BUY / SHOP:','SELL:','MISSION BOARD:','GUILD / PARTY BOARD:','IMPORTANT FACT','APPOINTMENT / DEADLINE:','QUEST CHECKLIST:','MEMORY SUMMARIES:'])assert.ok(prompt.includes(route),route);
 assert.match(prompt,/FINAL assistant answer/);assert.match(prompt,/Never put the payload only in thinking/);assert.match(prompt,/integer numbers even if the dialogue spells/);assert.equal(example(prompt).auction.location,'Hall');
});
for(const [user,key,kind]of [['ขอดูสินค้าประมูล','auction',undefined],['ขอซื้อสินค้า','marketplace','npcShop'],['อยากขาย Potion','marketplace','npcPurchase']])test(`the final comment example selects the actual ${user} protocol`,()=>{
 const patch=example(mainChatOutputContract(user,settings,{location:'Hall'}));assert.ok(patch[key]);assert.deepEqual(patch.ops,[]);assert.equal(patch[key].kind,kind);assert.equal(patch.sceneTracker.loc,'Hall');assert.equal(patch[key].location,'Hall');assert.equal(Boolean(patch.auction&&patch.marketplace),false);
});
test('an existing interaction uses commerce without opening another catalog, even with shop wording',()=>{
 const patch=example(mainChatOutputContract('ขอดูสินค้า',settings,{activeCommerce:{id:'a',revision:3,kind:'auction'},roleplay:'NORMAL CHAT COMMERCE: reference',location:'Hall'}));assert.equal(patch.commerce.sessionId,'a');assert.equal(patch.commerce.revision,3);assert.equal(patch.auction,undefined);assert.equal(patch.marketplace,undefined);
});
test('disabled optional systems and diary are not taught as available; tracking OFF has no output contract',()=>{
 const prompt=mainChatOutputContract('เข้าประมูล',{autoTrack:true,npcDiaryFrequency:'off'});for(const label of ['AUCTION:','BUY / SHOP:','SELL:','MISSION BOARD:','GUILD / PARTY BOARD:','IMPORTANT FACT','APPOINTMENT / DEADLINE:','QUEST CHECKLIST:','MEMORY SUMMARIES:'])assert.ok(!prompt.includes(label));assert.match(prompt,/NPC DIARY is OFF/);assert.equal(mainChatOutputContract('เข้าประมูล',{...settings,autoTrack:false}),'');
});
test('a current auction location teaches an opening on a stationary action but future/OOC does not select its example',()=>{
 assert.ok(example(mainChatOutputContract('นั่งดูอยู่ด้านหลัง',settings,{location:'โรงประมูล'})).auction);
 for(const user of ['OOC: ประมูลทำงานยังไง','พรุ่งนี้ค่อยเข้าประมูล'])assert.equal(example(mainChatOutputContract(user,settings,{location:'โรงประมูล'})).auction,undefined);
});
test('post-auction collection and unrelated board browsing do not inherit a stale auction opening example',()=>{
 for(const user of ['หลังจากจบการประมูลฉันไปรับตัวที่ซื้อมาทำความรู้จัก','ประมูลจบแล้ว ฉันไปรับของที่ซื้อมา']){
  const prompt=mainChatOutputContract(user,settings,{location:'Slave Auction House',scene:'The auctioneer sold the last lot.'});
  const patch=example(prompt);assert.equal(patch.auction,undefined);assert.equal(patch.marketplace,undefined);assert.match(prompt,/AFTER SETTLEMENT/);
 }
 assert.equal(example(mainChatOutputContract('ยืนดูกระดานปาร์ตี้และกิลด์',settings,{location:'Auction House'})).auction,undefined);
 const settledCommerce={kind:'auction',status:'completed'};
 assert.equal(example(mainChatOutputContract('ทำความรู้จักกับคนดูแล',settings,{location:'Auction House',settledCommerce})).auction,undefined);
 assert.ok(example(mainChatOutputContract('ขอเข้าร่วมประมูลรอบใหม่',settings,{location:'Auction House',settledCommerce})).auction);
});
test('requested boards have complete same-reply examples even alongside an existing commerce session',()=>{
 for(const activeCommerce of [undefined,{id:'a',revision:2,kind:'auction'}]){
  const prompt=mainChatOutputContract('ยืนดูกระดานภารกิจและกระดานปาร์ตี้และกิลด์',settings,{location:'Guild',activeCommerce});
  const patch=example(prompt);assert.equal(patch.missionBoard.location,'Guild');assert.ok(patch.missionBoard.missions[0].objective);assert.equal(patch.groupBoard.location,'Guild');assert.equal(patch.groupBoard.entries[0].kind,'party');assert.match(prompt,/REQUIRED THIS REPLY: missionBoard, groupBoard/);assert.match(prompt,/not a second request/);
 }
});
for(const [phrase,amount,denomination]of [['สิบเหรียญเงิน',10,'silver'],['ยี่สิบเอ็ดเหรียญทองแดง',21,'copper'],['หนึ่งร้อยห้าสิบเงิน',150,'silver'],['สองพันสิบเหรียญทอง',2010,'gold'],['หนึ่งล้านสองแสนเหรียญทอง',1200000,'gold'],['๑๐ เหรียญเงิน',10,'silver'],['10 silver',10,'silver']])test(`natural price ${phrase} maps to the same numeric payload without an API`,()=>{assert.equal(readCommercePrices(phrase)[0].amount,amount);assert.equal(readCommercePrices(phrase)[0].denomination,denomination);});
test('a valid numeric auction patch is accepted when the NPC spells the standing price in Thai',()=>{
 const story='<tr-dialogue name="Mira">สิบเหรียญเงิน!</tr-dialogue>',offer=confirmedAuctionOffer({location:'Hall',evidence:'สิบเหรียญเงิน!',denomination:'silver',lots:[{name:'Blade',openingBid:5,minIncrement:1,bidders:[{name:'Mira',budget:18}],currentBid:10,currentBidder:'Mira'}]},story,'นั่งลงเข้าร่วมการประมูล','Hall');assert.ok(offer);assert.equal(offer.lots[0].currentBid,10);assert.equal(offer.lots[0].bidders[0].budget,18);
});
test('buy and sell accept current quoted Thai prices while preserving seller identity and ownership',()=>{
 const shopStory='<tr-dialogue name="Rally">Potion สามเหรียญเงิน</tr-dialogue>';
 assert.ok(confirmedMarketplaceEvent({kind:'npcShop',location:'Hall',seller:{name:'Rally'},evidence:'Potion สามเหรียญเงิน',denomination:'silver',items:[{name:'Potion',price:3}]},shopStory,'ขอซื้อ Potion','Hall'));
 const saleStory='<tr-dialogue name="Mira">ข้ารับซื้อ Potion ห้าเหรียญเงิน</tr-dialogue>',raw={kind:'npcPurchase',location:'Hall',buyer:{name:'Mira'},item:{itemName:'Potion',quantity:1},askPrice:5,denomination:'silver'};
 assert.ok(confirmedMarketplaceEvent(raw,saleStory,'ขาย Potion','Hall',[{name:'Potion',quantity:1}]));assert.equal(confirmedMarketplaceEvent(raw,saleStory,'ขาย Potion','Hall',[]),null);
 assert.equal(confirmedMarketplaceEvent({...raw,evidence:'คำที่ไม่ได้พูด'},saleStory,'ขาย Potion','Hall',[{name:'Potion',quantity:1}]),null);
});
