// Read explicit currency phrases, including prices naturally spoken in Thai.
// This does not invent a quote, convert currency or decide a transaction.
import {currencyAliases,currencyScheme} from './currency-config.js?v=0.64.1';
const thaiTokens=/ศูนย์|หนึ่ง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|หมื่น|แสน/gu;
const digits={ศูนย์:0,หนึ่ง:1,เอ็ด:1,สอง:2,ยี่:2,สาม:3,สี่:4,ห้า:5,หก:6,เจ็ด:7,แปด:8,เก้า:9};
const scales={สิบ:10,ร้อย:100,พัน:1000,หมื่น:10000,แสน:100000};
const amountPattern='(?:[0-9๐-๙]+(?:,[0-9๐-๙]{3})*|(?:ศูนย์|หนึ่ง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|หมื่น|แสน|ล้าน)+)';
export const COMMERCE_PRICE_PATTERN=new RegExp(amountPattern+'\\s*(?:เหรียญ\\s*)?(?:gold|silver|copper|ทองแดง|ทอง|เงิน)','iu');
const escapeRx=v=>v.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
export function commercePricePattern(configuration){if(!configuration?.scheme&&!configuration?.currencyScheme&&!configuration?.units)return COMMERCE_PRICE_PATTERN;const aliases=currencyAliases(configuration).map(d=>escapeRx(d.alias)).join('|');return new RegExp(`(?:${amountPattern}\\s*(?:เหรียญ\\s*)?(?:${aliases})|(?:${aliases})\\s*${amountPattern})`,'iu');}
function thaiNumber(source){
    if(source.includes('ล้าน')){const parts=source.split('ล้าน');if(parts.length!==2)return null;
        const high=parts[0]?thaiNumber(parts[0]):1,low=parts[1]?thaiNumber(parts[1]):0;return high===null||low===null?null:high*1000000+low;}
    const tokens=source.match(thaiTokens)||[];if(tokens.join('')!==source)return null;
    let total=0,digit=null,previousScale=Infinity;
    for(let i=0;i<tokens.length;i++){const token=tokens[i];
        if(Object.hasOwn(digits,token)){
            if(digit!==null||token==='ยี่'&&tokens[i+1]!=='สิบ'||token==='เอ็ด'&&(i!==tokens.length-1||total===0))return null;
            digit=digits[token];
        }else{const scale=scales[token];if(scale>=previousScale)return null;total+=(digit??1)*scale;digit=null;previousScale=scale;}
    }
    return total+(digit??0);
}
export function readCommercePrices(value,configuration){
    const source=String(value??'').replace(/<[^>]*>/gu,' ').normalize('NFKC');
    const configured=configuration?.scheme||configuration?.currencyScheme||configuration?.units;
    const aliases=configured?currencyAliases(configuration).map(d=>({...d,alias:d.alias.normalize('NFKC')})):[{alias:'gold',id:'gold'},{alias:'silver',id:'silver'},{alias:'copper',id:'copper'},{alias:'ทองแดง',id:'copper'},{alias:'ทอง',id:'gold'},{alias:'เงิน',id:'silver'}];
    const units=Object.fromEntries(aliases.map(d=>[d.alias.toLocaleLowerCase(),d.id]));
    const escaped=aliases.map(d=>d.alias.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')).sort((a,b)=>b.length-a.length).join('|');
    const symbols=configured?currencyScheme(configuration).units.map(d=>d.symbol).filter(Boolean).map(escapeRx).join('|'):'';
    const pattern=new RegExp(`(?<![0-9๐-๙.,])(?:(${amountPattern})\\s*(?:เหรียญ\\s*)?(${escaped})(?![a-z])${symbols?`|(${symbols})\\s*(${amountPattern})(?![0-9๐-๙]|[.,][0-9๐-๙])`:''})`,'giu');
    return [...source.matchAll(pattern)].flatMap(match=>{
        const number=(match[1]||match[4]).replaceAll(',','').replace(/[๐-๙]/gu,c=>'๐๑๒๓๔๕๖๗๘๙'.indexOf(c));
        const amount=/^[0-9]+$/u.test(number)?Number(number):thaiNumber(number);
        return Number.isSafeInteger(amount)&&amount>=0&&amount<=999999999?[{amount,denomination:units[(match[2]||match[3]).toLocaleLowerCase()],text:match[0]}]:[];
    });
}
