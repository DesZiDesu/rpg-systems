// Retired theme keys remain importable
// so older chats/cards keep their frame settings when upgrading.
export const CHAT_THEMES = Object.freeze([
    {key:'roleforge',name:'RoleForge Original',genre:'RoleForge',description:'Original RoleForge nameplate, speech frame and narration rail.',descriptionTh:'ป้ายตัวละคร กรอบบทพูด และเส้นบรรยายแบบ Original ของ RoleForge'},
    {key:'folio',name:'The Mage’s Folio',genre:'Storybook',description:'Right-hand square portrait, illuminated name, rounded speech slip and pen signature. Uses each speaker’s character color.',descriptionTh:'ภาพสี่เหลี่ยมฝั่งขวา ป้ายชื่อแบบหนังสือ กรอบบทพูดโค้ง และลายเซ็นปากกา ใช้สีประจำตัวผู้พูด'},
]);
export const CHAT_APPEARANCE_KEYS = Object.freeze({chatTheme:'theme',showChatHeader:'header',showChatDialogue:'dialogue',showChatNarrative:'narrative',chatEffects:'effects',chatHeaderBadgeMode:'badgeMode',chatHeaderBadgeAbility:'badgeAbility'});
const supportedImports=new Set(['roleforge','folio','anime','dark','arcane','jade','future']);
const badgeModes=new Set(['occupation','ability','off']);
export function normalizeChatAppearance(raw={}) {
    return {theme:raw?.theme==='folio'?'folio':'roleforge',header:raw?.header!==false,dialogue:raw?.dialogue!==false,narrative:raw?.narrative!==false,effects:raw?.effects!==false,
        badgeMode:badgeModes.has(raw?.badgeMode)?raw.badgeMode:'occupation',badgeAbility:typeof raw?.badgeAbility==='string'?raw.badgeAbility.trim().slice(0,120):''};
}
export function validateChatAppearance(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid chat appearance preset.');
    if(Object.hasOwn(raw,'theme')&&!supportedImports.has(raw.theme))throw Error('Unknown chat theme.');
    for(const key of ['header','dialogue','narrative','effects'])if(Object.hasOwn(raw,key)&&typeof raw[key]!=='boolean')throw Error(`Invalid chat appearance: ${key}`);
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
