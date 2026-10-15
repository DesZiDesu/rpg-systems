import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {customIconSource} from '../src/custom-icons.js';
import {identity,importCharacters,generatedNpcDraft,retainManualNpcEdits} from '../src/npc-core.js';
import {effectiveNpc,updateNpcAlternate,normalizeNpcAlternates} from '../src/npc-alternates.js';
import {npcArchiveSummary} from '../src/archive-cache.js';
import {SERVANT_ICONS,servantIconUrl} from '../src/servant-icons.js';
const image='data:image/png;base64,iVBORw0KGgo=';
test('custom role imagery is optional and leaves the original role symbol unchanged',()=>{
 assert.equal(identity({roleIcon:'mage'}).roleIconImage,'');const value=identity({roleIcon:'mage',roleIconImage:image});assert.equal(value.roleIcon,'mage');assert.equal(value.roleIconImage,image);
 assert.equal(importCharacters({name:'Artoria',roleIconImage:image})[0].profile.roleIconImage,image);
 assert.equal(generatedNpcDraft({name:'Artoria',occupation:'Knight',roleIconImage:'https://model.invalid/image.png'},{name:'Artoria',roleIconImage:image}).roleIconImage,image);
});
test('custom imagery rejects scripts, SVG data markup, malformed URLs, credentials and oversized payloads',()=>{
 for(const source of ['javascript:alert(1)','data:text/html;base64,AAAA','data:image/svg+xml;base64,AAAA','https://u:p@example.com/x.png','https://example.com/x.png" onerror="x','data:image/png;base64,'+'A'.repeat(33000),'/scripts/extensions/../../x.png'])assert.equal(customIconSource(source),'');
 assert.equal(customIconSource('https://example.com/icon.png'),'https://example.com/icon.png');assert.equal(customIconSource('/user/images/class-icon.webp'),'/user/images/class-icon.webp');
});
test('alternate class art inherits the base image and supports independent override/removal',()=>{
 let npc={id:'a',name:'Artoria',roleIconImage:image,...normalizeNpcAlternates({alternateProfiles:[{id:'lancer',label:'Lancer',fields:{}}],activeAlternateId:'lancer'})};
 assert.equal(effectiveNpc(npc).roleIconImage,image);npc=updateNpcAlternate(npc,'lancer',{roleIconImage:''});assert.equal(effectiveNpc(npc).roleIconImage,'');assert.equal(npc.roleIconImage,image);
 npc=updateNpcAlternate(npc,'lancer',{roleIconImage:'https://example.com/lancer.png'});assert.equal(effectiveNpc(npc).roleIconImage,'https://example.com/lancer.png');
});
test('manual class-image changes survive rollback rebasing and management summaries preserve active art',()=>{
 const before={npcs:[{id:'a',name:'Artoria',roleIconImage:''}]},after={npcs:[{id:'a',name:'Artoria',roleIconImage:image}]},history={entries:[{baseState:structuredClone(before),variants:{a:{state:structuredClone(before)}}}]};retainManualNpcEdits(history,before,after);assert.equal(history.entries[0].baseState.npcs[0].roleIconImage,image);assert.equal(history.entries[0].variants.a.state.npcs[0].roleIconImage,image);
 assert.equal(npcArchiveSummary({...after.npcs[0],portraitView:{}},'card:fate.png').roleIconImage,image);
});
test('the bundled Servant catalog contains safe local PNG artwork and all main classes',async()=>{
 assert.equal(new Set(SERVANT_ICONS.map(row=>row[0])).size,SERVANT_ICONS.length);for(const name of ['saber','archer','lancer','rider','caster','assassin','berserker'])assert.ok(SERVANT_ICONS.some(([path])=>path===`icons/${name}.png`));
 for(const [path]of SERVANT_ICONS){assert.ok(!path.includes('..'));const bytes=await readFile(new URL(servantIconUrl(path)));assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);}
});
