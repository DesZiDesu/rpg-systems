import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

// Recordings include setup and server saves. Keep complete effect intervals,
// captured from the page clock, without speeding up the battle animations.
export function encodePokemonShowcase(video,target){
 const clips=video.clips;
 if(!clips?.length||clips.some(([a,b])=>!Number.isFinite(a)||!Number.isFinite(b)||b<=a))throw Error('Invalid showcase capture intervals');
 const stages=['[0:v]split='+clips.length+clips.map((_,i)=>'[s'+i+']').join('')];
 for(const [i,[start,end]]of clips.entries())stages.push('[s'+i+']trim=start='+start.toFixed(3)+':end='+end.toFixed(3)+',setpts=PTS-STARTPTS[c'+i+']');
 stages.push(clips.map((_,i)=>'[c'+i+']').join('')+'concat=n='+clips.length+':v=1:a=0[out]');
 mkdirSync(dirname(target),{recursive:true});
 const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',video.path,'-filter_complex',stages.join(';'),'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',target],{encoding:'utf8'});
 if(result.error||result.status!==0)throw Error(result.error?.message||result.stderr||'Showcase encoding failed');
 return target;
}
