import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame} from '../src/workshop/pokemon/core.js';
import {spriteStyleIndex,styleCandidates,spriteStyleOptions} from '../src/workshop/pokemon/sprite-styles.js';
import {pokemonChatProfiles} from '../src/workshop/pokemon/chat.js';
import {normalizeProfile} from '../src/workshop/core.js';
const read=name=>readFile(new URL('../src/workshop/pokemon/data/'+name,import.meta.url)).then(JSON.parse);
const [catalog,raw,battleSprites]=await Promise.all([read('catalog.json'),read('sprite-styles.json'),read('battle-sprites.json')]);
const dex=catalogIndex(catalog),index=spriteStyleIndex(raw);dex.spriteStyles=index;dex.battleSprites=battleSprites;
const pick=(key,o={},mon={})=>styleCandidates(dex.get(key),mon,index,o);
const path=url=>url.replace(/^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/[0-9a-f]{40}\/sprites\/pokemon\//,'');

test('the index covers every catalogue form at the pinned revision, in every game style',()=>{
 assert.equal(raw.commit,battleSprites.commit);assert.deepEqual(raw.forms,dex.forms.map(f=>f.key));assert.equal(raw.stems.length,raw.forms.length);
 for(const s of raw.styles)assert.equal(s.masks.length,raw.forms.length*2,s.id);
 const options=spriteStyleOptions(index);assert.equal(options.length,raw.styles.length);
 for(const id of['gen1-red-blue','gen2-crystal-animated','gen3-emerald-animated','gen4-platinum-animated','gen5-black-white-animated','gen6-x-y','gen7-ultra-sun-ultra-moon','gen8-sword-shield','gen9-scarlet-violet','gen9-legends-za','home','official-artwork','showdown'])assert(options.some(o=>o.id===id),id);
});

test('Sprigatito and Metagross have exact shiny front and back images in their games',()=>{
 assert.equal(path(pick('sprigatito',{style:'gen9-scarlet-violet'},{shiny:true})[0].url),'versions/generation-ix/scarlet-violet/shiny/906.webp');
 assert.equal(path(pick('sprigatito',{style:'gen9-scarlet-violet',side:'back'},{shiny:true})[0].url),'versions/generation-ix/scarlet-violet/back/shiny/906.webp');
 assert.equal(path(pick('metagross',{style:'gen3-emerald-animated'},{shiny:true})[0].url),'versions/generation-iii/emerald/animated/shiny/376.png');
 assert.equal(path(pick('metagross',{style:'home'},{shiny:true})[0].url),'other/home/shiny/376.png');
 assert.equal(path(pick('metagross',{style:'gen1-red-blue'},{shiny:true})[0].url).includes('shiny/'),true,'a game without shinies falls back to the nearest one that has the colour');
});

test('a colour or form is never substituted, and the family look is kept when a game lacks a Pokémon',()=>{
 for(const style of raw.styles.map(s=>s.id))for(const form of dex.forms.filter((_,i)=>i%9===0))for(const shiny of[false,true]){
  for(const v of pick(form.key,{style},{shiny}))assert.equal(v.variant===1||v.variant===3,shiny,style+' '+form.key);
 }
 const unownB=pick('unown-b',{style:'gen2-crystal'});assert.match(path(unownB[0].url),/201-b\.png$/);
 for(const style of raw.styles.map(s=>s.id))for(const v of pick('unown-b',{style}))assert.doesNotMatch(path(v.url),/\/201\.\w+$/,style);
 const kanto=pick('sprigatito',{style:'gen1-red-blue'})[0];assert.equal(kanto.family,'pixel');
});

test('lists keep heavy models as HD stills, motion off never animates, and fallbacks keep the look',()=>{
 assert.equal(pick('sprigatito',{style:'gen9-scarlet-violet',list:true})[0].style,'home');
 assert.equal(pick('sprigatito',{style:'gen9-scarlet-violet'})[0].style,'gen9-scarlet-violet');
 for(const style of raw.styles.map(s=>s.id))for(const v of pick('metagross',{style,motion:false}))assert.equal(v.animated,false,style);
 assert.match(path(pick('sprigatito',{style:'home',side:'back'})[0].url),/scarlet-violet\/back\/906\.webp$/,'artwork has no backs: the player side uses HD models');
 assert.equal(pick('sprigatito',{style:'gen6-x-y',side:'back'})[0].style,'gen9-scarlet-violet','small Showdown placeholders never stand in for another game');
 assert.equal(pick('metagross',{style:'gen2-crystal-animated'})[0].style,'gen3-emerald-animated','animated styles fall back to animated games');
});

test('the preference survives saving and chat headers lead with the chosen style',()=>{
 assert.equal(normalizeProfile({pokemon:{spriteStyle:'gen4-platinum-animated'}},'k').pokemon.spriteStyle,'gen4-platinum-animated');
 assert.equal(normalizeProfile({pokemon:{spriteStyle:'<script>'}},'k').pokemon.spriteStyle,undefined);
 const s=initialGame(dex,{engineVersion:4,started:true,initialParty:[{speciesId:376,level:40}]});s.settings.spriteStyle='gen5-black-white-animated';
 const header=pokemonChatProfiles(s,dex)[0].pokemon;assert.match(header.images[0].url,/black-white\/animated\/376\.gif$/);assert.equal(header.images[0].mode,'sprite');
});
