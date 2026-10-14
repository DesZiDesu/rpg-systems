import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveRevisionCache,createArchiveCatalog,searchNpcArchive} from '../src/archive-cache.js';
import {prepareLoreArchive,selectLore} from '../src/lore-core.js';

const roster=()=>Array.from({length:800},(_,i)=>({id:`npc-${i}`,name:`Person ${i}`,aliases:[`Alias ${i}`],
    background:'Established canon '.repeat(100),stats:{hp:100},abilities:[{name:'Unique power',description:'Keep this'}],
    alternateProfiles:Array.from({length:2+(i<171?1:0)},(_,v)=>({id:`v${v}`,label:`Chapter ${v}`,fields:{background:'Version canon '.repeat(100)}}))}));

test('800 NPC / 1771 versions remain indexed without normalizing any full dossier for listing or search',()=>{
    const source=roster(),catalog=createArchiveCatalog(source,{owner:'card:large'});
    assert.equal(source.reduce((n,p)=>n+p.alternateProfiles.length,0),1771);
    for(let i=0;i<10;i++){
        assert.equal(catalog.summaries.slice(0,20).length,20);
        assert.equal(searchNpcArchive(catalog.summaries,'Alias 799')[0].id,'npc-799');
    }
    assert.equal(catalog.normalizedCount,0);
    assert(!Object.hasOwn(catalog.summaries[0],'background'));
    assert(!Object.hasOwn(catalog.summaries[0],'abilities'));
    assert.equal(catalog.get('npc-799').background,source[799].background);
    const original=catalog.get('npc-799');
    assert.equal(catalog.get('npc-799'),original);assert.equal(catalog.normalizedCount,1);
    assert.throws(()=>original.stats.hp=0,TypeError);
    assert.equal(source[799].stats.hp,100);assert.equal(Object.isFrozen(source[799]),false);
});

test('owner and revision changes invalidate only the selected catalog without serializing the source',()=>{
    const cache=createArchiveRevisionCache(),source=roster();
    source.toJSON=()=>{throw Error('Whole archive serialization is not a revision check');};
    const one=cache.read('one','npcs',source,{revision:1});one.get('npc-1');
    assert.equal(cache.read('one','npcs',source,{revision:1}),one);
    const other=cache.read('two','npcs',source,{revision:1});assert.notEqual(one,other);
    const updated=cache.read('one','npcs',source,{revision:2});assert.notEqual(one,updated);assert.equal(updated.normalizedCount,0);
    cache.invalidate('one');assert.notEqual(cache.read('one','npcs',source,{revision:2}),updated);
    assert.equal(cache.read('two','npcs',source,{revision:1}),other);
});

test('context disambiguates shared names and reference lookup never changes selected versions or tracking state',()=>{
    const source=[
        {id:'stay',name:'Gilgamesh',series:'Stay Night',enabled:false,met:false,activeAlternateId:'king',alternateProfiles:[{id:'king',label:'King',fields:{}}]},
        {id:'strange',name:'Gilgamesh',series:'Strange Fake',enabled:false,met:false,activeAlternateId:'chosen',alternateProfiles:[{id:'chosen',label:'User choice',fields:{}},{id:'sf',label:'Strange Fake',fields:{}}]},
    ],before=structuredClone(source),catalog=createArchiveCatalog(source);
    const found=searchNpcArchive(catalog.summaries,'Strange Fake: Gilgamesh is mentioned.');
    assert.equal(found.length,1);assert.equal(found[0].id,'strange');assert.equal(found[0].referenceAlternateId,'sf');
    assert.deepEqual(source,before);assert.equal(catalog.normalizedCount,0);
    assert.equal(catalog.get('strange').activeAlternateId,'chosen');
});

test('Lore preparation caches an immutable normalized revision while legacy mutable input still works',()=>{
    const source=[{id:'river',title:'The river',content:'The bridge crosses this river.',enabled:true,keywords:['river']}];
    const prepared=prepareLoreArchive(source);assert.equal(prepareLoreArchive(source),prepared);assert(Object.isFrozen(prepared));
    for(let i=0;i<3;i++)assert.equal(selectLore(prepared,{mode:'relevant',budget:1000},'cross the river bridge').entries.length,1);
    const next=prepareLoreArchive([{...source[0],enabled:false}]);assert.notEqual(prepared,next);
    assert.equal(selectLore(next).entries.length,0);
    source[0].enabled=false;assert.equal(selectLore(source).entries.length,0);
});

test('qualified bodies suppress a shorter shared alias, unique short names resolve and ambiguous families require context',()=>{
 const catalog=createArchiveCatalog([
  {id:'saber',name:'Artoria Pendragon (Saber)',aliases:['Artoria Pendragon']},
  {id:'alter',name:'Artoria Pendragon (Saber Alter)'},
  {id:'sidra',name:'Sidra Azrael (Assassin Body)'},
  {id:'archer',name:'Gilgamesh (Archer)',aliases:['Gilgamesh'],alternateProfiles:[{id:'sf',label:'Strange Fake — Tine and Enkidu',fields:{}}]},
  {id:'caster',name:'Gilgamesh (Caster)',aliases:['Gilgamesh']},
  {id:'ayaka',name:'Ayaka Sajyou — Strange Fake'},
 ]);
 assert.deepEqual(searchNpcArchive(catalog.summaries,'Artoria Pendragon (Saber Alter)').map(r=>r.id),['alter']);
 assert.deepEqual(searchNpcArchive(catalog.summaries,'Sidra').map(r=>r.id),['sidra']);
 assert.deepEqual(searchNpcArchive(catalog.summaries,'Gilgamesh'),[]);
 const matching=searchNpcArchive(catalog.summaries,'Gilgamesh in Strange Fake');assert.deepEqual(matching.map(r=>r.id),['archer']);assert.equal(matching[0].referenceAlternateId,'sf');
});
test('evicting details keeps the identity index and pinned runtime baselines without loading untouched dossiers',()=>{
 const catalog=createArchiveCatalog(roster(),{maxDetails:2});catalog.pin(['npc-0']);catalog.get('npc-0');catalog.get('npc-1');catalog.get('npc-2');
 assert.equal(catalog.size,800);assert.equal(catalog.cachedCount,2);assert.equal(catalog.normalizedCount,3);assert.equal(catalog.has('npc-1'),true);assert.equal(catalog.get('npc-0').id,'npc-0');assert.equal(catalog.normalizedCount,3);
 catalog.get('npc-1');assert.equal(catalog.normalizedCount,4);assert.equal(catalog.get('npc-0').id,'npc-0');
});
