import {normalizeStoryRuntime,storyFlagKey} from './story-core.js?v=0.96.0';
const safe=id=>typeof id==='string'&&!['constructor','prototype','__proto__'].includes(id)&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/u.test(id);
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const escape=v=>String(v??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function campaignMenu(raw){
 if(raw?.format!=='roleforge-campaign-menu'||raw.version!==1||!safe(raw.packId)||!Array.isArray(raw.options)||!raw.options.length||raw.options.length>32)return null;
 const ids=new Set(),options=[];
 for(const r of raw.options){
  if(!safe(r.id)||ids.has(r.id)||!text(r.label,120))return null;ids.add(r.id);
  const versions=Object.fromEntries(Object.entries(r.versions||{}).filter(([id,value])=>safe(id)&&safe(value)).slice(0,1000));
  options.push({id:r.id,label:text(r.label,120),description:text(r.description,2400),versions});
 }
 return{packId:raw.packId,title:text(raw.title,120)||'Campaign',options};
}
export function selectedCampaign(state,menu){return menu?.options.find(r=>r.id===state.storyMissions?.flags?.[storyFlagKey(menu.packId,'continuity')])||null;}
export function applyCampaign(state,menu,routeId,mode,{npcs=[]}={}){
 const route=menu?.options.find(r=>r.id===routeId);if(!route||!['canon','free'].includes(mode))throw Error('Invalid campaign selection');
 if(selectedCampaign(state,menu))throw Error('This chat already has a campaign. Start a new chat to change continuity. / แชทนี้เลือกฉบับแล้ว เริ่มแชทใหม่เพื่อเปลี่ยนฉบับ');
 if(state.storyMissions?.instances?.some(i=>i.packId===menu.packId))throw Error('This campaign already has progress.');
 const next=structuredClone(state);next.storyMissions=normalizeStoryRuntime(next.storyMissions);
 next.storyMissions.flags[storyFlagKey(menu.packId,'continuity')]=route.id;next.storyMissions.flags[storyFlagKey(menu.packId,'mode')]=mode;
 const records=new Map([...npcs,...(next.npcs||[])].map(n=>[n.id,n]));
 for(const [id,version]of Object.entries(route.versions)){
  const record=records.get(id);if(!record?.alternateProfiles?.some(v=>v.id===version))continue;
  const visible=next.npcs?.find(n=>n.id===id);if(visible)visible.activeAlternateId=version;
  // Author archives remain shared and unchanged. An unloaded dossier gets only
  // a compact chat-local selection delta, never a copy of its portraits/body.
  if(next.npcScopes?.format===2&&record.npcScope==='character'){
   next.npcScopes.overrides||={};next.npcScopes.bases||={};
   next.npcScopes.overrides[id]={...next.npcScopes.overrides[id],activeAlternateId:version};
   next.npcScopes.bases[id]={...next.npcScopes.bases[id],activeAlternateId:record.activeAlternateId||''};
  }
 }
 return next;
}
export function campaignInstruction(state,menu){
 const route=selectedCampaign(state,menu);if(!route)return menu?'CAMPAIGN NOT SELECTED: ask the player to select a source continuity and mode. Do not start source events, grant a notebook or invent the player’s biography.':'';
 const mode=state.storyMissions.flags[storyFlagKey(menu.packId,'mode')];
 return 'CARD CAMPAIGN — '+JSON.stringify({continuity:route.id,label:route.label,mode,scope:route.description})+'\nUse only this continuity. Inactive alternate dossiers and future chapters are private references, not current events or character knowledge. Do not cross over film, manga, anime, novel, pilot or game plot/rules. The player may decline quests and change canon outcomes; follow actual consequences without forcing repairs. Free mode does not offer source chapters automatically. NPC relationships, notebook possession, eyes and access to names require actual roleplay. Never alter campaign flags or activeAlternateId through model patches.';
}
export function mountCardCampaign(api){
 let root,busy=false,dialogTicket=null;
 const t=(en,th)=>api.language()==='th'?th:en;
 const current=()=>campaignMenu(api.menu());
 const button=document.createElement('button');button.type='button';button.className='menu_button';button.id='rf-card-campaign-open';
 button.innerHTML='<i class="fa-solid fa-book-open" aria-hidden="true"></i> <span>Campaign</span>';
 document.querySelector('#tretaresia-rpg-settings .rf-settings-quick-actions')?.after(button);
 const wand=document.createElement('div');wand.id='rf-card-campaign-wand';wand.className='list-group-item flex-container interactable';wand.tabIndex=0;wand.setAttribute('role','button');wand.innerHTML='<i class="fa-solid fa-book-open extensionsMenuExtensionButton" aria-hidden="true"></i> <span>Campaign</span>';document.getElementById('extensionsMenu')?.append(wand);
 const style=document.createElement('style');style.textContent=`
 .rf-card-campaign{width:min(880px,94vw);max-height:90dvh;box-sizing:border-box;padding:0;color:#e7e1d4;border:1px solid #564b33;border-radius:12px;background:#171715;box-shadow:0 24px 100px #000b;text-align:left;font:14px/1.65 var(--mainFontFamily,sans-serif)}
 .rf-card-campaign::backdrop{background:#000a;backdrop-filter:blur(5px)}.rf-card-campaign header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #c7ac6b33}.rf-card-campaign h2{font:26px/1.3 Georgia,serif;margin:0;color:#e5cf91}.rf-card-campaign header button{border:0;background:none;color:inherit;font-size:24px;padding:6px 12px}.rf-card-campaign form{padding:20px 24px;overflow:auto;max-height:72dvh}.rf-card-campaign label{display:block;margin-bottom:14px}.rf-card-campaign select{width:100%;min-height:46px;margin-top:6px;background:#24241f;color:inherit;border:1px solid #c7ac6b55;border-radius:6px;padding:8px}.rf-card-campaign p{color:#bab7ac;overflow-wrap:anywhere}.rf-card-campaign [type=submit]{width:100%;min-height:46px;background:#d0b578;color:#171715;border:0;border-radius:6px;margin-top:16px;font-weight:600}.rf-card-campaign [role=status]{color:#d0b578}.rf-card-campaign [data-campaign-active]{border-left:2px solid #c7ac6b;padding-left:14px}
 @media(max-width:600px){.rf-card-campaign{width:100vw;height:100dvh;max-height:100dvh;max-width:100vw;margin:0;border-radius:0}.rf-card-campaign form{max-height:calc(100dvh - 110px);padding:20px}.rf-card-campaign header{padding:20px}.rf-card-campaign h2{font-size:24px}}
 `;document.head.append(style);
 function close(){if(!busy)root?.close();}
 function open(){
  const menu=current();if(!menu)return;
  root?.remove();root=document.createElement('dialog');root.id='roleforge-card-campaign';root.className='rf-card-campaign';
  const selected=selectedCampaign(api.state(),menu);
  root.innerHTML=`<header><h2>${escape(menu.title)}</h2><button type="button" data-campaign-close aria-label="${t('Close','ปิด')}">×</button></header><form><label>${t('Source continuity','ฉบับเนื้อเรื่อง')}<select name="route" ${selected?'disabled':''}>${menu.options.map(r=>`<option value="${escape(r.id)}" ${r.id===selected?.id?'selected':''}>${escape(r.label)}</option>`).join('')}</select></label><p data-campaign-scope></p><label>${t('Play style','รูปแบบการเล่น')}<select name="mode" ${selected?'disabled':''}><option value="canon">${t('Follow the story · optional missions','ตามเนื้อเรื่อง · เลือกปฏิเสธภารกิจได้')}</option><option value="free">${t('Free play · no automatic story missions','อิสระ · ไม่เปิดเควสต้นฉบับอัตโนมัติ')}</option></select></label><p>${t('Your choices may change the story. The selected continuity stays with this chat. No notebook or eyes are granted.','การตัดสินใจของคุณเปลี่ยนเรื่องได้ ฉบับที่เลือกผูกกับแชทนี้ การเลือกไม่ให้สมุดหรือดวงตาฟรี')}</p>${selected?`<p data-campaign-active>${t('Selected for this chat. Start a new chat to choose another source.','เลือกฉบับสำหรับแชทนี้แล้ว เริ่มแชทใหม่หากต้องการเปลี่ยนฉบับ')}</p>`:`<button type="submit">${t('Choose this campaign','เลือกเส้นเรื่องนี้')}</button>`}<p role="status"></p></form>`;
  const form=root.querySelector('form'),description=root.querySelector('[data-campaign-scope]'),captured=api.ticket();dialogTicket=captured;
  const describe=()=>{description.textContent=menu.options.find(r=>r.id===form.elements.route.value)?.description||'';};describe();form.elements.route.onchange=describe;
  if(selected)form.elements.mode.value=api.state().storyMissions.flags[storyFlagKey(menu.packId,'mode')]||'canon';
  root.querySelector('[data-campaign-close]').onclick=close;root.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  form.onsubmit=async event=>{
   event.preventDefault();if(busy)return;busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;
   try{
    if(api.busy?.())throw Error(t('Wait for the current reply.','รอข้อความที่กำลังเจนก่อน'));
    await api.beforeMutation?.();if(!api.valid(captured))throw Error('Chat changed');
    const option=menu.options.find(r=>r.id===form.elements.route.value);
    const npcs=await api.loadNpcs(Object.keys(option.versions));if(!api.valid(captured))throw Error('Chat changed');
    const next=applyCampaign(api.state(),menu,option.id,form.elements.mode.value,{npcs});
    if(await api.persist(next)===false)throw Error('Campaign could not be saved');
    if(!api.valid(captured))return;root.close();api.refresh?.();
   }catch(e){root.querySelector('[role=status]').textContent=e.message;}finally{busy=false;submit.disabled=false;}
  };
  document.body.append(root);root.showModal();
 }
 function refresh(){const menu=current();button.hidden=wand.hidden=!menu;if(!menu||dialogTicket&&!api.valid(dialogTicket))root?.close();}
 button.onclick=open;wand.onclick=()=>{document.querySelector('#extensionsMenuButton')?.click();open();};wand.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();wand.click();}};
 refresh();return{open,refresh,needed:()=>Boolean(current()&&!selectedCampaign(api.state(),current())),instruction:()=>campaignInstruction(api.state(),current())};
}
