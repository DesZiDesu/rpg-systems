import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVoiceSettings,speechText,speechDisplayText,voiceInstructions,speakerVoiceKey,splitSpeech,subscriptionQuota} from '../src/voice-core.js';
import {parseStory} from '../src/npc-core.js';
import {createElevenLabsClient} from '../src/voice-api.js';
import {createVoiceRuntime} from '../src/voice-runtime.js';
import {createVoiceStorage} from '../src/voice-storage.js';

test('Voice is opt-in, bounded and does not change a saved enabled choice',()=>{
    assert.equal(normalizeVoiceSettings({}).enableVoiceAddon,false);
    assert.equal(normalizeVoiceSettings({enableVoiceAddon:true}).enableVoiceAddon,true);
    assert.equal(normalizeVoiceSettings({voiceSpeed:99,voiceModel:'unsupported'}).voiceSpeed,1.5);
    assert.equal(normalizeVoiceSettings({voiceModel:'unsupported'}).voiceModel,'eleven_v4');
    assert.equal(voiceInstructions({}),'');assert.equal(voiceInstructions({enableVoiceAddon:true,chatPresentation:false}),'');
    assert.match(voiceInstructions({enableVoiceAddon:true}),/SAME normal story reply/);
});
test('delivery survives parsing, speech keeps emotional actions and display preserves named square brackets',()=>{
    const block=parseStory('<tr-dialogue name="Garrick" delivery="warmly, sighs">[sniff] **ยินดีต้อนรับ** [Ruin Staff] [laughs]</tr-dialogue>')[0];
    assert.equal(block.delivery,'warmly, sighs');
    assert.equal(speechDisplayText(block.text),'**ยินดีต้อนรับ** [Ruin Staff]');
    assert.equal(speechText(block),'[warmly] [sighs] [sniff] ยินดีต้อนรับ [Ruin Staff] [laughs]');
    assert.equal(speechText({delivery:'<script>,invented',text:'Hello'}),'Hello');
    assert.equal(parseStory('<tr-dialogue name="G">Plain</tr-dialogue>')[0].delivery,undefined);
});
test('long Thai dialogue is split below provider recommendation without dropping Unicode or directions',()=>{
    const source=('เวทมนตร์ 🔥 '.repeat(400))+'[whispers] จบแล้ว';
    const parts=splitSpeech(source);assert(parts.length>1);assert(parts.every(part=>Array.from(part).length<=1800));
    assert.equal(parts.join('').replace(/\s/g,''),source.replace(/\s/g,''));
    assert(parts.every(part=>!part.includes('\uFFFD')));
    assert.equal(splitSpeech('x'.repeat(1795)+'[whispers]'+'z'.repeat(20))[0],'x'.repeat(1795));
});
test('stable NPC IDs unify aliases and keep chat / card and character owners separate',()=>{
    const context={character:{avatar:'card-a.png'},getCurrentChatId:()=> 'chat-1'},npc={id:'garrick',name:'Garrick'};
    assert.equal(speakerVoiceKey(npc,'Garrick',context),speakerVoiceKey(npc,'เจ้าของโรงเตี๊ยม',context));
    assert.notEqual(speakerVoiceKey(npc,'Garrick',context),speakerVoiceKey(npc,'Garrick',{...context,getCurrentChatId:()=> 'chat-2'}));
    assert.notEqual(speakerVoiceKey(npc,'Garrick',context),speakerVoiceKey({...npc,npcScope:'character'},'Garrick',context));
    assert.notEqual(speakerVoiceKey(npc,'Garrick',context),speakerVoiceKey(npc,'Garrick',{...context,character:{avatar:'card-b.png'}}));
});
test('unknown usage is not zero; overage remaining is bounded and reset follows provider date',()=>{
    assert.equal(subscriptionQuota({}).remaining,null);
    assert.equal(subscriptionQuota({character_count:null,character_limit:null}).remaining,null);
    const q=subscriptionQuota({character_count:12000,character_limit:10000,next_character_count_reset_unix:100000});
    assert.equal(q.remaining,0);assert.equal(q.percent,0);assert.equal(q.resetAt,100000000);
    assert.equal(subscriptionQuota({character_count:20,character_limit:100}).percent,80);
});
test('API transport calls official v4 dialogue endpoint, omits credentials and only puts key in header',async()=>{
    const calls=[],notices=[],key='sk_test-private';
    const client=createElevenLabsClient({key:()=>key,notice:(...value)=>notices.push(value),fetch:async(url,options)=>{calls.push({url,options});return new Response(new Blob(['audio']),{headers:{'content-type':'audio/mpeg'}});}});
    await client.speech('[whispers] สวัสดี','voice-a','eleven_v4');
    const {url,options}=calls[0];assert.match(url,/\/v1\/text-to-dialogue\?output_format=mp3_44100_128$/);
    assert.equal(options.headers['xi-api-key'],key);assert.equal(options.credentials,'omit');
    assert.deepEqual(JSON.parse(options.body),{model_id:'eleven_v4',inputs:[{text:'[whispers] สวัสดี',voice_id:'voice-a'}]});
    assert(!options.body.includes(key));assert.equal(notices[0][0],'voiceSpeech');
});
test('My Voices pagination follows cursor, and Library add uses the public owner',async()=>{
    const calls=[];
    const client=createElevenLabsClient({key:()=> 'test',fetch:async(url,options)=>{calls.push([url,options]);const body=calls.length===1?{voices:[{voice_id:'a'}],has_more:true,next_page_token:'next'}:calls.length===2?{voices:[{voice_id:'b'}],has_more:false}:{voice_id:'c'};return Response.json(body);}});
    assert.deepEqual((await client.voices()).map(v=>v.voice_id),['a','b']);assert.match(calls[1][0],/next_page_token=next/);
    await client.addVoice({voice_id:'c',public_owner_id:'owner',name:'Voice C'});
    assert.match(calls[2][0],/\/v1\/voices\/add\/owner\/c$/);assert.deepEqual(JSON.parse(calls[2][1].body),{new_name:'Voice C'});
});
test('failed provider reads produce explicit errors and never expose the key in provider error text',async()=>{
    const client=createElevenLabsClient({key:()=> 'private-key',fetch:async()=>Response.json({detail:{message:'private-key denied'}},{status:400})});
    await assert.rejects(client.quota(),error=>error.message.includes('[key]')&&!error.message.includes('private-key'));
});
const waitFor=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.fail('Timed out');};
function fixture({quotaError=false,speech}={}){
    const settings=normalizeVoiceSettings({enableVoiceAddon:true,voiceDefaultId:'voice-a',language:'th'}),keys=new Map(),cache=new Map(),sounds=[],calls=[],notices=[];
    const storage={canRemember:()=>true,async saveKey(id,key){keys.set(id,key);return true;},async readKey(id){return keys.get(id)||'';},async forgetKey(id){keys.delete(id);},async audio(key){return cache.get(key)||null;},async saveAudio(key,blob){cache.set(key,blob);}};
    const client={async voices(){calls.push('voices');return[{voice_id:'voice-a',name:'A'}];},async quota(){calls.push('quota');if(quotaError)throw Error('quota permission');return subscriptionQuota({character_count:2,character_limit:10});},async speech(...args){calls.push(['speech',...args]);return speech?await speech(...args):new Blob(['audio']);}};
    const runtime=createVoiceRuntime({settings:()=>settings,storage,client,notify:(...args)=>notices.push(args),url:{createObjectURL:()=> 'blob:audio',revokeObjectURL(){}},audio:()=>{const sound={playbackRate:1,play(){return Promise.resolve();},pause(){},removeAttribute(){},end(){this.onended?.();}};sounds.push(sound);return sound;}});
    const entry={id:'g:1',speakerKey:'npc:garrick',name:'Garrick',text:'สวัสดีครับ'};
    return{settings,keys,cache,sounds,calls,notices,runtime,entry};
}
test('connecting reads account without creating audio; quota scope failure does not disable voices',async()=>{
    const f=fixture({quotaError:true});assert.equal(await f.runtime.connect('test'),true);
    assert.equal(f.runtime.state.connected,true);assert.match(f.runtime.state.quotaError,/permission/);
    assert.equal(f.sounds.length,0);assert(!f.calls.some(call=>Array.isArray(call)));
});
test('play / pause / resume / cached replay makes exactly one speech request',async()=>{
    const f=fixture();await f.runtime.connect('test');const playing=f.runtime.listen([f.entry]);await waitFor(()=>f.sounds.length===1);
    await f.runtime.toggle(f.entry);assert.equal(f.runtime.state.phase,'paused');await f.runtime.toggle(f.entry);assert.equal(f.runtime.state.phase,'playing');
    f.sounds[0].end();await playing;
    const replay=f.runtime.listen([f.entry]);await waitFor(()=>f.sounds.length===2);f.sounds[1].end();await replay;
    assert.equal(f.calls.filter(call=>Array.isArray(call)).length,1);assert.equal(f.cache.size,1);
});
test('play-all respects dialogue order, switches voices and only generates each spoken block',async()=>{
    const f=fixture();await f.runtime.connect('test');f.runtime.state.voices.push({voice_id:'voice-b'});f.settings.voiceBindings['npc:b']='voice-b';
    const playing=f.runtime.listen([f.entry,{...f.entry,id:'b:2',speakerKey:'npc:b',text:'ยินดีต้อนรับ'}],{queue:true});
    await waitFor(()=>f.sounds.length===1);assert.equal(f.runtime.state.queue,true);f.sounds[0].end();await waitFor(()=>f.sounds.length===2);f.sounds[1].end();await playing;
    assert.deepEqual(f.calls.filter(call=>Array.isArray(call)).map(call=>[call[1],call[2]]),[['สวัสดีครับ','voice-a'],['ยินดีต้อนรับ','voice-b']]);
});
test('cancel while provider is pending aborts the request and never plays its late audio',async()=>{
    let resolve,signal;const f=fixture({speech:async(text,voice,model,s)=>{signal=s;return new Promise(done=>resolve=done);}});
    await f.runtime.connect('test');const playing=f.runtime.listen([f.entry]);await waitFor(()=>resolve);f.runtime.stop();assert.equal(signal.aborted,true);resolve(new Blob(['late']));await playing;
    assert.equal(f.sounds.length,0);assert.equal(f.runtime.state.phase,'idle');
});
test('model and spoken text changes cannot reuse another generated clip',async()=>{
    const f=fixture();await f.runtime.connect('test');
    for(const [model,text]of [['eleven_v4','สวัสดี'],['eleven_v3','สวัสดี'],['eleven_v3','ลาก่อน']]){f.settings.voiceModel=model;const count=f.sounds.length,p=f.runtime.listen([{...f.entry,text}]);await waitFor(()=>f.sounds.length>count);f.sounds.at(-1).end();await p;}
    assert.equal(f.calls.filter(call=>Array.isArray(call)).length,3);
});
test('off disables requests and saved key restoration; re-enable can reconnect the saved key',async()=>{
    const f=fixture();await f.runtime.connect('private',{remember:true});const namespace=f.settings.voiceVaultId;
    assert.equal(f.keys.get(namespace),'private');assert(!JSON.stringify(f.settings).includes('private'));
    f.settings.enableVoiceAddon=false;await f.runtime.update();const before=f.calls.length;await f.runtime.listen([f.entry]);await f.runtime.update();assert.equal(f.calls.length,before);assert.equal(f.runtime.state.connected,false);
    // Simulate reload by constructing a fresh runtime with the same vault.
    const storage={async readKey(id){return f.keys.get(id)||'';},async saveKey(){return true;},async forgetKey(){}};
    let voices=0;const runtime=createVoiceRuntime({settings:()=>f.settings,storage,client:{async voices(){voices++;return[];},async quota(){return{};}}});
    await runtime.update();assert.equal(voices,0);f.settings.enableVoiceAddon=true;await runtime.update();assert.equal(voices,1);assert.equal(runtime.state.connected,true);
});
test('missing and removed voice assignments never dispatch a paid speech request',async()=>{
    const f=fixture();await f.runtime.connect('test');f.settings.voiceDefaultId='';await f.runtime.listen([f.entry]);f.settings.voiceDefaultId='deleted';await f.runtime.listen([f.entry]);assert.equal(f.calls.filter(call=>Array.isArray(call)).length,0);assert.equal(f.notices.length,2);
});
test('without disk storage audio still has a bounded session cache and credentials cannot be remembered',async()=>{
    const storage=createVoiceStorage({indexedDB:null,crypto:null});assert.equal(storage.canRemember(),false);assert.equal(await storage.saveKey('id','secret'),false);assert.equal(await storage.readKey('id'),'');
    const blob=new Blob(['audio']);await storage.saveAudio('["rf-voice-1","namespace","model","voice","hello"]',blob);assert.equal(await storage.audio('["rf-voice-1","namespace","model","voice","hello"]'),blob);
    await storage.clearAudio('namespace');assert.equal(await storage.audio('["rf-voice-1","namespace","model","voice","hello"]'),null);
});
test('reconnecting a session key keeps existing clips in the same RoleForge user cache',async()=>{
    const f=fixture();await f.runtime.connect('first');const play=f.runtime.listen([f.entry]);await waitFor(()=>f.sounds.length===1);f.sounds[0].end();await play;
    const cacheId=f.settings.voiceCacheId;f.runtime.disconnect();await f.runtime.connect('first');assert.equal(f.settings.voiceCacheId,cacheId);
    const replay=f.runtime.listen([f.entry]);await waitFor(()=>f.sounds.length===2);f.sounds[1].end();await replay;assert.equal(f.calls.filter(call=>Array.isArray(call)).length,1);
});
test('remembered keys reconnect after toggling off and on in the same page',async()=>{
    const f=fixture();await f.runtime.connect('remember',{remember:true});f.settings.enableVoiceAddon=false;await f.runtime.update();f.settings.enableVoiceAddon=true;await f.runtime.update();assert.equal(f.runtime.state.connected,true);assert.equal(f.runtime.key(),'remember');
});
test('a rejected replacement key does not lose the previously saved vault namespace',async()=>{
    const f=fixture();await f.runtime.connect('valid',{remember:true});const id=f.settings.voiceVaultId;
    // A new runtime retains the same persistent settings / encrypted key store.
    const runtime=createVoiceRuntime({settings:()=>f.settings,storage:{async readKey(key){return f.keys.get(key);}},client:{async voices(){throw Error('Invalid replacement key');},async quota(){return{};}}});
    assert.equal(await runtime.connect('invalid'),false);assert.equal(f.settings.voiceVaultId,id);assert.equal(f.keys.get(id),'valid');
});
test('forgetting while encrypted storage is pending cannot resurrect the key',async()=>{
    const config=normalizeVoiceSettings({enableVoiceAddon:true});let finish;const records=new Map();
    const storage={async saveKey(id,key){await new Promise(resolve=>finish=resolve);records.set(id,key);return true;},async forgetKey(id){records.delete(id);}};
    const runtime=createVoiceRuntime({settings:()=>config,storage,client:{async voices(){return[];},async quota(){return{};}}});
    const connect=runtime.connect('private',{remember:true});await waitFor(()=>finish);runtime.disconnect({forget:true});finish();assert.equal(await connect,false);assert.equal(records.size,0);assert.equal(config.voiceRememberKey,false);assert.equal(runtime.key(),'');
});
test('gesture activation reuses one media element for delayed speech and native sample URLs',async()=>{
    const f=fixture();await f.runtime.connect('test');f.runtime.activate();await Promise.resolve();
    const playing=f.runtime.listen([f.entry]);await waitFor(()=>f.runtime.state.phase==='playing');assert.equal(f.sounds.length,1);f.sounds[0].end();await playing;
    const before=f.calls.length,sample=f.runtime.preview({voice_id:'voice-a',preview_url:'https://sample.example/preview.mp3'});
    await waitFor(()=>f.runtime.state.phase==='playing');assert.equal(f.sounds.length,1);assert.equal(f.sounds[0].src,'https://sample.example/preview.mp3');assert.equal(f.calls.length,before);f.sounds[0].end();await sample;
});
