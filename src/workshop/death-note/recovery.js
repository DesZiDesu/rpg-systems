import {ledger,replyAnchor,anchorActive,parseResults,storySeconds,visibleText} from './core.js?v=0.94.1';
import {PAPER,readPaper} from './paper.js?v=0.94.1';
import {stageWrittenPaper} from './deferred.js?v=0.94.1';
import {worldState,canWrite} from './world.js?v=0.94.1';
import {sha256} from '../../vendor/js-sha256/index.js?v=0.94.1';

// Older builds saved ink before Send without creating a request. Repair only
// ink anchored to that real User turn and a verified outcome in its reply.
// A future page, a normal story death, or an abandoned draft grants no kill.
export function recoverPaperResults(chat,state){
 const existing=ledger(chat),repairs=[];
 for(let index=1;index<chat.length-1;index++){
  const turn=chat[index],before=chat[index-1],after=chat[index+1];
  if(!turn.is_user||before.is_user||before.is_system||after.is_user||after.is_system)continue;
  const prefix=chat.slice(0,index+1),anchor=replyAnchor(prefix),rows=(before.extra?.[PAPER]||[]).filter(r=>r.sourceTurn?.index===index&&anchorActive(r.sourceTurn,prefix)&&r.swipe===(Number(before.swipe_id)||0)&&r.offset<=visibleText(before.mes).length);
  if(!rows.length)continue;
  // Current met/hp values must not leak a later encounter/death into the past.
  const historical={...state,npcs:(state.npcs||[]).map(n=>({...n,met:false,stats:{...n.stats,hp:Math.max(1,n.stats?.hp||1)},activity:''}))},world=worldState(prefix,historical);
  for(const bookId of new Set(rows.map(r=>r.bookId))){
   const book=world.books[bookId];if(!book||book.holderId!=='player')continue;
   const held={...historical,inventory:[{id:book.itemId,name:'Death Note',quantity:1,properties:['roleforge:addon:death-note']}]};
   if(!canWrite(world,held,bookId))continue;
   const stage=stageWrittenPaper(readPaper(prefix,bookId),held,world,existing,bookId);
   const requests=stage.requests.filter(r=>r.validName&&world.faces[r.targetId]).map(r=>({...r,id:'dn-recovered-'+sha256(JSON.stringify([anchor,bookId,r.paperSource])).slice(0,32),sourceTurn:anchor,recovered:true}));
   if(!requests.length)continue;
   const results=parseResults(after.mes,requests).filter(r=>r.status==='resolved');
   const confirmed=requests.filter(r=>results.some(v=>v.requestId===r.id)).map(r=>{
    const elapsed=results.find(v=>v.requestId===r.id).elapsedSeconds,written=Math.max(0,storySeconds(state)-elapsed);
    return {...r,writtenStorySeconds:written,dueStorySeconds:written+r.delaySeconds,writtenTimeEstimated:true};
   });
   if(confirmed.length){repairs.push({requestIndex:index-1,resultIndex:index+1,bookId,requests:confirmed,results});existing.push(...confirmed.map(r=>({...r,status:'resolved'})));}
  }
 }
 return repairs;
}
