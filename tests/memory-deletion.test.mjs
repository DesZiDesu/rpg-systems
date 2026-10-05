import test from 'node:test';
import assert from 'node:assert/strict';
import {removeMemoryChat} from '../src/memory-deletion.js';
import {emptyMemoryLibrary,captureMemoryChat} from '../src/memory-summaries.js';
test('deletion removes dependent parent/correction summaries, capsules, variants and jobs while retaining other chat originals',()=>{
 const s=emptyMemoryLibrary('owner');
 s.chats=[{id:'old',messages:[{variants:[{}]}],removed:[{}]},{id:'new',messages:[{text:'Keep me'}]}];
 s.chapters=[{id:'root',chatId:'old',events:[{id:'fact'}]},{id:'child',chatId:'new',parentId:'root'},{id:'correction',chatId:'new',events:[{change:{targets:['root::fact']}}]},{id:'grandchild',chatId:'third',parentId:'child'},{id:'independent',chatId:'new'}];
 s.capsules=[{id:'linked',chatId:'new',ancestry:['old','new']},{id:'derived',chatId:'third',ancestry:['third']},{id:'keep',chatId:'unrelated',ancestry:['unrelated']}];s.drafts=[{id:'draft',chatId:'new'},{id:'keep',chatId:'unrelated'}];s.jobs={old:{},new:{},third:{},unrelated:{}};
 const r=removeMemoryChat(s,'old');assert.equal(r.counts.messages,3);assert.equal(r.counts.chapters,4);assert.deepEqual(r.next.chapters.map(c=>c.id),['independent']);assert.deepEqual(r.next.capsules.map(c=>c.id),['keep']);assert.deepEqual(r.next.chats,[s.chats[1]]);assert.deepEqual(Object.keys(r.next.jobs),['unrelated']);assert.deepEqual(r.next.drafts,[s.drafts[1]]);assert.equal(s.chats.length,2);
 assert.deepEqual(r.next.deletedChats,['old']);assert(r.next.deletedChapters.includes('child'));assert(r.next.deletedCapsules.includes('derived'));
 // A stale backup cannot reintroduce descendant summaries after the root is gone.
 const stale=structuredClone(r.next);stale.chapters.push(s.chapters[1],{id:'late-correction',chatId:'new',events:[{change:{targets:['fact']}}]});stale.capsules.push(s.capsules[1]);const clean=removeMemoryChat(stale,'old');assert.deepEqual(clean.next.chapters.map(c=>c.id),['independent']);assert.deepEqual(clean.next.capsules.map(c=>c.id),['keep']);
 const restored=structuredClone(clean.next);restored.chapters.push({id:'fresh',chatId:'new',events:[{id:'fact'}]},{id:'fresh-correction',chatId:'new',events:[{change:{targets:['fact']}}]});assert(removeMemoryChat(restored,'old').next.chapters.some(c=>c.id==='fresh-correction'));
});
test('tombstoned originals are never automatically captured on revisits',()=>{const s=emptyMemoryLibrary('owner');s.deletedChats=['old'];const before=structuredClone(s);assert.equal(captureMemoryChat(s,{chatId:'old',name:'Deleted',messages:[{mes:'Old private text',is_user:true}]}),false);assert.deepEqual(s,before);});
