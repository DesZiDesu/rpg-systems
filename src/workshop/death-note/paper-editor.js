import {localId} from '../core.js?v=0.86.2';
import {cleanPaper,PAPER_LIMITS} from './paper.js?v=0.86.2';
import {t} from './strings.js?v=0.86.2';

export function mountPaperEditor({host,paper,onChange,onError=()=>{},disabled=false}){
 let data=cleanPaper(paper),selection=null,drag=null,tap=null,disposed=false,caretFrame=0,caretPasses=0,keyboardDock=null,restHeight=innerHeight;
 const viewport=globalThis.visualViewport;
 const mirror=document.createElement('div');mirror.setAttribute('aria-hidden','true');
 Object.assign(mirror.style,{position:'fixed',left:'-100000px',top:'0',visibility:'hidden',pointerEvents:'none',whiteSpace:'pre-wrap',overflowWrap:'anywhere'});
 const page=()=>data.pages[data.active],block=id=>page().blocks.find(b=>b.id===id);
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const emit=()=>{if(!disposed)onChange(cleanPaper(data));};
 let canvas=document.createElement('div');canvas.className='dn-paper-canvas';
 const baseHeight=()=>Math.max(host.clientHeight,host.clientWidth*1.3);
 const surface=()=>canvas.getBoundingClientRect();
 function fitCanvas(){let height=baseHeight();for(const node of canvas.querySelectorAll('[data-paper-block]'))height=Math.max(height,node.offsetTop+node.offsetHeight+(selection?64:28));canvas.style.height=Math.ceil(height)+'px';}
 function focusedText(){const text=host.querySelector('.is-selected textarea');return text&&!text.readOnly&&document.activeElement===text?text:null;}
 function clearKeyboardDock(){if(!keyboardDock)return;delete keyboardDock.dataset.dnKeyboard;for(const key of ['top','left','width','height'])keyboardDock.style.removeProperty('--dn-keyboard-'+key);keyboardDock=null;}
 function fitKeyboardDock(){
  const height=viewport?.height||innerHeight,top=viewport?.offsetTop||0,dock=host.closest('.dn-dock'),editing=dock?.contains(document.activeElement);
  if(!focusedText()&&!editing)restHeight=Math.max(restHeight,innerHeight);
  const keyboard=innerWidth<=750&&(viewport?.scale||1)<1.1&&Math.max(restHeight,innerHeight)-height>100;
  if(!keyboard||!editing||!dock){clearKeyboardDock();return;}
  keyboardDock=dock.closest('.rf-composer-dock');if(!keyboardDock)return;
  keyboardDock.dataset.dnKeyboard='true';
  for(const [key,value]of Object.entries({top:top+8,left:(viewport?.offsetLeft||0)+8,width:(viewport?.width||innerWidth)-16,height:height-16})){
   const px=Math.max(0,value)+'px';if(keyboardDock.style.getPropertyValue('--dn-keyboard-'+key)!==px)keyboardDock.style.setProperty('--dn-keyboard-'+key,px);
  }
 }
 function caretBounds(text){
  const style=getComputedStyle(text);
  for(const key of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','wordSpacing','textIndent','textTransform','tabSize','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','boxSizing','wordBreak'])mirror.style[key]=style[key];
  mirror.style.width=text.getBoundingClientRect().width+'px';
  const marker=document.createElement('span'),at=text.selectionEnd||0;marker.textContent='\u200b';
  mirror.replaceChildren(document.createTextNode(text.value.slice(0,at)),marker,document.createTextNode(text.value.slice(at)));if(!mirror.isConnected)document.body.append(mirror);
  const y=marker.getBoundingClientRect().top-mirror.getBoundingClientRect().top+text.getBoundingClientRect().top-text.scrollTop;
  return {top:y,bottom:y+(parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.65)};
 }
 function revealCaret(){
  caretFrame=0;if(disposed)return;fitKeyboardDock();const text=focusedText();if(!text)return;
  const box=host.getBoundingClientRect(),top=Math.max(box.top,viewport?.offsetTop||0)+8,bottom=Math.min(box.bottom,(viewport?.offsetTop||0)+(viewport?.height||innerHeight))-56;
  if(bottom<=top)return;
  const caret=caretBounds(text);if(caret.bottom>bottom)host.scrollTop+=caret.bottom-bottom;else if(caret.top<top)host.scrollTop-=top-caret.top;
  placeTools();
  // WebKit may apply its native focus scrolling after the resize callback.
  // Settle a bounded number of frames without trapping later manual scrolling.
  if(caretPasses-->0)caretFrame=requestAnimationFrame(revealCaret);
 }
 function scheduleCaret(){caretPasses=3;if(!disposed&&!caretFrame)caretFrame=requestAnimationFrame(revealCaret);}
 // A dock editor can mount while another tab is active or the dock is folded.
 // Reflow existing nodes on reveal, resize and font load; never rebuild a draft.
 function reflow(){
  if(disposed||!host.clientWidth||!host.clientHeight)return;
  for(const node of host.querySelectorAll('[data-paper-block]')){
   const b=block(node.dataset.paperBlock);if(b)dimensions(node,selection?.id===b.id?{...b,...selection.draft}:b);
  }
  fitCanvas();placeTools();scheduleCaret();
 }
 const resize=new ResizeObserver(reflow);resize.observe(host);
 const fonts=document.fonts;fonts?.addEventListener('loadingdone',reflow);fonts?.ready.then(reflow);
 function dimensions(node,b){
  const text=node.querySelector('.dn-free-content'),width=Math.max(60,host.clientWidth*(1-b.x)-20),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  text.style.fontSize=b.size+'px';ctx.font=getComputedStyle(text).font;
  const measured=Math.max(70,...String(b.text||' ').split('\n').map(line=>ctx.measureText(line).width+12));
  text.style.width=Math.min(width,measured)+'px';
  if(text.tagName==='TEXTAREA'){text.style.height='0';text.style.height=Math.max(b.size*1.7,text.scrollHeight)+'px';}
  node.style.left=b.x*100+'%';node.style.top=b.y*baseHeight()+'px';
 }
 function placeTools(){const node=host.querySelector('.dn-free-block.is-selected'),tools=host.querySelector('.dn-free-tools');if(!node||!tools)return;const rect=host.getBoundingClientRect(),top=host.scrollTop+Math.max(0,(viewport?.offsetTop||0)-rect.top),bottom=host.scrollTop+Math.min(host.clientHeight,(viewport?.offsetTop||0)+(viewport?.height||innerHeight)-rect.top)-46;tools.style.left=clamp(selection.draft.x*host.clientWidth,0,Math.max(0,host.clientWidth-205))+'px';tools.style.top=clamp(node.offsetTop+node.offsetHeight+8,top,Math.max(top,bottom))+'px';}

 function render(){
  canvas=document.createElement('div');canvas.className='dn-paper-canvas';canvas.style.height=baseHeight()+'px';host.replaceChildren(canvas);host.dataset.empty=String(!page().blocks.some(b=>b.text));
  for(const b of page().blocks){
   const selected=selection?.id===b.id,value=selected?{...b,...selection.draft}:b,node=document.createElement('div');node.className='dn-free-block'+(selected?' is-selected':'');node.dataset.paperBlock=b.id;node.tabIndex=0;node.setAttribute('aria-label',t('ข้อความบนกระดาษ'));
   const text=document.createElement(selected?'textarea':'div');text.className='dn-free-content';
   if(selected){text.value=b.text;text.maxLength=PAPER_LIMITS.text;text.readOnly=true;text.setAttribute('aria-label',t('ข้อความบนกระดาษ'));text.setAttribute('placeholder',t('พิมพ์บนกระดาษ…'));text.spellcheck=false;}else text.textContent=b.text;
   node.append(text);canvas.append(node);dimensions(node,value);
  }
  if(selection){
   const tools=document.createElement('div');tools.className='dn-free-tools';tools.dataset.paperTools='';
   const slider=document.createElement('input');slider.type='range';slider.min=PAPER_LIMITS.minSize;slider.max=PAPER_LIMITS.maxSize;slider.value=selection.draft.size;slider.setAttribute('aria-label',t('ขนาดตัวอักษร'));slider.dataset.paperSize='';
   const number=document.createElement('span');number.textContent=selection.draft.size;number.dataset.paperSizeValue='';tools.append(slider,number);
   for(const [action,label,symbol]of [['accept','ยืนยันย้าย','✓'],['cancel','ยกเลิกย้าย','×']]){const button=document.createElement('button');button.type='button';button.dataset.paperEdit=action;button.setAttribute('aria-label',t(label));button.title=t(label);button.textContent=symbol;tools.append(button);}
   canvas.append(tools);
  }
  fitCanvas();placeTools();
 }
 function finish(accept){
  if(!selection)return;const b=block(selection.id);if(b&&accept)Object.assign(b,selection.draft);
  if(b&&!b.text.trim())page().blocks=page().blocks.filter(v=>v.id!==b.id);
  selection=null;drag=null;tap=null;emit();render();
 }
 function select(id){selection={id,draft:{x:block(id).x,y:block(id).y,size:block(id).size}};render();}
 function edit(){const text=host.querySelector('.is-selected textarea');if(text){text.readOnly=false;text.focus({preventScroll:true});text.setSelectionRange(text.value.length,text.value.length);scheduleCaret();}}
 function add(x=.09,y=.08){
  if(disabled)return;if(page().blocks.length>=PAPER_LIMITS.blocks){onError(t('หน้านี้มีข้อความครบ 24 กล่องแล้ว'));return;}
  if(selection)finish(false);const b={id:localId(),x:clamp(x,0,.74),y:clamp(y,0,.86),size:24,text:'',submittedText:''};page().blocks.push(b);select(b.id);emit();edit();
 }
 function down(e){
  if(disabled||e.button!==0)return;
  if(e.target.closest('[data-paper-tools]')){if(e.target.closest('button'))e.preventDefault();return;}
  const node=e.target.closest('[data-paper-block]');
  if(!node){if(e.target===host||e.target===canvas){const r=surface(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/baseHeight();if(e.pointerType==='touch'){tap={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x,y};}else{e.preventDefault();add(x,y);}}return;}
  if(e.pointerType==='touch'&&selection?.id!==node.dataset.paperBlock){tap={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,id:node.dataset.paperBlock};return;}
  if(e.target.tagName==='TEXTAREA'&&!e.target.readOnly)return;
  e.preventDefault();e.stopPropagation();const already=selection?.id===node.dataset.paperBlock;
  if(!already){if(selection)finish(false);select(node.dataset.paperBlock);}
  drag={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:selection.draft.x,y:selection.draft.y,moved:false,already};host.setPointerCapture(e.pointerId);
 }
 function move(e){
  if(tap&&tap.pointer===e.pointerId){if(Math.hypot(e.clientX-tap.startX,e.clientY-tap.startY)>8)tap=null;return;}
  if(!drag||drag.pointer!==e.pointerId||!selection)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(Math.hypot(dx,dy)<5&&!drag.moved)return;
  e.preventDefault();drag.moved=true;selection.draft.x=clamp(drag.x+dx/host.clientWidth,0,.74);selection.draft.y=clamp(drag.y+dy/baseHeight(),0,.86);
  const node=host.querySelector('.is-selected');dimensions(node,{...block(selection.id),...selection.draft});fitCanvas();placeTools();
 }
 function up(e){if(tap?.pointer===e.pointerId){const previous=tap;tap=null;if(e.type!=='pointercancel'){if(previous.id){if(selection)finish(false);select(previous.id);}else add(previous.x,previous.y);}return;}if(!drag||drag.pointer!==e.pointerId)return;const previous=drag;drag=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);if(e.type!=='pointercancel'&&previous.already&&!previous.moved)edit();}
 function input(e){
  if(!selection)return;
  if(e.target.matches('[data-paper-size]')){selection.draft.size=Number(e.target.value);host.querySelector('[data-paper-size-value]').textContent=e.target.value;dimensions(host.querySelector('.is-selected'),{...block(selection.id),...selection.draft});fitCanvas();placeTools();return;}
  if(e.target.tagName==='TEXTAREA'){const b=block(selection.id),total=data.pages.flatMap(p=>p.blocks).reduce((n,v)=>n+v.text.length,0)-b.text.length+e.target.value.length;if(total>PAPER_LIMITS.characters){e.target.value=b.text;onError(t('สมุดเก็บข้อความได้ 48000 ตัวอักษร'));return;}b.text=e.target.value;emit();dimensions(host.querySelector('.is-selected'),{...b,...selection.draft});fitCanvas();placeTools();scheduleCaret();}
 }
 function click(e){const action=e.target.closest('[data-paper-edit]');if(action){e.preventDefault();e.stopPropagation();finish(action.dataset.paperEdit==='accept');}}
 function key(e){
  if(e.key==='Escape'&&selection){e.preventDefault();e.stopPropagation();finish(false);return;}
  if(e.key==='Enter'&&e.target===host){e.preventDefault();add();return;}
  if(e.key==='Enter'&&e.target.matches('[data-paper-block]')){e.preventDefault();select(e.target.dataset.paperBlock);edit();}
 }
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['input',input],['click',click],['keydown',key],['keyup',scheduleCaret],['select',scheduleCaret],['focusin',scheduleCaret],['focusout',scheduleCaret],['scroll',placeTools]];
 for(const [event,fn]of listeners)host.addEventListener(event,fn);
 document.addEventListener('selectionchange',scheduleCaret);viewport?.addEventListener('resize',scheduleCaret);viewport?.addEventListener('scroll',scheduleCaret);
 render();return {add,finish,destroy(){disposed=true;cancelAnimationFrame(caretFrame);clearKeyboardDock();mirror.remove();resize.disconnect();fonts?.removeEventListener('loadingdone',reflow);document.removeEventListener('selectionchange',scheduleCaret);viewport?.removeEventListener('resize',scheduleCaret);viewport?.removeEventListener('scroll',scheduleCaret);for(const [event,fn]of listeners)host.removeEventListener(event,fn);host.replaceChildren();},get selected(){return Boolean(selection);}};
}
