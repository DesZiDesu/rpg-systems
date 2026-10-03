const node = (tag, cls = '', text) => {
    const value = document.createElement(tag);
    value.className = cls;
    if (text !== undefined) value.textContent = text;
    return value;
};

export function renderMarketplaceChatCard(listing, messageId, api) {
    if (!listing) return null;
    if (listing.kind === 'npcPurchase' || listing.kind === 'npcShop') return renderMarketplaceEvent(listing, messageId, api);
    const thai = api.settings().language === 'th';
    const t = (th, en) => thai ? th : en;
    const unit = t({ gold: 'ทอง', silver: 'เงิน', copper: 'ทองแดง' }[listing.denomination], listing.denomination);
    const price = value => `${Number(value || 0).toLocaleString(thai ? 'th-TH' : 'en-US')} ${unit}`;
    const labels = { Active: t('เปิดรายการ', 'Listing open'), Negotiating: t('กำลังต่อรอง', 'Negotiating'), Sold: t('ขายแล้ว', 'Sold'), Cancelled: t('ยกเลิกแล้ว', 'Cancelled'), Expired: t('หมดอายุ', 'Expired') };
    const root = node('section', 'trpg-marketplace-chat');
    root.dataset.status = listing.status;
    root.dataset.listingId = listing.id;
    root.setAttribute('aria-label', t('ข้อเสนอซื้อใน Main Chat', 'Marketplace purchase offer'));
    const head = node('header', 'trpg-marketplace-chat-head');
    const copy = node('div');
    copy.append(node('small', 'trpg-marketplace-chat-eyebrow', t('การค้า · ข้อเสนอซื้อ', 'COMMERCE · PURCHASE OFFER')),
        node('h4', '', `${listing.buyer.name} · ${listing.itemName}`));
    const status = node('span', 'trpg-marketplace-badge', labels[listing.status] || listing.status);
    head.append(copy, status); root.append(head);
    const itemLine = node('p', 'trpg-marketplace-chat-itemline');
    itemLine.append(node('span', '', `${listing.category || t('ไอเทม', 'Item')} · ×${listing.quantity}`), node('span', '', `${t('ผู้ซื้อ', 'Buyer')} ${listing.buyer.role}`));
    root.append(itemLine);
    if (listing.description) root.append(node('p', 'trpg-marketplace-chat-description', listing.description));
    const intent = node('p', 'trpg-marketplace-chat-intent');
    intent.append(node('strong', '', `${t('เจตนา', 'Intent')} · `), node('span', '', buyerIntent(listing.buyer, t)));
    root.append(intent);
    const latest = listing.offers?.at(-1);
    const amount = latest?.counterAmount || latest?.amount || listing.askPrice;
    const priceBox = node('div', 'trpg-marketplace-chat-pricebox');
    const priceCell = (label, value, emphasis = false) => { const cell = node('div', `trpg-marketplace-chat-pricecell${emphasis ? ' is-emphasis' : ''}`); cell.append(node('small', '', label), node('strong', '', value)); return cell; };
    priceBox.append(priceCell(t('ข้อเสนอล่าสุด', 'Latest offer'), price(amount), true), priceCell(t('ราคาตั้ง', 'Ask'), price(listing.askPrice)), priceCell(t('ราคาต่ำสุด', 'Floor'), price(listing.floorPrice)));
    root.append(priceBox);
    if (latest?.message) root.append(node('p', '', `“${latest.message}”`));
    if (latest?.history?.length) {
        const details = node('details', 'trpg-marketplace-chat-history');
        details.append(node('summary', '', `${t('ประวัติการต่อรอง', 'Negotiation history')} · ${latest.history.length} ${t('รอบ', 'rounds')}`));
        const timeline = node('ol', 'trpg-marketplace-chat-history-list');
        for (const entry of latest.history.slice().reverse()) {
            const item = node('li', `is-${entry.actor}`);
            const line = node('div', 'trpg-marketplace-chat-history-line');
            line.append(node('span', '', entry.actor === 'seller' ? t('คุณ', 'You') : listing.buyer.name), node('strong', '', price(entry.amount)));
            item.append(line);
            if (entry.message) item.append(node('small', '', entry.message));
            timeline.append(item);
        }
        details.append(timeline); root.append(details);
    }
    const actions = node('div', 'trpg-marketplace-chat-actions');
    const valid = () => root.isConnected && api.marketplaceForMessage?.(messageId, api.context().chat?.[messageId])?.token === listing.token;
    let busy = false;
    const statusText = node('p', 'trpg-marketplace-chat-status'); statusText.setAttribute('role', 'status'); statusText.setAttribute('aria-live', 'polite');
    const run = async (action, value) => {
        if (busy || !valid()) return;
        busy = true; statusText.textContent = t('กำลังบันทึก…', 'Saving…'); actions.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
        try {
            const result = await api.runMarketplaceAction(listing.id, action, value, listing.revision);
            statusText.textContent = result?.ok ? t('บันทึกแล้ว', 'Saved') : t('รายการเปลี่ยนไปแล้ว กรุณาเปิดใหม่', 'The listing changed. Reopen it.');
        } catch { statusText.textContent = t('บันทึกไม่สำเร็จ', 'Save failed.'); }
        finally { busy = false; api.refreshMarketplace?.(); }
    };
    const button = (label, action, primary = false) => {
        const value = node('button', primary ? 'trpg-marketplace-primary' : '', label); value.type = 'button'; value.addEventListener('click', () => run(action)); return value;
    };
    if (listing.status === 'Active' && !latest) actions.append(button(t('ขอข้อเสนอ', 'Request offer'), 'invite', true));
    else if (['Active', 'Negotiating'].includes(listing.status) && latest?.status === 'Pending') {
        actions.append(button(t('รับข้อเสนอ', 'Accept offer'), 'accept', true));
        const form = node('form', 'trpg-marketplace-chat-counter');
        const input = node('input'); input.type = 'number'; input.min = String(listing.floorPrice); input.step = '1'; input.value = String(Math.max(listing.floorPrice, latest.counterAmount || listing.askPrice)); input.inputMode = 'numeric'; input.setAttribute('aria-label', t('ราคาที่ต้องการต่อรอง', 'Counteroffer amount'));
        const submit = node('button', '', t('ต่อรอง', 'Counter')); submit.type = 'submit'; form.append(input, submit); form.addEventListener('submit', event => { event.preventDefault(); run('counter', Number(input.value)); }); actions.append(form, button(t('ไม่ขาย', 'Decline'), 'reject'));
    } else if (['Active', 'Negotiating'].includes(listing.status) && latest?.status === 'Countered') {
        actions.append(button(t('รอคำตอบผู้ซื้อ', 'Ask buyer to respond'), 'respond'), button(t('ปิดรายการ', 'Close listing'), 'cancel'));
    } else if (listing.status === 'Sold') root.append(node('p', '', t('โอนของและรับเงินพร้อมกันแล้ว', 'The item and payment were settled together.')));
    if (actions.childNodes.length) root.append(actions);
    root.append(statusText);
    return root;
}

function renderMarketplaceEvent(event, messageId, api) {
    event = { ...event, status: event.status || 'pending' };
    const thai = api.settings().language === 'th';
    const t = (th, en) => thai ? th : en;
    const unit = t({ gold: 'ทอง', silver: 'เงิน', copper: 'ทองแดง' }[event.denomination], event.denomination);
    const price = value => `${Number(value || 0).toLocaleString(thai ? 'th-TH' : 'en-US')} ${unit}`;
    const root = node('section', `trpg-marketplace-chat trpg-marketplace-event trpg-marketplace-event-${event.kind === 'npcShop' ? 'shop' : 'offer'}`);
    root.dataset.status = event.status || 'pending'; root.dataset.eventId = event.id;
    root.setAttribute('aria-label', t('เหตุการณ์การค้าใน Main Chat', 'Main Chat commerce event'));
    const head = node('header', 'trpg-marketplace-chat-head');
    const title = event.kind === 'npcPurchase'
        ? `${event.buyer.name} · ${t('ต้องการซื้อ', 'wants to buy')} ${event.item.name}`
        : `${event.seller.name} · ${event.title}`;
    const copy = node('div'); copy.append(node('small', 'trpg-marketplace-chat-eyebrow', event.kind === 'npcPurchase' ? t('การค้า · NPC ขอซื้อ', 'COMMERCE · NPC BUY OFFER') : t('การค้า · ร้านค้า NPC', 'COMMERCE · NPC SHOP')), node('h4', '', title));
    head.append(copy);
    const badgeText = event.status === 'awaiting-reply' ? t('รอคำตอบจาก NPC', 'Waiting for NPC reply') : event.status === 'resolved' ? t('NPC ตอบแล้ว', 'NPC replied') : t('เหตุการณ์ใหม่', 'New scene event');
    head.append(node('span', 'trpg-marketplace-badge', badgeText)); root.append(head);
    if (event.kind === 'npcPurchase') appendPurchaseEvent(root, event, messageId, api, t, price);
    else appendShopEvent(root, event, messageId, api, t, price, unit);
    return root;
}

function appendPurchaseEvent(root, event, messageId, api, t, price) {
    root.append(node('p', 'trpg-marketplace-chat-itemline', `${event.item.category} · ×${event.item.quantity} · ${t('ผู้ซื้อ', 'Buyer')} ${event.buyer.role}`));
    if (event.item.description) root.append(node('p', 'trpg-marketplace-chat-description', event.item.description));
    if (event.item.properties?.length) root.append(node('p', 'trpg-marketplace-event-properties', event.item.properties.join(' · ')));
    const prices = node('div', 'trpg-marketplace-chat-pricebox');
    const cell = (label, value, emphasis = false) => { const item = node('div', `trpg-marketplace-chat-pricecell${emphasis ? ' is-emphasis' : ''}`); item.append(node('small', '', label), node('strong', '', value)); return item; };
    prices.append(cell(t('ข้อเสนอ', 'Offer'), price(event.askPrice), true), cell(t('ขั้นต่ำที่รับได้', 'Lowest acceptable'), event.floorPrice ? price(event.floorPrice) : t('ต่อรองได้', 'Negotiable'))); root.append(prices);
    if (event.message) root.append(node('p', 'trpg-marketplace-chat-description', `“${event.message}”`));
    appendEventActions(root, event, messageId, api, t, price, event.item);
}

function appendShopEvent(root, event, messageId, api, t, price, unit) {
    if (event.description) root.append(node('p', 'trpg-marketplace-chat-description', event.description));
    if (event.status !== 'pending') {
        root.append(node('p', 'trpg-marketplace-chat-status', event.status === 'awaiting-reply' ? t('ส่งคำตอบแล้ว กำลังรอ NPC ตอบกลับในข้อความถัดไป…', 'Reply sent. Waiting for the NPC response in the next message…') : t('เหตุการณ์นี้ได้รับคำตอบแล้ว ดูผลลัพธ์ในข้อความถัดไป', 'This event has been answered. See the outcome in the next message.')));
        return;
    }
    const pager = node('div', 'trpg-marketplace-shop-toolbar');
    const pageSize = event.pageSize || 5; let page = 0;
    const list = node('div', 'trpg-marketplace-shop-items');
    const pageLabel = node('span', 'trpg-marketplace-shop-page');
    const previous = node('button', '', t('‹ ก่อนหน้า', '‹ Previous')); previous.type = 'button';
    const next = node('button', '', t('ถัดไป ›', 'Next ›')); next.type = 'button';
    pager.append(previous, pageLabel, next); root.append(pager, list);
    const renderPage = () => {
        const pages = Math.max(1, Math.ceil(event.items.length / pageSize)); page = Math.min(page, pages - 1);
        pageLabel.textContent = `${t('หน้า', 'Page')} ${page + 1}/${pages}`; previous.disabled = page === 0; next.disabled = page >= pages - 1; list.replaceChildren();
        for (const item of event.items.slice(page * pageSize, (page + 1) * pageSize)) {
            const row = node('article', 'trpg-marketplace-shop-item');
            row.append(node('strong', '', item.item.name), node('small', '', `${item.item.category} · ${t('เหลือ', 'Stock')} ${item.stockKnown === false ? t('ไม่ระบุ', 'unspecified') : item.stock} · ${item.negotiableKnown === false ? t('เงื่อนไขยังไม่ระบุ', 'Terms unspecified') : item.negotiable ? t('ต่อรองได้', 'Negotiable') : t('ราคาตายตัว', 'Fixed price')}`));
            if (item.item.description) row.append(node('p', '', item.item.description));
            if (item.item.properties?.length) row.append(node('p', 'trpg-marketplace-event-properties', item.item.properties.join(' · ')));
            const foot = node('div', 'trpg-marketplace-shop-item-foot'); foot.append(node('b', '', price(item.askPrice)));
            const buy = node('button', 'trpg-marketplace-primary', t('ซื้อ', 'Buy')); buy.type = 'button'; buy.addEventListener('click', () => respond(event, messageId, api, 'accept', item.askPrice, item.id, root, t));
            const counter = node('button', '', t('ต่อรอง', 'Counter')); counter.type = 'button'; counter.addEventListener('click', () => showCounter(item, event, messageId, api, root, t, price));
            foot.append(buy); if (item.negotiable) foot.append(counter); row.append(foot); list.append(row);
        }
    };
    previous.addEventListener('click', () => { page -= 1; renderPage(); }); next.addEventListener('click', () => { page += 1; renderPage(); }); renderPage();
}

function showCounter(item, event, messageId, api, root, t, price) {
    const existing = root.querySelector('.trpg-marketplace-event-counter'); existing?.remove();
    const form = node('form', 'trpg-marketplace-event-counter'); const input = node('input'); input.type = 'number'; input.min = String(item.floorPrice || 1); input.value = String(item.askPrice); input.required = true; input.inputMode = 'numeric'; input.setAttribute('aria-label', t('ราคาที่ต้องการต่อรอง', 'Counteroffer amount'));
    const submit = node('button', 'trpg-marketplace-primary', t('ส่งข้อเสนอ', 'Send counter')); submit.type = 'submit'; form.append(input, submit); form.addEventListener('submit', e => { e.preventDefault(); void respond(event, messageId, api, 'counter', Number(input.value), item.id, root, t); }); root.append(form); input.focus();
}

function appendEventActions(root, event, messageId, api, t, price, item) {
    const actions = node('div', 'trpg-marketplace-chat-actions');
    if (event.status !== 'pending') { root.append(node('p', 'trpg-marketplace-chat-status', event.status === 'awaiting-reply' ? t('ส่งคำตอบแล้ว กำลังรอ NPC ตอบกลับในข้อความถัดไป…', 'Reply sent. Waiting for the NPC response in the next message…') : t('เหตุการณ์นี้ได้รับคำตอบแล้ว ดูผลลัพธ์ในข้อความถัดไป', 'This event has been answered. See the outcome in the next message.'))); return; }
    const accept = node('button', 'trpg-marketplace-primary', event.kind === 'npcPurchase' ? t('รับข้อเสนอ', 'Accept offer') : t('ซื้อในราคานี้', 'Buy at this price')); accept.type = 'button'; accept.addEventListener('click', () => respond(event, messageId, api, 'accept', event.askPrice, item?.id, root, t)); actions.append(accept);
    if (event.kind === 'npcPurchase' ? event.negotiable : item?.negotiable) {
        const form = node('form', 'trpg-marketplace-chat-counter'); const input = node('input'); input.type = 'number'; input.min = String(event.floorPrice || 1); input.value = String(event.askPrice); input.required = true; input.inputMode = 'numeric'; input.setAttribute('aria-label', t('ราคาที่ต้องการต่อรอง', 'Counteroffer amount')); const submit = node('button', '', t('ต่อรอง', 'Counter')); submit.type = 'submit'; form.append(input, submit); form.addEventListener('submit', e => { e.preventDefault(); void respond(event, messageId, api, 'counter', Number(input.value), item?.id, root, t); }); actions.append(form);
    }
    const decline = node('button', '', event.kind === 'npcPurchase' ? t('ปฏิเสธการขาย', 'Decline sale') : t('ยังไม่ซื้อ', 'Decline')); decline.type = 'button'; decline.addEventListener('click', () => respond(event, messageId, api, 'decline', event.askPrice, item?.id, root, t)); actions.append(decline); root.append(actions);
}

async function respond(event, messageId, api, action, amount, itemId, root, t) {
    if (root.dataset.status !== 'pending' || typeof api.respondMarketplaceEvent !== 'function') return;
    root.dataset.status = 'awaiting-reply'; root.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
    const status = node('p', 'trpg-marketplace-chat-status', t('กำลังส่งคำตอบไปยัง Main Chat…', 'Sending your reply to Main Chat…')); root.append(status);
    const result = await api.respondMarketplaceEvent(messageId, event.token, action, amount, itemId);
    if (!result?.ok) { root.dataset.status = 'pending'; status.textContent = t('ส่งไม่สำเร็จ กรุณาลองใหม่', 'Could not send. Try again.'); root.querySelectorAll('button,input').forEach(control => { control.disabled = false; }); }
}

function buyerIntent(buyer, t) {
    const id = buyer?.id;
    if (id === 'collector') return t('ตามหาของหายากเพื่อเก็บเข้าคลังส่วนตัว', 'Seeking a rare piece for a private collection');
    if (id === 'merchant') return t('มองหาสินค้าที่หมุนเวียนต่อในตลาดได้', 'Looking for stock that can be resold');
    if (id === 'adventurer') return t('ต้องใช้ไอเทมสำหรับการเดินทางครั้งถัดไป', 'Needs the item for an upcoming expedition');
    return t('ต้องการไอเทมชิ้นนี้จากตลาด', 'Interested in this item from the market');
}
