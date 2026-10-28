import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveCatalog} from '../src/archive-cache.js';
import {hydrateSparseNpcs,packSparseNpcs,inheritNpcBaselines,sparseNpcScope} from '../src/sparse-npc-state.js';
import {resolveNpcSpeaker} from '../src/npc-core.js';

const owner='card:world.png';
const person=(id,overrides={})=>({id,name:`Person ${id}`,enabled:true,met:false,identityColor:'#aa1122',
    background:`Biography ${id} `.repeat(200),stats:{hp:100,mp:50},abilities:[{id:'power',name:'Unique skill',description:'Established ability'}],
    activeAlternateId:'a',alternateProfiles:[{id:'a',label:'Current',fields:{stats:{hp:200},background:'Current period'}},
        {id:'b',label:'Other era',fields:{background:'Historical facts '.repeat(200),stats:{hp:300}},identityColor:'#33aa44'}],...overrides});
const state=()=>({player:{name:'Player'},npcs:[],contacts:[],npcScopes:{}});

test('a local translated name and archive name sharing a stable ID do not create two speakers',()=>{
    const catalog=createArchiveCatalog([person('oak',{name:'Professor Oak',aliases:['ศาสตราจารย์โอ๊ก']})],{owner});
    const local={id:'oak',name:'ศาสตราจารย์โอ๊ก',npcScope:'chat',met:true,identityColor:'#e39f83',roleIconImage:'data:image/png;base64,example'};
    const current=hydrateSparseNpcs({...state(),npcs:[local]},catalog,owner,{activeIds:['oak']});
    assert.equal(current.npcs.length,1);assert.equal(current.npcs[0].name,local.name);
    assert.equal(resolveNpcSpeaker(current.npcs,local.name)?.identityColor,local.identityColor);
    assert.deepEqual(packSparseNpcs(current,catalog,owner).npcScopes.hidden,[]);
});

test('sparse working state loads one of 800 dossiers; checkpoints never copy historical versions or the full index',()=>{
    const source=Array.from({length:800},(_,i)=>person(String(i))),catalog=createArchiveCatalog(source,{owner});
    const current=hydrateSparseNpcs(state(),catalog,owner,{activeIds:['799']});
    assert.equal(catalog.normalizedCount,1);assert.equal(current.npcs.length,1);
    assert.equal(current.npcs[0].alternateProfiles.length,1);assert.equal(current.npcs[0].identityColor,'#aa1122');
    assert.equal(current.npcs[0].met,false);assert.equal(current.npcs[0].activeAlternateId,'a');
    current.npcs[0].alternateProfiles[0].fields.stats.hp=170;
    const packed=packSparseNpcs(current,catalog,owner),json=JSON.stringify(packed);
    assert.equal(packed.npcs.length,0);assert(!Object.hasOwn(packed.npcScopes,'sharedIds'));
    assert(!json.includes('Historical facts'));assert(!json.includes('Biography'));
    assert.deepEqual(packed.npcScopes.overrides['799'].alternateProfiles,[{id:'a',fields:{stats:{hp:170}}}]);
    assert.equal(packed.npcScopes.bases['799'].alternateProfiles[0].fields.stats.hp,200);
    assert.equal(catalog.normalizedCount,1);assert.equal(source[799].alternateProfiles[0].fields.stats.hp,200);
    const restored=hydrateSparseNpcs(packed,catalog,owner);
    assert.equal(restored.npcs[0].alternateProfiles[0].fields.stats.hp,170);assert.equal(restored.npcs[0].enabled,true);
    assert.equal(restored.npcs[0].abilities[0].name,'Unique skill');
});

test('unloaded dossiers keep their deltas and never become hidden or deleted',()=>{
    const source=[person('a'),person('b'),person('c')],catalog=createArchiveCatalog(source,{owner});
    const saved={...state(),npcScopes:{format:2,owner,activeIds:['a'],overrides:{b:{stats:{hp:70}}},bases:{b:{stats:{hp:100}}},hidden:[]}};
    const current=hydrateSparseNpcs(saved,catalog,owner),packed=packSparseNpcs(current,catalog,owner);
    assert.deepEqual(packed.npcScopes.hidden,[]);assert.deepEqual(packed.npcScopes.overrides.b,{stats:{hp:70}});
    assert.equal(catalog.normalizedCount,1);
    const next=hydrateSparseNpcs(packed,catalog,owner,{activeIds:['b']});assert.equal(next.npcs[0].stats.hp,70);
    assert.deepEqual(packSparseNpcs(next,catalog,owner).npcScopes.hidden,[]);
});

test('a missing required archive preserves progress and links until its library is restored',()=>{
    const ref={archiveId:'world',revision:'1'},catalog=Object.assign(createArchiveCatalog([person('a')],{owner}),{ref});
    const current=hydrateSparseNpcs(state(),catalog,owner,{activeIds:['a']});current.npcs[0].stats.hp=70;current.contacts=[{id:'friend',npcId:'a'}];
    const saved=packSparseNpcs(current,catalog,owner),pending={ref,unavailable:true,has:()=>false,get:()=>null};
    const unavailable=hydrateSparseNpcs(saved,pending,owner);assert.equal(unavailable.npcs.length,0);assert.deepEqual(unavailable.contacts,saved.contacts);
    const persisted=packSparseNpcs(unavailable,pending,owner);assert.deepEqual(persisted.npcScopes,saved.npcScopes);
    const restored=hydrateSparseNpcs(persisted,catalog,owner);assert.equal(restored.npcs[0].stats.hp,70);assert.deepEqual(restored.contacts,saved.contacts);assert.deepEqual(restored.npcScopes.hidden,[]);
});

test('swipe/rollback respects later manual canon edits per field instead of replacing the whole dossier',()=>{
    const original=createArchiveCatalog([person('a')],{owner}),current=hydrateSparseNpcs(state(),original,owner,{activeIds:['a']});
    current.npcs[0].stats.hp=70;current.npcs[0].stats.mp=20;
    const checkpoint=packSparseNpcs(current,original,owner);
    const edited=createArchiveCatalog([person('a',{title:'User title',stats:{hp:120,mp:50}})],{owner});
    const restored=hydrateSparseNpcs(checkpoint,edited,owner);
    assert.equal(restored.npcs[0].title,'User title');assert.equal(restored.npcs[0].stats.hp,120);
    assert.equal(restored.npcs[0].stats.mp,20);
    const next=packSparseNpcs(restored,edited,owner);assert.deepEqual(next.npcScopes.overrides.a.stats,{mp:20});
});

test('a manual edit while a working state waits cannot be overwritten by its older baseline',()=>{
    const original=createArchiveCatalog([person('a')],{owner}),current=hydrateSparseNpcs(state(),original,owner,{activeIds:['a']});
    const copied=inheritNpcBaselines(structuredClone(current),current);copied.npcs[0].stats.hp=70;
    const edited=createArchiveCatalog([person('a',{stats:{hp:120,mp:50}})],{owner});
    const packed=packSparseNpcs(copied,edited,owner),restored=hydrateSparseNpcs(packed,edited,owner);
    assert.equal(restored.npcs[0].stats.hp,120);assert(!packed.npcScopes.overrides.a);
});

test('selected and inactive alternate deltas survive separately; deleted versions do not return',()=>{
    const catalog=createArchiveCatalog([person('a')],{owner});
    const saved={...state(),npcScopes:{format:2,owner,activeIds:['a'],hidden:[],
        overrides:{a:{alternateProfiles:[{id:'b',fields:{stats:{hp:250}}}]}},
        bases:{a:{alternateProfiles:[{id:'b',fields:{stats:{hp:300}}}]}}}};
    const current=hydrateSparseNpcs(saved,catalog,owner);current.npcs[0].alternateProfiles[0].fields.stats.hp=170;
    const packed=packSparseNpcs(current,catalog,owner);
    assert.equal(packed.npcScopes.overrides.a.alternateProfiles.length,2);
    const withoutB=createArchiveCatalog([person('a',{alternateProfiles:[person('a').alternateProfiles[0]]})],{owner});
    const restored=hydrateSparseNpcs(packed,withoutB,owner);
    assert.equal(restored.npcs[0].alternateProfiles.length,1);assert.equal(restored.npcs[0].alternateProfiles[0].fields.stats.hp,170);
});

test('only an explicitly removed loaded dossier becomes hidden; an unavailable new dossier remains in Chat',()=>{
    const catalog=createArchiveCatalog([person('a'),person('b')],{owner});
    const current=hydrateSparseNpcs(state(),catalog,owner,{activeIds:['a']});current.npcs=[];
    assert.deepEqual(packSparseNpcs(current,catalog,owner).npcScopes.hidden,['a']);
    current.npcs=[{...person('new'),npcScope:'character',npcOwner:owner}];
    assert.equal(packSparseNpcs(current,catalog,owner).npcs[0].npcScope,'chat');
});

test('legacy full baseline maps are projected only onto changed fields',()=>{
    const original=person('a'),scope=sparseNpcScope({owner,bases:{a:original,b:person('b')},overrides:{a:{stats:{hp:70}}}},owner);
    assert.deepEqual(scope.bases,{a:{stats:{hp:100}}});assert(!JSON.stringify(scope).includes('Biography'));
    const malicious=JSON.parse('{"owner":"card:world.png","overrides":{"__proto__":{"enabled":true},"a":{"constructor":1,"stats":{"hp":50}}},"hidden":["__proto__"]}');
    const clean=sparseNpcScope(malicious,owner);assert.deepEqual(clean.hidden,[]);assert(!Object.hasOwn(clean.overrides,'__proto__'));
});

test('archive identity isolates chat deltas and returning to a prior archive restores its sparse progress',()=>{
 const a=Object.assign(createArchiveCatalog([person('a')]),{ref:{archiveId:'world-A',revision:'1'}}),b=Object.assign(createArchiveCatalog([person('a',{stats:{hp:900,mp:50}})]),{ref:{archiveId:'world-B',revision:'7'}});
 const current=hydrateSparseNpcs(state(),a,owner,{activeIds:['a']});current.npcs[0].stats.hp=77;
 const saved=packSparseNpcs(current,a,owner),other=hydrateSparseNpcs(saved,b,owner,{activeIds:['a']});assert.equal(other.npcs[0].stats.hp,900);other.npcs[0].stats.hp=850;
 const back=hydrateSparseNpcs(packSparseNpcs(other,b,owner),a,owner,{activeIds:['a']});assert.equal(back.npcs[0].stats.hp,77);assert.equal(back.npcScopes.archiveId,'world-A');
 const packed=packSparseNpcs(back,a,owner);assert.ok(JSON.stringify(packed).length<3000);assert.equal(packed.npcScopes.archives['world-B'].overrides.a.stats.hp,850);
});
