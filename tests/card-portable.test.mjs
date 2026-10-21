import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedPortraitSource,embeddedPortraitBlob,EMBEDDED_PORTRAIT_LIMIT} from '../src/embedded-portrait.js';
import {identity} from '../src/npc-core.js';
import {effectiveNpc,normalizeNpcAlternates,alternatePortraitRecord,updateNpcAlternate} from '../src/npc-alternates.js';
import {campaignMenu,applyCampaign,selectedCampaign,campaignInstruction} from '../src/card-campaign.js';
import {cardAddonDefaults} from '../src/workshop/core.js';
import {trueNameOf} from '../src/workshop/death-note/names.js';
import {packSparseNpcs,hydrateSparseNpcs} from '../src/sparse-npc-state.js';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=';
test('portable portraits stay raster-only, bounded and usable through alternate dossiers',async()=>{
 assert.equal(embeddedPortraitSource(image),image);assert.equal((await embeddedPortraitBlob(image).arrayBuffer()).byteLength,68);
 for(const bad of ['data:image/svg+xml;base64,AAAA','https://example.com/image.png','data:image/png;base64,'+'A'.repeat(EMBEDDED_PORTRAIT_LIMIT*2),'data:image/png;base64,SGVsbG8='])assert.equal(embeddedPortraitBlob(bad),null);
 const raw={id:'l',name:'L',hasPortrait:true,portraitSource:'embedded',portraitImage:image,alternateProfiles:[{id:'films',label:'Films',fields:{occupation:'Detective'},hasPortrait:true,portraitSource:'embedded',portraitImage:image}],activeAlternateId:'films'};
 assert.equal(identity(raw).portraitImage,image);assert.equal(normalizeNpcAlternates(raw).alternateProfiles[0].portraitImage,image);assert.equal(alternatePortraitRecord(raw).portraitImage,image);
 assert.equal(effectiveNpc(raw).portraitImage,image);const removed=updateNpcAlternate(raw,'films',{hasPortrait:false,portraitSource:'none'});assert.equal(alternatePortraitRecord(removed).portraitSource,'none');
});
const menu=campaignMenu({format:'roleforge-campaign-menu',version:1,packId:'test',options:[{id:'films',label:'Films',description:'2006 film continuity',versions:{l:'films'}},{id:'manga',label:'Manga'}]});
test('campaign selection is chat-local, exclusive, and changes versions only through an explicit player choice',()=>{
 const state={npcs:[{id:'l',met:false,enabled:false,alternateProfiles:[{id:'films',fields:{}}],activeAlternateId:''}],inventory:[],storyMissions:{flags:{},facts:[],instances:[]}};
 const next=applyCampaign(state,menu,'films','canon');assert.equal(selectedCampaign(next,menu).id,'films');assert.equal(next.npcs[0].activeAlternateId,'films');assert.equal(next.npcs[0].met,false);assert.deepEqual(next.inventory,[]);assert.deepEqual(state.storyMissions.flags,{});
 assert.throws(()=>applyCampaign(next,menu,'manga','canon'),/already has/);assert.throws(()=>applyCampaign(state,menu,'missing','canon'),/Invalid/);assert.match(campaignInstruction(next,menu),/film continuity/);
 assert.equal(campaignMenu({format:'roleforge-campaign-menu',version:1,packId:'test',options:[{id:'x',label:'a'},{id:'x',label:'b'}]}),null);
});
test('cards can request only bundled addons; unknown/private birth names never become aliases that kill',()=>{
 assert.deepEqual(cardAddonDefaults({format:'roleforge-workshop-card-defaults',version:1,enabled:['death-note','death-note','arbitrary']}),['death-note']);assert.deepEqual(cardAddonDefaults({enabled:['death-note']}),[]);
 const state={deathNoteRules:{trueNames:{l:{default:'L Lawliet',versions:{netflix:null}},a:null}}};
 assert.equal(trueNameOf(state,{id:'l',name:'L'}),'L Lawliet');assert.equal(trueNameOf(state,{id:'l',name:'L',activeAlternateId:'netflix'}),'');assert.equal(trueNameOf(state,{id:'a',name:'A'}),'');assert.equal(trueNameOf(state,{id:'new',name:'New Name'}),'New Name');
});
test('campaign versions survive for unloaded NPCs without duplicating their portraits in chat state',()=>{
 const l={id:'l',name:'L',npcScope:'character',npcOwner:'card:x',activeAlternateId:'',alternateProfiles:[{id:'films',fields:{occupation:'Detective'}}],portraitImage:image};
 const state={npcs:[],npcScopes:{format:2,owner:'card:x',archiveId:'embedded',overrides:{},bases:{},activeIds:[],hidden:[]},storyMissions:{flags:{},facts:[],instances:[]}};
 const next=applyCampaign(state,menu,'films','canon',{npcs:[l]}),stored=packSparseNpcs(next,[l],'card:x');
 assert.equal(stored.npcScopes.overrides.l.activeAlternateId,'films');assert(!JSON.stringify(stored).includes('data:image'));
 const restored=hydrateSparseNpcs(stored,[l],'card:x',{activeIds:['l']});assert.equal(restored.npcs[0].activeAlternateId,'films');assert.equal(restored.npcs[0].alternateProfiles[0].fields.occupation,'Detective');
});
