import {paintSageOrb} from './orb.js?v=0.88.7';
// Motion, response framing and actual playback activity share one small loop.
export function createSageScene({config=()=>({}),activity=()=>({}),onResult=()=>{}}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),views=new Map();let phase='ready',text='มีสิ่งใดให้ข้าวิเคราะห์?',disposed=false,raf=0,last=0,revision=0;
 const dialog=document.createElement('dialog');dialog.className='rfsg-cinema';dialog.setAttribute('aria-label','Great Sage');
 const markup=(variant='hero')=>`<section class="rfsg-stage rfsg-mode-${variant}"><div class="rfsg-orbit-stage"><canvas data-sage-canvas aria-hidden="true"></canvas><div class="rfsg-orbit-label"><i></i><span data-scene-title></span></div><div class="rfsg-orbit-coordinates" aria-hidden="true"><span>01</span><span>大賢者</span></div></div><div class="rfsg-answer" data-scene-answer><span class="rfsg-frame-corner"></span><div class="rfsg-answer-cap"><span class="rfsg-signal" aria-hidden="true"><i></i><i></i><i></i></span><span data-scene-caption>RESPONSE</span><span class="rfsg-answer-code" aria-hidden="true">◇</span></div><p data-scene-line role="status" aria-live="polite" aria-atomic="true"></p><span class="rfsg-frame-tail" aria-hidden="true"></span></div></section>`;
 dialog.innerHTML=`<header class="rfsg-cinema-head"><span>Great Sage <small>大賢者</small></span><button type="button" data-scene-close aria-label="ปิดฉากวิเคราะห์">×</button></header>${markup('full')}<footer><button type="button" data-scene-result hidden>กลับไปอ่านรายงาน ↗</button></footer>`;document.body.append(dialog);
 function moving(){return config().motion!==false&&!reduced.matches;}
 function title(speaking){return speaking?'กำลังรายงาน':({ready:'พร้อมรับคำสั่ง',waiting:'กำลังวิเคราะห์',complete:'วิเคราะห์เสร็จแล้ว',preview:'ตัวอย่างการตอบ',error:'การวิเคราะห์หยุดลง'})[phase];}
 function reveal(line,next){
  if(line.dataset.text===next)return;line.dataset.text=next;line.replaceChildren();line.setAttribute('aria-label',next);
  const words=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('th',{granularity:'word'}).segment(next)].map(x=>x.segment):next.split(/(\s+)/);
  for(let i=0;i<words.length;i++){const word=document.createElement('span');word.textContent=words[i];word.setAttribute('aria-hidden','true');word.style.setProperty('--word-delay',Math.min(i*24,1100)+'ms');line.append(word);}
  const frame=line.closest('.rfsg-answer');frame?.classList.remove('is-entering');void frame?.offsetWidth;frame?.classList.add('is-entering');
 }
 function paintText(root,a){
  if(!root)return;for(const[k,v]of Object.entries({sageTheme:config().theme||'prismatic',scenePhase:phase,speaking:String(a.speaking===true),sceneMotion:moving()?'on':'off'}))if(root.dataset[k]!==v)root.dataset[k]=v;
  const label=root.querySelector('[data-scene-title]');if(label&&label.textContent!==title(a.speaking))label.textContent=title(a.speaking);
  const line=root.querySelector('[data-scene-line]');if(line)reveal(line,text);
  const cap=root.querySelector('[data-scene-caption]'),caption=phase==='waiting'?'ANALYSIS':'RESPONSE';if(cap&&cap.textContent!==caption)cap.textContent=caption;
 }
 function tick(now){
  if(disposed)return;raf=requestAnimationFrame(tick);if(document.hidden||now-last<33)return;last=now;const a=activity()||{},active=moving();
  for(const[canvas,view]of views){if(!canvas.isConnected){views.delete(canvas);continue;}const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)continue;
   const stage=canvas.closest('.rfsg-stage');paintText(stage,a);const sig=[rect.width,rect.height,phase,config().theme,active,a.speaking,revision].join('|');
   if(active||sig!==view.signature){const target=a.speaking?(a.metered?a.level:.2+Math.sin(now/110)*.1):0;view.energy=(view.energy||0)+(target-(view.energy||0))*(target>(view.energy||0)?.38:.2);if(view.energy<.003)view.energy=0;paintSageOrb(canvas,{time:now,motion:active,activity:{...a,visualLevel:view.energy},waiting:phase==='waiting',theme:config().theme,mini:view.mini});view.signature=sig;}
  }
 }
 function attach(canvas,mini=false){if(!canvas||disposed)return;if(!views.has(canvas))views.set(canvas,{mini,signature:''});paintText(canvas.closest('.rfsg-stage'),activity()||{});if(!raf)raf=requestAnimationFrame(tick);}
 function refresh(){revision++;const a=activity()||{};for(const[canvas]of views){if(!canvas.isConnected)views.delete(canvas);else paintText(canvas.closest('.rfsg-stage'),a);}dialog.querySelector('[data-scene-result]').hidden=phase!=='complete';}
 function set(next,nextText){phase=next;text=String(nextText||'ยังไม่มีข้อมูล').slice(0,2500);refresh();}
 function close(){if(dialog.open)dialog.close();}
 reduced.addEventListener('change',refresh);dialog.addEventListener('click',e=>{if(e.target.closest('[data-scene-close]'))close();if(e.target.closest('[data-scene-result]')){close();onResult();}});
 return{markup,attach,attachOrb:canvas=>attach(canvas,true),refresh,start(){set('waiting','กำลังทบทวนข้อมูลที่คุณเลือก…');},complete(result){set('complete',result.summary);},fail(){set('error','ยังวิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้งได้');},reset(){close();set('ready','มีสิ่งใดให้ข้าวิเคราะห์?');},preview(facts){set('preview',`รับทราบ ${facts.scene?.location?.place?'สถานที่ปัจจุบันคือ '+facts.scene.location.place:'กำลังตรวจข้อมูลที่มี'}${facts.skills?.length?' ตรวจพบ '+facts.skills.slice(0,2).map(s=>s.name).join(' และ '):''}`);this.open();},open(){if(!dialog.open)dialog.showModal();attach(dialog.querySelector('canvas'));refresh();},close,destroy(){disposed=true;cancelAnimationFrame(raf);reduced.removeEventListener('change',refresh);views.clear();dialog.remove();},get phase(){return phase;},get text(){return text;}};
}
