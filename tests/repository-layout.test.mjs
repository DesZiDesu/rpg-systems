import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const root=new URL('../',import.meta.url);
test('runtime imports and local styles resolve after repository organization',()=>{
 const files=['index.js','loader.js',...readdirSync(new URL('src/',root)).filter(f=>f.endsWith('.js')).map(f=>'src/'+f),...readdirSync(new URL('styles/',root)).map(f=>'styles/'+f)];
 const version=JSON.parse(readFileSync(new URL('manifest.json',root))).version;
 for(const file of files){
  const path=new URL(file,root).pathname,source=readFileSync(path,'utf8');
  for(const [,ref] of source.matchAll(/(?:from\s+|new URL\(|@import url\()["'](\.{1,2}\/[^"']+)["']/g)){
   const [relative,query]=ref.split('?');assert.ok(existsSync(resolve(dirname(path),relative)),`${file}: missing ${ref}`);
   if(query?.startsWith('v='))assert.equal(query,`v=${version}`,`${file}: stale cache version`);
  }
 }
 assert.ok(existsSync(new URL('templates/settings.html',root)));
 assert.ok(existsSync(new URL('templates/character-creation.html',root)));
 assert.ok(existsSync(new URL('docs/archive/README-v0.40.10.md',root)));
});
