// Chat-scoped reminders use narrative days and clock time, never a real calendar.
const MAX_ENTRIES = 200;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = (value, limit = 180) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const key = value => text(value, 2000).normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ');
const day = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '')
    && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 999999 ? Number(value) : null;
const time = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(value, 20)) ? text(value, 20) : '';
const messageId = value => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value
    : typeof value === 'string' ? text(value, 100) || null : null;
const kind = value => key(value) === 'deadline' ? 'Deadline' : 'Appointment';
const statuses = Object.freeze({scheduled:'Scheduled',completed:'Completed',cancelled:'Cancelled',canceled:'Cancelled'});
const status = value => Object.hasOwn(statuses, key(value)) ? statuses[key(value)] : 'Scheduled';
const validKind = value => ['appointment','deadline'].includes(key(value));
const validStatus = value => ['scheduled','completed','cancelled','canceled'].includes(key(value));
const cleared = value => value === null || typeof value === 'string' && value.trim() === '';
const names = values => [...new Map((Array.isArray(values) ? values : []).map(value => text(value, 90))
    .filter(Boolean).map(value => [key(value), value])).values()].slice(0, 16);

function identity(value) {
    const schedule = `${value.dueDay ?? '?'}/${value.dueTime}/${value.dueDay !== null && value.dueTime ? '' : key(value.whenText)}`;
    return `${key(value.title)}|${value.kind}|${schedule}`;
}

function stableId(value) {
    let hash = 2166136261;
    for (const character of identity(value)) {
        hash ^= character.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return `agenda-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function record(value) {
    const input = object(value), title = text(input.title).replace(/\s+/gu, ' ');
    if (!title) return null;
    const result = {
        id: text(input.id, 100), title, detail: text(input.detail, 700), kind: kind(input.kind), status: status(input.status),
        dueDay: day(input.dueDay), dueTime: time(input.dueTime), whenText: text(input.whenText), people: names(input.people),
        location: text(input.location), questId: text(input.questId, 100), resolution: text(input.resolution, 500),
        evidence: text(input.evidence, 700), sourceDay: day(input.sourceDay), sourceMessageId: messageId(input.sourceMessageId),
        source: text(input.source, 40), createdAt: text(input.createdAt, 80), updatedAt: text(input.updatedAt, 80),
    };
    result.id ||= stableId(result);
    return result;
}

// Keep explicit IDs stable when a reminder is postponed or renamed. Title and
// schedule also identify repeats when an AI sends a fresh ID for the same event.
function mergeEntry(values, value, metadata = {}) {
    const input = object(value), explicitId = text(input.id, 100);
    let index = explicitId ? values.findIndex(entry => entry.id === explicitId) : -1;
    const proposed = record(input);
    if (index < 0 && proposed) index = values.findIndex(entry => identity(entry) === identity(proposed));
    const previous = index >= 0 ? values[index] : null;
    const changes = {...input};
    if (previous) {
        for (const field of ['id','title','detail','whenText','location','questId','resolution','evidence','source','createdAt','updatedAt']) {
            if (Object.hasOwn(changes, field) && typeof changes[field] !== 'string') delete changes[field];
        }
        if (Object.hasOwn(changes, 'people') && (!Array.isArray(changes.people)
            || changes.people.some(person => typeof person !== 'string' || !person.trim()))) delete changes.people;
        if (Object.hasOwn(changes, 'kind') && !validKind(changes.kind)) delete changes.kind;
        if (Object.hasOwn(changes, 'status') && !validStatus(changes.status)) delete changes.status;
        if (Object.hasOwn(changes, 'dueDay') && !cleared(changes.dueDay) && day(changes.dueDay) === null) delete changes.dueDay;
        if (Object.hasOwn(changes, 'dueTime') && !cleared(changes.dueTime) && !time(changes.dueTime)) delete changes.dueTime;
    }
    const next = record({...previous, ...changes,
        ...(previous ? {id: previous.id} : {}),
        ...(!Object.hasOwn(input, 'sourceDay') && Object.hasOwn(metadata, 'sourceDay') ? {sourceDay: metadata.sourceDay} : {}),
        ...(!Object.hasOwn(input, 'sourceMessageId') && Object.hasOwn(metadata, 'sourceMessageId') ? {sourceMessageId: metadata.sourceMessageId} : {}),
        ...(!Object.hasOwn(input, 'source') && metadata.source ? {source: metadata.source} : {}),
    });
    if (!next) return values;
    if (previous) {
        const semantic = entry => Object.fromEntries(Object.entries(entry).filter(([field]) =>
            !['sourceDay','sourceMessageId','source','createdAt','updatedAt'].includes(field)));
        if (JSON.stringify(semantic(previous)) === JSON.stringify(semantic(next))) return values;
        next.createdAt = previous.createdAt || next.createdAt;
    }
    if (index >= 0) values[index] = next;
    else values.push(next);
    return values.filter(entry => entry === next || identity(entry) !== identity(next));
}

export function normalizeStoryAgenda(values) {
    const result = [];
    if (!Array.isArray(values)) return result;
    // A malformed imported payload must not turn normalization into an unbounded scan.
    for (const value of values.slice(0, 2000)) {
        const merged = mergeEntry(result, value);
        result.splice(0, result.length, ...merged.slice(-MAX_ENTRIES));
    }
    return result;
}

export function upsertStoryAgenda(values, value, metadata = {}) {
    return mergeEntry(normalizeStoryAgenda(values), value, object(metadata)).slice(-MAX_ENTRIES);
}

export function storyAgendaState(entry, clock) {
    const current = object(entry), closed = status(current.status);
    if (closed !== 'Scheduled') return closed;
    const dueDay = day(current.dueDay), currentDay = day(object(clock).day);
    if (dueDay === null || currentDay === null) return 'Unscheduled';
    if (currentDay < dueDay) return 'Upcoming';
    if (currentDay > dueDay) return 'Overdue';
    const dueTime = time(current.dueTime);
    if (!dueTime) return 'Today';
    const currentTime = time(object(clock).time);
    if (!currentTime) return 'Today';
    if (currentTime < dueTime) return 'Upcoming';
    return currentTime === dueTime ? 'Due' : 'Overdue';
}

const priority = {Overdue:0, Due:1, Today:2, Upcoming:3, Unscheduled:4};
function activeEntries(values, clock) {
    return normalizeStoryAgenda(values).map(entry => ({...entry, state: storyAgendaState(entry, clock)}))
        .filter(entry => entry.status === 'Scheduled').sort((a, b) => priority[a.state] - priority[b.state]
            || (a.dueDay ?? Infinity) - (b.dueDay ?? Infinity)
            || (a.dueTime || '24:00').localeCompare(b.dueTime || '24:00') || a.title.localeCompare(b.title));
}

export function storyAgendaSummary(values, clock) {
    const normalized = normalizeStoryAgenda(values), counts = {upcoming:0, today:0, due:0, overdue:0, unscheduled:0, completed:0, cancelled:0};
    for (const entry of normalized) counts[storyAgendaState(entry, clock).toLowerCase()]++;
    const entries = activeEntries(normalized, clock).slice(0, 12);
    return {total: normalized.length, active: normalized.filter(entry => entry.status === 'Scheduled').length,
        ...counts, entries, next: entries[0] || null};
}

export function storyAgendaPrompt(values, clock) {
    const active = activeEntries(values, clock);
    if (!active.length) return '';
    const vague = active.filter(entry => entry.state === 'Unscheduled' && entry.whenText).slice(0, 2);
    const chosen = active.filter(entry => !vague.includes(entry)).slice(0, 12 - vague.length).concat(vague);
    const lines = [
        'STORY AGENDA: Reminders below use only the current narrative day/time. Relative or vague whenText is unresolved; do not guess a real date, time zone, midnight, or an unstated day.',
        'Due/overdue is a reminder, not proof of failure. Mark Completed/Cancelled only when the story confirms it; never fail quests, spend money, or reactivate closed reminders from clock changes.',
    ];
    const promptLine = entry => JSON.stringify({id:entry.id, title:entry.title.slice(0, 160), kind:entry.kind, state:entry.state,
        dueDay:entry.dueDay, dueTime:entry.dueTime, whenText:entry.whenText.slice(0, 140), people:entry.people.slice(0, 4).map(name => name.slice(0, 60)),
        location:entry.location.slice(0, 120), questId:entry.questId, detail:entry.detail.slice(0, 180), evidence:entry.evidence.slice(0, 140)});
    // Reserve space for unresolved wording; long overdue lists must not erase it.
    const vagueLines = vague.map(promptLine);
    const reserved = vagueLines.reduce((size, line) => size + line.length + 1, 0);
    for (const entry of chosen.filter(entry => !vague.includes(entry))) {
        const line = promptLine(entry);
        if (lines.join('\n').length + line.length + 1 + reserved > 6000) continue;
        lines.push(line);
    }
    lines.push(...vagueLines);
    return lines.join('\n');
}
