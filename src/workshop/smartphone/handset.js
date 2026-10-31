import {clean,clone,id,safeImage} from './model.js?v=0.93.0';

export const isKeitai=config=>config?.deviceType==='keitai';
export const phoneRequestAvailable=(phone,request,config)=>!isKeitai(config)||!phone.threads.some(t=>t.id===request.threadId&&t.app==='gather');
export const messageChannel=(value,fallback='')=>['sms','mail'].includes(value)?value:fallback;
export const mailAddress=value=>typeof value==='string'&&value.length<=160&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u.test(value)?value:'';
export const KEITAI_INSTRUCTIONS='Aster is the hardware brand. The current handset is Aster K06, a Japanese-style clamshell/flip phone (keitai), NOT Aster One and NOT a smartphone. Its physical keys, inner color LCD and small outer display support calls, SMS, mobile email with subjects and shared photo attachments, contacts, a camera/photo journal, local notes, alarms, melodies and an in-world mobile web portal. It has no Gather, Lumen, Murmur, Harbor Store or smartphone app installations on this handset. Retained app history is not installed or accessible here. Use app:"messages", channel:"sms" or "mail" on messages; mail may include subject and an established email address. Reply in the same requested channel and thread. A number, email address or an established incoming channel is needed for correspondence; never invent established contact details. A closed lid or a hidden phone window does not power off the handset, accept a call, or cancel a pending reply. The user may explicitly enable opening the lid to answer. This device choice imposes NO year, era or calendar: preserve the actual story setting and clock. Private notes, photos and messages remain private. A camera scene record describes a fictional photograph; never claim pixel-level vision when only a caption is supplied. Web pages are fictional in-world information, not a live Internet lookup. Do not invent player actions.';

export function smsParts(value){
 const text=String(value||''),basic=new Set([...`@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà`]),extension=new Set([...'^{}\\[~]|€']);
 const gsm=[...text].every(c=>basic.has(c)||extension.has(c)),units=gsm?[...text].reduce((sum,c)=>sum+(extension.has(c)?2:1),0):text.length,single=gsm?160:70,multiple=gsm?153:67;
 return {characters:[...text].length,units,encoding:gsm?'GSM-7':'Unicode',parts:Math.max(1,Math.ceil(units/(units>single?multiple:single))),limit:units>single?multiple:single};
}
export function keitaiAction(current,action,{time={},location={}}={}){
 if(!['keitai-draft','alarm-save','alarm-delete','camera-capture','browser-query'].includes(action.type))return null;
 const p=clone(current);let result;
 if(action.type==='keitai-draft'){
  const d=action.draft;p.keitaiDraft=d?{contactId:clean(d.contactId,160),channel:messageChannel(d.channel,'mail'),subject:clean(d.subject,180),text:clean(d.text,6000),photoId:clean(d.photoId,160)}:null;
 }else if(action.type==='alarm-save'){
  if(!/^([01]\d|2[0-3]):[0-5]\d$/u.test(action.time||''))throw Error('Choose an alarm time');
  const old=p.alarms.find(a=>a.id===action.id),row={id:old?.id||id(),time:action.time,enabled:action.enabled!==false,label:clean(action.label,80)};
  if(old){if(old.time!==row.time||old.enabled!==row.enabled)delete old.lastFiredDay;Object.assign(old,row);}else{if(p.alarms.length>=8)throw Error('Alarm limit reached (8)');p.alarms.push(row);}p.alarmClock={...time};result=row.id;
 }else if(action.type==='alarm-delete')p.alarms=p.alarms.filter(a=>a.id!==action.id);
 else if(action.type==='camera-capture'){
  if(p.photos.length>=100)throw Error('Photo album is full (100)');
  const reference=p.photos.find(v=>v.id===action.photoId),photo={id:id(),image:safeImage(reference?.image),caption:clean(action.caption,300)||clean(location.place||location.name,200)||'Scene photograph',scene:{place:clean(location.place||location.name,200),time:{...time}},sharedWith:[],time:{...time}};p.photos.push(photo);result=photo.id;
 }else if(action.type==='browser-query'){
  if(!['news','weather','travel'].includes(action.section))throw Error('Unknown mobile portal section');
  const pending=p.pending.find(q=>q.type==='web'&&q.section===action.section);if(pending)return {phone:current,result:pending.id};
  const request={id:id(),type:'web',section:action.section,status:'pending',mode:action.mode||'immediate',time:{...time}};p.pending.push(request);result=request.id;
 }
 p.revision++;return {phone:p,result};
}
const clockMinute=c=>/^([01]\d|2[0-3]):[0-5]\d$/u.test(c?.time||'')?(Math.max(1,Number(c.day)||1)-1)*1440+Number(c.time.slice(0,2))*60+Number(c.time.slice(3)):null;
export function checkPhoneAlarms(current,clock){
 const before=clockMinute(current.alarmClock),now=clockMinute(clock);if(now===null||before===now)return current;
 const p=clone(current);p.alarmClock={day:clock.day,time:clock.time};
 if(before!==null&&now>before)for(const alarm of p.alarms.filter(a=>a.enabled)){
  const minute=Number(alarm.time.slice(0,2))*60+Number(alarm.time.slice(3)),lastDay=Math.floor((now-minute)/1440),firstDay=Math.floor((before-minute)/1440);
  if(lastDay>firstDay&&alarm.lastFiredDay!==lastDay+1){alarm.lastFiredDay=lastDay+1;p.notifications.push({id:id(),type:'alarm',title:alarm.label||'Alarm',text:alarm.time,target:alarm.id,read:false,time:{...clock}});}
 }
 p.revision++;return p;
}
