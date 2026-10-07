import test from 'node:test';
import assert from 'node:assert/strict';
import {FORGE_OPENING_USER_PROMPT,prepareForgeOpeningRequest,forgeOpeningFailure} from '../src/forge-opening.js';

// Simulates an adapter which requires a nonempty user instruction on its first
// turn. This is a compatibility test, not a call to the user's paid proxy.
const strictProxyAccepts=request=>request.messages.some(m=>m.role==='user'&&m.content?.trim())
    &&request.messages.at(-1)?.role==='user'
    &&request.messages.every(m=>typeof m.content==='string'&&m.content.trim());

test('blank-chat opening becomes valid for a strict proxy without changing model or sampling settings',()=>{
    const original=[{role:'system',content:'Private player registration and story contract'},{role:'assistant',content:''},{role:'system',content:'Output boundary'}];
    const request={type:'normal',model:'proxy-model-3.8',messages:original,chat_completion_source:'custom',temperature:.7,stream:true,reasoning_effort:'medium',json_schema:{type:'object'}};
    const before=structuredClone(request);
    assert.equal(strictProxyAccepts(request),false);
    const details=prepareForgeOpeningRequest(request);
    assert.equal(strictProxyAccepts(request),true);
    assert.deepEqual(request.messages,[original[0],original[2],{role:'user',content:FORGE_OPENING_USER_PROMPT}]);
    assert.deepEqual(original,before.messages,'shared host history must not be edited');
    assert.deepEqual({...request,messages:before.messages},before,'only outgoing messages change');
    assert.equal(details.emptyRemoved,1);assert.equal(details.lastRole,'user');
    assert.equal(JSON.stringify(details).includes('Private player'),false);
});

test('the native user injection moves after a preset suffix without duplication or lost media',()=>{
    const user={role:'user',name:'Player',content:[{type:'text',text:FORGE_OPENING_USER_PROMPT},{type:'image_url',image_url:{url:'data:image/png;base64,abc'}}]};
    const suffix={role:'system',content:'Keep the player firewall and scene rules'};
    const prefill={role:'assistant',content:'A custom assistant prefill'};
    const request={type:'normal',messages:[{role:'system',content:'World references'},user,suffix,prefill]};
    prepareForgeOpeningRequest(request);
    assert.equal(request.messages.at(-1),user);assert.ok(request.messages.includes(suffix));assert.ok(request.messages.includes(prefill));
    assert.equal(request.messages.filter(m=>m===user).length,1);
    const unchanged=request.messages;
    assert.equal(prepareForgeOpeningRequest(request).adjusted,false);
    assert.equal(request.messages,unchanged,'an already valid request retains its array');
});

test('empty text is removed while tool calls, signatures and media remain intact',()=>{
    const media={role:'user',content:[{type:'image_url',image_url:{url:'fixture'}}]},tools={role:'assistant',content:null,tool_calls:[{id:'call-1'}]},signature={role:'assistant',content:'',signature:'opaque'};
    const request={messages:[null,{role:'assistant',content:null},{role:'user',content:[{type:'text',text:' \n'}]},media,tools,signature]};
    assert.equal(prepareForgeOpeningRequest(request).emptyRemoved,3);
    for(const item of [media,tools,signature])assert.ok(request.messages.includes(item));
    assert.equal(request.messages.at(-1).content,FORGE_OPENING_USER_PROMPT);
});

test('quiet, impersonation, continuation and non-chat requests are untouched',()=>{
    for(const type of ['quiet','impersonate','continue','swipe']){
        const request={type,messages:[{role:'system',content:'Background task'}]},before=structuredClone(request);
        assert.equal(prepareForgeOpeningRequest(request),null);assert.deepEqual(request,before);
    }
    for(const request of [null,{}, {type:'normal',prompt:'Text completion prompt'}])assert.equal(prepareForgeOpeningRequest(request),null);
});

test('a bare Bad Request is reported as an unknown proxy cause, with a saved draft and bounded request metadata',()=>{
    const request={model:'proxy-model-3.8',chat_completion_source:'custom',messages:[{role:'system',content:'SECRET CHARACTER PROFILE'}]};
    const result=forgeOpeningFailure(Error('Bad Request'),{request:prepareForgeOpeningRequest(request)});
    assert.match(result.message,/HTTP 400 · proxy-model-3\.8/);assert.match(result.message,/draft is saved/);assert.match(result.message,/no detailed cause/);
    assert.equal(result.details.status,400);assert.equal(result.details.code,'FORGE_OPENING_BAD_REQUEST');
    assert.equal(JSON.stringify(result).includes('SECRET CHARACTER PROFILE'),false);
    assert.equal(result.details.request.lastRole,'user');
    assert.equal('messages' in result.details.request,true);assert.equal(typeof result.details.request.messages,'number');
    assert.match(forgeOpeningFailure(Error('Got response status 400'),{language:'th'}).message,/ข้อมูลตัวละครยังอยู่/);
});

test('available provider details, status and causes survive, with credentials redacted before display or persistence',()=>{
    const cause={status:422,error:{message:'unsupported field reasoning_effort; Authorization: Bearer secret-value'}};
    const error=new Error('Request failed', {cause});
    error.details={providerError:'{"api_key":"private-key","proxy_password":"private-password"} sk-private-token AIza123456789012345678901234'};
    const result=forgeOpeningFailure(error,{request:prepareForgeOpeningRequest({model:'sk-secret-model',messages:[]})});
    assert.equal(result.details.status,422);assert.match(result.message,/unsupported field reasoning_effort/);
    const saved=JSON.stringify(result);
    for(const secret of ['secret-value','private-key','private-password','sk-private-token','AIza123456789012345678901234','sk-secret-model'])assert.equal(saved.includes(secret),false,secret);
    assert.match(saved,/redacted/);
});

test('cyclic errors, missing details and very long provider messages remain bounded and retain a retry instruction',()=>{
    const error={message:'Unsupported request '+ 'x'.repeat(5000),statusCode:400};error.cause=error;
    const result=forgeOpeningFailure(error,{request:{model:'m'.repeat(120)}});
    assert.ok(result.message.length<=500);assert.ok(result.details.providerError.length<=700);
    assert.match(result.message,/Press BEGIN to retry/);
    assert.match(forgeOpeningFailure(null).message,/No error details returned/);
    const local=forgeOpeningFailure(Error('Enter a character name before starting the story.'));
    assert.equal('status' in local.details,false);assert.match(local.message,/Opening failed/);
});
