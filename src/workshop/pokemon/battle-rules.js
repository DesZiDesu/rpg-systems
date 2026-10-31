import {executeMove as legacyMove,effectiveStat as legacyStat,applyStatus as legacyStatus,supportedMove as legacySupported} from './legacy-battle-rules.js?v=0.94.0';
import {TRANSFORMATION_DATA} from './transformation-data.js?v=0.94.0';
import {battleMove,battleTypes,stabMultiplier,prepareMoveForm,shieldForm,afterMoveForm,applyMaxEffect,applyZStatus,copyBattleForm,stage,baseKey} from './transformations.js?v=0.94.0';
import {CONTACT_MOVES,POWDER_MOVES} from './move-flags.js?v=0.94.0';
import {abilityOf,itemOf,statusAllowed,statMultiplier,changeStage,moveAllowed,fieldWeather,preDamage,damageModifier,afterDamage,WEATHER_MOVES,setWeather} from './mechanics.js?v=0.94.0';
export const STATUS_NAMES={paralysis:['อัมพาต','Paralysis'],sleep:['หลับ','Sleep'],freeze:['แช่แข็ง','Freeze'],burn:['ไหม้','Burn'],poison:['พิษ','Poison']};
const ailments={1:'paralysis',2:'sleep',3:'freeze',4:'burn',5:'poison'};
const special=new Set([144,150,182,197,203,588,606,...Object.keys(WEATHER_MOVES).map(Number)]);
const unsupported=new Set(['Explosion','Self-Destruct','Misty Explosion','U-turn','Volt Switch','Flip Turn','Dragon Tail','Circle Throw','Rapid Spin','Mortal Spin','Knock Off','Thief','Covet','Bug Bite','Pluck','Acrobatics','Facade','Venoshock','Hex','Brine','Retaliate','Payback','Assurance','Pursuit','Sucker Punch','Focus Punch','Solar Beam','Solar Blade','Fly','Dig','Dive','Bounce','Phantom Force','Shadow Force','Sky Attack','Razor Wind','Skull Bash','Freeze Shock','Ice Burn','Geomancy','Hyper Beam','Giga Impact','Frenzy Plant','Blast Burn','Hydro Cannon','Rock Wrecker','Roar of Time','Meteor Assault','Prismatic Laser','Eternabeam','Gigaton Hammer','Blood Moon','Rage Fist','Last Respects']);
export function supportedMove(dex,id,engine=4){if(engine<4)return legacySupported(dex,id);const move=dex.moves[id],meta=dex.moveMeta?.[id];if(!move||unsupported.has(move.name))return false;if(special.has(Number(id)))return true;if(!meta)return move.power>0;return(meta.maxHits||1)<=10&&((move.power>0&&[0,4,6,7,8].includes(meta.category))||(!move.power&&[1,2,3].includes(meta.category)&&(meta.category!==1||Boolean(ailments[meta.ailment]))));}
export function stageFactor(stage,accuracy=false){const n=Math.max(-6,Math.min(6,stage||0)),base=accuracy?3:2;return n>=0?(base+n)/base:base/(base-n);}
export function effectiveStat(m,index,battle={},dex,opponent){if(battle.engine&&battle.engine<4)return legacyStat(m,index,battle,dex,opponent);const weather=fieldWeather(battle,battle.combatants||[m,opponent].filter(Boolean));return Math.max(1,m.stats[index]*stageFactor(m.stages?.[index])*(index===5&&m.status==='paralysis'?.5:1)*statMultiplier(m,index,weather,dex?.get(m.key)));}
export function applyStatus(target,p,status,rng,ignore=false){if(target.battleEngine&&target.battleEngine<4)return legacyStatus(target,p,status,rng,ignore);if(target.status||!target.hp||!ignore&&!statusAllowed(target,status))return false;const types=target.tera&&target.tera.type!=='stellar'?[target.tera.type]:target.typeOverride||p.types;if(status==='poison'&&types.some(t=>['poison','steel'].includes(t))||status==='burn'&&types.includes('fire')||status==='freeze'&&types.includes('ice')||status==='paralysis'&&types.includes('electric'))return false;delete target.toxicTurns;target.status=status;target.statusTurns=status==='sleep'?1+Math.floor(rng()*3):0;return true;}
export function executeMove(dex,attacker,defender,slot,rng,battle={}){if(battle.engine&&battle.engine<4)return legacyMove(dex,attacker,defender,slot,rng,battle);
 const originalMove=dex.moves[slot.id];prepareMoveForm(attacker,originalMove,dex,battle);const move=battleMove(dex,attacker,originalMove,battle),meta=move.max||move.z&&move.power?{}:dex.moveMeta?.[slot.id]||{},a=dex.get(attacker.key),d=dex.get(defender.key),defenderTypes=battleTypes(defender,dex);if(!supportedMove(dex,slot.id))throw Error('This move mechanic is not supported yet');if(slot.pp<=0)throw Error('No PP remaining');if(!moveAllowed(attacker,move))throw Error('The held item locks this move');
 const result={damage:0,move:move.name,effect:1},aa=abilityOf(attacker),ignore=['mold-breaker','teravolt','turboblaze'].includes(aa)||[812,815,818].includes(move.gmax)||move.z&&['Searing Sunraze Smash','Menacing Moonraze Maelstrom','Light That Burns the Sky'].includes(move.name),da=ignore?'':abilityOf(defender),weather=fieldWeather(battle,[attacker,defender]);
 if(attacker.flinch){attacker.flinch=false;if(aa==='steadfast')changeStage(attacker,5,1,false);return{...result,blocked:'flinch'};}
 if(attacker.status==='sleep'){if(attacker.statusTurns>0){attacker.statusTurns--;return{...result,blocked:'sleep'};}attacker.status='';}
 if(attacker.status==='freeze'){if(rng()<.2||move.type==='fire')attacker.status='';else return{...result,blocked:'freeze'};}
 if(attacker.status==='paralysis'&&rng()<.25)return{...result,blocked:'paralysis'};
 if(attacker.confusion>0){attacker.confusion--;if(rng()<1/3){const n=Math.max(1,Math.floor(((2*attacker.level/5+2)*40*attacker.stats[1]/attacker.stats[2]/50+2)));attacker.hp=Math.max(0,attacker.hp-n);return{...result,blocked:'confusion'};}}if(attacker.infatuated&&rng()<.5)return{...result,blocked:'infatuation'};
 if(['protean','libero'].includes(aa)&&!attacker.tera&&!attacker.proteanUsed&&!move.max&&!move.z){attacker.typeOverride=[move.type];attacker.proteanUsed=true;}
 const self=move.target===7;slot.pp=Math.max(0,slot.pp-(!self&&abilityOf(defender)==='pressure'?2:1));if((['choice-band','choice-specs','choice-scarf'].includes(itemOf(attacker))||aa==='gorilla-tactics')&&!attacker.dynamax)attacker.choiceMove=move.id;
 if(move.z&&!move.power)applyZStatus(attacker,originalMove);
 if(Number(slot.id)===144&&!move.max){const changed=copyBattleForm(attacker,defender,dex);return{...result,blocked:changed?'transformed':'no-effect'};}
 if([606].includes(Number(slot.id))&&!move.max)return{...result,blocked:'celebration'};
 if(Number(slot.id)===150&&!move.max)return{...result,blocked:'no-effect'};
 if(WEATHER_MOVES[slot.id]&&!move.max){setWeather(battle,WEATHER_MOVES[slot.id],attacker);return{...result,weather:battle.weather};}
 if(move.maxGuard){const succeeds=rng()<1/(3**(attacker.protectChain||0));attacker.protectChain=(attacker.protectChain||0)+1;if(succeeds){attacker.protected=true;attacker.maxGuard=true;}return{...result,blocked:succeeds?'max-guard':'guard-failed'};}
 if([182,197,203,588].includes(Number(slot.id))){const succeeds=rng()<1/(3**(attacker.protectChain||0));attacker.protectChain=(attacker.protectChain||0)+1;if(succeeds){if(slot.id===203)attacker.endure=true;else attacker.protected=true;}return{...result,blocked:succeeds?'guard':'guard-failed'};}
 attacker.protectChain=0;
 const target=self?attacker:defender,targetSpecies=self?a:d;
 let accuracy=(move.accuracy||100)*stageFactor(attacker.stages?.[6],true)/stageFactor(defender.stages?.[7],true);
 if(aa==='prankster'&&!move.power&&!self&&defenderTypes.includes('dark'))return{...result,effect:0,blocked:'prankster-immunity'};
 if(!self&&battle.terrain==='psychic'&&move.priority>0&&grounded(defender,dex,battle))return{...result,effect:0,blocked:'psychic-terrain'};
 if(battle.gravityTurns>0)accuracy*=5/3;
 if(aa==='compound-eyes')accuracy*=1.3;if(aa==='hustle'&&move.class===2)accuracy*=.8;if(da==='sand-veil'&&weather==='sand'||da==='snow-cloak'&&['snow','hail'].includes(weather))accuracy*=.8;
 if([87,542].includes(move.id)&&['sun','extreme-sun'].includes(weather))accuracy=50;
 const guaranteed=move.z||move.max||!move.accuracy||aa==='no-guard'||da==='no-guard'||[87,542].includes(move.id)&&['rain','heavy-rain'].includes(weather)||move.id===59&&['hail','snow'].includes(weather);
 if(!self&&!guaranteed&&rng()*100>accuracy)return{...result,miss:true};
 const bypass=!move.max&&!move.z&&CONTACT_MOVES.has(move.id)&&['unseen-fist','piercing-drill'].includes(aa)||move.gmax===892;
 if(!self&&defender.protected&&(defender.maxGuard||!move.max&&!move.z&&!bypass)){if(move.id===588&&CONTACT_MOVES.has(move.id))changeStage(attacker,1,-1);return{...result,blocked:'protected'};}
 if(!self&&!move.power&&da==='magic-bounce'&&!battle.reflected&&[1,2,3].includes(meta.category)){const reflected=executeMove(dex,defender,attacker,{id:slot.id,pp:1},rng,{...battle,reflected:true});slot.pp=Math.max(0,slot.pp);return{...reflected,reflected:true};}
 if(!self&&POWDER_MOVES.has(move.id)&&(defenderTypes.includes('grass')||da==='overcoat'))return{...result,effect:0,blocked:'powder-immunity'};
 if(!self&&preDamage(attacker,defender,move,result,{ignore})&&!(battle.gravityTurns>0&&move.type==='ground'&&['levitate','eelevate'].includes(da)))return result;
 if(weather==='heavy-rain'&&move.type==='fire'||weather==='extreme-sun'&&move.type==='water')return{...result,effect:0,blocked:'primal-weather'};
 const sheer=aa==='sheer-force'&&Boolean(meta.ailmentChance||meta.flinchChance||meta.statChance);result.sheerForce=sheer;
 if(move.z&&move.name==='Extreme Evoboost'){for(let i=1;i<=5;i++)changeStage(attacker,i,2,false);return result;}
 if(move.z&&move.name==='Guardian of Alola'){const amount=Math.floor(defender.hp*.75*(defender.protected?.25:1));defender.hp=Math.max(0,defender.hp-amount);return{...result,damage:amount};}
 if(move.power){
  const effect=move.type==='stellar'?(defender.tera?2:1):defenderTypes.reduce((n,t)=>n*(move.type==='ground'&&t==='flying'&&battle.gravityTurns>0?1:t==='ghost'&&aa==='scrappy'&&['normal','fighting'].includes(move.type)?1:move.type==='stellar'?(defender.tera?2:1):weather==='strong-winds'&&t==='flying'&&(dex.typeChart[move.type+':'+t]??1)>1?1:dex.typeChart[move.type+':'+t]??1),1),special=move.class===3,crit=!['battle-armor','shell-armor'].includes(da)&&rng()<((attacker.focusEnergy||0)>=2?.5:attacker.focusEnergy||aa==='super-luck'?1/8:1/24),stab=stabMultiplier(attacker,move,dex);
  const finalEffect=da==='tera-shell'&&defender.hp===defender.stats[0]&&effect>0?.5:effect,terrainFactor=terrainDamage(attacker,defender,move,dex,battle),aura=['fairy','dark'].includes(move.type)&&[attacker,defender].some(m=>abilityOf(m)===(move.type==='fairy'?'fairy-aura':move.type==='dark'?'dark-aura':''))?([attacker,defender].some(m=>abilityOf(m)==='aura-break')?.75:4/3):1;
  let hits=1,total=0;if(!move.max&&!move.z){if(meta.maxHits>1){const roll=rng();hits=aa==='skill-link'?meta.maxHits:meta.minHits===meta.maxHits?meta.maxHits:roll<.35?2:roll<.7?3:roll<.85?4:5;}else if(aa==='parental-bond'&&move.target!==7)hits=2;}
  for(let hit=0;hit<hits&&defender.hp>0&&attacker.hp>0;hit++){const shield=finalEffect>0?shieldForm(defender,move,dex,battle,ignore):'';if(shield){result.ability=shield;result.hits=(result.hits||0)+1;continue;}
  let amount=finalEffect===0?0:Math.max(1,Math.floor(((2*attacker.level/5+2)*move.power*effectiveStat(attacker,special?3:1,battle,dex,defender)/effectiveStat(defender,special?4:2,battle,dex,attacker)/50+2)*stab*finalEffect*terrainFactor*aura*(defender.protected&&(move.z||move.max)&&!bypass?.25:1)*((defender.auroraVeil||battle.screens?.[battle.activeUid===defender.uid||battle.double?.allyUid===defender.uid?'player':'opponent'])&&aa!=='infiltrator'?.5:1)*(aa==='parental-bond'&&hit===1&&!meta.maxHits?.25:1)*(crit?aa==='sniper'?2.25:1.5:1)*(.85+rng()*.15)*(attacker.status==='burn'&&!special&&aa!=='guts'?.5:1)*damageModifier(attacker,defender,move,effect,weather,ignore)*(sheer?1.3:1)));
  if(amount>=defender.hp&&(defender.endure||defender.hp===defender.stats[0]&&(da==='sturdy'||itemOf(defender)==='focus-sash'))){amount=Math.max(0,defender.hp-1);if(itemOf(defender)==='focus-sash'&&!defender.endure&&da!=='sturdy'){defender.heldItem='';result.sash=true;}}
  amount=Math.min(amount,defender.hp);defender.hp-=amount;total+=amount;Object.assign(result,{damage:total,effect:finalEffect,crit,hits:hit+1});
  if(move.type==='fire'&&defender.status==='freeze')defender.status='';
  if(meta.drain>0)attacker.hp=Math.min(attacker.stats[0],attacker.hp+Math.max(1,Math.floor(amount*meta.drain/100)));
  if(meta.drain<0&&!['rock-head','magic-guard'].includes(aa))attacker.hp=Math.max(0,attacker.hp-Math.max(1,Math.floor(amount*-meta.drain/100)));
  }
 }
 if(!self&&meta.category===1&&(move.type==='electric'&&defenderTypes.includes('ground')||[77,78,79,147].includes(slot.id)&&defenderTypes.includes('grass')))result.effect=0;
 const secondaryAllowed=(!move.power||da!=='shield-dust'||meta.category===7)&&!sheer,chance=(aa==='serene-grace'?2:1);
 if(secondaryAllowed&&result.effect!==0&&ailments[meta.ailment]&&rng()*100<(meta.ailmentChance||(!move.power?100:0))*chance&&!(grounded(target,dex,battle)&&(battle.terrain==='misty'||battle.terrain==='electric'&&ailments[meta.ailment]==='sleep'))&&applyStatus(target,targetSpecies,ailments[meta.ailment],rng,ignore&&!self)){result.status=target.status;if(move.id===92)target.toxicTurns=1;if(!self&&da==='synchronize'&&['burn','poison','paralysis'].includes(target.status))applyStatus(attacker,a,target.status,rng);}
 if(meta.healing>0){const old=attacker.hp;attacker.hp=Math.min(attacker.stats[0],attacker.hp+Math.max(1,Math.floor(attacker.stats[0]*meta.healing/100)));result.healed=attacker.hp-old;}
 if(secondaryAllowed&&result.effect!==0&&meta.stats?.length&&rng()*100<(meta.statChance||(!move.power?100:0))*chance){const recipient=meta.category===7||self?attacker:target;for(const[stat,change]of meta.stats){const index=stat-1;if(index>0&&index<8)changeStage(recipient,index,change,recipient!==attacker);}result.stageChanges=meta.stats;}
 if(secondaryAllowed&&result.effect!==0&&defender.hp&&!defender.dynamax&&da!=='inner-focus'&&rng()*100<(meta.flinchChance||0)*chance)defender.flinch=true;
 if(move.z&&result.damage){if(move.name==='Stoked Sparksurfer')applyStatus(defender,d,'paralysis',rng);if(move.name==='Clangorous Soulblaze')for(let i=1;i<=5;i++)changeStage(attacker,i,1,false);if(move.name==='Genesis Supernova'){battle.terrain='psychic';battle.terrainTurns=5;}if(move.name==='Splintered Stormshards'){delete battle.terrain;battle.terrainTurns=0;}}
 if(result.effect!==0&&!result.miss&&!result.blocked)applyMaxEffect(attacker,defender,move,battle,dex,applyStatus,rng);
 if(attacker.tera?.type==='stellar'&&move.power&&result.damage&&!attacker.tera.spent.includes(move.type))attacker.tera.spent.push(move.type);
 if(originalMove.id===851&&attacker.tera?.type==='stellar'&&result.damage){changeStage(attacker,1,-1,false);changeStage(attacker,3,-1,false);}
 afterDamage(attacker,defender,move,result,dex,rng,applyStatus,ignore);afterMoveForm(attacker,defender,move,dex,battle,result);attacker.lastMoveId=slot.id;return result;
}
// Compatibility for old callers; the v3 engine resolves residuals with held items and weather together.
export function residual(m){m.flinch=false;if(m.hp&&['burn','poison'].includes(m.status)){const amount=Math.max(1,Math.floor(m.stats[0]/(m.status==='burn'?16:8)));m.hp=Math.max(0,m.hp-amount);return amount;}return 0;}

export function grounded(m,dex,battle={}){return battle.gravityTurns>0||(!battleTypes(m,dex).includes('flying')&&!['levitate','eelevate'].includes(abilityOf(m)));}
function terrainDamage(a,d,move,dex,b){let n=1;if(grounded(a,dex,b)&&({electric:'electric',grass:'grassy',psychic:'psychic'})[move.type]===b.terrain)n*=1.3;if(grounded(d,dex,b)&&b.terrain==='misty'&&move.type==='dragon')n*=.5;if(grounded(d,dex,b)&&b.terrain==='grassy'&&[89,222,523].includes(move.id))n*=.5;return n;}
