// Poké Mart rules. Pure functions: no host globals, no saving.
// Items stay in the Pokémon journal; money stays in the RoleForge wallet.
// A shop trade is one journal event plus one wallet change, saved together.
import {debitWallet,walletValue} from '../../commerce-currency.js?v=0.95.0';
import {currencyScheme} from '../../currency-config.js?v=0.95.0';

export const SHOP_DEFAULTS=Object.freeze({enabled:true,anywhere:false,sell:true,premier:true,prize:true,penalty:false,rate:1});
export const PRICE_RATES=Object.freeze([0.5,1,1.5,2]);
// Standard Poké Mart stock by badge count, as in the main-series games.
export const MART_TIERS=Object.freeze([
 [0,['poke-ball','potion','antidote','paralyze-heal','awakening','burn-heal','ice-heal','escape-rope']],
 [1,['great-ball','super-potion','repel']],
 [3,['revive','full-heal','super-repel']],
 [5,['ultra-ball','hyper-potion','max-repel']],
 [7,['max-potion']],
 [8,['full-restore']],
]);
// PokeAPI key-item categories (plot, gameplay, event items, data cards).
const KEY_CATEGORIES=new Set([20,21,22,23,41]);
export const PRIZE_RATES=Object.freeze({trainer:40,'gym-leader':100,'elite-four':200,champion:200});
export const TRAINER_CLASSES=Object.freeze(['gym-leader','elite-four','champion']);
export const MAX_TRADE=99,MAX_STOCK=99999;

export function shopSettings(s){const raw=s?.settings?.shop||{},out={...SHOP_DEFAULTS};for(const k of ['enabled','anywhere','sell','premier','prize','penalty'])if(typeof raw[k]==='boolean')out[k]=raw[k];if(PRICE_RATES.includes(raw.rate))out.rate=raw.rate;return out;}
export function nextShopSettings(s,patch){const out=shopSettings(s);if(!patch||typeof patch!=='object')return out;for(const k of ['enabled','anywhere','sell','premier','prize','penalty'])if(typeof patch[k]==='boolean')out[k]=patch[k];if(patch.rate!==undefined){if(!PRICE_RATES.includes(patch.rate))throw Error('Unknown price rate');out.rate=patch.rate;}return out;}

const item=(dex,id)=>dex.items?.get(id);
export function buyable(dex,id){const i=item(dex,id);return Boolean(i&&i.cost>0&&!KEY_CATEGORIES.has(i.category)&&id!=='master-ball');}
export function sellable(dex,id){const i=item(dex,id);return Boolean(i&&i.cost>0&&!KEY_CATEGORIES.has(i.category));}
export function buyPrice(dex,id,s){const i=item(dex,id);return i?Math.max(1,Math.round(i.cost*shopSettings(s).rate)):0;}
export function sellPrice(dex,id,s){return Math.floor(buyPrice(dex,id,s)/2);}
export function premierBonus(s,id,quantity){return shopSettings(s).premier&&id==='poke-ball'?Math.floor(quantity/10):0;}

const key=v=>String(v||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu,' ').trim();
export function samePlace(a,b){const x=key(a),y=key(b);return Boolean(x&&y&&(x===y||x.includes(y)||y.includes(x)));}
// Cities and towns have a Mart in every main-series region; routes, caves and
// forests do not. Shops the story opens are matched by their own place.
const MART_PLACE=/\b(?:city|town|village|pok[eé] ?mart|mart|market|department store|pok[eé]mon cent(?:er|re))\b|เมือง|หมู่บ้าน|ร้าน|ตลาด|ห้าง|ศูนย์โปเกม|ポケモンセンター|フレンドリィショップ/iu;
export function martName(place){const p=String(place||'').trim();return /mart|ร้าน|ショップ/iu.test(p)?p:p+' Poké Mart';}
export function shopAt(s,place){
 const set=shopSettings(s);if(!set.enabled||!s?.started)return null;
 if(s.shop&&samePlace(s.shop.place,place))return s.shop;
 const p=String(place||'').trim().slice(0,120);
 if(p&&MART_PLACE.test(p))return {id:'mart:'+key(p).slice(0,80),name:martName(p).slice(0,120),place:p,kind:'mart'};
 if(set.anywhere)return {id:'sandbox',name:'Poké Mart',place:p,kind:'sandbox'};
 return null;
}

// What this shop sells now. Marts unlock tiers with badges; locked rows say
// how many badges they need.
export function shopStock(s,dex,shop){
 if(!shop)return {items:[],locked:[]};
 const badges=(s?.badges||[]).length,row=id=>({id,price:buyPrice(dex,id,s)});
 if(shop.kind==='mart'){const items=[],locked=[];for(const [need,ids] of MART_TIERS)for(const id of ids){if(!buyable(dex,id))continue;if(badges>=need)items.push(row(id));else locked.push({...row(id),need});}return {items,locked};}
 if(shop.kind==='specialty')return {items:(shop.items||[]).filter(id=>buyable(dex,id)).slice(0,24).map(row),locked:[]};
 return {items:[...dex.items.keys()].filter(id=>buyable(dex,id)).map(row),locked:[]};
}

// Rows for the Sell tab: owned stock, plus held items shown as unsellable.
export function sellRows(s,dex){
 const rows=Object.entries(s?.inventory||{}).filter(([,n])=>n>0).map(([id,quantity])=>({id,quantity,price:sellPrice(dex,id,s),reason:sellable(dex,id)?'':'key'}));
 for(const uid of s?.party||[]){const m=s.pokemon?.[uid];if(m?.heldItem&&item(dex,m.heldItem))rows.push({id:m.heldItem,quantity:0,price:0,reason:'held',holder:uid});}
 return rows;
}

// The wallet unit a shop uses: Poké Dollars when the card has them, otherwise
// the card's smallest unit (1 ₽ = 1 of it).
export function walletUnit(wallet){const units=currencyScheme(wallet).units;return units.find(u=>u.id==='pokedollar')||[...units].sort((a,b)=>a.value-b.value)[0];}
export function walletBalance(wallet){const u=walletUnit(wallet),total=walletValue(wallet);return Number.isSafeInteger(total)?Math.floor(total/u.value):0;}
export function walletSymbol(wallet){const u=walletUnit(wallet);return u?.symbol||(u?.id==='pokedollar'?'₽':'');}
export function walletName(wallet){return walletUnit(wallet)?.name||'';}
// Returns a new RoleForge state with the wallet changed by delta shop units,
// or null when the balance cannot cover a payment.
export function changeWallet(state,delta){
 if(!Number.isSafeInteger(delta)||!state?.progression?.currency)return null;
 const next=structuredClone(state),w=next.progression.currency,u=walletUnit(w);
 if(delta<0){if(!debitWallet(w,-delta,u.id))return null;}
 else if(delta>0){const now=Number(w[u.id])||0;if(!Number.isSafeInteger(now+delta))return null;w[u.id]=now+delta;}
 return Number.isSafeInteger(walletValue(w))?next:null;
}

// Price, total, bonus and the most the player can trade now.
export function quote(s,dex,shop,{kind='buy',id,quantity=1,balance=0}={}){
 const q=Math.floor(Number(quantity)),have=s?.inventory?.[id]||0,set=shopSettings(s);
 if(!shop)return {ok:false,error:'no-shop',max:0};
 if(s?.battle)return {ok:false,error:'battle',max:0};
 if(kind==='sell'){
  if(!set.sell)return {ok:false,error:'sell-off',max:0};
  if(!sellable(dex,id))return {ok:false,error:'key',max:0};
  const price=sellPrice(dex,id,s),max=Math.min(MAX_TRADE,have);
  return {ok:q>=1&&q<=max,error:q>max?'owned':'',price,total:price*q,bonus:0,max};
 }
 const row=shopStock(s,dex,shop).items.find(v=>v.id===id);if(!row)return {ok:false,error:'stock',max:0};
 const max=Math.max(0,Math.min(MAX_TRADE,Math.floor(balance/row.price),MAX_STOCK-have));
 const error=q<1?'quantity':MAX_STOCK-have<q?'full':q>max?'funds':'';
 return {ok:!error,error,price:row.price,total:row.price*q,bonus:premierBonus(s,id,q),max};
}

// Prize money for beating story or built-in trainers: highest level × class rate.
export function trainerPrize(trainer){if(!trainer?.team?.length)return 0;const top=Math.max(...trainer.team.map(m=>Number(m.level)||0));return top*(PRIZE_RATES[trainer.class]||(trainer.badge?PRIZE_RATES['gym-leader']:PRIZE_RATES.trainer));}

// The wallet change a journal step needs, if any: a shop trade, prize money
// for a finished trainer battle, or the optional defeat penalty.
export function walletChange(before,after,event,balance){
 if(event?.type==='shop-buy')return {delta:-event.total,txn:event.id,kind:'buy'};
 if(event?.type==='shop-sell')return {delta:event.total,txn:event.id,kind:'sell'};
 const last=after?.lastBattle;if(!last||!before?.battle||after.battle||last.id!==before.battle.id)return null;
 if(last.prize>0)return {delta:last.prize,txn:'prize-'+last.id,kind:'prize'};
 if(last.penalty>0){const paid=Math.min(last.penalty,Math.max(0,balance));return paid?{delta:-paid,txn:'penalty-'+last.id,kind:'penalty'}:null;}
 return null;
}
