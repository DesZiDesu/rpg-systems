import test from 'node:test';
import assert from 'node:assert/strict';
import {worldPath,worldRef,worldKey,safeWorldJson,validateWorldManifest,validateWorldIndexes,worldHash,worldRandomId} from '../src/world-pack-core.js';
import {preserveNpcCanon} from '../src/sparse-npc-state.js';

const manifest=()=>({format:'roleforge-world-pack',version:1,archiveId:'test-world',revision:'1',counts:{npcBodies:1,nativeVersions:1,worldLore:1},indexes:{npcs:'indexes/npcs.json',lore:'indexes/lore.json'},presets:'presets.json',
    files:['indexes/npcs.json','indexes/lore.json','presets.json','npcs/a/base.json','npcs/a/versions/v.json','lore/l.json'].map(path=>({path,bytes:2,sha256:'0'.repeat(64)}))});
const npcs=()=>[{id:'a',name:'A',basePath:'npcs/a/base.json',defaultVersionId:'v',versions:[{id:'v',label:'Original',path:'npcs/a/versions/v.json'}]}];
const lore=()=>[{id:'l',title:'A place mentioning A',path:'lore/l.json'}];

test('World Pack contract validates identity, hashes, sizes, indexes and inherited version order',async()=>{
    const value=validateWorldManifest(manifest());assert.deepEqual(validateWorldIndexes(value,npcs(),lore()),{npcBodies:1,nativeVersions:1,worldLore:1});
    const hash=await worldHash(new TextEncoder().encode('world'));
    const ref=worldRef({format:'roleforge-world-archive-ref',version:1,archiveId:value.archiveId,revision:'1',manifestSha256:hash,manifestPath:'02-world-pack/manifest.json',required:true});
    assert.ok(worldKey(ref).includes(hash));assert.equal(ref.required,true);
});
test('local paths cannot become filesystem traversal, network URLs or prototype keys',()=>{
    for(const path of ['../a','/a','a/../b','a\\b','https://host/file','a//b','a/./b','a\u0000b'])assert.throws(()=>worldPath(path));
    for(const key of ['__proto__','constructor','prototype'])assert.throws(()=>safeWorldJson(`{"${key}":{}}`));
    assert.equal(worldPath('npcs/a/versions/v.json'),'npcs/a/versions/v.json');
});
test('corrupt contracts never silently drop duplicate records, versions or missing payloads',()=>{
    const duplicate=manifest();duplicate.files.push(duplicate.files[0]);assert.throws(()=>validateWorldManifest(duplicate),/Duplicate/);
    const huge=manifest();huge.files[0].bytes=2**30;assert.throws(()=>validateWorldManifest(huge),/size/);
    const missing=manifest();missing.files=missing.files.slice(1);assert.throws(()=>validateWorldManifest(missing),/missing/);
    assert.throws(()=>validateWorldIndexes(manifest(),[...npcs(),...npcs()],lore()),/Duplicate/);
    const wrong=npcs();wrong[0].defaultVersionId='missing';assert.throws(()=>validateWorldIndexes(manifest(),wrong,lore()),/selected/);
    assert.throws(()=>validateWorldIndexes(manifest(),npcs(),[]),/counts/);
    const badVersion=npcs();badVersion[0].versions[0].id=12;assert.throws(()=>validateWorldIndexes(manifest(),badVersion,lore()),/version/);
    assert.throws(()=>validateWorldIndexes(manifest(),npcs(),[{...lore()[0],id:5}]),/Lore identity/);
});
test('editing one field preserves longer legacy text, unknown canon fields and every untouched version',()=>{
    const raw={name:'A',age:'x'.repeat(80),abilities:[{id:'power',description:'z'.repeat(900),citation:'Source'}],archiveNote:'keep',alternateProfiles:[{id:'v1',fields:{background:'old',unknown:'preserved'}},{id:'v2',fields:{background:'other'}}]};
    const baseline={name:'A',age:raw.age.slice(0,40),abilities:[{id:'power',description:raw.abilities[0].description}],alternateProfiles:[{id:'v1',fields:{background:'old'}},{id:'v2',fields:{background:'other'}}]};
    const next=structuredClone(baseline);next.alternateProfiles[0].fields.background='edited';
    const saved=preserveNpcCanon(raw,next,baseline);assert.equal(saved.age,raw.age);assert.deepEqual(saved.abilities,raw.abilities);assert.equal(saved.archiveNote,'keep');
    assert.deepEqual(saved.alternateProfiles,[{id:'v1',fields:{background:'edited',unknown:'preserved'}},raw.alternateProfiles[1]]);assert.equal(raw.alternateProfiles[0].fields.background,'old');
});

test('archive integrity and staging IDs work on plain-HTTP mobile LAN origins',async()=>{
    for(const value of ['', 'abc', 'x'.repeat(55),'y'.repeat(56),'z'.repeat(64),'ไทย'.repeat(10000)]){
        const bytes=new TextEncoder().encode(value);assert.equal(await worldHash(bytes,{}),await worldHash(bytes));
    }
    assert.equal(await worldHash(new TextEncoder().encode('abc'),{}),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const ids=new Set(Array.from({length:100},()=>worldRandomId({getRandomValues:crypto.getRandomValues.bind(crypto)})));assert.equal(ids.size,100);
});
