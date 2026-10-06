import {parseStory} from './npc-core.js?v=0.58.12';
import {readCommercePrices} from './commerce-prices.js?v=0.58.12';

export function publicCommerceStory(story){
    return String(story??'').replace(/<(?:planning|think|thinking|analysis)\b[^>]*>[\s\S]*?<\/(?:planning|think|thinking|analysis)>/giu,'')
        .replace(/\{CoT\}[\s\S]*?(?:>\s*end\s*\{CoT\}|\{\/CoT\})/giu,'');
}

// One source for public NPC facts. Price offsets bind options to their speaker;
// punctuation, narration between quotes and delivery attributes do not matter.
export function publicTradeDialogues(story){
    return (parseStory(publicCommerceStory(story))||[]).filter(block=>block.type==='dialogue'&&block.name&&block.text?.trim())
        .map(block=>({name:block.name,quote:block.text.trim(),prices:readCommercePrices(block.text)}));
}
export function optionPriceFacts(block){
    // Preserve original quote offsets while matching normalized Thai/fullwidth
    // digits. NFKC must not change room names (Thai sara-am decomposes).
    let normalized='',offset=0;const positions=[];
    for(const char of block.quote){const part=char.normalize('NFKC');for(let i=0;i<part.length;i++)positions.push(offset);normalized+=part;offset+=char.length;}
    positions.push(block.quote.length);
    let cursor=0,originalCursor=0;const facts=[];
    for(const price of block.prices){
        const found=normalized.indexOf(price.text,cursor);if(found<0)return [];
        const start=positions[found],end=positions[found+price.text.length];
        facts.push({...price,start,end,preceding:block.quote.slice(originalCursor,start)});
        cursor=found+price.text.length;originalCursor=end;
    }
    return facts;
}
export function quotedTradeRefused(text){
    return /(?:สมมุติ|สมมติ|ลือว่า|ห้อง(?:พัก)?(?:เต็ม|หมด|ไม่ว่าง)|ไม่มีห้อง|ยังไม่ได้เปิด|ยังไม่เปิด|จะเปิด(?:ร้าน|โรงเตี๊ยม)|พรุ่งนี้จะมี|ไม่ขาย|ไม่ได้ขาย|ไม่รับซื้อ|ยังไม่รับซื้อ|ไม่มีสินค้า|\b(?:hypothetical|not for sale|will sell|would buy|not buying|no vacancy|fully booked))/iu.test(String(text));
}
export function publicInclusions(text){
    // Negation applies to inclusion; never report "ไม่รวมอาหารเช้า" as breakfast.
    const source=String(text),includes=[];
    for(const match of source.matchAll(/(?<!ไม่)(?<!ไม่ได้)(?:ราคา(?:นี้)?(?:ได้)?รวม|(?:แล้วก็|และ|พร้อม)รวม|(?<!\S)รวม)(?!กับ)([^.!?。\n]+?)(?=\s*(?:[.!?。]|แล้ว|แต่|จ่ายเงิน|กฎ|เงื่อนไข|(?:เจ้า|ท่าน)จะ(?:เลือก|เอา))|$)/gu)){
        const value=match[1].replace(/^ทั้ง/u,'').trim();if(value&&!includes.includes(value))includes.push(value);
    }
    return includes;
}
