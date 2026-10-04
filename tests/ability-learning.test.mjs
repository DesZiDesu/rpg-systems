import test from 'node:test';
import assert from 'node:assert/strict';
import {needsAbilityDetails,applyUnderstandingDetails} from '../src/ability-learning.js';
import {normalizePowerTrainingResult,applyPowerTrainingResult,normalizePowerMastery,powerTrainingPrompt} from '../src/power-mastery.js';
const target={id:'technique:fire',name:'Fire Ball',kind:'technique',description:'',ability:null};
const details={targetId:target.id,description:'รวมพลังเป็นลูกไฟ',ability:{kind:'magic',effect:'ปล่อยลูกไฟไปยังเป้าหมาย',element:'ไฟ',costKnown:false,costs:[],cooldown:{unit:'unknown'},weaknesses:['ถูกรบกวนระหว่างร่ายได้'],incantation:{required:true,short:'เปลวเพลิง จงรวมตัว!',full:'เปลวเพลิงผู้ส่องทางในราตรี\nจงรวมตัวในมือข้า แล้วพุ่งไปยังเป้าหมาย!',silent:{available:false}}}};
const state=()=>({skills:[{id:'sword',name:'เพลงดาบ',mastery:20}],proficiencies:{techniques:[{id:'fire',name:'Fire Ball',description:'',proficiency:3}]}});
test('understanding fills the existing ability in the same result without acquiring records or awarding mastery twice',()=>{
    const raw={outcome:'partial',title:'ความเข้าใจ',narration:'คุณเข้าใจการรวมไฟ',masteryDelta:3,abilityDetails:details};
    const result=normalizePowerTrainingResult(JSON.stringify({training:raw}));assert.ok(result.abilityDetails);
    const fresh=state();assert.equal(applyUnderstandingDetails(fresh,target,'understanding',result.abilityDetails),'saved');
    assert.equal(fresh.proficiencies.techniques[0].description,details.description);assert.equal(fresh.proficiencies.techniques[0].ability.effect,details.ability.effect);
    assert.equal(fresh.proficiencies.techniques[0].proficiency,3);assert.equal(fresh.skills.length,1);assert.equal(fresh.proficiencies.techniques.length,1);
    const mastery=applyPowerTrainingResult({}, {powerId:target.id,powerName:target.name,kind:'technique'}, {...result,detailsStatus:'saved'});
    assert.equal(normalizePowerMastery(mastery).session.result.detailsStatus,'saved');
    assert.equal(normalizePowerMastery(mastery).session.result.abilityDetails.targetId,target.id);
});
test('detail learning respects target, choice, existing facts, and cannot unlock silent casting',()=>{
    const fresh=state();fresh.proficiencies.techniques[0].ability={kind:'magic',effect:'เดิม',costKnown:true,costs:[{resource:'MP',amount:5}],incantation:{required:true,full:'เดิมเต็ม'}};
    const original=structuredClone(fresh);
    assert.equal(applyUnderstandingDetails(fresh,target,'control',details),'unchanged');assert.deepEqual(fresh,original);
    assert.equal(applyUnderstandingDetails(fresh,target,'understanding',{...details,targetId:'skill:sword'}),'missing');assert.deepEqual(fresh,original);
    assert.equal(applyUnderstandingDetails(fresh,target,'understanding',details),'saved');
    const ability=fresh.proficiencies.techniques[0].ability;assert.equal(ability.effect,'เดิม');assert.equal(ability.costs[0].amount,5);assert.equal(ability.incantation.full,'เดิมเต็ม');
    const empty=state();assert.equal(applyUnderstandingDetails(empty,target,'understanding',{...details,ability:{...details.ability,incantation:{required:true,silent:{available:true}}}}),'saved');assert.equal(empty.proficiencies.techniques[0].ability.incantation.silent.available,false);
});
test('physical understanding explains skill without adding chanting and incomplete responses do not change data',()=>{
    const fresh=state(),sword={id:'skill:sword',name:'เพลงดาบ',kind:'skill',description:''};
    assert.equal(applyUnderstandingDetails(fresh,sword,'understanding',null),'missing');assert.equal(fresh.skills[0].ability,undefined);
    assert.equal(applyUnderstandingDetails(fresh,sword,'understanding',{...details,targetId:sword.id,ability:{...details.ability,kind:'physical'}}),'saved');
    assert.equal(fresh.skills[0].ability.incantation.required,false);assert.equal(fresh.skills[0].ability.incantation.full,'');assert.equal(fresh.skills[0].mastery,20);
    assert.ok(needsAbilityDetails(target));assert.equal(needsAbilityDetails({kind:'magic'}),false);
    const prompt=powerTrainingPrompt({power:target,choice:'understanding',language:'th'});assert.match(prompt,/SAME training JSON add abilityDetails/);assert.match(prompt,/technique:fire/);
    assert.doesNotMatch(powerTrainingPrompt({power:target,choice:'control'}),/UNDERSTANDING METADATA/);
    assert.match(powerTrainingPrompt({power:target,choice:'understanding',language:'th',incantationLanguage:'Latin'}),/full chants in \"Latin\"/);
});
