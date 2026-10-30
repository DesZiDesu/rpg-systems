import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogIndex,initialGame,transition,SHINY_RATES} from '../src/workshop/pokemon/core.js';
const dex=catalogIndex(JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url))));
const rules={engineVersion:4,started:true,initialParty:[{speciesId:906,level:30}]};
const meet=(s,id)=>transition(s,{id,type:'encounter',speciesId:376,level:20,engine:4},dex,rules);
const shinies=(s,n,prefix='m')=>{let found=0;for(let i=0;i<n;i++)found+=meet(s,prefix+i).battle.wild.shiny?1:0;return found;};
const rate=(s,shinyRate)=>transition(s,{id:'rate-'+shinyRate,type:'settings',shinyRate},dex,rules);

test('the default keeps the original 1/4096 roll, so existing encounters replay identically',()=>{
 const s=initialGame(dex,rules);assert.equal(s.settings.shinyRate,undefined);
 assert.deepEqual(SHINY_RATES,[8192,4096,1365,512,100,20]);
 for(let i=0;i<300;i++)assert.equal(meet(s,'d'+i).battle.wild.shiny,meet(rate(s,4096),'d'+i).battle.wild.shiny);
});

test('higher odds make shinies findable and every rate keeps the expected frequency',()=>{
 const base=initialGame(dex,rules);
 const frequent=shinies(rate(base,20),2000);assert(frequent>60&&frequent<140,'1/20 over 2000 encounters: '+frequent);
 const hundred=shinies(rate(base,100),3000);assert(hundred>10&&hundred<60,'1/100 over 3000 encounters: '+hundred);
 assert(shinies(rate(base,8192),2000)<=shinies(rate(base,20),2000));
});

test('changing the odds never recolours Pokémon already met or caught',()=>{
 let s=meet(rate(initialGame(dex,rules),20),'early');const wasShiny=s.battle.wild.shiny;
 s.inventory['master-ball']=1;s=transition(s,{id:'ball',type:'catch',ball:'master-ball',engine:4},dex,rules);
 const caught=Object.values(s.pokemon).find(m=>m.key==='metagross');assert.equal(caught.shiny,wasShiny);
 s=rate(s,8192);assert.equal(Object.values(s.pokemon).find(m=>m.key==='metagross').shiny,wasShiny);
 assert.throws(()=>transition(s,{id:'bad',type:'settings',shinyRate:7},dex,rules),/Unknown shiny rate/);
});

test('trainer Pokémon keep the standard odds and a shiny encounter is announced',()=>{
 const s=rate(initialGame(dex,rules),20);let shown=null;
 for(let i=0;i<200&&!shown;i++){const next=meet(s,'a'+i);if(next.battle.wild.shiny)shown=next;}
 assert(shown,'a shiny appears at 1/20');assert.deepEqual(shown.lastResult,{key:'encounter',name:'Metagross',level:20,shiny:true});
 let trainerShinies=0;
 for(let i=0;i<300;i++){const t=transition(s,{id:'t'+i,type:'trainer-offer',source:'story',engine:5,trainerKey:'npc-'+i,name:'Trainer '+i,place:'',team:[{key:'pidgey',level:5}],equipment:{},mode:'immediate'},dex,rules);trainerShinies+=t.battle.wild.shiny?1:0;}
 assert(trainerShinies<=2,'trainer teams are not affected by the wild odds: '+trainerShinies);
});
