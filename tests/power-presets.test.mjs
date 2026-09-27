import test from 'node:test';
import assert from 'node:assert/strict';
import * as p from '../src/power-presets.js';
const def=(id,type='number')=>p.powerDefinition({id,name:id,description:'คำอธิบาย',type,max:100,initial:0,ranks:['Novice','Master'],color:'#112233',icon:'bolt',selectable:true});
test('legacy saves default to Original; Custom is empty and card-owned',()=>{
 const s={};assert.equal(p.readPowerConfig(s,'a').mode,'tretaresia');
 p.writePowerConfig(s,{mode:'custom',name:'World A',definitions:[]},'a','a');assert.deepEqual(p.readPowerConfig(s,'a').definitions,[]);assert.equal(p.readPowerConfig(s,'b').mode,'tretaresia');
 assert.throws(()=>p.writePowerConfig(s,{mode:'custom',definitions:[]},'a','b'));
});
test('custom schemas roundtrip without character values and reject malformed imports atomically',()=>{
 const c={mode:'custom',name:'My world',definitions:[def('chakra'),def('rank','rank'),def('gift','toggle'),def('energy','resource')]};
 assert.deepEqual(p.importPowerPreset(p.exportPowerPreset(c)),c);
 for(const source of ['{}','{',JSON.stringify({format:'roleforge-power-preset',version:2,preset:c}),JSON.stringify({format:'roleforge-power-preset',version:1,preset:{...c,definitions:[def('a'),def('a')]}})])assert.throws(()=>p.importPowerPreset(source));
 assert.throws(()=>def('constructor'));assert.throws(()=>def('a.b'));assert.throws(()=>p.validatePowerConfig({...c,definitions:Array.from({length:65},(_,i)=>def('p'+i))}));
});
test('only declared power values can be changed; types and ranges are enforced',()=>{
 const c={mode:'custom',definitions:[def('chakra'),def('rank','rank'),def('gift','toggle')]},state={customPowers:{archived:8}};
 assert(p.applyPowerOperation(state,c,'set','customPowers.chakra',150));assert.equal(state.customPowers.chakra,100);
 assert(p.applyPowerOperation(state,c,'inc','customPowers.chakra',-200));assert.equal(state.customPowers.chakra,0);
 assert(p.applyPowerOperation(state,c,'set','customPowers.rank',5));assert.equal(state.customPowers.rank,1);
 assert(p.applyPowerOperation(state,c,'set','customPowers.gift',true));
 for(const op of [['set','customPowers.unknown',3],['set','customPowers.constructor',3],['inc','customPowers.gift',1],['set','customPowers.chakra','60'],['set','customPowers.chakra',Infinity]])assert.equal(p.applyPowerOperation(state,c,...op),false);
 assert.equal(state.customPowers.archived,8);assert.equal(p.applyPowerOperation(state,{...c,mode:'tretaresia'},'set','customPowers.chakra',3),false);
});
test('renaming a definition keeps saved values; deleted definitions keep archived values',()=>{
 const state={customPowers:{chakra:72}},c={mode:'custom',name:'Custom',definitions:[{...def('chakra'),name:'Life force'}]};
 const reloaded=p.importPowerPreset(p.exportPowerPreset(c));assert.equal(p.powerValue(reloaded.definitions[0],state.customPowers.chakra),72);
 assert.deepEqual(p.normalizePowerValues({...state.customPowers,bad:'no'}),{chakra:72});
 assert.match(p.customPowerPrompt(c,state),/Life force/);assert.match(p.customPowerPrompt(c,state),/72/);
});
