import test from 'node:test';
import assert from 'node:assert/strict';
import {renderStoryBlocks,priorDialogueSpeaker} from '../src/npc-chat.js';
import {parseStory} from '../src/npc-core.js';
class Node {
 constructor(tag){this.tag=tag;this.className='';this.children=[];this.style={setProperty(){}};this.isConnected=true;this.listeners={};}
 append(...nodes){this.children.push(...nodes)}
 prepend(node){this.children.unshift(node)}
 setAttribute(){}
 addEventListener(name,fn){this.listeners[name]=fn}
}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>({textContent:text})};
const a={id:'a',name:'Alice',aliases:['Al']},b={id:'b',name:'Bob'};
const lookup=new Map([['alice',a],['al',a],['bob',b]]);
const dialogue=(name,text)=>`<tr-dialogue name="${name}">${text}</tr-dialogue>`;
function draw(source){const root=new Node('root'),portraits=[],opened=[];renderStoryBlocks(root,parseStory(source),lookup,'Narrator',p=>opened.push(p.name),async p=>{portraits.push(p.name);return null});return{root,portraits,opened};}
function find(root,cls){return root.children.flatMap(n=>[...(n.className===cls?[n]:[]),...(n.children?find(n,cls):[])]);}
const texts=root=>find(root,'trpg-dialogue').map(n=>n.textContent);
test('same-speaker dialogue shows one clickable header and loads one portrait',()=>{
 const {root,portraits,opened}=draw(dialogue('Alice','One')+dialogue('Alice','Two'));
 const headers=find(root,'trpg-header');assert.equal(headers.length,1);assert.deepEqual(texts(root),['One','Two']);assert.deepEqual(portraits,['Alice']);headers[0].listeners.click();assert.deepEqual(opened,['Alice']);
});
test('A → B → A restores the returning speaker header',()=>{
 const {root,portraits}=draw(dialogue('Alice','One')+dialogue('Bob','Two')+dialogue('Alice','Three'));
 assert.equal(find(root,'trpg-header').length,3);assert.deepEqual(portraits,['Alice','Bob','Alice']);assert.deepEqual(texts(root),['One','Two','Three']);
});
test('narrative and plain prose preserve their positions without resetting the speaker',()=>{
 const {root}=draw(dialogue('Alice','One')+'<tr-narrative>Looks away.</tr-narrative>Pause.'+dialogue('Alice','Two'));
 assert.equal(find(root,'trpg-header').length,1);assert.deepEqual(root.children.map(n=>n.className),['trpg-speaker','trpg-narrative','trpg-plain','trpg-speaker']);assert.equal(find(root,'trpg-prose-copy')[0].textContent,'Looks away.');assert.equal(find(root,'trpg-plain')[0].textContent,'Pause.');
});
test('canonical names and aliases are one speaker',()=>{
 assert.equal(find(draw(dialogue('Alice','One')+dialogue('Al','Two')).root,'trpg-header').length,1);
});
test('unregistered speakers use normalized names but different names still switch',()=>{
 const {root}=draw(dialogue(' นักเดินทาง ','หนึ่ง')+dialogue('นักเดินทาง','สอง')+dialogue('ยาม','สาม'));
 assert.equal(find(root,'trpg-header').length,2);assert.deepEqual(texts(root),['หนึ่ง','สอง','สาม']);
});
test('each new message and rerender starts with a header',()=>{
 const source=dialogue('Alice','One')+dialogue('Alice','Two');
 for(let i=0;i<3;i++)assert.equal(find(draw(source).root,'trpg-header').length,1);
 assert.equal(find(draw(dialogue('Bob','Replacement')).root,'trpg-header').length,1);
});
test('streaming redraw preserves completed dialogue and does not duplicate headers',()=>{
 const first=dialogue('Alice','One');assert.equal(find(draw(first+'<tr-dialogue name="Alice">unfinished').root,'trpg-header').length,1);
 const final=draw(first+dialogue('Alice','Two')).root;assert.equal(find(final,'trpg-header').length,1);assert.deepEqual(texts(final),['One','Two']);
});

test('adjacent assistant continuation omits the same header, including aliases',()=>{
 const messages=[{mes:dialogue('Alice','One')},{mes:dialogue('Al','Two')}];
 const prior=priorDialogueSpeaker(messages,1,lookup,s=>s);assert.equal(prior,a);
 const root=new Node('root');renderStoryBlocks(root,parseStory(messages[1].mes),lookup,'Narrator',()=>{},async()=>null,prior);
 assert.equal(find(root,'trpg-header').length,0);assert.deepEqual(texts(root),['Two']);
});
test('player/system/unstructured turns reset continuation; changed prior speaker updates it',()=>{
 for(const prior of [{is_user:true,mes:dialogue('Alice','One')},{is_system:true,mes:dialogue('Alice','One')},{mes:'Plain story'},{mes:'<tr-narrative>Only narration</tr-narrative>'}])assert.equal(priorDialogueSpeaker([prior,{}],1,lookup,s=>s),null);
 assert.equal(priorDialogueSpeaker([{mes:dialogue('Bob','One')},{}],1,lookup,s=>s),b);
 const root=new Node('root');renderStoryBlocks(root,parseStory(dialogue('Alice','Two')),lookup,'Narrator',()=>{},async()=>null,b);assert.equal(find(root,'trpg-header').length,1);
});
test('narrative and dialogue render only safe bold and italic nodes',()=>{
 const {root}=draw('<tr-narrative>*soft* and **urgent** &lt;img src=x onerror=alert(1)&gt;</tr-narrative>'+dialogue('Alice','*whisper* **NOW**'));
 const prose=find(root,'trpg-prose-copy')[0],speech=find(root,'trpg-dialogue')[0];
 assert.deepEqual(prose.children.filter(n=>n.tag).map(n=>[n.tag,n.textContent]),[['em','soft'],['strong','urgent']]);
 assert.deepEqual(speech.children.filter(n=>n.tag).map(n=>[n.tag,n.textContent]),[['em','whisper'],['strong','NOW']]);
 assert.equal(find(root,'img').length,0);
});
