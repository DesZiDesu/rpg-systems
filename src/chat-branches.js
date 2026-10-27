// A portable state baseline plus structural deltas. Reference libraries and
// world-pack payloads never enter this journal; callers supply packed chat state.
import {sha256} from './vendor/js-sha256/index.js?v=0.89.3';

export const BRANCH_HISTORY_KEY='tretaresia_rpg_branch_history';
export const BRANCH_STATUS_KEY='tretaresia_rpg_branch_restore';
export const BRANCH_ORIGIN_POINT=Object.freeze({index:-1,hash:'roleforge-branch-v1'});
export const BRANCH_FIELDS=Object.freeze([
 'tretaresia_rpg_state','roleforge_smartphone','roleforge_chat_presets','roleforge_story_contracts',
 'tretaresia_rpg_character_creation','roleforge_creation_after_delete','tretaresia_rpg_visible_hstats_npcs','tretaresia_rpg_selected_hstats_npc',
]);
const forbidden=new Set(['__proto__','constructor','prototype']);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>structuredClone(v);
const prefixes=new WeakMap(),tips=new WeakMap();

function safe(value,depth=0){
 if(depth>80)throw Error('Branch data is too deeply nested.');
 if(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return;
 if(!value||typeof value!=='object')throw Error('Invalid branch value.');
 for(const [k,v]of Object.entries(value)){if(forbidden.has(k))throw Error('Unsafe branch path.');safe(v,depth+1);}
}
export function sameBranchValue(a,b){
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&sameBranchValue(a[k],b[k]));
}
export function branchDelta(before,after,path=[],ops=[]){
 if(before===after)return ops;
 if(Array.isArray(before)&&Array.isArray(after)){
  // Bounded event logs slide instead of rewriting every retained event.
  const shift=before[0]?.id&&after[0]?.id?before.findIndex(v=>v?.id===after[0].id):-1;
  if(shift>0&&before.slice(shift).every((v,i)=>v?.id===after[i]?.id)){
   ops.push(['splice',path,0,shift,[]]);return branchDelta(before.slice(shift),after,path,ops);
  }
  if(before.length===after.length){before.forEach((v,i)=>branchDelta(v,after[i],[...path,i],ops));return ops;}
  let start=0,end=0;
  while(start<before.length&&start<after.length&&sameBranchValue(before[start],after[start]))start++;
  while(end<before.length-start&&end<after.length-start&&sameBranchValue(before[before.length-1-end],after[after.length-1-end]))end++;
  ops.push(['splice',path,start,before.length-start-end,clone(after.slice(start,after.length-end))]);return ops;
 }
 if(object(before)&&object(after)){
  for(const k of Object.keys(before)){if(forbidden.has(k))throw Error('Unsafe branch path.');if(!Object.hasOwn(after,k))ops.push(['delete',[...path,k]]);}
  for(const [k,v]of Object.entries(after)){if(forbidden.has(k))throw Error('Unsafe branch path.');if(Object.hasOwn(before,k))branchDelta(before[k],v,[...path,k],ops);else ops.push(['set',[...path,k],clone(v)]);}
  return ops;
 }
 ops.push(['set',path,clone(after)]);return ops;
}
function patch(root,ops){
 if(!Array.isArray(ops)||ops.length>200000)throw Error('Invalid branch delta.');
 for(const op of ops){
  if(!Array.isArray(op)||!['set','delete','splice'].includes(op[0])||!Array.isArray(op[1])||op[1].length>80)throw Error('Invalid branch operation.');
  const [kind,path]=op;
  for(const key of path)if(typeof key!=='string'&&!Number.isSafeInteger(key)||forbidden.has(key)||typeof key==='number'&&key<0)throw Error('Unsafe branch path.');
  let parent=root;
  for(const key of path.slice(0,-1)){if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw Error('Missing branch path.');parent=parent[key];}
  const key=path.at(-1);
  if(kind==='splice'){
   const array=path.length?parent?.[key]:root,[,,start,count,insert]=op;
   if(!Array.isArray(array)||!Number.isSafeInteger(start)||!Number.isSafeInteger(count)||start<0||count<0||start>array.length||count>array.length-start||!Array.isArray(insert))throw Error('Invalid branch splice.');
   safe(insert);array.splice(start,count);
   // Large imported arrays must not overflow the JavaScript argument stack.
   const copied=clone(insert);for(let offset=0;offset<copied.length;offset+=8192)array.splice(start+offset,0,...copied.slice(offset,offset+8192));
  }else if(kind==='set'){
   safe(op[2]);if(!path.length){root=clone(op[2]);continue;}
   if(!parent||typeof parent!=='object'||Array.isArray(parent)&&(!Number.isSafeInteger(key)||key>=parent.length))throw Error('Invalid branch assignment.');
   parent[key]=clone(op[2]);
  }else{
   if(!path.length||!object(parent)||!Object.hasOwn(parent,key))throw Error('Invalid branch deletion.');delete parent[key];
  }
 }
 return root;
}
export function applyBranchDelta(base,ops){safe(base);return patch(clone(base),ops);}
export function branchBundle(metadata){return Object.fromEntries(BRANCH_FIELDS.filter(k=>metadata?.[k]!==undefined).map(k=>[k,JSON.parse(JSON.stringify(metadata[k]))]));}
export function applyBranchBundle(metadata,bundle){
 safe(bundle);if(!object(bundle)||!object(bundle.tretaresia_rpg_state))throw Error('Branch state is missing.');
 for(const k of BRANCH_FIELDS){if(Object.hasOwn(bundle,k))metadata[k]=clone(bundle[k]);else delete metadata[k];}
}
export function branchIdentity(context,owner){return{owner,chatId:String(context.getCurrentChatId?.()||''),integrity:String(context.chatMetadata?.integrity||'')};}
export function sameBranchOrigin(a,b){return a?.owner===b?.owner&&(a?.integrity&&b?.integrity?a.integrity===b.integrity:a?.chatId===b?.chatId);}
export function branchPoints(chat,content=m=>m?.mes||''){
 if(!Array.isArray(chat))return[];
 const old=prefixes.get(chat)||[],next=[];let hash='roleforge-branch-v1';
 for(let i=0;i<chat.length;i++){
  const m=chat[i]||{},value=JSON.stringify([Boolean(m.is_user),Boolean(m.is_system),content(m)]),prior=old[i];
  const key=prior?.value===value&&prior?.before===hash?prior.hash:sha256(hash+'|'+value);
  next.push({value,before:hash,hash:key});hash=key;
 }
 prefixes.set(chat,next);return next.map((p,index)=>({index,hash:p.hash}));
}
export function branchHistoryValid(history){return object(history)&&history.format==='roleforge-chat-branches'&&history.version===1&&object(history.origin)&&object(history.base)&&Array.isArray(history.entries)&&history.entries.length<=200000;}
function tip(history){
 const cached=tips.get(history);if(cached)return cached;
 if(!branchHistoryValid(history))throw Error('Invalid branch history.');safe(history.base);
 let state=clone(history.base),before=state;
 for(let i=0;i<history.entries.length;i++){if(i===history.entries.length-1)before=clone(state);state=patch(state,history.entries[i].ops);}
 const value={state,before};tips.set(history,value);return value;
}
export function captureBranchPoint(history,bundle,point,origin){
 safe(bundle);
 if(!point||!Number.isInteger(point.index)||point.index< -1||typeof point.hash!=='string')return history;
 if(!branchHistoryValid(history)||!sameBranchOrigin(history.origin,origin)){
  const next={format:'roleforge-chat-branches',version:1,origin:{...origin},base:clone(bundle),entries:[{...point,ops:[]}]};tips.set(next,{state:clone(bundle),before:clone(bundle)});return next;
 }
 const prior=tip(history),last=history.entries.at(-1),same=last?.index===point.index&&last?.hash===point.hash;
 const before=same?prior.before:prior.state,ops=branchDelta(before,bundle);
 if(same&&sameBranchValue(prior.state,bundle))return history;
 const next={...history,origin:{...origin},entries:[...history.entries.slice(0,same?-1:undefined),{...point,ops}]};
 tips.set(next,{state:clone(bundle),before:clone(before)});return next;
}
export function branchSnapshot(history,points,{through=points.length-1}={}){
 if(!branchHistoryValid(history))return null;
 let selected=-1,best=-2;
 for(let i=0;i<history.entries.length;i++){
  const p=history.entries[i];
  if(Number.isInteger(p?.index)&&p.index>=-1&&p.index<=through&&(p.index===-1?BRANCH_ORIGIN_POINT:points[p.index])?.hash===p.hash&&p.index>=best){selected=i;best=p.index;}
 }
 if(selected<0)return null;
 safe(history.base);let state=clone(history.base);
 for(const entry of history.entries.slice(0,selected+1))state=patch(state,entry.ops);
 safe(state);if(!object(state)||!object(state.tretaresia_rpg_state))throw Error('Branch state is missing.');return{bundle:state,point:{index:best,hash:(best===-1?BRANCH_ORIGIN_POINT:points[best]).hash},position:selected};
}
export function forkBranchHistory(history,points,origin,selected){
 // Rebase retained history so even the journal contains no discarded future,
 // abandoned swipe, future contracts or future profile data.
 if(!selected)return null;
 let state=clone(history.base),result=null;
 for(const entry of history.entries.slice(0,selected.position+1)){
  state=patch(state,entry.ops);
  if(entry.index<=selected.point.index&&(entry.index===-1?BRANCH_ORIGIN_POINT:points[entry.index])?.hash===entry.hash)result=captureBranchPoint(result,state,{index:entry.index,hash:entry.hash},origin);
 }
 return result;
}
