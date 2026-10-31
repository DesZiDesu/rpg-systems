import {formAction,transformationConfig,transformationHeldItem,transformationOptions,transformBattle,automaticForm,switchForm,clearTransformations,restoreBattleForm,finishTransformationTurn,battleMove,battleTypes,baseKey,syncEquipmentForm,copyBattleForm} from './transformations.js?v=0.94.1';
import {parsePokemonStory} from './story.js?v=0.94.1';
import {chooseAbility,abilityOf,itemOf,enterBattle,leaveBattle,moveAllowed,endTurn,normalizeWeather,fieldWeather,HELD_ITEMS} from './mechanics.js?v=0.94.1';
import {applyStatus} from './battle-rules.js?v=0.94.1';
import {traitsFor,specimenStats,refreshStats,awardEVs} from './specimens.js?v=0.94.1';
import {supportedMove,executeMove,effectiveStat,residual} from './battle-rules.js?v=0.94.1';
import {BALLS,ballChance,useMedicine} from './items.js?v=0.94.1';
import {expansionAction} from './game-actions.js?v=0.94.1';
import {trainerDefinition,gymAvailable,isCenter,regionalPool} from './adventure-rules.js?v=0.94.1';
import {resolveTerrain} from './terrains.js?v=0.94.1';
import {validTerrain} from './terrains.js?v=0.94.1';
import {sha256} from '../../vendor/js-sha256/index.js?v=0.94.1';
// Pokémon preview: immutable, replayable game state. No network or host globals.
export const JOURNAL='roleforge_pokemon_v1',PROMPT='roleforge_pokemon_world',ACTION_PROMPT='roleforge_pokemon_action';
export const newActionId=()=>globalThis.crypto?.randomUUID?.()||'pk-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export const STARTERS=[[1,4,7],[152,155,158],[252,255,258],[387,390,393],[495,498,501],[650,653,656],[722,725,728],[810,813,816],[906,909,912]];
export const REGIONS=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
export const ENCOUNTERS=[[16,19,10,13,25,43,63,129,133,280],[161,163,165,167,179,183,194,187,204,228],[261,263,265,270,273,276,280,283,285],[396,399,401,403,406,418,427,431,449],[504,506,509,519,522,524,529,540,543],[659,661,664,667,669,672,674,677,679],[731,734,736,739,742,744,749,753,759],[819,821,824,827,829,831,833,835,837],[915,917,919,921,924,926,928,935,938]];
const copy=v=>structuredClone(v),limit=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||min));
export function catalogIndex(raw){
 if(raw?.schema!==1||!Array.isArray(raw.forms)||!raw.forms.length)throw Error('Pokédex data unavailable');
 const extra=raw.expansion||{},enhanced=raw.forms.map(p=>({...p,...extra.profiles?.[p.speciesId],evYield:extra.evYields?.[p.pokemonId]||[0,0,0,0,0,0]})),forms=new Map(enhanced.map(p=>[p.key,p])),species=new Map();
 for(const p of enhanced)if(p.default||!species.has(p.speciesId))species.set(p.speciesId,p);
 return {...raw,forms:enhanced,items:new Map((extra.items||[]).map(i=>[i.id,i])),training:extra.training||{},machines:extra.machines||[],moveMeta:extra.moveMeta||{},regionalDexes:extra.regionalDexes||{},byKey:forms,bySpecies:species,get:id=>forms.get(String(id))||species.get(Number(id))};
}
export function statsFor(p,level){const l=limit(level,1,100);return p.stats.map((n,i)=>Math.floor((2*n+31)*l/100)+(i===0?l+10:5));}
export function experienceFor(dex,p,level){return dex.experience[p.growth]?.[level]??level**3;}
export function learnedMoves(dex,p,level){return [...new Set(p.learnset.filter(([at,id])=>at<=level&&dex.moves[id]?.power>0&&dex.moves[id]?.pp>0).map(([,id])=>id))];}
function creature(dex,key,level,uid,modern=false,mechanics=false,seed=uid,engineVersion=3){const p=dex.get(key);if(!p)throw Error('Unknown Pokémon');level=Math.floor(limit(level,1,100));let moves=modern?[...new Set(p.learnset.filter(([at,id])=>at<=level&&supportedMove(dex,id,engineVersion)).map(([,id])=>id))].slice(-4):learnedMoves(dex,p,level).slice(-4);if(!moves.length)moves.push(165);const m={uid,key:p.key,nickname:'',level,exp:experienceFor(dex,p,level),hp:1,stats:[],moves:moves.map(id=>({id,pp:dex.moves[id]?.pp||35})),friendship:70,shiny:modern&&random('shiny-'+uid)()<1/4096,status:'',stages:Array(8).fill(0),traits:traitsFor(p,seed,modern)};if(mechanics){m.ability=chooseAbility(p,seed);m.heldItem='';m.mechanicsVersion=3;}m.stats=specimenStats(p,m);m.hp=m.stats[0];return m;}

export function initialGame(dex,rules={}){
 const stock=Object.hasOwn(rules,'initialInventory')?Object.fromEntries(Object.entries(rules.initialInventory||{}).filter(([id,n])=>dex.items?.has(id)&&Number.isInteger(n)&&n>=0&&n<=99999)):{'poke-ball':10,'great-ball':3,potion:5,'fire-stone':1,'water-stone':1,'thunder-stone':1,'leaf-stone':1,'moon-stone':1};
 const s={schema:1,started:rules.started===true,region:REGIONS.includes(rules.region)?rules.region:'Kanto',party:[],box:[],pokemon:{},outUid:null,seen:[],caught:[],inventory:stock,battle:null,lastBattle:null,encounters:0,wins:0,quests:[],badges:[],trainerWins:{},fieldWeather:'clear',settings:{autoNarrate:false,terrain:'auto',transformations:transformationConfig(rules.transformations)},logs:[],lastResult:null,pendingNarration:false};
 for(const [i,p] of (rules.initialParty||[]).slice(0,6).entries()){const m=creature(dex,p.key||p.speciesId,p.level||5,'initial-'+i,rules.engineVersion>=2,rules.engineVersion>=3,p.seed||'initial-'+i,rules.engineVersion>=4?4:3);if(Number.isFinite(p.exp))m.exp=Math.floor(limit(p.exp,m.exp,m.level===100?m.exp:experienceFor(dex,dex.get(m.key),m.level+1)-1));m.nickname=String(p.nickname||'').slice(0,36);s.party.push(m.uid);s.pokemon[m.uid]=m;s.seen.push(dex.get(m.key).speciesId);s.caught.push(dex.get(m.key).speciesId);}
 for(const r of Array.isArray(rules.npcTeams)?rules.npcTeams.slice(0,24):[])if(r?.name)keepRoster(s,dex,r.name,r.team,'card');
 return s;
}
function random(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);let n=h>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const mark=(list,id)=>{if(!list.includes(id))list.push(id);};
function log(s,key,data={}){s.logs.push({key,...data});s.logs=s.logs.slice(-40);s.lastResult={key,...data};
 if(s.battle){s.battle.log=[...s.battle.log||[],{key,...data}].slice(-80);s.battle.used||=[];if(s.pokemon[s.battle.activeUid]&&!s.battle.used.includes(s.battle.activeUid))s.battle.used.push(s.battle.activeUid);}
}
// Every battle exit goes through here. Opponents leave with the battle, but
// chat headers written during it still name them, so keep their last state.
// The main chat receives the whole fight, and a fainted lead is back in its ball.
function closeBattle(s,dex,result,{caughtAs=''}={}){
 const b=s.battle,lead=s.pokemon[b.activeUid],partner=b.double?.partner,seen=b.trainer?[...b.trainer.team.slice(0,b.trainer.index+1),...partner?partner.team.slice(0,partner.index+1):[]]:[b.wild];s.former||={};
 for(const mon of b.trainer?[...b.trainer.team,...partner?.team||[]]:[b.wild]){delete s.former[mon.uid];s.former[mon.uid]={...copy(mon),ownerKind:b.trainer?'trainer':'wild',owner:partner?.team.includes(mon)?partner.name:b.trainer?.name||'',...mon===b.wild&&caughtAs?{caughtAs}:{}};}
 for(const uid of Object.keys(s.former).slice(0,-24))delete s.former[uid];
 s.lastBattle={result,opponent:species(dex,b.wild).name,trainer:b.trainer?.name||'',...partner?{partnerTrainer:partner.name}:{},partner:species(dex,lead).name,id:b.id,place:b.place||'',rounds:b.round,
  team:[...new Set([...b.used||[],b.activeUid,...b.double?.allyUid?[b.double.allyUid]:[]])].filter(uid=>s.pokemon[uid]).map(uid=>{const m=s.pokemon[uid];return{chatSpeaker:'pokemon:'+uid,name:m.nickname||species(dex,m).name,species:species(dex,m).name,level:m.level,hp:m.hp,maxHp:m.stats[0],fainted:!m.hp};}),
  opponents:seen.map(m=>({chatSpeaker:'pokemon:'+(m===b.wild&&caughtAs||m.uid),species:species(dex,m).name,level:m.level,hp:m.hp,maxHp:m.stats[0],fainted:!m.hp,...m===b.wild&&caughtAs?{caught:true}:{}})),
  events:(b.log||[]).slice(-30)};
 s.outUid=lead?.hp>0?b.activeUid:null;s.battle=null;
}
// NPC trainers keep one roster. Members have stable IDs, so the same
// individuals (nature, IVs, ability) return in every battle; levels only rise
// and a known trainer gains a member only when the story shows it.
export const LIVE='roleforge_pokemon_live';
// Wild shiny odds as 1/n. The rate is a journaled setting, so changing it only
// affects Pokémon met afterwards; earlier encounters replay unchanged.
export const SHINY_RATES=[8192,4096,1365,512,100,20];
export const rosterKey=name=>'npc-'+sha256(String(name||'').trim().toLocaleLowerCase()).slice(0,20);
function keepRoster(s,dex,name,team,source){
 const id=rosterKey(name),old=s.rosters?.[id],members=(old?.team||[]).map(m=>({...m})),used=new Set();
 for(const mon of Array.isArray(team)?team:[]){
  const p=dex.get(mon?.key||mon?.speciesId),level=Math.floor(Number(mon?.level));if(!p||p.battleOnly||!(level>=1&&level<=100))continue;
  const at=members.findIndex((m,i)=>!used.has(i)&&m.key===p.key);
  if(at>=0){used.add(at);members[at].level=Math.max(members[at].level,level);continue;}
  if(old&&mon.proven===false||members.length>=6)continue;
  used.add(members.length);members.push({uid:id+'-'+members.length,key:p.key,level,...typeof mon.nickname==='string'&&mon.nickname.trim()?{nickname:mon.nickname.trim().slice(0,36)}:{}});
 }
 if(!members.length)return old||null;
 s.rosters||={};delete s.rosters[id];s.rosters[id]={id,name:old?.name||String(name).trim().slice(0,80),team:members,source:old?.source||source};
 for(const key of Object.keys(s.rosters).slice(0,-24))delete s.rosters[key];
 return s.rosters[id];
}
// A story may field part of a roster, never someone else's Pokémon.
function rosterTeam(roster,picked){
 const used=new Set(),team=[];
 for(const mon of picked||[]){const at=roster.team.findIndex((m,i)=>!used.has(i)&&m.key===mon.key);if(at<0)continue;used.add(at);const {proven,...rest}=mon;team.push({...rest,...roster.team[at]});}
 return team.length?team:roster.team.map(m=>({...m}));
}
function rosterMon(dex,m){const mon=creature(dex,m.key,m.level,m.uid,true,true,undefined,4);if(m.nickname)mon.nickname=m.nickname;return mon;}
export function rosterPokemon(s,dex){return Object.values(s?.rosters||{}).flatMap(r=>r.team.filter(m=>dex.get(m.key)).map(m=>({mon:rosterMon(dex,m),owner:r.name})));}

// A player line asking for a battle now. Refusals and postponements do not count.
const battleRequest=/\b(?:battle|fight|duel|spar)\s+(?:me|us|with me|against me)\b|\blet'?s\s+(?:have\s+a\s+)?(?:pok[eé]mon\s+)?(?:battle|fight|duel)\b|\bi\s+(?:challenge|want\s+to\s+(?:battle|fight)|wanna\s+(?:battle|fight))\b|\bchallenge\s+you\b|\b(?:want|wanna|ready)\s+(?:to\s+)?(?:battle|fight)\b|\bpok[eé]mon\s+battle\b|ท้า(?:ประลอง|สู้|ดวล)|ขอ(?:ประลอง|ท้า)|มา(?:ประลอง|สู้|ดวล)กัน|(?:ประลอง|สู้|ต่อสู้|ดวล)กับ(?:ฉัน|ผม|เรา|หนู|ข้า)|แบทเทิล/iu;
const battleRefusal=/\b(?:don'?t|do not|won'?t|not now|later|never|refuses?|declines?|turns? (?:you|it) down|another time)\b|ไม่(?:อยาก|เอา|สู้|ประลอง|รับ)|ทีหลัง|ไว้ก่อน|ไว้คราวหน้า|ปฏิเสธ/iu;
const battleStart=/\b(?:sends?|sent|throws?|releases?|calls?) out\b|\bthrows? (?:a |her |his |their |the )?(?:pok[eé] ?ball|ball)\b|\blet'?s (?:battle|go|do this)\b|\bbattle (?:begins|starts|is on)\b|\baccepts? (?:your|the) (?:challenge|battle)\b|\bchallenge accepted\b|ส่ง.{0,40}ออกมา|ปล่อย.{0,40}ออกมา|โยน.{0,20}บอล|เริ่ม(?:การ)?(?:ต่อสู้|ประลอง)|(?:รับ|ตอบรับ)คำท้า|มา(?:ประลอง|สู้)กัน/iu;
const plain=source=>String(source||'').replace(/<!--[\s\S]*?-->/gu,'').replace(/<[^>]+>/gu,' ').replace(/\s+/gu,' ').trim();
const says=(text,name)=>{const t=text.toLocaleLowerCase(),n=String(name||'').trim().toLocaleLowerCase(),first=n.split(/\s+/u)[0];return n.length>=2&&(t.includes(n)||first.length>=3&&new RegExp('(?:^|[^\\p{L}])'+first.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')+'(?:$|[^\\p{L}])','u').test(t));};
function battleAsk(text){const v=plain(text);return v&&v.length<=2000&&battleRequest.test(v)&&!battleRefusal.test(v)?v.slice(0,600):'';}
// The player asked and the reply shows the battle starting, but the model wrote
// no metadata. Prefer a known roster; otherwise the trainer it shows sending
// out a Pokémon, or a name the player addressed. Unknown teams get a fixed
// regional roster seeded by the trainer's name.
const stopNames=new Set(['you','your','i','the','a','an','he','she','they','it','we','pokémon','pokemon','lets','let\'s','go','okay','ok','yes','come','alright','fine','battle','what','hey','oh','well']);
function storyChallenge(s,dex,ask,source,index){
 const visible=plain(source),lead=s.pokemon[healthy(s)];
 if(!lead||!battleStart.test(visible)||battleRefusal.test(visible))return null;
 const own=new Set(s.party.flatMap(uid=>[s.pokemon[uid]?.nickname,dex.get(s.pokemon[uid]?.key)?.name]).filter(Boolean).map(v=>v.toLocaleLowerCase()));
 const species=name=>[...dex.bySpecies.values()].find(p=>p.name.toLocaleLowerCase()===String(name||'').toLocaleLowerCase());
 const rosters=Object.values(s.rosters||{}).filter(r=>says(ask,r.name)&&says(visible,r.name));
 let name=rosters.length===1?rosters[0].name:'',team=[];
 if(!name){
  const sent=visible.match(/\b([A-Z][\p{L}'-]+(?: [A-Z][\p{L}'-]+)?) (?:sends?|sent|throws?|releases?|calls?) out (?:(?:her|his|their) )?(?:partner,? |trusty )?([A-Z][\p{L}.'-]+)/u)||visible.match(/(\S{2,30}?)\s*(?:ส่ง|ปล่อย|เรียก)\s*([A-Za-z][\w.'-]+)\s*ออกมา/u);
  const p=sent&&species(sent[2]);
  if(sent&&!stopNames.has(sent[1].toLocaleLowerCase())&&!own.has(sent[2].toLocaleLowerCase())&&!species(sent[1])){name=sent[1];if(p&&!p.legendary&&!p.mythical&&!p.battleOnly)team=[{key:p.key,level:lead.level}];}
 }
 if(!name){
  const words=[...new Set([...ask.matchAll(/\b[A-Z][\p{L}'-]{2,30}\b/gu)].map(v=>v[0]))].filter(w=>!stopNames.has(w.toLocaleLowerCase())&&!own.has(w.toLocaleLowerCase())&&!species(w)&&says(visible,w));
  if(words.length===1)name=words[0];
 }
 if(!name)return null;
 if(!s.rosters?.[rosterKey(name)]&&!team.length){
  const rng=random('roster:'+name.toLocaleLowerCase()),pool=regionalPool(dex,s.region,'grass',lead.level).filter(key=>!dex.get(key)?.legendary&&!dex.get(key)?.mythical);
  for(let n=lead.level<15?2:3;team.length<n&&pool.length;){const key=pool.splice(Math.floor(rng()*pool.length),1)[0];team.push({key,level:Math.max(2,lead.level-1+team.length)});}
 }
 return {id:'story-recovered-'+index,type:'trainer-offer',source:'story',engine:5,trainerKey:rosterKey(name),name:name.trim().slice(0,80),place:'',team,equipment:{},consent:true};
}
function healthy(s){return s.party.find(id=>s.pokemon[id].hp>0);}
function active(s){return s.pokemon[s.battle?.activeUid||s.party[0]];}
function species(dex,mon){return dex.get(mon.key);}
export function effectiveness(dex,type,types){return types.reduce((n,t)=>n*(dex.typeChart[type+':'+t]??1),1);}
const damage=executeMove;
// EXP, levels, EVs, newly unlocked moves and friendship for one defeated foe.
function gainExp(dex,m,foe,engine){const p=species(dex,m),xp=Math.max(1,Math.floor(species(dex,foe).baseExp*foe.level/7));m.exp+=xp;while(m.level<100&&m.exp>=experienceFor(dex,p,m.level+1))m.level++;refreshStats(p,m);awardEVs(p,m,species(dex,foe).evYield);
 const unlocked=[...new Set(p.learnset.filter(([at,id])=>at<=m.level&&supportedMove(dex,id,engine||3)).map(([,id])=>id))];for(const id of unlocked)if(!m.moves.some(v=>v.id===id)){if(m.moves.length<4)m.moves.push({id,pp:dex.moves[id].pp});else{m.pendingMoves||=[];if(!m.pendingMoves.includes(id))m.pendingMoves.push(id);}}
 m.friendship=Math.min(255,m.friendship+(m.ball==='luxury-ball'?6:3));return xp;}
// Double battles: two story trainers who challenge together, each fielding one
// Pokémon at a time, against the player's first two healthy Pokémon. Slot 0
// stays in the singles fields (battle.wild, battle.activeUid) so every screen
// and record keeps working; slot 1 lives in battle.double. Each player move
// names a target, foes pick a living target, and all four act by priority then
// Speed. Spread moves and ally targeting are not modelled.
function doubleSlots(s){const b=s.battle,d=b.double;return {allies:[b.activeUid,d.allyUid].map(uid=>uid&&s.pokemon[uid]?.hp>0?s.pokemon[uid]:null),foes:[b.wild?.hp>0?b.wild:null,d.foe?.hp>0?d.foe:null]};}
function doubleFaint(s,dex,mon,side){const b=s.battle,d=b.double;if(!b)return;
 if(side==='foe'){const slot=b.wild===mon?0:1,trainer=slot?d.partner:b.trainer;
  for(const ally of doubleSlots(s).allies.filter(Boolean)){const xp=gainExp(dex,ally,mon,b.engine);log(s,'double-ko',{name:species(dex,mon).name,trainer:trainer.name,partner:species(dex,ally).name,xp,level:ally.level});}
  if(trainer.index+1<trainer.team.length){trainer.index++;const next=trainer.team[trainer.index];if(slot)d.foe=next;else b.wild=next;const facing=doubleSlots(s).allies.find(Boolean);if(facing)enterBattle(next,facing,b,dex);mark(s.seen,species(dex,next).speciesId);log(s,'trainer-next',{name:species(dex,next).name,trainer:trainer.name});}
  if(!doubleSlots(s).foes.some(Boolean))doubleVictory(s,dex);return;}
 log(s,'fainted',{name:species(dex,mon).name});const slot=b.activeUid===mon.uid?0:1,taken=[b.activeUid,d.allyUid],next=s.party.find(uid=>s.pokemon[uid].hp>0&&!taken.includes(uid));
 if(next){leaveBattle(mon);if(b.transformRules)switchForm(mon,dex);if(!mon.hp){restoreBattleForm(mon,dex);delete mon.tera;}if(slot)d.allyUid=next;else b.activeUid=next;const foe=doubleSlots(s).foes.find(Boolean);if(foe)enterBattle(s.pokemon[next],foe,b,dex);log(s,'switch',{name:species(dex,s.pokemon[next]).name});}
 if(!doubleSlots(s).allies.some(Boolean)){if(!s.pokemon[b.activeUid]?.hp&&d.allyUid&&s.pokemon[d.allyUid]?.hp)b.activeUid=d.allyUid;finish(s,dex,false);}
}
function doubleVictory(s,dex){const b=s.battle,d=b.double,lead=s.pokemon[b.activeUid]?.hp?s.pokemon[b.activeUid]:s.pokemon[d.allyUid]||s.pokemon[b.activeUid];s.wins++;log(s,'victory',{name:species(dex,lead).name,opponent:b.trainer.name+' & '+d.partner.name,xp:0,level:lead.level,leveled:false});
 s.trainerWins||={};for(const who of [b.trainer,d.partner]){const first=!s.trainerWins[who.id];s.trainerWins[who.id]=(s.trainerWins[who.id]||0)+1;if(first)for(const[id,quantity]of Object.entries(who.items||{}))s.inventory[id]=(s.inventory[id]||0)+quantity;log(s,'trainer-victory',{name:who.name,badge:0});const challenge=s.trainerChallenges?.find(v=>v.id===who.id);if(challenge)challenge.status='completed';}
 closeBattle(s,dex,'victory');for(const mon of Object.values(s.pokemon)){mon.stages=Array(8).fill(0);mon.flinch=false;mon.choiceMove=0;mon.protected=false;mon.endure=false;delete mon.battleAbility;}
}
function doubleTurn(s,dex,rng,e,alliesAct=true){const b=s.battle,{allies,foes}=doubleSlots(s),picks=Array.isArray(e.moves)?e.moves:[],actions=[];
 if(alliesAct)allies.forEach((a,i)=>{if(!a)return;const pick=picks[i]||{},slot=a.moves.find(v=>v.id===Number(pick.moveId))||(Number(pick.moveId)===165&&!a.moves.some(v=>v.pp>0&&supportedMove(dex,v.id)&&moveAllowed(a,dex.moves[v.id]))?{id:165,pp:1}:null);assert(slot&&slot.pp>0,'Choose a move for each of your Pokémon');actions.push({side:'ally',mon:a,slot,target:Number(pick.target)===1?1:0});});
 for(const f of foes)if(f)actions.push({side:'foe',mon:f,slot:enemyMove(f,dex,rng),target:rng()<.5?0:1});
 const priority=act=>(b.engine>=4?battleMove(dex,act.mon,dex.moves[act.slot.id],b):dex.moves[act.slot.id]).priority||0;
 actions.sort((x,y)=>priority(y)-priority(x)||effectiveStat(y.mon,5,b,dex,null)-effectiveStat(x.mon,5,b,dex,null));
 for(const act of actions){if(!s.battle)return;const now=doubleSlots(s),own=act.side==='ally'?now.allies:now.foes;if(!own.includes(act.mon))continue;const targets=act.side==='ally'?now.foes:now.allies,target=targets[act.target]||targets[1-act.target];if(!target)continue;
  const result=damage(dex,act.mon,target,act.slot,rng,b);log(s,act.side==='ally'?'player-hit':'enemy-hit',{name:species(dex,act.mon).name,target:species(dex,target).name,...result});
  if(!target.hp)doubleFaint(s,dex,target,act.side==='ally'?'foe':'ally');if(s.battle&&!act.mon.hp)doubleFaint(s,dex,act.mon,act.side);}
 if(s.battle)s.battle.round++;
}
function finish(s,dex,win){
 const b=s.battle,foe=b.wild,m=s.pokemon[b.activeUid];
 if(win){const before=m.level,p=species(dex,m),xp=gainExp(dex,m,foe,b.engine);
 if(b.trainer&&b.trainer.index+1<b.trainer.team.length){b.trainer.index++;b.wild=b.trainer.team[b.trainer.index];if(b.transformRules)automaticForm(s,dex,b.wild,'entry',log);enterBattle(b.wild,m,b,dex);log(s,'trainer-next',{name:species(dex,b.wild).name,trainer:b.trainer.name,xp,level:m.level});if(!b.wild.hp)finish(s,dex,true);return;}
 s.wins++;log(s,'victory',{name:p.name,opponent:species(dex,foe).name,xp,level:m.level,leveled:m.level>before});
 if(b.trainer){s.trainerWins||={};const first=!s.trainerWins[b.trainer.id];s.trainerWins[b.trainer.id]=(s.trainerWins[b.trainer.id]||0)+1;if(first){for(const[id,quantity]of Object.entries(b.trainer.items||{}))s.inventory[id]=(s.inventory[id]||0)+quantity;if(b.trainer.badge){s.badges||=[];if(!s.badges.includes(b.trainer.id))s.badges.push(b.trainer.id);}}log(s,'trainer-victory',{name:b.trainer.name,badge:first&&b.trainer.badge||0});}
 }else log(s,'defeat',{opponent:species(dex,foe).name,trainer:b.trainer?.name||''});for(const who of [b.trainer,b.double?.partner].filter(Boolean)){const challenge=s.trainerChallenges?.find(v=>v.id===who.id);if(challenge)challenge.status=win?'completed':'offered';}closeBattle(s,dex,win?'victory':'defeat');for(const mon of Object.values(s.pokemon)){mon.stages=Array(8).fill(0);mon.flinch=false;mon.choiceMove=0;mon.protected=false;mon.endure=false;delete mon.battleAbility;}
}
function enemyMove(foe,dex,rng){const choices=foe.moves.filter(v=>v.pp>0&&supportedMove(dex,v.id,foe.battleEngine||3)&&moveAllowed(foe,dex.moves[v.id]));if(!choices.length)return{id:165,pp:1};return choices[Math.floor(rng()*choices.length)];}
function enemyTurn(s,dex,rng,slot){if(!s.battle)return;const a=active(s),foe=s.battle.wild,result=damage(dex,foe,a,slot||enemyMove(foe,dex,rng),rng,s.battle);log(s,'enemy-hit',{name:species(dex,foe).name,target:species(dex,a).name,...result});if(!foe.hp){finish(s,dex,true);return;}if(!a.hp){log(s,'fainted',{name:species(dex,a).name});const next=healthy(s);if(next){leaveBattle(a);if(s.battle?.transformRules)switchForm(a,dex);if(!a.hp){restoreBattleForm(a,dex);delete a.tera;}s.battle.activeUid=next;automaticForm(s,dex,s.pokemon[next],'entry',log);enterBattle(s.pokemon[next],foe,s.battle,dex);}else finish(s,dex,false);}}

function canLeave(m,foe,dex){return battleTypes(m,dex).includes('ghost')||!m.trapped&&!m.gmaxTrap&&(abilityOf(foe)!=='shadow-tag'||abilityOf(m)==='shadow-tag');}
function primalEntry(s,dex,m,side){if(!s.battle?.transformRules)return;const option=transformationOptions(s,dex,m,side).find(v=>v.kind==='primal'&&v.ready);if(option&&(m.heldItem==='red-orb'||m.heldItem==='blue-orb')){transformBattle(s,dex,m,option,0,side,log);enterBattle(m,side==='player'?s.battle.wild:active(s),s.battle,dex);}}
function prepareTransformations(s,dex,a,foe){
 automaticForm(s,dex,a,'check',log);automaticForm(s,dex,foe,'check',log);
 primalEntry(s,dex,a,'player');primalEntry(s,dex,foe,'opponent');
 if(a.formState&&['mega','primal','ultra'].includes(a.formState.kind)&&a.formEntry!==a.key){enterBattle(a,foe,s.battle,dex);a.formEntry=a.key;}
 const plan=foe.transformPlan;if(plan&&s.battle.transformRules?.npc){const option=transformationOptions(s,dex,foe,'opponent').find(v=>v.kind===plan.kind&&(!plan.key||v.key===plan.key)&&v.ready);if(option){const move=foe.moves.find(v=>v.pp>0)?.id;transformBattle(s,dex,foe,option,move,'opponent',log);if(['mega','primal','ultra'].includes(option.kind))enterBattle(foe,a,s.battle,dex);}}
}

const assert=(condition,message)=>{if(!condition)throw Error(message);};
export function evolutionOptions(s,dex,uid,context={}){const m=s.pokemon[uid];if(!m)return[];const p=species(dex,m),hour=Number(String(context.time||'').split(':')[0]),day=Number.isFinite(hour)&&hour>=6&&hour<18;
 return p.evolutions.map(e=>{let reason='';if(![1,2,3].includes(e.trigger))reason='special';else if(e.trigger===2&&!context.trade)reason='trade';else if(e.gender&&m.traits?.gender!==(e.gender===1?'female':'male'))reason='gender';else if(e.location||e.upsideDown||e.affection)reason='special';else if(e.time&&(!context.time||(e.time==='day')!==day))reason='time';else if(e.held&&m.heldItem!==e.held)reason='held';else if(e.knownMove&&!m.moves.some(v=>v.id===e.knownMove))reason='move';else if(e.knownType&&!m.moves.some(v=>dex.moves[v.id]?.type===e.knownType))reason='move';else if(e.partySpecies&&!s.party.some(id=>species(dex,s.pokemon[id]).speciesId===e.partySpecies))reason='party';else if(e.partyType&&!s.party.some(id=>species(dex,s.pokemon[id]).types.includes(e.partyType)))reason='party';else if(e.tradeSpecies&&context.tradeSpecies!==e.tradeSpecies)reason='trade-partner';else if(e.rain&&normalizeWeather(context.weather||s.fieldWeather)!=='rain')reason='rain';else if(e.relativeStats!==''&&Number(e.relativeStats)!==Math.sign(m.stats[1]-m.stats[2]))reason='stats';else if(e.friendship&&m.friendship<e.friendship)reason='friendship';else if(e.level&&m.level<e.level)reason='level';else if(e.item&&!(s.inventory[e.item]>0))reason='item';return {...e,ready:!reason,reason,target:dex.bySpecies.get(e.to)};});}

export function transition(current,event,dex,rules={}){
 const s=copy(current),e=event||{},rng=random(e.id);s.quests||=[];s.badges||=[];s.trainerWins||={};assert(typeof e.id==='string'&&e.id.length<160,'Invalid action ID');if(e.engine>=4&&s.battle&&!s.battle.transformRules){s.battle.transformRules=transformationConfig(s.settings.transformations);s.battle.transformUsed={};s.battle.engine=4;for(const m of[s.pokemon[s.battle.activeUid],s.battle.wild])m.battleEngine=4;}
 if(formAction(s,e,dex,log)){if(!['transformation-settings','pokemon-form-settings'].includes(e.type))s.pendingNarration=true;return s;}
 if(expansionAction(s,e,dex,{create:(...args)=>creature(...args,e.engine>=3,undefined,e.engine>=4?4:3),log})){if(!['sandbox-settings'].includes(e.type))s.pendingNarration=true;return s;}
 if(e.type==='trainer-offer'){assert(e.source==='story'&&Array.isArray(e.team)&&e.team.length<=6&&(e.team.length>=1||s.rosters?.[e.trainerKey]),'A trainer needs a story-backed team');s.trainerChallenges||=[];
  // Repeated narration must not replace an accepted team's state mid-battle.
  if(s.battle?.trainer?.id===e.trainerKey)return s;
  const roster=keepRoster(s,dex,e.name,e.team,'story'),team=e.engine>=5&&roster?rosterTeam(roster,e.team):e.team;assert(team.length,'A trainer needs a story-backed team');
  const offer={id:e.trainerKey,name:e.name,place:e.place,team,equipment:e.equipment||{},status:'offered'};s.trainerChallenges=s.trainerChallenges.filter(v=>v.id!==offer.id).slice(-19);s.trainerChallenges.push(offer);log(s,'trainer-offered',{name:e.name});
  // A named partner turns the pair into one double battle. Whichever offer
  // arrives first waits for the other, so an immediate pair starts once.
  const mateKey=e.engine>=5&&e.partner?rosterKey(e.partner):'';if(mateKey&&mateKey!==offer.id){offer.partner=mateKey;const mate=s.trainerChallenges.find(v=>v.id===mateKey&&v.status==='offered');if(mate)mate.partner=offer.id;}
  const go=e.mode==='immediate'||e.consent,mate=offer.partner?s.trainerChallenges.find(v=>v.id===offer.partner&&v.status==='offered'):null;
  if(offer.partner&&!mate){if(go)offer.waiting=true;return s;}
  if((go||mate?.waiting)&&s.started&&healthy(s)&&!s.battle)return transition(s,{...e,type:'trainer',challenge:offer.id,context:{place:e.place,weather:s.fieldWeather}},dex,rules);
 }else if(e.type==='roster'){assert(['story','card'].includes(e.source)&&e.name,'A roster needs a named trainer');keepRoster(s,dex,e.name,e.team,e.source);return s;
 }else if(e.type==='starter'){
  assert(!s.started,'A partner has already been chosen');const region=REGIONS.indexOf(e.region),allowed=STARTERS[Math.max(0,region)];assert(allowed.includes(Number(e.speciesId)),'Choose a starter from this region');assert(s.party.length<6,'Party full');const m=creature(dex,e.speciesId,rules.starterLevel||5,e.id,e.engine>=2,e.engine>=3,undefined,e.engine>=4?4:3);s.pokemon[m.uid]=m;s.party.unshift(m.uid);s.started=true;s.region=REGIONS[Math.max(0,region)];mark(s.seen,Number(e.speciesId));mark(s.caught,Number(e.speciesId));log(s,'starter',{name:species(dex,m).name});
 }else if(['encounter','explore','trainer','quest-encounter'].includes(e.type)){
  assert(s.started&&healthy(s),'Choose a partner and heal first');assert(!s.battle,'Finish the current encounter first');
  const lead=s.pokemon[healthy(s)],terrain=resolveTerrain(s.settings.terrain,e.context?.place||'').id;let key,lvl,trainer,partner;
  if(e.type==='trainer'){const challenge=e.challenge?s.trainerChallenges?.find(v=>v.id===e.challenge&&v.status==='offered'):null;assert(!e.challenge||challenge,'This trainer has not challenged you');if(challenge){assert(String(e.context?.place||'').toLocaleLowerCase().includes(challenge.place.toLocaleLowerCase()),'Meet this trainer at the challenge location');challenge.status='accepted';trainer={id:challenge.id,name:challenge.name,items:{},equipment:challenge.equipment||{},index:0,team:challenge.team.map((mon,i)=>{const m=creature(dex,mon.key,mon.level,mon.uid||'trainer-'+e.id+'-'+i,true,e.engine>=3,undefined,e.engine>=4?4:3);if(mon.nickname)m.nickname=mon.nickname;if(e.engine>=4&&mon.transform){m.transformPlan=mon.transform;m.heldItem=mon.heldItem||'';m.teraType=mon.teraType;}return m;})};const mate=challenge.partner&&e.engine>=4?s.trainerChallenges.find(v=>v.id===challenge.partner&&v.status==='offered'):null;if(mate&&s.party.filter(id=>s.pokemon[id].hp>0).length>=2){mate.status='accepted';delete mate.waiting;partner={id:mate.id,name:mate.name,items:{},equipment:mate.equipment||{},index:0,team:mate.team.map((mon,i)=>{const m=creature(dex,mon.key,mon.level,mon.uid||'trainer-'+e.id+'-p'+i,true,e.engine>=3,undefined,4);if(mon.nickname)m.nickname=mon.nickname;if(mon.transform){m.transformPlan=mon.transform;m.heldItem=mon.heldItem||'';m.teraType=mon.teraType;}return m;})};}}else{const def=trainerDefinition(e.trainerId,s.region,lead.level);assert(def,'Unknown trainer');if(def.badge)assert(gymAvailable(def,s.region,e.context?.place),'Visit this Gym in the story first');trainer={...def,index:0,team:def.team.map((id,i)=>creature(dex,id,def.level,'trainer-'+e.id+'-'+i,true,e.engine>=3,undefined,e.engine>=4?4:3))};}}
  if(e.type==='quest-encounter'){const q=s.quests.find(q=>q.id===e.quest&&q.status==='accepted');assert(q&&s.wins>=q.wins&&s.region===q.region&&String(e.context?.place||'').toLowerCase().includes(q.place.toLowerCase()),'Accept the quest and reach its destination first');key=q.speciesId;lvl=Math.max(30,lead.level);}
  else if(e.type==='explore'){if(e.engine>=2)assert(!isCenter(e.context?.place)&&!/gym|ยิม/iu.test(e.context?.place||''),'Leave the Center or Gym before exploring for wild Pokémon');const modern=regionalPool(dex,s.region,terrain,lead.level),pool=e.engine>=2&&modern.length?modern:ENCOUNTERS[Math.max(0,REGIONS.indexOf(s.region))];key=pool[Math.floor(rng()*pool.length)];lvl=Math.max(2,lead.level-2);}
  else{key=e.key||e.speciesId;lvl=limit(e.level,1,100);}
  const foe=trainer?trainer.team[0]:creature(dex,key,lvl,'wild-'+e.id,e.engine>=2,e.engine>=3,undefined,e.engine>=4?4:3);if(!trainer&&e.engine>=2)foe.shiny=random('shiny-'+foe.uid)()<1/(s.settings.shinyRate||4096);assert(!species(dex,foe).battleOnly,'Battle-only form cannot appear wild');
  if(e.engine>=2&&!trainer&&(species(dex,foe).legendary||species(dex,foe).mythical)){const q=s.quests.find(q=>q.speciesId===species(dex,foe).speciesId&&q.status==='accepted');assert(q&&s.wins>=q.wins&&s.region===q.region&&String(e.context?.place||e.place||'').toLowerCase().includes(q.place.toLowerCase()),'This rare encounter requires its accepted quest and destination');assert(!s.caught.includes(q.speciesId),'This rare encounter has already been completed');}
  for(const mon of Object.values(s.pokemon))mon.stages=Array(8).fill(0);s.battle={id:e.id,engine:e.engine>=4?4:3,place:String(e.place||e.context?.place||'').slice(0,80),wild:foe,activeUid:s.outUid&&s.party.includes(s.outUid)&&s.pokemon[s.outUid]?.hp>0?s.outUid:healthy(s),round:1,...e.engine>=4?{transformRules:transformationConfig(s.settings.transformations),transformUsed:{}}:{},weather:normalizeWeather(e.context?.weather||s.fieldWeather),weatherTurns:0,...trainer?{trainer}:{}};const entrants=[foe,active(s)].sort((a,b)=>effectiveStat(b,5,s.battle,dex,a)-effectiveStat(a,5,s.battle,dex,b));for(const mon of entrants){if(e.engine>=4)automaticForm(s,dex,mon,'entry',log);enterBattle(mon,mon===foe?active(s):foe,s.battle,dex);if(e.engine>=4)primalEntry(s,dex,mon,mon===foe?'opponent':'player');}s.outUid=s.battle.activeUid;s.encounters++;mark(s.seen,species(dex,foe).speciesId);log(s,trainer?'trainer-start':'encounter',{name:trainer?.name||species(dex,foe).name,level:foe.level,...foe.shiny&&!trainer?{shiny:true}:{}});
  if(partner){const d=s.battle.double={partner,foe:partner.team[0],allyUid:s.party.find(id=>s.pokemon[id].hp>0&&id!==s.battle.activeUid)},ally=s.pokemon[d.allyUid];automaticForm(s,dex,d.foe,'entry',log);enterBattle(d.foe,active(s),s.battle,dex);enterBattle(ally,foe,s.battle,dex);mark(s.seen,species(dex,d.foe).speciesId);log(s,'double-start',{name:trainer.name,partner:partner.name});}
 }else if(e.type==='attack'&&s.battle?.double){doubleTurn(s,dex,rng,e);
 }else if(e.type==='switch'&&s.battle?.double){const b=s.battle,d=b.double,slot=Number(e.slot)===1?1:0,current=slot?d.allyUid:b.activeUid;assert(s.party.includes(e.uid)&&s.pokemon[e.uid].hp>0&&e.uid!==b.activeUid&&e.uid!==d.allyUid,'Choose a healthy party member');if(current&&s.pokemon[current])leaveBattle(s.pokemon[current]);if(slot)d.allyUid=e.uid;else b.activeUid=e.uid;const foe=doubleSlots(s).foes.find(Boolean);if(foe)enterBattle(s.pokemon[e.uid],foe,b,dex);log(s,'switch',{name:species(dex,s.pokemon[e.uid]).name});doubleTurn(s,dex,rng,{},false);
 }else if(e.type==='attack'){
  assert(s.battle,'No active battle');const a=active(s),foe=s.battle.wild;if(e.engine>=4){if(e.transform)transformBattle(s,dex,a,e.transform,e.moveId,'player',log);prepareTransformations(s,dex,a,foe);}
 const slot=a.moves.find(v=>v.id===Number(e.moveId))||(Number(e.moveId)===165&&!a.moves.some(v=>v.pp>0&&supportedMove(dex,v.id)&&moveAllowed(a,dex.moves[v.id]))?{id:165,pp:1}:null);assert(slot&&slot.pp>0,'This move has no PP');const move=e.engine>=4?battleMove(dex,a,dex.moves[slot.id],s.battle):dex.moves[slot.id],opponentMove=enemyMove(foe,dex,rng),enemyPriority=(e.engine>=4?battleMove(dex,foe,dex.moves[opponentMove.id],s.battle):dex.moves[opponentMove.id]).priority||0,playerPriority=move.priority||0,speedF=effectiveStat(foe,5,s.battle,dex,a),speedA=effectiveStat(a,5,s.battle,dex,foe),enemyFirst=enemyPriority>playerPriority||enemyPriority===playerPriority&&(speedF>speedA||speedF===speedA&&rng()<.5),uid=a.uid;if(enemyFirst)enemyTurn(s,dex,rng,opponentMove);if(s.battle&&s.battle.activeUid===uid&&a.hp){const result=damage(dex,a,foe,slot,rng,s.battle);log(s,'player-hit',{name:species(dex,a).name,target:species(dex,foe).name,...result});if(!foe.hp)finish(s,dex,true);else if(!a.hp){const next=healthy(s);if(next){leaveBattle(a);if(s.battle?.transformRules)switchForm(a,dex);if(!a.hp){restoreBattleForm(a,dex);delete a.tera;}s.battle.activeUid=next;automaticForm(s,dex,s.pokemon[next],'entry',log);enterBattle(s.pokemon[next],foe,s.battle,dex);}else finish(s,dex,false);}else if(!enemyFirst)enemyTurn(s,dex,rng,opponentMove);}if(s.battle)s.battle.round++;
 }else if(e.type==='catch'){
  assert(s.battle&&!s.battle.trainer&&s.battle.wild.hp>0,'Only wild Pokémon can be caught');const ball=BALLS.includes(e.ball)?e.ball:'poke-ball';assert(s.inventory[ball]>0,'No Poké Balls remaining');s.inventory[ball]--;const foe=s.battle.wild,p=species(dex,foe),chance=ballChance(dex,s,ball,e.context||{});
  if(rng()<chance){const m={...copy(foe),uid:e.id,ball};if(e.engine>=4)clearTransformations(m,dex);if(ball==='friend-ball')m.friendship=150;if(ball==='heal-ball'){m.hp=m.stats[0];m.status='';for(const slot of m.moves)slot.pp=dex.moves[slot.id].pp;}s.pokemon[m.uid]=m;(s.party.length<6?s.party:s.box).push(m.uid);mark(s.caught,p.speciesId);for(const q of s.quests)if(q.speciesId===p.speciesId&&q.status==='accepted')q.status='completed';log(s,'caught',{name:p.name,storage:s.box.includes(m.uid)?'box':'party'});closeBattle(s,dex,'caught',{caughtAs:m.uid});}else{log(s,'escaped-ball',{name:p.name});enemyTurn(s,dex,rng);if(s.battle)s.battle.round++;}
 }else if(e.type==='forfeit'){assert(s.battle?.trainer,'No trainer battle');finish(s,dex,false);
 }else if(e.type==='run'){assert(s.battle&&!s.battle.trainer,'Only wild encounters can be fled');assert(e.engine<4||canLeave(active(s),s.battle.wild,dex),'This Pokémon is trapped');log(s,'run',{name:species(dex,s.battle.wild).name});closeBattle(s,dex,'run');
 }else if(e.type==='switch'){assert(s.battle&&s.party.includes(e.uid)&&s.pokemon[e.uid].hp>0&&s.battle.activeUid!==e.uid,'Choose a healthy party member');assert(canLeave(active(s),s.battle.wild,dex),'This Pokémon is trapped');leaveBattle(active(s));if(s.battle?.transformRules)switchForm(active(s),dex);s.battle.activeUid=e.uid;if(e.engine>=4)automaticForm(s,dex,active(s),'entry',log);enterBattle(active(s),s.battle.wild,s.battle,dex);if(e.engine>=4)s.battle.round++;log(s,'switch',{name:species(dex,s.pokemon[e.uid]).name});enemyTurn(s,dex,rng);
 }else if(e.type==='use-item'){useMedicine(s,dex,e.item,e.uid||s.battle?.activeUid||s.party[0],e.moveId);log(s,'used-item',{name:dex.items?.get(e.item)?.name||e.item,target:species(dex,s.pokemon[e.uid||s.battle?.activeUid||s.party[0]]).name});if(s.battle){enemyTurn(s,dex,rng);if(s.battle)s.battle.round++;}
 }else if(e.type==='potion'){const m=s.pokemon[e.uid||s.battle?.activeUid||s.party[0]];assert(m&&m.hp>0&&m.hp<m.stats[0]&&s.inventory.potion>0,'Potion cannot be used');s.inventory.potion--;m.hp=Math.min(m.stats[0],m.hp+20);log(s,'potion',{name:species(dex,m).name});if(s.battle)enemyTurn(s,dex,rng);
 }else if(e.type==='ability-awaken'){const m=s.pokemon[e.uid];assert(!s.battle&&m&&!m.ability&&e.source==='user','Reveal an unassigned ability outside battle');m.ability=chooseAbility(species(dex,m),m.traits?.seed||m.uid);m.mechanicsVersion=3;log(s,'ability',{name:species(dex,m).name,ability:m.ability});
 }else if(e.type==='equip'){assert(!s.battle,'Change held items outside battle');const m=s.pokemon[e.uid];assert(m&&(HELD_ITEMS.has(e.item)||transformationHeldItem(e.item)||species(dex,m).evolutions.some(v=>v.held===e.item))&&s.inventory[e.item]>0,'Choose an owned supported held item');if(m.heldItem)assert((s.inventory[m.heldItem]||0)<99999,'Item stock limit reached');if(m.heldItem)s.inventory[m.heldItem]=(s.inventory[m.heldItem]||0)+1;s.inventory[e.item]--;m.heldItem=e.item;if(e.engine>=4)syncEquipmentForm(m,dex);log(s,'equipped',{name:species(dex,m).name,item:e.item});
 }else if(e.type==='unequip'){assert(!s.battle,'Change held items outside battle');const m=s.pokemon[e.uid];assert(m?.heldItem,'No held item');assert((s.inventory[m.heldItem]||0)<99999,'Item stock limit reached');s.inventory[m.heldItem]=(s.inventory[m.heldItem]||0)+1;log(s,'unequipped',{name:species(dex,m).name,item:m.heldItem});m.heldItem='';if(e.engine>=4)syncEquipmentForm(m,dex);
 }else if(e.type==='weather'){assert(e.source==='story'&&['clear','rain','sun','sand','hail','snow'].includes(e.weather),'Weather needs a story event');s.fieldWeather=e.weather;if(s.battle){s.battle.weather=e.weather;s.battle.weatherTurns=0;}log(s,'weather',{weather:e.weather});
 }else if(e.type==='heal'){assert(!s.battle,'Leave battle before visiting the Pokémon Center');if(e.engine>=2)assert(isCenter(e.context?.place),'Visit a Pokémon Center in the story first');for(const m of Object.values(s.pokemon)){m.hp=m.stats[0];m.status='';m.statusTurns=0;for(const v of m.moves)v.pp=dex.moves[v.id]?.pp||35;}log(s,'heal');
 }else if(e.type==='deposit'||e.type==='withdraw'){
  assert(!s.battle,'Storage is unavailable during battle');const from=e.type==='deposit'?s.party:s.box,to=e.type==='deposit'?s.box:s.party;assert(from.includes(e.uid),'Pokémon is not in that location');assert(e.type!=='deposit'||s.party.length>1,'Keep at least one partner');assert(e.type!=='withdraw'||s.party.length<6,'Party limit is six');from.splice(from.indexOf(e.uid),1);to.push(e.uid);if(e.type==='deposit'&&s.outUid===e.uid)s.outUid=null;log(s,e.type,{name:species(dex,s.pokemon[e.uid]).name});
 }else if(e.type==='evolve'||e.type==='trade-evolve'){
  assert(!s.battle,'Evolution waits until after battle');const trade=e.type==='trade-evolve';if(trade)assert(isCenter(e.context?.place)||/link club|trade cent(?:er|re)|ศูนย์แลกเปลี่ยน/iu.test(e.context?.place||''),'Visit a Pokémon Center or Link Club for a trade-back');const m=s.pokemon[e.uid],option=evolutionOptions(s,dex,e.uid,{...e.context,trade,tradeSpecies:e.tradeSpecies}).find(v=>v.to===Number(e.to)&&v.ready);assert(option,'Evolution requirements are not met');const oldMax=m.stats[0],from=species(dex,m).name;m.key=option.target.key;m.stats=specimenStats(option.target,m);m.hp=m.hp===0?0:Math.min(m.stats[0],m.hp+m.stats[0]-oldMax);if(option.item)s.inventory[option.item]--;if(option.held)m.heldItem='';if(trade)m.trades=(m.trades||0)+1;if(m.ability)m.ability=chooseAbility(option.target,m.traits?.seed||m.uid);mark(s.seen,option.to);mark(s.caught,option.to);log(s,'evolved',{name:option.target.name,from});
 }else if(e.type==='send-out'||e.type==='recall'){assert(!s.battle,'Finish the battle before changing a companion in the scene');if(e.type==='send-out'){assert(s.party.includes(e.uid)&&s.pokemon[e.uid]?.hp>0,'Choose a healthy party member');s.outUid=e.uid;log(s,'send-out',{name:species(dex,s.pokemon[e.uid]).name});}else{assert(s.outUid&&(!e.uid||e.uid===s.outUid),'That Pokémon is not out');log(s,'recall',{name:species(dex,s.pokemon[s.outUid]).name});s.outUid=null;}
 }else if(e.type==='party-set'){assert(!s.battle,'Party changes are unavailable during battle');const owned=[...s.party,...s.box],want=[...new Set(Array.isArray(e.uids)?e.uids:[])].filter(uid=>owned.includes(uid)).slice(0,6);assert(want.length,'Choose at least one Pokémon');const left=s.party.filter(uid=>!want.includes(uid));s.box=[...s.box.filter(uid=>!want.includes(uid)),...left];s.party=want;if(s.outUid&&!s.party.includes(s.outUid))s.outUid=null;log(s,'party-set',{name:String(e.name||'').slice(0,24)});
 }else if(e.type==='preset-save'){const name=String(e.name||'').trim().slice(0,24),uids=[...new Set(Array.isArray(e.uids)?e.uids:[])].filter(uid=>s.pokemon[uid]).slice(0,6);assert(name&&uids.length,'Name the preset and choose its team');s.presets=[...(s.presets||[]).filter(v=>v.name!==name),{name,uids}].slice(-6);
 }else if(e.type==='preset-delete'){s.presets=(s.presets||[]).filter(v=>v.name!==e.name);
 }else if(e.type==='lead'){assert(!s.battle&&s.party.includes(e.uid)&&s.pokemon[e.uid].hp>0,'Choose a healthy party member outside battle');s.party=[e.uid,...s.party.filter(id=>id!==e.uid)];log(s,'lead',{name:species(dex,s.pokemon[e.uid]).name});
 }else if(e.type==='nickname'){assert(s.pokemon[e.uid],'Unknown party member');s.pokemon[e.uid].nickname=String(e.name||'').trim().slice(0,36);
 }else if(e.type==='narrated'){s.pendingNarration=false;
 }else if(e.type==='settings'){if(REGIONS.includes(e.region))s.region=e.region;if(typeof e.autoNarrate==='boolean')s.settings.autoNarrate=e.autoNarrate;if(e.terrain!==undefined){assert(validTerrain(e.terrain),'Unknown battle terrain');s.settings.terrain=e.terrain;}if(e.shinyRate!==undefined){assert(SHINY_RATES.includes(e.shinyRate),'Unknown shiny rate');s.settings.shinyRate=e.shinyRate;}
 }else throw Error('Unsupported Pokémon action');if(s.battle&&['attack','catch','switch','potion','use-item'].includes(e.type)){const a=active(s),foe=s.battle.wild;for(const m of[a,foe]){if(e.engine>=3){for(const change of endTurn(m,species(dex,m),dex,{...s.battle,combatants:[a,foe]},applyStatus))log(s,'battle-effect',{name:species(dex,m).name,...change});}else{const amount=residual(m);if(amount)log(s,'residual',{name:species(dex,m).name,damage:amount,status:m.status});}m.protected=false;m.maxGuard=false;m.endure=false;}if(!foe.hp)finish(s,dex,true);else if(!a.hp){const next=healthy(s);if(next){leaveBattle(a);if(s.battle?.transformRules)switchForm(a,dex);if(!a.hp){restoreBattleForm(a,dex);delete a.tera;}s.battle.activeUid=next;automaticForm(s,dex,s.pokemon[next],'entry',log);enterBattle(s.pokemon[next],foe,s.battle,dex);}else finish(s,dex,false);}if(e.engine>=4&&s.battle)finishTransformationTurn(s,dex,log);if(s.battle?.weatherTurns>0&&--s.battle.weatherTurns===0){s.battle.weather='clear';log(s,'weather',{weather:'clear'});}}if(s.battle?.transformRules)for(const m of[s.pokemon[s.battle.activeUid],s.battle.wild])automaticForm(s,dex,m,'check',log);
 if(s.battle?.transformRules)for(let i=0;s.battle&&!active(s).hp&&i<6;i++){const uid=healthy(s);if(!uid){finish(s,dex,false);break;}s.battle.activeUid=uid;automaticForm(s,dex,active(s),'entry',log);enterBattle(active(s),s.battle.wild,s.battle,dex);}
 if(s.battle)s.outUid=s.battle.activeUid;if(!s.battle)for(const m of Object.values(s.pokemon)){clearTransformations(m,dex);m.stages=Array(8).fill(0);m.choiceMove=0;m.protected=false;m.endure=false;m.flashFire=false;delete m.battleAbility;}if(!['settings','nickname','narrated'].includes(e.type))s.pendingNarration=true;return s;
}
export function journalEvent(event,m){const offset=String(m.mes||'').length;return {...event,swipe:m.swipe_id||0,offset,anchorHash:sha256(String(m.mes||''))};}
export function activeEvents(m){const swipe=m.swipe_id||0,length=String(m.mes||'').length;return Array.isArray(m.extra?.[JOURNAL])?m.extra[JOURNAL].filter(e=>e&&e.swipe===swipe&&e.offset<=length&&(!e.anchorHash||e.anchorHash===sha256(String(m.mes||'').slice(0,e.offset)))):[];}
export function narratedEncounters(source,dex){return parsePokemonStory(source,dex).events;}

function playerSceneAction(s,text,index,dex){
 if(s.battle||!s.started)return null;
 const visible=String(text||'').replace(/<[^>]*>/gu,' ').replace(/\|[^|]*\|/gu,' ');
 if(/\b(?:not|never|if|would|could|might|imagine)\b|ไม่ได้|ไม่เรียก|ถ้าหาก|สมมติ/iu.test(visible))return null;
 const send=/(?:\b(?:send(?:s|ing)? out|sent out|release[sd]?|summon(?:s|ed)?|bring(?:s|ing)? out|let(?:s)? out|call(?:s|ed)? out)\b|เรียก.{0,20}ออกมา|ปล่อย.{0,20}ออกมา|ส่ง.{0,20}ออกมา|โยน.{0,30}บอล)/iu.test(visible);
 const recall=/(?:\b(?:recall(?:s|ed)?|return(?:s|ed)? to (?:its |the )?(?:pok[eé] ?ball|ball)|return(?:s|ed)? .{1,60} to (?:its |the )?(?:pok[eé] ?ball|ball))\b|เรียก.{0,30}กลับ|เก็บ.{0,30}เข้าบอล)/iu.test(visible);
 if(!send&&!recall)return null;
 const matches=s.party.filter(uid=>{const mon=s.pokemon[uid],names=[mon.nickname,dex.get(mon.key)?.name].filter(n=>n&&n.length>=2);return names.some(n=>visible.toLocaleLowerCase().includes(n.toLocaleLowerCase()));});
 if(matches.length!==1)return null;
 return {id:'user-scene-'+index,type:recall?'recall':'send-out',uid:matches[0],source:'user'};
}
export function replayStep(s,m,index,dex,rules,seen,receipts){if(m.is_system)return s;if(m.is_user){const ask=battleAsk(m.mes),e=playerSceneAction(s,m.mes,index,dex);if(e)try{s=transition(s,e,dex,rules);}catch{}return ask||s.battleAsk?{...s,battleAsk:ask?{index,text:ask}:null}:s;}
 // A player's battle request is consent for the very next reply only. Older
 // replies keep their original meaning; recovery runs only on live replies.
 const ask=s.battleAsk?.text||'',live=Number(m.extra?.[LIVE])>=1;if(s.battleAsk)s={...s,battleAsk:null};
 const parsed=[...narratedEncounters(m.mes,dex).map(e=>({...e,id:index+'-'+e.id})),...activeEvents(m)],offers=parsed.filter(e=>e.type==='trainer-offer');
 const events=parsed.map(e=>ask&&e.type==='trainer-offer'&&!e.mode&&(e.engine>=5||live)&&(offers.length===1||says(ask,e.name))?{...e,consent:true}:e);
 // Battle actions taken afterwards are journaled on this same reply, so the
 // recovered start sits where the narration starts the battle.
 if(ask&&live&&!offers.length&&!s.battle){const e=storyChallenge(s,dex,ask,m.mes,index),at=String(m.mes||'').search(battleStart);if(e)events.push({...e,offset:at<0?0:at});}
 events.sort((a,b)=>(a.offset||0)-(b.offset||0));
 for(const e of events){if(seen.has(e.id)||e.type==='grant-item'&&e.source==='story'&&e.receipt&&receipts.has(e.receipt))continue;try{s=transition(s,e,dex,rules);seen.add(e.id);if(e.type==='grant-item'&&e.source==='story'&&e.receipt)receipts.add(e.receipt);}catch{/* Invalid or stale actions never mutate the committed state. */}}return s;}
export function replay(chat,dex,rules={}){let s=initialGame(dex,rules);const seen=new Set(),receipts=new Set();for(const[index,m]of(chat||[]).entries())s=replayStep(s,m,index,dex,rules,seen,receipts);return s;}

export function worldPrompt(s,dex){const display=m=>({id:m.uid,chatSpeaker:'pokemon:'+m.uid,species:species(dex,m).name,form:species(dex,m).form,key:m.key,types:battleTypes(m,dex),baseForm:baseKey(m),transformation:m.formState?.kind||m.tera&&'tera'||'',tera:m.tera||null,dynamax:m.dynamax||null,nickname:m.nickname,level:m.level,hp:m.hp,maxHp:m.stats[0],ability:abilityOf(m),heldItem:m.heldItem||'',status:m.status||'',...m.hp>0?{}:{fainted:true,condition:'fainted: inside its Poké Ball, cannot battle, act or speak'},gender:m.traits?.gender||'unknown',nature:m.traits?.nature||'Hardy',stats:m.stats,shiny:m.shiny,moves:m.moves.map(v=>{const move=battleMove(dex,m,dex.moves[v.id],s.battle||{});return{name:move.name,pp:v.pp,...m.dynamax||m.tera?{type:move.type,power:move.power}:{} };})});const fainted=s.party.filter(id=>!(s.pokemon[id].hp>0));return 'ROLEFORGE POKEMON ADDON\n'+JSON.stringify({region:s.region,partnerChosen:s.started,outsideCompanion:s.outUid&&s.pokemon[s.outUid]?display(s.pokemon[s.outUid]):null,party:s.party.map(id=>display(s.pokemon[id])),...fainted.length?{faintedParty:fainted.map(id=>'pokemon:'+id),canBattle:s.party.some(id=>s.pokemon[id].hp>0)}:{},storageCount:s.box.length,bag:Object.fromEntries(Object.entries(s.inventory).filter(([,n])=>n>0)),badges:s.badges,quests:s.quests,trainerChallenges:(s.trainerChallenges||[]).filter(v=>v.status!=='completed').slice(-3),...Object.keys(s.rosters||{}).length?{npcRosters:Object.values(s.rosters).slice(-8).map(r=>({name:r.name,team:r.team.map(m=>({chatSpeaker:'pokemon:'+m.uid,species:dex.get(m.key)?.name||m.key,level:m.level,...m.nickname?{nickname:m.nickname}:{}}))}))}:{},battle:s.battle?{round:s.battle.round,weather:fieldWeather(s.battle,[s.pokemon[s.battle.activeUid],s.battle.wild]),terrain:s.battle.terrain||'none',wild:display(s.battle.wild),trainer:s.battle.trainer?.name,...s.battle.double?{double:{partnerTrainer:s.battle.double.partner.name,partnerPokemon:s.battle.double.foe?display(s.battle.double.foe):null,secondPlayerPokemon:s.battle.double.allyUid?display(s.pokemon[s.battle.double.allyUid]):null}}:{},events:(s.battle.log||[]).slice(-12)}:null,lastBattle:s.lastBattle,transformationRules:transformationConfig(s.settings.transformations),battleTransformationRules:s.battle?.transformRules||null,transformationUsed:s.battle?.transformUsed||{},recentResults:s.logs.slice(-6)})+`
Engine state and recentResults are authoritative: narrate these HP, moves, captures, evolution, forms and results in the current language. outsideCompanion is the Pokémon physically out with the player; null means none. Respect named player send-out/recall narration. Never invent player dialogue, outcomes, rewards or repeat resolved actions. Thoughts are not permission. Never enable Sandbox or cheats yourself.
${fainted.length?'faintedParty Pokémon (hp 0) are back in their Poké Balls: absent from the scene, unable to battle, move, speak or cry until healed at a Pokémon Center or revived. Never narrate them acting or give them headers/dialogue. canBattle false: the player cannot battle until healed.\n':''}${s.lastBattle?'lastBattle is canon for the story: result, final HP/fainted states, opponents and events of the last finished battle. Keep narration consistent with it; never replay or contradict it.\n':''}For Pokémon cries/dialogue use <tr-header name="pokemon:UID"/> and <tr-dialogue name="pokemon:UID"> with the exact chatSpeaker ID above. Following narration belongs to that Pokémon; humans use their regular headers. Do not add Pokémon to NPC dossiers.
The bag is the single Pokémon stock also shown in RoleForge; never duplicate its items in tretaresia_patch inventory ops.
After visible narration append <!--roleforge_pokemon:{"version":5,"events":[...]}--> only for established events below. Each needs evidence copied EXACTLY from visible player-scene narration, not thoughts, hypotheticals, future offers or NPC cutaways. Evidence must name the species/item, current player and location where relevant. Thai names need displayName with that exact Thai spelling; stable keys stay English. JSON strings cannot contain literal newlines.
- Wild Pokémon present before the player now: {"type":"encounter","key":"pidgey","level":3,"place":"Route 1","evidence":"A wild Pidgey appears in front of you on Route 1."}. Emit even without Explore. Never emit player catch, damage or ownership.
- Item ACTUALLY handed over: {"type":"item","item":"ultra-ball","quantity":3,"receipt":"oak-gift-1","evidence":"Oak gives you Ultra Ball 3."}. Evidence must prove the item and exact quantity (write digits). receipt is a stable unique transaction id: reuse it for the same handover, never regrant an old gift. Purchases must be completed first. Unknown item effects are reference-only.
- Rare encounter quest offer: {"type":"quest","speciesId":144,"place":"Seafoam Islands","region":"Kanto","wins":2,"evidence":"Oak offers you a quest to find Articuno at Seafoam Islands."}. Player accepts; rare encounters need the quest, wins and destination. Never accept/complete quests yourself.
- NPC rosters: each named NPC trainer owns ONE fixed team (npcRosters). Declare it on first appearance: {"type":"roster","name":"Canari","team":[{"key":"pikachu","level":20}],"evidence":"<sentence naming Canari>"}. Canon NPCs: canon Pokémon at fitting levels; originals: a fitting fixed team (1–6). Species never change; levels may rise; new members need proof.
- Trainer battle: {"type":"trainer","mode":"immediate","name":"Canari","place":"Route 1","evidence":"Canari accepts your challenge and the battle begins."}. The roster is the team (optional "team" subset). immediate = battle starts NOW: forced, or the player asked and the NPC agrees. Omit mode for invitations. Never invent player consent. Trainer Pokémon are not wild. Tag team: one event each with "partner":"<other>". Optional member transform:{"kind":"mega","key":"charizard-mega-x"},heldItem:"charizardite-x"; trainer equipment:{"key-stone":1}. Kinds: primal,ultra,dynamax,gigantamax,tera,zmove; prove forms/items/teraType.
- Current player weather: {"type":"weather","weather":"rain","evidence":"Rain is falling around you now."}. clear/rain/sun/sand/hail/snow only.
All transformation systems are enabled by default; player configuration governs equipment, per-system limits, mixed battles and NPC use. Engine resolves Mega, Primal, Ultra, Dynamax/Gigantamax, Tera, Z-Moves, fusion and species forms: never transform the player's Pokémon or grant equipment by narration alone. Active types, abilities and move outcomes are authoritative. Other abilities may be reference-only; never invent effects. PvP and breeding are not simulated. Pokémon Center service requires reaching a Center, Gym challenges require that Gym, tutors require a Tutor/Center. Opening menus never teleports or heals.`;}
