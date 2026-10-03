import {uiText,uiMarkup} from './ui-language.js?v=0.51.5';
import {LORE_LIMIT, LORE_CONTENT_LIMIT, loreEntries} from './lore-core.js?v=0.51.5';

export const LORE_FILE_LIMIT = 12 * 1024 * 1024;
const format = 'tretaresia-lore';
function validate(entries) {
    if (!Array.isArray(entries) || entries.length > LORE_LIMIT) throw Error(uiText("ไฟล์ Lore ต้องมีไม่เกิน {0} รายการ",[LORE_LIMIT]));
    return entries.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item) ||
            typeof item.title !== 'string' || !item.title.trim() || item.title.length > 160 ||
            typeof item.content !== 'string' || !item.content.trim() || item.content.length > LORE_CONTENT_LIMIT ||
            typeof item.enabled !== 'boolean' ||
            (item.always !== undefined && typeof item.always !== 'boolean') ||
            (item.keywords !== undefined && (!Array.isArray(item.keywords) || item.keywords.length > 30 || item.keywords.some(k => typeof k !== 'string' || !k.trim() || k.length > 120)))) {
            throw Error(uiText("Lore รายการที่ {0} ไม่ถูกต้อง: ชื่อไม่เกิน 160 และเนื้อหาไม่เกิน {1} ตัวอักษร",[index + 1,LORE_CONTENT_LIMIT.toLocaleString()]));
        }
        return {title:item.title, content:item.content, enabled:item.enabled, keywords:item.keywords || [], always:item.always === true};
    });
}
export function exportLore(entries) {
    return JSON.stringify({format, version:1, entries:validate(loreEntries(entries))}, null, 2);
}
export function parseLoreFile(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > LORE_FILE_LIMIT) throw Error(uiText("ไฟล์ Lore ต้องไม่เกิน 12 MB"));
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw Error(uiText("อ่านไฟล์ไม่ได้: ต้องเป็นไฟล์ Lore JSON ที่ถูกต้อง")); }
    if (!Array.isArray(data) && (data?.format !== format || data?.version !== 1)) throw Error(uiText("รูปแบบไฟล์ไม่รองรับ กรุณาใช้ไฟล์ Export จาก Lore Management"));
    return validate(Array.isArray(data) ? data : data.entries);
}
const signature = item => JSON.stringify([item.title,item.content,item.enabled,item.keywords || [],item.always === true]);
export function mergeLore(existing, imported) {
    const next=loreEntries(existing), known=new Set(next.map(signature));
    let added=0, skipped=0;
    for (const item of validate(imported)) {
        const key=signature(item);
        if (known.has(key)) { skipped++; continue; }
        if (next.length >= LORE_LIMIT) throw Error(uiText("รวมแล้วเกิน {0} รายการ — ยังไม่ได้บันทึกข้อมูล",[LORE_LIMIT]));
        // Imported IDs never overwrite existing records, including across cards.
        let id;do { id=globalThis.crypto?.randomUUID?.() || `lore-${Date.now()}-${Math.random().toString(36).slice(2)}`; } while (next.some(entry=>entry.id===id));
        next.push({id,...item});known.add(key);added++;
    }
    return {entries:next,added,skipped};
}
