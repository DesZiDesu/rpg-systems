import test from 'node:test';
import assert from 'node:assert/strict';
import {apiRequestNotice,showApiRequestNotice} from '../src/api-request-notice.js';

test('extension-started story calls and separate jobs are described accurately without exposing request data',()=>{
 assert.match(apiRequestNotice('memorySummary','Memory summary 2 / relations','th'),/สรุปความจำ · 2: กำลังเรียก API เพิ่ม/);
 assert.match(apiRequestNotice('manualSync','RPG Manual Sync 2/4'),/2\/4.*additional API/);
 assert.doesNotMatch(apiRequestNotice('opening','Character Forge first scene','th'),/เพิ่ม/);
 assert.doesNotMatch(apiRequestNotice('npcDraft','<img src=x onerror=alert(1)>'),/<img/);
});

test('a failing native toast does not block the API operation',()=>{
 const original=console.warn;const warnings=[];
 try {console.warn=(...args)=>warnings.push(args);assert.doesNotThrow(()=>showApiRequestNotice('commerce','auction · bid','th',{info(){throw Error('toast plugin unavailable');}}));assert.equal(warnings.length,1);}
 finally{console.warn=original;}
});
