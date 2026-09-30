const node = (tag, cls, text) => { const item = document.createElement(tag); item.className = cls; if (text) item.textContent = text; return item; };

export function renderMissionBoard(board, messageId, api) {
    const thai = api.settings().language === 'th';
    const root = node('section','trpg-mission-board'); root.setAttribute('aria-label',thai ? 'กระดานภารกิจ' : 'Mission Board');
    const title = node('h3','',board.title); root.append(title,node('p','trpg-board-location',board.location));
    const papers = node('div','trpg-board-papers'), detail = node('section','trpg-board-detail'); detail.hidden = true;
    const scope = api.context().chatMetadata, chatId = api.context().getCurrentChatId?.();
    const valid = () => root.isConnected && api.context().chatMetadata === scope && api.context().getCurrentChatId?.() === chatId
        && api.missionBoardForMessage(messageId,api.context().chat?.[messageId])?.token === board.token;
    let selected;
    for (const [index,mission] of board.missions.entries()) {
        const paper = node('button','trpg-board-paper'); paper.type = 'button'; paper.dataset.missionId = mission.id;
        paper.append(node('small','',`${thai ? 'ภารกิจ' : 'MISSION'} ${index+1}`),node('strong','',mission.name),
            node('span','',mission.difficulty || (thai ? 'เปิดอ่านรายละเอียด' : 'Read details')));
        if (mission.questStatus) paper.append(node('b','',thai ? 'อยู่ในบันทึกภารกิจแล้ว' : mission.questStatus));
        paper.addEventListener('click',() => { if (!valid()) return; selected = mission.id; showDetail(mission); });
        papers.append(paper);
    }
    function showDetail(mission) {
        detail.replaceChildren(node('h4','',mission.name));
        for (const [label,value] of [[thai ? 'รายละเอียด' : 'Description',mission.description],[thai ? 'เป้าหมาย' : 'Objective',mission.objective],
            [thai ? 'ผู้ว่าจ้าง' : 'Issuer',mission.giver],[thai ? 'รางวัล' : 'Reward',mission.reward],[thai ? 'ความยาก' : 'Difficulty',mission.difficulty],
            [thai ? 'กำหนดเวลา' : 'Deadline',mission.deadline],[thai ? 'หมายเหตุ' : 'Notes',mission.notes]]) {
            if (!value) continue;
            const row = node('p',''); row.append(node('strong','',`${label}: `),document.createTextNode(value)); detail.append(row);
        }
        if (mission.objectives.length) { const list = node('ul',''); for (const step of mission.objectives) list.append(node('li','',`${step.title}${step.optional ? thai ? ' (เสริม)' : ' (optional)' : ''}`)); detail.append(list); }
        const actions = node('div','trpg-board-actions'), back = node('button','',thai ? 'ย้อนกลับ' : 'Back'), accept = node('button','',thai ? 'รับภารกิจ' : 'Accept mission');
        back.type = accept.type = 'button'; accept.className = 'trpg-board-accept';
        const unavailable = mission.questStatus || !board.available;
        accept.disabled = Boolean(unavailable);
        if (mission.questStatus) accept.textContent = thai ? 'อยู่ในบันทึกภารกิจแล้ว' : 'Already in quest log';
        const status = node('p','trpg-board-status',!board.available && !mission.questStatus ? thai ? 'กลับไปอ่านกระดานปัจจุบันก่อนรับภารกิจ' : 'Return to the current board to accept.' : '');
        status.setAttribute('role','status');
        back.addEventListener('click',() => { if (!valid()) return; selected = null; detail.hidden = true; papers.hidden = false; root.querySelector(`[data-mission-id="${mission.id}"]`)?.focus(); });
        accept.addEventListener('click',async() => {
            if (!valid() || selected !== mission.id || accept.disabled) return;
            accept.disabled = back.disabled = true; status.textContent = thai ? 'กำลังบันทึกภารกิจ…' : 'Saving mission…';
            try {
                const ok = await api.acceptBoardMission(messageId,mission.id,board.token);
                if (!valid()) return;
                status.textContent = ok ? thai ? 'รับภารกิจแล้ว' : 'Mission accepted' : thai ? 'รับภารกิจไม่สำเร็จ ตรวจการแจ้งเตือนและกระดานปัจจุบัน แล้วลองอีกครั้ง' : 'Unable to accept. Check notifications and the current board, then try again.';
                accept.disabled = Boolean(ok); back.disabled = false;
            } catch { if (valid()) { status.textContent = thai ? 'บันทึกไม่สำเร็จ ลองอีกครั้ง' : 'Save failed. Try again.'; accept.disabled = back.disabled = false; } }
        });
        actions.append(back,accept); detail.append(actions,status); papers.hidden = true; detail.hidden = false; back.focus();
    }
    root.append(papers,detail);
    return root;
}
