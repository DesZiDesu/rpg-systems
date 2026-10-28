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
 assert.deepEqual(motionSequence(before,escaped,event).map(x=>x.kind),['escaped']);
 const failedAndDefeated={...escaped,battle:null,logs:[{key:'escaped-ball'},{key:'enemy-hit'},{key:'defeat'}]};
 assert.deepEqual(motionSequence(before,failedAndDefeated,event).map(x=>x.kind),['escaped','defeat']);
});
test('encounter, victory, defeat and run use state transitions',()=>{
 assert.equal(motionSequence({...before,battle:null},before,{type:'explore'})[0].kind,'encounter');
 assert.equal(motionSequence(before,{...before,battle:null,wins:1,logs:[{key:'victory'}]},{type:'attack'})[0].kind,'victory');
 assert.equal(motionSequence(before,{...before,battle:null,logs:[{key:'defeat'}]},{type:'attack'})[0].kind,'defeat');
 assert.equal(motionSequence(before,{...before,battle:null,logs:[{key:'run'}]},{type:'run'})[0].kind,'run');
 assert.deepEqual(motionSequence(before,before,{type:'attack'}),[]);
});
test('battle motion preference survives Workshop profile normalization',()=>{
 assert.equal(normalizeProfile({pokemon:{motion:false}},'card').pokemon.motion,false);
 assert.equal(normalizeProfile({pokemon:{motion:true}},'card').pokemon.motion,true);
 assert.equal(normalizeProfile({pokemon:{}},'card').pokemon.motion,undefined);
});
