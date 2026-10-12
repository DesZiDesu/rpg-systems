import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLore,exportLoreFiles,parseLoreFile,mergeLore,LORE_FILE_LIMIT} from '../src/lore-transfer.js';
import {writeCharacterLore,characterLore} from '../src/lore-core.js';
const record={id:'original',title:'เมืองจันทร์',content:'ข้อมูลโลก\nบรรทัดสอง ❤',enabled:false,keywords:['จันทร์','Moon'],always:true};
test('export/import preserves Unicode, newlines, keywords and flags across JSON storage',()=>{
 const imported=parseLoreFile(exportLore([record]));const merged=mergeLore([],imported);const settings={};
 writeCharacterLore(settings,merged.entries,'b','b');
 const [{id,...actual}]=characterLore(JSON.parse(JSON.stringify(settings)),'b');const {id:old,...expected}=record;
 assert.deepEqual(actual,expected);assert.notEqual(id,old);assert.equal(merged.added,1);
 assert.deepEqual(parseLoreFile(exportLore([])),[]);
});
test('merge preserves originals, ignores foreign IDs and skips only exact duplicates',()=>{
 const source=[record],before=JSON.stringify(source);
 const imported=parseLoreFile(JSON.stringify([record,{...record,content:'Different'},{...record,enabled:true}]));
 const merged=mergeLore(source,imported);assert.equal(merged.added,2);assert.equal(merged.skipped,1);
 assert.deepEqual(merged.entries[0],record);assert.equal(new Set(merged.entries.map(e=>e.id)).size,3);
 assert.equal(JSON.stringify(source),before);assert.equal(mergeLore(merged.entries,imported).added,0);
});
test('malformed, unsupported and oversized files reject instead of truncating',()=>{
 for(const source of ['{','null',JSON.stringify({format:'tretaresia-lore',version:2,entries:[]}),JSON.stringify([{...record,content:'x'.repeat(12001)}]),JSON.stringify([{...record,enabled:'yes'}]),JSON.stringify([{...record,keywords:['x'.repeat(121)]}]),' '.repeat(LORE_FILE_LIMIT+1)])assert.throws(()=>parseLoreFile(source));
 assert.equal(parseLoreFile('\uFEFF'+exportLore([record])).length,1);
});
test('capacity and active-budget failures never overwrite existing Lore',()=>{
 const many=Array.from({length:200},(_,i)=>({...record,id:String(i),title:String(i)}));const before=JSON.stringify(many);
 assert.throws(()=>mergeLore(many,[{...record,title:'new'}],{entryLimit:200}),/200/);assert.equal(JSON.stringify(many),before);
 const settings={};writeCharacterLore(settings,[record],'a','a');const snapshot=JSON.stringify(settings);
 const imported=Array.from({length:6},(_,i)=>({...record,title:String(i),content:'a'.repeat(12000),enabled:true}));
 assert.throws(()=>writeCharacterLore(settings,mergeLore([record],imported).entries,'a','a'),/เกิน/);assert.equal(JSON.stringify(settings),snapshot);
});

test('5,000 entries import and export intact, including the last records beyond the old ceiling',()=>{
 const many=Array.from({length:5000},(_,i)=>({...record,id:String(i),title:`Lore ${i}`}));
 const imported=parseLoreFile(exportLore(many)),merged=mergeLore([],imported);
 assert.equal(merged.added,5000);assert.equal(merged.entries.at(-1).title,'Lore 4999');assert.equal(new Set(merged.entries.map(item=>item.id)).size,5000);
 assert.equal(mergeLore(merged.entries,imported,{entryLimit:200}).skipped,5000);
 const before=JSON.stringify(merged.entries);assert.throws(()=>mergeLore(merged.entries,[{...record,title:'New'}],{entryLimit:200}),/200/);assert.equal(JSON.stringify(merged.entries),before);
});

test('large Unicode archives export in independently importable byte-bounded parts with no loss',()=>{
 const many=Array.from({length:400},(_,i)=>({...record,id:String(i),title:`ข้อมูล ${i}`,content:'ก'.repeat(12000)}));
 const parts=exportLoreFiles(many);assert.equal(parts.length,2);
 let restored=[];for(const part of parts){assert.ok(new TextEncoder().encode(part).length<=LORE_FILE_LIMIT);restored=mergeLore(restored,parseLoreFile(part)).entries;}
 assert.equal(restored.length,400);assert.deepEqual(restored.map(({id,...item})=>item),many.map(({id,...item})=>item));
 assert.deepEqual(parseLoreFile(exportLoreFiles([])[0]),[]);
 assert.throws(()=>exportLoreFiles([record],1));assert.throws(()=>exportLoreFiles([record],100));
});
