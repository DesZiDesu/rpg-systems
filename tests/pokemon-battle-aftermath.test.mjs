import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,worldPrompt} from '../src/workshop/pokemon/core.js';
import {pokemonChatProfiles,availablePokemonSpeakers,isPokemonSpeaker} from '../src/workshop/pokemon/chat.js';
import {mergeContinuation,guardContinuation} from '../src/workshop/pokemon/continuation.js';
import {resolveNpcSpeaker} from '../src/npc-core.js';
const dex=catalogIndex(JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url))));
dex.battleSprites=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/battle-sprites.json',import.meta.url)));
const rules={engineVersion:4,started:true,initialParty:[{speciesId:906,level:5,nickname:'Nyaju'},{speciesId:25,level:12}]};
let serial=0;const act=(s,type,p={})=>transition(s,{id:'a'+(++serial),type,engine:4,...p},dex,rules);
const speakers=s=>availablePokemonSpeakers(pokemonChatProfiles(s,dex,{playerName:'Jino'}));
const prompt=s=>JSON.parse(worldPrompt(s,dex).split('\n')[1]);
function fightOut(s){for(let i=0;s.battle&&i<60;i++){const m=s.pokemon[s.battle.activeUid];s=act(s,'attack',{moveId:(m.moves.find(v=>v.pp>0)||m.moves[0]).id});}return s;}
function lose(){let s=act(initialGame(dex,rules),'encounter',{speciesId:130,level:90,place:'Route 3'});for(const uid of s.party)s.pokemon[uid].hp=1;return fightOut(s);}

test('a wild Pokémon that was fled from keeps its chat header, but only by its exact ID',()=>{
 let s=act(initialGame(dex,rules),'encounter',{speciesId:661,level:3,place:'Route 1'});const uid=s.battle.wild.uid,id='pokemon:'+uid;
 s=act(s,'run');assert.equal(s.battle,null);
 const found=resolveNpcSpeaker(speakers(s),id);assert(isPokemonSpeaker(found));assert.equal(found.pokemon.speciesName,'Fletchling');assert.equal(found.pokemon.ownerKind,'wild');assert(found.pokemon.departed);
 assert.equal(resolveNpcSpeaker(speakers(s),'Fletchling'),null);
 s=act(s,'encounter',{speciesId:661,level:4});
 assert.equal(resolveNpcSpeaker(speakers(s),'Fletchling').pokemon.uid,s.battle.wild.uid);
 assert.equal(resolveNpcSpeaker(speakers(s),id).pokemon.uid,uid);
});

test('a caught Pokémon answers to its old wild ID with its new owned record',()=>{
 let s=act(initialGame(dex,rules),'encounter',{speciesId:129,level:2});const wild='pokemon:'+s.battle.wild.uid;s.inventory['master-ball']=1;
 s=act(s,'catch',{ball:'master-ball'});assert.equal(s.battle,null);assert.equal(s.lastBattle.result,'caught');
 const found=resolveNpcSpeaker(speakers(s),wild);assert(isPokemonSpeaker(found));assert.equal(found.pokemon.ownerKind,'player');assert(!found.pokemon.departed);
 assert(s.party.includes(found.pokemon.uid));
});

test('defeated trainer teams stay resolvable after the battle',()=>{
 let s=act(initialGame(dex,rules),'encounter',{speciesId:16,level:2});s.pokemon[s.battle.activeUid].level=50;
 const foe=s.battle.wild;s.battle.trainer={id:'mira',name:'Mira',index:0,team:[foe],items:{}};
 s=fightOut(s);assert.equal(s.battle,null);
 const found=resolveNpcSpeaker(speakers(s),'pokemon:'+foe.uid);assert.equal(found.pokemon.owner,'Mira');assert.equal(found.pokemon.ownerKind,'trainer');
});

test('a fainted lead is returned to its ball and the AI is told it cannot act',()=>{
 const s=lose();assert.equal(s.battle,null);assert.equal(s.lastBattle.result,'defeat');
 assert.equal(s.outUid,null);const data=prompt(s);
 assert.equal(data.outsideCompanion,null);assert.equal(data.canBattle,false);assert.deepEqual(data.faintedParty,s.party.map(id=>'pokemon:'+id));
 assert(data.party.every(m=>m.fainted&&/Poké Ball/.test(m.condition)));
 assert.match(worldPrompt(s,dex),/back in their Poké Balls/);
 assert.throws(()=>act(s,'send-out',{uid:s.party[0]}));
});

test('running after a substitute entered sends out the healthy fighter, not the fainted one',()=>{
 let s=act(initialGame(dex,rules),'encounter',{speciesId:130,level:60});const first=s.battle.activeUid;s.pokemon[first].hp=1;
 for(let i=0;s.battle?.activeUid===first&&i<20;i++)s=act(s,'attack',{moveId:s.pokemon[first].moves[0].id});
 assert(s.battle,'the second party member should still be fighting');assert.notEqual(s.battle.activeUid,first);
 s.battle.wild.trapped=false;const healthy=s.battle.activeUid;s=act(s,'run');
 assert.equal(s.outUid,healthy);assert.equal(prompt(s).outsideCompanion.id,healthy);assert.deepEqual(prompt(s).faintedParty,['pokemon:'+first]);
 assert(s.lastBattle.team.some(m=>m.chatSpeaker==='pokemon:'+first&&m.fainted));assert(s.lastBattle.team.some(m=>m.chatSpeaker==='pokemon:'+healthy&&!m.fainted));
});

test('the finished battle record reaches the main-chat prompt with its events',()=>{
 let s=act(initialGame(dex,rules),'encounter',{speciesId:16,level:2,place:'Route 1'});s.pokemon[s.battle.activeUid].level=50;
 s=fightOut(s);const record=prompt(s).lastBattle;
 assert.equal(record.result,'victory');assert.equal(record.place,'Route 1');assert(record.rounds>=1);
 assert.equal(record.opponents[0].species,'Pidgey');assert.equal(record.opponents[0].fainted,true);
 assert(record.events.some(e=>e.key==='encounter'));assert(record.events.some(e=>e.key==='victory'));
 assert.match(worldPrompt(s,dex),/lastBattle is canon/);
 assert.doesNotMatch(worldPrompt(initialGame(dex,rules),dex),/lastBattle is canon|back in their Poké Balls/);
});

const before='<tr-narrative>Nyaju senses the impending dive.</tr-narrative>\n<tr-dialogue name="pokemon:initial-0">"Nyaaaa-ju!"</tr-dialogue>';
test('an ordinary continuation is left exactly as the host saved it',()=>{
 const after=before+' The leaves strike home.';assert.equal(mergeContinuation(before,after),after);
});
test('a prompt-only rewrite of the old reply is replaced by the untouched original',()=>{
 const regexed='Nyaju senses the impending dive. "Nyaaaa-ju!"',tail='\n<tr-narrative>The Fletchling falls back.</tr-narrative>';
 assert.equal(mergeContinuation(before,regexed+tail,{prompts:['opening scene',regexed]}),before+tail);
 assert.equal(mergeContinuation(before,regexed+tail,{prompts:[[{type:'text',text:regexed}]]}),before+tail);
 // Captured from SillyTavern 1.19 non-streaming Continue with a prompt-only tag-stripping regex.
 const short='<tr-narrative>Nyaju senses the dive.</tr-narrative>\n<tr-dialogue name="pokemon:initial-0">"Nyaaaa-ju!"</tr-dialogue>';
 assert.equal(mergeContinuation('<tr-header name="pokemon:initial-0"/>\n'+short,'Nyaju senses the dive.\n"Nyaaaa-ju!"\nTAIL TEXT.',{prompts:['\nNyaju senses the dive.\n"Nyaaaa-ju!"']}),'<tr-header name="pokemon:initial-0"/>\n'+short+'\nTAIL TEXT.');
 assert.equal(mergeContinuation(short,'Nyaju senses the dive.\n"Nyaaaa-ju!"\nTAIL TEXT.',{prompts:['Route 1 is quiet. Nyaju pads beside you through the tall grass.','Nyaju senses the dive.\n"Nyaaaa-ju!"']}),short+'\nTAIL TEXT.');
});
test('streamed text restores the reply when the host truncated or rewrote the old part',()=>{
 const tail='<tr-narrative>The Fletchling flees.</tr-narrative>';
 assert.equal(mergeContinuation(before,'Nyaju senses'+tail,{streamed:tail}),before+'\n\n'+tail);
 assert.equal(mergeContinuation(before,'',{streamed:' and leaps.'}),before+' and leaps.');
 assert.equal(mergeContinuation(before,'something else entirely'),null);
});

test('the guard repairs the message during the host completion event and redraws it once',()=>{
 const handlers=new Map(),eventSource={on:(t,f)=>handlers.set(t,[...handlers.get(t)||[],f]),removeListener:(t,f)=>handlers.set(t,(handlers.get(t)||[]).filter(x=>x!==f))};
 const message={mes:before,swipes:[before],swipe_id:0},redraws=[],host={chat:[{mes:'hi',is_user:true},message],eventSource,eventTypes:{CHAT_COMPLETION_PROMPT_READY:'p',STREAM_TOKEN_RECEIVED:'s',MESSAGE_RECEIVED:'r'},updateMessageBlock:(id,m)=>redraws.push([id,m.mes])};
 const emit=(t,...a)=>{for(const f of handlers.get(t)||[])f(...a);};
 const guard=guardContinuation(host,message),regexed='Nyaju senses the impending dive.',tail=' It pounces.';
 emit('p',{chat:[{role:'user',content:'hi'},{role:'assistant',content:regexed}]});emit('s',tail);
 message.mes=message.swipes[0]=regexed+tail;emit('r',1,'continue');
 assert.equal(message.mes,before+tail);assert.equal(message.swipes[0],before+tail);assert.deepEqual(redraws,[[1,before+tail]]);
 assert.equal(guard.repair(),false);guard.stop();assert.equal([...handlers.values()].flat().length,0);
 message.mes='changed later';emit('r',1,'continue');assert.equal(message.mes,'changed later');
 const plain={mes:before,swipes:[before],swipe_id:0};host.chat[1]=plain;const second=guardContinuation(host,plain);
 emit('p',{chat:[{role:'assistant',content:regexed}]});plain.mes=regexed+tail;emit('r',1,'appendFinal');
 assert.equal(plain.mes,before+tail);second.stop();
});
