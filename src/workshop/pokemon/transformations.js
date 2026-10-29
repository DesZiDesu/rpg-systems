import {specimenStats} from './specimens.js?v=0.90.16';
import {TRANSFORMATION_DATA as DATA} from './transformation-data.js?v=0.90.16';

export const TRANSFORMATION_SYSTEMS={mega:'Mega Evolution',primal:'Primal Reversion',ultra:'Ultra Burst',dynamax:'Dynamax',gigantamax:'Gigantamax',tera:'Terastallization',zmove:'Z-Moves',fusion:'Fusion',forms:'Form change',automatic:'Ability & battle forms'};
export const TERA_TYPES=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy','stellar'];
const check=(ok,message)=>{if(!ok)throw Error(message);};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/gu,'');
const ability=m=>m.battleAbility||m.ability||'';
export const baseKey=m=>m.formState?.key||m.key;
export function transformationConfig(raw={}){return{...Object.fromEntries(Object.keys(TRANSFORMATION_SYSTEMS).map(k=>[k,raw?.[k]!==false])),requireItems:raw?.requireItems!==false,multipleSystems:raw?.multipleSystems!==false,npc:raw?.npc!==false};}
export const battleConfig=s=>s.battle?.transformRules||transformationConfig(s.settings.transformations);
const has=(s,id)=>[id,id+'--bag',id+'--held'].some(key=>s.inventory?.[key]>0);
const holds=(m,id)=>m.heldItem?.replace(/--(?:held|bag)$/u,'')===id;
const ownsKey=(s,ids)=>ids.some(id=>has(s,id));
export function transformationHeldItem(id){return Object.values(DATA.mega).some(v=>v.item===id)||Object.hasOwn(DATA.zItems,id)||['red-orb','blue-orb','ultranecrozium-z','rusted-sword','rusted-shield','griseous-orb','griseous-core'].includes(id)||Object.values(TYPE_PLATES).includes(id)||TERA_TYPES.slice(0,-1).some(type=>id===type+'-memory')||['douse-drive','shock-drive','burn-drive','chill-drive'].includes(id)||['wellspring-mask','hearthflame-mask','cornerstone-mask'].includes(id);}
export function transformationItems(dex){return [...dex.items.keys()].filter(transformationHeldItem);}
export function megaForms(dex,m){
 const key=baseKey(m),p=dex.get(key),aliases={'meowstic-m':'meowstic-male','meowstic-f':'meowstic-female'};
 return dex.forms.filter(f=>{const entry=DATA.mega[f.key];if(!entry||f.speciesId!==p.speciesId)return false;let from=String(entry.base).toLowerCase().replaceAll(' ','-');from=aliases[from]||from;
  if(from==='floette-eternal')return key===from;
  const exact=dex.forms.find(v=>norm(v.key)===norm(from));return exact?key===exact.key:key===(dex.bySpecies.get(p.speciesId)?.key);
 });
}
const ultraItem=(s,m)=>holds(m,'ultranecrozium-z')&&ownsKey(s,['z-ring','z-power-ring']);
const megaItem=(s,m,f)=>{const item=DATA.mega[f.key]?.item;return ownsKey(s,['key-stone','mega-ring','mega-bracelet'])&&(item?holds(m,item):m.moves.some(v=>v.id===620))&&!Object.hasOwn(DATA.zItems,m.heldItem);};
function used(s,side,kind){const b=s.battle,rules=battleConfig(s),spent=b?.transformUsed?.[side]||{};return Boolean(kind!=='primal'&&(spent[kind]||!rules.multipleSystems&&Object.entries(spent).some(([k,v])=>k!=='primal'&&v)));}
function reserve(s,side,kind){s.battle.transformUsed||={};s.battle.transformUsed[side]||={};s.battle.transformUsed[side][kind]=true;}
export function transformationOptions(s,dex,m,side='player'){
 if(!s.battle||!m?.hp)return[];const rules=battleConfig(s),p=dex.get(baseKey(m)),result=[];if(side==='opponent')s={...s,inventory:s.battle.trainer?.equipment||{}};
 const add=(kind,key,label,item,eligible=true)=>{if(!rules[kind])return;const group=kind==='gigantamax'?'dynamax':kind;let reason='';
  if(side==='opponent'&&!rules.npc)reason='NPC transformations disabled';else if(used(s,side,group))reason='Already used this battle';else if(m.formState&&m.formState.kind!=='automatic'||m.tera||m.dynamax)reason='Already transformed';else if(rules.requireItems&&!eligible)reason='Requires '+item;
  result.push({kind,key,label,item,ready:!reason,reason});};
 for(const f of megaForms(dex,m))add('mega',f.key,f.form||f.name,DATA.mega[f.key].item||'Dragon Ascent',megaItem(s,m,f));
 if(p.key==='groudon'||p.key==='kyogre'){const item=p.key==='groudon'?'red-orb':'blue-orb';add('primal',p.key+'-primal','Primal '+p.name,item,holds(m,item));}
 if(['necrozma-dusk','necrozma-dawn'].includes(p.key))add('ultra','necrozma-ultra','Ultra Necrozma','Ultranecrozium Z + Z-Ring',ultraItem(s,m));
 if(![888,889,890].includes(p.speciesId)){
  add('dynamax',p.key,'Dynamax','Dynamax Band',has(s,'dynamax-band'));
  const gmax=dex.forms.find(v=>v.speciesId===p.speciesId&&v.key===(p.key+'-gmax'))||dex.forms.find(v=>v.key.endsWith('-gmax')&&v.speciesId===p.speciesId&&(p.speciesId===869||v.key.replace('-gmax','')===p.key.replace(/-(?:male|female)$/u,'')));
  if(gmax&&m.gmaxFactor!==false)add('gigantamax',gmax.key,'Gigantamax','Dynamax Band',has(s,'dynamax-band'));
 }
 {const type=teraType(m,dex);add('tera',type,'Tera · '+type,'Tera Orb',has(s,'tera-orb'));}
 if(rules.zmove){const crystal=DATA.zItems[m.heldItem],zslots=m.moves.filter(v=>v.pp>0&&zMoveFor(dex,m,dex.moves[v.id],!rules.requireItems));
  const reason=used(s,side,'zmove')?'Already used this battle':m.dynamax||m.formState&&!['automatic','ultra'].includes(m.formState.kind)?'Unavailable in this form':rules.requireItems&&(!crystal||!ownsKey(s,['z-ring','z-power-ring']))?'Requires a compatible Z-Crystal + Z-Ring':!zslots.length?'No compatible move':'';
  result.push({kind:'zmove',key:'zmove',label:'Z-Move',ready:!reason,reason});
 }
 return result;
}
export function teraType(m,dex){const p=dex.get(baseKey(m));if(p.speciesId===1024)return'stellar';if(p.speciesId===1017)return({'ogerpon':'grass','ogerpon-wellspring-mask':'water','ogerpon-hearthflame-mask':'fire','ogerpon-cornerstone-mask':'rock'})[p.key]||'grass';return TERA_TYPES.includes(m.teraType)?m.teraType:p.types[0];}

// Transient identities are accompanied by an explicit original snapshot. All
// consumers read the effective key; permanent ownership is restored on exit.
export function changeBattleForm(m,key,dex,kind='automatic'){
 const target=dex.get(key);if(!target||m.key===key)return false;
 m.formState||={key:m.key,ability:m.ability||'',kind};
 const old=m.stats[0],damage=Math.max(0,old-m.hp),fainted=m.hp===0;
 m.key=key;const oldAbility=m.ability;m.ability=target.abilities.some(a=>a.name===oldAbility)?oldAbility:target.abilities.find(a=>!a.hidden)?.name||target.abilities[0]?.name||'';
 delete m.battleAbility;m.stats=specimenStats(target,m);m.hp=fainted?0:Math.max(1,Math.min(m.stats[0],m.stats[0]-damage));return true;
}
export function restoreBattleForm(m,dex){
 if(!m)return;const snap=m.formState,old=m.stats[0],fainted=m.hp===0,ratio=m.hp/Math.max(1,old),damage=old-m.hp,wasDynamax=Boolean(m.dynamax);
 if(snap){m.key=snap.key;m.ability=snap.ability;if(snap.copiedMoves)m.moves=snap.copiedMoves;}delete m.formState;delete m.dynamax;delete m.battleAbility;
 m.stats=specimenStats(dex.get(m.key),m);m.hp=fainted?0:wasDynamax?Math.max(1,Math.ceil(ratio*m.stats[0])):Math.max(1,Math.min(m.stats[0],m.stats[0]-damage));
}
export function clearTransformations(m,dex){if(m.formState||m.dynamax)restoreBattleForm(m,dex);delete m.tera;delete m.empowered;delete m.palafinReady;delete m.bondTriggered;delete m.disguiseBroken;delete m.iceFaceBroken;delete m.iceWeather;delete m.stellarSpent;delete m.formEntry;delete m.entryBoosted;delete m.battleEngine;delete m.proteanUsed;delete m.typeOverride;delete m.maxGuard;delete m.focusEnergy;delete m.gmaxResidual;delete m.gmaxTrap;delete m.trapped;delete m.auroraVeil;delete m.drowsy;delete m.confusion;delete m.torment;delete m.infatuated;delete m.consumedBerry;}
export function transformBattle(s,dex,m,selection,moveId,side='player',log=()=>{}){
 const option=transformationOptions(s,dex,m,side).find(v=>v.kind===selection.kind&&(!selection.key||v.key===selection.key));check(option?.ready,option?.reason||'This transformation is unavailable');
 if(option.kind==='zmove'){const move=dex.moves[moveId];check(zMoveFor(dex,m,move,!battleConfig(s).requireItems),'Choose a compatible Z-Move');m.empowered={kind:'zmove',moveId};reserve(s,side,'zmove');}
 else if(option.kind==='tera'){
  m.tera={type:teraType(m,dex),originalTypes:[...dex.get(m.key).types],spent:[]};
  if(dex.get(baseKey(m)).speciesId===1024){changeBattleForm(m,'terapagos-stellar',dex,'tera');s.battle.weather='clear';s.battle.weatherTurns=0;delete s.battle.terrain;s.battle.terrainTurns=0;}
  if(dex.get(baseKey(m)).speciesId===1017){const index=({grass:5,water:4,fire:1,rock:2})[m.tera.type];stage(m,index,1);m.battleAbility='embody-aspect';}
  reserve(s,side,'tera');
 }else if(['dynamax','gigantamax'].includes(option.kind)){
  const ratio=m.hp/m.stats[0];if(option.kind==='gigantamax')changeBattleForm(m,option.key,dex,'dynamax');else m.formState||={key:m.key,ability:m.ability||'',kind:'dynamax'};m.formState.kind='dynamax';
  m.dynamax={turns:3,baseMaxHp:m.stats[0],multiplier:dex.get(baseKey(m)).speciesId===292?1:1.5+.05*Math.max(0,Math.min(10,m.dynamaxLevel||0)),gigantamax:option.kind==='gigantamax'};
  m.stats=specimenStats(dex.get(m.key),m);m.hp=Math.max(1,Math.ceil(ratio*m.stats[0]));m.choiceMove=0;reserve(s,side,'dynamax');
 }else{if(m.formState?.kind==='automatic')restoreBattleForm(m,dex);changeBattleForm(m,option.key,dex,option.kind);reserve(s,side,option.kind);}
 log(s,'transformed',{name:dex.get(m.key).name,form:dex.get(m.key).form||option.label,system:option.kind,side,uid:m.uid});return option;
}
export function battleTypes(m,dex){if(m.tera&&m.tera.type!=='stellar')return[m.tera.type];return m.typeOverride||dex.get(m.key).types;}
export function stabMultiplier(m,move,dex){const adapt=ability(m)==='adaptability',types=m.tera?.originalTypes||m.typeOverride||dex.get(m.key).types,original=types.includes(move.type);
 if(m.tera?.type==='stellar'){const spent=m.tera.spent.includes(move.type)&&dex.get(baseKey(m)).speciesId!==1024;return original?(spent?1.5:2):spent?1:1.2;}
 if(m.tera){const tera=m.tera.type===move.type;return tera&&original?(adapt?2.25:2):tera||original?(adapt&&tera?2:1.5):1;}
 return original?(adapt?2:1.5):1;
}
const MAX_NAMES={normal:'Max Strike',fire:'Max Flare',water:'Max Geyser',electric:'Max Lightning',grass:'Max Overgrowth',ice:'Max Hailstorm',fighting:'Max Knuckle',poison:'Max Ooze',ground:'Max Quake',flying:'Max Airstream',psychic:'Max Mindstorm',bug:'Max Flutterby',rock:'Max Rockfall',ghost:'Max Phantasm',dragon:'Max Wyrmwind',dark:'Max Darkness',steel:'Max Steelspike',fairy:'Max Starfall'};
const Z_NAMES={normal:'Breakneck Blitz',fire:'Inferno Overdrive',water:'Hydro Vortex',electric:'Gigavolt Havoc',grass:'Bloom Doom',ice:'Subzero Slammer',fighting:'All-Out Pummeling',poison:'Acid Downpour',ground:'Tectonic Rage',flying:'Supersonic Skystrike',psychic:'Shattered Psyche',bug:'Savage Spin-Out',rock:'Continental Crush',ghost:'Never-Ending Nightmare',dragon:'Devastating Drake',dark:'Black Hole Eclipse',steel:'Corkscrew Crash',fairy:'Twinkle Tackle'};
const GMAX={3:['grass','G-Max Vine Lash'],6:['fire','G-Max Wildfire'],9:['water','G-Max Cannonade'],12:['bug','G-Max Befuddle'],25:['electric','G-Max Volt Crash'],52:['normal','G-Max Gold Rush'],68:['fighting','G-Max Chi Strike'],94:['ghost','G-Max Terror'],99:['water','G-Max Foam Burst'],131:['ice','G-Max Resonance'],133:['normal','G-Max Cuddle'],143:['normal','G-Max Replenish'],569:['poison','G-Max Malodor'],809:['steel','G-Max Meltdown'],812:['grass','G-Max Drum Solo'],815:['fire','G-Max Fireball'],818:['water','G-Max Hydrosnipe'],823:['flying','G-Max Wind Rage'],826:['psychic','G-Max Gravitas'],834:['water','G-Max Stonesurge'],839:['rock','G-Max Volcalith'],841:['grass','G-Max Tartness'],842:['grass','G-Max Sweetness'],844:['ground','G-Max Sandblast'],849:['electric','G-Max Stun Shock'],851:['fire','G-Max Centiferno'],858:['fairy','G-Max Smite'],861:['dark','G-Max Snooze'],869:['fairy','G-Max Finale'],879:['steel','G-Max Steelsurge'],884:['dragon','G-Max Depletion'],892:['dark','G-Max One Blow']};
export function maxPower(power,type){const weaker=['fighting','poison'].includes(type);return power<=40?(weaker?70:90):power<=50?(weaker?75:100):power<=60?(weaker?80:110):power<=70?(weaker?85:120):power<=100?(weaker?90:130):power<=140?(weaker?95:140):(weaker?100:150);}
const zPower=power=>power<=55?100:power<=65?120:power<=75?140:power<=85?160:power<=95?175:power<=100?180:power<=110?185:power<=125?190:power<=130?195:200;
export function zMoveFor(dex,m,move,relaxed=false){if(!move)return null;const crystal=DATA.zItems[m.heldItem];
 if(crystal?.move){const p=dex.get(m.key),matches=crystal.users.some(name=>norm(name)===norm(p.key)||norm(name)===norm(p.name)&&!p.form);if(!matches||crystal.from!==move.name)return null;const data=Object.values(dex.moves).find(v=>v.name===crystal.move);return{...move,...data,id:move.id,priority:0,accuracy:0,pp:move.pp,power:data?data.power:zPower(move.power),z:true,name:crystal.move};}
 if(!relaxed&&crystal?.type!==move.type)return null;
 return{...move,name:move.power?Z_NAMES[move.type]||'Z-'+move.name:'Z-'+move.name,power:move.power?(DATA.moves[move.id]?.zPower||zPower(move.power)):0,priority:move.power?0:move.priority,accuracy:0,z:true};
}
export function battleMove(dex,m,move,battle={}){
 let out={...move};const a=ability(m),normalConversions={aerilate:'flying',pixilate:'fairy',refrigerate:'ice',galvanize:'electric',dragonize:'dragon'};
 if(out.id===783&&m.key==='morpeko-hangry')out.type='dark';
 if(out.id===851&&m.tera){out.type=m.tera.type;out.class=m.stats[1]>m.stats[3]?2:3;if(out.type==='stellar')out.power=100;}
 if(out.id===906&&m.key==='terapagos-stellar')out.type='stellar';
 if([449,718,686,904].includes(out.id))out.type=dex.get(m.key).types[0];if(out.id===546)out.type=({'douse-drive':'water','shock-drive':'electric','burn-drive':'fire','chill-drive':'ice'})[m.heldItem]||'normal';
 if(out.id===722||out.name==='Light That Burns the Sky')out.class=m.stats[1]>m.stats[3]?2:3;
 if(out.id===311){const weather=ability(m)==='mega-sol'?'sun':battle.weather,type=({sun:'fire',rain:'water',sand:'rock',hail:'ice',snow:'ice'})[weather];if(type){out.type=type;out.power*=2;}}
 if(a==='prankster'&&!out.power)out.priority=(out.priority||0)+1;
 if(a==='normalize'){out.type='normal';out.power=Math.floor(out.power*1.2);}else if(out.type==='normal'&&normalConversions[a]){out.type=normalConversions[a];out.power=Math.floor(out.power*1.2);}
 if(m.empowered?.kind==='zmove'&&m.empowered.moveId===move.id)return zMoveFor(dex,m,move,battle.transformRules?.requireItems===false)||out;
 if(m.dynamax){if(!move.power)return{...out,name:'Max Guard',power:0,target:7,priority:4,max:true,maxGuard:true};
  const p=dex.get(m.key),signature=GMAX[p.speciesId],gmax=m.dynamax.gigantamax&&signature?.[0]===out.type;
  return{...out,name:gmax?(p.key==='urshifu-rapid-strike-gmax'?'G-Max Rapid Flow':signature[1]):MAX_NAMES[out.type],power:gmax&&[812,815,818].includes(p.speciesId)?160:DATA.moves[move.id]?.maxPower||maxPower(move.power,out.type),accuracy:0,priority:0,max:true,gmax:gmax?p.speciesId:0};
 }
 if(m.tera&&m.tera.type===out.type&&out.power>0&&out.power<60&&out.priority<=0&&!(dex.moveMeta[move.id]?.maxHits>1))out.power=60;
 return out;
}
export function stage(m,index,change,hostile=false){const a=ability(m);if(hostile&&change<0&&(['clear-body','white-smoke'].includes(a)||index===1&&a==='hyper-cutter'))return;if(a==='contrary')change=-change;m.stages||=Array(8).fill(0);m.stages[index]=Math.max(-6,Math.min(6,(m.stages[index]||0)+change));}
export function applyZStatus(m,move){const data=DATA.moves[move.id]||{},indexes={atk:1,def:2,spa:3,spd:4,spe:5,accuracy:6,evasion:7};for(const[k,n]of Object.entries(data.zBoost||{}))stage(m,indexes[k],n);
 if(['heal','healreplacement'].includes(data.zEffect))m.hp=m.stats[0];if(data.zEffect==='clearnegativeboost')m.stages=m.stages.map(n=>Math.max(0,n));if(data.zEffect==='crit2')m.focusEnergy=2;if(data.zEffect==='redirect')m.redirect=true;
}
export function applyMaxEffect(a,d,move,battle,dex,applyStatus,rng){
 if(!move.max||!move.power||!d.hp)return;
 const weather={fire:'sun',water:'rain',rock:'sand',ice:'hail'},terrain={electric:'electric',grass:'grassy',psychic:'psychic',fairy:'misty'};
 if(!move.gmax){if(weather[move.type]){battle.weather=weather[move.type];battle.weatherTurns=5;}if(terrain[move.type]){battle.terrain=terrain[move.type];battle.terrainTurns=5;}
  const up={fighting:1,steel:2,poison:3,ground:4,flying:5},down={dragon:1,ghost:2,bug:3,dark:4,normal:5};if(up[move.type])stage(a,up[move.type],1);if(down[move.type])stage(d,down[move.type],-1,true);return;}
 const id=move.gmax;
 if([3,6,9,839].includes(id)){d.gmaxResidual={type:({3:'grass',6:'fire',9:'water',839:'rock'})[id],turns:4};}
 if([844,851].includes(id))d.gmaxTrap={turns:4};
 if(id===25)applyStatus(d,dex.get(d.key),'paralysis',rng);if(id===569)applyStatus(d,dex.get(d.key),'poison',rng);if(id===12)applyStatus(d,dex.get(d.key),['poison','paralysis','sleep'][Math.floor(rng()*3)],rng);
 if(id===849)applyStatus(d,dex.get(d.key),rng()<.5?'poison':'paralysis',rng);if(id===861&&rng()<.5)d.drowsy=2;
 if(id===68)a.focusEnergy=(a.focusEnergy||0)+1;if(id===99)stage(d,5,-2);if(id===841)stage(d,7,-1);
 if(id===131){battle.screens||={};battle.screens[battle.activeUid===a.uid?'player':'opponent']=5;}if(id===94)d.trapped=true;if(id===133&&['male','female'].includes(a.traits?.gender)&&['male','female'].includes(d.traits?.gender)&&a.traits.gender!==d.traits.gender&&ability(d)!=='oblivious')d.infatuated=true;if(id===52)d.confusion=3;if(id===858)d.confusion=3;
 if(id===143&&a.consumedBerry&&rng()<.5&&!a.heldItem)a.heldItem=a.consumedBerry;
 if(id===842){a.status='';a.statusTurns=0;}if(id===869)a.hp=Math.min(a.stats[0],a.hp+Math.floor(a.stats[0]/6));
 if(id===884)for(const slot of d.moves)if(slot.id===d.lastMoveId)slot.pp=Math.max(0,slot.pp-2);
 if(id===809)d.torment=true;if(id===826)battle.gravityTurns=5;if([834,879].includes(id)){battle.hazards||={};const side=battle.activeUid===d.uid?'player':'opponent';battle.hazards[side]||={};battle.hazards[side][id===834?'rock':'steel']=true;}
 if(id===823){delete a.rocks;delete a.steelRocks;delete d.rocks;delete d.steelRocks;delete a.auroraVeil;delete d.auroraVeil;delete battle.screens;delete battle.hazards;delete battle.terrain;battle.terrainTurns=0;}
}
export function automaticForm(s,dex,m,phase='check',log=()=>{}){
 if(!m?.hp||!s.battle?.transformRules||!battleConfig(s).automatic||m.dynamax||m.tera||m.formState&&m.formState.kind!=='automatic')return false;
 const key=baseKey(m),p=dex.get(key),a=ability(m),participants=[s.pokemon[s.battle.activeUid],s.battle.wild],weather=participants.some(v=>['cloud-nine','air-lock'].includes(ability(v)))?'clear':participants.some(v=>ability(v)==='desolate-land')?'sun':participants.some(v=>ability(v)==='primordial-sea')?'rain':s.battle.weather;let target='';
 if(p.speciesId===351&&a==='forecast')target=({sun:'castform-sunny',rain:'castform-rainy',hail:'castform-snowy',snow:'castform-snowy'})[weather]||'castform';
 if(p.speciesId===421&&a==='flower-gift')target=weather==='sun'?'cherrim-sunshine':'cherrim-overcast';
 if(p.speciesId===555&&a==='zen-mode')target=(key.includes('-galar-')?'darmanitan-galar-':'darmanitan-')+(m.hp<=m.stats[0]/2?'zen':'standard');
 if(p.speciesId===746&&a==='schooling')target=m.level>=20&&m.hp>m.stats[0]/4?'wishiwashi-school':'wishiwashi-solo';
 if(p.speciesId===774&&a==='shields-down'){const color=key.replace(/^minior-/u,'').replace(/-meteor$/u,'');target='minior-'+color+(m.hp>m.stats[0]/2?'-meteor':'');}
 if(p.speciesId===718&&a==='power-construct'&&phase==='end'&&m.hp<=m.stats[0]/2)target='zygarde-complete';
 if(p.speciesId===877&&a==='hunger-switch'&&phase==='end')target=m.key==='morpeko-hangry'?'morpeko-full-belly':'morpeko-hangry';
 if(p.speciesId===964&&a==='zero-to-hero'&&m.palafinReady)target='palafin-hero';
 if(p.speciesId===875&&a==='ice-face'&&['hail','snow'].includes(weather)&&(phase==='entry'||m.iceWeather!==weather)){target='eiscue-ice';m.iceWeather=weather;m.iceFaceBroken=false;}
 if(p.speciesId===716)target='xerneas-active';
 if(p.speciesId===1024&&a==='tera-shift')target='terapagos-terastal';
 if(p.speciesId===888&&holds(m,'rusted-sword'))target='zacian-crowned';
 if(p.speciesId===889&&holds(m,'rusted-shield'))target='zamazenta-crowned';
 if(!target||m.key===target)return false;
 const changed=target===m.formState?.key?(restoreBattleForm(m,dex),true):changeBattleForm(m,target,dex);
 if(changed)log(s,'transformed',{name:dex.get(m.key).name,form:dex.get(m.key).form,system:'automatic',uid:m.uid});return changed;
}
export function switchForm(m,dex){if(!m)return;if(dex.get(baseKey(m)).speciesId===964&&ability(m)==='zero-to-hero')m.palafinReady=true;
 if(m.dynamax)restoreBattleForm(m,dex);if(m.formState?.kind==='automatic'&&![964,718,658].includes(dex.get(baseKey(m)).speciesId))restoreBattleForm(m,dex);delete m.gmaxTrap;delete m.trapped;delete m.confusion;delete m.infatuated;
}
export function prepareMoveForm(m,move,dex,battle){
 if(!battle.transformRules?.automatic||m.dynamax||m.tera)return;
 if(ability(m)==='stance-change'&&dex.get(baseKey(m)).speciesId===681&&(move.power||move.id===588))changeBattleForm(m,move.id===588?'aegislash-shield':'aegislash-blade',dex);
}
export function shieldForm(m,move,dex,battle,ignore=false){
 if(!battle.transformRules?.automatic||ignore||!move.power)return'';
 if(ability(m)==='disguise'&&m.key.endsWith('disguised')&&!m.disguiseBroken){
  changeBattleForm(m,m.key.replace('disguised','busted'),dex);m.disguiseBroken=true;m.hp=Math.max(0,m.hp-Math.max(1,Math.floor(m.stats[0]/8)));return'disguise';
 }
 if(ability(m)==='ice-face'&&m.key==='eiscue-ice'&&move.class===2){changeBattleForm(m,'eiscue-noice',dex);m.iceFaceBroken=true;m.iceWeather=battle.weather;return'ice-face';}
 return'';
}
export function afterMoveForm(a,d,move,dex,battle,result){
 if(!battle.transformRules?.automatic)return;
 if(a.hp&&dex.get(baseKey(a)).speciesId===648&&move.id===547&&!result.miss&&!result.blocked)changeBattleForm(a,a.key==='meloetta-aria'?'meloetta-pirouette':'meloetta-aria',dex);
 if(a.hp&&ability(a)==='battle-bond'&&dex.get(baseKey(a)).speciesId===658&&!d.hp&&result.damage&&!a.bondTriggered){changeBattleForm(a,'greninja-ash',dex);a.bondTriggered=true;}
 if(a.hp&&ability(a)==='gulp-missile'&&a.key==='cramorant'&&[57,291].includes(move.id)&&!result.miss)changeBattleForm(a,a.hp>a.stats[0]/2?'cramorant-gulping':'cramorant-gorging',dex);
 if(ability(d)==='gulp-missile'&&result.damage&&['cramorant-gulping','cramorant-gorging'].includes(d.key)){a.hp=Math.max(0,a.hp-Math.max(1,Math.floor(a.stats[0]/4)));if(d.key==='cramorant-gorging'&&!a.status)a.status='paralysis';else stage(a,2,-1);changeBattleForm(d,'cramorant',dex);}
}
export function copyBattleForm(m,target,dex){
 if(!target?.hp||target.formState?.kind==='transform'||m.formState?.kind==='transform')return false;
 const moves=m.moves,ownHP=m.stats[0],currentHP=m.hp;changeBattleForm(m,target.key,dex,'transform');
 m.formState||={key:m.key,ability:m.ability,kind:'transform'};m.formState.copiedMoves=moves;m.ability=ability(target);m.stats=[ownHP,...target.stats.slice(1)];m.hp=currentHP;m.stages=[...(target.stages||Array(8).fill(0))];m.moves=target.moves.map(v=>({id:v.id,pp:5}));return true;
}
export function finishTransformationTurn(s,dex,log=()=>{}){
 if(!s.battle)return;const b=s.battle;for(const m of[s.pokemon[b.activeUid],b.wild]){automaticForm(s,dex,m,'end',log);delete m.empowered;
  if(m.dynamax&&--m.dynamax.turns<=0){restoreBattleForm(m,dex);automaticForm(s,dex,m,'check',log);log(s,'form-ended',{name:dex.get(m.key).name,system:'dynamax'});}
  if(!m.hp){restoreBattleForm(m,dex);delete m.tera;}
 }
 if(b.terrainTurns>0&&--b.terrainTurns===0){delete b.terrain;log(s,'terrain-ended');}if(b.gravityTurns>0)b.gravityTurns--;if(b.screens)for(const side of Object.keys(b.screens))if(--b.screens[side]<=0)delete b.screens[side];
}

const FORM_GROUPS={386:{item:'meteorite'},479:{item:'rotom-catalog'},483:{item:'adamant-crystal'},484:{item:'lustrous-globe'},487:{item:'griseous-core'},492:{item:'gracidea'},641:{item:'reveal-glass'},642:{item:'reveal-glass'},645:{item:'reveal-glass'},905:{item:'reveal-glass'},720:{item:'prison-bottle'},676:{},585:{},586:{},741:{},718:{item:'zygarde-cube'},647:{move:548}};
const TYPE_PLATES={fire:'flame-plate',water:'splash-plate',electric:'zap-plate',grass:'meadow-plate',ice:'icicle-plate',fighting:'fist-plate',poison:'toxic-plate',ground:'earth-plate',flying:'sky-plate',psychic:'mind-plate',bug:'insect-plate',rock:'stone-plate',ghost:'spooky-plate',dragon:'draco-plate',dark:'dread-plate',steel:'iron-plate',fairy:'pixie-plate'};
const FUSIONS={'kyurem-black':{base:'kyurem',partner:644,item:'dna-splicers'},'kyurem-white':{base:'kyurem',partner:643,item:'dna-splicers'},'necrozma-dusk':{base:'necrozma',partner:791,item:'n-solarizer'},'necrozma-dawn':{base:'necrozma',partner:792,item:'n-lunarizer'},'calyrex-ice':{base:'calyrex',partner:896,item:'reins-of-unity'},'calyrex-shadow':{base:'calyrex',partner:897,item:'reins-of-unity'}};
export function formOptions(s,dex,m){if(!m)return[];const p=dex.get(m.key),rules=transformationConfig(s.settings.transformations),group=FORM_GROUPS[p.speciesId],fusion=Object.values(FUSIONS).some(f=>f.base===m.key),ordinary=group||[493,649,773,1017].includes(p.speciesId);
 return dex.forms.filter(f=>f.speciesId===p.speciesId&&f.key!==m.key&&!f.battleOnly&&(ordinary||fusion&&FUSIONS[f.key])).filter(f=>![493].includes(p.speciesId)||f.key!=='arceus-unknown').filter(f=>p.speciesId!==718||!f.key.includes('power-construct')===!m.key.includes('power-construct')).map(f=>{
  const link=FUSIONS[f.key];let item=group?.item||'',move=group?.move||0;
  if(p.speciesId===493)item=TYPE_PLATES[f.types[0]]||'';if(p.speciesId===773)item=f.types[0]==='normal'?'':f.types[0]+'-memory';if(p.speciesId===649)item=({'genesect-douse':'douse-drive','genesect-shock':'shock-drive','genesect-burn':'burn-drive','genesect-chill':'chill-drive'})[f.key]||'';
  if(p.speciesId===1017)item=({'ogerpon-wellspring-mask':'wellspring-mask','ogerpon-hearthflame-mask':'hearthflame-mask','ogerpon-cornerstone-mask':'cornerstone-mask'})[f.key]||'';
  if(p.speciesId===741)item=({'oricorio-baile':'red-nectar','oricorio-pom-pom':'yellow-nectar','oricorio-pau':'pink-nectar','oricorio-sensu':'purple-nectar'})[f.key];
  const partner=link?[...s.party,...s.box].filter(uid=>uid!==m.uid&&!s.pokemon[uid].fusion&&dex.get(s.pokemon[uid].key).speciesId===link.partner):[];
  item=link?.item||item;let reason=s.battle?'Finish the battle first':!rules[link?'fusion':'forms']?'System disabled':link&&!partner.length?'Requires '+dex.get(link.partner).name:rules.requireItems&&item&&!has(s,item)&&!holds(m,item)?'Requires '+item:move&&!m.moves.some(v=>v.id===move)?'Requires Secret Sword':'';
  return{key:f.key,label:f.form||f.name,item,partner,link,ready:!reason,reason};
 });
}
export function formAction(s,e,dex,log){
 if(e.type==='transformation-settings'){check(e.source==='user','Only the player can configure transformations');s.settings.transformations=transformationConfig({...s.settings.transformations,...e.config});return true;}
 if(e.type==='pokemon-form-settings'){check(e.source==='user'&&!s.battle,'Configure a Pokémon outside battle');const m=s.pokemon[e.uid];check(m&&!m.fusedInto,'Choose an owned Pokémon');
  if(e.teraType!==undefined){check(TERA_TYPES.includes(e.teraType),'Choose a valid Tera Type');m.teraType=e.teraType;}
  if(e.dynamaxLevel!==undefined){check(Number.isInteger(e.dynamaxLevel)&&e.dynamaxLevel>=0&&e.dynamaxLevel<=10,'Dynamax Level must be 0–10');m.dynamaxLevel=e.dynamaxLevel;}
  if(typeof e.gmaxFactor==='boolean')m.gmaxFactor=e.gmaxFactor;return true;
 }
 if(e.type==='unfuse'){check(e.source==='user'&&!s.battle,'Separate a fusion outside battle');const m=s.pokemon[e.uid],fusion=m?.fusion,partner=s.pokemon[fusion?.partnerUid];check(fusion&&partner,'No fusion to separate');const old=m.stats[0],fainted=!m.hp,damage=old-m.hp;m.key=fusion.key;m.ability=fusion.ability;m.moves=fusion.moves.map(v=>({...v,pp:Math.min(v.pp,m.moves.find(slot=>slot.id===v.id)?.pp??v.pp)}));delete m.fusion;delete partner.fusedInto;m.stats=specimenStats(dex.get(m.key),m);m.hp=fainted?0:Math.max(1,m.stats[0]-damage);s.box.push(partner.uid);log(s,'unfused',{name:dex.get(m.key).name,partner:dex.get(partner.key).name});return true;}
 if(e.type!=='change-form')return false;
 check(e.source==='user'&&!s.battle,'Change permanent forms outside battle');const m=s.pokemon[e.uid];check(m&&!m.fusedInto,'Choose an owned Pokémon');const option=formOptions(s,dex,m).find(v=>v.key===e.key);check(option?.ready,option?.reason||'This permanent form change is unavailable');
 if(option.link){check(!m.fusion,'Separate the current fusion first');const partner=s.pokemon[e.partnerUid||option.partner[0]];check(partner&&option.partner.includes(partner.uid),'Choose a compatible owned fusion partner');m.fusion={key:m.key,ability:m.ability||'',partnerUid:partner.uid,moves:structuredClone(m.moves)};partner.fusedInto=m.uid;s.party=s.party.filter(uid=>uid!==partner.uid);s.box=s.box.filter(uid=>uid!==partner.uid);if(s.outUid===partner.uid)s.outUid=null;}
 const old=m.stats[0],fainted=!m.hp,damage=old-m.hp,from=dex.get(m.key).form||dex.get(m.key).name;m.key=option.key;const p=dex.get(m.key);m.ability=p.abilities.find(v=>v.name===m.ability)?.name||p.abilities.find(v=>!v.hidden)?.name||p.abilities[0]?.name||'';m.stats=specimenStats(p,m);m.hp=fainted?0:Math.max(1,m.stats[0]-damage);
 if(option.item?.endsWith('-nectar')&&transformationConfig(s.settings.transformations).requireItems)s.inventory[option.item]--;
 const held=[493,649,773,1017].includes(p.speciesId);if(held&&transformationConfig(s.settings.transformations).requireItems&&m.heldItem!==option.item){if(m.heldItem)s.inventory[m.heldItem]=(s.inventory[m.heldItem]||0)+1;if(option.item){check(has(s,option.item),'Required item is not in the bag');s.inventory[option.item]--;}m.heldItem=option.item;}
 log(s,'form-changed',{name:p.name,from,form:p.form});return true;
}

export function syncEquipmentForm(m,dex){
 if(!m||m.formState)return;const p=dex.get(m.key);let target='';
 if(p.speciesId===493)target='arceus-'+(Object.entries(TYPE_PLATES).find(([,item])=>holds(m,item))?.[0]||'normal');
 if(p.speciesId===773)target='silvally-'+(m.heldItem?.endsWith('-memory')?m.heldItem.slice(0,-7):'normal');
 if(p.speciesId===649)target=({'douse-drive':'genesect-douse','shock-drive':'genesect-shock','burn-drive':'genesect-burn','chill-drive':'genesect-chill'})[m.heldItem]||'genesect';
 if(p.speciesId===1017)target=({'wellspring-mask':'ogerpon-wellspring-mask','hearthflame-mask':'ogerpon-hearthflame-mask','cornerstone-mask':'ogerpon-cornerstone-mask'})[m.heldItem]||'ogerpon';
 if(target&&target!==m.key&&dex.get(target)){const old=m.stats[0],fainted=!m.hp;m.key=target;const next=dex.get(target);m.ability=next.abilities.some(v=>v.name===m.ability)?m.ability:next.abilities.find(v=>!v.hidden)?.name||'';m.stats=specimenStats(next,m);m.hp=fainted?0:Math.max(1,m.stats[0]-(old-m.hp));}
}

export function transformationKeyItem(id){return ['key-stone','mega-ring','mega-bracelet','z-ring','z-power-ring','dynamax-band','tera-orb','dna-splicers','n-solarizer','n-lunarizer','reins-of-unity','meteorite','rotom-catalog','adamant-crystal','lustrous-globe','griseous-core','gracidea','reveal-glass','prison-bottle','zygarde-cube','red-nectar','yellow-nectar','pink-nectar','purple-nectar'].includes(id);}
