import { parseStory } from './npc-core.js?v=0.59.0';
// Pure guards shared by the inline turn tracker and its chat presentation.
const rates = Object.freeze({ off: Infinity, rare: 12, normal: 5, often: 2 });
export const diaryRates = Object.keys(rates);

// A direct group upsert must cite an actual assertion of current membership.
// Invitations, plans and hypothetical membership remain offers to the player.
export function confirmedGroupMembership(value, story, userStory = '', playerName = '') {
    if (value?.membershipStatus !== 'established' || typeof value?.membershipEvidence !== 'string') return false;
    const evidence = value.membershipEvidence.trim();
    if (evidence.length < 8 || evidence.length > 300) return false;
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    return membershipStatements(story, userStory, playerName).some(statement =>
        statement.evidence.toLocaleLowerCase().includes(evidence.toLocaleLowerCase())
        && (!name || statement.groups.some(group => group.unnamed || group.name.toLocaleLowerCase() === name.toLocaleLowerCase())));
}

const groupKind = label => /^(?:guild|กิลด์|กิล)$/iu.test(label) ? 'guild' : 'party';
const groupLabel = '(?:\\b(?:party|guild)\\b|ปาร์ตี้|ปาร์ตี|กิลด์|กิล)';
const clauseBoundary = /(?<=[.!?;。])\s*|\n+|\b(?:while|whereas)\b|(?:แต่|ขณะที่)|(?:,\s*(?:and\s+)?|\s+and\s+)(?=[A-Z][a-z]+\s+(?:is|has|was|stays|stayed|remains|remained|belongs|says)\b)/u;
const escaped = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function namedGroups(statement) {
    const groups = [], add = (label, raw) => {
        const name = raw.trim().replace(/^(?:(?:the|a|an|our|my|your|called|named)\s+|(?:ชื่อ|ที่ชื่อ)\s*)/iu, '').trim();
        if (name.length < 2 || name.length > 100 || /^(?:the|our|my|your|ของเรา|ของฉัน|ของคุณ)$/iu.test(name)
            || /^(?:is|are|led by|with|as|and|has|have|includes|already|now|still|of|from)\b|^ของ/iu.test(name)) return;
        if (!groups.some(group => group.kind === groupKind(label) && group.name.toLocaleLowerCase() === name.toLocaleLowerCase())) groups.push({kind:groupKind(label),name});
    };
    for (const match of statement.matchAll(new RegExp(`(${groupLabel})\\s*(?:ชื่อ\\s*)?["“‘']([^"”’'\\n]+)["”’']|["“‘']([^"”’'\\n]+)["”’']\\s*(${groupLabel})`, 'giu')))
        add(match[1] || match[4], match[2] || match[3]);
    // Unquoted names are bounded by the next clause. Only explicit membership
    // statements call this parser; an ordinary mention cannot register a group.
    for (const match of statement.matchAll(new RegExp(`(${groupLabel})\\s*(?:ชื่อ\\s*)?([^"“”‘’'.,!?;\\n]+)`, 'giu'))) {
        const name = match[2].split(/\s+(?:led by|with|as|and|has|have|includes|already|now|still)\b|(?:โดย|ซึ่ง|และ|มีสมาชิก|อยู่แล้ว|แล้ว|ในฐานะ|นำโดย|ที่มี)/iu)[0];
        add(match[1], name);
    }
    for (const match of statement.matchAll(/(?:\b(?:of|in|to|with)\s+(?:(?:the|our|a|an)\s+)?)?([\p{L}\p{N}][\p{L}\p{N}'’ -]{1,100}?)\s+\b(party|guild)\b/giu)) {
        const name = match[1].replace(/^.*\b(?:of|in|to|with|lead|leads|joined|left|quit)\s+(?:(?:the|our|a|an)\s+)?/iu, '')
            .split(/\b(?:and|but|while)\s+(?:the\s+)?/iu).at(-1);
        if (!/\b(?:you|are|am|is|member|leader|captain|have|has)\b/iu.test(name)) add(match[2], name);
    }
    for (const match of statement.matchAll(/\b(?:your|my)\s+(party|guild),\s*([^,]+),/giu)) add(match[1],match[2]);
    for (const match of statement.matchAll(new RegExp(groupLabel,'giu'))) {
        const kind = groupKind(match[0]);
        if (!groups.some(group => group.kind === kind)) groups.push({kind,name:kind === 'party' ? 'Party' : 'Guild',unnamed:true});
    }
    return groups;
}
function membershipStatements(story, userStory = '', playerName = '') {
    const namedPlayer = playerName.trim().length >= 2 ? `|(?<![\\p{L}\\p{M}\\p{N}])${escaped(playerName.trim())}${/^[\x00-\x7f]+$/.test(playerName) ? '(?![\\p{L}\\p{M}\\p{N}])' : ''}` : '';
    return [[story,false],[userStory,true]].flatMap(([source,user]) => {
        const blocks = parseStory(source) || [{type:'plain',text:String(source || '').replace(/<[^>]*>/g,' ')}];
        return blocks.filter(block => block.type !== 'header').flatMap(block => {
            const firstPerson = block.name ? block.name.toLocaleLowerCase() === playerName.toLocaleLowerCase() : user;
            const subject = `(?:\\b(?:you${firstPerson ? '|i|we|my character' : ''})\\b|(?:คุณ|เจ้า|ท่าน|ผู้เล่น|ตัวละคร${firstPerson ? '|ฉัน|ผม|ข้า|เรา|ดิฉัน' : ''})${namedPlayer})`;
            const assertion = new RegExp(`${subject}\\s*(?:(?:are|am|is)\\s+(?:(?:already|now|still)\\s+)?(?:(?:a|an|the)\\s+)?(?:member|part of|leader|captain|guildmaster|in)\\b|(?:have|has)\\s+(?:already\\s+)?joined\\b|(?:already\\s+)?have\\s+(?:(?:a|the)\\s+)?${groupLabel}|joined\\b|belong(?:s)?\\s+to\\b|lead(?:s)?\\b|(?:formed|founded|created)\\s+(?:(?:a|the|an)\\s+)?(?=${groupLabel}\\b)|(?:are|am|is)\\s+registered\\s+with\\b|(?:เป็น|คือ)(?:สมาชิก|หัวหน้า|ผู้นำ)|อยู่ใน|สังกัด|เข้าร่วม|มี${groupLabel}|ก่อตั้ง(?=${groupLabel})|ตั้งปาร์ตี้)|\\b(?:your${firstPerson ? '|my' : ''})\\s+${groupLabel}(?=.{0,100}\\b(?:is|already|led by)\\b)`, 'iu');
            return block.text.split(clauseBoundary).flatMap(raw => {
                const evidence = raw.trim();
                const normalized = evidence.replace(/\byou['’]re\b/giu,'you are').replace(/\bi['’]m\b/giu,'I am');
                const membership = normalized.match(assertion);
                if (evidence.length < 8 || evidence.length > 300 || /[?？]|\b(?:if|might|may|could|would|should|must|want|wish|plan|invite\w*|asked to|not|never|declin\w*|reject\w*|former|used to|was|were|left|quit|no longer)\b|ถ้า|หาก|อยาก|อาจ|ชวน|เชิญ|ปฏิเสธ|ไม่|เคย|ออกจาก|ลาออก|ยุบ/iu.test(evidence)
                    || /\b(?:party|guild)\s+(?:room|hall|headquarters|office|counter|building|registration)\b/iu.test(evidence)
                    || !membership || /เข้าร่วม/iu.test(evidence) && !/แล้ว/iu.test(evidence)) return [];
                const groups = namedGroups(normalized.slice(membership.index));
                const playerLeads = /\b(?:leader|captain|guildmaster|lead|leads|formed|founded|created)\b|หัวหน้า|ผู้นำ|ก่อตั้ง|ตั้งปาร์ตี้/iu.test(membership[0]);
                return groups.length ? [{evidence,groups,playerLeads}] : [];
            });
        });
    });
}

// Recover only named, affirmative current player memberships. Model hints can
// enrich that assertion but cannot turn an invitation into acceptance.
export function establishedGroupOperations(ops, npcs, story, userStory = '', playerName = '') {
    const statements = membershipStatements(story, userStory, playerName), result = [], seen = new Set();
    for (const statement of statements) for (const group of statement.groups) {
        const key = `${group.kind}:${group.name.toLocaleLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const hint = (ops || []).find(operation => ['upsert','offer'].includes(operation?.[0])
            && (group.kind === 'party' ? ['party','partyInvitation'] : ['guilds','guildInvitation']).includes(operation[1])
            && (group.unnamed || typeof operation[2]?.name === 'string' && operation[2].name.toLocaleLowerCase() === group.name.toLocaleLowerCase()));
        const value = hint?.[2] || {};
        const playerLeads = statement.playerLeads;
        const leader = (npcs || []).find(npc => npc.met && !npc.isHostile && npc.enabled !== false
            && new RegExp(`(?:led by|leader is|captain is|นำโดย|หัวหน้า(?:คือ|ชื่อ)?)\\s*["“']?${escaped(npc.name)}|${escaped(npc.name)}\\s*(?:เป็นหัวหน้า|คือหัวหน้า)`, 'iu').test(statement.evidence));
        const requestedRole = typeof value.playerRole === 'string' ? value.playerRole : typeof value.role === 'string' ? value.role : 'Member';
        const role = playerLeads ? 'Leader' : /^(?:leader|captain|guildmaster|หัวหน้า|ผู้นำ)$/iu.test(requestedRole) ? 'Member' : requestedRole;
        const providedLeader = typeof value.leaderId === 'string' && value.leaderId !== 'player' ? value.leaderId : 'unidentified-leader';
        const leaderId = playerLeads ? 'player' : leader?.id || providedLeader;
        const knownLeader = (npcs || []).find(npc => npc.id === leaderId && npc.met && !npc.isHostile && npc.enabled !== false);
        result.push(['upsert',group.kind === 'party' ? 'party' : 'guilds',{
            ...value,name:group.unnamed && typeof value.name === 'string' && value.name.trim() ? value.name.trim() : group.name,playerRole:role,leaderId,
            leaderName:playerLeads ? playerName : leader?.name || value.leaderName || '',
            ...(knownLeader ? {memberIds:[...new Set([...(Array.isArray(value.memberIds) ? value.memberIds : []),knownLeader.id])],
                knownMembers:[...(Array.isArray(value.knownMembers) ? value.knownMembers : []),{name:knownLeader.name,role:'Leader'}]} : {}),
            ...(playerLeads ? {} : {joinedByInvitation:true}),createdByPlayer:false,membershipStatus:'established',membershipEvidence:statement.evidence,
        }]);
    }
    return result;
}

export function groupMembershipEnded(story, userStory, group, playerName = '') {
    const name = escaped(group.name || ''), label = group.kind === 'party' ? '(?:party|ปาร์ตี้|ปาร์ตี)' : '(?:guild|กิลด์|กิล)';
    return [[story,false],[userStory,true]].some(([source,user]) => {
        const blocks = parseStory(source) || [{type:'plain',text:String(source || '').replace(/<[^>]*>/g,' ')}];
        return blocks.some(block => {
            const firstPerson = block.name ? block.name.toLocaleLowerCase() === playerName.toLocaleLowerCase() : user;
            const subject = `(?:\\b(?:you${firstPerson ? '|i|we' : ''})\\b|คุณ${firstPerson ? '|ฉัน|ผม|ข้า|เรา' : ''}${playerName ? `|${escaped(playerName)}` : ''})`;
            return block.text.split(clauseBoundary).some(statement => {
                if (/[?？]|\b(?:if|might|may|could|would|should|must|never|not left|not disbanded|not dissolved|did not|didn't)\b|ถ้า|หาก|อาจ|ไม่เคย|ไม่ได้ออก|ไม่ได้ลาออก|ไม่ได้ยุบ|ยังไม่ยุบ/iu.test(statement)) return false;
                const groups = namedGroups(statement).filter(entry => entry.kind === group.kind && !entry.unnamed);
                if (groups.length && !groups.some(entry => entry.name.toLocaleLowerCase() === group.name?.toLocaleLowerCase())) return false;
                return new RegExp(`${subject}.{0,40}(?:left|quit|no longer|not (?:a )?member|ออกจาก|ลาออก|ไม่ได้เป็นสมาชิก|ไม่เป็นสมาชิก).{0,80}(?:${name}|${label})|(?:${name}).{0,40}(?:disbanded|dissolved|ยุบแล้ว|ถูกยุบ)`, 'iu').test(statement);
            });
        });
    });
}

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
        const speech = block.text;
        if (/\b(?:if|might|would have|not|never|don't|declin|reject)\b|ถ้า|หาก|ไม่|ปฏิเสธ/i.test(speech)) return [];
        const direct = /(?:I invite you|(?:would you|please) join (?:us|my|our)|join (?:us in|my|our)|(?:ขอเชิญ|ชวน|เชิญ)(?:คุณ|เจ้า|เธอ|นาย|ท่าน)?(?:มา|ให้)?(?:เข้า|ร่วม|เข้าร่วม)?)/i.test(speech);
        if (!direct) return [];
        const groups = [...speech.matchAll(/\b(party|guild)\s+["“']([^"”'\n]+)["”']|(ปาร์ตี้|กิลด์)\s*["“']([^"”'\n]+)["”']/gi)];
        return groups.slice(0, 2).map(match => ['offer',
            /^(?:guild|กิลด์)$/i.test(match[1] || match[3]) ? 'guildInvitation' : 'partyInvitation',
            {npcName:block.name,name:match[2] || match[4],role:'Member'}]);
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
        const completedQuests = Number.isSafeInteger(value.completedQuests) && value.completedQuests >= 0
            ? Math.min(value.completedQuests, 999999) : null;
        const reputation = Number.isSafeInteger(value.reputation) && value.reputation >= 0
            ? Math.min(value.reputation, 999999) : null;
        return [{kind,key,name,role,inviterId:inviter.id,inviterName:inviter.name,
            leaderName,
            description:typeof value.description === 'string' ? value.description.trim().slice(0,300) : '',
            rank:typeof value.rank === 'string' ? value.rank.trim().slice(0,80) : '',
            completedQuests,reputation,memberCount:count,members,status:'pending'}];
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
