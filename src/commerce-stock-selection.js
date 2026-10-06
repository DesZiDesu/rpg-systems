import {readCommercePrices} from './commerce-prices.js?v=0.58.9';

const number='(?:[0-9๐-๙]+(?:,[0-9๐-๙]{3})*|(?:ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|ยี่|สิบ|ร้อย|พัน)+)';
const unit='(?:ขวด|ชิ้น|อัน|เล่ม|ชุด|กล่อง|ใบ|หน่วย|bottles?|pieces?|items?|units?|packs?)';
const normalized=value=>String(value??'').normalize('NFKC').replace(/\s+/gu,' ').trim();
const count=value=>readCommercePrices(`${value} copper`)[0]?.amount;
export function commerceQuantityFacts(text){
    return [...String(text??'').matchAll(new RegExp(`(?<![0-9๐-๙.,-])(${number})\\s*(${unit})(?![a-z])`,'giu'))]
        .map(match=>({quantity:count(match[1]),index:match.index,end:match.index+match[0].length})).filter(f=>Number.isSafeInteger(f.quantity)&&f.quantity>=1&&f.quantity<=99999);
}

// Stock is independent of the quoted lot size and the player's selected count.
// Read only a clearly labelled per-product count; no random local stock rolls.
export function disclosedShopStock(text){
    const source=String(text??''),pattern=new RegExp(`(?:คงเหลือ|เหลือ(?:อยู่|อีก)?|มี(?:อยู่|ทั้งหมด|เหลือ)?|สต็อก(?:เหลือ)?|in stock[: ]*|stock[: ]*)\\s*(${number})\\s*${unit}`,'giu');
    const values=[...source.matchAll(pattern)].map(match=>count(match[1]));
    const unique=[...new Set(values.filter(v=>Number.isSafeInteger(v)&&v>=0&&v<=99999))];
    return unique.length===1?unique[0]:null;
}

export function validateShopSelection(selection,entries,user){
    if(!selection||!Array.isArray(selection.items)||!selection.items.length||selection.items.length>40)return null;
    const evidence=normalized(selection.evidence);
    if(!evidence||!normalized(user).includes(evidence)||/(?:สมมุติ|สมมติ|ถ้า|หาก|ไม่(?:อยาก|ต้องการ)?ซื้อ|ยังไม่ซื้อ|\b(?:if|hypothetical|not buying)\b)/iu.test(evidence))return null;
    const facts=commerceQuantityFacts(evidence),items=[],ids=new Set();
    const all=/(?:ทั้ง(?:หมด|[0-9๐-๙]+|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)|\ball\b)/iu.test(evidence)&&!/(?:อย่างละ|ชนิดละ|each)/iu.test(evidence);
    const named=entries.filter(entry=>normalized(evidence).includes(normalized(entry.item?.name)));
    if(all&&(!named.length||named.length===entries.length)&&(!facts.length||facts.length===1&&facts[0].quantity===entries.length)&&selection.items.length===entries.length
        &&entries.every(entry=>selection.items.some(line=>(line.itemId===entry.id||line.itemId===entry.item?.id||line.itemName===entry.item?.name)&&line.quantity===1)))
        return {evidence,items:entries.map(entry=>({itemId:entry.id,quantity:1}))};
    for(const line of selection.items){
        const matches=entries.filter(entry=>entry.id===line.itemId||entry.item?.id===line.itemId||entry.item?.name===line.itemName);
        if(matches.length!==1||!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>99999||!facts.some(f=>f.quantity===line.quantity)||ids.has(matches[0].id))return null;
        ids.add(matches[0].id);items.push({itemId:matches[0].id,quantity:line.quantity});
    }
    // One count shared by several products needs the player's explicit "each".
    if(items.length>facts.length&&!/(?:อย่างละ|ชนิดละ|each|of each)/iu.test(evidence))return null;
    return {evidence,items};
}

export function selectionFromShopRequest(entries,user){
    const facts=commerceQuantityFacts(user),named=entries.filter(entry=>normalized(user).includes(normalized(entry.item.name)));
    const all=validateShopSelection({evidence:user,items:entries.map(entry=>({itemId:entry.id,quantity:1}))},entries,user);
    if(all&&/(?:ทั้ง(?:หมด|[0-9๐-๙]+|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)|\ball\b)/iu.test(user))return all;
    if(!facts.length||!named.length)return null;
    if(facts.length===1&&/(?:อย่างละ|ชนิดละ|each|of each)/iu.test(user))return validateShopSelection({evidence:user,items:named.map(entry=>({itemId:entry.id,quantity:facts[0].quantity}))},entries,user);
    const items=named.map(entry=>{const start=String(user).indexOf(entry.item.name),end=Math.min(...named.filter(other=>other!==entry).map(other=>String(user).indexOf(other.item.name)).filter(index=>index>start),String(user).length);
        const segment=String(user).slice(start+entry.item.name.length,end),local=commerceQuantityFacts(segment).filter(f=>/^(?:\s*|\s*จำนวน\s*)$/u.test(segment.slice(0,f.index)));return local.length===1?{itemId:entry.id,quantity:local[0].quantity}:null;});
    return items.every(Boolean)?validateShopSelection({evidence:user,items},entries,user):null;
}
