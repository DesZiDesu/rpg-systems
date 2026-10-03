import { interactionEvidence } from './interaction-evidence.js?v=0.50.2';
const systems = [
    {key:'marketplace', setting:'enableMarketplace', words:/(?:shop|store|merchant|vendor|goods|catalog|buy|sell|haggl|counteroffer|ร้าน|พ่อค้า|แม่ค้า|สินค้า|ซื้อ|ขาย|ต่อรอง|ดูของ)/iu},
    {key:'auction', setting:'enableAuctions', words:/auction|ประมูล/iu},
    {key:'missionBoard', setting:'enableMissionBoard', words:/(?:mission|quest|job|bounty|notice)\s*board|(?:กระดาน|บอร์ด)\s*(?:ภารกิจ|เควส|งาน|ประกาศ)/iu},
    {key:'groupBoard', setting:'enableGroupBoard', words:/(?:party|guild|recruitment)\s*board|(?:กระดาน|บอร์ด)\s*(?:ปาร์ตี้|กิลด์|รับสมัคร)/iu},
];
export function requestedChatSystems(user, settings) {
    if (/^\s*(?:\(?OOC\b|\[OOC\b)/iu.test(String(user ?? ''))) return [];
    return systems.filter(system => settings[system.setting] && system.words.test(String(user ?? ''))).map(system => system.key);
}
export function mainChatSystemInstructions(user, settings) {
    const enabled = systems.filter(system => settings[system.setting]).map(system => system.key);
    const requested = requestedChatSystems(user, settings);
    if (!enabled.length) return '';
    return 'MAIN CHAT INTERACTION CHECK: Enabled cards: ' + enabled.join(', ') + '. '
        + (requested.length ? 'The latest player action concerns ' + requested.join(', ') + '. ' : '')
        + 'When THIS reply actually presents goods, an NPC buying offer, auction lots or board entries, include its corresponding top-level object in the SAME tretaresia_patch alongside sceneTracker and ops. Scene data and money/item notifications alone do not create these cards. Do this even when the player is already standing here, asks to see the catalog, revisits or negotiates; a new arrival is not required. marketplace.kind must be npcShop (NPC selling to player) or npcPurchase (NPC buying an owned player item). Use the current sceneTracker.loc/location exactly for every card location. Include item names and explicit numeric prices/denomination, and choose an exact short affirmative evidence quote from this reply; use the interaction sentence rather than conditional pricing dialogue. Do not omit a catalog because nothing was purchased. Keep offers/catalogs separate from a completed sale: an offer alone changes no currency/inventory; an explicitly completed purchase/sale must include its actual money and item ops. Never create a card for rejected, future, hypothetical or OOC actions. Follow the schemas above; do not put card objects inside ops or prose.';
}
export function missingChatSystems(user, story, settings, confirmed) {
    // Only warn when a requested interaction is visibly taking place. A rejected
    // visit, rumor or future plan does not need a card.
    return requestedChatSystems(user, settings).filter(key => !confirmed[key]
        && interactionEvidence(story, story, user, systems.find(system => system.key === key).words,
            /(?:show|display|offer|read|inspect|browse|enter|stand|ask|sell|ลด|หยิบ|วาง|ยื่น|แสดง|ขาย|เสนอ|อ่าน|ดู|เดิน|เข้า|ยืน)/iu));
}
