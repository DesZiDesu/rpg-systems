// Inline resource ledger rendered beneath the assistant message that confirmed
// an item or currency change.  It intentionally uses DOM text nodes so model
// prose and item names never become markup.
const text = (thai, english, language) => language === 'th' ? thai : english;
const node = (tag, className = '', value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
};

const ACTIONS = Object.freeze({
    refused: { icon: 'circle-info', tone: 'lost', th: 'รายการยังไม่สำเร็จ', en: 'ITEM ACTION NOT COMPLETED' },
    received: { icon: 'box-open', tone: 'received', th: 'ได้รับไอเทม', en: 'ITEM RECEIVED' },
    picked: { icon: 'hand', tone: 'picked', th: 'หยิบไอเทม', en: 'ITEM PICKED UP' },
    stored: { icon: 'box', tone: 'stored', th: 'เก็บไอเทม', en: 'ITEM STORED' },
    used: { icon: 'flask', tone: 'used', th: 'ใช้ไอเทม', en: 'ITEM USED' },
    lost: { icon: 'triangle-exclamation', tone: 'lost', th: 'ไอเทมหาย', en: 'ITEM LOST' },
    dropped: { icon: 'arrow-down', tone: 'dropped', th: 'ทิ้งไอเทม', en: 'ITEM DROPPED' },
    discarded: { icon: 'trash', tone: 'discarded', th: 'ทำลายไอเทม', en: 'ITEM DISCARDED' },
    sold: { icon: 'arrow-right-arrow-left', tone: 'sold', th: 'ขายไอเทมสำเร็จ', en: 'ITEM SOLD' },
    gifted: { icon: 'gift', tone: 'gifted', th: 'มอบไอเทม', en: 'ITEM GIVEN' },
    crafted: { icon: 'hammer', tone: 'crafted', th: 'สร้างไอเทม', en: 'ITEM CRAFTED' },
    purchased: { icon: 'cart-shopping', tone: 'purchased', th: 'ซื้อไอเทมสำเร็จ', en: 'ITEM PURCHASED' },
});

function descriptor(event, language) {
    if (event.kind === 'currency') {
        return {
            icon: event.action === 'spent' ? 'coins' : 'sack-dollar',
            tone: event.action === 'spent' ? 'spent' : 'funds',
            label: text(event.action === 'spent' ? 'ใช้เงิน' : 'ได้รับเงิน', event.action === 'spent' ? 'FUNDS SPENT' : 'FUNDS RECEIVED', language),
        };
    }
    const action = ACTIONS[event.action] || ACTIONS[event.value && String(event.value).startsWith('-') ? 'lost' : 'received'];
    return { icon: action.icon, tone: action.tone, label: text(action.th, action.en, language) };
}

export function renderResourceEvents(events = [], language = 'en') {
    const entries = (Array.isArray(events) ? events : []).filter(Boolean).slice(0, 12);
    if (!entries.length) return null;
    const root = node('section', 'trpg-resource-events');
    root.setAttribute('aria-label', text('บันทึกไอเทมและเงินของเทิร์นนี้', 'Resource changes this turn', language));
    const heading = node('header', 'trpg-resource-events-head');
    const headingCopy = node('div');
    headingCopy.append(node('small', '', text('บันทึกทรัพยากร · ยืนยันแล้ว', 'RESOURCE LEDGER · CONFIRMED', language)),
        node('strong', '', text('การเปลี่ยนแปลงของคุณ', 'Your resource changes', language)));
    heading.append(headingCopy, node('span', 'trpg-resource-events-count', `${entries.length}`));
    root.append(heading);
    const list = node('div', 'trpg-resource-events-list');
    for (const event of entries) {
        const detail = descriptor(event, language);
        const row = node('article', `trpg-resource-event is-${detail.tone}`);
        const icon = node('span', 'trpg-resource-event-icon');
        const glyph = node('i', `fa-solid fa-${detail.icon}`); glyph.setAttribute('aria-hidden', 'true'); icon.append(glyph);
        const copy = node('div', 'trpg-resource-event-copy');
        copy.append(node('small', 'trpg-resource-event-label', detail.label), node('strong', '', event.title || text('ทรัพยากร', 'Resource', language)));
        if (event.detail) copy.append(node('p', '', event.detail));
        if (event.balance !== undefined && event.balance !== null) copy.append(node('small', 'trpg-resource-event-balance', `${text('คงเหลือ', 'Balance', language)} · ${event.balance}`));
        const value = node('b', 'trpg-resource-event-value', event.value || '');
        row.append(icon, copy, value);
        list.append(row);
    }
    root.append(list);
    return root;
}

