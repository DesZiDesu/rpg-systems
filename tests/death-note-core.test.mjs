import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedNotebook, eligibleTarget, makeInscription, parseResults, continueInscription, continuationInstruction, ledger, visibleText, INSCRIPTIONS, RESULTS, PROMPT} from '../src/workshop/death-note/core.js';
const fixture = () => ({player: {name: 'Nox', age: '28', knownNames: {voss: true}}, inventory: [{id: 'book', name: 'Death Note', quantity: 1}], worldClock: {day: 2, time: '20:15'}, npcs: [{id: 'voss', name: 'Elias Voss', age: '37', race: 'Human', met: true, stats: {hp: 100}}]});
const input = () => ({name: 'Elias Voss', faceKnown: true, cause: 'หัวใจวาย', timing: 'default'});
const resultText = (entry, extra = {}) => {const evidence = `${entry.name} เสียชีวิตเมื่อครบกำหนดในสมุด`;return '<tr-narrative>' + evidence + '</tr-narrative><!--roleforge_death_note:' + JSON.stringify({requestId: entry.id, status: 'resolved', elapsedSeconds: 40, evidence, ...extra}) + '-->';};
test('installing a package cannot grant a notebook; an empty or lookalike item does not count', () => {
 const state = fixture(); assert.equal(ownedNotebook(state).id, 'book'); state.inventory[0].quantity = 0; assert.equal(ownedNotebook(state), undefined); state.inventory[0] = {name: 'Death Note fan guide', quantity: 1}; assert.equal(ownedNotebook(state), undefined); state.inventory[0].properties = ['roleforge:addon:death-note']; assert(ownedNotebook(state));
});
test('name, remembered face, humanity and a living target are checked separately', () => {
 const state = fixture(); assert(eligibleTarget(state, input()).ok); assert.equal(eligibleTarget(state, {...input(), faceKnown: false}).code, 'face'); state.npcs[0].met = false; assert.equal(eligibleTarget(state, input()).ok, true, 'a witnessed photograph does not require meeting the person'); state.npcs[0].met = true; state.player.knownNames.voss = false; assert.equal(eligibleTarget(state, {...input(),targetId:'voss'}).ok, true,'a typed true name can be tried without exposing it in a picker'); state.player.knownNames.voss = true; state.npcs[0].race = 'Shinigami'; assert.equal(eligibleTarget(state, input()).code, 'species'); state.npcs[0].race = 'Human'; state.npcs[0].stats.hp = 0; assert.equal(eligibleTarget(state, input()).code, 'deceased');
});
test('ambiguous duplicate names and aliases cannot select an arbitrary dossier', () => {
 const state = fixture(); state.npcs[0].aliases = ['EV']; assert.equal(eligibleTarget(state, {...input(), name: 'EV'}).code, 'name'); state.npcs.push({...state.npcs[0], id: 'other-voss'}); assert.equal(eligibleTarget(state, input()).code, 'name');
});
test('40 seconds is story time; scheduled time is bounded and does not modify world state', () => {
 const state = fixture(), bytes = JSON.stringify(state), entry = makeInscription(state, input()); assert.equal(entry.dueStorySeconds - entry.writtenStorySeconds, 40); const later = makeInscription(state, {...input(), timing: 'scheduled', delaySeconds: 600}); assert.equal(later.dueStorySeconds - later.writtenStorySeconds, 600); assert.equal(JSON.stringify(state), bytes); for (const delaySeconds of [0, 39, 600.5, NaN, 23 * 86400 + 1]) assert.throws(() => makeInscription(state, {...input(), timing: 'scheduled', delaySeconds}));
});
test('a waiting or resolved target cannot be inscribed repeatedly', () => {
 const state = fixture(), entry = makeInscription(state, input()); for (const status of ['waiting', 'resolved']) assert.throws(() => makeInscription(state, input(), [{...entry, status}]), /ถูกจดแล้ว/);
});
test('a protocol requires exact new evidence, a matching request and enough elapsed story time', () => {
 const entry = makeInscription(fixture(), input()); assert.equal(parseResults(resultText(entry), [entry]).length, 1); assert.equal(parseResults(resultText(entry, {elapsedSeconds: 39}), [entry]).length, 0); assert.equal(parseResults(resultText(entry, {requestId: 'unknown'}), [entry]).length, 0); assert.equal(parseResults(resultText(entry, {evidence: 'Elias Voss died elsewhere'}), [entry]).length, 0); assert.equal(parseResults('<!--roleforge_death_note:{bad json}-->', [entry]).length, 0);
});
test('a living waiting target is never promoted to resolved by the notebook itself', () => {
 const entry = makeInscription(fixture(), {...input(), timing: 'scheduled', delaySeconds: 600}); const evidence = 'Elias Voss ยังมีชีวิตอยู่'; const source = '<tr-narrative>' + evidence + '</tr-narrative><!--roleforge_death_note:' + JSON.stringify({requestId: entry.id, status: 'waiting', elapsedSeconds: 15, evidence}) + '-->'; assert.equal(parseResults(source, [entry])[0].status, 'waiting'); assert.equal(parseResults(source.replace('"waiting"', '"resolved"'), [entry]).length, 0);
});
test('entries and results follow the visible chat prefix and selected swipe', () => {
 const entry = {...makeInscription(fixture(), input()), swipe: 0, offset: 0}, source = {is_user: false, mes: 'A page.', extra: {[INSCRIPTIONS]: [entry]}}, end = {is_user: false, mes: 'A result.', extra: {[RESULTS]: [{requestId: entry.id, status: 'resolved', offset: 0, swipe: 0}]}}; assert.equal(ledger([source])[0].status, 'waiting'); assert.equal(ledger([source, end])[0].status, 'resolved'); end.swipe_id = 1; assert.equal(ledger([source, end])[0].status, 'waiting'); assert.equal(ledger([]).length, 0);
});
function mock() {
 let scope = 'owner-A::chat-A'; const state = fixture(), prompts = new Map(), calls = [], eventListeners = new Map();
 const context = {chat: [{is_user: false, mes: '<tr-narrative>A quiet room.</tr-narrative>', extra: {}}], eventTypes: {CHAT_CHANGED: 'chat'}, eventSource: {on(type, fn) {eventListeners.set(type, fn);}, removeListener(type) {eventListeners.delete(type);}}, async saveChat() {}, setExtensionPrompt(key, value) {prompts.set(key, value);}, async generate(type, options) {calls.push({type, options}); const request = JSON.parse(prompts.get(PROMPT).match(/INSCRIPTION: (\{[^\n]+\})/u)[1]); context.chat.at(-1).mes += resultText(request);}};
 return {context, currentState: () => state, state, scope: () => scope, changeScope(value) {scope = value;eventListeners.get('chat')?.();}, prompts, calls, input: input()};
}
test('the action uses native nested Continue and never appends a user message', async () => {
 const m = mock(), message = m.context.chat[0]; await continueInscription(m); assert.equal(m.context.chat.length, 1); assert.equal(m.context.chat[0], message); assert.equal(m.context.chat[0].is_user, false); assert.deepEqual(m.calls, [{type: 'continue', options: {automatic_trigger: true, depth: 1}}]); assert.equal(m.prompts.get(PROMPT), ''); assert.equal(ledger(m.context.chat)[0].status, 'resolved'); assert.equal(m.state.npcs[0].stats.hp, 100, 'the core never fabricates a RoleForge HP write');
});
test('failed generation removes an unused inscription and clears the transient prompt', async () => {
 const m = mock(); m.context.generate = async () => {throw Error('offline');}; await assert.rejects(continueInscription(m), /offline/); assert.equal(ledger(m.context.chat).length, 0); assert.equal(m.prompts.get(PROMPT), '');
});
test('failed initial persistence cannot call AI or leave an in-memory written name', async () => {
 const m = mock(); let saves = 0; m.context.saveChat = async () => {if (!saves++) throw Error('storage full');}; await assert.rejects(continueInscription(m), /storage full/); assert.equal(m.calls.length, 0); assert.equal(ledger(m.context.chat).length, 0);
});
test('losing the notebook while initial storage is pending cancels the generation', async () => {
 const m = mock(); m.context.saveChat = async () => {m.state.inventory = [];}; await assert.rejects(continueInscription(m), /กระเป๋า/); assert.equal(m.calls.length, 0); assert.equal(ledger(m.context.chat).length, 0);
});
test('a new owner never receives a pending result or an old transient instruction', async () => {
 const m = mock(); m.context.generate = async () => {m.changeScope('owner-B::chat-B'); m.context.chat = [{is_user: false, mes: 'A different card.', extra: {}}];}; await assert.rejects(continueInscription(m), /แชทใหม่/); assert.equal(ledger(m.context.chat).length, 0); assert.equal(m.prompts.get(PROMPT), '');
});
test('the instructions distinguish pending story time from a real countdown', () => {
 const entry = makeInscription(fixture(), input()); assert.match(continuationInstruction(entry), /STORY time/); assert.match(continuationInstruction(entry), /never.*User message/); assert.match(continuationInstruction(entry, {pending: true}), /never create a new inscription/); assert.equal(visibleText('<tr-narrative>Text</tr-narrative><!--private-->'), 'Text');
});
test('a validated result is committed before the journal reports success, including opening-message continuations',async()=>{const m=mock(),events=[];m.commitResult=async(entries,results,captured)=>{assert.equal(captured,m.scope());assert.equal(ledger(m.context.chat)[0].status,'waiting');assert.equal(results[0].status,'resolved');events.push('committed');};await continueInscription(m);assert.deepEqual(events,['committed']);assert.equal(ledger(m.context.chat)[0].status,'resolved');});
test('failed result persistence never marks the journal resolved and can be recovered from raw evidence',async()=>{const m=mock();m.commitResult=async()=>{throw Error('outcome storage failed');};await assert.rejects(continueInscription(m),/outcome storage failed/);assert.equal(ledger(m.context.chat)[0].status,'waiting');assert.equal(parseResults(m.context.chat[0].mes,ledger(m.context.chat))[0].status,'resolved');assert.equal(m.prompts.get(PROMPT),'');});
