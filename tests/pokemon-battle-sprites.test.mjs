import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {battleSpriteCandidates} from '../src/workshop/pokemon/battle-sprites.js';
const catalog=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/catalog.json',import.meta.url)));
const index=JSON.parse(await readFile(new URL('../src/workshop/pokemon/data/battle-sprites.json',import.meta.url)));
const form=key=>catalog.forms.find(p=>p.key===key);
const choices=(key,m={},options={})=>battleSpriteCandidates(form(key),m,index,options);
test('every bundled base species has genuine front and back static fallbacks',()=>{
 assert.equal(index.coverage.species.total,1025);
 for(let id=1;id<=1025;id++){
  const p=catalog.forms.find(f=>f.pokemonId===id&&f.default);
  for(const side of ['front','back']){
   const list=battleSpriteCandidates(p,{},index,{side,motion:false});assert(list.length,p.key+' '+side);
   assert(list.every(v=>v.url.endsWith('.png')&&!v.animated));
   assert.equal(list[0].url.includes('/pokemon/back/'),side==='back');
  }
 }
});
test('pixel GIFs are paired and use the correct camera direction',()=>{
 const front=choices('pikachu')[0],back=choices('pikachu',{}, {side:'back'})[0];
 assert.equal(front.format,'pixel');assert(front.animated);assert.match(front.url,/animated\/25.gif$/);
 assert.equal(front.url.replace('/animated/','/animated/back/'),back.url);
});
test('models extend animation coverage while missing GIFs use the correct static direction',()=>{
 assert.match(choices('chespin',{}, {side:'back'})[0].url,/other\/showdown\/back\/650.gif$/);
 assert.match(choices('pecharunt',{}, {side:'back'})[0].url,/scarlet-violet\/back\/1025.webp$/);
 const still=choices('pikachu-libre',{}, {side:'back'})[0];assert.equal(still.format,'static');assert(!still.animated);assert.match(still.url,/pokemon\/back\/10084.png$/);
});
test('Shiny and female images preserve their variant through all fallbacks',()=>{
 const list=choices('pikachu',{shiny:true,traits:{gender:'female'}},{side:'back'});
 assert.match(list[0].url,/animated\/back\/shiny\/female\/25.gif$/);
 assert(list.every(v=>v.url.includes('/shiny/')));
 const paused=choices('pikachu',{shiny:true,traits:{gender:'female'}},{side:'back',motion:false});
 assert.match(paused[0].url,/back\/shiny\/female\/25.png$/);assert(paused.every(v=>!v.animated));
 const artificial={commit:index.commit,entries:{pikachu:['25',1,'25',1,'25',1,1]}};
 assert.deepEqual(battleSpriteCandidates(form('pikachu'),{shiny:true},artificial),[],'Never recolor a Shiny as its ordinary sprite');
});
test('cosmetic forms keep exact identity; unsupported forms never inherit a species image',()=>{
 assert.match(choices('unown-b',{}, {side:'back'})[0].url,/back\/201-b.gif$/);
 for(const color of ['red','yellow','orange','blue','white']){
  const stem=color==='red'?'669':'669-'+color;
  assert(choices('flabebe-'+color,{}, {side:'back'})[0].url.endsWith('/back/'+stem+'.gif'));
 }
 assert.match(choices('koraidon-gliding-build',{}, {side:'back'})[0].url,/scarlet-violet\/back\/10267.webp$/);
 assert.match(choices('zygarde-mega',{}, {side:'back',motion:false})[0].url,/assets\/battle\/sprites\/back\/10301.png$/);
 assert.deepEqual(battleSpriteCandidates({key:'original-unreleased-legendary'},{},index),[]);
});
test('visually identical internal forms share only documented species art',()=>{
 for(const key of ['mothim-sandy','mothim-trash','scatterbug-polar','spewpa-poke-ball'])assert(choices(key,{}, {side:'back'}).length,key);
 assert.equal(Object.keys(index.sharedVisualForms).length,40);
 assert.notEqual(choices('vivillon-polar')[0].url,choices('vivillon-monsoon')[0].url);
 assert.notEqual(choices('wormadam-sandy')[0].url,choices('wormadam-trash')[0].url);
});
test('coverage counts are explicit and every GIF row has both camera views declared',()=>{
 assert.equal(Object.keys(index.entries).length,1579);
 assert.equal(index.coverage.species.animatedPairs,1025);assert.equal(index.coverage.forms.animatedPairs,1570);
 assert.equal(index.coverage.forms.staticPairs,1579);assert.equal(index.missingBackForms.length,0);
 for(const p of catalog.forms){
  for(const side of ['front','back'])assert(battleSpriteCandidates(p,{},index,{side,motion:false}).length,p.key+' '+side+' static');
  const a=battleSpriteCandidates(p,{},index),b=battleSpriteCandidates(p,{},index,{side:'back'});
  for(const image of a.filter(v=>v.animated))assert(b.some(v=>v.animated&&v.format===image.format&&v.variant===image.variant),p.key);
 }
 assert.deepEqual(battleSpriteCandidates(form('pikachu'),{},index,{side:'sideways'}),[]);
});

test('bundled stills are present, static PNGs and match their recorded checksums',async()=>{
 assert.equal(Object.keys(index.localStillSources).length,36);
 for(const [path,source]of Object.entries(index.localStillSources)){
  const file=await readFile(new URL('../src/workshop/pokemon/assets/battle/sprites/'+path,import.meta.url));
  assert.equal(file.subarray(1,4).toString(),'PNG');assert(!file.includes(Buffer.from('acTL')));
  assert.equal(createHash('sha256').update(file).digest('hex'),source.sha256,path);
  assert.match(source.source,/^versions\/generation-ix\//);
 }
});
