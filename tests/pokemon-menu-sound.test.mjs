import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPokemonMenuSound} from '../src/workshop/pokemon/menu-sound.js';

function fixture({suspended=false}={}){
 const calls={fetch:0,decode:0,start:0,stop:0,close:0,resume:0},sources=[];let finishResume;
 class Context{
  state=suspended?'suspended':'running';destination={};
  createGain(){return{gain:{value:0},connect(){}};}
  async decodeAudioData(){calls.decode++;return{duration:.74};}
  createBufferSource(){const node={connect(){},disconnect(){},start(){calls.start++;},stop(){calls.stop++;}};sources.push(node);return node;}
  resume(){calls.resume++;return new Promise(resolve=>{finishResume=()=>{this.state='running';resolve();};});}
  async close(){calls.close++;}
 }
 const sound=createPokemonMenuSound({url:'sample.wav',Context,AudioClass:null,fetchAudio:async()=>{calls.fetch++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};}});
 return{sound,calls,sources,resume:()=>finishResume()};
}
test('menu feedback reuses one decoded sample and restarts without overlapping voices',async()=>{
 const {sound,calls,sources}=fixture();assert(await sound.ready);sound.play();sound.play();
 assert.equal(calls.fetch,1);assert.equal(calls.decode,1);assert.equal(calls.start,2);assert.equal(calls.stop,1);
 sources[0].onended();sound.destroy();assert.equal(calls.stop,2);assert.equal(calls.close,1);
 sound.play();sound.destroy();assert.equal(calls.start,2);assert.equal(calls.close,1);
});
test('disposing during audio unlock prevents a late click sound',async()=>{
 const {sound,calls,resume}=fixture({suspended:true});await sound.ready;sound.play();assert.equal(calls.resume,1);sound.destroy();resume();await Promise.resolve();assert.equal(calls.start,0);
});
test('browsers without Web Audio preload and reuse media playback',async()=>{
 const calls={load:0,play:0,pause:0,clear:0};let media;
 class Media{constructor(url){media=this;this.src=url;}load(){calls.load++;}play(){calls.play++;return Promise.resolve();}pause(){calls.pause++;}removeAttribute(){calls.clear++;}}
 const sound=createPokemonMenuSound({url:'sample.wav',Context:null,AudioClass:Media});assert.equal(await sound.ready,false);assert.equal(calls.load,1);sound.play();media.currentTime=.5;sound.play();assert.equal(media.currentTime,0);assert.equal(calls.play,2);sound.destroy();sound.play();assert.equal(calls.play,2);assert.equal(calls.clear,1);
});
test('replacement button sample has prompt audible onset and bounded duration',async()=>{
 const wav=await readFile(new URL('../src/workshop/pokemon/assets/menu-confirm-v2.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');let rate,channels,bits,pcm;
 for(let offset=12;offset+8<=wav.length;){const id=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4),start=offset+8;if(id==='fmt '){assert.equal(wav.readUInt16LE(start),1);channels=wav.readUInt16LE(start+2);rate=wav.readUInt32LE(start+4);bits=wav.readUInt16LE(start+14);}if(id==='data')pcm=wav.subarray(start,start+size);offset=start+size+(size%2);}
 assert.equal(bits,16);assert.equal(channels,1);let first=-1,peak=0;for(let n=0;n<pcm.length/2;n++){const value=Math.abs(pcm.readInt16LE(n*2))/32768;peak=Math.max(peak,value);if(first<0&&value>.006)first=n;}
 assert(peak>.05);assert(first>=0&&first/rate<.01,'Audible onset must remain under 10ms');assert(pcm.length/2/rate<.8);
});
