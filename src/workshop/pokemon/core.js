import {validTerrain} from './terrains.js?v=pokemon-game-ui-4';
import {sha256} from '../../vendor/js-sha256/index.js?v=0.85.6';
// Pokémon preview: immutable, replayable game state. No network or host globals.
export const JOURNAL='roleforge_pokemon_v1',PROMPT='roleforge_pokemon_world',ACTION_PROMPT='roleforge_pokemon_action';
export const newActionId=()=>globalThis.crypto?.randomUUID?.()||'pk-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export const STARTERS=[[1,4,7],[152,155,158],[252,255,258],[387,390,393],[495,498,501],[650,653,656],[722,725,728],[810,813,816],[906,909,912]];
export const REGIONS=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
export const ENCOUNTERS=[[16,19,10,13,25,43,63,129,133,280],[161,163,165,167,179,183,194,187,204,228],[261,263,265,270,273,276,280,283,285],[396,399,401,403,406,418,427,431,449],[504,506,509,519,522,524,529,540,543],[659,661,664,667,669,672,674,677,679],[731,734,736,739,742,744,749,753,759],[819,821,824,827,829,831,833,835,837],[915,917,919,921,924,926,928,935,938]];
const copy=v=>structuredClone(v),limit=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||min));
export function catalogIndex(raw){
 if(raw?.schema!==1||!Array.isArray(raw.forms)||!raw.forms.length)throw Error('Pokédex data unavailable');
 const forms=new Map(raw.forms.map(p=>[p.key,p])),species=new Map();
 for(const p of raw.forms)if(p.default||!species.has(p.speciesId))species.set(p.speciesId,p);
 return {...raw,byKey:forms,bySpecies:species,get:id=>forms.get(String(id))||species.get(Number(id))};
}
export function statsFor(p,level){const l=limit(level,1,100);return p.stats.map((n,i)=>Math.floor((2*n+31)*l/100)+(i===0?l+10:5));}
export function experienceFor(dex,p,level){return dex.experience[p.growth]?.[level]??level**3;}
export function learnedMoves(dex,p,level){return [...new Set(p.learnset.filter(([at,id])=>at<=level&&dex.moves[id]?.power>0&&dex.moves[id]?.pp>0).map(([,id])=>id))];}
function creature(dex,key,level,uid){const p=dex.get(key);if(!p)throw Error('Unknown Pokémon');level=Math.floor(limit(level,1,100));const stats=statsFor(p,level),moves=learnedMoves(dex,p,level).slice(-4);if(!moves.length)moves.push(33);return {uid,key:p.key,nickname:'',level,exp:experienceFor(dex,p,level),hp:stats[0],stats,moves:moves.map(id=>({id,pp:dex.moves[id]?.pp||35})),friendship:70,shiny:false};}
export function initialGame(dex,rules={}){
 const s={schema:1,started:rules.started===true,region:REGIONS.includes(rules.region)?rules.region:'Kanto',party:[],box:[],pokemon:{},seen:[],caught:[],inventory:{'poke-ball':10,'great-ball':3,potion:5,'fire-stone':1,'water-stone':1,'thunder-stone':1,'leaf-stone':1,'moon-stone':1},battle:null,encounters:0,wins:0,settings:{autoNarrate:false,terrain:'auto'},logs:[],lastResult:null,pendingNarration:false};
 for(const [i,p] of (rules.initialParty||[]).slice(0,6).entries()){const m=creature(dex,p.key||p.speciesId,p.level||5,'initial-'+i);if(Number.isFinite(p.exp))m.exp=Math.floor(limit(p.exp,m.exp,m.level===100?m.exp:experienceFor(dex,dex.get(m.key),m.level+1)-1));m.nickname=String(p.nickname||'').slice(0,36);s.party.push(m.uid);s.pokemon[m.uid]=m;s.seen.push(dex.get(m.key).speciesId);s.caught.push(dex.get(m.key).speciesId);}
 return s;
}
function random(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);let n=h>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const mark=(list,id)=>{if(!list.includes(id))list.push(id);};
function log(s,key,data={}){s.logs.push({key,...data});s.logs=s.logs.slice(-40);s.lastResult={key,...data};}
function healthy(s){return s.party.find(id=>s.pokemon[id].hp>0);}
function active(s){return s.pokemon[s.battle?.activeUid||s.party[0]];}
function species(dex,mon){return dex.get(mon.key);}
export function effectiveness(dex,type,types){return types.reduce((n,t)=>n*(dex.typeChart[type+':'+t]??1),1);}
function damage(dex,attacker,defender,slot,rng){
 const move=dex.moves[slot.id],a=species(dex,attacker),d=species(dex,defender);if(!move?.power)throw Error('Move is not supported by this battle preview');if(slot.pp<=0)throw Error('No PP remaining');slot.pp--;
 if(rng()*100>(move.accuracy||100))return {damage:0,move:move.name,miss:true,effect:1};
 const effect=effectiveness(dex,move.type,d.types),special=move.class===3,crit=rng()<1/24,stab=a.types.includes(move.type)?1.5:1;
 const amount=effect===0?0:Math.max(1,Math.floor(((2*attacker.level/5+2)*move.power*attacker.stats[special?3:1]/Math.max(1,defender.stats[special?4:2])/50+2)*stab*effect*(crit?1.5:1)*(.85+rng()*.15)));
 defender.hp=Math.max(0,defender.hp-amount);return {damage:amount,move:move.name,effect,crit};
}
function finish(s,dex,win){
 const b=s.battle,foe=b.wild,m=s.pokemon[b.activeUid];if(win){const before=m.level,oldMax=m.stats[0],p=species(dex,m),xp=Math.max(1,Math.floor(species(dex,foe).baseExp*foe.level/7));m.exp+=xp;
 while(m.level<100&&m.exp>=experienceFor(dex,p,m.level+1))m.level++;
 m.stats=statsFor(p,m.level);m.hp=Math.min(m.stats[0],m.hp+m.stats[0]-oldMax);for(const id of learnedMoves(dex,p,m.level))if(m.moves.length<4&&!m.moves.some(v=>v.id===id))m.moves.push({id,pp:dex.moves[id].pp});m.friendship=Math.min(255,m.friendship+3);s.wins++;log(s,'victory',{name:p.name,xp,level:m.level,leveled:m.level>before});
 }else log(s,'defeat');s.battle=null;
}
function enemyTurn(s,dex,rng){if(!s.battle)return;const a=active(s),foe=s.battle.wild,choices=foe.moves.filter(v=>v.pp>0);if(!choices.length){foe.moves=[{id:165,pp:1}];choices.push(foe.moves[0]);}const result=damage(dex,foe,a,choices[Math.floor(rng()*choices.length)],rng);log(s,'enemy-hit',{name:species(dex,foe).name,target:species(dex,a).name,...result});if(!a.hp){log(s,'fainted',{name:species(dex,a).name});const next=healthy(s);if(next)s.battle.activeUid=next;else finish(s,dex,false);}}
const assert=(condition,message)=>{if(!condition)throw Error(message);};
export function evolutionOptions(s,dex,uid){const m=s.pokemon[uid];if(!m)return[];return species(dex,m).evolutions.map(e=>{let reason='';if(e.trigger===2)reason='trade';else if(e.trigger!==1&&e.trigger!==3)reason='special';else if(e.gender||e.time||e.held||e.knownMove||e.knownType||e.location||e.tradeSpecies||e.partySpecies||e.partyType||e.rain||e.upsideDown||e.relativeStats!=='')reason='special';else if(e.friendship&&m.friendship<e.friendship)reason='friendship';else if(e.affection)reason='affection';else if(e.level&&m.level<e.level)reason='level';else if(e.item&&!(s.inventory[e.item]>0))reason='item';return {...e,ready:!reason,reason,target:dex.bySpecies.get(e.to)};});}
export function transition(current,event,dex,rules={}){
 const s=copy(current),e=event||{},rng=random(e.id);assert(typeof e.id==='string'&&e.id.length<160,'Invalid action ID');
 if(e.type==='starter'){
  assert(!s.started,'A partner has already been chosen');const region=REGIONS.indexOf(e.region),allowed=STARTERS[Math.max(0,region)];assert(allowed.includes(Number(e.speciesId)),'Choose a starter from this region');assert(s.party.length<6,'Party full');const m=creature(dex,e.speciesId,rules.starterLevel||5,e.id);s.pokemon[m.uid]=m;s.party.unshift(m.uid);s.started=true;s.region=REGIONS[Math.max(0,region)];mark(s.seen,Number(e.speciesId));mark(s.caught,Number(e.speciesId));log(s,'starter',{name:species(dex,m).name});
 }else if(e.type==='encounter'||e.type==='explore'){
  assert(s.started&&healthy(s),'Choose a partner and heal first');assert(!s.battle,'Finish the current encounter first');const pool=ENCOUNTERS[Math.max(0,REGIONS.indexOf(s.region))],key=e.type==='explore'?pool[Math.floor(rng()*pool.length)]:e.key||e.speciesId;const chosen=species(dex,s.pokemon[healthy(s)]),lvl=e.type==='explore'?Math.max(2,s.pokemon[healthy(s)].level-2):limit(e.level,1,100),foe=creature(dex,key,lvl,'wild-'+e.id);assert(!species(dex,foe).battleOnly,'Battle-only form cannot appear wild');s.battle={id:e.id,wild:foe,activeUid:healthy(s),round:1};s.encounters++;mark(s.seen,species(dex,foe).speciesId);log(s,'encounter',{name:species(dex,foe).name,level:lvl});
 }else if(e.type==='attack'){
  assert(s.battle,'No active battle');const a=active(s),foe=s.battle.wild,slot=a.moves.find(v=>v.id===Number(e.moveId));assert(slot&&slot.pp>0,'This move has no PP');const move=dex.moves[slot.id],enemyFirst=foe.stats[5]>a.stats[5]&&move.priority<=0,uid=a.uid;if(enemyFirst)enemyTurn(s,dex,rng);if(s.battle&&s.battle.activeUid===uid&&a.hp){const result=damage(dex,a,foe,slot,rng);log(s,'player-hit',{name:species(dex,a).name,target:species(dex,foe).name,...result});if(!foe.hp)finish(s,dex,true);else if(!enemyFirst)enemyTurn(s,dex,rng);}if(s.battle)s.battle.round++;
 }else if(e.type==='catch'){
  assert(s.battle&&s.battle.wild.hp>0,'No catchable wild Pokémon');const ball=['poke-ball','great-ball'].includes(e.ball)?e.ball:'poke-ball';assert(s.inventory[ball]>0,'No Poké Balls remaining');s.inventory[ball]--;const foe=s.battle.wild,p=species(dex,foe),chance=Math.min(.95,Math.max(.02,(3*foe.stats[0]-2*foe.hp)/(3*foe.stats[0])*p.catchRate/255*(ball==='great-ball'?1.5:1)));
  if(rng()<chance){const m={...copy(foe),uid:e.id};s.pokemon[m.uid]=m;(s.party.length<6?s.party:s.box).push(m.uid);mark(s.caught,p.speciesId);log(s,'caught',{name:p.name,storage:s.party.length>6?'box':s.box.includes(m.uid)?'box':'party'});s.battle=null;}else{log(s,'escaped-ball',{name:p.name});enemyTurn(s,dex,rng);if(s.battle)s.battle.round++;}
 }else if(e.type==='run'){assert(s.battle,'No encounter');log(s,'run',{name:species(dex,s.battle.wild).name});s.battle=null;
 }else if(e.type==='switch'){assert(s.battle&&s.party.includes(e.uid)&&s.pokemon[e.uid].hp>0&&s.battle.activeUid!==e.uid,'Choose a healthy party member');s.battle.activeUid=e.uid;log(s,'switch',{name:species(dex,s.pokemon[e.uid]).name});enemyTurn(s,dex,rng);
 }else if(e.type==='potion'){const m=s.pokemon[e.uid||s.battle?.activeUid||s.party[0]];assert(m&&m.hp>0&&m.hp<m.stats[0]&&s.inventory.potion>0,'Potion cannot be used');s.inventory.potion--;m.hp=Math.min(m.stats[0],m.hp+20);log(s,'potion',{name:species(dex,m).name});if(s.battle)enemyTurn(s,dex,rng);
 }else if(e.type==='heal'){assert(!s.battle,'Leave battle before visiting the Pokémon Center');for(const m of Object.values(s.pokemon)){m.hp=m.stats[0];for(const v of m.moves)v.pp=dex.moves[v.id]?.pp||35;}log(s,'heal');
 }else if(e.type==='deposit'||e.type==='withdraw'){
  assert(!s.battle,'Storage is unavailable during battle');const from=e.type==='deposit'?s.party:s.box,to=e.type==='deposit'?s.box:s.party;assert(from.includes(e.uid),'Pokémon is not in that location');assert(e.type!=='deposit'||s.party.length>1,'Keep at least one partner');assert(e.type!=='withdraw'||s.party.length<6,'Party limit is six');from.splice(from.indexOf(e.uid),1);to.push(e.uid);log(s,e.type,{name:species(dex,s.pokemon[e.uid]).name});
 }else if(e.type==='evolve'){
  assert(!s.battle,'Evolution waits until after battle');const m=s.pokemon[e.uid],option=evolutionOptions(s,dex,e.uid).find(v=>v.to===Number(e.to)&&v.ready);assert(option,'Evolution requirements are not met');const oldMax=m.stats[0],from=species(dex,m).name;m.key=option.target.key;m.stats=statsFor(option.target,m.level);m.hp=m.hp===0?0:Math.min(m.stats[0],m.hp+m.stats[0]-oldMax);if(option.item)s.inventory[option.item]--;mark(s.seen,option.to);mark(s.caught,option.to);log(s,'evolved',{name:option.target.name,from});
 }else if(e.type==='lead'){assert(!s.battle&&s.party.includes(e.uid)&&s.pokemon[e.uid].hp>0,'Choose a healthy party member outside battle');s.party=[e.uid,...s.party.filter(id=>id!==e.uid)];log(s,'lead',{name:species(dex,s.pokemon[e.uid]).name});
 }else if(e.type==='nickname'){assert(s.pokemon[e.uid],'Unknown party member');s.pokemon[e.uid].nickname=String(e.name||'').trim().slice(0,36);
 }else if(e.type==='narrated'){s.pendingNarration=false;
 }else if(e.type==='settings'){if(REGIONS.includes(e.region))s.region=e.region;if(typeof e.autoNarrate==='boolean')s.settings.autoNarrate=e.autoNarrate;if(e.terrain!==undefined){assert(validTerrain(e.terrain),'Unknown battle terrain');s.settings.terrain=e.terrain;}
 }else throw Error('Unsupported Pokémon action');if(!['settings','nickname','narrated'].includes(e.type))s.pendingNarration=true;return s;
}
export function journalEvent(event,m){const offset=String(m.mes||'').length;return {...event,swipe:m.swipe_id||0,offset,anchorHash:sha256(String(m.mes||''))};}
export function activeEvents(m){const swipe=m.swipe_id||0,length=String(m.mes||'').length;return Array.isArray(m.extra?.[JOURNAL])?m.extra[JOURNAL].filter(e=>e&&e.swipe===swipe&&e.offset<=length&&(!e.anchorHash||e.anchorHash===sha256(String(m.mes||'').slice(0,e.offset)))):[];}
export function narratedEncounters(source,dex){
 const raw=String(source||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,''),visible=raw.replace(/<!--[\s\S]*?-->/gu,'').replace(/<[^>]+>/gu,' ').replace(/\s+/gu,' '),events=[];
 for(const m of raw.matchAll(/<!--roleforge_pokemon:([\s\S]*?)-->/gu)){let data;try{data=JSON.parse(m[1]);}catch{continue;}for(const [i,e]of (Array.isArray(data.events)?data.events:[]).slice(0,2).entries()){const p=dex.get(e.key||e.speciesId),proof=String(e.evidence||'').trim();if(e.type!=='encounter'||!p||proof.length<8||!visible.includes(proof)||!proof.toLowerCase().includes(p.name.toLowerCase())||!/ปรากฏ|พบ|เจอ|โผล่|wild|appear|encounter/iu.test(proof)||/ไม่พบ|สมมติ|\b(?:not|would|if)\b/iu.test(proof))continue;events.push({id:'story-'+m.index+'-'+i+'-'+p.key,type:'encounter',key:p.key,level:limit(e.level,1,100),offset:m.index+m[0].length});}}
 return events;
}
export function replay(chat,dex,rules={}){let s=initialGame(dex,rules);const seen=new Set();for(const [index,m]of (chat||[]).entries()){if(m.is_user||m.is_system)continue;const events=[...narratedEncounters(m.mes,dex).map(e=>({...e,id:index+'-'+e.id})),...activeEvents(m)].sort((a,b)=>(a.offset||0)-(b.offset||0));for(const e of events){if(seen.has(e.id))continue;try{s=transition(s,e,dex,rules);seen.add(e.id);}catch{/* Invalid/stale actions cannot corrupt another branch. */}}}return s;}
export function worldPrompt(s,dex){const display=m=>({id:m.uid,species:species(dex,m).name,form:species(dex,m).form,nickname:m.nickname,level:m.level,hp:m.hp,maxHp:m.stats[0],moves:m.moves.map(v=>({name:dex.moves[v.id]?.name,pp:v.pp}))});return 'ROLEFORGE POKEMON ADDON\n'+JSON.stringify({region:s.region,partnerChosen:s.started,party:s.party.map(id=>display(s.pokemon[id])),storageCount:s.box.length,bag:s.inventory,battle:s.battle?{round:s.battle.round,wild:display(s.battle.wild)}:null,recentResults:s.logs.slice(-6)})+'\nUse the supplied engine outcome as authority for HP, capture, XP, moves and evolution. Narrate naturally in the current chat language. Do not invent player dialogue or choose their partner or next action. Buttons already resolve mechanics; never apply the same damage/reward twice. If the player actually encounters a wild Pokémon in the visible current scene, append <!--roleforge_pokemon:{"events":[{"type":"encounter","speciesId":16,"level":3,"evidence":"exact visible sentence naming the wild Pokemon and its appearance"}]}-->. The encounter evidence must visibly include the canonical English species name (a local-language name may appear alongside it). Keep encounters local to this scene. Do not create captures, items, levels, ownership, an evolution or battles merely because a species appears in lore, dialogue, memories or an absent scene. Full Pokédex contents are reader reference, not automatic player encounter knowledge. Legendary and battle-only forms do not appear routinely. Species catalogue coverage does not mean all competitive game mechanics are simulated.';}
