import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extractCard} from '../tools/build-pokemon-edition-cards.mjs';
import {decodeInlineFiles} from '../src/world-pack-inline.js';
const root=new URL('../',import.meta.url);
const species=JSON.parse(await readFile(new URL('src/workshop/pokemon/data/catalog.json',root),'utf8')).forms.filter(f=>f.default);
const names=new Set(species.flatMap(f=>[f.name.toLowerCase(),f.key]));
const pokemonLike=name=>{const n=String(name||'').toLowerCase(),own=/^(.+?)['’]s (.+?)(?: \(.*\))?$/u.exec(n),bare=/^(.+?)(?: \(.*\))?$/u.exec(n);return names.has(n)||Boolean(own&&names.has(own[2]))||Boolean(bare&&names.has(bare[1]));};

// Pokémon belong to the add-on and its Pokémon header, never to NPC records.
test('released Pokémon RPG cards carry no Pokémon in their NPC archive',async()=>{
 for(const png of ['Pokemon-Sunken-Red-Sun.th.png','Pokemon-Dawn-Midnights.en.png','Pokemon-Sun-and-Dawn.png']){
  const card=extractCard(await readFile(new URL('docs/pokemon-release/'+png,root))),files=await decodeInlineFiles(card.data.extensions.roleforge_world_archive_payload),records=[];
  for(const [path,read] of files)if(/^npcs\/[^/]+\/base\.json$/u.test(path)){let x=await read();if(ArrayBuffer.isView(x))x=new TextDecoder().decode(x);if(typeof x==='string')x=JSON.parse(x);records.push(x.profile||x);}
  assert(records.length>2800,png+' keeps its trainer archive');
  assert.deepEqual(records.filter(r=>/pok[eé]mon/iu.test(r.race||'')||pokemonLike(r.name)).map(r=>r.name),[],png);
  assert.deepEqual(card.data.extensions.tretaresia_rpg_npcs,[],png+' starts with no chat NPCs');
  assert(records.some(r=>r.name==='Gazette')&&records.some(r=>r.name==='Alfmorii'),png+' keeps the original trainers');
 }
});
