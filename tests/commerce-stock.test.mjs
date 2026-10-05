import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMarketplaceEvent} from '../src/marketplace-events.js';
import {createCommerceSession,normalizeCommerce,commerceStockLimit,prepareCommerceAction,applyCommerceDecision,applyCommerceRoleplay,commerceDecisionPrompt} from '../src/commerce-engine.js';
import {walletValue} from '../src/commerce-currency.js';

const state=()=>({player:{name:'Noah'},location:{place:'Oakland Pharmacy'},progression:{currency:{name:'Coins',gold:0,silver:10,copper:0}},inventory:[],commerce:normalizeCommerce()});
const catalog=(overrides={})=>normalizeMarketplaceEvent({kind:'npcShop',id:'pharmacy',location:'Oakland Pharmacy',seller:{name:'Teresina'},denomination:'copper',items:[
    {id:'healing',name:'น้ำยาฟื้นฟูแผลระดับพื้นฐาน',price:30,stockKnown:false,terms:{mode:'permanent'},...overrides},
    {id:'antidote',name:'น้ำยาถอนพิษทั่วไป',price:50,stockKnown:false,terms:{mode:'permanent'},...overrides},
]});
const session=event=>createCommerceSession(event,{messageId:1,turnKey:'1',variant:'v'});
const basket=[{itemId:'healing',quantity:3},{itemId:'antidote',quantity:3}];
const decision=(s,c,action,input={},outcome='accept')=>{
    const prepared=prepareCommerceAction(s,c,action,input);
    return applyCommerceDecision(s,prepared,{narrative:'<tr-dialogue name="Teresina">ครบแล้วจ้ะ ยาฟื้นฟูสามขวดกับยาแก้พิษสามขวด รวมสองร้อยสี่สิบเหรียญทองแดง</tr-dialogue>',decision:{outcome,amount:240}});
};

test('reported pharmacy basket: unknown stock allows three of each, one 240-copper payment and one receipt',()=>{
    const s=state(),c=session(catalog()),before=structuredClone(s);
    assert.equal(c.items[0].stock,1,'legacy placeholder reproduces the reported failure');
    const agreed=decision(s,c,'offer',{amount:240,items:basket});
    assert.equal(agreed.ok,true,agreed.error);assert.equal(agreed.session.quote,240);assert.equal(agreed.session.agreed,true);
    assert.deepEqual(agreed.next.inventory,[]);assert.equal(walletValue(agreed.next.progression.currency),1000);
    const paid=decision(agreed.next,agreed.session,'confirm',{items:basket});
    assert.equal(paid.ok,true,paid.error);assert.equal(walletValue(paid.next.progression.currency),760);
    assert.deepEqual(paid.next.inventory.map(item=>[item.name,item.quantity]),[['น้ำยาฟื้นฟูแผลระดับพื้นฐาน',3],['น้ำยาถอนพิษทั่วไป',3]]);
    assert.equal(paid.next.commerce.receipts.length,1);assert.equal(paid.next.commerce.receipts[0].amount,240);assert.equal(paid.next.commerce.receipts[0].quantity,6);
    assert.ok(paid.session.items.every(entry=>entry.stockKnown===false&&entry.stock===1),'unknown stock never becomes negative or a claimed balance');
    assert.equal(decision(paid.next,paid.session,'confirm',{items:basket}).ok,false);assert.deepEqual(s,before);
});

test('saved unknown-stock baskets recover without repricing the agreed quote or mutating state',()=>{
    const s=state(),c=session(catalog());Object.assign(c,{basket:structuredClone(basket),selectedId:'healing',quote:230,agreed:true,revision:4});s.commerce.sessions.push(c);
    const before=structuredClone(s),prepared=prepareCommerceAction(s,c,'confirm',{items:basket});
    assert.equal(prepared.ok,true,prepared.error);assert.equal(prepared.amount,230);assert.equal(prepared.session.agreed,true);assert.deepEqual(s,before);
});

test('stock is known only from a valid disclosed count; omitted/invalid counts never borrow quoted quantity',()=>{
    for(const raw of [{},{stockKnown:true},{stock:undefined},{stock:null},{stock:''},{stock:false},{stock:-1},{stock:1.5},{stock:100000},{stock:1,stockKnown:false}]){
        const c=session(catalog({...raw,stockKnown:raw.stockKnown,quantity:3,price:90}));assert.ok(c);
        assert.equal(c.items[0].stockKnown,false,JSON.stringify(raw));assert.equal(commerceStockLimit(c.items[0]),null);
    }
    for(const stock of [0,1,3,'3']){const c=session(catalog({stock,stockKnown:undefined}));assert.equal(commerceStockLimit(c.items[0]),Number(stock));}
});

test('known stock below three, including sold out, blocks the whole basket before API or transfer',()=>{
    for(const stock of [0,1,2]){const s=state(),c=session(catalog({stock,stockKnown:true})),before=structuredClone(s);
        for(const action of ['offer','confirm'])assert.equal(prepareCommerceAction(s,c,action,{amount:240,items:basket}).error,'inventory');assert.deepEqual(s,before);
    }
    const s=state(),c=session(catalog({stock:3,stockKnown:true})),paid=decision(s,c,'confirm',{items:basket});assert.equal(paid.ok,true);assert.ok(paid.session.items.every(entry=>entry.stock===0));
});

test('quoted three-bottle line totals remain 90+150, rather than multiplying totals again',()=>{
    const event=catalog({quantity:3});event.items[0].askPrice=90;event.items[1].askPrice=150;
    const s=state(),c=session(event),prepared=prepareCommerceAction(s,c,'confirm',{items:basket});
    assert.equal(prepared.ok,true);assert.equal(prepared.amount,240);assert.equal(decision(s,c,'confirm',{items:basket}).ok,true);
});

test('native task receives null unknown stock, exact selected quantities and one basket total',()=>{
    const s=state(),prepared=prepareCommerceAction(s,session(catalog()),'confirm',{items:basket}),prompt=commerceDecisionPrompt(prepared);
    const ref=JSON.parse(prompt.split('REFERENCE DATA:\n')[1]);assert.ok(ref.interaction.items.every(entry=>entry.stock===null&&entry.stockKnown===false));
    assert.deepEqual(ref.playerAction.items,basket);assert.equal(ref.playerAction.amount,240);
});

test('normal role-play confirmation shares the unknown-stock guard and pays the same complete basket',()=>{
    const s=state(),c=session(catalog()),user='ยืนยันซื้อทั้งสองรายการ จ่าย 240 เหรียญทองแดง';
    Object.assign(c,{basket:structuredClone(basket),selectedId:'healing',quote:240,agreed:true});
    const result=applyCommerceRoleplay(s,c,{sessionId:c.id,revision:0,action:'confirm',amount:240,items:basket,evidence:user,decision:{outcome:'accept',amount:240}},
        {user,userMessageId:2,narrative:'<tr-narrative>เทเรซินารับเงินและส่งมอบยาสองชนิดอย่างละสามขวด</tr-narrative>',source:{messageId:3,turnKey:'3',variant:'paid'}});
    assert.equal(result.ok,true,result.error);assert.equal(walletValue(result.next.progression.currency),760);
    assert.deepEqual(result.next.inventory.map(item=>item.quantity),[3,3]);assert.equal(result.next.commerce.receipts.length,1);
});

test('unknown stock is subject to NPC rejection; insufficient funds retain their guard',()=>{
    const s=state(),c=session(catalog()),before=structuredClone(s),rejected=decision(s,c,'confirm',{items:basket},'reject');
    assert.equal(rejected.ok,true);assert.deepEqual(rejected.next.inventory,[]);assert.equal(walletValue(rejected.next.progression.currency),1000);
    assert.equal(rejected.next.commerce.receipts.length,0);s.progression.currency.silver=2;assert.equal(prepareCommerceAction(s,c,'confirm',{items:basket}).error,'funds');
    s.progression.currency.silver=10;assert.deepEqual(s,before);
});
