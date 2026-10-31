// Read-only speaker projections. These never enter the NPC directory or game save.
import {battleSpriteCandidates} from './battle-sprites.js?v=0.94.2';
import {styleCandidates} from './sprite-styles.js?v=0.94.2';
const key=value=>String(value||'').trim().normalize('NFKC').toLowerCase();
const text=value=>typeof value==='string'?value.trim():'';
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const colors={electric:'#ffcf48',grass:'#82e9ad',fire:'#f7a26b',water:'#83c4ee',psychic:'#efa2c7',ghost:'#baa7ef',ice:'#9de6e5',fairy:'#f1b6dc'};
export const pokemonChatId=uid=>'pokemon:'+uid;
export const isPokemonSpeaker=profile=>Boolean(profile?.pokemon?.uid&&profile.id===pokemonChatId(profile.pokemon.uid));

export function pokemonChatImages(p,mon,dex,{mode='artwork',motion=true,style=''}={}){
 if(!p)return [];
 // A chosen game style leads; pixel art keeps the crisp sprite rendering.
 const styled=styleCandidates(p,mon,dex.spriteStyles,{style,motion}).map(v=>({url:v.url,mode:v.family==='pixel'?'sprite':'artwork',animated:v.animated}));
 const root=new URL('./',import.meta.url),front=animated=>battleSpriteCandidates(p,mon,dex.battleSprites,{side:'front',motion:animated}).map(v=>({...v,mode:'sprite'}));
 const artwork=mon?.shiny?([1,25,133,282].includes(p.pokemonId)?new URL('assets/shiny/'+p.pokemonId+'.png',root).href:p.image?.replace(/\/official-artwork\//,'/official-artwork/shiny/').replace(/\/pokemon\/(?!other\/)/,'/pokemon/shiny/')):p.localImage?new URL(p.localImage,root).href:p.image;
 const art=artwork?[{url:artwork,mode:'artwork',animated:false}]:[];
 return [...styled,...mode==='sprite'?[...front(motion),...art]:[...art,...front(false)]];
}

export function pokemonChatProfiles(game,dex,{playerName='',motion=true,npcs=[]}={}){
 if(!game||!dex)return [];
 const owned=new Set([...(game.party||[]),...(game.box||[])]),entries=[];
 for(const uid of owned){const mon=game.pokemon?.[uid];if(mon)entries.push({mon,ownerKind:'player',owner:text(playerName)});}
 const trainer=game.battle?.trainer;
 if(trainer)for(const mon of trainer.team||[])if(mon?.uid&&!owned.has(mon.uid))entries.push({mon,ownerKind:'trainer',owner:text(trainer.name)});
 const partner=game.battle?.double?.partner;
 if(partner)for(const mon of partner.team||[])if(mon?.uid&&!owned.has(mon.uid))entries.push({mon,ownerKind:'trainer',owner:text(partner.name)});
 const foe=game.battle?.wild;
 if(foe?.uid&&!entries.some(v=>v.mon.uid===foe.uid))entries.push({mon:foe,ownerKind:trainer?'trainer':'wild',owner:text(trainer?.name)});
 // Earlier messages still name opponents from finished battles. Caught ones
 // answer to their new record; the rest keep their final state, by ID only.
 const formerIds=new Map();
 for(const [uid,mon] of Object.entries(game.former||{}).reverse()){
  if(entries.some(v=>v.mon.uid===uid))continue;
  if(mon?.caughtAs&&owned.has(mon.caughtAs)){formerIds.set(mon.caughtAs,[...formerIds.get(mon.caughtAs)||[],pokemonChatId(uid)]);continue;}
  if(mon?.key)entries.push({mon:{...mon,uid},ownerKind:mon.ownerKind==='trainer'?'trainer':'wild',owner:text(mon.owner),departed:true,idOnly:true});
 }
 // NPC roster members can speak outside battle, by their stable ID only.
 for(const {mon,owner} of npcs)if(mon?.uid&&!entries.some(v=>v.mon.uid===mon.uid))entries.push({mon,ownerKind:'trainer',owner:text(owner),idOnly:true});
 const mode=game.settings?.dexImageMode==='sprite'?'sprite':'artwork',style=game.settings?.spriteStyle||'',animate=game.settings?.motion!==false&&motion;
 return entries.flatMap(({mon,owner,ownerKind,departed,idOnly})=>{
  const p=dex.get(mon.key);if(!p)return [];
  const name=text(mon.nickname)||p.name,id=pokemonChatId(mon.uid),qualified=owner?name+' ('+owner+')':'';
  return [{id,name,aliases:idOnly?[id]:[id,...formerIds.get(mon.uid)||[],name,p.name,p.key,qualified].filter(Boolean),identityColor:colors[p.types[0]]||'#c4d1dd',race:'Pokémon',
   pokemon:{uid:mon.uid,key:p.key,speciesId:p.speciesId,name,speciesName:p.name,form:p.form||'',types:p.types,level:number(mon.level),hp:number(mon.hp),maxHp:number(mon.stats?.[0]),gender:['male','female','genderless'].includes(mon.traits?.gender)?mon.traits.gender:'unknown',ownerKind,owner,shiny:Boolean(mon.shiny),status:typeof mon.status==='string'?mon.status:'',...departed?{departed:true}:{},...idOnly?{idOnly:true}:{},mode,motion:animate,images:pokemonChatImages(p,mon,dex,{mode,motion:animate,style})}}];
 });
}

// Shared species/nicknames never select the first of several individuals, and
// human trainers retain their names even when they coincide with a species.
export function availablePokemonSpeakers(profiles,reserved=[]){
 const used=new Set(reserved.flatMap(p=>[p.id,p.name,...p.aliases||[]]).filter(Boolean).map(key)),counts=new Map();
 for(const p of profiles)if(!p.pokemon?.idOnly)for(const value of new Set([p.name,...p.aliases].map(key)))counts.set(value,(counts.get(value)||0)+1);
 return profiles.map(p=>(p.pokemon?.idOnly?{...p,name:p.id,aliases:[p.id]}:{...p,name:used.has(key(p.name))||counts.get(key(p.name))>1?p.id:p.name,
  aliases:[...new Set(p.aliases)].filter(value=>value===p.id||!used.has(key(value))&&counts.get(key(value))===1)}));
}
