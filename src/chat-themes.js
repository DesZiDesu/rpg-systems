// Original RoleForge presentation only. Retired theme keys remain importable
// so older chats/cards keep their frame settings when upgrading.
export const CHAT_THEMES = Object.freeze([
    {key:'roleforge',name:'Original',genre:'RoleForge',description:'Original RoleForge nameplate, speech frame and narration rail.',descriptionTh:'ป้ายตัวละคร กรอบบทพูด และเส้นบรรยายแบบ Original ของ RoleForge'},
]);
export const CHAT_APPEARANCE_KEYS = Object.freeze({chatTheme:'theme',showChatHeader:'header',showChatDialogue:'dialogue',showChatNarrative:'narrative',chatEffects:'effects'});
const supportedImports=new Set(['roleforge','anime','dark','arcane','jade','future']);
export function normalizeChatAppearance(raw={}) {
    return {theme:'roleforge',header:raw?.header!==false,dialogue:raw?.dialogue!==false,narrative:raw?.narrative!==false,effects:raw?.effects!==false};
}
export function validateChatAppearance(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid chat appearance preset.');
    if(Object.hasOwn(raw,'theme')&&!supportedImports.has(raw.theme))throw Error('Unknown chat theme.');
    for(const key of ['header','dialogue','narrative','effects'])if(Object.hasOwn(raw,key)&&typeof raw[key]!=='boolean')throw Error(`Invalid chat appearance: ${key}`);
    return normalizeChatAppearance(raw);
}
export function chatAppearance(settings={}) {
    return normalizeChatAppearance(Object.fromEntries(Object.entries(CHAT_APPEARANCE_KEYS).map(([key,field])=>[field,settings[key]])));
}
export function applyChatTheme(root,appearance) {
    const value=normalizeChatAppearance(appearance);
    root.dataset.rfChatTheme='roleforge';
    delete root.dataset.rfColorMode;
    root.classList.toggle('trpg-effects',value.effects);
    return root;
}
