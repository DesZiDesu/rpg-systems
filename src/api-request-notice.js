// Called at RoleForge's request boundary, never while rendering or editing UI.
const labels = {
    items: ['Loot / item action', 'เก็บ / ใช้ / ทิ้ง / มอบไอเทม'],
    powerMastery: ['Training', 'ฝึกพลัง / วิชา / ทักษะ'],
    manualSync: ['Manual Sync', 'ซิงก์ข้อมูลด้วย AI'],
    hStatsBaseline: ['NPC H-Stats profile', 'สร้างโปรไฟล์ H-Stats ของ NPC'],
    npcPortrait: ['Read NPC reference image', 'อ่านภาพอ้างอิง NPC'],
    npcDraft: ['Generate NPC profile', 'สร้างข้อมูล NPC'],
    memorySummary: ['Memory Summary', 'สรุปความจำ'],
    voiceSpeech: ['ElevenLabs · generate dialogue audio', 'ElevenLabs · สร้างเสียงบทพูด'],
    voiceAccount: ['ElevenLabs · read account / voices', 'ElevenLabs · อ่านบัญชี / รายชื่อเสียง'],
    voicePreview: ['ElevenLabs · load voice sample', 'ElevenLabs · โหลดตัวอย่างเสียง'],
    opening: ['Character Forge opening', 'สร้างฉากเปิดเรื่อง'],
    hiddenAction: ['Role-play action', 'ดำเนินการโรลเพลย์'],
    visibleAction: ['Role-play action', 'ดำเนินการโรลเพลย์'],
};
const mainReply = new Set(['opening', 'hiddenAction', 'visibleAction']);

export function apiRequestNotice(kind, reason = '', language = 'en') {
    const th = language === 'th', index = th ? 1 : 0;
    let label = (labels[kind] || ['RoleForge task', 'งาน RoleForge'])[index];
    if (kind === 'commerce') {
        const system = String(reason).split(' · ')[0];
        label = ({auction:['Auction','ประมูล'],buy:['Buying','ซื้อสินค้า'],sell:['Selling','ขายสินค้า']}[system] || ['Commerce','ซื้อขาย / ประมูล'])[index];
    }
    if(kind==='items'&&String(reason).startsWith('enrich'))label=(th?'เติมข้อมูลไอเทม · ชุด ':'Fill item details · batch ')+String(reason).split(' · ')[1];
    const sequence = String(reason).match(/(?:Sync|summary) (\d+(?:\/\d+)?)/i)?.[1];
    if (sequence) label += ` · ${sequence}`;
    if (/retry/i.test(reason)) label += th ? ' · ลองใหม่' : ' · retry';
    return th
        ? `${label}: กำลังเรียก API${mainReply.has(kind) ? '' : ' เพิ่ม'}`
        : `${label}: calling ${mainReply.has(kind) ? 'the' : 'an additional'} API`;
}

export function showApiRequestNotice(kind, reason, language, toast = globalThis.toastr) {
    const message = apiRequestNotice(kind, reason, language);
    // Native SillyTavern toast; every dispatch is visible, including retries.
    // A broken toast plugin must not prevent the requested operation.
    try {
        if (typeof toast?.info === 'function') toast.info(message, 'RoleForge · API', {
            escapeHtml: true, preventDuplicates: false, timeOut: 5000, extendedTimeOut: 1000,
        });
        else console.info(`[RoleForge · API] ${message}`);
    } catch (error) { console.warn('[RoleForge] API notification unavailable.', error); }
}
