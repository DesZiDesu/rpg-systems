export function renderChatSystemStatus(status, messageId, api) {
    if (!status?.keys?.length || status.keys.every(key=>['marketplace','auction'].includes(key))) return null;
    const thai = api.settings().language === 'th';
    const labels = thai ? {marketplace:'ร้านค้า / ข้อเสนอซื้อ', auction:'ประมูล', missionBoard:'กระดานภารกิจ', groupBoard:'กระดานปาร์ตี้และกิลด์'}
        : {marketplace:'Shop / buy offer', auction:'Auction', missionBoard:'Mission board', groupBoard:'Party and guild board'};
    const root = document.createElement('section'); root.className = 'trpg-marketplace-chat trpg-system-status'; root.setAttribute('role','status');
    const title = document.createElement('strong'); title.textContent = status.keys.filter(key=>!['marketplace','auction'].includes(key)).map(key => labels[key]).join(' · ');
    const detail = document.createElement('p'); detail.textContent = thai
        ? 'AI ไม่ได้แนบข้อมูลกระดานที่ครบถ้วนในคำตอบนี้ การ์ดต้องแสดงพร้อมคำตอบหลัก ลอง Swipe หรือ Regenerate คำตอบนี้ได้'
        : 'The AI did not include complete board data in this reply. The card should appear with the main reply. You can swipe or regenerate this reply.';
    root.append(title,detail);
    return root;
}
