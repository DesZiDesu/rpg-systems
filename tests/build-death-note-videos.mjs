import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';

const out=resolve(process.env.DN_ARTIFACTS||'/workspace/artifacts/death-note-paper-tutorial');
const report=JSON.parse(await readFile(out+'/validation.json','utf8'));
if(!report.pass||report.failure||report.videos.length!==2)throw Error('Record both tutorials successfully before encoding');
const stamp=seconds=>{const n=Math.max(0,seconds),h=Math.floor(n/3600),m=Math.floor(n/60)%60,s=(n%60).toFixed(2).padStart(5,'0');return `${h}:${String(m).padStart(2,'0')}:${s}`;};
const words=new Intl.Segmenter('th',{granularity:'word'});
function wrap(value,width){let line='',lines=[];for(const {segment}of words.segment(value)){if(line.length+segment.length>width&&line){lines.push(line.trim());line='';}line+=segment;}if(line.trim())lines.push(line.trim());return lines.join('\\N');}
const escape=value=>String(value).replace(/[{}]/gu,'').replaceAll('\n','\\N');
const results=[];
for(const recording of report.videos){
 const mobile=recording.device==='mobile',width=mobile?390:1440,height=mobile?844:1000,font=mobile?17:27,start=recording.start,end=recording.end;
 const events=recording.steps.map((step,i)=>{const next=recording.steps[i+1]?.t??end;return `Dialogue: 0,${stamp(step.t-start)},${stamp(next-start)},Default,,0,0,0,,{\\b1}${escape(wrap(step.title,mobile?35:95))}{\\b0}\\N${escape(wrap(step.text,mobile?38:100))}`;});
 const ass=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height+164}\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans Thai,${font},&H00E8E5DC,&H00E8E5DC,&H00101010,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,16,16,20,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join('\n')}\n`;
 const subtitle=out+'/'+recording.device+'.ass',file=out+'/death-note-'+recording.device+'.mp4';await writeFile(subtitle,ass);
 const args=['-y','-ss',String(start),'-i',recording.file,'-t',String(end-start),'-vf',`pad=iw:ih+164:0:0:color=0x10100f,ass=${subtitle}`,'-c:v','libx264','-threads','2','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-an',file];
 await new Promise((ok,fail)=>{const child=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe']});let errors='';child.stderr.on('data',b=>{errors=(errors+b).slice(-1600);});child.on('error',fail);child.on('exit',code=>code===0?ok():fail(Error(errors)));});
 await copyFile(out+'/'+recording.device+'-paper-free-writing.png',out+'/'+recording.device+'-poster.png');results.push({device:recording.device,file,durationSeconds:Math.round(end-start),captions:'Thai; seven-second reading pauses',realSillyTavern:true,controlledSSE:true,mobileTouchEmulation:mobile});
}
await writeFile(out+'/videos.json',JSON.stringify(results,null,2));
await writeFile(out+'/index.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Death Note · วิธีใช้</title><style>body{margin:0;background:#111110;color:#d6cfb9;font:16px/1.8 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:30px 18px}h1{font-weight:400}p{color:#aaa18b}section{margin:40px 0}video{display:block;width:100%;max-height:85vh;background:#000}a{color:#d7bb72}.mobile{max-width:430px}</style><main><h1>Death Note · เขียนและจัดหน้ากระดาษ</h1><p>บันทึกบน SillyTavern 1.19.0 จริง ธีม Dark Lite หยุดให้อ่านแต่ละขั้นประมาณ 7 วินาที คำตอบ AI ใช้ controlled SSE มือถือเป็น Chromium touch emulation</p>${results.map(r=>`<section><h2>${r.device==='mobile'?'มือถือ':'คอม'} · ${r.durationSeconds} วินาที</h2><video class="${r.device}" controls playsinline preload="metadata" poster="${r.device}-poster.png" src="death-note-${r.device}.mp4"></video><a href="death-note-${r.device}.mp4" download>ดาวน์โหลด MP4</a></section>`).join('')}</main></html>`);
console.log(JSON.stringify(results,null,2));
