import test from 'node:test';
import assert from 'node:assert/strict';
import {ADULT_TAGS,DEFAULT_ADULT_STYLE,STYLE_LIMIT,normalizeAdultSettings,parseTagCatalog,selectedLanguage,writingPreferencePrompt} from '../nsfw-enhance.js';

test('adult writing is off by default, and no selected themes reach the prompt when disabled',()=>{
 const settings=normalizeAdultSettings({chatPresentation:false,language:'th',nsfwTags:['Romance','Kissing']});
 assert.equal(settings.nsfwEnhance,false);assert.equal(writingPreferencePrompt(settings,[{is_user:true,mes:'Hello'}]),'');
 settings.chatPresentation=true;
 const normal=writingPreferencePrompt(settings,[{is_user:true,mes:'สวัสดีครับ'}]);
 assert.match(normal,/Write narrative and character dialogue in Thai/);assert.doesNotMatch(normal,/Romance|ADULT WRITING STYLE|Kissing/);
});
test('latest player message controls story language independently of the interface',()=>{
 const chat=[{is_user:true,mes:'พูดภาษาไทยนะ'},{is_user:false,mes:'Okay'},{is_user:true,mes:'Please answer in English.'}];
 assert.equal(selectedLanguage('auto',chat,'th'),'en');
 assert.equal(selectedLanguage('auto',chat.slice(0,1),'en'),'th');
 assert.equal(selectedLanguage('th',chat,'en'),'th');
 assert.match(writingPreferencePrompt({nsfwEnhance:true,roleplayLanguage:'auto',language:'th',nsfwTags:['Romance']},chat),/Write narrative and character dialogue in English/);
});
test('enabled themes remain labels, Japanese sound brackets and adult guidance are opt-in',()=>{
 const enabled=writingPreferencePrompt({nsfwEnhance:true,roleplayLanguage:'th',language:'en',nsfwTags:['Kissing','Dirty talk']});
 assert.match(enabled,/Japanese-style opening\/closing brackets 「sound」/);
 assert.match(enabled,/"Kissing","Dirty talk"/);assert.match(enabled,/adults and consent/);
 assert.equal(ADULT_TAGS.includes('Kissing'),true);
});
test('tag import deduplicates names and constrains extension settings size',()=>{
 assert.deepEqual(parseTagCatalog('["Romance",{"name":"Romance"},{"name":"Flirting"}]'),['Romance','Flirting']);
 assert.deepEqual(parseTagCatalog('Romance\nFlirting\nRomance'),['Romance','Flirting']);
 const settings=normalizeAdultSettings({nsfwTags:Array.from({length:120},(_,i)=>`tag ${i}`),nsfwCustomTags:['<b>bold</b>','  new\n name']});
 assert.equal(settings.nsfwTags.length,50);assert.deepEqual(settings.nsfwCustomTags,['bbold/b','new name']);
 assert.throws(()=>parseTagCatalog('x'.repeat(1024*1024+1)),/smaller than 1 MB/);
});
test('user can replace the default adult writing style without changing tag keys or disabling language',()=>{
 const settings=normalizeAdultSettings({nsfwEnhance:true,roleplayLanguage:'en',language:'th',nsfwTags:['Kissing'],nsfwWritingStyle:'Focus on character dialogue and fewer sound effects.'});
 const prompt=writingPreferencePrompt(settings,[{is_user:true,mes:'สวัสดี'}]);
 assert.match(prompt,/English/);assert.match(prompt,/Focus on character dialogue/);
 assert.doesNotMatch(prompt,/Japanese-style opening\/closing brackets/);
 assert.match(prompt,/"Kissing"/);assert.match(prompt,/adults and consent/);
 settings.nsfwEnhance=false;
 assert.doesNotMatch(writingPreferencePrompt(settings),/Focus on character dialogue|Kissing/);
 settings.nsfwWritingStyle=DEFAULT_ADULT_STYLE;
 assert.equal(normalizeAdultSettings(settings).nsfwWritingStyle,DEFAULT_ADULT_STYLE);
 settings.nsfwWritingStyle='x'.repeat(STYLE_LIMIT+50);
 assert.equal(normalizeAdultSettings(settings).nsfwWritingStyle.length,STYLE_LIMIT);
});
