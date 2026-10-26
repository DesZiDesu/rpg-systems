// Phone-only turns share RoleForge's world clock. UI edits and historical syncs do not.
export function phoneMessageMinutes(text){
 const size=Array.from(String(text||'').trim()).length;
 return size>1200?3:size>320?2:1;
}
export function phoneActionMinutes(action){
 if(action.type==='message-send'||action.type==='call-speech'&&(!action.from||action.from==='player'))return phoneMessageMinutes(action.text);
 return action.type==='call-start'?1:0;
}
export function phoneReplyMinutes(event){
 if(!['message','call-speech','call-result'].includes(event.type))return 0;
 const value=event.elapsedMinutes;
 return typeof value==='number'&&Number.isFinite(value)?Math.max(1,Math.min(10,Math.round(value))):phoneMessageMinutes(event.text);
}
export function advancePhoneClock(state,minutes){
 const clock=state.worldClock,match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock?.time||'');
 if(!match||!Number.isFinite(minutes)||minutes<=0)return state;
 const day=Math.max(1,Number(clock.day)||1),total=Math.min(999999*1440-1,(day-1)*1440+Number(match[1])*60+Number(match[2])+Math.round(minutes)),nextDay=Math.floor(total/1440)+1,hour=Math.floor(total%1440/60);
 let dayName=clock.dayName;
 if(nextDay!==day){
  const lists=[['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์']];
  const list=lists.find(names=>names.some(n=>n.toLowerCase()===String(dayName).toLowerCase()));
  dayName=list?list[(list.findIndex(n=>n.toLowerCase()===String(dayName).toLowerCase())+nextDay-day)%7]:'Day '+nextDay;
 }
 return {...state,worldClock:{...clock,day:nextDay,dayName:dayName||'Day '+nextDay,time:String(hour).padStart(2,'0')+':'+String(total%60).padStart(2,'0'),phase:hour>=5&&hour<12?'Morning':hour>=12&&hour<17?'Afternoon':hour>=17&&hour<21?'Evening':'Night'}};
}
