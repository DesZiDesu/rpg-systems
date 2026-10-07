import { marketplaceErrorText } from './marketplace-core.js?v=0.58.13';

const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };

export function renderMarketplacePanel(panel, view, api) {
    if (!panel) return;
    const thai = api.settings().language === 'th';
    const t = (th, en) => thai ? th : en;
    const price = (value, denomination = view.denomination) => `${Number(value || 0).toLocaleString(thai ? 'th-TH' : 'en-US')} ${t({ gold: 'ทอง', silver: 'เงิน', copper: 'ทองแดง' }[denomination], denomination)}`;
    panel.replaceChildren();
    const root = node('section', 'trpg-marketplace');
    const header = node('header', 'trpg-marketplace-header');
    const mark = node('div', 'trpg-marketplace-mark', '⇄'); mark.setAttribute('aria-hidden', 'true');
    const heading = node('div', 'trpg-marketplace-heading'); heading.append(node('small', '', 'ROLEFORGE · MARKETPLACE'), node('h3', '', t('ตลาดต่อรองราคา', 'Negotiated Marketplace')), node('p', '', t('ลงขายไอเทม รับข้อเสนอ และต่อรองกับผู้ซื้อในตลาด', 'List an item, receive an offer, and negotiate with a buyer.')));
    header.append(mark, heading); root.append(header);

    const stats = node('div', 'trpg-marketplace-stats');
    const earned = Object.entries(view.earnings || {}).filter(([, value]) => value).map(([denomination, value]) => price(value, denomination)).join(' · ') || price(0);
    for (const [label, value, tone] of [[t('รายการที่เปิดอยู่', 'Active listings'), view.active.length, 'gold'], [t('รายการขายสำเร็จ', 'Completed sales'), view.sold.length, 'green'], [t('รายได้สะสม', 'Earned'), earned, 'blue']]) {
        const card = node('article', `trpg-marketplace-stat is-${tone}`); card.append(node('small', '', label), node('strong', '', String(value))); stats.append(card);
    }
    root.append(stats);

    const editor = node('details', 'trpg-marketplace-editor'); editor.open = view.availableItems.length > 0 && !view.active.length;
    const summary = node('summary', '', t('＋ ลงรายการไอเทมเพื่อขาย', '＋ Create a sell listing')); editor.append(summary);
    const form = node('form', 'trpg-marketplace-form'); form.dataset.marketForm = 'create';
    const field = (label, control) => { const wrap = node('label', 'trpg-marketplace-field'); wrap.append(node('span', '', label), control); return wrap; };
    const itemSelect = node('select', ''); itemSelect.name = 'itemId'; itemSelect.required = true;
    for (const item of view.availableItems) { const option = node('option', '', `${item.name} · ${t('เหลือ', 'available')} ${item.available}`); option.value = item.id; option.dataset.max = String(item.available); itemSelect.append(option); }
    const quantity = node('input', ''); quantity.type = 'number'; quantity.name = 'quantity'; quantity.min = '1'; quantity.step = '1'; quantity.value = view.availableItems[0]?.available ? '1' : ''; quantity.inputMode = 'numeric'; quantity.required = true;
    const ask = node('input', ''); ask.type = 'number'; ask.name = 'askPrice'; ask.min = '1'; ask.step = '1'; ask.placeholder = t('ราคาที่อยากได้', 'Target price'); ask.required = true; ask.inputMode = 'numeric';
    const floor = node('input', ''); floor.type = 'number'; floor.name = 'floorPrice'; floor.min = '1'; floor.step = '1'; floor.placeholder = t('ราคาต่ำสุด', 'Lowest acceptable'); floor.required = true; floor.inputMode = 'numeric';
    quantity.max = String(view.availableItems[0]?.available || 1);
    itemSelect.addEventListener('change', () => { quantity.max = itemSelect.selectedOptions[0]?.dataset.max || '1'; });
    const currency = node('select', ''); currency.name = 'denomination'; for (const [id, label] of [['gold', t('ทอง', 'Gold')], ['silver', t('เงิน', 'Silver')], ['copper', t('ทองแดง', 'Copper')]]) { const option = node('option', '', label); option.value = id; currency.append(option); }
    const buyer = node('select', ''); buyer.name = 'buyerId'; for (const [id, label] of [['collector', t('นักสะสม', 'Collector')], ['merchant', t('พ่อค้า', 'Merchant')], ['adventurer', t('นักผจญภัย', 'Adventurer')]]) { const option = node('option', '', label); option.value = id; buyer.append(option); }
    form.append(field(t('ไอเทม', 'Item'), itemSelect), field(t('จำนวน', 'Quantity'), quantity), field(t('ราคาตั้ง', 'Ask price'), ask), field(t('ราคาต่ำสุด', 'Floor price'), floor), field(t('สกุลเงิน', 'Currency'), currency), field(t('กลุ่มผู้ซื้อ', 'Buyer profile'), buyer));
    const createButton = node('button', 'trpg-marketplace-primary', t('ลงรายการขาย', 'Create listing')); createButton.type = 'submit'; createButton.disabled = !view.availableItems.length; form.append(createButton); editor.append(form); root.append(editor);

    const status = node('p', 'trpg-marketplace-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    let busy = false;
    const execute = async operation => {
        if (!root.isConnected || busy || view.busy || api.valid?.() === false) return;
        busy = true; root.setAttribute('aria-busy', 'true');
        status.textContent = marketplaceErrorText('saving', thai);
        const controls = [...root.querySelectorAll('button,input,select')].map(el => [el, el.disabled]);
        controls.forEach(([el]) => { el.disabled = true; });
        try {
            const result = await operation();
            if (!result?.ok) {
                // Host rendering may replace this root while the save is pending.
                const target = panel.querySelector('.trpg-marketplace-status') || status;
                target.textContent = marketplaceErrorText(result?.error || 'save', thai);
            } else api.refresh?.();
        } catch { (panel.querySelector('.trpg-marketplace-status') || status).textContent = marketplaceErrorText('save', thai); }
        finally { busy = false; root.removeAttribute('aria-busy'); controls.forEach(([el, disabled]) => { el.disabled = disabled; }); }
    };
    const listingWrap = node('div', 'trpg-marketplace-listings');
    if (!view.listings.length) listingWrap.append(node('div', 'trpg-marketplace-empty', t('ยังไม่มีรายการขาย ลองลงขายไอเทมชิ้นแรกของคุณ', 'No listings yet. Create your first sell listing.')));
    for (const listing of view.listings.slice().reverse()) listingWrap.append(renderListing(listing, { thai, t, price, api, status, execute }));
    root.append(status, listingWrap); panel.append(root);

    if (view.busy) root.querySelectorAll('button,input,select').forEach(el => { el.disabled = true; });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const data = new FormData(form);
        await execute(() => api.createListing({ itemId: data.get('itemId'), quantity: Number(data.get('quantity')), askPrice: Number(data.get('askPrice')), floorPrice: Number(data.get('floorPrice')), denomination: data.get('denomination'), buyer: { id: data.get('buyerId') } }));
    });
}

function renderListing(listing, context) {
    const { thai, t, price, api, status, execute } = context;
    const card = node('article', `trpg-marketplace-listing is-${listing.status.toLowerCase()}`); card.dataset.listingId = listing.id;
    const top = node('header', 'trpg-marketplace-listing-head');
    const icon = node('span', `trpg-marketplace-buyer-mark is-${listing.buyer.tone}`, listing.buyer.glyph); icon.setAttribute('aria-hidden', 'true');
    const title = node('div', 'trpg-marketplace-listing-title');
    title.append(node('small', '', `${listing.category} · ×${listing.quantity}`), node('h4', '', listing.itemName), node('p', '', `${t('ผู้ซื้อเป้าหมาย', 'Buyer')} · ${listing.buyer.name} · ${listing.buyer.role}`));
    const badge = node('b', 'trpg-marketplace-badge', t({ Active: 'เปิดรับข้อเสนอ', Negotiating: 'กำลังต่อรอง', Sold: 'ขายแล้ว', Cancelled: 'ยกเลิกแล้ว', Expired: 'หมดอายุ' }[listing.status], listing.status));
    top.append(icon, title, badge); card.append(top);
    if (listing.description) card.append(node('p', 'trpg-marketplace-listing-description', listing.description));

    const intent = node('div', 'trpg-marketplace-intent');
    intent.append(node('span', 'trpg-marketplace-intent-label', t('เจตนาของผู้ซื้อ', 'Buyer intent')),
        node('span', '', buyerIntent(listing.buyer, t)));
    card.append(intent);

    const priceLine = node('div', 'trpg-marketplace-price-line');
    const askCell = node('div', 'trpg-marketplace-price-cell'); askCell.append(node('small', '', t('ราคาตั้งรวม', 'Total ask')), node('strong', '', price(listing.askPrice, listing.denomination)));
    const floorCell = node('div', 'trpg-marketplace-price-cell'); floorCell.append(node('small', '', t('ราคาต่ำสุด', 'Lowest')), node('strong', '', price(listing.floorPrice, listing.denomination)));
    const spread = Math.max(0, Number(listing.askPrice) - Number(listing.floorPrice));
    const spreadCell = node('div', 'trpg-marketplace-price-cell'); spreadCell.append(node('small', '', t('ส่วนต่างต่อรอง', 'Negotiation room')), node('strong', '', price(spread, listing.denomination)));
    priceLine.append(askCell, floorCell, spreadCell); card.append(priceLine);
    if (listing.status === 'Sold' && listing.soldPrice) {
        const settlement = node('div', 'trpg-marketplace-settlement');
        settlement.append(node('span', '', t('ปิดบัญชีแล้ว', 'Settled')), node('strong', '', price(listing.soldPrice, listing.denomination)));
        card.append(settlement);
    }
    const offers = node('div', 'trpg-marketplace-offers');
    const latest = listing.offers.at(-1);
    if (!listing.offers.length && ['Active', 'Negotiating'].includes(listing.status)) {
        const invite = node('button', 'trpg-marketplace-primary', t('ขอข้อเสนอจากผู้ซื้อ', 'Request buyer offer')); invite.type = 'button'; invite.dataset.marketAction = 'invite'; invite.dataset.listingId = listing.id; offers.append(invite);
    } else {
        for (const offer of listing.offers.slice().reverse().slice(0, 3)) offers.append(renderOffer(listing, offer, context));
        if (latest && ['Rejected', 'Accepted'].includes(latest.status) && listing.status === 'Active') { const invite = node('button', '', t('ขอข้อเสนอรอบใหม่', 'Request a new offer')); invite.type = 'button'; invite.dataset.marketAction = 'invite'; invite.dataset.listingId = listing.id; offers.append(invite); }
    }
    card.append(offers);
    if (['Active', 'Negotiating'].includes(listing.status)) { const cancel = node('button', 'trpg-marketplace-cancel', t('ยกเลิกรายการ', 'Cancel listing')); cancel.type = 'button'; cancel.dataset.marketAction = 'cancel'; cancel.dataset.listingId = listing.id; card.append(cancel); }
    card.addEventListener('click', async event => {
        const button = event.target.closest('[data-market-action]');
        if (!button || button.closest('.trpg-marketplace-offer')) return;
        await context.execute(() => api.runAction(listing.id, button.dataset.marketAction, undefined, listing.revision));
    });
    return card;
}

function renderOffer(listing, offer, context) {
    const { thai, t, price, api, status, execute } = context;
    const row = node('article', `trpg-marketplace-offer is-${offer.status.toLowerCase()}`); row.dataset.offerId = offer.id;
    const head = node('div', 'trpg-marketplace-offer-head'); head.append(node('strong', '', `${offer.buyerName} · ${t('รอบ', 'Round')} ${offer.round}`), node('b', '', `${t('เสนอ', 'Offer')} ${price(offer.amount, listing.denomination)}`)); row.append(head);
    if (offer.counterAmount) row.append(node('p', 'trpg-marketplace-counter-note', `${t('Counteroffer ของคุณ', 'Your counteroffer')}: ${price(offer.counterAmount, listing.denomination)}`));
    if (offer.message) row.append(node('p', 'trpg-marketplace-offer-message', offer.message));
    if (offer.history?.length) {
        const details = node('details', 'trpg-marketplace-history');
        const summary = node('summary', '', `${t('เปิดสมุดบันทึกการต่อรอง', 'Open negotiation ledger')} · ${offer.history.length} ${t('รายการ', 'entries')}`);
        const timeline = node('ol', 'trpg-marketplace-history-list');
        for (const entry of offer.history.slice().reverse()) {
            const item = node('li', `is-${entry.actor}`);
            const line = node('div', 'trpg-marketplace-history-line');
            line.append(node('strong', '', entry.actor === 'seller' ? t('คุณ', 'You') : offer.buyerName), node('b', '', price(entry.amount, listing.denomination)));
            item.append(line);
            if (entry.message) item.append(node('span', '', entry.message));
            timeline.append(item);
        }
        details.append(summary, timeline); row.append(details);
    }
    const controls = node('div', 'trpg-marketplace-offer-controls');
    if (['Active', 'Negotiating'].includes(listing.status) && ['Pending', 'Countered'].includes(offer.status)) {
        const accept = node('button', 'trpg-marketplace-primary', t('รับข้อเสนอ', 'Accept offer')); accept.type = 'button'; accept.dataset.marketAction = 'accept'; accept.dataset.listingId = listing.id; if (offer.status === 'Pending') controls.append(accept);
        const counterForm = node('form', 'trpg-marketplace-counter-form'); counterForm.dataset.marketForm = 'counter'; counterForm.dataset.listingId = listing.id;
        const input = node('input', ''); input.type = 'number'; input.name = 'amount'; input.min = String(listing.floorPrice); input.step = '1'; input.required = true; input.max = '999999999'; input.value = String(offer.counterAmount || Math.max(listing.floorPrice, listing.askPrice)); input.inputMode = 'numeric'; input.setAttribute('aria-label', t('ราคาที่จะต่อรอง', 'Counteroffer amount'));
        const submit = node('button', '', t('ต่อรอง', 'Counter')); submit.type = 'submit'; counterForm.append(input, submit); if (offer.status === 'Pending' && offer.round < 10) controls.append(counterForm);
        counterForm.addEventListener('submit', async event => {
            event.preventDefault();
            await context.execute(() => api.runAction(listing.id, 'counter', Number(new FormData(counterForm).get('amount')), listing.revision));
        });
        const reject = node('button', '', t('ปฏิเสธ', 'Reject')); reject.type = 'button'; reject.dataset.marketAction = 'reject'; reject.dataset.listingId = listing.id; controls.append(reject);
        if (offer.status === 'Countered') { const respond = node('button', '', t('รอคำตอบผู้ซื้อ', 'Ask buyer to respond')); respond.type = 'button'; respond.dataset.marketAction = 'respond'; respond.dataset.listingId = listing.id; controls.append(respond); }
    } else row.append(node('p', 'trpg-marketplace-offer-closed', t({ Accepted: 'ปิดการขายแล้ว', Rejected: 'ผู้ซื้อปฏิเสธหรือข้อเสนอถูกปิด', Expired: 'ข้อเสนอหมดอายุ' }[offer.status], offer.status)));
    row.append(controls);
    row.addEventListener('click', async event => {
        const button = event.target.closest('[data-market-action]');
        if (!button) return;
        await context.execute(() => api.runAction(listing.id, button.dataset.marketAction, undefined, listing.revision));
    });
    return row;
}

function buyerIntent(buyer, t) {
    const id = buyer?.id;
    if (id === 'collector') return t('ตามหาของหายากเพื่อเก็บเข้าคลังส่วนตัว', 'Seeking a rare piece for a private collection');
    if (id === 'merchant') return t('มองหาสินค้าที่หมุนเวียนต่อในตลาดได้', 'Looking for stock that can be resold');
    if (id === 'adventurer') return t('ต้องใช้ไอเทมสำหรับการเดินทางครั้งถัดไป', 'Needs the item for an upcoming expedition');
    return t('ต้องการไอเทมชิ้นนี้จากตลาด', 'Interested in this item from the market');
}
