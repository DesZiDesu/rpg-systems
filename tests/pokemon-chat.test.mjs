import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,replay,journalEvent,JOURNAL,worldPrompt} from '../src/workshop/pokemon/core.js';
import {pokemonChatProfiles,availablePokemonSpeakers,pokemonChatId,isPokemonSpeaker,pokemonChatImages} from '../src/workshop/pokemon/chat.js';
import {resolveNpcSpeaker} from '../src/npc-core.js';
const raw=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url))),dex=catalogIndex(raw);
dex.battleSprites=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/battle-sprites.json',import.meta.url)));
const rules={engineVersion:4,started:true,initialParty:[{speciesId:25,level:12},{speciesId:906,level:8}]};
const start=()=>initialGame(dex,rules),profiles=s=>pokemonChatProfiles(s,dex,{playerName:'Kai'});
test('Pokédex names are authoritative, nicknames take precedence, and profiles never alter the save',()=>{
 const s=start(),before=structuredClone(s),p=profiles(s)[0];assert.equal(p.name,dex.get(25).name);assert.equal(p.pokemon.name,'Pikachu');assert(isPokemonSpeaker(p));assert.deepEqual(s,before);
 s.pokemon['initial-0'].nickname='  Spark  ';assert.equal(profiles(s)[0].pokemon.name,'Spark');s.pokemon['initial-0'].nickname='   ';assert.equal(profiles(s)[0].pokemon.name,'Pikachu');
 s.pokemon['initial-0'].key='pikachu-rock-star';assert.equal(profiles(s)[0].pokemon.key,'pikachu-rock-star');assert.equal(profiles(s)[0].pokemon.speciesName,dex.get('pikachu-rock-star').name);
});
test('headers preserve zero HP and unknown values, and read the actual individual gender and level',()=>{
 const s=start(),m=s.pokemon['initial-0'];m.hp=0;const p=profiles(s)[0].pokemon;assert.equal(p.hp,0);assert.equal(p.maxHp,m.stats[0]);assert.equal(p.level,m.level);assert.equal(p.gender,m.traits.gender);
 delete m.hp;delete m.stats;delete m.level;delete m.traits;const unknown=profiles(s)[0].pokemon;assert.equal(unknown.hp,null);assert.equal(unknown.maxHp,null);assert.equal(unknown.level,null);assert.equal(unknown.gender,'unknown');
});
test('ownership comes from player membership and the current Trainer/wild battle, never from an inferred name',()=>{
 let s=start();s=transition(s,{id:'wild',type:'encounter',speciesId:129,level:3,engine:4},dex,rules);let list=profiles(s);assert.equal(list[0].pokemon.owner,'Kai');const wild=list.find(p=>p.pokemon.ownerKind==='wild');assert(wild);assert.equal(wild.pokemon.owner,'');assert.equal(wild.pokemon.uid,s.battle.wild.uid);
 const team=s.battle.wild;s.battle.trainer={name:'Mira',team:[team]};list=profiles(s);const trainer=list.find(p=>p.pokemon.uid===team.uid);assert.equal(trainer.pokemon.ownerKind,'trainer');assert.equal(trainer.pokemon.owner,'Mira');assert.equal(list.filter(p=>p.pokemon.uid===team.uid).length,1);
 assert.equal(pokemonChatProfiles(s,dex)[0].pokemon.owner,'');
});
test('identical species are resolvable by stable IDs; ambiguous nicknames and human names do not pick the wrong owner',()=>{
 const s=start(),second=structuredClone(s.pokemon['initial-0']);second.uid='second';s.pokemon.second=second;s.party.push('second');const speakers=availablePokemonSpeakers(profiles(s));assert.equal(resolveNpcSpeaker(speakers,'Pikachu'),null);assert.equal(resolveNpcSpeaker(speakers,'pokemon:initial-0').pokemon.uid,'initial-0');assert.equal(resolveNpcSpeaker(speakers,'pokemon:second').pokemon.uid,'second');
 const single=profiles(start()),human={id:'human',name:'Pikachu',aliases:[]},merged=[human,...availablePokemonSpeakers(single,[human])];assert.equal(resolveNpcSpeaker(merged,'Pikachu'),human);assert(isPokemonSpeaker(resolveNpcSpeaker(merged,pokemonChatId('initial-0'))));
 s.pokemon['initial-0'].nickname=s.pokemon.second.nickname='Twin';assert.equal(resolveNpcSpeaker(availablePokemonSpeakers(profiles(s)),'Twin'),null);
});
test('image preferences use the actual form, shiny/gender variants and animated/static source policy',()=>{
 const s=start(),m=s.pokemon['initial-0'];m.shiny=true;m.traits.gender='female';s.settings.dexImageMode='sprite';s.settings.motion=true;
 let p=profiles(s)[0].pokemon;assert.equal(p.images[0].mode,'sprite');assert(p.images[0].animated);assert.match(p.images[0].url,/shiny\/female\//);
 s.settings.motion=false;p=profiles(s)[0].pokemon;assert(!p.images.some(v=>v.animated));assert.match(p.images[0].url,/shiny\/female\/25\.png$/);
 s.settings.motion=true;p=pokemonChatProfiles(s,dex,{motion:false})[0].pokemon;assert(!p.images.some(v=>v.animated));
 s.settings.dexImageMode='artwork';p=profiles(s)[0].pokemon;assert.equal(p.images[0].mode,'artwork');assert.match(p.images[0].url,/shiny\/25\.png$/);assert(!p.images.some(v=>v.animated));
 const choices=pokemonChatImages(dex.get('giratina-origin'),{},dex,{mode:'sprite',motion:false});assert(choices.length);assert(!choices.some(v=>v.animated));assert(!choices.some(v=>/\/487\.png$/.test(v.url)));
});
test('renaming and encounter speakers follow replay deletion/swipe instead of leaving stale header facts',()=>{
 const message={mes:'A quiet route.',is_user:false,extra:{},swipe_id:0};message.extra[JOURNAL]=[journalEvent({id:'rename',type:'nickname',uid:'initial-0',name:'Spark'},message),journalEvent({id:'meet',type:'encounter',speciesId:129,level:3,engine:4},message)];
 let s=replay([message],dex,rules);assert.equal(profiles(s)[0].pokemon.name,'Spark');assert(profiles(s).some(p=>p.pokemon.ownerKind==='wild'));
 s=replay([],dex,rules);assert.equal(profiles(s)[0].pokemon.name,'Pikachu');assert(!profiles(s).some(p=>p.pokemon.ownerKind==='wild'));
 message.swipe_id=1;s=replay([message],dex,rules);assert.equal(profiles(s)[0].pokemon.name,'Pikachu');assert(!profiles(s).some(p=>p.pokemon.ownerKind==='wild'));
});
test('main-chat context exposes exact speaker IDs without adding fictitious NPC dossiers',()=>{
 const prompt=worldPrompt(start(),dex);assert.match(prompt,/"chatSpeaker":"pokemon:initial-0"/);assert.match(prompt,/<tr-header name="pokemon:UID"/);assert.match(prompt,/Do not add Pokémon to NPC dossiers/);
});
