import {identityText,containsIdentity} from './identity.js?v=0.85.3';
const thaiDigits={ศูนย์:0,หนึ่ง:1,เอ็ด:1,สอง:2,ยี่:2,สาม:3,สี่:4,ห้า:5,หก:6,เจ็ด:7,แปด:8,เก้า:9};
function number(value){
 const s=value.trim().toLocaleLowerCase();if(/^\d+$/u.test(s))return Number(s);
 if(Object.hasOwn(thaiDigits,s))return thaiDigits[s];
 const th=s.split('สิบ');if(th.length===2&&(!th[0]||Object.hasOwn(thaiDigits,th[0]))&&(!th[1]||Object.hasOwn(thaiDigits,th[1])))return (thaiDigits[th[0]]||1)*10+(thaiDigits[th[1]]||0);
 const en={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,ninety:90};
 const parts=s.split(/[ -]+/u);return parts.every(p=>Object.hasOwn(en,p))?parts.reduce((n,p)=>n+en[p],0):NaN;
}
export function witnessedElapsed(source){
 const text=identityText(source),values=[];
 const record=(amount,unit,context)=>{if(/ยังไม่|ถ้า|สมมติ|จะรอ|\b(?:if|will|would|could|not yet)\b/iu.test(context))return;const value=number(amount),scale=/^(?:วินาที|seconds?)$/iu.test(unit)?1:/^(?:นาที|minutes?)$/iu.test(unit)?60:/^(?:ชั่วโมง|hours?)$/iu.test(unit)?3600:86400;if(Number.isFinite(value)&&value>=0)values.push(value*scale);};
 for(const m of text.matchAll(/(?:หลัง(?:จาก|ครบ)?|เมื่อ(?:ครบ|ผ่านไป)?|ครบ|ผ่านไป)\s*(\d+|[ก-๛]+?)\s*(วินาที|นาที|ชั่วโมง|วัน)/gu))record(m[1],m[2],text.slice(Math.max(0,m.index-12),m.index));
 for(const m of text.matchAll(/(?:ใน)?(วินาที|นาที|ชั่วโมง|วัน)ที่\s*(\d+|[ก-๛]+?)(?=พอดี|เป๊ะ|แล้ว|ผ่าน|[\s,.!?]|$)/gu))record(m[2],m[1],text.slice(Math.max(0,m.index-12),m.index));
 for(const m of text.matchAll(/(?:after|at|elapsed|passed)\s+(\d+|[a-z]+(?:[ -][a-z]+)?)\s+(seconds?|minutes?|hours?|days?)\b/giu))record(m[1],m[2],text.slice(Math.max(0,m.index-15),m.index));
 for(const m of text.matchAll(/\b(\d+|[a-z]+(?:[ -][a-z]+)?)\s+(seconds?|minutes?|hours?|days?)\s+(?:(?:have|has)\s+)?(?:passed|later|elapsed)\b/giu))record(m[1],m[2],text.slice(Math.max(0,m.index-15),m.index));
 return values.length?Math.max(...values):null;
}
export function completedDeath(evidence){
 return /เสียชีวิต|ตาย(?:แล้ว|ลง|คา|ทันที|กะทันหัน|กระทันหัน|อย่าง|ด้วย|เพราะ|จาก|ใน|หลัง|[\s,.!?]|$)|\b(?:died|dies|is dead|has died|found dead)\b/iu.test(evidence)&&!/(?:ยังไม่|ไม่ได้|ไม่เคย|กำลังจะ|น่าจะ|คงจะ|อาจ(?:จะ)?).{0,22}(?:เสียชีวิต|ตาย)|คาดว่า(?:จะ)?เสียชีวิต|ข่าวปลอม|\b(?:not|never|will|would|may|might|could)\b.{0,25}\b(?:dead|die|died)\b|falsely reported|fake report/iu.test(evidence);
}
export function namesInResult(entry){return [...new Set([entry.name,...(entry.validName!==false&&Array.isArray(entry.acceptedNames)?entry.acceptedNames:[])].filter(Boolean))];}
function subjectDies(passage,entry){
 return namesInResult(entry).some(name=>{
  if(!containsIdentity(passage,name))return false;
  const text=passage.toLocaleLowerCase(),start=text.indexOf(identityText(name).toLocaleLowerCase()),tail=text.slice(start+identityText(name).length),death=tail.search(/เสียชีวิต|ตาย|\b(?:died|dies|is dead|has died|found dead)\b/iu);
  const bridge=tail.slice(0,death).replace(/\b(?:is|was|has been|had been|gets?|got)\s+(?:shot|killed|stabbed|attacked)\b/giu,'').replace(/(?:ถูก|โดน)(?:ยิง|แทง|ฆ่า|ทำร้าย)/gu,'');
  return death>=0&&!/\b(?:kills?|killed|murders?|murdered|shoots?|shot|stabs?|stabbed|attacks?|attacked|says?|said|tells?|told|watches?|sees?|saw|witnesses?)\b|(?:บอก|พูด|เล่า|กล่าว)ว่า|(?:เห็น|มองดู).{0,40}(?:คนอื่น|อีกคน)/iu.test(bridge)&&!/ฆ่า|ยิง|แทง|ทำร้าย/u.test(bridge);
 });
}
// A missing model footer can be recovered only from a named completed death
// and explicit elapsed story time. Nothing happens from clocks or prose alone.
export function implicitResults(source,records){
 const elapsed=witnessedElapsed(source);if(elapsed===null)return [];
 const passages=String(source||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?(?:-->|$)/gu,'').split(/<\/(?:tr-narrative|tr-dialogue|p)>|\n\s*\n/iu).map(identityText).filter(s=>s&&s.length<=1200);
 const results=[];
 for(const entry of records){
  if(entry.validName===false||entry.status&&entry.status!=='waiting'||elapsed<entry.delaySeconds||elapsed>23*86400)continue;
  const evidence=passages.find(p=>completedDeath(p)&&!/กฎ|จารึก|สมมติ|\b(?:rule|manuscript|hypothetical|suppose)\b/iu.test(p)&&subjectDies(p,entry)&&new Set(records.filter(e=>namesInResult(e).some(n=>containsIdentity(p,n))).map(e=>e.targetId)).size===1);
  if(evidence)results.push({requestId:entry.id,status:'resolved',elapsedSeconds:elapsed,evidence,source:'visible-story'});
 }
 return results;
}
