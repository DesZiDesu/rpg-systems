import test from 'node:test';
import assert from 'node:assert/strict';
import {activePowerDefinitions,powerDashboard} from '../src/power-dashboard.js';
const definitions=['trained','chosen','unused'].map(id=>({id,name:id,description:'Lore and usage constraints.',type:'number',max:100,initial:0,icon:'bolt',color:'#d6b458'})),config={mode:'custom',name:'Fate',definitions};
test('Power dashboard shows acquired and selected powers without unused zero cards or raw editors',()=>{
 const state={customPowers:{trained:2},customPowerSelections:['chosen'],powerMastery:{entries:{trained:{value:25}}}};assert.deepEqual(activePowerDefinitions(config,state).map(d=>d.id),['trained','chosen']);const html=powerDashboard(config,state);assert.ok(html.includes('data-power-record="trained"'));assert.ok(html.includes('data-power-record="chosen"'));assert.ok(!html.includes('data-power-record="unused"'));assert.ok(!html.includes('<input'));assert.ok(html.includes('manage-powers'));assert.ok(html.includes('Train mastery'));assert.ok(html.includes('25%'));
});
test('existing Resource power types retain their current/max gauge, including a selected exhausted reserve',()=>{
 const cfg={mode:'custom',name:'Seals',definitions:[{...definitions[0],id:'seal',type:'resource',max:3,initial:3}]};const html=powerDashboard(cfg,{customPowers:{seal:0},customPowerSelections:['seal']});assert.ok(html.includes('0 / 3'));assert.ok(html.includes('aria-valuenow="0"'));assert.ok(html.includes('aria-valuemax="3"'));assert.ok(html.includes('role="meter"'));
});
test('rank labels and user-authored names/descriptions are escaped',()=>{
 const cfg={...config,name:'<script>bad</script>',definitions:[{...definitions[0],type:'rank',max:1,initial:0,ranks:['<em>Novice</em>','Master'],name:'<img src=x>',description:'<b>Safe text</b>'}]};const html=powerDashboard(cfg,{customPowers:{trained:0},customPowerSelections:['trained']});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;em&gt;Novice'));assert.ok(html.includes('&lt;b&gt;Safe text'));
});
