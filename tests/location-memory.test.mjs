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
    assert.equal(memory.length, 3);
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
        connections: [{ to: 'Gate', toId: '', direction: 'east', distance: '1 hour', route: '', estimated: false, bidirectional: false }], landmarks: [],
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

test('explicit nested locations resolve complete paths and missing current geography without using another place',async()=>{
 const {locationPath,recoverLocationGeography}=await import('../src/location-memory.js');
 const records=[{id:'realm',name:'Central Continent',kind:'Realm'},{id:'river',name:'Kingsberg River',kind:'Region',parentId:'realm'},{id:'cave',name:'Cave near River',parentId:'river'}];
 assert.deepEqual(locationPath(records,'Cave near River'),['Central Continent','Kingsberg River','Cave near River']);
 assert.deepEqual(recoverLocationGeography({place:'Cave near River',region:'',continent:''},records),{place:'Cave near River',region:'Kingsberg River',continent:'Central Continent'});
 assert.equal(recoverLocationGeography({place:'Other cave'},records).region,'');
 assert.equal(recoverLocationGeography({place:'Venus Potion Shop [เขตคาร์เดียนแดง]'},[]).region,'เขตคาร์เดียนแดง');
 assert.equal(recoverLocationGeography({place:'Venus Potion Shop [Red District]'},[]).region,'Red District');
});
test('known geography wins, ambiguous aliases do not choose parents and cycles cannot loop',async()=>{
 const {locationPath,recoverLocationGeography,findLocation}=await import('../src/location-memory.js');
 const records=[{id:'a',name:'A',parentId:'b',aliases:['Hall'],region:'North'},{id:'b',name:'B',parentId:'a',aliases:['Hall']}];
 assert.equal(findLocation(records,'Hall'),null);
 assert.ok(locationPath(records,'A').length<=3);
 assert.equal(recoverLocationGeography({place:'A',region:'Known'},records).region,'Known');
 assert.equal(recoverLocationGeography({place:'Hall'},records).region,'');
});
test('distance needs a route, distinguishes estimates and only reverses explicit two-way routes',async()=>{
 const {locationDistance}=await import('../src/location-memory.js');
 const records=[{id:'c',name:'Cave',parentName:'River',connections:[{to:'Bridge',distance:'500 m',estimated:true,bidirectional:true}]},{id:'r',name:'River'},{id:'b',name:'Bridge'}];
 assert.equal(locationDistance(records,'Cave','River'),null);
 assert.equal(locationDistance(records,'Cave','Bridge').estimated,true);
 assert.equal(locationDistance(records,'Bridge','Cave').distance,'500 m');
 assert.equal(locationDistance(records,'Cave','Cave').current,true);
 records[0].connections[0].bidirectional=false;
 assert.equal(locationDistance(records,'Bridge','Cave'),null);
});
test('route enrichment fills missing distances while keeping previously known distances stable',()=>{
 let records=mergeLocationMemory([],[{id:'a',name:'A',connections:[{to:'B',direction:'east'}],evidence:'The path leads east from A to B.'}]);
 records=mergeLocationMemory(records,[{id:'a',name:'A',connections:[{to:'B',direction:'east',distance:'500 m',estimated:true}],evidence:'The path leads east from A to B.'}]);
 assert.equal(records[0].connections[0].distance,'500 m');assert.equal(records[0].connections[0].estimated,true);
 records=mergeLocationMemory(records,[{id:'a',name:'A',connections:[{to:'B',direction:'east',distance:'100 km'}],evidence:'A connects to B.'}]);
 assert.equal(records[0].connections[0].distance,'500 m');
});
test('missing region is inserted inside a known continent, not before it; unstated model distances are estimates',async()=>{
 const {locationPath}=await import('../src/location-memory.js');
 const records=[{id:'world',name:'World',kind:'Realm'},{id:'venue',name:'Venue',parentId:'world'},{id:'shop',name:'Shop',parentId:'venue',region:'District',continent:'World'}];
 assert.deepEqual(locationPath(records,'Shop'),['World','District','Venue','Shop']);
 const quote='The route leads from Shop to Venue.';
 const accepted=confirmedLocationMemory([{name:'Shop',evidence:quote,connections:[{to:'Venue',distance:'700 m'}]}],quote);
 assert.equal(accepted[0].connections[0].estimated,true);
});
test('multi-hop metric routes add compatible units, propagate estimates and respect one-way travel',async()=>{
 const {locationDistance}=await import('../src/location-memory.js');
 const entries=[{id:'a',name:'A',connections:[{to:'B',distance:'500 m'}]},{id:'b',name:'B',connections:[{to:'C',distance:'1.2 km',estimated:true}]},{id:'c',name:'C'}];
 const route=locationDistance(entries,'A','C');assert.equal(route.distance,'1.7 km');assert.equal(route.estimated,true);assert.equal(route.calculated,true);
 assert.equal(locationDistance(entries,'C','A'),null);
 entries[1].connections[0].distance='1 hour';assert.equal(locationDistance(entries,'A','C'),null);
});
test('cyclic routes are bounded and do not invent distances from containment',async()=>{
 const {locationDistance}=await import('../src/location-memory.js');
 const entries=[{id:'a',name:'A',parentName:'World',connections:[{to:'B',distance:'100 m',bidirectional:true}]},{id:'b',name:'B',connections:[{to:'C',distance:'200 m',bidirectional:true}]},{id:'c',name:'C',connections:[{to:'A',distance:'400 m'}]},{name:'World',kind:'Realm'}];
 assert.equal(locationDistance(entries,'A','C').distance,'300 m');assert.equal(locationDistance(entries,'A','World'),null);
});
