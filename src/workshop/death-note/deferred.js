import {makeInscription} from './core.js?v=0.88.0';
import {cleanPaper,paperInputs,markPaperSubmitted} from './paper.js?v=0.88.0';

// Staging is independent of generation: the host can send one normal reply,
// retry it after a network error, or Continue without creating a User turn.
export function stageWrittenPaper(paper,state,world,records=[],bookId=''){
 let next=cleanPaper(paper);const active=next.active,requests=[],errors=[];
 for(let index=0;index<next.pages.length;index++){
  let proposals;
  try{proposals=paperInputs({...next,active:index},state,world,{optional:true});}
  catch(error){errors.push(error.message);continue;}
  const remaining=new Map();for(const proposal of proposals)for(const id of proposal.blockIds)remaining.set(id,(remaining.get(id)||0)+1);
  const handled=proposal=>{for(const id of proposal.blockIds)remaining.set(id,remaining.get(id)-1);};
  for(const proposal of proposals){
   const paperSource=JSON.stringify([next.pages[index].id,proposal.input.targetId,proposal.input.name,proposal.blockIds.map(id=>{const b=next.pages[index].blocks.find(b=>b.id===id);return [id,b?.text||''];})]);
   // A past completed/pending inscription stays immutable even if its ink was
   // moved, resized or copied onto another page. Wrong-name attempts can retry.
   const old=[...records,...requests.map(r=>({...r,status:'waiting'}))].find(r=>r.paperSource===paperSource||r.targetId===proposal.input.targetId&&r.validName!==false&&['waiting','resolved'].includes(r.status));
   if(old){handled(proposal);continue;}
   if(requests.length>=16){errors.push('ยืนยันได้ครั้งละไม่เกิน 16 ชื่อ');break;}
   try{
    const request=makeInscription(state,proposal.input,[...records,...requests.map(r=>({...r,status:'waiting'}))]);
    requests.push({...request,trigger:'next-reply',bookId,paperPageId:next.pages[index].id,paperBlockIds:proposal.blockIds,paperSource});
    handled(proposal);
   }catch(error){errors.push(error.message);}
  }
  next=markPaperSubmitted(next,[...remaining].filter(([,count])=>count===0).map(([id])=>id));
 }
 next.active=active;
 return {paper:next,requests,errors:[...new Set(errors)]};
}
