const node = (tag, cls, text) => { const item = document.createElement(tag); item.className = cls; if (text !== undefined && text !== null) item.textContent = text; return item; };
const text = (thai, th, en) => thai ? th : en;

export function renderGroupBoard(board, messageId, api) {
    const thai = api.settings().language === 'th';
    const root = node('section','trpg-group-board'); root.setAttribute('aria-label', text(thai,'กระดานปาร์ตี้และกิลด์','Party and Guild Board'));
    const heading = node('div','trpg-group-board-heading');
    heading.append(node('span','trpg-group-board-eyebrow',text(thai,'กระดานรับสมัคร','RECRUITMENT BOARD')),node('h3','',board.title),node('p','trpg-group-board-location',`⌖ ${board.location}`));
    root.append(heading);
    const summary = node('p','trpg-group-board-summary',text(thai,`${board.entries.length} กลุ่ม · แตะใบประกาศเพื่ออ่าน`,`${board.entries.length} groups · select a notice to read`));
    const filters = node('div','trpg-group-board-filters');
    const list = node('div','trpg-group-board-list');
    const pager = node('div','trpg-group-board-pager');
    const detail = node('section','trpg-group-board-detail'); detail.hidden = true;
    const scope = api.context().chatMetadata, chatId = api.context().getCurrentChatId?.();
    const valid = () => root.isConnected && api.context().chatMetadata === scope && api.context().getCurrentChatId?.() === chatId && api.groupBoardForMessage?.(messageId,api.context().chat?.[messageId])?.token === board.token;
    let filter = 'all', page = 0, selected = null;
    const filtered = () => board.entries.filter(entry => filter === 'all' || entry.kind === filter);
    function button(label, value) {
        const item = node('button',`trpg-group-board-filter${filter === value ? ' is-active' : ''}`,label); item.type = 'button'; item.setAttribute('aria-pressed',String(filter === value));
        item.addEventListener('click',() => { if (!valid()) return; filter = value; page = 0; renderList(); }); return item;
    }
    filters.append(button(text(thai,'ทั้งหมด','All'),'all'),button(text(thai,'ปาร์ตี้','Parties'),'party'),button(text(thai,'กิลด์','Guilds'),'guild'));
    function renderList() {
        filters.replaceChildren(button(text(thai,'ทั้งหมด','All'),'all'),button(text(thai,'ปาร์ตี้','Parties'),'party'),button(text(thai,'กิลด์','Guilds'),'guild'));
        const values = filtered(), size = board.pageSize || 4, pages = Math.max(1,Math.ceil(values.length / size)); page = Math.min(page,pages - 1);
        list.replaceChildren();
        for (const entry of values.slice(page * size,(page + 1) * size)) {
            const kind=entry.kind === 'guild' ? text(thai,'กิลด์','GUILD') : text(thai,'ปาร์ตี้','PARTY');
            const card = node('button',`trpg-group-board-card trpg-group-board-inspect is-${entry.kind}`); card.type='button';card.dataset.groupId=entry.id;
            card.title=entry.name;card.setAttribute('aria-label',`${kind} · ${entry.name} · ${text(thai,'อ่านรายละเอียด','Read details')}`);
            card.append(node('small','trpg-group-board-kind',kind),node('strong','trpg-group-board-name',entry.name),
                node('span','trpg-group-board-read',text(thai,'อ่านรายละเอียด','Read details')));
            if(entry.openSpots===0)card.append(node('b','trpg-group-board-full',text(thai,'เต็มแล้ว','Full')));
            card.addEventListener('click',() => { if (!valid()) return; selected = entry.id; showDetail(entry); });list.append(card);
        }
        pager.replaceChildren();
        if (pages > 1) {
            const prev = node('button','',text(thai,'‹ ก่อนหน้า','‹ Previous')), next = node('button','',text(thai,'ถัดไป ›','Next ›')); prev.type = next.type = 'button'; prev.disabled = page === 0; next.disabled = page === pages - 1;
            prev.addEventListener('click',() => { if (!valid()) return; page--; renderList(); }); next.addEventListener('click',() => { if (!valid()) return; page++; renderList(); });
            pager.append(prev,node('span','',text(thai,`หน้า ${page + 1} / ${pages}`,`Page ${page + 1} / ${pages}`)),next);
        }
    }
    function fact(label, value) { const wrap = node('div',''); wrap.append(node('small','',label),node('strong','',value)); return wrap; }
    function showDetail(entry) {
        detail.replaceChildren(node('span','trpg-group-board-eyebrow',entry.kind === 'guild' ? text(thai,'กิลด์','GUILD') : text(thai,'ปาร์ตี้','PARTY')),node('h4','',entry.name));
        if (entry.description) detail.append(node('p','trpg-group-board-detail-description',entry.description));
        if (entry.tags.length) detail.append(node('p','trpg-group-board-tags',entry.tags.join(' · ')));
        const facts = node('div','trpg-group-board-detail-facts'); facts.append(fact(text(thai,'หัวหน้า','Leader'),entry.leader || text(thai,'ไม่ระบุ','Unlisted')),fact(text(thai,'สมาชิก','Roster'),entry.memberCount === null ? text(thai,'ไม่ทราบ','Unknown') : `${entry.memberCount}${entry.maxMembers === null ? '' : ` / ${entry.maxMembers}`}`),fact(text(thai,'ที่ว่าง','Open slots'),entry.openSpots === null ? text(thai,'ไม่ทราบ','Unknown') : String(entry.openSpots)),fact(text(thai,'แรงก์','Rank'),entry.rank || '—')); detail.append(facts);
        if (entry.requirements.length) { const list = node('ul','trpg-group-board-requirements'); for (const requirement of entry.requirements) list.append(node('li','',requirement)); detail.append(node('h5','',text(thai,'เงื่อนไขการเข้าร่วม','Requirements')),list); }
        if (entry.notes) detail.append(node('p','trpg-group-board-notes',entry.notes));
        const actions = node('div','trpg-group-board-actions'), back = node('button','',text(thai,'ย้อนกลับ','Back')), request = node('button','trpg-group-board-request',text(thai,'ส่งคำขอเข้าร่วม','Request to join')); back.type = request.type = 'button';
        const status = node('p','trpg-group-board-status'); status.setAttribute('role','status');
        request.disabled = entry.openSpots === 0;
        if (entry.openSpots === 0) status.textContent = text(thai,'กลุ่มนี้เต็มแล้ว','This group is full');
        back.addEventListener('click',() => { if (!valid()) return; selected = null; detail.hidden = true; list.hidden = false; filters.hidden = false; summary.hidden = false; pager.hidden = false; renderList(); });
        request.addEventListener('click',async() => { if (!valid() || selected !== entry.id || request.disabled) return; request.disabled = back.disabled = true; status.textContent = text(thai,'กำลังส่งคำขอ…','Sending request…'); try { const ok = await api.requestGroupBoardJoin?.(messageId,entry.id,board.token); if (!valid()) return; status.textContent = ok ? text(thai,'ส่งคำขอแล้ว รอการตอบกลับใน Main Chat','Request sent. Wait for the reply in Main Chat') : text(thai,'ส่งคำขอไม่สำเร็จ ลองอีกครั้ง','Request failed. Try again'); request.disabled = Boolean(ok); back.disabled = false; } catch { if (valid()) { status.textContent = text(thai,'ส่งคำขอไม่สำเร็จ ลองอีกครั้ง','Request failed. Try again'); request.disabled = back.disabled = false; } } });
        actions.append(back,request); detail.append(actions,status); list.hidden = true; filters.hidden = true; summary.hidden = true; pager.hidden = true; detail.hidden = false; back.focus();
    }
    renderList(); root.append(summary,filters,list,pager,detail); return root;
}
