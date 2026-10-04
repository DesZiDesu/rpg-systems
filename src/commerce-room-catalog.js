import {COMMERCE_PRICE_PATTERN,readCommercePrices} from './commerce-prices.js?v=0.54.0';
import {storyMinute} from './commerce-rights.js?v=0.54.0';
import {commerceRequestHint,commerceDiscussionOnly} from './commerce-intent.js?v=0.54.0';

// Compile only facts already present in a Thai inn's current reply. No model
// request, invented room number, stock, hidden feature or default stay length.
export function disclosedRoomCatalog(story,user,location,{clock,eventId}={}){
    if(!location||commerceRequestHint(user)!=='buy'||commerceDiscussionOnly(user)||storyMinute(clock)===null)return null;
    const source=String(story??'');
    const dialogue=[...source.matchAll(/<tr-dialogue\b[^>]*\bname=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tr-dialogue>/giu)]
        .filter(m=>/ห้อง/iu.test(m[2])&&/(?:คืนละ|ต่อคืน)/iu.test(m[2]));
    if(dialogue.length!==1)return null;
    const [,seller,quote]=dialogue[0];
    if(/(?:สมมุติ|สมมติ|ลือว่า|ห้อง(?:พัก)?(?:เต็ม|หมด|ไม่ว่าง)|ไม่มีห้อง|ยังไม่ได้เปิด|ยังไม่เปิด|จะเปิด(?:ร้าน|โรงเตี๊ยม)|พรุ่งนี้จะมี)/iu.test(quote))return null;
    // Require an actual key in this reply and a public, unambiguous checkout.
    // "return tomorrow" alone cannot determine an invented checkout hour.
    const deadline=quote.match(/คืนกุญแจ(?:[^.!?。\n]{0,25}?)(ก่อน(?:เวลา)?|ตอน|เวลา)?\s*(เที่ยง(?:วัน)?|(?:[01]?\d|2[0-3]):[0-5]\d)([^.!?。\n]{0,12}?)(พรุ่งนี้|วันนี้)/u);
    if(!deadline)return null;
    const time=/เที่ยง/u.test(deadline[2])?'12:00':deadline[2].padStart(5,'0');
    const validUntil={day:clock.day+(deadline[4]==='พรุ่งนี้'?1:0),time};
    if(storyMinute(validUntil)<=storyMinute(clock))return null;
    const keysPresented=/(?:หยิบ|ยื่น|ส่ง|วาง|นำ|พวง)[^.!?。\n]{0,80}กุญแจ|กุญแจ[^.!?。\n]{0,80}(?:วาง|ยื่น|ส่ง|ให้|บนโต๊ะ|บนเคาน์เตอร์)/iu.test(source.replace(/<[^>]*>/gu,' '));
    if(!keysPresented)return null;
    // Deposits/extra fees need structured AI terms; do not guess which room a
    // second money phrase belongs to or silently drop an announced surcharge.
    if(/(?:มัดจำ|ค่าประกัน|ค่าธรรมเนียม|ค่าเข้า|ค่าบริการเพิ่ม)/u.test(quote))return null;
    const pattern=new RegExp(`(ห้อง(?:พัก)?[^.!?。\\n]{0,160}?)\\s*(?:ก็)?\\s*(?:คืนละ|ต่อคืน)\\s*(${COMMERCE_PRICE_PATTERN.source})`,'giu');
    const options=[...quote.matchAll(pattern)];
    if(!options.length||options.length>8||readCommercePrices(quote).length!==options.length)return null;
    const rules=quote.match(/(?:กฎ|เงื่อนไข)[^?。\n]+/u)?.[0];
    const conditions=(rules||deadline[0]).replace(/\s*เจ้าจะเลือก[\s\S]*$/u,'').trim();
    const items=options.map((m,i)=>{
        const name=m[1].trim().replace(/\s*ก็$/u,'').trim(),price=readCommercePrices(m[2])[0];
        if(!price||price.amount<=0||name.length>120||/["“”]/u.test(name))return null;
        const end=options[i+1]?.index??quote.length;
        const detail=quote.slice(m.index,end).replace(/\s*แต่ถ้า(?:เจ้า|ท่าน|คุณ)?(?:อยากได้|ต้องการ|เป็น)?\s*$/u,'').trim();
        const inclusion=detail.match(/รวม([^.!?。\n]+?)(?=\s*(?:แต่ถ้า|กฎ|เงื่อนไข|แล้วก็คืนกุญแจ)|$)/u)?.[1]?.trim();
        return{itemName:name,category:'Access',description:detail.slice(0,360),properties:[],price:price.amount,denomination:price.denomination,stockKnown:false,negotiableKnown:false,
            terms:{mode:'access',scope:name,validUntil,conditions,includes:inclusion?[inclusion]:[],delivery:{name:`กุญแจ${name}`,category:'Key',description:`${name} · ${location}`}}};
    });
    if(items.some(x=>!x)||new Set(items.map(x=>x.denomination)).size!==1||new Set(items.map(x=>x.itemName)).size!==items.length)return null;
    return{kind:'npcShop',...(typeof eventId==='string'&&eventId?{id:eventId.slice(0,120)}:{}),location,evidence:quote.trim(),seller:{name:seller},denomination:items[0].denomination,items};
}
