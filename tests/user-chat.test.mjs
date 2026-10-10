import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUserMessage,renderUserBlocks} from '../src/user-chat.js';
const parse=mes=>parseUserMessage({is_user:true,mes});
const content=blocks=>blocks?.filter(block=>block.type!=='plain');

test('player dialogue, actions and inner thoughts retain their order and plain text',()=>{
    const mes='Before. *I open the door.* “Hello.” |I should be careful.| "Anyone home?" After.';
    assert.deepEqual(content(parse(mes)),[{type:'narrative',text:'I open the door.'},{type:'dialogue',text:'Hello.'},{type:'thought',text:'I should be careful.'},{type:'dialogue',text:'Anyone home?'}]);
    assert.equal(parse(mes)[0].text,'Before. ');assert.equal(parse(mes).at(-1).text,' After.');
});
test('assistant, system and missing roles never enter the player shorthand parser',()=>{
    const mes='*Moves.* "Hello." |Secret.|';
    for(const role of [{is_user:false},{},{is_user:'true'},{is_user:true,is_system:true}])assert.equal(parseUserMessage({...role,mes}),null);
    assert.equal(parseUserMessage({is_user:true,mes:null}),null);
});
test('Thai and multiline player dialogue work without altering source data',()=>{
    const message={is_user:true,mes:'*ฉันเดินไปที่ประตู*\n“สวัสดีครับ\nขอเข้าไปได้ไหม?”\n|คงไม่มีอันตราย|'};
    const before=JSON.stringify(message);assert.equal(content(parseUserMessage(message)).length,3);assert.equal(JSON.stringify(message),before);
});
test('inline symbols inside speech stay speech rather than creating extra cards',()=>{
    assert.deepEqual(content(parse('"She says *quietly* and |privately|."')),[{type:'dialogue',text:'She says *quietly* and |privately|.'}]);
});
test('escaped, empty, incomplete markers, bold and ordinary arithmetic stay native',()=>{
    for(const mes of ['Ordinary text','**bold**','***bold italic***','*unclosed','"unclosed','|unclosed','“unclosed','"" | | * *','a*b*c','2 * 3 * 4',String.raw`\"quote\" \*action\* \|thought\|`,'x || y || z'])assert.equal(parse(mes),null,mes);
    assert.deepEqual(content(parse(String.raw`"Say \"hello\"." |An escaped \|pipe\|.|`)),[{type:'dialogue',text:'Say "hello".'},{type:'thought',text:'An escaped |pipe|.'}]);
});
test('code, links, HTML and Markdown tables retain the native message renderer',()=>{
    for(const mes of ['`|code|` "speech"','```js\nconst x="speech";\n```','~~~\n*code*\n~~~','[link](https://example.com) "speech"','[id]: https://example.com\n"speech"','![image](image.png) |thought|','<img src=x onerror=evil()> "speech"','| Name | Value |\n| --- | --- |\n| Potion | 2 |','    code\n"speech"'])assert.equal(parse(mes),null,mes);
});
test('large messages and excessive fragments are bounded and keep native formatting',()=>{
    assert.equal(parse('x'.repeat(100001)+' "speech"'),null);
    assert.equal(parse('"a" '.repeat(160)),null);
    assert.equal(parse('“x '.repeat(20000)),null);
    assert.equal(parse('<a '.repeat(25000)),null);assert.equal(parse('['.repeat(90000)),null);assert.equal(parse('\n'.repeat(90000)),null);
    assert.deepEqual(content(parse('“broken “finished”')),[{type:'dialogue',text:'finished'}]);
});

class Node {
    constructor(tag){this.tag=tag;this.dataset={};this.classList={toggle:()=>{}};this.children=[];this.properties={};this.style={setProperty:(key,value)=>this.properties[key]=value};}
    append(...children){this.children.push(...children);}
    setAttribute(key,value){this[key]=value;}
}
const doc={createElement:tag=>new Node(tag)};
const appendText=(node,text)=>{node.textContent=text;return node;};
test('player rendering uses text nodes, validated theme colors and distinct thought labels',()=>{
    const blocks=content(parse('*Walks.* "Hello." |A secret.|'));
    const root=renderUserBlocks(blocks,{document:doc,name:'<img onerror=evil()>',language:'th',accent:'#a9d98c',ink:'#d6d0c1',appendText,narrative:text=>appendText(new Node('narrative'),text)});
    assert.equal(root.children[0].children[1].textContent,'<img onerror=evil()>');
    assert.equal(root.properties['--speaker'],'var(--tretaresia-accent, #a9d98c)');assert.equal(root.properties['--prose'],'var(--tretaresia-ink, #d6d0c1)');
    assert.deepEqual(root.children.map(node=>node.tag),['header','narrative','div','aside']);
    assert.equal(root.children[3]['aria-label'],'พูดในใจ');assert.equal(root.children[3].children[1].textContent,'A secret.');
    const invalid=renderUserBlocks([],{document:doc,accent:'url(secret)',ink:'red;display:none',appendText});assert.deepEqual(invalid.properties,{});
});
