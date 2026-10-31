import {traitsFor,validateTraits,refreshStats} from './specimens.js?v=0.92.0';
import {supportedMove} from './battle-rules.js?v=0.92.0';
import {itemEffect,machineOptions} from './items.js?v=0.92.0';
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
export function trainingChoices(s,dex,uid){const m=s.pokemon[uid],p=m&&dex.get(m.key);if(!p)return[];const data=dex.training?.[p.pokemonId]||{level:p.learnset,machine:[],tutor:[]},rows=new Map();for(const [level,id]of data.level||[])if(level<=m.level)rows.set(id,{id,method:'level',level});for(const id of data.tutor||[])if(!rows.has(id))rows.set(id,{id,method:'tutor'});for(const id of data.machine||[])if(!rows.has(id))rows.set(id,{id,method:'machine'});return[...rows.values()].filter(v=>dex.moves[v.id]).map(v=>({...v,move:dex.moves[v.id],supported:supportedMove(dex,v.id),known:m.moves.some(slot=>slot.id===v.id),machines:machineOptions(dex,p,v.id)})).sort((a,b)=>a.move.name.localeCompare(b.move.name));}
export function expansionAction(s,e,dex,{create,log}){
 if(e.type==='train-move'){
  check(!s.battle,'Finish the battle before changing moves');const m=s.pokemon[e.uid],choice=trainingChoices(s,dex,e.uid).find(v=>v.id===Number(e.moveId));check(m&&choice&&!choice.known&&choice.supported,'This Pokémon cannot learn that move here');
  const slot=Number(e.slot);check(Number.isInteger(slot)&&slot>=0&&slot<=Math.min(3,m.moves.length),'Choose the move slot to replace');
  if(choice.method==='machine'){const machine=choice.machines.find(row=>row.item===e.item&&s.inventory[row.item]>0);check(machine,'The compatible TM is not in your bag');s.inventory[machine.item]--;}
  if(choice.method==='tutor')check(/tutor|ผู้ฝึกท่า|ครูฝึก|ศูนย์|cent(?:er|re)/iu.test(e.context?.place||''),'Visit a Move Tutor or Pokémon Center');
  const forgotten=m.moves[slot]?.id;m.moves[slot]={id:choice.id,pp:choice.move.pp};m.pendingMoves=(m.pendingMoves||[]).filter(id=>id!==choice.id);log(s,'learned',{name:dex.get(m.key).name,move:choice.move.name,forgotten:dex.moves[forgotten]?.name||''});return true;
 }
 if(e.type==='grant-item'){
  const item=dex.items?.get(e.item);check(item&&Number.isInteger(e.quantity)&&e.quantity>0&&e.quantity<=(e.source==='import'?99999:9999),'Invalid item grant');check(e.source==='story'||e.source==='import','Item grants require a story receipt or explicit inventory import');
  check((s.inventory[e.item]||0)+e.quantity<=99999,'Item stock limit reached; nothing was transferred');s.inventory[e.item]=(s.inventory[e.item]||0)+e.quantity;log(s,'received-item',{name:item.name,quantity:e.quantity});return true;
 }
 if(e.type==='quest-offer'){
  const p=dex.get(e.speciesId);check(p&&(p.legendary||p.mythical)&&e.place&&String(e.place).length<=160,'A rare encounter quest needs a species and destination');s.quests||=[];
  if(!s.quests.some(q=>q.speciesId===p.speciesId))s.quests.push({id:'quest-'+p.speciesId,speciesId:p.speciesId,place:String(e.place),region:e.region||s.region,wins:Math.max(0,Math.min(20,Number(e.wins)||0)),status:'offered'});log(s,'quest-offered',{name:p.name,place:e.place});return true;
 }
 if(e.type==='quest-accept'){const q=s.quests?.find(q=>q.id===e.quest);check(q&&q.status==='offered','No quest to accept');q.status='accepted';log(s,'quest-accepted',{name:dex.get(q.speciesId).name});return true;}
 if(e.type==='sandbox-settings'){check(e.source==='user'&&typeof e.enabled==='boolean','Only the player can configure Sandbox');s.settings.sandbox=e.enabled;return true;}
 if(!e.type?.startsWith('cheat-'))return false;
 check(s.settings.sandbox&&e.source==='user','Enable Sandbox yourself before using cheats');check(!s.battle,'Finish the encounter before editing the world');
 if(e.type==='cheat-spawn'){
  const p=dex.get(e.key||e.speciesId);check(p&&!p.battleOnly,'Choose a permanent base form; use Fight → Special power for battle transformations');const m=create(dex,p.key,e.level,e.id,true);if(e.nickname)m.nickname=String(e.nickname).slice(0,36);m.shiny=e.shiny===true;m.cheated=true;s.pokemon[m.uid]=m;
  const destination=e.destination==='party'&&s.party.length<6?s.party:s.box;destination.push(m.uid);if(destination===s.party)s.started=true;for(const arr of[s.seen,s.caught])if(!arr.includes(p.speciesId))arr.push(p.speciesId);log(s,'cheat-spawn',{name:p.name,storage:destination===s.party?'party':'box'});
 }else if(e.type==='cheat-item'){
  check(dex.items?.has(e.item)&&Number.isInteger(e.quantity)&&e.quantity>=0&&e.quantity<=99999,'Choose an item and a quantity from 0 to 99999');s.inventory[e.item]=e.quantity;log(s,'cheat-item',{name:dex.items.get(e.item).name,quantity:e.quantity});
 }else if(e.type==='cheat-edit'){
  const m=s.pokemon[e.uid];check(m,'Unknown Pokémon');const p=dex.get(m.key),oldLevel=m.level;m.traits||=traitsFor(p,m.uid,false);
  if(e.traits)m.traits=validateTraits({...m.traits,...e.traits,legacy:false});
  if(e.level!==undefined){check(Number.isInteger(e.level)&&e.level>=1&&e.level<=100,'Level must be 1–100');m.level=e.level;m.exp=dex.experience[p.growth]?.[m.level]??m.level**3;}
  if(e.stats!==undefined){check(e.stats===null||Array.isArray(e.stats)&&e.stats.length===6&&e.stats.every(n=>n===null||Number.isInteger(n)&&n>=1&&n<=99999),'Stat overrides must be 1–99999 or blank');m.statOverrides=e.stats;}
  if(e.ability!==undefined){check(p.abilities.some(a=>a.name===e.ability),'Choose an ability of this species');m.ability=e.ability;}if(e.nickname!==undefined)m.nickname=String(e.nickname).slice(0,36);if(typeof e.shiny==='boolean')m.shiny=e.shiny;refreshStats(p,m);if(e.heal){m.hp=m.stats[0];m.status='';for(const slot of m.moves)slot.pp=dex.moves[slot.id].pp;}m.cheated=true;log(s,'cheat-edit',{name:p.name,level:m.level,oldLevel});
 }else if(e.type==='cheat-heal'){for(const m of Object.values(s.pokemon)){m.hp=m.stats[0];m.status='';m.stages=Array(8).fill(0);for(const slot of m.moves)slot.pp=dex.moves[slot.id].pp;}log(s,'cheat-heal');}
 else throw Error('Unknown cheat action');s.cheated=true;return true;
}
