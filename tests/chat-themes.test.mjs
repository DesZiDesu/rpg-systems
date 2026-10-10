import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_THEMES,chatAppearance,normalizeChatAppearance,validateChatAppearance} from '../src/chat-themes.js';
import {exportWorldPreset,importWorldPreset,readChatPreset,CHAT_PRESET_KEY} from '../src/world-presets.js';
import {readCharacterPack,writeCharacterPack,CHARACTER_PACK_FIELD} from '../src/character-archive.js';
test('six named themes validate and old settings retain all three parts',()=>{
 assert.equal(CHAT_THEMES.length,6);assert.equal(new Set(CHAT_THEMES.map(t=>t.key)).size,6);
 assert.deepEqual(chatAppearance({}),{theme:'roleforge',header:true,dialogue:true,narrative:true,effects:true});
 assert.equal(chatAppearance({chatEffects:false}).effects,false);
 for(const t of CHAT_THEMES)assert.equal(validateChatAppearance({theme:t.key}).theme,t.key);
 assert.equal(normalizeChatAppearance({theme:'<script>',header:null}).theme,'roleforge');
 for(const bad of [null,[],{}, {theme:'<script>'},{theme:'future',header:'false'},{dialogue:0}]){
  if(bad&&Object.keys(bad).length===0&&!Array.isArray(bad))continue;
  assert.throws(()=>validateChatAppearance(bad));
 }
});
test('all independent flags round-trip through chat and library presets without script fields',()=>{
 for(const theme of CHAT_THEMES)for(let flags=0;flags<8;flags++){
  const view={theme:theme.key,header:Boolean(flags&1),dialogue:Boolean(flags&2),narrative:Boolean(flags&4),effects:false};
  const file=exportWorldPreset({chatAppearance:{...view,css:'url(secret)',script:'evil()',apiKey:'SECRET'}},theme.name);
  assert.doesNotMatch(file,/SECRET|evil|secret/);
  assert.deepEqual(importWorldPreset(file).config.chatAppearance,view);
  assert.deepEqual(readChatPreset({[CHAT_PRESET_KEY]:{version:1,config:{chatAppearance:view}}}).chatAppearance,view);
 }
 const corrupt=readChatPreset({[CHAT_PRESET_KEY]:{version:1,config:{chatAppearance:{theme:'invalid'},systems:{autoTrack:false}}}});assert.deepEqual(corrupt,{systems:{autoTrack:false}});
});
test('a one-card pack carries appearance independently and invalid themes cannot affect other components',async()=>{
 const appearance={theme:'arcane',header:false,dialogue:true,narrative:false,effects:false};
 const card={avatar:'academy.png',data:{extensions:{[CHARACTER_PACK_FIELD]:{format:'roleforge-character-pack',version:1,chatAppearance:appearance,systems:{autoTrack:false}}}}};
 const context={characters:[card],fetch:async()=>({ok:true,status:200}),getRequestHeaders:()=>({}),saveSettingsDebounced(){}};
 assert.deepEqual(readCharacterPack(context,'card:academy.png').chatAppearance,appearance);
 await writeCharacterPack(context,{},'card:academy.png',{format:'roleforge-character-pack',version:1,chatAppearance:appearance});
 assert.deepEqual(card.data.extensions[CHARACTER_PACK_FIELD].chatAppearance,appearance);
 await assert.rejects(async()=>writeCharacterPack(context,{},'card:academy.png',{format:'roleforge-character-pack',version:1,chatAppearance:{theme:'invalid'}}),/Invalid character pack chatAppearance/);
 assert.deepEqual(card.data.extensions[CHARACTER_PACK_FIELD].chatAppearance,appearance);
 card.data.extensions[CHARACTER_PACK_FIELD]={format:'roleforge-character-pack',version:1,chatAppearance:{theme:'invalid'},systems:{autoTrack:false}};
 assert.equal(readCharacterPack(context,'card:academy.png').chatAppearance,undefined);assert.equal(readCharacterPack(context,'card:academy.png').systems.autoTrack,false);
});
