import { interactionEvidence, withInteractionEvidence } from './interaction-evidence.js?v=0.52.1';
import {normalizeQuestObjectives} from './quest-objectives.js?v=0.52.1';

const clean = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const key = value => clean(value, 1200).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
const hash = value => { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.codePointAt(0), 16777619); return (result >>> 0).toString(36); };
export const MISSION_BOARD_WORDS = /(?:mission|quest|job|notice|bounty|contract)\s*board|(?:posted\s+)?(?:mission|quest|job|bounty|contract)\s*(?:notice|posting|paper)|กระดาน\s*(?:ภารกิจ|เควส|งาน|ประกาศ)|บอร์ด\s*(?:ภารกิจ|เควส)|(?:ประกาศ|กระดาษ|กระดานไม้)[^.!?。\n]{0,500}(?:ภารกิจ|เควส|รับงาน)/iu;
export const MISSION_BOARD_ACTIONS = /(?:read|examin|inspect|approach|arriv|stand|stop|reach|look|scan|brows|study|studies|walk|show|display|post|list|เปิดอ่าน|อ่าน|ดู|มอง|เดิน|มาถึง|ยืน|หยุด|สำรวจ|แสดง|ติด|ปัก|ระบุ|เขียน)/iu;

export const MISSION_BOARD_INSTRUCTIONS = 'Mission Board: when the player looks at, reads or browses an accessible mission, quest or job board in the CURRENT scene, include missionBoard in this same invisible patch: {"title":"board name","location":"actual current place","evidence":"exact quote from this reply showing the readable mission notices","missions":[{"name":"mission title","description":"brief premise","objective":"specific task","giver":"issuer if stated","reward":"offered reward or empty if unstated","difficulty":"known difficulty or empty","deadline":"stated deadline or empty","objectives":[{"title":"required step"}]}]}. Generate 1–4 coherent missions suited to the established world, location and ability, and present their public task/reward details in this reply. Looking while already standing here is enough; no new arrival, preliminary button, extra request or separate generation is required. Use story language. Keep names stable when revisiting the same offers. name and objective are required for every mission; unknown optional facts remain empty. The extension creates the paper cards; never generate HTML or markdown UI. Do not emit a board for a mere mention, planned visit, hypothetical, OOC question, inaccessible board or empty board. Offers do not accept, complete, grant items/EXP or pay rewards: do not upsert these missions into quests or pay them. Only a player acceptance action starts the selected mission. Once accepted preserve its canonical quest ID and once-only reward rules.';

export function normalizeMissionBoard(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const location = clean(raw.location, 160), missions = [], names = new Set();
    for (const input of Array.isArray(raw.missions) ? raw.missions : []) {
        if (!input || typeof input !== 'object') continue;
        const name = clean(input.name, 120), objective = clean(input.objective, 500);
        if (!name || !objective || names.has(key(name))) continue;
        names.add(key(name));
        missions.push({id:`board-${hash(`${key(location)}|${key(name)}`)}`,name,objective,
            description:clean(input.description,1200),giver:clean(input.giver,160),reward:clean(input.reward,300),
            difficulty:clean(input.difficulty,80),deadline:clean(input.deadline,160),notes:clean(input.notes,500),
            objectives:normalizeQuestObjectives(Array.isArray(input.objectives) ? input.objectives.filter(entry => entry && typeof entry === 'object') : [])
                .map(entry => ({...entry,status:'Pending',evidence:'',sourceMessageId:null,sourceDay:null,source:''})),
        });
        if (missions.length === 4) break;
    }
    if (!location || !missions.length) return null;
    return {title:clean(raw.title,160) || 'Mission Board',location,evidence:clean(raw.evidence,600),missions};
}

export function confirmedMissionBoard(raw, story, user, location) {
    const board = normalizeMissionBoard(withInteractionEvidence(raw, story, location, MISSION_BOARD_WORDS, MISSION_BOARD_ACTIONS));
    if (!board || key(board.location) !== key(location) || !MISSION_BOARD_WORDS.test(String(story))) return null;
    const evidence = board.evidence;
    if (!interactionEvidence(evidence, story, user, MISSION_BOARD_WORDS, MISSION_BOARD_ACTIONS)) return null;
    return board;
}

export function boardQuest(mission, board) {
    return {id:mission.id,name:mission.name,type:'Mission',status:'Active',objective:mission.objective,
        reward:mission.reward,giver:mission.giver,source:board.title,progress:0,rewardClaimed:false,
        notes:[mission.description,mission.difficulty && `Difficulty: ${mission.difficulty}`,mission.deadline && `Deadline: ${mission.deadline}`,mission.notes].filter(Boolean).join('\n'),
        objectives:mission.objectives};
}

export function missionQuest(state, mission) {
    return (state.quests || []).find(entry => entry.id === mission.id || key(entry.name) === key(mission.name));
}
