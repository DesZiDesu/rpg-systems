// Frozen v1.6 engine: replay pre-1.7 journals without changing their outcomes.
import {seeded} from './specimens.js?v=0.95.0';
import {CONTACT_MOVES,PUNCH_MOVES,BITE_MOVES} from './move-flags.js?v=0.95.0';
export const ABILITIES=new Set(['overgrow','blaze','torrent','swarm','adaptability','levitate','flash-fire','water-absorb','volt-absorb','lightning-rod','motor-drive','sap-sipper','storm-drain','intimidate','clear-body','white-smoke','hyper-cutter','inner-focus','own-tempo','oblivious','scrappy','huge-power','pure-power','guts','marvel-scale','thick-fat','technician','iron-fist','strong-jaw','tough-claws','sniper','super-luck','battle-armor','shell-armor','sturdy','multiscale','filter','solid-rock','tinted-lens','compound-eyes','no-guard','hustle','serene-grace','shield-dust','rock-head','magic-guard','sheer-force','pressure','static','flame-body','poison-point','rough-skin','iron-barbs','effect-spore','synchronize','limber','insomnia','vital-spirit','immunity','water-veil','magma-armor','natural-cure','regenerator','poison-heal','speed-boost','moxie','beast-boost','trace','drizzle','drought','sand-stream','snow-warning','swift-swim','chlorophyll','sand-rush','slush-rush','sand-veil','snow-cloak','sand-force','rain-dish','ice-body','solar-power','hydration','dry-skin','cloud-nine','air-lock','overcoat','mold-breaker','teravolt','turboblaze']);
const boosts={'silk-scarf':'normal',charcoal:'fire','mystic-water':'water','miracle-seed':'grass',magnet:'electric','never-melt-ice':'ice','black-belt':'fighting','poison-barb':'poison','soft-sand':'ground','sharp-beak':'flying','twisted-spoon':'psychic','silver-powder':'bug','hard-stone':'rock','spell-tag':'ghost','dragon-fang':'dragon','black-glasses':'dark','metal-coat':'steel','fairy-feather':'fairy'};
export const HELD_ITEMS=new Set(['leftovers','black-sludge','life-orb','shell-bell','focus-sash','choice-band','choice-specs','choice-scarf','expert-belt','assault-vest','eviolite','rocky-helmet','flame-orb','toxic-orb','damp-rock','heat-rock','smooth-rock','icy-rock','oran-berry','sitrus-berry','lum-berry','pecha-berry','rawst-berry','aspear-berry','chesto-berry','cheri-berry','leppa-berry',...Object.keys(boosts)]);
export const WEATHER={clear:['อากาศปกติ','Clear'],rain:['ฝน','Rain'],sun:['แดดจัด','Harsh sunlight'],sand:['พายุทราย','Sandstorm'],hail:['ลูกเห็บ','Hail'],snow:['หิมะ','Snow']};
export const WEATHER_MOVES={240:'rain',241:'sun',201:'sand',258:'hail',883:'snow'};

const clamp=n=>Math.max(-6,Math.min(6,n||0));
export const abilityOf=m=>m?.battleAbility||m?.ability||'';
export const itemOf=m=>m?.heldItem||'';
export function chooseAbility(p,seed){const list=p.abilities.filter(a=>!a.hidden);return list[Math.floor(seeded('ability:'+seed)()*list.length)]?.name||'';}
export function statusAllowed(m,status){return !({paralysis:['limber'],sleep:['insomnia','vital-spirit'],poison:['immunity'],burn:['water-veil'],freeze:['magma-armor']})[status]?.includes(abilityOf(m));}
export function fieldWeather(battle,mons=[]){return mons.some(m=>['cloud-nine','air-lock'].includes(abilityOf(m)))?'clear':battle?.weather||'clear';}
export function normalizeWeather(value){const v=String(value||'').toLowerCase();return /sandstorm|พายุทราย/.test(v)?'sand':/hail|ลูกเห็บ/.test(v)?'hail':/snow|หิมะ/.test(v)?'snow':/rain|ฝน/.test(v)?'rain':/harsh sunlight|sunny|แดดจัด/.test(v)?'sun':'clear';}
export function setWeather(battle,weather,source){battle.weather=weather;const rock=({rain:'damp-rock',sun:'heat-rock',sand:'smooth-rock',hail:'icy-rock',snow:'icy-rock'})[weather];battle.weatherTurns=itemOf(source)===rock?8:5;}
export function statMultiplier(m,index,weather='clear',p){const a=abilityOf(m),i=itemOf(m);let value=1;
 if(index===1){if(['huge-power','pure-power'].includes(a))value*=2;if(a==='guts'&&m.status)value*=1.5;if(a==='hustle')value*=1.5;if(i==='choice-band')value*=1.5;}
 if(index===2){if(a==='marvel-scale'&&m.status)value*=1.5;if(weather==='snow'&&p?.types.includes('ice'))value*=1.5;}
 if(index===3){if(i==='choice-specs')value*=1.5;if(a==='solar-power'&&weather==='sun')value*=1.5;}
 if(index===4){if(i==='assault-vest')value*=1.5;if(weather==='sand'&&p?.types.includes('rock'))value*=1.5;}
 if([2,4].includes(index)&&i==='eviolite'&&p?.evolutions.length)value*=1.5;
 if(index===5){if(i==='choice-scarf')value*=1.5;if(({rain:'swift-swim',sun:'chlorophyll',sand:'sand-rush',snow:'slush-rush',hail:'slush-rush'})[weather]===a)value*=2;}
 return value;
}
export function changeStage(m,index,change,hostile=true){const a=abilityOf(m);if(change<0&&hostile&&(['clear-body','white-smoke'].includes(a)||index===1&&a==='hyper-cutter'))return false;m.stages||=Array(8).fill(0);const old=m.stages[index]||0;m.stages[index]=clamp(old+change);return old!==m.stages[index];}
export function enterBattle(m,opponent,battle,dex){m.choiceMove=0;m.protected=false;m.flinch=false;delete m.battleAbility;
 let a=abilityOf(m);if(a==='trace'){const copy=abilityOf(opponent);if(copy&&copy!=='trace'&&ABILITIES.has(copy))m.battleAbility=a=copy;}
 if(a==='intimidate'&&!['inner-focus','own-tempo','oblivious'].includes(abilityOf(opponent)))changeStage(opponent,1,-1);
 const weather=({drizzle:'rain',drought:'sun','sand-stream':'sand','snow-warning':'snow'})[a];if(weather)setWeather(battle,weather,m);
}
export function leaveBattle(m){if(abilityOf(m)==='natural-cure'){m.status='';m.statusTurns=0;}if(abilityOf(m)==='regenerator'&&m.hp)m.hp=Math.min(m.stats[0],m.hp+Math.max(1,Math.floor(m.stats[0]/3)));m.stages=Array(8).fill(0);m.choiceMove=0;if(m.toxicTurns)m.toxicTurns=1;delete m.battleAbility;}
export function moveAllowed(m,move){return !(m.choiceMove&&m.choiceMove!==move.id&&['choice-band','choice-specs','choice-scarf'].includes(itemOf(m)))&&!(itemOf(m)==='assault-vest'&&!move.power);}
export function preDamage(a,d,move,result,{ignore=false}={}){const da=ignore?'':abilityOf(d),aa=abilityOf(a);
 if(move.type==='ground'&&da==='levitate'||move.type==='fire'&&da==='flash-fire'){if(da==='flash-fire')d.flashFire=true;result.effect=0;result.ability=da;return true;}
 const absorbed=({water:['water-absorb','storm-drain','dry-skin'],electric:['volt-absorb','lightning-rod','motor-drive'],grass:['sap-sipper']})[move.type]?.includes(da);
 if(absorbed){if(['water-absorb','volt-absorb','dry-skin'].includes(da)){const old=d.hp;d.hp=Math.min(d.stats[0],d.hp+Math.max(1,Math.floor(d.stats[0]/4)));result.absorbed=d.hp-old;}else changeStage(d,da==='motor-drive'?5:da==='sap-sipper'?1:3,1,false);result.effect=0;result.ability=da;return true;}
 return false;
}
export function damageModifier(a,d,move,effect,weather,ignore=false){const aa=abilityOf(a),da=ignore?'':abilityOf(d),i=itemOf(a);let n=1;
 if(({fire:'blaze',water:'torrent',grass:'overgrow',bug:'swarm'})[move.type]===aa&&a.hp<=a.stats[0]/3)n*=1.5;
 if(aa==='technician'&&move.power<=60)n*=1.5;if(aa==='iron-fist'&&PUNCH_MOVES.has(move.id))n*=1.2;if(aa==='strong-jaw'&&BITE_MOVES.has(move.id))n*=1.5;if(aa==='tough-claws'&&CONTACT_MOVES.has(move.id))n*=1.3;
 if(da==='thick-fat'&&['fire','ice'].includes(move.type))n*=.5;if(da==='dry-skin'&&move.type==='fire')n*=1.25;if(da==='multiscale'&&d.hp===d.stats[0])n*=.5;if(['filter','solid-rock'].includes(da)&&effect>1)n*=.75;if(aa==='tinted-lens'&&effect>0&&effect<1)n*=2;
 if(move.type==='fire'&&a.flashFire)n*=1.5;if(weather==='rain'&&['fire','water'].includes(move.type))n*=move.type==='water'?1.5:.5;if(weather==='sun'&&['fire','water'].includes(move.type))n*=move.type==='fire'?1.5:.5;if(aa==='sand-force'&&weather==='sand'&&['rock','steel','ground'].includes(move.type))n*=1.3;
 if(i==='life-orb')n*=1.3;if(i==='expert-belt'&&effect>1)n*=1.2;if(boosts[i]===move.type)n*=1.2;return n;
}
export function berry(m,dex){const i=itemOf(m);if(!m.hp||!i.endsWith('-berry'))return '';
 let used=false;if(i==='oran-berry'&&m.hp<=m.stats[0]/2){m.hp=Math.min(m.stats[0],m.hp+10);used=true;}if(i==='sitrus-berry'&&m.hp<=m.stats[0]/2){m.hp=Math.min(m.stats[0],m.hp+Math.max(1,Math.floor(m.stats[0]/4)));used=true;}
 const cure=({'lum-berry':'all','pecha-berry':'poison','rawst-berry':'burn','aspear-berry':'freeze','chesto-berry':'sleep','cheri-berry':'paralysis'})[i];if(m.status&&(cure==='all'||m.status===cure)){m.status='';m.statusTurns=0;used=true;}
 if(i==='leppa-berry'){const slot=m.moves.find(v=>v.pp===0);if(slot){slot.pp=Math.min(dex.moves[slot.id].pp,10);used=true;}}
 if(used){m.heldItem='';return i;}return '';
}
export function afterDamage(a,d,move,result,dex,rng,applyStatus,ignore=false){const aa=abilityOf(a),da=ignore?'':abilityOf(d),i=itemOf(a),dealt=result.damage||0;
 if(dealt&&CONTACT_MOVES.has(move.id)&&a.hp){if(['rough-skin','iron-barbs'].includes(da)&&aa!=='magic-guard')a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.stats[0]/8)));if(itemOf(d)==='rocky-helmet'&&aa!=='magic-guard')a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.stats[0]/6)));
 const ailment=({static:'paralysis','flame-body':'burn','poison-point':'poison'})[da];if(ailment&&a.hp&&rng()<.3)applyStatus(a,dex.get(a.key),ailment,rng);
 if(da==='effect-spore'&&a.hp&&!dex.get(a.key).types.includes('grass')&&!['overcoat'].includes(aa)&&rng()<.3)applyStatus(a,dex.get(a.key),['poison','paralysis','sleep'][Math.floor(rng()*3)],rng);
 }
 if(dealt&&a.hp&&i==='shell-bell')a.hp=Math.min(a.stats[0],a.hp+Math.max(1,Math.floor(dealt/8)));if(dealt&&a.hp&&i==='life-orb'&&aa!=='magic-guard'&&!result.sheerForce)a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.stats[0]/10)));
 if(!d.hp&&a.hp){if(aa==='moxie')changeStage(a,1,1,false);if(aa==='beast-boost'){let best=1;for(let n=2;n<6;n++)if(a.stats[n]>a.stats[best])best=n;changeStage(a,best,1,false);}}
 result.berries=[berry(a,dex),berry(d,dex)].filter(Boolean);
}
export function endTurn(m,p,dex,battle,applyStatus){if(!m.hp)return[];const a=abilityOf(m),i=itemOf(m),weather=fieldWeather(battle,battle.combatants||[]),changes=[];
 const heal=(n,cause)=>{if(!m.hp)return;const old=m.hp;m.hp=Math.min(m.stats[0],m.hp+Math.max(1,Math.floor(m.stats[0]*n)));if(m.hp!==old)changes.push({cause,healed:m.hp-old});};
 const hurt=(n,cause)=>{if(a==='magic-guard')return;const old=m.hp;m.hp=Math.max(0,m.hp-Math.max(1,Math.floor(m.stats[0]*n)));if(m.hp!==old)changes.push({cause,damage:old-m.hp});};
 if(a==='poison-heal'&&m.status==='poison')heal(1/8,a);else if(m.status==='burn')hurt(1/16,'burn');else if(m.status==='poison'){hurt(m.toxicTurns?Math.min(15,m.toxicTurns++)/16:1/8,'poison');}
 if(weather==='sand'&&!p.types.some(t=>['rock','ground','steel'].includes(t))&&!['sand-rush','sand-veil','sand-force','overcoat'].includes(a))hurt(1/16,'sand');
 if(weather==='hail'&&!p.types.includes('ice')&&!['ice-body','snow-cloak','overcoat'].includes(a))hurt(1/16,'hail');
 if(weather==='rain'&&['rain-dish','dry-skin'].includes(a))heal(a==='dry-skin'?1/8:1/16,a);if(['snow','hail'].includes(weather)&&a==='ice-body')heal(1/16,a);if(weather==='sun'&&['solar-power','dry-skin'].includes(a))hurt(1/8,a);
 if(m.hp&&i==='leftovers')heal(1/16,i);if(m.hp&&i==='black-sludge')p.types.includes('poison')?heal(1/16,i):hurt(1/8,i);
 if(m.hp&&i==='flame-orb')applyStatus(m,p,'burn',()=>0);if(m.hp&&i==='toxic-orb'){if(applyStatus(m,p,'poison',()=>0))m.toxicTurns=1;}
 if(weather==='rain'&&a==='hydration'){m.status='';m.statusTurns=0;}if(m.hp&&a==='speed-boost')changeStage(m,5,1,false);const used=berry(m,dex);if(used)changes.push({cause:used});m.flinch=false;return changes;
}
