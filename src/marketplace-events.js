import { interactionEvidence, withInteractionEvidence, evidenceText, namedInteraction } from './interaction-evidence.js?v=0.51.7';
import {COMMERCE_PRICE_PATTERN} from './commerce-prices.js?v=0.51.7';
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


export const MARKETPLACE_EVENT_INSTRUCTIONS = 'Main Chat Marketplace: when the current completed scene explicitly shows a named NPC asking to buy an item the player owns, include marketplace:{kind:"npcPurchase",id,location,evidence:"exact quote",buyer:{npcId,npcName,role,budget:actual-remaining-funds-if-known},item:{itemId,itemName,category,description,quantity},askPrice,floorPrice,denomination,negotiable,message} in the same invisible patch. When the player is interacting with a named NPC shop/vendor and the NPC shows goods or quotes an item for sale, including catalog requests, revisits and negotiation while already here, include marketplace:{kind:"npcShop",id,location,evidence:"exact quote",seller:{npcId,npcName,role},title,description,denomination,items:[{id,itemId,itemName,category,description,properties:["..."],price,stock,negotiable,note}]} with at most 40 items. For an NPC buying several owned items use npcPurchase with items:[{itemId,itemName,quantity,askPrice}] instead of legacy item/askPrice. Quote every item in the same story/evidence; one budget covers the basket. The user may exclude items, change quantities and negotiate one total; never transfer before confirmation. Evidence must be an exact affirmative quote from this reply, show the present interaction; location must match the current sceneTracker location, and must not describe a plan, question, rumor, or OOC text. The extension renders the event in Main Chat. The extension opens a minimal composer strip; its offer/confirm/cancel buttons each call the current AI API and append a brief continuation to the same assistant message. The new commerce engine alone settles accepted, explicitly confirmed prices. With interactive Marketplace enabled, present terms and open the session first; do not narrate payment or delivery before its confirm action. Do not patch inventory/currency for catalog or offer events or replay already settled commerce. Preserve event IDs within an active negotiation; a new interaction after completion uses a new ID. Never create HTML or UI text in the patch.';

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

function catalogEntry(raw, index, denomination) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const item = itemRecord(raw.item || raw, { id: raw.itemId, name: raw.itemName, quantity: raw.quantity });
    const price = priceRecord(raw, { denomination });
    if (!item || !price) return null;
    return { id: clean(raw.id, 100) || `shop-item-${hash(`${index}|${key(item.name)}|${price.askPrice}`)}`, item, ...price,
        negotiable: raw.negotiable !== false, negotiableKnown: raw.negotiableKnown !== false, stockKnown: raw.stockKnown !== false, stock: integer(raw.stock, item.quantity, 1, 99999), note: clean(raw.note || raw.terms, 220) };
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
        const denomination = clean(raw.denomination, 20);
        if (!seller.name || !denominations.has(denomination)) return null;
        const entries = (Array.isArray(raw.items) ? raw.items : Array.isArray(raw.catalog) ? raw.catalog : [])
            .map((entry, index) => catalogEntry(entry, index, denomination)).filter(Boolean).slice(0, 40);
        if (!entries.length) return null;
        return { kind: 'npcShop', id: clean(raw.id, 120) || `shop-${hash(`${key(location)}|${key(seller.name)}|${evidence}`)}`,
            location, evidence, seller, denomination, status: ['pending','awaiting-reply','resolved'].includes(raw.status) ? raw.status : 'pending',
            title: clean(raw.title, 160) || `${seller.name} · Shop`, description: clean(raw.description, 360), pageSize: Math.min(8, Math.max(3, integer(raw.pageSize, 5, 3, 8))), items: entries };
    }
    return null;
}

export function confirmedMarketplaceEvent(raw, story, user, location, inventory = []) {
    const kind = String(raw?.kind || raw?.type || raw?.event || '').toLocaleLowerCase();
    const purchase=/purchase|offer/u.test(kind);
    const quotedPrice=[...String(story||'').matchAll(/<tr-dialogue\b[^>]*>([\s\S]*?)<\/tr-dialogue>/giu)].some(match=>COMMERCE_PRICE_PATTERN.test(match[1]));
    const contextShop=!purchase&&quotedPrice&&/(?:buy|shop|goods|catalog|ซื้อ|ร้าน|สินค้า|ดูของ|ต่อรอง)/iu.test(String(user||''))
        && !/(?:auction|ประมูล|พรุ่งนี้|เมื่อวาน|สมมุติ|ยังไม่|tomorrow|yesterday|hypothetical)/iu.test(String(user||''));
    const subject=purchase?buyWords:contextShop?new RegExp(`${shopWords.source}|${COMMERCE_PRICE_PATTERN.source}`,'iu'):shopWords;
    const activity=purchase?new RegExp(`${actionWords.source}|${buyWords.source}`,'iu'):contextShop?new RegExp(`${actionWords.source}|${COMMERCE_PRICE_PATTERN.source}`,'iu'):actionWords;
    const event = normalizeMarketplaceEvent(withInteractionEvidence(raw, story, location, subject, activity));
    if (!event || key(event.location) !== key(location) || !evidenceText(story).includes(evidenceText(event.evidence))) return null;
    if (/^\s*(?:\(?OOC\b|\[OOC\b)/iu.test(String(user || ''))) return null;
    if (!interactionEvidence(event.evidence, story, user, subject, activity)) return null;
    if (event.kind === 'npcPurchase') {
        if (!buyWords.test(event.evidence) || !namedInteraction(event.buyer.name, event.evidence, story)) return null;
        for(const item of (event.items||[{item:event.item}]).map(entry=>entry.item)){
            if(!key(event.evidence).includes(key(item.name)))return null;
            const owned=(inventory||[]).find(entry=>(item.id&&entry.id===item.id&&key(entry.name)===key(item.name))||(!item.id&&key(entry.name)===key(item.name)));
            if(!owned||integer(owned.quantity,0)<item.quantity)return null;
            item.id=owned.id;
        }
    } else {
        if (!subject.test(event.evidence) || !namedInteraction(event.seller.name, event.evidence, story)) return null;
        if (!buyWords.test(event.evidence) && !shopWords.test(String(story)) && !(contextShop&&COMMERCE_PRICE_PATTERN.test(event.evidence))) return null;
    }
    return event;
}

// Recover a plainly listed catalog locally when the model omits the card object.
// Only explicit item/price lines and one identified seller are usable. We never
// invent stock, hidden properties, exchange rates, purchases or auction rules.
export function recoverMarketplaceShop(story, user, location, npcs = []) {
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
