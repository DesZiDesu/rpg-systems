import {renderStoryBlocks} from '../../../src/npc-chat.js?v=0.64.2';
import {croppedPortrait} from '../../../src/npc-portraits.js?v=0.64.2';
import {setUiLanguageProvider} from '../../../src/ui-language.js?v=0.64.2';

setUiLanguageProvider(()=> 'th');
const root=document.querySelector('.story-surface>.trpg-chat'),dialog=document.querySelector('#preview-profile');
const profile={id:'sample-aster',name:'Aster Vale',title:'นักเดินทาง',race:'มนุษย์',relationship:'พันธมิตร',faction:'สมาคมนักสำรวจ',identityColor:'#a4ba88',roleIcon:'book',portraitSize:72};
const blocks=[{type:'header',name:profile.name},{type:'narrative',text:'อัสเตอร์ปิดคัมภีร์อย่างเบามือ ก่อนเลื่อนแผนที่มาตรงหน้าคุณ แสงตะเกียงทาบบนเส้นทางเลียบแม่น้ำ'},{type:'dialogue',name:profile.name,text:'เราจะออกเดินทางตอนฟ้าสาง ถ้าคุณพร้อม ผมจะนำทางไปเอง'},{type:'narrative',text:'เขาชี้ไปยังสะพานบนแผนที่ แล้วเงยหน้าขึ้นรอคำตอบจากคุณ'},{type:'dialogue',name:profile.name,text:'ระหว่างนี้พักให้เต็มที่เถอะ คืนนี้ยังมีเวลาอีกมาก'}];
const photo=await croppedPortrait(await (await fetch(new URL('./assets/sample-character.jpg',import.meta.url))).blob(),{x:50,y:50,zoom:1});
const photoUrl=URL.createObjectURL(photo);
const appearance=()=>Object.fromEntries([...document.querySelectorAll('[data-part]')].map(input=>[input.dataset.part,input.checked]));
function render(){root.replaceChildren();renderStoryBlocks(root,blocks,new Map([[profile.name.toLowerCase(),profile]]),profile.name,()=>dialog.showModal(),async()=>document.querySelector('#portrait').checked?photoUrl:null,null,appearance());}
for(const input of document.querySelectorAll('[data-part],#portrait'))input.addEventListener('change',render);
document.querySelector('#device').addEventListener('change',event=>document.querySelector('.story-surface').dataset.device=event.target.value);
render();window.originalChatPreview={ready:true,root};
