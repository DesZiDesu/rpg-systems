import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSceneCompletion} from '../src/scene-completion.js';
import {sceneSnapshot,missingSceneFields} from '../src/scene-tracker.js';
import {locationListMarkup} from '../src/location-list.js';
const full={dayName:'Day 1',day:1,month:'Harvest',year:'1006',era:'Medieval',calendar:'Standard',time:'19:00',period:'Night',season:'Spring',location:'Cave',region:'Kingsberg River',continent:'Central Continent',position:'At the entrance',weather:'Clear',temperature:12,lighting:'Lanterns',participants:['Venus'],objective:'Rest',safety:'Safe',atmosphere:'Quiet',elapsed:'25m'};
const state=()=>({onboarding:{locationSeeded:true},location:{place:'Cave',region:'',continent:''},worldClock:{day:1,dayName:'Day 1',time:'19:00',phase:'Night'},scene:{position:'',weather:'Clear',temperature:12},locationMemory:[],progression:{currency:{silver:25}},inventory:[]});
test('completion fills all missing scene fields but ignores arbitrary ops and changes to known values',()=>{
 const s=state(),result=prepareSceneCompletion(s,{}, {sceneTracker:{...full,location:'Future destination',time:'06:00',temperature:999},ops:[['inc','progression.currency.silver',999]]},'Venus waits at the Cave.');
 assert.equal(result.error,undefined);assert.deepEqual(missingSceneFields(result.scene),[]);
 assert.equal(result.scene.location,'Cave');assert.equal(result.scene.time,'19:00');assert.equal(result.scene.temperature,12);
 assert.equal(result.candidate.progression.currency.silver,25);assert.deepEqual(s,state());
});
test('old display scene cannot overwrite current geography or clock during completion',()=>{
 const s=state();const result=prepareSceneCompletion(s,{...full,location:'Old place',time:'06:00'}, {sceneTracker:full},'Venus waits at the Cave.');
 assert.equal(result.scene.location,'Cave');assert.equal(result.scene.time,'19:00');
});
test('incomplete output is rejected, compact keys work, and a real initial place can be seeded',()=>{
 assert.equal(prepareSceneCompletion(state(),{}, {sceneTracker:{reg:'River',con:'World'}},'A short story').error,'incomplete');
 const s=state();s.onboarding.locationSeeded=false;s.location={place:'',region:'',continent:''};
 const result=prepareSceneCompletion(s,{}, {sceneTracker:{...full,loc:'Cave',reg:'Kingsberg River',con:'Central Continent'}},'Venus waits at the Cave.');
 assert.equal(result.error,undefined);assert.equal(result.candidate.onboarding.locationSeeded,true);
});
test('completion requires exact location evidence and cannot correct already known geography',()=>{
 const s=state();s.locationMemory=[{id:'cave',name:'Cave',region:'Old River',continent:'Old World',evidence:'The Cave is here.'}];
 const result=prepareSceneCompletion(s,full,{sceneTracker:full,locations:[{id:'cave',name:'Cave',region:'New River',correction:true,evidence:'The Cave is here.'},{name:'Unsupported',evidence:'Invented quote'}]},'The Cave is here.');
 assert.equal(result.error,undefined);assert.equal(result.candidate.location.region,'Old River');assert.equal(result.candidate.location.continent,'Old World');
 assert.equal(result.locations.length,1);
});
test('compact Location List starts collapsed, paginates 10 expandable places and safely labels distances',()=>{
 const rows=[{id:'c',name:'Cave',region:'Kingsberg River',continent:'Central Continent',connections:[{to:'<script>Bridge</script>',distance:'500 m',estimated:true}]},{id:'b',name:'<script>Bridge</script>'},...Array.from({length:15},(_,i)=>({name:'Place '+i}))];
 const markup=locationListMarkup(rows,'Cave','en');
 assert.match(markup,/Central Continent.*Kingsberg River.*Cave/s);assert.match(markup,/Approx\. 500 m/);assert.match(markup,/You are here/);assert.match(markup,/Distance unknown/);assert.match(markup,/1 \/ 2/);
 assert.doesNotMatch(markup,/<script>/);assert.match(markup,/&lt;script&gt;/);
 assert.match(markup,/^<details class="rf-location-list">/);assert.doesNotMatch(markup,/<details[^>]*\sopen(?:\s|>)/);
 assert.equal((markup.match(/<details class="rf-location-list-row/g)||[]).length,10);
 assert.match(markup,/Tap a place for details/);assert.match(markup,/rf-location-list-detail/);
});
test('missing geography makes a formerly complete scene partial',()=>{
 const snapshot=sceneSnapshot(state(),full);assert.deepEqual(missingSceneFields(snapshot),[]);
 assert.deepEqual(missingSceneFields({...snapshot,region:'',continent:''}),['region','continent']);
});
