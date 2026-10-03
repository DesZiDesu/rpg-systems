import { interactionEvidence, withInteractionEvidence } from './interaction-evidence.js?v=0.51.6';
// Party/Guild Board protocol. A board is emitted only when the story confirms
// that the player is physically reading the current board in this location.
const clean = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const key = value => clean(value, 1200).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
const hash = value => { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.codePointAt(0), 16777619); return (result >>> 0).toString(36); };
const boardWords = /(?:guild|party|adventurer|recruit(?:ment)?|notice|bulletin)\s*(?:board|hall|roster)|(?:กระดาน|บอร์ด)\s*(?:กิลด์|ปาร์ตี้|นักผจญภัย|รับสมัคร|ประกาศ)|กิลด์ฮอลล์|สมาคมนักผจญภัย/iu;
const movementWords = /(?:read|examin|inspect|approach|arriv|stand|stop|reach|look|scan|browse|study|walk|เปิดอ่าน|อ่าน|ดู|เดิน|มาถึง|ยืน|หยุด|สำรวจ|แวะ)/iu;
const kindOf = value => /^(?:guild|กิลด์|กิล)$/iu.test(String(value || '').trim()) ? 'guild' : /^(?:party|ปาร์ตี้|ปาร์ตี)$/iu.test(String(value || '').trim()) ? 'party' : '';

export const GROUP_BOARD_INSTRUCTIONS = 'Party/Guild Board: when the player actually arrives at and reads a recruitment board in the CURRENT scene, include groupBoard in this same invisible patch: {"title":"board name","location":"actual current place","evidence":"exact quote from this reply showing the player at/reading the board","entries":[{"kind":"guild or party","name":"stable group name","description":"short premise","leader":"leader name","memberCount":4,"maxMembers":8,"rank":"rank","requirements":["known requirement"],"openSpots":4,"tags":["scout"]}]}. Include 1–12 groups suited to the established world. Keep names, descriptions, leader and requirements stable when revisiting the same board. Do not invent membership, acceptance, rewards or player decisions. A board entry is only an invitation to request admission; the extension renders the cards and handles the request. Never emit this patch for a mention, planned visit, hypothetical, OOC question, or a board the player has not reached.';

export function normalizeGroupBoard(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const location = clean(raw.location, 160), title = clean(raw.title, 160) || 'Party & Guild Board';
    const entries = [], names = new Set();
    for (const input of Array.isArray(raw.entries) ? raw.entries : []) {
        if (!input || typeof input !== 'object') continue;
        const name = clean(input.name, 140), kind = kindOf(input.kind);
        if (!name || !kind || names.has(`${kind}:${key(name)}`)) continue;
        names.add(`${kind}:${key(name)}`);
        const memberCount = Number.isSafeInteger(input.memberCount) && input.memberCount >= 0 ? Math.min(input.memberCount, 1000000) : null;
        const maxMembers = Number.isSafeInteger(input.maxMembers) && input.maxMembers > 0 ? Math.min(input.maxMembers, 1000000) : null;
        const openSpotsRaw = Number.isSafeInteger(input.openSpots) && input.openSpots >= 0 ? Math.min(input.openSpots, 1000000) : null;
        const openSpots = maxMembers !== null && memberCount !== null ? Math.min(openSpotsRaw === null ? Math.max(0, maxMembers - memberCount) : openSpotsRaw, Math.max(0, maxMembers - memberCount)) : openSpotsRaw;
        const requirements = [...new Set((Array.isArray(input.requirements) ? input.requirements : []).map(value => clean(value, 180)).filter(Boolean))].slice(0, 8);
        const tags = [...new Set((Array.isArray(input.tags) ? input.tags : []).map(value => clean(value, 50)).filter(Boolean))].slice(0, 8);
        entries.push({id:`group-board-${hash(`${key(location)}|${kind}|${key(name)}`)}`,kind,name,
            description:clean(input.description, 800),leader:clean(input.leader || input.leaderName, 120),rank:clean(input.rank, 80),
            memberCount,maxMembers,openSpots,requirements,tags,notes:clean(input.notes, 500)});
        if (entries.length === 12) break;
    }
    if (!location || !entries.length) return null;
    const pageSize = Number.isSafeInteger(raw.pageSize) && raw.pageSize >= 1 ? Math.min(raw.pageSize, 6) : 3;
    return {title,location,evidence:clean(raw.evidence, 600),entries,pageSize};
}

export function confirmedGroupBoard(raw, story, user, location) {
    const board = normalizeGroupBoard(withInteractionEvidence(raw, story, location, boardWords, movementWords));
    if (!board || key(board.location) !== key(location) || !boardWords.test(String(story))) return null;
    const evidence = board.evidence;
    if (!interactionEvidence(evidence, story, user, boardWords, movementWords)) return null;
    return board;
}

export function groupBoardEntry(board, id) { return board?.entries?.find(entry => entry.id === id) || null; }
