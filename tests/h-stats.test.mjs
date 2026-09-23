import test from 'node:test';
import assert from 'node:assert/strict';
import {H_FIELDS,hStats,updateHStat} from '../h-stats.js';

test('all requested partner fields are available for every gender and no extra Condition key is stored',()=>{
 const names=H_FIELDS.map(field=>field.key);
 for(const key of ['mouthQuality','mouthState','penisSize','penisState','penisQuality','penisLastPartner',
  'breastQuality','breastState','breastLastPartner','nippleQuality','nippleState','nippleLastPartner',
  'vaginaQuality','vaginaState','vaginaLastPartner','anusQuality','anusState','anusLastPartner',
  'oralActCount','ejaculateLiters','unprotectedSexCount','oralSexCount','analSexCount','swallowedLiters',
  'infidelityStage','infidelityProgress','loyaltyHearts','pregnant','pregnancyFather','favoriteSexPartner',
  'favoritePenisOwner','preferredPenisSize','favoritePosition','birthCount','orgasmCount','currentFantasy'])assert.ok(names.includes(key),key);
 assert.equal(names.includes('condition'),false);
 assert.deepEqual(hStats({condition:'extra',penisSize:'18 cm',breastQuality:'Established'}).penisSize,'18 cm');
 assert.equal(Object.hasOwn(hStats({condition:'extra'}),'condition'),false);
});

test('counts, liters, stages and hearts normalize and reject invalid updates',()=>{
 let state=hStats({oralSexCount:2,ejaculateLiters:0.125,infidelityStage:3,infidelityProgress:50,loyaltyHearts:5,pregnant:false});
 state=updateHStat(state,'oralSexCount','inc',2);
 state=updateHStat(state,'ejaculateLiters','inc',0.125);
 state=updateHStat(state,'loyaltyHearts','inc',-1);
 assert.equal(state.oralSexCount,4);assert.equal(state.ejaculateLiters,0.25);assert.equal(state.loyaltyHearts,4);
 assert.equal(updateHStat(state,'unknown','set','bad'),null);
 assert.equal(updateHStat(state,'pregnant','set','false'),null);
 assert.equal(updateHStat(state,'oralSexCount','inc',NaN),null);
 assert.equal(hStats({infidelityStage:8,infidelityProgress:121,loyaltyHearts:-1}).infidelityStage,5);
 assert.equal(hStats({infidelityProgress:121}).infidelityProgress,100);
 assert.equal(hStats({loyaltyHearts:-1}).loyaltyHearts,0);
 assert.equal(hStats({favoritePosition:'new'},{oralSexCount:4}).oralSexCount,4);
});
