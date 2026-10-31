// Items that do something outside the medicine list: growth items (Rare Candy,
// EXP Candy, vitamins, wings, EV berries, PP Up, mints, Ability Capsule/Patch,
// Bottle Caps, Tera Shards), battle items (X items, Dire Hit, Poké Doll), field
// items (Repel, Escape Rope, Honey) and fossils. Pure state changes: the
// caller passes engine helpers in ctx so this module has no core import.
import {NATURES,refreshStats} from './specimens.js?v=0.97.0';

const STAT_ITEMS={'hp-up':0,protein:1,iron:2,calcium:3,zinc:4,carbos:5};
const WINGS={'health-wing':0,'muscle-wing':1,'resist-wing':2,'genius-wing':3,'clever-wing':4,'swift-wing':5};
const EV_BERRIES={'pomeg-berry':0,'kelpsy-berry':1,'qualot-berry':2,'hondew-berry':3,'grepa-berry':4,'tamato-berry':5};
const EXP_CANDY={'exp-candy-xs':100,'exp-candy-s':800,'exp-candy-m':3000,'exp-candy-l':10000,'exp-candy-xl':30000};
const X_ITEMS={'x-attack':1,'x-defense':2,'x-sp-atk':3,'x-sp-def':4,'x-speed':5,'x-accuracy':6};
const ESCAPE_ITEMS=new Set(['poke-doll','fluffy-tail','poke-toy']);
export const REPELS={repel:3,'super-repel':5,'max-repel':8};
export const FOSSILS={'helix-fossil':138,'dome-fossil':140,'old-amber':142,'root-fossil':345,'claw-fossil':347,'skull-fossil':408,'armor-fossil':410,'cover-fossil':564,'plume-fossil':566,'jaw-fossil':696,'sail-fossil':698};
const MINTS=Object.fromEntries(NATURES.map(n=>[n.toLowerCase()+'-mint',n]));
const TERA_SHARD=/^(normal|fire|water|electric|grass|ice|fighting|poison|ground|flying|psychic|bug|rock|ghost|dragon|dark|steel|fairy|stellar)-tera-shard$/u;
export const TERA_SHARD_COST=50;
const FIELD=new Set(['escape-rope','honey',...Object.keys(REPELS)]);

// What kind of use an item has, for the Bag and the Battle bag.
export function itemUse(id){
 if(id==='rare-candy'||EXP_CANDY[id]||Object.hasOwn(STAT_ITEMS,id)||Object.hasOwn(WINGS,id)||Object.hasOwn(EV_BERRIES,id)||['pp-up','pp-max','ability-capsule','ability-patch','bottle-cap','gold-bottle-cap'].includes(id)||MINTS[id]||TERA_SHARD.test(id))return {kind:'growth',target:true,move:id==='pp-up'||id==='pp-max'};
 if(X_ITEMS[id]||id==='dire-hit')return {kind:'battle',battle:true};
 if(ESCAPE_ITEMS.has(id))return {kind:'battle',battle:true,escape:true};
 if(FIELD.has(id))return {kind:'field'};
 if(FOSSILS[id])return {kind:'fossil'};
 return null;
}
export function maxPP(dex,slot){const base=dex.moves[slot.id]?.pp||35;return Math.floor(base*(1+.2*Math.min(3,slot.ppUps||0)));}
const evTotal=m=>m.traits.evs.reduce((a,b)=>a+b,0);
const fail=()=>{throw Error('This item would have no effect; nothing was consumed');};
const modern=m=>{if(!m.traits||m.traits.legacy)throw Error('This Pokémon uses classic fixed stats; this item has no effect on it');};

// Applies one item. ctx: {species, addExp(m,xp), learn(m), create(key,level,uid), explore(), place, log}
export function applyItem(s,dex,id,{uid,moveId,id:eventId}={},ctx){
 const use=itemUse(id);if(!use)throw Error('This item has no use here yet');
 const need=TERA_SHARD.test(id)?TERA_SHARD_COST:1;if(!((s.inventory[id]||0)>=need))throw Error(need>1?'You need '+need+' Tera Shards':'This item is unavailable');
 if(use.battle&&!s.battle)throw Error('Use this item during a battle');
 if(!use.battle&&s.battle&&use.kind!=='growth')throw Error('Use this item outside battle');
 if(use.kind==='growth'&&s.battle&&!/-berry$/u.test(id))throw Error('Use this item outside battle');
 const m=use.kind==='growth'||use.kind==='battle'&&!use.escape?s.pokemon[uid||s.battle?.activeUid||s.party[0]]:null;
 if((use.kind==='growth'||use.kind==='battle'&&!use.escape)&&!m)throw Error('Choose a Pokémon');
 const p=m&&ctx.species(m);let note='';
 if(id==='rare-candy'||EXP_CANDY[id]){if(m.level>=100)fail();const before=m.level,next=id==='rare-candy'?Math.max(0,ctx.experienceFor(m,m.level+1)-m.exp):EXP_CANDY[id];ctx.addExp(m,Math.max(1,next));if(m.level===before&&id==='rare-candy')fail();note=m.level>before?'Lv. '+m.level:'+'+next+' EXP';if(m.hp>0)m.hp=Math.min(m.stats[0],m.hp);m.friendship=Math.min(255,(m.friendship||0)+(id==='rare-candy'?5:2));}
 else if(Object.hasOwn(STAT_ITEMS,id)||Object.hasOwn(WINGS,id)){modern(m);const i=STAT_ITEMS[id]??WINGS[id],add=Math.min(Object.hasOwn(STAT_ITEMS,id)?10:1,252-m.traits.evs[i],510-evTotal(m));if(add<=0)fail();m.traits.evs[i]+=add;refreshStats(p,m);m.friendship=Math.min(255,(m.friendship||0)+(Object.hasOwn(STAT_ITEMS,id)?5:3));note='+'+add+' EV';}
 else if(Object.hasOwn(EV_BERRIES,id)){if(s.battle)throw Error('Use this item outside battle');modern(m);const i=EV_BERRIES[id],cut=Math.min(10,m.traits.evs[i]);if(!cut&&(m.friendship||0)>=255)fail();m.traits.evs[i]-=cut;refreshStats(p,m);m.friendship=Math.min(255,(m.friendship||0)+10);note=cut?'−'+cut+' EV':'';}
 else if(id==='pp-up'||id==='pp-max'){const slot=m.moves.find(v=>v.id===Number(moveId));if(!slot)throw Error('Choose a move');const ups=slot.ppUps||0;if(ups>=3)fail();const before=maxPP(dex,slot);slot.ppUps=id==='pp-max'?3:ups+1;slot.pp+=maxPP(dex,slot)-before;note=dex.moves[slot.id].name+' · '+maxPP(dex,slot)+' PP';}
 else if(MINTS[id]){modern(m);if((m.traits.mintNature||m.traits.nature)===MINTS[id])fail();m.traits.mintNature=MINTS[id];refreshStats(p,m);note=MINTS[id];}
 else if(id==='ability-capsule'){const normal=p.abilities.filter(a=>!a.hidden).map(a=>a.name),current=m.ability;if(normal.length<2||!normal.includes(current))fail();m.ability=normal.find(n=>n!==current);note=m.ability;}
 else if(id==='ability-patch'){const hidden=p.abilities.find(a=>a.hidden)?.name,normal=p.abilities.filter(a=>!a.hidden).map(a=>a.name);if(!hidden)fail();m.ability=m.ability===hidden?normal[0]:hidden;if(!m.ability)fail();note=m.ability;}
 else if(id==='bottle-cap'||id==='gold-bottle-cap'){modern(m);if(m.level<50)throw Error('Bottle Caps work from Lv. 50');const ivs=m.traits.ivs;if(ivs.every(v=>v>=31))fail();if(id==='gold-bottle-cap')m.traits.ivs=[31,31,31,31,31,31];else{const low=ivs.indexOf(Math.min(...ivs));ivs[low]=31;}refreshStats(p,m);note=id==='gold-bottle-cap'?'IV 31 ×6':'IV 31';}
 else if(TERA_SHARD.test(id)){const type=TERA_SHARD.exec(id)[1];if(m.teraType===type)fail();m.teraType=type;note=type;}
 else if(X_ITEMS[id]){const i=X_ITEMS[id];m.stages||=Array(8).fill(0);if(m.stages[i]>=6)fail();m.stages[i]=Math.min(6,m.stages[i]+2);note='+2';}
 else if(id==='dire-hit'){if((m.focusEnergy||0)>=2)fail();m.focusEnergy=2;}
 else if(use.escape){if(s.battle.trainer)throw Error('You cannot run from a trainer battle');s.inventory[id]--;return {escape:true};}
 else if(REPELS[id]){if((s.repel||0)>=REPELS[id])fail();s.repel=REPELS[id];note=String(REPELS[id]);}
 else if(id==='escape-rope'){note=ctx.place||'';}
 else if(id==='honey'){s.inventory[id]--;return {explore:true};}
 else if(FOSSILS[id]){if(!/lab|laborator|museum|ห้องแล็บ|ห้องแลบ|ห้องปฏิบัติการ|แล็บ|พิพิธภัณฑ์|研究所|博物館/iu.test(ctx.place||''))throw Error('Take the fossil to a lab or museum in the story');const mon=ctx.create(FOSSILS[id],20,'fossil-'+eventId);s.pokemon[mon.uid]=mon;if(s.party.length<6)s.party.push(mon.uid);else s.box.push(mon.uid);ctx.caught?.(mon);note=ctx.species(mon).name;}
 s.inventory[id]-=need;
 return {note};
}
