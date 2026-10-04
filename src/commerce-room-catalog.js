import {COMMERCE_PRICE_PATTERN,readCommercePrices} from './commerce-prices.js?v=0.54.1';
import {storyMinute} from './commerce-rights.js?v=0.54.1';
import {commerceRequestHint,commerceDiscussionOnly} from './commerce-intent.js?v=0.54.1';

// Compile only facts already present in a Thai inn's current reply. No model
// request, invented room number, stock, hidden feature or default stay length.
export function disclosedRoomCatalog(story,user,location,{clock,eventId}={}){
    if(!location||commerceRequestHint(user)!=='buy'||commerceDiscussionOnly(user)||storyMinute(clock)===null)return null;
    const source=String(story??'');
    const dialogue=[...source.matchAll(/<tr-dialogue\b[^>]*\bname=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tr-dialogue>/giu)]
        .filter(m=>/ห้อง/iu.test(m[2])&&/(?:คืนละ|ต่อคืน)/iu.test(m[2]));
    if(!dialogue.length||new Set(dialogue.map(m=>m[1])).size!==1)return null;
    const seller=dialogue[0][1],quote=dialogue.map(m=>m[2]).join('\n');
    if(/(?:สมมุติ|สมมติ|ลือว่า|ห้อง(?:พัก)?(?:เต็ม|หมด|ไม่ว่าง)|ไม่มีห้อง|ยังไม่ได้เปิด|ยังไม่เปิด|จะเปิด(?:ร้าน|โรงเตี๊ยม)|พรุ่งนี้จะมี)/iu.test(quote))return null;
    // Read an exact public checkout when present. "Return tomorrow" alone
    // cannot determine a checkout hour; a stated one-night rental can instead
    // retain its return condition without an automatic timestamp.
    const deadline=quote.match(/คืนกุญแจ(?:[^.!?。\n]{0,25}?)(ก่อน(?:เวลา)?|ตอน|เวลา)?\s*(เที่ยง(?:วัน)?|(?:[01]?\d|2[0-3]):[0-5]\d)([^.!?。\n]{0,12}?)(พรุ่งนี้|วันนี้)/u);
    const nights=[...String(user??'').matchAll(/([0-9๐-๙]+|หนึ่ง|สอง|สาม|สี่|ห้า)\s*คืน/gu)].map(m=>m[1].replace(/[๐-๙]/gu,c=>'๐๑๒๓๔๕๖๗๘๙'.indexOf(c)));
    // A specifically requested one-night rental is an agreement even when no
    // checkout hour was spoken. Preserve that condition; one night is not an
    // invented 24-hour deadline. Other ambiguous stays still need AI terms.
    const oneNight=nights.length>0&&nights.every(n=>n==='1'||n==='หนึ่ง');
    if(nights.some(n=>n!=='1'&&n!=='หนึ่ง'))return null;
    if(!deadline&&!oneNight)return null;
    const time=deadline?(/เที่ยง/u.test(deadline[2])?'12:00':deadline[2].padStart(5,'0')):null;
    const validUntil=deadline?{day:clock.day+(deadline[4]==='พรุ่งนี้'?1:0),time}:null;
    if(validUntil&&storyMinute(validUntil)<=storyMinute(clock))return null;
    const keysPresented=/(?:หยิบ|ยื่น|ส่ง|วาง|นำ|พวง)[^.!?。\n]{0,80}กุญแจ|กุญแจ[^.!?。\n]{0,80}(?:วาง|ยื่น|ส่ง|ให้|บนโต๊ะ|บนเคาน์เตอร์)/iu.test(source.replace(/<[^>]*>/gu,' '));
    if(!keysPresented)return null;
    // Deposits/extra fees need structured AI terms; do not guess which room a
    // second money phrase belongs to or silently drop an announced surcharge.
    if(/(?:มัดจำ|ค่าประกัน|ค่าธรรมเนียม|ค่าเข้า|ค่าบริการเพิ่ม)/u.test(quote))return null;
    const pattern=new RegExp(`(ห้อง(?:พัก)?[^.!?。\\n]{0,160}?)\\s*(?:ก็)?\\s*(?:คืนละ|ต่อคืน)\\s*(${COMMERCE_PRICE_PATTERN.source})`,'giu');
    const options=[...quote.matchAll(pattern)];
    if(!options.length||options.length>8||readCommercePrices(quote).length!==options.length)return null;
    const rules=quote.match(/(?:กฎ|เงื่อนไข)[^?。\n]+/u)?.[0];
    const conditions=(rules||deadline?.[0]||'พัก 1 คืน · ยังไม่ระบุเวลาเช็กเอาต์').replace(/\s*เจ้าจะเลือก[\s\S]*$/u,'').trim();
    const items=options.map((m,i)=>{
        if(/(?:ไม่ว่าง|ไม่มี|แต่ถ้า|ห้อง)/u.test(m[1].replace(/^ห้อง(?:พัก)?/u,'')))return null;
        const name=m[1].trim().replace(/\s*ก็$/u,'').split(/\s+(?=เตียง|นอนได้|พร้อม|มี(?:อ่าง|ระเบียง|ห้องน้ำ))/u)[0].trim(),price=readCommercePrices(m[2])[0];
        if(!price||price.amount<=0||name.length>120||/["“”]/u.test(name))return null;
        const end=options[i+1]?.index??quote.length;
        const detail=quote.slice(m.index,end).replace(/\s*แต่ถ้า(?:เจ้า|ท่าน|คุณ)?(?:อยากได้|ต้องการ|เป็น)?\s*$/u,'').trim();
        const inclusion=detail.match(/รวม([^.!?。\n]+?)(?=\s*(?:แต่ถ้า|กฎ|เงื่อนไข|แล้วก็คืนกุญแจ|เจ้าจะ(?:เลือก|เอา))|$)/u)?.[1]?.trim();
        const ownQuote=dialogue.find(block=>block[2].includes(m[0]))?.[2]?.trim();
        if(!ownQuote||ownQuote.length>600)return null;
        return{itemName:name,category:'Access',description:detail.slice(0,360),properties:[],price:price.amount,denomination:price.denomination,stockKnown:false,negotiableKnown:false,evidence:ownQuote,
            terms:{mode:validUntil?'access':'rental',scope:name,...(validUntil?{validUntil}:{}),conditions:validUntil?conditions:`พัก 1 คืน · ยังไม่ระบุเวลาเช็กเอาต์${rules?' · '+conditions:''}`,includes:inclusion?[inclusion]:[],delivery:{name:`กุญแจ${name}`,category:'Key',description:`${name} · ${location}`}}};
    });
    if(items.some(x=>!x)||new Set(items.map(x=>x.denomination)).size!==1||new Set(items.map(x=>x.itemName)).size!==items.length)return null;
    return{kind:'npcShop',...(typeof eventId==='string'&&eventId?{id:eventId.slice(0,120)}:{}),location,evidence:dialogue[0][2].trim(),seller:{name:seller},denomination:items[0].denomination,items};
}
