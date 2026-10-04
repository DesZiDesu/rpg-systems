import {publicTradeDialogues,optionPriceFacts,quotedTradeRefused} from './commerce-dialogue-facts.js?v=0.55.4';
import {commerceRequestHint,commerceDiscussionOnly} from './commerce-intent.js?v=0.55.4';
import {readCommercePrices} from './commerce-prices.js?v=0.55.4';

// A same-reply compiler for explicit NPC prices when a model omits its machine
// object. No API, payment, assumed stock, inferred item or invented NPC funds.
export function disclosedGoodsOffer(story,user,location,inventory=[],{eventId}={}){
    const kind=commerceRequestHint(user);
    if(!location||!kind||commerceDiscussionOnly(user))return null;
    const blocks=publicTradeDialogues(story).filter(block=>block.prices.length);
    if(!blocks.length||new Set(blocks.map(block=>block.name)).size!==1||blocks.some(block=>block.quote.length>600))return null;
    const items=[];
    for(const block of blocks){
        if(quotedTradeRefused(block.quote)||/(?:จะ(?:ขาย|รับซื้อ)|พรุ่งนี้[^.!?\n]{0,40}(?:ขาย|รับซื้อ)|\btomorrow\b)/iu.test(block.quote))return null;
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
            for(const fact of optionPriceFacts(block)){
                const clauses=fact.preceding.replace(/["“”]/gu,'').split(/[.!?。\n;]+/u).map(v=>v.trim()).filter(Boolean);
                let prefix=clauses.at(-1)||'';
                prefix=prefix.replace(/^(?:[-*•]\s*|\d+[.)]\s*)/u,'').replace(/^(?:แต่)?(?:ถ้า|หาก)(?:เป็น|อยากได้|ต้องการ)\s*/u,'')
                    .replace(/^(?:ข้า|เรา|ร้านนี้)?(?:ขาย|มี|เสนอขาย)\s*/u,'').replace(/^(?:I (?:can )?sell you|I offer|we sell)\s+(?:an? |the )?/iu,'');
                const connector=prefix.match(/(?:ราคา|ในราคา|ชิ้นละ|เล่มละ|ขวดละ|อันละ|เป็นเงิน|คิดราคา|[:—–]|\b(?:for|costs?|is|priced at))\s*$/iu);
                if(!connector)return null;
                const name=prefix.slice(0,connector.index).trim().replace(/(?:เล่มนี้|ชิ้นนี้|อันนี้|ขวดนี้|หลังนี้)\s*$/u,'').trim();
                if(!name||name.length>120||/(?:เช่า|บริการ|ซ่อม|ตั๋ว|บัตรผ่าน|\b(?:rent|service|ticket))/iu.test(name))return null;
                const place=/(?:บ้าน|อาคาร|ตึก|คฤหาสน์|ที่ดิน|\b(?:house|building|property))/iu.test(name);
                if(/(?:ห้อง|\broom)/iu.test(name))return null; // Room duration lives in the room facts compiler.
                if(place&&(!/(?:ขาย|\bsell)/iu.test(block.quote)||/(?:เช่า|\brent)/iu.test(block.quote)))return null;
                items.push({itemName:name,description:block.quote,category:place?'Property':'Item',properties:[],quantity:1,price:fact.amount,denomination:fact.denomination,stockKnown:false,negotiableKnown:false,
                    terms:place?{mode:'permanent',scope:name,delivery:{name:`กุญแจ${name}`,category:'Key',description:`${name} · ${location}`}}:{mode:'permanent'},evidence:block.quote});
            }
        }
        if(items.length-before!==prices.length)return null;
    }
    if(!items.length||items.length>40||new Set(items.map(item=>item.itemName)).size!==items.length||items.some(item=>(item.price??item.askPrice)<=0))return null;
    const common={location,evidence:blocks[0].quote,denomination:items[0].denomination,...(eventId?{id:eventId}:{})};
    return kind==='sell'?{...common,kind:'npcPurchase',buyer:{name:blocks[0].name},items}:{...common,kind:'npcShop',seller:{name:blocks[0].name},items};
}
