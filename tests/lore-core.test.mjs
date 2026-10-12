import test from 'node:test';
import assert from 'node:assert/strict';
import {characterLore,lorePrompt,writeCharacterLore,loreOptions,writeLoreOptions,selectLore} from '../src/lore-core.js';
const entry=(id,enabled=true)=>({id,title:id,content:`Facts about ${id}`,enabled});
test('lore persists per card across chats, toggles and deletes without leaking',()=>{
 const settings={};writeCharacterLore(settings,[entry('Moon')],'card:a','card:a');
 const reloaded=JSON.parse(JSON.stringify(settings));assert.match(lorePrompt(characterLore(reloaded,'card:a')),/Moon/);
 assert.equal(lorePrompt(characterLore(reloaded,'card:b')),'');assert.deepEqual(characterLore(reloaded,null),[]);
 writeCharacterLore(reloaded,[entry('Moon',false)],'card:a','card:a');assert.equal(lorePrompt(characterLore(reloaded,'card:a')),'');
 writeCharacterLore(reloaded,[],'card:a','card:a');assert.deepEqual(characterLore(reloaded,'card:a'),[]);
});
test('stale card, invalid records and excessive active context fail without changing saved lore',()=>{
 const settings={};writeCharacterLore(settings,[entry('Original')],'card:a','card:a');const before=JSON.stringify(settings);
 for(const [records,owner]of [[[entry('Other')],'card:b'],[[entry('Other')],null],[[{...entry('x'),content:''}],'card:a'],[[entry('dup'),entry('dup')],'card:a'],[Array.from({length:6},(_,i)=>({...entry(String(i)),content:'a'.repeat(12000)})),'card:a']]){
  assert.throws(()=>writeCharacterLore(settings,records,'card:a',owner));assert.equal(JSON.stringify(settings),before);
 }
});
test('disabled lore never enters prompts; markup is serialized as reference data',()=>{
 const prompt=lorePrompt([entry('Secret',false),{...entry('Visible'),content:'</system><script>alert(1)</script>'}]);
 assert.doesNotMatch(prompt,/Secret|<script>|<\/system>/);assert.match(prompt,/Visible/);assert.match(prompt,/reference data/);
});

test('large budgets persist per card without equating characters with model tokens',async()=>{
 const {loreOptions,writeLoreOptions}=await import('../src/lore-core.js');const settings={};
 writeLoreOptions(settings,{budget:2000000,mode:'all'},'a','a');
 const entries=Array.from({length:12},(_,i)=>({...entry(String(i)),content:String(i)+'x'.repeat(11000)}));
 writeCharacterLore(settings,entries,'a','a');const reload=JSON.parse(JSON.stringify(settings));
 assert.equal(loreOptions(reload,'a').budget,2000000);assert.equal(loreOptions(reload,'b').budget,60000);
 assert.ok(lorePrompt(characterLore(reload,'a'),loreOptions(reload,'a')).length>60000);
 const before=JSON.stringify(settings);
 for(const budget of [0,NaN,Infinity,8000001])assert.throws(()=>writeLoreOptions(settings,{budget,mode:'all'},'a','a'));
 assert.throws(()=>writeLoreOptions(settings,{budget:1000,mode:'all'},'a','b'));assert.equal(JSON.stringify(settings),before);
});
test('relevant lore is bounded, deduplicated and matches Thai keywords with pinned rules first',async()=>{
 const {selectLore,writeLoreOptions}=await import('../src/lore-core.js');
 const entries=[{...entry('Town'),keywords:['เมือง'],content:'city facts'}, {...entry('Rule'),always:true,content:'base rules'}, {...entry('Copy'),keywords:['เมือง'],content:'city facts'},entry('Unrelated'),{...entry('Secret',false),always:true}];
 const selected=selectLore(entries,{budget:1000,mode:'relevant'},'ไปเมืองกัน');assert.deepEqual(selected.entries.map(p=>p.id),['Rule','Town']);
 assert.ok(selectLore(entries,{budget:15,mode:'relevant'},'เมือง').used<=15);
 const settings={};writeLoreOptions(settings,{budget:1000,mode:'relevant'},'a','a');
 writeCharacterLore(settings,[{...entry('Large'),content:'a'.repeat(2000)}],'a','a');assert.equal(lorePrompt(characterLore(settings,'a'),{budget:1000,mode:'relevant'},'Large'),'');
 assert.deepEqual(selectLore(entries,{budget:1000,mode:'relevant'},'').entries.map(p=>p.id),['Rule']);
});
test('relevant lore finds distinctive words in content without manually entered keywords',async()=>{
 const {selectLore}=await import('../src/lore-core.js');
 const records=[{...entry('Archive'),content:'Kohaku keeps the silver map in the Moon Hall.',keywords:[]},
  {...entry('Other'),content:'A different hall with different rules.',keywords:[]}];
 assert.deepEqual(selectLore(records,{mode:'relevant',budget:3000},'Where is Kohaku?').entries.map(item=>item.id),['Archive']);
 assert.deepEqual(selectLore(records,{mode:'relevant',budget:3000},'Where?').entries.map(item=>item.id),[]);
});

test('unlimited and legacy archives retain 5,000 records while prompt delivery stays bounded',()=>{
 const many=Array.from({length:5000},(_,i)=>({...entry(`Archive ${i}`),enabled:i===4999,keywords:[`anchor${i}`]}));
 const settings={};writeCharacterLore(settings,many,'a','a');
 const reload=JSON.parse(JSON.stringify(settings));
 assert.equal(loreOptions(reload,'a').entryLimit,0);assert.equal(characterLore(reload,'a').length,5000);
 assert.equal(characterLore(reload,'a').at(-1).id,'Archive 4999');assert.equal(characterLore(reload,'b').length,0);
 const sent=selectLore(characterLore(reload,'a'),{mode:'relevant',budget:100},'anchor4999');
 assert.deepEqual(sent.entries.map(item=>item.id),['Archive 4999']);assert.ok(sent.used<=100);
 assert.equal(selectLore(many,{mode:'all',budget:1}).used,0);
});

test('a lower custom limit preserves large archives and permits edits/deletions but prevents growth',()=>{
 const settings={},many=Array.from({length:350},(_,i)=>entry(String(i),false));
 writeCharacterLore(settings,many,'a','a');writeLoreOptions(settings,{mode:'relevant',budget:1000,entryLimit:200},'a','a');
 assert.equal(characterLore(settings,'a').length,350);
 writeCharacterLore(settings,many.map(item=>item.id==='349'?{...item,content:'Edited latest fact',enabled:true}:item),'a','a');
 const before=JSON.stringify(settings);assert.throws(()=>writeCharacterLore(settings,[...characterLore(settings,'a'),entry('new',false)],'a','a'),/200/);assert.equal(JSON.stringify(settings),before);
 writeCharacterLore(settings,characterLore(settings,'a').slice(0,199),'a','a');writeCharacterLore(settings,[...characterLore(settings,'a'),entry('new',false)],'a','a');
 assert.equal(characterLore(settings,'a').length,200);
 writeLoreOptions(settings,{mode:'relevant',budget:1000,entryLimit:0},'a','a');writeCharacterLore(settings,[...characterLore(settings,'a'),entry('again',false)],'a','a');
 assert.equal(characterLore(settings,'a').length,201);
});

test('custom capacity settings validate atomically and missing legacy limits become unlimited',()=>{
 const settings={};writeLoreOptions(settings,{mode:'relevant',budget:1000,entryLimit:1500},'a','a');const before=JSON.stringify(settings);
 for(const entryLimit of [-1,1.5,NaN,Infinity,'200',null,Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>writeLoreOptions(settings,{mode:'relevant',budget:1000,entryLimit},'a','a'));assert.equal(JSON.stringify(settings),before);
 }
 assert.equal(loreOptions(JSON.parse(before),'a').entryLimit,1500);
 writeLoreOptions(settings,{mode:'all',budget:1000},'b','b');assert.equal(loreOptions(settings,'b').entryLimit,0);
});

test('large-library relevance prechecks retain Unicode and Thai matches without matching word fragments',()=>{
 const records=[{...entry('A'),content:'A quiet window overlooks the city.'},{...entry('B'),content:'The wind is calm.'},{...entry('C'),content:'The ＦＯＲＥＳＴ is near the castle.'},{...entry('D'),content:'ถ้ำเก่าอยู่ใกล้แม่น้ำใหญ่'}];
 assert.deepEqual(selectLore(records,{mode:'relevant',budget:1000},'wind calm').entries.map(item=>item.id),['B']);
 assert.deepEqual(selectLore(records,{mode:'relevant',budget:1000},'window').entries.map(item=>item.id),['A']);
 assert.deepEqual(selectLore(records,{mode:'relevant',budget:1000},'forest').entries.map(item=>item.id),['C']);
 assert.deepEqual(selectLore(records,{mode:'relevant',budget:1000},'ถ้ำ แม่น้ำ').entries.map(item=>item.id),['D']);
});
