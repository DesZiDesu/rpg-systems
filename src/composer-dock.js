import {composerIcon} from './composer-icons.js?v=0.96.0';
// A single placement owner. Tabs appear only when several windows are open;
// collapsing never discards a panel, a draft, or an in-flight task.
export function createComposerDock({document:doc=globalThis.document,language=()=> 'en'}={}){
 const win=doc.defaultView,panels=new Map(),selectionHistory=[];let status=null,anchor=null,queued=false,destroyed=false,active='',collapsed=true,statusBusy='',scope='';
 const root=doc.createElement('div');root.className='rf-composer-dock';root.dataset.swipeIgnore='true';
 // The host's swipe recognizer listens on document. Stop bubbling, never the
 // browser's default scrolling: horizontal tabs and vertical panels stay native.
 const stopSwipe=e=>e.stopPropagation();
 for(const type of ['touchstart','touchmove','touchend','touchcancel','swiped','swiped-left','swiped-right','swiped-up','swiped-down'])root.addEventListener(type,stopSwipe,{passive:true});
 const nav=doc.createElement('div');nav.className='rf-dock-navigation';nav.setAttribute('role','group');
 const tabs=doc.createElement('div');tabs.className='rf-dock-tabs';tabs.setAttribute('role','tablist');
 const controls=doc.createElement('div');controls.className='rf-dock-controls';nav.append(tabs,controls);
 let tabFrame=0,revealTab=false;
 function tabLayout(reveal=false){
  if(destroyed||!root.isConnected)return;
  if(reveal){const selected=tabs.querySelector('[aria-selected="true"]');if(selected){const r=selected.getBoundingClientRect(),box=tabs.getBoundingClientRect();if(r.left<box.left+4)tabs.scrollLeft-=box.left+4-r.left;else if(r.right>box.right-4)tabs.scrollLeft+=r.right-box.right+4;}}
  const max=tabs.scrollWidth-tabs.clientWidth;tabs.dataset.overflowStart=String(tabs.scrollLeft>2);tabs.dataset.overflowEnd=String(tabs.scrollLeft<max-2);
 }
 function queueTabLayout(reveal=false){revealTab||=reveal;if(tabFrame||destroyed)return;tabFrame=win.requestAnimationFrame(()=>{tabFrame=0;const pending=revealTab;revealTab=false;tabLayout(pending);});}
 tabs.addEventListener('scroll',()=>tabLayout(),{passive:true});
 const tabResize=win.ResizeObserver?new win.ResizeObserver(()=>queueTabLayout(true)):{observe(){},disconnect(){}};tabResize.observe(tabs);
 const body=doc.createElement('div');body.className='rf-dock-body';const passive=doc.createElement('div');passive.className='rf-dock-passive';
 const pickerPanel=doc.createElement('div');pickerPanel.className='rf-dock-window-picker';pickerPanel.id='rf-dock-window-picker';pickerPanel.setAttribute('role','dialog');pickerPanel.hidden=true;let pickerOpen=false;
 root.append(nav,pickerPanel,body,passive);
 const t=(th,en)=>language()==='th'?th:en;
 function closePicker(restoreFocus=false){pickerOpen=false;pickerPanel.hidden=true;root.classList.remove('is-choosing');const button=controls.querySelector('[data-dock-picker]');button?.setAttribute('aria-expanded','false');if(restoreFocus)button?.focus({preventScroll:true});}
 function paintPicker(){
  pickerPanel.replaceChildren();pickerPanel.hidden=!pickerOpen;root.classList.toggle('is-choosing',pickerOpen);controls.querySelector('[data-dock-picker]')?.setAttribute('aria-expanded',String(pickerOpen));
  pickerPanel.setAttribute('aria-label',t('เลือกหน้าต่าง','Choose a window'));
  const heading=doc.createElement('header'),title=doc.createElement('strong'),close=doc.createElement('button');title.textContent=t('เลือกหน้าต่าง','Choose a window');close.type='button';close.innerHTML=composerIcon('close');close.setAttribute('aria-label',t('ปิดตัวเลือกหน้าต่าง','Close window picker'));close.dataset.dockPickerClose='';close.onclick=()=>closePicker(true);heading.append(title,close);
  const list=doc.createElement('div');list.className='rf-dock-window-grid';
  for(const [id,p]of panels){const choice=doc.createElement('button'),label=doc.createElement('span');choice.type='button';choice.dataset.dockChoice=id;choice.setAttribute('aria-pressed',String(id===active));label.textContent=p.label+(p.busy?t(' · กำลังทำงาน',' · Working'):'');choice.append(label);if(id===active)choice.insertAdjacentHTML('beforeend',composerIcon('check'));choice.onclick=()=>{closePicker();select(id,true);};list.append(choice);}
  pickerPanel.append(heading,list);
 }
 pickerPanel.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;const choices=[...pickerPanel.querySelectorAll('[data-dock-choice]')],index=choices.indexOf(doc.activeElement);if(index<0)return;e.preventDefault();choices[e.key==='Home'?0:e.key==='End'?choices.length-1:(index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+choices.length)%choices.length]?.focus({preventScroll:false});});
 const outside=e=>{if(pickerOpen&&!root.contains(e.target))closePicker();};
 const escape=e=>{if(pickerOpen&&e.key==='Escape'){e.preventDefault();e.stopPropagation();closePicker(true);}};
 doc.addEventListener('pointerdown',outside);doc.addEventListener('focusin',outside);doc.addEventListener('keydown',escape);
 function activate(id){if(id!==active&&panels.has(active)){selectionHistory.push(active);if(selectionHistory.length>30)selectionHistory.shift();}active=id;}
 function select(id,focus=false){if(!panels.has(id))return;closePicker();const changed=active!==id;activate(id);collapsed=false;paint(true);if(changed)root.scrollTop=0;if(focus)tabs.querySelector(`[data-dock-panel="${id}"]`)?.focus({preventScroll:true});}
 function paint(reveal=false){if(destroyed)return;const previousActive=active;
  if(!panels.has(active)){while(selectionHistory.length&&!panels.has(active))active=selectionHistory.pop();if(!panels.has(active))active=panels.keys().next().value||'';}
  const many=panels.size>1;nav.hidden=!many&&!collapsed&&!status&&['abilities','training'].includes(active);const scroll=tabs.scrollLeft;tabs.replaceChildren();controls.replaceChildren();tabs.setAttribute('role',many?'tablist':'group');tabs.setAttribute('aria-label',t('หน้าต่างเหนือช่องพิมพ์','Windows above the message input'));nav.setAttribute('aria-label',t('แถบหน้าต่าง RoleForge','RoleForge window bar'));
  if(many){for(const [id,p]of panels){const tab=doc.createElement('button');tab.type='button';tab.className='rf-dock-tab';tab.dataset.dockPanel=id;tab.textContent=p.label+(p.busy?' · …':'');tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(active===id));tab.setAttribute('aria-controls',p.node.id);tab.tabIndex=active===id?0:-1;tab.onclick=()=>select(id,true);tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const ids=[...panels.keys()],index=ids.indexOf(id);select(e.key==='Home'?ids[0]:e.key==='End'?ids.at(-1):ids[(index+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length],true);};tab.title=p.label;tabs.append(tab);}}
  else{const label=doc.createElement('span');label.className='rf-dock-single-label';label.textContent=panels.get(active)?.label||t('สรุปความจำ','Memory summary');tabs.append(label);}
  if(status?.dataset.busy==='true'){const badge=doc.createElement('span');badge.className='rf-dock-job';badge.textContent=t('สรุป…','Summary…');badge.setAttribute('role','status');controls.append(badge);}
  if(many){
   const picker=doc.createElement('button');picker.type='button';picker.className='rf-dock-picker';picker.title=t('เลือกจากหน้าต่างทั้งหมด','Choose from all windows');picker.dataset.dockPicker='';picker.setAttribute('aria-label',t('เลือกหน้าต่างทั้งหมด','Choose from all windows')+' · '+panels.size);picker.setAttribute('aria-haspopup','dialog');picker.setAttribute('aria-controls',pickerPanel.id);
   picker.innerHTML=composerIcon('windows');
   const count=doc.createElement('small');count.textContent=String(panels.size);count.setAttribute('aria-hidden','true');
   picker.onclick=()=>{if(pickerOpen){closePicker(true);return;}pickerOpen=true;paintPicker();root.scrollTop=0;pickerPanel.querySelector('[aria-pressed=true]')?.focus({preventScroll:true});};picker.append(count);controls.append(picker);
  }
  const toggle=doc.createElement('button');toggle.type='button';toggle.className='rf-dock-collapse';toggle.dataset.dockCollapse='';toggle.textContent=collapsed?t('เปิด','Expand'):t('ย่อ','Minimize');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?t('เปิดหน้าต่างจากแถบย่อ','Expand minimized windows'):t('พับหน้าต่างทั้งหมดเหลือแถบบาง เก็บสถานะไว้','Collapse windows to a thin strip, keep state'));toggle.onclick=()=>{closePicker();collapsed=!collapsed;paint();};controls.append(toggle);
  if(!many)closePicker();paintPicker();root.classList.toggle('is-minimized',collapsed);body.hidden=collapsed||!panels.size;
  for(const [id,p]of panels){p.node.hidden=id!==active;p.node.setAttribute('role',many?'tabpanel':'region');if(p.node.parentElement!==body)body.append(p.node);}
  passive.hidden=collapsed||!status;if(status&&status.parentElement!==passive)passive.append(status);position();tabs.scrollLeft=scroll;queueTabLayout(reveal||previousActive!==active);
 }
 const styleValue=(name,value)=>{if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);};
 function position(){if(destroyed)return;if(!panels.size&&!status){root.remove();return;}
  // SillyTavern's tooltip accessibility log can contain a hidden HTML copy of
  // the host, including duplicate form IDs. Anchor to the live message input.
  const input=[...doc.querySelectorAll('#send_textarea')].find(node=>!node.closest('.ui-helper-hidden-accessible,[role="log"],template,[hidden]')&&node.getClientRects().length),next=input?.closest('#send_form')||input?.closest('form')||input?.parentElement;
  if(!input||!next?.parentElement||win.getComputedStyle(input).display==='none'||win.getComputedStyle(next).display==='none'){root.remove();return;}
  if(anchor!==next){resize.disconnect();resize.observe(next);anchor=next;}
  const style=win.getComputedStyle(next),parent=win.getComputedStyle(next.parentElement),fixed=['fixed','absolute'].includes(style.position)||(['flex','inline-flex'].includes(parent.display)&&parent.flexDirection.startsWith('row'));
  if(root.classList.contains('is-fixed')!==fixed)root.classList.toggle('is-fixed',fixed);
  if(fixed){const rect=next.getBoundingClientRect(),left=Math.max(0,rect.left);if(root.parentElement!==doc.body)doc.body.append(root);const height=win.visualViewport?.height||win.innerHeight;
   styleValue('left',`${left}px`);styleValue('width',`${Math.max(0,Math.min(rect.width,win.innerWidth-left))}px`);styleValue('bottom',`${Math.max(0,win.innerHeight-rect.top+4)}px`);styleValue('max-height',`${Math.max(65,Math.min(height*.65,rect.top-8))}px`);styleValue('z-index',String(Math.max(32,(parseInt(style.zIndex)||0)+1)));
  }else{for(const k of ['left','width','bottom','max-height','z-index'])if(root.style.getPropertyValue(k))root.style.removeProperty(k);if(root.nextElementSibling!==next)next.before(root);}
 }
 function schedule(){if(queued||destroyed)return;queued=true;queueMicrotask(()=>{queued=false;position();queueTabLayout();});}
 const resize=win.ResizeObserver?new win.ResizeObserver(schedule):{observe(){},disconnect(){}};
 const observer=new win.MutationObserver(records=>{if(records.some(r=>!root.contains(r.target)))schedule();});observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});win.addEventListener('resize',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
 return {scope(key){if(key!==scope){closePicker();scope=key;selectionHistory.length=0;collapsed=true;paint();}},panel(id,node,{label=id,busy=false,activate=false}={}){const previous=panels.get(id);if(!activate&&previous?.node===node&&previous.label===label&&previous.busy===busy){position();return;}if(!node.id)node.id='rf-dock-panel-'+id;panels.set(id,{node,label,busy});if(activate||!previous&&id==='commerce'){if(id!==active&&panels.has(active)){selectionHistory.push(active);if(selectionHistory.length>30)selectionHistory.shift();}active=id;};paint(activate||!previous);},remove(id){const p=panels.get(id);if(!p)return;p.node.remove();panels.delete(id);paint();},select:id=>{closePicker();select(id);},minimize(id){closePicker();if(panels.has(id))active=id;collapsed=true;paint();},status(node){if(status===node&&statusBusy===node.dataset.busy){position();return;}status=node;statusBusy=node.dataset.busy;paint();},removeStatus(node){if(status===node){status.remove();status=null;paint();}},refresh:position,destroy(){destroyed=true;if(tabFrame)win.cancelAnimationFrame(tabFrame);tabResize.disconnect();observer.disconnect();resize.disconnect();doc.removeEventListener('pointerdown',outside);doc.removeEventListener('focusin',outside);doc.removeEventListener('keydown',escape);win.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);root.remove();}};
}
