import test from 'node:test';
import assert from 'node:assert/strict';
import {
    POWER_TRAINING_CHOICES,
    normalizePowerMastery,
    normalizePowerTrainingResult,
    applyPowerTrainingResult,
    consumePowerTrainingResult,
    beginPowerTraining,
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
