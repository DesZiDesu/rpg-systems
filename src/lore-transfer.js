import {uiText,uiMarkup} from './ui-language.js?v=0.87.0';
import {LORE_CONTENT_LIMIT, loreEntries, assertLoreCapacity} from './lore-core.js?v=0.87.0';

export const LORE_FILE_LIMIT = 12 * 1024 * 1024;
const format = 'tretaresia-lore';
function validate(entries) {
    if (!Array.isArray(entries)) throw Error(uiText('Invalid Lore archive.'));
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
// Each part is an ordinary v1 Lore file, so a large archive remains importable
// under the existing byte limit without truncation or a new file format.
export function exportLoreFiles(entries, maxBytes = LORE_FILE_LIMIT) {
    const encoder=new TextEncoder(),start=JSON.stringify({format,version:1}).slice(0,-1)+',"entries":[',end=']}',base=encoder.encode(start+end).length;
    if(!Number.isSafeInteger(maxBytes)||maxBytes<base)throw Error(uiText('Invalid Lore export file size.'));
    const files=[];let rows=[],size=base;
    function finish(){files.push(start+rows.join(',')+end);rows=[];size=base;}
    for(const item of validate(loreEntries(entries))){
        const row=JSON.stringify(item),bytes=encoder.encode(row).length;
        if(base+bytes>maxBytes)throw Error(uiText('A Lore entry exceeds the export file size.'));
        if(rows.length&&size+1+bytes>maxBytes)finish();
        size+=bytes+(rows.length?1:0);rows.push(row);
    }
    if(rows.length||!files.length)finish();return files;
}
export function parseLoreFile(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > LORE_FILE_LIMIT) throw Error(uiText("ไฟล์ Lore ต้องไม่เกิน 12 MB"));
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw Error(uiText("อ่านไฟล์ไม่ได้: ต้องเป็นไฟล์ Lore JSON ที่ถูกต้อง")); }
    if (!Array.isArray(data) && (data?.format !== format || data?.version !== 1)) throw Error(uiText("รูปแบบไฟล์ไม่รองรับ กรุณาใช้ไฟล์ Export จาก Lore Management"));
    return validate(Array.isArray(data) ? data : data.entries);
}
const signature = item => JSON.stringify([item.title,item.content,item.enabled,item.keywords || [],item.always === true]);
export function mergeLore(existing, imported, options = {}) {
    const next=loreEntries(existing), previousCount=next.length, known=new Set(next.map(signature)), ids=new Set(next.map(item=>item.id));
    let added=0, skipped=0;
    for (const item of validate(imported)) {
        const key=signature(item);
        if (known.has(key)) { skipped++; continue; }
        assertLoreCapacity(next.length+1,options,previousCount);
        // Imported IDs never overwrite existing records, including across cards.
        let id;do { id=globalThis.crypto?.randomUUID?.() || `lore-${Date.now()}-${Math.random().toString(36).slice(2)}`; } while (ids.has(id));
        next.push({id,...item});known.add(key);ids.add(id);added++;
    }
    return {entries:next,added,skipped};
}
