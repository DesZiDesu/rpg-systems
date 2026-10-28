// Only addons enabled in the current chat get direct shortcuts.
export function createAddonLaunchers({scene,onOpen,onLayout,menu=()=>document.getElementById('extensionsMenu')}={}){
 const rail=document.createElement('div');rail.className='rfws-addon-orbits';rail.setAttribute('aria-label','ปุ่มเปิด Addon — ลากเพื่อย้ายตำแหน่ง');rail.hidden=true;document.body.append(rail);
 const wand=new Map(),buttons=new Map();let layout={x:1,y:.72,floating:true,wand:true,deathNote:true,pokemon:true},scope='',drag=null,suppressClick=false,disposed=false,observedDock=null,frame=0,pixels=null;
 const book='<i class="fa-solid fa-book-open rfws-icon" aria-hidden="true"></i>';
 function bounds(){const visual=window.visualViewport,w=visual?.width||innerWidth,h=visual?.height||innerHeight,form=[...document.querySelectorAll('#send_textarea')].find(n=>n.getClientRects().length&&!n.closest('[hidden],.ui-helper-hidden-accessible'))?.closest('form'),dock=document.querySelector('.rf-composer-dock'),dockBox=dock?.getBoundingClientRect(),bottom=Math.min(form?.getBoundingClientRect().top||h,dockBox?.height?dockBox.top:h);return{minX:8,maxX:Math.max(8,w-76),minY:66,maxY:Math.max(66,Math.min(h-100,Number.isFinite(bottom)&&bottom>100?bottom-rail.offsetHeight-18:h-100))};}
 function paint(){frame=0;if(disposed||rail.hidden||!pixels)return;rail.style.transform=`translate3d(${pixels.x}px,${pixels.y}px,0)`;}
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 function place(){if(disposed||rail.hidden||drag?.moved)return;const b=bounds();pixels={x:Math.round(b.minX+(b.maxX-b.minX)*layout.x),y:Math.round(b.minY+(b.maxY-b.minY)*layout.y)};schedule();}
 function setPixels(x,y,b=bounds()){
  x=Math.min(b.maxX,Math.max(b.minX,x));y=Math.min(b.maxY,Math.max(b.minY,y));
  layout={...layout,x:(x-b.minX)/Math.max(1,b.maxX-b.minX),y:(y-b.minY)/Math.max(1,b.maxY-b.minY)};
  pixels={x,y};schedule();
 }
 function finish(event,cancel=false){
  if(!drag||event.pointerId!==drag.id)return;
  const previous=drag,moved=previous.moved;drag=null;rail.classList.remove('is-dragging');
  if(previous.button.hasPointerCapture(previous.id))previous.button.releasePointerCapture(previous.id);
  suppressClick=moved;if(moved)setTimeout(()=>suppressClick=false,160);
  if(cancel){layout=previous.layout;place();return;}
  if(moved&&previous.scope===scope){layout.x=layout.x<.5?0:1;place();onLayout({...layout});}
 }
 rail.addEventListener('pointerdown',e=>{
  const button=e.target.closest('[data-addon-launch]');if(!button||e.button!==0||drag)return;
  const r=rail.getBoundingClientRect();drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:r.left,y:r.top,bounds:bounds(),layout:{...layout},moved:false,scope,addon:button.dataset.addonLaunch,button};button.setPointerCapture(e.pointerId);
 });
 rail.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(Math.hypot(dx,dy)>4)drag.moved=true;
  if(drag.moved){e.preventDefault();rail.classList.add('is-dragging');setPixels(drag.x+dx,drag.y+dy,drag.bounds);}
 });
 rail.addEventListener('pointerup',e=>finish(e));rail.addEventListener('pointercancel',e=>finish(e,true));rail.addEventListener('lostpointercapture',e=>finish(e,true));
 rail.addEventListener('click',e=>{const b=e.target.closest('[data-addon-launch]');if(!b)return;if(suppressClick){suppressClick=false;e.preventDefault();return;}onOpen(b.dataset.addonLaunch);});
 rail.addEventListener('keydown',e=>{if(!e.target.closest('[data-addon-launch]'))return;const r=rail.getBoundingClientRect(),directions={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};if(!directions[e.key])return;e.preventDefault();const[dX,dY]=directions[e.key];setPixels(r.left+dX,r.top+dY);onLayout({...layout});});
 window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);
 const resize=new ResizeObserver(place);const form=document.querySelector('#send_form');if(form)resize.observe(form);
 function sync({packs=[],profile,key=''}){
  if(disposed)return;const previous=drag?.scope===key?{x:layout.x,y:layout.y}:{};scope=key;layout={x:1,y:.72,floating:true,wand:true,deathNote:true,pokemon:true,...profile?.launchers,...previous};const enabled=new Set(key&&profile?.key===key?profile.enabled:[]),active=packs.filter(p=>enabled.has(p.id)),ids=new Set(active.map(p=>p.id)),host=menu();
  if(drag&&(drag.scope!==key||!ids.has(drag.addon)||!layout.floating||drag.addon==='death-note'&&!layout.deathNote||drag.addon==='pokemon'&&!layout.pokemon)){drag=null;suppressClick=false;rail.classList.remove('is-dragging');}
  for(const[id,node]of buttons)if(!ids.has(id)){node.remove();buttons.delete(id);}
  for(const[id,node]of wand)if(!ids.has(id)||!layout.wand||id==='smartphone'&&profile?.phone?.wand===false){node.remove();wand.delete(id);}
  for(const pack of active){
   let button=buttons.get(pack.id);if(!button){button=document.createElement('button');button.type='button';button.dataset.addonLaunch=pack.id;button.className='rfws-addon-orbit';button.innerHTML=pack.id==='great-sage'?'<canvas aria-hidden="true"></canvas><span class="rfws-orbit-dot"></span>':pack.id==='death-note'?'<span class="rfws-death-note-mini" aria-hidden="true">DEATH<br>NOTE</span>':pack.id==='pokemon'?'<span class="pk-ball" aria-hidden="true"></span>':pack.id==='smartphone'?'<i class="fa-solid fa-mobile-screen" aria-hidden="true"></i>':book;rail.append(button);buttons.set(pack.id,button);if(pack.id==='great-sage')scene.attachOrb(button.querySelector('canvas'));}
   button.hidden=pack.id==='pokemon'&&!layout.pokemon||pack.id==='death-note'&&!layout.deathNote||pack.id==='smartphone'&&profile?.phone?.floating===false;button.setAttribute('aria-label','เปิด '+pack.name);button.title=pack.name+' · ลากเพื่อย้าย';button.dataset.enabled=String(enabled.has(pack.id));button.disabled=!key;
   if(host&&layout.wand&&!(pack.id==='smartphone'&&profile?.phone?.wand===false)&&!wand.has(pack.id)){
    const item=document.createElement('div');item.className='list-group-item flex-container flexGap5 interactable rfws-addon-wand';item.id='rfws-addon-wand-'+pack.id;item.tabIndex=0;item.setAttribute('role','button');item.innerHTML=(pack.id==='great-sage'?'<i class="fa-solid fa-atom extensionsMenuExtensionButton" aria-hidden="true"></i>':book)+'<span></span>';item.querySelector('span').textContent=pack.name;const open=()=>{const menuButton=document.getElementById('extensionsMenuButton');if(host.getClientRects().length)menuButton?.click();onOpen(pack.id);};item.onclick=open;item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};host.append(item);wand.set(pack.id,item);
   }
  }
  const dock=document.querySelector('.rf-composer-dock');if(dock&&dock!==observedDock){if(observedDock)resize.unobserve(observedDock);observedDock=dock;resize.observe(dock);}rail.hidden=!key||!profile||!layout.floating||!active.some(p=>(p.id!=='pokemon'||layout.pokemon)&&(p.id!=='death-note'||layout.deathNote)&&(p.id!=='smartphone'||profile?.phone?.floating!==false));place();
 }
 return{sync,rail,reset(){layout={...layout,x:1,y:.72};place();onLayout({...layout});},destroy(){disposed=true;if(frame)cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('resize',place);window.visualViewport?.removeEventListener('resize',place);for(const node of wand.values())node.remove();rail.remove();}};
}
