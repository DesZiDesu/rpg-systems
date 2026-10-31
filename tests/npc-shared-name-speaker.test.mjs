import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedNameSpeaker } from '../src/npc-chat.js';

const game={id:'g',name:'Cynthia',aliases:['シロナ'],hasPortrait:true,portraitSource:'embedded'};
const anime={id:'a',name:'Cynthia',hasPortrait:false,portraitSource:'none'};

test('shared names prefer the met record', () => {
  assert.equal(sharedNameSpeaker([game,{...anime,met:true}],'Cynthia').id,'a');
});
test('shared names otherwise prefer a record with a portrait', () => {
  assert.equal(sharedNameSpeaker([anime,game],'cynthia').id,'g');
  assert.equal(sharedNameSpeaker([anime,game],'シロナ').id,'g');
});
test('unknown names stay unresolved', () => {
  assert.equal(sharedNameSpeaker([anime,game],'Brock'),null);
  assert.equal(sharedNameSpeaker([anime,game],''),null);
});
