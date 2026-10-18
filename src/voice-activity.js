// Local amplitude envelope only. The decoder never routes audio or sends data.
export function speechEnvelope(buffer,step=.025){
    const sampleRate=buffer.sampleRate,channel=buffer.getChannelData(0),stride=Math.max(1,Math.round(sampleRate*step)),bins=new Float32Array(Math.ceil(channel.length/stride));
    for(let i=0;i<bins.length;i++){
        let sum=0,count=0;for(let j=i*stride;j<Math.min(channel.length,(i+1)*stride);j+=3){sum+=channel[j]*channel[j];count++;}
        const rms=Math.sqrt(sum/Math.max(1,count));bins[i]=Math.min(1,Math.pow(Math.max(0,rms-.004)*8,.72));
    }
    return{bins,step,duration:buffer.duration};
}
export function envelopeLevel(envelope,time){
    if(!envelope||!Number.isFinite(time)||time<0||time>=envelope.duration)return 0;
    return envelope.bins[Math.min(envelope.bins.length-1,Math.floor(time/envelope.step))]||0;
}
export function createVoiceActivity(){
    let decoder,envelope=null,serial=0,enabled=false;
    function activate(){enabled=true;}
    async function prepare(blob,valid){
        envelope=null;const id=++serial;if(!enabled)return;
        const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;
        try{
            decoder||=new Context();const buffer=await decoder.decodeAudioData(await blob.arrayBuffer());
            if(id===serial&&valid())envelope=speechEnvelope(buffer);
        }catch{/* Browsers without decoding still get a speaking-state pulse. */}
    }
    return{activate,prepare,clear(){serial++;envelope=null;},sample(player,playing){return{speaking:Boolean(playing&&player&&!player.paused),level:playing?envelopeLevel(envelope,player?.currentTime):0,metered:Boolean(envelope),time:player?.currentTime||0};},destroy(){serial++;envelope=null;void decoder?.close().catch(()=>{});}};
}
