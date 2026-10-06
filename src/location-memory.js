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
        estimated: value.estimated === true,
        bidirectional: value.bidirectional === true,
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

function mergeConnections(previous,incoming) {
    const result=previous.map(route=>({...route}));
    for(const route of incoming){
        const old=result.find(value=>key(value.toId||value.to)===key(route.toId||route.to)&&key(value.direction)===key(route.direction));
        if(!old){result.push(route);continue;}
        const hadDistance=Boolean(old.distance);
        if(!hadDistance && route.distance){old.distance=route.distance;old.estimated=route.estimated;}
        for(const field of ['to','toId','route','evidence'])old[field] ||= route[field];
        if(!hadDistance)old.bidirectional ||= route.bidirectional;
    }
    return result.slice(-40);
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
            existing.connections = mergeConnections(existing.connections,entry.connections);
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
    // Recorded enclosing names become real ledger nodes, not an unlinked
    // display breadcrumb. Ancestors do not count as visits to those places.
    let ancestor = null;
    for (const [parentName,kind] of [[next.continent,'Realm'],[next.region,'Region']]) {
        if (!parentName || key(parentName) === key(next.name)) continue;
        let parent = entries.find(entry => key(entry.name) === key(parentName));
        if (!parent) {
            parent = normalizeLocationMemory([{name:parentName,kind,evidence:next.evidence}])[0];entries.push(parent);
        }
        if (ancestor && ancestor.id!==parent.id && !parent.parentId) {parent.parentId=ancestor.id;parent.parentName=ancestor.name;}
        ancestor = parent;
    }
    const explicitParent = text(snapshot.parentName || next.parentName, '', 140);
    if (explicitParent) ancestor = entries.find(entry => key(entry.name) === key(explicitParent)) || ancestor;
    if (ancestor && ancestor.id!==next.id && !next.parentId) {next.parentId=ancestor.id;next.parentName=ancestor.name;}
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
            normalized.visits = Math.max(0, normalized.visits);
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
            connections: correction && normalized.connections.length ? normalized.connections : mergeConnections(previous.connections,normalized.connections),
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
        && entry.evidence.some(quote => quote.length >= 8 && narrative.includes(quote))).map(entry=>({...entry,
            connections:entry.connections.map(route=>({...route,estimated:route.estimated || Boolean(route.distance && !narrative.includes(route.distance))})),
        }));
}

export function locationMemoryForPrompt(source, limit = 48) {
    return normalizeLocationMemory(source).slice(-limit).map(entry => ({
        id: entry.id, name: entry.name, kind: entry.kind, parentId: entry.parentId, parentName: entry.parentName, region: entry.region, continent: entry.continent,
        detail: entry.detail, conditions: entry.conditions, visits: entry.visits,
        connections: entry.connections.slice(-12).map(({ to, toId, direction, distance, route, estimated, bidirectional }) => ({ to, toId, direction, distance, route, estimated, bidirectional })),
        landmarks: entry.landmarks.slice(-12).map(({ name, detail }) => ({ name, detail })),
    }));
}

// Exact name/id matching first; an ambiguous alias must not select geography.
function locate(entries, name) {
    const wanted = key(name);
    if (!wanted) return null;
    const exact = entries.find(entry => key(entry.id) === wanted || key(entry.name) === wanted);
    if (exact) return exact;
    const aliases = entries.filter(entry => entry.aliases.some(alias => key(alias) === wanted));
    return aliases.length === 1 ? aliases[0] : null;
}

export function findLocation(source,name) {return locate(normalizeLocationMemory(source),name);}

export function locationPath(source, name) {
    return pathFor(normalizeLocationMemory(source),name);
}
function pathFor(entries,name) {
    const path = [], seen = new Set();
    let current = locate(entries, name);
    while (current && path.length < 24 && !seen.has(current.id)) {
        seen.add(current.id);path.unshift(current.name);
        const parent = locate(entries, current.parentId || current.parentName);
        if (!parent && current.parentName && !path.some(n => key(n) === key(current.parentName))) path.unshift(current.parentName);
        current = parent;
    }
    const leaf = locate(entries, name);
    if (leaf?.region && !path.some(n=>key(n)===key(leaf.region))) {
        const continentIndex=path.findIndex(n=>key(n)===key(leaf.continent));
        if(continentIndex>=0)path.splice(continentIndex+1,0,leaf.region);else path.unshift(leaf.region);
    }
    if (leaf?.continent && !path.some(n=>key(n)===key(leaf.continent))) path.unshift(leaf.continent);
    return path.length ? path : text(name) ? [text(name)] : [];
}

export function recoverLocationGeography(location = {}, source = []) {
    const result = {...location}, entries = normalizeLocationMemory(source), current = locate(entries, location.place);
    const absent = value => !text(value) || /^(?:unknown|n\/a|none|ไม่ทราบ|ไม่ระบุ|—|-|\?)$/iu.test(text(value));
    if (absent(result.region)) result.region = current?.region || '';
    if (absent(result.continent)) result.continent = current?.continent || '';
    let parent = current;const seen = new Set();
    while (parent && !seen.has(parent.id)) {
        seen.add(parent.id);
        if (absent(result.region) && parent.kind === 'Region') result.region = parent.name;
        if (absent(result.continent) && parent.kind === 'Realm') result.continent = parent.name;
        parent = locate(entries, parent.parentId || parent.parentName);
    }
    // A clearly labeled district in the actual place name is existing data.
    if (absent(result.region)) {
        const district = text(location.place).match(/[\[(]([^\])]*(?:district|quarter|province|region)[^\])]*)[\])]|[\[(]((?:เขต|ย่าน|ภูมิภาค|จังหวัด)[^\])]+)[\])]/iu);
        result.region = district?.[1]?.trim() || district?.[2]?.trim() || '';
    }
    return result;
}

// Distance is a route fact, never a consequence of nesting or journey percent.
export function locationDistance(source, from, to) {
    return locationGraph(source).distance(from,to);
}
function directDistance(origin,destination) {
    if (origin.id === destination.id) return {current:true, distance:'', estimated:false};
    const matches = (route, entry) => route.toId ? route.toId === entry.id : key(route.to) === key(entry.name);
    const direct = origin.connections.find(route => matches(route, destination) && route.distance);
    if (direct) return {...direct, current:false};
    const reverse = destination.connections.find(route => route.bidirectional && matches(route, origin) && route.distance);
    return reverse ? {...reverse, direction:'', current:false} : null;
}

export function locationGraph(source) {
    const entries=normalizeLocationMemory(source);
    const byId=new Map(entries.map(e=>[key(e.id),e])),byName=new Map(),aliases=new Map();
    for(const entry of entries){
        if(!byName.has(key(entry.name)))byName.set(key(entry.name),entry);
        for(const alias of entry.aliases){const name=key(alias);aliases.set(name,aliases.has(name)?null:entry);}
    }
    const lookup=name=>byId.get(key(name))||byName.get(key(name))||aliases.get(key(name))||null;
    const cache=new Map();
    const metric=value=>{
        const match=text(value).match(/^(\d+(?:\.\d+)?)\s*(km|m|kilomet(?:er|re)s?|met(?:er|re)s?|กิโลเมตร|เมตร)$/iu);
        if(!match)return null;
        const amount=Number(match[1])*(/^(?:km|kilo|กิโล)/iu.test(match[2])?1000:1);
        return Number.isFinite(amount)&&amount<=1e12?amount:null;
    };
    function distances(origin) {
        if(cache.has(origin.id))return cache.get(origin.id);
        const edges=new Map(entries.map(e=>[e.id,[]]));
        for(const entry of entries)for(const route of entry.connections){
            const target=lookup(route.toId||route.to),meters=metric(route.distance);
            if(!target||meters===null||/^from origin$/iu.test(route.direction))continue;
            edges.get(entry.id).push({id:target.id,meters,estimated:route.estimated});
            if(route.bidirectional)edges.get(target.id).push({id:entry.id,meters,estimated:route.estimated});
        }
        const result=new Map([[origin.id,{meters:0,estimated:false,hops:0}]]),done=new Set();
        while(done.size<entries.length){
            const next=[...result.entries()].filter(([id])=>!done.has(id)).sort((a,b)=>a[1].meters-b[1].meters)[0];
            if(!next)break;const [id,info]=next;done.add(id);
            for(const edge of edges.get(id)||[]){const meters=info.meters+edge.meters;if(done.has(edge.id)||result.has(edge.id)&&result.get(edge.id).meters<=meters)continue;result.set(edge.id,{meters,estimated:info.estimated||edge.estimated,hops:info.hops+1});}
        }
        cache.set(origin.id,result);return result;
    }
    return {entries,find:lookup,path:name=>pathFor(entries,name),distance:(from,to)=>{
        const origin=lookup(from),target=lookup(to);if(!origin||!target)return null;
        const direct=directDistance(origin,target);if(direct)return direct;
        const route=distances(origin).get(target.id);if(!route||route.hops<2)return null;
        const distance=route.meters>=1000?`${Number((route.meters/1000).toFixed(3))} km`:`${Number(route.meters.toFixed(2))} m`;
        return {current:false,distance,estimated:route.estimated,calculated:true,hops:route.hops};
    }};
}
