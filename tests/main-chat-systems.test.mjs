import test from 'node:test';
import assert from 'node:assert/strict';
import {mainChatSystemInstructions, mainChatOutputContract, requestedChatSystems, requestedCommerceKind, settledCommerceFollowup, missingChatSystems} from '../src/main-chat-systems.js';
import {confirmedMarketplaceEvent, recoverMarketplaceShop} from '../src/marketplace-events.js';
import {confirmedAuctionOffer} from '../src/auction-core.js';
import {confirmedMissionBoard} from '../src/mission-board.js';
import {confirmedGroupBoard} from '../src/group-board.js';

const settings = {enableMarketplace:true,enableAuctions:true,enableMissionBoard:true,enableGroupBoard:true};
const shop = {kind:'npcShop',location:'Guild',seller:{name:'Rally'},denomination:'silver',items:[{itemName:'Potion',price:2,stock:4}]};

test('Thai choice particle แล้วกัน keeps present purchases and sales routed to the composer and normal reply contract',()=>{
    for(const [user,kind] of [
        ['“ซื้อทั้งสามเล่มเลยแล้วกัน.. ช่วยลดให้หน่อยได้มั้ยครับ..? สักนิดก็ยังดี..”','buy'],
        ['ขอซื้อยาสองขวดแล้วกันครับ','buy'],
        ['ซื้อไปสองเล่มแล้วกัน','buy'],
        ['ซื้อดาบแล้ว กันครับ','buy'],
        ['ขายดาบเล่มนี้แล้วกันครับ','sell'],
        ['ฉันซื้อดาบมาแล้ว ขอซื้อยาแล้วกัน','buy'],
        ['ซื้อยาแล้วกัน ของที่ซื้อก่อนหน้านี้ได้รับแล้ว','buy'],
    ]){
        assert.equal(settledCommerceFollowup(user),false,user);
        assert.equal(requestedCommerceKind(user,settings),kind,user);
        assert.deepEqual(requestedChatSystems(user,settings),['marketplace'],user);
        assert.match(mainChatSystemInstructions(user,settings),/latest player action concerns marketplace/);
        assert.match(mainChatOutputContract(user,{...settings,autoTrack:true}),new RegExp(`CURRENT TRADE OUTPUT: the player is requesting a ${kind} offer`));
        assert.equal(requestedCommerceKind(user,{...settings,enableMarketplace:false}),'');
    }
    for(const user of ['ซื้อดาบมาแล้ว ขอเก็บใส่กระเป๋า','ขายดาบแล้ว ฉันเดินออกจากร้าน']){
        assert.equal(settledCommerceFollowup(user),true,user);
        assert.equal(requestedCommerceKind(user,settings),'',user);
    }
    assert.equal(requestedCommerceKind('OOC: ซื้อทั้งสามเล่มแล้วกัน',settings),'');
});

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

test('goods vocabulary within an auction cannot create a second shop warning or prompt',()=>{for(const user of ['ขอดูสินค้าประมูล','อยากซื้อของในงานประมูล','Show auction goods catalog']){assert.deepEqual(requestedChatSystems(user,settings),['auction']);assert.deepEqual(missingChatSystems(user,'The auctioneer displays auction goods for sale.',settings,{auction:{id:'auction'}}),[]);}});
test('an existing composer interaction suppresses stale commerce warnings, preserving board requests',()=>{assert.deepEqual(missingChatSystems('ขอดูสินค้าและกระดานภารกิจ','Rally shows shop goods. You read the mission board.',settings,{commerce:{kind:'auction'}}),['missionBoard']);const p=mainChatSystemInstructions('ขอดูสินค้า',settings,{activeCommerce:{kind:'auction'}});assert.match(p,/never emit marketplace\/auction again/);assert.doesNotMatch(p,/corresponding top-level object/);});

test('collecting settled goods is not a fresh auction, purchase or sale request',()=>{
 for(const user of [
  'หลังจากจบการประมูลฉันก็ไปรับตัวทาสมาก่อนจะทำความรู้จัก\nฉันยืนมองทาสที่ตัวเองซื้อมาก่อนจะคิดต่อว่าเอาไงดี',
  'ประมูลจบแล้ว ฉันไปรับของที่ซื้อมา',
  'ฉันมารับสินค้าที่ซื้อแล้วจากร้านค้า',
  'ฉันยืนดูสินค้าที่ซื้อแล้วจากร้านค้า',
  'After the auction ended I collect the item I bought from the merchant.',
 ]){assert.equal(requestedCommerceKind(user,settings),'',user);assert.deepEqual(requestedChatSystems(user,settings),[],user);}
 assert.equal(requestedCommerceKind('หลังจากจบการประมูล ฉันขอซื้อยา',settings),'buy');
 assert.equal(requestedCommerceKind('หลังจากจบการประมูล ฉันเข้าร่วมประมูลรอบใหม่',settings),'auction');
});
test('current posted recruitment notices and job papers validate without requiring a literal board label',()=>{
 const group='บนกระดานไม้มีใบประกาศรับสมัครสมาชิกปาร์ตี้ รูอิน สตาฟฟ์ ระบุเงื่อนไขและบทบาทที่ขาดแคลนไว้อย่างชัดเจน';
 assert.ok(confirmedGroupBoard({entries:[{kind:'party',name:'รูอิน สตาฟฟ์'}]},group,'ยืนดูกระดานปาร์ตี้และกิลด์','Guild'));
 assert.deepEqual(missingChatSystems('ยืนดูกระดานปาร์ตี้และกิลด์',group,settings,{}),['groupBoard']);
 const mission='แผ่นประกาศภารกิจที่ติดอยู่ระดับสายตาระบุงานล่าหมาป่าเขี้ยวดาบและเงินรางวัล 5 เหรียญเงิน';
 assert.ok(confirmedMissionBoard({missions:[{name:'ล่าหมาป่าเขี้ยวดาบ',objective:'ล่าหมาป่าเขี้ยวดาบ',reward:'5 เงิน'}]},mission,'ยืนอ่านกระดานภารกิจ','Guild'));
 assert.deepEqual(missingChatSystems('ยืนอ่านกระดานภารกิจ',mission,settings,{}),['missionBoard']);
 const screenshot='โคฮาคุชะโงกหน้ามองแผ่นกระดาษที่ติดอยู่ระดับสายตาพลางเอ่ยถามเสียงแผ่วเบา ดวงตาสีอำพันเป็นประกายสะท้อนข้อความระบุเงินรางวัลและเงื่อนไขบนแผ่นหนังแกะ ขณะที่นักผจญภัยสองสามคนข้างๆ ปรายตามองมาครู่หนึ่งก่อนจะหันกลับไปถกเถียงกันเรื่องภารกิจล่าหมาป่าเขี้ยวดาบต่อ';
 assert.ok(confirmedMissionBoard({missions:[{name:'ล่าหมาป่าเขี้ยวดาบ',objective:'ล่าหมาป่าเขี้ยวดาบ'}]},screenshot,'ยืนอ่านกระดานภารกิจ','Guild'));
 for(const text of ['พรุ่งนี้จะติดใบประกาศรับสมัครปาร์ตี้','You have not reached the recruitment board.'])assert.equal(confirmedGroupBoard({entries:[{kind:'party',name:'Dawn'}]},text,'Continue','Guild'),null);
});

test('normal buy contract gives complete room access terms in its final example instead of the old price-only schema',()=>{
 const contract=mainChatOutputContract('ฉันขอซื้อห้องพักหนึ่งคืน',{...settings,autoTrack:true},{location:'Oakland Inn'});
 const sample=JSON.parse([...contract.matchAll(/<!--tretaresia_patch:([\s\S]*?)-->/gu)].at(-1)[1]);
 const entry=sample.marketplace.items[0];
 assert.equal(entry.terms.mode,'access');assert.equal(entry.terms.durationMinutes,1440);assert.equal(entry.category,'Access');
 assert.ok(entry.description);assert.ok(entry.properties.length);assert.ok(entry.terms.delivery.name);assert.ok(entry.terms.includes.length);
 assert.match(contract,/Every item needs description, category, properties/);
 assert.match(contract,/Include EVERY quoted option/);assert.doesNotMatch(contract,/items:\[\{id,itemName,description,category,price:3,stock:1,stockKnown:false,negotiableKnown:false\}\]/);
 const goods=mainChatOutputContract('ขอซื้อดาบ',{...settings,autoTrack:true},{location:'Market'});
 assert.equal(JSON.parse([...goods.matchAll(/<!--tretaresia_patch:([\s\S]*?)-->/gu)].at(-1)[1]).marketplace.items[0].terms.mode,'permanent');
});

test('permanent place purchases use named key delivery and temporary stays keep timed access',()=>{
 for(const user of ['ซื้อบ้านริมแม่น้ำ','ฉันขอซื้อห้องแบบถาวร','ซื้ออาคารพาณิชย์','I buy a warehouse']){
  const contract=mainChatOutputContract(user,{...settings,autoTrack:true},{location:'Town'});
  const entry=JSON.parse([...contract.matchAll(/<!--tretaresia_patch:([\s\S]*?)-->/gu)].at(-1)[1]).marketplace.items[0];
  assert.equal(entry.terms.mode,'permanent',user);assert.equal(entry.category,'Property');assert.equal(entry.terms.delivery.category,'Key');assert.ok(entry.terms.scope);
 }
 for(const user of ['ซื้อห้องพัก 1 คืน','ฉันขอเช่าบ้านหนึ่งคืน','I rent a house']){
  const contract=mainChatOutputContract(user,{...settings,autoTrack:true},{location:'Town'});
  assert.equal(JSON.parse([...contract.matchAll(/<!--tretaresia_patch:([\s\S]*?)-->/gu)].at(-1)[1]).marketplace.items[0].terms.mode,'access',user);
 }
});
test('normal reply scene contract requires the same geography fields as the UI completeness check',async()=>{
 const {SCENE_REQUIRED_FIELDS}=await import('../src/scene-tracker.js');
 const contract=mainChatOutputContract('I enter the room.',{autoTrack:true});
 const keys=contract.match(/\(dayName,day,month,year,era,calendar[^)]+\)/)[0].slice(1,-1).split(',');
 assert.deepEqual([...keys].sort(),[...SCENE_REQUIRED_FIELDS].sort());
 assert.doesNotMatch(contract,/Region\/continent are optional/);
 assert.match(contract,/estimated:true/);
});
