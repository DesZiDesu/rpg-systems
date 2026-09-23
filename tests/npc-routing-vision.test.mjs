import test from 'node:test';
import assert from 'node:assert/strict';
import {portraitForGeneration,visualDescription} from '../npc-generation.js';
import {npcAttributeDefaults,generatedAttributes,STATS} from '../npc-core.js';
import {routeNewStoryNpcs,packScopedNpcs,hydrateScopedNpcs} from '../npc-scopes.js';

test('portrait is attached as an ephemeral data URL only for supported vision requests',async()=>{
 const blob=new Blob(['image'],{type:'image/webp'});
 assert.equal(await portraitForGeneration(null,{},()=>{throw Error('not needed')}),null);
 assert.equal(await portraitForGeneration(blob,{mainApi:'openai'},async()=>true),'data:image/webp;base64,aW1hZ2U=');
 await assert.rejects(portraitForGeneration(blob,{mainApi:'kobold'},async()=>true),/Chat Completion/);
 await assert.rejects(portraitForGeneration(blob,{mainApi:'openai'},async()=>false),/Image inlining/);
 await assert.rejects(portraitForGeneration(new Blob(['svg'],{type:'image/svg+xml'}),{mainApi:'openai'},async()=>true),/256 KB/);
 await assert.rejects(portraitForGeneration(new Blob([new Uint8Array(262145)],{type:'image/png'}),{mainApi:'openai'},async()=>true),/256 KB/);
});
test('vision descriptions accept visible traits but reject an absent image before generating NPC details',()=>{
 assert.equal(visualDescription('Short dark hair and a red cloak.'),'Short dark hair and a red cloak.');
 assert.throws(()=>visualDescription('IMAGE_UNAVAILABLE'),/AI อ่านภาพไม่ได้/);
 assert.throws(()=>visualDescription('{"imageError":"not received"}'),/AI อ่านภาพไม่ได้/);
 assert.throws(()=>visualDescription('I cannot view the image.'),/AI อ่านภาพไม่ได้/);
});
test('missing/null attributes receive defaults, genuine zeros remain valid, full AI repair is atomic',()=>{
 const p=npcAttributeDefaults({stats:{hp:null,mp:0,level:''},trust:0});assert.equal(p.stats.hp,100);assert.equal(p.stats.mp,0);assert.equal(p.stats.level,1);assert.equal(p.trust,0);
 assert.equal(npcAttributeDefaults({stats:{hp:undefined}},{stats:{hp:0}}).stats.hp,0);
 assert.deepEqual(generatedAttributes(p),p);
 assert.throws(()=>generatedAttributes({...p,stats:{hp:50}}),/incomplete/);
 assert.throws(()=>generatedAttributes({...p,stats:{rank:'Unknown',...Object.fromEntries(STATS.map(k=>[k,0]))}}));
 const repaired=generatedAttributes({...p,id:'evil',npcScope:'character',portraitPath:'bad'});assert.equal(repaired.id,undefined);assert.equal(repaired.npcScope,undefined);
});
test('Chat selection and groups never write to Character archive',()=>{
 for(const [owner,destination]of [['card:a','chat'],[null,'character']]){
  const state={npcs:[{id:'a',name:'A',npcScope:'chat'}]};const r=routeNewStoryNpcs(state,{npcs:[]},[],owner,destination);
  assert.equal(r.added,0);assert.equal(r.library.length,0);assert.equal(r.state.npcs[0].npcScope,'chat');
 }
});
test('Character routing archives only new NPCs; existing scene changes stay chat-local',()=>{
 const original={id:'old',name:'Old',npcScope:'character',npcOwner:'card:a',stats:{hp:80}};
 const before=hydrateScopedNpcs({npcs:[]},[original],'card:a');
 const after=structuredClone(before);after.npcs[0].stats.hp=20;after.npcs.push({id:'new',name:'New',npcScope:'chat'});
 const r=routeNewStoryNpcs(after,before,[original],'card:a','character');assert.equal(r.added,1);assert.equal(r.library[0].stats.hp,80);assert.equal(after.npcs[1].npcScope,'chat');
 const stored=packScopedNpcs(r.state,r.library,'card:a');assert.equal(stored.npcs.length,0);
 const restored=hydrateScopedNpcs(stored,r.library,'card:a');assert.equal(restored.npcs.length,2);assert.equal(restored.npcs[0].stats.hp,20);
 assert.equal(routeNewStoryNpcs(restored,restored,r.library,'card:a','character').added,0);
});
test('full Character archives retain new NPCs in Chat rather than dropping them',()=>{
 const library=Array.from({length:200},(_,i)=>({id:`${i}`,name:`NPC ${i}`}));
 const r=routeNewStoryNpcs({npcs:[{id:'new',name:'New',npcScope:'chat'}]},{npcs:[]},library,'card:a','character');
 assert.equal(r.overflow,1);assert.equal(r.library.length,200);assert.equal(r.state.npcs[0].npcScope,'chat');
});
