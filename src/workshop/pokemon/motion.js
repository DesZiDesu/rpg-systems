import {battleSteps,drawStep,undrawStep,stepDuration} from './battle-vfx.js?v=0.91.0';
// Presentation only: descriptors are derived from a successfully saved game.
export function motionSequence(before,after,event,dex){
 if(!before||!after||!event)return [];
 const start=before.battle,end=after.battle,result=[];
 if(!start&&end)result.push({kind:'encounter',battle:end});
 if(start&&event.type==='catch'){
  const caught=Boolean(after.pokemon?.[event.id]);
  result.push({kind:caught?'caught':'escaped',battle:start,ball:event.ball||'poke-ball',storage:caught?(after.box?.includes(event.id)?'box':'party'):''});
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
 let timer=0,queue=[],done=null,generation=0,stage=null,controls=null,locked=[],drawn=null;
 const ballUrl=ball=>new URL('assets/items/'+ball+'.png',import.meta.url).href;
 function clear(){for(const n of locked)n.disabled=false;locked=[];clearTimeout(timer);timer=0;queue=[];generation++;if(stage){stage.classList.remove('pkm-inline','pkm-encounter','pkm-caught','pkm-escaped','pkm-victory','pkm-defeat','pkm-run','pkm-switch','pkm-attack','pkm-transform');stage.removeAttribute('data-pkm-kind');stage.removeAttribute('data-pkm-system');}controls?.remove();if(drawn){undrawStep(drawn);drawn=null;}stage=null;controls=null;if(done){const resolve=done;done=null;resolve();}}
 function next(own){if(own!==generation)return;const item=queue.shift();if(!item){clear();return;}onStep(item);stage=arena();if(!stage){clear();return;}stage.classList.add('pkm-inline','pkm-'+item.kind);stage.dataset.pkmKind=item.kind;
  const container=document.createElement('div');controls=container;container.className='pkm-inline-controls';container.setAttribute('aria-hidden','true');
  if(item.kind==='transform'){const ring=document.createElement('span');ring.className='pkm-transform-ring';container.append(ring);const particles=document.createElement('span');particles.className='pkm-transform-particles';container.append(particles);stage.dataset.pkmSystem=item.system||'mega';}
  if(item.kind==='caught'||item.kind==='escaped'){const ball=document.createElement('img');ball.className='pkm-inline-ball';ball.alt='';ball.src=new URL('assets/items/'+(item.ball||'poke-ball')+'.png',import.meta.url).href;ball.onerror=()=>{ball.onerror=null;ball.src=new URL('assets/items/poke-ball.png',import.meta.url).href;};container.append(ball);const sparks=document.createElement('span');sparks.className='pkm-inline-sparks';sparks.textContent='✦ ✧ ✦';container.append(sparks);}
  for(const n of stage.closest('dialog')?.querySelectorAll('.pk-battle-console button:not(:disabled),.pk-battle-footer button:not(:disabled)')||[]){n.disabled=true;locked.push(n);}stage.append(container);if(item.vfx)drawn=drawStep(stage,item,{ballUrl,language});
  timer=setTimeout(()=>{stage?.classList.remove('pkm-'+item.kind);controls?.remove();controls=null;if(drawn){undrawStep(drawn);drawn=null;}next(own);},item.vfx?stepDuration(item):item.kind==='caught'||item.kind==='escaped'?3000:1900);
 }
 const keydown=event=>{if(stage&&event.key==='Escape'){event.preventDefault();event.stopPropagation();clear();}};document.addEventListener('keydown',keydown,true);
 return {playing:()=>Boolean(stage),play(items){if(!items.length||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();clear();queue=items;const own=generation;return new Promise(resolve=>{done=resolve;next(own);});},cancel:clear,destroy(){clear();document.removeEventListener('keydown',keydown,true);}};
}
