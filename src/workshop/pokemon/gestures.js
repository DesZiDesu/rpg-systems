// Touch gestures for the full Pokémon window on phones: swipe sideways on a
// page to move between tabs, and pull the red header down to close. Taps,
// vertical scrolling and anything that scrolls sideways itself are left alone.
const SIDEWAYS='.pk-pockets,.pk-dex-mode,.pk-image-mode,.pk-region-tabs,.pk-arena,.pk-battle-console,input,select,textarea,[type=range],.pk-storage-bar,.pk-evo-scene';
export function attachPokemonGestures(root,{next,close,haptic=()=>{}}){
 let start=null,pull=null;
 const coarse=()=>window.matchMedia?.('(pointer: coarse)').matches;
 function down(e){if(!coarse()||e.touches.length!==1)return;const t=e.touches[0],target=e.target;
  if(target.closest?.('.pk-header')&&!target.closest('button')){pull={y:t.clientY,shell:root.querySelector('.pk-shell'),dy:0};return;}
  if(target.closest?.('.pk-main')&&!target.closest(SIDEWAYS))start={x:t.clientX,y:t.clientY,at:performance.now()};}
 function move(e){if(!pull)return;const dy=Math.max(0,e.touches[0].clientY-pull.y);pull.dy=dy;if(pull.shell){pull.shell.style.transition='none';pull.shell.style.transform='translateY('+Math.round(dy*.6)+'px)';pull.shell.style.opacity=String(Math.max(.4,1-dy/500));}}
 function up(e){
  if(pull){const {shell,dy}=pull;pull=null;if(shell){shell.style.transition='transform .28s cubic-bezier(.34,1.56,.64,1),opacity .2s';shell.style.transform='';shell.style.opacity='';setTimeout(()=>{shell.style.transition='';},300);}if(dy>110){haptic(10);close();}return;}
  if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y,fast=performance.now()-start.at<650;start=null;
  if(fast&&Math.abs(dx)>70&&Math.abs(dy)<Math.abs(dx)*.5&&!getSelection?.()?.toString()){if(next(dx<0?1:-1))haptic(8);}
 }
 root.addEventListener('touchstart',down,{passive:true});root.addEventListener('touchmove',move,{passive:true});root.addEventListener('touchend',up,{passive:true});root.addEventListener('touchcancel',()=>{start=null;if(pull?.shell){pull.shell.style.transform='';pull.shell.style.opacity='';}pull=null;},{passive:true});
 return ()=>{root.removeEventListener('touchstart',down);root.removeEventListener('touchmove',move);root.removeEventListener('touchend',up);};
}
