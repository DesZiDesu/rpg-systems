// Denomination IDs remain stable protocol keys; names, rates and art are world
// configuration. The smallest unit is one ledger point, so migration is exact.
export const CURRENCY_KEYS=Object.freeze(['gold','silver','copper']);
export const DEFAULT_CURRENCY_VALUES=Object.freeze({gold:10000,silver:100,copper:1});
export const MONEY_ICON_SETS=Object.freeze(['stack','minted','outline','pixel','banknote','gem','crest','neon']);
export const MONEY_ICON_SHAPES=Object.freeze(['default','coin','note','gem','token']);
const clean=(v,n=80)=>typeof v==='string'?v.trim().slice(0,n):'';
const key=v=>clean(v).normalize('NFKC').toLocaleLowerCase();
const whole=n=>Number.isSafeInteger(n)&&n>0&&n<=999999999;
const defaults=[{id:'gold',name:'Gold',symbol:'',aliases:['ทอง','เหรียญทอง'],value:10000,color:'#dfbf65'},{id:'silver',name:'Silver',symbol:'',aliases:['เงิน','เหรียญเงิน'],value:100,color:'#c0c8d2'},{id:'copper',name:'Copper',symbol:'',aliases:['ทองแดง','เหรียญทองแดง'],value:1,color:'#c58c65'}];
export function defaultCurrencyScheme(){return {version:1,animated:true,units:defaults.map(d=>({...d,aliases:[...d.aliases],iconSet:'stack',icon:'default'}))};}
export function validateCurrencyScheme(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.units)||raw.units.length<1||raw.units.length>3)throw Error('Choose 1–3 currency units. / เลือกค่าเงิน 1–3 หน่วย');
 const ids=new Set(),names=new Map();
 const units=raw.units.map(d=>{
  const name=clean(d?.name),symbol=clean(d?.symbol,12);
  if(!CURRENCY_KEYS.includes(d?.id)||ids.has(d.id)||!name||!whole(d.value))throw Error('Each currency needs a unique unit, name and positive integer rate. / แต่ละหน่วยต้องมีชื่อและอัตราแลกจำนวนเต็ม');
  ids.add(d.id);
  const aliases=[...new Set((Array.isArray(d.aliases)?d.aliases:[]).map(a=>clean(a,40)).filter(Boolean))].slice(0,12);
  for(const alias of [name,...aliases,...(symbol?[symbol]:[])]){const normalized=key(alias);if(names.has(normalized)&&names.get(normalized)!==d.id)throw Error('Currency names, aliases and symbols must be distinct. / ชื่อและสัญลักษณ์ค่าเงินต้องไม่ซ้ำกัน');names.set(normalized,d.id);}
  return {id:d.id,name,symbol,aliases,value:d.value,iconSet:MONEY_ICON_SETS.includes(d.iconSet)?d.iconSet:'stack',icon:MONEY_ICON_SHAPES.includes(d.icon)?d.icon:'default',color:/^#[a-f0-9]{6}$/iu.test(d.color||'')?d.color:defaults.find(v=>v.id===d.id).color};
 }).sort((a,b)=>b.value-a.value);
 if(units.at(-1).value!==1)throw Error('The smallest currency unit must equal 1. / หน่วยเล็กสุดต้องมีค่าเท่ากับ 1');
 for(let i=0;i<units.length-1;i++)if(units[i].value<=units[i+1].value||units[i].value%units[i+1].value!==0)throw Error('Rates must convert exactly to the next smaller unit. / อัตราแลกต้องหารลงตัวกับหน่วยเล็กถัดไป');
 return {version:1,animated:raw.animated!==false,units};
}
export function normalizeCurrencyScheme(raw,fallback=null){try{return raw?validateCurrencyScheme(raw):fallback;}catch{return fallback;}}
export function currencyScheme(value){return normalizeCurrencyScheme(value?.scheme||value?.currencyScheme||value?.units&&value)||defaultCurrencyScheme();}
export function currencyValues(value){return Object.fromEntries(currencyScheme(value).units.map(d=>[d.id,d.value]));}
export function currencyUnit(value,id){return currencyScheme(value).units.find(d=>d.id===id)||null;}
export function currencyUnitLabel(value,id){const unit=currencyUnit(value,id);return unit?unit.symbol||unit.name:id;}
export function currencyRule(value){
 if(!value?.scheme&&!value?.currencyScheme&&!value?.units)return 'Established exchange rate: 1 gold = 100 silver; 1 silver = 100 copper. Amounts and NPC budgets in commerce decisions use the interaction denomination. Convert explicit player prices at this rate; never compare bare numbers across denominations. The engine makes exact change, without a conversion fee.';
 const scheme=currencyScheme(value);
 return '[CONFIGURED WORLD CURRENCY] Only these units exist: '+JSON.stringify(scheme.units.map(({id,name,symbol,aliases,value})=>({protocolId:id,name,symbol,aliases,ledgerValue:value})))+'. Use configured names/symbols in narration and canonical protocolId in every patch, quote, budget, auction, deposit, refund and transaction. Never introduce disabled Gold/Silver/Copper names. Convert amounts with these ledger values, make exact change without a fee, and never compare numbers in different denominations. '+scheme.units.slice(0,-1).map((u,i)=>`1 ${u.name} = ${u.value/scheme.units[i+1].value} ${scheme.units[i+1].name}`).join('; ');
}
export function currencyValue(wallet,configuration=wallet){const values=currencyValues(configuration);let total=0;for(const id of CURRENCY_KEYS){if(!values[id])continue;const amount=Number(wallet?.[id]??0),value=amount*values[id];if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(value)||!Number.isSafeInteger(total+value))return NaN;total+=value;}return total;}
export function splitCurrencyValue(value,configuration){
 if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid currency value');
 const out={gold:0,silver:0,copper:0};let remaining=BigInt(value);
 for(const unit of currencyScheme(configuration).units){const rate=BigInt(unit.value);out[unit.id]=Number(remaining/rate);remaining%=rate;if(out[unit.id]>999999999)throw Error('The balance exceeds the supported currency limit. / ยอดเงินเกินขีดจำกัด');}
 return out;
}
export function currencySchemeLocked(state){return (state?.commerce?.sessions||[]).some(s=>['offered','open'].includes(s.status))
 ||(state?.auctions||[]).some(a=>['Joined','Open'].includes(a.status))
 ||(state?.marketplace?.listings||[]).some(l=>['Active','Negotiating'].includes(l.status))
 ||(state?.commerce?.rights||[]).some(r=>(r.depositPaid||0)>(r.depositRefunded||0));}
export function reconfigureCurrencyWallet(state,scheme,name){
 const next=structuredClone(state),configuration=validateCurrencyScheme(scheme),wallet=state?.progression?.currency||{};
 const old=currencyScheme(wallet),economic=s=>JSON.stringify(s.units.map(({id,name,symbol,aliases,value})=>({id,name,symbol,aliases,value})));
 if((economic(old)!==economic(configuration)||(clean(name,120)||wallet.name)!==wallet.name)&&currencySchemeLocked(state))throw Error('Finish or cancel active trades and refundable deposits before changing currency. / จบรายการซื้อขายและมัดจำที่ยังค้างก่อนเปลี่ยนค่าเงิน');
 const value=currencyValue(wallet);if(!Number.isSafeInteger(value)||value<0)throw Error('The existing currency balance is invalid.');
 const changed=economic(old)!==economic(configuration);
 next.progression.currency={name:clean(name,120)||wallet.name||'Currency',...(!changed?Object.fromEntries(CURRENCY_KEYS.map(id=>[id,Number(wallet[id])||0])):splitCurrencyValue(value,configuration)),scheme:configuration};
 // Party and guild wallets use the same world denomination scheme.
 if(changed){
  const migrate=balance=>balance?splitCurrencyValue(currencyValue(balance,wallet),configuration):balance;
  if(next.social?.party?.sharedFunds)next.social.party.sharedFunds=migrate(next.social.party.sharedFunds);
  for(const guild of next.social?.guilds||[])if(guild.treasury)guild.treasury=migrate(guild.treasury);
 }
 return next;
}
export function currencyDisplay(wallet){const scheme=currencyScheme(wallet);return scheme.units.map(d=>({...d,animated:scheme.animated,amount:Number(wallet?.[d.id])||0}));}
export function currencyAliases(value){const units=currencyScheme(value).units,publicAliases=units.flatMap(d=>[d.name,...d.aliases,...(d.symbol?[d.symbol]:[])].map(alias=>({alias,id:d.id})));return [...publicAliases,...units.filter(d=>!publicAliases.some(a=>key(a.alias)===d.id&&a.id!==d.id)).map(d=>({alias:d.id,id:d.id}))].sort((a,b)=>b.alias.length-a.alias.length);}
