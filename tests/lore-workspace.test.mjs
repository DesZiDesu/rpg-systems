import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoreWorkspace} from '../lore-workspace.js';
import {characterLore,writeCharacterLore,loreOptions,writeLoreOptions} from '../lore-core.js';
class Node {
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(key,value){this[key]=value;}
 addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);}
 fire(name){for(const fn of this.listeners[name]||[])fn({preventDefault(){}});}
 focus(){}
}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>({textContent:text})};
globalThis.confirm=()=>true;
function find(root,predicate){return [root,...root.children.flatMap(n=>n.children?find(n,predicate):[])].filter(predicate);}
const click=(root,label)=>find(root,n=>n.tag==='button'&&n.textContent===label)[0].fire('click');
function fixture(){const panel=new Node('section'),settings={};let owner='card:a',status='';const api={loreOptions:()=>loreOptions(settings,owner),persistLoreOptions:(options,expected)=>writeLoreOptions(settings,options,expected,owner),scopeInfo:()=>({key:owner,label:owner}),listLore:()=>characterLore(settings,owner),persistLore:(entries,expected)=>writeCharacterLore(settings,entries,expected,owner)};const ui=createLoreWorkspace(panel,api,value=>status=value);ui.open();return {panel,settings,ui,setOwner:value=>owner=value,status:()=>status};}
test('Lore UI creates, edits, toggles, searches and deletes saved records',()=>{
 const {panel,settings,ui}=fixture();click(panel,'＋ สร้าง Lore ใหม่');
 find(panel,n=>n.name==='loreTitle')[0].value='Moon';find(panel,n=>n.name==='loreContent')[0].value='Blue crystal';find(panel,n=>n.tag==='form')[0].fire('submit');
 assert.equal(characterLore(settings,'card:a')[0].content,'Blue crystal');
 click(panel,'Moon');find(panel,n=>n.name==='loreContent')[0].value='Silver crystal';find(panel,n=>n.tag==='form')[0].fire('submit');
 let toggle=find(panel,n=>n.type==='checkbox')[0];toggle.checked=false;toggle.fire('change');assert.equal(characterLore(settings,'card:a')[0].enabled,false);
 ui.open();assert.equal(find(panel,n=>n.type==='checkbox')[0].checked,false);
 const search=find(panel,n=>n.type==='search')[0];search.value='no match';search.fire('input');assert.equal(find(panel,n=>n.textContent==='Moon').length,0);
 search.value='';search.fire('input');click(panel,'ลบ');assert.deepEqual(characterLore(settings,'card:a'),[]);
});
test('Lore UI protects unsaved work and rejects saves after switching cards',()=>{
 const {panel,ui,setOwner,settings,status}=fixture();click(panel,'＋ สร้าง Lore ใหม่');
 find(panel,n=>n.name==='loreTitle')[0].value='Moon';find(panel,n=>n.name==='loreContent')[0].value='Facts';const form=find(panel,n=>n.tag==='form')[0];form.fire('input');
 globalThis.confirm=()=>false;assert.equal(ui.canLeave(),false);globalThis.confirm=()=>true;
 ui.refresh();assert.equal(find(panel,n=>n.name==='loreTitle')[0].value,'Moon');
 setOwner('card:b');form.fire('submit');assert.match(status(),/การ์ดเปลี่ยน/);assert.deepEqual(characterLore(settings,'card:b'),[]);assert.deepEqual(characterLore(settings,'card:a'),[]);
});

test('Lore UI persists a two-million-character budget and rejects stale preference writes',()=>{
 const {panel,settings,ui,setOwner,status}=fixture();
 find(panel,n=>n.name==='loreBudget')[0].value='2000000';find(panel,n=>n.name==='loreMode')[0].value='relevant';click(panel,'บันทึกงบและโหมด');
 assert.deepEqual(loreOptions(settings,'card:a'),{budget:2000000,mode:'relevant'});ui.open();assert.equal(find(panel,n=>n.name==='loreBudget')[0].value,2000000);
 setOwner('card:b');click(panel,'บันทึกงบและโหมด');assert.match(status(),/การ์ดเปลี่ยน/);assert.equal(loreOptions(settings,'card:b').budget,60000);
});
