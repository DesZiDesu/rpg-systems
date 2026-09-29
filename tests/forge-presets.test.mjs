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
