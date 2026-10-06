import test from 'node:test';
import assert from 'node:assert/strict';
import { readForgePreset, writeForgePreset, activeForgeChoices, FORGE_DEFAULTS, exportForgePreset, importForgePreset } from '../src/forge-presets.js';

test('original choices remain available while custom starts empty and stays scoped to a card', () => {
    const settings = {};
    assert.deepEqual(activeForgeChoices(readForgePreset(settings, 'card-a')).pathRanks, FORGE_DEFAULTS.pathRanks);
    const blank = { ...readForgePreset(settings, 'card-a'), mode: 'custom' };
    assert.deepEqual(activeForgeChoices(blank).origins, []);
    writeForgePreset(settings, { ...blank, origins: ['New World'], skillCategories: ['Alchemy'], masteryRanks: ['Seed', 'Bloom'], pathRanks: ['I', 'II', 'III'], standings: ['Citizen'] }, 'card-a', 'card-a');
    assert.deepEqual(activeForgeChoices(readForgePreset(settings, 'card-a')).origins, ['New World']);
    assert.deepEqual(activeForgeChoices(readForgePreset(settings, 'card-b')).origins, FORGE_DEFAULTS.origins);
    assert.throws(() => writeForgePreset(settings, blank, 'card-a', 'card-b'), /changed/);
    const original = writeForgePreset(settings, { ...readForgePreset(settings, 'card-a'), mode: 'tretaresia' }, 'card-a', 'card-a');
    assert.deepEqual(activeForgeChoices(original).origins, FORGE_DEFAULTS.origins);
    assert.deepEqual(original.origins, ['New World']);
});

test('preset JSON round trip and rejects duplicate or oversized choices', () => {
    const config = { ...readForgePreset({}, 'card'), mode: 'custom', origins: ['Arcadia'], pathRanks: ['Bronze', 'Silver'] };
    assert.deepEqual(importForgePreset(exportForgePreset(config)), config);
    assert.throws(() => exportForgePreset({ ...config, origins: ['Arcadia', 'arcadia'] }), /Duplicate/);
    assert.throws(() => importForgePreset('{"format":"wrong"}'), /Unsupported/);
});

test('v1 preset migration retains choices and supplies new fields without changing card settings', () => {
    const legacy = { mode:'custom', name:'School', origins:['Tokyo'], standings:['Student'], skillCategories:['Talent'], masteryRanks:['I'], pathRanks:['Freshman'] };
    const settings = {roleforgeForgePresets:{school:structuredClone(legacy)}};
    const next = readForgePreset(settings, 'school');
    assert.equal(next.mode,'custom');assert.deepEqual(next.standings,['Student']);assert.deepEqual(next.pathRanks,['Freshman']);
    assert.deepEqual(next.arsenalTypes,FORGE_DEFAULTS.arsenalTypes);assert.equal(next.showRank,true);
    assert.deepEqual(settings.roleforgeForgePresets.school,legacy);
    assert.deepEqual(importForgePreset(JSON.stringify({format:'roleforge-character-forge-preset',version:1,preset:legacy})),next);
    const custom = {...next,arsenalTypes:['Firearm','Vehicle'],alignments:['Hero','Renegade'],rankLabel:'School year',showRank:false};
    assert.deepEqual(importForgePreset(exportForgePreset(custom)),custom);
    assert.deepEqual(activeForgeChoices(custom).arsenalTypes,['Firearm','Vehicle']);assert.equal(activeForgeChoices(custom).showRank,false);
    assert.throws(()=>exportForgePreset({...custom,arsenalTypes:['x'.repeat(61)]}),/Invalid arsenalTypes/);
    assert.throws(()=>exportForgePreset({...custom,showRank:'false'}),/visibility/);
});
