import {renderStoryBlocks} from '../../../src/npc-chat.js?v=0.65.0';
import {croppedPortrait} from '../../../src/npc-portraits.js?v=0.65.0';
import {setUiLanguageProvider} from '../../../src/ui-language.js?v=0.65.0';
import {createVoiceAddons} from '../../../src/voice-addons.js?v=0.65.0';

setUiLanguageProvider(()=> 'th');
const root=document.querySelector('.mes_text>.trpg-chat'),profileDialog=document.querySelector('#preview-profile');
const profile={id:'sample-aster',name:'Aster Vale',title:'นักเดินทาง',occupation:'Water Mage',stats:{rank:'Intermediate'},abilities:[{name:'Water Magic',category:'Magic',level:'Intermediate',description:'ควบคุมกระแสน้ำ',proficiency:45}],race:'มนุษย์',relationship:'พันธมิตร',faction:'รานัว',identityColor:'#abc4b6',roleIcon:'book',portraitSize:98};
const blocks=[{type:'header',name:profile.name},{type:'narrative',text:'อัสเตอร์ปิดคัมภีร์อย่างเบามือ ก่อนเลื่อนแผนที่มาตรงหน้าคุณ แสงตะเกียงทาบบนเส้นทางเลียบแม่น้ำ'},{type:'dialogue',name:profile.name,text:'เราจะออกเดินทางตอนฟ้าสาง ถ้าคุณพร้อม ผมจะนำทางไปเอง'},{type:'narrative',text:'เขาชี้ไปยังสะพานบนแผนที่ แล้วเงยหน้าขึ้นรอคำตอบจากคุณ'},{type:'dialogue',name:profile.name,text:'ระหว่างนี้พักให้เต็มที่เถอะ คืนนี้ยังมีเวลาอีกมาก'}];
const photo=await croppedPortrait(await (await fetch(new URL('../chat-original/assets/sample-character.jpg',import.meta.url))).blob(),{x:50,y:50,zoom:1});
const photoUrl=URL.createObjectURL(photo),message={name:profile.name,mes:'Preview of the real RoleForge renderer',is_user:false},context={chat:[message],chatMetadata:{},getCurrentChatId:()=> 'folio-preview'};
const voice=createVoiceAddons({settings:()=>({enableVoiceAddon:true,language:'th'}),context:()=>context,state:()=>({npcs:[profile]})});let dispose;
const appearance=()=>({theme:document.querySelector('#theme').value,badgeMode:document.querySelector('#badge').value,badgeAbility:'Water Magic',...Object.fromEntries([...document.querySelectorAll('[data-part]')].map(input=>[input.dataset.part,input.checked]))});
function render(){
  dispose?.();root.replaceChildren();profile.identityColor=document.querySelector('#color').value;
  renderStoryBlocks(root,blocks,new Map([[profile.name.toLowerCase(),profile]]),profile.name,()=>profileDialog.showModal(),async()=>document.querySelector('#portrait').checked?photoUrl:null,null,appearance());
  dispose=voice.decorateMessage(root,blocks,{id:0,message});
}
for(const input of document.querySelectorAll('[data-part],#portrait,#theme,#color,#badge'))input.addEventListener('change',render);
document.querySelector('#device').addEventListener('change',event=>document.querySelector('.preview-stage').dataset.device=event.target.value);
root.addEventListener('click',event=>{if(event.target.closest('[data-roleforge-control="voice"]')){event.preventDefault();event.stopImmediatePropagation();document.querySelector('#preview-voice').showModal();}},true);
render();window.folioChatPreview={ready:true,root,profile,blocks,render,appearance,photoUrl};
