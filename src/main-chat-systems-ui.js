export function renderChatSystemStatus(status, messageId, api) {
    if (!status?.keys?.length || status.keys.every(key=>['marketplace','auction'].includes(key))) return null;
    const thai = api.settings().language === 'th';
    const labels = thai ? {marketplace:'ร้านค้า / ข้อเสนอซื้อ', auction:'ประมูล', missionBoard:'กระดานภารกิจ', groupBoard:'กระดานปาร์ตี้และกิลด์'}
        : {marketplace:'Shop / buy offer', auction:'Auction', missionBoard:'Mission board', groupBoard:'Party and guild board'};
    const root = document.createElement('section'); root.className = 'trpg-marketplace-chat trpg-system-status'; root.setAttribute('role','status');
    const title = document.createElement('strong'); title.textContent = status.keys.filter(key=>!['marketplace','auction'].includes(key)).map(key => labels[key]).join(' · ');
    const detail = document.createElement('p'); detail.textContent = thai
        ? 'คำตอบนี้ยังให้รายละเอียดสำหรับเปิดรายการไม่ครบ กดเพื่อเตรียมข้อความขอให้ NPC แสดงรายการพร้อมรายละเอียด แล้วตรวจสอบก่อนส่งในแชตหลัก'
        : 'This reply did not provide enough detail to open the list. Draft a request for the list and details, then review it before sending in Main Chat.';
    root.append(title,detail);
    const button = document.createElement('button'); button.type = 'button'; button.disabled = !status.available;
    button.textContent = thai ? 'เตรียมข้อความขอดูรายการ' : 'Draft a request for the list';
    button.addEventListener('click',() => api.prepareChatSystemRequest?.(messageId,status.token)); root.append(button);
    return root;
}
