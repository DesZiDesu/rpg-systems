import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceRepairReference,requestCommerceRepair,validateCommerceRepair} from '../src/commerce-repair.js';
import {createCommerceRuntime} from '../src/commerce-runtime.js';
import {repairedBooks,bookChat,bundleStory,bookNames} from './fixtures/commerce-repair-books.mjs';
const state=()=>({player:{name:'Noah'},npcs:[],skills:[],inventory:[],location:{place:'Oakland Bookstore'},progression:{currency:{gold:0,silver:100,copper:0}}});
const reference=()=>({...commerceRepairReference({chat:bookChat()},{messageId:3,kind:'buy',state:state()}),eventId:'repair-books'});
const source={messageId:3,turnKey:'3',variant:bundleStory};
test('repair resolves the exact earlier three books and current discounted total without inventing unit prices or teaching skills',()=>{
 const r=validateCommerceRepair(repairedBooks(),reference(),source);assert.ok(r);
 assert.deepEqual(r.session.items.map(e=>e.item.name),bookNames);assert.deepEqual(r.session.items.map(e=>e.askPrice),[15,20,10]);assert.deepEqual(r.session.basket.map(e=>e.quantity),[1,1,1]);assert.equal(r.session.quote,40);assert.equal(r.session.agreed,false);
 assert.ok(r.session.items.every(e=>e.item.usage.learns.length===1));assert.deepEqual(state().skills,[]);
});
for(const [name,mutate] of [
 ['missing usage',r=>delete r.marketplace.items[0].usage],['missing effects',r=>delete r.marketplace.items[0].usage.stats],['missing learns',r=>delete r.marketplace.items[0].usage.learns],['invalid stat path',r=>r.marketplace.items[0].usage.stats=[{stat:'__proto__.polluted',operation:'inc',value:1}]],['invented book',r=>r.marketplace.items[0].name='Divine Fire'],['invented unit price',r=>r.marketplace.items[0].price=40],['invented discount',r=>r.basketQuote.amount=30],['old undiscounted total',r=>r.basketQuote.amount=45],['unknown money',r=>r.basketQuote.denomination='gems'],['missing current bundle quote',r=>delete r.basketQuote],['three copies of each',r=>r.selection.items.forEach(e=>e.quantity=3)],['invented count',r=>r.selection.items[0].quantity=2],['duplicate selection',r=>r.selection.items[1].itemId=r.selection.items[0].itemId],['payment ops',r=>r.ops=[['inc','progression.currency.silver',-40]]],['sale decision',r=>r.commerce={action:'confirm'}],['other merchant',r=>r.marketplace.seller.name='Mira'],['other place',r=>r.marketplace.location='Other shop'],['missing stock status',r=>delete r.marketplace.items[0].stockKnown],['invalid learning',r=>r.marketplace.items[0].usage.learns[0].kind='customPreset']
])test(`repair rejects ${name}`,()=>{const r=repairedBooks();mutate(r);assert.equal(validateCommerceRepair(r,reference(),source),null);});
test('repair cannot manufacture missing names from planning or reuse another merchant, place or settled offer',()=>{
 for(const [name,configure] of [
  ['planning',c=>c.chat[1].mes='<planning>'+c.chat[1].mes+'</planning>'],
  ['other merchant',c=>c.chat[1].mes=c.chat[1].mes.replaceAll('Barth','Mira')],
  ['previous location',c=>c.locationFor=id=>id===1?'Old shop':null],
  ['settled',c=>c.record=id=>id===1?{commerceOpening:{status:'settled'}}:null],
 ]){const c={chat:bookChat()};configure(c);const r=commerceRepairReference(c,{messageId:3,kind:'buy',state:state(),locationFor:c.locationFor,record:c.record});assert.equal(validateCommerceRepair(repairedBooks(),{...r,eventId:'repair'},source),null,name);}
});
test('one native repair API receives public history and full definitions contract, without a story-preset retry',async()=>{
 let calls=0,quiet=0;const r=reference();await requestCommerceRepair({generateRaw:async a=>{calls++;assert.match(a.systemPrompt,/COMPLETE ITEM DEFINITIONS/);assert.match(a.prompt,/Wind Arrow/);assert.match(a.prompt,/COMMERCE REPAIR REFERENCE DATA/);return '{}';},generateQuietPrompt:async()=>quiet++},r);assert.equal(calls,1);assert.equal(quiet,0);
 await assert.rejects(requestCommerceRepair({generateRaw:async()=>{throw Error('Offline');},generateQuietPrompt:async()=>quiet++},r));assert.equal(quiet,0);
});
test('a repaired sell offer uses only owned goods and a disclosed current price without inventing buyer funds or lot quantity',()=>{
 const ref={kind:'sell',location:'Hall',eventId:'repair-sale',user:'ขาย Potion แล้วกัน',story:'<tr-dialogue name="Mira">I offer to buy your Potion for 6 silver.</tr-dialogue>',inventory:[{id:'potion',name:'Potion',quantity:3,category:'Consumable'}]};ref.facts=ref.story;
 const raw={marketplace:{kind:'npcPurchase',location:'Hall',buyer:{name:'Mira'},item:{itemId:'potion',itemName:'Potion',quantity:1},askPrice:6,denomination:'silver'}};
 const result=validateCommerceRepair(raw,ref,{messageId:1,variant:ref.story});assert.equal(result.session.kind,'sell');assert.equal(result.session.quote,6);assert.equal(result.session.items[0].item.id,'potion');
 const all=structuredClone(raw);all.marketplace.item.quantity=3;assert.equal(validateCommerceRepair(all,ref,{}),null);
 assert.equal(validateCommerceRepair(raw,{...ref,inventory:[]},{}),null);
 raw.marketplace.buyer.budget=100;assert.equal(validateCommerceRepair(raw,ref,{}),null);
});
test('repair rejects invented stock, obsolete named prices, incomplete all-goods lists and a refused or future discount',()=>{
 const invented=repairedBooks();invented.marketplace.items[0].stockKnown=true;invented.marketplace.items[0].stock=10;assert.equal(validateCommerceRepair(invented,reference(),source),null);
 const ref=reference();ref.facts+='\n<tr-dialogue name="Barth">Wind Arrow ราคา 25 เหรียญเงิน</tr-dialogue>';assert.equal(validateCommerceRepair(repairedBooks(),ref,source),null);
 const short=repairedBooks();short.marketplace.items.pop();short.selection.items.pop();const all=reference();all.user='ซื้อทั้งหมดแล้วกัน';short.selection.evidence=all.user;assert.equal(validateCommerceRepair(short,all,source),null);
 for(const prefix of ['ข้าไม่ตกลงให้','พรุ่งนี้จะขายรวม']){const r=repairedBooks(),ref=reference();r.basketQuote.evidence=prefix+' 40 เหรียญเงิน รวมทั้งหมด';ref.story=`<tr-dialogue name="Barth">${r.basketQuote.evidence}</tr-dialogue>`;assert.equal(validateCommerceRepair(r,ref,source),null);}
});
test('an all-books repair cannot substitute a duplicate product for the missing third title',()=>{
 const raw=repairedBooks();raw.marketplace.items[1].name='Wind Arrow';raw.marketplace.items[1].price=15;
 assert.equal(validateCommerceRepair(raw,reference(),source),null);
 const sameId=repairedBooks();sameId.marketplace.items[1].id='book-0';assert.equal(validateCommerceRepair(sameId,reference(),source),null);
});
function fixture(){
 let saved=state(),calls=0,commits=0,busy=false;const context={chatMetadata:{},chat:bookChat(),getCurrentChatId:()=> 'books',saveMetadata:async()=>{},generateRaw:async()=>{calls++;return JSON.stringify(repairedBooks());}};
 const settings={enableMarketplace:true,enableAuctions:false,autoTrack:true,language:'th'};
 const runtime=createCommerceRuntime({document:{},context:()=>context,state:()=>structuredClone(saved),settings:()=>settings,turnKey:id=>String(id),variant:m=>m.mes,record:()=>null,visible:v=>v,parse:JSON.parse,isBusy:()=>busy,setBusy:v=>busy=v,recordRequest:()=>{},commitOpening:async({next,unchanged})=>{assert.equal(unchanged(),true);commits++;saved=next;}});
 return{runtime,context,settings,state:()=>saved,calls:()=>calls,commits:()=>commits};
}
test('explicit repair saves only an open basket; reload, duplicate clicks and refresh do not purchase or call another API',async()=>{
 const f=fixture(),token=f.runtime.view().token,chat=structuredClone(f.context.chat);assert.equal((await f.runtime.repairOpening({token})).ok,true);assert.equal(f.calls(),1);assert.equal(f.commits(),1);assert.equal(f.state().commerce.sessions[0].quote,40);assert.equal(f.state().progression.currency.silver,100);assert.equal(f.state().inventory.length,0);assert.equal(f.state().skills.length,0);assert.deepEqual(f.context.chat,chat);
 assert.equal((await f.runtime.repairOpening({token})).error,'stale');f.runtime.refresh();f.runtime.refresh();assert.equal(f.calls(),1);assert.equal(f.runtime.view().session.quote,40);f.runtime.destroy();
});
test('malformed data and API failures allow an explicit retry with no automatic extra request or state change',async()=>{
 const f=fixture(),before=structuredClone(f.state());let calls=0;f.context.generateRaw=async()=>{calls++;if(calls===1)throw Error('Offline');if(calls===2)return '{}';return JSON.stringify(repairedBooks());};
 for(const code of ['opening-api','opening-data']){const result=await f.runtime.repairOpening({token:f.runtime.view().token});assert.equal(result.error,code);assert.deepEqual(f.state(),before);assert.equal(f.commits(),0);assert.ok(f.runtime.view().error);}
 assert.equal((await f.runtime.repairOpening({token:f.runtime.view().token})).ok,true);assert.equal(calls,3);assert.equal(f.commits(),1);f.runtime.destroy();
});
test('repair reads provider data before story regexes and saves the basket without payment',async()=>{
 const f=fixture();let calls=0;f.context.mainApi='openai';f.context.chatCompletionSettings={openai_max_tokens:4096};
 f.context.generateRaw=async()=>{throw Error('No message generated by story regex');};
 f.context.generateRawData=async()=>{calls++;return {choices:[{message:{content:JSON.stringify(repairedBooks())},finish_reason:'stop'}]};};
 f.context.extractMessageFromData=data=>data.choices[0].message.content;
 assert.equal((await f.runtime.repairOpening({token:f.runtime.view().token})).ok,true);assert.equal(calls,1);assert.equal(f.commits(),1);assert.equal(f.state().commerce.sessions[0].quote,40);assert.equal(f.state().progression.currency.silver,100);assert.equal(f.state().inventory.length,0);f.runtime.destroy();
});
test('repair distinguishes empty content, truncation and provider failure and retains the cause without changing funds',async()=>{
 const f=fixture(),before=structuredClone(f.state());f.context.mainApi='openai';f.context.extractMessageFromData=data=>data.choices[0].message.content;
 for(const [finish,content,expected] of [['stop','','opening-empty'],['length','{"marketplace":','opening-truncated']]){
  let calls=0;f.context.generateRawData=async()=>{calls++;return {choices:[{message:{content},finish_reason:finish}]};};
  assert.equal((await f.runtime.repairOpening({token:f.runtime.view().token})).error,expected);assert.equal(calls,1);assert.deepEqual(f.state(),before);assert.equal(f.commits(),0);
  const report=JSON.parse(f.runtime.view().diagnostics);assert.equal(report.generation,'native-data');assert.equal(report.rawResponse,content);assert.ok(report.details.providerError);
 }
 f.context.generateRawData=async()=>{throw {error:{message:'Provider rejected request'}};};
 assert.equal((await f.runtime.repairOpening({token:f.runtime.view().token})).error,'opening-api');assert.equal(JSON.parse(f.runtime.view().diagnostics).details.providerError,'Provider rejected request');f.runtime.destroy();
});
for(const [name,mutate] of [['chat switch',f=>f.context.chatMetadata={}],['new turn',f=>f.context.chat.push({is_user:true,mes:'Next'})],['edit latest reply',f=>f.context.chat[3].mes+='edit'],['edit referenced old catalog',f=>f.context.chat[1].mes+='edit'],['swipe',f=>f.context.chat[3].swipe_id=1],['disable marketplace',f=>f.settings.enableMarketplace=false],['cancel',f=>f.runtime.cancel()]])test(`late repair is discarded after ${name} and double click cannot start a second request`,async()=>{
 const f=fixture();let release,calls=0;f.context.generateRaw=()=>{calls++;return new Promise(r=>release=r);};const token=f.runtime.view().token,pending=f.runtime.repairOpening({token});assert.equal(f.runtime.view().pending.repairing,true);assert.equal((await f.runtime.repairOpening({token})).error,'stale');mutate(f);release(JSON.stringify(repairedBooks()));assert.equal((await pending).error,'stale');assert.equal(calls,1);assert.equal(f.commits(),0);assert.equal(f.state().progression.currency.silver,100);assert.equal(f.state().inventory.length,0);f.runtime.destroy();
});
test('save failure leaves the pending offer retryable without payment',async()=>{
 const f=fixture();f.context.saveMetadata=async()=>{throw Error('Offline');};
 // The host commit adapter, not the runtime, owns rollback of persisted data.
 const runtime=createCommerceRuntime({document:{},context:()=>f.context,state:f.state,settings:()=>f.settings,turnKey:id=>String(id),variant:m=>m.mes,record:()=>null,visible:v=>v,parse:JSON.parse,isBusy:()=>false,setBusy:()=>{},recordRequest:()=>{},commitOpening:async()=>{throw Error('save');}});
 assert.equal((await runtime.repairOpening({token:runtime.view().token})).error,'save');assert.equal(f.state().progression.currency.silver,100);assert.equal(f.state().inventory.length,0);assert.equal(runtime.view().pending.kind,'buy');runtime.destroy();f.runtime.destroy();
});
