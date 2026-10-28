import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveBrowser} from '../src/archive-browser.js';
import {npcArchiveSearchText} from '../src/npc-workspace.js';
import {playerNpc,setNpcVisibilityProvider} from '../src/npc-visibility.js?v=0.90.0';

test('NPC Management finds series and version labels without adding them as aliases',()=>{
 const rows=[{id:'a',name:'May',aliases:['Haruka'],context:['Ruby / Sapphire / Hoenn'],versions:[{label:'Anime · Advanced Generation'}]},
 {id:'b',name:'Misty',aliases:[],context:['Kanto'],versions:[]}];
 const browser=createArchiveBrowser({searchText:npcArchiveSearchText});browser.setQuery('ruby');assert.deepEqual(browser.view(rows).items.map(v=>v.id),['a']);
 browser.setQuery('advanced generation');assert.deepEqual(browser.view(rows).items.map(v=>v.id),['a']);
 assert.deepEqual(rows[0].aliases,['Haruka']);
});
test('series search uses the redacted player view when Death Note hides an identity',()=>{
 const npc={id:'dn-light',name:'Light Yagami',aliases:['Light'],occupation:'Student',context:['Light Yagami / Anime'],versions:[{label:'Light Yagami manga'}]};
 try{setNpcVisibilityProvider(()=>({name:'???'}));const visible=playerNpc(npc);assert(!npcArchiveSearchText(visible).includes('Light'));assert(npcArchiveSearchText(visible).includes('Anime'));}
 finally{setNpcVisibilityProvider(null);}
});
