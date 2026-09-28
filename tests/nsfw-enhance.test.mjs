import test from 'node:test';
import assert from 'node:assert/strict';
import {ADULT_TAGS,DEFAULT_ADULT_STYLE,STYLE_LIMIT,normalizeAdultSettings,parseTagCatalog,selectedLanguage,selectAdultWriting,writingPreferencePrompt} from '../src/nsfw-enhance.js';

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
 const enabled=writingPreferencePrompt({nsfwEnhance:true,nsfwPromptMode:'always',roleplayLanguage:'th',language:'en',nsfwTags:['Kissing','Dirty talk']});
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
 const settings=normalizeAdultSettings({nsfwEnhance:true,nsfwPromptMode:'always',roleplayLanguage:'en',language:'th',nsfwTags:['Kissing'],nsfwWritingStyle:'Focus on character dialogue and fewer sound effects.'});
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
test('Auto omits the long style in ordinary chat and selects only scene-relevant headed sections',()=>{
 const settings=normalizeAdultSettings({nsfwEnhance:true,roleplayLanguage:'en',nsfwTags:['Romance','Kissing','Dirty talk'],nsfwWritingStyle:'### Rhythm\nPace the scene.\n### Romance\nStay tender.\n### Voice\nMatch dialogue.\n### Intense\nStronger detail.'});
 assert.equal(settings.nsfwPromptMode,'auto');
 const ordinary=[{is_user:true,mes:'Let us visit the market.'}];
 const idle=writingPreferencePrompt(settings,ordinary);
 assert.doesNotMatch(idle,/OPTIONAL ADULT|Pace the scene|Romance|Kissing|Dirty talk/);
 const romantic=[...ordinary,{is_user:false,mes:'We walk home.'},{is_user:true,mes:'I kiss you.'}];
 const selected=selectAdultWriting(settings,romantic);
 assert.deepEqual(selected.sections.map(s=>s.kind),['core','romance']);
 const prompt=writingPreferencePrompt(settings,romantic);
 assert.match(prompt,/Pace the scene/);assert.match(prompt,/Stay tender/);
 assert.doesNotMatch(prompt,/Match dialogue|Stronger detail|Dirty talk/);
 assert.match(prompt,/"Kissing"/);
 assert.equal(selectAdultWriting(settings,[...romantic,{is_user:false,mes:'We talk quietly.'},{is_user:true,mes:'More.'}]).active,true);
 assert.equal(selectAdultWriting(settings,Array.from({length:4},()=>({is_user:true,mes:'Back to the market.'}))).active,false);
});
test('Auto can select stronger sections for matching scenes, and Always keeps the complete legacy prompt',()=>{
 const settings=normalizeAdultSettings({nsfwEnhance:true,nsfwWritingStyle:'### Rhythm\nPace.\n### Voice\nMatch speech.\n### Intense\nStronger scene.'});
 const scene=[{is_user:true,mes:'Begin an adult, intense scene; she whispers.'}];
 assert.deepEqual(selectAdultWriting(settings,scene).sections.map(s=>s.kind),['core','voice','intense']);
 settings.nsfwPromptMode='always';
 assert.match(writingPreferencePrompt(settings,[{is_user:true,mes:'Hello'}]),/Stronger scene/);
 settings.nsfwPromptMode='auto';settings.nsfwWritingStyle='A single unsectioned custom prompt.';
 assert.doesNotMatch(writingPreferencePrompt(settings,[{is_user:true,mes:'Hello'}]),/unsectioned/);
 assert.match(writingPreferencePrompt(settings,scene),/A single unsectioned custom prompt/);
});
test('Auto respects explicit section labels, ignores hidden state patches and does not treat tag preferences as scene triggers',()=>{
 const settings=normalizeAdultSettings({nsfwEnhance:true,nsfwTags:['Romance'],nsfwWritingStyle:'## [section:core] Baseline\nBase.\n## [section:intense] Details\nOnly for matching scenes.'});
 assert.equal(selectAdultWriting(settings,[{is_user:true,mes:'Hello.'},{mes:'<!-- state patch: erotic scene --> We discuss the weather.'}]).active,false);
 const romantic=selectAdultWriting(settings,[{is_user:true,mes:'We kiss.'}]);
 assert.deepEqual(romantic.sections.map(s=>s.kind),['core']);
 assert.doesNotMatch(writingPreferencePrompt(settings,[{is_user:true,mes:'We kiss.'}]),/Only for matching scenes/);
 assert.deepEqual(selectAdultWriting(settings,[{is_user:true,mes:'An intense romantic scene.'}]).sections.map(s=>s.kind),['core','intense']);
});
