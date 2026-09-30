const MAX_OBJECTIVES = 40;
const owns = (value, field) => Object.prototype.hasOwnProperty.call(value, field);
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const clean = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const titleKey = value => clean(value, 180).normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ');
const statuses = new Map([['pending', 'Pending'], ['completed', 'Completed'], ['skipped', 'Skipped']]);

// IDs derived from the title survive reloads and do not require a browser crypto API.
function objectiveId(title) {
    const key = titleKey(title);
    let hash = 2166136261;
    for (let index = 0; index < key.length; index++) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `objective-${(hash >>> 0).toString(36)}-${key.length.toString(36)}`;
}

function normalizedRecord(value, previous = null) {
    if (!record(value)) return null;
    const title = clean(value.title, 180) || previous?.title || '';
    if (!title) return null;
    const status = statuses.get(clean(value.status, 20).toLowerCase());
    return {
        id: previous?.id || clean(value.id, 100) || objectiveId(title),
        title,
        status: status || previous?.status || 'Pending',
        optional: owns(value, 'optional') && typeof value.optional === 'boolean' ? value.optional : previous?.optional || false,
        notes: owns(value, 'notes') && typeof value.notes === 'string' ? clean(value.notes, 1200) : previous?.notes || '',
        evidence: owns(value, 'evidence') && typeof value.evidence === 'string' ? clean(value.evidence, 1200) : previous?.evidence || '',
        sourceMessageId: value.sourceMessageId === null ? null : typeof value.sourceMessageId === 'number' && Number.isInteger(value.sourceMessageId) && value.sourceMessageId >= 0
            ? value.sourceMessageId : previous?.sourceMessageId ?? null,
        sourceDay: value.sourceDay === null ? null : typeof value.sourceDay === 'number' && Number.isInteger(value.sourceDay) && value.sourceDay >= 1
            ? Math.min(value.sourceDay, 999999) : previous?.sourceDay ?? null,
        source: owns(value, 'source') && typeof value.source === 'string' ? clean(value.source, 100) : previous?.source || '',
    };
}

function mergeRecord(objectives, value) {
    if (!record(value)) return false;
    const id = clean(value.id, 100), key = titleKey(value.title);
    const index = objectives.findIndex(objective => id && objective.id === id);
    const titleIndex = key ? objectives.findIndex(objective => titleKey(objective.title) === key) : -1;
    const match = index >= 0 ? index : titleIndex;
    const normalized = normalizedRecord(value, match >= 0 ? objectives[match] : null);
    if (!normalized) return false;
    if (match < 0) {
        if (objectives.length >= MAX_OBJECTIVES) return false;
        // A generated hash collision must not silently merge two distinct titles.
        const used = new Set(objectives.map(objective => objective.id));
        const base = normalized.id;
        for (let suffix = 2; used.has(normalized.id); suffix++) normalized.id = `${base}-${suffix}`;
        objectives.push(normalized);
        return true;
    }
    objectives[match] = normalized;
    const duplicate = objectives.findIndex((objective, other) => other !== match && titleKey(objective.title) === titleKey(normalized.title));
    if (duplicate >= 0) {
        // Renaming an objective into an existing title retains the first canonical ID.
        const keep = Math.min(match, duplicate), remove = Math.max(match, duplicate);
        objectives[keep] = {...normalizedRecord(value, objectives[keep]), id: objectives[keep].id};
        objectives.splice(remove, 1);
    }
    return true;
}

export function normalizeQuestObjectives(values) {
    const objectives = [];
    for (const value of Array.isArray(values) ? values : []) mergeRecord(objectives, value);
    return objectives;
}

// Incoming objectives are deltas: omission never removes an existing requirement.
export function mergeQuestObjectives(previous, incoming) {
    const objectives = normalizeQuestObjectives(previous);
    for (const value of Array.isArray(incoming) ? incoming : []) mergeRecord(objectives, value);
    return objectives;
}

export function questObjectiveProgress(quest) {
    const objectives = normalizeQuestObjectives(quest?.objectives);
    if (!objectives.length) {
        const legacy = Number(quest?.progress);
        return Number.isFinite(legacy) ? Math.max(0, Math.min(100, legacy)) : 0;
    }
    const required = objectives.filter(objective => !objective.optional);
    if (!required.length) return 100;
    return Math.round(required.filter(objective => objective.status === 'Completed').length / required.length * 100);
}

export function questObjectivesReady(quest) {
    const objectives = normalizeQuestObjectives(quest?.objectives);
    return objectives.length > 0 && objectives.filter(objective => !objective.optional).every(objective => objective.status === 'Completed');
}

export function upsertQuestObjective(quest, value) {
    if (!record(quest)) return null;
    const objectives = normalizeQuestObjectives(quest.objectives);
    if (!mergeRecord(objectives, value)) return null;
    const updated = {...quest, objectives};
    updated.progress = questObjectiveProgress(updated);
    // Completion and payment require an independent, confirmed quest operation.
    return updated;
}
