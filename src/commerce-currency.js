// Established denomination values. Wallet changes conserve copper value.
export const CURRENCY_VALUES=Object.freeze({gold:10000,silver:100,copper:1});
export const CURRENCY_RULE='Established exchange rate: 1 gold = 100 silver; 1 silver = 100 copper. Amounts and NPC budgets in commerce decisions use the interaction denomination. Convert explicit player prices at this rate; never compare bare numbers across denominations. The engine makes exact change, without a conversion fee.';
export const walletValue=wallet=>Object.entries(CURRENCY_VALUES).reduce((total,[unit,value])=>total+(wallet?.[unit]||0)*value,0);
export function convertMoney(amount,from,to){
    if(!Number.isSafeInteger(amount)||amount<0||!CURRENCY_VALUES[from]||!CURRENCY_VALUES[to])return null;
    const converted=amount*CURRENCY_VALUES[from]/CURRENCY_VALUES[to];
    return Number.isSafeInteger(converted)&&converted<=999999999?converted:null;
}
export function debitWallet(wallet,amount,unit){
    if(!Number.isSafeInteger(amount)||amount<0||!CURRENCY_VALUES[unit])return false;
    const remainder=walletValue(wallet)-amount*CURRENCY_VALUES[unit];
    if(!Number.isSafeInteger(remainder)||remainder<0)return false;
    if(wallet[unit]>=amount){wallet[unit]-=amount;return true;}
    let value=remainder;
    const result={};for(const [coin,factor]of Object.entries(CURRENCY_VALUES)){result[coin]=Math.floor(value/factor);value%=factor;}
    if(Object.values(result).some(count=>count>999999999))return false;
    Object.assign(wallet,result);return true;
}
