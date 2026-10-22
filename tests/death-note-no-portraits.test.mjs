import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeInlineFiles} from '../src/world-pack-inline.js';
import {validateWorldManifest,validateWorldIndexes} from '../src/world-pack-core.js';
import {readCardPng} from '../cards/death-note-rpg/tools/png-card.mjs';
import {OPENINGS_TH} from '../cards/death-note-rpg/data/openings-th.mjs';
const root=new URL('../cards/death-note-rpg/build/',import.meta.url);
const original=JSON.parse(await readFile(new URL('Death-Note-RPG.json',root)));
const card=JSON.parse(await readFile(new URL('Death-Note-RPG-No-Portraits.json',root)));
const oldFiles=await decodeInlineFiles(original.data.extensions.roleforge_world_archive_payload);
const files=await decodeInlineFiles(card.data.extensions.roleforge_world_archive_payload);
const get=async(name,from=files)=>JSON.parse(new TextDecoder().decode(await from.get(name)()));
const photoFields=new Set(['portraitImage','portraitPath','portraitId','portraitChatId','portraitView','portraitSize','roleIconImage','hasPortrait','portraitSource']);
function facts(value){
 if(Array.isArray(value))return value.map(facts);
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>!photoFields.has(key)&&key!=='appearance').map(([key,v])=>[key,facts(v)]));
}
test('no-portrait edition contains the same complete roster and every alternate dossier',async()=>{
 const index=await get('indexes/npcs.json');assert.deepEqual(index,await get('indexes/npcs.json',oldFiles));assert.equal(index.length,208);assert.equal(index.reduce((n,r)=>n+r.versions.length,0),652);
 for(const row of index){
  for(const path of [row.basePath,...row.versions.map(v=>v.path)]){
   const a=await get(path,oldFiles),b=await get(path);assert.deepEqual(facts(b),facts(a),path);
   if(a.appearance&&!a.appearance.startsWith('Use the attached source portrait'))assert.equal(b.appearance,a.appearance,path);
   assert.notEqual(b.hasPortrait,true,path);assert(!b.portraitImage&&!b.roleIconImage&&!b.portraitPath,path);
  }
 }
});
test('all Lore and mission records remain byte-for-byte equal to the original edition',async()=>{
 const lore=await get('indexes/lore.json'),stories=await get('indexes/stories.json');assert.equal(lore.length,65);assert.equal(stories.length,146);
 for(const [path,read]of files)if(path.startsWith('lore/')||path.startsWith('stories/')||path.startsWith('indexes/'))assert.deepEqual(await read(),await oldFiles.get(path)(),path);
 assert.deepEqual(card.data.extensions.roleforge_campaigns,original.data.extensions.roleforge_campaigns);assert.equal(card.data.extensions.roleforge_campaigns.options.length,13);
 assert.deepEqual(card.data.extensions.roleforge_death_note,original.data.extensions.roleforge_death_note);
});
test('no NPC image or image icon survives in the embedded payload or metadata',async()=>{
 assert(!JSON.stringify(card).includes('data:image/'));assert.deepEqual(card.data.extensions.roleforge_sources.portraits,[]);
 assert(card.data.extensions.roleforge_sources.coverage.every(r=>r.portrait===false));
 for(const [path,read]of files)assert(!new TextDecoder().decode(await read()).includes('data:image/'),path);
});
test('all portable subfile hashes and the archive identity match the new edition',async()=>{
 const manifest=validateWorldManifest(await get('manifest.json'));assert.equal(manifest.archiveId,'death-note-rpg-no-portraits');
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash(await files.get('manifest.json')()),card.data.extensions.roleforge_world_archive.manifestSha256);
 for(const row of manifest.files){const bytes=await files.get(row.path)();assert.equal(bytes.length,row.bytes,row.path);assert.equal(hash(bytes),row.sha256,row.path);}
 validateWorldIndexes(manifest,await get('indexes/npcs.json'),await get('indexes/lore.json'));
});
test('PNG and JSON deliver identical one-file cards with ten ordered Thai openings',async()=>{
 assert.deepEqual(readCardPng(await readFile(new URL('Death-Note-RPG-No-Portraits.png',root))),card);
 const greetings=[card.data.first_mes,...card.data.alternate_greetings];assert.equal(greetings.length,10);assert.deepEqual(greetings,OPENINGS_TH.map(o=>o.text));assert.equal(new Set(greetings).size,10);
 assert.deepEqual(OPENINGS_TH.map(o=>o.id),['falling-notebook','light-finds-notebook','after-lind-tailor','japanese-task-force','second-notebook-owner','light-up-new-world','wammys-house','after-l-manga','six-notebooks','shinigami-after-three-weeks']);
 for(const greeting of greetings){assert(/[ก-๛]/u.test(greeting));assert(greeting.split(/\n\s*\n/u).length>=1&&greeting.split(/\n\s*\n/u).length<=3);assert(greeting.length<=1200);}
 assert.equal(OPENINGS_TH[5].continuity,'jp-films');assert.equal(OPENINGS_TH[7].continuity,'manga');assert.equal(OPENINGS_TH[8].continuity,'jp-films');
 assert.match(greetings[9],/สามสัปดาห์/);assert.match(greetings[0],/ยังวางอยู่/);
});
