// Alternative module launchers. The existing carousel stays intact and remains
// the default; these controls only call the application's existing tab action.
export const MODULE_NAVIGATION_MODES = Object.freeze(['carousel', 'menu', 'grid']);
export const normalizeModuleNavigationMode = value => MODULE_NAVIGATION_MODES.includes(value) ? value : 'carousel';

const GROUPS = [
    {id:'character', label:['Character', 'ตัวละคร'], tabs:['status', 'inventory', 'skills', 'techniques', 'rank']},
    {id:'story', label:['Story', 'เนื้อเรื่อง'], tabs:['scene', 'quests', 'memories', 'agenda']},
    {id:'commerce', label:['Commerce', 'การค้า'], tabs:['marketplace']},
    {id:'people', label:['People & connections', 'ผู้คนและความสัมพันธ์'], tabs:['groups', 'household', 'npcs', 'hstats', 'mail']},
    {id:'tools', label:['Tools', 'เครื่องมือ'], tabs:['music', 'systems']},
];
const TEXT = {
    navigation:['Module navigation', 'การเลือกหมวด'],
    modules:['All modules', 'เลือกโมดูล'], close:['Close module chooser', 'ปิดรายการโมดูล'],
    search:['Find a module…', 'ค้นหาโมดูล…'], empty:['No matching modules', 'ไม่พบโมดูลที่ค้นหา'],
    active:['Current', 'กำลังเปิด'], available:['Choose a module', 'เลือกหน้าที่ต้องการ'],
    gridHint:['Tap a module to open it directly.', 'แตะโมดูลเพื่อเปิดหน้านั้นได้ทันที'],
};
// One 24px line system: inset contours, balanced detail and heraldic accents.
// Paths stay inside the viewBox so the small menu glyphs never clip.
const ICONS = {
    status:'<path d="m12 2.5 8 3.7v5.6c0 4.3-3.3 7.5-8 9.7-4.7-2.2-8-5.4-8-9.7V6.2Z"/><circle cx="12" cy="9" r="2.2"/><path d="M8 16v-1a4 4 0 0 1 8 0v1"/>',
    scene:'<path d="M3 3h18v18H3ZM3 16l5-5 4 4 3-3 6 5"/><circle cx="16.5" cy="7.5" r="1.5"/>',
    inventory:'<path d="M8 6V4h8v2M5 6h14l2 4v10H3V10Zm-2 4 6 3m12-3-6 3"/><path d="M9 12h6v4H9ZM5 20v-5m14 5v-5"/>',
    skills:'<path d="m15 3 6 0v6l-9 9-6-6Zm-4 10 3 3M3 15l6 6M6 18l-3 3M15 9l3-3"/>',
    techniques:'<path d="m12 2 3.5 6.5L22 12l-6.5 3.5L12 22l-3.5-6.5L2 12l6.5-3.5Zm0 5-3 5 3 5 3-5Z"/>',
    quests:'<path d="M7 3h11a3 3 0 0 1 3 3v1h-4V6a3 3 0 0 0-3-3M7 3a3 3 0 0 0-3 3v12M4 18H2v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7M4 21a2 2 0 0 0 2-2v-1H4M8 9h5m-5 4h5"/>',
    memories:'<path d="M12 6C9 3.5 5.5 3 2.5 4.5v15c3-1.5 6.5-1 9.5 1 3-2 6.5-2.5 9.5-1v-15C18.5 3 15 3.5 12 6Zm0 0v14.5M6 8h2.5M6 12h2.5M15.5 8H18m-2.5 4H18"/>',
    summaries:'<path d="M3 3h18v4H3Zm1 4v14h16V7M9 11h6m-5 4h4"/><path d="m12 14-2 2 2 2 2-2Z"/>',
    agenda:'<path d="M4 5h16v16H4ZM4 9h16M8 3v4m8-4v4M8 15l2.5 2.5L16 12"/>',
    marketplace:'<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
    rank:'<path d="m7 3 2.5 6m7.5-6-2.5 6M7 3h4l1 3 1-3h4"/><circle cx="12" cy="15" r="6"/><path d="m12 11 1.2 2.7 2.8.3-2 2 .5 2.8-2.5-1.5-2.5 1.5.5-2.8-2-2 2.8-.3Z"/>',
    groups:'<circle cx="12" cy="7" r="2.5"/><path d="M7 20v-3a5 5 0 0 1 10 0v3M5 5a2.5 2.5 0 0 0 0 5m14-5a2.5 2.5 0 0 1 0 5M3 18v-3a4 4 0 0 1 3-4m15 7v-3a4 4 0 0 0-3-4"/>',
    household:'<path d="m2.5 11 9.5-8 9.5 8M5 9v12h14V9M9 21v-7h6v7M16 5V3h3v5"/>',
    npcs:'<path d="M3 5h13v16H3ZM7 5V3h14v15h-5"/><circle cx="9.5" cy="10" r="2"/><path d="M6 17v-.5a3.5 3.5 0 0 1 7 0v.5"/>',
    hstats:'<path d="M12 21 4.4 13.6a5.7 5.7 0 0 1 8-8.1 5.7 5.7 0 0 1 8 8.1L12 21Z"/><path d="M5 11h3l1.5-3 3 7 2-4H19"/>',
    mail:'<path d="M3 5h18v15H3Zm0 1 9 7 9-7M3 19l6-6m12 6-6-6"/><path d="m12 13-1.5 1.5 1.5 1.5 1.5-1.5Z"/>',
    music:'<path d="M9 17V5l11-2v12M9 9l11-2"/><ellipse cx="6.5" cy="18" rx="2.5" ry="2.5"/><ellipse cx="17.5" cy="16" rx="2.5" ry="2.5"/>',
    systems:'<path d="M3 5h3m4 0h11M3 12h11m4 0h3M3 19h3m4 0h11"/><path d="m8 3-2 2 2 2 2-2Zm8 7-2 2 2 2 2-2Zm-8 7-2 2 2 2 2-2Z"/>',
};
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const icon = id => `<svg class="rf-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id] || ICONS.systems}</svg>`;
const glyph = kind => `<svg class="rf-nav-glyph" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">${kind === 'search' ? '<circle cx="8" cy="8" r="5"/><path d="m12 12 5 5"/>' : kind === 'close' ? '<path d="m5 5 10 10M15 5 5 15"/>' : kind === 'grid' ? '<rect x="3" y="3" width="5" height="5"/><rect x="12" y="3" width="5" height="5"/><rect x="3" y="12" width="5" height="5"/><rect x="12" y="12" width="5" height="5"/>' : '<path d="M3 5h14M3 10h14M3 15h14"/>'}</svg>`;
let nextId = 0;

/**
 * Mount beside (not inside) the original carousel. `tabs` contains the existing
 * tab IDs and translated display labels. update() may change the current tab,
 * mode, language, or labels without touching any tab content/state.
 */
export function mountModuleNavigation({host, carousel, tabs = [], activeId = tabs[0]?.id,
    mode = 'carousel', language = 'en', onActivate = () => {}} = {}) {
    if (!host) throw new TypeError('Module navigation requires a host element.');
    const doc = host.ownerDocument, win = doc.defaultView, uid = `rf-module-chooser-${++nextId}`;
    const shell = host.closest('.tretaresia-app-shell'), panel = host.closest('.tretaresia-rpg-panel');
    const footer = shell?.querySelector(':scope > .tretaresia-rpg-panel-footer');
    let state = {tabs:[...tabs], activeId, mode:normalizeModuleNavigationMode(mode), language};
    let expanded = false, query = '', destroyed = false, layoutFrame;
    const text = key => TEXT[key]?.[state.language === 'th' ? 1 : 0] || key;
    host.classList.add('rf-module-navigation');
    host.setAttribute('aria-label', text('navigation'));

    function groupedTabs() {
        const included = new Set();
        const groups = GROUPS.map(group => ({...group, tabs:group.tabs.map(id => state.tabs.find(tab => tab.id === id)).filter(Boolean)}));
        groups.forEach(group => group.tabs.forEach(tab => included.add(tab.id)));
        groups.at(-1).tabs.push(...state.tabs.filter(tab => !included.has(tab.id)));
        return groups;
    }
    function choicesMarkup() {
        const normalized = query.trim().toLocaleLowerCase();
        const groups = groupedTabs().map(group => ({...group,
            tabs:group.tabs.filter(tab => !normalized || String(tab.label).toLocaleLowerCase().includes(normalized) || String(tab.id).includes(normalized))
        })).filter(group => group.tabs.length);
        if (!groups.length) return `<p class="rf-nav-empty" role="status">${escape(text('empty'))}</p>`;
        return groups.map(group => `<section class="rf-nav-group" aria-labelledby="${uid}-${group.id}">
            <h3 id="${uid}-${group.id}">${escape(group.label[state.language === 'th' ? 1 : 0])}<span>${String(group.tabs.length).padStart(2,'0')}</span></h3>
            <div class="rf-nav-choices">${group.tabs.map(tab => {
                const active = tab.id === state.activeId;
                return `<button type="button" class="rf-nav-choice${active ? ' is-current' : ''}" data-rf-nav-tab="${escape(tab.id)}"${active ? ' aria-current="page"' : ''}>${icon(tab.id)}<span class="rf-nav-choice-label">${escape(tab.label)}</span><span class="rf-nav-choice-marker" aria-hidden="true">${active ? '●' : '›'}</span>${active ? `<span class="rf-nav-sr-only">${escape(text('active'))}</span>` : ''}</button>`;
            }).join('')}</div></section>`).join('');
    }
    // The footer and the mobile browser's visible area are real boundaries.
    // A viewport-only height lets the end of a long menu sit behind the footer,
    // particularly with large fonts, safe-area padding or iOS browser toolbars.
    function fitPicker() {
        if (destroyed || !expanded || !host.isConnected) return;
        const picker = host.querySelector('.rf-nav-picker');
        if (!picker) return;
        const viewport = win?.visualViewport;
        const limits = [(viewport?.offsetTop || 0) + (viewport?.height || win?.innerHeight || doc.documentElement.clientHeight)];
        for (const boundary of [footer, panel, shell]) {
            const rect = boundary?.getBoundingClientRect();
            if (rect?.height) limits.push(boundary === footer ? rect.top : rect.bottom);
        }
        const height = Math.max(0, Math.floor(Math.min(...limits) - picker.getBoundingClientRect().top - 8));
        const value = `${height}px`;
        if (host.style.getPropertyValue('--rf-nav-picker-available-height') !== value) {
            // Keep the last rows reachable when the browser's toolbar or a
            // taller footer shortens an already-scrolled chooser.
            const atEnd = picker.scrollHeight > picker.clientHeight && picker.scrollTop + picker.clientHeight >= picker.scrollHeight - 1;
            host.style.setProperty('--rf-nav-picker-available-height', value);
            if (atEnd) picker.scrollTop = picker.scrollHeight;
        }
    }
    function scheduleFit() {
        if (!destroyed && expanded && layoutFrame === undefined) layoutFrame = win.requestAnimationFrame(() => {layoutFrame = undefined; fitPicker();});
    }
    function render() {
        if (destroyed) return;
        host.dataset.mode = state.mode;
        host.setAttribute('aria-label', text('navigation'));
        host.hidden = state.mode === 'carousel';
        if (carousel) {
            carousel.hidden = state.mode !== 'carousel';
            carousel.toggleAttribute('data-rf-navigation-hidden', state.mode !== 'carousel');
        }
        if (host.hidden) {host.replaceChildren(); return;}
        const current = state.tabs.find(tab => tab.id === state.activeId) || state.tabs[0];
        host.innerHTML = `<div class="rf-nav-current">${current ? `${icon(current.id)}<div class="rf-nav-current-label"><span>${escape(text('active'))}</span><strong>${escape(current.label)}</strong></div>` : ''}<button type="button" class="rf-nav-launch" data-rf-nav-launch aria-expanded="${expanded}" aria-controls="${uid}">${glyph(state.mode === 'grid' ? 'grid' : 'menu')}<span>${escape(text('modules'))}</span></button></div>
            <div id="${uid}" class="rf-nav-picker"${expanded ? '' : ' hidden'} aria-label="${escape(text('available'))}">
              <div class="rf-nav-picker-heading"><span>${escape(text('available'))}</span><button type="button" class="rf-nav-close" data-rf-nav-close aria-label="${escape(text('close'))}">${glyph('close')}</button></div>
              ${state.mode === 'menu' ? `<label class="rf-nav-search">${glyph('search')}<input type="search" data-rf-nav-search placeholder="${escape(text('search'))}" aria-label="${escape(text('search'))}" value="${escape(query)}" autocomplete="off"></label>` : `<p class="rf-nav-hint">${escape(text('gridHint'))}</p>`}
              <div class="rf-nav-groups">${choicesMarkup()}</div>
            </div>`;
        fitPicker();
    }
    function openPicker() {
        expanded = true; query = ''; render();
        // Opening a chooser should not summon a phone's keyboard. Search stays
        // available on a deliberate tap or Tab; its ArrowDown shortcut remains.
        host.querySelector('[data-rf-nav-close]')?.focus({preventScroll:true});
    }
    function closePicker({focus = false} = {}) {
        if (!expanded) return;
        expanded = false; query = ''; render();
        if (focus) host.querySelector('[data-rf-nav-launch]')?.focus({preventScroll:true});
    }
    function onClick(event) {
        const button = event.target.closest('button');
        if (!button || !host.contains(button)) return;
        if (button.matches('[data-rf-nav-launch]')) {expanded ? closePicker({focus:true}) : openPicker(); return;}
        if (button.matches('[data-rf-nav-close]')) {closePicker({focus:true}); return;}
        if (button.dataset.rfNavTab) {
            const id = button.dataset.rfNavTab;
            state.activeId = id; closePicker({focus:true}); onActivate(id);
        }
    }
    function onInput(event) {
        if (!event.target.matches('[data-rf-nav-search]')) return;
        query = event.target.value;
        host.querySelector('.rf-nav-groups').innerHTML = choicesMarkup();
    }
    function onKeydown(event) {
        if (!expanded) return;
        if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); closePicker({focus:true}); return;}
        const buttons = [...host.querySelectorAll('[data-rf-nav-tab]')];
        const index = buttons.indexOf(doc.activeElement), isSearch = doc.activeElement?.matches('[data-rf-nav-search]');
        if (isSearch && event.key === 'ArrowDown') {event.preventDefault(); buttons[0]?.focus(); return;}
        if (index < 0) return;
        let columns = 1;
        if (state.mode === 'grid') {
            const current = buttons[index], siblings = [...current.parentElement.children];
            const top = current.getBoundingClientRect().top;
            columns = Math.max(1, siblings.filter(node => Math.abs(node.getBoundingClientRect().top - top) < 2).length);
        }
        const movement = {ArrowDown:columns, ArrowUp:-columns, ArrowRight:1, ArrowLeft:-1};
        let target;
        if (Object.hasOwn(movement,event.key)) target = Math.min(buttons.length - 1, Math.max(0,index + movement[event.key]));
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = buttons.length - 1;
        if (target !== undefined) {event.preventDefault(); buttons[target]?.focus();}
    }
    // render() replaces the clicked button. The event's original propagation
    // path still records its owner, unlike contains(event.target) afterwards.
    function onOutsideClick(event) {if (expanded && !event.composedPath().includes(host)) closePicker();}
    host.addEventListener('click',onClick);
    host.addEventListener('input',onInput);
    host.addEventListener('keydown',onKeydown);
    doc.addEventListener('click',onOutsideClick);
    win?.addEventListener('resize',scheduleFit);
    win?.visualViewport?.addEventListener('resize',scheduleFit);
    win?.visualViewport?.addEventListener('scroll',scheduleFit);
    doc.addEventListener('scroll',scheduleFit,true);
    panel?.addEventListener('transitionend',scheduleFit);
    const resizeObserver = win?.ResizeObserver ? new win.ResizeObserver(scheduleFit) : undefined;
    for (const boundary of [host,shell,panel,footer]) {
        if (boundary) resizeObserver?.observe(boundary);
    }
    render();
    return {
        update(next = {}) {
            const updated = {...state,...next, mode:normalizeModuleNavigationMode(next.mode ?? state.mode)};
            const changed = updated.activeId !== state.activeId || updated.mode !== state.mode || updated.language !== state.language ||
                updated.tabs.length !== state.tabs.length || updated.tabs.some((tab,index) => tab.id !== state.tabs[index]?.id || tab.label !== state.tabs[index]?.label);
            // Story/summary progress can refresh the application repeatedly.
            // Keep an open search field and its focus intact on those updates.
            if (!changed) return;
            if (updated.mode !== state.mode) {expanded = false; query = '';}
            state = updated;
            render();
        },
        destroy() {
            destroyed = true;
            host.removeEventListener('click',onClick);
            host.removeEventListener('input',onInput); host.removeEventListener('keydown',onKeydown);
            doc.removeEventListener('click',onOutsideClick);
            win?.removeEventListener('resize',scheduleFit);
            win?.visualViewport?.removeEventListener('resize',scheduleFit);
            win?.visualViewport?.removeEventListener('scroll',scheduleFit);
            doc.removeEventListener('scroll',scheduleFit,true);
            panel?.removeEventListener('transitionend',scheduleFit);
            resizeObserver?.disconnect();
            if (layoutFrame !== undefined) win.cancelAnimationFrame(layoutFrame);
            host.style.removeProperty('--rf-nav-picker-available-height');
            if (carousel) {carousel.hidden = false; carousel.removeAttribute('data-rf-navigation-hidden');}
            host.replaceChildren(); host.classList.remove('rf-module-navigation'); host.hidden = false;
        },
    };
}
