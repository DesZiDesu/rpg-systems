import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeProfile} from '../src/workshop/core.js';
import {icon,ballIcon} from '../src/workshop/pokemon/icons.js';

test('saved Original and Aperture choices read as Kinetic; unknown values are dropped',()=>{
 for(const theme of ['kinetic','original','classic-dark'])assert.equal(normalizeProfile({enabled:['pokemon'],pokemon:{theme}},'character').pokemon.theme,'kinetic');
 assert.equal(normalizeProfile({enabled:['pokemon'],pokemon:{theme:'neon'}},'character').pokemon.theme,undefined);
});

test('every icon the Pokémon screens ask for has a Lucide drawing',async()=>{
 const src=(await Promise.all(['ui.js','panels.js'].map(f=>readFile(new URL('../src/workshop/pokemon/'+f,import.meta.url),'utf8')))).join('\n');
 const names=new Set([...src.matchAll(/fa\('([a-z-]+)'\)/g),...src.matchAll(/(?:card|tool)\('([a-z-]+)'/g),...src.matchAll(/\['[a-z]+','([a-z-]+)',t\(/g),...src.match(/const tabs=(.*);/)[1].matchAll(/\['[a-z]+','([a-z-]+)'/g)].flatMap(m=>m.slice(1).filter(Boolean)),'star','angle-right','arrow-up-from-bracket','box-archive','paw');
 const fallback=icon('cube');
 for(const name of names)if(name!=='cube')assert.notEqual(icon(name),fallback,name+' has no icon');
 assert.match(icon('xmark'),/^<svg class="fa-solid pk-i"[^>]*stroke="currentColor"/);
 assert.doesNotMatch(src,/<i class="fa-solid/);
 assert.match(ballIcon,/pk-party-symbol/);
});

test('Kinetic is the only theme and its stylesheet ships with the add-on',async()=>{
 const ui=await readFile(new URL('../src/workshop/pokemon/ui.js',import.meta.url),'utf8');
 assert.match(ui,/root\.dataset\.pkTheme='kinetic'/);assert.doesNotMatch(ui,/classic-dark|apertureMarkup|theme-set/);
 assert.match(ui,/'pokemon-kinetic\.css'/);
 const css=await readFile(new URL('../styles/pokemon-kinetic.css',import.meta.url),'utf8');
 for(const font of ['600-latin','700-latin','600-thai','700-thai'])assert.ok(css.includes('chakra-petch-'+font+'.woff2'));
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/prefers-reduced-motion/);
});
