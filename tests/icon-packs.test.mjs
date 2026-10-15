import test from 'node:test';
import assert from 'node:assert/strict';
import {availableIconPacks,FATE_SERVANT_ICON_PACK as fate} from '../src/icon-packs.js';
test('only known Fate archive/card identities receive the legacy catalog',()=>{
 for(const characterPackId of ['fate-nasuverse-v3-core','fate-nasuverse-v3-native'])assert.deepEqual(availableIconPacks({characterPackId}),[fate]);
 assert.deepEqual(availableIconPacks({archiveId:'fate-nasuverse-archive-v3-test'}),[fate]);
 for(const input of [{},{characterPackId:'madoka'},{characterPackId:'mushoku-tensei'},{archiveId:'another-world'},{name:'Fate Nasuverse',occupation:'Saber'}])assert.deepEqual(availableIconPacks(input),[]);
});
test('explicit card declarations override defaults and cannot activate arbitrary catalogs',()=>{
 assert.deepEqual(availableIconPacks({declared:[fate]}),[fate]);assert.deepEqual(availableIconPacks({declared:['other',fate,fate]}),[fate]);
 for(const declared of [[],null,false,true,fate,{},['unknown']])assert.deepEqual(availableIconPacks({declared,characterPackId:'fate-nasuverse-v3-core'}),[]);
});
test('switching cards cannot carry a previous card catalog or mutate its declaration',()=>{
 const declared=[fate],a=availableIconPacks({declared});a.length=0;assert.deepEqual(declared,[fate]);assert.deepEqual(availableIconPacks(),[]);assert.deepEqual(availableIconPacks({declared}),[fate]);
});
