// Real production loader, message events, chat-scoped persistence and story UI.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/story-systems.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = new URL('../', import.meta.url);
const base = '/scripts/extensions/third-party/rpg-systems/';
const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname.startsWith('/api/')) {
            response.setHeader('content-type', 'application/json'); response.end('[]'); return;
        }
        if (!url.pathname.startsWith(base) || url.pathname.includes('..')) {
            response.writeHead(404).end(); return;
        }
        const path = url.pathname.slice(base.length);
        const contents = await readFile(new URL(path, root));
        response.setHeader('content-type', path.endsWith('.css') ? 'text/css'
            : path.endsWith('.html') ? 'text/html' : path.endsWith('.json') ? 'application/json'
                : /\.(m?js)$/.test(path) ? 'text/javascript' : 'image/webp');
        response.end(contents);
    } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const artifacts = process.env.STORY_SYSTEMS_SCREENSHOT_DIR || '/workspace/artifacts';
await mkdir(artifacts, {recursive: true});
const chatKey = 'roleforge-story-systems-test-chat';
const widths = process.env.STORY_SYSTEMS_WIDTHS
    ? process.env.STORY_SYSTEMS_WIDTHS.split(',').map(Number).filter(width => Number.isInteger(width) && width >= 320)
    : [320, 390, 1280];
assert(widths.length, 'At least one browser width is required');
const place = 'Gaia Manor';
const scene = {
    dayName: 'Day 63', day: 63, month: 'September', year: '2026', era: 'CE', calendar: 'Story calendar',
    time: '17:00', period: 'Evening', season: 'Autumn', location: place, region: '', continent: '',
    position: 'Beside the doorway', weather: 'Clear', temperature: 20, lighting: 'Sunset',
    participants: ['Nova', 'Ashe'], objective: 'Return the borrowed compass', safety: 'Safe',
    atmosphere: 'Quiet', elapsed: '0m',
};
const memoryTitle = 'Return Ashe’s borrowed compass';
const questName = 'Urgent Merchant Caravan Escort';
const deadlineTitle = 'Deliver the sealed caravan report';
const vagueTitle = 'Meet Ashe at the festival';

async function state(page) { return page.evaluate(() => window.host.chatMetadata.tretaresia_rpg_state); }

async function drawChat(page) {
    await page.evaluate(() => {
        document.querySelector('#chat').replaceChildren(...window.host.chat.map((message, index) => {
            const row = document.createElement('div'); row.className = 'mes'; row.setAttribute('mesid', index);
            const content = document.createElement('div'); content.className = 'mes_text'; content.textContent = message.mes;
            row.append(content); return row;
        }));
    });
}

async function receive(page, ops, story, currentScene = scene) {
    const id = await page.evaluate(({ops, story, currentScene}) => {
        window.host.chat.push({name: 'Nova', is_user: true, is_system: false, mes: 'Continue the confirmed story.'});
        const id = window.host.chat.length;
        window.host.chat.push({name: 'Narrator', is_user: false, is_system: false,
            mes: `${story}\n<!--tretaresia_patch:${JSON.stringify({sceneTracker: currentScene, ops})}-->`});
        return id;
    }, {ops, story, currentScene});
    await drawChat(page);
    await page.evaluate(id => window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED, id, 'normal'), id);
    await page.waitForFunction(id => Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history || {})
        .some(key => key.startsWith(`${id}:`)) && !window.host.chat[id].mes.includes('tretaresia_patch'), id);
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify(window.host.chat)), chatKey);
    return id;
}

async function panel(page, name) {
    // The mobile module slider exposes its active tab and two real arrows.
    // Hidden slides cannot be clicked; use the same navigation as a person.
    const {target, active} = await page.evaluate(name => {
        const tabs = [...document.querySelectorAll('.tretaresia-module-track [data-tab]')];
        return {target: tabs.findIndex(tab => tab.dataset.tab === name), active: tabs.findIndex(tab => tab.classList.contains('is-active'))};
    }, name);
    assert(target >= 0 && active >= 0, `Available production module ${name}`);
    for (let index = active; index !== target; index += target > active ? 1 : -1) {
        await page.locator(`[data-action="${target > active ? 'tab-next' : 'tab-prev'}"]`).click();
    }
    const locator = page.locator(`[data-panel="${name}"]`);
    await locator.waitFor({state: 'visible'});
    await page.waitForFunction(() => document.querySelector('#tretaresia-rpg-overlay.is-ready'));
    return locator;
}

async function noOverflow(page, width, names = ['memories', 'quests', 'agenda']) {
    for (const name of names) {
        const current = await panel(page, name);
        if (name === 'quests') await current.locator('[data-action="quest-section"][data-section="completed"]').click();
        const create = current.locator('.trpg-story-create').first();
        if (await create.count() && !await create.evaluate(element => element.open)) await create.locator('summary').click();
        const measurements = await current.evaluate(element => ({document: document.documentElement.scrollWidth,
            panel: element.scrollWidth, panelWidth: element.clientWidth}));
        assert(measurements.document <= width + 1, `${name}: document overflow at ${width}px ${JSON.stringify(measurements)}`);
        assert(measurements.panel <= measurements.panelWidth + 1, `${name}: panel overflow at ${width}px ${JSON.stringify(measurements)}`);
        const workspace = current.locator('.trpg-story-workspace, .trpg-story-objectives');
        for (const control of await workspace.locator('button,input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),select,textarea,summary').all()) {
            if (!await control.isVisible()) continue;
            const box = await control.boundingBox();
            assert(box.height >= 43.9, `${name}: ${await control.getAttribute('name') || await control.getAttribute('data-action') || await control.innerText()} height ${box.height} below 44px`);
        }
        for (const label of await workspace.locator('.trpg-story-checkbox').all()) {
            if (!await label.isVisible()) continue;
            assert((await label.boundingBox()).height >= 43.9, `${name}: checkbox label is a 44px touch target`);
        }
    }
}

let browser;
try {
    browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage']});
    for (const width of widths) {
        const page = await browser.newPage({viewport: {width, height: 950}, reducedMotion: 'reduce'});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType: 'text/css', body: ''}));
        await page.addInitScript(({scene}) => {
            if (localStorage.getItem('roleforge-hstats-preview-metadata')) return;
            localStorage.setItem('roleforge-hstats-preview-settings', JSON.stringify({tretaresia_rpg: {enableStoryMemory:true,enableStoryAgenda:true,enableQuestObjectives:true,eventNotifications:true,
                language: 'en', autoTrack: true, autoContinuity: false, chatPresentation: false, showSceneTracker: true,
            }}));
            localStorage.setItem('roleforge-hstats-preview-metadata', JSON.stringify({tretaresia_rpg_state: {
                npcs: [], player: {name: 'Nova'}, progression: {currency: {gold: 0, silver: 0, copper: 120}},
                quests: [], storyMemories: [], storyAgenda: [], worldClock: {day: 63, time: '17:00'}, sceneTracker: scene,
                location: {narrativeVersion: 1, place: 'Gaia Manor', region: '', continent: '', detail: ''},
                onboarding: {locationSeeded: true},
            }}));
        }, {scene});
        await page.goto(url);
        await page.waitForFunction(() => window.hStatsPreview?.ready
            && document.querySelector('#tretaresia-rpg-overlay.is-open.is-ready'));
        await page.evaluate(() => {
            window.storySystemPrompts = new Map();
            window.host.setExtensionPrompt = (name, contents) => window.storySystemPrompts.set(name, contents);
        });

        const sourceId = await receive(page, [
            ['upsert', 'storyMemories', {id: 'compass-promise', title: memoryTitle, kind: 'Promise',
                detail: '<img id="story-payload" src=x onerror="window.storyMemoryXSS=true"> Keep the compass safe until returning it.',
                people: ['Ashe'], keywords: ['compass', 'borrowed'], importance: 'High',
                evidence: 'Ashe lends Nova her compass; Nova promises to return it after the escort.'}],
            ['upsert', 'quests', {id: 'escort', name: questName, status: 'Active', objectives: [
                {id: 'arrive', title: 'Escort the caravan to the gate', status: 'Pending'},
                {id: 'report', title: 'Deliver the sealed report', status: 'Pending'},
            ]}],
            ['upsert', 'storyAgenda', {id: 'report-deadline', title: deadlineTitle, kind: 'Deadline',
                dueDay: 64, dueTime: '18:00', whenText: 'Day 64 at 18:00', location: 'Gaia Manor',
                people: ['Ashe'], questId: 'escort', evidence: 'Ashe explicitly requires the sealed report by Day 64 at 18:00.'}],
            ['upsert', 'storyAgenda', {id: 'festival-meeting', title: vagueTitle, kind: 'Appointment',
                whenText: 'When the festival begins', people: ['Ashe'], evidence: 'Ashe says to meet when the festival begins.'}],
        ], 'Ashe lends you her compass. You accept the escort and its two required objectives. The report is due on Day 64 at 18:00; the festival meeting has no confirmed day or clock time.');

        let current = await state(page);
        assert.equal(current.storyMemories.length, 1);
        assert.equal(current.storyMemories[0].sourceMessageId, sourceId, 'Memory provenance identifies the actual assistant turn');
        assert.equal(current.storyMemories[0].sourceDay, 63);
        assert.match(current.storyMemories[0].evidence, /Ashe lends Nova/);
        assert.equal(current.storyAgenda.length, 2);
        assert.equal(current.storyAgenda.find(entry => entry.id === 'festival-meeting').dueDay, null);
        assert.equal(current.storyAgenda.find(entry => entry.id === 'festival-meeting').dueTime, '');
        assert.equal(current.quests[0].objectives.length, 2);
        assert.equal(current.quests[0].progress, 0);
        await page.evaluate(() => window.host.eventSource.emit(window.host.eventTypes.GENERATION_STARTED, 'normal'));
        const context = await page.evaluate(() => [...window.storySystemPrompts.values()].join('\n'));
        assert.match(context, /storyMemories/, 'Relevant confirmed memory reaches actual generation context');
        assert.match(context, /Return Ashe’s borrowed compass/);
        assert.match(context, /storyAgenda/);
        assert.match(context, /Deliver the sealed caravan report/);
        assert.match(context, /When the festival begins/);
        await page.evaluate(() => window.host.eventSource.emit(window.host.eventTypes.GENERATION_ENDED));
        let memories = await panel(page, 'memories');
        assert.match(await memories.innerText(), /Return Ashe’s borrowed compass/);
        await memories.locator('[data-story-memory-id="compass-promise"] .trpg-story-disclosure > summary').first().click();
        assert.match(await memories.innerText(), /Ashe lends Nova/);
        assert.match(await memories.innerText(), /<img/);
        assert.equal(await page.locator('#story-payload').count(), 0, 'Story prose is escaped rather than interpreted as HTML');
        assert.equal(await page.evaluate(() => window.storyMemoryXSS), undefined);
        let agenda = await panel(page, 'agenda');
        assert.match(await agenda.innerText(), /Deliver the sealed caravan report/);
        assert.match(await agenda.innerText(), /When the festival begins/);
        assert.equal(await agenda.locator('[data-story-agenda-id="report-deadline"]').getAttribute('data-reminder'), 'Upcoming');
        assert.equal(await agenda.locator('[data-story-agenda-id="festival-meeting"]').getAttribute('data-reminder'), 'Unscheduled');
        let quests = await panel(page, 'quests');
        assert.match(await quests.innerText(), /Escort the caravan to the gate/);
        assert.match(await quests.innerText(), /Deliver the sealed report/);

        await receive(page, [
            ['upsert', 'quests', {id: 'escort', name: questName, status: 'Completed'}],
            ['inc', 'progression.currency.gold', 6, {category: 'quest-reward', questId: 'escort', reason: 'Escort reward'}],
        ], 'An inconsistent patch attempts to mark the escort complete before either required objective is confirmed.');
        current = await state(page);
        assert.equal(current.quests[0].status, 'Active', 'Required pending objectives prevent premature completion');
        assert.equal(current.progression.currency.gold, 0, 'An incomplete checklist cannot trigger a reward');

        await receive(page, [['upsert', 'questObjectives', {questId: 'escort', id: 'arrive', status: 'Completed',
            evidence: 'The caravan safely reaches the gate.'}]], 'The caravan safely reaches the gate; you still need to deliver its sealed report.');
        current = await state(page);
        assert.equal(current.quests[0].progress, 50);
        assert.equal(current.quests[0].status, 'Active');
        quests = await panel(page, 'quests');
        assert.match(await quests.innerText(), /50%/);
        assert.equal(await quests.locator('.trpg-story-progress').getAttribute('aria-valuenow'), '50');
        await quests.locator('[data-action="quest-objective-status"][data-id="arrive"][data-status="Pending"]').click();
        await page.waitForFunction(() => window.host.chatMetadata.tretaresia_rpg_state.quests[0].progress === 0);
        await quests.locator('[data-action="quest-objective-status"][data-id="arrive"][data-status="Completed"]').click();
        await page.waitForFunction(() => window.host.chatMetadata.tretaresia_rpg_state.quests[0].progress === 50);

        await receive(page, [['upsert', 'questObjectives', {questId: 'escort', id: 'report', status: 'Completed',
            evidence: 'Ashe receives the sealed report.'}]], 'Ashe receives the sealed report. Both required objectives are now complete.');
        current = await state(page);
        assert.equal(current.quests[0].progress, 100);
        assert.equal(current.quests[0].status, 'Active', 'A complete checklist waits for separately confirmed quest completion');
        assert.equal(current.progression.currency.gold, 0);

        await receive(page, [
            ['upsert', 'quests', {id: 'escort', name: questName, status: 'Completed'}],
            ['inc', 'progression.currency.gold', 6, {category: 'quest-reward', questId: 'escort', reason: 'Fair share from Urgent Merchant Caravan Escort quest'}],
        ], 'Ashe confirms the escort is complete and hands you the agreed six gold coins.');
        await receive(page, [['inc', 'progression.currency.gold', 7,
            {category: 'quest-reward', reason: 'Caravan escort mission reward share'}]], 'The same caravan escort reward is mentioned again.');
        current = await state(page);
        assert.equal(current.progression.currency.gold, 6);
        assert.equal(current.transactions.length, 1);
        assert.equal(current.questRewardReceipts.length, 1);

        await receive(page, [], 'The story explicitly reaches Day 64 at 18:00.',
            {...scene, day: 64, dayName: 'Day 64', time: '18:00'});
        agenda = await panel(page, 'agenda');
        assert.match(await agenda.innerText(), /Due now/);
        assert.equal(await agenda.locator('[data-story-agenda-id="report-deadline"]').getAttribute('data-reminder'), 'Due');
        await receive(page, [], 'One minute passes in the story.',
            {...scene, day: 64, dayName: 'Day 64', time: '18:01'});
        agenda = await panel(page, 'agenda');
        assert.match(await agenda.innerText(), /Overdue/);
        assert.equal(await agenda.locator('[data-story-agenda-id="report-deadline"]').getAttribute('data-reminder'), 'Overdue');
        current = await state(page);
        assert.equal(current.storyAgenda.find(entry => entry.id === 'report-deadline').status, 'Scheduled');
        assert.equal(current.storyAgenda.find(entry => entry.id === 'festival-meeting').dueDay, null);
        assert.equal(current.storyAgenda.find(entry => entry.id === 'festival-meeting').dueTime, '');
        assert.equal(current.quests[0].status, 'Completed', 'Clock changes do not fail a linked quest');
        assert.equal(current.progression.currency.gold, 6, 'Clock changes do not spend or award money');

        const deadline = agenda.locator('[data-story-agenda-id="report-deadline"]');
        const deadlineEdit = deadline.locator('.trpg-story-disclosure').filter({has: page.locator('form[data-form="story-agenda"]')});
        await deadlineEdit.locator('summary').click();
        const deadlineForm = deadlineEdit.locator('form');
        await deadlineForm.locator('[name="dueDay"]').fill('65');
        await deadlineForm.locator('[name="dueTime"]').fill('09:30');
        await deadlineForm.locator('[name="whenText"]').fill('Rescheduled with Ashe to Day 65 at 09:30');
        await deadlineForm.locator('[type="submit"]').click();
        await page.waitForFunction(() => window.host.chatMetadata.tretaresia_rpg_state.storyAgenda
            .find(entry => entry.id === 'report-deadline').dueDay === 65);
        assert.equal(await deadline.getAttribute('data-reminder'), 'Upcoming', 'A manual reschedule immediately recalculates the reminder');
        await agenda.locator('[data-action="story-agenda-status"][data-id="festival-meeting"][data-status="Cancelled"]').click();
        await page.waitForFunction(() => window.host.chatMetadata.tretaresia_rpg_state.storyAgenda
            .find(entry => entry.id === 'festival-meeting').status === 'Cancelled');
        memories = await panel(page, 'memories');
        await memories.locator('[data-action="story-memory-status"][data-id="compass-promise"][data-status="Resolved"]').click();
        await page.waitForFunction(() => window.host.chatMetadata.tretaresia_rpg_state.storyMemories[0].status === 'Resolved');
        const closedMemories = memories.locator('.trpg-story-disclosure').filter({has: page.locator('.trpg-story-cards')}).last();
        await closedMemories.locator('summary').first().click();
        await memories.locator('[data-action="story-memory-status"][data-id="compass-promise"][data-status="Active"]').click();
        await page.waitForFunction(() => window.host.chatMetadata.tretaresia_rpg_state.storyMemories[0].status === 'Active');
        const memoryEdit = memories.locator('[data-story-memory-id="compass-promise"] .trpg-story-disclosure')
            .filter({has: page.locator('form[data-form="story-memory"]')});
        await memoryEdit.locator('summary').click();
        await memoryEdit.locator('[name="pinned"]').check();
        await memoryEdit.locator('[type="submit"]').click();
        await page.waitForFunction(() => window.host.chatMetadata.tretaresia_rpg_state.storyMemories[0].pinned === true);

        // Labels translate independently of story titles and prose.
        await page.evaluate(() => {
            const language = document.querySelector('#tretaresia-rpg-language');
            language.value = 'th'; language.dispatchEvent(new Event('change', {bubbles: true}));
        });
        memories = await panel(page, 'memories');
        assert.match(await memories.locator('.trpg-story-heading').innerText(), /ความจำเรื่องสำคัญ/);
        assert.match(await memories.innerText(), /Return Ashe’s borrowed compass/);
        agenda = await panel(page, 'agenda');
        assert.match(await agenda.locator('.trpg-story-heading').innerText(), /นัดหมายและเส้นตาย/);
        await page.evaluate(() => {
            const language = document.querySelector('#tretaresia-rpg-language');
            language.value = 'en'; language.dispatchEvent(new Event('change', {bubbles: true}));
        });
        await noOverflow(page, width);
        memories = await panel(page, 'memories');
        await memories.locator('.trpg-story-create').evaluateAll(elements => elements.forEach(element => {element.open = false;}));
        await memories.evaluate(element => {element.closest('.tretaresia-rpg-panel-body').scrollTop = 0;});
        if (width !== 320) await page.screenshot({path: `${artifacts}/story-memories-${width === 390 ? 'mobile' : 'desktop'}.png`});
        agenda = await panel(page, 'agenda');
        await agenda.locator('.trpg-story-create').evaluateAll(elements => elements.forEach(element => {element.open = false;}));
        await agenda.evaluate(element => {element.closest('.tretaresia-rpg-panel-body').scrollTop = 0;});
        if (width !== 320) await page.screenshot({path: `${artifacts}/story-agenda-${width === 390 ? 'mobile' : 'desktop'}.png`});

        await page.reload();
        await page.waitForFunction(() => window.hStatsPreview?.ready);
        await page.evaluate(async key => {
            window.host.chat = JSON.parse(localStorage.getItem(key));
            await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);
        }, chatKey);
        current = await state(page);
        assert.equal(current.storyMemories.length, 1, 'Memory survives a real browser reload');
        assert.equal(current.storyMemories[0].pinned, true);
        assert.equal(current.storyAgenda.length, 2, 'Reminders survive a real browser reload');
        assert.equal(current.storyAgenda.find(entry => entry.id === 'report-deadline').dueDay, 65);
        assert.equal(current.storyAgenda.find(entry => entry.id === 'festival-meeting').status, 'Cancelled');
        assert.equal(current.quests[0].objectives.length, 2, 'Objective checklist survives reload');
        assert.equal(current.quests[0].progress, 100);
        assert.equal(current.progression.currency.gold, 6);
        assert.equal(current.questRewardReceipts.length, 1);

        const swipeId = await receive(page, [
            ['upsert', 'storyMemories', {id: 'swipe-memory', title: 'The rejected promise', kind: 'Promise',
                evidence: 'This fact belongs only to the first response variant.'}],
            ['upsert', 'storyAgenda', {id: 'swipe-agenda', title: 'The rejected appointment', dueDay: 70}],
            ['upsert', 'quests', {id: 'swipe-quest', name: 'The rejected quest', status: 'Active',
                objectives: [{id: 'swipe-objective', title: 'The rejected objective', status: 'Pending'}]}],
        ], 'A first response proposes a promise, an appointment and a new quest.',
        {...scene, day: 64, dayName: 'Day 64', time: '18:01'});
        current = await state(page);
        assert.equal(current.storyMemories.length, 2);
        assert.equal(current.storyAgenda.length, 3);
        assert.equal(current.quests.length, 2);
        await page.evaluate(({id, scene}) => {
            const message = window.host.chat[id];
            const next = `A replacement response establishes none of the rejected records.\n<!--tretaresia_patch:${JSON.stringify({sceneTracker: scene, ops: []})}-->`;
            message.swipes = [message.mes, next]; message.swipe_id = 1; message.mes = next;
            return window.host.eventSource.emit(window.host.eventTypes.MESSAGE_SWIPED, id);
        }, {id: swipeId, scene: {...scene, day: 64, dayName: 'Day 64', time: '18:01'}});
        await page.waitForFunction(id => {
            const entry = window.host.chatMetadata.tretaresia_rpg_turn_history?.entries
                .find(entry => entry.messageId === id);
            return entry?.applied && entry.activeVariant.startsWith('1:')
                && !window.host.chat[id].mes.includes('tretaresia_patch');
        }, swipeId);
        current = await state(page);
        assert.equal(current.storyMemories.length, 1, 'Swiping replaces facts from the rejected response');
        assert.equal(current.storyAgenda.length, 2, 'Swiping replaces reminders from the rejected response');
        assert.equal(current.quests.length, 1, 'Swiping replaces quest objectives with their rejected quest');
        assert.equal(current.storyMemories[0].pinned, true, 'Earlier manual edits survive replacement of a later turn');
        assert.equal(current.progression.currency.gold, 6);

        await page.evaluate(async () => {
            window.host.chat = [];
            await window.hStatsPreview.switchChat('story-systems-other-chat', {tretaresia_rpg_state: {
                player: {name: 'Other adventurer'}, npcs: [], storyMemories: [], storyAgenda: [], quests: [],
            }});
        });
        current = await state(page);
        assert.equal(current.storyMemories.length, 0, 'Memories are isolated to their chat');
        assert.equal(current.storyAgenda.length, 0, 'Agenda is isolated to its chat');
        assert.equal(current.quests.length, 0, 'Quest checklists are isolated to their chat');
        assert.deepEqual(errors, [], `Production runtime errors at ${width}px`);
        console.log(`PASS production story memories, escaped prose/provenance, required quest checklist, single reward, narrative deadlines, manual edits, Thai/English, reload, swipe rollback and chat isolation at ${width}px`);
        await page.close();
    }
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
