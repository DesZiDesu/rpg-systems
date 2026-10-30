// One chosen sprite style for every Pokémon surface: menus, battle and chat.
// The index lists only files present at the pinned PokeAPI/sprites revision.
// A form or colour is never substituted: a shiny shows a shiny image, a form
// shows that form. When the chosen game lacks a view, the nearest game of the
// same family that has it is used; the caller's defaults come last.
export const DEFAULT_STYLE='';
const VIEW={standard:0,shiny:1,female:2,shinyFemale:3},BACK=4;

export function spriteStyleIndex(raw){
 if(!raw?.styles?.length)return null;
 const forms=new Map(raw.forms.map((key,i)=>[key,i])),styles=new Map(raw.styles.map(s=>[s.id,s]));
 // Nearest game of the same family, keeping animated with animated.
 const family=s=>raw.styles.filter(o=>o!==s&&o.family===s.family&&o.fallback!==false).sort((a,b)=>(a.animated!==s.animated)-(b.animated!==s.animated)||Math.abs(a.gen-s.gen)-Math.abs(b.gen-s.gen)||b.gen-a.gen);
 // Animated pixel games lack many newer Pokémon. Showdown's small animations
 // keep them moving before any still is used.
 const chain=s=>{const rest=family(s),motion=styles.get('showdown');if(s.family!=='pixel'||!s.animated||!motion)return[s,...rest];const at=rest.findIndex(o=>!o.animated);return[s,...rest.slice(0,at<0?rest.length:at),motion,...rest.slice(at<0?rest.length:at)];};
 return{commit:raw.commit,views:raw.views,stems:raw.stems,forms,styles,list:raw.styles,chains:new Map(raw.styles.map(s=>[s.id,chain(s)]))};
}

export function spriteStyleOptions(index){return index?.list.map(({id,label,labelTh,family,animated,heavy})=>({id,label,labelTh,family,animated,heavy}))||[];}

function mask(style,at){return parseInt(style.masks.slice(at*2,at*2+2),16)||0;}

// Shiny females fall back to the shiny image (the colour matters); females fall
// back to the standard image only where the game has no gender difference.
function views(individual){const shiny=Boolean(individual?.shiny),female=individual?.traits?.gender==='female';return shiny?(female?[VIEW.shinyFemale,VIEW.shiny]:[VIEW.shiny]):(female?[VIEW.female,VIEW.standard]:[VIEW.standard]);}

export function styleCandidates(pokemon,individual,index,{style=DEFAULT_STYLE,side='front',motion=true,list=false}={}){
 const chosen=index?.styles.get(style),at=index?.forms.get(pokemon?.key);
 if(!chosen||at===undefined||!['front','back'].includes(side))return [];
 // Large animated models stay in the battle, chat and feature views; lists
 // use the matching HD still so a Pokédex page never loads dozens of them.
 const still=index.styles.get('home'),start=(list&&chosen.heavy||!motion&&chosen.family==='model'&&chosen.animated)&&still?still:chosen;
 const base='https://raw.githubusercontent.com/PokeAPI/sprites/'+index.commit+'/sprites/pokemon/',result=[],seen=new Set();
 // Artwork has no back views; the player's side uses the newest HD models.
 const backs=side==='back'&&chosen.family==='art'?index.chains.get('gen9-scarlet-violet')||[]:[];
 for(const s of [...index.chains.get(start.id),...start===chosen?[]:index.chains.get(chosen.id),...backs]){
  if(!motion&&s.animated||seen.has(s.id))continue;seen.add(s.id);
  const m=mask(s,at);
  for(const view of views(individual)){
   const bit=view+(side==='back'?BACK:0);if(!(m&(1<<bit)))continue;
   const stem=s.stems?.[pokemon.key]||index.stems[at];
   result.push({url:base+(s.folder?s.folder+'/':'')+index.views[bit]+stem+'.'+s.ext,format:'style',style:s.id,family:s.family,animated:s.animated,side,variant:view});
   break;
  }
  if(result.length>=3)break;
 }
 return result;
}
