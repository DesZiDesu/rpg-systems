import test from 'node:test';import assert from 'node:assert/strict';
import {motionSequence} from '../src/workshop/pokemon/motion.js';
import {normalizeProfile} from '../src/workshop/core.js';
const battle={id:'b',activeUid:'ally',wild:{key:'eevee'}};
const before={battle,pokemon:{ally:{key:'pikachu'}},wins:0,logs:[],box:[]};
test('captures show the actual committed outcome, including storage',()=>{
 const event={type:'catch',id:'catch-1',ball:'ultra-ball'};
 const caught={...before,battle:null,pokemon:{...before.pokemon,'catch-1':{key:'eevee'}},box:['catch-1']};
 assert.deepEqual(motionSequence(before,caught,event).map(x=>[x.kind,x.ball,x.storage]),[['caught','ultra-ball','box']]);
 const escaped={...before,battle,logs:[{key:'escaped-ball'},{key:'enemy-hit'}]};
 assert.deepEqual(motionSequence(before,escaped,event).map(x=>x.kind),['escaped','hit'],'the opponent\'s turn plays after the ball breaks free');
 const failedAndDefeated={...escaped,battle:null,logs:[{key:'escaped-ball'},{key:'enemy-hit'},{key:'defeat'}]};
 assert.deepEqual(motionSequence(before,failedAndDefeated,event).map(x=>[x.kind,x.side]),[['escaped',undefined],['hit','foe'],['faint','ally']],'a defeat returns the fainted partner to its ball');
});
test('encounter, victory, defeat and run use state transitions',()=>{
 assert.deepEqual(motionSequence({...before,battle:null},before,{type:'explore'}).map(x=>[x.kind,x.side]),[['encounter',undefined],['send-out','ally']]);
 assert.deepEqual(motionSequence(before,{...before,battle:null,wins:1,logs:[{key:'victory'}]},{type:'attack'}).map(x=>[x.kind,x.side,x.recall]),[['faint','foe',false]]);
 assert.deepEqual(motionSequence(before,{...before,battle:null,logs:[{key:'defeat'}]},{type:'attack'}).map(x=>[x.kind,x.side,x.recall]),[['faint','ally',true]]);
 assert.equal(motionSequence(before,{...before,battle:null,logs:[{key:'run'}]},{type:'run'})[0].kind,'run');
 assert.equal(motionSequence(before,before,{type:'attack'})[0].kind,'attack');
});
test('battle motion preference survives Workshop profile normalization',()=>{
 assert.equal(normalizeProfile({pokemon:{motion:false}},'card').pokemon.motion,false);
 assert.equal(normalizeProfile({pokemon:{motion:true}},'card').pokemon.motion,true);
 assert.equal(normalizeProfile({pokemon:{}},'card').pokemon.motion,undefined);
});
test('theme and menu sound persist as character preferences',()=>{const p=normalizeProfile({pokemon:{theme:'classic-dark',sound:false}},'card').pokemon;assert.equal(p.theme,'classic-dark');assert.equal(p.sound,false);assert.equal(normalizeProfile({pokemon:{theme:'unknown'}},'card').pokemon.theme,undefined);});
test('a switch recalls the old partner on the old state, then throws the new one',()=>{const after={...before,battle:{...battle,activeUid:'other'}};assert.deepEqual(motionSequence(before,after,{type:'switch'}).map(x=>[x.kind,x.side,x.battle.activeUid]),[['recall','ally','ally'],['send-out','ally','other']]);assert.deepEqual(motionSequence(before,before,{type:'switch'}),[]);});
