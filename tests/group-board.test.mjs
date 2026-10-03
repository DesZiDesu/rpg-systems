import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGroupBoard, confirmedGroupBoard, groupBoardEntry } from '../src/group-board.js';

const raw = { title:'กระดานสมาคมนักผจญภัย', location:'Guild Hall', evidence:'You walk into the Guild Hall and read the recruitment board.', entries:[
  {kind:'guild',name:'Dawnspire',description:'A patrol guild protecting the eastern roads.',leader:'Kohaku',memberCount:6,maxMembers:10,rank:'Silver',requirements:['Silver license','Available on patrol days'],tags:['patrol','escort']},
  {kind:'party',name:'Moonlit Cartographers',leader:'Ashe',memberCount:3,maxMembers:4,openSpots:1,requirements:['Know the old forest'],tags:['mapping']},
]};

test('normalizes board entries, computes stable IDs and open slots',()=>{
 const board=normalizeGroupBoard(raw); assert.equal(board.entries.length,2); assert.equal(board.entries[0].openSpots,4); assert.equal(board.entries[1].openSpots,1); assert.equal(board.entries[0].id,normalizeGroupBoard(raw).entries[0].id); assert.equal(board.pageSize,3);
});

test('limits duplicate names, invalid records and twelve entries',()=>{
 const board=normalizeGroupBoard({...raw,entries:[...raw.entries,{kind:'guild',name:'Dawnspire'},...Array.from({length:20},(_,i)=>({kind:'party',name:`Party ${i}`})),{kind:'party',name:''}]}); assert.equal(board.entries.length,12); assert.equal(board.entries.filter(e=>e.name==='Dawnspire').length,1);
});

test('requires physical current-scene board evidence',()=>{
 assert.ok(confirmedGroupBoard(raw,raw.evidence,'I read it','Guild Hall'));
 for(const evidence of ['Tomorrow you will read the Guild Hall board.','You have not reached the recruitment board.','OOC: show me the board']) assert.equal(confirmedGroupBoard({...raw,evidence},evidence,evidence,'Guild Hall'),null,evidence);
 assert.equal(confirmedGroupBoard(raw,raw.evidence,'Continue','Market Square'),null);
});

test('finds an entry by stable board id',()=>{ const board=normalizeGroupBoard(raw); assert.equal(groupBoardEntry(board,board.entries[1].id).name,'Moonlit Cartographers'); assert.equal(groupBoardEntry(board,'missing'),null); });
