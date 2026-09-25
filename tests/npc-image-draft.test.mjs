import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../src/npc-core.js';
import * as vision from '../src/npc-generation.js';

// Execute the actual orchestration with a deliberately contradictory biography
// response. Image decoding/UI rendering are stubbed; request and merge logic are real.
const source=readFileSync(new URL('../src/npc-workspace.js',import.meta.url),'utf8');
const assist=source.slice(source.indexOf("    async function assist(mode='missing')"),source.indexOf('    async function previewImport('));
function setup({image=true,enabled=true,available=true,retry=false}={}) {
 const observed='Short black hair, brown eyes and a green cloak.';
 const fields=new Map(),checkbox={checked:enabled},calls=[];
 const draft={name:'Original',appearance:'Old draft appearance'};
 let attempts=0,result;
 const context={mainApi:'openai',chat:[],
  async generateQuietPrompt(options){calls.push(options);return available?observed:'IMAGE_UNAVAILABLE';},
  async generateRaw(options){calls.push(options);if(retry&&attempts++===0)return '{';return JSON.stringify({name:'Lysa',appearance:'Long red hair, blue eyes and golden armor.',background:'A healer'});},
 };
 const env={...core,...vision,Blob,btoa,Uint8Array,console,busy:false,referenceBlob:null,photoBlob:image?new Blob(['image'],{type:'image/webp'}):null,
  form:{querySelector:()=>checkbox,elements:{namedItem:key=>{if(!fields.has(key))fields.set(key,{value:draft[key]||''});return fields.get(key);}}},
  brief:'A healer',draftId:'',changed:new Set(),token:1,base:{},dirty:false,
  values:()=>({...draft}),lock(){},say(message){env.status=message;},confirm:()=>true,valid:()=>true,
  preparePortrait:async blob=>blob,buildForm(value){result=value;},editor:{async set(){}},async preview(){},
  api:{context:()=>context,supportsPortraitVision:()=>true,recordRequest(){},parseJson:JSON.parse,visible:x=>x,lorePrompt:()=>''},
 };
 vm.createContext(env);vm.runInContext(assist+'\nglobalThis.run=assist;',env);
 return {env,calls,observed,result:()=>result};
}
test('image appearance wins over contradictory generated details and stale draft',async()=>{
 const h=setup();await h.env.run('description');
 assert.equal(h.calls.length,2);assert.match(h.calls[0].quietImage,/^data:image\/webp;base64,/);
 assert.equal(h.result().appearance,h.observed);assert.equal(h.result().background,'A healer');
 assert.equal(h.calls[1].quietImage,undefined);assert.doesNotMatch(h.calls[1].prompt,/data:image/);
});
test('JSON retry keeps the reference appearance authoritative',async()=>{
 const h=setup({retry:true});await h.env.run('description');
 assert.equal(h.calls.length,3);assert.equal(h.result().appearance,h.observed);
 assert.match(h.calls[2].prompt,/Short black hair/);
});
test('unreadable image stops before biography generation or draft replacement',async()=>{
 const h=setup({available:false});await h.env.run('description');
 assert.equal(h.calls.length,1);assert.equal(h.result(),undefined);assert.match(h.env.status,/AI อ่านภาพไม่ได้/);
});
test('explicit image opt-out and no-image drafts still generate from text',async()=>{
 for(const options of [{enabled:false},{image:false,enabled:false}]){
  const h=setup(options);await h.env.run('description');assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].quietImage,undefined);assert.equal(h.result().appearance,'Long red hair, blue eyes and golden armor.');
 }
});
