import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { identity, CHAT_INSTRUCTIONS, retainManualNpcEdits } from '../npc-core.js';
import * as scopes from '../npc-scopes.js';

// Evaluate the real host integration without startup or network. No reimplementation of its parser.
const context={extensionSettings:{},chatMetadata:{},chat:[{is_user:true,mes:'Hello'}],getCurrentChatId:()=> 'test-chat',setExtensionPrompt:(...args)=>{context.lastPrompt=args;},saveSettingsDebounced(){}};
const sandbox={...scopes,console,structuredClone,setTimeout,clearTimeout,URL,Blob,TextEncoder,crypto:globalThis.crypto,npcIdentity:identity,CHAT_INSTRUCTIONS,retainManualNpcEdits,
    createNpcWorkspace(){},SillyTavern:{getContext:()=>context,libs:{}},document:{readyState:'loading',addEventListener(){},querySelectorAll(){return[];}},localStorage:{getItem(){return null;},setItem(){}},globalThis:null};
sandbox.globalThis=sandbox;
const source=readFileSync(new URL('../index.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
vm.createContext(sandbox);vm.runInContext(`${source}\n globalThis.testHost={npcProfile,normalize,defaultState,applyStatePatch,extractStatePatch,getSettings,updatePrompt,roleplayState,friendlyNpcs,getState,characterNpcLibrary,storedNpcState,persistNpcScope,requestUsage,recordExtensionRequest};`,sandbox);
const host=sandbox.testHost;

test('real NPC normalization preserves new profile fields and existing dossier data',()=>{
 const p=host.npcProfile({id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',background:'Archive',goals:'Find a book',speechStyle:'Formal',identityColor:'#7788aa',roleIcon:'scholar',aliases:['Lys'],portraitSize:100,portraitSource:'local',hasPortrait:true,notes:'Existing note',mapX:10,mapY:20,stats:{level:3},abilities:[{id:'a',name:'Read runes'}]});
 const state=host.normalize({...host.defaultState(),npcs:[p]});const result=state.npcs[0];
 assert.equal(result.personality,'Calm');assert.equal(result.portraitSize,100);assert.equal(result.portraitSource,'local');assert.equal(result.mapX,10);assert.equal(result.abilities[0].name,'Read runes');assert.equal(result.stats.level,3);
});
test('real model patch creates NPC in shared state and preserves manual appearance on later patches',()=>{
 const initial=host.defaultState();const created=host.applyStatePatch(initial,{ops:[['upsert','npcs',{id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',identityColor:'#7788aa',roleIcon:'scholar'}]]});
 assert.equal(created.accepted,1);assert.equal(created.next.npcs.length,1);assert.equal(created.next.npcs[0].personality,'Calm');
 const previous=created.next.npcs[0];previous.hasPortrait=true;previous.portraitSource='local';previous.portraitSize=100;previous.portraitView.mobile={x:35,y:40,zoom:1.8};
 const changed=host.applyStatePatch(created.next,{ops:[['upsert','npcs',{id:'lysa',name:'Lysa',location:'Library',identityColor:'#ffffff',roleIcon:'mage',hasPortrait:false,portraitSource:'none'}]]});
 const p=changed.next.npcs[0];assert.equal(p.location,'Library');assert.equal(p.personality,'Calm');assert.equal(p.identityColor,'#7788aa');assert.equal(p.roleIcon,'scholar');assert.equal(p.hasPortrait,true);assert.equal(p.portraitSource,'local');assert.equal(p.portraitView.mobile.zoom,1.8);
});
test('hostile NPC remains in Management state but not friendly roster',()=>{
 const {next}=host.applyStatePatch(host.defaultState(),{ops:[['upsert','npcs',{id:'enemy',name:'Enemy',isHostile:true}]]});assert.equal(next.npcs.length,1);assert.equal(host.friendlyNpcs(next).length,0);
});
test('patch extraction leaves story blocks intact and does not expose patch JSON',()=>{
 const parsed=host.extractStatePatch('<tr-dialogue name="Lysa">Hello.</tr-dialogue><!-- tretaresia_patch: {"ops":[["upsert","npcs",{"name":"Lysa"}]]} -->');
 assert.equal(parsed.visible,'<tr-dialogue name="Lysa">Hello.</tr-dialogue>');assert.equal(parsed.patch.ops.length,1);
});
test('presentation prompt works independently; disabled tracking does not request an NPC patch',()=>{
 const settings=host.getSettings();settings.injectState=false;settings.autoTrack=false;settings.chatPresentation=true;host.updatePrompt(host.defaultState());
 assert.match(context.lastPrompt[1],/<tr-dialogue/);assert.doesNotMatch(context.lastPrompt[1],/must be upserted/);
 settings.chatPresentation=false;host.updatePrompt(host.defaultState());assert.equal(context.lastPrompt[1],'');
 settings.autoTrack=true;settings.chatPresentation=true;host.updatePrompt(host.defaultState());assert.match(context.lastPrompt[1],/must be upserted/);assert.doesNotMatch(context.lastPrompt[1],/upsert only relevant named friendly NPCs/);
});
test('manual profiles reach the canonical model prompt without portrait bytes',()=>{
 const state=host.defaultState();state.npcs=[host.npcProfile({id:'lysa',name:'Lysa',personality:'Calm',appearance:'Silver hair',background:'Archive',goals:'Book',speechStyle:'Formal',hasPortrait:true})];
 const prompt=JSON.stringify(host.roleplayState(state));assert.match(prompt,/Silver hair/);assert.match(prompt,/Formal/);assert.doesNotMatch(prompt,/data:image|portraitView|hasPortrait/);
});
test('production asset references and release version stay in sync',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url)));assert.equal(manifest.version,'0.31.0');
 for(const file of ['index.js','npc-workspace.js','npc-chat.js','npc-portraits.js']){const s=readFileSync(new URL(`../${file}`,import.meta.url),'utf8');const refs=[...s.matchAll(/\.\/npc-[a-z]+\.(?:js|css)\?v=([\d.]+)/g)];assert.ok(refs.length);for(const ref of refs)assert.equal(ref[1],manifest.version);}
});
test('host getState merges only the current card library and leaves legacy NPCs Chat-scoped',()=>{
 context.characters=[{name:'Same display name',avatar:'first.png'},{name:'Same display name',avatar:'second.png'}];context.characterId=0;
 host.getSettings().npcCharacterLibraries={'card:first.png':[host.npcProfile({id:'shared',name:'Shared',background:'Card history'})]};
 context.chatMetadata.tretaresia_rpg_state={...host.defaultState(),npcs:[{id:'local',name:'Local'}]};
 const state=host.getState();assert.equal(state.npcs.length,2);assert.equal(state.npcs[0].npcScope,'chat');assert.equal(state.npcs[1].npcScope,'character');
 context.characterId=1;assert.equal(host.getState().npcs.length,1);
 context.characterId=0;context.chatMetadata={};assert.equal(host.getState().npcs.length,1);assert.equal(host.getState().npcs[0].name,'Shared');
});
test('real AI patch cannot choose Character scope or modify the shared library',()=>{
 context.characterId=0;context.chatMetadata={};const current=host.getState();
 const result=host.applyStatePatch(current,{ops:[['upsert','npcs',{id:'shared',name:'Shared',location:'New scene',npcScope:'chat'}],['upsert','npcs',{id:'new',name:'AI created',npcScope:'character',npcOwner:'card:first.png'}]]});
 assert.equal(result.next.npcs.find(p=>p.id==='shared').npcScope,'character');assert.equal(result.next.npcs.find(p=>p.id==='new').npcScope,'chat');
 context.chatMetadata.tretaresia_rpg_state=host.storedNpcState(result.next);
 assert.equal(context.chatMetadata.tretaresia_rpg_state.npcs.length,1);assert.equal(host.getState().npcs.find(p=>p.id==='shared').location,'New scene');
 assert.notEqual(host.characterNpcLibrary()[0].location,'New scene');
 context.chatMetadata={};assert.notEqual(host.getState().npcs[0].location,'New scene');assert.equal(host.getState().npcs.some(p=>p.name==='AI created'),false);
});
test('scope save rejects a stale chat or card before mutation',async()=>{
 const before=JSON.stringify(host.getSettings().npcCharacterLibraries);
 await assert.rejects(host.persistNpcScope('character',[],'npc-management','other-chat','card:first.png'));
 await assert.rejects(host.persistNpcScope('character',[],'npc-management','test-chat','card:second.png'));
 assert.equal(JSON.stringify(host.getSettings().npcCharacterLibraries),before);
});
test('preserves upstream v0.30.1: request diagnostics never save global settings',()=>{
 let saves=0;const original=context.saveSettingsDebounced;context.saveSettingsDebounced=()=>{saves++;};
 const before=JSON.stringify(host.getSettings().requestUsage);const total=host.requestUsage().total;
 host.recordExtensionRequest('npcDraft','draft');host.recordExtensionRequest('manualSync','sync');
 assert.equal(saves,0);assert.equal(host.requestUsage().total,total+2);assert.equal(JSON.stringify(host.getSettings().requestUsage),before);context.saveSettingsDebounced=original;
});
test('preserves upstream v0.30.2: Safari safe mode prevents startup and prompt injection',async()=>{
 let listeners=0,prompts=0;
 const safe={...sandbox,globalThis:null,location:{search:'?tretaresia-safe=1'},document:{readyState:'complete',addEventListener(){listeners++;}},SillyTavern:{getContext:()=>({...context,setExtensionPrompt(){prompts++;}})},console:{...console,warn(){}}};safe.globalThis=safe;
 vm.createContext(safe);vm.runInContext(source,safe);await safe.TretaresiaRpgGenerateInterceptor();assert.equal(listeners,0);assert.equal(prompts,0);
});
test('hidden or foreign-card Character contacts cannot resurrect as Chat NPCs',()=>{
 context.characterId=0;context.chatMetadata={};const active=host.getState();active.contacts=[{id:'contact',npcId:'shared',name:'Shared'}];active.npcs=[];
 context.chatMetadata.tretaresia_rpg_state=host.storedNpcState(active);assert.equal(host.getState().npcs.length,0);
 context.characterId=1;assert.equal(host.getState().npcs.length,0);
});
