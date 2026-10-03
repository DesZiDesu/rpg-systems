// Main Chat commerce events. These are narrative prompts, not local settlements.
// A confirmed NPC offer/shop is rendered in the assistant message; the player's
// button creates a normal visible role-play reply. The following AI turn owns
// the actual inventory/currency patch.
const clean = (value, max = 240) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const key = value => clean(value, 600).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
const integer = (value, fallback = 0, min = 0, max = 999999999) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
const hash = value => { let n = 2166136261; for (const ch of String(value)) n = Math.imul(n ^ ch.codePointAt(0), 16777619); return (n >>> 0).toString(36); };
const denominations = new Set(['gold', 'silver', 'copper']);
const buyWords = /(?:buy|purchase|offer|pay|sell\s+you|ซื้อ|ขอซื้อ|รับซื้อ|เสนอราคา|จ่าย)/iu;
const shopWords = /(?:shop|store|stall|vendor|merchant|sell(?:s|ing)?|goods|ขาย|ร้าน|แผง|สินค้า|ของให้เลือก)/iu;
const actionWords = /(?:say|tell|ask|offer|hand|show|bring|walk|enter|approach|visit|stand|open|พูด|บอก|ถาม|ขอ|ยื่น|นำ|เดิน|เข้า|เปิด|ไปหา|มาถึง|ดู)/iu;
const futureWords = /(?:not yet|haven['’]?t|hasn['’]?t|did not|don['’]?t|cannot|can't|never|tomorrow|plan(?:s|ning)? to|might|would|if you|will|ยังไม่ได้|ไม่ได้|พรุ่งนี้|ตั้งใจจะ|วางแผนจะ|อาจ|ถ้า|หาก)/iu;

export const MARKETPLACE_EVENT_INSTRUCTIONS = 'Main Chat Marketplace: when the current completed scene explicitly shows a named NPC asking to buy an item the player owns, include marketplace:{kind:"npcPurchase",id,location,evidence:"exact quote",buyer:{npcId,npcName,role},item:{itemId,itemName,category,description,quantity},askPrice,floorPrice,denomination,negotiable,message} in the same invisible patch. When the player actually enters or approaches a named NPC shop/vendor and the NPC shows goods for sale, include marketplace:{kind:"npcShop",id,location,evidence:"exact quote",seller:{npcId,npcName,role},title,description,denomination,items:[{id,itemId,itemName,category,description,properties:["..."],price,stock,negotiable,note}]} with at most 40 items. Evidence must be an exact affirmative quote from this reply, include the current place and the interaction, and must not describe a plan, question, rumor, or OOC text. The extension renders the event in Main Chat. Buttons send a normal visible player reply and wait for the next AI reply; do not patch inventory or currency for the offer itself. On the following reply, settle only the outcome explicitly accepted in the visible player action by applying the normal inventory and progression.currency operations together with metadata category:"sale" or "purchase" and a concrete reason. A counteroffer is not a sale until the NPC accepts it. Never create HTML or UI text in the patch.';

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
        negotiable: raw.negotiable !== false, stock: integer(raw.stock, item.quantity, 1, 99999), note: clean(raw.note || raw.terms, 220) };
}

export function normalizeMarketplaceEvent(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const kind = clean(raw.kind || raw.type || raw.event, 40).toLocaleLowerCase();
    const location = clean(raw.location, 180), evidence = clean(raw.evidence, 600);
    if (!location || !evidence) return null;
    if (kind === 'npcpurchase' || kind === 'purchaseoffer' || kind === 'npc-offer' || kind === 'offer') {
        const buyerRaw = raw.buyer || raw.npc || {};
        const buyer = { id: clean(buyerRaw.id || buyerRaw.npcId, 100), name: clean(buyerRaw.name || buyerRaw.npcName, 120), role: clean(buyerRaw.role, 100) || 'Buyer' };
        const item = itemRecord(raw.item || raw, { id: raw.itemId, name: raw.itemName, quantity: raw.quantity });
        const price = priceRecord(raw);
        if (!buyer.name || !item || !price) return null;
        return { kind: 'npcPurchase', id: clean(raw.id, 120) || `purchase-${hash(`${key(location)}|${key(buyer.name)}|${key(item.name)}|${evidence}`)}`,
            location, evidence, buyer, item, ...price, status: ['pending','awaiting-reply','resolved'].includes(raw.status) ? raw.status : 'pending',
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
    const event = normalizeMarketplaceEvent(raw);
    if (!event || key(event.location) !== key(location) || event.evidence.length < 8 || !String(story).includes(event.evidence)) return null;
    if (/^\s*(?:\(?OOC\b|\[OOC\b)/iu.test(String(user || ''))) return null;
    if (futureWords.test(event.evidence)) return null;
    if (!actionWords.test(event.evidence)) return null;
    if (event.kind === 'npcPurchase') {
        if (!buyWords.test(event.evidence) || !event.item.name || !key(event.evidence).includes(key(event.item.name)) || !key(event.evidence).includes(key(event.buyer.name))) return null;
        const owned = (inventory || []).find(entry => (event.item.id && entry.id === event.item.id && key(entry.name) === key(event.item.name)) || (!event.item.id && key(entry.name) === key(event.item.name)));
        if (!owned || integer(owned.quantity, 0) < event.item.quantity) return null;
    } else {
        if (!shopWords.test(event.evidence) || !key(event.evidence).includes(key(event.seller.name))) return null;
        if (!buyWords.test(event.evidence) && !shopWords.test(String(story))) return null;
    }
    return event;
}
