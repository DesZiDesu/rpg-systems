import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {WEAPON_CATEGORIES,namedWeaponModel} from '../src/weapon-catalog.js';
import {emptyWeaponPreset,normalizeWeaponSystem,normalizeWeaponMetadata,normalizeAmmoMetadata,validateWeaponPreset,ownedWeaponViews,equippedWeapon,configureWeapon,equipWeapon,weaponReserve,weaponPromptReference,applyWeaponEvents,weaponImageSource} from '../src/weapon-core.js';
import {itemRecord} from '../src/item-core.js';
import {completeItemDefinition,itemDefinitionKey} from '../src/item-definition.js';
import {validatePresetConfig,exportWorldPreset,importWorldPreset,applyPresetState,WORLD_SYSTEM_KEYS} from '../src/world-presets.js';
import {normalizeMarketplaceEvent} from '../src/marketplace-events.js';
import {normalizeAuctionOffer} from '../src/auction-core.js';
import {normalizeCommerce,createCommerceSession,prepareCommerceAction,applyCommerceDecision} from '../src/commerce-engine.js';

const fixture=()=>({player:{name:'Master'},inventory:[{id:'gun',name:'AKM',category:'Weapon',quantity:1,weapon:{category:'rifle',mode:'magazine',capacity:30,current:6,ammoType:'7.62x39'}},{id:'mag',name:'AKM magazine',category:'Ammunition',quantity:2,ammo:{kind:'magazine',type:'7.62x39',roundsPerUnit:30,capacity:30}},{id:'wrong',name:'9mm magazine',category:'Ammunition',quantity:5,ammo:{kind:'magazine',type:'9mm',roundsPerUnit:15,capacity:15}}],weaponSystem:{...normalizeWeaponSystem(),equippedItemId:'gun'}});
const event=(action='use',extra={})=>({id:'event',actor:'player',outcome:'success',action,itemId:'gun',count:2,userEvidence:'I fire my AKM.',evidence:'You fire your AKM twice, using 2 rounds.',...extra});
const context=(e,extra={})=>({enabled:true,user:e.userEvidence,story:e.evidence,source:{turnKey:'t1',variant:'v1'},...extra});
test('all 34 generic categories have distinct, local SVG artwork',async()=>{
 assert.equal(WEAPON_CATEGORIES.length,34);const sources=await Promise.all(WEAPON_CATEGORIES.map(c=>readFile(new URL('../assets/weapons/generic/'+c.id+'.svg',import.meta.url),'utf8')));
 assert.equal(new Set(sources).size,34);for(const svg of sources){assert.match(svg,/<svg[^>]+viewBox="0 0 960 300"/);assert.doesNotMatch(svg,/<script|<foreignObject|(?:href|src)="https?:|onload=/iu);}
});
test('art resolves only actual ownership; Fate names match exactly and do not grant equipment',()=>{
 const state=fixture();state.inventory.push({id:'saber',name:'Excalibur',category:'Weapon',quantity:1},{id:'ea',name:'Ea',category:'Weapon',quantity:1},{id:'sea',name:'Sea Sword',category:'Weapon',quantity:1},{id:'lost',name:'Excalibur',category:'Weapon',quantity:0});
 const views=ownedWeaponViews(state);assert.equal(views.find(w=>w.itemId==='saber').modelId,'excalibur');assert.equal(views.find(w=>w.itemId==='ea').modelId,'ea');assert.equal(views.find(w=>w.itemId==='sea').modelId,'generic');assert(!views.some(w=>w.itemId==='lost'));assert.equal(equippedWeapon(state).itemId,'gun');assert.equal(ownedWeaponViews({inventory:[]}).length,0);assert.equal(namedWeaponModel('Seat of Ea'),'');
 state.inventory[0].weapon.modelId='ea';assert.equal(equippedWeapon(state).modelId,'generic');assert.throws(()=>equipWeapon(state,'unowned'));
});
test('unknown counters remain unknown; configuration rejects overflow; items keep metadata',()=>{
 const s=fixture();s.inventory[0].weapon={category:'rifle'};const view=equippedWeapon(s);assert.equal(view.current,null);assert.equal(view.capacity,null);assert.equal(view.mode,'magazine');
 assert.throws(()=>configureWeapon(s,'gun',{category:'rifle',capacity:6,current:7}));
 const raw=completeItemDefinition(fixture().inventory[0]);assert.equal(itemRecord(raw).weapon.current,6);assert.equal(itemRecord(fixture().inventory[1]).ammo.roundsPerUnit,30);
 assert.notEqual(itemDefinitionKey(fixture().inventory[1]),itemDefinitionKey({...fixture().inventory[1],ammo:{...fixture().inventory[1].ammo,roundsPerUnit:5}}));
});
test('Morgan uses its own owned exact-name model and portable profile, without granting Fate items',()=>{
 const state=fixture();
 state.inventory.push({id:'alter',name:'Excalibur Morgan',category:'Weapon',quantity:1},{id:'saber',name:'Excalibur',category:'Weapon',quantity:1},{id:'mention',name:'Replica of Excalibur Morgan',category:'Weapon',quantity:1});
 const views=ownedWeaponViews(state);
 assert.equal(views.find(w=>w.itemId==='alter').modelId,'excalibur-morgan');
 assert.equal(views.find(w=>w.itemId==='saber').modelId,'excalibur');
 assert.equal(views.find(w=>w.itemId==='mention').modelId,'generic');
 assert.equal(namedWeaponModel('Excalibur Morgan (Saber Alter)'),'excalibur-morgan');
 assert.equal(namedWeaponModel('Morgan’s staff'),'');
 assert.equal(normalizeWeaponMetadata({modelId:'excalibur-morgan'}).modelId,'excalibur-morgan');
 const preset=validateWeaponPreset({format:'roleforge-weapon-preset',version:1,definitions:[{id:'alter-art',name:'Alter blade',aliases:[],category:'sword',mode:'none',modelId:'excalibur-morgan',image:'',capacity:null,ammoType:''}]});
 state.inventory.push({id:'authored',name:'Alter blade',category:'Weapon',quantity:1});
 assert.equal(ownedWeaponViews(state,preset).find(w=>w.itemId==='authored').modelId,'excalibur-morgan');
 assert.equal(ownedWeaponViews({inventory:[]},preset).length,0);
});
test('confirmed uses consume once, retain inventory ownership, and do no work while disabled',()=>{
 const state=fixture(),e=event(),result=applyWeaponEvents(state,[e],context(e));assert.equal(equippedWeapon(result.next).current,4);assert.equal(state.inventory[0].weapon.current,6);assert.equal(result.next.inventory[0].quantity,1);assert.equal(result.accepted.length,1);
 const repeated=applyWeaponEvents(result.next,[e],context(e));assert.equal(equippedWeapon(repeated.next).current,4);assert.equal(repeated.accepted.length,0);
 assert.equal(applyWeaponEvents(state,[e],context(e,{enabled:false})).next,state);assert.equal(applyWeaponEvents(state,[],{enabled:true}).next,state);
});
test('NPC dialogue, other actors, plans, OOC, missing user evidence and invented counts cannot spend resources',()=>{
 const state=fixture();for(const e of [event('use',{actor:'npc'}),event('use',{outcome:'failed'}),event('use',{count:5}),event('use',{userEvidence:''}),event('use',{evidence:'If you fire your AKM, 2 rounds would be used.'})])assert.equal(applyWeaponEvents(state,[e],context(e)).accepted.length,0);
 const e=event();assert.equal(applyWeaponEvents(state,[e],context(e,{story:'<tr-dialogue name="Bandit">'+e.evidence+'</tr-dialogue>'})).accepted.length,0);assert.equal(applyWeaponEvents(state,[e],context(e,{user:'OOC: '+e.userEvidence})).accepted.length,0);
 const unknown=fixture();unknown.inventory[0].weapon.current=null;assert.equal(applyWeaponEvents(unknown,[e],context(e)).accepted.length,0);
});
test('reload consumes one actual compatible magazine and returns its old contents without duplicating bullets',()=>{
 const state=fixture(),e=event('reload',{userEvidence:'I reload my AKM.',evidence:'You reload your AKM with a magazine containing 30 rounds.',count:30,ammoItemId:'mag'}),r=applyWeaponEvents(state,[e],context(e));assert.equal(r.accepted.length,1);assert.equal(equippedWeapon(r.next).current,30);assert.equal(r.next.inventory.find(i=>i.id==='mag').quantity,1);assert(r.managedInventory.has('mag'));
 const returned=r.next.inventory.find(i=>i.id.startsWith('weapon-return-'));assert.equal(returned.ammo.roundsPerUnit,6);assert.equal(returned.quantity,1);assert.equal(weaponReserve(r.next,equippedWeapon(r.next)).rounds,36);
 assert.equal(6+2*30,equippedWeapon(r.next).current+weaponReserve(r.next,equippedWeapon(r.next)).rounds);
 for(const extra of [{ammoItemId:'wrong'},{ammoItemId:'missing'},{count:29}])assert.equal(applyWeaponEvents(state,[{...e,...extra}],context(e)).accepted.length,0);
 assert.equal(applyWeaponEvents(state,[e],context(e,{reserved:()=>true})).accepted.length,0);
 state.inventory[0].weapon.current=0;const empty=applyWeaponEvents(state,[e],context(e));assert.equal(empty.next.inventory.find(i=>i.id.startsWith('weapon-return-')).ammo.roundsPerUnit,0);
});
test('loose ammunition fills only available room and throwing decrements the actual item',()=>{
 const s=fixture();s.inventory[0].weapon={category:'revolver',mode:'rounds',current:3,capacity:6,ammoType:'.357'};s.inventory[1].ammo={kind:'round',type:'.357'};s.inventory[1].quantity=10;
 const e=event('reload',{userEvidence:'I reload my AKM.',evidence:'You reload your AKM with 3 rounds.',count:3,ammoItemId:'mag'}),r=applyWeaponEvents(s,[e],context(e));assert.equal(equippedWeapon(r.next).current,6);assert.equal(r.next.inventory[1].quantity,7);
 assert.equal(applyWeaponEvents(s,[{...e,count:4}],context(e)).accepted.length,0);
 s.inventory[0].weapon={category:'throwing',mode:'quantity'};s.inventory[0].quantity=3;const shot=event();const thrown=applyWeaponEvents(s,[shot],context(shot));assert.equal(thrown.next.inventory[0].quantity,1);assert(thrown.managedInventory.has('gun'));
});
test('inspection fills only explicitly confirmed unknown numbers and never refills known values',()=>{
 const s=fixture();s.inventory[0].weapon.current=null;s.inventory[0].weapon.capacity=null;
 const e=event('describe',{evidence:'You inspect your AKM: 6 rounds in a 30-round magazine.',weapon:{category:'rifle',current:6,capacity:30,ammoType:'invented'}}),r=applyWeaponEvents(s,[e],context(e));assert.equal(equippedWeapon(r.next).current,6);assert.equal(equippedWeapon(r.next).capacity,30);assert.equal(equippedWeapon(r.next).ammoType,'7.62x39');
 const next=applyWeaponEvents(r.next,[{...e,id:'second',weapon:{category:'rifle',current:30,capacity:30}}],context(e));assert.equal(equippedWeapon(next.next).current,6);
});
test('weapon art presets round-trip with card/world configuration and never enter runtime/prompt data',()=>{
 const image='data:image/png;base64,aGVsbG8=',p=validateWeaponPreset({version:1,definitions:[{id:'akm',name:'AKM',aliases:[],category:'rifle',mode:'magazine',modelId:'custom',capacity:30,image,ammoType:'7.62x39'}]});
 const config=validatePresetConfig({weaponPreset:p,systems:{enableWeapons:true}}),imported=importWorldPreset(exportWorldPreset(config,'Weapon test'));assert.deepEqual(imported.config,config);assert(WORLD_SYSTEM_KEYS.includes('enableWeapons'));
 const state=fixture(),next=applyPresetState(state,config);assert.deepEqual(next.inventory,state.inventory);assert.equal(equippedWeapon(next,p).image,image);assert.doesNotMatch(JSON.stringify(weaponPromptReference(next,p)),/base64|image|https:/);assert.doesNotMatch(JSON.stringify(normalizeWeaponSystem(next.weaponSystem)),/base64/);
 assert.equal(weaponImageSource('javascript:alert(1)'), '');assert.equal(weaponImageSource('data:image/svg+xml;base64,AAAA'), '');assert.throws(()=>validateWeaponPreset({version:1,definitions:[{...p.definitions[0],image:'http://unsafe/image.png'}]}));assert.deepEqual(emptyWeaponPreset().definitions,[]);
});
test('actual shop and auction deliveries retain weapon/ammo metadata instead of dropping resource definitions',()=>{
 const gun=fixture().inventory[0],mag=fixture().inventory[1],raw={kind:'npcShop',id:'armorer',location:'Hall',denomination:'silver',seller:{name:'Mira'},items:[{...gun,price:1,stock:1},{...mag,price:1,stock:2}]},offer=normalizeMarketplaceEvent(raw),session=createCommerceSession(offer,{messageId:1,variant:'v',turnKey:'t'}),s={player:{name:'Player'},location:{place:'Hall'},progression:{currency:{gold:0,silver:10,copper:0}},inventory:[],commerce:normalizeCommerce()};
 const buy=(state,active,id)=>applyCommerceDecision(state,prepareCommerceAction(state,active,'confirm',{itemId:id}),{narrative:'Mira hands over the purchased item.',decision:{outcome:'accept',amount:1}});
 let r=buy(s,session,'gun');assert(r.ok);assert.equal(r.next.inventory[0].weapon.current,6);
 const r2=buy(s,createCommerceSession(offer,{messageId:2,variant:'v',turnKey:'t2'}),'mag');assert(r2.ok);assert.equal(r2.next.inventory[0].ammo.roundsPerUnit,30);
 const auction=normalizeAuctionOffer({id:'auction',location:'Hall',denomination:'silver',lots:[{...gun,openingBid:1,minIncrement:1,bidders:[]}]});assert.equal(auction.lots[0].weapon.capacity,30);assert.equal(createCommerceSession(auction).lots[0].weapon.current,6);
});
test('reload retains total rounds at the inventory limit and merges only identical returned packs',()=>{
 const s=fixture();s.inventory[1].quantity=1;while(s.inventory.length<200)s.inventory.push({id:'other-'+s.inventory.length,name:'Other '+s.inventory.length,category:'Item',quantity:1});
 const e=event('reload',{userEvidence:'I reload my AKM.',evidence:'You reload your AKM with 30 rounds.',count:30,ammoItemId:'mag'}),r=applyWeaponEvents(s,[e],context(e));assert.equal(r.accepted.length,1);assert.equal(r.next.inventory.length,200);assert.equal(r.next.inventory.find(i=>i.id.startsWith('weapon-return-')).ammo.roundsPerUnit,6);
 s.inventory[1].quantity=2;assert.equal(applyWeaponEvents(s,[e],context(e)).accepted.length,0);assert.deepEqual(s.weaponSystem,fixture().weaponSystem);
});
test('all common bow names resolve to the bow category without fabricating loaded arrows',()=>{
 for(const name of ['Longbow','Shortbow','Recurve bow','Compound Bow','ธนูยาว']){const views=ownedWeaponViews({inventory:[{id:'bow',name,category:'Weapon',quantity:1}]});assert.equal(views[0].category,'bow');assert.equal(views[0].current,null);assert.equal(views[0].capacity,null);}
});
test('loading an artwork preset applies its static definition while retaining counters and rejecting loss of loaded resources',()=>{
 const state=fixture(),profile={id:'akm',name:'AKM',aliases:[],category:'sniper',mode:'magazine',modelId:'generic',image:'',capacity:30,ammoType:'7.62x39'},preset=validateWeaponPreset({version:1,definitions:[profile]});
 state.weaponSystem.entries=[{itemId:'gun',...normalizeWeaponMetadata(state.inventory[0].weapon)}];const next=applyPresetState(state,{weaponPreset:preset});assert.equal(equippedWeapon(next,preset).category,'sniper');assert.equal(equippedWeapon(next,preset).current,6);assert.deepEqual(next.weaponSystem,state.weaponSystem);
 assert.throws(()=>applyPresetState(state,{weaponPreset:{version:1,definitions:[{...profile,capacity:3}]}}),/exceed/);
});
test('large inventories always include equipped resources and compatible ammo in the bounded AI reference',()=>{
 const s=fixture();s.inventory=[...Array.from({length:50},(_,i)=>({id:'blade-'+i,name:'Sword '+i,category:'Weapon',quantity:1})),...Array.from({length:50},(_,i)=>({id:'pack-'+i,name:'Other ammo '+i,quantity:1,ammo:{kind:'round',type:'9mm',roundsPerUnit:1}})),...s.inventory];const ref=weaponPromptReference(s);assert.equal(ref.owned.length,40);assert.equal(ref.owned[0].itemId,'gun');assert.equal(ref.owned[0].current,6);assert.equal(ref.ammunition.length,40);assert.equal(ref.ammunition[0].id,'mag');
});
