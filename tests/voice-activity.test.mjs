import test from 'node:test';
import assert from 'node:assert/strict';
import {speechEnvelope,envelopeLevel,createVoiceActivity} from '../src/voice-activity.js';
test('speech activity follows recorded amplitude and stays silent outside playback',()=>{
 const samples=Float32Array.from({length:400},(_,i)=>i<100||i>=300?0:i<200?.03:.15);
 const envelope=speechEnvelope({sampleRate:1000,duration:.4,getChannelData:()=>samples});
 assert.equal(envelopeLevel(envelope,.05),0);assert(envelopeLevel(envelope,.25)>envelopeLevel(envelope,.15));
 assert.equal(envelopeLevel(envelope,-1),0);assert.equal(envelopeLevel(envelope,.45),0);
});
test('voice activity leaves playback alone when no browser decoder is available',async()=>{
 const meter=createVoiceActivity();meter.activate();await meter.prepare(new Blob(['fixture']),()=>true);
 assert.deepEqual(meter.sample({paused:true,currentTime:1},true),{speaking:false,level:0,metered:false,time:1});
 assert.equal(meter.sample({paused:false,currentTime:1},true).speaking,true);meter.clear();meter.destroy();
});
