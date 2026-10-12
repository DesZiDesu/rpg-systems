import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveBrowser,changeArchiveEnabled,undoArchiveEnabled,removeArchiveEntries} from '../src/archive-browser.js';
import {writeCharacterLore,characterLore,lorePrompt} from '../src/lore-core.js';

const npcs=Array.from({length:47},(_,i)=>({id:`npc-${i}`,name:`NPC ${String(i).padStart(2,'0')}`,enabled:i%3!==0,notes:'Original',alternateProfiles:[{id:'older',fields:{age:'40'}}],portraitPath:'keep.webp'}));

test('state filters and bounded pages find disabled NPCs without mutating the archive',()=>{
    const before=structuredClone(npcs),browser=createArchiveBrowser();
    browser.setFilter('disabled');browser.setPage(99);const view=browser.view(npcs);
    assert.equal(view.page,0);assert.equal(view.filtered.length,16);assert.ok(view.items.every(item=>item.enabled===false));
    browser.setFilter('all');browser.setPage(2);assert.equal(browser.view(npcs).items.length,7);
    assert.deepEqual(npcs,before);
    assert.equal(createArchiveBrowser().view([{id:'legacy',name:'Legacy'}]).counts.enabled,1);
});

test('selection spans pages, includes only the filtered results, and resets at search/filter boundaries',()=>{
    const browser=createArchiveBrowser();browser.setSelecting(true);browser.selectMany(browser.view(npcs).items);
    browser.setPage(1);browser.select(browser.view(npcs).items[0].id,true);assert.equal(browser.view(npcs).selected.length,21);
    browser.setFilter('disabled');assert.equal(browser.view(npcs).selected.length,0);browser.selectMany(browser.view(npcs).filtered);
    assert.equal(browser.view(npcs).selected.length,16);
    browser.setQuery('NPC 0');assert.equal(browser.view(npcs).selected.length,0);
    browser.selectMany(browser.view(npcs).filtered);assert.deepEqual(browser.view(npcs).selected,['npc-0','npc-3','npc-6','npc-9']);
    browser.setPage(99);assert.equal(browser.view(npcs).page,0);
    browser.setSelecting(false);assert.deepEqual(browser.view(npcs).selected,[]);
});

test('a removed selection is pruned and a new scope starts with no hidden targets',()=>{
    const browser=createArchiveBrowser();browser.setSelecting(true);browser.select('npc-1',true);browser.select('npc-2',true);
    assert.deepEqual(browser.view(npcs.filter(item=>item.id!=='npc-1')).selected,['npc-2']);
    browser.reset();assert.deepEqual(browser.view(npcs).selected,[]);assert.equal(browser.selecting,false);assert.equal(browser.filter,'all');
});

test('bulk activation changes only chosen states, with no duplicate writes or profile loss',()=>{
    const before=structuredClone(npcs),result=changeArchiveEnabled(npcs,['npc-0','npc-0','npc-1','not-saved'],true);
    assert.deepEqual(result.changes,[{id:'npc-0',before:false,after:true}]);
    assert.deepEqual(result.entries[0],{...before[0],enabled:true});assert.equal(result.entries[1],npcs[1]);
    assert.deepEqual(npcs,before);
    assert.deepEqual(changeArchiveEnabled(result.entries,['npc-0'],true).changes,[]);
});

test('Undo keeps newer descriptions and activation choices, and never resurrects deleted records',()=>{
    const result=changeArchiveEnabled(npcs,['npc-1','npc-2','npc-4'],false);
    const edited=result.entries.filter(item=>item.id!=='npc-4').map(item=>item.id==='npc-1'?{...item,notes:'Edited after toggle'}:item.id==='npc-2'?{...item,enabled:true}:item);
    const undo=undoArchiveEnabled(edited,result.changes);
    assert.deepEqual(undo.changes,[{id:'npc-1',before:false,after:true}]);
    assert.equal(undo.entries.find(item=>item.id==='npc-1').notes,'Edited after toggle');
    assert.equal(undo.entries.find(item=>item.id==='npc-2').enabled,true);assert.equal(undo.entries.some(item=>item.id==='npc-4'),false);
});

test('bulk Lore activation respects the existing budget atomically, preserves pins and does not enter another card',()=>{
    const entries=[{id:'one',title:'One',content:'x'.repeat(700),enabled:false,always:true,keywords:['lake']},{id:'two',title:'Two',content:'y'.repeat(700),enabled:false,always:false,keywords:['forest']}];
    const settings={loreCharacterOptions:{card:{mode:'all',budget:1000}}};writeCharacterLore(settings,entries,'card','card');
    const result=changeArchiveEnabled(characterLore(settings,'card'),['one','two'],true,item=>item.enabled===true);
    assert.throws(()=>writeCharacterLore(settings,result.entries,'card','card'),/1,000/);
    assert.deepEqual(characterLore(settings,'card'),entries);assert.deepEqual(characterLore(settings,'another'),[]);
    const enabled=changeArchiveEnabled(entries,['one'],true,item=>item.enabled===true);writeCharacterLore(settings,enabled.entries,'card','card');
    assert.match(lorePrompt(characterLore(settings,'card')),/One/);assert.doesNotMatch(lorePrompt(characterLore(settings,'card')),/Two/);
    assert.deepEqual(characterLore(settings,'card')[0].keywords,['lake']);assert.equal(characterLore(settings,'card')[0].always,true);
});

test('batch deletion targets unique selected IDs and keeps unselected profile objects intact',()=>{
 const before=structuredClone(npcs),result=removeArchiveEntries(npcs,['npc-0','npc-20','npc-46','npc-20','missing']);
 assert.deepEqual(result.removed.map(item=>item.id),['npc-0','npc-20','npc-46']);assert.equal(result.entries.length,44);
 assert.equal(result.entries[0],npcs[1]);assert.deepEqual(npcs,before);
 assert.deepEqual(removeArchiveEntries(npcs,[]).entries,npcs);assert.deepEqual(removeArchiveEntries([],['npc-0']),{entries:[],removed:[]});
});

test('all filtered selections delete across pages without deleting other states or matching by names',()=>{
 const browser=createArchiveBrowser();browser.setFilter('disabled');browser.setSelecting(true);browser.selectMany(browser.view(npcs).filtered);
 const result=removeArchiveEntries(npcs,browser.view(npcs).selected);assert.equal(result.removed.length,16);assert.ok(result.entries.every(item=>item.enabled));
 assert.equal(removeArchiveEntries([{id:'keep',name:'Same'},{id:'remove',name:'Same'}],['remove']).entries[0].id,'keep');
 browser.clear();const view=browser.view(result.entries);assert.deepEqual(view.selected,[]);assert.equal(view.items.length,0);assert.equal(view.page,0);
});
