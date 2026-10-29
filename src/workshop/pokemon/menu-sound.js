// Decode once. Mixing mode uses Web Audio only, so a media fallback cannot
// take playback focus from a video. Ambient sessions are leased while audible.
export function createPokemonMenuSound({url,volume=.32,mix=true,Context=globalThis.AudioContext||globalThis.webkitAudioContext,AudioClass=globalThis.Audio,fetchAudio=globalThis.fetch,session=globalThis.navigator?.audioSession,isIOS=/iPad|iPhone|iPod/u.test(globalThis.navigator?.userAgent||'')||(/Macintosh/u.test(globalThis.navigator?.userAgent||'')&&(globalThis.navigator?.maxTouchPoints||0)>1)}={}){
 let context,gain,buffer,source,media,disposed=false,serial=0,previousSession=null,idling=false,idle=Promise.resolve();
 const level=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):.32;volume=level(volume);
 function releaseSession(){if(previousSession===null)return;try{if(session?.type==='ambient')session.type=previousSession;}catch{}previousSession=null;}
 function acquireSession(){
  if(!mix)return true;
  if(!session)return !isIOS;
  try{
   if(['play-and-record','transient-solo'].includes(session.type))return false;
   // Respect a voice/call session that took ownership during a button sample.
   if(previousSession!==null&&session.type!=='ambient'){previousSession=null;return false;}
   if(session.type!=='ambient'){const before=session.type;session.type='ambient';if(session.type!=='ambient')return !isIOS;previousSession=before;}
   return true;
  }catch{return !isIOS;}
 }
 function silence(){if(source){const old=source;source=null;old.onended=null;try{old.stop();}catch{}old.disconnect();}if(media)media.pause();}
 function settle(ticket,force=false){
  if(!force&&previousSession===null)return;
  let pending;try{pending=Promise.resolve(context?.suspend?.());}catch{pending=Promise.resolve();}
  idle=pending;idling=true;const done=()=>{if(idle===pending){idling=false;if(serial===ticket&&!source)releaseSession();}};void pending.then(done,done);
 }
 function stop(){const ticket=++serial;silence();settle(ticket,true);}
 function fallback(){
  if(disposed||mix||!volume)return;
  try{media??=new AudioClass(url);media.preload='auto';media.volume=volume;media.currentTime=0;void media.play()?.catch(()=>{});}catch{}
 }
 const ready=(async()=>{
  try{
   if(!Context)throw Error('Web Audio unavailable');
   context=new Context({latencyHint:'interactive'});gain=context.createGain();gain.gain.value=volume;gain.connect(context.destination);
   const response=await fetchAudio(url);if(!response.ok)throw Error('Menu sound unavailable');
   const decoded=await context.decodeAudioData(await response.arrayBuffer());if(disposed)return false;buffer=decoded;return true;
  }catch{if(!disposed&&!mix)try{media=new AudioClass(url);media.preload='auto';media.volume=volume;media.load();}catch{}return false;}
 })();
 function play(){
  if(disposed)return;const ticket=++serial;silence();
  if(!volume){settle(ticket,true);return;}
  if(!context||!buffer){fallback();return;}
  if(!acquireSession()){settle(ticket);return;}
  const start=()=>{if(disposed||ticket!==serial||!volume)return;try{
   const current=context.createBufferSource();source=current;current.buffer=buffer;current.connect(gain);
   current.onended=()=>{current.disconnect();if(source===current){source=null;settle(ticket);}};current.start();
  }catch{fallback();settle(ticket);}};
  const resume=()=>{if(disposed||ticket!==serial)return;try{if(context.state==='running')start();else void context.resume().then(start).catch(()=>{if(ticket===serial){fallback();settle(ticket);}});}catch{fallback();settle(ticket);}};
  if(idling)void idle.then(resume,resume);else resume();
 }
 function configure(value={}){
  const beforeVolume=volume,nextMix=typeof value.mix==='boolean'?value.mix:mix,nextVolume=value.volume===undefined?volume:level(value.volume),changed=nextMix!==mix;
  mix=nextMix;volume=nextVolume;if(gain)gain.gain.value=volume;if(media)media.volume=volume;if(changed||(!volume&&beforeVolume!==0))stop();
 }
 function destroy(){if(disposed)return;disposed=true;serial++;silence();if(media){media.removeAttribute('src');media.load();}let closed;try{closed=context?.close();}catch{}void Promise.resolve(closed).then(releaseSession,releaseSession);}
 return{ready,play,stop,configure,destroy};
}
