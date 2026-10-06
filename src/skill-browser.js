// Local presentation only: never rewrite skill metadata or request an AI call.
export const SKILL_CATEGORIES = [
    {id:'magic',en:'Magic',th:'เวทมนตร์'},
    {id:'combat',en:'Combat',th:'ต่อสู้'},
    {id:'support',en:'Healing / support',th:'ฟื้นฟู / สนับสนุน'},
    {id:'passive',en:'Passive',th:'ติดตัว'},
    {id:'craft',en:'Crafting',th:'งานช่าง / สร้างสรรค์'},
    {id:'utility',en:'Utility / exploration',th:'อรรถประโยชน์ / สำรวจ'},
    {id:'general',en:'General',th:'ทั่วไป'},
];
const patterns = {
    passive:/\b(passive|innate|always active|permanent trait)\b|ติดตัว|ทำงานตลอด|พรสวรรค์/i,
    magic:/\b(magic|spell|sorcery|sorcerer|wizard|witchcraft|incantation)\b|เวท|มนตรา|คาถา|บทร่าย/i,
    combat:/\b(combat|physical|martial|sword|swordsmanship|melee|archery|attack|strike|weapon|fighting)\b|ต่อสู้|กายภาพ|กระบี่|ดาบ|ธนู|หมัด|โจมตี|อาวุธ/i,
    support:/\b(heal|heals|healing|restore|restores|restoration|recovery|support|cure|purify|shield|barrier)\b|รักษา|ฟื้นฟู|เยียวยา|สนับสนุน|ชำระล้าง|โล่|บาเรีย/i,
    craft:/\b(craft|crafting|smithing|forging|alchemy|cooking|enchanting|tailoring)\b|งานช่าง|ตีเหล็ก|สร้างอาวุธ|ปรุงยา|ทำอาหาร|เล่นแร่แปรธาตุ|ตัดเย็บ/i,
    utility:/\b(utility|storage|pocket dimension|store|inventory|teleport|travel|exploration|scouting|stealth|perception|detect|detection|gathering|harvest)\b|อรรถประโยชน์|เก็บของ|คลัง|มิติ|เดินทาง|สำรวจ|ลอบเร้น|ตรวจจับ|เก็บเกี่ยว/i,
};

export function skillCategory(skill = {}) {
    const kind = String(skill.ability?.kind || '').toLowerCase();
    if (kind === 'passive') return 'passive';
    // A named category/type outranks incidental words in the description.
    const declared = `${skill.category || ''} ${skill.type || ''}`;
    for (const id of ['passive','support','craft','utility','magic','combat']) if (patterns[id].test(declared)) return id;
    if (kind === 'magic') return 'magic';
    if (kind === 'physical') return 'combat';
    const details = `${skill.name || ''} ${skill.ability?.effect || ''} ${skill.description || ''}`;
    for (const id of ['passive','support','craft','utility','magic','combat']) if (patterns[id].test(details)) return id;
    return 'general';
}

export const skillPageSize = width => Number(width) <= 900 ? 1 : 3;

export function skillBrowserView(entries = [], {category = 'all',page = 0,width = 1280} = {}) {
    const counts = Object.fromEntries(SKILL_CATEGORIES.map(({id}) => [id,0]));
    const classified = entries.map(entry => {const id = skillCategory(entry.skill || entry);counts[id]++;return {entry,id};});
    if (category !== 'all' && !counts[category]) category = 'all';
    const filtered = classified.filter(({id}) => category === 'all' || id === category).map(({entry}) => entry);
    const size = skillPageSize(width), pages = Math.max(1,Math.ceil(filtered.length / size));
    page = Math.min(pages - 1,Math.max(0,Math.floor(Number(page) || 0)));
    return {category,page,size,pages,counts,total:filtered.length,items:filtered.slice(page * size,(page + 1) * size)};
}

export function mountSkillBrowser(container, {entries,preferences,language,escape,renderCard,emptyMarkup,width = () => globalThis.innerWidth}) {
    const th = language === 'th', t = (thai,en) => th ? thai : en;
    container.innerHTML = `<div class="rf-skill-filter"><label for="rf-skill-category">${t('หมวดอัตโนมัติ','Auto category')}</label><select id="rf-skill-category" data-skill-category></select></div><nav class="rf-skill-pagination" aria-label="${t('หน้าคลังทักษะ','Skill pages')}"><button type="button" data-skill-page="previous" aria-label="${t('หน้าก่อนหน้า','Previous page')}"><i class="fa-solid fa-angle-left" aria-hidden="true"></i></button><p class="rf-skill-page-status" role="status" aria-live="polite" aria-atomic="true"></p><button type="button" data-skill-page="next" aria-label="${t('หน้าถัดไป','Next page')}"><i class="fa-solid fa-angle-right" aria-hidden="true"></i></button></nav><div class="tretaresia-skill-storage-grid"></div>`;
    const select = container.querySelector('[data-skill-category]'),grid = container.querySelector('.tretaresia-skill-storage-grid'),status = container.querySelector('.rf-skill-page-status');
    const previous = container.querySelector('[data-skill-page="previous"]'),next = container.querySelector('[data-skill-page="next"]');
    let view;
    function render() {
        view = skillBrowserView(entries,{...preferences,width:width()});
        Object.assign(preferences,{category:view.category,page:view.page});
        select.innerHTML = `<option value="all">${escape(t('ทั้งหมด','All skills'))} (${entries.length})</option>` + SKILL_CATEGORIES.filter(({id}) => view.counts[id]).map(({id,en,th}) => `<option value="${id}">${escape(language === 'th' ? th : en)} (${view.counts[id]})</option>`).join('');
        select.value = view.category;select.disabled = !entries.length;
        grid.innerHTML = view.items.length ? view.items.map(renderCard).join('') : emptyMarkup;
        grid.dataset.pageSize = String(view.size);
        status.textContent = `${t('หน้า','Page')} ${view.page + 1} / ${view.pages} · ${view.total ? view.page * view.size + 1 : 0}–${Math.min((view.page + 1) * view.size,view.total)} / ${view.total}`;
        previous.disabled = view.page === 0;next.disabled = view.page === view.pages - 1;
    }
    select.addEventListener('change',() => {preferences.category = select.value;preferences.page = 0;render();});
    previous.addEventListener('click',() => {preferences.page = view.page - 1;render();});
    next.addEventListener('click',() => {preferences.page = view.page + 1;render();});
    render();
    return {resize() {const size = skillPageSize(width());if (size !== view.size) {preferences.page = Math.floor(view.page * view.size / size);render();}}};
}
