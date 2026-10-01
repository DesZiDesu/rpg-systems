import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_NPC_ALTERNATES, NPC_ALTERNATE_INSTRUCTIONS, normalizeNpcAlternates, effectiveNpc, updateNpcAlternate,
    alternatePortraitRecord, alternatePromptContext, enumerateNpcPortraits } from '../src/npc-alternates.js';

function dossier() {
    return { id: 'cora', name: 'Cora', aliases: ['คอร่า'], npcScope: 'character', npcOwner: 'card:cora.png',
        contactId: 'letter-cora', met: true, enabled: true, isHostile: false,
        age: '28', appearance: 'Silver hair', occupation: 'River warden', personality: 'Patient',
        trust: 60, stats: { level: 12, rank: 'Veteran', hp: 140, mp: 0, stamina: 80, strength: 15, agility: 20, intelligence: 10, endurance: 16 },
        abilities: [{ id: 'fishing', name: 'Fishing', category: 'Life', level: 'Expert', description: 'River fishing', proficiency: 88 }],
        knowledge: [{ id: 'river', fact: 'The player fishes at night' }], diary: [{ id: 'memory', text: 'An old meeting' }],
        hStats: { pregnant: false }, hasPortrait: true, portraitSource: 'server', portraitPath: '/user/images/tretaresia-npc/cora.webp',
        portraitView: { desktop: { x: 50, y: 50, zoom: 1 }, mobile: { x: 25, y: 40, zoom: 1.5 } },
        portraitSize: 80, identityColor: '#d6b458', roleIcon: 'ranger',
        activeAlternateId: 'childhood', alternateProfiles: [{ id: 'childhood', label: 'Childhood', description: 'Before becoming a warden',
            fields: { age: '10', occupation: 'Student', appearance: 'Short silver hair', trust: 10, stats: { level: 1, hp: 40 },
                abilities: [{ id: 'fishing', name: 'Fishing', category: 'Life', level: 'Beginner', description: 'Learning by the river', proficiency: 5 }] } }] };
}

test('an active period changes its dossier while keeping one stable NPC identity and original profile', () => {
    const original = dossier(), snapshot = structuredClone(original), active = effectiveNpc(original);
    assert.equal(active.id, 'cora'); assert.equal(active.name, 'Cora'); assert.deepEqual(active.aliases, ['คอร่า']);
    assert.equal(active.age, '10'); assert.equal(active.occupation, 'Student'); assert.equal(active.trust, 10);
    assert.equal(active.stats.level, 1); assert.equal(active.stats.hp, 40); assert.equal(active.stats.mp, 0);
    assert.equal(active.stats.agility, 20); assert.equal(active.abilities[0].proficiency, 5);
    assert.equal(active.npcScope, 'character'); assert.equal(active.npcOwner, 'card:cora.png'); assert.equal(active.contactId, 'letter-cora');
    assert.equal(active.met, true); assert.equal(active.enabled, true); assert.equal(active.isHostile, false);
    assert.deepEqual(active.knowledge, original.knowledge); assert.deepEqual(active.diary, original.diary); assert.deepEqual(active.hStats, original.hStats);
    active.aliases.push('Other'); active.knowledge[0].fact = 'Changed only in the result'; active.stats.hp = 999;
    assert.deepEqual(original, snapshot);
});

test('switching back to the original dossier restores the original facts and image', () => {
    const original = dossier(), active = effectiveNpc(original), restored = effectiveNpc({ ...original, activeAlternateId: '' });
    assert.equal(active.age, '10'); assert.equal(restored.age, '28'); assert.equal(restored.stats.level, 12);
    assert.equal(restored.abilities[0].proficiency, 88); assert.equal(restored.portraitPath, original.portraitPath);
    assert.equal(restored.npcAlternateId, ''); assert.equal(original.activeAlternateId, 'childhood');
});

test('period updates merge partial stats, keep intentional zero and leave the base and other periods untouched', () => {
    const original = dossier(); original.alternateProfiles.push({ id: 'future', label: 'Future', description: '', fields: { age: '50', stats: { hp: 90 } } });
    const snapshot = structuredClone(original);
    const changed = updateNpcAlternate(original, 'childhood', { stats: { hp: 0, mp: 0 }, personality: 'Curious', trust: 0,
        abilities: [], lifeMode: 'Paused', activityUpdatedDay: 18, activeAlternateId: 'future' });
    const active = effectiveNpc(changed);
    assert.deepEqual(changed.stats, original.stats); assert.equal(changed.age, '28'); assert.equal(changed.trust, 60);
    assert.equal(active.stats.hp, 0); assert.equal(active.stats.mp, 0); assert.equal(active.stats.level, 1);
    assert.equal(active.personality, 'Curious'); assert.equal(active.trust, 0); assert.deepEqual(active.abilities, []);
    assert.equal(active.lifeMode, 'Paused'); assert.equal(active.activityUpdatedDay, 18);
    assert.equal(changed.activeAlternateId, 'childhood'); assert.deepEqual(changed.alternateProfiles[1], original.alternateProfiles[1]);
    assert.deepEqual(original, snapshot);
});

test('base updates affect the original profile without altering any period or selecting a new period', () => {
    const original = dossier(), changed = updateNpcAlternate(original, '', { age: '29', stats: { hp: 0 }, name: 'Cora Vale', aliases: ['Cora'],
        contactId: 'forbidden', activeAlternateId: '' });
    assert.equal(changed.name, 'Cora Vale'); assert.deepEqual(changed.aliases, ['Cora']); assert.equal(changed.age, '29');
    assert.equal(changed.stats.hp, 0); assert.equal(changed.stats.level, 12); assert.equal(changed.contactId, 'letter-cora');
    assert.equal(changed.activeAlternateId, 'childhood'); assert.deepEqual(changed.alternateProfiles, original.alternateProfiles);
    assert.equal(effectiveNpc(changed).age, '10'); assert.equal(original.stats.hp, 140);
});

test('alternate fields cannot override identity, scope, shared social records or sexual bookkeeping', () => {
    const original = dossier(), malicious = { ...original, alternateProfiles: [{ id: 'childhood', label: 'Childhood', fields: {
        name: 'Different person', aliases: ['New identity'], id: 'new-id', npcScope: 'chat', npcOwner: 'wrong-card', contactId: 'wrong-letter',
        met: false, enabled: false, isHostile: true, diary: [], knowledge: [], hStats: { pregnant: true }, age: '10',
        activeAlternateId: '', alternateProfiles: [], portraitPath: 'https://example.test/tracking.png', stats: { hp: 0, secret: 100 },
    } }] };
    const normalized = normalizeNpcAlternates(malicious), active = effectiveNpc(malicious);
    assert.deepEqual(normalized.alternateProfiles[0].fields, { age: '10', stats: { hp: 0 } });
    for (const key of ['id', 'name', 'aliases', 'npcScope', 'npcOwner', 'contactId', 'met', 'enabled', 'isHostile', 'diary', 'knowledge', 'hStats'])
        assert.deepEqual(active[key], original[key]);
});

test('missing fields inherit individually; blank text, zero values and empty arrays are explicit overrides', () => {
    const original = dossier(); original.alternateProfiles[0].fields = { background: '', trust: 0, stats: { mp: 0 }, abilities: [] };
    const active = effectiveNpc(original);
    assert.equal(active.age, '28'); assert.equal(active.background, ''); assert.equal(active.trust, 0);
    assert.equal(active.stats.level, 12); assert.equal(active.stats.mp, 0); assert.deepEqual(active.abilities, []);
});

test('malformed lists and invalid active selections are normalized without inventing a second NPC', () => {
    for (const malformed of [null, undefined, 2, 'bad', [], { alternateProfiles: [null, 3, [], {}], activeAlternateId: 'missing' }])
        assert.deepEqual(normalizeNpcAlternates(malformed), { alternateProfiles: [], activeAlternateId: '' });
    const original = dossier();
    assert.deepEqual(normalizeNpcAlternates({ title: 'Partial update' }, original), normalizeNpcAlternates(original));
    assert.deepEqual(normalizeNpcAlternates({ alternateProfiles: [] }, original), { alternateProfiles: [], activeAlternateId: '' });
    assert.equal(normalizeNpcAlternates({ ...original, activeAlternateId: 'missing' }).activeAlternateId, '');
    const unchanged = updateNpcAlternate(original, 'missing', { age: '500', stats: { hp: 0 } });
    assert.equal(unchanged.age, '28'); assert.equal(unchanged.stats.hp, 140); assert.equal(unchanged.activeAlternateId, 'childhood');
});

test('IDs are safe, unique, bounded and stable across save/reload normalization', () => {
    const normalized = normalizeNpcAlternates({ alternateProfiles: [
        { id: 'same', label: 'A' }, { id: 'same', label: 'B' }, { id: '__proto__', label: 'C' },
        { id: '../unsafe/path', label: 'D' }, { id: 'a'.repeat(120), label: 'E' }, { id: 'a'.repeat(120), label: 'F' },
    ], activeAlternateId: 'same' });
    const ids = normalized.alternateProfiles.map(value => value.id);
    assert.equal(new Set(ids).size, ids.length); assert.ok(ids.every(id => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(id)));
    assert.equal(ids[0], 'same'); assert.equal(ids[1], 'same-2'); assert.equal(normalized.activeAlternateId, 'same');
    assert.deepEqual(normalizeNpcAlternates(normalized), normalized); assert.equal({}.polluted, undefined);
});

test('only owned fields can become overrides and prototype payloads cannot change object prototypes', () => {
    const inheritedFields = Object.create({ age: '999', stats: { hp: 999 }, name: 'Inherited person' }); inheritedFields.personality = 'Curious';
    const inheritedStats = Object.create({ hp: 999 }); inheritedStats.mp = 0; inheritedFields.stats = inheritedStats;
    const inheritedAlternate = Object.create({ portraitSource: 'server', portraitPath: '/user/images/tretaresia-npc/tracker.webp' });
    inheritedAlternate.id = 'owned'; inheritedAlternate.label = 'Owned'; inheritedAlternate.fields = inheritedFields;
    const normalized = normalizeNpcAlternates({ alternateProfiles: [inheritedAlternate] });
    assert.deepEqual(normalized.alternateProfiles[0].fields, { personality: 'Curious', stats: { mp: 0 } });
    assert.equal(Object.hasOwn(normalized.alternateProfiles[0], 'portraitSource'), false);
    const payload = JSON.parse('{"alternateProfiles":[{"id":"constructor","label":"X","fields":{"__proto__":{"polluted":true},"stats":{"__proto__":{"polluted":true},"hp":0}},"__proto__":{"polluted":true}}]}');
    assert.deepEqual(normalizeNpcAlternates(payload).alternateProfiles[0].fields, { stats: { hp: 0 } }); assert.equal({}.polluted, undefined);
});

test('profile bounds cap periods, descriptions, abilities, numeric attributes and custom meters', () => {
    const normalized = normalizeNpcAlternates({ alternateProfiles: Array.from({ length: 30 }, (_, index) => ({ id: `stage-${index}`, label: 'L'.repeat(200),
        description: 'D'.repeat(2000), fields: { background: 'B'.repeat(5000), notes: 'N'.repeat(1500),
            stats: { level: 999999, hp: 9999999, strength: 999999, mp: -50, rank: 'R'.repeat(200), agility: NaN },
            trust: 1000, fear: -100, abilities: Array.from({ length: 101 }, (_, skill) => ({ id: `skill-${skill}`, name: `Skill ${skill}`, proficiency: 200 })),
            customMeters: Array.from({ length: 31 }, (_, meter) => ({ id: `meter-${meter}`, name: `Meter ${meter}`, value: -10 })) } })) });
    assert.equal(normalized.alternateProfiles.length, MAX_NPC_ALTERNATES);
    const first = normalized.alternateProfiles[0]; assert.equal(first.label.length, 120); assert.equal(first.description.length, 1000);
    assert.equal(first.fields.background.length, 4000); assert.equal(first.fields.notes.length, 1000);
    assert.deepEqual(first.fields.stats, { level: 9999, hp: 999999, mp: 0, strength: 9999, rank: 'R'.repeat(80) });
    assert.equal(first.fields.trust, 100); assert.equal(first.fields.fear, 0); assert.equal(first.fields.abilities.length, 100);
    assert.equal(first.fields.abilities[0].proficiency, 100); assert.equal(first.fields.customMeters.length, 30); assert.equal(first.fields.customMeters[0].value, 0);
});

test('all intentional zero stats survive a period save rather than being filled with healthy defaults', () => {
    const original = dossier(), zeros = { level: 0, rank: 'Unranked', hp: 0, mp: 0, stamina: 0, strength: 0, agility: 0, intelligence: 0, endurance: 0 };
    const changed = updateNpcAlternate(original, 'childhood', { stats: zeros, affection: 0, trust: 0, loyalty: 0, fear: 0, corruption: 0, lust: 0 });
    assert.deepEqual(effectiveNpc(changed).stats, zeros); assert.equal(changed.stats.hp, 140); assert.equal(changed.stats.level, 12);
});

test('a period inherits the base portrait unless an own image or an explicit empty portrait is configured', () => {
    const original = dossier(), fallback = alternatePortraitRecord(original, 'childhood');
    assert.equal(fallback.id, 'cora'); assert.equal(fallback.npcAlternateId, ''); assert.equal(fallback.portraitPath, original.portraitPath);
    const withImage = updateNpcAlternate(original, 'childhood', { hasPortrait: true, portraitSource: 'local', portraitChatId: 'chat-a',
        portraitView: { mobile: { x: 15, y: 20, zoom: 2 } }, identityColor: '#88aacc', roleIcon: 'book', portraitSize: 112 });
    const own = effectiveNpc(withImage);
    assert.equal(own.id, 'cora'); assert.equal(own.npcAlternateId, 'childhood'); assert.equal(own.hasPortrait, true); assert.equal(own.portraitSource, 'local');
    assert.equal(own.portraitPath, ''); assert.equal(own.portraitChatId, 'chat-a'); assert.equal(own.identityColor, '#88aacc');
    assert.deepEqual(own.portraitView, { mobile: { x: 15, y: 20, zoom: 2 }, desktop: { x: 15, y: 20, zoom: 2 } });
    const removed = effectiveNpc(updateNpcAlternate(original, 'childhood', { hasPortrait: false }));
    assert.equal(removed.hasPortrait, false); assert.equal(removed.portraitSource, 'none'); assert.equal(removed.portraitPath, ''); assert.equal(removed.npcAlternateId, 'childhood');
    const explicitNone = effectiveNpc(updateNpcAlternate(original, 'childhood', { portraitSource: 'none' }));
    assert.equal(explicitNone.hasPortrait, false); assert.equal(explicitNone.npcAlternateId, 'childhood'); assert.equal(original.hasPortrait, true);
});

test('alternate portrait metadata rejects URLs and CSS while bounding framing, sizes and role icons', () => {
    const original = dossier(), changed = updateNpcAlternate(original, 'childhood', {
        hasPortrait: true, portraitSource: 'server', portraitPath: 'https://example.test/image.png', identityColor: 'red;url(secret)', roleIcon: '__proto__',
        portraitSize: 900, portraitView: { desktop: { x: -50, y: 150, zoom: 20 }, mobile: { x: '', y: Infinity, zoom: 0 } },
        characterLifeId: 'other', customCss: '.message{display:none}', portrait: 'data:image/png;base64,AAAA' });
    const stage = changed.alternateProfiles[0];
    assert.equal(stage.portraitPath, ''); assert.equal(stage.portraitSize, 144); assert.equal(Object.hasOwn(stage, 'identityColor'), false);
    assert.equal(Object.hasOwn(stage, 'roleIcon'), false); assert.equal(Object.hasOwn(stage, 'customCss'), false); assert.equal(Object.hasOwn(stage, 'portrait'), false);
    assert.deepEqual(stage.portraitView.desktop, { x: 0, y: 100, zoom: 3 }); assert.deepEqual(stage.portraitView.mobile, { x: 50, y: 50, zoom: 1 });
    assert.equal(changed.portraitPath, original.portraitPath);
});

test('ability and custom meter IDs survive partial profile saves so granular AI updates address the same records', () => {
    const original = dossier(), changed = updateNpcAlternate(original, 'childhood', { customMeters: [{ id: 'river-courage', name: 'River courage', value: 10 }] });
    const next = updateNpcAlternate(changed, 'childhood', { personality: 'Braver' });
    assert.equal(next.alternateProfiles[0].fields.abilities[0].id, 'fishing'); assert.equal(next.alternateProfiles[0].fields.customMeters[0].id, 'river-courage');
    assert.equal(effectiveNpc(next).abilities[0].proficiency, 5); assert.equal(next.abilities[0].proficiency, 88);
});

test('prompt metadata identifies the active period without injecting inactive biographies, stats or images', () => {
    const original = dossier(); original.alternateProfiles.push({ id: 'future', label: 'Future', description: 'D'.repeat(500),
        fields: { background: 'Private future biography', age: '50', stats: { level: 99 } }, hasPortrait: true, portraitSource: 'server', portraitPath: '/user/images/tretaresia-npc/future.webp' });
    const context = alternatePromptContext(original), serialized = JSON.stringify(context);
    assert.equal(context.activeAlternateId, 'childhood'); assert.equal(context.activeAlternateLabel, 'Childhood');
    assert.deepEqual(context.alternateProfiles[0], { id: 'childhood', label: 'Childhood', description: 'Before becoming a warden' });
    assert.equal(context.alternateProfiles[1].description.length, 160);
    for (const secret of ['Private future biography', 'portraitPath', 'stats', 'Silver hair']) assert.equal(serialized.includes(secret), false);
    assert.match(NPC_ALTERNATE_INSTRUCTIONS, /chosen manually/); assert.match(NPC_ALTERNATE_INSTRUCTIONS, /Never create a duplicate NPC/);
});

test('portrait enumeration includes the original and each own image once, skipping inherited and removed images', () => {
    const original = dossier(); original.alternateProfiles.push(
        { id: 'future', label: 'Future', fields: {}, hasPortrait: true, portraitSource: 'server', portraitPath: '/user/images/tretaresia-npc/future.webp' },
        { id: 'missing', label: 'Missing', fields: {}, hasPortrait: false },
        { id: 'none', label: 'No image', fields: {}, portraitSource: 'none' },
    );
    const records = enumerateNpcPortraits(original);
    assert.deepEqual(records.map(value => [value.id, value.npcAlternateId]), [['cora', ''], ['cora', 'future']]);
    assert.equal(records[0].portraitPath, original.portraitPath); assert.equal(records[1].portraitPath, '/user/images/tretaresia-npc/future.webp');
    assert.deepEqual(enumerateNpcPortraits(null), []); assert.deepEqual(effectiveNpc(null), {}); assert.deepEqual(alternatePortraitRecord(null), {});
});

test('an NPC without configured alternates adds no alternate metadata to model context',()=>{
 assert.deepEqual(alternatePromptContext({id:'cora',name:'Cora',age:'28'}),{});
});
