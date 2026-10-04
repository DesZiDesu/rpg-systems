import test from 'node:test';
import assert from 'node:assert/strict';
import {
    POWER_TRAINING_CHOICES,
    normalizePowerMastery,
    normalizePowerTrainingResult,
    applyPowerTrainingResult,
    consumePowerTrainingResult,
    beginPowerTraining,
    requestPowerTraining,
} from '../src/power-mastery.js';

test('Power Mastery exposes four bounded practice approaches', () => {
    assert.deepEqual(POWER_TRAINING_CHOICES.map(choice => choice.id), ['control', 'application', 'understanding', 'breakthrough']);
    const session = beginPowerTraining({ id: 'aura', name: 'Aura', kind: 'magic' }, 2, '2026-10-03T00:00:00.000Z');
    assert.equal(session.phase, 'choices');
    assert.equal(session.round, 2);
});

test('quiet training results require JSON narration and clamp mastery deltas', () => {
    const result = normalizePowerTrainingResult(JSON.stringify({
        outcome: 'success', title: 'Stable flow', narration: 'The character keeps the aura inside the established limit.', masteryDelta: 99,
    }));
    assert.equal(result.masteryDelta, 8);
    assert.equal(normalizePowerTrainingResult('planning: {"outcome":"success"}'), null);
});

test('training progress is saved separately and is consumed by the next normal turn', () => {
    const session = beginPowerTraining({ id: 'aura', name: 'Aura', kind: 'magic' }, 1, '2026-10-03T00:00:00.000Z');
    const mastery = applyPowerTrainingResult({ entries: { aura: { value: 40, attempts: 1 } } }, { ...session, choiceId: 'control' }, {
        outcome: 'partial', title: 'Partial control', narration: 'A small improvement is confirmed.', masteryDelta: 4,
    }, '2026-10-03T00:01:00.000Z');
    assert.equal(mastery.entries.aura.value, 44);
    assert.equal(mastery.session.phase, 'result');
    assert.equal(mastery.lastResult.consumed, false);
    const consumed = consumePowerTrainingResult(normalizePowerMastery({ ...mastery, session: null }));
    assert.equal(consumed.changed, true);
    assert.equal(consumed.mastery.lastResult.consumed, true);
});

test('complete fenced and wrapped results after reasoning retain actual mastery, not prose or conflicting JSON', () => {
    const result = { outcome: 'partial', title: 'ควบคุมได้ดีขึ้น', narration: 'ลองคุมขนาดเปลวไฟให้นิ่ง', masteryDelta: 3, reason: 'ยังแกว่ง', nextPrompt: 'ฝึกต่อ' };
    for (const raw of [
        '<think>{"outcome":"success","narration":"private","masteryDelta":8}</think>\n```json\n' + JSON.stringify(result) + '\n```',
        'ผลการประเมิน:\n' + JSON.stringify({ result }),
        { content: JSON.stringify({ training: result }) },
        JSON.stringify({ ...result, narration: undefined, narrative: result.narration }),
    ]) assert.deepEqual(normalizePowerTrainingResult(raw), result);
    for (const raw of [
        'คุณฝึกสำเร็จ ได้ความชำนาญสามเปอร์เซ็นต์',
        JSON.stringify({ ...result, masteryDelta: undefined }),
        JSON.stringify({ ...result, masteryDelta: true }),
        JSON.stringify({ ...result, masteryDelta: '' }),
        JSON.stringify({ ...result, masteryDelta: [3] }),
        JSON.stringify({ ...result, outcome: 'unknown' }),
        JSON.stringify(result).slice(0, -1),
        JSON.stringify(result) + JSON.stringify({ ...result, masteryDelta: 4 }),
    ]) assert.equal(normalizePowerTrainingResult(raw), null);
});

test('training uses the native task API and never retries failures through the chat preset', async () => {
    const input = { power: { name: 'Fire Ball', kind: 'technique' }, choice: 'control', language: 'th' };
    let raw = 0, quiet = 0;
    const context = { generateRaw: async args => {
        raw++; assert.match(args.systemPrompt, /training data task/); assert.match(args.systemPrompt, /masteryDelta:number/);
        assert.match(args.prompt, /Fire Ball/); assert.match(args.prompt, /Feedback language: th/);
        assert.equal(args.trimNames, false); assert.equal(args.responseLength, 2048); return '{"outcome":"retry"}';
    }, generateQuietPrompt: async () => { quiet++; } };
    await requestPowerTraining(context, input); assert.equal(raw, 1); assert.equal(quiet, 0);
    context.generateRaw = async () => { raw++; throw Error('Offline'); };
    await assert.rejects(requestPowerTraining(context, input), /Offline/); assert.equal(raw, 2); assert.equal(quiet, 0);
    const legacy = await requestPowerTraining({ generateQuietPrompt: async args => {
        assert.equal(args.skipWIAN, true); assert.equal(args.removeReasoning, true); assert.equal(args.responseLength, 2048);
        assert.match(args.quietPrompt, /training data task/); return 'legacy';
    } }, input); assert.equal(legacy, 'legacy');
});
