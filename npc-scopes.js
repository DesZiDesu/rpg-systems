import { keyName, resolveNpc } from './npc-core.js?v=0.40.2';

const clone = value => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const RESERVED = new Set(['id', 'npcScope', 'npcOwner', '__proto__', 'constructor', 'prototype']);

// Never identify a card by its display name or by a mutable array index.
export function characterOwner(context) {
    const group = context.groupId ?? context.selectedGroup ?? context.group?.id;
    if (group !== null && group !== undefined && group !== '') return null;
    const index = context.characterId ?? context.chid;
    const card = context.characters?.[index] || context.character;
    const file = typeof card?.avatar === 'string' ? card.avatar : card?.filename;
    if (!file || file === 'none') return null;
    return { key: `card:${file}`, label: card.name || context.name2 || file };
}

export function scopeEnvelope(value) {
    if (!value || typeof value !== 'object' || typeof value.owner !== 'string') return {};
    const record = { owner: value.owner.slice(0, 500), overrides: {}, bases: {}, hidden: [] };
    for (const field of ['overrides', 'bases']) {
        if (!value[field] || typeof value[field] !== 'object') continue;
        for (const [id, data] of Object.entries(value[field]).slice(0, 200)) {
            if (RESERVED.has(id) || !data || typeof data !== 'object' || Array.isArray(data)) continue;
            Object.defineProperty(record[field], id, { value: Object.fromEntries(Object.entries(data).filter(([key]) => !RESERVED.has(key)).map(([key, item]) => [key, clone(item)])), enumerable: true, writable: true });
        }
    }
    record.hidden = (Array.isArray(value.hidden) ? value.hidden : []).filter(id => typeof id === 'string' && !RESERVED.has(id)).slice(0, 200);
    record.sharedIds = (Array.isArray(value.sharedIds) ? value.sharedIds : Object.keys(record.bases)).filter(id => typeof id === 'string' && !RESERVED.has(id)).slice(0, 200);
    return record;
}

export function hydrateScopedNpcs(state, library, owner) {
    const scope = scopeEnvelope(state.npcScopes);
    const retired = scope.owner === owner ? (scope.sharedIds || []).filter(id => !library.some(p => p.id === id)) : [];
    const result = pruneNpcReferences(state, retired);
    const local = (state.npcs || []).filter(p => p.npcScope !== 'character').map(p => ({ ...clone(p), npcScope: 'chat', npcOwner: '' }));
    const names = new Set(local.map(p => keyName(p.name))), ids = new Set(local.map(p => p.id));
    const active = owner && scope.owner === owner ? scope : { overrides: {}, hidden: [] };
    const bases = {};
    const shared = [];
    for (const p of library) {
        bases[p.id] = clone(p);
        if (!owner || active.hidden.includes(p.id) || names.has(keyName(p.name)) || ids.has(p.id)) continue;
        const delta = active.overrides[p.id] || {};
        const next = { ...clone(p), ...clone(delta), id: p.id, npcScope: 'character', npcOwner: owner };
        if (delta.stats) next.stats = { ...p.stats, ...delta.stats };
        if (delta.hStats) next.hStats = { ...p.hStats, ...delta.hStats };
        if (names.has(keyName(next.name))) continue;
        shared.push(next); names.add(keyName(next.name)); ids.add(p.id);
    }
    result.npcs = [...local, ...shared];
    const previouslyShared = new Set([...(scope.sharedIds || []), ...library.map(p => p.id)]);
    const visibleIds = new Set(result.npcs.map(p => p.id));
    if (Array.isArray(result.contacts)) result.contacts = result.contacts.filter(p => !previouslyShared.has(p.npcId) || visibleIds.has(p.npcId) || local.some(n => keyName(n.name) === keyName(p.name)));
    result.npcScopes = { owner: owner || '', overrides: active.overrides, hidden: active.hidden, bases };
    return result;
}

// Metadata contains local NPCs and per-chat deltas only, never the shared archive.
// Bases travel with in-memory turn checkpoints to avoid rolling back a later
// explicit Character edit when a user swipes an older AI reply.
export function packScopedNpcs(state, library, owner) {
    const result = clone(state), envelope = scopeEnvelope(state.npcScopes);
    result.npcs = (state.npcs || []).filter(p => p.npcScope !== 'character').map(p => ({ ...clone(p), npcScope: 'chat', npcOwner: '' }));
    const localNames = new Set(result.npcs.map(p => keyName(p.name)));
    const scoped = envelope.owner === owner ? envelope : { overrides: {}, bases: {}, hidden: [] };
    const overrides = {}, hidden = [];
    for (const original of library) {
        const p = state.npcs.find(n => n.id === original.id && n.npcScope === 'character' && n.npcOwner === owner);
        if (!p) {
            if (localNames.has(keyName(original.name)) || localNames.has(keyName(scoped.bases[original.id]?.name))) {
                if (scoped.overrides[original.id]) overrides[original.id] = clone(scoped.overrides[original.id]);
                if (scoped.hidden.includes(original.id)) hidden.push(original.id);
            } else if (Object.hasOwn(scoped.bases, original.id) || scoped.hidden.includes(original.id)) hidden.push(original.id);
            continue;
        }
        const baseline = scoped.bases[original.id] || original, delta = {};
        for (const [key, value] of Object.entries(p)) {
            if (RESERVED.has(key) || same(value, baseline[key])) continue;
            if (key === 'stats' || key === 'hStats') {
                const fields = Object.fromEntries(Object.entries(value).filter(([field, n]) => !same(n, baseline[key]?.[field])));
                if (Object.keys(fields).length) delta[key] = fields;
            } else delta[key] = clone(value);
        }
        if (Object.keys(delta).length) overrides[p.id] = delta;
    }
    result.npcScopes = { owner: owner || '', overrides, hidden, sharedIds: library.map(p => p.id) };
    return result;
}

export function withoutChatNpcContinuity(state) {
    const result = clone(state);
    const localIds = new Set((state.npcs || []).filter(p => p.npcScope !== 'character').map(p => p.id));
    result.npcs = []; result.npcScopes = {};
    // Do not revive local NPCs indirectly through social/contact normalization.
    result.contacts = (result.contacts || []).filter(p => !localIds.has(p.npcId));
    for (const field of ['partyMembers', 'guildMembers', 'householdMembers']) if (Array.isArray(result[field])) result[field] = result[field].filter(p => !localIds.has(p.npcId));
    for (const field of ['party', 'guild', 'household']) {
        if (Array.isArray(result[field]?.members)) result[field].members = result[field].members.filter(p => !localIds.has(typeof p === 'string' ? p : p.npcId));
    }
    const social = result.social;
    if (social?.party) social.party.memberIds = (social.party.memberIds || []).filter(id => !localIds.has(id));
    for (const guild of social?.guilds || []) guild.memberIds = (guild.memberIds || []).filter(id => !localIds.has(id));
    if (social?.household) social.household.members = (social.household.members || []).filter(p => !localIds.has(p.npcId));
    return result;
}

export function scopedPortraitKey(profile, chatId, owner = '') {
    return profile.npcScope === 'character'
        ? `tretaresia-rpg:npc-portrait:character:${encodeURIComponent(owner || profile.npcOwner)}:${profile.id}`
        : `tretaresia-rpg:npc-portrait:${chatId || 'no-chat'}:${profile.id}`;
}

// The user, never an AI patch, chooses where NEW story NPCs are archived.
// Existing shared records keep per-chat deltas instead of rewriting their base.
export function routeNewStoryNpcs(state, previous, library, owner, destination) {
 const next=clone(state),archive=clone(library);let added=0,overflow=0;
 if(destination!=='character'||!owner)return {state:next,library:archive,added,overflow};
 const ids=new Set(previous.npcs.map(p=>p.id)),names=new Set(previous.npcs.flatMap(p=>[p.name,...(p.aliases||[])]).map(keyName));
 for(const p of next.npcs){
  if(ids.has(p.id)||names.has(keyName(p.name))||resolveNpc(previous.npcs,p)||p.npcScope==='character')continue;
  if(resolveNpc(archive,p))continue;
  if(archive.length>=200){overflow++;continue;}
  p.npcScope='character';p.npcOwner=owner;archive.push(clone(p));added++;
 }
 return {state:next,library:archive,added,overflow};
}

// Remove links to deleted dossiers without deleting correspondence/history or
// portraits, which may still be used by a copy in the other scope.
export function pruneNpcReferences(state, removedIds) {
 const removed=new Set(removedIds), next=clone(state);
 for(const contact of next.contacts||[])if(removed.has(contact.npcId))contact.npcId='';
 const cleanGroup=group=>{
  if(!group)return;
  if(Array.isArray(group.memberIds))group.memberIds=group.memberIds.filter(id=>!removed.has(id));
  if(removed.has(group.leaderId))group.leaderId='player';
  if(group.roles)for(const id of removed)delete group.roles[id];
 };
 cleanGroup(next.social?.party);for(const guild of next.social?.guilds||[])cleanGroup(guild);
 if(next.social?.household)next.social.household.members=(next.social.household.members||[]).filter(p=>!removed.has(p.npcId));
 return next;
}

export function retainNpcDeletions(history, removedIds) {
    const removed = new Set(removedIds);
    for (const entry of history?.entries || []) {
        for (const snapshot of [entry.baseState, ...Object.values(entry.variants || {}).map(v => v.state)]) {
            if (!snapshot || !Array.isArray(snapshot.npcs)) continue;
            Object.assign(snapshot, pruneNpcReferences(snapshot, removedIds));
            snapshot.npcs = snapshot.npcs.filter(p => !removed.has(p.id));
        }
    }
}
