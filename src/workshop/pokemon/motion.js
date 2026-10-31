import {battleSteps,drawStep,undrawStep,stepDuration} from './battle-vfx.js?v=0.94.2';
// Presentation only: descriptors are derived from a successfully saved game.
export function motionSequence(before,after,event,dex){
 if(!before||!after||!event)return [];
 const start=before.battle,end=after.battle,result=[];
 if(!start&&end)result.push({kind:'encounter',battle:end});
 if(start&&event.type==='catch'){
  const caught=Boolean(after.pokemon?.[event.id]);
  // The ball wobbles three times before it clicks; a breakout comes after one to three.
  const seed=[...String(event.id||'')].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7),wild=start.wild||{};
  result.push({kind:caught?'caught':'escaped',battle:start,ball:event.ball||'poke-ball',storage:caught?(after.box?.includes(event.id)?'box':'party'):'',shakes:caught?3:1+seed%3,name:wild.nickname||dex?.get?.(wild.key)?.name||''});
 }
 if(start&&!end&&event.type!=='catch'){
  const last=after.logs?.at(-1)?.key;
  if(last==='run')result.push({kind:'run',battle:start});
  else if(last==='victory'||last==='trainer-victory'||after.wins>before.wins)result.push({kind:'victory',battle:start});
  else if(last==='defeat'||event.type==='forfeit')result.push({kind:'defeat',battle:start});
 }
 if(start&&end&&event.type==='attack'&&event.transform)result.push({kind:'transform',battle:end,side:'ally',system:event.transform.kind});
 if(start&&end&&event.type==='attack')result.push({kind:'attack',battle:end});
 if(start&&end&&event.type==='switch'&&start.activeUid!==end.activeUid)result.push({kind:'switch',battle:end});
 if(start&&!end&&event.type==='catch'&&!after.pokemon?.[event.id]&&after.logs?.some((v,i)=>i>=Math.max(0,after.logs.length-5)&&v.key==='defeat'))result.push({kind:'defeat',battle:start});
 const steps=battleSteps(before,after,event,dex).map(step=>({...step,vfx:true}));
 if(!steps.length)return result;
 const fainted=side=>steps.some(v=>v.kind==='faint'&&v.side===side);
 const kept=result.filter(v=>!(v.kind==='attack'&&steps.some(s=>s.kind==='hit'))&&!(v.kind==='switch'&&steps.some(s=>s.kind==='recall'))&&!(v.kind==='victory'&&fainted('foe'))&&!(v.kind==='defeat'&&fainted('ally'))&&!(v.kind==='encounter'&&end?.trainer));
 // Entrance and transformations first, then a thrown ball, then the turn it caused.
 const first=['encounter','transform','caught','escaped'];
 return [...first.flatMap(kind=>kept.filter(v=>v.kind===kind)),...steps,...kept.filter(v=>!first.includes(v.kind))];
}
export function mountPokemonMotion({arena,language,onStep=()=>{}}){
 let timer=0,queue=[],done=null,generation=0,stage=null,controls=null,locked=[],drawn=null,styled=[],pending=[];
 const ballUrl=ball=>new URL('assets/items/'+ball+'.png',import.meta.url).href;
 function clear(){for(const n of locked)n.disabled=false;locked=[];clearTimeout(timer);timer=0;for(const id of pending)clearTimeout(id);pending=[];for(const n of styled){n.style.animationDelay='';n.style.animationDuration='';}styled=[];queue=[];generation++;if(stage){stage.classList.remove('pkm-inline','pkm-encounter','pkm-caught','pkm-escaped','pkm-victory','pkm-defeat','pkm-run','pkm-switch','pkm-attack','pkm-transform');stage.removeAttribute('data-pkm-kind');stage.removeAttribute('data-pkm-system');}controls?.remove();if(drawn){undrawStep(drawn);drawn=null;}stage=null;controls=null;if(done){const resolve=done;done=null;resolve();}}
 function next(own){if(own!==generation)return;const item=queue.shift();if(!item){clear();return;}onStep(item);stage=arena();if(!stage){clear();return;}stage.classList.add('pkm-inline','pkm-'+item.kind);stage.dataset.pkmKind=item.kind;
  const container=document.createElement('div');controls=container;container.className='pkm-inline-controls';container.setAttribute('aria-hidden','true');
  if(item.kind==='transform'){const ring=document.createElement('span');ring.className='pkm-transform-ring';container.append(ring);const particles=document.createElement('span');particles.className='pkm-transform-particles';container.append(particles);stage.dataset.pkmSystem=item.system||'mega';}
  let duration=item.vfx?stepDuration(item):1900;
  if(item.kind==='caught'||item.kind==='escaped'){const ball=document.createElement('img');ball.className='pkm-inline-ball';ball.alt='';ball.src=new URL('assets/items/'+(item.ball||'poke-ball')+'.png',import.meta.url).href;ball.onerror=()=>{ball.onerror=null;ball.src=new URL('assets/items/poke-ball.png',import.meta.url).href;};container.append(ball);const sparks=document.createElement('span');sparks.className='pkm-inline-sparks';sparks.textContent='✦ ✧ ✦';container.append(sparks);
   duration=catchScene(stage,container,ball,sparks,item,own);}
  for(const n of stage.closest('dialog')?.querySelectorAll('.pk-battle-console button:not(:disabled),.pk-battle-footer button:not(:disabled)')||[]){n.disabled=true;locked.push(n);}stage.append(container);if(item.vfx)drawn=drawStep(stage,item,{ballUrl,language});if(item.vfx&&item.kind==='hit'&&item.damage>0)haptic(item.crit?[18,30,18]:14);if(item.kind==='faint')haptic([30,60,30]);
  timer=setTimeout(()=>{stage?.classList.remove('pkm-'+item.kind);controls?.remove();controls=null;if(drawn){undrawStep(drawn);drawn=null;}next(own);},duration);
 }
 // Throw, then 1-2-3 wobbles with a pause between each, then a click or a
 // breakout. No caption: the ball itself shows the result.
 // The CSS throw stays; its built-in shake is switched off so the rhythm is scripted.
 function catchScene(stage,container,ball,sparks,item,own){
  const shakes=Math.max(0,Math.min(3,item.shakes??3)),first=1250,gap=950,end=first+shakes*gap,foe=stage.querySelector('.pk-foe-art');
  ball.style.animationIterationCount='1,0,1';ball.style.animationDelay='0s,0s,'+(end+120)/1000+'s';ball.style.transformOrigin='50% 85%';
  if(foe){foe.style.animationDelay='.6s,'+(end+80)/1000+'s';styled.push(foe);}
  sparks.style.animationDelay=(end+150)/1000+'s';
  for(const plate of stage.querySelectorAll('.pk-battle-status')){plate.style.animationDuration=(end+1500)/1000+'s';styled.push(plate);}
  const at=(ms,fn)=>{const id=setTimeout(()=>{if(own===generation)fn();},ms);pending.push(id);};
  for(let i=0;i<shakes;i++)at(first+i*gap,()=>{ball.animate?.({rotate:['0deg','-26deg','20deg','-9deg','0deg']},{duration:560,easing:'ease-in-out'});haptic(12);});
  at(end,()=>{
   if(item.kind==='caught'){ball.animate?.([{scale:1,filter:'brightness(1)'},{scale:1.18,filter:'brightness(1.4)'},{scale:1,filter:'brightness(.6)'}],{duration:420,fill:'forwards'});haptic([18,40,30]);}
   else{ball.animate?.([{scale:1,opacity:1},{scale:1.5,opacity:0}],{duration:260,fill:'forwards'});haptic(40);}});
  return end+1700;
 }
 function haptic(pattern){try{if(document.getElementById('roleforge-pokemon')?.dataset.pkHaptics!=='off')navigator.vibrate?.(pattern);}catch{}}
 const keydown=event=>{if(stage&&event.key==='Escape'){event.preventDefault();event.stopPropagation();clear();}};document.addEventListener('keydown',keydown,true);
 return {playing:()=>Boolean(stage),play(items){if(!items.length||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();clear();queue=items;const own=generation;return new Promise(resolve=>{done=resolve;next(own);});},cancel:clear,destroy(){clear();document.removeEventListener('keydown',keydown,true);}};
}
