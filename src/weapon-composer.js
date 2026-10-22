import {weaponCategory} from './weapon-catalog.js?v=0.84.0';
import {equippedWeapon,ownedWeaponViews,weaponReserve} from './weapon-core.js?v=0.84.0';
import {createWeaponArt} from './weapon-art.js?v=0.84.0';

const esc=v=>String(v??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createWeaponComposer({document:doc=globalThis.document,dock,settings=()=>({}),preset=()=>({}),configure=()=>{},act=async()=>{},busy=()=>false}={}){
 const root=doc.createElement('section');root.className='rf-weapon-composer';
 root.innerHTML='<header class="rf-ability-heading"><span data-weapon-heading></span><div><button type="button" class="rf-ability-button" data-weapon-config><i class="fa-solid fa-gear" aria-hidden="true"></i></button><button type="button" class="rf-ability-button" data-weapon-minimize>−</button></div></header><div class="rf-weapon-body"><div class="rf-weapon-title"><div><small data-weapon-category></small><strong data-weapon-name></strong></div><span data-weapon-condition></span></div><div class="rf-weapon-main"><div class="rf-weapon-stage"><img class="rf-weapon-image" alt=""></div><div class="rf-weapon-counter"><small data-weapon-resource-label></small><strong data-weapon-count></strong><span data-weapon-count-note></span></div></div><div class="rf-weapon-foot"><span data-weapon-reserve></span><span data-weapon-state></span></div><div class="rf-weapon-actions"></div><p class="rf-weapon-feedback" role="status" hidden></p></div>';
 const q=s=>root.querySelector(s),text=(s,v)=>{const el=q(s);if(el.textContent!==v)el.textContent=v;},t=(th,en)=>settings().language==='th'?th:en;
 let art=null,state=null,scope='',fingerprint='',working=false,request=0;
 const remove=()=>{art?.destroy();art=null;dock.remove('weapons');fingerprint='';};
 function render(){
  if(!scope||!state||!settings().enableWeapons){remove();return;}
  const view=equippedWeapon(state,preset());
  // An empty state still offers the manager; it never grants a sample weapon.
  const mark=JSON.stringify([scope,view,view?weaponReserve(state,view):null,settings().language,busy(),working]);if(mark===fingerprint)return;fingerprint=mark;
  const category=weaponCategory(view?.category),disabled=busy()||working;
  text('[data-weapon-heading]',t('อาวุธ','Weapons'));q('[data-weapon-config]').setAttribute('aria-label',t('จัดการอาวุธและกระสุน','Manage weapons and ammunition'));q('[data-weapon-minimize]').setAttribute('aria-label',t('ย่อหน้าต่างอาวุธ','Minimize weapons'));
  text('[data-weapon-category]',view?(settings().language==='th'?category.th:category.en):t('อาวุธที่สวมใส่','EQUIPPED WEAPON'));
  text('[data-weapon-name]',view?.name||t('ยังไม่ได้เลือกอาวุธ','No weapon equipped'));
  text('[data-weapon-condition]',view?.condition||'');
  q('.rf-weapon-main').hidden=!view;q('.rf-weapon-foot').hidden=!view;q('.rf-weapon-main').classList.toggle('is-counterless',view?.mode==='none');q('.rf-weapon-counter').hidden=view?.mode==='none';
  if(view){
   if(!art)art=createWeaponArt({stage:q('.rf-weapon-stage'),image:q('.rf-weapon-image'),document:doc});
   art.update(view);
   const count=view.mode==='none'?t('พร้อม','READY'):view.mode==='quantity'?String(view.quantity):`${view.current??'—'} / ${view.capacity??'—'}`;
   const labels={magazine:t('บรรจุแล้ว','LOADED'),rounds:t('บรรจุแล้ว','LOADED'),arrows:t('ลูกธนูพร้อมยิง','NOCKED'),energy:t('พลังงาน','ENERGY'),quantity:t('จำนวน','QUANTITY'),charges:t('จำนวนครั้ง','CHARGES'),none:t('สถานะ','STATUS')};
   text('[data-weapon-resource-label]',labels[view.mode]);text('[data-weapon-count]',count);
   text('[data-weapon-count-note]',view.mode!=='none'&&view.mode!=='quantity'&&(view.current===null||view.capacity===null)?t('ยังไม่ทราบค่า','Unknown values'):t('อาวุธที่มีอยู่จริง','Owned inventory item'));
   const reserve=weaponReserve(state,view),usesAmmo=['magazine','rounds','arrows','energy'].includes(view.mode),known=Boolean(view.ammoType||view.ammoItemId);
   text('[data-weapon-reserve]',usesAmmo?known?`${t('สำรอง','RESERVE')} · ${reserve.units} ${reserve.kind==='packs'?t('แพ็ก','packs'):t('ลูก','rounds')}${reserve.kind==='packs'?` · ${reserve.rounds} ${t('ลูก/หน่วย','rounds/units')}`:''}`:t('สำรอง · ยังไม่กำหนดชนิดกระสุน','RESERVE · ammo type unknown'):view.mode==='quantity'?t('จำนวนตรงกับ Inventory','Quantity follows Inventory'):t('ไม่กำหนดค่าใช้จ่ายเพิ่ม','Costs follow world rules'));
   text('[data-weapon-state]',view.active?t('กำลังใช้พลัง','POWER ACTIVE'):t('สวมใส่อยู่','EQUIPPED'));root.classList.toggle('is-active',view.active);
   const buttons=[['use',t('ใช้อาวุธ','Use')],...(usesAmmo?[['reload',t('บรรจุ','Reload')]]:[]),...(['excalibur','ea','excalibur-morgan'].includes(view.modelId)?[[view.active?'deactivate':'activate',view.active?t('พักพลัง','Power down'):t('ปลดปล่อย','Unleash')]]:[]),['describe',t('ตรวจดู','Inspect')]];
   q('.rf-weapon-actions').innerHTML=buttons.map(([id,label])=>`<button type="button" class="rf-ability-button" data-weapon-action="${id}"${disabled?' disabled':''}>${esc(label)}</button>`).join('');
  }else{
   art?.destroy();art=null;root.classList.remove('is-active');
   q('.rf-weapon-actions').innerHTML=`<button type="button" class="rf-ability-button" data-weapon-config>${esc(t('เลือกจาก Inventory','Choose from Inventory'))}</button><small>${esc(t('ต้องมีอาวุธในคลังก่อน · ไม่มีการเพิ่มของตัวอย่าง','Requires an owned weapon. No sample items are added.'))}</small>`;
  }
  dock.panel('weapons',root,{label:t('อาวุธ','Weapons'),busy:working});
 }
 root.addEventListener('click',async e=>{
  if(e.target.closest('[data-weapon-minimize]')){dock.minimize('weapons');return;}
  if(e.target.closest('[data-weapon-config]')){configure();return;}
  const button=e.target.closest('[data-weapon-action]'),weapon=state&&equippedWeapon(state,preset());if(!button||!weapon||busy()||working)return;
  const captured=scope,id=++request;working=true;const feedback=q('.rf-weapon-feedback');feedback.hidden=true;render();
  try{const ok=await act(weapon.itemId,button.dataset.weaponAction);if(ok===false)throw Error(t('ส่งคำขอไม่สำเร็จ ลองใหม่ได้','Unable to send the action. Try again.'));}
  catch(error){if(scope===captured&&request===id){feedback.textContent=error.message;feedback.hidden=false;}}
  finally{if(request===id){working=false;fingerprint='';render();}}
 });
 return{update(next,key){if(scope!==key){request++;working=false;remove();scope=key||'';q('.rf-weapon-feedback').hidden=true;}state=next;render();},destroy(){request++;scope='';state=null;remove();}};
}
