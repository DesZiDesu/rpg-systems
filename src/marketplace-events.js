import {publicCommerceStory} from './commerce-dialogue-facts.js?v=0.56.1';
import {disclosedRoomCatalog} from './commerce-room-catalog.js?v=0.56.1';
import {disclosedGoodsOffer} from './commerce-public-offers.js?v=0.56.1';
import {commerceDiscussionOnly} from './commerce-intent.js?v=0.56.1';
import {normalizePurchaseTerms} from './commerce-rights.js?v=0.56.1';
import { interactionEvidence, withInteractionEvidence, evidenceText, namedInteraction } from './interaction-evidence.js?v=0.56.1';
import {COMMERCE_PRICE_PATTERN,readCommercePrices} from './commerce-prices.js?v=0.56.1';
// Read-only opening event normalization. Active commerce is handled only by
// commerce-runtime/commerce-engine; ordinary turns never run a simulator.
const clean = (value, max = 240) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const key = value => clean(value, 600).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
const integer = (value, fallback = 0, min = 0, max = 999999999) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
const hash = value => { let n = 2166136261; for (const ch of String(value)) n = Math.imul(n ^ ch.codePointAt(0), 16777619); return (n >>> 0).toString(36); };
const denominations = new Set(['gold', 'silver', 'copper']);
const buyWords = /(?:buy|purchase|offer|pay|sell\s+you|ซื้อ|ขอซื้อ|รับซื้อ|เสนอราคา|จ่าย)/iu;
const shopWords = /(?:shop|store|stall|vendor|merchant|sell(?:s|ing)?|goods|price|discount|haggl|counteroffer|ราคา|ลดให้|ลดราคา|ต่อรอง|ขาย|ร้าน|แผง|สินค้า|ของให้เลือก)/iu;
const actionWords = /(?:say|tell|ask|offer|hand|show|bring|walk|enter|approach|visit|stand|open|inspect|browse|display|list|พูด|บอก|ถาม|ขอ|ยื่น|นำ|เดิน|เข้า|เปิด|ไปหา|มาถึง|ดู|แสดง|หยิบ|วาง|ลดราคา|ลดให้)/iu;
export const MARKETPLACE_REQUEST_WORDS = /(?:shop|store|merchant|vendor|goods|catalog|buy|sell|haggl|counteroffer|\brent\b|\bbook(?:ing)?\s+(?:(?:a|an|the)\s+)?(?:room|lodging|accommodation|stay)\b|(?:room|lodging|accommodation)\s+(?:rates?|prices?)|ร้าน|พ่อค้า|แม่ค้า|สินค้า|ซื้อ|ขาย|ต่อรอง|ดูของ|เช่า|จองห้อง|ขอห้อง|ค่าห้อง|จ้าง|ซ่อม|ตีอุปกรณ์|ฝากของ|บัตรผ่าน|ตั๋ว|ค่าเรียน|(?:ขอ|หา|จอง|เช่า)ที่พัก)/iu;
const catalogRequestWords = /(?:buy|shop|goods|catalog|ซื้อ|ร้าน|สินค้า|ดูของ|ต่อรอง|เช่า|จอง|ห้องพัก|ที่พัก|ค่าห้อง|เท่าไหร่|จ้าง|ซ่อม|สั่ง(?:ตี|ทำ|อาหาร)|ฝากของ|ตั๋ว|บัตรผ่าน|สมาชิก|how much|repair|hire|ticket|membership|\brent\b|\bbook(?:ing)?\s+(?:(?:a|an|the)\s+)?(?:room|lodging|accommodation|stay)\b|lodging|accommodation)/iu;
const nonCurrentRequest = /(?:auction|ประมูล|พรุ่งนี้|เมื่อวาน|สมมุติ|ยังไม่|tomorrow|yesterday|hypothetical)/iu;
// Choosing between currently quoted products is a price condition, not a
// hypothetical visit. Keep this exception local to exact, named shop catalogs.
const pricingCondition = /(?:ถ้า|หาก)(?:เป็น|อยาก(?:ได้)?|ต้องการ|เลือก|เอา|(?:เจ้า|ท่าน|คุณ)(?:อยาก(?:ได้)?|ต้องการ|เลือก|เอา))\s*|\bif\s+(?:you\s+(?:want|prefer|choose|take)|it(?:'s| is))\s+/giu;
function pricedEntriesDisclosed(event,story,entries=event.items){
    const allEntries=event.items||entries;
    return entries.every(entry=>{
        const ownQuote=entry.evidence||event.evidence,menu=evidenceText(ownQuote),start=menu.indexOf(evidenceText(entry.item.name));
        if(!evidenceText(story).includes(menu)||!namedInteraction((event.seller||event.buyer).name,ownQuote,story)||start<0)return false;
        const end=Math.min(...allEntries.map(other=>other===entry?-1:menu.indexOf(evidenceText(other.item.name))).filter(index=>index>start),menu.length);
        return readCommercePrices(menu.slice(start+evidenceText(entry.item.name).length,end)).some(price=>price.amount===entry.askPrice&&price.denomination===entry.denomination);
    });
}
function pricedCatalogEvidence(event,story,user,subject,activity) {
    const quote=event.evidence;
    if(!catalogRequestWords.test(String(user||''))||nonCurrentRequest.test(String(user||''))||/(?:ถ้า|หาก|\bif\b)/iu.test(String(user||'')))return false;
    if(/(?:ไม่มี|ไม่เหลือ)(?:ห้อง|ที่พัก)|ห้อง(?:พัก)?(?:เต็ม|หมด|ไม่ว่าง)|no (?:available |vacant )?rooms|fully booked|no vacancy|sold out|unavailable|not available|not for (?:rent|sale)|ข่าวลือ|ลือว่า|สมมุติ|hypothetical/iu.test(quote))return false;
    if(!evidenceText(story).includes(evidenceText(quote))||!namedInteraction(event.seller.name,quote,story))return false;
    if(!pricedEntriesDisclosed(event,story))return false;
    const strip=value=>String(value).replace(pricingCondition,'');
    const current=strip(quote).split(/คืนกุญแจ|คืนของเช่า|กำหนดคืน|\bcheckout\b/iu)[0],price=readCommercePrices(current)[0];
    // A present room offer may include tomorrow's breakfast in the same Thai
    // sentence. Test the priced offer, not that future included service.
    const offered=price?current.slice(0,current.indexOf(price.text)+price.text.length):current;
    return interactionEvidence(offered,strip(story),user,subject,activity);
}

// A current paid offer may state a future checkout/collection deadline. Only
// the already-present price clause can authorize opening, never a future shop.
function typedCatalogEvidence(event,story,user,subject,activity){
    if(event.kind!=='npcShop'||!event.items.some(e=>e.terms.mode!=='permanent')||!catalogRequestWords.test(String(user||''))||nonCurrentRequest.test(String(user||''))||/(?:ถ้า|หาก|\bif\b)/iu.test(String(user||'')))return false;
    if(!namedInteraction(event.seller.name,event.evidence,story))return false;
    const clauses=event.evidence.split(/(?:คืน(?:กุญแจ|ของ|อุปกรณ์)|กำหนด(?:คืน|รับ)|รับ(?:ของ|งาน)(?:ได้|วัน)|\b(?:return (?:the|it)|checkout|collect|ready (?:at|on|tomorrow)))|[.!?。\n]/iu);
    return clauses.some(clause=>interactionEvidence(clause,story,user,subject,activity)&&readCommercePrices(clause).length);
}

function deliveredKeyDisclosed(entry,event,story){
    const {terms,item}=entry;if(!terms.delivery)return true;
    if(namedInteraction(event.seller.name,terms.delivery.name,story))return true;
    if(!['permanent','access','rental'].includes(terms.mode)||terms.delivery.category!=='Key')return false;
    const labels=[item.name,terms.scope].map(evidenceText);
    const keyName=evidenceText(terms.delivery.name).toLocaleLowerCase();
    const derived=labels.some(label=>keyName===`กุญแจ${label}`.toLocaleLowerCase()||keyName===`key to ${label}`.toLocaleLowerCase()||keyName===`${label} key`.toLocaleLowerCase());
    if(!derived||!namedInteraction(event.seller.name,item.name,story)||!key(terms.scope).includes(key(item.name)))return false;
    // Temporary accommodation may be offered before the key is fetched. This
    // scoped label represents delivery on confirmation, not present possession.
    if(['access','rental'].includes(terms.mode)&&/(?:ห้อง|ที่พัก|\broom\b|lodging|accommodation)/iu.test(terms.scope))return true;
    // Permanent property and unrelated keys still require disclosed delivery.
    return [...String(story).matchAll(/(?:พวง)?กุญแจ|\bkeys?\b/giu)].some(m=>namedInteraction(event.seller.name,m[0],story))
        &&/(?:หยิบ|ยื่น|ส่ง|วาง|นำ|พวง|ให้|hand|show|bring|place|offer)[^.!?。\n]{0,100}(?:กุญแจ|\bkeys?\b)|(?:กุญแจ|\bkeys?\b)[^.!?。\n]{0,100}(?:วาง|ยื่น|ส่ง|ให้|บนโต๊ะ|บนเคาน์เตอร์|hand|show|place|offer)/iu.test(evidenceText(story));
}
function typedTermsDisclosed(event,story){
    if(event.kind!=='npcShop')return true;
    for(const entry of event.items){
        const terms=entry.terms;if(terms.mode==='permanent'&&!terms.delivery)continue;
        if(!deliveredKeyDisclosed(entry,event,story))return false;
        if(terms.mode==='permanent'&&!namedInteraction(event.seller.name,terms.scope,story))return false;
        if(terms.deposit){
            const quotes=[...String(story).matchAll(/<tr-dialogue\b[^>]*>([\s\S]*?)<\/tr-dialogue>/giu)].map(m=>m[1]);
            if(!quotes.some(quote=>namedInteraction(event.seller.name,quote,story)&&[...quote.matchAll(/(?:มัดจำ|deposit)([^.!?。\n]{0,70})/giu)].some(m=>readCommercePrices(m[1]).some(p=>p.denomination===entry.denomination&&p.amount===terms.deposit))))return false;
        }
    }
    return true;
}


export const MARKETPLACE_EVENT_INSTRUCTIONS = 'Main Chat Marketplace: when the current completed scene explicitly shows a named NPC asking to buy an item the player owns, include marketplace:{kind:"npcPurchase",id,location,evidence:"exact quote",buyer:{npcId,npcName,role,budget:actual-remaining-funds-if-known},item:{itemId,itemName,category,description,quantity},askPrice,floorPrice,denomination,negotiable,message} in the same invisible patch. When the player is interacting with a named NPC shop/vendor and the NPC shows goods or quotes an item or present room/rental/service option for sale, including catalog requests, revisits and negotiation while already here, include marketplace:{kind:"npcShop",id,location,evidence:"exact quote",seller:{npcId,npcName,role},title,description,denomination,items:[{id,itemId,itemName,category,description,properties:["..."],price,stock,stockKnown,negotiable,negotiableKnown,note,terms:{mode:"permanent|rental|access|service",scope,validFrom,validUntil,durationMinutes,uses,deposit,includes,conditions,delivery}}}]} with at most 40 items. Emit the full item details and typed terms in this SAME normal reply; never defer them to an opening recovery/API. Every option needs its own description, category and properties, and its own denomination when quoted units differ. Mixed gold/silver/copper options belong to the SAME catalog; preserve the original unit of each price. Do not normalize all bare numbers into one unit. Ordinary owned goods use terms:{mode:"permanent"}. Owned places (houses/rooms/buildings) use category:"Property", terms:{mode:"permanent",scope:"exact place",delivery:{name:"exact named property key",category:"Key",description:"public details"}}; put the key in Inventory rather than the building. Present the property and price now; permanent property ownership requires its disclosed key delivery. Derive the key label from that exact property in the role-play language; do not require the NPC to literally recite a UI label. Temporary stays remain access/rental, never permanent ownership. An overnight room is temporary, never permanent ownership. State actual checkout/duration and included services in the reply. A present room offer can open before its key is fetched or handed over; its scoped inventory key is delivered only upon confirmed purchase. Use access with validUntil/durationMinutes when an exact story expiry is established. For a specifically agreed one-night stay with no checkout hour, use rental with scope, conditions describing that one night and the unspecified checkout, includes and delivery key; omit validUntil/durationMinutes rather than guessing 24 hours or withholding the offer. Rentals need their actual return agreement and physical delivery; prepaid services need their agreed scope/completion terms. Shop stock is the actual remaining inventory, separate from the quoted or requested item quantity; never infer stock from that quantity. Stock/negotiability remain unknown when not established (stockKnown:false,negotiableKnown:false). A disclosed stock of zero means sold out, not unknown. For an NPC buying several owned items use npcPurchase with items:[{itemId,itemName,quantity,askPrice}] instead of legacy item/askPrice. Quote every item in the same story/evidence; one budget covers the basket. The user may exclude items, change quantities and negotiate one total; never transfer before confirmation. Evidence must be an exact affirmative quote from this reply, show the present interaction; location must match the current sceneTracker location, and must not describe a plan, question, rumor, or OOC text. The extension renders the event in Main Chat. The extension opens a minimal composer strip; its offer/confirm/cancel buttons each call the current AI API and append a brief continuation to the same assistant message. The new commerce engine alone settles accepted, explicitly confirmed prices. With interactive Marketplace enabled, present terms and open the session first; do not narrate payment or delivery before its confirm action. Do not patch inventory/currency for catalog or offer events or replay already settled commerce. Preserve event IDs within an active negotiation; a new interaction after completion uses a new ID. Never create HTML or UI text in the patch.';

function itemRecord(raw, fallback = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const name = clean(source.name || source.itemName || fallback.name, 140);
    if (!name) return null;
    const quantity = integer(source.quantity, integer(fallback.quantity, 1, 1, 99999), 1, 99999);
    return {
        id: clean(source.id || source.itemId || fallback.id, 100), name,
        category: clean(source.category || fallback.category, 80) || 'Item',
        description: clean(source.description || fallback.description, 360),
        properties: Array.isArray(source.properties) ? source.properties.map(v => clean(v, 160)).filter(Boolean).slice(0, 8) : [],
        quantity,
    };
}

function priceRecord(raw, fallback = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const askPrice = integer(source.askPrice ?? source.price, integer(fallback.askPrice, 0, 1), 1);
    const floorPrice = integer(source.floorPrice, askPrice, 1);
    if (!askPrice || floorPrice > askPrice || !denominations.has(source.denomination || fallback.denomination || '')) return null;
    return { askPrice, floorPrice, denomination: source.denomination || fallback.denomination };
}

function catalogEntry(raw, index, denomination, catalogEvidence = '') {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = itemRecord(raw.item || raw, { id: raw.itemId, name: raw.itemName, quantity: raw.quantity });
    const price = priceRecord(raw, { denomination });
    const terms=normalizePurchaseTerms(typeof raw.terms==='string'?undefined:raw.terms);
    if (!item || !price || !terms || (terms.mode!=='permanent'||terms.delivery)&&item.quantity!==1) return null;
    const stockDisclosed=(typeof raw.stock==='number'||typeof raw.stock==='string'&&raw.stock.trim()!=='')&&Number.isSafeInteger(Number(raw.stock))&&Number(raw.stock)>=0&&Number(raw.stock)<=99999;
    return { id: clean(raw.id, 100) || `shop-item-${hash(`${index}|${key(item.name)}|${price.askPrice}`)}`, item, ...price, ...(raw.evidence?{evidence:clean(raw.evidence,600)}:{}),
        negotiable: raw.negotiable !== false, negotiableKnown: raw.negotiableKnown !== false, stockKnown: raw.stockKnown !== false&&stockDisclosed, stock: integer(raw.stock, item.quantity, 0, 99999), terms, termsRequired:terms.mode==='permanent'&&!terms.delivery&&/^(?:Property|Real Estate|Building|House|Location|อสังหาริมทรัพย์|สถานที่|บ้าน|อาคาร)$/iu.test(item.category)||terms.mode==='permanent'&&/(?:ห้อง|\broom\b)/iu.test(item.name)&&/(?:คืนละ|ต่อคืน|ต่อวัน|\b(?:per|a) (?:night|day)\b)/iu.test(catalogEvidence)||(raw.terms===undefined||typeof raw.terms==='string')&&/(?:ห้อง(?:พัก|เดี่ยว|เช่า|ส่วนตัว|ชั้น|ธรรมดา|พิเศษ|กว้าง|เตียง)|พัก(?:หนึ่ง|1|หนึ่งคืน)|เช่า|ค่าบริการ|สั่ง(?:ทำ|ตี)|ตั๋ว|บัตรผ่าน|\broom\b|\brental\b|\bticket\b|\bservice\b|\blodging\b|\baccommodation\b)/iu.test(item.name+' '+item.description), note: clean(raw.note || (typeof raw.terms==='string'?raw.terms:''), 220) };
}

export function normalizeMarketplaceEvent(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const kind = clean(raw.kind || raw.type || raw.event, 40).toLocaleLowerCase();
    const location = clean(raw.location, 180), evidence = clean(raw.evidence, 600);
    if (!location) return null;
    if (kind === 'npcpurchase' || kind === 'purchaseoffer' || kind === 'npc-offer' || kind === 'offer') {
        const buyerRaw = raw.buyer || raw.npc || {};
        const buyer = { id: clean(buyerRaw.id || buyerRaw.npcId, 100), name: clean(buyerRaw.name || buyerRaw.npcName, 120), role: clean(buyerRaw.role, 100) || 'Buyer', ...(Number.isSafeInteger(buyerRaw.budget)&&buyerRaw.budget>=0 ? {budget:buyerRaw.budget} : {}) };
        const item = itemRecord(raw.item || raw, { id: raw.itemId, name: raw.itemName, quantity: raw.quantity });
        const price = priceRecord(raw);
        const entries=Array.isArray(raw.items)&&(!raw.item||raw.batch)?raw.items.map((entry,index)=>catalogEntry(entry,index,raw.denomination)):null;
        if(entries&&(!entries.length||entries.length>40||entries.some(entry=>!entry)||new Set(entries.map(entry=>entry.item.id||key(entry.item.name))).size!==entries.length))return null;
        const first=entries?.[0];
        if (!buyer.name || !(first?.item||item) || !(first||price)) return null;
        return { kind: 'npcPurchase', id: clean(raw.id, 120) || `purchase-${hash(`${key(location)}|${key(buyer.name)}|${key(first?.item.name||item.name)}|${evidence}`)}`,
            location, evidence, buyer, item:first?.item||item, ...(first?{askPrice:first.askPrice,floorPrice:first.floorPrice,denomination:first.denomination,items:entries,batch:true}:price), status: ['pending','awaiting-reply','resolved'].includes(raw.status) ? raw.status : 'pending',
            message: clean(raw.message || raw.offerMessage, 360), negotiable: raw.negotiable !== false,
            terms: clean(raw.terms, 260) };
    }
    if (kind === 'npcshop' || kind === 'shop' || kind === 'vendor') {
        const sellerRaw = raw.seller || raw.npc || {};
        const seller = { id: clean(sellerRaw.id || sellerRaw.npcId, 100), name: clean(sellerRaw.name || sellerRaw.npcName, 120), role: clean(sellerRaw.role, 100) || 'Merchant' };
        const denomination = clean(raw.denomination||raw.items?.[0]?.denomination||raw.catalog?.[0]?.denomination, 20);
        if (!seller.name || !denominations.has(denomination)) return null;
        const entries = (Array.isArray(raw.items) ? raw.items : Array.isArray(raw.catalog) ? raw.catalog : [])
            .map((entry, index) => catalogEntry(entry, index, denomination, evidence)).slice(0, 40);
        if (!entries.length || entries.some(entry=>!entry)) return null;
        return { kind: 'npcShop', id: clean(raw.id, 120) || `shop-${hash(`${key(location)}|${key(seller.name)}|${evidence}`)}`,
            location, evidence, seller, denomination, status: ['pending','awaiting-reply','resolved'].includes(raw.status) ? raw.status : 'pending',
            title: clean(raw.title, 160) || `${seller.name} · Shop`, description: clean(raw.description, 360), pageSize: Math.min(8, Math.max(3, integer(raw.pageSize, 5, 3, 8))), items: entries };
    }
    return null;
}

export function confirmedMarketplaceEvent(raw, story, user, location, inventory = [], intent = null, options = {}) {
    if(intent?.kind==='none'||!intent&&commerceDiscussionOnly(user))return null;
    const kind = String(raw?.kind || raw?.type || raw?.event || '').toLocaleLowerCase();
    const purchase=/purchase|offer/u.test(kind);
    if(intent&&intent.kind!==(purchase?'sell':'buy'))return null;
    const quotedPrice=[...String(story||'').matchAll(/<tr-dialogue\b[^>]*>([\s\S]*?)<\/tr-dialogue>/giu)].some(match=>readCommercePrices(match[1]).length>0);
    const contextShop=!purchase&&quotedPrice&&catalogRequestWords.test(String(user||''))&&!nonCurrentRequest.test(String(user||''));
    const subject=purchase?buyWords:contextShop?new RegExp(`${shopWords.source}|${COMMERCE_PRICE_PATTERN.source}`,'iu'):shopWords;
    const activity=purchase?new RegExp(`${actionWords.source}|${buyWords.source}`,'iu'):contextShop?new RegExp(`${actionWords.source}|${COMMERCE_PRICE_PATTERN.source}`,'iu'):actionWords;
    let candidate=withInteractionEvidence(raw, story, location, subject, activity);
    // If no evidence was supplied, the NPC's own current price dialogue can
    // provide it. Never replace incorrect evidence supplied by the model.
    if(contextShop&&!raw?.evidence&&!candidate?.evidence){
        for(const match of String(story||'').matchAll(/<tr-dialogue\b[^>]*>([\s\S]*?)<\/tr-dialogue>/giu)){
            const quote=match[1].trim();if(quote.length>600)continue;
            const test=normalizeMarketplaceEvent({...candidate,evidence:quote});
            if(test&&pricedCatalogEvidence(test,story,user,subject,activity)){candidate={...candidate,evidence:quote};break;}
        }
    }
    const event = normalizeMarketplaceEvent(candidate);
    if (!event || key(event.location) !== key(location) || !evidenceText(story).includes(evidenceText(event.evidence))) return null;
    if(event.items?.some(entry=>entry.evidence)&&!pricedEntriesDisclosed(event,story,event.items.filter(entry=>entry.evidence)))return null;
    // An older price-only room object can use the complete terms already
    // disclosed in THIS reply. Keep its identities/prices; never repair a
    // conflicting amount, unrelated option or an explicit typed contract.
    if(event.kind==='npcShop'&&event.items.some(entry=>entry.termsRequired)){
        const publicMenu=disclosedRoomCatalog(story,user,location,options),used=new Set();
        const matches=publicMenu?.items.length===event.items.length&&event.items.map(entry=>{
            const candidates=publicMenu.items.filter(item=>key(item.itemName).includes(key(entry.item.name))&&item.price===entry.askPrice&&item.denomination===entry.denomination);
            const item=candidates.length===1?candidates[0]:null;
            if(!item||used.has(item.itemName)||!entry.termsRequired||entry.terms.mode!=='permanent'||entry.terms.delivery)return null;
            used.add(item.itemName);return item;
        });
        if(matches&&matches.every(Boolean))event.items=event.items.map((entry,i)=>({...entry,item:{...entry.item,category:'Access',description:matches[i].description},terms:normalizePurchaseTerms(matches[i].terms),termsRequired:false}));
    }
    if (/^\s*(?:\(?OOC\b|\[OOC\b)/iu.test(String(user || ''))) return null;
    if (!interactionEvidence(event.evidence, story, user, subject, activity)
        && !(contextShop&&pricedCatalogEvidence(event,story,user,subject,activity))
        && !typedCatalogEvidence(event,story,user,subject,activity)) return null;
    if(!typedTermsDisclosed(event,story))return null;
    if (event.kind === 'npcPurchase') {
        if (!buyWords.test(event.evidence) || !namedInteraction(event.buyer.name, event.evidence, story)) return null;
        for(const item of (event.items||[{item:event.item}]).map(entry=>entry.item)){
            const quote=(event.items||[]).find(entry=>entry.item===item)?.evidence||event.evidence;
            if(!key(quote).includes(key(item.name))||!evidenceText(story).includes(evidenceText(quote))||!namedInteraction(event.buyer.name,quote,story)||!buyWords.test(quote))return null;
            const owned=(inventory||[]).find(entry=>(item.id&&entry.id===item.id&&key(entry.name)===key(item.name))||(!item.id&&key(entry.name)===key(item.name)));
            if(!owned||integer(owned.quantity,0)<item.quantity)return null;
            item.id=owned.id;
        }
    } else {
        if (!subject.test(event.evidence) || !namedInteraction(event.seller.name, event.evidence, story)) return null;
        if (!buyWords.test(event.evidence) && !shopWords.test(String(story)) && !(contextShop&&readCommercePrices(event.evidence).length>0)) return null;
    }
    return event;
}

// Recover a plainly listed catalog locally when the model omits the card object.
// Only explicit item/price lines and one identified seller are usable. We never
// invent stock, hidden properties, exchange rates, purchases or auction rules.
export function recoverMarketplaceShop(story, user, location, npcs = [], options = {}) {
    if(commerceDiscussionOnly(user))return null;
    const room=disclosedRoomCatalog(story,user,location,options);
    if(room)return confirmedMarketplaceEvent(room,story,user,location,[],null,options);
    const goods=disclosedGoodsOffer(story,user,location,options.inventory||[],options);
    if(goods)return confirmedMarketplaceEvent(goods,story,user,location,options.inventory||[],null,options);
    if (!location || !shopWords.test(String(story)) || !/(?:shop|catalog|goods|buy|price|haggl|ร้าน|สินค้า|ซื้อ|ราคา|ต่อรอง|ดูของ)/iu.test(String(user))) return null;
    const names = [...String(story).matchAll(/<tr-(?:header|dialogue)\b[^>]*\bname=["']([^"']+)["']/giu)].map(match => clean(match[1],120));
    const known = npcs.filter(npc => npc?.name && key(story).includes(key(npc.name))).map(npc => npc.name);
    const sellers = [...new Set(names.length ? names : known)];
    if (sellers.length !== 1) return null;
    const items = [];
    const units = {gold:'gold',silver:'silver',copper:'copper','ทอง':'gold','เงิน':'silver','ทองแดง':'copper'};
    const visible = String(story).replace(/<[^>]*>/gu,'\n');
    for (const line of visible.split('\n')) {
        const match = line.trim().match(/^(?:[-*•]\s*|\d+[.)]\s*)?([^:—–]{2,100}?)\s*[:—–]\s*([1-9]\d{0,8})\s*(?:เหรียญ\s*)?(gold|silver|copper|ทองแดง|ทอง|เงิน)\s*[.!]?$/iu);
        if (!match) continue;
        items.push({stockKnown:false,negotiableKnown:false,itemName:match[1].trim(),price:Number(match[2]),denomination:units[match[3].toLocaleLowerCase()]});
    }
    if (!items.length || new Set(items.map(item => item.denomination)).size !== 1) return null;
    return confirmedMarketplaceEvent({kind:'npcShop',location,seller:{name:sellers[0]},denomination:items[0].denomination,items}, story, user, location);
}

// The completed public reply is the only opening boundary. Both machine data
// and inline dialogue facts pass the same validator before reaching the dock.
export function resolveMarketplaceReply({marketplace,story,user,location,inventory=[],npcs=[],intent=null,options={}}){
    story=publicCommerceStory(story);
    if(intent?.kind==='none'||commerceDiscussionOnly(user))return {event:null,status:'no-intent',source:'none'};
    if(marketplace){
        let event=confirmedMarketplaceEvent(marketplace,story,user,location,inventory,intent,options);
        if(event&&!pricedEntriesDisclosed(event,story,event.items||[{item:event.item,askPrice:event.askPrice,denomination:event.denomination}]))event=null;
        return {event,status:event?'ready':'invalid-data',source:'inline-patch'};
    }
    const event=recoverMarketplaceShop(story,user,location,npcs,{...options,inventory});
    return {event,status:event?'ready':'no-disclosed-offer',source:'public-dialogue'};
}
