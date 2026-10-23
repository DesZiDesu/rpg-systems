import {localId} from '../core.js?v=0.84.1';
import {cleanPaper,PAPER_LIMITS} from './paper.js?v=0.84.1';
import {t} from './strings.js?v=0.84.1';

export function mountPaperEditor({host,paper,onChange,onError=()=>{},disabled=false}){
 let data=cleanPaper(paper),selection=null,drag=null,disposed=false;
 const page=()=>data.pages[data.active],block=id=>page().blocks.find(b=>b.id===id);
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const emit=()=>{if(!disposed)onChange(cleanPaper(data));};
 const surface=()=>host.getBoundingClientRect();
 // A dock editor can mount while another tab is active or the dock is folded.
 // Reflow existing nodes on reveal, resize and font load; never rebuild a draft.
 function reflow(){
  if(disposed||!host.clientWidth||!host.clientHeight)return;
  for(const node of host.querySelectorAll('[data-paper-block]')){
   const b=block(node.dataset.paperBlock);if(b)dimensions(node,selection?.id===b.id?{...b,...selection.draft}:b);
  }
  placeTools();
 }
 const resize=new ResizeObserver(reflow);resize.observe(host);
 const fonts=document.fonts;fonts?.addEventListener('loadingdone',reflow);fonts?.ready.then(reflow);
 function dimensions(node,b){
  const text=node.querySelector('.dn-free-content'),width=Math.max(60,host.clientWidth*(1-b.x)-20),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  text.style.fontSize=b.size+'px';ctx.font=getComputedStyle(text).font;
  const measured=Math.max(70,...String(b.text||' ').split('\n').map(line=>ctx.measureText(line).width+12));
  text.style.width=Math.min(width,measured)+'px';
  if(text.tagName==='TEXTAREA'){text.style.height='0';text.style.height=Math.min(Math.max(b.size*1.7,text.scrollHeight),Math.max(46,host.clientHeight*(1-b.y)-50))+'px';}
  node.style.left=b.x*100+'%';node.style.top=b.y*100+'%';
 }
 function placeTools(){const node=host.querySelector('.dn-free-block.is-selected'),tools=host.querySelector('.dn-free-tools');if(!node||!tools)return;tools.style.left=clamp(selection.draft.x*host.clientWidth,0,Math.max(0,host.clientWidth-205))+'px';tools.style.top=clamp(selection.draft.y*host.clientHeight+node.offsetHeight+8,0,Math.max(0,host.clientHeight-46))+'px';}
 function render(){
  host.replaceChildren();host.dataset.empty=String(!page().blocks.some(b=>b.text));
  for(const b of page().blocks){
   const selected=selection?.id===b.id,value=selected?{...b,...selection.draft}:b,node=document.createElement('div');node.className='dn-free-block'+(selected?' is-selected':'');node.dataset.paperBlock=b.id;node.tabIndex=0;node.setAttribute('aria-label',t('ข้อความบนกระดาษ'));
   const text=document.createElement(selected?'textarea':'div');text.className='dn-free-content';
   if(selected){text.value=b.text;text.maxLength=PAPER_LIMITS.text;text.readOnly=true;text.setAttribute('aria-label',t('ข้อความบนกระดาษ'));text.setAttribute('placeholder',t('พิมพ์บนกระดาษ…'));text.spellcheck=false;}else text.textContent=b.text;
   node.append(text);host.append(node);dimensions(node,value);
  }
  if(selection){
   const tools=document.createElement('div');tools.className='dn-free-tools';tools.dataset.paperTools='';
   const slider=document.createElement('input');slider.type='range';slider.min=PAPER_LIMITS.minSize;slider.max=PAPER_LIMITS.maxSize;slider.value=selection.draft.size;slider.setAttribute('aria-label',t('ขนาดตัวอักษร'));slider.dataset.paperSize='';
   const number=document.createElement('span');number.textContent=selection.draft.size;number.dataset.paperSizeValue='';tools.append(slider,number);
   for(const [action,label,symbol]of [['accept','ยืนยันย้าย','✓'],['cancel','ยกเลิกย้าย','×']]){const button=document.createElement('button');button.type='button';button.dataset.paperEdit=action;button.setAttribute('aria-label',t(label));button.title=t(label);button.textContent=symbol;tools.append(button);}
   host.append(tools);placeTools();
  }
 }
 function finish(accept){
  if(!selection)return;const b=block(selection.id);if(b&&accept)Object.assign(b,selection.draft);
  if(b&&!b.text.trim())page().blocks=page().blocks.filter(v=>v.id!==b.id);
  selection=null;drag=null;emit();render();
 }
 function select(id){selection={id,draft:{x:block(id).x,y:block(id).y,size:block(id).size}};render();}
 function edit(){const text=host.querySelector('.is-selected textarea');if(text){text.readOnly=false;text.focus();text.setSelectionRange(text.value.length,text.value.length);}}
 function add(x=.09,y=.08){
  if(disabled)return;if(page().blocks.length>=PAPER_LIMITS.blocks){onError(t('หน้านี้มีข้อความครบ 24 กล่องแล้ว'));return;}
  if(selection)finish(false);const b={id:localId(),x:clamp(x,0,.74),y:clamp(y,0,.86),size:24,text:'',submittedText:''};page().blocks.push(b);select(b.id);emit();edit();
 }
 function down(e){
  if(disabled||e.button!==0||e.target.closest('[data-paper-tools]'))return;
  const node=e.target.closest('[data-paper-block]');
  if(!node){if(e.target===host){e.preventDefault();const r=surface();add((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);}return;}
  if(e.target.tagName==='TEXTAREA'&&!e.target.readOnly)return;
  e.preventDefault();e.stopPropagation();const already=selection?.id===node.dataset.paperBlock;
  if(!already){if(selection)finish(false);select(node.dataset.paperBlock);}
  drag={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:selection.draft.x,y:selection.draft.y,moved:false,already};host.setPointerCapture(e.pointerId);
 }
 function move(e){
  if(!drag||drag.pointer!==e.pointerId||!selection)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(Math.hypot(dx,dy)<5&&!drag.moved)return;
  e.preventDefault();drag.moved=true;selection.draft.x=clamp(drag.x+dx/host.clientWidth,0,.74);selection.draft.y=clamp(drag.y+dy/host.clientHeight,0,.86);
  const node=host.querySelector('.is-selected');dimensions(node,{...block(selection.id),...selection.draft});placeTools();
 }
 function up(e){if(!drag||drag.pointer!==e.pointerId)return;const previous=drag;drag=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);if(previous.already&&!previous.moved)edit();}
 function input(e){
  if(!selection)return;
  if(e.target.matches('[data-paper-size]')){selection.draft.size=Number(e.target.value);host.querySelector('[data-paper-size-value]').textContent=e.target.value;dimensions(host.querySelector('.is-selected'),{...block(selection.id),...selection.draft});placeTools();return;}
  if(e.target.tagName==='TEXTAREA'){const b=block(selection.id),total=data.pages.flatMap(p=>p.blocks).reduce((n,v)=>n+v.text.length,0)-b.text.length+e.target.value.length;if(total>PAPER_LIMITS.characters){e.target.value=b.text;onError(t('สมุดเก็บข้อความได้ 48000 ตัวอักษร'));return;}b.text=e.target.value;emit();dimensions(host.querySelector('.is-selected'),{...b,...selection.draft});placeTools();}
 }
 function click(e){const action=e.target.closest('[data-paper-edit]');if(action){e.preventDefault();e.stopPropagation();finish(action.dataset.paperEdit==='accept');}}
 function key(e){
  if(e.key==='Escape'&&selection){e.preventDefault();e.stopPropagation();finish(false);return;}
  if(e.key==='Enter'&&e.target===host){e.preventDefault();add();return;}
  if(e.key==='Enter'&&e.target.matches('[data-paper-block]')){e.preventDefault();select(e.target.dataset.paperBlock);edit();}
 }
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['input',input],['click',click],['keydown',key]];
 for(const [event,fn]of listeners)host.addEventListener(event,fn);
 render();return {add,finish,destroy(){disposed=true;resize.disconnect();fonts?.removeEventListener('loadingdone',reflow);for(const [event,fn]of listeners)host.removeEventListener(event,fn);host.replaceChildren();},get selected(){return Boolean(selection);}};
}
