const scopes = new WeakMap();
const node = (tag,cls,text) => { const el = document.createElement(tag); el.className = cls; if (text !== undefined) el.textContent = text; return el; };
export const auctionErrorText = (error,thai) => ({
    disabled:['ระบบประมูลปิดอยู่ เปิดจากการตั้งค่าระบบเสริมเมื่อต้องการใช้','Auctions are off. Enable the system in optional settings to use it.'],
    funds:['เงินที่ใช้ได้ไม่เพียงพอ (มีวงเงินกันไว้)','Not enough available funds.'],
    amount:['ราคาต้องเป็นจำนวนเต็มและไม่น้อยกว่าราคาขั้นต่ำ','Enter a whole amount at least equal to the next bid.'],
    away:['กลับไปยังสถานที่ประมูลก่อนเข้าร่วมหรือเสนอราคา','Return to this auction venue to join or bid.'],
    active:['มีงานประมูลที่ยังเข้าร่วมอยู่ ไปจบหรือออกจากงานนั้นก่อน','Finish or leave your current auction first.'],
    committed:['ยังเป็นผู้เสนอราคาสูงสุด รอให้รายการนี้จบก่อนออก','Your leading bid is binding. Resolve this lot before leaving.'],
    leading:['คุณเสนอราคาสูงสุดแล้ว กดรอเพื่อให้ผู้ดำเนินงานนับราคา','You are already leading. Wait for the auctioneer.'],
    inventory:['Inventory เต็มหรือจำนวนไอเทมถึงขีดจำกัด จัดพื้นที่แล้วกดรออีกครั้ง','Inventory is full or the item quantity limit is reached. Make room and retry.'],
    saving:['กำลังบันทึกการประมูล…','Saving auction…'],
    save:['บันทึกไม่สำเร็จ คืนสถานะเดิมแล้ว กรุณาลองอีกครั้ง','Save failed. Your previous state was restored. Please retry.'],
    stale:['ข้อมูลเปลี่ยนไปแล้ว อ่านราคาล่าสุดก่อนกดอีกครั้ง','The auction changed. Read the latest price and try again.'],
    closed:['รายการนี้จบแล้ว','This lot is already closed.'],
    joined:['งานนี้เคยเข้าร่วมหรือจบไปแล้ว','This event was already joined or settled.'],
    settled:['รายการนี้จ่ายเงินและบันทึกผลแล้ว','This lot is already settled.'],
    invalid:['ข้อมูลประมูลไม่สมบูรณ์','Invalid auction data.'],
    generating:['รอ AI ตอบจบก่อนใช้ปุ่มประมูล','Wait until the current reply finishes.'],
})[error]?.[thai ? 0 : 1] || (thai ? 'ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง' : 'Unable to complete this action. Please retry.');

export function renderAuctionCard(view, api, messageId = null) {
    const context = api.context(), metadata = context.chatMetadata, chatId = context.getCurrentChatId?.();
    let records = scopes.get(metadata); if (!records) scopes.set(metadata,records = new Map());
    const stateKey = `${messageId ?? 'resume'}:${view.token}:${view.id}`;
    let local = records.get(stateKey); if (!local) records.set(stateKey,local = {collapsed:false,details:false,busy:false,error:'',amount:''});
    const thai = api.settings().language === 'th', t = (th,en) => thai ? th : en;
    const unit = t({gold:'ทอง',silver:'เงิน',copper:'ทองแดง'}[view.denomination],view.denomination);
    const price = value => `${Number(value).toLocaleString(thai ? 'th-TH' : 'en-US')} ${unit}`;
    const root = node('section','trpg-auction'); root.dataset.auctionId = view.id;
    root.setAttribute('aria-label',t('การประมูล','Auction')); root.dataset.status = view.status;
    const valid = () => root.isConnected && api.context().chatMetadata === metadata && api.context().getCurrentChatId?.() === chatId;
    const header = node('header','trpg-auction-header');
    const mark = node('span','trpg-auction-mark'); mark.setAttribute('aria-hidden','true');
    // Turned wooden gavel, striking faces and a separate sound block; no emoji/font dependency.
    mark.innerHTML = `<svg viewBox="0 0 64 64" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <g transform="rotate(-34 28 19)">
            <path d="M25 28h6v5c-1 3-1 7 0 10l1 7c0 3-1 5-4 5s-4-2-4-5l1-7c1-3 1-7 0-10z" fill="currentColor" fill-opacity=".12"/>
            <path d="M24.5 32h7M25 47h6M25 51h6" stroke-width="1.4"/>
            <path d="M13 9h30v20H13z" fill="currentColor" fill-opacity=".14"/>
            <ellipse cx="43" cy="19" rx="4" ry="10" fill="currentColor" fill-opacity=".12"/>
            <ellipse cx="13" cy="19" rx="4" ry="10" fill="currentColor" fill-opacity=".08"/>
            <path d="M19 9c-3 5-3 15 0 20M37 9c-3 5-3 15 0 20"/>
            <path d="M22 13c5-1 8-1 11 0M21 24c5 1 8 1 11 0M12.5 13c-1 4-1 8 0 12M42.5 13c-1 4-1 8 0 12" stroke-width="1.25" opacity=".7"/>
        </g>
        <path d="M6 52v6c0 2 6 4 14 4s14-2 14-4v-6" fill="currentColor" fill-opacity=".12"/>
        <ellipse cx="20" cy="52" rx="14" ry="4" fill="currentColor" fill-opacity=".08"/>
        <path d="M11 52c3-2 15-2 18 0M7 58c6 3 20 3 26 0" stroke-width="1.25" opacity=".7"/>
    </svg>`;
    const heading = node('div',''); heading.append(node('small','','ROLEFORGE · AUCTION HOUSE'),node('h3','',view.title));
    const toggle = node('button','trpg-auction-collapse',local.collapsed ? '+' : '−'); toggle.type = 'button';
    toggle.setAttribute('aria-label',t('ย่อหรือขยายการประมูล','Collapse or expand auction')); toggle.setAttribute('aria-expanded',String(!local.collapsed));
    header.append(mark,heading,toggle); root.append(header);
    const body = node('div','trpg-auction-body'); body.hidden = local.collapsed;
    toggle.addEventListener('click',() => { if (!valid()) return; local.collapsed = !local.collapsed; body.hidden = local.collapsed; toggle.textContent = local.collapsed ? '+' : '−'; toggle.setAttribute('aria-expanded',String(!local.collapsed)); });
    const top = node('div','trpg-auction-meta');
    const place = node('span','trpg-auction-place'); place.append(node('span','trpg-auction-pin','⌖'),node('span','',view.location));
    const lotCounter = node('b','trpg-auction-lot-counter',`${t('รายการ','LOT')} ${view.index+1} / ${view.total}`);
    top.append(place,lotCounter); body.append(top);
    const lot = view.lot, hero = node('article','trpg-auction-lot');
    const crest = node('div','trpg-auction-crest','◇'); crest.setAttribute('aria-hidden','true');
    const item = node('div','trpg-auction-item');
    const tags = node('div','trpg-auction-tags');
    tags.append(node('span','trpg-auction-tag',lot.category || t('ไอเทม','Item')));
    if (lot.rarity) tags.append(node('span','trpg-auction-tag is-rarity',lot.rarity));
    item.append(tags,node('h4','',lot.name),node('span','trpg-auction-quantity',`${t('จำนวน','Quantity')} ${lot.quantity}`));
    const detailButton = node('button','trpg-auction-detail-toggle',t('รายละเอียดไอเทม','Item details')); detailButton.type = 'button'; item.append(detailButton); hero.append(crest,item); body.append(hero);
    const details = node('div','trpg-auction-details'); details.hidden = !local.details;
    details.append(node('p','',lot.description || t('ยังไม่มีข้อมูลเพิ่มเติมที่เปิดเผย','No additional details have been revealed.')));
    if (lot.bidders.length) details.append(node('p','',`${t('ผู้ร่วมประมูล','Other bidders')}: ${lot.bidders.join(', ')}`));
    detailButton.setAttribute('aria-expanded',String(local.details)); detailButton.addEventListener('click',() => { if (!valid()) return; local.details = !local.details; details.hidden = !local.details; detailButton.setAttribute('aria-expanded',String(local.details)); }); body.append(details);
    const pricing = node('div','trpg-auction-pricing');
    const current = node('div',''); current.append(node('small','',lot.price ? t('ราคาปัจจุบัน','CURRENT BID') : t('ราคาเปิด','OPENING BID')),node('strong','',price(lot.price || lot.openingBid)));
    const leader = node('div','trpg-auction-leader'); leader.append(node('small','',t('ผู้เสนอราคาสูงสุด','HIGHEST BIDDER')),node('b','',lot.leader || t('ยังไม่มี','No bids yet')));
    leader.append(node('small','',`${t('เพิ่มขั้นต่ำ','Increment')} ${price(lot.minIncrement)}`));
    if (lot.playerLeading) leader.classList.add('is-player'); pricing.append(current,leader); body.append(pricing);
    const purse = node('div','trpg-auction-funds'); purse.title = view.currencyName;
    const wallet = node('span','trpg-auction-funds-cell'); wallet.append(node('small','',t('ใช้ได้','AVAILABLE')),node('b','',price(view.funds)));
    const held = node('span','trpg-auction-funds-cell is-held'); held.append(node('small','',t('กันไว้','HELD')),node('b','',price(view.reserved)));
    purse.append(wallet,held); body.append(purse);
    const terms = node('div','trpg-auction-financials');
    const feeTerm = node('span',''); feeTerm.append(node('span','',t('ค่าผ่านประตู','Entry fee')),node('b','',price(view.entryFee)));
    const depositTerm = node('span',''); depositTerm.append(node('span','',t('มัดจำคืนได้','Refundable deposit')),node('b','',price(view.deposit)));
    terms.append(feeTerm,depositTerm);
    body.append(terms);
    const controls = node('div','trpg-auction-controls'), status = node('p','trpg-auction-status'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    const busy = local.busy || view.busy;
    if (busy) status.textContent = auctionErrorText('saving',thai);
    else if (local.error) status.textContent = auctionErrorText(local.error,thai);
    const action = (label,name,primary = false,value) => {
        const button = node('button',primary ? 'trpg-auction-primary' : '',label); button.type = 'button'; button.dataset.auctionAction = name; button.disabled = busy;
        button.addEventListener('click',async() => {
            if (!valid() || local.busy || button.disabled) return;
            local.busy = true; local.error = ''; status.textContent = auctionErrorText('saving',thai); root.setAttribute('aria-busy','true');
            controls.querySelectorAll('button,input').forEach(el => { el.disabled = true; });
            try {
                const result = await api.runAuctionAction(messageId,view.id,view.token,name,typeof value === 'function' ? value() : value,view.revision);
                local.error = result.ok ? '' : result.error || 'save';
            } catch { local.error = 'save'; }
            finally {
                local.busy = false; local.amount = '';
                if (valid()) { root.removeAttribute('aria-busy'); status.textContent = local.error ? auctionErrorText(local.error,thai) : t('บันทึกแล้ว','Saved'); }
                api.refreshAuctions?.();
            }
        });
        return button;
    };
    if (view.status === 'Offered') {
        body.append(node('p','trpg-auction-terms',`${t('ค่าเข้าร่วม','Entry fee')}: ${price(view.entryFee)} · ${t('มัดจำคืนเมื่อจบหรือออกจากงาน','Refundable reserve')}: ${price(view.deposit)}`),
            node('p','trpg-auction-hint',t('อ่านรายการก่อนได้ เมื่อกดเข้าร่วมจึงชำระค่าเข้าและกันเงินมัดจำ','Preview the catalog. Joining pays the entry fee and reserves the deposit.')));
        const join = action(t('เข้าร่วมการประมูล','Join auction'),'join',true); join.disabled ||= !view.available || view.retired || view.funds < view.entryFee+view.deposit;
        controls.append(join);
        if (view.retired) status.textContent = auctionErrorText('joined',thai);
    } else if (view.status === 'Joined' && lot.status === 'Open') {
        const count = node('div','trpg-auction-count'); count.append(node('span','',t('จังหวะค้อนของผู้ดำเนินงาน','AUCTIONEER COUNT')));
        for (let i = 1; i <= 3; i++) count.append(node('b',i <= lot.closingCount ? 'is-counted' : '',String(i))); body.append(count);
        if (lot.playerLeading) body.append(node('p','trpg-auction-hint',t('คุณนำอยู่ · เงินถูกกันไว้จนถูกเสนอราคาทับหรือชนะรายการ','You are leading. Funds stay reserved until you are outbid or the lot closes.')));
        const quick = action(`${lot.playerLeading ? t('คุณนำอยู่ที่','Your leading bid') : t('เสนอราคา','Bid')} ${price(lot.playerLeading ? lot.price : lot.nextBid)}`,'bid',true,lot.nextBid); quick.disabled ||= !view.available || lot.playerLeading || lot.nextBid > view.funds; controls.append(quick);
        const form = node('div','trpg-auction-custom'), input = node('input',''); input.type = 'number'; input.min = String(lot.nextBid); input.max = String(view.funds); input.step = '1'; input.inputMode = 'numeric'; input.placeholder = `${t('ขั้นต่ำ','Min.')} ${lot.nextBid}`;
        input.setAttribute('aria-label',t('ราคาที่ต้องการเสนอ','Custom bid amount')); input.value = local.amount; input.disabled = busy || !view.available || lot.playerLeading;
        input.addEventListener('input',() => { local.amount = input.value; });
        const custom = action(t('ยืนยันราคา','Place bid'),'bid',false,() => Number(input.value)); custom.disabled ||= !view.available || lot.playerLeading;
        form.append(input,custom); controls.append(form,action(t('รอ / ให้ผู้ดำเนินงานนับราคา','Wait / auctioneer count'),'wait'));
        form.hidden = lot.playerLeading;
        const leave = action(t('ออกจากการประมูล','Leave auction'),'leave'); leave.disabled ||= lot.playerLeading; controls.append(leave);
        body.append(node('p','trpg-auction-hint',t('เพิ่มขั้นต่ำตามรายการ · จังหวะประมูลจะเดินเมื่อคุณกดปุ่มเท่านั้น','Bids advance by the listed minimum. The auction advances when you choose an action.')));
    } else {
        const won = lot.playerLeading && lot.status === 'Sold';
        const result = node('div',`trpg-auction-result${won ? ' is-won' : ''}`);
        result.append(node('small','',t('ผลการประมูล','LOT RESULT')),node('strong','',won ? t('ชนะการประมูล','You won this lot') : lot.status === 'Sold' ? `${t('ขายให้','Sold to')} ${lot.leader}` : view.status === 'Left' ? t('ออกจากงานแล้ว','You left the auction') : t('ไม่มีผู้ซื้อ','No sale')));
        if (won) result.append(node('p','',t(`จ่าย ${price(lot.price)} แล้ว · ${lot.name} ×${lot.quantity} เข้า Inventory แล้ว`,`Paid ${price(lot.price)} · ${lot.name} ×${lot.quantity} delivered to Inventory`)));
        if (view.status !== 'Joined') result.append(node('p','',t('คืนวงเงินมัดจำและเงินกันไว้แล้ว','Deposit and unused commitments released.'))); body.append(result);
        if (view.status === 'Joined') { const next = action(t('รายการถัดไป','Next lot'),'next',true); next.disabled ||= !view.available; controls.append(next,action(t('ออกจากการประมูล','Leave auction'),'leave')); }
    }
    if (!view.available && !['Completed','Left'].includes(view.status)) body.append(node('p','trpg-auction-hint',t('กลับมาสถานที่นี้เพื่อเสนอราคา · รายการที่ผูกพันไว้ยังจบด้วยปุ่มรอได้','Return here to bid. You can still resolve an existing commitment with Wait.')));
    body.append(controls,status);
    const history = node('details','trpg-auction-history'); history.append(node('summary','',t(`บันทึกค้อน · ${lot.history.length} ครั้ง · รายการทั้งหมด`,'Hammer log · '+lot.history.length+' bids · Full catalog')));
    for (const h of lot.history.slice(-6).reverse()) { const row = node('div','trpg-auction-history-row'); row.append(node('span','',h.bidder),node('b','',price(h.amount))); history.append(row); }
    if (!lot.history.length) history.append(node('p','',t('ยังไม่มีการเสนอราคา','No bids yet.')));
    const list = node('ol','trpg-auction-catalog');
    for (const entry of view.lots) {
        const row = node('li',entry.id === lot.id ? 'is-current' : ''), preview = node('details','');
        const catalogTitle = node('summary',''); catalogTitle.append(node('span','trpg-auction-catalog-name',entry.name),node('b','trpg-auction-catalog-price',entry.price ? price(entry.price) : price(entry.openingBid)));
        preview.append(catalogTitle,node('p','',`${entry.status === 'Open' ? t('กำลังเปิด','Open now') : entry.status === 'Sold' ? t('ปิดการขาย','Sold') : t('รอเปิด','Pending')} · ${t('ราคาเปิด','Opening')} ${price(entry.openingBid)} · ${t('เพิ่ม','Step')} ${price(entry.minIncrement)} · ×${entry.quantity}`));
        if (entry.rarity) preview.append(node('p','',entry.rarity));
        if (entry.description) preview.append(node('p','',entry.description)); row.append(preview); list.append(row);
    }
    history.append(list); body.append(history); root.append(body);
    return root;
}
