// Isolated review components. The installed RoleForge runtime does not import this file.
export const SAMPLES = [
 {id:'detective',kind:'npc',race:'Human',name:'L',role:{th:'ผู้สืบสวนคดีคิระ',en:'Kira case investigator'},
  narrative:{th:'แอลเลื่อนภาพถ่ายมาตรงหน้าคุณ ปลายนิ้วหยุดอยู่ที่ชื่อใต้ภาพ ขณะที่เสียงฝนยังดังอยู่หลังหน้าต่าง',en:'L slides a photograph toward you. His finger rests on the name beneath it as rain taps against the window.'},
  dialogue:{th:'ลองมองอีกครั้งครับ สิ่งที่หายไปจากภาพนี้ อาจบอกอะไรเราได้มากกว่าสิ่งที่เห็น',en:'Look again. What is missing from this photograph may tell us more than what we can see.'},
  thought:{th:'เขามองชื่อก่อนใบหน้า... หรือฉันกำลังคิดมากเกินไป',en:'They looked at the name before the face... Or am I reading too much into it?'}},
 {id:'player',kind:'user',race:'Human',name:'Akira',role:{th:'',en:''},
  narrative:{th:'ฉันมองภาพถ่ายอยู่ครู่หนึ่ง แล้วค่อย ๆ วางปากกาลงข้างแฟ้มโดยไม่แตะต้องสมุดในกระเป๋า',en:'I study the photograph, then set my pen beside the file without touching the notebook in my bag.'},
  dialogue:{th:'ถ้าเรารู้เพียงชื่อ แต่ยังไม่รู้ว่าเขาเป็นใครจริง ๆ เราอาจกำลังมองคนผิดอยู่ก็ได้',en:'If all we know is a name, we may still be looking at the wrong person.'},
  thought:{th:'อย่ารีบร้อน แค่ตอบเท่าที่ฉันควรรู้ก็พอ',en:'Take your time. Only answer with what you should know.'}},
 {id:'shinigami',kind:'npc',race:'Shinigami',name:'Ryuk',role:{th:'ยมทูต',en:'Shinigami'},
  narrative:{th:'ริวคยืนอยู่ในเงาด้านหลังเก้าอี้ เขามองจากภาพถ่ายไปยังคุณ ก่อนยิ้มออกมาอย่างเงียบ ๆ',en:'Ryuk waits in the shadow behind your chair. He looks from the photograph to you, a quiet grin crossing his face.'},
  dialogue:{th:'ข้าแค่ดูอยู่ตรงนี้ การตัดสินใจว่าจะเขียนอะไรลงไป... นั่นเป็นเรื่องของเจ้า',en:'I am only here to watch. What you decide to write... that is up to you.'},
  thought:{th:'มนุษย์นี่น่าสนใจจริง ๆ โดยเฉพาะตอนที่คิดว่าตัวเองยังมีเวลา',en:'Humans are interesting. Especially when they think they still have time.'}},
];
export const SCENE = {
 sequence:7,day:1,time:'00:14',period:{th:'กลางคืน',en:'Night'},location:{th:'ห้องสืบสวน',en:'Investigation room'},region:{th:'โตเกียว',en:'Tokyo'},continent:{th:'ญี่ปุ่น',en:'Japan'},
 weather:{th:'ฝนโปรย',en:'Light rain'},temperature:18,participants:['L','Akira','Ryuk'],
 position:{th:'โต๊ะทำงานริมหน้าต่าง',en:'The desk beside the window'},objective:{th:'ตรวจสอบภาพถ่ายและรายชื่อในแฟ้มคดี',en:'Examine the photograph and the names in the case file'},
 safety:{th:'ยังไม่พบภัยคุกคามในห้อง',en:'No immediate threat in the room'},atmosphere:{th:'เงียบและระแวดระวัง',en:'Quiet and watchful'},lighting:{th:'โคมไฟบนโต๊ะ',en:'A desk lamp'},
 season:{th:'ฤดูใบไม้ร่วง',en:'Autumn'},month:{th:'ตุลาคม',en:'October'},year:'2003',era:{th:'คริสต์ศักราช',en:'Common Era'},calendar:{th:'เกรกอเรียน',en:'Gregorian'},elapsed:{th:'5 นาที',en:'5 min'},
};
const words={th:{thought:'ในใจ',narrative:'คำบรรยาย',dialogue:'บทพูด',profile:'ข้อมูลตัวละคร',scene:'ฉาก',day:'วันที่',details:'รายละเอียด',play:'ฟัง',pause:'พักเสียง',resume:'ฟังต่อ',cancel:'ยกเลิกการสร้างเสียง',edit:'แก้บทพากย์',close:'ปิด'},en:{thought:'Inner thought',narrative:'Narration',dialogue:'Dialogue',profile:'Character details',scene:'Scene',day:'Day',details:'Details',play:'Play',pause:'Pause',resume:'Resume',cancel:'Cancel audio request',edit:'Edit speech',close:'Close'}};
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const read=(value,lang)=>value&&typeof value==='object'&&!Array.isArray(value)?value[lang]??value.th??value.en??'':String(value??'');
export function actorType(actor,enabled=true){if(!enabled)return null;if(actor.kind==='user')return'user';return /^(?:shinigami|ยมทูต|死神)$/iu.test(String(actor.race||'').trim())?'shinigami':'npc';}
function icon(name){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const paths={play:'M9.05 5.65a1.25 1.25 0 0 0-1.9 1.07v10.56a1.25 1.25 0 0 0 1.9 1.07l8.7-5.28a1.25 1.25 0 0 0 0-2.14Z',pause:'M8.5 6v12M15.5 6v12',loading:'M9 9h6v6H9Z',edit:'m14.5 5 4.5 4.5M5 19l4.5-1 10-10a2 2 0 0 0-4.5-4.5l-10 10Z',chevron:'m8 10 4 4 4-4'};
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[name]||paths.play);svg.append(path);svg.dataset.icon=name;return svg;
}
export function updateVoiceButton(button,state={},language='th'){
 const w=words[language],kind=button.dataset.speechKind,phase=state.phase||'idle',shape=phase==='playing'?'pause':phase==='loading'?'loading':'play';
 const name=button.dataset.speaker||'',action=phase==='playing'?w.pause:phase==='loading'?w.cancel:phase==='paused'?w.resume:w.play;
 const label=action+' · '+(kind==='narrative'?w.narrative:name);
 const stamp=JSON.stringify([phase,state.ready!==false,label]);if(button.dataset.stamp===stamp)return;
 button.dataset.stamp=stamp;button.dataset.phase=phase;button.disabled=state.ready===false&&phase!=='loading';button.setAttribute('aria-busy',String(phase==='loading'));button.setAttribute('aria-label',label);button.title=label;button.replaceChildren(icon(shape));
}
function voiceTools(actor,kind,{language,voiceState,onVoice,onEdit}){
 const row=el('div','dnr-voice-tools'),play=el('button','dnr-voice-play'),edit=el('button','dnr-voice-edit');play.type=edit.type='button';play.dataset.speechKind=kind;play.dataset.speaker=actor.name;edit.dataset.speechKind=kind;
 updateVoiceButton(play,voiceState?.(kind)||{},language);play.addEventListener('click',()=>onVoice?.(kind,actor,play));
 edit.setAttribute('aria-label',words[language].edit+' · '+(kind==='narrative'?words[language].narrative:actor.name));edit.title=edit.getAttribute('aria-label');edit.append(icon('edit'));edit.addEventListener('click',()=>onEdit?.(kind,actor));row.append(play,edit);return row;
}
export function renderTurn(actor,{language='th',enabled=true,voice=false,voiceState,onProfile,onVoice,onEdit}={}){
 const type=actorType(actor,enabled);if(!type)return null;const w=words[language],root=el('article','dnr-turn');root.dataset.actor=type;root.dataset.actorId=actor.id;root.dataset.voice=String(voice&&type!=='user');root.lang=language;root.setAttribute('aria-label',actor.name);
 const header=el('header','dnr-header'),name=el(type==='user'?'div':'button','dnr-identity');if(type!=='user'){name.type='button';name.setAttribute('aria-label',w.profile+' · '+actor.name);name.addEventListener('click',()=>onProfile?.(actor));}
 name.append(el('strong','dnr-name',actor.name));const role=read(actor.role,language);if(role)name.append(el('span','dnr-role',role));header.append(name,el('span','dnr-header-rule'));root.append(header);
 const narrative=el('section','dnr-narrative');narrative.setAttribute('aria-label',w.narrative);narrative.append(el('p','',read(actor.narrative,language)));
 if(voice&&type!=='user')narrative.append(voiceTools(actor,'narrative',{language,voiceState,onVoice,onEdit}));root.append(narrative);
 const dialogue=el('blockquote','dnr-dialogue');dialogue.setAttribute('aria-label',w.dialogue);dialogue.append(el('p','',read(actor.dialogue,language)));
 if(voice&&type!=='user')dialogue.append(voiceTools(actor,'dialogue',{language,voiceState,onVoice,onEdit}));root.append(dialogue);
 const thought=el('section','dnr-thought'),toggle=el('button','dnr-thought-toggle'),body=el('div','dnr-thought-body'),id='dnr-thought-'+actor.id+'-'+Math.random().toString(36).slice(2,8);
 body.id=id;body.append(el('p','',read(actor.thought,language)));toggle.type='button';toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-controls',id);toggle.append(el('span','',w.thought),icon('chevron'));
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));body.hidden=open;});thought.append(toggle,body);root.append(thought);return root;
}
export function renderScene(scene,{language='th',enabled=true}={}){
 if(!enabled)return null;const w=words[language],get=k=>read(scene[k],language),root=el('section','dnr-scene');root.setAttribute('aria-label','Scene Tracker');root.lang=language;
 const top=el('header','dnr-scene-top');top.append(el('span','',w.scene+' '+String(scene.sequence??scene.day??'—').padStart(2,'0')),el('span','',[scene.day!=null?w.day+' '+scene.day:'',get('period')].filter(Boolean).join(' · ')));
 const hero=el('div','dnr-scene-hero'),place=el('div','dnr-scene-place');place.append(el('strong','',get('location')||'—'),el('span','',[get('region'),get('continent')].filter(Boolean).join(' · ')));hero.append(place,el('time','dnr-scene-clock',get('time')||'—'));
 const details=el('details','dnr-scene-details'),summary=el('summary'),conditions=el('span','dnr-scene-conditions');conditions.append(el('span','',[get('weather'),scene.temperature!=null?scene.temperature+'°C':''].filter(Boolean).join(' · ')),el('span','dnr-scene-people',(scene.participants||[]).map(n=>read(n,language)).join(' · ')));
 const label=el('span','dnr-scene-more',w.details);label.append(icon('chevron'));summary.append(conditions,label);const list=el('dl');
 const fields=[['position','ตำแหน่ง','Position'],['objective','เป้าหมาย','Objective'],['safety','ความปลอดภัย','Safety'],['atmosphere','บรรยากาศ','Atmosphere'],['lighting','แสง','Lighting'],['season','ฤดูกาล','Season'],['month','เดือน','Month'],['year','ปี','Year'],['era','ศักราช','Era'],['calendar','ปฏิทิน','Calendar'],['elapsed','เวลาที่ผ่านไป','Elapsed']];
 for(const[key,th,en]of fields){const value=get(key);if(!value)continue;const row=el('div');row.append(el('dt','',language==='th'?th:en),el('dd','',value));list.append(row);}details.append(summary,list);root.append(top,hero,details);return root;
}
export function sampleDialog(actor,language='th'){
 const d=el('dialog','dnr-dialog'),close=el('button','',words[language].close);close.type='button';d.append(el('strong','',actor.name),el('p','',read(actor.role,language)),el('small','',language==='th'?'ตัวอย่างข้อมูลตัวละคร':'Character design sample'),close);close.addEventListener('click',()=>d.close());d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;
}

// Native design harness: marked review messages only; keep the original DOM mounted.
export function mountNativePreview({enabled,voiceEnabled,language=()=> 'th',scope=()=>'',sceneFor=()=>SCENE,samples=SAMPLES}={}){
 const hosts=new Map();let captured=scope(),disposed=false;
 const controls=(host,kind)=>{const rows=[...host.querySelectorAll(kind==='narrative'?'.trpg-narrative .rf-voice-dialogue-controls':'.trpg-dialogue .rf-voice-dialogue-controls')].filter(n=>!n.closest('.dnr-native-layer'));return kind==='dialogue'?rows.at(-1):rows[0];};
 function cleanup(){for(const [host,record]of hosts){record.layer.remove();host.classList.remove('dnr-native-host');record.row.removeAttribute('data-dnr-actor');}hosts.clear();}
 function refresh(){
  if(disposed)return;const current=scope();if(current!==captured){cleanup();captured=current;}
  if(!enabled()){cleanup();return;}for(const[host,record]of hosts)if(!host.isConnected){record.layer.remove();hosts.delete(host);}
  for(const row of document.querySelectorAll('#chat .mes[mesid]')){
   const index=Number(row.getAttribute('mesid')),message=globalThis.SillyTavern?.getContext().chat[index],actor=samples.find(a=>a.id===message?.extra?.roleforge_quiet_ink),host=row.querySelector('.mes_text');if(!actor||!host)continue;
   const lang=language(),voice=Boolean(voiceEnabled()),showScene=Boolean(message.extra.roleforge_quiet_scene),scene=showScene?sceneFor(message,index):null;
   const signature=JSON.stringify([lang,voice,scene]),old=hosts.get(host);
   if(old?.signature===signature&&old.layer.parentNode===host){
    for(const button of old.layer.querySelectorAll('.dnr-voice-play')){
     const original=controls(host,button.dataset.speechKind)?.querySelector('.rf-voice-play');
     updateVoiceButton(button,{ready:original&&!original.disabled,phase:original?.getAttribute('aria-busy')==='true'?'loading':original?.classList.contains('is-playing')?/Pause|พักเสียง/iu.test(original.getAttribute('aria-label')||'')?'playing':'paused':'idle'},lang);
    }continue;
   }
   old?.layer.remove();const layer=el('div','dnr-native-layer');if(scene)layer.append(renderScene(scene,{language:lang}));const header=host.querySelector('.trpg-header');
   layer.append(renderTurn(actor,{language:lang,voice,onProfile:()=>header?header.click():sampleDialog(actor,lang),voiceState:kind=>({ready:Boolean(controls(host,kind)?.querySelector('.rf-voice-play:not(:disabled)'))}),onVoice:kind=>controls(host,kind)?.querySelector('.rf-voice-play')?.click(),onEdit:kind=>controls(host,kind)?.querySelector('.rf-voice-setup')?.click()}));
   row.dataset.dnrActor=actorType(actor,true);host.classList.add('dnr-native-host');host.append(layer);hosts.set(host,{layer,row,signature});
  }
 }
 const observer=new MutationObserver(()=>queueMicrotask(refresh));observer.observe(document.getElementById('chat'),{childList:true,subtree:true});const timer=setInterval(refresh,200);refresh();
 return{refresh,debug:()=>({enabled:enabled(),voice:voiceEnabled(),styled:hosts.size}),destroy(){disposed=true;clearInterval(timer);observer.disconnect();cleanup();}};
}
