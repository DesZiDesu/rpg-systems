import {enterBattle as legacyEnter,leaveBattle as legacyLeave,endTurn as legacyEnd} from './legacy-mechanics.js?v=0.90.18';
import {copyBattleForm,battleTypes} from './transformations.js?v=0.90.18';
import {TRANSFORMATION_DATA} from './transformation-data.js?v=0.90.18';
import {seeded} from './specimens.js?v=0.90.18';
import {CONTACT_MOVES,PUNCH_MOVES,BITE_MOVES} from './move-flags.js?v=0.90.18';
export const ABILITIES=new Set(['overgrow','blaze','torrent','swarm','adaptability','levitate','flash-fire','water-absorb','volt-absorb','lightning-rod','motor-drive','sap-sipper','storm-drain','intimidate','clear-body','white-smoke','hyper-cutter','inner-focus','own-tempo','oblivious','scrappy','huge-power','pure-power','guts','marvel-scale','thick-fat','technician','iron-fist','strong-jaw','tough-claws','sniper','super-luck','battle-armor','shell-armor','sturdy','multiscale','filter','solid-rock','tinted-lens','compound-eyes','no-guard','hustle','serene-grace','shield-dust','rock-head','magic-guard','sheer-force','pressure','static','flame-body','poison-point','rough-skin','iron-barbs','effect-spore','synchronize','limber','insomnia','vital-spirit','immunity','water-veil','magma-armor','natural-cure','regenerator','poison-heal','speed-boost','moxie','beast-boost','trace','drizzle','drought','sand-stream','snow-warning','swift-swim','chlorophyll','sand-rush','slush-rush','sand-veil','snow-cloak','sand-force','rain-dish','ice-body','solar-power','hydration','dry-skin','cloud-nine','air-lock','overcoat','mold-breaker','teravolt','turboblaze']);
for(const name of ["mega-launcher", "parental-bond", "aerilate", "pixilate", "refrigerate", "galvanize", "dragonize", "skill-link", "prankster", "magic-bounce", "shadow-tag", "steadfast", "fairy-aura", "dark-aura", "aura-break", "primordial-sea", "desolate-land", "delta-stream", "neuroforce", "prism-armor", "electric-surge", "grassy-surge", "psychic-surge", "misty-surge", "forecast", "flower-gift", "zen-mode", "stance-change", "power-construct", "schooling", "shields-down", "disguise", "ice-face", "zero-to-hero", "hunger-switch", "battle-bond", "gulp-missile", "tera-shift", "tera-shell", "teraform-zero", "intrepid-sword", "dauntless-shield", "multitype", "rks-system", "sharpness", "soul-heart", "bad-dreams", "contrary", "defiant", "competitive", "infiltrator", "bulletproof", "punk-rock", "thermal-exchange", "unseen-fist", "gorilla-tactics", "protean", "libero", "download", "normalize", "imposter", "eelevate", "mega-sol", "aura-guard", "fire-mane", "piercing-drill", "spicy-spray", "berserk", "innards-out"])ABILITIES.add(name);
const boosts={'silk-scarf':'normal',charcoal:'fire','mystic-water':'water','miracle-seed':'grass',magnet:'electric','never-melt-ice':'ice','black-belt':'fighting','poison-barb':'poison','soft-sand':'ground','sharp-beak':'flying','twisted-spoon':'psychic','silver-powder':'bug','hard-stone':'rock','spell-tag':'ghost','dragon-fang':'dragon','black-glasses':'dark','metal-coat':'steel','fairy-feather':'fairy'};
export const HELD_ITEMS=new Set(['leftovers','black-sludge','life-orb','shell-bell','focus-sash','choice-band','choice-specs','choice-scarf','expert-belt','assault-vest','eviolite','rocky-helmet','flame-orb','toxic-orb','damp-rock','heat-rock','smooth-rock','icy-rock','oran-berry','sitrus-berry','lum-berry','pecha-berry','rawst-berry','aspear-berry','chesto-berry','cheri-berry','leppa-berry',...Object.keys(boosts)]);
export const WEATHER={clear:['อากาศปกติ','Clear'],rain:['ฝน','Rain'],sun:['แดดจัด','Harsh sunlight'],sand:['พายุทราย','Sandstorm'],hail:['ลูกเห็บ','Hail'],snow:['หิมะ','Snow']};
export const WEATHER_MOVES={240:'rain',241:'sun',201:'sand',258:'hail',883:'snow'};

const clamp=n=>Math.max(-6,Math.min(6,n||0));
export const abilityOf=m=>m?.battleAbility||m?.ability||'';
export const itemOf=m=>m?.heldItem||'';
export function chooseAbility(p,seed){const list=p.abilities.filter(a=>!a.hidden);return list[Math.floor(seeded('ability:'+seed)()*list.length)]?.name||'';}
export function statusAllowed(m,status){return !(abilityOf(m)==='shields-down'&&m.key.includes('-meteor'))&&!({paralysis:['limber'],sleep:['insomnia','vital-spirit'],poison:['immunity'],burn:['water-veil','thermal-exchange'],freeze:['magma-armor']})[status]?.includes(abilityOf(m));}
export function fieldWeather(battle,mons=[]){if(mons.some(m=>['cloud-nine','air-lock'].includes(abilityOf(m))))return'clear';const primal=mons.filter(m=>m.hp).map(abilityOf).filter(a=>['primordial-sea','desolate-land','delta-stream'].includes(a));if(primal.length)return({'primordial-sea':'heavy-rain','desolate-land':'extreme-sun','delta-stream':'strong-winds'})[primal.at(-1)];return battle?.primalWeather?'clear':battle?.weather||'clear';}
export function normalizeWeather(value){const v=String(value||'').toLowerCase();return /sandstorm|พายุทราย/.test(v)?'sand':/hail|ลูกเห็บ/.test(v)?'hail':/snow|หิมะ/.test(v)?'snow':/rain|ฝน/.test(v)?'rain':/harsh sunlight|sunny|แดดจัด/.test(v)?'sun':'clear';}
export function setWeather(battle,weather,source){battle.weather=weather;const rock=({rain:'damp-rock',sun:'heat-rock',sand:'smooth-rock',hail:'icy-rock',snow:'icy-rock'})[weather];battle.weatherTurns=itemOf(source)===rock?8:5;}
export function statMultiplier(m,index,weather='clear',p){const a=abilityOf(m),i=itemOf(m);let value=1;if(weather==='heavy-rain')weather='rain';if(weather==='extreme-sun'||a==='mega-sol')weather='sun';
 if(index===1){if(['huge-power','pure-power'].includes(a))value*=2;if(a==='guts'&&m.status)value*=1.5;if(a==='hustle'||a==='gorilla-tactics'&&!m.dynamax)value*=1.5;if(a==='flower-gift'&&weather==='sun')value*=1.5;if(i==='choice-band'&&!m.dynamax)value*=1.5;}
 if(index===2){if(a==='marvel-scale'&&m.status)value*=1.5;if(weather==='snow'&&p?.types.includes('ice'))value*=1.5;}
 if(index===3){if(i==='choice-specs'&&!m.dynamax)value*=1.5;if(a==='solar-power'&&weather==='sun')value*=1.5;}
 if(index===4){if(i==='assault-vest')value*=1.5;if(a==='flower-gift'&&weather==='sun')value*=1.5;if(weather==='sand'&&p?.types.includes('rock'))value*=1.5;}
 if([2,4].includes(index)&&i==='eviolite'&&p?.evolutions.length)value*=1.5;
 if(index===5){if(i==='choice-scarf'&&!m.dynamax)value*=1.5;if(({rain:'swift-swim',sun:'chlorophyll',sand:'sand-rush',snow:'slush-rush',hail:'slush-rush'})[weather]===a)value*=2;}
 return value;
}
export function changeStage(m,index,change,hostile=true){const a=abilityOf(m);if(change<0&&hostile&&(['clear-body','white-smoke'].includes(a)||index===1&&a==='hyper-cutter'))return false;m.stages||=Array(8).fill(0);if(a==='contrary')change=-change;const old=m.stages[index]||0;m.stages[index]=clamp(old+change);if(hostile&&change<0&&old!==m.stages[index]&&['defiant','competitive'].includes(a)){const stat=a==='defiant'?1:3;m.stages[stat]=clamp((m.stages[stat]||0)+2);}return old!==m.stages[index];}
export function enterBattle(m,opponent,battle,dex){m.battleEngine=battle.engine||4;if(battle.engine&&battle.engine<4)return legacyEnter(m,opponent,battle,dex);m.choiceMove=0;m.protected=false;m.flinch=false;delete m.battleAbility;
 let a=abilityOf(m);if(a==='trace'){const copy=abilityOf(opponent);if(copy&&copy!=='trace'&&ABILITIES.has(copy))m.battleAbility=a=copy;}
 if(a==='intimidate'&&!['inner-focus','own-tempo','oblivious'].includes(abilityOf(opponent)))changeStage(opponent,1,-1);
 const weather=({drizzle:'rain',drought:'sun','sand-stream':'sand','snow-warning':'snow'})[a];if(weather)setWeather(battle,weather,m);
 if(a==='primordial-sea'||a==='desolate-land'||a==='delta-stream'){battle.weather=a==='primordial-sea'?'rain':a==='desolate-land'?'sun':'clear';battle.weatherTurns=0;battle.primalWeather=true;}
 const terrain=({'electric-surge':'electric','grassy-surge':'grassy','psychic-surge':'psychic','misty-surge':'misty'})[a];if(terrain){battle.terrain=terrain;battle.terrainTurns=5;}
 if(a==='intrepid-sword'&&!m.entryBoosted){changeStage(m,1,1,false);m.entryBoosted=true;}if(a==='dauntless-shield'&&!m.entryBoosted){changeStage(m,2,1,false);m.entryBoosted=true;}if(a==='download')changeStage(m,opponent.stats[2]<opponent.stats[4]?1:3,1,false);
 if(a==='imposter'&&battle.transformRules?.automatic)copyBattleForm(m,opponent,dex);
 const hazards=battle.hazards?.[battle.activeUid===m.uid?'player':'opponent'];if(hazards&&a!=='magic-guard')for(const type of['rock','steel'])if(hazards[type]){const effect=battleTypes(m,dex).reduce((n,t)=>n*(dex.typeChart[type+':'+t]??1),1);m.hp=Math.max(0,m.hp-Math.floor((m.dynamax?.baseMaxHp||m.stats[0])*effect/8));}
}
export function leaveBattle(m){if(m.battleEngine&&m.battleEngine<4)return legacyLeave(m);if(abilityOf(m)==='natural-cure'){m.status='';m.statusTurns=0;}if(abilityOf(m)==='regenerator'&&m.hp)m.hp=Math.min(m.stats[0],m.hp+Math.max(1,Math.floor(m.stats[0]/3)));m.stages=Array(8).fill(0);m.choiceMove=0;if(m.toxicTurns)m.toxicTurns=1;delete m.battleAbility;delete m.proteanUsed;delete m.typeOverride;}
export function moveAllowed(m,move){return !(m.choiceMove&&m.choiceMove!==move.id&&(['choice-band','choice-specs','choice-scarf'].includes(itemOf(m))||abilityOf(m)==='gorilla-tactics')&&!m.dynamax)&&!(itemOf(m)==='assault-vest'&&!move.power)&&!(m.torment&&!m.dynamax&&m.lastMoveId===move.id);}
export function preDamage(a,d,move,result,{ignore=false}={}){const da=ignore?'':abilityOf(d),aa=abilityOf(a);
 if(da==='bulletproof'&&TRANSFORMATION_DATA.moves[move.id]?.flags?.includes('bullet')){result.effect=0;result.ability=da;return true;}
 if(move.type==='ground'&&['levitate','eelevate'].includes(da)||move.type==='fire'&&da==='flash-fire'){if(da==='flash-fire')d.flashFire=true;result.effect=0;result.ability=da;return true;}
 const absorbed=({water:['water-absorb','storm-drain','dry-skin'],electric:['volt-absorb','lightning-rod','motor-drive'],grass:['sap-sipper']})[move.type]?.includes(da);
 if(absorbed){if(['water-absorb','volt-absorb','dry-skin'].includes(da)){const old=d.hp;d.hp=Math.min(d.stats[0],d.hp+Math.max(1,Math.floor(d.stats[0]/4)));result.absorbed=d.hp-old;}else changeStage(d,da==='motor-drive'?5:da==='sap-sipper'?1:3,1,false);result.effect=0;result.ability=da;return true;}
 return false;
}
export function damageModifier(a,d,move,effect,weather,ignore=false){const aa=abilityOf(a),da=ignore?'':abilityOf(d),i=itemOf(a);let n=1;
 if(({fire:'blaze',water:'torrent',grass:'overgrow',bug:'swarm'})[move.type]===aa&&a.hp<=a.stats[0]/3)n*=1.5;
 if(aa==='mega-sol'&&weather!=='sun')weather='sun';if(weather==='heavy-rain')weather='rain';if(weather==='extreme-sun')weather='sun';
 if(!move.max&&!move.z&&aa==='mega-launcher'&&TRANSFORMATION_DATA.moves[move.id]?.flags?.includes('pulse'))n*=1.5;if(!move.max&&!move.z&&aa==='sharpness'&&TRANSFORMATION_DATA.moves[move.id]?.flags?.includes('slicing'))n*=1.5;if(aa==='fire-mane'&&move.type==='fire')n*=1.5;
 if(aa==='technician'&&move.power<=60)n*=1.5;if(!move.max&&!move.z&&aa==='iron-fist'&&PUNCH_MOVES.has(move.id))n*=1.2;if(!move.max&&!move.z&&aa==='strong-jaw'&&BITE_MOVES.has(move.id))n*=1.5;if(!move.max&&!move.z&&aa==='tough-claws'&&CONTACT_MOVES.has(move.id))n*=1.3;
 if(aa==='neuroforce'&&effect>1)n*=1.25;if(da==='prism-armor'&&effect>1)n*=.75;if(!move.max&&!move.z&&da==='aura-guard'&&CONTACT_MOVES.has(move.id))n*=.5;if(da==='punk-rock'&&TRANSFORMATION_DATA.moves[move.id]?.flags?.includes('sound'))n*=.5;if(aa==='punk-rock'&&TRANSFORMATION_DATA.moves[move.id]?.flags?.includes('sound'))n*=1.3;
 if(da==='thick-fat'&&['fire','ice'].includes(move.type))n*=.5;if(da==='dry-skin'&&move.type==='fire')n*=1.25;if(da==='multiscale'&&d.hp===d.stats[0])n*=.5;if(['filter','solid-rock'].includes(da)&&effect>1)n*=.75;if(aa==='tinted-lens'&&effect>0&&effect<1)n*=2;
 if(move.type==='fire'&&a.flashFire)n*=1.5;if(weather==='rain'&&['fire','water'].includes(move.type))n*=move.type==='water'?1.5:.5;if(weather==='sun'&&['fire','water'].includes(move.type))n*=move.type==='fire'?1.5:.5;if(aa==='sand-force'&&weather==='sand'&&['rock','steel','ground'].includes(move.type))n*=1.3;
 if(i==='life-orb')n*=1.3;if(i==='expert-belt'&&effect>1)n*=1.2;if(boosts[i]===move.type)n*=1.2;return n;
}
export function berry(m,dex){const i=itemOf(m);if(!m.hp||!i.endsWith('-berry'))return '';
 let used=false;if(i==='oran-berry'&&m.hp<=m.stats[0]/2){m.hp=Math.min(m.stats[0],m.hp+10);used=true;}if(i==='sitrus-berry'&&m.hp<=m.stats[0]/2){m.hp=Math.min(m.stats[0],m.hp+Math.max(1,Math.floor((m.dynamax?.baseMaxHp||m.stats[0])/4)));used=true;}
 const cure=({'lum-berry':'all','pecha-berry':'poison','rawst-berry':'burn','aspear-berry':'freeze','chesto-berry':'sleep','cheri-berry':'paralysis'})[i];if(m.status&&(cure==='all'||m.status===cure)){m.status='';m.statusTurns=0;used=true;}
 if(i==='leppa-berry'){const slot=m.moves.find(v=>v.pp===0);if(slot){slot.pp=Math.min(dex.moves[slot.id].pp,10);used=true;}}
 if(used){m.consumedBerry=m.heldItem;m.heldItem='';return i;}return '';
}
export function afterDamage(a,d,move,result,dex,rng,applyStatus,ignore=false){const aa=abilityOf(a),da=ignore?'':abilityOf(d),i=itemOf(a),dealt=result.damage||0;
 if(dealt&&!move.max&&!move.z&&CONTACT_MOVES.has(move.id)&&a.hp){if(['rough-skin','iron-barbs'].includes(da)&&aa!=='magic-guard')a.hp=Math.max(0,a.hp-Math.max(1,Math.floor((a.dynamax?.baseMaxHp||a.stats[0])/8)*(result.hits||1)));if(itemOf(d)==='rocky-helmet'&&aa!=='magic-guard')a.hp=Math.max(0,a.hp-Math.max(1,Math.floor((a.dynamax?.baseMaxHp||a.stats[0])/6)*(result.hits||1)));
 const ailment=({static:'paralysis','flame-body':'burn','poison-point':'poison'})[da];if(ailment&&a.hp&&rng()<1-.7**(result.hits||1))applyStatus(a,dex.get(a.key),ailment,rng);
 if(da==='effect-spore'&&a.hp&&!dex.get(a.key).types.includes('grass')&&!['overcoat'].includes(aa)&&rng()<1-.7**(result.hits||1))applyStatus(a,dex.get(a.key),['poison','paralysis','sleep'][Math.floor(rng()*3)],rng);
 }
 if(dealt&&!d.hp&&da==='innards-out'&&aa!=='magic-guard')a.hp=Math.max(0,a.hp-dealt);
 if(dealt&&da==='spicy-spray')applyStatus(a,dex.get(a.key),'burn',rng);if(dealt&&da==='thermal-exchange'&&move.type==='fire')changeStage(d,1,1,false);if(dealt&&da==='berserk'&&d.hp>0&&d.hp<=d.stats[0]/2&&d.hp+dealt>d.stats[0]/2)changeStage(d,3,1,false);
 if(dealt&&a.hp&&i==='shell-bell')a.hp=Math.min(a.stats[0],a.hp+Math.max(1,Math.floor(dealt/8)));if(dealt&&a.hp&&i==='life-orb'&&aa!=='magic-guard'&&!result.sheerForce)a.hp=Math.max(0,a.hp-Math.max(1,Math.floor((a.dynamax?.baseMaxHp||a.stats[0])/10)));
 if(!d.hp&&a.hp){if(aa==='soul-heart')changeStage(a,3,1,false);if(aa==='moxie')changeStage(a,1,1,false);if(['beast-boost','eelevate'].includes(aa)){let best=1;for(let n=2;n<6;n++)if(a.stats[n]>a.stats[best])best=n;changeStage(a,best,1,false);}}
 result.berries=[berry(a,dex),berry(d,dex)].filter(Boolean);
}
export function endTurn(m,p,dex,battle,applyStatus){if(battle.engine&&battle.engine<4)return legacyEnd(m,p,dex,battle,applyStatus);if(!m.hp)return[];const a=abilityOf(m),i=itemOf(m),weather=fieldWeather(battle,battle.combatants||[]),changes=[];
 const heal=(n,cause)=>{if(!m.hp)return;const old=m.hp;m.hp=Math.min(m.stats[0],m.hp+Math.max(1,Math.floor((m.dynamax?.baseMaxHp||m.stats[0])*n)));if(m.hp!==old)changes.push({cause,healed:m.hp-old});};
 const hurt=(n,cause)=>{if(a==='magic-guard')return;const old=m.hp;m.hp=Math.max(0,m.hp-Math.max(1,Math.floor((m.dynamax?.baseMaxHp||m.stats[0])*n)));if(m.hp!==old)changes.push({cause,damage:old-m.hp});};
 if(a==='poison-heal'&&m.status==='poison')heal(1/8,a);else if(m.status==='burn')hurt(1/16,'burn');else if(m.status==='poison'){hurt(m.toxicTurns?Math.min(15,m.toxicTurns++)/16:1/8,'poison');}
 if(weather==='sand'&&!p.types.some(t=>['rock','ground','steel'].includes(t))&&!['sand-rush','sand-veil','sand-force','overcoat'].includes(a))hurt(1/16,'sand');
 if(weather==='hail'&&!p.types.includes('ice')&&!['ice-body','snow-cloak','overcoat'].includes(a))hurt(1/16,'hail');
 if(weather==='rain'&&['rain-dish','dry-skin'].includes(a))heal(a==='dry-skin'?1/8:1/16,a);if(['snow','hail'].includes(weather)&&a==='ice-body')heal(1/16,a);if(weather==='sun'&&['solar-power','dry-skin'].includes(a))hurt(1/8,a);
 if(m.hp&&i==='leftovers')heal(1/16,i);if(m.hp&&i==='black-sludge')p.types.includes('poison')?heal(1/16,i):hurt(1/8,i);
 if(m.hp&&i==='flame-orb')applyStatus(m,p,'burn',()=>0);if(m.hp&&i==='toxic-orb'){if(applyStatus(m,p,'poison',()=>0))m.toxicTurns=1;}
 if(weather==='rain'&&a==='hydration'){m.status='';m.statusTurns=0;}if(m.hp&&a==='speed-boost')changeStage(m,5,1,false);
 if(m.hp&&battle.terrain==='grassy'&&!dex.get(m.key).types.includes('flying')&&!['levitate','eelevate'].includes(a))heal(1/16,'grassy-terrain');
 if(m.hp&&m.gmaxResidual){if(!p.types.includes(m.gmaxResidual.type))hurt(1/6,'gmax-residual');if(--m.gmaxResidual.turns<=0)delete m.gmaxResidual;}if(m.hp&&m.gmaxTrap){hurt(1/8,'gmax-trap');if(--m.gmaxTrap.turns<=0)delete m.gmaxTrap;}if(m.auroraVeil>0)m.auroraVeil--;if(m.drowsy>0&&--m.drowsy===0)applyStatus(m,p,'sleep',()=>0);
 const nightmare=battle.combatants?.some(v=>v!==m&&v.hp&&abilityOf(v)==='bad-dreams');if(m.hp&&m.status==='sleep'&&nightmare)hurt(1/8,'bad-dreams');
 const used=berry(m,dex);if(used)changes.push({cause:used});m.flinch=false;return changes;
}
