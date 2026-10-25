export const GYMS=[
 ['brock','Brock','Pewter','rock',[74,95]],['misty','Misty','Cerulean','water',[120,121]],['surge','Lt. Surge','Vermilion','electric',[100,25,26]],['erika','Erika','Celadon','grass',[71,114,45]],['koga','Koga','Fuchsia','poison',[109,89,110]],['sabrina','Sabrina','Saffron','psychic',[64,122,65]],['blaine','Blaine','Cinnabar','fire',[58,77,59]],['giovanni','Giovanni','Viridian','ground',[111,51,112]],
].map(([id,name,city,type,team],i)=>({id:'gym-'+id,name,city,type,team,badge:i+1,level:[14,21,24,29,43,43,47,50][i]}));
export function trainerDefinition(id,region,level){if(id==='route-trainer')return{id,name:'Route Trainer',team:region==='Kanto'?[19,16]:[133,25],level:Math.max(3,Math.min(100,level)),items:{potion:2}};const g=GYMS.find(g=>g.id===id);return g?{...g,items:{'ultra-ball':2}}:null;}
export function isCenter(place){return /pok[eé]mon\s*cent(?:er|re)|ศูนย์(?:โปเกมอน|โปเกม่อน|โปเกม่อน)|โปเกมอนเซ็นเตอร์|ポケモンセンター/iu.test(place||'');}
export function gymAvailable(g,region,place){return region==='Kanto'&&/gym|ยิม/iu.test(place||'')&&(new RegExp(g.city,'iu').test(place)||new RegExp(g.name.replace('.','\\.'),'iu').test(place));}
const biomeTypes={grass:['grass','bug','normal','flying','fairy'],longgrass:['grass','bug','poison'],sand:['ground','rock','fire'],water:['water','flying'],pond:['water','bug'],underwater:['water'],mountain:['rock','ground','flying','ice','dragon','fighting'],cave:['rock','ground','ghost','dark','psychic'],building:['normal','electric','steel']};
export function regionalPool(dex,region,terrain='grass',level=5){
 const names={Kanto:['kanto'],Johto:['updated-johto','original-johto'],Hoenn:['updated-hoenn','hoenn'],Sinnoh:['extended-sinnoh','original-sinnoh','hisui'],Unova:['updated-unova','original-unova'],Kalos:['kalos-central','kalos-coastal','kalos-mountain'],Alola:['updated-alola','original-alola'],Galar:['galar','isle-of-armor','crown-tundra'],Paldea:['paldea','kitakami','blueberry']};
 const ids=new Set((names[region]||[]).flatMap(n=>dex.regionalDexes?.[n]||[])),types=biomeTypes[terrain]||biomeTypes.grass;
 let pool=[...dex.bySpecies.values()].filter(p=>!p.legendary&&!p.mythical&&!p.battleOnly&&![793,794,795,796,797,798,799,803,804,805,806].includes(p.speciesId)&&(ids.size?ids.has(p.speciesId):p.generation===['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'].indexOf(region)+1));
 const local=pool.filter(p=>p.types.some(t=>types.includes(t)));if(local.length)pool=local;
 const age=pool.filter(p=>!p.prevo||p.stats.reduce((a,b)=>a+b,0)<=300+level*6);return(age.length?age:pool).map(p=>p.key);
}
