import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TERRAINS} from '../src/workshop/pokemon/terrains.js';
import {normalizeProfile} from '../src/workshop/core.js';
const scene=name=>readFile(new URL('../src/workshop/pokemon/assets/battle/scenes/'+name,import.meta.url),'utf8');

test('every terrain has a painted scene and a floor base',async()=>{
 for(const {id} of TERRAINS){
  const [bg,base]=await Promise.all([scene(id+'.svg'),scene(id+'-base.svg')]);
  assert.match(bg,/^<svg [^>]*viewBox="0 0 1600 900"[^>]*preserveAspectRatio="xMidYMid slice"/,id);
  assert.match(base,/^<svg [^>]*preserveAspectRatio="none"/,id+' base');
  assert(bg.length<200_000,id+' stays small');assert.doesNotMatch(bg+base,/<image|href="http/,id+' is self-contained');
 }
});

test('Field art keeps Painted or Classic and drops anything else',()=>{
 for(const fieldArt of ['painted','classic'])assert.equal(normalizeProfile({enabled:['pokemon'],pokemon:{fieldArt}},'character').pokemon.fieldArt,fieldArt);
 assert.equal(normalizeProfile({enabled:['pokemon'],pokemon:{fieldArt:'neon'}},'character').pokemon.fieldArt,undefined);
});

test('catching shows the ball, not a caption',async()=>{
 const motion=await readFile(new URL('../src/workshop/pokemon/motion.js',import.meta.url),'utf8');
 assert.doesNotMatch(motion,/pkm-catch-caption|Gotcha!|broke free/);
});
