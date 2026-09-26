import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLore,parseLoreFile,mergeLore,LORE_FILE_LIMIT} from '../src/lore-transfer.js';
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
 assert.throws(()=>mergeLore(many,[{...record,title:'new'}]),/200/);assert.equal(JSON.stringify(many),before);
 const settings={};writeCharacterLore(settings,[record],'a','a');const snapshot=JSON.stringify(settings);
 const imported=Array.from({length:6},(_,i)=>({...record,title:String(i),content:'a'.repeat(12000),enabled:true}));
 assert.throws(()=>writeCharacterLore(settings,mergeLore([record],imported).entries,'a','a'),/เกิน/);assert.equal(JSON.stringify(settings),snapshot);
});
