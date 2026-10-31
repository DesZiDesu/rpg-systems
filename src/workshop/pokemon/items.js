import {transformationHeldItem,transformationKeyItem} from './transformations.js?v=0.97.1';
import {HELD_ITEMS} from './mechanics.js?v=0.97.1';
import {itemUse,maxPP} from './item-use.js?v=0.97.1';
export const BALLS=['poke-ball','great-ball','ultra-ball','master-ball','premier-ball','luxury-ball','heal-ball','friend-ball','nest-ball','net-ball','dive-ball','dusk-ball','timer-ball','quick-ball','repeat-ball','level-ball','fast-ball','heavy-ball','love-ball','dream-ball','beast-ball','sport-ball','safari-ball'];
const medical={potion:{hp:20},'super-potion':{hp:60},'hyper-potion':{hp:120},'max-potion':{hp:'full'},'full-restore':{hp:'full',cure:'all'},revive:{revive:.5},'max-revive':{revive:1},antidote:{cure:'poison'},'burn-heal':{cure:'burn'},'ice-heal':{cure:'freeze'},awakening:{cure:'sleep'},'paralyze-heal':{cure:'paralysis'},'full-heal':{cure:'all'},'lum-berry':{cure:'all'},'pecha-berry':{cure:'poison'},'rawst-berry':{cure:'burn'},'aspear-berry':{cure:'freeze'},'chesto-berry':{cure:'sleep'},'cheri-berry':{cure:'paralysis'},'oran-berry':{hp:10},'sitrus-berry':{fraction:.25},ether:{pp:10},'max-ether':{pp:'full'},elixir:{pp:10,allPP:true},'max-elixir':{pp:'full',allPP:true},'leppa-berry':{pp:10},'fresh-water':{hp:30},'soda-pop':{hp:50},lemonade:{hp:70},'moomoo-milk':{hp:100},'berry-juice':{hp:20},'sweet-heart':{hp:20},'energy-powder':{hp:60,bitter:5},'energy-root':{hp:120,bitter:10},'heal-powder':{cure:'all',bitter:5},'revival-herb':{revive:1,bitter:15},'max-honey':{revive:1},'sacred-ash':{revive:1,all:true},'blue-flute':{cure:'sleep'},'lava-cookie':{cure:'all'},'old-gateau':{cure:'all'},casteliacone:{cure:'all'},'lumiose-galette':{cure:'all'},'shalour-sable':{cure:'all'},'big-malasada':{cure:'all'},'rage-candy-bar':{cure:'all'},'pewter-crunchies':{cure:'all'},'jubilife-muffin':{cure:'all'}};
export const isMedicine=id=>Object.hasOwn(medical,id);
export const STONES=['fire-stone','water-stone','thunder-stone','leaf-stone','moon-stone','sun-stone','shiny-stone','dusk-stone','dawn-stone','ice-stone'];
export function itemEffect(id){return BALLS.includes(id)?{kind:'ball'}:medical[id]?{kind:'medicine',...medical[id]}:itemUse(id)?{...itemUse(id),kind:itemUse(id).kind==='battle'?'battle-item':itemUse(id).kind}:(HELD_ITEMS.has(id)||transformationHeldItem(id))?{kind:'held'}:transformationKeyItem(id)?{kind:'transformation-key'}:STONES.includes(id)?{kind:'evolution'}:/^t[rm]\d+$/u.test(id)?{kind:'machine'}:{kind:'reference'};}
export function itemName(dex,id){return dex.items?.get(id)?.name||id.replaceAll('-',' ').replace(/\b\w/gu,c=>c.toUpperCase());}
export function ballChance(dex,s,ball,context={}){
 const foe=s.battle.wild,p=dex.get(foe.key),own=s.pokemon[s.battle.activeUid];if(ball==='master-ball')return 1;
 let multiplier=({'great-ball':1.5,'ultra-ball':2,'sport-ball':1.5,'safari-ball':1.5})[ball]||1,rate=p.catchRate;
 const night=/^(?:0[0-5]|1[89]|2[0-3]):/u.test(context.time||''),place=String(context.place||'');
 if(ball==='net-ball'&&p.types.some(t=>['water','bug'].includes(t)))multiplier=3.5;
 if(ball==='dive-ball'&&/underwater|ใต้น้ำ/iu.test(place))multiplier=3.5;
 if(ball==='dusk-ball'&&(night||/cave|ถ้ำ/iu.test(place)))multiplier=3;
 if(ball==='timer-ball')multiplier=Math.min(4,1+.3*(s.battle.round-1));
 if(ball==='quick-ball'&&s.battle.round===1)multiplier=5;
 if(ball==='repeat-ball'&&s.caught.includes(p.speciesId))multiplier=3.5;
 if(ball==='nest-ball')multiplier=Math.max(1,(41-foe.level)/10);
 if(ball==='level-ball')multiplier=own.level>=foe.level*4?8:own.level>=foe.level*2?4:own.level>foe.level?2:1;
 if(ball==='fast-ball'&&p.stats[5]>=100)multiplier=4;
 if(ball==='heavy-ball')rate=Math.max(1,Math.min(255,rate+(p.weight>=300?30:p.weight>=200?20:p.weight<100?-20:0)));
 if(ball==='love-ball'&&own.key===foe.key&&['male','female'].includes(foe.traits?.gender)&&own.traits?.gender!==foe.traits.gender&&['male','female'].includes(own.traits?.gender))multiplier=8;
 if(ball==='dream-ball'&&foe.status==='sleep')multiplier=4;
 if(ball==='beast-ball')multiplier=[793,794,795,796,797,798,799,803,804,805,806].includes(p.speciesId)?5:.1;
 const status=['sleep','freeze'].includes(foe.status)?2.5:foe.status?1.5:1;
 return Math.min(.99,Math.max(.001,(3*foe.stats[0]-2*foe.hp)/(3*foe.stats[0])*rate/255*multiplier*status));
}
export function useMedicine(s,dex,id,uid,moveId){
 const effect=medical[id],m=s.pokemon[uid];if(!effect||!m||!(s.inventory[id]>0))throw Error('This medicine is unavailable');let changed=false;
 if(effect.all){for(const u of s.party){const mon=s.pokemon[u];if(mon&&mon.hp===0){mon.hp=mon.stats[0];changed=true;}}if(!changed)throw Error('This item would have no effect; nothing was consumed');s.inventory[id]--;return;}
 if(effect.revive){if(m.hp!==0)throw Error('Choose a fainted Pokémon');m.hp=Math.max(1,Math.floor(m.stats[0]*effect.revive));changed=true;}
 else if(m.hp===0)throw Error('A fainted Pokémon needs Revive or a Pokémon Center');
 if(effect.hp||effect.fraction){if(m.hp<m.stats[0]){m.hp=Math.min(m.stats[0],m.hp+(effect.hp==='full'?m.stats[0]:effect.hp||Math.max(1,Math.floor(m.stats[0]*effect.fraction))));changed=true;}}
 if(effect.cure&&(effect.cure==='all'||effect.cure===m.status)&&m.status){m.status='';m.statusTurns=0;changed=true;}
 if(effect.pp){const moves=effect.allPP?m.moves:m.moves.filter(v=>v.id===Number(moveId));if(!moves.length)throw Error('Choose a move to restore PP');for(const slot of moves){const max=maxPP(dex,slot);if(slot.pp<max){slot.pp=Math.min(max,slot.pp+(effect.pp==='full'?max:effect.pp));changed=true;}}}
 if(!changed)throw Error('This item would have no effect; nothing was consumed');if(effect.bitter)m.friendship=Math.max(0,(m.friendship||0)-effect.bitter);s.inventory[id]--;
}
export function machineOptions(dex,p,move){const training=dex.training?.[p.pokemonId]||{};return(dex.machines||[]).filter(row=>row.move===move&&row.versionGroup===training.versionGroup);}
