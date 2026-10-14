// Production extension in a real, isolated SillyTavern server. No model calls.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const engines = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const base = process.env.ST_REAL_URL;
assert(base && ['127.0.0.1', 'localhost'].includes(new URL(base).hostname),
    'Set ST_REAL_URL to a real SillyTavern server with an isolated test profile.');
const output = process.env.ST_ARCHIVE_MENU_ARTIFACTS || '/tmp/roleforge-archive-menu-real';
const engineNames = (process.env.ST_REAL_BROWSERS || 'webkit,chromium').split(',');
const release = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8')).version;
const report = {release, testedAt: new Date().toISOString(), cases: [], pageErrors: [], generationRequests: []};
const run = Date.now().toString(36);
await mkdir(output, {recursive: true});

async function nativeReady(page){
    await page.evaluate(()=>{window.__rfAppReady=false;const c=SillyTavern.getContext();const ready=()=>{window.__rfAppReady=true;c.eventSource.removeListener(c.eventTypes.APP_READY,ready);};c.eventSource.on(c.eventTypes.APP_READY,ready);});
    const done=page.waitForFunction(()=>window.__rfAppReady,{},{timeout:120000});
    await Promise.race([done,page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok').click({timeout:120000}).then(()=>done)]);
}

async function ready(page) {
    await page.waitForFunction(() => document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation
        && document.getElementById('tretaresia-npc-wand-launcher')?.onclick, {}, {timeout: 60000});
    await nativeReady(page);assert.equal(await page.evaluate(() => TretaresiaRelease), release);
}

async function importFixture(page, title) {
    await page.evaluate(async title => {
        const context = SillyTavern.getContext();
        const data = {
            name: title, description: 'Isolated archive selection test',
            first_mes: 'Welcome to the local archive menu test.',
            personality: '', scenario: '', mes_example: '', tags: [],
            extensions: {
                tretaresia_rpg_npcs: Array.from({length: 500}, (_, i) => ({
                    id: `menu-npc-${i}`, name: `NPC menu fixture ${String(i).padStart(4, '0')}`,
                    enabled: true, race: 'Human', notes: `Untouched NPC canon ${i}`,
                })),
                tretaresia_rpg_lore: Array.from({length: 4019}, (_, i) => ({
                    id: `menu-lore-${i}`, title: `Lore menu fixture ${String(i).padStart(4, '0')}`,
                    enabled: true, content: `Untouched world fact ${i}`, keywords: [], always: false,
                })),
                roleforge_character_pack: {format: 'roleforge-character-pack', version: 1,
                    npcOptions: {entryLimit: 0}, loreOptions: {mode: 'relevant', budget: 3000, entryLimit: 0}},
            },
        };
        const form = new FormData();
        form.set('file_type', 'json');
        form.set('avatar', new File([JSON.stringify({spec: 'chara_card_v2', spec_version: '2.0', data})],
            `${title}.json`, {type: 'application/json'}));
        const response = await fetch('/api/characters/import', {method: 'POST',
            headers: context.getRequestHeaders({omitContentType: true}), body: form});
        if (!response.ok) throw Error(`Native fixture import failed: ${response.status}`);
        const {getCharacters} = await import('/script.js');
        await getCharacters();
    }, title);
}

async function selectCard(page, title) {
    await page.evaluate(title => {
        window.__archiveMenuChatReady = false;
        const c = SillyTavern.getContext(), event = c.eventTypes.CHAT_CHANGED;
        const after = () => {
            if (!SillyTavern.getContext().chat.some(m => !m.is_user && m.name === title)) return;
            window.__archiveMenuChatReady = true;
            c.eventSource.removeListener(event, after);
        };
        c.eventSource.on(event, after);
    }, title);
    if (!await page.locator('#right-nav-panel').isVisible()) await page.locator('#rightNavDrawerIcon').click();
    await page.locator('#rm_button_characters').click();
    const card = page.locator('.character_select').filter({hasText: title}).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForFunction(() => window.__archiveMenuChatReady);
}

async function openManager(page) {
    await page.locator('#tretaresia-npc-wand-launcher').evaluate(n => n.click());
    const dialog = page.locator('dialog.trpg-manager[open]');
    await dialog.waitFor({state: 'visible'});
    return dialog;
}

async function records(page, kind) {
    return page.evaluate(kind => {
        const c = SillyTavern.getContext();
        return structuredClone(c.characters[c.characterId].data.extensions[
            kind === 'npc' ? 'tretaresia_rpg_npcs' : 'tretaresia_rpg_lore']);
    }, kind);
}

const canon = rows => rows.map(n => ({id: n.id, label: n.name || n.title,
    fact: n.notes || n.content, enabled: n.enabled !== false}));

async function selected(page, container, count) {
    await page.waitForFunction(({selector, count}) => {
        const text = document.querySelector(selector)?.textContent || '';
        return Number(text.replace(/[^0-9]/g, '')) === count;
    }, {selector: `${container} .trpg-archive-selected-count`, count}, {timeout: 5000});
}

let browser, page;
try {
    for (const engine of engineNames) for (const width of engine === 'webkit' ? [390] : [390, 1440]) {
        assert(engines[engine], `Unknown browser engine: ${engine}`);
        browser = await engines[engine].launch({headless: true, ...(engine === 'chromium'
            ? {executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
                args: ['--no-sandbox', '--disable-dev-shm-usage']} : {})});
        const mobile = width < 650, label = `${engine}-${width}`;
        page = await browser.newPage({viewport: {width, height: mobile ? 844 : 1000},
            hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce'});
        page.setDefaultTimeout(30000);
        await page.addLocatorHandler(page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}),async popup=>{await popup.locator('.popup-button-ok').click();});
        let acceptDelete = false;
        page.on('dialog', d => acceptDelete ? d.accept() : d.dismiss());
        page.on('pageerror', e => report.pageErrors.push({label, message: e.message}));
        page.on('request', r => {
            if (/\/api\/.*\/generate(?:\?|$)/.test(r.url())) report.generationRequests.push(r.url());
        });
        await page.route('**/api/horde/text-models', r => r.fulfill({json: []}));
        await page.route('**/api/horde/status', r => r.fulfill({json: {ok: false}}));
        await page.goto(base);
        await ready(page);
        report.sillyTavern ||= await (await page.request.get(new URL('/version', base).href)).json();
        const title = `RoleForge Menu ${label} ${run}`;
        await importFixture(page, title);
        await selectCard(page, title);
        let dialog = await openManager(page);
        await dialog.locator('[data-archive-options-toggle]').click();
        await dialog.locator('[data-scope-select]').selectOption('character');
        await page.evaluate(() => {
            window.__archiveMenuEvents = [];
            for (const type of ['pointerdown', 'focusout', 'focusin', 'pointerup', 'click'])
                document.addEventListener(type, e => {
                    if (!e.target.closest?.('dialog.trpg-manager')) return;
                    window.__archiveMenuEvents.push({type, tag: e.target.tagName,
                        key: Object.keys(e.target.dataset || {}).join(','),
                        related: e.relatedTarget?.tagName || null,
                        open: !!document.querySelector('.trpg-archive-selection-menu[open]')});
                    if (window.__archiveMenuEvents.length > 100) window.__archiveMenuEvents.shift();
                }, true);
        });
        const activate = locator => mobile ? locator.tap() : locator.click();
        const saved = () => page.waitForFunction(() =>
            document.querySelector('dialog.trpg-manager')?.getAttribute('aria-busy') !== 'true'
            && document.querySelector('[data-lore-panel]')?.getAttribute('aria-busy') !== 'true');
        const outcomes = [];
        for (const kind of ['npc', 'lore']) {
            if (kind === 'lore') await activate(dialog.locator('[data-management-tab=lore]'));
            const containerSelector = kind === 'npc' ? 'dialog.trpg-manager .trpg-browser' : 'dialog.trpg-manager [data-lore-panel]';
            const container = page.locator(containerSelector), total = kind === 'npc' ? 500 : 4019;
            const summary = container.locator('[data-archive-selection-menu]');
            const row = container.locator(kind === 'npc' ? '.trpg-npc-row' : '.trpg-lore-row');
            const search = container.locator(kind === 'npc' ? '[data-search]' : '[data-lore-search]');
            async function choice(key) {
                const target = container.locator(`[data-archive-${key}]`);
                if (!await target.isVisible()) await activate(summary);
                // iOS can blur a summary without focusing the tapped button.
                // Exercise that native null-relatedTarget transition explicitly;
                // Linux WebKit does not always use the same button focus policy.
                if (mobile) {
                    await summary.focus();
                    await summary.evaluate(n => n.blur());
                    assert.equal(await container.locator('.trpg-archive-selection-menu').evaluate(n => n.open), true,
                        'Unassigned focus loss must not close the menu before a touch choice.');
                }
                await activate(target);
            }
            assert.equal((await records(page, kind)).length, total);
            assert.equal(await row.count(), 20);
            await activate(container.locator('[data-archive-select-mode]'));
            await activate(summary);
            await page.screenshot({path: `${output}/${label}-${kind}-menu.png`});
            await choice('select-page');
            await selected(page, containerSelector, 20);
            assert.equal(await container.locator('[data-archive-select]:checked').count(), 20);
            await page.screenshot({path: `${output}/${label}-${kind}-selected.png`});
            const before = await records(page, kind);
            await activate(container.locator('[data-archive-disable]'));
            await saved();
            assert.equal((await records(page, kind)).filter(n => n.enabled === false).length, 20);
            await choice('undo');
            await saved();
            assert.deepEqual(canon(await records(page, kind)), canon(before));
            await choice('select-page');
            await selected(page, containerSelector, 20);
            const pager = container.locator(kind === 'npc' ? '[data-pagination]' : '[data-lore-pagination]');
            await activate(pager.locator('button').last());
            await activate(container.locator('[data-archive-select]').first());
            await selected(page, containerSelector, 21);
            await choice('select-results');
            await selected(page, containerSelector, total);
            await choice('clear');
            await selected(page, containerSelector, 0);
            await activate(summary);
            await activate(search);
            assert.equal(await container.locator('.trpg-archive-selection-menu').evaluate(n => n.open), false,
                'A touch/click outside the menu dismisses it.');
            await search.fill(`${kind === 'npc' ? 'NPC' : 'Lore'} menu fixture ${String(total - 1).padStart(4, '0')}`);
            await choice('select-results');
            await selected(page, containerSelector, 1);
            await choice('delete');
            assert.equal((await records(page, kind)).length, total, 'Cancel keeps the selected record.');
            acceptDelete = true;
            await choice('delete');
            await saved();
            acceptDelete = false;
            assert.equal((await records(page, kind)).length, total - 1);
            assert.equal((await records(page, kind)).at(-1).id, `menu-${kind}-${total - 2}`);
            await search.fill('');
            await activate(container.locator('[data-archive-select-mode]'));
            await activate(container.locator('[data-archive-select-mode]'));
            await activate(summary);
            await summary.focus();
            await page.keyboard.press('Tab');
            assert.equal(await container.locator('.trpg-archive-selection-menu').evaluate(n => n.open), true);
            await search.focus();
            assert.equal(await container.locator('.trpg-archive-selection-menu').evaluate(n => n.open), false,
                'Keyboard focus outside the menu dismisses it.');
            const fit = await dialog.evaluate(n => ({width: n.clientWidth, scrollWidth: n.scrollWidth}));
            assert(fit.scrollWidth <= fit.width + 2, JSON.stringify(fit));
            outcomes.push({kind, initialRecords: total, selectPage: 20, crossPage: 21,
                selectAll: total, clear: true, disableAndUndo: true, filteredSelection: true,
                cancelledDeleteKeptData: true, confirmedDelete: 1, outsideDismiss: true,
                keyboardFocus: true, unassignedFocusLoss: mobile,
                mobileFocusPolicy: mobile ? 'native blur() with null relatedTarget, then touchscreen tap' : null, fit});
            console.log(`PASS ${label} ${kind}: touch/mouse selection, ${total} results, undo, cancel/delete and keyboard`);
        }
        await dialog.locator('[data-close]').click();
        await page.reload();
        await ready(page);
        await selectCard(page, title);
        dialog = await openManager(page);
        assert.equal((await records(page, 'npc')).length, 499);
        assert.equal((await records(page, 'lore')).length, 4018);
        assert((await records(page, 'npc')).every(n => n.enabled !== false));
        assert((await records(page, 'lore')).every(n => n.enabled !== false));
        report.cases.push({engine, width, input: mobile ? 'touchscreen tap' : 'mouse click', outcomes, realServerReload: true});
        await page.close();
        await browser.close();
        browser = page = null;
    }
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.generationRequests, []);
    report.success = true;
} catch (error) {
    report.failure = error.message;
    if (page) {
        report.lastEvents = await page.evaluate(() => window.__archiveMenuEvents || []).catch(() => []);
        await page.screenshot({path: `${output}/failure.png`}).catch(() => {});
    }
    throw error;
} finally {
    await writeFile(`${output}/validation.json`, JSON.stringify(report, null, 2) + '\n');
    await browser?.close();
}
