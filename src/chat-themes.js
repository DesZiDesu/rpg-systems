// Retired theme keys remain importable
// so older chats/cards keep their frame settings when upgrading.
export const CHAT_THEMES = Object.freeze([
    {key:'roleforge',name:'RoleForge Original',genre:'RoleForge',description:'Original RoleForge nameplate, speech frame and narration rail.',descriptionTh:'ป้ายตัวละคร กรอบบทพูด และเส้นบรรยายแบบ Original ของ RoleForge'},
    {key:'folio',name:'The Mage’s Folio',genre:'Storybook',description:'Right-hand square portrait, illuminated name, rounded speech slip and pen signature. Uses each speaker’s character color.',descriptionTh:'ภาพสี่เหลี่ยมฝั่งขวา ป้ายชื่อแบบหนังสือ กรอบบทพูดโค้ง และลายเซ็นปากกา ใช้สีประจำตัวผู้พูด'},
    {key:'chapter',name:'The Gilded Chapter',genre:'Fantasy',description:'Engraved nameplate, left square portrait and chamfered walnut speech frame.',descriptionTh:'ป้ายชื่อแกะสลัก ภาพสี่เหลี่ยมฝั่งซ้าย และกรอบบทพูดสีน้ำตาลทองตัดมุม'},
    {key:'codex',name:'The Royal Codex',genre:'Fantasy',description:'Royal nameplate, right square portrait, double gold speech frame and right-hand pen rail.',descriptionTh:'ป้ายชื่อแบบคัมภีร์ ภาพสี่เหลี่ยมฝั่งขวา กรอบบทพูดทองสองชั้น และรางปากกาฝั่งขวา'},
    {key:'aincrad',name:'Aincrad Interface',genre:'Aincrad',description:'Silver floating speech panels, orange selections and optional NPC HP/Lv from existing records.',descriptionTh:'กรอบบทพูดสีเงิน แถบเลือกสีส้ม และป้าย HP/Lv ที่เลือกแสดงจากข้อมูล NPC จริงได้'},
]);
export const CHAT_APPEARANCE_KEYS = Object.freeze({chatTheme:'theme',showChatHeader:'header',showChatDialogue:'dialogue',showChatNarrative:'narrative',chatEffects:'effects',chatHeaderBadgeMode:'badgeMode',chatHeaderBadgeAbility:'badgeAbility',chatNpcVitals:'npcVitals'});
const themes=new Set(CHAT_THEMES.map(item=>item.key));
const supportedImports=new Set([...themes,'anime','dark','arcane','jade','future']);
const badgeModes=new Set(['occupation','ability','off']);
export function normalizeChatAppearance(raw={}) {
    return {theme:themes.has(raw?.theme)?raw.theme:'roleforge',header:raw?.header!==false,dialogue:raw?.dialogue!==false,narrative:raw?.narrative!==false,effects:raw?.effects!==false,npcVitals:raw?.npcVitals!==false,
        badgeMode:badgeModes.has(raw?.badgeMode)?raw.badgeMode:'occupation',badgeAbility:typeof raw?.badgeAbility==='string'?raw.badgeAbility.trim().slice(0,120):''};
}
export function validateChatAppearance(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid chat appearance preset.');
    if(Object.hasOwn(raw,'theme')&&!supportedImports.has(raw.theme))throw Error('Unknown chat theme.');
    for(const key of ['header','dialogue','narrative','effects','npcVitals'])if(Object.hasOwn(raw,key)&&typeof raw[key]!=='boolean')throw Error(`Invalid chat appearance: ${key}`);
    if(Object.hasOwn(raw,'badgeMode')&&!badgeModes.has(raw.badgeMode))throw Error('Invalid chat appearance: badgeMode');
    if(Object.hasOwn(raw,'badgeAbility')&&(typeof raw.badgeAbility!=='string'||raw.badgeAbility.length>120))throw Error('Invalid chat appearance: badgeAbility');
    return normalizeChatAppearance(raw);
}
export function chatAppearance(settings={}) {
    return normalizeChatAppearance(Object.fromEntries(Object.entries(CHAT_APPEARANCE_KEYS).map(([key,field])=>[field,settings[key]])));
}
export function applyChatTheme(root,appearance) {
    const value=normalizeChatAppearance(appearance);
    root.dataset.rfChatTheme=value.theme;
    delete root.dataset.rfColorMode;
    root.classList.toggle('trpg-effects',value.effects);
    return root;
}
