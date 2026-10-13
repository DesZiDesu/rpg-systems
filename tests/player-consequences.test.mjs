import test from 'node:test';
import assert from 'node:assert/strict';
import {playerResourceNarrative,isLegacyGuessedEffect,effectTargetsPlayer} from '../src/player-consequences.js';
const names=['Noah','มาริว'];
test('automatic resource fallback reads only directly owned, confirmed numerical statements',()=>{
 for(const [story,expected]of [['Noah HP 80/100. Cora HP 0.','HP 80/100'],['คุณเสีย HP 5','lose 5 HP'],['Noah loses 5 HP','lose 5 HP'],['HP ของคุณเหลือ 0','HPเหลือ 0'],['มาริว MP: 50/100','MP= 50/100'],['<tr-header name="Noah"/><tr-narrative>HP 75/100</tr-narrative>','HP 75/100']])assert.equal(playerResourceNarrative(story,{names}),expected,story);
 assert.equal(playerResourceNarrative('Mana20 HP 70/100',{names:['Mana20']}),'HP 70/100','numbers in a player name must not become a resource value');
 assert.equal(playerResourceNarrative('Noah ST 60/100',{names}),'ST 60/100');
});
test('NPC resources, quoted claims, dreams, memories, plans and unrelated numeric text do not touch the player',()=>{
 for(const story of ['The old man was badly burned. His HP is 0.','<tr-header name="Cora"/><tr-narrative>HP 0/100</tr-narrative>','<tr-dialogue name="Cora">Noah HP 0</tr-dialogue>','“Noah HP 0”','Noah remembers HP 50.','Noah HP 50 in a dream.','Noah did not lose 5 HP.','Noah watches Cora lose 5 HP.','Noah HP belongs to Cora. Cora HP 0.','Noah aura 50 meters wide.','HP 0/100','Noah thinks of a burned house.','The fireplace burned.'])assert.equal(playerResourceNarrative(story,{names}),'',story);
 for(const story of ['Noah HP 0 if the dragon hits.','Noah HP 100 tomorrow.','Noah loses 5 HP in the planned encounter.','คุณ HP 0 หากเดินเข้ากองไฟ','คุณ HP 100 พรุ่งนี้'])assert.equal(playerResourceNarrative(story,{names}),'',story);
});
const effect={id:'effect-Burned',name:'Burned',type:'Injury',severity:'Severe',remainingTurns:3,damagePerTurn:1,staminaPerTurn:0,treatment:'Cool and treat the burn',source:'<tr-narrative>The old man has a burned face.</tr-narrative>',appliedAt:'2026-10-13T10:00:00.000Z'};
const log={source:'turn-reconcile',attacker:'Role-play event',summary:'Confirmed injury dealt 15 HP damage',baseDamage:15,finalDamage:15,at:'2026-10-13T10:00:00.010Z'};
test('legacy cleanup requires the full automatic fingerprint and a matching synthetic creation log',()=>{
 const hash=s=>s;assert.equal(isLegacyGuessedEffect(effect,[log],hash),true);
 for(const update of [{id:'manual-id'},{origin:'declared'},{treatment:'A custom medical rule'},{damagePerTurn:5},{source:''},{remainingTurns:null},{remainingTurns:3.5},{remainingTurns:10},{appliedAt:'invalid'},{name:'constructor',id:'effect-constructor'}])assert.equal(isLegacyGuessedEffect({...effect,...update},[log],hash),false);
 assert.equal(isLegacyGuessedEffect(effect,[],hash),false);
 for(const logs of [null,{},[null]])assert.equal(isLegacyGuessedEffect(effect,logs,hash),false);
 for(const update of [{source:'combat'},{at:'2026-10-13T11:00:00.000Z'},{summary:'A real fire attack'},{attacker:'Dragon'},{finalDamage:5}])assert.equal(isLegacyGuessedEffect(effect,[{...log,...update}],hash),false);
});
test('explicit NPC recipients cannot write player effects; source NPCs can affect an explicit player recipient',()=>{
 for(const target of ['player','self','YOU','Noah','มาริว','ผู้เล่น'])assert.equal(effectTargetsPlayer({target},{names}),true);
 for(const value of [{target:'Cora'},{targetName:'The old man'},{target:{id:'npc'}},{npcId:'cora'}])assert.equal(effectTargetsPlayer(value,{names}),false);
 assert.equal(effectTargetsPlayer({npcId:'cora',target:'player'},{names}),true);assert.equal(effectTargetsPlayer({}, {names}),true);
});
