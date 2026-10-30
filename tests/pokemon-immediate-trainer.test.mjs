import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,replay,worldPrompt,JOURNAL,journalEvent} from '../src/workshop/pokemon/core.js';
import {parsePokemonStory} from '../src/workshop/pokemon/story.js';
const dex=catalogIndex(JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url))));
const rules={engineVersion:4,started:true,initialParty:[{key:'pikachu',level:70}]};
const proof='Mira forces you to battle at Route 1 with Pidgey and Rattata; the battle begins.';
const event={type:'trainer',mode:'immediate',name:'Mira',place:'Route 1',team:[{key:'pidgey',level:5},{key:'rattata',level:6}]};
const message=(e=event,evidence=proof)=>({mes:evidence+'<!--roleforge_pokemon:'+JSON.stringify({version:4,events:[{...e,evidence}]})+'-->'});

test('forced Trainer scene starts immediately with a real sequential team and authoritative AI context',()=>{
 let g=replay([message()],dex,rules);
 assert.equal(g.battle.trainer.name,'Mira');assert.equal(g.battle.trainer.team.length,2);
 assert.equal(g.trainerChallenges[0].status,'accepted');assert.equal(g.battle.wild.key,'pidgey');
 assert.match(worldPrompt(g,dex),/"trainer":"Mira"/);
 assert.throws(()=>transition(g,{id:'catch',engine:4,type:'catch',ball:'poke-ball'},dex,rules),/Only wild/);
 const foes=new Set();for(let i=0;g.battle&&i<40;i++){foes.add(g.battle.wild.key);g=transition(g,{id:'hit'+i,engine:4,type:'attack',moveId:g.pokemon[g.battle.activeUid].moves.find(m=>m.pp>0)?.id||165},dex,rules);}
 assert.deepEqual([...foes],['pidgey','rattata']);assert.equal(g.lastBattle.result,'victory');assert.equal(g.wins,1);
 assert.equal(g.trainerChallenges[0].status,'completed');
});
test('Thai forced battle and a visibly accepted challenge support immediate mode',()=>{
 for(const line of ['Mira บังคับคุณต่อสู้บน Route 1 ด้วย Pidgey และ Rattata และเริ่มการต่อสู้ทันที','คุณรับคำท้าของ Mira บน Route 1 และเริ่มการประลองกับ Pidgey และ Rattata'])assert.equal(replay([message(event,line)],dex,rules).battle.trainer.name,'Mira');
});
test('ordinary, mislabeled and future invitations keep the existing acceptance flow',()=>{
 for(const [e,line] of [[{...event,mode:undefined},proof],[event,'Mira challenges you at Route 1 with Pidgey and Rattata.'],[event,'Mira will force you to battle at Route 1 with Pidgey and Rattata; the battle begins tomorrow.'],[event,'Mira ท้าคุณที่ Route 1 ด้วย Pidgey และ Rattata และจะเริ่มการต่อสู้พรุ่งนี้']]){
  const g=replay([message(e,line)],dex,rules);assert.equal(g.battle,null,line);assert.equal(g.trainerChallenges[0].status,'offered');
 }
});
test('immediate mode cannot bypass visible team, place or player evidence',()=>{
 for(const e of [{...event,name:'Lena'},{...event,place:'Route 2'},{...event,team:[{key:'charizard',level:5}]},{...event,team:Array(7).fill(event.team[0])}])assert.equal(parsePokemonStory(message(e).mes,dex).events.length,0);
 for(const line of ['If '+proof,proof.replace('you','Red')])assert.equal(replay([message(event,line)],dex,rules).battle,null);
});
test('an existing battle is never replaced and repeated active trainer narration does not reset the challenge',()=>{
 const wild={mes:'A wild Eevee appears before you.'};let g=replay([wild,message()],dex,rules);
 assert.equal(g.battle.wild.key,'eevee');assert.equal(g.battle.trainer,undefined);assert.equal(g.trainerChallenges[0].status,'offered');
 g=replay([message(),message()],dex,rules);assert.equal(g.encounters,1);assert.equal(g.trainerChallenges.length,1);assert.equal(g.trainerChallenges[0].status,'accepted');
});
test('without a ready party the challenge stays offered, without healing or creating a starter',()=>{
 assert.equal(replay([message()],dex,{started:false}).battle,null);
 let g=initialGame(dex,rules);g.pokemon[g.party[0]].hp=0;
 const parsed=parsePokemonStory(message().mes,dex).events[0];g=transition(g,parsed,dex,rules);
 assert.equal(g.battle,null);assert.equal(g.pokemon[g.party[0]].hp,0);assert.equal(g.trainerChallenges[0].status,'offered');
});
test('deleting or swiping away the source rolls back forced battle and its subsequent actions; replay is deterministic',()=>{
 const m=message(),g=replay([m],dex,rules),hit={id:'hit',type:'attack',engine:4,moveId:g.pokemon[g.battle.activeUid].moves[0].id};
 m.extra={[JOURNAL]:[journalEvent(hit,m)]};const played=replay([m],dex,rules);
 assert.deepEqual(replay([m],dex,rules),played);
 assert.equal(replay([],dex,rules).battle,null);assert.equal(replay([{...m,mes:'A quiet road.',swipe_id:1}],dex,rules).battle,null);
 assert.equal(replay([message()],dex,rules).battle.round,1);
});
