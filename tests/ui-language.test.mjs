import test from 'node:test';
import assert from 'node:assert/strict';
import {uiText,uiMarkup} from '../src/ui-language.js';
import {UI_STRINGS} from '../src/ui-strings.js';
import {writingPreferencePrompt} from '../src/nsfw-enhance.js';

test('built-in interface messages resolve both ways and preserve interpolated content',()=>{
 assert.equal(uiText('ชื่อพลัง',[],'en'),'Power name');
 assert.equal(uiText('Power name',[],'th'),'ชื่อพลัง');
 assert.equal(uiText('{0} value',['Name พลังผู้ใช้'],'en'),'Name พลังผู้ใช้ value');
 assert.equal(uiText('{0} value',['Name พลังผู้ใช้'],'th'),'ค่าพลัง Name พลังผู้ใช้');
 assert.equal(uiText('constructor',[],'en'),'constructor');
 assert.equal(uiText('Unknown user-defined string',[],'th'),'Unknown user-defined string');
 assert.equal(uiMarkup('<span>ชื่อพลัง</span>'),'<span>Power name</span>');
});

test('catalog translations retain their interpolation slots',()=>{
 const slots=s=>[...s.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
 for(const [key,[en,th]] of Object.entries(UI_STRINGS)){
  assert.equal(typeof en,'string',key);assert.equal(typeof th,'string',key);
  assert.deepEqual(slots(en),slots(th),key);
 }
});

test('UI language never selects story or generated-content language',()=>{
 for(const roleplayLanguage of ['auto','en','th'])for(const chat of [[],[{is_user:true,mes:'เล่าเรื่องต่อเป็นภาษาไทย'}],[{is_user:true,mes:'Continue in English'}]]){
  const settings={nsfwEnhance:false,chatPresentation:true,roleplayLanguage};
  assert.equal(writingPreferencePrompt({...settings,language:'en'},chat),writingPreferencePrompt({...settings,language:'th'},chat));
 }
});
