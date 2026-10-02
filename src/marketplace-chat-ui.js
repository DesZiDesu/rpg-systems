const node = (tag, cls = '', text) => {
    const value = document.createElement(tag);
    value.className = cls;
    if (text !== undefined) value.textContent = text;
    return value;
};

export function renderMarketplaceChatCard(listing, messageId, api) {
    if (!listing) return null;
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

function buyerIntent(buyer, t) {
    const id = buyer?.id;
    if (id === 'collector') return t('ตามหาของหายากเพื่อเก็บเข้าคลังส่วนตัว', 'Seeking a rare piece for a private collection');
    if (id === 'merchant') return t('มองหาสินค้าที่หมุนเวียนต่อในตลาดได้', 'Looking for stock that can be resold');
    if (id === 'adventurer') return t('ต้องใช้ไอเทมสำหรับการเดินทางครั้งถัดไป', 'Needs the item for an upcoming expedition');
    return t('ต้องการไอเทมชิ้นนี้จากตลาด', 'Interested in this item from the market');
}
