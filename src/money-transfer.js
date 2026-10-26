import {currencyScheme,currencyValue,splitCurrencyValue} from './currency-config.js?v=0.88.5';
import {debitWallet} from './commerce-currency.js?v=0.88.5';
import {auctionFundsValid,auctionReserved} from './auction-core.js?v=0.88.5';
import {commerceFundsValid} from './commerce-engine.js?v=0.88.5';
import {currentItemNpcs} from './item-core.js?v=0.88.5';

const clean=(v,n=180)=>typeof v==='string'?v.trim().slice(0,n):'';
export function normalizeMoneyTransfers(raw){
 const seen=new Set(),receipts=[];
 for(const r of Array.isArray(raw?.receipts)?raw.receipts:[]){
  const id=clean(r?.id),npcId=clean(r?.npcId,120),unit=clean(r?.unit,64);
  if(!id||seen.has(id)||!npcId||!unit||!Number.isSafeInteger(r.amount)||r.amount<=0||r.amount>999999999)continue;
  seen.add(id);receipts.push({id,npcId,npcName:clean(r.npcName,120),unit,unitName:clean(r.unitName,80),amount:r.amount,currencyName:clean(r.currencyName,120),at:clean(r.at,60),location:clean(r.location,200)});
 }
 return{version:1,receipts:receipts.slice(-250)};
}
export function transferRecipients(state,participants=[]){return currentItemNpcs(state,participants);}
function payment(state,amount,unit){
 const wallet=structuredClone(state.progression?.currency||{});
 if(!debitWallet(wallet,amount,unit))return{error:'funds'};
 const next={...state,progression:{...state.progression,currency:wallet}};
 if(!auctionFundsValid(next,state)){
  // Make change from other denominations without consuming the exact coins
  // held by legacy auctions, even when the selected unit has enough coins.
  const held=auctionReserved(state),free=currencyValue(wallet)-currencyValue(held,wallet);
  if(!Number.isSafeInteger(free)||free<0)return{error:'reserved'};
  try{const change=splitCurrencyValue(free,wallet);for(const id of Object.keys(change))wallet[id]=(change[id]||0)+(held[id]||0);}catch{return{error:'reserved'};}
 }
 if(!auctionFundsValid(next,state)||!commerceFundsValid(next,state))return{error:'reserved'};
 return{wallet};
}
// Phone escrow shares exact change and the existing reserved-fund checks.
export function quoteWalletDebit(state,amount,unit){
 if(!Number.isSafeInteger(amount)||amount<=0||amount>999999999||!currencyScheme(state.progression?.currency).units.some(u=>u.id===unit))return {error:'amount'};
 return payment(state,amount,unit);
}
export function transferableAmount(state,unit){
 const wallet=state.progression?.currency,definition=currencyScheme(wallet).units.find(u=>u.id===unit),value=currencyValue(wallet);
 if(!definition||!Number.isSafeInteger(value)||value<0)return 0;
 let low=0,high=Math.min(999999999,Math.floor(value/definition.value));
 while(low<high){const middle=Math.ceil((low+high)/2);if(payment(state,middle,unit).error)high=middle-1;else low=middle;}
 return low;
}
export function quoteMoneyTransfer(state,{npcId,unit,amount},{participants=[]}={}){
 const npc=transferRecipients(state,participants).find(n=>n.id===npcId),definition=currencyScheme(state.progression?.currency).units.find(u=>u.id===unit);
 if(!npc)return{ok:false,error:'recipient'};
 if(!definition)return{ok:false,error:'currency'};
 if(!Number.isSafeInteger(amount)||amount<=0||amount>999999999)return{ok:false,error:'amount'};
 const paid=payment(state,amount,unit);if(paid.error)return{ok:false,error:paid.error};
 return{ok:true,npc,definition,wallet:paid.wallet};
}
export function applyMoneyTransfer(state,request,context={}){
 const ledger=normalizeMoneyTransfers(state.moneyTransfers),id=clean(request?.id);
 if(!id)return{ok:false,error:'request'};
 if(ledger.receipts.some(r=>r.id===id))return{ok:false,error:'duplicate'};
 const quote=quoteMoneyTransfer(state,request,context);if(!quote.ok)return quote;
 const next=structuredClone(state),receipt={id,npcId:quote.npc.id,npcName:quote.npc.name,unit:quote.definition.id,unitName:quote.definition.symbol||quote.definition.name,amount:request.amount,currencyName:state.progression.currency.name||'',at:context.at||new Date().toISOString(),location:state.location?.place||''};
 next.progression.currency=quote.wallet;next.moneyTransfers={version:1,receipts:[...ledger.receipts,receipt].slice(-250)};
 return{ok:true,next,receipt};
}
export function moneyTransferReference(state){return normalizeMoneyTransfers(state.moneyTransfers).receipts.slice(-8);}
export const MONEY_TRANSFER_INSTRUCTIONS='moneyTransfers contains settled player-authorized gifts of money, not shop purchases. The wallet was already debited and the named NPC already received this amount. Never debit, credit, refund, collect or repeat these receipts again merely because you narrate or acknowledge them. A transfer does not grant friendship, consent, knowledge of the player name, or knowledge of the remaining wallet balance.';
