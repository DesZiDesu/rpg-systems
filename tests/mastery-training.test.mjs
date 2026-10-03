import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAINING_MODES, normalizeMasteryTraining, startMasteryTraining, submitMasteryTraining, trainingActionText, trainingInstruction, trainingProgress} from '../src/mastery-training.js';

test('mastery training normalizes a safe, bounded exercise without treating text as instructions', () => {
    const value = normalizeMasteryTraining({kind:'magic', disciplineId:'aura', disciplineName:'Aura', mode:'trial', minChars:1, maxChars:99999, prompt:'  custom prompt  '});
    assert.equal(value.kind, 'magic');
    assert.equal(value.mode, 'trial');
    assert.equal(value.minChars, 15);
    assert.equal(value.maxChars, 3000);
    assert.equal(value.prompt, 'custom prompt');
    assert.match(value.id, /^training-/);
    assert.equal(normalizeMasteryTraining({kind:'other',disciplineId:'a',disciplineName:'A'}), null);
});

test('training modes have escalating role-play lengths and explicit prompts', () => {
    assert.deepEqual(TRAINING_MODES.map(mode => mode.id), ['guided','scene','trial']);
    assert.ok(TRAINING_MODES[0].minChars < TRAINING_MODES[1].minChars);
    assert.ok(TRAINING_MODES[1].minChars < TRAINING_MODES[2].minChars);
    for (const mode of TRAINING_MODES) assert.ok(mode.prompt.length > 30);
});

test('submission waits for the user role before marking an exercise submitted', () => {
    const training = startMasteryTraining({kind:'sword',disciplineId:'swordplay',disciplineName:'Swordplay',mode:'guided'}, '2026-10-01T00:00:00.000Z');
    assert.equal(submitMasteryTraining(training, 'too short').error, 'too-short');
    const role = 'I settle my feet, breathe with the blade, turn my shoulder, and guide one careful cut through the hanging reed while watching the balance return to stillness.';
    const result = submitMasteryTraining(training, role, '2026-10-01T00:01:00.000Z');
    assert.equal(result.ok, true);
    assert.equal(result.training.status, 'submitted');
    assert.equal(result.training.text, role);
    assert.equal(submitMasteryTraining(result.training, role).error, 'inactive');
});

test('action text and instruction keep the AI as narrator and never promise a result', () => {
    const training = startMasteryTraining({kind:'magic',disciplineId:'trueMagic',disciplineName:'True Magic',mode:'scene'}, '2026-10-01T00:00:00.000Z');
    assert.match(trainingActionText(training, 'th'), /True Magic/);
    assert.match(trainingActionText(training, 'th'), /100/);
    assert.match(trainingInstruction(training, 'en'), /do not invent a success/i);
    assert.match(trainingInstruction(training, 'en'), /completed role-play only/i);
});

test('progress reports character count and remains invalid until the minimum is met', () => {
    const training = startMasteryTraining({kind:'magic',disciplineId:'aura',disciplineName:'Aura',mode:'guided'});
    assert.equal(trainingProgress(training, '').valid, false);
    assert.equal(trainingProgress(training, 'x'.repeat(50)).valid, true);
    assert.equal(trainingProgress({...training,maxChars:55}, 'x'.repeat(56)).valid, false);
});
