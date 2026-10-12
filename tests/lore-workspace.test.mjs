import {uiText} from '../src/ui-language.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoreWorkspace} from '../src/lore-workspace.js';
import {characterLore,writeCharacterLore,loreOptions,writeLoreOptions} from '../src/lore-core.js';
import {exportLore} from '../src/lore-transfer.js';
class Node {
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(key,value){this[key]=value;}
 addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);}
 fire(name){return Promise.all((this.listeners[name]||[]).map(fn=>fn({preventDefault(){}})));}
 focus(){}
}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>({textContent:text})};
globalThis.confirm=()=>true;
function find(root,predicate){return [root,...root.children.flatMap(n=>n.children?find(n,predicate):[])].filter(predicate);}
const click=(root,label)=>find(root,n=>n.tag==='button'&&n.textContent===uiText(label))[0].fire('click');
function fixture(){const panel=new Node('section'),settings={};let owner='card:a',status='';const api={loreOptions:()=>loreOptions(settings,owner),persistLoreOptions:(options,expected)=>writeLoreOptions(settings,options,expected,owner),scopeInfo:()=>({key:owner,label:owner}),listLore:()=>characterLore(settings,owner),persistLore:(entries,expected)=>writeCharacterLore(settings,entries,expected,owner)};const ui=createLoreWorkspace(panel,api,value=>status=value);ui.open();return {panel,settings,api,ui,setOwner:value=>owner=value,status:()=>status};}

test('Lore settings expose unlimited/default and custom capacities without discarding existing records',async()=>{
 const {panel,settings,ui,status}=fixture();
 assert.equal(find(panel,n=>n.name==='loreCapacity')[0].value,'unlimited');assert.equal(find(panel,n=>n.name==='loreEntryLimit')[0].disabled,true);
 const many=Array.from({length:350},(_,i)=>({id:String(i),title:`World ${i}`,content:'Saved fact',enabled:false}));writeCharacterLore(settings,many,'card:a','card:a');ui.open();
 const capacity=find(panel,n=>n.name==='loreCapacity')[0],limit=find(panel,n=>n.name==='loreEntryLimit')[0];capacity.value='limited';await capacity.fire('change');assert.equal(limit.disabled,false);
 limit.value='200';await click(panel,'Save Lore settings');assert.equal(loreOptions(settings,'card:a').entryLimit,200);assert.equal(characterLore(settings,'card:a').length,350);
 ui.open();assert.equal(find(panel,n=>n.name==='loreCapacity')[0].value,'limited');assert.equal(find(panel,n=>n.name==='loreEntryLimit')[0].value,200);
 find(panel,n=>n.name==='loreEntryLimit')[0].value='';await click(panel,'Save Lore settings');assert.match(status(),/positive whole number/);assert.equal(loreOptions(settings,'card:a').entryLimit,200);
 find(panel,n=>n.name==='loreCapacity')[0].value='unlimited';await click(panel,'Save Lore settings');assert.equal(loreOptions(settings,'card:a').entryLimit,0);assert.equal(characterLore(settings,'card:a').length,350);
});

test('Lore batch deletion confirms all filtered results, keeps selection on failure, and clears obsolete Undo',async()=>{
 const {panel,settings,api,ui,status}=fixture(),originalConfirm=globalThis.confirm;
 try{
  const many=Array.from({length:47},(_,i)=>({id:String(i),title:`${i%2?'Keep':'Remove'} ${i}`,content:`Fact ${i}`,enabled:true,keywords:[`key${i}`],always:i===0}));writeCharacterLore(settings,many,'card:a','card:a');ui.open();
  const search=find(panel,n=>n['data-lore-search']==='')[0];search.value='Remove';await search.fire('input');
  const action=key=>find(panel,n=>n[`data-archive-${key}`]==='')[0];await action('select-mode').fire('click');await action('select-results').fire('click');await action('disable').fire('click');await action('select-results').fire('click');
  const before=characterLore(settings,'card:a'),selected=before.filter(item=>item.title.startsWith('Remove'));assert.equal(selected.length,24);assert.equal(action('undo').hidden,false);
  let message='';globalThis.confirm=value=>{message=value;return false;};await action('delete').fire('click');assert.match(message,/24/);assert.match(message,/card:a/);assert.match(message,/cannot be undone/);assert.deepEqual(characterLore(settings,'card:a'),before);assert.equal(action('delete').disabled,false);
  globalThis.confirm=()=>true;const persist=api.persistLore;api.persistLore=()=>{throw Error('Delete write failed');};await action('delete').fire('click');assert.match(status(),/Delete write failed/);assert.deepEqual(characterLore(settings,'card:a'),before);assert.equal(action('delete').disabled,false);assert.equal(action('undo').hidden,false);
  let writes=0;api.persistLore=(...args)=>{writes++;return persist(...args);};await action('delete').fire('click');assert.equal(writes,1);assert.deepEqual(characterLore(settings,'card:a'),before.filter(item=>item.title.startsWith('Keep')));assert.equal(action('undo').hidden,true);assert.equal(action('delete').disabled,true);
 }finally{globalThis.confirm=originalConfirm;}
});

test('a card switch during Lore deletion confirmation cannot write the old selection into either card',async()=>{
 const {panel,settings,api,ui,setOwner}=fixture(),originalConfirm=globalThis.confirm;
 try{
  writeCharacterLore(settings,[{id:'a',title:'Fact',content:'Saved',enabled:false}],'card:a','card:a');ui.open();
  const action=key=>find(panel,n=>n[`data-archive-${key}`]==='')[0];await action('select-mode').fire('click');await action('select-results').fire('click');
  let writes=0;api.persistLore=()=>{writes++;};globalThis.confirm=()=>{setOwner('card:b');return true;};await action('delete').fire('click');
  assert.equal(writes,0);assert.equal(characterLore(settings,'card:a').length,1);assert.deepEqual(characterLore(settings,'card:b'),[]);
 }finally{globalThis.confirm=originalConfirm;}
});
test('Lore UI creates, edits, toggles, searches and deletes saved records',async()=>{
 const {panel,settings,ui}=fixture();click(panel,'＋ สร้าง Lore ใหม่');
 find(panel,n=>n.name==='loreTitle')[0].value='Moon';find(panel,n=>n.name==='loreContent')[0].value='Blue crystal';await find(panel,n=>n.tag==='form')[0].fire('submit');
 assert.equal(characterLore(settings,'card:a')[0].content,'Blue crystal');
 click(panel,'Moon');find(panel,n=>n.name==='loreContent')[0].value='Silver crystal';await find(panel,n=>n.tag==='form')[0].fire('submit');
 let toggle=find(panel,n=>n.type==='checkbox')[0];toggle.checked=false;await toggle.fire('change');assert.equal(characterLore(settings,'card:a')[0].enabled,false);
 ui.open();assert.equal(find(panel,n=>n.type==='checkbox')[0].checked,false);
 const search=find(panel,n=>n.type==='search')[0];search.value='no match';search.fire('input');assert.equal(find(panel,n=>n.textContent==='Moon').length,0);
 search.value='';search.fire('input');await click(panel,'ลบ');assert.deepEqual(characterLore(settings,'card:a'),[]);
});
test('Lore UI protects unsaved work and rejects saves after switching cards',async()=>{
 const {panel,ui,setOwner,settings,status}=fixture();click(panel,'＋ สร้าง Lore ใหม่');
 find(panel,n=>n.name==='loreTitle')[0].value='Moon';find(panel,n=>n.name==='loreContent')[0].value='Facts';const form=find(panel,n=>n.tag==='form')[0];form.fire('input');
 globalThis.confirm=()=>false;assert.equal(ui.canLeave(),false);globalThis.confirm=()=>true;
 ui.refresh();assert.equal(find(panel,n=>n.name==='loreTitle')[0].value,'Moon');
 setOwner('card:b');await form.fire('submit');assert.match(status(),/card changed/);assert.deepEqual(characterLore(settings,'card:b'),[]);assert.deepEqual(characterLore(settings,'card:a'),[]);
});

test('Lore UI persists a two-million-character budget and rejects stale preference writes',async()=>{
 const {panel,settings,ui,setOwner,status}=fixture();
 find(panel,n=>n.name==='loreBudget')[0].value='2000000';find(panel,n=>n.name==='loreMode')[0].value='relevant';await click(panel,'บันทึกการตั้งค่า Lore');
 assert.deepEqual(loreOptions(settings,'card:a'),{budget:2000000,mode:'relevant',entryLimit:0});ui.open();assert.equal(find(panel,n=>n.name==='loreBudget')[0].value,2000000);
 setOwner('card:b');await click(panel,'บันทึกการตั้งค่า Lore');assert.match(status(),/card changed/);assert.equal(loreOptions(settings,'card:b').budget,60000);
});

test('failed Lore saves keep the draft open and do not report success',async()=>{
 const {panel,api,settings,ui,status}=fixture();api.persistLore=async()=>{throw Error('HTTP 503');};
 click(panel,'＋ สร้าง Lore ใหม่');find(panel,n=>n.name==='loreTitle')[0].value='Moon';
 find(panel,n=>n.name==='loreContent')[0].value='Unpublished fact';const form=find(panel,n=>n.tag==='form')[0];form.fire('input');
 await form.fire('submit');assert.match(status(),/HTTP 503/);
 assert.equal(find(panel,n=>n.name==='loreContent')[0].value,'Unpublished fact');assert.deepEqual(characterLore(settings,'card:a'),[]);
 globalThis.confirm=()=>false;assert.equal(ui.canLeave(),false);globalThis.confirm=()=>true;
});

test('Lore import adds records, skips duplicates and retains original data on invalid files',async()=>{
 const {panel,api,status}=fixture();const file=()=>find(panel,n=>n.type==='file')[0];
 const record={id:'foreign',title:'Imported',content:'World facts',enabled:false,keywords:['world'],always:true};
 let input=file();input.files=[{size:300,text:async()=>exportLore([record])}];await input.fire('change');
 assert.equal(api.listLore().length,1);assert.equal(api.listLore()[0].always,true);assert.match(status(),/Imported 1 Lore entries/);
 input=file();input.files=[{size:300,text:async()=>exportLore([record])}];await input.fire('change');assert.equal(api.listLore().length,1);assert.match(status(),/No new entries/);
 input.files=[{size:2,text:async()=>'{'}];await input.fire('change');assert.match(status(),/JSON/);assert.equal(api.listLore().length,1);
});
test('Lore import rejects card switches during file reading',async()=>{
 const {panel,api,setOwner,status}=fixture();const input=find(panel,n=>n.type==='file')[0];
 let finish;input.files=[{size:300,text:()=>new Promise(resolve=>finish=resolve)}];const pending=input.fire('change');
 setOwner('card:b');finish(exportLore([{id:'x',title:'X',content:'Facts',enabled:true}]));await pending;
 assert.match(status(),/card changed/);assert.deepEqual(api.listLore(),[]);
});
