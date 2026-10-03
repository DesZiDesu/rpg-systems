import { interactionEvidence } from './interaction-evidence.js?v=0.51.4';
const systems = [
    {key:'marketplace', setting:'enableMarketplace', words:/(?:shop|store|merchant|vendor|goods|catalog|buy|sell|haggl|counteroffer|ร้าน|พ่อค้า|แม่ค้า|สินค้า|ซื้อ|ขาย|ต่อรอง|ดูของ)/iu},
    {key:'auction', setting:'enableAuctions', words:/auction|ประมูล/iu},
    {key:'missionBoard', setting:'enableMissionBoard', words:/(?:mission|quest|job|bounty|notice)\s*board|(?:กระดาน|บอร์ด)\s*(?:ภารกิจ|เควส|งาน|ประกาศ)/iu},
    {key:'groupBoard', setting:'enableGroupBoard', words:/(?:party|guild|recruitment)\s*board|(?:กระดาน|บอร์ด)\s*(?:ปาร์ตี้|กิลด์|รับสมัคร)/iu},
];
export function requestedChatSystems(user, settings) {
    if (/^\s*(?:\(?OOC\b|\[OOC\b)/iu.test(String(user ?? ''))) return [];
    const requested=systems.filter(system => settings[system.setting] && system.words.test(String(user ?? ''))).map(system => system.key);
    return systems.find(system=>system.key==='auction').words.test(String(user??''))?requested.filter(key=>key!=='marketplace'):requested;
}
export function mainChatSystemInstructions(user, settings, {activeCommerce}={}) {
    const enabled = systems.filter(system => settings[system.setting]).map(system => system.key);
    const requested = requestedChatSystems(user, settings);
    if (!enabled.length) return '';
    if(activeCommerce)return 'MAIN CHAT INTERACTION CHECK: An existing '+activeCommerce.kind+' interaction is already open. Use commerce in this SAME reply to update it from the latest user role-play; never emit marketplace/auction again or open a second commerce UI. Goods, catalogs and buying/selling vocabulary here refer to that current interaction. Mission/group boards still use their own top-level objects only when actually requested and presented.';
    return 'MAIN CHAT INTERACTION CHECK: Enabled cards: ' + enabled.join(', ') + '. '
        + (requested.length ? 'The latest player action concerns ' + requested.join(', ') + '. ' : '')
        + 'When THIS reply actually presents goods, an NPC buying offer, auction lots or board entries, include its corresponding top-level object in the SAME tretaresia_patch alongside sceneTracker and ops. Scene data and money/item notifications alone do not create these cards. For a present-tense request to buy, sell or join an auction, open the appropriate interaction automatically in this FIRST NPC reply with the public goods, numeric prices and actual participant budgets. No preliminary request button or second AI call is needed. Do not ask the player to request a list again. Do this even when the player is already standing here, asks to see the catalog, revisits or negotiates; a new arrival is not required. marketplace.kind must be npcShop (NPC selling to player) or npcPurchase (NPC buying an owned player item). Use the current sceneTracker.loc/location exactly for every card location. Include item names and explicit numeric prices/denomination, and choose an exact short affirmative evidence quote from this reply; use the interaction sentence rather than conditional pricing dialogue. Do not omit a catalog because nothing was purchased. Keep offers/catalogs separate from a completed sale: an offer alone changes no currency/inventory; commerce opened by these objects is settled through its validated commerce decision from role-play or a composer action after player consent; do not duplicate transfers through normal story ops. Never create a card for rejected, future, hypothetical or OOC actions. Follow the schemas above; do not put card objects inside ops or prose.';
}
export function missingChatSystems(user, story, settings, confirmed) {
    // Only warn when a requested interaction is visibly taking place. A rejected
    // visit, rumor or future plan does not need a card.
    return requestedChatSystems(user, settings).filter(key => !(confirmed.commerce&&['marketplace','auction'].includes(key)) && !confirmed[key]
        && interactionEvidence(story, story, user, systems.find(system => system.key === key).words,
            /(?:show|display|offer|read|inspect|browse|enter|stand|ask|sell|ลด|หยิบ|วาง|ยื่น|แสดง|ขาย|เสนอ|อ่าน|ดู|เดิน|เข้า|ยืน)/iu));
}

export function requestedCommerceKind(user,settings) {
    const value=String(user??'');
    if(/^(?:\s*\(?OOC\b|\s*\[OOC\b)|(?:พรุ่งนี้|เมื่อวาน|สมมุติ|ยังไม่|ไม่อยาก|ไม่ต้องการ|\b(?:tomorrow|yesterday|hypothetical|not yet)\b)/iu.test(value))return '';
    const requested=requestedChatSystems(value,settings);
    if(requested.includes('auction'))return 'auction';
    if(requested.includes('marketplace'))return /(?:ขาย|\bsell\b)/iu.test(value)?'sell':'buy';
    return '';
}
