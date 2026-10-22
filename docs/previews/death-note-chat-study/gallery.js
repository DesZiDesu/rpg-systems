import {SAMPLES,renderTurn,actorType,previewDialog} from './theme.js';
let design='notebook',language='th',filter='all',toastTimer;
const seal=new URL('../../../assets/workshop/death-note/rules-seal.png',import.meta.url).href;
const $=s=>document.querySelector(s),all=s=>document.querySelectorAll(s);
function localize(){
 const en=language==='en';
 $('.dn-gallery-review').textContent=en?'Not merged into main':'ยังไม่รวมเข้า main';
 $('.dn-gallery-title h1').textContent=en?'Ink, shadows, and the other side':'หมึก เงา และเสียงจากอีกโลก';
 $('button[data-design=notebook]').lastChild.textContent=en?' The Black Notebook':' สมุดปกดำ';
 $('button[data-design=casefile]').lastChild.textContent=en?' Midnight Casefile':' แฟ้มคดียามค่ำ';
 $('button[data-actor=all]').textContent=en?'All':'ทั้งหมด';
 $('button[data-actor=user]').textContent=en?'User':'ผู้เล่น';
 $('button[data-actor=shinigami]').textContent=en?'Shinigami':'ยมทูต';
 $('.dn-gallery-subtools label').firstChild.textContent=en?'Text size ':'ขนาดข้อความ ';
 $('#type-size').setAttribute('aria-label',en?'Text size':'ขนาดข้อความ');
 $('#off h2').textContent=en?'Your usual chat presentation returns':'กลับไปใช้รูปแบบแชทเดิม';
 $('#off>p').textContent=en?'Death Note and Shinigami styling are removed when the addon is disabled.':'เมื่อปิด Addon จะไม่มีธีม Death Note หรือรูปแบบเฉพาะยมทูตแสดงในแชท';
 $('.dn-gallery-default p').textContent=en?'“I am not here to make your decisions. Just to watch.”':'“ข้าไม่ได้เป็นคนตัดสินใจแทนเจ้าหรอก แค่เฝ้าดูเท่านั้น”';
 $('.dn-gallery-footer p:nth-child(2)').textContent=en?'Tap a name to inspect the sample · Thoughts can be folded · These are deliberately authored story thoughts, never hidden AI reasoning.':'แตะชื่อเพื่อดูตัวอย่างข้อมูล · พับ/เปิดความคิดได้ · ความคิดในภาพเป็นข้อความตัวอย่างที่ตั้งใจแสดง ไม่ใช่ reasoning ลับของ AI';
 $('.dn-gallery-footer summary').textContent=en?'Screenshots from SillyTavern':'ดูภาพจาก SillyTavern';
 $('.dn-gallery-toolbar').setAttribute('aria-label',en?'Preview controls':'ตัวเลือกพรีวิว');
}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,2600);}
function render(){
 const enabled=$('#addon').checked,boards=$('#boards');boards.replaceChildren();boards.hidden=!enabled;$('#off').hidden=enabled;boards.dataset.filtered=String(filter!=='all');
 document.documentElement.lang=language;document.body.dataset.design=design;localize();
 for(const actor of SAMPLES){const type=actorType(actor,true);if(filter!=='all'&&type!==filter)continue;
  const card=document.createElement('section');card.className='dn-gallery-card';card.dataset.actor=type;
  const label=document.createElement('div');label.className='dn-gallery-card-label';const text=type==='npc'?'NPC':type==='user'?(language==='th'?'ผู้เล่น':'USER'):(language==='th'?'ยมทูต':'SHINIGAMI');label.innerHTML='<span></span><span></span>';label.children[0].textContent=text;label.children[1].textContent=type==='shinigami'?'死神':type==='user'?'02':'01';card.append(label);
  const turn=renderTurn(actor,{theme:design,language,seal,enabled,onProfile:a=>previewDialog(a,language),onVoice:()=>toast(language==='th'?'ปุ่มเสียงตัวอย่าง · เมื่อใช้งานจริงจะเชื่อมเสียงเดิมของ RoleForge':'Voice sample · connects to RoleForge voice controls in production')});if(turn)card.append(turn);boards.append(card);
 }
 $('#description').textContent=design==='notebook'?(language==='th'?'A · สมุดปกดำ — กระดาษสีงาช้าง หมึกดำ และตราประทับสีแดงสำหรับยมทูต':'A · The Black Notebook — ivory paper, dark ink, and red Shinigami seals'):(language==='th'?'B · แฟ้มคดียามค่ำ — ดำเทา กระชับ และหมึกแดงเฉพาะยมทูต':'B · Midnight Casefile — charcoal records, compact type, and restrained red ink');
}
all('button[data-design]').forEach(button=>button.addEventListener('click',()=>{design=button.dataset.design;all('button[data-design]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
all('button[data-language]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.language;all('button[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
all('button[data-actor]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.actor;all('button[data-actor]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
$('#addon').addEventListener('change',render);$('#type-size').addEventListener('input',event=>{document.documentElement.style.setProperty('--dn-font-size',event.target.value+'px');$('#type-value').textContent=event.target.value;});
const args=new URLSearchParams(location.search);if(args.has('capture'))document.body.dataset.capture='true';
if(args.get('design')==='casefile')design='casefile';if(args.get('lang')==='en')language='en';if(['npc','user','shinigami'].includes(args.get('actor')))filter=args.get('actor');
all('button[data-design]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.design===design)));all('button[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===language)));all('button[data-actor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.actor===filter)));
for(const theme of ['notebook','casefile'])for(const device of ['desktop','mobile']){const a=document.createElement('a');a.href='./screenshots/native-'+theme+'-'+device+'-shinigami.png';a.textContent=(theme==='notebook'?'A':'B')+' · SillyTavern · '+device;const img=document.createElement('img');img.src=a.href;img.alt=a.textContent;img.loading='lazy';a.append(img);$('#native-shots').append(a);}
render();window.DeathNoteThemeGallery={render,setDesign(value){if(!['notebook','casefile'].includes(value))return;design=value;all('button[data-design]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.design===design)));render();},get design(){return design;},get samples(){return SAMPLES;}};
