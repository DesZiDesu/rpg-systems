// Design study only. Nothing in the installed extension imports this module.
export const THEMES={notebook:{th:'สมุดปกดำ',en:'The Black Notebook'},casefile:{th:'แฟ้มคดียามค่ำ',en:'Midnight Casefile'}};
export const SAMPLES=[
 {id:'detective',kind:'npc',race:'Human',name:'L',monogram:'L',role:{th:'ผู้สืบสวนคดีคิระ',en:'Kira case investigator'},place:{th:'ห้องสืบสวน · โตเกียว',en:'Investigation room · Tokyo'},
  narrative:{th:'ปลายนิ้วของแอลหยุดอยู่เหนือแฟ้ม เขาเลื่อนภาพถ่ายหนึ่งใบมาตรงหน้าคุณ โดยยังไม่ละสายตาจากจอโทรทัศน์',en:'L rests a finger on the file, then slides a photograph toward you without looking away from the television.'},
  dialogue:{th:'การที่ชื่อหนึ่งปรากฏอยู่ในข่าว ไม่ได้แปลว่าคนที่เห็นข่าวทุกคนจะทำสิ่งเดียวกัน คุณสังเกตอะไรจากภาพนี้?',en:'A name appearing in the news does not mean everyone watching will act on it. What do you notice in this photograph?'},
  thought:{th:'จังหวะที่เขาหยุดมองภาพ อาจสำคัญกว่าคำตอบที่เขาเลือกพูด',en:'The moment they hesitate over the photograph may matter more than the answer they choose.'}},
 {id:'player',kind:'user',race:'Human',name:'Akira',monogram:'A',role:{th:'เจ้าของสมุด',en:'Notebook owner'},place:{th:'ห้องพัก · หลังเที่ยงคืน',en:'A quiet room · after midnight'},
  narrative:{th:'ฉันค่อย ๆ ปิดปากกา เสียงฝนด้านนอกกลบเสียงกระดาษที่พลิกกลับไปยังหน้าว่าง',en:'I put the pen down. Rain against the window swallows the sound of a page turning.'},
  dialogue:{th:'ฉันอยากรู้กฎให้ครบก่อน เรื่องที่เขียนลงไปแล้ว... มันย้อนกลับมาแก้ได้จริงหรือเปล่า?',en:'I want to understand all the rules first. Once something is written... can it really be taken back?'},
  thought:{th:'ถ้าริวคกำลังรอให้ฉันพลาด ฉันก็ยิ่งต้องไม่รีบตัดสินใจ',en:'If Ryuk is waiting for me to make a mistake, I have even more reason to take my time.'}},
 {id:'shinigami',kind:'npc',race:'Shinigami',name:'Ryuk',monogram:'R',role:{th:'ยมทูต',en:'Shinigami'},place:{th:'โลกมนุษย์ · สมุดปกดำ',en:'Human world · the black notebook'},
  narrative:{th:'เงาสูงผิดมนุษย์ทาบผ่านโต๊ะ ริวคเอียงศีรษะมองหน้ากระดาษ ก่อนรอยยิ้มจะกว้างขึ้นในความมืด',en:'An inhuman shadow stretches across the desk. Ryuk tilts his head toward the page, his grin widening in the dark.'},
  dialogue:{th:'ข้าไม่ได้เป็นคนตัดสินใจแทนเจ้าหรอก แค่เฝ้าดูเท่านั้น... มนุษย์นี่หาวิธีทำให้เรื่องธรรมดาน่าสนใจได้เสมอ',en:'I am not here to make your decisions. Just to watch... Humans always find a way to make ordinary things interesting.'},
  thought:{th:'เรื่องนี้คงไม่จบลงด้วยหน้ากระดาษเพียงหน้าเดียว น่าสนุกดีนี่',en:'This will take more than a single page. Now that could be entertaining.'}},
];
const words={th:{narrative:'บรรยาย',thought:'ความคิด',profile:'เปิดข้อมูลตัวละคร',voice:'ฟังบทพูด',show:'เปิดความคิด',hide:'พับความคิด',close:'ปิด',preview:'ตัวอย่างข้อความ'},en:{narrative:'Narration',thought:'Inner thought',profile:'Open character details',voice:'Listen',show:'Show thought',hide:'Hide thought',close:'Close',preview:'Sample text'}};
export function actorType(actor,enabled=true){if(!enabled)return null;return actor.kind==='user'?'user':/^(?:shinigami|ยมทูต|死神)$/iu.test(String(actor.race||'').trim())?'shinigami':'npc';}
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function renderTurn(actor,{theme='notebook',language='th',enabled=true,seal='',onProfile=()=>{},onVoice=()=>{}}={}){
 const type=actorType(actor,enabled);if(!type)return null;
 const w=words[language]||words.th,read=value=>typeof value==='object'?value[language]||value.th||value.en:value;
 const root=node('article','dn-study-turn');root.dataset.dnActor=type;root.dataset.dnTheme=theme;root.dataset.actorId=actor.id;root.lang=language;root.setAttribute('aria-label',actor.name);
 const header=node('header','dn-study-header'),identity=node(type==='user'?'div':'button','dn-study-identity');
 if(identity.tagName==='BUTTON'){identity.type='button';identity.setAttribute('aria-label',w.profile+' '+actor.name);identity.addEventListener('click',()=>onProfile(actor));}
 const mark=node('span','dn-study-emblem');mark.setAttribute('aria-hidden','true');
 if(type==='shinigami'&&seal){const img=node('img','dn-study-seal');img.src=seal;img.alt='';mark.append(img);}else mark.append(node('span','dn-study-monogram',actor.monogram||actor.name[0]));
 const name=node('span','dn-study-name');name.append(node('small','dn-study-role',read(actor.role)),node('strong','',actor.name),node('span','dn-study-place',read(actor.place)));
 identity.append(mark,name);header.append(identity);
 if(type!=='user'){const sign=node('span','dn-study-record-mark',type==='shinigami'?'死神':'↗');sign.setAttribute('aria-hidden','true');header.append(sign);}
 root.append(header);
 const narrative=node('section','dn-study-narrative');narrative.setAttribute('aria-label',w.narrative);narrative.append(node('small','dn-study-content-label',w.narrative),node('p','',read(actor.narrative)));root.append(narrative);
 const dialogue=node('blockquote','dn-study-dialogue');dialogue.setAttribute('aria-label',language==='th'?'บทพูด':'Dialogue');
 const quote=node('span','dn-study-quote','“');quote.setAttribute('aria-hidden','true');dialogue.append(quote,node('p','',read(actor.dialogue)));
 const footer=node('footer','dn-study-speech-footer'),voice=node('button','dn-study-voice');voice.type='button';voice.setAttribute('aria-label',w.voice+' '+actor.name);
 const play=node('span','dn-study-play','▷');play.setAttribute('aria-hidden','true');voice.append(play,node('span','',w.voice));voice.addEventListener('click',()=>onVoice(actor));footer.append(voice,node('span','dn-study-speech-signature','— '+(actor.monogram||actor.name[0])+'.'));dialogue.append(footer);root.append(dialogue);
 const thoughts=node('section','dn-study-thought'),toggle=node('button','dn-study-thought-toggle'),body=node('div','dn-study-thought-body'),text=node('p','',read(actor.thought));
 const id='dn-thought-'+actor.id+'-'+Math.random().toString(36).slice(2,8);body.id=id;body.append(text);toggle.type='button';toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-controls',id);toggle.setAttribute('aria-label',w.hide);toggle.append(node('span','dn-study-thought-rule'),node('span','',w.thought),node('span','dn-study-thought-symbol','−'));
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?w.show:w.hide);toggle.lastElementChild.textContent=open?'+':'−';body.hidden=open;thoughts.dataset.folded=String(open);});thoughts.append(toggle,body);root.append(thoughts);
 return root;
}
export function previewDialog(actor,language='th'){
 const dialog=node('dialog','dn-study-dialog');const title=node('strong','',actor.name),p=node('p','',typeof actor.role==='object'?actor.role[language]:actor.role),hint=node('small','',language==='th'?'ข้อมูลตัวอย่างสำหรับดูหน้าตาเท่านั้น':'Read-only design sample'),close=node('button','',words[language].close);
 close.type='button';close.addEventListener('click',()=>dialog.close());dialog.append(title,p,hint,close);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();return dialog;
}

// Used only by the native SillyTavern review fixture. Original message nodes
// remain mounted, and disabling the actual addon restores their presentation.
export function mountNativeStudy({enabled,design=()=> 'notebook',language=()=> 'th',seal,scope=()=>'',samples=SAMPLES}={}){
 const hosts=new Map();let captured=scope(),destroyed=false;
 function restore(){for(const [host,row]of hosts){row.layer.remove();row.messageRow?.removeAttribute('data-dn-study-actor');host.classList.remove('dn-study-native-host');}hosts.clear();}
 function refresh(){
  if(destroyed)return;if(scope()!==captured){restore();captured=scope();}
  if(!enabled()){restore();return;}for(const [host,row]of hosts)if(!host.isConnected){row.layer.remove();hosts.delete(host);}
  for(const row of document.querySelectorAll('#chat .mes[mesid]')){
   const host=row.querySelector('.mes_text'),index=Number(row.getAttribute('mesid')),message=globalThis.SillyTavern?.getContext().chat[index],id=message?.extra?.roleforge_theme_study;
   const actor=samples.find(a=>a.id===id);if(!host||!actor)continue;
   const signature=design()+'|'+language();if(hosts.get(host)?.signature===signature&&hosts.get(host).layer.parentNode===host)continue;
   hosts.get(host)?.layer.remove();const layer=node('div','dn-study-native-layer');layer.dataset.dnEnabled='true';
   const original=host.querySelector('.trpg-header');
   layer.append(renderTurn(actor,{theme:design(),language:language(),seal,onProfile:()=>original?original.click():previewDialog(actor,language()),onVoice:()=>{const control=host.querySelector('.rf-voice-play,.rf-voice-setup');if(control)control.click();else{layer.dataset.voicePressed='true';}}}));row.dataset.dnStudyActor=actorType(actor,true);host.classList.add('dn-study-native-host');host.append(layer);hosts.set(host,{layer,signature,messageRow:row});
  }
 }
 const observer=new MutationObserver(()=>{if(!destroyed)queueMicrotask(refresh);});observer.observe(document.getElementById('chat'),{childList:true,subtree:true});
 const timer=setInterval(refresh,300);refresh();return{refresh,restore,debug:()=>({active:enabled(),styled:hosts.size,design:design()}),destroy(){destroyed=true;clearInterval(timer);observer.disconnect();restore();}};
}
