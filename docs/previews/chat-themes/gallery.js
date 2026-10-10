import {CHAT_THEMES,normalizeChatAppearance,createThemeMotion} from '../../../src/chat-themes.js?v=0.63.0';
import {renderStoryBlocks,element} from '../../../src/npc-chat.js?v=0.63.0';
import {setUiLanguageProvider} from '../../../src/ui-language.js?v=0.63.0';
setUiLanguageProvider(()=> 'th');
export const samples=[
 {name:'Arin Vale',title:'ผู้พิทักษ์บันทึก',occupation:'นักเดินทาง',race:'มนุษย์',relationship:'พันธมิตร',faction:'RoleForge',identityColor:'#d6b458',color:'#d6b458',narrative:'แสงสีทองทาบบนหน้าคัมภีร์ อารินวางดาบข้างโต๊ะ ก่อนเลื่อนแผนที่มาหาคุณอย่างเงียบงัน',dialogue:'เส้นทางข้างหน้ายังไม่ถูกเขียน หากคุณพร้อม เราจะเริ่มการเดินทางบทใหม่นี้ไปด้วยกัน'},
 {name:'Lyra Dawn',title:'ผู้ใช้เวทดารา',occupation:'นักผจญภัย',race:'เอลฟ์',relationship:'สหาย',faction:'Aster Guild',identityColor:'#cbb6ff',color:'#cbb6ff',narrative:'ละอองดาวลอยเหนือยอดหญ้า ไลราหันกลับมาพร้อมรอยยิ้ม ขณะที่แสงสีม่วงจาง ๆ วนรอบปลายนิ้วของเธอ',dialogue:'หลังภูเขาลูกนั้นมีทะเลดวงดาวอยู่จริงนะ! ฉันอยากให้คุณเป็นคนแรกที่ได้เห็นมันด้วยกัน'},
 {name:'Seren Voss',title:'ผู้เฝ้าคำสาบาน',occupation:'นักล่า',race:'มนุษย์',relationship:'พันธมิตร',faction:'Ashen Order',identityColor:'#c46a65',color:'#c46a65',narrative:'เถ้าถ่านปลิวผ่านซุ้มประตู เซเรนดึงผ้าคลุมให้แน่นขึ้น เสียงระฆังจากวิหารร้างดังมาเพียงครั้งเดียว',dialogue:'อย่าตอบเสียงที่เรียกชื่อคุณจากความมืด ไม่ว่ามันจะฟังเหมือนคนที่คุณรักมากแค่ไหนก็ตาม'},
 {name:'Elian Ash',title:'ผู้พิทักษ์หอคัมภีร์',occupation:'จอมเวท',race:'มนุษย์',relationship:'รุ่นพี่',faction:'Astral Academy',identityColor:'#bea2ed',color:'#bea2ed',narrative:'ตราเวทบนปกหนังสือหมุนช้า ๆ เอเลียนแตะปลายไม้กายสิทธิ์ลงบนโต๊ะ แสงดวงเล็กส่องขึ้นจากหมึกเก่า',dialogue:'คาถาไม่ได้เริ่มที่ไม้กายสิทธิ์ แต่มันเริ่มที่สิ่งที่คุณตั้งใจจะปกป้อง เปิดหน้าถัดไปสิ แล้วลองอีกครั้ง'},
 {name:'Lin Yue · 林月',title:'ผู้สืบทอดสำนักเมฆา',occupation:'นักกระบี่',race:'เซียน',relationship:'ศิษย์ร่วมสำนัก',faction:'Cloud Sect',identityColor:'#91c9b1',color:'#91c9b1',narrative:'สายลมพากลีบบัวผ่านศาลาริมน้ำ หลินเยว่เก็บกระบี่เข้าฝัก แล้วรินชาลงในถ้วยหยกที่วางตรงหน้าคุณ',dialogue:'กระบี่ที่สงบไม่ได้ไร้คม เช่นเดียวกับใจที่นิ่งไม่ได้ไร้ความฝัน ดื่มชาก่อนเถิด แล้วเราค่อยฝึกต่อ'},
 {name:'NOVA-07',title:'ระบบนำทางภาคสนาม',occupation:'หน่วยสำรวจ',race:'แอนดรอยด์',relationship:'เชื่อมต่อแล้ว',faction:'NEXUS',identityColor:'#85e5ec',color:'#85e5ec',narrative:'เส้นสัญญาณสีฟ้าปรากฏเหนือแผงควบคุม โนวาหยุดประมวลผลชั่วครู่ ก่อนฉายแผนที่สถานีลงบนผนัง',dialogue:'ยืนยันเส้นทางใหม่แล้ว ประตูฝั่งตะวันออกยังเปิดอยู่ ฉันจะติดตามสัญญาณของคุณตลอดการเคลื่อนที่'},
];
const grid=document.getElementById('theme-gallery'),filter=document.getElementById('theme-filter'),motion=createThemeMotion();
const records=[];let view=normalizeChatAppearance(),selection='all';
for(const [index,theme] of CHAT_THEMES.entries()){
 const profile={...samples[index],roleIcon:'book'},card=element('article','theme-card');card.dataset.theme=theme.key;card.style.setProperty('--card-accent',profile.color);
 const intro=element('header','card-intro'),name=element('div');name.append(element('small','',theme.genre),element('h2','',theme.name));intro.append(name,element('span','card-number',String(index+1).padStart(2,'0')));
 const surface=element('div','story-surface'),root=element('div','trpg-chat');surface.append(root);
 const note=element('div','card-note');note.append(element('span','motion-dot'),element('span','',theme.descriptionTh));card.append(intro,surface,note);grid.append(card);
 records.push({theme,profile,card,root});const option=element('option','',`${theme.name} · ${theme.genre}`);option.value=theme.key;filter.append(option);
}
function openProfile(p){const dialog=document.getElementById('preview-dossier');dialog.querySelector('h2').textContent=p.name;dialog.querySelector('p').textContent=[p.title,p.occupation,p.race,p.faction].filter(Boolean).join(' · ');dialog.showModal();}
function render(){
 for(const {theme,profile,card,root} of records){
  motion.remove(root);root.replaceChildren();card.classList.toggle('is-selected',theme.key===selection);
  const blocks=[{type:'header',name:profile.name},{type:'narrative',text:profile.narrative},{type:'dialogue',name:profile.name,text:profile.dialogue}];
  renderStoryBlocks(root,blocks,new Map([[profile.name.toLowerCase(),profile]]),profile.name,openProfile,async()=>null,null,{...view,theme:theme.key});motion.add(root);
 }
 document.body.classList.toggle('single',selection!=='all');filter.value=selection;
}
filter.addEventListener('change',()=>{selection=filter.value;render();const url=new URL(location.href);if(selection==='all')url.searchParams.delete('theme');else url.searchParams.set('theme',selection);history.replaceState(null,'',url);});
for(const input of document.querySelectorAll('[data-part]'))input.addEventListener('change',()=>{view={...view,[input.dataset.part]:input.checked};render();});
const requested=new URL(location.href).searchParams.get('theme');if(CHAT_THEMES.some(theme=>theme.key===requested))selection=requested;
render();window.chatThemePreview={ready:true,records,get appearance(){return view;}};
