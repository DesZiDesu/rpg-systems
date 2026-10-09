import test from 'node:test';
import assert from 'node:assert/strict';
import * as p from '../src/world-presets.js';
import {defaultCurrencyScheme,currencyValue} from '../src/currency-config.js';
import {normalizeStatTraining,normalizeUserCustomStats} from '../src/stat-training.js';
import {exportPowerPreset} from '../src/power-presets.js';
import {FORGE_DEFAULTS,exportForgePreset} from '../src/forge-presets.js';
import {isBlockedHost} from '../src/host-policy.js';
const power={mode:'custom',name:'Madoka',definitions:[{id:'soul_gem',name:'Soul Gem',description:'A magical reserve',type:'resource',max:100,initial:0,ranks:[],selectable:true}]};
const forge={mode:'custom',name:'Madoka',...FORGE_DEFAULTS};
const training=normalizeStatTraining({definitions:[{id:'focus',name:'Focus',description:'Concentration',methods:['Meditation'],initial:5,min:0,max:100,gain:1}],hidden:[]});
const currency=()=>({name:'Credits',scheme:{...defaultCurrencyScheme(),units:[{...defaultCurrencyScheme().units[2],name:'Credit',symbol:'CR',value:1,aliases:[]}]}});
const state=()=>({player:{hp:{current:80,max:120},customStats:{focus:33},attributes:{strength:25}},progression:{currency:{name:'Coins',gold:1,silver:23,copper:45}},statTraining:training,inventory:[{id:'book',quantity:3}],customPowers:{soul_gem:42},social:{party:{sharedFunds:{gold:0,silver:3,copper:1}},guilds:[]}});
test('world presets round-trip configurations without user data, device settings or secrets',()=>{
 const source=p.exportWorldPreset({powerPreset:power,forgePreset:forge,currencyPreset:currency(),trainingPreset:training,loreOptions:{budget:6000,mode:'relevant'},systems:{enableMarketplace:true,apiKey:'secret',enableVoiceAddon:true},player:{name:'Private'},apiKey:'secret'},'Madoka');
 assert.doesNotMatch(source,/secret|Private|enableVoiceAddon/);const imported=p.importWorldPreset(source);assert.equal(imported.name,'Madoka');assert.equal(imported.config.powerPreset.definitions[0].id,'soul_gem');assert.equal(imported.config.currencyPreset.scheme.units.length,1);assert.deepEqual(imported.config.systems,{enableMarketplace:true});
});
test('legacy Power/Forge and currency-only files import into the same reusable library',()=>{
 assert.equal(p.importWorldPreset(exportPowerPreset(power)).config.powerPreset.name,'Madoka');assert.equal(p.importWorldPreset(exportForgePreset(forge)).config.forgePreset.name,'Madoka');
 const file=JSON.stringify({format:'roleforge-currency-preset',version:1,preset:currency()});assert.deepEqual(Object.keys(p.importWorldPreset(file).config),['currencyPreset']);
 for(const bad of ['{}','{',JSON.stringify({format:'roleforge-world-preset',version:2,name:'Bad',config:{systems:{autoTrack:true}}}),' '.repeat(p.PRESET_FILE_LIMIT+1)])assert.throws(()=>p.importWorldPreset(bad));
});
test('changing denomination schemes preserves player/party/guild ledger values and progress',()=>{
 const before=state();before.social.guilds=[{treasury:{gold:0,silver:2,copper:3}}];const next=p.applyPresetState(before,{currencyPreset:currency(),powerPreset:power,forgePreset:forge});assert.equal(currencyValue(next.progression.currency),currencyValue(before.progression.currency));assert.equal(next.social.party.sharedFunds.copper,301);assert.equal(next.social.guilds[0].treasury.copper,203);assert.deepEqual(next.player,before.player);assert.deepEqual(next.inventory,before.inventory);assert.deepEqual(next.customPowers,before.customPowers);assert.equal(before.progression.currency.gold,1);
});
test('pending trade or incompatible stat bounds reject the complete preset without partial writes',()=>{
 const before=state();before.commerce={sessions:[{status:'open'}]};assert.throws(()=>p.applyPresetState(before,{currencyPreset:currency(),trainingPreset:training}),/active trades/);assert.equal(before.progression.currency.gold,1);
 const limited={...training,definitions:training.definitions.map(d=>({...d,max:20}))};assert.throws(()=>p.applyPresetState(state(),{trainingPreset:limited}),/outside/);
});
test('inactive training definitions retain values and new definitions use initial values only once',()=>{
 const before=state(),empty=normalizeStatTraining({definitions:[],hidden:[]}),next=p.applyPresetState(before,{trainingPreset:empty});assert.equal(normalizeUserCustomStats(next.player.customStats,empty).focus,33);const restored=p.applyPresetState(next,{trainingPreset:training});assert.equal(restored.player.customStats.focus,33);
 const missing=state();delete missing.player.customStats.focus;assert.equal(p.applyPresetState(missing,{trainingPreset:training}).player.customStats.focus,5);
});
test('library rename/update/delete never changes a loaded chat snapshot and rejects duplicate names',()=>{
 const records=p.saveLibraryPreset([],{name:'Madoka',config:{powerPreset:power}}),id=records[0].id,chat={version:1,config:structuredClone(records[0].config)};
 const renamed=p.saveLibraryPreset(records,{name:'Mushoku',config:{powerPreset:{...power,name:'Mushoku'}}},id);assert.equal(renamed[0].name,'Mushoku');assert.equal(p.readChatPreset({[p.CHAT_PRESET_KEY]:chat}).powerPreset.name,'Madoka');assert.throws(()=>p.saveLibraryPreset(renamed,{name:'mushoku',config:{powerPreset:power}}),/already exists/);
 assert.equal(p.presetLibrary({[p.PRESET_LIBRARY_KEY]:renamed.filter(r=>r.id!==id)}).length,0);assert.equal(chat.config.powerPreset.name,'Madoka');
});
test('public-server policy matches the target host across protocols/ports and cannot match lookalike suffixes',()=>{
 for(const url of ['https://chat.rolezy.com','http://CHAT.ROLEZY.COM:8000','https://chat.rolezy.com.','https://test.chat.rolezy.com'])assert.equal(isBlockedHost(new URL(url)),true,url);
 for(const url of ['http://localhost:8000','https://private.example','https://rolezy.com','https://chat.rolezy.com.example','https://notchat.rolezy.com','https://private.example/?host=chat.rolezy.com'])assert.equal(isBlockedHost(new URL(url)),false,url);
});
test('currency snapshots retain legacy icon choices while explicit per-unit art takes priority',()=>{
 const s=state();delete s.progression.currency.scheme;
 assert.ok(p.currentCurrencyPreset(s,'gem').scheme.units.every(d=>d.iconSet==='gem'));
 assert.equal(s.progression.currency.scheme,undefined,'capturing a preset leaves the legacy wallet untouched');
 s.progression.currency.scheme=defaultCurrencyScheme();s.progression.currency.scheme.units[0].iconSet='neon';
 assert.equal(p.currentCurrencyPreset(s,'gem').scheme.units[0].iconSet,'neon');
});
