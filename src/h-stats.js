// The adult dossier is stored per character. All fields are available regardless of gender.
// Unknown values remain empty; counts are never inferred from the character's identity.
export const H_FIELDS = Object.freeze([
    {key:'mouthQuality', label:'คุณภาพปาก / Mouth quality', type:'text', group:'Body'},
    {key:'mouthState', label:'สภาพปาก / Mouth state', type:'text', group:'Body'},
    {key:'mouthLastPartner', label:'คนใช้ปากล่าสุด / Last oral partner', type:'text', group:'Body'},
    {key:'penisSize', label:'ขนาดควย / Penis size', type:'text', group:'Body'},
    {key:'penisQuality', label:'คุณภาพควย / Penis quality', type:'text', group:'Body'},
    {key:'penisState', label:'สภาพควย / Penis state', type:'text', group:'Body'},
    {key:'penisLastPartner', label:'คนใช้ควยล่าสุด / Last penile partner', type:'text', group:'Body'},
    {key:'breastQuality', label:'คุณภาพหน้าอก / Breast quality', type:'text', group:'Body'},
    {key:'breastState', label:'สภาพหน้าอก / Breast state', type:'text', group:'Body'},
    {key:'breastLastPartner', label:'คนใช้หน้าอกล่าสุด / Last breast partner', type:'text', group:'Body'},
    {key:'nippleQuality', label:'คุณภาพหัวนม / Nipple quality', type:'text', group:'Body'},
    {key:'nippleState', label:'สภาพหัวนม / Nipple state', type:'text', group:'Body'},
    {key:'nippleLastPartner', label:'คนใช้หัวนมล่าสุด / Last nipple partner', type:'text', group:'Body'},
    {key:'vaginaQuality', label:'คุณภาพหี / Vaginal quality', type:'text', group:'Body'},
    {key:'vaginaState', label:'สภาพหี / Vaginal state', type:'text', group:'Body'},
    {key:'vaginaLastPartner', label:'คนใช้หีล่าสุด / Last vaginal partner', type:'text', group:'Body'},
    {key:'anusQuality', label:'คุณภาพรูตูด / Anal quality', type:'text', group:'Body'},
    {key:'anusState', label:'สภาพรูตูด / Anal state', type:'text', group:'Body'},
    {key:'anusLastPartner', label:'คนใช้รูตูดล่าสุด / Last anal partner', type:'text', group:'Body'},
    {key:'oralActCount', label:'อมควยกี่ครั้ง / Oral acts', type:'count', group:'History'},
    {key:'ejaculateLiters', label:'ปล่อยน้ำว่าวแล้วกี่ลิตร / Ejaculate liters', type:'liters', group:'History'},
    {key:'unprotectedSexCount', label:'มีเซ็กส์สดกี่รอบ / Unprotected sex', type:'count', group:'History'},
    {key:'oralSexCount', label:'มีเซ็กส์ทางปากกี่รอบ / Oral sex', type:'count', group:'History'},
    {key:'analSexCount', label:'มีเซ็กส์ทางก้นกี่รอบ / Anal sex', type:'count', group:'History'},
    {key:'swallowedLiters', label:'ดื่มน้ำว่าวกี่ลิตร / Swallowed liters', type:'liters', group:'History'},
    {key:'birthCount', label:'คลอดลูกกี่คน / Births', type:'count', group:'History'},
    {key:'orgasmCount', label:'น้ำแตกกี่ครั้ง / Orgasms', type:'count', group:'History'},
    {key:'infidelityStage', label:'แนวโน้มนอกใจ Stage 1–5 / Infidelity stage', type:'stage', group:'Bonds'},
    {key:'infidelityProgress', label:'ความคืบหน้าของ Stage / Stage progress', type:'progress', group:'Bonds'},
    {key:'loyaltyHearts', label:'ความซื่อสัตย์ต่อผู้เล่น / Loyalty hearts', type:'hearts', group:'Bonds'},
    {key:'pregnant', label:'ท้อง / Pregnancy', type:'boolean', group:'Bonds'},
    {key:'pregnancyFather', label:'ท้องลูกของใคร / Other parent', type:'text', group:'Bonds'},
    {key:'favoriteSexPartner', label:'คู่ที่ชอบที่สุด / Favorite sexual partner', type:'text', group:'Preferences'},
    {key:'favoritePenisOwner', label:'ชอบควยของใคร / Favorite penis owner', type:'text', group:'Preferences'},
    {key:'preferredPenisSize', label:'ขนาดควยที่ชอบ / Preferred penis size', type:'text', group:'Preferences'},
    {key:'favoritePosition', label:'ท่าที่ชอบ / Favorite position', type:'text', group:'Preferences'},
    {key:'currentFantasy', label:'ในหัวตอนนี้คิดเรื่องลามกอะไร / Current fantasy', type:'text', group:'Preferences'},
]);

export const H_FIELD_MAP = Object.freeze(Object.fromEntries(H_FIELDS.map(field => [field.key, field])));
const MAX_COUNT = 999999999;
export function hStats(raw = {}, base = {}) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const previous = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
    const result = {};
    for (const field of H_FIELDS) {
        const value = Object.hasOwn(source, field.key) ? source[field.key] : previous[field.key];
        if (field.type === 'text') result[field.key] = typeof value === 'string' ? value.trim().slice(0, 500) : '';
        else if (field.type === 'boolean') result[field.key] = typeof value === 'boolean' ? value : null;
        else {
            const parsed = value === '' || value === null || value === undefined ? NaN : Number(value);
            const min = field.type === 'stage' ? 1 : 0;
            const max = field.type === 'stage' ? 5 : field.type === 'hearts' ? 5 : field.type === 'progress' ? 100 : MAX_COUNT;
            result[field.key] = Number.isFinite(parsed) ? Math.min(max, Math.max(min,
                field.type === 'liters' ? Math.round(parsed * 1000) / 1000 : Math.trunc(parsed))) : null;
        }
    }
    return result;
}

export function updateHStat(previous, field, verb, value) {
    const definition = H_FIELD_MAP[field];
    if (!definition || !['set', 'inc'].includes(verb) || (verb === 'inc' && !['count', 'liters', 'progress', 'stage', 'hearts'].includes(definition.type))) return null;
    const current = hStats(previous);
    if (verb === 'set' && definition.type === 'boolean' && typeof value !== 'boolean') return null;
    if (verb === 'set' && definition.type === 'text' && typeof value !== 'string') return null;
    if (definition.type !== 'boolean' && definition.type !== 'text') {
        if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) return null;
        value = (verb === 'inc' ? (current[field] ?? 0) : 0) + Number(value);
    }
    const next = hStats({[field]: value}, current);
    return next[field] === current[field] ? null : next;
}

// Explicit dossier corrections survive live swipe/rollback. Keep the old
// story values of every untouched field, and leave the Branch journal alone:
// a new fork of an earlier message must still recover that earlier point.
export function retainHStatsEdits(history, before, after, packedAfter = after) {
    if (!Array.isArray(history?.entries)) return;
    const previous = new Map((before.npcs || []).map(npc => [npc.id, npc]));
    const snapshots = history.entries.flatMap(entry => [entry.baseState,
        ...Object.values(entry.variants || {}).map(variant => variant.state)]).filter(Boolean);
    for (const npc of after.npcs || []) {
        if (['__proto__', 'constructor', 'prototype'].includes(npc.id)) continue;
        const old = previous.get(npc.id);
        if (!old) continue;
        const confirmed = new Set((old.hStatsGenerated || []).filter(key => !(npc.hStatsGenerated || []).includes(key)));
        const fields = H_FIELDS.map(field => field.key).filter(key =>
            old.hStats?.[key] !== npc.hStats?.[key] || confirmed.has(key));
        if (!fields.length) continue;
        for (const snapshot of snapshots) {
            let target = snapshot.npcs?.find(value => value.id === npc.id);
            if (target) {
                target.hStats ||= {};
                for (const key of fields) target.hStats[key] = npc.hStats[key];
            } else {
                const scope = snapshot.npcScopes, packed = packedAfter.npcScopes;
                if (npc.npcScope !== 'character' || !scope || scope.owner !== npc.npcOwner
                    || packed?.owner !== scope.owner || scope.archiveId !== packed.archiveId) continue;
                scope.overrides ||= {}; scope.bases ||= {};
                target = scope.overrides[npc.id] ||= {};
                const baseline = scope.bases[npc.id] ||= {};
                target.hStats ||= {}; baseline.hStats ||= {};
                for (const key of fields) {
                    if (Object.hasOwn(packed.overrides?.[npc.id]?.hStats || {}, key)) {
                        target.hStats[key] = packed.overrides[npc.id].hStats[key];
                        if (Object.hasOwn(packed.bases?.[npc.id]?.hStats || {}, key))
                            baseline.hStats[key] = structuredClone(packed.bases[npc.id].hStats[key]);
                        else delete baseline.hStats[key];
                    } else {
                        delete target.hStats[key]; delete baseline.hStats[key];
                    }
                }
            }
            // Remove only annotations the user confirmed, preserving other
            // fields' original provenance in each historical snapshot.
            if (Array.isArray(target.hStatsGenerated))
                target.hStatsGenerated = target.hStatsGenerated.filter(key => !fields.includes(key));
        }
    }
}
