const scopes = new WeakMap();
const node = (tag,cls,text) => { const el = document.createElement(tag); el.className = cls; if (text !== undefined) el.textContent = text; return el; };
export const auctionErrorText = (error,thai) => ({
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
    // A monochrome engraved mark avoids platform-specific emoji colors.
    mark.innerHTML = '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><g transform="rotate(42 16 16)"><path d="M15 3h10v8H15zM13 2h14M13 12h14M20 12v17"/></g><path d="M18 27h11v3H18zM16 30h15"/></svg>';
    const heading = node('div',''); heading.append(node('small','','ROLEFORGE · AUCTION HOUSE'),node('h3','',view.title));
    const toggle = node('button','trpg-auction-collapse',local.collapsed ? '+' : '−'); toggle.type = 'button';
    toggle.setAttribute('aria-label',t('ย่อหรือขยายการประมูล','Collapse or expand auction')); toggle.setAttribute('aria-expanded',String(!local.collapsed));
    header.append(mark,heading,toggle); root.append(header);
    const body = node('div','trpg-auction-body'); body.hidden = local.collapsed;
    toggle.addEventListener('click',() => { if (!valid()) return; local.collapsed = !local.collapsed; body.hidden = local.collapsed; toggle.textContent = local.collapsed ? '+' : '−'; toggle.setAttribute('aria-expanded',String(!local.collapsed)); });
    const top = node('div','trpg-auction-meta'); top.append(node('span','',view.location),node('b','',`LOT ${view.index+1} / ${view.total}`)); body.append(top);
    const lot = view.lot, hero = node('article','trpg-auction-lot');
    const crest = node('div','trpg-auction-crest','◇'); crest.setAttribute('aria-hidden','true');
    const item = node('div','trpg-auction-item'); item.append(node('small','',`${lot.category}${lot.rarity ? ` · ${lot.rarity}` : ''}`),node('h4','',lot.name),node('span','',`${t('จำนวน','Quantity')} ${lot.quantity}`));
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
    const funds = node('div','trpg-auction-funds'); funds.title = view.currencyName; funds.append(node('span','',`${t('ใช้ได้','Available')}  ${price(view.funds)}`),node('span','',`${t('กันไว้','Reserved')}  ${price(view.reserved)}`)); body.append(funds);
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
        const count = node('div','trpg-auction-count'); count.append(node('span','',t('ผู้ดำเนินงานนับราคา','AUCTIONEER COUNT')));
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
        body.append(node('p','trpg-auction-hint',t('เพิ่มขั้นต่ำตามรายการ · เวลาเดินเมื่อกดปุ่มเท่านั้น ไม่มีนาฬิกานับถอยหลัง','Bids advance by the listed minimum. Rounds advance only when you act.')));
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
    const history = node('details','trpg-auction-history'); history.append(node('summary','',t('ประวัติราคาและรายการทั้งหมด','Bid history & catalog')));
    for (const h of lot.history.slice(-6).reverse()) { const row = node('div','trpg-auction-history-row'); row.append(node('span','',h.bidder),node('b','',price(h.amount))); history.append(row); }
    if (!lot.history.length) history.append(node('p','',t('ยังไม่มีการเสนอราคา','No bids yet.')));
    const list = node('ol','trpg-auction-catalog');
    for (const entry of view.lots) {
        const row = node('li',entry.id === lot.id ? 'is-current' : ''), preview = node('details','');
        preview.append(node('summary','',entry.name),node('p','',`${t('ราคาเปิด','Opening bid')} ${price(entry.openingBid)} · ${t('เพิ่มขั้นต่ำ','Increment')} ${price(entry.minIncrement)} · ×${entry.quantity}`));
        if (entry.rarity) preview.append(node('p','',entry.rarity));
        if (entry.description) preview.append(node('p','',entry.description)); row.append(preview); list.append(row);
    }
    history.append(list); body.append(history); root.append(body);
    return root;
}
