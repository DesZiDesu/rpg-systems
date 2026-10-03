// Canonical, evidence-backed location memory.  This is deliberately separate
// from the per-reply Scene Tracker: a scene is a snapshot, while this ledger
// keeps a stable place name and its known relationships across revisits.

const text = (value, fallback = '', max = 240) => typeof value === 'string'
    ? value.trim().slice(0, max) : fallback;
const key = value => text(value, '', 240).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
const idFor = (kind, name) => `location-${kind.toLocaleLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/gu, '') || 'place'}-${hash(key(name))}`;
function hash(value) {
    let result = 2166136261;
    for (const character of String(value || '')) {
        result ^= character.charCodeAt(0);
        result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
}
const iso = value => text(value, new Date().toISOString(), 60);

function connection(value) {
    if (!value || typeof value !== 'object') return null;
    const toId = text(value.toId || value.destinationId, '', 100);
    const to = text(value.to || value.name || value.destination, '', 180);
    if (!to && !toId) return null;
    return {
        id: text(value.id, `route-${hash(`${key(toId || to)}|${key(value.route)}|${key(value.direction)}`)}`, 100),
        toId,
        to,
        direction: text(value.direction, '', 40),
        distance: text(value.distance, '', 120),
        route: text(value.route, '', 80),
        evidence: text(value.evidence, '', 300),
        updatedAt: iso(value.updatedAt),
    };
}

function landmark(value) {
    if (!value || typeof value !== 'object') return null;
    const name = text(value.name, '', 160);
    if (!name) return null;
    return {
        id: text(value.id, `landmark-${hash(key(name))}`, 100),
        name,
        detail: text(value.detail || value.description, '', 300),
        updatedAt: iso(value.updatedAt),
    };
}

export function normalizeLocationMemory(source, fallback = []) {
    const values = Array.isArray(source) ? source : Array.isArray(source?.entries) ? source.entries : fallback;
    const byKey = new Map();
    for (const value of values || []) {
        if (!value || typeof value !== 'object') continue;
        const name = text(value.name || value.place || value.location, '', 180);
        if (!name) continue;
        const kindNames = ['Realm', 'Region', 'Place', 'Landmark', 'Route'];
        const kind = kindNames.find(name => name.toLocaleLowerCase() === text(value.kind).toLocaleLowerCase()) || 'Place';
        const entry = {
            id: text(value.id, idFor(kind, name), 100), name, kind,
            parentId: text(value.parentId, '', 100),
            parentName: text(value.parentName || value.parent, '', 140),
            region: text(value.region, '', 140), continent: text(value.continent, '', 120),
            detail: text(value.detail || value.description, '', 600),
            conditions: text(value.conditions || value.atmosphere, '', 260),
            aliases: [...new Set((Array.isArray(value.aliases) ? value.aliases : []).map(alias => text(alias, '', 100)).filter(Boolean))].slice(0, 12),
            landmarks: (Array.isArray(value.landmarks) ? value.landmarks : []).map(landmark).filter(Boolean).slice(0, 40),
            connections: (Array.isArray(value.connections) ? value.connections : []).map(connection).filter(Boolean).slice(0, 40),
            visits: Math.max(0, Math.min(999999, Number(value.visits) || 0)),
            firstVisitedAt: text(value.firstVisitedAt, '', 60),
            lastVisitedAt: text(value.lastVisitedAt, '', 60),
            lastDay: text(value.lastDay, '', 80),
            evidence: [...new Set((Array.isArray(value.evidence) ? value.evidence : value.evidence ? [value.evidence] : []).map(item => text(item, '', 300)).filter(Boolean))].slice(-8),
            correction: Boolean(value.correction || value.corrects || value.replace),
        };
        const existing = byKey.get(key(name));
        if (existing) {
            // Keep the stable id and merge sparse historical records.
            existing.detail ||= entry.detail;
            existing.conditions ||= entry.conditions;
            existing.region ||= entry.region;
            existing.continent ||= entry.continent;
            existing.parentId ||= entry.parentId;
            existing.parentName ||= entry.parentName;
            existing.aliases = [...new Set([...existing.aliases, ...entry.aliases])].slice(0, 12);
            existing.landmarks = [...existing.landmarks, ...entry.landmarks].filter((item, index, all) => all.findIndex(other => key(other.name) === key(item.name)) === index).slice(0, 40);
            existing.connections = [...existing.connections, ...entry.connections].filter((item, index, all) => all.findIndex(other => key(other.toId || other.to) === key(item.toId || item.to) && key(other.direction) === key(item.direction)) === index).slice(0, 40);
            existing.evidence = [...new Set([...existing.evidence, ...entry.evidence])].slice(-8);
            existing.visits = Math.max(existing.visits, entry.visits);
            existing.firstVisitedAt ||= entry.firstVisitedAt;
            existing.lastVisitedAt ||= entry.lastVisitedAt;
            existing.lastDay ||= entry.lastDay;
        } else byKey.set(key(name), entry);
    }
    return [...byKey.values()].slice(-160);
}

// Add one confirmed visit. Calling this repeatedly for the same scene is
// idempotent; callers pass visited:false when only hydrating an old save.
export function rememberLocation(source, snapshot = {}, { at = new Date().toISOString(), day = '', evidence = '', visited = true, connection: route = null } = {}) {
    const entries = normalizeLocationMemory(source);
    const name = text(snapshot.name || snapshot.place || snapshot.location, '', 180);
    if (!name || /^(?:unknown|en route to|destination)$/i.test(name)) return entries;
    const locationKey = key(name);
    const current = entries.find(entry => key(entry.name) === locationKey);
    const now = iso(at);
    const next = current || {
        id: idFor(snapshot.kind || 'Place', name), name, kind: ['Realm', 'Region', 'Place', 'Landmark', 'Route'].find(value => value.toLocaleLowerCase() === text(snapshot.kind).toLocaleLowerCase()) || 'Place',
        parentId: '', region: '', continent: '', detail: '', conditions: '', aliases: [], landmarks: [], connections: [],
        visits: 0, firstVisitedAt: '', lastVisitedAt: '', lastDay: '', evidence: [],
    };
    next.region ||= text(snapshot.region, '', 140);
    next.continent ||= text(snapshot.continent, '', 120);
    next.detail ||= text(snapshot.detail || snapshot.description, '', 600);
    next.conditions ||= text(snapshot.conditions || snapshot.atmosphere, '', 260);
    if (evidence) next.evidence = [...new Set([...next.evidence, text(evidence, '', 300)])].slice(-8);
    if (visited) {
        next.visits += 1;
        next.firstVisitedAt ||= now;
        next.lastVisitedAt = now;
        next.lastDay = text(day, next.lastDay, 80);
    }
    if (route && typeof route === 'object') {
        const normalized = connection(route);
        if (normalized) {
            const index = next.connections.findIndex(item => key(item.toId || item.to) === key(normalized.toId || normalized.to) && key(item.direction) === key(normalized.direction));
            if (index >= 0) next.connections[index] = { ...next.connections[index], ...normalized };
            else next.connections = [...next.connections, normalized].slice(-40);
        }
    }
    if (!current) entries.push(next);
    return normalizeLocationMemory(entries);
}

// Merge explicit top-level `locations` records from a completed story patch.
// Existing facts are sticky by default; a record marked correction/replace is
// the only way for a later reply to revise canonical geography.
export function mergeLocationMemory(source, records = [], { at = new Date().toISOString() } = {}) {
    let entries = normalizeLocationMemory(source);
    const incoming = (Array.isArray(records) ? records : []).filter(value => value && typeof value === 'object');
    for (const raw of incoming) {
        const normalized = normalizeLocationMemory([raw])[0];
        if (!normalized || !normalized.evidence.length) continue;
        const parentName = normalized.parentName;
        if (parentName) {
            let parent = entries.find(entry => key(entry.name) === key(parentName));
            if (!parent) {
                parent = normalizeLocationMemory([{ name: parentName, kind: normalized.kind === 'Realm' ? 'Realm' : 'Region', evidence: normalized.evidence, firstVisitedAt: at }])[0];
                entries.push(parent);
            }
            normalized.parentId = parent.id;
        }
        const index = entries.findIndex(entry => entry.id === normalized.id || key(entry.name) === key(normalized.name));
        if (index < 0) {
            normalized.firstVisitedAt ||= at;
            normalized.lastVisitedAt ||= at;
            normalized.visits = Math.max(1, normalized.visits);
            entries.push(normalized);
            continue;
        }
        const previous = entries[index], correction = normalized.correction;
        const merged = {
            ...previous,
            ...(correction ? {
                name: normalized.name || previous.name, kind: normalized.kind || previous.kind,
                parentId: normalized.parentId || previous.parentId, parentName: normalized.parentName || previous.parentName,
                region: normalized.region || previous.region, continent: normalized.continent || previous.continent,
                detail: normalized.detail || previous.detail, conditions: normalized.conditions || previous.conditions,
            } : {
                region: previous.region || normalized.region, continent: previous.continent || normalized.continent,
                detail: previous.detail || normalized.detail, conditions: previous.conditions || normalized.conditions,
                parentId: previous.parentId || normalized.parentId, parentName: previous.parentName || normalized.parentName,
            }),
            aliases: [...new Set([...previous.aliases, ...normalized.aliases])].slice(0, 12),
            landmarks: correction && normalized.landmarks.length ? normalized.landmarks : [...previous.landmarks, ...normalized.landmarks].filter((item, idx, all) => all.findIndex(other => key(other.name) === key(item.name)) === idx).slice(-40),
            connections: correction && normalized.connections.length ? normalized.connections : [...previous.connections, ...normalized.connections].filter((item, idx, all) => all.findIndex(other => key(other.toId || other.to) === key(item.toId || item.to) && key(other.direction) === key(item.direction)) === idx).slice(-40),
            evidence: [...new Set([...previous.evidence, ...normalized.evidence])].slice(-8),
            visits: Math.max(previous.visits, normalized.visits), firstVisitedAt: previous.firstVisitedAt || normalized.firstVisitedAt || at,
            lastVisitedAt: normalized.lastVisitedAt || previous.lastVisitedAt, lastDay: normalized.lastDay || previous.lastDay,
        };
        entries[index] = merged;
    }
    return normalizeLocationMemory(entries);
}

export function confirmedLocationMemory(raw, story = '') {
    const source = Array.isArray(raw) ? raw : [];
    const narrative = String(story || '');
    return source.map(value => normalizeLocationMemory([value])[0]).filter(entry => entry
        && entry.evidence.length
        && entry.evidence.some(quote => quote.length >= 8 && narrative.includes(quote)));
}

export function locationMemoryForPrompt(source, limit = 48) {
    return normalizeLocationMemory(source).slice(-limit).map(entry => ({
        id: entry.id, name: entry.name, kind: entry.kind, parentId: entry.parentId, parentName: entry.parentName, region: entry.region, continent: entry.continent,
        detail: entry.detail, conditions: entry.conditions, visits: entry.visits,
        connections: entry.connections.slice(-12).map(({ to, toId, direction, distance, route }) => ({ to, toId, direction, distance, route })),
        landmarks: entry.landmarks.slice(-12).map(({ name, detail }) => ({ name, detail })),
    }));
}
