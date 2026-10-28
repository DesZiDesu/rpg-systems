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
 if(start&&!end&&event.type==='catch'&&!after.pokemon?.[event.id]&&after.logs?.some((v,i)=>i>=Math.max(0,after.logs.length-5)&&v.key==='defeat'))result.push({kind:'defeat',battle:start});
 return result;
}
export function mountPokemonMotion({resolveImage,resolveTerrain,language}){
 const root=document.createElement('dialog');root.className='pkm-motion';root.setAttribute('aria-label','Pokémon battle animation');document.body.append(root);
 let timer=0,queue=[],done=null,generation=0;
 function clear(){clearTimeout(timer);timer=0;queue=[];generation++;if(root.open)root.close();root.replaceChildren();if(done){const resolve=done;done=null;resolve();}}
 root.addEventListener('cancel',event=>{event.preventDefault();clear();});
 root.addEventListener('click',event=>{if(event.target.closest('[data-pkm-skip]'))clear();});
 function safeImage(mon){if(!mon)return '';try{return resolveImage(mon)||'';}catch{return '';}}
 function pokemon(mon,cls){const frame=document.createElement('div');frame.className='pkm-mon '+cls;const src=safeImage(mon);if(src){const img=document.createElement('img');img.src=src;img.alt='';img.decoding='async';img.onerror=()=>{img.remove();frame.classList.add('pkm-missing');};frame.append(img);}else frame.classList.add('pkm-missing');return frame;}
 function next(own){if(own!==generation)return;const item=queue.shift();if(!item){clear();return;}
  const battle=item.battle,ally=item.ally,foe=battle?.wild,th=language()==='th';root.replaceChildren();const stage=document.createElement('div');stage.className='pkm-stage pkm-'+item.kind;stage.dataset.pkmKind=item.kind;
  const terrain=resolveTerrain();if(terrain)stage.style.setProperty('--pkm-terrain',`url("${terrain}")`);
  const background=document.createElement('div');background.className='pkm-field';stage.append(background);
  const label=document.createElement('div');label.className='pkm-header';label.textContent=({encounter:th?'การเผชิญหน้า':'ENCOUNTER',caught:th?'จับสำเร็จ':'CAUGHT',escaped:th?'หลุดจากบอล':'BROKE FREE',victory:th?'ชนะการต่อสู้':'VICTORY',defeat:th?'พ่ายแพ้':'DEFEAT',run:th?'ออกจากการต่อสู้':'ESCAPED'})[item.kind];stage.append(label);
  stage.append(pokemon(ally,'pkm-ally'),pokemon(foe,'pkm-foe'));
  const caption=document.createElement('div');caption.className='pkm-caption';const foeName=foe?.nickname||foe?.key?.replaceAll('-',' ')||'Pokémon',allyName=ally?.nickname||ally?.key?.replaceAll('-',' ')||'Pokémon';caption.innerHTML='<span class="pkm-caption-kicker"></span><strong></strong><small></small>';caption.querySelector('span').textContent=th?'การต่อสู้โปเกมอน':'POKÉMON BATTLE';caption.querySelector('strong').textContent=foeName;caption.querySelector('small').textContent=(th?'คู่หู: ':'PARTNER: ')+allyName;stage.append(caption);
  const flash=document.createElement('div');flash.className='pkm-flash';stage.append(flash);
  if(item.kind==='caught'||item.kind==='escaped'){
   const ball=document.createElement('img');ball.className='pkm-ball';ball.alt='';ball.src=new URL('assets/items/'+(item.ball||'poke-ball')+'.png',import.meta.url).href;ball.onerror=()=>{ball.src=new URL('assets/items/poke-ball.png',import.meta.url).href;ball.onerror=null;};stage.append(ball);
   const sparks=document.createElement('div');sparks.className='pkm-sparks';sparks.setAttribute('aria-hidden','true');sparks.textContent='✦  ✧  ✦';stage.append(sparks);
  }
  const skip=document.createElement('button');skip.type='button';skip.className='pkm-skip';skip.dataset.pkmSkip='';skip.textContent=th?'ข้าม':'Skip';stage.append(skip);root.append(stage);
  timer=setTimeout(()=>next(own),item.kind==='caught'||item.kind==='escaped'?4700:2300);
 }
 return {play(items){if(!items.length||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();clear();queue=items;const own=generation;return new Promise(resolve=>{done=resolve;try{root.showModal();next(own);}catch{clear();}});},cancel:clear,destroy(){clear();root.remove();},element:root};
}
