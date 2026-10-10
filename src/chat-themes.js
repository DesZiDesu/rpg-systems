// Presentation only: theme art is static, never generated from story HTML.
export const CHAT_THEMES = Object.freeze([
    {key:'roleforge',name:'Gilded Chronicle',genre:'RoleForge',description:'Gold system frames, an engraved nameplate and a chronicle rail.',descriptionTh:'กรอบระบบสีทอง ป้ายชื่อสลัก และเส้นบันทึกเรื่องราว'},
    {key:'anime',name:'Starlit Reverie',genre:'Fantasy Anime',description:'Pearl speech bubbles, pastel stars and a floating constellation.',descriptionTh:'กรอบบทพูดสีมุก ดาวพาสเทล และกลุ่มดาวลอยเบา ๆ'},
    {key:'dark',name:'Ashen Covenant',genre:'Dark Fantasy',description:'Obsidian panels, a crimson sigil and ember-lit manuscript lines.',descriptionTh:'แผ่นออบซิเดียน ตราแดงเข้ม และเส้นต้นฉบับเรืองแสงถ่าน'},
    {key:'arcane',name:'Astral Grimoire',genre:'Magical Academy',description:'A rotating spell seal, violet bookbinding and parchment dialogue.',descriptionTh:'ตราเวทหมุน กรอบตำราเวทสีม่วง และบทพูดบนกระดาษ'},
    {key:'jade',name:'Jade Lotus',genre:'Chinese Fantasy',description:'Jade scrolls, vermilion seals, ink lines and drifting petals.',descriptionTh:'ม้วนคัมภีร์หยก ตราประทับชาด เส้นหมึก และกลีบดอกไม้ลอย'},
    {key:'future',name:'Neon Protocol',genre:'Advanced Futuristic',description:'A cyan HUD, segmented transmission panels and a pulsing signal.',descriptionTh:'HUD สีฟ้า กรอบส่งสัญญาณแบบแบ่งส่วน และจุดสัญญาณกะพริบ'},
]);
export const CHAT_APPEARANCE_KEYS = Object.freeze({chatTheme:'theme',showChatHeader:'header',showChatDialogue:'dialogue',showChatNarrative:'narrative',chatEffects:'effects'});
const keys=new Set(CHAT_THEMES.map(theme=>theme.key));
export function normalizeChatAppearance(raw={}) {
    return {theme:keys.has(raw?.theme)?raw.theme:'roleforge',header:raw?.header!==false,dialogue:raw?.dialogue!==false,narrative:raw?.narrative!==false,effects:raw?.effects!==false};
}
export function validateChatAppearance(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid chat appearance preset.');
    if(Object.hasOwn(raw,'theme')&&!keys.has(raw.theme))throw Error('Unknown chat theme.');
    for(const key of ['header','dialogue','narrative','effects'])if(Object.hasOwn(raw,key)&&typeof raw[key]!=='boolean')throw Error(`Invalid chat appearance: ${key}`);
    return normalizeChatAppearance(raw);
}
export function chatAppearance(settings={}) {
    return normalizeChatAppearance(Object.fromEntries(Object.entries(CHAT_APPEARANCE_KEYS).map(([key,field])=>[field,settings[key]])));
}
export function applyChatTheme(root,appearance) {
    const value=normalizeChatAppearance(appearance);
    root.dataset.rfChatTheme=value.theme;
    root.classList.toggle('trpg-effects',value.effects);
    return root;
}
const art={
    roleforge:'<path d="M20 3 35 12v16L20 37 5 28V12Z"/><path d="M20 9v22M11 15h18M11 25h18M14 12v16M26 12v16"/><path class="rf-sigil-motion" d="m20 1 2 3-2 3-2-3Z"/>',
    anime:'<path d="m20 5 4 10 11 5-11 4-4 11-5-11-10-4 10-5Z"/><circle cx="20" cy="20" r="6"/><g class="rf-sigil-motion"><path d="m32 3 1 3 3 1-3 1-1 3-1-3-3-1ZM6 28l1 3 3 1-3 1-1 3-1-3-3-1Z"/></g>',
    dark:'<path d="m20 3 12 8-3 18-9 8-9-8-3-18Z"/><path d="M20 9v23M13 14l14 12M27 14 13 26"/><path class="rf-sigil-motion" d="m20 12 4 8-4 8-4-8Z"/>',
    arcane:'<g class="rf-sigil-motion"><circle cx="20" cy="20" r="17"/><path d="m20 4 14 24H6ZM20 36 6 12h28Z"/><path d="M20 1v4M39 20h-4M20 39v-4M1 20h4"/></g><circle cx="20" cy="20" r="5"/>',
    jade:'<path d="M20 32C5 27 3 18 5 13c8 0 12 5 15 13 3-8 7-13 15-13 2 5 0 14-15 19Z"/><path d="M20 5c-8 9-8 16 0 24 8-8 8-15 0-24ZM5 35h30"/><path class="rf-sigil-motion" d="M31 4c-5 1-6 5-3 7 5-1 6-5 3-7Z"/>',
    future:'<path d="M5 14V5h9M26 5h9v9M35 26v9h-9M14 35H5v-9M12 12h16v16H12Z"/><path d="M16 16h8v8h-8ZM1 20h9M30 20h9M20 1v9M20 30v9"/><circle class="rf-sigil-motion" cx="33" cy="7" r="2"/>',
};
export function themeSigil(theme='roleforge',doc=globalThis.document) {
    const span=doc.createElement('span');span.className='rf-chat-sigil';span.setAttribute('aria-hidden','true');
    span.innerHTML=`<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" focusable="false">${art[keys.has(theme)?theme:'roleforge']}</svg>`;
    return span;
}
// One visibility observer for all rendered messages; no timers, token work or
// per-frame JavaScript. Decorative CSS motion sleeps off-screen / in a hidden tab.
export function createThemeMotion({document:doc=globalThis.document,IntersectionObserver:Observer=globalThis.IntersectionObserver}={}) {
    const roots=new Set(),targets=new Map(),owners=new WeakMap();
    const observer=Observer?new Observer(entries=>{for(const {target,isIntersecting} of entries)owners.get(target)?.classList.toggle('rf-motion-visible',isIntersecting);},{rootMargin:'0px'}):null;
    const visibility=()=>{for(const root of roots)root.classList.toggle('rf-motion-hidden',Boolean(doc.hidden));};
    doc.addEventListener('visibilitychange',visibility);
    return {
        add(root){if(roots.has(root)||!root.classList.contains('trpg-effects')||!root.querySelector('.rf-sigil-motion'))return;const target=root.querySelector('.rf-chat-sigil');roots.add(root);targets.set(root,target);owners.set(target,root);root.classList.toggle('rf-motion-hidden',Boolean(doc.hidden));if(observer)observer.observe(target);else root.classList.add('rf-motion-visible');},
        remove(root){const target=targets.get(root);if(target){observer?.unobserve(target);owners.delete(target);}targets.delete(root);roots.delete(root);root.classList.remove('rf-motion-visible');},
        destroy(){observer?.disconnect();roots.clear();targets.clear();doc.removeEventListener('visibilitychange',visibility);},
    };
}
