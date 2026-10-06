import test from 'node:test';
import assert from 'node:assert/strict';
import {skillCategory,skillBrowserView,skillPageSize} from '../src/skill-browser.js';

test('smart categories use structured kinds and declared types before incidental prose',() => {
    assert.equal(skillCategory({type:'Magic',description:'A sword used as a focus'}),'magic');
    assert.equal(skillCategory({type:'Magic',ability:{kind:'passive'}}),'passive');
    assert.equal(skillCategory({type:'Physical',description:'A movement using mana'}),'combat');
    assert.equal(skillCategory({type:'Healing',ability:{kind:'magic'}}),'support');
    assert.equal(skillCategory({name:'Storage',type:'Unique Skill',description:'A pocket dimension for items'}),'utility');
    assert.equal(skillCategory({name:'Alchemy'}),'craft');
    assert.equal(skillCategory({name:'Mystery',description:'Its properties are unknown'}),'general');
    assert.equal(skillCategory(), 'general');
});

test('Thai details classify without a paid API or writing back to source skills',() => {
    const entries=[{name:'ลูกไฟ',type:'เวทมนตร์'},{name:'ฟื้นฟูพลัง'},{name:'พรสวรรค์',type:'ทักษะติดตัว'},{name:'ปรุงยา'},{name:'มิติคลังเก็บของ'},{name:'เพลงดาบ'}];
    const original=structuredClone(entries);
    assert.deepEqual(entries.map(skillCategory),['magic','support','passive','craft','utility','combat']);
    const view=skillBrowserView(entries,{category:'support',width:390,page:99});
    assert.equal(view.total,1);assert.equal(view.page,0);assert.equal(view.items[0],entries[1]);
    assert.deepEqual(entries,original);
});

test('pagination covers every skill once: one on mobile, three on desktop',() => {
    const entries=Array.from({length:7},(_,id) => ({id,name:`Unknown ${id}`}));
    for (const width of [320,390,900,901,1280]) {
        const size=width<=900?1:3,first=skillBrowserView(entries,{width});
        assert.equal(skillPageSize(width),size);assert.equal(first.pages,Math.ceil(7/size));
        const pages=Array.from({length:first.pages},(_,page) => skillBrowserView(entries,{width,page}).items);
        assert.deepEqual(pages.flat(),entries);assert.ok(pages.every(items => items.length<=size));
    }
});

test('deletion, absent filters, empty lists and invalid page numbers stay on a valid page',() => {
    const entries=[{name:'Storage'},{name:'Fire',ability:{kind:'magic'}}];
    const deleted=skillBrowserView(entries.slice(0,1),{page:5,width:390,category:'magic'});
    assert.equal(deleted.category,'all');assert.equal(deleted.page,0);assert.equal(deleted.items.length,1);
    for (const page of [-1,NaN,Infinity,'invalid']) {
        const result=skillBrowserView([],{page,width:390,category:'missing'});
        assert.equal(result.page,0);assert.equal(result.pages,1);assert.deepEqual(result.items,[]);
    }
});
