import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAuctionOffer,confirmedAuctionOffer,normalizeAuctions,normalizeAuctionReceipts,auctionReserved,auctionAvailable,auctionFundsValid,auctionPublicSummary,auctionBlocksOperation,auctionView,applyAuctionAction} from '../src/auction-core.js';
const state = () => ({player:{name:'Nova'},location:{place:'Auction Hall'},progression:{currency:{name:'Crowns',gold:60,silver:15,copper:0}},inventory:[],auctions:[],auctionReceipts:[]});
const offer = overrides => ({id:'hall-day-63',title:'Evening Auction',location:'Auction Hall',evidence:'You enter the Auction Hall and sit beside the auctioneer.',denomination:'gold',entryFee:2,deposit:5,
    lots:[{id:'moonblade',name:'Moonblade',category:'Equipment',quantity:1,openingBid:6,minIncrement:2,description:'An inspected silver blade.',bidders:[{name:'Cora',maxBid:12}]}],...overrides});
function act(s,action,amount,o=offer()) { return applyAuctionAction(s,o,action,{amount,revision:s.auctions.find(a=>a.id===o.id)?.revision || 0,now:'2026-09-30T12:00:00Z'}); }
function win(s,o=offer()) { s=act(s,'bid',20,o).next;for(let i=0;i<3;i++)s=act(s,'wait',undefined,o).next;return s; }
test('offers require confirmed arrival at the actual venue; mentions, plans and OOC do not open UI',()=>{
 const o=offer();assert(confirmedAuctionOffer(o,o.evidence,'I enter.',o.location));
 assert.equal(confirmedAuctionOffer(o,o.evidence,'OOC: What is an auction?',o.location),null);
 assert.equal(confirmedAuctionOffer(o,o.evidence,'I enter.','Inn'),null);
 for(const evidence of ['Tomorrow you will enter the auction.','You hear about an auction.','You have not yet entered the auction.','พรุ่งนี้ฉันเดินไปเข้าประมูล'])assert.equal(confirmedAuctionOffer({...o,evidence},evidence,'I consider it.',o.location),null);
 assert.equal(confirmedAuctionOffer(o,'Different text','I enter.',o.location),null);
});
test('normalization limits catalog and rivals, rejects fractions and does not invent denominations',()=>{
 assert.equal(normalizeAuctionOffer(offer({denomination:'coins'})),null);
 const o=offer();o.lots[0].openingBid=1.5;assert.equal(normalizeAuctionOffer(o),null);
 const many=offer({lots:Array.from({length:12},(_,i)=>({id:String(i),name:`Lot ${i}`,openingBid:1,minIncrement:1,bidders:Array.from({length:8},(_,i)=>({name:`Rival ${i}`,maxBid:8}))}))});
 assert.equal(normalizeAuctionOffer(many).lots.length,8);assert.equal(normalizeAuctionOffer(many).lots[0].bidders.length,5);
});
test('joining discloses one fee, reserves deposit without deducting it, and cannot be repeated',()=>{
 const initial=state(),r=act(initial,'join');assert(r.ok);assert.equal(initial.progression.currency.gold,60);
 assert.equal(r.next.progression.currency.gold,58);assert.equal(auctionReserved(r.next).gold,5);assert.equal(auctionAvailable(r.next).gold,53);
 assert.equal(act(r.next,'join').ok,false);assert.equal(r.next.auctionReceipts.length,1);
 assert.equal(act(r.next,'join',undefined,offer({id:'other'})).error,'active');
 assert.equal(act(state(),'join',undefined,offer({entryFee:58,deposit:5})).error,'funds');
});
test('rival ceilings are fixed, immediate outbids release funds, and leading funds cannot be spent',()=>{
 let s=act(state(),'join').next;s=act(s,'bid',6).next;
 assert.equal(s.auctions[0].lots[0].price,8);assert.notEqual(s.auctions[0].lots[0].highestBidder,'player');assert.equal(auctionAvailable(s).gold,53);
 s=act(s,'bid',14).next;assert.equal(s.auctions[0].lots[0].highestBidder,'player');assert.equal(auctionReserved(s).gold,19);assert.equal(auctionAvailable(s).gold,39);
 const spend=structuredClone(s);spend.progression.currency.gold=18;assert.equal(auctionFundsValid(spend,s),false);
 spend.progression.currency.gold=20;assert.equal(auctionFundsValid(spend,s),true);spend.progression.currency.name='Other';assert.equal(auctionFundsValid(spend,s),false);
 assert.equal(act(s,'bid',18).error,'leading');assert.equal(act(s,'leave').error,'committed');
});
test('winning takes exactly three explicit counts and pays/delivers once after normalization and reload',()=>{
 let s=act(state(),'join').next;s=act(s,'bid',20).next;
 for(let i=1;i<=2;i++){s=act(s,'wait').next;assert.equal(s.auctions[0].lots[0].closingCount,i);assert.equal(s.progression.currency.gold,58);assert.equal(s.inventory.length,0);}
 s=act(s,'wait').next;assert.equal(s.progression.currency.gold,38);assert.equal(s.inventory[0].quantity,1);assert.equal(s.auctions[0].status,'Completed');assert.equal(auctionReserved(s).gold,0);
 s.auctions=normalizeAuctions(JSON.parse(JSON.stringify(s.auctions)));s.auctionReceipts=normalizeAuctionReceipts(s.auctionReceipts);
 assert.equal(act(s,'wait').ok,false);assert.equal(act(s,'join').ok,false);
 const retired={...s,auctions:[]};assert.equal(act(retired,'join').error,'joined');assert.equal(auctionView(retired,offer()).retired,true);
});
test('two lots retain deposit between lots; next is explicit and entry fee never repeats',()=>{
 const o=offer();o.lots.push({...o.lots[0],id:'bow',name:'Moonbow',bidders:[]});
 let s=act(state(),'join',undefined,o).next;s=win(s,o);assert.equal(s.auctions[0].index,0);assert.equal(s.auctions[0].status,'Joined');assert.equal(auctionReserved(s).gold,5);
 s=act(s,'next',undefined,o).next;assert.equal(s.auctions[0].index,1);assert.equal(s.progression.currency.gold,38);
 s=win(s,o);assert.equal(s.progression.currency.gold,18);assert.equal(s.inventory.length,2);assert.equal(s.auctionReceipts.length,3);assert.equal(s.auctions[0].status,'Completed');
});
test('NPC winners and unsold lots never charge player or deliver items',()=>{
 for(const bidders of [[{name:'Cora',maxBid:6}],[]]){
  const o=offer({lots:[{...offer().lots[0],bidders}]}),joined=act(state(),'join',undefined,o).next;let s=joined;
  for(let i=0;i<4;i++){const result=act(s,'wait',undefined,o);if(result.ok)s=result.next;}
  assert.equal(s.progression.currency.gold,58);assert.equal(s.inventory.length,0);assert.equal(s.auctions[0].status,'Completed');assert.equal(auctionReserved(s).gold,0);
 }
});
test('invalid, unaffordable, away and stale bids have no effects; away commitments can finish',()=>{
 let s=act(state(),'join').next;for(const amount of [0,5,6.5,Infinity,9999999999,54])assert.equal(act(s,'bid',amount).ok,false);
 assert.equal(applyAuctionAction(s,offer(),'bid',{amount:20,revision:0}).error,'stale');
 assert.equal(applyAuctionAction(s,offer(),'bid',{amount:20,revision:1,available:false}).error,'away');
 s=act(s,'bid',20).next;for(let i=0;i<3;i++)s=applyAuctionAction(s,offer(),'wait',{revision:s.auctions[0].revision,available:false}).next;
 assert.equal(s.auctions[0].status,'Completed');
});
test('leaving releases only the deposit; completed IDs cannot rejoin even after retiring catalogs',()=>{
 let s=act(state(),'join').next;s=act(s,'leave').next;assert.equal(s.progression.currency.gold,58);assert.equal(auctionAvailable(s).gold,58);
 s.auctions=[];assert.equal(act(s,'join').error,'joined');
});
test('public views and prompts never expose ceilings; provenance blocks AI replay and engine edits',()=>{
 let s=act(state(),'join').next;s=win(s);
 for(const value of [auctionPublicSummary(s),auctionView(s,offer())])assert.doesNotMatch(JSON.stringify(value),/maxBid|bidder-[a-z0-9]+/);
 assert(auctionBlocksOperation(['inc','progression.currency.gold',-20,{reason:'Paid the auction bid'}]));
 assert(auctionBlocksOperation(['inc','inventory',{name:'Moonblade',quantity:1},{auctionId:'hall-day-63'}]));
 assert(auctionBlocksOperation(['delete','auctions',{id:'hall-day-63'}]));
 assert.equal(auctionBlocksOperation(['inc','progression.currency.gold',-2,{reason:'Bought dinner'}]),false);
});
test('inventory merge preserves item identity and capacity failures preserve winning commitment for retry',()=>{
 const initial=state();initial.inventory=[{id:'mine',name:'Moonblade',quantity:2}];let s=win(act(initial,'join').next);
 assert.equal(s.inventory.length,1);assert.equal(s.inventory[0].id,'mine');assert.equal(s.inventory[0].quantity,3);
 const full=state();full.inventory=Array.from({length:200},(_,i)=>({id:String(i),name:`Item ${i}`,quantity:1}));s=act(full,'join').next;s=act(s,'bid',20).next;
 s=act(s,'wait').next;s=act(s,'wait').next;const fail=act(s,'wait');assert.equal(fail.error,'inventory');assert.equal(fail.next.progression.currency.gold,58);assert.equal(fail.next.auctions[0].lots[0].closingCount,2);
});
