import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {H_FIELDS} from '../src/h-stats.js';
import {normalizeRelationships, relationshipPreset} from '../src/relationship-core.js';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const base = process.env.ST_REAL_URL || 'http://127.0.0.1:18182';
const out = process.env.HSTATS_BRANCH_ARTIFACTS || '/workspace/artifacts/hstats-branches-real';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
await mkdir(out, {recursive: true});
const version = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url))).version;
const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
const report = {version, host: 'Actual local SillyTavern', theme: 'Dark Lite', controlledReplies: true, liveProviderTest: false, privateChatImported: false, allNewFixturesAdults: true, requests: [], checks: [], errors: []};
let p, replies = [];
const state = () => p.evaluate(() => structuredClone(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state));
const metadata = () => p.evaluate(() => structuredClone(SillyTavern.getContext().chatMetadata));
const pair = (s, actorId = 'noor', targetId = 'player') => s.relationships.links.find(l => l.actorId === actorId && l.targetId === targetId);
const npc = (s, id = 'noor') => s.npcs.find(n => n.id === id);
const progress = s => ({player: s.player, npcs: s.npcs, relationships: s.relationships, inventory: s.inventory, progression: s.progression});
async function ready() {
  await p.waitForFunction(() => document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation && document.getElementById('tretaresia-npc-wand-launcher')?.onclick, {}, {timeout: 120000});
  await p.evaluate(() => {window.__hstatsBranchReady = false; const c = SillyTavern.getContext(); c.eventSource.on(c.eventTypes.APP_READY, () => __hstatsBranchReady = true);});
  const loaded = p.waitForFunction(() => __hstatsBranchReady, {}, {timeout: 120000});
  const welcome = p.locator('dialog.popup').filter({hasText: 'Welcome to SillyTavern!'}).locator('.popup-button-ok');
  await Promise.race([loaded, welcome.click({timeout: 120000}).then(() => loaded)]);
}
async function settings() {
  await p.locator('#extensions-settings-button .drawer-toggle').click();
  if (!await p.locator('#tretaresia-rpg-settings .inline-drawer-content').isVisible()) await p.locator('#tretaresia-rpg-settings .inline-drawer-toggle').click();
  for (const [selector, value] of [['#tretaresia-rpg-language', 'th'], ['#tretaresia-rpg-auto-track', true], ['#tretaresia-rpg-auto-continuity', true], ['#tretaresia-rpg-hstats-composer', true]]) {
    const n = p.locator(selector);
    await n.evaluate(n => document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.reveal(n));
    if (typeof value === 'boolean') await n.setChecked(value); else await n.selectOption(value);
  }
  await p.locator('#extensions-settings-button .drawer-toggle').click();
}
async function importCard(card) {
  await p.evaluate(async card => {
    const c = SillyTavern.getContext(), f = new FormData(); f.set('file_type', 'json');
    f.set('avatar', new File([JSON.stringify(card)], 'hstats-branch-fixture.json', {type: 'application/json'}));
    const r = await fetch('/api/characters/import', {method: 'POST', headers: c.getRequestHeaders({omitContentType: true}), body: f});
    if (!r.ok || (await r.json()).error) throw Error('Native card import failed');
    await (await import('/script.js')).getCharacters();
  }, card);
}
async function select(title) {
  await p.evaluate(async title => {const c = SillyTavern.getContext(); await (await import('/script.js')).selectCharacterById(String(c.characters.findLastIndex(n => n.name === title)));}, title);
  await p.waitForTimeout(600);
}
async function open(chatId) {await p.evaluate(async id => (await import('/script.js')).openCharacterChat(id), chatId); await p.waitForTimeout(600);}
async function main() {await p.locator('#tretaresia-rpg-open-from-settings').evaluate(n => n.click()); await p.locator('[data-tab=hstats]').evaluate(n => n.click()); await p.locator('[data-panel=hstats].is-active').waitFor();}
async function closeMain() {await p.locator('#tretaresia-rpg-close').evaluate(n => n.click());}
async function dock() {
  if (await p.locator('[data-dock-panel=hstats]').count()) await p.locator('[data-dock-panel=hstats]').click();
  else {await p.locator('[data-dock-picker]').click(); await p.locator('[data-dock-choice=hstats]').click();}
  await p.locator('.rf-hstats-dossier').waitFor();
}
async function actor(id) {
  const picker = p.locator('.rf-hstats-dossier .rf-utility-profile-picker');
  if (!await picker.evaluate(n => n.open)) await picker.locator('summary').click();
  await picker.locator('[data-utility-person=' + id + ']').click();
}
async function target(id) {
  const root = p.locator('.rf-hstats-dossier');
  await root.locator('[data-rel-action=choose]').click();
  await root.locator('[data-rel-action=target][data-rel-id=' + id + ']').click();
}
async function metric(key, surface = '.rf-hstats-dossier') {
  const n = p.locator(surface + ' [data-rel-metric=' + key + '] strong');
  await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  return Number((await n.innerText()).split('/')[0].trim());
}
async function shot(name) {
  await p.waitForTimeout(200);
  await p.evaluate(() => {toastr.remove(); document.querySelectorAll('.tretaresia-toast,.tretaresia-event-toast').forEach(n => n.remove());});
  await p.screenshot({path: out + '/' + name + '.png'});
}
function scene(i) {return {dn: 'Day ' + i, d: i, mo: 'Autumn', yr: '1286', er: 'Common Era', cal: 'Lunar', t: '10:00', per: 'Morning', se: 'Autumn', loc: 'Research Hall ' + i, reg: 'Oakland', con: 'Story Realm', pos: 'By the table', w: 'Clear', temp: 22, light: 'Daylight', who: ['Noor', 'Rowan'], goal: 'Review the research notes', safe: 'Safe', mood: 'Calm', dt: '0m'};}
function support(amount = 1) {
  return [
    {actorId: 'noor', targetId: 'player', kind: 'support', evidence: 'Noor ไว้วางใจเอลิอันมากขึ้นหลังจากการสนทนา', changes: {trust: amount}},
    {actorId: 'rowan', targetId: 'noor', kind: 'support', evidence: 'Rowan trusts Noor more after their conversation', changes: {trust: amount}},
  ];
}
function romance() {return [{actorId: 'noor', targetId: 'player', kind: 'romance', evidence: 'Noor loves Elian and feels affection for Elian', changes: {love: 1, interest: 1}}];}
// Independent adult medical-history fixtures; no private roleplay is imported or replayed.
function history() {return [{actorId: 'noor', targetId: 'rowan', kind: 'history', evidence: 'Noor gave birth with Rowan confirmed as the other parent and Noor is no longer pregnant', hStats: [{ownerId: 'noor', field: 'birthCount', verb: 'inc', value: 1}, {ownerId: 'noor', field: 'pregnant', verb: 'set', value: false}, {ownerId: 'noor', field: 'pregnancyFather', verb: 'set', value: 'Rowan'}]}];}
function reply(i, events = [], ops = []) {
  const text = events.map(e => e.evidence + '.').join(' ') || 'Noor and Rowan quietly review the notes.';
  return '<tr-narrative>' + text + '</tr-narrative><!--tretaresia_patch:' + JSON.stringify({sceneTracker: scene(i), ops, relationshipEvents: events}) + '-->';
}
async function generate(text) {
  replies.push(text);
  await p.locator('#send_textarea').fill('We continue the conversation on the next recorded occasion.');
  await p.evaluate(() => SillyTavern.getContext().generate('normal'));
  const id = await p.evaluate(() => SillyTavern.getContext().chat.length - 1);
  await p.waitForFunction(id => SillyTavern.getContext().chatMetadata.tretaresia_rpg_turn_history?.entries?.some(e => e.messageId === id && e.applied), id);
  await p.waitForTimeout(300); await p.evaluate(() => SillyTavern.getContext().saveChat());
  assert.deepEqual(await p.evaluate(() => window.__hstatsBranchWarnings || []), []);
  return id;
}
async function configureBackend() {
  await p.evaluate(async () => {
    const host = await import('/script.js'), o = await import('/scripts/openai.js'); host.changeMainAPI('openai');
    Object.assign(o.oai_settings, {chat_completion_source: 'custom', custom_url: 'http://127.0.0.1:18182/local-branch-fixture', custom_model: 'branch-fixture', stream_openai: true, openai_max_context: 32768, openai_max_tokens: 1800}); host.setOnlineStatus('local-fixture');
    window.__hstatsBranchWarnings = []; const original = toastr.warning;
    toastr.warning = function (message, title, ...rest) {if (title === 'RoleForge') __hstatsBranchWarnings.push(String(message)); return original.call(this, message, title, ...rest);};
  });
}
async function swipe(id, text, index) {
  await p.evaluate(async ({id, text, index}) => {
    const c = SillyTavern.getContext(), m = c.chat[id], host = await import('/script.js');
    if (text) {m.swipes = [m.mes, text]; m.swipe_info = [{send_date: m.send_date, extra: structuredClone(m.extra)}, {send_date: new Date().toISOString(), extra: {}}];}
    host.syncSwipeToMes(id, index); await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED, id); await c.eventSource.emit(c.eventTypes.CHARACTER_MESSAGE_RENDERED, id);
  }, {id, text, index});
  await p.waitForTimeout(700); await p.evaluate(() => SillyTavern.getContext().saveChat());
}
async function checkDock(expected) {
  await p.locator('[data-utility-h-section=Summary]').click(); await actor('noor'); await target('player');
  assert.equal(await metric('trust'), expected.trust);
  assert.equal(await metric('love'), expected.love);
  assert.equal(await metric('interest'), expected.interest);
  await actor('rowan'); await target('noor'); assert.equal(await metric('trust'), expected.npcTrust);
  await actor('noor'); await target('player');
  await p.locator('[data-utility-h-section=History]').click();
  await p.locator('[data-utility-page=hstats][data-step="1"]').click();
  const births = p.locator('.rf-hd-records .rf-utility-h-fields > div').filter({has: p.locator('dt', {hasText: 'คลอดลูกกี่คน'})}).locator('dd');
  await births.scrollIntoViewIfNeeded(); assert.equal((await births.innerText()).trim(), String(expected.births));
  await p.locator('[data-utility-h-section=Summary]').click();
}
try {
  for (const mobile of [true, false]) {
    const device = mobile ? 'mobile' : 'desktop';
    const ctx = await browser.newContext({viewport: {width: mobile ? 390 : 1440, height: mobile ? 844 : 1000}, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce'});
    p = await ctx.newPage(); p.setDefaultTimeout(30000); p.on('pageerror', e => report.errors.push(e.message)); p.on('dialog', d => d.accept());
    await p.route('**/api/horde/**', r => r.fulfill({json: []}));
    await p.route('**/api/backends/chat-completions/generate', async r => {
      const text = replies.shift(); assert(text, 'No unrequested model generation');
      report.requests.push({device, contract: JSON.stringify(r.request().postDataJSON().messages).includes('RELATIONSHIP PROGRESSION / ALL PAIRS')});
      await r.fulfill({contentType: 'text/event-stream', body: 'data: ' + JSON.stringify({choices: [{index: 0, delta: {content: text}, finish_reason: null}]}) + '\n\ndata: [DONE]\n\n'});
    });
    await p.goto(base); await ready(); assert.equal(await p.evaluate(() => TretaresiaRelease), version);
    report.hostVersion = await (await p.request.get(base + '/version')).json(); await p.selectOption('#themes', 'Dark Lite', {force: true}); await settings();
    const title = 'HStats Branch Verification ' + device + ' ' + Date.now();
    const baseline = Object.fromEntries(H_FIELDS.map(f => [f.key, f.type === 'text' ? 'Not established' : f.type === 'boolean' ? false : f.type === 'stage' ? 1 : 0]));
    const relationships = normalizeRelationships({links: [{actorId: 'noor', targetId: 'player', love: 15, interest: 20, trust: 40, commitment: 50}, {actorId: 'rowan', targetId: 'noor', love: 10, interest: 10, trust: 10, commitment: 20}]});
    await importCard({spec: 'chara_card_v2', spec_version: '2.0', data: {name: title, description: 'Independent adult fixtures: Noor 28, Rowan 31, Elian 29. Nonsexual conversation and medical history.', personality: '', scenario: '', mes_example: '', first_mes: '<tr-narrative>Noor and Rowan review research notes.</tr-narrative>', extensions: {roleforge_character_pack: {format: 'roleforge-character-pack', version: 1, relationshipPreset: relationshipPreset({relationships}), initialState: {player: {name: 'Elian / เอลิอัน', age: '29', hStats: baseline}, npcs: [{id: 'noor', name: 'Noor', age: '28', enabled: true, met: true, trust: 40, affection: 15, loyalty: 50, hStats: baseline}, {id: 'rowan', name: 'Rowan', age: '31', enabled: true, met: true, trust: 10, hStats: baseline}], location: {place: 'Research Hall 0', narrativeVersion: 1}, onboarding: {identitySeeded: true, locationSeeded: true, loadoutSeeded: true}}}}}});
    await select(title); await main();
    for (const id of ['noor', 'rowan']) {await p.locator('[name=hStatsNpcId]').selectOption(id); await p.locator('[data-action=add-hstats-npc]').click();}
    await closeMain(); await dock();
    await configureBackend();
    const parent = await p.evaluate(() => SillyTavern.getContext().getCurrentChatId());
    await generate(reply(1, support()));
    const forkMessage = await generate(reply(2, romance())), forkState = await state();
    assert.equal(pair(forkState).trust, 41); assert.equal(pair(forkState).love, 16); assert.equal(pair(forkState).interest, 21);
    await generate(reply(3, support())); await generate(reply(4, history())); await generate(reply(5, support()));
    await generate(reply(6, [], [['inc', 'inventory', {id: 'future-only', name: 'FUTURE_ONLY_RECORD', quantity: 1, category: 'Item'}]]));
    const parentState = await state(); assert.equal(pair(parentState).trust, 43); assert.equal(npc(parentState).hStats.birthCount, 1);
    assert.equal((await metadata()).tretaresia_rpg_turn_history.entries.length, 3);
    await p.locator('.mes[mesid="' + forkMessage + '"] .mes_create_branch').evaluate(n => n.click());
    await p.waitForFunction(parent => SillyTavern.getContext().getCurrentChatId() !== parent && SillyTavern.getContext().chatMetadata.tretaresia_rpg_branch_restore?.status === 'restored', parent);
    await p.waitForTimeout(600);
    const child = await p.evaluate(() => SillyTavern.getContext().getCurrentChatId());
    assert.deepEqual(progress(await state()), progress(forkState), 'All H-Stats and pair budgets restore at the selected reply');
    assert(!JSON.stringify((await metadata()).tretaresia_rpg_branch_history).includes('FUTURE_ONLY_RECORD'));
    await dock(); await checkDock({trust: 41, love: 16, interest: 21, npcTrust: 11, births: 0}); await shot(device + '-branch-point');
    console.log(device, 'old Branch restored: trust 41, NPC pair trust 11, births 0');
    await generate(reply(7, [...support(), ...history()]));
    let s = await state(); assert.equal(pair(s).trust, 42); assert.equal(pair(s, 'rowan', 'noor').trust, 12); assert.equal(npc(s).hStats.birthCount, 1);
    assert.equal(s.player.hStats.birthCount, 0, 'NPC-only history does not change player counters'); assert.equal(npc(s, 'rowan').hStats.birthCount, 0);
    await checkDock({trust: 42, love: 16, interest: 21, npcTrust: 12, births: 1});
    await generate(reply(7, support())); assert.equal(pair(await state()).trust, 42, 'Repeated same-scene +1 remains capped, not treated as lost Branch progress');
    const beforeReload = progress(await state());
    await p.reload(); await ready(); await select(title); assert.equal(await p.evaluate(() => SillyTavern.getContext().getCurrentChatId()), child);
    assert.deepEqual(progress(await state()), beforeReload, 'Reload never replays the branch-point or new-reply patches');
    await dock();
    // Restore backend settings in memory after reload; only fixture calls are accepted.
    await configureBackend();
    const swipeId = await generate(reply(9, [...support(), ...romance(), ...history()]));
    s = await state(); assert.equal(pair(s).trust, 43); assert.equal(pair(s).love, 17); assert.equal(pair(s).interest, 22); assert.equal(npc(s).hStats.birthCount, 2);
    await checkDock({trust: 43, love: 17, interest: 22, npcTrust: 13, births: 2}); await shot(device + '-child-progress');
    await p.locator('[data-utility-manage=hstats]').click(); await p.locator('[data-panel=hstats].is-active').waitFor();
    await p.waitForFunction(() => document.querySelector('[data-panel=hstats] [data-rel-metric=trust] strong')?.textContent.trim().startsWith('43'));
    assert.equal(await metric('trust', '[data-panel=hstats]'), 43); assert.equal(await metric('love', '[data-panel=hstats]'), 17);
    await p.locator('[data-action=select-hstats-section][data-id=History]').click();
    const mainBirths = p.locator('.tretaresia-h-readout > div').filter({has: p.locator('span', {hasText: 'Births'})}).locator('strong');
    await mainBirths.scrollIntoViewIfNeeded(); assert.equal((await mainBirths.innerText()).trim(), '2'); await shot(device + '-main-history');
    await p.locator('[data-action=select-hstats-section][data-id=Body]').click(); await p.locator('[data-action=toggle-hstats-edit]').click();
    await p.locator('[data-form=npc-hstats] [name=mouthState]').fill('Recovered after treatment'); await p.locator('[data-form=npc-hstats] [type=submit]').click();
    await p.waitForFunction(() => SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.npcs.find(n => n.id === 'noor').hStats.mouthState === 'Recovered after treatment');
    await closeMain();
    await swipe(swipeId, reply(9, support(2)), 1);
    s = await state(); assert.equal(pair(s).trust, 44); assert.equal(pair(s, 'rowan', 'noor').trust, 14); assert.equal(npc(s).hStats.birthCount, 1, 'Alternative swipe replaces, never adds to previous reply');
    assert.equal(npc(s).hStats.mouthState, 'Recovered after treatment', 'Explicit saved dossier edits survive rollback');
    await swipe(swipeId, null, 0); s = await state(); assert.equal(pair(s).trust, 43); assert.equal(npc(s).hStats.birthCount, 2); assert.equal(npc(s).hStats.mouthState, 'Recovered after treatment');
    const afterSwipe = progress(s); await p.reload(); await ready(); await select(title); assert.deepEqual(progress(await state()), afterSwipe);
    await dock(); await configureBackend();
    await generate(reply(10, support())); s = await state(); assert.equal(pair(s).trust, 44); assert.equal(pair(s, 'rowan', 'noor').trust, 14); assert.equal(npc(s).hStats.birthCount, 2);
    await checkDock({trust: 44, love: 17, interest: 22, npcTrust: 14, births: 2}); await shot(device + '-after-reload');
    const childFinal = progress(s); await open(parent); assert.deepEqual(progress(await state()), progress(parentState), 'Playing the Branch never changes parent H-Stats');
    await open(child); assert.deepEqual(progress(await state()), childFinal, 'Switching chats restores the independent child');
    assert.equal(replies.length, 0); assert.deepEqual(await p.evaluate(() => window.__hstatsBranchWarnings || []), []);
    report.checks.push({device, nativeOldPointBranch: true, futureExcluded: true, initial: {trust: 41, npcTrust: 11, love: 16, interest: 21, births: 0}, final: {trust: 44, npcTrust: 14, love: 17, interest: 22, births: 2}, childProgresses: true, npcOnlyCountersIsolated: true, sameSceneRepeatLimit: true, freshSceneProgression: true, reloadNoReplay: true, progressionAfterReload: true, mainAndDockAgree: true, swipeReplacesCounters: true, manualBodyEditSurvivesSwipe: true, parentUnchanged: true});
    console.log('PASS H-Stats after native Branch', device); await ctx.close();
  }
  assert.equal(report.requests.length, 20); assert(report.requests.every(r => r.contract)); assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) {
  report.failure = error.stack; console.error(error); process.exitCode = 1;
  if (p && !p.isClosed()) {await shot('failed'); await writeFile(out + '/failed.html', await p.content()); await writeFile(out + '/failed-metadata.json', JSON.stringify(await metadata(), null, 2));}
} finally {await writeFile(out + '/validation.json', JSON.stringify(report, null, 2)); await browser.close();}
