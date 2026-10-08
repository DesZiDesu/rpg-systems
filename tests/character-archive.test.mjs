import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHIVE_FIELDS,readCharacterArchive,writeCharacterArchive,migrateCharacterArchives,readCharacterPack,writeCharacterPack,characterDefaultSettings} from '../src/character-archive.js';

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

test('one-card setup and archives save atomically without changing another extension or local overrides',async()=>{
    const {cards,settings,context,requests}=fixture();
    cards[0].data.extensions.regex_scripts=[{id:'mvu',replaceString:'<StatusPlaceHolderImpl/>'}];
    const pack={format:'roleforge-character-pack',version:1,powerPreset:{mode:'custom',name:'Pack',definitions:[]},loreOptions:{mode:'relevant',budget:6000},initialState:{player:{hp:{current:37,max:100}}}};
    const next=await writeCharacterPack(context,settings,'card:one.png',pack,{npcs:[{id:'stable',name:'Cora'}],lore:[{id:'fact',title:'Library',content:'World fact',enabled:true}]});
    assert.equal(requests.length,1);assert.deepEqual(Object.keys(requests[0].body.data.extensions).sort(),['roleforge_character_pack','tretaresia_rpg_lore','tretaresia_rpg_npcs']);
    assert.deepEqual(cards[0].data.extensions.regex_scripts,[{id:'mvu',replaceString:'<StatusPlaceHolderImpl/>'}]);
    assert.equal(readCharacterPack(context,'card:one.png').initialState.player.hp.current,37);
    assert.deepEqual(JSON.parse(cards[0].json_data).data.extensions.roleforge_character_pack,next);
    assert.equal(readCharacterArchive(context,settings,'card:one.png','npcs')[0].id,'stable');
    assert.equal(settings.npcCharacterLibraries,undefined);assert.equal(settings.loreCharacterLibraries,undefined);
    const explicit={roleforgePowerPresets:{'card:one.png':{mode:'custom',name:'User empty',definitions:[]}}};
    assert.equal(characterDefaultSettings(explicit,'card:one.png',next).roleforgePowerPresets['card:one.png'].name,'User empty');
});

test('failed or invalid pack save keeps the entire card and legacy data unchanged',async()=>{
    const {cards,settings,context,requests}=fixture(),before=JSON.stringify({cards,settings});
    context.fetch=async()=>({ok:false,status:503});
    await assert.rejects(writeCharacterPack(context,settings,'card:one.png',{format:'roleforge-character-pack',version:1},{npcs:[],lore:[]}),/503/);
    assert.equal(JSON.stringify({cards,settings}),before);
    assert.throws(()=>writeCharacterPack(context,settings,'card:one.png',{format:'roleforge-character-pack',version:1,powerPreset:{mode:'invalid'}}),/powerPreset/);
    assert.throws(()=>writeCharacterPack(context,settings,'card:one.png',{format:'roleforge-character-pack',version:1,initialState:{large:'x'.repeat(1024*1024)}}),/initialState/);
    assert.equal(requests.length,0);assert.equal(JSON.stringify({cards,settings}),before);
});

test('cached pack defaults stay stable, refresh on card edits and never apply card API settings',()=>{
    const {cards,context}=fixture();
    cards[0].data.extensions.roleforge_character_pack={format:'roleforge-character-pack',version:1,powerPreset:{mode:'custom',name:'A',definitions:[]},apiKey:'card-secret',scripts:['throw Error()'],initialState:{player:{name:'Seed'}}};
    const first=readCharacterPack(context,'card:one.png');assert.equal(readCharacterPack(context,'card:one.png'),first);
    assert.equal(first.apiKey,undefined);assert.equal(first.scripts,undefined);
    cards[0].data.extensions.roleforge_character_pack={...cards[0].data.extensions.roleforge_character_pack,name:'Changed'};
    assert.notEqual(readCharacterPack(context,'card:one.png'),first);assert.equal(readCharacterPack(context,'card:one.png').name,'Changed');
    const settings={apiKey:'user-secret'},effective=characterDefaultSettings(settings,'card:one.png',first);
    assert.equal(effective.apiKey,'user-secret');assert.equal(settings.roleforgePowerPresets,undefined);
});


test('native deep-merge writes remove obsolete pack/template keys and reject malformed object replacement',async()=>{
    const {cards,settings,context,requests}=fixture();
    cards[0].data.extensions.roleforge_character_pack={format:'roleforge-character-pack',version:1,apiKey:'old-card-extra',initialState:{player:{name:'Old',secretField:'Private'},contacts:[{name:'Private contact'}],commerce:{sessions:[{id:'old-trade'}]}}};
    const pack={format:'roleforge-character-pack',version:1,initialState:{player:{name:'New'}}};
    await writeCharacterPack(context,settings,'card:one.png',pack);
    const update=requests[0].body.data.extensions.roleforge_character_pack;
    assert.equal(update.apiKey,'__@@UNSET@@__');assert.equal(update.initialState.contacts,'__@@UNSET@@__');assert.equal(update.initialState.commerce,'__@@UNSET@@__');
    assert.equal(update.initialState.player.secretField,'__@@UNSET@@__');assert.equal(update.initialState.player.name,'New');
    assert.deepEqual(cards[0].data.extensions.roleforge_character_pack,pack);
    assert.equal(JSON.stringify(requests[0].body).includes('Private contact'),false);
    cards[0].data.extensions.roleforge_character_pack=[];
    await assert.rejects(writeCharacterPack(context,settings,'card:one.png',pack),/malformed/);
    assert.equal(requests.length,1,'invalid native merge cannot claim a successful save');
});
