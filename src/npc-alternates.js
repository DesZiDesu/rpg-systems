import { FIELDS, RELATIONS, STATS, ROLE_ICONS, clean, clamp, profileFields } from './npc-core.js?v=0.58.2';

// Alternate dossiers belong to one NPC identity. Selecting a period is a user
// action; model patches may update its fields but cannot change that selection.
export const MAX_NPC_ALTERNATES = 20;
export const NPC_ALTERNATE_INSTRUCTIONS = 'NPC ALTERNATE DOSSIERS: one stable NPC id/name/aliases identifies one person across periods or forms. activeAlternateId is chosen manually by the user. Treat only the active dossier as current facts; inactive versions are reference labels, not simultaneous people. Updates to supported profile fields, stats, abilities and custom meters apply to the active alternate when selected, otherwise to the original dossier. Identity, scope, contacts, met/enabled/hostile state, knowledge and diary remain shared. Never create a duplicate NPC for an alternate period, change the active selection, or create/delete/edit the alternate list through story patches. Portraits and presentation metadata remain local-only.';
const own = (value, key) => Object.hasOwn(value, key);
const record = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const RESERVED_IDS = new Set(['__proto__', 'prototype', 'constructor']);
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value) && !RESERVED_IDS.has(value) ? value : '';
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const textFields = Object.keys(FIELDS).filter(key => key !== 'name');
const portraitKeys = ['hasPortrait', 'portraitSource', 'portraitPath', 'portraitChatId', 'portraitView'];
const styleKeys = ['portraitSize', 'identityColor', 'roleIcon'];

function uniqueId(value, used, fallback) {
    const stem = safeId(value) || fallback;
    let id = stem, suffix = 2;
    while (used.has(id)) { const end = `-${suffix++}`; id = stem.slice(0, 120 - end.length) + end; }
    used.add(id);
    return id;
}

function cleanFields(raw) {
    if (!record(raw)) return {};
    // Copy only owned fields before using the existing core cleaner. Inherited
    // properties and prototype names never become alternate overrides.
    const supplied = Object.fromEntries([...textFields, ...RELATIONS, 'stats', 'abilities']
        .filter(key => own(raw, key)).map(key => [key, raw[key]]));
    if (record(supplied.stats)) supplied.stats = Object.fromEntries([...STATS, 'rank']
        .filter(key => own(supplied.stats, key)).map(key => [key, supplied.stats[key]]));
    else delete supplied.stats;
    const result = profileFields(supplied);
    if (result.stats) for (const key of ['strength', 'agility', 'intelligence', 'endurance'])
        if (own(result.stats, key)) result.stats[key] = clamp(result.stats[key], 0, 9999);
    if (Array.isArray(supplied.abilities)) {
        const used = new Set();
        result.abilities = supplied.abilities.slice(0, 100).filter(value => record(value) && own(value, 'name') && clean(value.name))
            .map((value, index) => ({
                id: uniqueId(own(value, 'id') ? value.id : '', used, `ability-${index + 1}`),
                name: clean(value.name, 120), category: clean(own(value, 'category') ? value.category : '', 80),
                level: clean(own(value, 'level') ? value.level : '', 80),
                description: clean(own(value, 'description') ? value.description : '', 1000),
                proficiency: clamp(own(value, 'proficiency') ? value.proficiency : 0, 0, 100),
            }));
    }
    if (own(raw, 'customMeters') && Array.isArray(raw.customMeters)) {
        const used = new Set();
        result.customMeters = raw.customMeters.slice(0, 30).filter(value => record(value) && own(value, 'name') && clean(value.name))
            .map((value, index) => ({ id: uniqueId(own(value, 'id') ? value.id : '', used, `meter-${index + 1}`),
                name: clean(value.name, 80), value: clamp(own(value, 'value') ? value.value : 0, 0, 100) }));
    }
    if (own(raw, 'lifeMode') && ['Active', 'Story only', 'Paused'].includes(raw.lifeMode)) result.lifeMode = raw.lifeMode;
    if (own(raw, 'activityUpdatedDay') && Number.isFinite(raw.activityUpdatedDay)) result.activityUpdatedDay = Math.floor(clamp(raw.activityUpdatedDay, 0, 999999));
    return result;
}

function frame(raw) {
    if (!record(raw)) return null;
    const numeric = (key, fallback, min, max) => own(raw, key) && Number.isFinite(Number(raw[key]))
        && (typeof raw[key] === 'number' || typeof raw[key] === 'string' && raw[key].trim()) ? clamp(raw[key], min, max) : fallback;
    return { x: numeric('x', 50, 0, 100), y: numeric('y', 50, 0, 100), zoom: numeric('zoom', 1, 1, 3) };
}

function presentationFields(raw) {
    if (!record(raw)) return {};
    const result = {};
    if (own(raw, 'hasPortrait') && typeof raw.hasPortrait === 'boolean') result.hasPortrait = raw.hasPortrait;
    if (own(raw, 'portraitSource') && ['local', 'server', 'none'].includes(raw.portraitSource)) result.portraitSource = raw.portraitSource;
    if (own(raw, 'portraitPath') && typeof raw.portraitPath === 'string') {
        result.portraitPath = /^\/?user\/images\/tretaresia-npc\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/.test(raw.portraitPath) ? raw.portraitPath : '';
    }
    if (own(raw, 'portraitChatId')) result.portraitChatId = clean(raw.portraitChatId, 500);
    if (own(raw, 'portraitView') && record(raw.portraitView)) {
        const desktop = frame(own(raw.portraitView, 'desktop') ? raw.portraitView.desktop : null);
        const mobile = frame(own(raw.portraitView, 'mobile') ? raw.portraitView.mobile : null);
        if (desktop || mobile) result.portraitView = { desktop: desktop || { ...mobile }, mobile: mobile || { ...desktop } };
    }
    if (own(raw, 'portraitSize') && Number.isFinite(Number(raw.portraitSize))
        && (typeof raw.portraitSize === 'number' || typeof raw.portraitSize === 'string' && raw.portraitSize.trim())) result.portraitSize = clamp(raw.portraitSize, 48, 144);
    if (own(raw, 'identityColor') && /^#[0-9a-f]{6}$/i.test(raw.identityColor)) result.identityColor = raw.identityColor;
    if (own(raw, 'roleIcon') && Object.hasOwn(ROLE_ICONS, raw.roleIcon)) result.roleIcon = raw.roleIcon;
    return result;
}

export function normalizeNpcAlternates(raw = {}, base = {}) {
    raw = record(raw) ? raw : {}; base = record(base) ? base : {};
    const source = own(raw, 'alternateProfiles') && Array.isArray(raw.alternateProfiles) ? raw.alternateProfiles
        : own(base, 'alternateProfiles') && Array.isArray(base.alternateProfiles) ? base.alternateProfiles : [];
    const used = new Set(), alternateProfiles = [];
    for (const value of source.slice(0, MAX_NPC_ALTERNATES)) {
        if (!record(value) || !['id', 'label', 'fields'].some(key => own(value, key))) continue;
        const index = alternateProfiles.length;
        alternateProfiles.push({
            id: uniqueId(own(value, 'id') ? value.id : '', used, `alternate-${index + 1}`),
            label: clean(own(value, 'label') ? value.label : '', 120) || `Alternate ${index + 1}`,
            description: clean(own(value, 'description') ? value.description : '', 1000),
            fields: cleanFields(own(value, 'fields') ? value.fields : {}),
            ...presentationFields(value),
        });
    }
    const selected = own(raw, 'activeAlternateId') ? raw.activeAlternateId : own(base, 'activeAlternateId') ? base.activeAlternateId : '';
    const activeAlternateId = typeof selected === 'string' && alternateProfiles.some(value => value.id === selected) ? selected : '';
    return { alternateProfiles, activeAlternateId };
}

function ownsPortrait(alternate) {
    return Boolean(alternate) && (own(alternate, 'hasPortrait') || own(alternate, 'portraitSource'));
}

function hasOwnPortrait(alternate) {
    return ownsPortrait(alternate) && alternate.hasPortrait !== false && alternate.portraitSource !== 'none';
}

function portraitMetadata(npc, alternate) {
    const result = {};
    for (const key of [...portraitKeys, ...styleKeys]) if (own(npc, key)) result[key] = copy(npc[key]);
    result.npcAlternateId = '';
    if (!alternate) return result;
    // No portrait override inherits the original image. Explicitly removing an
    // image is different: it remains a stage-specific empty portrait.
    if (ownsPortrait(alternate)) {
        for (const key of portraitKeys) delete result[key];
        result.hasPortrait = hasOwnPortrait(alternate);
        result.portraitSource = result.hasPortrait ? alternate.portraitSource || 'local' : 'none';
        result.portraitPath = alternate.portraitPath || '';
        result.portraitChatId = alternate.portraitChatId || '';
        if (alternate.portraitView) result.portraitView = copy(alternate.portraitView);
        else if (npc.portraitView) result.portraitView = copy(npc.portraitView);
        result.npcAlternateId = alternate.id;
    }
    for (const key of [...styleKeys, 'portraitView']) if (own(alternate, key)) result[key] = copy(alternate[key]);
    return result;
}

export function effectiveNpc(npc = {}) {
    if (!record(npc)) return {};
    const alternates = normalizeNpcAlternates(npc), alternate = alternates.alternateProfiles.find(value => value.id === alternates.activeAlternateId);
    const result = { ...copy(npc), ...alternates };
    if (alternate) {
        Object.assign(result, copy(alternate.fields));
        if (alternate.fields.stats) result.stats = { ...(record(npc.stats) ? copy(npc.stats) : {}), ...alternate.fields.stats };
    }
    return { ...result, ...portraitMetadata(npc, alternate) };
}

export function alternatePortraitRecord(npc = {}, alternateId) {
    if (!record(npc)) return {};
    const alternates = normalizeNpcAlternates(npc), selected = alternateId === undefined ? alternates.activeAlternateId : alternateId;
    const alternate = alternates.alternateProfiles.find(value => value.id === selected);
    return { ...copy(npc), ...alternates, ...portraitMetadata(npc, alternate) };
}

export function updateNpcAlternate(npc = {}, alternateId = '', fields = {}) {
    if (!record(npc)) return {};
    const alternates = normalizeNpcAlternates(npc), result = { ...copy(npc), ...alternates };
    fields = record(fields) ? fields : {};
    const incoming = cleanFields(fields), presentation = presentationFields(fields);
    if (!alternateId) {
        Object.assign(result, incoming, presentation);
        // Original identity may be edited only through the original dossier.
        if (own(fields, 'name')) result.name = clean(fields.name, 120);
        if (own(fields, 'aliases') && Array.isArray(fields.aliases)) result.aliases = fields.aliases.slice(0, 30).map(value => clean(value, 120)).filter(Boolean);
        if (incoming.stats) result.stats = { ...(record(npc.stats) ? copy(npc.stats) : {}), ...incoming.stats };
        return result;
    }
    const alternate = result.alternateProfiles.find(value => value.id === alternateId);
    if (!alternate) return result;
    const previousStats = alternate.fields.stats;
    alternate.fields = { ...alternate.fields, ...incoming };
    if (incoming.stats) {
        alternate.fields.stats = { ...(previousStats || {}), ...incoming.stats };
    }
    Object.assign(alternate, presentation);
    return result;
}

export function alternatePromptContext(npc = {}) {
    const alternates = normalizeNpcAlternates(npc), selected = alternates.alternateProfiles.find(value => value.id === alternates.activeAlternateId);
    if (!alternates.alternateProfiles.length) return {};
    return { activeAlternateId: selected?.id || '', activeAlternateLabel: selected?.label || '',
        alternateProfiles: alternates.alternateProfiles.map(({ id, label, description }) => ({ id, label, ...(description ? { description: description.slice(0, 160) } : {}) })) };
}

export function enumerateNpcPortraits(npc = {}) {
    if (!record(npc)) return [];
    const { alternateProfiles } = normalizeNpcAlternates(npc);
    return [alternatePortraitRecord(npc, ''), ...alternateProfiles.filter(hasOwnPortrait)
        .map(value => alternatePortraitRecord(npc, value.id))];
}
