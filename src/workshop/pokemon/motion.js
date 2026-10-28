// Presentation only: descriptors are derived from a successfully saved game.
export function motionSequence(before,after,event){
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
 if(start&&end&&event.type==='attack')result.push({kind:'attack',battle:end});
 if(start&&end&&event.type==='switch'&&start.activeUid!==end.activeUid)result.push({kind:'switch',battle:end});
 if(start&&!end&&event.type==='catch'&&!after.pokemon?.[event.id]&&after.logs?.some((v,i)=>i>=Math.max(0,after.logs.length-5)&&v.key==='defeat'))result.push({kind:'defeat',battle:start});
 return result;
}
export function mountPokemonMotion({arena,language}){
 let timer=0,queue=[],done=null,generation=0,stage=null,controls=null,locked=[];
 function clear(){for(const n of locked)n.disabled=false;locked=[];clearTimeout(timer);timer=0;queue=[];generation++;if(stage){stage.classList.remove('pkm-inline','pkm-encounter','pkm-caught','pkm-escaped','pkm-victory','pkm-defeat','pkm-run','pkm-switch','pkm-attack');stage.removeAttribute('data-pkm-kind');}controls?.remove();stage=null;controls=null;if(done){const resolve=done;done=null;resolve();}}
 function next(own){if(own!==generation)return;const item=queue.shift();if(!item){clear();return;}stage=arena();if(!stage){clear();return;}stage.classList.add('pkm-inline','pkm-'+item.kind);stage.dataset.pkmKind=item.kind;
  const container=document.createElement('div');controls=container;container.className='pkm-inline-controls';container.setAttribute('aria-hidden','true');
  if(item.kind==='caught'||item.kind==='escaped'){const ball=document.createElement('img');ball.className='pkm-inline-ball';ball.alt='';ball.src=new URL('assets/items/'+(item.ball||'poke-ball')+'.png',import.meta.url).href;ball.onerror=()=>{ball.onerror=null;ball.src=new URL('assets/items/poke-ball.png',import.meta.url).href;};container.append(ball);const sparks=document.createElement('span');sparks.className='pkm-inline-sparks';sparks.textContent='✦ ✧ ✦';container.append(sparks);}
  for(const n of stage.closest('dialog')?.querySelectorAll('.pk-battle-console button:not(:disabled),.pk-battle-footer button:not(:disabled)')||[]){n.disabled=true;locked.push(n);}stage.append(container);timer=setTimeout(()=>{stage?.classList.remove('pkm-'+item.kind);controls?.remove();controls=null;next(own);},item.kind==='caught'||item.kind==='escaped'?3000:1900);
 }
 const keydown=event=>{if(stage&&event.key==='Escape'){event.preventDefault();event.stopPropagation();clear();}};document.addEventListener('keydown',keydown,true);
 return {playing:()=>Boolean(stage),play(items){if(!items.length||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();clear();queue=items;const own=generation;return new Promise(resolve=>{done=resolve;next(own);});},cancel:clear,destroy(){clear();document.removeEventListener('keydown',keydown,true);}};
}
