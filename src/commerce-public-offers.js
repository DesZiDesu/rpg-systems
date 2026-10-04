import {commerceRequestHint,commerceDiscussionOnly} from './commerce-intent.js?v=0.55.1';
import {COMMERCE_PRICE_PATTERN,readCommercePrices} from './commerce-prices.js?v=0.55.1';

// A same-reply compiler for explicit NPC prices when a model omits its machine
// object. No API, payment, assumed stock, inferred item or invented NPC funds.
export function disclosedGoodsOffer(story,user,location,inventory=[],{eventId}={}){
    const kind=commerceRequestHint(user);
    if(!location||!kind||commerceDiscussionOnly(user))return null;
    const blocks=[...String(story??'').matchAll(/<tr-dialogue\b[^>]*\bname=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tr-dialogue>/giu)]
        .map(match=>({name:match[1],quote:match[2].trim()})).filter(block=>readCommercePrices(block.quote).length);
    if(!blocks.length||new Set(blocks.map(block=>block.name)).size!==1||blocks.some(block=>block.quote.length>600))return null;
    const items=[];
    for(const block of blocks){
        if(/(?:สมมุติ|สมมติ|ลือว่า|ไม่ขาย|ไม่ได้ขาย|ไม่รับซื้อ|ยังไม่รับซื้อ|ไม่มีสินค้า|จะ(?:ขาย|รับซื้อ)|พรุ่งนี้[^.!?\n]{0,40}(?:ขาย|รับซื้อ)|\b(?:hypothetical|not for sale|will sell|tomorrow|would buy|not buying))/iu.test(block.quote))return null;
        const prices=readCommercePrices(block.quote),before=items.length;
        if(kind==='sell'){
            if(!/(?:รับซื้อ|ข้า(?:จะ)?ซื้อ|ให้ราคา|\b(?:I buy|I can buy|buy from you|offer you))/iu.test(block.quote))return null;
            const found=inventory.filter(item=>item?.id&&item.quantity>=1&&block.quote.includes(item.name))
                .map(item=>({item,start:block.quote.indexOf(item.name)})).sort((a,b)=>a.start-b.start||b.item.name.length-a.item.name.length);
            const entries=found.filter((entry,index)=>!found.slice(0,index).some(previous=>entry.start<previous.start+previous.item.name.length));
            for(const [index,{item,start}]of entries.entries()){
                const clause=block.quote.slice(start+item.name.length,entries[index+1]?.start),price=readCommercePrices(clause);
                if(price.length!==1||/(?:ทั้งหมด|ทั้งชุด|ยกชุด|เล่มละ|ชิ้นละ)/u.test(block.quote)&&item.quantity>1)return null;
                const quantity=clause.match(/^\s*(?:จำนวน\s*)?([1-9]\d*)\s*(?:ชิ้น|เล่ม|ขวด|อัน|หน่วย)\s*/u)?.[1];
                const count=quantity?Number(quantity):1;if(count>item.quantity)return null;
                items.push({itemId:item.id,itemName:item.name,description:item.description||'',category:item.category||'Item',quantity:count,askPrice:price[0].amount,denomination:price[0].denomination,evidence:block.quote});
            }
        }else{
            for(const line of block.quote.split(/[.!。\n]+/u).map(line=>line.trim()).filter(Boolean)){
                const pattern=new RegExp(`^(?:[-*•]\\s*|\\d+[.)]\\s*)?([^:—–]{2,100}?)\\s*[:—–]\\s*(${COMMERCE_PRICE_PATTERN.source})[\\s"“”]*$`,'iu');
                const prose=new RegExp(`^["“\\s]*(?:ข้า|เรา|ร้านนี้)?(?:ขาย|มี|เสนอขาย)\\s*([^?!\\n]{2,100}?)\\s*(?:ราคา|ในราคา|ชิ้นละ|เล่มละ|ขวดละ)\\s*(${COMMERCE_PRICE_PATTERN.source})[\\s"“”]*$`,'iu');
                const match=line.match(pattern)||line.match(prose);if(!match)continue;
                const name=match[1].trim(),price=readCommercePrices(match[2])[0];
                if(!price||/(?:ห้อง|บ้าน|อาคาร|ตึก|คฤหาสน์|ที่ดิน|เช่า|บริการ|ซ่อม|ตั๋ว|บัตรผ่าน|\b(?:room|house|building|rent|service|ticket))/iu.test(name))return null;
                items.push({itemName:name,description:line,category:'Item',properties:[],quantity:1,price:price.amount,denomination:price.denomination,stockKnown:false,negotiableKnown:false,terms:{mode:'permanent'},evidence:block.quote});
            }
        }
        if(items.length-before!==prices.length)return null;
    }
    if(!items.length||items.length>40||new Set(items.map(item=>item.denomination)).size!==1||new Set(items.map(item=>item.itemName)).size!==items.length||items.some(item=>(item.price??item.askPrice)<=0))return null;
    const common={location,evidence:blocks[0].quote,denomination:items[0].denomination,...(eventId?{id:eventId}:{})};
    return kind==='sell'?{...common,kind:'npcPurchase',buyer:{name:blocks[0].name},items}:{...common,kind:'npcShop',seller:{name:blocks[0].name},items};
}
