// The index contains only files present at this immutable sprite revision.
// Pair GIF directions from one family; never substitute another form or color.
const variants=['','female/','shiny/','shiny/female/'];
const families=['versions/generation-v/black-white/animated/','other/showdown/'];
export function battleSpriteCandidates(pokemon,individual,index,{side='front',motion=true}={}){
 const row=index?.entries?.[pokemon?.key];
 if(!row||!['front','back'].includes(side))return [];
 const shiny=Boolean(individual?.shiny),female=individual?.traits?.gender==='female';
 const choices=shiny?(female?[3,2]:[2]):(female?[1,0]:[0]);
 const base='https://raw.githubusercontent.com/PokeAPI/sprites/'+index.commit+'/sprites/pokemon/';
 const result=[];
 for(const variant of choices){
  const bit=1<<variant,prefix=(side==='back'?'back/':'')+variants[variant];
  if(motion)for(let family=0;family<2;family++){
   const stem=row[family*2],mask=row[family*2+1];
   if(stem&&(mask&bit))result.push({url:base+families[family]+prefix+stem+'.gif',format:family?'model':'pixel',animated:true,side,variant});
  }
  const modern=index.extraModels?.[pokemon.key];
  if(motion&&modern&&(modern.mask&bit))result.push({url:base+'versions/generation-ix/'+modern.folder+'/'+prefix+modern.stem+'.webp',format:'model',animated:true,side,variant});
  const mask=row[side==='back'?6:5];
  if(row[4]&&(mask&bit))result.push({url:base+prefix+row[4]+'.png',format:'static',animated:false,side,variant});
  if(modern&&(modern.static&bit))result.push({url:new URL('assets/battle/sprites/'+prefix+modern.stem+'.png',import.meta.url).href,format:'static',animated:false,side,variant});
 }
 return result;
}
