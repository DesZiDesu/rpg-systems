// Frozen v1.6 engine: replay pre-1.7 journals without changing their outcomes.
import {POWDER_MOVES} from './move-flags.js?v=0.97.0';
import {abilityOf,itemOf,statusAllowed,statMultiplier,changeStage,moveAllowed,fieldWeather,preDamage,damageModifier,afterDamage,WEATHER_MOVES,setWeather} from './legacy-mechanics.js?v=0.97.0';
export const STATUS_NAMES={paralysis:['อัมพาต','Paralysis'],sleep:['หลับ','Sleep'],freeze:['แช่แข็ง','Freeze'],burn:['ไหม้','Burn'],poison:['พิษ','Poison']};
const ailments={1:'paralysis',2:'sleep',3:'freeze',4:'burn',5:'poison'};
const special=new Set([150,182,197,203,...Object.keys(WEATHER_MOVES).map(Number)]);
const unsupported=new Set(['Explosion','Self-Destruct','Misty Explosion','U-turn','Volt Switch','Flip Turn','Dragon Tail','Circle Throw','Rapid Spin','Mortal Spin','Knock Off','Thief','Covet','Bug Bite','Pluck','Acrobatics','Facade','Venoshock','Hex','Brine','Retaliate','Payback','Assurance','Pursuit','Sucker Punch','Focus Punch','Solar Beam','Solar Blade','Fly','Dig','Dive','Bounce','Phantom Force','Shadow Force','Sky Attack','Razor Wind','Skull Bash','Freeze Shock','Ice Burn','Geomancy','Hyper Beam','Giga Impact','Frenzy Plant','Blast Burn','Hydro Cannon','Rock Wrecker','Roar of Time','Meteor Assault','Prismatic Laser','Eternabeam','Gigaton Hammer','Blood Moon','Rage Fist','Last Respects']);
export function supportedMove(dex,id){const move=dex.moves[id],meta=dex.moveMeta?.[id];if(!move||unsupported.has(move.name))return false;if(special.has(Number(id)))return true;if(!meta)return move.power>0;return(meta.maxHits||1)<=1&&((move.power>0&&[0,4,6,7,8].includes(meta.category))||(!move.power&&[1,2,3].includes(meta.category)&&(meta.category!==1||Boolean(ailments[meta.ailment]))));}
export function stageFactor(stage,accuracy=false){const n=Math.max(-6,Math.min(6,stage||0)),base=accuracy?3:2;return n>=0?(base+n)/base:base/(base-n);}
export function effectiveStat(m,index,battle={},dex,opponent){const weather=fieldWeather(battle,battle.combatants||[m,opponent].filter(Boolean));return Math.max(1,m.stats[index]*stageFactor(m.stages?.[index])*(index===5&&m.status==='paralysis'?.5:1)*statMultiplier(m,index,weather,dex?.get(m.key)));}
export function applyStatus(target,p,status,rng,ignore=false){if(target.status||!target.hp||!ignore&&!statusAllowed(target,status))return false;if(status==='poison'&&p.types.some(t=>['poison','steel'].includes(t))||status==='burn'&&p.types.includes('fire')||status==='freeze'&&p.types.includes('ice')||status==='paralysis'&&p.types.includes('electric'))return false;delete target.toxicTurns;target.status=status;target.statusTurns=status==='sleep'?1+Math.floor(rng()*3):0;return true;}
export function executeMove(dex,attacker,defender,slot,rng,battle={}){
 const move=dex.moves[slot.id],meta=dex.moveMeta?.[slot.id]||{},a=dex.get(attacker.key),d=dex.get(defender.key);if(!supportedMove(dex,slot.id))throw Error('This move mechanic is not supported yet');if(slot.pp<=0)throw Error('No PP remaining');if(!moveAllowed(attacker,move))throw Error('The held item locks this move');
 const result={damage:0,move:move.name,effect:1},aa=abilityOf(attacker),ignore=['mold-breaker','teravolt','turboblaze'].includes(aa),da=ignore?'':abilityOf(defender),weather=fieldWeather(battle,[attacker,defender]);
 if(attacker.flinch){attacker.flinch=false;return{...result,blocked:'flinch'};}
 if(attacker.status==='sleep'){if(attacker.statusTurns>0){attacker.statusTurns--;return{...result,blocked:'sleep'};}attacker.status='';}
 if(attacker.status==='freeze'){if(rng()<.2||move.type==='fire')attacker.status='';else return{...result,blocked:'freeze'};}
 if(attacker.status==='paralysis'&&rng()<.25)return{...result,blocked:'paralysis'};
 const self=move.target===7;slot.pp=Math.max(0,slot.pp-(!self&&abilityOf(defender)==='pressure'?2:1));if(['choice-band','choice-specs','choice-scarf'].includes(itemOf(attacker)))attacker.choiceMove=move.id;
 if(Number(slot.id)===150)return{...result,blocked:'no-effect'};
 if(WEATHER_MOVES[slot.id]){setWeather(battle,WEATHER_MOVES[slot.id],attacker);return{...result,weather:battle.weather};}
 if([182,197,203].includes(Number(slot.id))){const succeeds=rng()<1/(3**(attacker.protectChain||0));attacker.protectChain=(attacker.protectChain||0)+1;if(succeeds){if(slot.id===203)attacker.endure=true;else attacker.protected=true;}return{...result,blocked:succeeds?'guard':'guard-failed'};}
 attacker.protectChain=0;
 const target=self?attacker:defender,targetSpecies=self?a:d;
 let accuracy=(move.accuracy||100)*stageFactor(attacker.stages?.[6],true)/stageFactor(defender.stages?.[7],true);
 if(aa==='compound-eyes')accuracy*=1.3;if(aa==='hustle'&&move.class===2)accuracy*=.8;if(da==='sand-veil'&&weather==='sand'||da==='snow-cloak'&&['snow','hail'].includes(weather))accuracy*=.8;
 if([87,542].includes(move.id)&&weather==='sun')accuracy=50;
 const guaranteed=aa==='no-guard'||da==='no-guard'||[87,542].includes(move.id)&&weather==='rain'||move.id===59&&['hail','snow'].includes(weather);
 if(!self&&!guaranteed&&rng()*100>accuracy)return{...result,miss:true};
 if(!self&&defender.protected)return{...result,blocked:'protected'};
 if(!self&&POWDER_MOVES.has(move.id)&&(d.types.includes('grass')||da==='overcoat'))return{...result,effect:0,blocked:'powder-immunity'};
 if(!self&&preDamage(attacker,defender,move,result,{ignore}))return result;
 const sheer=aa==='sheer-force'&&Boolean(meta.ailmentChance||meta.flinchChance||meta.statChance);result.sheerForce=sheer;
 if(move.power){
  const effect=d.types.reduce((n,t)=>n*(t==='ghost'&&aa==='scrappy'&&['normal','fighting'].includes(move.type)?1:dex.typeChart[move.type+':'+t]??1),1),special=move.class===3,crit=!['battle-armor','shell-armor'].includes(da)&&rng()<(aa==='super-luck'?1/8:1/24),stab=a.types.includes(move.type)?aa==='adaptability'?2:1.5:1;
  let amount=effect===0?0:Math.max(1,Math.floor(((2*attacker.level/5+2)*move.power*effectiveStat(attacker,special?3:1,battle,dex,defender)/effectiveStat(defender,special?4:2,battle,dex,attacker)/50+2)*stab*effect*(crit?aa==='sniper'?2.25:1.5:1)*(.85+rng()*.15)*(attacker.status==='burn'&&!special&&aa!=='guts'?.5:1)*damageModifier(attacker,defender,move,effect,weather,ignore)*(sheer?1.3:1)));
  if(amount>=defender.hp&&(defender.endure||defender.hp===defender.stats[0]&&(da==='sturdy'||itemOf(defender)==='focus-sash'))){amount=Math.max(0,defender.hp-1);if(itemOf(defender)==='focus-sash'&&!defender.endure&&da!=='sturdy'){defender.heldItem='';result.sash=true;}}
  amount=Math.min(amount,defender.hp);defender.hp-=amount;Object.assign(result,{damage:amount,effect,crit});
  if(move.type==='fire'&&defender.status==='freeze')defender.status='';
  if(meta.drain>0)attacker.hp=Math.min(attacker.stats[0],attacker.hp+Math.max(1,Math.floor(amount*meta.drain/100)));
  if(meta.drain<0&&!['rock-head','magic-guard'].includes(aa))attacker.hp=Math.max(0,attacker.hp-Math.max(1,Math.floor(amount*-meta.drain/100)));
 }
 if(!self&&meta.category===1&&(move.type==='electric'&&d.types.includes('ground')||[77,78,79,147].includes(slot.id)&&d.types.includes('grass')))result.effect=0;
 const secondaryAllowed=(!move.power||da!=='shield-dust'||meta.category===7)&&!sheer,chance=(aa==='serene-grace'?2:1);
 if(secondaryAllowed&&result.effect!==0&&ailments[meta.ailment]&&rng()*100<(meta.ailmentChance||(!move.power?100:0))*chance&&applyStatus(target,targetSpecies,ailments[meta.ailment],rng,ignore&&!self)){result.status=target.status;if(move.id===92)target.toxicTurns=1;if(!self&&da==='synchronize'&&['burn','poison','paralysis'].includes(target.status))applyStatus(attacker,a,target.status,rng);}
 if(meta.healing>0){const old=attacker.hp;attacker.hp=Math.min(attacker.stats[0],attacker.hp+Math.max(1,Math.floor(attacker.stats[0]*meta.healing/100)));result.healed=attacker.hp-old;}
 if(secondaryAllowed&&result.effect!==0&&meta.stats?.length&&rng()*100<(meta.statChance||(!move.power?100:0))*chance){const recipient=meta.category===7||self?attacker:target;for(const[stat,change]of meta.stats){const index=stat-1;if(index>0&&index<8)changeStage(recipient,index,change,recipient!==attacker);}result.stageChanges=meta.stats;}
 if(secondaryAllowed&&result.effect!==0&&defender.hp&&da!=='inner-focus'&&rng()*100<(meta.flinchChance||0)*chance)defender.flinch=true;
 afterDamage(attacker,defender,move,result,dex,rng,applyStatus,ignore);return result;
}
// Compatibility for old callers; the v3 engine resolves residuals with held items and weather together.
export function residual(m){m.flinch=false;if(m.hp&&['burn','poison'].includes(m.status)){const amount=Math.max(1,Math.floor(m.stats[0]/(m.status==='burn'?16:8)));m.hp=Math.max(0,m.hp-amount);return amount;}return 0;}
