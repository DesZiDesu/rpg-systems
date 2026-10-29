import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPokemonMenuSound} from '../src/workshop/pokemon/menu-sound.js';

function fixture({suspended=false,mix=true,isIOS=false,session}={}){
 const calls={fetch:0,decode:0,start:0,stop:0,close:0,resume:0,suspend:0},sources=[],gains=[];let finishResume;
 class Context{
  state=suspended?'suspended':'running';destination={};
  createGain(){const g={gain:{value:0},connect(){}};gains.push(g);return g;}
  async decodeAudioData(){calls.decode++;return{duration:.74};}
  createBufferSource(){const node={connect(){},disconnect(){},start(){calls.start++;},stop(){calls.stop++;}};sources.push(node);return node;}
  resume(){calls.resume++;return new Promise(resolve=>{finishResume=()=>{this.state='running';resolve();};});}
  async suspend(){calls.suspend++;this.state='suspended';}
  async close(){calls.close++;this.state='closed';}
 }
 const sound=createPokemonMenuSound({url:'sample.wav',Context,AudioClass:null,mix,isIOS,session,fetchAudio:async()=>{calls.fetch++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};}});
 return{sound,calls,sources,gains,resume:()=>finishResume()};
}
test('menu feedback reuses one sample and cancels the old ending callback when restarting',async()=>{
 const {sound,calls,sources}=fixture();assert(await sound.ready);sound.play();sound.play();
 assert.equal(calls.fetch,1);assert.equal(calls.decode,1);assert.equal(calls.start,2);assert.equal(calls.stop,1);assert.equal(sources[0].onended,null);
 sound.destroy();assert.equal(calls.stop,2);assert.equal(calls.close,1);sound.play();sound.destroy();assert.equal(calls.start,2);assert.equal(calls.close,1);
});
test('disposing during audio unlock prevents a late click sound',async()=>{
 const {sound,calls,resume}=fixture({suspended:true});await sound.ready;sound.play();assert.equal(calls.resume,1);sound.destroy();resume();await Promise.resolve();assert.equal(calls.start,0);
});
test('normal mode preloads media fallback; mixing mode never creates or plays media',async()=>{
 const calls={load:0,play:0,pause:0,clear:0};let media;
 class Media{constructor(url){media=this;this.src=url;}load(){calls.load++;}play(){calls.play++;return Promise.resolve();}pause(){calls.pause++;}removeAttribute(){calls.clear++;}}
 const mixed=createPokemonMenuSound({url:'sample.wav',Context:null,AudioClass:Media,mix:true});await mixed.ready;mixed.play();assert.deepEqual(calls,{load:0,play:0,pause:0,clear:0});mixed.destroy();
 const sound=createPokemonMenuSound({url:'sample.wav',Context:null,AudioClass:Media,mix:false});assert.equal(await sound.ready,false);assert.equal(calls.load,1);sound.play();media.currentTime=.5;sound.play();assert.equal(media.currentTime,0);assert.equal(calls.play,2);sound.destroy();sound.play();assert.equal(calls.play,2);assert.equal(calls.clear,1);
});
test('volume changes reuse the buffer, update gain and never unlock audio at zero',async()=>{
 const {sound,calls,gains}=fixture();await sound.ready;sound.configure({volume:.8});assert.equal(gains[0].gain.value,.8);sound.play();assert.equal(calls.start,1);sound.configure({volume:0});sound.play();assert.equal(calls.start,1);assert.equal(calls.resume,0);sound.configure({volume:5});assert.equal(gains[0].gain.value,1);assert.equal(calls.decode,1);sound.destroy();
});
test('supported iOS mixing leases ambient audio and restores it after the context is quiet',async()=>{
 const session={type:'auto'},{sound,sources,calls}=fixture({session,isIOS:true});await sound.ready;sound.play();assert.equal(session.type,'ambient');assert.equal(calls.start,1);sources[0].onended();await Promise.resolve();assert.equal(calls.suspend,1);assert.equal(session.type,'auto');sound.destroy();
});
test('mixing protects unsupported iOS playback without resuming the context',async()=>{
 const {sound,calls}=fixture({isIOS:true});await sound.ready;sound.play();assert.equal(calls.start,0);assert.equal(calls.resume,0);sound.destroy();
});
test('a voice session that takes ownership is not overwritten by cleanup or another mixed click',async()=>{
 const session={type:'auto'},{sound,calls}=fixture({session,isIOS:true});await sound.ready;sound.play();session.type='play-and-record';sound.play();await Promise.resolve();assert.equal(calls.start,1);sound.destroy();await Promise.resolve();assert.equal(session.type,'play-and-record');
});
test('replacement button sample has prompt audible onset and bounded duration',async()=>{
 const wav=await readFile(new URL('../src/workshop/pokemon/assets/menu-confirm-v2.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');let rate,channels,bits,pcm;
 for(let offset=12;offset+8<=wav.length;){const id=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4),start=offset+8;if(id==='fmt '){assert.equal(wav.readUInt16LE(start),1);channels=wav.readUInt16LE(start+2);rate=wav.readUInt32LE(start+4);bits=wav.readUInt16LE(start+14);}if(id==='data')pcm=wav.subarray(start,start+size);offset=start+size+(size%2);}
 assert.equal(bits,16);assert.equal(channels,1);let first=-1,peak=0;for(let n=0;n<pcm.length/2;n++){const value=Math.abs(pcm.readInt16LE(n*2))/32768;peak=Math.max(peak,value);if(first<0&&value>.006)first=n;}
 assert(peak>.05);assert(first>=0&&first/rate<.01,'Audible onset must remain under 10ms');assert(pcm.length/2/rate<.8);
});


test('mixing leaves an existing recording session untouched before the first click',async()=>{const session={type:'play-and-record'},{sound,calls}=fixture({session,isIOS:true});await sound.ready;sound.play();assert.equal(calls.start,0);assert.equal(session.type,'play-and-record');sound.destroy();await Promise.resolve();assert.equal(session.type,'play-and-record');});
