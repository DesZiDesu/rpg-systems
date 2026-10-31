// Presentation only. A saved battle action becomes a short sequence of visual
// steps derived from the engine's own log entries: balls thrown and recalled,
// moves landing by type, status conditions and stat changes. Nothing here
// changes the game; skipping the sequence leaves the saved result untouched.

const SELF_TARGETS=new Set([4,5,7,13]);
const HEARTS=new Set(['Charm','Attract','Sweet Kiss','Baby-Doll Eyes','Play Nice','Captivate','Draining Kiss','Lovely Kiss']);
const STATUS=new Set(['sleep','paralysis','burn','poison','freeze','confusion','infatuation']);
// Engine reasons a move did not happen because of the attacker's own condition.
const HELD={sleep:'sleep',freeze:'freeze',paralysis:'paralysis',confusion:'confusion',infatuation:'infatuation',flinch:'flinch'};
const GUARDS=new Set(['guard','max-guard','protected']);
export const TYPE_COLORS={normal:'#c8c3a8',fire:'#ff7a2f',water:'#4aa3ff',electric:'#ffd43b',grass:'#5fd36b',ice:'#8ff0ff',fighting:'#e0523a',poison:'#b45bd6',ground:'#d9b45a',flying:'#a7b7ff',psychic:'#ff5fa2',bug:'#a6c832',rock:'#bba15c',ghost:'#7a63c9',dragon:'#6f5bff',dark:'#5b4a43',steel:'#b8c4d6',fairy:'#ff9ee0'};
const SHAPES={fire:'flame',water:'splash',electric:'bolt',grass:'leaf',bug:'leaf',ice:'shard',psychic:'ring',fairy:'ring',ghost:'smoke',dark:'smoke',poison:'smoke',dragon:'slash',flying:'slash'};
const DURATION={'send-out':950,recall:750,faint:1000,hit:720,status:820,heal:760};

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Log entries added by this action. The log is capped, so match the previous
// last entry instead of relying on the length.
export function newLogEntries(before,after){
 const old=before?.logs||[],now=after?.logs||[];if(!old.length)return now.slice();
 const at=now.findLastIndex(v=>same(v,old.at(-1)));
 return at<0?now.slice(-Math.min(now.length,12)):now.slice(at+1);
}

const speciesName=(mon,dex)=>mon&&dex?.get(mon.key)?.name;
const ballOf=mon=>mon?.ball||'poke-ball';
function moveIndex(dex){if(!dex)return new Map();if(!dex._vfxMoves)dex._vfxMoves=new Map(Object.values(dex.moves||{}).map(m=>[m.name,m]));return dex._vfxMoves;}

// Ordered steps. `battle` is the state each step is drawn on: the turn starts
// from the previous state and switches to the new one once a new Pokémon is out.
export function battleSteps(before,after,event,dex){
 const start=before?.battle,end=after?.battle,steps=[];if(!event||(!start&&!end))return steps;
 const moves=moveIndex(dex);let current=start||end;
 const ally=b=>b&&(b===start?before:after).pokemon?.[b.activeUid];
 const names=b=>({ally:speciesName(ally(b),dex),foe:speciesName(b?.wild,dex)});
 const sendOut=(side,b)=>{current=b;steps.push({kind:'send-out',side,battle:b,ball:side==='ally'?ballOf(ally(b)):'poke-ball'});};
 if(!start&&end){
  // A trainer throws first; a wild Pokémon is already there. Then the player's partner comes out.
  if(end.trainer)sendOut('foe',end);
  sendOut('ally',end);
  return steps;
 }
 if(!start)return steps;
 if(event.type==='switch'&&end&&start.activeUid!==end.activeUid){steps.push({kind:'recall',side:'ally',battle:start});sendOut('ally',end);}
 let seen=names(current);
 for(const row of newLogEntries(before,after)){
  if((row.key==='player-hit'||row.key==='enemy-hit')&&HELD[row.blocked]){
   // The attacker could not move: show its condition instead of an attack.
   steps.push({kind:'status',side:row.key==='player-hit'?'ally':'foe',battle:current,status:HELD[row.blocked]});
  }else if(row.key==='player-hit'||row.key==='enemy-hit'){
   const attacker=row.key==='player-hit'?'ally':'foe',defender=attacker==='ally'?'foe':'ally',move=moves.get(row.move)||{},self=SELF_TARGETS.has(move.target);
   steps.push({kind:'hit',side:attacker,target:self?attacker:defender,battle:current,actorName:row.name||'',targetName:self?row.name||'':row.target||'',move:row.move||'',type:move.type||'normal',category:move.class===2?'physical':move.class===3?'special':'status',
    damage:Number(row.damage)||0,crit:Boolean(row.crit),miss:Boolean(row.miss),blocked:row.blocked||'',hearts:HEARTS.has(row.move),
    status:STATUS.has(row.status)?row.status:'',stages:(row.stageChanges||[]).map(([stat,delta])=>({stat,delta,side:self||delta>0?attacker:defender})),healed:Number(row.healed)||0});
  }else if(row.key==='battle-effect'&&STATUS.has(row.cause)){
   steps.push({kind:'status',side:row.name===seen.foe?'foe':'ally',battle:current,status:row.cause});
  }else if(row.key==='fainted'){
   // The player's Pokémon goes back into its ball before the next one is thrown.
   steps.push({kind:'faint',side:'ally',battle:current,recall:true});
   if(end&&end.activeUid!==start.activeUid&&end===after.battle){sendOut('ally',end);seen=names(end);}
  }else if(row.key==='trainer-next'){
   steps.push({kind:'faint',side:'foe',battle:current,recall:true});
   if(end){sendOut('foe',end);seen=names(end);}
  }else if(row.key==='victory'&&start.trainer){
   steps.push({kind:'faint',side:'foe',battle:start,recall:true});
  }else if(row.key==='victory'){
   steps.push({kind:'faint',side:'foe',battle:start,recall:false});
  }else if(row.key==='defeat'&&!steps.some(s=>s.kind==='faint'&&s.side==='ally')){
   steps.push({kind:'faint',side:'ally',battle:start,recall:true});
  }
 }
 return steps;
}

export const stepDuration=step=>DURATION[step.kind]+(step.kind==='hit'&&(step.status||step.hearts)?520:0)+(step.kind==='hit'&&step.stages?.length?420:0);

function node(tag,cls,text){const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function particles(layer,count,cls,color){for(let i=0;i<count;i++){const p=node('i',cls);p.style.setProperty('--i',i);p.style.setProperty('--a',(360/count*i+(i%2?14:-9))+'deg');p.style.setProperty('--c',color);layer.append(p);}}
// Text inside a mirrored sprite box would read backwards.
const mirrored=actor=>/^matrix\(-/.test(getComputedStyle(actor).transform);
function layerFor(actor){const layer=node('div','pkv-layer');if(mirrored(actor))layer.classList.add('pkv-unmirror');actor.append(layer);return layer;}

function statusEffect(layer,status,delay=0){
 const box=node('div','pkv-status pkv-'+status);box.style.setProperty('--delay',delay+'ms');
 const glyph={sleep:'Z',paralysis:'',burn:'',poison:'',freeze:'',confusion:'★',infatuation:'♥'}[status];
 const count={sleep:3,paralysis:5,burn:6,poison:6,freeze:5,confusion:3,infatuation:4}[status];
 for(let i=0;i<count;i++){const p=node('i','',glyph||undefined);p.style.setProperty('--i',i);box.append(p);}
 layer.append(box);
}
function stageEffect(layer,delta,delay){const box=node('div','pkv-stage '+(delta>0?'pkv-up':'pkv-down'));box.style.setProperty('--delay',delay+'ms');for(let i=0;i<Math.min(3,Math.abs(delta))+2;i++){const p=node('i','',delta>0?'▲':'▼');p.style.setProperty('--i',i);box.append(p);}layer.append(box);}

// Draw one step inside the battle field; returns the elements to remove.
export function drawStep(stage,step,{ballUrl,language=()=>'en'}={}){
 const th=language()==='th',added=[],marked=[];
 // In a double battle each side has two actors; pick the one the log names.
 const pick=(side,name)=>[...stage.querySelectorAll('.pk-'+side+'-art')].find(n=>name&&n.dataset.pkName===name)||stage.querySelector('.pk-'+side+'-art');
 const actors={ally:pick('ally',step.side==='ally'?step.actorName:step.target==='ally'?step.targetName:''),foe:pick('foe',step.side==='foe'?step.actorName:step.target==='foe'?step.targetName:'')};
 const mark=(el,cls)=>{if(el){el.classList.add(cls);marked.push([el,cls]);}};
 for(const actor of Object.values(actors))actor?.style.setProperty('--pkv-dir',mirrored(actor)?-1:1);
 const layer=side=>{const actor=actors[side];if(!actor)return null;const l=layerFor(actor);added.push(l);return l;};
 if(step.kind==='send-out'||step.kind==='recall'||step.kind==='faint'){
  const actor=actors[step.side],l=layer(step.side);if(!actor||!l)return {added,marked};
  mark(actor,'pkv-'+step.kind);
  if(step.kind==='faint'&&step.recall)mark(actor,'pkv-faint-recall');
  if(step.kind!=='faint'||step.recall){const ball=node('img','pkv-ball pkv-ball-'+step.kind+' pkv-from-'+step.side);ball.alt='';ball.src=ballUrl(step.ball||'poke-ball');ball.onerror=()=>{ball.onerror=null;ball.src=ballUrl('poke-ball');};l.append(ball);}
  l.append(node('span','pkv-flash pkv-flash-'+step.kind));
  if(step.kind==='send-out')particles(l,8,'pkv-burst-dot','#ffffff');
  return {added,marked};
 }
 if(step.kind==='status'){const l=layer(step.side);if(l&&step.status==='flinch')l.append(node('b','pkv-text',th?'สะดุ้ง!':'Flinched!'));else if(l)statusEffect(l,step.status);mark(actors[step.side],'pkv-status-pulse');return {added,marked};}
 if(step.kind==='hit'){
  const color=TYPE_COLORS[step.type]||TYPE_COLORS.normal,attacker=actors[step.side],target=actors[step.target],tl=layer(step.target);
  mark(attacker,step.category==='physical'?'pkv-lunge-'+step.side:'pkv-charge');
  if(step.category!=='physical'){const al=step.target===step.side?tl:layer(step.side);if(al){const aura=node('span','pkv-aura');aura.style.setProperty('--c',color);al.append(aura);}}
  if(tl){
   if(step.miss){tl.append(node('b','pkv-text pkv-miss',th?'พลาด!':'Miss!'));mark(target,'pkv-dodge');}
   else if(GUARDS.has(step.blocked))tl.append(node('span','pkv-shield'));
   else if(step.blocked)tl.append(node('b','pkv-text',th?'ไม่ได้ผล':'No effect'));
   else if(step.category!=='status'||step.damage){
    const fx=node('div','pkv-hit pkv-'+(SHAPES[step.type]||'impact'));fx.style.setProperty('--c',color);particles(fx,9,'pkv-p',color);fx.prepend(node('span','pkv-core'));tl.append(fx);
    if(step.damage)mark(target,step.crit?'pkv-shake-hard':'pkv-shake');
    if(step.crit)tl.append(node('b','pkv-text pkv-crit',th?'คริติคอล!':'Critical!'));
   }
   if(step.hearts)statusEffect(tl,'infatuation',260);
   if(step.status)statusEffect(tl,step.status,380);
  }
  step.stages?.forEach((s,i)=>{const l=s.side===step.target?tl:layer(s.side);if(l)stageEffect(l,s.delta,320+i*80);});
  if(step.healed){const l=layer(step.side);if(l){const box=node('div','pkv-heal');particles(box,7,'pkv-p','#7dffa8');l.append(box);}}
  return {added,marked};
 }
 return {added,marked};
}
export function undrawStep({added,marked}){for(const n of added)n.remove();for(const [el,cls] of marked)el.classList.remove(cls);}
