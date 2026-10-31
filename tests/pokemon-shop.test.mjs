import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,activeEvents,journalEvent,worldPrompt,JOURNAL} from '../src/workshop/pokemon/core.js';
import {parsePokemonStory} from '../src/workshop/pokemon/story.js';
import {shopAt,shopStock,sellRows,quote,buyPrice,sellPrice,premierBonus,walletBalance,changeWallet,walletChange,trainerPrize,shopSettings,MART_TIERS} from '../src/workshop/pokemon/shop.js';

const raw=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url)));
raw.expansion=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/expansion.json',import.meta.url)));
const dex=catalogIndex(raw);
let serial=0;const act=(s,type,p={})=>transition(s,{id:'shop-test-'+(++serial),type,...p},dex);
const started=()=>act(initialGame(dex,{initialInventory:{'poke-ball':4,potion:2,'fire-stone':1,'mega-ring':1}}),'starter',{speciesId:1,region:'Kanto'});
const mart={id:'mart:viridian city',name:'Viridian City Poké Mart',place:'Viridian City',kind:'mart'};
const pokeState=(amount=3250)=>({progression:{currency:{name:'Poké Dollars',scheme:{version:1,animated:false,units:[{id:'pokedollar',name:'Poké Dollar',symbol:'₽',aliases:[],value:1,color:'#e3bd64',iconSet:'banknote',icon:'note'}]},pokedollar:amount}}});

test('cities and towns have a Mart; routes do not unless Sandbox is on',()=>{
 const s=started();
 assert.equal(shopAt(s,'Viridian City').kind,'mart');
 assert.equal(shopAt(s,'Viridian City').name,'Viridian City Poké Mart');
 assert.equal(shopAt(s,'เมืองโทคิวะ').kind,'mart');
 assert.equal(shopAt(s,'Route 2'),null);
 const sandbox=act(s,'settings',{shop:{anywhere:true}});
 assert.equal(shopAt(sandbox,'Route 2').kind,'sandbox');
 assert.equal(shopAt(act(s,'settings',{shop:{enabled:false}}),'Viridian City'),null);
});

test('Mart stock unlocks by badge count at catalogue prices',()=>{
 const s=started(),stock=shopStock(s,dex,mart);
 assert.deepEqual(stock.items.map(r=>r.id),MART_TIERS[0][1]);
 assert.equal(stock.items.find(r=>r.id==='poke-ball').price,200);
 assert.equal(stock.locked.find(r=>r.id==='ultra-ball').need,5);
 const one={...s,badges:['brock']};
 assert(shopStock(one,dex,mart).items.some(r=>r.id==='great-ball'));
 assert.equal(buyPrice(dex,'great-ball',one),600);
});

test('quotes cap quantity by money, trade limit and bag space; Premier Ball every 10',()=>{
 const s=started();
 const q=quote(s,dex,mart,{id:'poke-ball',quantity:10,balance:3250});
 assert.deepEqual([q.ok,q.price,q.total,q.bonus,q.max],[true,200,2000,1,16]);
 assert.equal(quote(s,dex,mart,{id:'poke-ball',quantity:17,balance:3250}).error,'funds');
 assert.equal(quote(s,dex,mart,{id:'ultra-ball',quantity:1,balance:9999}).error,'stock');
 assert.equal(premierBonus(s,'poke-ball',25),2);
 assert.equal(premierBonus(act(s,'settings',{shop:{premier:false}}),'poke-ball',25),0);
 assert.equal(quote({...s,battle:{id:'b'}},dex,mart,{id:'poke-ball',quantity:1,balance:999}).error,'battle');
});

test('selling pays half price; key and held items cannot be sold',()=>{
 const s=started();
 assert.equal(sellPrice(dex,'fire-stone',s),1500);
 const rows=sellRows(s,dex);
 assert.equal(rows.find(r=>r.id==='fire-stone').price,1500);
 assert.equal(rows.find(r=>r.id==='mega-ring').reason,'key');
 assert.equal(quote(s,dex,mart,{kind:'sell',id:'mega-ring',quantity:1}).error,'key');
 assert.equal(quote(s,dex,mart,{kind:'sell',id:'potion',quantity:3}).error,'owned');
 assert.equal(quote(act(s,'settings',{shop:{sell:false}}),dex,mart,{kind:'sell',id:'potion',quantity:1}).error,'sell-off');
});

test('shop-buy and shop-sell change only the bag and log the trade',()=>{
 let s=started();
 s=act(s,'shop-buy',{shop:mart,item:'poke-ball',quantity:10,price:200,total:2000,bonus:1});
 assert.equal(s.inventory['poke-ball'],14);
 assert.equal(s.inventory['premier-ball'],1);
 assert.equal(s.logs.at(-1).key,'shop-buy');
 s=act(s,'shop-sell',{shop:mart,item:'fire-stone',quantity:1,price:1500,total:1500});
 assert.equal(s.inventory['fire-stone'],0);
 assert.deepEqual(s.shopsVisited,[{name:'Viridian City Poké Mart',place:'Viridian City'}]);
 assert.throws(()=>act(s,'shop-sell',{shop:mart,item:'potion',quantity:5,total:500}),/Not enough items/);
 assert.throws(()=>act(s,'shop-sell',{shop:mart,item:'mega-ring',quantity:1,total:0}),/cannot be sold/);
 assert.throws(()=>act(s,'shop-buy',{shop:mart,item:'master-ball',quantity:1,total:0}),/not sold/);
 assert.throws(()=>act({...s,battle:{id:'x'}},'shop-buy',{shop:mart,item:'potion',quantity:1,total:200}),/closed during battle/);
});

test('wallet changes use Poké Dollars and never go below zero',()=>{
 const state=pokeState(3250);
 assert.equal(walletBalance(state.progression.currency),3250);
 assert.equal(changeWallet(state,-2000).progression.currency.pokedollar,1250);
 assert.equal(changeWallet(state,-4000),null);
 assert.equal(changeWallet(state,750).progression.currency.pokedollar,4000);
 assert.equal(state.progression.currency.pokedollar,3250,'the original state is untouched');
 const coins={progression:{currency:{gold:1,silver:2,copper:3}}};
 assert.equal(walletBalance(coins.progression.currency),10203,'without Poké Dollars the smallest unit is used');
});

test('trainer wins pay prize money once per battle; defeat penalty is optional',()=>{
 assert.equal(trainerPrize({team:[{level:12},{level:14}]}),560);
 assert.equal(trainerPrize({class:'gym-leader',team:[{level:14}]}),1400);
 assert.equal(trainerPrize({class:'champion',team:[{level:60}]}),12000);
 const before={battle:{id:'b1'}},won={battle:null,lastBattle:{id:'b1',prize:560}};
 assert.deepEqual(walletChange(before,won,{type:'attack'},0),{delta:560,txn:'prize-b1',kind:'prize'});
 assert.equal(walletChange({battle:null},won,{type:'attack'},0),null,'a later action does not pay again');
 assert.deepEqual(walletChange(before,{battle:null,lastBattle:{id:'b1',penalty:280}},{type:'attack'},100),{delta:-100,txn:'penalty-b1',kind:'penalty'});
 assert.equal(shopSettings(initialGame(dex)).prize,true);
 assert.equal(shopSettings(initialGame(dex)).penalty,false);
});

test('story shop events open shops; specialty stock is limited to priced catalogue items',()=>{
 const mk=e=>'You enter the Celadon Department Store.\n<!--roleforge_pokemon:'+JSON.stringify({version:5,events:[{evidence:'You enter the Celadon Department Store.',...e}]})+'-->';
 const ok=parsePokemonStory(mk({type:'shop',name:'Celadon Department Store',place:'Celadon City',kind:'specialty',items:['fire-stone','master-ball','bicycle','water-stone']}),dex);
 assert.equal(ok.events[0].type,'shop-open');
 assert.deepEqual(ok.events[0].items,['fire-stone','water-stone']);
 assert.deepEqual(parsePokemonStory(mk({type:'shop',name:'Nowhere',place:'Nowhere'}),dex).rejected,['unproven-shop']);
 let s=started();s=transition(s,{...ok.events[0]},dex);
 assert.equal(shopAt(s,'Celadon City').kind,'specialty');
 assert.deepEqual(shopStock(s,dex,shopAt(s,'Celadon City')).items.map(r=>r.id),['fire-stone','water-stone']);
});

test('story gym leaders carry their class and award a badge',()=>{
 const text='Brock, the Gym Leader of Pewter Gym, accepts your challenge and the battle begins. Brock sends out Geodude!';
 const parsed=parsePokemonStory(text+'\n<!--roleforge_pokemon:'+JSON.stringify({version:5,events:[{type:'trainer',mode:'immediate',name:'Brock',class:'gym-leader',place:'Pewter Gym',team:[{key:'geodude',level:5}],evidence:text}]})+'-->',dex);
 assert.equal(parsed.events[0].class,'gym-leader');
 const fake=parsePokemonStory('Gary accepts your challenge and the battle begins.\n<!--roleforge_pokemon:'+JSON.stringify({version:5,events:[{type:'trainer',mode:'immediate',name:'Gary',class:'champion',place:'Route 1',team:[{key:'eevee',level:5}],evidence:'Gary accepts your challenge and the battle begins.'}]})+'-->',dex);
 assert.equal(fake.events[0].class,undefined,'a class needs words in the evidence');
});

test('shop trades survive message edits but not swipes',()=>{
 const m={mes:'You enter the Poké Mart.',swipe_id:0,extra:{}};
 const trade=journalEvent({type:'shop-buy',id:'t1',pin:true},m),battle=journalEvent({type:'attack',id:'a1'},m);
 m.extra[JOURNAL]=[trade,battle];
 m.mes='You enter the Poké Mart and wave.';
 assert.deepEqual(activeEvents(m).map(e=>e.id),['t1']);
 m.swipe_id=1;
 assert.deepEqual(activeEvents(m),[]);
});

test('the prompt tells the model shops are window-only and stays under budget',()=>{
 const p=worldPrompt(started(),dex);
 assert(p.includes('Shop window'));
 assert(p.includes('"type":"shop"'));
 assert(p.length<5000);
});

test('beating a story Gym Leader pays prize money and awards one badge',()=>{
 let s=act(initialGame(dex,{started:true,initialParty:[{speciesId:150,level:100}]}),'settings',{});
 s=transition(s,{id:'offer-1',type:'trainer-offer',source:'story',engine:5,trainerKey:'npc-brock',name:'Brock',place:'Pewter Gym',class:'gym-leader',mode:'immediate',team:[{key:'magikarp',level:3}],equipment:{},context:{place:'Pewter Gym'}},dex);
 assert(s.battle?.trainer,'the battle starts');
 assert.equal(s.battle.trainer.class,'gym-leader');
 for(let i=0;s.battle&&i<20;i++){const move=s.pokemon[s.battle.activeUid].moves.find(v=>v.pp>0&&dex.moves[v.id]?.power>0);s=act(s,'attack',{moveId:move.id,engine:4});}
 assert.equal(s.battle,null);
 assert.equal(s.lastBattle.result,'victory');
 assert.equal(s.lastBattle.prize,300);
 assert.deepEqual(s.badges,['npc-brock']);
 assert.equal(s.logs.findLast(v=>v.key==='trainer-victory').prize,300);
 const off=act(s,'settings',{shop:{prize:false}});
 assert.equal(shopSettings(off).prize,false);
});
