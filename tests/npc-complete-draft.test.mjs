import test from 'node:test';import assert from 'node:assert/strict';
import {FIELDS,STATS,RELATIONS,NPC_STARTING_STATS,NPC_STARTING_RELATIONS} from '../src/npc-core.js';
import {missingNpcDraftFields,missingNpcAttributeFields,normalizeNpcDraftResponse,mergeNpcDraftRepair,npcDraftResponseText,requestNpcDraft} from '../src/npc-generation.js';
const full=()=>({...Object.fromEntries(Object.keys(FIELDS).map(k=>[k,k==='name'?'Mali':'Not established'])),...NPC_STARTING_RELATIONS,stats:{...NPC_STARTING_STATS,mp:0},aliases:[],abilities:[],isHostile:false,identityColor:'#abcdef',roleIcon:'healer'});
test('coverage checks every generated form field, not merely valid JSON or one description',()=>{
 const p=full();assert.deepEqual(missingNpcDraftFields(p),[]);
 for(const key of [...Object.keys(FIELDS),...RELATIONS,'stats','aliases','abilities','isHostile','identityColor','roleIcon']){const x=structuredClone(p);delete x[key];assert(missingNpcDraftFields(x).length>0,key);}
 for(const key of [...STATS,'rank']){const x=structuredClone(p);delete x.stats[key];assert(missingNpcDraftFields(x).includes('stats.'+key),key);}
 assert(missingNpcDraftFields({...p,name:'Father'}).includes('name'));
 assert(missingNpcDraftFields({...p,abilities:[{name:'Healing'}]}).includes('abilities'));
});
test('numeric strings normalize before the allowlist; intentional zeros and empty arrays are valid',()=>{
 const p=full();p.age=28;p.trust='0';p.stats.hp='0';p.stats.mp='0';p.abilities=[{name:'Herbalism',category:'Craft',level:'1',description:'Prepares herbs',proficiency:'30'}];
 assert.deepEqual(missingNpcDraftFields(p),[]);const n=normalizeNpcDraftResponse(p);assert.equal(n.stats.hp,0);assert.equal(n.trust,0);assert.equal(n.abilities[0].proficiency,30);assert.equal(p.stats.hp,'0');
 for(const bad of [null,'',true])assert(missingNpcAttributeFields({...p,trust:bad}).includes('trust'));
});
test('repair fills only the missing keys, retains stats siblings and does not accept storage injection',()=>{
 const p=full();delete p.stats.agility;delete p.goals;const m=missingNpcDraftFields(p),merged=mergeNpcDraftRepair(p,{name:'Wrong',goals:'Open a clinic',stats:{agility:16,hp:999},id:'bad',portraitPath:'bad'},m);
 assert.equal(merged.name,'Mali');assert.equal(merged.stats.hp,100);assert.equal(merged.stats.agility,16);assert.equal(merged.goals,'Open a clinic');assert.equal(merged.id,undefined);assert.equal(merged.portraitPath,undefined);assert.equal(p.goals,undefined);
});
test('fill-missing requires only empty text and preserves existing facts and intentional resource values',()=>{
 const p=full();p.goals='';assert.deepEqual(missingNpcDraftFields({goals:'Build a clinic'},p,false),[]);assert.deepEqual(missingNpcDraftFields({},p,false),['goals']);
});
test('reasoning wrappers cannot be mistaken for NPC JSON, including the user planning format',async()=>{
 assert.equal(npcDraftResponseText('<planning>{"wrong":true}</planning>\n{"name":"Mali"}'),'{"name":"Mali"}');
 const c={powerUserSettings:{reasoning:{prefix:'[private]',suffix:'[/private]'}}};assert.equal(npcDraftResponseText('[private]{"wrong":true}[/private]{"name":"Mali"}',c),'{"name":"Mali"}');assert.equal(npcDraftResponseText('<planning>unfinished'), '');
 const raw={generateRaw:async()=>'<planning>{"wrong":true}</planning>'+JSON.stringify(full())};assert.equal(JSON.parse(await requestNpcDraft(raw,'task',8192)).name,'Mali');
});
