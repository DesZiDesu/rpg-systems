import {localId} from '../core.js?v=0.85.2';
import {visibleText,anchorActive} from './core.js?v=0.85.2';
import {trueNameSpellings} from './names.js?v=0.85.2';
import {faceKnowledge} from './faces.js?v=0.85.2';
import {PAPER_LIMITS} from './limits.js?v=0.85.2';
export {PAPER_LIMITS} from './limits.js?v=0.85.2';

export const PAPER='roleforge_death_note_paper';
const safe=id=>typeof id==='string'&&id.length>0&&id.length<180&&!['__proto__','prototype','constructor'].includes(id);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const id=()=>localId();
export const blankPage=()=>({id:id(),blocks:[]});
export const blankPaper=()=>({version:1,active:0,pages:[blankPage()]});
export function cleanPaper(raw){
 if(raw?.version!==1||!Array.isArray(raw.pages)||!raw.pages.length)return blankPaper();
 let remaining=PAPER_LIMITS.characters;const pages=raw.pages.slice(0,PAPER_LIMITS.pages).filter(p=>safe(p?.id)).map(p=>({id:p.id,blocks:(Array.isArray(p.blocks)?p.blocks:[]).slice(0,PAPER_LIMITS.blocks).filter(b=>safe(b?.id)).map(b=>{const text=String(b.text||'').slice(0,Math.min(PAPER_LIMITS.text,remaining));remaining-=text.length;return {id:b.id,x:clamp(b.x,0,.86),y:clamp(b.y,0,.91),size:clamp(b.size||24,PAPER_LIMITS.minSize,PAPER_LIMITS.maxSize),text,submittedText:String(b.submittedText||'').slice(0,PAPER_LIMITS.text)};})}));
 return pages.length?{version:1,active:Math.floor(clamp(raw.active,0,pages.length-1)),pages}:blankPaper();
}
export function readPaper(chat,bookId){
 let latest;
 for(const message of chat||[]){if(message.is_user||message.is_system)continue;for(const row of message.extra?.[PAPER]||[]){if(row?.bookId===bookId&&row.swipe===(Number(message.swipe_id)||0)&&row.offset<=visibleText(message.mes).length&&anchorActive(row.sourceTurn,chat))latest=row.paper;}}
 return cleanPaper(latest);
}
export function paperRows(message,bookId,paper,{sourceTurn=null}={}){
 const swipe=Number(message.swipe_id)||0,offset=visibleText(message.mes).length,previous=message.extra?.[PAPER]||[];
 return [...previous.filter(r=>!(r.bookId===bookId&&r.swipe===swipe&&r.offset===offset&&JSON.stringify(r.sourceTurn||null)===JSON.stringify(sourceTurn))),{bookId,swipe,offset,...(sourceTurn?{sourceTurn}:{}),paper:cleanPaper(paper)}].slice(-64);
}
export function nextPaper(paper){const next=cleanPaper(paper);if(next.active===next.pages.length-1){if(next.pages.length>=PAPER_LIMITS.pages)throw Error('สมุดเก็บหน้าจดได้ 32 หน้า');next.pages.push(blankPage());}next.active++;return next;}
const norm=s=>String(s||'').normalize('NFKC').replace(/\s+/gu,' ').trim().toLocaleLowerCase();
function timing(text){const m=text.match(/(?:หลังจาก|อีก|ใน|in|after)\s*(\d+)\s*(วินาที|นาที|ชั่วโมง|วัน|seconds?|minutes?|hours?|days?)/iu);if(!m)return {};const scale=/วินาที|second/iu.test(m[2])?1:/นาที|minute/iu.test(m[2])?60:/ชั่วโมง|hour/iu.test(m[2])?3600:86400;return {timing:'scheduled',delaySeconds:Number(m[1])*scale};}
export function paperInputs(paper,state,world,{optional=false}={}){
 const normalized=cleanPaper(paper),current=normalized.pages[normalized.active],fresh=current.blocks.filter(b=>b.text.trim()&&b.text!==b.submittedText),names=new Map(),entries=[],loose=[];
 for(const npc of state.npcs||[])for(const name of [...trueNameSpellings(state,npc),npc.name,...npc.aliases||[],world.claims?.[npc.id]?.name]){const key=norm(name);if(!key||key==='???')continue;const list=names.get(key)||[];if(!list.includes(npc))list.push(npc);names.set(key,list);}
 const spellings=[...names.keys()].sort((a,b)=>b.length-a.length);
 for(const block of fresh){let entry;for(const line of block.text.split(/\r?\n/u)){
  const written=line.trim().normalize('NFKC').replace(/^(?:name|ชื่อ)\s*[:：]\s*/iu,'').replace(/\s+/gu,' '),normalizedLine=norm(written),prefix=names.has(normalizedLine)?normalizedLine:spellings.find(n=>{if(!normalizedLine.startsWith(n))return false;const rest=normalizedLine.slice(n.length);return /^[,:：;—–-]/u.test(rest.trimStart())||/^\s+(?:ตาย|เสียชีวิต|หัวใจ|โดน|ถูก|อุบัติเหตุ|หลังจาก|อีก|ใน\s*\d|cause\b|death\b|dies?\b|heart\b|after\b|in\s+\d)/iu.test(rest);});
  const name=prefix?written.slice(0,prefix.length).trim():written,tail=prefix?written.slice(prefix.length).replace(/^[\s,:：;—–-]+/u,'').trim():'',matches=prefix?names.get(prefix):null;
  if(matches?.length>1)throw Error('ระบุใบหน้าจากโรลยังไม่ได้ ชื่อนี้ตรงกับหลายคน');
  if(matches?.length===1){entry={name,target:matches[0],lines:tail?[tail]:[],blocks:new Set([block.id]),x:block.x,y:block.y};entries.push(entry);}else if(entry)entry.lines.push(line);else if(line.trim())loose.push({text:line,block});
 }}
 for(const {text,block}of loose){if(!entries.length)break;const nearest=entries.toSorted((a,b)=>Math.hypot(a.x-block.x,a.y-block.y)-Math.hypot(b.x-block.x,b.y-block.y))[0];nearest.lines.push(text);nearest.blocks.add(block.id);}
 if(!entries.length&&optional)return [];
 if(!entries.length)throw Error('เขียนชื่อที่ต้องการจดในบรรทัดของตัวเองก่อน');
 if(entries.length>16)throw Error('ยืนยันได้ครั้งละไม่เกิน 16 ชื่อ');
 return entries.map(e=>{const body=e.lines.join('\n').trim(),clock=timing(body),first=e.lines.find(s=>s.trim())||'',cause=/^(?:หลังจาก|อีก|ใน|in|after)\s*\d+/iu.test(first)?'':first;return {blockIds:[...e.blocks],input:{name:e.name,targetId:e.target.id,faceKnown:faceKnowledge(world,e.target,state).known,cause,details:body,...clock}};});
}
export function markPaperSubmitted(paper,blockIds){const next=cleanPaper(paper),ids=new Set(blockIds);for(const page of next.pages)for(const block of page.blocks)if(ids.has(block.id))block.submittedText=block.text;return next;}
