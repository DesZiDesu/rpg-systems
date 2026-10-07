// A single placement owner. Tabs appear only when several windows are open;
// collapsing never discards a panel, a draft, or an in-flight task.
export function createComposerDock({document:doc=globalThis.document,language=()=> 'en'}={}){
 const win=doc.defaultView,panels=new Map(),selectionHistory=[];let status=null,anchor=null,queued=false,destroyed=false,active='',collapsed=true,statusBusy='',scope='';
 const root=doc.createElement('div');root.className='rf-composer-dock';
 const nav=doc.createElement('div');nav.className='rf-dock-navigation';
 const body=doc.createElement('div');body.className='rf-dock-body';const passive=doc.createElement('div');passive.className='rf-dock-passive';root.append(nav,body,passive);
 const t=(th,en)=>language()==='th'?th:en;
 function activate(id){if(id!==active&&panels.has(active)){selectionHistory.push(active);if(selectionHistory.length>30)selectionHistory.shift();}active=id;}
 function select(id,focus=false){if(!panels.has(id))return;activate(id);collapsed=false;paint();if(focus)nav.querySelector(`[data-dock-panel="${id}"]`)?.focus();}
 function paint(){if(destroyed)return;
  if(!panels.has(active)){while(selectionHistory.length&&!panels.has(active))active=selectionHistory.pop();if(!panels.has(active))active=panels.keys().next().value||'';}
  const many=panels.size>1;nav.hidden=!many&&!collapsed&&!status&&['abilities','training'].includes(active);nav.replaceChildren();nav.setAttribute('role',many?'tablist':'group');nav.setAttribute('aria-label',t('หน้าต่างเหนือช่องพิมพ์','Windows above the message input'));
  if(many){for(const [id,p]of panels){const tab=doc.createElement('button');tab.type='button';tab.className='rf-dock-tab';tab.dataset.dockPanel=id;tab.textContent=p.label+(p.busy?' · …':'');tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(active===id));tab.setAttribute('aria-controls',p.node.id);tab.tabIndex=active===id?0:-1;tab.onclick=()=>select(id,true);tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const ids=[...panels.keys()],index=ids.indexOf(id);select(e.key==='Home'?ids[0]:e.key==='End'?ids.at(-1):ids[(index+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length],true);};nav.append(tab);}}
  else{const label=doc.createElement('span');label.className='rf-dock-single-label';label.textContent=panels.get(active)?.label||t('สรุปความจำ','Memory summary');nav.append(label);}
  if(status?.dataset.busy==='true'){const badge=doc.createElement('span');badge.className='rf-dock-job';badge.textContent=t('สรุป…','Summary…');badge.setAttribute('role','status');nav.append(badge);}
  const toggle=doc.createElement('button');toggle.type='button';toggle.className='rf-dock-collapse';toggle.dataset.dockCollapse='';toggle.textContent=collapsed?t('เปิด','Expand'):t('ย่อ','Minimize');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?t('เปิดหน้าต่างจากแถบย่อ','Expand minimized windows'):t('พับหน้าต่างทั้งหมดเหลือแถบบาง เก็บสถานะไว้','Collapse windows to a thin strip, keep state'));toggle.onclick=()=>{collapsed=!collapsed;paint();};nav.append(toggle);
  root.classList.toggle('is-minimized',collapsed);body.hidden=collapsed||!panels.size;
  for(const [id,p]of panels){p.node.hidden=id!==active;p.node.setAttribute('role',many?'tabpanel':'region');if(p.node.parentElement!==body)body.append(p.node);}
  passive.hidden=collapsed||!status;if(status&&status.parentElement!==passive)passive.append(status);position();
 }
 const styleValue=(name,value)=>{if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);};
 function position(){if(destroyed)return;if(!panels.size&&!status){root.remove();return;}
  const input=doc.querySelector('#send_textarea'),next=doc.querySelector('#send_form')||input?.closest('form')||input?.parentElement;
  if(!input||!next?.parentElement||win.getComputedStyle(input).display==='none'||win.getComputedStyle(next).display==='none'){root.remove();return;}
  if(anchor!==next){resize.disconnect();resize.observe(next);anchor=next;}
  const style=win.getComputedStyle(next),parent=win.getComputedStyle(next.parentElement),fixed=['fixed','absolute'].includes(style.position)||(['flex','inline-flex'].includes(parent.display)&&parent.flexDirection.startsWith('row'));
  if(root.classList.contains('is-fixed')!==fixed)root.classList.toggle('is-fixed',fixed);
  if(fixed){const rect=next.getBoundingClientRect(),left=Math.max(0,rect.left);if(root.parentElement!==doc.body)doc.body.append(root);const height=win.visualViewport?.height||win.innerHeight;
   styleValue('left',`${left}px`);styleValue('width',`${Math.max(0,Math.min(rect.width,win.innerWidth-left))}px`);styleValue('bottom',`${Math.max(0,win.innerHeight-rect.top+4)}px`);styleValue('max-height',`${Math.max(65,Math.min(height*.65,rect.top-8))}px`);styleValue('z-index',String(Math.max(32,(parseInt(style.zIndex)||0)+1)));
  }else{for(const k of ['left','width','bottom','max-height','z-index'])if(root.style.getPropertyValue(k))root.style.removeProperty(k);if(root.nextElementSibling!==next)next.before(root);}
 }
 function schedule(){if(queued||destroyed)return;queued=true;queueMicrotask(()=>{queued=false;position();});}
 const resize=win.ResizeObserver?new win.ResizeObserver(schedule):{observe(){},disconnect(){}};
 const observer=new win.MutationObserver(records=>{if(records.some(r=>!root.contains(r.target)))schedule();});observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});win.addEventListener('resize',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
 return {scope(key){if(key!==scope){scope=key;selectionHistory.length=0;collapsed=true;paint();}},panel(id,node,{label=id,busy=false,activate=false}={}){const previous=panels.get(id);if(!activate&&previous?.node===node&&previous.label===label&&previous.busy===busy){position();return;}if(!node.id)node.id='rf-dock-panel-'+id;panels.set(id,{node,label,busy});if(activate||!previous&&id==='commerce'){if(id!==active&&panels.has(active)){selectionHistory.push(active);if(selectionHistory.length>30)selectionHistory.shift();}active=id;};paint();},remove(id){const p=panels.get(id);if(!p)return;p.node.remove();panels.delete(id);paint();},select:id=>select(id),minimize(id){if(panels.has(id))active=id;collapsed=true;paint();},status(node){if(status===node&&statusBusy===node.dataset.busy){position();return;}status=node;statusBusy=node.dataset.busy;paint();},removeStatus(node){if(status===node){status.remove();status=null;paint();}},refresh:position,destroy(){destroyed=true;observer.disconnect();resize.disconnect();win.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);root.remove();}};
}
