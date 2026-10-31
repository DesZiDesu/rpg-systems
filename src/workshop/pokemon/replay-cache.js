import {initialGame,replayStep} from './core.js?v=0.94.2';
// Cache references to immutable message strings, never copies of all chat text.
// At most 16 checkpoints are retained. Editing, swiping or deleting invalidates
// only the suffix; appending a turn resumes from the latest committed checkpoint.
export function createPokemonReplay(dex){
 let rows=[],rulesKey='',checkpoints=[],state,stats={processed:0,reused:false};
 const signature=m=>[m.is_user,m.is_system,m.swipe_id||0,m.mes,JSON.stringify(m.extra?.roleforge_pokemon_v1||[]),m.extra?.roleforge_pokemon_live||0];
 const same=(a,b)=>a?.length===b?.length&&a.every((v,i)=>v===b[i]);
 return{
 read(chat,rules={}){const key=JSON.stringify(rules);let first=0;if(key===rulesKey){while(first<chat.length&&first<rows.length&&same(rows[first],signature(chat[first])))first++;if(first===chat.length&&first===rows.length&&state){stats={processed:0,reused:true};return state;}}else{rows=[];checkpoints=[];rulesKey=key;}
  const checkpoint=[...checkpoints].reverse().find(c=>c.index<=first),start=checkpoint?.index||0;let value=checkpoint?structuredClone(checkpoint.state):initialGame(dex,rules),seen=new Set(checkpoint?.seen||[]),receipts=new Set(checkpoint?.receipts||[]);checkpoints=checkpoints.filter(c=>c.index<=start);rows.length=start;
  for(let i=start;i<chat.length;i++){value=replayStep(value,chat[i],i,dex,rules,seen,receipts);rows.push(signature(chat[i]));if((i+1)%32===0)checkpoints.push({index:i+1,state:structuredClone(value),seen:[...seen],receipts:[...receipts]});}
  checkpoints.push({index:chat.length,state:structuredClone(value),seen:[...seen],receipts:[...receipts]});checkpoints=checkpoints.slice(-16);state=value;stats={processed:chat.length-start,reused:Boolean(checkpoint)};return state;
 },reset(){rows=[];rulesKey='';checkpoints=[];state=null;},stats:()=>({...stats,checkpoints:checkpoints.length})};
}
