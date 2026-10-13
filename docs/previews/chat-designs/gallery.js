import {renderStoryBlocks} from '../../../src/npc-chat.js?v=0.67.1';
import {croppedPortrait} from '../../../src/npc-portraits.js?v=0.67.1';
import {setUiLanguageProvider} from '../../../src/ui-language.js?v=0.67.1';
import {createVoiceAddons} from '../../../src/voice-addons.js?v=0.67.1';
import {CHAT_THEMES} from '../../../src/chat-themes.js?v=0.67.1';

setUiLanguageProvider(()=> 'th');
const $=id=>document.getElementById(id),root=$('story'),host=$('chat-host'),stage=$('preview-stage'),dialog=$('preview-dialog'),positioner=stage.querySelector('.host-positioner');
const profile={id:'sample-aster',name:'Aster Vale',title:'ผู้ร่วมเดินทาง',occupation:'นักเวทพเนจร',stats:{rank:'ระดับกลาง',hp:100,level:7},abilities:[{name:'เวทน้ำ',category:'เวทมนตร์',level:'ระดับกลาง'}],race:'มนุษย์',relationship:'พันธมิตร',faction:'รานัว',identityColor:'#d1b27c',roleIcon:'book',portraitSize:72};
const blocks=[{type:'header',name:profile.name},{type:'narrative',text:'อัสเตอร์คลี่แผนที่บนโต๊ะ แสงตะเกียงไล้ผ่านเส้นทางที่ทอดข้ามป่า เขาเงียบไปครู่หนึ่ง ก่อนหันมาสบตาคุณ'},{type:'dialogue',name:profile.name,text:'ถ้าจะเดินทางไกล ผมอยากให้คุณจำทางกลับไว้ด้วย เราจะเริ่มฝึกทีละอย่าง ไม่ต้องรีบร้อนหรอก'},{type:'narrative',text:'เขาเลื่อนคัมภีร์เข้ามาใกล้ เสียงกระดาษเสียดสีกันเบา ๆ ท่ามกลางความเงียบของห้อง'},{type:'dialogue',name:profile.name,text:'เมื่อคุณพร้อม เราจะออกเดินทางไปด้วยกัน'}];
const photo=await croppedPortrait(await (await fetch(new URL('../chat-original/assets/sample-character.jpg',import.meta.url))).blob(),{x:50,y:50,zoom:1}),photoUrl=URL.createObjectURL(photo);
const message={name:profile.name,mes:'Production preview fixture',is_user:false},context={chat:[message],chatMetadata:{},getCurrentChatId:()=> 'chat-design-preview'};
const voice=createVoiceAddons({settings:()=>({enableVoiceAddon:true,language:'th'}),context:()=>context,state:()=>({npcs:[profile]})});
let theme='chapter',device='auto',dispose;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function openProfile(){
 $('dialog-caption').textContent='ข้อมูลตัวละคร · PREVIEW';const title=el('h2','',profile.name),data=el('dl','record-data');
 for(const [key,value]of [['อาชีพ',profile.occupation],['ระดับ NPC',profile.stats?.rank],['สกิล',profile.abilities?.map(a=>a.name+' · '+a.level).join(', ')],['เผ่า',profile.race],['ฝ่าย',profile.faction],['HP',profile.stats?.hp],['Lv',profile.stats?.level]])if(value!==undefined&&value!==null)data.append(el('dt','',key),el('dd','',String(value)));
 $('dialog-content').replaceChildren(title,data,el('p','dialog-note','ข้อมูลตัวอย่างเท่านั้น ในแชทจริงปุ่มนี้เปิดข้อมูล NPC ของ RoleForge'));dialog.showModal();
}
const appearance=()=>({theme,header:$('header').checked,dialogue:$('dialogue').checked,narrative:$('narrative').checked,badgeMode:$('badge').value,badgeAbility:'เวทน้ำ',npcVitals:$('npc-stats').checked,effects:$('effects').checked});
function render(){
 dispose?.();root.replaceChildren();profile.identityColor=$('color').value;profile.portraitSize=Number($('portrait-size').value);$('portrait-size-value').value=profile.portraitSize+' px';
 const displayed=$('long-text').checked?blocks.map(b=>({...b,text:b.text?b.text+'\n\n'+('LongSceneNameAndUninterruptedText'.repeat(6))+'\n\n'+b.text.repeat(3):undefined})):blocks;
 renderStoryBlocks(root,displayed,new Map([[profile.name.toLowerCase(),profile]]),profile.name,openProfile,async()=> $('portrait').checked?photoUrl:null,null,appearance());
 root.classList.toggle('trpg-entrance',$('effects').checked);dispose=voice.decorateMessage(root,displayed,{id:0,message});
 const selected=CHAT_THEMES.find(t=>t.key===theme);$('design-description').textContent=selected.descriptionTh;$('sidebar-design-name').textContent=selected.name;$('sidebar-design-detail').textContent=selected.descriptionTh;
 $('stats-control').hidden=theme!=='aincrad';$('inspiration').textContent=theme==='aincrad'?'แรงบันดาลใจจาก SAO · Aincrad':'แรงบันดาลใจจาก Mushoku Tensei';
 document.querySelectorAll('[data-design]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.design===theme)));$('chat-scroll').scrollTop=0;layout();
}
function layout(){
 const available=stage.clientWidth,width=device==='mobile'?390:device==='desktop'?1280:Math.min(1280,available),mobile=width<760,scale=Math.min(1,available/width),height=mobile?990:940;
 host.dataset.layout=mobile?'mobile':'desktop';host.style.width=width+'px';host.style.height=height+'px';host.style.transform='scale('+scale+')';positioner.style.width=width*scale+'px';positioner.style.height=height*scale+'px';stage.style.height=height*scale+'px';
 $('viewport-label').textContent=(mobile?'MOBILE':'PC')+' · '+Math.round(width)+' px'+(scale<.99?' · ย่อ '+Math.round(scale*100)+'%':'');
}
root.addEventListener('click',event=>{if(event.target.closest('[data-roleforge-control="voice"]')){event.preventDefault();event.stopImmediatePropagation();$('dialog-caption').textContent='บทพากย์ · PREVIEW';$('dialog-content').replaceChildren(el('p','dialog-note','แสดงปุ่มและสถานะจาก Voice Addon จริง ตัวอย่างนี้ไม่เรียก API เสียง ในส่วนเสริมให้เชื่อมต่อ ElevenLabs และเลือกเสียงก่อนฟังบทพากย์'));dialog.showModal();}},true);
document.querySelectorAll('[data-design]').forEach(b=>b.addEventListener('click',()=>{theme=b.dataset.design;render();}));
document.querySelectorAll('[data-device]').forEach(b=>b.addEventListener('click',()=>{device=b.dataset.device;document.querySelectorAll('[data-device]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));layout();}));
for(const id of ['portrait','header','dialogue','narrative','long-text','npc-stats','effects','color','badge'])$(id).addEventListener('change',render);
$('portrait-size').addEventListener('input',render);
$('close-dialog').addEventListener('click',()=>dialog.close());
new ResizeObserver(layout).observe(stage);
const params=new URLSearchParams(location.search);if(['chapter','codex','aincrad'].includes(params.get('theme')))theme=params.get('theme');if(['mobile','desktop'].includes(params.get('device')))device=params.get('device');if(params.get('portrait')==='0')$('portrait').checked=false;
render();await document.fonts.ready;
window.chatDesignPreview={ready:true,root,profile,blocks,render,appearance,photoUrl,get theme(){return theme;},setTheme(value){theme=value;render();},get device(){return device;}};
