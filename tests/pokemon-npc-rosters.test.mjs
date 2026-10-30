import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,replay,worldPrompt,rosterPokemon,rosterKey,LIVE} from '../src/workshop/pokemon/core.js';
import {pokemonChatProfiles,availablePokemonSpeakers,isPokemonSpeaker} from '../src/workshop/pokemon/chat.js';
import {parsePokemonStory} from '../src/workshop/pokemon/story.js';
import {resolveNpcSpeaker} from '../src/npc-core.js';
const dex=catalogIndex(JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url))));
dex.battleSprites=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/battle-sprites.json',import.meta.url)));
const rules={engineVersion:4,started:true,region:'Kalos',initialParty:[{speciesId:906,level:12,nickname:'Nyaju'}]};
const block=(version,events)=>'\n<!--roleforge_pokemon:'+JSON.stringify({version,events})+'-->';
const user=mes=>({is_user:true,mes,extra:{}}),ai=(mes,live=true)=>({is_user:false,mes,extra:live?{[LIVE]:1}:{},swipe_id:0});
const intro='Canari waves at you from the Lumiose City plaza, her Pokémon beside her.';
const roster=ai(intro+block(5,[{type:'roster',name:'Canari',team:[{key:'pikachu',level:20},{key:'clefairy',level:19}],evidence:intro}]));
const canari=rosterKey('Canari');

test('a declared roster is stored, shown to the AI and gives the NPC Pokémon chat headers outside battle',()=>{
 const s=replay([roster],dex,rules);
 assert.deepEqual(s.rosters[canari].team.map(m=>[m.uid,m.key,m.level]),[[canari+'-0','pikachu',20],[canari+'-1','clefairy',19]]);
 const data=JSON.parse(worldPrompt(s,dex).split('\n')[1]);
 assert.deepEqual(data.npcRosters[0].team.map(m=>m.chatSpeaker),['pokemon:'+canari+'-0','pokemon:'+canari+'-1']);
 const speakers=availablePokemonSpeakers(pokemonChatProfiles(s,dex,{playerName:'Jino',npcs:rosterPokemon(s,dex)}));
 const pika=resolveNpcSpeaker(speakers,'pokemon:'+canari+'-0');assert(isPokemonSpeaker(pika));assert.equal(pika.pokemon.owner,'Canari');assert.equal(pika.pokemon.ownerKind,'trainer');
 assert.equal(resolveNpcSpeaker(speakers,'Pikachu'),null,'a roster member is addressed by ID only');
});

test('asking an NPC to battle starts it when the reply records the trainer, with the same individuals every time',()=>{
 const accept='Canari grins and accepts your challenge; the battle begins on Route 1.';
 const chat=[roster,user('Canari, battle me!'),ai(accept+block(5,[{type:'trainer',name:'Canari',place:'Route 1',evidence:accept}]))];
 const s=replay(chat,dex,rules);
 assert(s.battle?.trainer,'battle started');assert.equal(s.battle.trainer.name,'Canari');
 assert.deepEqual(s.battle.trainer.team.map(m=>m.uid),[canari+'-0',canari+'-1']);
 const first=s.battle.wild,again=replay([...chat],dex,rules).battle.wild;
 assert.deepEqual([first.traits,first.stats,first.ability],[again.traits,again.stats,again.ability]);
});

test('the request is consent even when the model leaves out immediate mode; without a request it stays an invitation',()=>{
 const offer='Canari challenges you to a battle at Route 1.',reply=ai(offer+block(5,[{type:'trainer',name:'Canari',place:'Route 1',evidence:offer}]));
 assert(replay([roster,user('I want to battle you, Canari.'),reply],dex,rules).battle?.trainer);
 const invited=replay([roster,user('Nice weather today.'),reply],dex,rules);
 assert.equal(invited.battle,null);assert.equal(invited.trainerChallenges.at(-1).status,'offered');
 assert.equal(replay([roster,user('Not now, Canari, I do not want to battle.'),reply],dex,rules).battle,null);
});

test('species never change: a later offer cannot swap the team, but levels rise and shown new members join',()=>{
 const offer='Canari challenges you to a battle with Gyarados at Route 1.';
 let s=replay([roster,ai(offer+block(5,[{type:'trainer',name:'Canari',place:'Route 1',team:[{key:'mewtwo',level:90},{key:'gyarados',level:30},{key:'pikachu',level:25}],evidence:offer}]))],dex,rules);
 assert.deepEqual(s.rosters[canari].team.map(m=>[m.key,m.level]),[['pikachu',25],['clefairy',19],['gyarados',30]]);
 assert.deepEqual(s.trainerChallenges.at(-1).team.map(m=>m.key),['gyarados','pikachu']);
});

test('if the model writes no metadata, a live reply that starts the battle is recovered from the narration',()=>{
 const reply='Canari laughs. "You\'re on!" Canari sends out Pikachu!';
 const s=replay([roster,user('Canari, battle me!'),ai(reply)],dex,rules);
 assert.equal(s.battle?.trainer?.name,'Canari');assert.equal(s.battle.wild.uid,canari+'-0');
 assert.equal(replay([roster,user('Canari, battle me!'),ai(reply,false)],dex,rules).battle,null,'older replies keep their meaning');
 assert.equal(replay([roster,user('Canari, battle me!'),ai('Canari shakes her head and declines. "Another time."')],dex,rules).battle,null);
 assert.equal(replay([roster,user('Hello Canari.'),ai(reply)],dex,rules).battle,null,'no request, no battle');
});

test('an NPC without a roster gets one from the narration, or a fixed regional team that never changes',()=>{
 const shown=replay([user('Battle me, Mira!'),ai('Mira smiles. Mira sends out Fletchling!')],dex,rules);
 assert.equal(shown.battle?.trainer?.name,'Mira');assert.deepEqual(shown.rosters[rosterKey('Mira')].team.map(m=>m.key),['fletchling']);
 const chat=[user('Kenji, let\'s battle!'),ai('Kenji cracks his knuckles. "Let\'s battle!"')];
 const a=replay(chat,dex,rules),b=replay(chat,dex,rules),team=a.rosters[rosterKey('Kenji')].team;
 assert(a.battle?.trainer);assert(team.length>=2);assert.deepEqual(team,b.rosters[rosterKey('Kenji')].team);
 for(const m of team){const p=dex.get(m.key);assert(!p.legendary&&!p.mythical);assert(Math.abs(m.level-12)<=3);}
 assert.equal(replay([user('Battle me!'),ai('You send out Nyaju. "Let\'s go!"')],dex,rules).battle,null,'the player and their own Pokémon are never the opponent');
});

test('rosters from the card seed the game; protocol 4 trainer events keep their original behaviour',()=>{
 const s=initialGame(dex,{...rules,npcTeams:[{name:'Brock',team:[{key:'onix',level:14},{key:'geodude',level:12}]}]});
 assert.deepEqual(s.rosters[rosterKey('Brock')].team.map(m=>m.key),['onix','geodude']);assert.equal(s.rosters[rosterKey('Brock')].source,'card');
 const proof='Mira forces you to battle at Route 1 with Pidgey; the battle begins.';
 const old=replay([ai(proof+block(4,[{type:'trainer',mode:'immediate',name:'Mira',place:'Route 1',team:[{key:'pidgey',level:8}],evidence:proof}]),false)],dex,rules);
 assert.match(old.battle.wild.uid,/^trainer-/);
 assert.equal(parsePokemonStory('Mira waves at you.'+block(4,[{type:'roster',name:'Mira',team:[{key:'pidgey',level:3}],evidence:'Mira waves at you.'}]),dex).events.length,0,'rosters need protocol 5');
});
