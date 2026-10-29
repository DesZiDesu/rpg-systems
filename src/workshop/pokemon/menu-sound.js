// Decode once before interaction; each press starts a fresh in-memory sample.
// Retain preloaded media playback for browsers without usable Web Audio.
export function createPokemonMenuSound({url,volume=.32,Context=globalThis.AudioContext||globalThis.webkitAudioContext,AudioClass=globalThis.Audio,fetchAudio=globalThis.fetch}={}){
 let context,gain,buffer,source,media,disposed=false,serial=0;
 function fallback(){
  if(disposed)return;
  try{media??=new AudioClass(url);media.preload='auto';media.volume=volume;media.currentTime=0;void media.play()?.catch(()=>{});}catch{}
 }
 const ready=(async()=>{
  try{
   if(!Context)throw Error('Web Audio unavailable');
   context=new Context({latencyHint:'interactive'});gain=context.createGain();gain.gain.value=volume;gain.connect(context.destination);
   const response=await fetchAudio(url);if(!response.ok)throw Error('Menu sound unavailable');
   const decoded=await context.decodeAudioData(await response.arrayBuffer());
   if(disposed)return false;buffer=decoded;return true;
  }catch{if(!disposed)try{media=new AudioClass(url);media.preload='auto';media.volume=volume;media.load();}catch{}return false;}
 })();
 function stop(){serial++;if(source){try{source.stop();}catch{}source.disconnect();source=null;}if(media)media.pause();}
 function play(){
  if(disposed)return;stop();const ticket=serial;
  if(!context||!buffer){fallback();return;}
  const start=()=>{if(disposed||ticket!==serial)return;try{source=context.createBufferSource();const current=source;current.buffer=buffer;current.connect(gain);current.onended=()=>{current.disconnect();if(source===current)source=null;};current.start();}catch{fallback();}};
  try{if(context.state==='running')start();else void context.resume().then(start).catch(()=>{if(ticket===serial)fallback();});}catch{fallback();}
 }
 function destroy(){if(disposed)return;disposed=true;stop();if(media){media.removeAttribute('src');media.load();}try{void context?.close()?.catch(()=>{});}catch{}}
 return{ready,play,destroy};
}
