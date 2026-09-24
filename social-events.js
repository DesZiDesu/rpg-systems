// Pure guards shared by the inline turn tracker and its chat presentation.
const rates = Object.freeze({ off: Infinity, rare: 12, normal: 5, often: 2 });
export const diaryRates = Object.keys(rates);

function mentioned(story, name) {
    if (typeof name !== 'string' || name.trim().length < 2) return false;
    const candidate = name.trim();
    if (/[^\x00-\x7f]/.test(candidate)) return story.toLocaleLowerCase().includes(candidate.toLocaleLowerCase());
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{M}\\p{N}])`, 'iu').test(story);
}

export function eligibleNpc(npcs, value, story, participants = []) {
    const id = String(value?.npcId || ''), name = String(value?.npcName || '');
    const npc = (npcs || []).find(entry => entry.id === id || (name && entry.name.toLocaleLowerCase() === name.toLocaleLowerCase()));
    if (!npc || npc.enabled === false || npc.met !== true || npc.isHostile) return null;
    const aliases = [npc.name, ...(npc.aliases || [])];
    const present = aliases.some(alias => participants.some(participant => String(participant).toLocaleLowerCase() === String(alias).toLocaleLowerCase()));
    return present || aliases.some(alias => mentioned(story, alias)) ? npc : null;
}

export function householdOffers(ops, npcs, story, participants, members) {
    const seen = new Set((members || []).map(entry => entry.npcId));
    return (ops || []).flatMap(operation => {
        if (!Array.isArray(operation) || !['offer', 'upsert'].includes(operation[0])
            || !['householdInvitation', 'householdMembers'].includes(operation[1])) return [];
        const value = operation[2], role = typeof value?.role === 'string' ? value.role.trim().slice(0, 80) : '';
        const npc = role && eligibleNpc(npcs, value, story, participants);
        if (!npc || seen.has(npc.id)) return [];
        seen.add(npc.id);
        return [{ npcId: npc.id, npcName: npc.name, role, status: 'pending' }];
    }).slice(0, 2);
}

export function allowedDiaryOps(ops, npcs, story, participants, frequency, turn) {
    const gap = rates[frequency] ?? rates.normal;
    if (!Number.isFinite(gap)) return [];
    const seen = new Set();
    return (ops || []).flatMap(operation => {
        if (!Array.isArray(operation) || operation[0] !== 'append' || operation[1] !== 'npcDiary') return [];
        const value = operation[2], npc = eligibleNpc(npcs, value, story, participants);
        if (!npc || seen.has(npc.id)) return [];
        const thought = typeof value.text === 'string' ? value.text.trim().replace(/^[“"]|[”"]$/g, '') : '';
        if (thought.length < 4 || thought.length > 400 || /^(?:\*|\[|\(|\{|<)/.test(thought)) return [];
        const latest = npc.diary?.at(-1);
        if (latest?.text?.trim().toLocaleLowerCase() === thought.toLocaleLowerCase()) return [];
        if (Number.isInteger(latest?.sourceTurn) && turn - latest.sourceTurn < gap) return [];
        seen.add(npc.id);
        return [['append', 'npcDiary', { ...value, npcId: npc.id, text: thought, sourceTurn: turn }]];
    });
}
