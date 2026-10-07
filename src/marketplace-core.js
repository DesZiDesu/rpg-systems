import {itemSaleBlocked} from './commerce-rights.js?v=0.58.13';
// Player-owned marketplace listings and NPC offer negotiation.
// All item and currency changes are local, explicit UI actions; story patches
// never get to create or settle a marketplace transaction.
const clean = (value, size = 180) => typeof value === 'string' ? value.trim().slice(0, size) : '';
const key = value => clean(value, 500).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
const integer = (value, fallback = 0, min = 0, max = 999999999) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
const hash = value => { let n = 2166136261; for (const ch of String(value)) n = Math.imul(n ^ ch.codePointAt(0), 16777619); return (n >>> 0).toString(36); };
const copy = value => structuredClone(value);
const denominations = ['gold', 'silver', 'copper'];
const activeStatuses = new Set(['Active', 'Negotiating']);

const buyerProfiles = [
    { id: 'collector', name: 'Mira · นักสะสม', role: 'Collector', glyph: '◇', tone: 'amethyst', patience: 0.86 },
    { id: 'merchant', name: 'Toren · พ่อค้า', role: 'Merchant', glyph: '◆', tone: 'ember', patience: 0.72 },
    { id: 'adventurer', name: 'Kael · นักผจญภัย', role: 'Adventurer', glyph: '✦', tone: 'verdant', patience: 0.64 },
];

function buyerFor(raw, seed = '') {
    const profile = buyerProfiles.find(entry => entry.id === clean(raw?.id, 40)) || buyerProfiles[hash(seed).split('').reduce((sum, char) => sum + char.codePointAt(0), 0) % buyerProfiles.length];
    const requestedName = clean(raw?.name, 100);
    return {
        id: profile.id,
        name: requestedName || profile.name,
        role: clean(raw?.role, 80) || profile.role,
        glyph: clean(raw?.glyph, 4) || profile.glyph,
        tone: clean(raw?.tone, 30) || profile.tone,
        patience: Math.min(0.98, Math.max(0.35, Number(raw?.patience) || profile.patience)),
    };
}

function offerRecord(raw, fallback = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const amount = integer(raw.amount, integer(fallback.amount, 0, 1));
    if (!amount) return null;
    const status = ['Pending', 'Countered', 'Accepted', 'Rejected', 'Expired'].includes(raw.status) ? raw.status : 'Pending';
    return {
        id: clean(raw.id, 100) || `offer-${hash(`${fallback.listingId || ''}|${fallback.buyerId || ''}|${amount}`)}`,
        buyerId: clean(raw.buyerId, 80) || clean(fallback.buyerId, 80),
        buyerName: clean(raw.buyerName, 100) || clean(fallback.buyerName, 100) || 'Unknown buyer',
        amount,
        counterAmount: integer(raw.counterAmount, 0, 0),
        status,
        round: integer(raw.round, 1, 1, 20),
        message: clean(raw.message, 300),
        createdAt: clean(raw.createdAt, 60) || clean(fallback.createdAt, 60),
        updatedAt: clean(raw.updatedAt, 60) || clean(raw.createdAt, 60) || clean(fallback.createdAt, 60),
        // Private buyer ceiling is kept in the saved state but omitted by every view.
        maxBudget: integer(raw.maxBudget, Math.max(amount, integer(fallback.maxBudget, amount)), amount),
        history: (Array.isArray(raw.history) ? raw.history : []).slice(-20).map(entry => ({
            actor: ['buyer', 'seller'].includes(entry?.actor) ? entry.actor : 'buyer',
            amount: integer(entry?.amount, amount, 1),
            at: clean(entry?.at, 60),
            message: clean(entry?.message, 240),
        })),
    };
}

export function normalizeMarketplaceListing(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const itemName = clean(raw.itemName || raw.name, 120), itemId = clean(raw.itemId, 100);
    const quantity = integer(raw.quantity, 0, 1, 99999), askPrice = integer(raw.askPrice, 0, 1), floorPrice = integer(raw.floorPrice, askPrice, 1);
    if (!itemName || !quantity || !askPrice || !floorPrice || floorPrice > askPrice || !denominations.includes(raw.denomination)) return null;
    const status = ['Active', 'Negotiating', 'Sold', 'Cancelled', 'Expired'].includes(raw.status) ? raw.status : 'Active';
    const buyer = buyerFor(raw.buyer, `${itemId}|${itemName}`);
    const offers = (Array.isArray(raw.offers) ? raw.offers : []).map(entry => offerRecord(entry, {
        listingId: raw.id, buyerId: buyer.id, buyerName: buyer.name, createdAt: raw.createdAt,
    })).filter(Boolean).slice(-10);
    const lastOffer = offers.at(-1);
    return {
        id: clean(raw.id, 100) || `listing-${hash(`${itemId}|${key(itemName)}|${raw.createdAt || ''}`)}`,
        itemId,
        itemName,
        category: clean(raw.category, 60) || 'Other',
        description: clean(raw.description, 300),
        quantity,
        askPrice,
        floorPrice,
        denomination: raw.denomination,
        status,
        buyer,
        offers,
        lastOfferId: clean(raw.lastOfferId, 100) || lastOffer?.id || '',
        soldPrice: integer(raw.soldPrice, 0, 0),
        revision: integer(raw.revision),
        currencyName: clean(raw.currencyName, 120),
        createdAt: clean(raw.createdAt, 60) || new Date().toISOString(),
        updatedAt: clean(raw.updatedAt, 60) || clean(raw.createdAt, 60) || new Date().toISOString(),
    };
}

export function normalizeMarketplace(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const listings = [], ids = new Set();
    for (const value of Array.isArray(source.listings) ? source.listings : []) {
        const listing = normalizeMarketplaceListing(value);
        if (!listing || ids.has(listing.id)) continue;
        ids.add(listing.id); listings.push(listing);
    }
    const receipts = [], receiptIds = new Set();
    for (const value of Array.isArray(source.receipts) ? source.receipts : []) {
        const id = clean(value?.id, 120), listingId = clean(value?.listingId, 100);
        if (!id || !listingId || receiptIds.has(id)) continue;
        receiptIds.add(id); receipts.push({ id, listingId, itemName: clean(value.itemName, 120), quantity: integer(value.quantity, 1, 1), amount: integer(value.amount, 1, 1), denomination: denominations.includes(value.denomination) ? value.denomination : 'gold', buyerName: clean(value.buyerName, 100), at: clean(value.at, 60) });
    }
    for (const listing of listings) {
        const receipt = receipts.find(entry => entry.listingId === listing.id);
        if (receipt) { listing.status = 'Sold'; listing.soldPrice = receipt.amount; }
    }
    // Never prune commitments or settlement receipts.
    return { listings: [...listings.filter(entry => !activeStatuses.has(entry.status)).slice(-100), ...listings.filter(entry => activeStatuses.has(entry.status))], receipts };
}

export function marketplaceInventoryValid(state) {
    const reservations = new Map();
    for (const listing of state.marketplace?.listings || []) if (activeStatuses.has(listing.status)) {
        reservations.set(listing.itemId, (reservations.get(listing.itemId) || 0) + listing.quantity);
        if (listing.currencyName && listing.currencyName !== state.progression?.currency?.name) return false;
    }
    return [...reservations].every(([id, quantity]) => {
        const item = state.inventory?.find(entry => entry.id === id);
        return item && Number(item.quantity) >= quantity;
    });
}

export function marketplaceReservedQuantity(state, itemId, itemName = '') {
    return (state.marketplace?.listings || []).filter(listing => activeStatuses.has(listing.status)
        && ((itemId && listing.itemId === itemId) || (!itemId && key(listing.itemName) === key(itemName))))
        .reduce((sum, listing) => sum + listing.quantity, 0);
}

export function marketplaceAvailableQuantity(state, item) {
    if (!item || itemSaleBlocked(state,item.id)) return 0;
    return Math.max(0, integer(item.quantity, 0) - marketplaceReservedQuantity(state, item.id, item.name));
}

export function marketplacePublicListing(listing) {
    if (!listing) return null;
    const buyer = { id: listing.buyer.id, name: listing.buyer.name, role: listing.buyer.role, glyph: listing.buyer.glyph, tone: listing.buyer.tone };
    return { ...listing, buyer, offers: listing.offers.map(offer => { const { maxBudget, ...publicOffer } = offer; return publicOffer; }) };
}

export function marketplaceView(state) {
    const marketplace = normalizeMarketplace(state.marketplace);
    const listings = marketplace.listings.map(marketplacePublicListing);
    const active = listings.filter(listing => activeStatuses.has(listing.status));
    const sold = listings.filter(listing => listing.status === 'Sold');
    const earnings = Object.fromEntries(denominations.map(denomination => [denomination, marketplace.receipts.filter(receipt => receipt.denomination === denomination).reduce((sum, receipt) => sum + receipt.amount, 0)]));
    return {
        listings,
        active,
        sold,
        earnings,
        currencyName: state.progression?.currency?.name || 'Coins',
        denomination: 'gold',
        availableItems: (state.inventory || []).map(item => ({ ...item, available: marketplaceAvailableQuantity(state, item) })).filter(item => item.available > 0),
    };
}

export function marketplaceErrorText(error, thai = false) {
    const text = {
        disabled: ['ตลาดต่อรองปิดอยู่ เปิดจากการตั้งค่าระบบเสริมก่อนใช้งาน', 'Marketplace is off. Enable it in optional systems first.'],
        item: ['เลือกไอเทมและจำนวนที่ต้องการขายให้ถูกต้อง', 'Choose a valid item and quantity.'],
        price: ['ราคาตั้งและราคาขั้นต่ำไม่ถูกต้อง', 'Ask and floor prices are invalid.'],
        reserved: ['จำนวนไอเทมที่ขายได้ไม่พอ เพราะมีรายการถูกกันไว้แล้ว', 'Not enough unreserved quantity is available.'],
        active: ['รายการนี้ปิดไปแล้ว', 'This listing is already closed.'],
        offer: ['ยังไม่มี Offer ที่ใช้ดำเนินการได้', 'There is no actionable offer.'],
        round: ['ถึงจำนวนรอบต่อรองสูงสุดแล้ว', 'The negotiation round limit has been reached.'],
        funds: ['บันทึกเงินที่ได้จากการขายไม่สำเร็จ', 'The sale could not be saved.'],
        stale: ['ข้อมูลรายการเปลี่ยนไปแล้ว กรุณาเปิดใหม่', 'The listing changed. Reopen it and try again.'],
        save: ['บันทึกไม่สำเร็จ สถานะเดิมถูกคืนกลับแล้ว', 'Save failed. The previous state was restored.'],
        invalid: ['ข้อมูลตลาดไม่สมบูรณ์', 'Invalid marketplace data.'],
        saving: ['กำลังบันทึกตลาด…', 'Saving marketplace…'],
        generating: ['รอคำตอบปัจจุบันจบก่อนใช้ตลาด', 'Wait until the current reply finishes.'],
        limit: ['เปิดรายการครบ 100 รายการแล้ว ปิดรายการเดิมก่อน', 'The 100 active listing limit has been reached.'],
    };
    return text[error]?.[thai ? 0 : 1] || (thai ? 'ดำเนินการตลาดไม่สำเร็จ' : 'Marketplace action failed.');
}

export function createMarketplaceListing(state, input, now = new Date().toISOString()) {
    const fail = error => ({ ok: false, error, next: state, events: [] });
    const source = state.inventory?.find(item => item.id === clean(input?.itemId, 100));
    const quantity = integer(input?.quantity, 0, 1, 99999), askPrice = integer(input?.askPrice, 0, 1), floorPrice = integer(input?.floorPrice, askPrice, 1);
    if (!source || !quantity) return fail('item');
    if (!askPrice || !floorPrice || floorPrice > askPrice) return fail('price');
    if (marketplaceAvailableQuantity(state, source) < quantity) return fail('reserved');
    const next = copy(state), marketplace = normalizeMarketplace(next.marketplace);
    if (marketplace.listings.filter(entry => activeStatuses.has(entry.status)).length >= 100) return fail('limit');
    const id = `listing-${hash(`${source.id}|${now}|${marketplace.listings.length}`)}`;
    const buyer = buyerFor(input?.buyer, `${id}|${source.name}`);
    const listing = normalizeMarketplaceListing({
        id, itemId: source.id, itemName: source.name, category: source.category, description: source.description,
        quantity, askPrice, floorPrice, denomination: denominations.includes(input?.denomination) ? input.denomination : 'gold',
        status: 'Active', buyer, createdAt: now, updatedAt: now, offers: [], currencyName: state.progression.currency.name,
    });
    marketplace.listings.push(listing); next.marketplace = marketplace;
    return { ok: true, next, events: [{ type: 'listed', listingId: listing.id, itemName: listing.itemName, quantity, amount: askPrice }] };
}

function settleListing(next, listing, offer, now, events) {
    const inventory = next.inventory || [], itemIndex = inventory.findIndex(item => item.id === listing.itemId);
    const item = itemIndex >= 0 ? inventory[itemIndex] : null;
    if (!item || item.quantity < listing.quantity) return { ok: false, error: 'reserved' };
    if (next.marketplace.receipts.some(receipt => receipt.listingId === listing.id)) return { ok: false, error: 'active' };
    const amount = offer.amount;
    if (!amount || amount < listing.floorPrice) return { ok: false, error: 'price' };
    if ((next.progression.currency[listing.denomination] || 0) + amount > 999999999) return { ok: false, error: 'funds' };
    item.quantity -= listing.quantity;
    if (item.quantity <= 0) inventory.splice(itemIndex, 1);
    next.progression.currency[listing.denomination] = integer(next.progression.currency[listing.denomination], 0) + amount;
    listing.status = 'Sold'; listing.soldPrice = amount; listing.updatedAt = now; listing.lastOfferId = offer.id;
    offer.status = 'Accepted'; offer.amount = amount; offer.counterAmount = 0; offer.updatedAt = now;
    next.marketplace.receipts.push({ id: `sale-${hash(`${listing.id}|${offer.id}|${now}`)}`, listingId: listing.id, itemName: listing.itemName, quantity: listing.quantity, amount, denomination: listing.denomination, buyerName: offer.buyerName, at: now });
    events.push({ type: 'sold', itemName: listing.itemName, quantity: listing.quantity, amount, buyerName: offer.buyerName });
    return { ok: true };
}

export function applyMarketplaceAction(state, id, action, options = {}) {
    const fail = error => ({ ok: false, error, next: state, events: [] });
    const next = copy(state); next.marketplace = normalizeMarketplace(next.marketplace);
    const listing = next.marketplace.listings.find(entry => entry.id === clean(id, 100));
    if (!listing) return fail('invalid');
    if (options.revision !== listing.revision) return fail('stale');
    const now = options.now || new Date().toISOString(), events = [];
    const lastOffer = listing.offers.find(offer => offer.id === listing.lastOfferId) || listing.offers.at(-1);
    const publicAction = ['invite', 'counter', 'respond', 'accept', 'reject', 'cancel'].includes(action);
    if (!publicAction) return fail('invalid');
    if (action === 'cancel') {
        if (!activeStatuses.has(listing.status)) return fail('active');
        if (lastOffer?.status === 'Accepted') return fail('active');
        listing.status = 'Cancelled'; listing.updatedAt = now;
        if (lastOffer && ['Pending', 'Countered'].includes(lastOffer.status)) lastOffer.status = 'Rejected';
        events.push({ type: 'cancelled', itemName: listing.itemName });
    } else if (action === 'invite') {
        if (!activeStatuses.has(listing.status)) return fail('active');
        if (lastOffer && ['Pending', 'Countered'].includes(lastOffer.status)) return fail('offer');
        const initial = Math.max(listing.floorPrice, Math.min(listing.askPrice, Math.floor(listing.askPrice * 0.72)));
        const maxBudget = Math.max(initial, Math.floor(listing.askPrice * (1.02 + listing.buyer.patience * 0.2)));
        const offer = offerRecord({ id: `offer-${hash(`${listing.id}|${listing.offers.length}|${now}`)}`, buyerId: listing.buyer.id, buyerName: listing.buyer.name, amount: initial, maxBudget, status: 'Pending', round: 1, message: 'สนใจไอเทมนี้ ขอเสนอราคาตามงบของฉัน', createdAt: now, updatedAt: now, history: [{ actor: 'buyer', amount: initial, at: now, message: 'Initial offer' }] });
        listing.offers.push(offer); listing.lastOfferId = offer.id; listing.status = 'Negotiating'; listing.updatedAt = now; events.push({ type: 'offer', itemName: listing.itemName, amount: initial, buyerName: listing.buyer.name });
    } else {
        if (!activeStatuses.has(listing.status) && listing.status !== 'Negotiating') return fail('active');
        if (!lastOffer || !['Pending', 'Countered'].includes(lastOffer.status)) return fail('offer');
        if (action === 'accept') {
            if (lastOffer.status !== 'Pending') return fail('offer');
            const settled = settleListing(next, listing, lastOffer, now, events); if (!settled.ok) return fail(settled.error);
        } else if (action === 'reject') {
            lastOffer.status = 'Rejected'; lastOffer.updatedAt = now; listing.status = 'Active'; listing.updatedAt = now; events.push({ type: 'rejected', itemName: listing.itemName });
        } else if (action === 'counter') {
            if (lastOffer.status !== 'Pending') return fail('offer');
            const amount = integer(options.amount, 0, 1);
            if (!amount || amount < listing.floorPrice || amount > 999999999) return fail('price');
            if (lastOffer.round >= 10) return fail('round');
            lastOffer.counterAmount = amount; lastOffer.status = 'Countered'; lastOffer.round += 1; lastOffer.updatedAt = now;
            lastOffer.history.push({ actor: 'seller', amount, at: now, message: 'Seller counteroffer' }); lastOffer.history = lastOffer.history.slice(-20);
            listing.updatedAt = now; events.push({ type: 'countered', itemName: listing.itemName, amount, buyerName: lastOffer.buyerName });
        } else if (action === 'respond') {
            if (lastOffer.status !== 'Countered' || !lastOffer.counterAmount) return fail('offer');
            const counter = lastOffer.counterAmount;
            if (counter <= lastOffer.maxBudget) {
                lastOffer.amount = counter; lastOffer.counterAmount = 0; lastOffer.message = 'ผู้ซื้อยอมรับราคาที่ต่อรองแล้ว';
                const settled = settleListing(next, listing, lastOffer, now, events); if (!settled.ok) return fail(settled.error);
            } else {
                const nextAmount = Math.max(lastOffer.amount, Math.min(lastOffer.maxBudget, Math.floor((lastOffer.amount + counter) / 2)));
                if (nextAmount <= lastOffer.amount || lastOffer.round >= 10) { lastOffer.status = 'Rejected'; lastOffer.updatedAt = now; listing.status = 'Active'; events.push({ type: 'rejected', itemName: listing.itemName }); }
                else {
                    lastOffer.amount = nextAmount; lastOffer.counterAmount = 0; lastOffer.status = 'Pending'; lastOffer.round += 1; lastOffer.updatedAt = now; lastOffer.message = 'ผู้ซื้อเสนอราคาใหม่หลังจากพิจารณา Counteroffer';
                    lastOffer.history.push({ actor: 'buyer', amount: nextAmount, at: now, message: 'Buyer response' }); lastOffer.history = lastOffer.history.slice(-20); events.push({ type: 'offer', itemName: listing.itemName, amount: nextAmount, buyerName: lastOffer.buyerName });
                }
            }
            listing.updatedAt = now;
        }
    }
    listing.revision++;
    if (!marketplaceInventoryValid(next)) return fail('reserved');
    return { ok: true, next, events };
}

export function marketplaceBlocksOperation(operation) {
    if (!Array.isArray(operation)) return false;
    const [, path, , meta] = operation;
    return path === 'marketplace' || /^marketplace\./u.test(String(path)) || Boolean(meta?.marketplaceId || meta?.listingId || meta?.offerId)
        || (path === 'inventory' || /^progression\.currency\./u.test(String(path))) && /marketplace|ตลาดต่อรอง/iu.test(`${meta?.reason || ''} ${meta?.category || ''}`);
}

export const MARKETPLACE_INSTRUCTIONS = 'Player-owned Marketplace listings and their local NPC offer simulation are UI-owned state. Never create, edit, settle, cancel or pay those listing records through story patches. Main Chat NPC purchase/shop events are a separate narrative flow: the event card sends a visible player action, and only the following AI reply may record the confirmed outcome with ordinary inventory and progression.currency operations plus category sale or purchase. Never grant, remove, or charge anything merely because a card was displayed, clicked, or countered.';
