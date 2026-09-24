import { parseStory } from './npc-core.js?v=0.41.1';
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
    const id = String(value?.npcId || ''), name = String(value?.npcName || value?.npcId || '');
    const npc = (npcs || []).find(entry => entry.id === id || (name && [entry.name,...(entry.aliases || [])].some(alias => alias.toLocaleLowerCase() === name.toLocaleLowerCase())));
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

// Conservative local fallback: direct speech to the player, with an explicit
// named group. Questions/plans about somebody else never create invitations.
export function spokenGroupInvitations(story) {
    return (parseStory(story) || []).filter(block => block.type === 'dialogue' && block.name).flatMap(block => {
        if (/\b(?:if|might|would have|not|never|don't|declin|reject)\b|ถ้า|หาก|ไม่|ปฏิเสธ/.test(block.text.toLowerCase())) return [];
        const invitation = /(?:I invite you to join|join (?:us in|my|our))\s+(?:the\s+)?(party|guild)\s+["“']([^"”'\n]+)["”']|(?:ขอเชิญ|ชวน|เชิญ)(?:คุณ|เจ้า|เธอ|นาย|ท่าน)(?:มา|ให้)?(?:เข้า|ร่วม|เข้าร่วม)(?:กับ)?(?:ปาร์ตี้|กิลด์)/i;
        const english = block.text.match(invitation);
        if (!english) return [];
        let kind = english[1]?.toLowerCase(), name = english[2];
        if (!name) {
            const thai = block.text.match(/(ปาร์ตี้|กิลด์)\s*["“']([^"”'\n]+)["”']/);
            if (!thai) return [];
            kind = thai[1] === 'กิลด์' ? 'guild' : 'party'; name = thai[2];
        }
        return [['offer',kind === 'guild' ? 'guildInvitation' : 'partyInvitation',{npcName:block.name,name,role:'Member'}]];
    });
}

// An invitation is a request, never a state change. A roster count is a fact
// distinct from the people whose names the story has actually revealed.
export function groupOffers(ops, npcs, story, participants, social = {}) {
    const seen = new Set();
    return [...(ops || []),...spokenGroupInvitations(story)].flatMap(operation => {
        if (!Array.isArray(operation) || operation[0] !== 'offer'
            || !['partyInvitation', 'guildInvitation'].includes(operation[1])) return [];
        const value = operation[2], kind = operation[1] === 'partyInvitation' ? 'party' : 'guild';
        const inviter = eligibleNpc(npcs, value, story, participants);
        const name = typeof value?.name === 'string' ? value.name.trim().slice(0, 140) : '';
        const offeredRole = typeof value?.role === 'string' ? value.role.trim().slice(0,80) : '';
        const role = !offeredRole || /^(?:leader|guildmaster|guild master|หัวหน้า|หัวหน้าปาร์ตี้|หัวหน้ากิลด์)$/i.test(offeredRole) ? 'Member' : offeredRole;
        if (!inviter || !name || !role || (kind === 'party' && social.party)
            || (kind === 'guild' && (social.guilds || []).some(g => g.name.toLocaleLowerCase() === name.toLocaleLowerCase()))) return [];
        const key = `${kind}:${name.toLocaleLowerCase()}`;
        if (seen.has(key)) return [];
        seen.add(key);
        const people = Array.isArray(value.members) ? value.members : [];
        const members = [...new Map(people.map(person => {
            const personName = typeof person === 'string' ? person : person?.name;
            const label = typeof personName === 'string' ? personName.trim().slice(0, 140) : '';
            return [label.toLocaleLowerCase(),label && mentioned(story,label) ? {name:label,role:typeof person?.role === 'string' ? person.role.trim().slice(0, 80) : ''} : null];
        }).filter(([, person]) => person)).values()].slice(0, 30);
        if (!members.some(person => person.name.toLocaleLowerCase() === inviter.name.toLocaleLowerCase()))
            members.unshift({name:inviter.name,role:typeof value.inviterRole === 'string' ? value.inviterRole.trim().slice(0, 80) : ''});
        const candidateLeader = typeof value.leaderName === 'string' ? value.leaderName.trim().slice(0,140) : '';
        const leaderName = mentioned(story,candidateLeader) ? candidateLeader : '';
        if (leaderName && !members.some(person => person.name.toLocaleLowerCase() === leaderName.toLocaleLowerCase()))
            members.push({name:leaderName,role:'Leader'});
        const statedCount = Number.isSafeInteger(value.memberCount);
        const count = statedCount && value.memberCount >= members.length && value.memberCount > 0
            ? Math.min(value.memberCount, 1000000) : null;
        return [{kind,key,name,role,inviterId:inviter.id,inviterName:inviter.name,
            leaderName,
            description:typeof value.description === 'string' ? value.description.trim().slice(0,300) : '',
            memberCount:count,members,status:'pending'}];
    }).slice(0, 2);
}

export function allowedDiaryOps(ops, npcs, story, participants, frequency, turn, requested = false) {
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
        if (!requested && Number.isInteger(latest?.sourceTurn) && turn - latest.sourceTurn < gap) return [];
        seen.add(npc.id);
        return [['append', 'npcDiary', { ...value, npcId: npc.id, text: thought, sourceTurn: turn }]];
    });
}
