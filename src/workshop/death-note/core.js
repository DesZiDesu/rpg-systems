import {fragmentItem} from './fragments.js?v=0.87.1';
import {localId} from '../core.js?v=0.87.1';
import {sha256} from '../../vendor/js-sha256/index.js?v=0.87.1';
import {matchesTrueName,trueNameSpellings} from './names.js?v=0.87.1';
import {containsIdentity} from './identity.js?v=0.87.1';
import {implicitResults,namesInResult,completedDeath} from './outcomes.js?v=0.87.1';
import {INSCRIPTION_TEXT_LIMIT} from './limits.js?v=0.87.1';
// Installing alone grants no item; an active greeting can establish possession.
// Keep legacy journal keys for saved chats.
export const INSCRIPTIONS = 'roleforge_death_note_inscriptions_preview';
export const RESULTS = 'roleforge_death_note_results_preview';
export const PROMPT = 'roleforge_death_note_write_preview';
export const PENDING_PROMPT = 'roleforge_death_note_pending_preview';
// A normal Send is already in chat when interception runs. Its dependent ink
// must not follow the preceding assistant into a branch cut before that Send.
export function replyAnchor(chat){const index=(chat||[]).length-1,message=chat?.[index];return message?.is_user?{index,hash:sha256(String(message.mes||''))}:null;}
export function anchorActive(anchor,chat){if(!anchor)return true;const message=chat?.[anchor.index];return Number.isSafeInteger(anchor.index)&&anchor.index>=0&&message?.is_user===true&&anchor.hash===sha256(String(message.mes||''));}
const key = text => String(text || '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
const safeId = id => typeof id === 'string' && id.length < 180 && !['__proto__', 'constructor', 'prototype'].includes(id);
export const visibleText = text => String(text || '').replace(/<think\b[^>]*>[\s\S]*?<\/think>/giu, '').replace(/<!--[\s\S]*?-->/gu, '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
export function ownedNotebook(state) {
  return (state?.inventory || []).find(item => item.quantity > 0 &&
    (fragmentItem(item) || (item.properties || []).includes('roleforge:addon:death-note') || ['death note', 'เดธโน้ต', 'สมุดเดธโน้ต', 'สมุดเดธโน๊ต'].includes(key(item.name))));
}
export function eligibleTarget(state, {name, targetId, faceKnown = false} = {}) {
  if (!ownedNotebook(state)) return {ok:false,code:'ownership',message:'ยังไม่ได้ถือ Death Note อยู่ในกระเป๋า'};
  if (!String(name||'').trim() || String(name).length>120 || /^\?+$/u.test(String(name).trim())) return {ok:false,code:'name',message:'เขียนชื่อที่คุณต้องการลงในสมุด'};
  const targets=(state.npcs||[]).filter(npc=>targetId?npc.id===targetId:[npc.name,...trueNameSpellings(state,npc)].some(n=>key(n)===key(name)));
  if(targets.length!==1)return {ok:false,code:'name',message:'เลือกใบหน้าที่กำลังนึกถึง'};
  const target=targets[0];
  if(!safeId(target.id)||!faceKnown)return {ok:false,code:'face',message:'ต้องเคยเห็นและจดจำใบหน้าของคนนี้'};
  if(!/^(?:human|มนุษย์)$/iu.test(String(target.race||'').trim()))return {ok:false,code:'species',message:'กติกาสมุดใช้กับมนุษย์เท่านั้น'};
  if(target.stats?.hp===0||/^(?:deceased|dead|เสียชีวิต)$/iu.test(target.activity||''))return {ok:false,code:'deceased',message:'คนนี้เสียชีวิตแล้วในเนื้อเรื่อง'};
  return {ok:true,target,validName:matchesTrueName(state,target,name)};
}
export function storySeconds(state) {
  const [hours = 0, minutes = 0, seconds = 0] = String(state.worldClock?.time || '00:00').split(':').map(Number);
  return Math.max(0, Number(state.worldClock?.day || 1) - 1) * 86400 + hours * 3600 + minutes * 60 + seconds;
}
export function formatStoryTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0), day = Math.floor(value / 86400) + 1;
  return {day, time: [Math.floor(value / 3600) % 24, Math.floor(value / 60) % 60, value % 60].map(value => String(value).padStart(2, '0')).join(':')};
}
function activeRows(message, field) {
  const length = visibleText(message.mes).length, swipe = Number(message.swipe_id) || 0;
  return (Array.isArray(message.extra?.[field]) ? message.extra[field] : []).filter(row => row && row.swipe === swipe && row.offset <= length);
}
export function ledger(chat) {
  const rows = new Map();
  for (const [messageIndex, message] of (chat || []).entries()) {
    if (message.is_user || message.is_system) continue;
    for (const entry of activeRows(message, INSCRIPTIONS)) if (safeId(entry.id)&&anchorActive(entry.sourceTurn,chat)) rows.set(entry.id, {...entry, status: 'waiting', messageIndex});
    for (const result of activeRows(message, RESULTS)) {
      const entry = rows.get(result.requestId);
      if (entry) Object.assign(entry, result, {id: entry.id, resultMessageIndex: messageIndex});
    }
  }
  return [...rows.values()].slice(-500);
}
export function makeInscription(state, input, records = [], id = 'dn-' + localId()) {
  const checked = eligibleTarget(state, input);
  if (!checked.ok) throw Error(checked.message);
  if (records.some(record => record.targetId === checked.target.id && record.validName!==false && ['waiting', 'resolved'].includes(record.status))) throw Error('ชื่อนี้ถูกจดแล้ว ดูผลได้ที่หน้าบันทึก');
  const delaySeconds = input.timing === 'scheduled' ? Number(input.delaySeconds) : 40;
  if (!Number.isSafeInteger(delaySeconds) || delaySeconds < 40 || delaySeconds > 23 * 86400) throw Error('กำหนดเวลาตั้งแต่ 40 วินาที ถึง 23 วันในเรื่อง');
  const cause = String(input.cause || 'หัวใจวาย').trim(), details=String(input.details || '').trim();
  if (!cause) throw Error('ระบุสาเหตุก่อนจดชื่อ');
  if(cause.length>INSCRIPTION_TEXT_LIMIT||details.length>INSCRIPTION_TEXT_LIMIT)throw Error('ข้อความสาเหตุหรือรายละเอียดเกินขีดจำกัดของสมุด');
  return {id,...(safeId(input.bookId)&&input.bookId?{bookId:input.bookId}:{}), targetId: checked.target.id, name:String(input.name).trim(), validName:checked.validName, acceptedNames:checked.validName?trueNameSpellings(state,checked.target):[], cause, details, delaySeconds, writtenStorySeconds: storySeconds(state), dueStorySeconds: storySeconds(state) + delaySeconds, faceKnown: true, createdAt: new Date().toISOString()};
}
export function continuationInstruction(request, {pending = false} = {}) {
  return `ROLEFORGE_DEATH_NOTE — NOTEBOOK ACTION\n${pending ? 'An already recorded inscription is pending. Continue normal roleplay; never create a new inscription or reset its clock.' : request.trigger==='next-reply'?'The player wrote this name on the notebook paper and chose to wait for the next story reply. The written ink is action consent; do not invent a User turn.':'The player explicitly pressed the notebook inscription button. This is action consent; do not invent a User turn.'}\nINSCRIPTION: ${JSON.stringify(request)}\nWhen the host uses Continue, append to the existing assistant message from its ending. On a normal reply, answer the actual latest User turn while applying this inscription. Write only new story, never repeat the old scene, add player dialogue, a User message, or send an inventory purchase. The player physically holds a notebook and has chosen a remembered human face. The written name is NOT automatically valid. Engine name check: ${request.validName===false?'WRONG NAME. The inscription is INEFFECTIVE. Do not kill or injure this person, do not emit any HP/death patch; narrate that nothing happens without revealing the real name.':'MATCHES canonical true name.'} Apply the established fictional Death Note/world rules; no effect before delaySeconds of STORY time. No real-time waiting or hidden model call. For the default 40 seconds you may narrate those seconds in this continuation; for a scheduled later time continue the current scene and keep the inscription waiting until that time. Do not force a time skip to the scheduled time. A person already known to be dead cannot die twice. Unsupported or impossible details must not magically occur; explain an ineffective outcome when canon requires it.\nWhen this continuation establishes a result, append <!--roleforge_death_note:{"requestId":"${request.id}","status":"waiting|resolved|ineffective","elapsedSeconds":0,"evidence":"exact quote of the NEW visible story naming ${request.name}"}-->. Use the actual elapsed STORY seconds since writing. A resolved result requires elapsedSeconds >= ${request.delaySeconds} and an explicit completed death in that quote. For waiting, do not change the NPC's HP or activity. Only after a confirmed death, include the existing tretaresia_patch NPC update using stable id ${request.targetId}, stats.hp:0 and activity:"Deceased", preserving all other profile/history fields. Keep the normal sceneTracker day/time consistent with the elapsed story time; it has minute precision. Use normal tr-narrative/tr-dialogue blocks and preserve the notebook item. Never reveal an unknown person's real name from a hidden library.`;
}
export function parseResults(source, records, {messageIndex=null}={}) {
  const results = [], text = visibleText(source);
  for (const match of String(source || '').matchAll(/<!--\s*roleforge_death_note\s*:\s*(\{[\s\S]*?\})\s*-->/giu)) {
    try {
      const value = JSON.parse(match[1]), entry = records.find(record => record.id === value.requestId);
      if (!entry || !['waiting', 'resolved', 'ineffective'].includes(value.status) || !Number.isSafeInteger(value.elapsedSeconds) || value.elapsedSeconds < 0 || value.elapsedSeconds > 23 * 86400) continue;
      const evidence = String(value.evidence || '').trim().slice(0, 1200);
      if (!evidence || !text.includes(visibleText(evidence)) || !namesInResult(entry).some(n=>containsIdentity(evidence,n))) continue;
      if (value.status === 'resolved' && (entry.validName===false || value.elapsedSeconds < entry.delaySeconds || !completedDeath(evidence))) continue;
      results.push({requestId: value.requestId, status: value.status, elapsedSeconds: value.elapsedSeconds, evidence});
    } catch { /* An unreadable protocol is never a success. */ }
  }
  return /<!--\s*roleforge_death_note\s*:/iu.test(String(source||''))?results:[...results,...(messageIndex===null?implicitResults(source,records):records.flatMap(entry=>implicitResults(entry.messageIndex===messageIndex?visibleText(source).slice(entry.offset):source,records).filter(r=>r.requestId===entry.id)))];
}
export async function continueInscription(options) {
  const batch=await continueInscriptions({...options,inputs:[options.input],onQueued:requests=>options.onQueued?.(requests[0])});
  return {...batch.entries[0],confirmed:batch.confirmed,warning:batch.warning};
}
export async function continueInscriptions({context,scope,currentState,inputs,enabled=()=>true,hasAccess=()=>true,commitResult=async()=>{},onQueued=()=>{}}) {
  const captured=scope(),chat=context.chat,message=chat?.at(-1);
  if(!captured||!enabled()||!hasAccess()||!message||message.is_user||message.is_system||!String(message.mes||'').trim())throw Error('รอให้มีคำตอบ AI ก่อน จึงจะต่อเนื้อเรื่องได้');
  if(!Array.isArray(inputs)||!inputs.length||inputs.length>16)throw Error('ยืนยันได้ครั้งละไม่เกิน 16 ชื่อ');
  if((message.extra?.[INSCRIPTIONS]?.length||0)+inputs.length>128)throw Error('หน้านี้เต็มแล้ว เริ่มเทิร์นเรื่องใหม่ก่อนจดเพิ่ม');
  const requests=[],existing=ledger(chat);for(const input of inputs)requests.push(makeInscription(currentState(),input,[...existing,...requests.map(r=>({...r,status:'waiting'}))]));
  const before=message.mes,offset=visibleText(before).length,swipe=Number(message.swipe_id)||0,ids=new Set(requests.map(r=>r.id));
  message.extra||={};message.extra[INSCRIPTIONS]=[...(message.extra[INSCRIPTIONS]||[]),...requests.map(r=>({...r,swipe,offset}))];
  const changed=()=>{if(scope()!==captured)context.setExtensionPrompt(PROMPT,'',1,0,false,0);};
  context.eventSource?.on?.(context.eventTypes?.CHAT_CHANGED,changed);
  try{
    await context.saveChat();
    if(scope()!==captured||!enabled())throw Error('แชทหรือการเปิดใช้ Addon เปลี่ยนแล้ว');
    if(!ownedNotebook(currentState())||!hasAccess())throw Error('สมุดไม่ได้อยู่ในกระเป๋าแล้ว');
    await onQueued(requests);
    context.setExtensionPrompt(PROMPT,requests.map(r=>continuationInstruction(r)).join('\n\n'),1,0,false,0);
    await context.generate('continue',{automatic_trigger:true,depth:1});
    if(scope()!==captured||context.chat!==chat||chat.at(-1)!==message)throw Error('เปลี่ยนแชทระหว่างรอ ผลจะไม่ถูกนำไปใส่แชทใหม่');
    if(message.mes===before)throw Error('AI ยังไม่ได้ต่อข้อความ ลองจดใหม่ได้');
    const result=parseResults(message.mes.slice(before.length),requests);
    for(const request of requests)if(request.validName===false&&!result.some(r=>r.requestId===request.id&&r.status==='ineffective'))result.push({requestId:request.id,status:'ineffective',elapsedSeconds:0,evidence:'ชื่อที่เขียนไม่ทำให้เกิดผลตามกติกาของสมุด',engineVerdict:true});
    await commitResult(requests,result,captured);
    if(scope()!==captured||!enabled())throw Error('เปลี่ยนแชทระหว่างบันทึกผล');
    const stored=message.extra[RESULTS]||=[];for(const value of result)stored.push({...value,swipe:Number(message.swipe_id)||0,offset:visibleText(message.mes).length});
    await context.saveChat();
    return {entries:requests.map(r=>({...r,status:result.find(v=>v.requestId===r.id)?.status||'waiting'})),confirmed:result.length>0,warning:result.some(r=>r.engineVerdict)?'คำตอบ AI ขัดกติกาสมุด จึงไม่บันทึกการตาย':''};
  }catch(error){
    if(message.mes===before&&scope()===captured){message.extra[INSCRIPTIONS]=message.extra[INSCRIPTIONS].filter(value=>!ids.has(value.id));await context.saveChat().catch(()=>{});}
    throw error;
  }finally{
    context.eventSource?.removeListener?.(context.eventTypes?.CHAT_CHANGED,changed);
    context.setExtensionPrompt(PROMPT,'',1,0,false,0);
  }
}

// The host uses this before applying ordinary reply patches. A malformed or
// premature model protocol cannot bypass the notebook's exact-name rules.
export function protectNotebookOps(ops,{chat=[],source='',base={}}={}) {
 const entries=ledger(chat),confirmed=parseResults(source,entries),attempted=new Set();
 for(const m of String(source).matchAll(/<!--\s*roleforge_death_note\s*:\s*(\{[\s\S]*?\})\s*-->/giu))try{attempted.add(JSON.parse(m[1]).requestId);}catch{}
 const latest=new Map(entries.map(e=>[e.targetId,e]));
 const protectedIds=new Set([...latest.values()].filter(e=>e.validName===false&&(e.status!=='ineffective'||attempted.has(e.id))||e.status==='waiting'&&!confirmed.some(r=>r.requestId===e.id&&r.status==='resolved')).map(e=>e.targetId));
 if(!protectedIds.size)return ops;
 const resolve=value=>{const id=typeof value==='string'?value:value?.id||value?.npcId;if(id)return id;const name=value?.name||value?.npcName;const matches=(base.npcs||[]).filter(n=>[n.name,...n.aliases||[]].some(v=>key(v)===key(name)));return matches.length===1?matches[0].id:'';};
 return ops.flatMap(op=>{
  if(!Array.isArray(op))return [op];const [verb,path,value,...rest]=op,id=resolve(value);
  if(['npcs','npcValues'].includes(path)&&protectedIds.has(id)){
   if(['remove','delete','del'].includes(verb))return [];
   if(path==='npcValues'&&value?.field==='stats.hp'){
    const hp=(base.npcs||[]).find(n=>n.id===id)?.stats?.hp;
    if(verb==='set'&&Number(value.value)<=0||verb==='inc'&&Number(value.amount)<0&&(hp===undefined||hp+Number(value.amount)<=0))return [];
   }
   if(value&&typeof value==='object'){
    const clean=structuredClone(value);if(clean.stats&&Object.hasOwn(clean.stats,'hp')&&Number(clean.stats.hp)<=0)delete clean.stats.hp;if(/\b(?:dead|deceased)\b|เสียชีวิต/iu.test(clean.activity||''))delete clean.activity;
    return [[verb,path,clean,...rest]];
   }
  }
  return [op];
 });
}
