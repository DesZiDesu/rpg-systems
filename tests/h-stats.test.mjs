import test from 'node:test';
import assert from 'node:assert/strict';
import {H_FIELDS,hStats,updateHStat,retainHStatsEdits} from '../src/h-stats.js';
import {hydrateSparseNpcs,packSparseNpcs} from '../src/sparse-npc-state.js';

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

test('saved dossier corrections rebase only edited fields, keeping each swipe counter and provenance',()=>{
 const before={npcs:[{id:'noor',age:'28',hStats:hStats({mouthState:'Old note',birthCount:2,mouthQuality:'Clinical baseline'}),hStatsGenerated:['mouthQuality','breastQuality']}]};
 const after=structuredClone(before);after.npcs[0].hStats.mouthState='Recovered after treatment';after.npcs[0].hStatsGenerated=['breastQuality'];
 const base=structuredClone(before);base.npcs[0].hStats.birthCount=0;base.npcs[0].hStatsGenerated.push('nippleQuality');
 const variant=structuredClone(base);variant.npcs[0].hStats.birthCount=1;
 const history={entries:[{baseState:base,variants:{reply:{state:variant}}}]};
 retainHStatsEdits(history,before,after);
 for(const snapshot of [base,variant]){assert.equal(snapshot.npcs[0].hStats.mouthState,'Recovered after treatment');assert.deepEqual(snapshot.npcs[0].hStatsGenerated,['breastQuality','nippleQuality']);}
 assert.equal(base.npcs[0].hStats.birthCount,0);assert.equal(variant.npcs[0].hStats.birthCount,1);
 assert.equal(before.npcs[0].hStats.mouthState,'Old note');
});

test('sparse dossier corrections preserve per-field canon baselines without loading or activating an NPC',()=>{
 const owner='card:adult-fixture.png',canon={id:'noor',name:'Noor',age:'28',enabled:true,met:false,hStats:hStats({mouthState:'Old note',birthCount:0})};
 const base=hydrateSparseNpcs({npcs:[],npcScopes:{}},[canon],owner,{activeIds:['noor']}),before=structuredClone(base);before.npcs[0].hStats.birthCount=2;
 const after=structuredClone(before);after.npcs[0].hStats.mouthState='Recovered after treatment';
 const pack=value=>packSparseNpcs(value,[canon],owner),packed=pack(after),old=pack(base),variant=pack(before);
 const history={entries:[{baseState:old,variants:{reply:{state:variant}}}]};retainHStatsEdits(history,before,after,packed);
 for(const snapshot of [old,variant]){assert.equal(snapshot.npcs.length,0);assert.deepEqual(snapshot.npcScopes.activeIds,['noor']);const restored=hydrateSparseNpcs(snapshot,[canon],owner);assert.equal(restored.npcs[0].hStats.mouthState,'Recovered after treatment');assert.equal(restored.npcs[0].met,false);}
 assert.equal(hydrateSparseNpcs(old,[canon],owner).npcs[0].hStats.birthCount,0);assert.equal(hydrateSparseNpcs(variant,[canon],owner).npcs[0].hStats.birthCount,2);
 const newCanon={...canon,hStats:{...canon.hStats,mouthState:'Later canonical correction'}};
 assert.equal(hydrateSparseNpcs(old,[newCanon],owner).npcs[0].hStats.mouthState,'Later canonical correction');
 const other=structuredClone(old);other.npcScopes.owner='card:other.png';const bytes=JSON.stringify(other);retainHStatsEdits({entries:[{baseState:other}]},before,after,packed);assert.equal(JSON.stringify(other),bytes);
});

test('a manual reset to the canonical value removes only that old sparse override',()=>{
 const owner='card:adult-fixture.png',canon={id:'noor',name:'Noor',age:'28',hStats:hStats({mouthState:'Clinical baseline',birthCount:0})};
 const before=hydrateSparseNpcs({npcs:[],npcScopes:{}},[canon],owner,{activeIds:['noor']});before.npcs[0].hStats.mouthState='Old correction';before.npcs[0].hStats.birthCount=2;
 const after=structuredClone(before);after.npcs[0].hStats.mouthState=canon.hStats.mouthState;
 const old=packSparseNpcs(before,[canon],owner);retainHStatsEdits({entries:[{baseState:old}]},before,after,packSparseNpcs(after,[canon],owner));
 assert.equal(Object.hasOwn(old.npcScopes.overrides.noor.hStats,'mouthState'),false);assert.equal(old.npcScopes.overrides.noor.hStats.birthCount,2);
 assert.equal(hydrateSparseNpcs(old,[canon],owner).npcs[0].hStats.mouthState,'Clinical baseline');
});
