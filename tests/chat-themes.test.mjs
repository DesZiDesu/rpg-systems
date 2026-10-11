import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_THEMES,chatAppearance,normalizeChatAppearance,validateChatAppearance} from '../src/chat-themes.js';
import {exportWorldPreset,importWorldPreset,readChatPreset,CHAT_PRESET_KEY} from '../src/world-presets.js';
import {readCharacterPack,writeCharacterPack,CHARACTER_PACK_FIELD} from '../src/character-archive.js';
test('Original and Folio have independent frames and no color-mode setting',()=>{
 assert.deepEqual(CHAT_THEMES.map(t=>t.key),['roleforge','folio']);
 assert.deepEqual(chatAppearance({}),{theme:'roleforge',header:true,dialogue:true,narrative:true,effects:true,badgeMode:'occupation',badgeAbility:''});
 assert.equal(chatAppearance({chatEffects:false}).effects,false);
 assert.deepEqual(chatAppearance({chatColorMode:'light'}),chatAppearance({}));
 assert.equal(normalizeChatAppearance({theme:'<script>',header:null}).theme,'roleforge');
 for(const bad of [null,[],{}, {theme:'<script>'},{theme:'future',header:'false'},{dialogue:0}]){
  if(bad&&Object.keys(bad).length===0&&!Array.isArray(bad))continue;
  assert.throws(()=>validateChatAppearance(bad));
 }
});
test('retired themes in old chat/card presets migrate without losing frame choices',()=>{
 for(const theme of ['roleforge','anime','dark','arcane','jade','future']){
  const saved={theme,header:false,dialogue:true,narrative:false,effects:false};
  for(const colorMode of ['light','dark','system','invalid',null])assert.deepEqual(validateChatAppearance({...saved,colorMode}),normalizeChatAppearance({...saved,theme:'roleforge'}));
  assert.deepEqual(readChatPreset({[CHAT_PRESET_KEY]:{version:1,config:{chatAppearance:{...saved,colorMode:'dark'}}}}).chatAppearance,normalizeChatAppearance({...saved,theme:'roleforge'}));
 }
});
test('all independent flags round-trip through chat and library presets without script fields',()=>{
 for(let flags=0;flags<8;flags++){
  const view={theme:'roleforge',header:Boolean(flags&1),dialogue:Boolean(flags&2),narrative:Boolean(flags&4),effects:false};
  const file=exportWorldPreset({chatAppearance:{...view,colorMode:'light',css:'url(secret)',script:'evil()',apiKey:'SECRET'}},'Original');
  assert.doesNotMatch(file,/SECRET|evil|secret|colorMode/);
  assert.deepEqual(importWorldPreset(file).config.chatAppearance,normalizeChatAppearance(view));
  assert.deepEqual(readChatPreset({[CHAT_PRESET_KEY]:{version:1,config:{chatAppearance:view}}}).chatAppearance,normalizeChatAppearance(view));
 }
 const corrupt=readChatPreset({[CHAT_PRESET_KEY]:{version:1,config:{chatAppearance:{theme:'invalid'},systems:{autoTrack:false}}}});assert.deepEqual(corrupt,{systems:{autoTrack:false}});
});
test('a one-card pack carries appearance independently and invalid themes cannot affect other components',async()=>{
 const appearance={theme:'roleforge',header:false,dialogue:true,narrative:false,effects:false};
 const card={avatar:'academy.png',data:{extensions:{[CHARACTER_PACK_FIELD]:{format:'roleforge-character-pack',version:1,chatAppearance:appearance,systems:{autoTrack:false}}}}};
 const context={characters:[card],fetch:async()=>({ok:true,status:200}),getRequestHeaders:()=>({}),saveSettingsDebounced(){}};
 assert.deepEqual(readCharacterPack(context,'card:academy.png').chatAppearance,normalizeChatAppearance(appearance));
 await writeCharacterPack(context,{},'card:academy.png',{format:'roleforge-character-pack',version:1,chatAppearance:appearance});
 assert.deepEqual(card.data.extensions[CHARACTER_PACK_FIELD].chatAppearance,normalizeChatAppearance(appearance));
 await assert.rejects(async()=>writeCharacterPack(context,{},'card:academy.png',{format:'roleforge-character-pack',version:1,chatAppearance:{theme:'invalid'}}),/Invalid character pack chatAppearance/);
 assert.deepEqual(card.data.extensions[CHARACTER_PACK_FIELD].chatAppearance,normalizeChatAppearance(appearance));
 card.data.extensions[CHARACTER_PACK_FIELD]={format:'roleforge-character-pack',version:1,chatAppearance:{theme:'invalid'},systems:{autoTrack:false}};
 assert.equal(readCharacterPack(context,'card:academy.png').chatAppearance,undefined);assert.equal(readCharacterPack(context,'card:academy.png').systems.autoTrack,false);
});
test('Folio and its real-data badge source round-trip in presets and one-card packs',async()=>{
 const view={theme:'folio',header:true,dialogue:false,narrative:true,effects:true,badgeMode:'ability',badgeAbility:'Water Magic'};
 assert.equal(CHAT_THEMES[0].name,'RoleForge Original');assert.equal(CHAT_THEMES[1].name,'The Mage’s Folio');
 assert.deepEqual(chatAppearance({chatTheme:'folio',showChatDialogue:false,chatHeaderBadgeMode:'ability',chatHeaderBadgeAbility:'Water Magic'}),view);
 assert.deepEqual(importWorldPreset(exportWorldPreset({chatAppearance:view},'Folio')).config.chatAppearance,view);
 const card={avatar:'folio.png',data:{extensions:{}}},context={characters:[card],fetch:async()=>({ok:true}),getRequestHeaders:()=>({})};
 await writeCharacterPack(context,{},'card:folio.png',{format:'roleforge-character-pack',version:1,chatAppearance:view});
 assert.deepEqual(readCharacterPack(context,'card:folio.png').chatAppearance,view);
 for(const bad of [{badgeMode:'magic'},{badgeAbility:42},{badgeAbility:'x'.repeat(121)}])assert.throws(()=>validateChatAppearance({...view,...bad}));
});
