import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeQuestObjectives, mergeQuestObjectives, upsertQuestObjective,
    questObjectiveProgress, questObjectivesReady,
} from '../src/quest-objectives.js';

const objective = (id, title, status = 'Pending', optional = false) => ({id, title, status, optional, notes: '', evidence: '', sourceMessageId: null, sourceDay: null, source: ''});

test('normalization bounds and sanitizes objectives, and generated IDs survive reloads', () => {
    const values = [null, undefined, [], 7, 'bad', {}, {id: 'blank', title: ' '},
        {title: '  เก็บสมุนไพร  ', status: 'completed', optional: 'false', notes: 7, evidence: '  พบในเรื่อง  '},
        {title: 'Find two keys'}, {title: 'Find three keys'}];
    const normalized = normalizeQuestObjectives(values);
    assert.equal(normalized.length, 3);
    assert.equal(normalized[0].title, 'เก็บสมุนไพร');
    assert.equal(normalized[0].status, 'Completed');
    assert.equal(normalized[0].optional, false);
    assert.equal(normalized[0].notes, '');
    assert.equal(normalized[0].evidence, 'พบในเรื่อง');
    assert.deepEqual(normalizeQuestObjectives(JSON.parse(JSON.stringify(normalized))), normalized);
    assert.equal(normalizeQuestObjectives([{title: 'เก็บสมุนไพร'}])[0].id, normalized[0].id);
    assert.deepEqual(normalizeQuestObjectives({bad: true}), []);
    assert.deepEqual(normalizeQuestObjectives([{title: 'X'.repeat(250), id: 'I'.repeat(150), notes: 'N'.repeat(1500)}]).map(value => [value.title.length, value.id.length, value.notes.length]), [[180, 100, 1200]]);
});

test('partial merges retain requirements, completed status, evidence and canonical IDs', () => {
    const previous = [
        {...objective('herb', 'Collect herbs', 'Completed'), notes: 'Three plants', evidence: 'The healer received them.'},
        objective('return', 'Return to town'),
    ];
    const snapshot = structuredClone(previous);
    const merged = mergeQuestObjectives(previous, [{id: 'herb', notes: 'Delivered safely'}, {id: 'return', status: 'Completed'}]);
    assert.equal(merged.length, 2);
    assert.deepEqual(merged[0], {...previous[0], notes: 'Delivered safely'});
    assert.equal(merged[1].status, 'Completed');
    assert.deepEqual(previous, snapshot);
    assert.deepEqual(mergeQuestObjectives(previous, undefined), previous);
    const repeated = mergeQuestObjectives(merged, [{id: 'new-ai-id', title: '  COLLECT   HERBS  '}]);
    assert.equal(repeated.length, 2);
    assert.equal(repeated[0].id, 'herb');
    assert.equal(repeated[0].status, 'Completed');
    assert.equal(repeated[0].evidence, previous[0].evidence);
});

test('duplicate IDs and normalized titles update one objective, while distinct titles remain separate', () => {
    const normalized = normalizeQuestObjectives([
        objective('a', 'Find the key'), {id: 'a', status: 'Completed', evidence: 'Found in chest'},
        {id: 'changed', title: 'Ｆｉｎｄ the key'}, objective('b', 'Find the second key'),
    ]);
    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].id, 'a');
    assert.equal(normalized[0].status, 'Completed');
    assert.equal(normalized[0].evidence, 'Found in chest');
    const renamed = mergeQuestObjectives(normalized, [{id: 'b', title: 'Find the key', status: 'Completed'}]);
    assert.equal(renamed.length, 1);
    assert.equal(renamed[0].id, 'a');
    const renameWithoutStatus = mergeQuestObjectives(normalized, [{id: 'b', title: 'Find the key'}]);
    assert.equal(renameWithoutStatus[0].status, 'Completed');
    assert.equal(renameWithoutStatus[0].evidence, 'Found in chest');
});

test('objective bound still permits updating existing objectives after reaching the limit', () => {
    const values = Array.from({length: 70}, (_, index) => objective(`id-${index}`, `Task ${index}`));
    const normalized = normalizeQuestObjectives(values);
    assert.equal(normalized.length, 40);
    assert.deepEqual(normalizeQuestObjectives(values), normalized);
    const merged = mergeQuestObjectives(normalized, [objective('new', 'Overflow task'), {id: 'id-39', status: 'Completed'}]);
    assert.equal(merged.length, 40);
    assert.equal(merged[39].status, 'Completed');
    assert.equal(upsertQuestObjective({objectives: normalized}, {title: 'Overflow task'}), null);
});

test('only completed required objectives satisfy readiness; skipped requirements continue to block', () => {
    const quest = {objectives: [objective('one', 'Talk to guild', 'Completed'), objective('two', 'Return safely', 'Skipped'), objective('bonus', 'Find a flower', 'Pending', true)]};
    assert.equal(questObjectiveProgress(quest), 50);
    assert.equal(questObjectivesReady(quest), false);
    const removedRequirement = upsertQuestObjective(quest, {id: 'two', optional: true});
    assert.equal(questObjectiveProgress(removedRequirement), 100);
    assert.equal(questObjectivesReady(removedRequirement), true);
    assert.equal(quest.objectives[1].optional, false);
    const pending = upsertQuestObjective(removedRequirement, {id: 'one', status: 'Pending'});
    assert.equal(questObjectivesReady(pending), false);
});

test('all optional objectives are ready with mandatory progress already satisfied', () => {
    const quest = {objectives: [objective('one', 'Bonus one', 'Completed', true), objective('two', 'Bonus two', 'Skipped', true)]};
    assert.equal(questObjectivesReady(quest), true);
    assert.equal(questObjectiveProgress(quest), 100);
    assert.equal(questObjectiveProgress({objectives: [objective('only', 'Optional only', 'Pending', true)]}), 100);
    assert.equal(questObjectivesReady({objectives: []}), false);
    assert.equal(questObjectivesReady(null), false);
});

test('quests without objectives preserve bounded legacy progress', () => {
    assert.equal(questObjectiveProgress({progress: 37.5}), 37.5);
    assert.equal(questObjectiveProgress({progress: '80'}), 80);
    assert.equal(questObjectiveProgress({progress: 150, objectives: []}), 100);
    assert.equal(questObjectiveProgress({progress: -10}), 0);
    assert.equal(questObjectiveProgress({progress: 'bad'}), 0);
    assert.equal(questObjectiveProgress(null), 0);
    assert.equal(questObjectiveProgress({progress: 88, objectives: [objective('one', 'First'), objective('two', 'Second')]}), 0);
});

test('upsert preserves quest terminal state and rewards; reaching 100 never completes or pays the quest', () => {
    const active = {id: 'quest', status: 'Active', progress: 0, rewardClaimed: false, reward: '6 gold', objectives: [objective('one', 'Deliver package')]};
    const updated = upsertQuestObjective(active, {id: 'one', status: 'Completed', evidence: 'Recipient accepted the package.'});
    assert.equal(updated.progress, 100);
    assert.equal(updated.status, 'Active');
    assert.equal(updated.rewardClaimed, false);
    assert.equal(updated.reward, '6 gold');
    for (const status of ['Failed', 'Completed']) {
        const archived = upsertQuestObjective({...updated, status, rewardClaimed: true}, {id: 'one', notes: 'Additional detail'});
        assert.equal(archived.status, status);
        assert.equal(archived.rewardClaimed, true);
    }
    assert.equal(upsertQuestObjective(active, null), null);
    assert.equal(upsertQuestObjective(active, {id: 'unknown'}), null);
    assert.equal(upsertQuestObjective(null, {title: 'Task'}), null);
    assert.deepEqual(active.objectives, [objective('one', 'Deliver package')]);
});

test('invalid partial fields cannot erase prior confirmations, but explicit empty notes can clear them', () => {
    const previous = [{...objective('task', 'Meet the healer', 'Completed'), notes: 'At dawn', evidence: 'Met at the clinic', optional: true}];
    const preserved = mergeQuestObjectives(previous, [{id: 'task', title: 4, status: 'invented', optional: 'false', notes: null, evidence: {bad: true}}]);
    assert.deepEqual(preserved, previous);
    const cleared = mergeQuestObjectives(previous, [{id: 'task', notes: '', evidence: ''}]);
    assert.equal(cleared[0].notes, '');
    assert.equal(cleared[0].evidence, '');
    assert.equal(cleared[0].status, 'Completed');
});

test('objective provenance is bounded and survives omitted partial updates and reload', () => {
    const previous = [{...objective('deliver', 'Deliver the package'), sourceMessageId: 3, sourceDay: 2, source: 'main-reply'}];
    const updated = mergeQuestObjectives(previous, [{id: 'deliver', status: 'Completed', evidence: 'Accepted by the recipient.'}]);
    assert.equal(updated[0].sourceMessageId, 3);
    assert.equal(updated[0].sourceDay, 2);
    assert.equal(updated[0].source, 'main-reply');
    assert.deepEqual(normalizeQuestObjectives(JSON.parse(JSON.stringify(updated))), updated);
    const invalid = mergeQuestObjectives(updated, [{id: 'deliver', sourceMessageId: -3, sourceDay: 'bad', source: {bad: true}}]);
    assert.deepEqual(invalid, updated);
    const moved = mergeQuestObjectives(updated, [{id: 'deliver', sourceMessageId: 7, sourceDay: 5, source: 'manual-quest-objective'}]);
    assert.equal(moved[0].sourceMessageId, 7);
    assert.equal(moved[0].sourceDay, 5);
    assert.equal(moved[0].source, 'manual-quest-objective');
    const legacy = normalizeQuestObjectives([{title: 'An older requirement'}])[0];
    assert.equal(legacy.sourceMessageId, null);
    assert.equal(legacy.sourceDay, null);
    assert.equal(legacy.source, '');
});
