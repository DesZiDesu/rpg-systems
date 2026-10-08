import {DEFAULT_CURRENCY_VALUES,currencyValues,currencyValue,currencyRule,splitCurrencyValue} from './currency-config.js?v=0.61.0';
export const CURRENCY_VALUES=DEFAULT_CURRENCY_VALUES;
export const CURRENCY_RULE=currencyRule();
export const walletValue=currencyValue;
export function convertMoney(amount,from,to,configuration){
    const values=currencyValues(configuration);
    if(!Number.isSafeInteger(amount)||amount<0||!values[from]||!values[to])return null;
    const value=BigInt(amount)*BigInt(values[from]),rate=BigInt(values[to]);
    if(value%rate)return null;
    const converted=value/rate;
    return converted<=999999999n?Number(converted):null;
}
export function debitWallet(wallet,amount,unit){
    const values=currencyValues(wallet);
    if(!Number.isSafeInteger(amount)||amount<0||!values[unit])return false;
    const balance=walletValue(wallet),cost=amount*values[unit];
    if(!Number.isSafeInteger(balance)||!Number.isSafeInteger(cost))return false;
    const remainder=balance-cost;
    if(!Number.isSafeInteger(remainder)||remainder<0)return false;
    if(wallet[unit]>=amount){wallet[unit]-=amount;return true;}
    let result;try{result=splitCurrencyValue(remainder,wallet);}catch{return false;}
    Object.assign(wallet,result);return true;
}
