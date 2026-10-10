import {publicTradeDialogues,optionPriceFacts,publicInclusions} from './commerce-dialogue-facts.js?v=0.64.2';
import {readCommercePrices} from './commerce-prices.js?v=0.64.2';
import {storyMinute} from './commerce-rights.js?v=0.64.2';
import {commerceRequestHint,commerceDiscussionOnly} from './commerce-intent.js?v=0.64.2';

// Compile only facts already present in a Thai inn's current reply. No model
// request, invented room number, stock, hidden feature or default stay length.
export function disclosedRoomCatalog(story,user,location,{clock,eventId,currency}={}){
    if(!location||commerceRequestHint(user)!=='buy'||commerceDiscussionOnly(user)||storyMinute(clock)===null)return null;
    const source=String(story??''),spoken=publicTradeDialogues(source,currency);
    // Identify room offers by scoped name + currency facts, rather than a
    // particular connector such as "คืนละ". The stay itself supplies duration.
    const dialogue=spoken.filter(block=>/ห้อง/iu.test(block.quote)&&block.prices.length);
    if(!dialogue.length||new Set(dialogue.map(block=>block.name)).size!==1)return null;
    const seller=dialogue[0].name,quote=dialogue.map(block=>block.quote).join('\n');
    const agreement=spoken.filter(block=>block.name===seller).map(block=>block.quote).join('\n');
    if(/(?:สมมุติ|สมมติ|ลือว่า|ห้อง(?:พัก)?(?:เต็ม|หมด|ไม่ว่าง)|ไม่ว่าง|ไม่มีห้อง|ยังไม่ได้เปิด|ยังไม่เปิด|จะเปิด(?:ร้าน|โรงเตี๊ยม)|พรุ่งนี้จะมี)/iu.test(agreement))return null;
    // Read an exact public checkout when present. "Return tomorrow" alone
    // cannot determine a checkout hour; a stated one-night rental can instead
    // retain its return condition without an automatic timestamp.
    const deadline=agreement.match(/(?:คืนกุญแจ|เช็คเอาท์|เช็กเอาต์|เช็คเอาต์|เช็กเอาท์)(?:[^.!?。\n]{0,25}?)(ก่อน(?:เวลา)?|ตอน|เวลา)?\s*(เที่ยง(?:วัน)?|(?:[01]?\d|2[0-3]):[0-5]\d)([^.!?。\n]{0,12}?)(พรุ่งนี้|วันนี้)/u);
    const nights=[...`${String(user??'')}\n${quote}`.matchAll(/([0-9๐-๙]+|หนึ่ง|สอง|สาม|สี่|ห้า)\s*คืน(?!ละ)/gu)].map(m=>m[1].replace(/[๐-๙]/gu,c=>'๐๑๒๓๔๕๖๗๘๙'.indexOf(c)));
    // A specifically requested one-night rental is an agreement even when no
    // checkout hour was spoken. Preserve that condition; one night is not an
    // invented 24-hour deadline. Other ambiguous stays still need AI terms.
    const oneNight=nights.length>0&&nights.every(n=>n==='1'||n==='หนึ่ง');
    if(nights.some(n=>n!=='1'&&n!=='หนึ่ง'))return null;
    if(!deadline&&!oneNight)return null;
    const time=deadline?(/เที่ยง/u.test(deadline[2])?'12:00':deadline[2].padStart(5,'0')):null;
    const validUntil=deadline?{day:clock.day+(deadline[4]==='พรุ่งนี้'?1:0),time}:null;
    if(validUntil&&storyMinute(validUntil)<=storyMinute(clock))return null;
    // A priced offer comes before payment/delivery. The inventory key is a
    // scoped receipt on confirmation, not a required prop in the offer scene.
    // Deposits/extra fees need structured AI terms; do not guess which room a
    // second money phrase belongs to or silently drop an announced surcharge.
    if(/(?:มัดจำ|ค่าประกัน|ค่าธรรมเนียม|ค่าเข้า|ค่าบริการเพิ่ม)/u.test(agreement))return null;
    const options=dialogue.flatMap(block=>optionPriceFacts(block).map(price=>{
        const prefix=price.preceding;
        const marker=[...prefix.matchAll(/ห้อง(?!น้ำ|ครัว)/gu)].at(-1)?.index;if(marker===undefined)return null;
        const named=prefix.slice(marker).replace(/(?:\.{2,}|…)+/gu,' ').replace(/\s*(?:ก็)?(?:คืนละ|ต่อคืน|ราคา|ในราคา|คิดราคา|ค่าห้อง|เป็นเงิน)\s*$/u,'').trim();
        if(/(?:ไม่ว่าง|ไม่มี|แต่ถ้า|ห้อง(?!น้ำ))/u.test(named.replace(/^ห้อง(?:พัก)?/u,'')))return null;
        const name=named.replace(/\s*สำหรับ(?:หนึ่ง|1|๑)\s*คืน\s*$/u,'').split(/\s+(?=เตียง|นอนได้|พร้อม|มี(?:อ่าง|ระเบียง|ห้องน้ำ))/u)[0].trim();
        if(!name||name.length>120||/["“”]/u.test(name))return null;
        return{block,price,name,start:price.start-price.preceding.length+marker};
    }));
    if(!options.length||options.length>8||options.some(option=>!option)||readCommercePrices(agreement,currency).length!==options.length)return null;
    const rules=agreement.match(/(?:กฎ|เงื่อนไข)[^?。\n]+/u)?.[0];
    const conditions=(rules||deadline?.[0]||'พัก 1 คืน · ยังไม่ระบุเวลาเช็กเอาต์').replace(/\s*เจ้าจะเลือก[\s\S]*$/u,'').trim();
    const supporting=spoken.filter(block=>block.name===seller&&!block.prices.length).map(block=>block.quote);
    const items=options.map(({block,price,name,start},index)=>{
        const detailEnd=options[index+1]?.block===block?options[index+1].start:block.quote.length;
        const detail=block.quote.slice(start,detailEnd).replace(/\s*(?:ส่วน|แต่)(?:ถ้า|หาก)[\s\S]*$/u,'').replace(/["“”]+$/u,'').trim();
        // Single-option support applies to that exact room. For multiple rooms
        // avoid assigning "this price includes" from a separate ambiguous quote.
        const details=[detail,...(options.length===1?supporting:[])];
        const evidenceEnd=Math.min(detailEnd,start+600);if(price.amount<=0||price.end>evidenceEnd)return null;
        const evidence=block.quote.slice(start,evidenceEnd).trim();
        return{itemName:name,category:'Access',description:details.join('\n').slice(0,1000),properties:[],price:price.amount,denomination:price.denomination,stockKnown:false,negotiableKnown:false,evidence,
            terms:{mode:validUntil?'access':'rental',scope:name,...(validUntil?{validUntil}:{}),conditions:[validUntil?conditions:`พัก 1 คืน · ยังไม่ระบุเวลาเช็กเอาต์${rules?' · '+conditions:''}`,...(options.length===1?supporting:[])].join('\n'),includes:publicInclusions(details.join('\n')),delivery:{name:`กุญแจ${name}`,category:'Key',description:`${name} · ${location}`}}};
    });
    if(items.some(x=>!x)||new Set(items.map(x=>x.itemName)).size!==items.length)return null;
    return{kind:'npcShop',...(typeof eventId==='string'&&eventId?{id:eventId.slice(0,120)}:{}),location,evidence:items[0].evidence,seller:{name:seller},denomination:items[0].denomination,items};
}
