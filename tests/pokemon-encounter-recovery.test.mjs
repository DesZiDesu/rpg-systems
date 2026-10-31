import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,replay,worldPrompt,LIVE} from '../src/workshop/pokemon/core.js';

const raw=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url)));
raw.expansion=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/expansion.json',import.meta.url)));
const dex=catalogIndex(raw);
const rules={engineVersion:4,started:true,initialParty:[{speciesId:906,level:16},{speciesId:25,level:8}]};
const on={is_user:false,mes:'',swipe_id:0,extra:{roleforge_pokemon_v1:[{id:'set-1',type:'settings',playerEncounters:true,swipe:0,offset:0}]}};
const user=mes=>({is_user:true,mes,extra:{}});
const reply=(mes,live=true)=>({is_user:false,mes,swipe_id:0,extra:live?{[LIVE]:1}:{}});

test('a Thai name plus a wild header in the reply starts that encounter',()=>{
 const s=replay([on,user('*ไรจูกระโดดออกมาจากพุ่มไม้ตรงหน้า*'),reply('<tr-narrative>ไรจูพุ่งออกมาจากพุ่มไม้</tr-narrative><tr-header name="Raichu"/><tr-dialogue name="Raichu">ไรจู!</tr-dialogue>')],dex,rules);
 assert.equal(s.battle?.wild.key,'raichu');assert.equal(s.battle.wild.level,14);
});

test('recovery needs a live reply, one wild species, and an appearance from the player',()=>{
 const scene='<tr-header name="Raichu"/><tr-dialogue name="Raichu">ไรจู!</tr-dialogue>';
 assert.equal(replay([on,user('*ไรจูกระโดดออกมา*'),reply(scene,false)],dex,rules).battle,null,'old replies keep their meaning');
 assert.equal(replay([on,user('อยากเจอไรจูจัง'),reply(scene)],dex,rules).battle,null,'a wish is not an appearance');
 assert.equal(replay([on,user('*ไรจูกระโดดออกมา*'),reply(scene+'<tr-header name="Pidgey"/>')],dex,rules).battle,null,'two species are ambiguous');
 assert.equal(replay([user('*ไรจูกระโดดออกมา*'),reply(scene)],dex,rules).battle,null,'only with Player-chosen encounters on');
});

test('ordinary Thai "ไม่" phrasing no longer reads as a negation',()=>{
 const s=replay([on,user('*ไม่ทันตั้งตัว Pikachu ก็โผล่ออกมาตรงหน้า*')],dex,rules);
 assert.equal(s.battle?.wild.key,'pikachu');
 assert.equal(replay([on,user('ไม่เจอ Pikachu เลย')],dex,rules).battle,null);
});

test('the first partner starts beside the player; other party members stay in their balls',()=>{
 const s=initialGame(dex,rules),p=JSON.parse(worldPrompt(s,dex).split('\n')[1]);
 assert.equal(s.outUid,'initial-0');
 assert.equal(p.outsideCompanion,'pokemon:initial-0');
 assert.equal(p.party[0].chatSpeaker,'pokemon:initial-0');
 assert.equal(p.party[1].inBall,true);assert.equal(p.party[1].chatSpeaker,undefined);
 const lead=transition(s,{id:'l',type:'lead',uid:'initial-1'},dex,rules);
 assert.equal(lead.outUid,'initial-1','the walking lead follows a lead change');
});
