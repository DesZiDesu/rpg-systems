import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve,basename} from 'node:path';
const root=resolve(process.env.PHONE_ROOT||'/workspace/artifacts/phone-release'),out=resolve(process.env.PHONE_SHOWCASE||root+'/showcase');
await mkdir(out,{recursive:true});
async function* datasets(){
 for(const device of ['desktop','mobile']){
  const folder=root+'/record-'+device,deadline=Date.now()+25*60*1000;let report;
  do{try{report=JSON.parse(await readFile(folder+'/validation.json','utf8'));}catch{}
   if(report?.pass&&report.videos?.length===1)break;
   if(process.env.PHONE_WAIT!=='1'||Date.now()>deadline)throw Error('A verified native recording is required: '+device);
   await new Promise(ok=>setTimeout(ok,1000));
  }while(true);
  if(report.errors.length)throw Error('Native errors: '+device);
  yield {folder,report,video:report.videos[0]};
 }
}
const segmenter=new Intl.Segmenter('en',{granularity:'word'});
function wrap(value,count){let line='';const lines=[];for(const {segment}of segmenter.segment(value)){if([...line+segment].length>count&&line){lines.push(line.trim());line='';}line+=segment;}if(line.trim())lines.push(line.trim());return lines.join('\\N');}
const stamp=value=>{const v=Math.max(0,value),h=Math.floor(v/3600),m=Math.floor(v/60)%60,s=(v%60).toFixed(2).padStart(5,'0');return h+':'+String(m).padStart(2,'0')+':'+s;};
const clean=value=>String(value).replace(/[{}]/gu,'').replaceAll('\n','\\N');
const videos=[];
for await(const {folder,report,video:v}of datasets()){
 const mobile=v.device==='mobile',w=v.outputWidth,h=v.outputHeight,visible=h-v.captionBand,duration=v.end-v.start,font=mobile?56:44,heading=mobile?60:51;
 if(w!== (mobile?1170:1920)||h!==(mobile?2532:1080))throw Error('Incorrect output aspect ratio');
 const stem='aster-phone-'+v.device,subtitle=out+'/'+v.device+'.ass',metadata=out+'/'+v.device+'.ffmetadata',file=out+'/'+stem+'.mp4';
 const lines=v.steps.map((s,i)=>'Dialogue: 0,'+stamp(i?s.t:0)+','+stamp(v.steps[i+1]?.t??duration)+',Caption,,0,0,0,,{\\fs'+heading+'\\b1}'+clean(wrap(String(i+1).padStart(2,'0')+' · '+s.title,mobile?33:64))+'{\\b0\\fs'+font+'}\\N'+clean(wrap(mobile?({voice:'NPC voice or fallback through Voice Addon. This video uses local synthetic test audio.',blocked:'Block messages, calls and social activity. Removing a contact keeps its NPC.'}[s.name]||s.text):s.text,mobile?39:77)));
 const ass='[Script Info]\nScriptType: v4.00+\nPlayResX: '+w+'\nPlayResY: '+h+'\nWrapStyle: 2\nScaledBorderAndShadow: yes\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,Noto Sans Thai,'+font+',&H00EDEEE6,&H00EDEEE6,&H00192520,&H00192520,0,0,0,0,100,100,0,0,1,0,0,2,'+(mobile?33:50)+','+(mobile?33:50)+','+(mobile?39:36)+',1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'+lines.join('\n')+'\n';
 await writeFile(subtitle,ass);
 await writeFile(metadata,';FFMETADATA1\n'+v.steps.map((s,i)=>'[CHAPTER]\nTIMEBASE=1/1000\nSTART='+Math.round((i?s.t:0)*1000)+'\nEND='+Math.round((v.steps[i+1]?.t??duration)*1000)+'\ntitle='+s.title.replace(/[=;#\\]/gu,' ')+'\n').join(''));
 const args=['-y','-ss',String(v.start),'-i',v.file,'-i',metadata],audioEvents=(v.audioEvents||[]).filter((e,i,rows)=>e.file&&e.seconds>=0&&e.seconds<duration&&(!i||e.text!==rows[i-1].text||e.seconds-rows[i-1].seconds>.3));
 for(const event of audioEvents)args.push('-i',event.file);
 const filter=['[0:v]scale='+w+':'+visible+':flags=lanczos,pad=iw:ih+'+v.captionBand+':0:0:color=0x203631,drawbox=x=30:y='+ (visible+10)+':w=iw-60:h=2:color=0xd8c2a0:t=fill,ass='+subtitle+'[v]'];
 for(const [i,e]of audioEvents.entries())filter.push('['+(i+2)+':a]aformat=sample_rates=44100:channel_layouts=stereo,adelay='+Math.round(e.seconds*1000)+'|'+Math.round(e.seconds*1000)+'[clip'+i+']');
 if(audioEvents.length)filter.push(audioEvents.map((_,i)=>'[clip'+i+']').join('')+'amix=inputs='+audioEvents.length+':normalize=0,apad,atrim=duration='+duration+',alimiter=limit=0.9[a]');
 args.push('-filter_complex',filter.join(';'),'-map','[v]');
 if(audioEvents.length)args.push('-map','[a]','-c:a','aac','-b:a','128k');else args.push('-an');
 args.push('-map_metadata','1','-map_chapters','1','-t',String(duration),'-r','24','-c:v','libx264','-threads','2','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',file);
 await new Promise((ok,no)=>{const proc=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe']});let error='';proc.stderr.on('data',v=>error=(error+v).slice(-3000));proc.on('error',no);proc.on('exit',code=>code===0?ok():no(Error(error)));});
 console.log('ENCODED',v.device,Math.round(duration)+'s');
 for(const step of v.steps)await copyFile(folder+'/'+v.device+'-'+step.name+'.png',out+'/'+v.device+'-'+step.name+'.png');
 for(const name of ['home','incoming-call','lumen','voice']){
  const chapter=v.steps.find(s=>s.name===name);if(!chapter)continue;
  await new Promise((ok,no)=>{const proc=spawn('ffmpeg',['-y','-ss',String(chapter.t+3),'-i',file,'-frames:v','1',out+'/'+v.device+'-video-'+name+'.png'],{stdio:'ignore'});proc.on('exit',code=>code===0?ok():no(Error('Could not make poster')));});
 }
 videos.push({device:v.device,file:basename(file),width:w,height:h,durationSeconds:duration,subtitles:{language:'en',fontSize:font,titleSize:heading},readingPauseSeconds:8,syntheticFixtureAudio:audioEvents.length>0,audioEvents:audioEvents.map(e=>({seconds:e.seconds,text:e.text})),chapters:v.steps.map((s,i)=>({name:s.name,title:s.title,text:s.text,seconds:i?Math.floor(s.t):0}))});
 await writeFile(out+'/validation-'+v.device+'.json',JSON.stringify({...report,videos:undefined},null,2));
}
await writeFile(out+'/videos.json',JSON.stringify(videos,null,2));
await writeFile(out+'/chapters.json',JSON.stringify(videos.map(v=>({device:v.device,chapters:v.chapters})),null,2));
const shots=['home','contacts','contact-editor','messages','message-menu','reply-mode','stickers','npc-sticker','incoming-call','capsule-wave','voice','profile','lumen','stories','murmur','npc-profile','gather','wallet','browser','news','arcade','deposit','photo-attachment','settings','dark-thai'];
const esc=v=>String(v).replace(/[&<>"]/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
await writeFile(out+'/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aster One · RoleForge phone preview</title><style>*{box-sizing:border-box}body{margin:0;background:#f1f1e9;color:#283e35;font:17px/1.8 system-ui,sans-serif}header{background:#203631;color:#eeeede;padding:48px max(24px,5vw)}header>small{font-size:11px;letter-spacing:4px;color:#bfc9b6}h1{font-weight:400;font-size:clamp(36px,5vw,64px);line-height:1.2;letter-spacing:-2px;margin:18px 0}header p{max-width:950px;color:#b6c2af}main{max-width:1460px;margin:auto;padding:24px}a{color:#4f7a61}header a{color:#dfc698}section{margin:35px 0 65px}h2{font-weight:500;font-size:28px}video{display:block;width:100%;aspect-ratio:16/9;background:#203631;border-radius:16px;box-shadow:0 14px 45px #193d251f}.mobile video{max-width:390px;aspect-ratio:1170/2532}.chapters{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}button{min-height:44px;padding:10px 15px;font:inherit;font-size:13px;background:#e4e8dc;border:1px solid #c8d2bd;color:#3c6750;border-radius:12px;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.grid img{display:block;width:100%;border-radius:13px}.grid a{text-decoration:none;font-size:13px}.grid span{display:block;padding:7px}.notice{border:1px solid #bac8ae;border-radius:15px;padding:20px 24px;background:#e8eade}.links{display:flex;flex-wrap:wrap;gap:22px}.mobile .grid{grid-template-columns:repeat(4,1fr)}p{color:#798775}@media(max-width:850px){.grid{grid-template-columns:repeat(2,1fr)}.mobile .grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:500px){main{padding:15px}body{font-size:16px}header{padding:30px 20px}.grid{grid-template-columns:1fr}}</style><header><small>ROLEFORGE · ASTER ONE / RELEASE PREVIEW</small><h1>Your world.<br>A little closer.</h1><p>Minimalist app icons, detailed in-world apps, background replies, calls, social profiles, a story browser and the RoleForge wallet.</p><div class="links"><a href="USAGE.md">How it works</a><a href="FEATURES.md">Feature coverage</a><a href="QA.md">Testing and boundaries</a></div></header><main><p class="notice">Recorded in SillyTavern 1.19.0. AI responses use controlled fixtures. Call audio is a local synthetic test voice routed through the existing Voice Addon; no paid external voice calls. Mobile is browser touch emulation. The phone remains in a preview branch and has not been merged into main.</p>'+videos.map(v=>'<section class="'+v.device+'"><h2>'+(v.device==='desktop'?'PC · 1920 × 1080 · 16:9':'Mobile · 1170 × 2532 · full screen')+'</h2><p>Large subtitles, at least eight seconds to read each section, and '+v.chapters.length+' selectable chapters.</p><video id="video-'+v.device+'" controls playsinline preload="metadata" poster="'+v.device+'-video-home.png" src="'+v.file+'"></video><div class="chapters">'+[['Home','home'],['Messaging','messages'],['Reply modes','reply-mode'],['Stickers','stickers'],['Incoming call','incoming-call'],['Voice','voice'],['Social apps','lumen'],['Groups','gather'],['Wallet','wallet'],['Browser','browser'],['Settings','settings']].map(([title,key])=>{const chapter=v.chapters.find(c=>c.name===key);return '<button data-video="video-'+v.device+'" data-seek="'+(chapter?.seconds||0)+'">'+title+'</button>';}).join('')+'</div><details><summary>All '+v.chapters.length+' chapters</summary><div class="chapters">'+v.chapters.map(c=>'<button data-video="video-'+v.device+'" data-seek="'+c.seconds+'">'+Math.floor(c.seconds/60)+':'+String(c.seconds%60).padStart(2,'0')+' · '+esc(c.title)+'</button>').join('')+'</div></details><p><a href="'+v.file+'" download>Download MP4</a> · <a href="chapters.json">Chapter list</a></p><div class="grid">'+shots.filter(name=>v.chapters.some(c=>c.name===name)).map(name=>'<a href="'+v.device+'-'+name+'.png"><img loading="lazy" src="'+v.device+'-'+name+'.png" alt="'+esc(name)+' '+v.device+'"><span>'+esc(v.chapters.find(c=>c.name===name).title)+'</span></a>').join('')+'</div></section>').join('')+'<a href="videos.json">Video specifications</a></main><script>document.addEventListener("click",e=>{const b=e.target.closest("[data-seek]");if(!b)return;const v=document.getElementById(b.dataset.video);v.currentTime=Number(b.dataset.seek);v.play();v.scrollIntoView({behavior:"smooth",block:"start"});});</script>');
console.log(JSON.stringify(videos.map(v=>({device:v.device,file:v.file,duration:v.durationSeconds,chapters:v.chapters.length,audio:v.audioEvents.length})),null,2));

for(const name of ['USAGE.md','FEATURES.md','QA.md','REVIEW.th.md'])await copyFile(new URL('../docs/phone-release/'+name,import.meta.url),out+'/'+name);
