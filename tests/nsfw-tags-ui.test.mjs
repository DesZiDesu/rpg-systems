import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAdultTagControls} from '../nsfw-tags-ui.js';
import {ADULT_TAGS,ADULT_TAG_THAI} from '../nsfw-enhance.js';

class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.value='';this.files=[];this.textContent='';this.checked=false;}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
 addEventListener(type,callback){this.listeners[type]=callback}
 setAttribute(){}
 querySelector(key){return this.controls?.get(key)||null}
}
globalThis.document={createElement:tag=>new Element(tag)};
const selectors=['search','list','count','status','create','name','file'];
const setup=()=>{const root=new Element();root.controls=new Map(selectors.map(key=>[`[data-adult-${key}]`,new Element()]));return{root,get:key=>root.querySelector(`[data-adult-${key}]`)}};

test('drawer search, custom toggles and catalog import save only selected/custom tags',async()=>{
 const {root,get}=setup(),settings={nsfwTags:[],nsfwCustomTags:[]};let saves=0,refreshes=0,stored=[];
 const storage={async getItem(){return stored},async setItem(_,entries){stored=entries}};
 await mountAdultTagControls(root,{settings,storage,save(){saves++},refresh(){refreshes++}});
 const search=get('search'),list=get('list');search.value='Romance';search.listeners.input();
 const romance=list.children.find(row=>row.children[0]?.children[1]?.textContent==='Romance');
 assert.ok(romance);
 const check=romance.children[0].children[0];check.checked=true;check.listeners.change();
 assert.deepEqual(settings.nsfwTags,['Romance']);assert.equal(saves,1);
 const name=get('name');name.value='Custom Thai / แนวไทย';get('create').listeners.submit({preventDefault(){}});
 assert.deepEqual(settings.nsfwCustomTags,['Custom Thai / แนวไทย']);assert.deepEqual(settings.nsfwTags,['Romance']);
 const file=get('file');file.files=[{size:17,async text(){return 'New tag\nRomance'}}];await file.listeners.change();
 assert.deepEqual(stored,['New tag','Romance']);assert.deepEqual(settings.nsfwTags,['Romance']);assert.equal(saves,2);assert.equal(refreshes,2);
 search.value='New tag';search.listeners.input();assert.equal(list.children.length,1);
});

test('every built-in tag has a Thai explanation; changing UI language preserves the selected key',async()=>{
 assert.deepEqual(Object.keys(ADULT_TAG_THAI).sort(),[...ADULT_TAGS].sort());
 const {root,get}=setup(),settings={language:'th',nsfwTags:[],nsfwCustomTags:[]};let saves=0;
 const controls=await mountAdultTagControls(root,{settings,save(){saves++},refresh(){},storage:{async getItem(){return[]}}});
 const search=get('search'),list=get('list');search.value='การจูบ';search.listeners.input();
 assert.equal(list.children.length,1);
 const row=list.children[0],caption=row.children[0].children[1];
 assert.equal(caption.textContent,'การจูบ');assert.equal(caption.children[0].textContent,'Kissing');
 const check=row.children[0].children[0];check.checked=true;check.listeners.change();
 assert.deepEqual(settings.nsfwTags,['Kissing']);assert.equal(saves,1);
 settings.language='en';controls.refresh();
 assert.equal(list.children[0].children[0].children[1].textContent,'Kissing');
 assert.deepEqual(settings.nsfwTags,['Kissing']);assert.equal(saves,1);
});
