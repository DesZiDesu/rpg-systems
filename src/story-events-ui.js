// Visible receipts for optional story trackers. Read-only, no API requests.
export function renderStoryEvents(events,language='en') {
    const memories=events?.memories||[],agenda=events?.agenda||[],quests=events?.quests||[];
    if(!memories.length&&!agenda.length&&!quests.length)return null;
    const t=(th,en)=>language==='th'?th:en;
    const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
    const root=node('details','trpg-story-events'),summary=node('summary','',t('บันทึกเรื่องนี้','Story records'));
    const count=memories.length+agenda.length+quests.reduce((sum,q)=>sum+q.objectives.length,0);summary.append(node('span','',` · ${count}`));root.append(summary);
    const section=(title)=>{const el=node('section','');el.append(node('h5','',title));root.append(el);return el;};
    if(memories.length){const wrap=section(t('เรื่องสำคัญ / คำสัญญา','Important facts / promises'));for(const item of memories){const row=node('article','');row.append(node('strong','',item.title),node('p','',item.detail),node('small','',`${t({Fact:'ข้อเท็จจริง',Promise:'คำสัญญา',Secret:'ความลับ',Thread:'เรื่องค้าง'}[item.kind],item.kind)} · ${t({Active:'ยังดำเนินอยู่',Resolved:'คลี่คลายแล้ว',Archived:'เก็บเข้าคลัง'}[item.status],item.status)}`));wrap.append(row);}}
    if(agenda.length){const wrap=section(t('นัดหมายและกำหนดเวลา','Appointments / deadlines'));for(const item of agenda){const row=node('article','');row.append(node('strong','',item.title),node('p','',item.whenText||[item.dueDay==null?'':t(`วันที่ ${item.dueDay}`,`Day ${item.dueDay}`),item.dueTime].filter(Boolean).join(' · ')));if(item.detail)row.append(node('p','',item.detail));wrap.append(row);}}
    if(quests.length){const wrap=section(t('เช็กลิสต์เป้าหมายเควส','Quest objectives'));for(const quest of quests){const row=node('article','');row.append(node('strong','',quest.name));for(const step of quest.objectives)row.append(node('p','trpg-story-event-step',`${step.status==='Completed'?'☑':step.status==='Skipped'?'−':'☐'} ${step.title}${step.optional?t(' (เสริม)',' (optional)'):''}`));wrap.append(row);}}
    return root;
}
