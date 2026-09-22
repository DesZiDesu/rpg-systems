import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sceneSnapshot,renderSceneTracker} from '../scene-tracker.js';

class Node {
    constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.textContent='';}
    append(...items){this.children.push(...items);}
    setAttribute(name,value){this.attributes[name]=value;}
    get childElementCount(){return this.children.length;}
}
test('each reply records a compact independent scene without inventing unknown facts',()=>{
    const state={worldClock:{day:8,dayName:'Monday',time:'18:40',phase:'Evening'},location:{place:'Academy',region:'Heartlands',continent:'Central Continent'},scene:{weather:'Rain',temperature:19,position:'Gate'}};
    const first=sceneSnapshot(state,{participants:['Kohaku','Kohaku'],lighting:'Lamps'},['Ignored']);
    state.location.place='Library';state.scene.weather='Snow';
    const second=sceneSnapshot(state,{},['Librarian']);
    assert.equal(first.location,'Academy');assert.equal(first.weather,'Rain');assert.deepEqual(first.participants,['Kohaku']);
    assert.equal(second.location,'Library');assert.equal(second.weather,'Snow');assert.equal(second.lighting,'');
    assert.deepEqual(second.participants,['Librarian']);
    assert.equal(sceneSnapshot({...state,onboarding:{locationSeeded:false}}).location,'');
    assert.equal(sceneSnapshot(state,{objective:'x'.repeat(1000),participants:['<img src=x onerror=alert(1)>']}).objective.length,180);
});
test('mobile ledger uses configured Tretaresia theme and safe text nodes',()=>{
    globalThis.document={createElement:tag=>new Node(tag)};
    const scene=sceneSnapshot({worldClock:{day:2,time:'09:00'},location:{place:'Moon Hall'},scene:{temperature:null}},
        {participants:['<script>alert(1)</script>']});
    const card=renderSceneTracker(scene,'th');
    const collect=node=>[node.textContent,...node.children.flatMap(collect)].join(' ');
    assert.equal(card.attributes['aria-label'],'ข้อมูลฉาก');
    assert.match(collect(card),/Moon Hall/);assert.match(collect(card),/—/);
    assert.ok(card.children[1].children.some(node=>node.tag==='details'));
    assert.equal(card.children.some(node=>node.tag==='script'),false);
    const css=readFileSync(new URL('../npc-ui.css',import.meta.url),'utf8');
    assert.match(css,/\.trpg-scene-ledger\{[^}]*--sc:var\(--tretaresia-accent/);
    assert.match(css,/@media\(max-width:480px\)\{\.trpg-scene-ledger\{grid-template-columns:42px minmax\(0,1fr\)/);
});
