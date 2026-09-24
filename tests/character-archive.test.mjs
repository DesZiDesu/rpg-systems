import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHIVE_FIELDS,readCharacterArchive,writeCharacterArchive,migrateCharacterArchives} from '../src/character-archive.js';

function fixture() {
    const cards=[{avatar:'one.png',data:{extensions:{}},json_data:JSON.stringify({data:{extensions:{}}})},{avatar:'two.png',data:{extensions:{}}}];
    const settings={npcCharacterLibraries:{'card:one.png':[{id:'old',name:'Original'}]},loreCharacterLibraries:{'card:one.png':[{id:'old-lore',content:'Original fact'}]}};
    const requests=[];let saves=0;
    const context={characters:cards,characterId:0,getRequestHeaders:()=>({'Content-Type':'application/json'}),saveSettingsDebounced(){saves++;},
        fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:true,status:200};}};
    return {cards,settings,context,requests,saves:()=>saves};
}

test('card write is acknowledged before dropping a legacy archive, and excludes it from global settings',async()=>{
    const {cards,settings,context,requests,saves}=fixture();
    const next=[{id:'new',name:'Updated'}];
    let finish;
    context.fetch=async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return new Promise(resolve=>{finish=resolve;});};
    const writing=writeCharacterArchive(context,settings,'card:one.png','npcs',next);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(readCharacterArchive(context,settings,'card:one.png','npcs')[0].name,'Original');
    assert.equal(saves(),0);
    finish({ok:true,status:200});await writing;
    assert.deepEqual(readCharacterArchive(context,settings,'card:one.png','npcs'),next);
    assert.equal(settings.npcCharacterLibraries,undefined);
    assert.equal(saves(),1);
    assert.equal(requests[0].url,'/api/characters/merge-attributes');
    assert.deepEqual(requests[0].body.data.extensions[ARCHIVE_FIELDS.npcs],next);
    assert.deepEqual(JSON.parse(cards[0].json_data).data.extensions[ARCHIVE_FIELDS.npcs],next);
});

test('a failed card write preserves the original NPC and Lore without claiming success',async()=>{
    const {cards,settings,context,saves}=fixture();
    context.fetch=async()=>({ok:false,status:503});
    await assert.rejects(writeCharacterArchive(context,settings,'card:one.png','npcs',[{id:'other'}]),/503/);
    await assert.rejects(writeCharacterArchive(context,settings,'card:one.png','lore',[{id:'other'}]),/503/);
    assert.equal(readCharacterArchive(context,settings,'card:one.png','npcs')[0].name,'Original');
    assert.equal(readCharacterArchive(context,settings,'card:one.png','lore')[0].content,'Original fact');
    assert.deepEqual(cards[0].data.extensions,{});assert.equal(saves(),0);
});

test('migration keeps absent cards, prefers an existing card archive and saves settings once',async()=>{
    const {cards,settings,context,requests,saves}=fixture();
    cards[0].data.extensions[ARCHIVE_FIELDS.lore]=[{id:'card-lore',content:'Newer fact'}];
    settings.npcCharacterLibraries['card:offline.png']=[{id:'offline'}];
    await migrateCharacterArchives(context,settings);
    assert.equal(requests.length,1);
    assert.equal(saves(),1);
    assert.equal(settings.npcCharacterLibraries['card:one.png'],undefined);
    assert.equal(settings.npcCharacterLibraries['card:offline.png'][0].id,'offline');
    assert.equal(settings.loreCharacterLibraries,undefined);
    assert.equal(readCharacterArchive(context,settings,'card:one.png','lore')[0].content,'Newer fact');
});

test('writes to the same card are serialized so the last accepted edit wins',async()=>{
    const {cards,settings,context,requests}=fixture();
    let finish;
    context.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return requests.length===1?new Promise(resolve=>{finish=resolve;}):{ok:true,status:200};};
    const first=writeCharacterArchive(context,settings,'card:one.png','npcs',[{id:'first'}]);
    const second=writeCharacterArchive(context,settings,'card:one.png','npcs',[{id:'second'}]);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(requests.length,1);
    finish({ok:true,status:200});await Promise.all([first,second]);
    assert.equal(requests.length,2);
    assert.equal(cards[0].data.extensions[ARCHIVE_FIELDS.npcs][0].id,'second');
});
