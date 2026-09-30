// Actual production loader, message events, persisted metadata and UI.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/rewards-location.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = new URL('../', import.meta.url);
const base = '/scripts/extensions/third-party/rpg-systems/';
const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith('/api/')) {
            res.setHeader('content-type', 'application/json'); res.end('[]'); return;
        }
        if (!url.pathname.startsWith(base) || url.pathname.includes('..')) {
            res.writeHead(404).end(); return;
        }
        const path = url.pathname.slice(base.length);
        const data = await readFile(new URL(path, root));
        res.setHeader('content-type', path.endsWith('.css') ? 'text/css'
            : path.endsWith('.html') ? 'text/html' : path.endsWith('.json') ? 'application/json'
                : /\.(m?js)$/.test(path) ? 'text/javascript' : 'image/webp');
        res.end(data);
    } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const artifacts = process.env.REWARDS_LOCATION_SCREENSHOT_DIR || '/workspace/artifacts';
await mkdir(artifacts, {recursive:true});

const place = 'Gaia Manor - Girls’ Bedroom';
const scene = {
    dayName:'Day 63', day:63, month:'September', year:'2026', era:'CE', calendar:'Story calendar',
    time:'00:15', period:'Night', season:'Autumn', location:place,
    region:'Eastern Vale · Aster · Aster', continent:'Aster', position:'Inside the bedroom',
    weather:'Rain', temperature:17, lighting:'Lamp light', participants:['Nova','Ashe'],
    objective:'Rest after the escort mission', safety:'Safe', atmosphere:'Quiet', elapsed:'8m',
};

async function drawChat(page) {
    await page.evaluate(() => {
        const chat = document.getElementById('chat');
        chat.replaceChildren(...window.host.chat.map((message, index) => {
            const row = document.createElement('div'); row.className = 'mes'; row.setAttribute('mesid', index);
            const content = document.createElement('div'); content.className = 'mes_text'; content.textContent = message.mes;
            row.append(content); return row;
        }));
    });
}

async function receive(page, patch, story) {
    const id = await page.evaluate(({patch, story}) => {
        const id = window.host.chat.length;
        window.host.chat.push({name:'Narrator', is_user:false, is_system:false,
            mes:`${story}\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`});
        return id;
    }, {patch, story});
    await drawChat(page);
    await page.evaluate(id => window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED, id, 'normal'), id);
    await page.waitForFunction(id => Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history || {})
        .some(key => key.startsWith(`${id}:`)) && !window.host.chat[id].mes.includes('tretaresia_patch'), id);
    await page.waitForFunction(id => document.querySelector(`#chat .mes[mesid="${id}"] .trpg-scene-ledger`), id);
    await page.evaluate(() => localStorage.setItem('roleforge-rewards-location-test-chat', JSON.stringify(window.host.chat)));
    return id;
}

async function state(page) { return page.evaluate(() => window.host.chatMetadata.tretaresia_rpg_state); }

async function assertLocation(page, id, expectedRegion) {
    const stored = await state(page);
    assert.equal(stored.location.place, place);
    assert.equal(stored.location.region, expectedRegion);
    assert.equal(stored.location.continent, expectedRegion ? 'Aster' : '');
    assert.equal(Object.hasOwn(stored.location, 'mapX'), false);
    assert.equal(Object.hasOwn(stored.location, 'pins'), false);
    assert.equal(Object.hasOwn(stored, 'world'), false);
    const footer = (await page.locator('#tretaresia-context-label').innerText()).trim();
    assert.equal(footer, expectedRegion ? `Eastern Vale · Aster · ${place}` : place);
    const card = page.locator(`#chat .mes[mesid="${id}"] .trpg-scene-ledger`);
    assert.equal(await card.locator('.trpg-scene-hero > div:first-child > strong').innerText(), place);
    assert.equal(await card.locator('.trpg-scene-hero > div:first-child > span').innerText(), expectedRegion ? 'Eastern Vale · Aster' : '—');
    assert.doesNotMatch(await card.innerText(), /Central Crown|Central Continent|Aster · Aster/);
}

let browser;
try {
    browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE || undefined,
        args:['--no-sandbox', '--disable-dev-shm-usage']});
    for (const width of [390, 1280]) {
        const page = await browser.newPage({viewport:{width, height:950}, reducedMotion:'reduce'});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType:'text/css', body:''}));
        await page.addInitScript(({place}) => {
            if (localStorage.getItem('roleforge-hstats-preview-metadata')) return;
            localStorage.setItem('roleforge-hstats-preview-settings', JSON.stringify({tretaresia_rpg:
                {language:'en', autoTrack:true, autoContinuity:false, chatPresentation:false, showSceneTracker:true}}));
            const metadata = {tretaresia_rpg_state:{
                npcs:[],
                player:{name:'Nova'}, progression:{currency:{gold:0, silver:0, copper:120}},
                quests:[{id:'escort', name:'Urgent Merchant Caravan Escort', type:'Quest', status:'Active', rewardClaimed:false}],
                location:{atlasVersion:4, place:'Central Crown', detail:place,
                    region:'Central Continent · Central Continent · Central Continent', continent:'Central Continent', mapX:100, mapY:200, pins:[{id:'old-pin'}]},
                world:{id:'present-world'}, onboarding:{locationSeeded:true},
            }};
            // A saved scene from before migration must not retain the seeded geography.
            metadata.tretaresia_rpg_scene_history = {legacy:{old:{location:place,
                region:'Central Continent · Central Continent', continent:'Central Continent'}}};
            localStorage.setItem('roleforge-hstats-preview-metadata', JSON.stringify(metadata));
        }, {place});
        await page.goto(url);
        await page.waitForFunction(() => window.hStatsPreview?.ready
            && document.querySelector('#tretaresia-rpg-overlay.is-open.is-ready'));
        await page.evaluate(() => {
            window.host.chat = [{name:'Nova', is_user:true, is_system:false, mes:'Collect the agreed reward and rest.'}];
            return window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);
        });
        await page.evaluate(() => document.querySelector('[data-tab="scene"]').click());
        try {
            await page.waitForFunction(place => document.querySelector('#tretaresia-context-label')?.innerText.trim() === place, place);
        } catch (error) {
            console.error('Initial location diagnostic', await page.evaluate(() => ({
                footer:document.querySelector('#tretaresia-context-label')?.innerText,
                location:window.host.chatMetadata.tretaresia_rpg_state?.location,
                onboarding:window.host.chatMetadata.tretaresia_rpg_state?.onboarding,
            })), errors);
            throw error;
        }
        assert.equal(await page.evaluate(() => window.host.chatMetadata.tretaresia_rpg_scene_history.legacy.old.region), '');
        assert.equal(await page.evaluate(() => window.host.chatMetadata.tretaresia_rpg_scene_history.legacy.old.continent), '');

        const firstId = await receive(page, {sceneTracker:scene, ops:[
            ['upsert','quests',{id:'escort', name:'Urgent Merchant Caravan Escort', status:'Completed'}],
            ['inc','progression.currency.gold',6,{category:'quest-reward', questId:'escort', reason:'Fair share from Urgent Merchant Caravan Escort quest'}],
        ]}, 'You receive your six gold coins for the completed caravan escort and rest at Gaia Manor.');
        let current = await state(page);
        assert.equal(current.progression.currency.gold, 6);
        assert.equal(current.transactions.length, 1);
        assert.equal(current.transactions[0].questId, 'escort');
        assert.equal(current.questRewardReceipts.length, 1);
        assert.equal(current.quests[0].rewardClaimed, true);
        await assertLocation(page, firstId, 'Eastern Vale');

        await page.evaluate(() => window.host.chat.push({name:'Nova', is_user:true, is_system:false, mes:'Continue resting here.'}));
        const secondId = await receive(page, {sceneTracker:scene, ops:[
            ['inc','progression.currency.gold',7,{category:'quest-reward', reason:'Caravan escort mission reward share'}],
        ]}, 'The narrator mentions the caravan escort mission reward share again.');
        current = await state(page);
        assert.equal(current.progression.currency.gold, 6, 'A differently worded reward cannot pay the same quest again');
        assert.equal(current.transactions.length, 1);
        await assertLocation(page, secondId, 'Eastern Vale');

        await page.evaluate(() => document.querySelector('[data-tab="rank"]').click());
        const rank = page.locator('[data-panel="rank"]');
        assert.equal(await rank.locator('.tretaresia-wallet > div:first-child strong').innerText(), '6');
        await rank.locator('.tretaresia-transactions summary').click();
        assert.equal(await rank.locator('.tretaresia-transactions article').count(), 1);
        assert.match(await rank.locator('.tretaresia-transactions article').innerText(), /\+6 Gold coins/);
        assert.equal(await page.locator('[data-tab="map"],[data-panel="map"],[data-tab="worldmap"],[data-panel="worldmap"],.tretaresia-worldmap').count(), 0);
        await page.evaluate(() => document.querySelector('[data-tab="scene"]').click());
        const scenePanel = page.locator('[data-panel="scene"]');
        assert.equal(await scenePanel.locator('[name="mapX"],[name="mapY"],[name="atlasVersion"]').count(), 0);
        assert(await scenePanel.locator('[data-form="scene-map"]').count() > 0, 'Local room structure remains available');

        await page.reload();
        await page.waitForFunction(() => window.hStatsPreview?.ready);
        await page.evaluate(() => {
            window.host.chat = JSON.parse(localStorage.getItem('roleforge-rewards-location-test-chat'));
            return window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);
        });
        await drawChat(page);
        current = await state(page);
        assert.equal(current.progression.currency.gold, 6);
        assert.equal(current.questRewardReceipts.length, 1, 'The payment receipt survives a real reload');
        await page.evaluate(() => window.host.chat.push({name:'Nova', is_user:true, is_system:false, mes:'Remain in the room.'}));
        const reloadedId = await receive(page, {sceneTracker:scene, ops:[
            ['set','progression.currency.gold',13,{category:'currency', questId:'escort', reason:'Escort payout balance'}],
            ['inc','progression.currency.gold',7,{category:'quest-reward', reason:'Caravan escort mission reward share'}],
        ]}, 'The same escort reward is mentioned after reloading.');
        current = await state(page);
        assert.equal(current.progression.currency.gold, 6, 'Reload and a SET balance cannot bypass the receipt');
        assert.equal(current.transactions.length, 1);
        assert.equal(current.questRewardReceipts.length, 1);
        await assertLocation(page, reloadedId, 'Eastern Vale');
        await page.evaluate(() => document.querySelector('[data-tab="rank"]').click());
        await rank.locator('.tretaresia-transactions summary').click();
        await page.screenshot({path:`${artifacts}/rewards-location-${width === 390 ? 'mobile' : 'desktop'}.png`});
        assert.deepEqual(errors, [], `Production runtime errors at ${width}px`);
        console.log(`PASS real MESSAGE_RECEIVED quest payout, paraphrase/SET/reload deduplication, legacy location cleanup, scene/footer UI and World Map removal at ${width}px`);
        await page.close();
    }
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
