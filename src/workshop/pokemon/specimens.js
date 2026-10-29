export const STAT_NAMES=['HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'];
export const NATURES=['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'];
export function seeded(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);let n=h>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function natureFactor(nature,stat){const i=Math.max(0,NATURES.indexOf(nature)),order=[1,2,5,3,4],up=order[Math.floor(i/5)],down=order[i%5];return up===down||stat===0?1:stat===up?1.1:stat===down?.9:1;}
export function traitsFor(p,seed,modern=true){
 const rng=seeded('specimen:'+seed),rate=/-female$/u.test(p.key)?8:/-male$/u.test(p.key)?0:p.genderRate;
 return{ivs:Array.from({length:6},()=>modern?Math.floor(rng()*32):31),evs:[0,0,0,0,0,0],nature:modern?NATURES[Math.floor(rng()*25)]:'Hardy',gender:!modern||rate===undefined?'unknown':rate===-1?'genderless':rng()<rate/8?'female':'male',seed:String(seed),legacy:!modern};
}
export function specimenStats(p,m){
 if(!m.traits)return p.stats.map((n,i)=>Math.floor((Math.floor((2*n+31)*m.level/100)+(i===0?m.level+10:5))*(i===0&&m.dynamax?m.dynamax.multiplier:1)));
 const values=p.stats.map((base,i)=>{const v=Math.floor((2*base+m.traits.ivs[i]+Math.floor(m.traits.evs[i]/4))*m.level/100);return i===0?(p.speciesId===292&&!m.traits.legacy?1:v+m.level+10):Math.floor((v+5)*natureFactor(m.traits.nature,i));});
 return values.map((v,i)=>Math.floor((m.statOverrides?.[i]??v)*(i===0&&m.dynamax?m.dynamax.multiplier:1)));
}
export function refreshStats(p,m){const old=m.stats?.[0]||1,damage=Math.max(0,old-m.hp),fainted=m.hp===0;m.stats=specimenStats(p,m);m.hp=fainted?0:Math.max(1,Math.min(m.stats[0],m.stats[0]-damage));}
export function validateTraits(traits){
 if(!Array.isArray(traits.ivs)||traits.ivs.length!==6||traits.ivs.some(n=>!Number.isInteger(n)||n<0||n>31))throw Error('IV must be an integer from 0 to 31');
 if(!Array.isArray(traits.evs)||traits.evs.length!==6||traits.evs.some(n=>!Number.isInteger(n)||n<0||n>252)||traits.evs.reduce((a,b)=>a+b,0)>510)throw Error('EV must be 0–252 per stat and at most 510 total');
 if(!NATURES.includes(traits.nature)||!['male','female','genderless','unknown'].includes(traits.gender))throw Error('Invalid nature or gender');
 return traits;
}
export function awardEVs(p,m,yields=[0,0,0,0,0,0]){if(!m.traits||m.traits.legacy)return;let remaining=510-m.traits.evs.reduce((a,b)=>a+b,0);for(let i=0;i<6;i++){const add=Math.min(remaining,252-m.traits.evs[i],Math.max(0,yields[i]||0));m.traits.evs[i]+=add;remaining-=add;}refreshStats(p,m);}
