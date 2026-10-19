import {mountWorkshop,icon} from './ui.js?v=0.79.0';
import {requestDataTask} from '../task-generation.js?v=0.79.0';

// Keep the native entry points available even if optional storage cannot open.
export function mountNativeWorkshop({dock,state,owner,busy,voice}={}){
 const base=new URL('./',import.meta.url);
 let app,mounting,style,destroyed=false;
 const context=()=>{
  const c=SillyTavern.getContext(),chatId=c.getCurrentChatId?.(),identity=owner();
  return{key:chatId?`${identity||'group'}::${chatId}`:'',nonce:c.chatMetadata,label:c.characters?.[c.characterId]?.name||c.groupId||'ยังไม่ได้เปิดแชท',state:chatId?state():{},chat:c.chat};
 };
 const api={version:globalThis.TretaresiaRelease||'0.79.0',context,voice,
  async generate(args){if(busy())throw Error('รอข้อความที่กำลังเจนให้จบก่อน');return requestDataTask(SillyTavern.getContext(),args,{quietPrompt:args.prompt,responseLength:args.responseLength},{task:'Great Sage analysis'});},
  subscribe(listener){
   const c=SillyTavern.getContext(),events=[[c.eventTypes.CHAT_CHANGED,()=>listener('chat').catch(console.warn)],[c.eventTypes.MESSAGE_RECEIVED,()=>listener('reply').catch(console.warn)]];
   for(const [type,fn]of events)c.eventSource.on(type,fn);
   return()=>{for(const [type,fn]of events)c.eventSource.removeListener(type,fn);};
  },
 };
 const ensure=()=>{
  if(destroyed)return Promise.reject(Error('ปิด Workshop แล้ว'));
  if(app)return Promise.resolve(app);
  return mounting||= (async()=>{
   style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../../styles/workshop.css?v=0.79.0',base);
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('โหลดหน้าตา Workshop ไม่สำเร็จ')),15000);
    style.onload=()=>{clearTimeout(timer);resolve();};style.onerror=()=>{clearTimeout(timer);reject(Error('โหลดหน้าตา Workshop ไม่สำเร็จ'));};document.head.append(style);
   });
   const mounted=await mountWorkshop({api,dock,base});
   if(destroyed){mounted.destroy();throw Error('ปิด Workshop แล้ว');}
   app=mounted;globalThis.RoleForgeWorkshop=app;return app;
  })().catch(error=>{style?.remove();throw error;}).finally(()=>{mounting=null;});
 };
 const open=()=>void ensure().then(value=>value.open()).catch(error=>globalThis.toastr?.error(error.message,'RoleForge Workshop'));
 const launch=document.createElement('button');launch.type='button';launch.className='menu_button rfws-launcher';launch.id='rfws-open-workshop';launch.innerHTML=icon('workshop')+'<span>RoleForge Workshop</span><small>BETA</small>';launch.onclick=open;
 document.querySelector('#tretaresia-rpg-settings .rf-settings-quick-actions')?.after(launch);
 const wand=document.createElement('div');wand.className='list-group-item flex-container flexGap5 interactable';wand.id='rfws-workshop-wand';wand.tabIndex=0;wand.setAttribute('role','button');wand.innerHTML='<i class="fa-solid fa-hammer extensionsMenuExtensionButton" aria-hidden="true"></i><span>RoleForge Workshop <small>Beta</small></span>';
 wand.onclick=()=>{document.querySelector('#extensionsMenuButton')?.click();open();};wand.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();wand.click();}};document.getElementById('extensionsMenu')?.append(wand);
 // Restore installed addon shortcuts without requiring the user to open Workshop.
 void ensure().catch(error=>console.warn('[RoleForge] Workshop preparation failed',error));
 return{open,destroy(){destroyed=true;app?.destroy();style?.remove();launch.remove();wand.remove();if(globalThis.RoleForgeWorkshop===app)delete globalThis.RoleForgeWorkshop;}};
}
