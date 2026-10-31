import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,replayStep,worldPrompt} from '../src/workshop/pokemon/core.js';
import {pokemonSpeakerFor} from '../src/workshop/pokemon/chat.js';
const read=name=>readFile(new URL('../src/workshop/pokemon/data/'+name,import.meta.url)).then(JSON.parse);
const dex=catalogIndex({...await read('catalog.json'),expansion:await read('expansion.json')});
const rules={engineVersion:4,started:true,initialParty:[{speciesId:906,level:16,nickname:'Nyaju'}]};
const base=(on=true)=>transition(initialGame(dex,rules),{id:'set',type:'settings',playerEncounters:on},dex,rules);
const say=(s,mes,index=3)=>replayStep(s,{is_user:true,mes},index,dex,rules,new Set(),new Set());

test('the player can bring out a named wild Pokémon when the setting is on',()=>{
 const s=say(base(),'*I push through the grass.* A wild Pikachu jumps out in front of me!');
 assert.equal(s.battle?.wild?.key,'pikachu');assert.equal(s.battle.wild.level,14);
 assert.equal(say(base(),'เดินเข้าพุ่มไม้ แล้ว Gible ก็โผล่ออกมาตรงหน้า').battle?.wild?.key,'gible');
});

test('the setting is off by default and off means no player encounters',()=>{
 assert.equal(initialGame(dex,rules).settings.playerEncounters,undefined);
 assert.equal(say(base(false),'A wild Pikachu jumps out in front of me!').battle,null);
});

test('wishes, plans, speech, negations and legendaries never start a battle',()=>{
 for(const mes of ['I want to find a Pikachu.','อยากเจอ Pikachu จัง','"Pikachu appears!" I joke.','No Pikachu appears.','If a Pikachu appears, I will catch it.'])assert.equal(say(base(),mes).battle,null,mes);
 assert.equal(say(base(),'Mewtwo appears in front of me!').battle,null,'legendaries need their quest');
});

test('the AI is told to honour player-chosen encounters only while the setting is on',()=>{
 assert.match(worldPrompt(base(),dex),/playerEncounters is ON/);assert.doesNotMatch(worldPrompt(base(false),dex),/playerEncounters is ON/);
});

test('every Pokémon name resolves to a Pokémon speaker, never an NPC',()=>{
 const roster={id:'pokemon:npc-1',name:'pokemon:npc-1',aliases:['pokemon:npc-1'],pokemon:{uid:'npc-1',key:'pikachu',owner:'Canari',ownerKind:'trainer',idOnly:true}};
 const mine={id:'pokemon:p1',name:'Nyaju',aliases:['pokemon:p1','Nyaju','Sprigatito'],pokemon:{uid:'p1',key:'sprigatito',owner:'Jino',ownerKind:'player'}};
 assert.equal(pokemonSpeakerFor("Canari's Pikachu",[roster,mine],dex),roster);
 assert.equal(pokemonSpeakerFor('Pikachu (Canari)',[roster,mine],dex),roster);
 assert.equal(pokemonSpeakerFor('Sprigatito',[roster,mine],dex),mine);
 assert.equal(pokemonSpeakerFor('pokemon:p1',[roster,mine],dex),mine);
 const wild=pokemonSpeakerFor('Raichu',[roster,mine],dex);assert.equal(wild.id,'pokemon:species-raichu');assert.equal(wild.pokemon.speciesOnly,true);
 assert.equal(pokemonSpeakerFor('Nyaju',[roster,mine],dex),null,'nicknames stay with the normal lookup');
 for(const human of ['Canari','Nurse Joy',"Ash's friends",'Professor Oak'])assert.equal(pokemonSpeakerFor(human,[roster,mine],dex),null,human);
});
