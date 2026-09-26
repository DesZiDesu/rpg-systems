import test from 'node:test';
import assert from 'node:assert/strict';
import {MEDALLION_ROLES} from '../src/npc-medallions.js';
import {CLASSIC_ROLE_ICONS, identity, profileFields, completeDraft, generatedNpcDraft} from '../src/npc-core.js';
import {roleIcon} from '../src/npc-chat.js';
globalThis.document={createElement:tag=>({tag,setAttribute(){}})};

test('all original NPC role keys retain the exact classic artwork through partial edits and AI generation',()=>{
 const original={book:'book-open',compass:'compass',mage:'wand-magic-sparkles',warrior:'shield-halved',healer:'hand-holding-heart',merchant:'coins',noble:'crown',artisan:'hammer',scholar:'graduation-cap',guard:'shield',ranger:'bullseye',performer:'music'};
 assert.deepEqual(CLASSIC_ROLE_ICONS,original);
 for(const [key,fa] of Object.entries(original)){
  const base={name:'Lysa',roleIcon:key};
  assert.equal(identity({},base).roleIcon,key);
  assert.equal(roleIcon(key).className,`fa-solid fa-${fa}`);
  assert.equal(completeDraft(base,{roleIcon:'medallion:nun'}).roleIcon,key);
  assert.equal(generatedNpcDraft({name:'Lysa',occupation:'Healer',roleIcon:'medallion:nun'},base).roleIcon,key);
 }
});
test('54 role artworks support both styles and survive serialization without dropping selection',()=>{
 assert.equal(Object.keys(MEDALLION_ROLES).length,54);
 for(const key of ['politician','knight','prisoner','slave','master','clergyman','nun'])assert.ok(MEDALLION_ROLES[key]);
 for(const key of Object.keys(MEDALLION_ROLES))for(const style of ['medallion','emblem']){
  const saved=JSON.parse(JSON.stringify(profileFields({roleIcon:style+':'+key})));
  assert.equal(identity(saved).roleIcon,style+':'+key);
  assert.match(roleIcon(saved.roleIcon).innerHTML,/<svg /);
  assert.doesNotMatch(roleIcon(saved.roleIcon).innerHTML,/<script|onload=|href=/);
 }
 assert.equal(identity({roleIcon:'medallion:__proto__'}).roleIcon,'book');
 assert.equal(roleIcon('medallion:<script>').className,'fa-solid fa-book-open');
});
