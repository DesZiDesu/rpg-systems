import {mountSettingsNavigation} from '../../../src/settings-navigation.js';
const root=document.getElementById('tretaresia-rpg-settings');
const navigation=mountSettingsNavigation(root,{language:()=> 'th'});
// This exported preview has no application, storage or API handlers.
// Only navigation is live; production save handlers are checked separately.
const notice=document.createElement('p');
notice.className='review-note';
notice.textContent='พรีวิวการจัดหน้า · ลองค้นหา เปิดหน้า และย้อนกลับได้ · ไม่บันทึกค่าจริง';
root.querySelector('.rf-settings-content').prepend(notice);
const language=document.getElementById('tretaresia-rpg-language');
language.disabled=true;language.title='พรีวิวนี้ใช้ภาษาไทย';
let timeout;
function inform(){
 const toast=document.querySelector('.review-toast');
 toast.textContent='พรีวิวนี้ใช้ตรวจการจัดหน้าเท่านั้น การบันทึกและ Import/Export ทำงานในส่วนเสริมจริง';
 toast.hidden=false;clearTimeout(timeout);timeout=setTimeout(()=>{toast.hidden=true;},3500);
}
root.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();inform();},true);
root.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(!button||button.matches('[data-rf-settings-open],[data-rf-settings-back],[data-rf-settings-clear]'))return;
 event.preventDefault();event.stopPropagation();inform();
},true);
root.querySelector('.inline-drawer-header').addEventListener('click',()=>{
 const content=root.querySelector('.inline-drawer-content');
 content.hidden=!content.hidden;
 content.style.display=content.hidden?'none':'block';
});
// The snapshot includes the existing sibling addons, kept separate from RoleForge.
for(const addon of document.querySelectorAll('#extensions_settings2 > details')){
 addon.addEventListener('toggle',()=>{
  if(!addon.open||addon.querySelector('.review-unsupported'))return;
  const hint=document.createElement('p');hint.className='review-unsupported';
  hint.textContent='ส่วนเสริมแยกนี้ใช้หน้าตาและตำแหน่งเดิม รอบนี้จัดเฉพาะการตั้งค่า RoleForge';
  addon.append(hint);
 });
}
navigation.home();
window.settingsDrawerPreview={navigation};
