import test from 'node:test';
import assert from 'node:assert/strict';
import {requestCommerceTask,commerceErrorMessage} from '../src/commerce-task.js';
import {requestCommerceRepair} from '../src/commerce-repair.js';
import {requestCommerceOpening} from '../src/commerce-opening.js';
import {requestCommerceDecision} from '../src/commerce-generation.js';
const args={prompt:'task',systemPrompt:'JSON',responseLength:8192,trimNames:false};
function host(content='{"marketplace":{}}'){
 let calls=0;
 return {mainApi:'openai',chatCompletionSettings:{openai_max_tokens:4096},generateRawData:async options=>{calls++;assert.equal(options.responseLength,4096);return {choices:[{message:{content},finish_reason:'stop'}]};},extractMessageFromData:(data,api)=>{assert.equal(api,'openai');return data.choices[0].message.content;},generateRaw:async()=>{throw Error('Story Regex removed the JSON: No message generated');},generateQuietPrompt:async()=>{throw Error('Unexpected retry');},calls:()=>calls};
}
test('native data bypasses story output regexes and honors the configured response limit in one call',async()=>{
 const h=host();assert.equal(await requestCommerceTask(h,args),'{"marketplace":{}}');assert.equal(h.calls(),1);
});
test('opening, repair and confirmation use the same native data boundary',async()=>{
 const h=host();await requestCommerceRepair(h,{kind:'buy'});await requestCommerceOpening(h,{kind:'buy',story:'',npcs:[]});await requestCommerceDecision(h,{session:{kind:'buy'}},'confirm');assert.equal(h.calls(),3);
});
test('empty content is not replaced with provider reasoning and does not trigger another API',async()=>{
 const h=host('');h.generateRawData=async()=>({choices:[{message:{content:'',reasoning_content:'private reasoning'},finish_reason:'stop'}]});
 await assert.rejects(requestCommerceTask(h,args),e=>e.code==='response-empty'&&e.responseText===''&&e.details.generation==='native-data');
});
test('truncated provider output is identified before partial JSON can be accepted',async()=>{
 const h=host();h.generateRawData=async()=>({choices:[{message:{content:'{"marketplace":'},finish_reason:'length'}]});
 await assert.rejects(requestCommerceTask(h,args),e=>e.code==='response-truncated'&&e.details.finishReason==='length'&&e.responseText==='{"marketplace":');
});
for(const failure of [Error('Offline'),{error:{message:'Provider rejected max_tokens'}},'Connection failed',null])test(`provider exception ${commerceErrorMessage(failure)} preserves a readable cause without a retry`,async()=>{
 const h=host();h.generateRawData=async()=>{throw failure;};
 await assert.rejects(requestCommerceTask(h,args),e=>e.details.providerError===commerceErrorMessage(failure)&&e.details.responseLength===4096);
});
test('diagnostics redact bearer tokens and API keys',()=>{
 const result=commerceErrorMessage(Error('Bearer secret-token api_key=secret sk-abc123'));
 assert.doesNotMatch(result,/secret-token|=secret|sk-abc123/);
});
