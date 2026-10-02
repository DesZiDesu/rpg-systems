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
    root.append(node('p', '', `${t('จำนวน', 'Quantity')} ${listing.quantity} · ${t('ผู้ซื้อเป้าหมาย', 'Buyer profile')} ${listing.buyer.role}`));
    const latest = listing.offers?.at(-1);
    const amount = latest?.counterAmount || latest?.amount || listing.askPrice;
    root.append((() => {
        const line = node('p', 'trpg-marketplace-chat-price', `${t('ราคาที่เสนอ', 'Offer')} `);
        line.append(node('strong', '', price(amount)), node('span', '', ` · ${t('ราคาขั้นต่ำ', 'Floor')} ${price(listing.floorPrice)}`));
        return line;
    })());
    if (latest?.message) root.append(node('p', '', `“${latest.message}”`));
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
