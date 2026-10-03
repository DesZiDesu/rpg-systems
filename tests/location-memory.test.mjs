import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocationMemory, rememberLocation, mergeLocationMemory, confirmedLocationMemory, locationMemoryForPrompt } from '../src/location-memory.js';

test('location memory keeps one canonical record across repeated saves', () => {
    let memory = rememberLocation([], { name: 'Beviter Road', region: 'Asura', continent: 'Asteria', detail: 'A narrow market road' }, {
        at: '2026-01-01T00:00:00.000Z', day: 'Day 1', visited: true,
    });
    memory = rememberLocation(memory, { name: 'Beviter Road', region: 'Asura', detail: 'A narrow market road' }, {
        at: '2026-01-01T00:01:00.000Z', day: 'Day 1', visited: false,
    });
    assert.equal(memory.length, 1);
    assert.equal(memory[0].visits, 1);
    assert.equal(memory[0].continent, 'Asteria');
});

test('revisiting a place increments visits without overwriting established detail', () => {
    let memory = rememberLocation([], { name: 'Asura Kingdom', detail: 'A fortified kingdom' }, { at: '2026-01-01', visited: true });
    memory = rememberLocation(memory, { name: 'Asura Kingdom', detail: '' }, { at: '2026-01-03', visited: true });
    assert.equal(memory[0].visits, 2);
    assert.equal(memory[0].detail, 'A fortified kingdom');
});

test('confirmed travel can preserve an explicit route relationship', () => {
    const memory = rememberLocation([], { name: 'Rameer Street', region: 'Asura' }, {
        at: '2026-01-02', visited: true,
        connection: { to: 'Beviter Road', distance: '2 days', direction: 'north', route: 'Road' },
    });
    assert.deepEqual(memory[0].connections.map(({ to, distance, direction, route }) => ({ to, distance, direction, route })), [{
        to: 'Beviter Road', distance: '2 days', direction: 'north', route: 'Road',
    }]);
});

test('prompt projection omits mutable timestamps and keeps route facts compact', () => {
    const memory = normalizeLocationMemory([{ id: 'x', name: 'Moon Hall', kind: 'Place', visits: 3,
        firstVisitedAt: 'private', lastVisitedAt: 'private', connections: [{ to: 'Gate', distance: '1 hour', direction: 'east' }] }]);
    assert.deepEqual(locationMemoryForPrompt(memory), [{
        id: 'x', name: 'Moon Hall', kind: 'Place', parentId: '', parentName: '', region: '', continent: '', detail: '', conditions: '', visits: 3,
        connections: [{ to: 'Gate', toId: '', direction: 'east', distance: '1 hour', route: '' }], landmarks: [],
    }]);
});

test('top-level location patches require exact evidence and link parentName', () => {
    const accepted = confirmedLocationMemory([{ id: 'beviter', name: 'Beviter Road', kind: 'Place', parentName: 'Asura Kingdom',
        evidence: 'The party enters Beviter Road inside Asura Kingdom.', detail: 'Market street' }], 'The party enters Beviter Road inside Asura Kingdom.');
    assert.equal(accepted.length, 1);
    const memory = mergeLocationMemory([], accepted, { at: '2026-02-01T00:00:00Z' });
    assert.equal(memory.length, 2);
    assert.equal(memory.find(entry => entry.id === 'beviter').parentId, memory.find(entry => entry.name === 'Asura Kingdom').id);
});

test('stable facts survive partial records and explicit correction can revise them', () => {
    let memory = mergeLocationMemory([], [{ id: 'hall', name: 'Moon Hall', detail: 'Old description', evidence: 'Moon Hall is a quiet archive.' }]);
    memory = mergeLocationMemory(memory, [{ id: 'hall', name: 'Moon Hall', detail: 'Quiet archive with a sealed vault.', evidence: 'The guide corrects the record: Moon Hall has a sealed vault.', correction: true }]);
    assert.equal(memory.find(entry => entry.id === 'hall').detail, 'Quiet archive with a sealed vault.');
});
