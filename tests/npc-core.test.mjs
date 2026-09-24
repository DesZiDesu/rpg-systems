import test from 'node:test';
import assert from 'node:assert/strict';
import { identity, profileFields, completeDraft, importCharacters, readCharacterFile, parseStory, portraitData, cropGeometry, keyName, ROLE_ICONS, retainManualNpcEdits } from '../src/npc-core.js';

test('identity fields survive partial updates; role/color are allowlisted',()=>{
 const base={appearance:'silver hair',personality:'calm',aliases:['Lys'],identityColor:'#85aacc',roleIcon:'mage',portraitSize:96,portraitSource:'local'};
 assert.deepEqual(identity({goals:'find a book'},base),{...identity(base),goals:'find a book'});
 const invalid=identity({identityColor:'red;url(x)',roleIcon:'__proto__',portraitSize:999,portraitSource:'url'});
 assert.equal(invalid.identityColor,'#d6b458');assert.equal(invalid.roleIcon,'book');assert.equal(invalid.portraitSize,144);assert.equal(invalid.portraitSource,'');assert.equal(Object.keys(ROLE_ICONS).length,12);
});
test('profile allowlist rejects metadata, image and prototype input',()=>{
 const raw=JSON.parse('{"name":"Lysa","chatMetadata":{"secret":1},"__proto__":{"polluted":true},"portrait":"http://x","stats":{"hp":20,"secret":5}}');
 assert.deepEqual(profileFields(raw),{name:'Lysa',stats:{hp:20}});assert.equal({}.polluted,undefined);
});
test('AI fill preserves supplied facts, aliases and all existing stat values',()=>{
 const result=completeDraft({name:'Lysa',personality:'cautious',race:'Unknown',aliases:['Lys'],stats:{level:0}}, {name:'Other',personality:'reckless',race:'Elf',background:'scholar',aliases:['Other'],stats:{level:99}});
 assert.equal(result.name,'Lysa');assert.equal(result.personality,'cautious');assert.equal(result.race,'Elf');assert.equal(result.background,'scholar');assert.deepEqual(result.aliases,['Lys']);assert.equal(result.stats.level,0);
});
test('story parser preserves ordered narrative/dialogue/plain blocks',()=>{
 const result=parseStory('Intro\n<tr-narrative>Rain falls.</tr-narrative><tr-dialogue name="Lysa">Hello.</tr-dialogue>End');
 assert.deepEqual(result.map(v=>v.type),['plain','narrative','dialogue','plain']);assert.equal(result[2].name,'Lysa');assert.equal(result[2].text,'Hello.');assert.equal(parseStory('Existing untagged message'),null);
});
test('story parser handles Thai, strips tags, renders unfinished streaming block safely',()=>{
 const result=parseStory('<tr-dialogue name="ไลซา"><img src=x onerror=alert(1)>สวัสดี</tr-dialogue><tr-narrative>unfinished');
 assert.equal(result.length,2);assert.equal(result[1].text,'unfinished');assert.equal(result[0].text,'สวัสดี');assert.equal(result[0].name,'ไลซา');assert.equal(parseStory('<tr-narrative>unfinished')[0].text,'unfinished');
});
test('import direct CL character maps shared fields only',()=>{
 const [r]=importCharacters({name:'Lysa',role:'Archivist',species:'Elf',affiliation:'Library',relationshipToUser:'Friend',relationship:'Trusted for years',currentState:'Reading',appearance:'Silver hair',adultProfile:'ignored',customCss:'ignored',abilities:'Reads runes',unknown:'ignored'});
 assert.equal(r.profile.occupation,'Archivist');assert.equal(r.profile.race,'Elf');assert.equal(r.profile.faction,'Library');assert.equal(r.profile.relationship,'Friend');assert.equal(r.profile.relationshipState,'Trusted for years');assert.equal(r.profile.activity,'Reading');assert.equal(r.profile.appearance,'Silver hair');assert.equal(r.profile.abilities[0].description,'Reads runes');assert.equal(r.profile.adultProfile,undefined);assert.equal(r.profile.customCss,undefined);assert.equal(r.profile.age,undefined);
});
test('backup imports scopes deterministically and deduplicates normalized names',()=>{
 const result=importCharacters({format:'character-life-backup',libraries:{global:[{name:'Ａlice',role:'Global'}],character:[{name:'Alice',role:'Character'}],chat:[{name:'Alice',role:'Chat'},{name:'Bob'}]}});
 assert.equal(result.length,2);assert.equal(result[0].profile.occupation,'Chat');assert.equal(result[0].scope,'chat');assert.equal(keyName(' ＡLICE '),'alice');
});
test('import keeps active-form framing and embedded image without copying unrelated forms',()=>{
 const [r]=importCharacters({format:'character-life-backup',libraries:{chat:[{name:'Lysa',activeFormId:'b',forms:[{id:'a',portraitId:'old'},{id:'b',portraitId:'chosen',x:32,y:22,zoom:1.7}]}]},portraits:{chosen:'data:image/png;base64,AAAA'},portraitFiles:{chosen:{path:'portraits/0001.png'}}});
 assert.equal(r.image,'data:image/png;base64,AAAA');assert.equal(r.portraitPath,'portraits/0001.png');assert.deepEqual(r.profile.portraitView.mobile,{x:32,y:22,zoom:1.7});assert.equal(r.profile.forms,undefined);
});
test('missing images are detectable; remote URLs and SVG are never imported',()=>{
 const [r]=importCharacters({name:'No image',forms:[{id:'a',portraitId:'reference-only'}],image:'https://untrusted.example/image.svg'});
 assert.equal(r.hasImageReference,true);assert.equal(r.image,'');assert.equal(portraitData('data:image/svg+xml;base64,AAAA'),'');assert.equal(portraitData('javascript:alert(1)'), '');
});
test('import accepts supported containers and rejects config-only/oversized rosters',()=>{
 for(const value of [[{name:'A'}],{npcs:[{name:'A'}]},{npc:{name:'A'}},{character:{name:'A'}}])assert.equal(importCharacters(value)[0].profile.name,'A');
 assert.throws(()=>importCharacters({config:{}}));assert.throws(()=>importCharacters(Array.from({length:201},(_,i)=>({name:String(i)}))));
});
function zip(entries,method=0){return new Blob(entries.flatMap(([name,data])=>{const bytes=new TextEncoder().encode(name),body=typeof data==='string'?new TextEncoder().encode(data):data,h=new Uint8Array(30),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(8,method,true);v.setUint32(18,body.length,true);v.setUint32(22,body.length,true);v.setUint16(26,bytes.length,true);return[h,bytes,body];}));}
test('JSON reader handles single character',async()=>{const result=await readCharacterFile(new Blob(['{"name":"Lysa"}']));assert.equal(result.data.name,'Lysa');assert.equal(result.images.size,0);});
test('Character Life v3 ZIP reads backup and raster blobs without path traversal',async()=>{
 const backup=JSON.stringify({format:'character-life-backup',version:3,libraries:{chat:[{name:'A'}]}});
 const result=await readCharacterFile(zip([['backup.json',backup],['portraits/00001.png',new Uint8Array([1,2,3])],['portraits/../../secret.png','bad'],['portraits/a.svg','bad']]));
 assert.equal(result.data.version,3);assert.equal(result.images.size,1);assert.equal(result.images.get('portraits/00001.png').size,3);
});
test('ZIP reader rejects truncated, compressed and non-CL archives',async()=>{
 const good=zip([['backup.json',JSON.stringify({format:'character-life-backup'})]]);
 await assert.rejects(readCharacterFile(good.slice(0,good.size-2)));await assert.rejects(readCharacterFile(zip([['backup.json','{}']],8)));await assert.rejects(readCharacterFile(zip([['backup.json','{}']])));
});
test('crop geometry covers a square without exposed edges at all pan bounds',()=>{
 for(const [w,h]of [[100,200],[200,100],[100,100]])for(const zoom of [1,2,3])for(const x of [0,50,100])for(const y of [0,50,100]){const g=cropGeometry(w,h,{x,y,zoom});assert.ok(g.w>=512&&g.h>=512);assert.ok(g.x<=0&&g.y<=0);assert.ok(g.x+g.w>=512&&g.y+g.h>=512);}
});
test('saved user edits survive swipes without copying unrelated AI state between variants',()=>{
 const before={npcs:[{id:'a',name:'A',personality:'old',location:'Turn 2',stats:{hp:20,level:2}}]};
 const after={npcs:[{...before.npcs[0],personality:'edited',stats:{hp:20,level:3}},{id:'b',name:'Manual NPC'}]};
 const history={entries:[{baseState:{npcs:[{...before.npcs[0],location:'Turn 1',stats:{hp:10,level:1}}]},variants:{first:{state:{npcs:[]}}}}]};
 retainManualNpcEdits(history,before,after);
 const result=history.entries[0].baseState.npcs;assert.equal(result[0].personality,'edited');assert.equal(result[0].location,'Turn 1');assert.equal(result[0].stats.hp,10);assert.equal(result[0].stats.level,3);assert.equal(result[1].name,'Manual NPC');assert.equal(history.entries[0].variants.first.state.npcs.length,2);
});

test('NPC resolution uses IDs and aliases first, rejects ambiguous transliterations',async()=>{
 const {resolveNpc}=await import('../src/npc-core.js');const a={id:'a',name:'Kohaku',aliases:['Amber']},b={id:'b',name:'โคฮาคุ'};
 assert.equal(resolveNpc([a],{name:'โคฮาคุ'}),a);assert.equal(resolveNpc([a],{name:'Amber'}),a);
 assert.equal(resolveNpc([a,b],{id:'b',name:'Kohaku'}),b);
 assert.equal(resolveNpc([a,{id:'c',name:'Kohaku'}],{name:'โคฮาคุ'}),null);
 assert.equal(resolveNpc([a],{name:'Koharu'}),null);assert.equal(resolveNpc([a],{name:'โคฮาคุอื่น'}),null);
});

test('adjacent narrative paragraphs merge, malformed boundaries do not mix dialogue',()=>{
 const blocks=parseStory('<tr-narrative>First.</tr-narrative>\n\n<tr-narrative>Second.</tr-narrative><tr-dialogue name="Kohaku">Hello.</narrative><tr-narrative>Rain<tr-dialogue name="Ren">Yes</tr-narrative>');
 assert.deepEqual(blocks.map(b=>b.type),['narrative','dialogue','narrative','dialogue']);
 assert.equal(blocks[0].text,'First.\n\nSecond.');assert.equal(blocks[1].text,'Hello.');assert.equal(blocks[2].text,'Rain');assert.equal(blocks[3].text,'Yes');
});
