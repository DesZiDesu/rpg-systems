import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const base = 'http://127.0.0.1:18182';
const out = process.env.DN_ARTIFACTS || '/workspace/artifacts/death-note-close-v0.81.1';
const DRAFT = 'DEATH_NOTE_CLOSE_UNSENT_DRAFT';
const names = ['Elias Voss', 'Mara Hale', 'Silas Vale', 'Ada North'];
const deferred = () => {let resolve; const promise = new Promise(r => {resolve = r;}); return {promise, resolve};};
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
const report = {realSillyTavern: true, liveModel: false, controlledDelayedSSE: true, theme: 'Dark Lite', devices: [], errors: []};
let p, device, pending;
const book = () => p.locator('#roleforge-death-note-preview');
const dock = () => p.locator('#roleforge-death-note-dock');
const press = locator => device === 'mobile' ? locator.tap() : locator.click();

async function ready() {
    await p.waitForFunction(() => document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation && globalThis.RoleForgeWorkshop, {}, {timeout: 120000});
    await p.evaluate(() => {
        window.__dnCloseReady = false;
        const c = SillyTavern.getContext();
        c.eventSource.on(c.eventTypes.APP_READY, () => {window.__dnCloseReady = true;});
    });
    const loaded = p.waitForFunction(() => window.__dnCloseReady, {}, {timeout: 120000});
    const welcome = p.locator('dialog.popup').filter({hasText: 'Welcome to SillyTavern!'}).locator('.popup-button-ok');
    await Promise.race([loaded, welcome.click({timeout: 120000}).then(() => loaded)]);
}

function fixture(title) {
    return {spec: 'chara_card_v2', spec_version: '2.0', data: {
        name: title, description: 'Independent fictional adult thriller test. Every character is over 30.',
        personality: '', scenario: '', mes_example: '',
        first_mes: '<tr-narrative>ฝนตกนอกหน้าต่าง คุณเปิดสมุดปกดำในห้องทำงาน ทุกคนในคดีเป็นมนุษย์ที่คุณเคยเห็นใบหน้าแล้ว</tr-narrative>',
        extensions: {
            roleforge_death_note: {format: 'roleforge-death-note-rules', version: 1, knownFaces: Object.fromEntries(names.map((_, i) => ['person-' + i, true]))},
            roleforge_character_pack: {format: 'roleforge-character-pack', version: 1,
                systems: {autoTrack: true, enableMemorySummaries: false, eventNotifications: false},
                initialState: {
                    player: {name: 'Nox', age: '34'},
                    inventory: [{id: 'death-note-book', name: 'Death Note', quantity: 1, category: 'Artifact', properties: ['roleforge:addon:death-note']}],
                    npcs: names.map((name, i) => ({id: 'person-' + i, name, age: '36', race: 'Human', met: true, enabled: true, stats: {hp: 100}})),
                    worldClock: {day: 1, time: '20:15'}, location: {place: 'ห้องทำงาน', region: 'Tokyo', continent: 'Japan', narrativeVersion: 1},
                    onboarding: {identitySeeded: true, locationSeeded: true, loadoutSeeded: true}
                }
            }
        }
    }};
}

async function prepare() {
    console.log('Loading SillyTavern', device);
    await p.goto(base); await ready();
    console.log('Host ready', device);
    report.roleForgeVersion = await p.evaluate(() => globalThis.TretaresiaRelease);
    report.hostVersion = await (await p.request.get(base + '/version')).json();
    await p.selectOption('#themes', 'Dark Lite', {force: true});
    await p.selectOption('#tretaresia-rpg-language', 'th', {force: true});
    const title = 'Death Note close regression · ' + device + ' · ' + Date.now();
    await p.evaluate(async card => {
        const c = SillyTavern.getContext(), f = new FormData();
        f.set('file_type', 'json'); f.set('avatar', new File([JSON.stringify(card)], 'death-note-close.json', {type: 'application/json'}));
        const r = await fetch('/api/characters/import', {method: 'POST', headers: c.getRequestHeaders({omitContentType: true}), body: f});
        if (!r.ok || (await r.json()).error) throw Error('Card import failed');
        const host = await import('/script.js'); await host.getCharacters();
        await host.selectCharacterById(String(c.characters.findIndex(v => v.name === card.data.name)));
    }, fixture(title));
    await p.waitForFunction(() => RoleForgeWorkshop.debug().key.endsWith('::' + SillyTavern.getContext().getCurrentChatId()));
    await p.locator('#send_textarea').fill(DRAFT);
    await p.evaluate(() => RoleForgeWorkshop.open());
    const ws = p.locator('#roleforge-workshop');
    await ws.locator('[data-ws-search]').fill('Death Note');
    await press(ws.locator('[data-ws-action=detail][data-id=death-note]'));
    for (const action of ['update', 'install']) {
        const button = ws.locator('[data-ws-action=' + action + '][data-id=death-note]');
        if (await button.count()) await press(button);
    }
    await ws.locator('[data-ws-enable=death-note]').check();
    await p.waitForFunction(() => RoleForgeWorkshop.debug().enabled.includes('death-note'));
    await press(ws.locator('[data-ws-action=open-addon][data-id=death-note]'));
    await book().waitFor({state: 'visible'});
    await backend();
    console.log('Notebook ready', device);
    return title;
}

async function backend() {
    await p.evaluate(async () => {
        const host = await import('/script.js'), o = await import('/scripts/openai.js');
        host.changeMainAPI('openai');
        Object.assign(o.oai_settings, {chat_completion_source: 'custom', custom_url: 'http://127.0.0.1:18182/death-note-controlled-fixture', custom_model: 'death-note-close', stream_openai: true, openai_max_context: 32768, openai_max_tokens: 1600});
        host.setOnlineStatus('Death Note controlled close regression');
    });
}

async function openWrite() {await p.evaluate(() => RoleForgeDeathNote.open('write')); await book().waitFor({state: 'visible'});}
async function writeName(surface, name) {
    await press(surface.locator('[data-dn-paper]'));
    await surface.locator('.is-selected textarea').fill(name);
    await press(surface.locator('[data-paper-edit=accept]'));
}
async function newPage() {
    await press(book().locator('[data-dn-action=paper-next]').first());
    await p.waitForFunction(() => !RoleForgeDeathNote.debug().working);
}
async function start(surface, name, fail = false) {
    assert(!pending, 'only one request may be active');
    const before = await p.evaluate(() => {
        const c = SillyTavern.getContext();
        return {users: c.chat.filter(m => m.is_user).length, messages: c.chat.length, text: c.chat.at(-1).mes};
    });
    pending = {arrived: deferred(), release: deferred(), name, fail, before};
    await press(surface.locator('[data-dn-action=paper-inscribe]'));
    let timer;
    try {await Promise.race([pending.arrived.promise, new Promise((_, reject) => {timer = setTimeout(() => reject(Error('No native Continue request for ' + name)), 30000);})]);}
    finally {clearTimeout(timer);}
    console.log('AI request waiting', device, name, fail ? '(controlled failure)' : '');
    assert.equal(await p.evaluate(() => RoleForgeDeathNote.debug().working), true);
    return pending;
}
async function closeNow() {
    await press(book().locator('[data-dn-action=close]'));
    await book().waitFor({state: 'hidden', timeout: 1500});
    assert.equal(await p.evaluate(() => RoleForgeDeathNote.debug().working), true, 'closing does not cancel generation');
    assert(await p.locator('#chat').isVisible(), 'the chat remains readable while waiting');
}
async function finish(task) {
    task.release.resolve();
    await p.waitForFunction(() => !RoleForgeDeathNote.debug().working);
    if (!task.fail) await p.waitForFunction(name => RoleForgeDeathNote.records().some(e => e.name === name && e.status === 'resolved'), task.name);
    const result = await p.evaluate(() => {
        const c = SillyTavern.getContext();
        return {users: c.chat.filter(m => m.is_user).length, messages: c.chat.length, text: c.chat.at(-1).mes, state: c.chatMetadata.tretaresia_rpg_state, entries: RoleForgeDeathNote.records(), prompt: c.extensionPrompts.roleforge_death_note_write_preview?.value};
    });
    assert.equal(result.users, task.before.users, 'no User turn is sent');
    assert.equal(result.messages, task.before.messages, 'the previous AI reply is continued');
    assert(result.text.startsWith(task.before.text), 'the existing roleplay is preserved');
    assert.equal(await p.locator('#send_textarea').inputValue(), DRAFT);
    assert(!result.prompt, 'the transient action prompt is cleared');
    if (task.fail) {
        assert.equal(result.entries.filter(e => e.name === task.name).length, 0, 'a failed empty reply is retryable');
    } else {
        assert.equal(result.entries.filter(e => e.name === task.name).length, 1, 'the result is saved once');
        assert.equal(result.state.npcs.find(n => n.name === task.name).stats.hp, 0);
    }
    pending = null;
}

try {
    for (const mobile of [false, true]) {
        device = mobile ? 'mobile' : 'desktop';
        const ctx = await browser.newContext({viewport: {width: mobile ? 390 : 1440, height: mobile ? 844 : 1000}, hasTouch: mobile, isMobile: mobile});
        p = await ctx.newPage(); p.setDefaultTimeout(30000);
        p.on('pageerror', e => report.errors.push({device, error: e.message}));
        await p.route('**/api/horde/**', route => route.fulfill({json: []}));
        await p.route('**/api/backends/chat-completions/generate', async route => {
            const task = pending;
            assert(task, 'unexpected generation');
            const messages = route.request().postDataJSON().messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
            assert(!messages.includes(DRAFT));
            task.request = JSON.parse([...messages.matchAll(/INSCRIPTION: (\{[^\n]+\})/gu)].at(-1)[1]);
            assert.equal(task.request.name, task.name);
            task.arrived.resolve();
            await task.release.promise;
            if (task.fail) {await route.fulfill({status: 503, json: {error: {message: 'Controlled temporary failure'}}}); return;}
            const evidence = task.name + ' has died after forty seconds.';
            const text = '\n<tr-narrative>' + evidence + '</tr-narrative><!--roleforge_death_note:' + JSON.stringify({requestId: task.request.id, status: 'resolved', elapsedSeconds: 40, evidence}) + '-->';
            await route.fulfill({contentType: 'text/event-stream', body: 'data: ' + JSON.stringify({choices: [{index: 0, delta: {content: text}, finish_reason: null}]}) + '\n\ndata: [DONE]\n\n'});
        });
        const title = await prepare(); await openWrite(); await writeName(book(), names[0]);
        let task = await start(book(), names[0]);
        await closeNow(); await p.screenshot({path: out + '/' + device + '-closed-while-generating.png'});
        await finish(task); assert.equal(await book().isVisible(), false);

        await openWrite(); await newPage(); await writeName(book(), names[1]);
        task = await start(book(), names[1]);
        await press(book().locator('[data-dn-action=dock]'));
        await book().waitFor({state: 'hidden', timeout: 1500});
        await dock().waitFor({state: 'visible'});
        await press(dock().locator('[data-dn-action=minimize]'));
        assert(await p.locator('.rf-composer-dock.is-minimized').count(), 'dock can minimize while AI waits');
        await finish(task);
        assert(await p.locator('.rf-composer-dock.is-minimized').count(), 'completion leaves dock minimized');

        await openWrite(); await newPage(); await writeName(book(), names[2]);
        await press(book().locator('[data-dn-action=dock]'));
        task = await start(dock(), names[2]);
        await press(dock().locator('[data-dn-action=fullscreen]'));
        await book().waitFor({state: 'visible'});
        assert.equal(await book().locator('[data-dn-action=paper-inscribe]').isDisabled(), true, 'reopening cannot submit twice');
        assert.equal(await book().locator('.is-selected textarea').count(), 0, 'pending paper is read-only');
        await closeNow();
        await press(p.locator('[data-addon-launch=death-note]'));
        await book().waitFor({state: 'visible'});
        assert.equal(await book().getAttribute('data-page'), 'write', 'the addon launcher returns to pending paper');
        assert.equal(await book().locator('[data-dn-action=paper-inscribe]').isDisabled(), true);
        await closeNow();
        await press(dock().locator('[data-dn-action=hide-dock]'));
        await dock().waitFor({state: 'detached', timeout: 1500});
        await finish(task);
        await p.waitForTimeout(1100);
        assert.equal(await dock().count(), 0, 'completion must not resurrect a closed dock');
        assert.equal(await book().isVisible(), false);

        await openWrite(); await newPage(); await writeName(book(), names[3]);
        task = await start(book(), names[3], true); await closeNow(); await finish(task);
        assert.equal(await book().isVisible(), false, 'an error does not reopen the notebook');
        await openWrite();
        assert((await book().locator('[data-dn-paper]').innerText()).includes(names[3]), 'failed ink is retained');
        task = await start(book(), names[3]); await closeNow(); await finish(task);
        const saved = await p.evaluate(() => ({entries: RoleForgeDeathNote.records(), paper: RoleForgeDeathNote.debug().paper}));
        await p.reload(); await ready();
        await p.evaluate(async name => {
            const c = SillyTavern.getContext();
            await (await import('/script.js')).selectCharacterById(String(c.characters.findIndex(v => v.name === name)));
        }, title);
        await p.waitForFunction(() => RoleForgeWorkshop.debug().key.endsWith('::' + SillyTavern.getContext().getCurrentChatId()));
        await p.waitForFunction(() => globalThis.RoleForgeDeathNote?.debug().enabled);
        const restored = await p.evaluate(() => ({entries: RoleForgeDeathNote.records(), paper: RoleForgeDeathNote.debug().paper, hp: SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.npcs.map(n => n.stats.hp)}));
        assert.deepEqual(restored.entries, saved.entries); assert.deepEqual(restored.paper, saved.paper);
        assert(restored.hp.every(hp => hp === 0));
        report.devices.push({device, touchEmulation: mobile, closeWhileWaiting: true, continueOriginalAIReply: true, modalStaysClosed: true, dockMinimizePersists: true, dockClosePersists: true, reopenReadOnly: true, launcherReturnsToPendingPaper: true, duplicateSubmissionBlocked: true, noUserMessage: true, unsentDraftPreserved: true, failedRequestRetry: true, reloadPersists: true});
        console.log('PASS close during native Continue', device);
        await ctx.close();
    }
    assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) {
    report.failure = error.stack; process.exitCode = 1; console.error(error);
    if (p && !p.isClosed()) await p.screenshot({path: out + '/failed.png'});
} finally {
    pending?.release.resolve();
    await writeFile(out + '/validation.json', JSON.stringify(report, null, 2));
    await browser.close();
}
