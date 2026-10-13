import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCurrencyScheme,validateCurrencyScheme,currencyValue,currencyAmounts,currencyKeys,currencyDisplay,currencyRule,splitCurrencyValue,reconfigureCurrencyWallet,isCurrencyId} from '../src/currency-config.js';
import {debitWallet,convertMoney} from '../src/commerce-currency.js';
import {readCommercePrices} from '../src/commerce-prices.js';
import {normalizeMarketplaceEvent,confirmedMarketplaceEvent} from '../src/marketplace-events.js';
import {createCommerceSession,normalizeCommerce,commerceAvailable,commerceReserved,prepareCommerceAction,applyCommerceDecision} from '../src/commerce-engine.js';
import {normalizeAuctionOffer,auctionReserved,auctionAvailable,auctionFundsValid} from '../src/auction-core.js';
import {normalizeCommerceRights} from '../src/commerce-rights.js';
import {commerceIconMarkup} from '../src/commerce-icons.js';
import {validateCurrencyPreset,importWorldPreset,exportWorldPreset} from '../src/world-presets.js';
import {mainChatOutputContract} from '../src/main-chat-systems.js';
const many=(count=6)=>validateCurrencyScheme({version:1,animated:true,units:[...defaultCurrencyScheme().units,...Array.from({length:count-3},(_,i)=>({id:'unit_'+i,name:'Token '+i,symbol:'T'+i,aliases:['token-'+i],value:100000,iconSet:'gem',icon:'gem',color:'#123456'}))]});
const state=(scheme=many())=>({player:{name:'Tester'},worldClock:{day:1,time:'10:00'},location:{place:'Shop'},progression:{currency:{name:'Test money',...splitCurrencyValue(987654,scheme),scheme}},inventory:[],commerce:normalizeCommerce()});
test('More than three and 1000 same-rate units validate without losing any ID, display amount or export configuration',()=>{
 for(const count of [4,6,20,1000]){const scheme=many(count),s=state(scheme);assert.equal(currencyKeys(s.progression.currency).length,count);assert.equal(currencyDisplay(s.progression.currency).length,count);assert.equal(currencyValue(s.progression.currency),987654);assert.deepEqual(importWorldPreset(JSON.stringify({format:'roleforge-currency-preset',version:1,preset:validateCurrencyPreset({name:'Many',scheme})})).config.currencyPreset.scheme,scheme);}
});
test('Equal-value denominations convert 1:1; exact change uses their stable configured order',()=>{
 const cfg=many(),wallet=state(cfg).progression.currency;assert.equal(convertMoney(3,'unit_0','unit_2',wallet),3);const old=currencyValue(wallet);assert.equal(debitWallet(wallet,15,'silver'),true);assert.equal(currencyValue(wallet),old-1500);assert.equal(currencyValue(splitCurrencyValue(old,cfg),cfg),old);
});
test('Legacy to multiple units and back preserves player, party and guild values; icon-only changes preserve every balance',()=>{
 const s=state();s.progression.currency.unit_1=2;s.progression.currency.unit_2=3;s.social={party:{sharedFunds:{gold:1,unit_2:2}},guilds:[{treasury:{copper:9,unit_1:4}}]};const old=currencyValue(s.progression.currency),p=currencyValue(s.social.party.sharedFunds,s.progression.currency),g=currencyValue(s.social.guilds[0].treasury,s.progression.currency);
 const art=many();art.units.forEach(u=>u.color='#654321');let next=reconfigureCurrencyWallet(s,art,'Test money');assert.equal(next.progression.currency.unit_1,2);assert.equal(next.progression.currency.unit_2,3);next=reconfigureCurrencyWallet(next,defaultCurrencyScheme(),'Coins');assert.equal(currencyValue(next.progression.currency),old);assert.equal(currencyValue(next.social.party.sharedFunds,next.progression.currency),p);assert.equal(currencyValue(next.social.guilds[0].treasury,next.progression.currency),g);next=reconfigureCurrencyWallet(next,many(8),'Many');assert.equal(currencyValue(next.progression.currency),old);
});
test('Unsafe IDs, duplicate IDs, duplicate aliases and unsupported rates are rejected without touching the wallet',()=>{
 for(const id of ['__proto__','constructor','prototype','name','scheme','units','currencyScheme','gold.extra','bad"id','a b']){assert.equal(isCurrencyId(id),false);const cfg=many();cfg.units[0].id=id;assert.throws(()=>validateCurrencyScheme(cfg));}
 const cfg=many();cfg.units[0].id=cfg.units[1].id;assert.throws(()=>validateCurrencyScheme(cfg));
 const s=state(),copy=structuredClone(s),bad=many();bad.units[0].value=0;assert.throws(()=>reconfigureCurrencyWallet(s,bad));assert.deepEqual(s,copy);
});
test('Currency snapshots preserve custom deltas and never expose reserved keys as balances',()=>{
 assert.equal(currencyAmounts({unit_4:12,name:'Name',scheme:{},constructor:50}).unit_4,12);assert.equal(Object.hasOwn(currencyAmounts({constructor:50}),'constructor'),false);assert.equal(currencyAmounts({unit_4:-5},undefined,{signed:true}).unit_4,-5);
});
test('Six-unit quotes, aliases and mixed baskets settle with exact change and preserve the session on reload',()=>{
 const s=state(),w=s.progression.currency;assert.equal(readCommercePrices('2 T0',w)[0].denomination,'unit_0');
 const raw={kind:'npcShop',id:'multi',location:'Shop',seller:{name:'Mira'},denomination:'unit_1',items:[{id:'p',name:'Potion',price:1,denomination:'unit_1',stock:4},{id:'r',name:'Rope',price:5,denomination:'silver',stock:2}]};
 const session=createCommerceSession(normalizeMarketplaceEvent(raw),{},w);assert.equal(session.denomination,'silver');const prepared=prepareCommerceAction(s,session,'confirm',{items:session.items.map(i=>({itemId:i.id,quantity:1}))});assert.equal(prepared.ok,true);
 const result=applyCommerceDecision(s,prepared,{narrative:'Mira accepts.',decision:{outcome:'accept',amount:1005}});assert.equal(result.ok,true,result.error);assert.equal(currencyValue(result.next.progression.currency),987654-100500);assert.equal(result.next.inventory.length,2);assert.equal(normalizeCommerce(result.next.commerce,result.next).sessions[0].items[0].quotedDenomination,'unit_1');
});
test('Unregistered protocol IDs cannot create a confirmed quote or commerce session',()=>{
 const s=state(),raw={kind:'npcShop',location:'Shop',seller:{name:'Mira'},denomination:'unregistered',evidence:'Mira shows a Potion for sale.',items:[{name:'Potion',price:3}]};assert.equal(confirmedMarketplaceEvent(raw,raw.evidence,'Show goods','Shop',[],{currency:s.progression.currency}),null);assert.equal(createCommerceSession(normalizeMarketplaceEvent(raw),{},s.progression.currency),null);
});
test('Custom-unit auction commitments reserve their real ledger value and prevent deleting the configured denomination',()=>{
 const s=state(),offer=normalizeAuctionOffer({id:'a',location:'Shop',denomination:'unit_0',deposit:1,lots:[{name:'Relic',openingBid:1,minIncrement:1,bidders:[]}]});assert.ok(offer);const session=createCommerceSession(offer,{},s.progression.currency);session.status='open';s.commerce.sessions=[session];assert.equal(commerceReserved(s).unit_0,1);assert.equal(commerceAvailable(s).silver,8876);assert.throws(()=>reconfigureCurrencyWallet(s,defaultCurrencyScheme(),'Coins'));
 s.auctions=[{...offer,status:'Joined',index:0,lots:[{status:'Open',highestBidder:'player',price:1}]}];assert.equal(auctionReserved(s).unit_0,2);assert.equal(auctionAvailable(s).unit_0,7);assert.equal(auctionFundsValid(s),true);s.progression.currency.unit_0=1;assert.equal(auctionFundsValid(s),false);
});
test('Custom-unit rental rights and animated art keep their identifiers instead of becoming Gold',()=>{
 const r={id:'r',status:'active',denomination:'unit_0',terms:{mode:'rental',scope:'Room',conditions:'Return it',delivery:{name:'Key',category:'Key'}},revision:0,paid:1,depositPaid:1,depositRefunded:0,remainingUses:0};assert.equal(normalizeCommerceRights([r])[0].denomination,'unit_0');const icon=commerceIconMarkup('coin','unit_1','stack',state().progression.currency);assert.match(icon,/data-currency="unit_1"/);assert.match(icon,/#123456/);assert.match(icon,/data-motion="on"/);
});
test('Configured output contracts expose every custom protocol ID to the model',()=>{
 const w=state().progression.currency;const contract=mainChatOutputContract('Show the shop',{autoTrack:true,enableMarketplace:true},{currency:w});assert.match(contract,/unit_0/);assert.match(currencyRule(w),/unit_2/);assert.doesNotMatch(contract,/denomination:"gold\|silver\|copper"/);
});
test('Large same-value wallets distribute across denominations without overflow or lost value',()=>{
 const cfg=validateCurrencyScheme({units:[{id:'token_a',name:'A',value:1},{id:'token_b',name:'B',value:1}]});const split=splitCurrencyValue(1500000000,cfg);assert.equal(split.token_a,999999999);assert.equal(split.token_b,500000001);assert.equal(currencyValue(split,cfg),1500000000);assert.throws(()=>splitCurrencyValue(2000000000,cfg));
});
test('A sale exceeding one configured balance limit rolls back goods, payment and receipt together',()=>{
 const cfg=validateCurrencyScheme({units:[{id:'credit',name:'Credit',value:1}]}),s=state(cfg);s.progression.currency.credit=999999998;s.inventory=[{id:'p',name:'Potion',quantity:1}];const before=structuredClone(s),session=createCommerceSession(normalizeMarketplaceEvent({id:'sale',kind:'npcPurchase',location:'Shop',denomination:'credit',buyer:{name:'Mira',budget:20},item:{itemId:'p',itemName:'Potion',name:'Potion',quantity:1},askPrice:5}),{},s.progression.currency);assert.ok(session);const r=applyCommerceDecision(s,prepareCommerceAction(s,session,'confirm'),{narrative:'Accepted.',decision:{outcome:'accept',amount:5}});assert.equal(r.ok,false);assert.deepEqual(r.next,before);assert.deepEqual(s,before);
});
test('Partial and malformed group-fund updates retain existing balances in every custom unit',()=>{
 const previous={gold:2,credit:7,seal:5},next=currencyAmounts({credit:'unknown'},undefined,{fallback:previous});assert.equal(next.gold,2);assert.equal(next.credit,7);assert.equal(next.seal,5);assert.equal(currencyAmounts({credit:4},undefined,{fallback:previous}).credit,4);
});
test('Renaming same-value units preserves their separate quantities and group balances',()=>{
 const cfg=validateCurrencyScheme({units:[{id:'ticket_a',name:'Ticket A',value:1},{id:'ticket_b',name:'Ticket B',value:1}]}),s=state(cfg);s.progression.currency.ticket_a=4;s.progression.currency.ticket_b=7;s.social={party:{sharedFunds:{ticket_a:2,ticket_b:3}},guilds:[{treasury:{ticket_a:1,ticket_b:6}}]};const renamed=structuredClone(cfg);renamed.units[1].name='Event Ticket';renamed.units[1].symbol='ET';const next=reconfigureCurrencyWallet(s,renamed,'Renamed');assert.equal(next.progression.currency.ticket_a,4);assert.equal(next.progression.currency.ticket_b,7);assert.deepEqual(next.social,s.social);assert.equal(currencyValue(next.progression.currency),11);
});
