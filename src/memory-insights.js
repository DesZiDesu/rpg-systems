// Local views and links over already cited archive records; no model requests.
const key = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu,' ').trim();
const text = (value,max=160) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const strings = (value,max=12,size=500) => [...new Set((Array.isArray(value)?value:[]).map(item=>text(item,size)).filter(Boolean))].slice(0,max);
const choice = (value,values,fallback) => values.find(item=>key(item)===key(value)) || fallback;
export const memoryRecordKey = record => `${record.chapterId}::${record.id}`;

export function normalizeMemoryDetails(event,batch=[]) {
    const sources = batch.filter(source=>event.sourceKeys?.includes(source.segmentKey));
    const knowledge = (Array.isArray(event.knowledge)?event.knowledge:[]).slice(0,12).flatMap(entry=>{
        const person=text(entry?.person,120),evidence=text(entry?.evidence,800),sourceKeys=strings(entry?.sourceKeys);
        const cited=sources.filter(source=>sourceKeys.includes(source.segmentKey));
        if(!person||!evidence||sourceKeys.length!==cited.length||!cited.some(source=>key(source.text).includes(key(evidence))))return [];
        return [{person,method:choice(entry.method,['Witnessed','Told','Public','Unaware','Inferred','Unknown'],'Unknown'),sourceKeys,evidence}];
    });
    const frame=choice(event.timeline?.frame,['Current','Past','Flashback','Unknown'],'Unknown'),day=event.timeline?.day;
    const clock=text(event.timeline?.time,5),validClock=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock);
    const confidence=choice(event.confidence,['Confirmed','Uncertain','Disputed'],event.kind==='Claim'?'Uncertain':'Confirmed');
    const status=choice(event.status,['Active','Resolved','Historical'],'Historical');
    let knownBy=strings(event.knownBy,40,120);
    for(const entry of knowledge) {
        if(['Unaware','Inferred','Unknown'].includes(entry.method))knownBy=knownBy.filter(person=>key(person)!==key(entry.person));
        else if(!knownBy.some(person=>key(person)===key(entry.person)))knownBy.push(entry.person);
    }
    return {topicKey:text(event.topicKey),threadKey:text(event.threadKey),threadType:choice(event.threadType,['Promise','Mystery','Goal','Other'],'Other'),
        timeline:{frame,day:typeof day==='number'&&Number.isInteger(day)&&day>=0&&day<=10000000?day:null,time:validClock?clock:''},
        visibility:choice(event.visibility,['Public','Private','Unknown'],'Unknown'),confidence,knowledge,knownBy,
        change:{type:choice(event.change?.type,['Correction','Contradiction','PreferenceChange'],'None'),targets:strings(event.change?.targets),reason:text(event.change?.reason,360)},
        resolves:strings(event.resolves),
        // A report or a future plan cannot establish a completed outcome.
        status:status==='Resolved'&&(event.kind!=='Event'||confidence!=='Confirmed')?'Active':status};
}

export function memoryInsightIdentity(event) {
    const thread=['Active','Resolved'].includes(event.status),past=['Past','Flashback'].includes(event.timeline?.frame);
    if(thread&&(past||event.kind==='Claim'||event.confidence!=='Confirmed'))return memoryRecordKey(event);
    if(thread&&event.threadKey)return key(JSON.stringify(['thread',event.threadKey]));
    if(['lore','preferences'].includes(event.category)&&event.topicKey&&!past&&event.kind==='Event'&&event.confidence==='Confirmed'&&!event.disputed)
        return key(JSON.stringify([event.category,event.topicKey,[...(event.people||[])].sort()]));
    if(event.disputed||event.confidence==='Disputed')return memoryRecordKey(event);
    return key(JSON.stringify([event.category,thread?'thread':event.kind,event.title,[...(event.people||[])].sort(),thread?'':[event.whenText,event.evidence]]));
}

export function buildMemoryInsights(input) {
    const records=input.map((record,index)=>({...record,...normalizeMemoryDetails(record,record.sources),order:index}));
    const byKey=new Map(records.map(record=>[memoryRecordKey(record),record])),byId=new Map();
    for(const record of records)byId.set(record.id,[...(byId.get(record.id)||[]),record]);
    const superseded=new Set(),conflicts=new Map(),resolved=new Map(),changes=[];
    const targetsFor=(names,record)=>names.map(name=>byKey.get(name)||(byId.get(name)?.length===1?byId.get(name)[0]:null))
        .filter(target=>target&&target.order<record.order);
    for(const record of records) {
        const confirmed=record.kind==='Event'&&record.confidence==='Confirmed';
        if(record.change.type!=='None') {
            const targets=targetsFor(record.change.targets,record),historical=['Past','Flashback'].includes(record.timeline.frame);
            const applies=confirmed&&['Correction','PreferenceChange'].includes(record.change.type);
            const appliedTargets=applies?targets.filter(target=>!historical||!['preferences','lore'].includes(target.category)||['Past','Flashback'].includes(target.timeline.frame)):[];
            const applied=appliedTargets.length>0;
            changes.push({...record,targets,appliedTargets,applied,unlinked:record.change.targets.length-targets.length});
            if(applied)for(const target of appliedTargets)superseded.add(memoryRecordKey(target));
            if(record.change.type==='Contradiction')for(const target of targets) {
                const a=memoryRecordKey(record),b=memoryRecordKey(target);
                conflicts.set(a,new Set([...(conflicts.get(a)||[]),b]));conflicts.set(b,new Set([...(conflicts.get(b)||[]),a]));
            }
        }
        const resolutionTargets=targetsFor(record.resolves,record).filter(target=>target.status==='Active');
        const threadKeys=[...new Set(resolutionTargets.map(target=>target.threadKey).filter(Boolean))];
        if(!record.threadKey&&threadKeys.length===1)record.threadKey=threadKeys[0];
        if(confirmed&&record.status==='Resolved')for(const target of resolutionTargets) {
            if(target.status==='Active'){resolved.set(memoryRecordKey(target),record);superseded.add(memoryRecordKey(target));}
        }
    }
    const current=new Map();
    for(const record of records) {
        if(superseded.has(memoryRecordKey(record)))continue;
        const conflicting=[...(conflicts.get(memoryRecordKey(record))||[])].filter(name=>!superseded.has(name)).map(name=>byKey.get(name));
        const next={...record,disputed:record.confidence==='Disputed'||conflicting.length>0,conflicts:conflicting};
        current.set(memoryInsightIdentity(next),next);
    }
    const facts=[...current.values()],threadGroups=new Map();
    for(const record of records)if(['Active','Resolved'].includes(record.status)) {
        const identity=record.threadKey?key(record.threadKey):key(JSON.stringify([record.category,record.title,record.people]));
        const group=['Past','Flashback'].includes(record.timeline.frame)?`past:${identity}`:identity;
        threadGroups.set(group,[...(threadGroups.get(group)||[]),record]);
    }
    const threads=[...threadGroups.entries()].map(([identity,history])=>{
        const opening=history.find(record=>record.status==='Active')||history[0];
        const closures=history.filter(record=>record.status==='Resolved'&&record.kind==='Event'&&record.confidence==='Confirmed');
        for(const record of history)if(resolved.has(memoryRecordKey(record)))closures.push(resolved.get(memoryRecordKey(record)));
        const closure=closures.sort((a,b)=>a.order-b.order).at(-1),reopened=history.findLast(record=>record.status==='Active'&&record.kind!=='Claim'&&record.confidence==='Confirmed'&&closure&&record.order>closure.order);
        return {key:identity,title:opening.title,threadType:opening.threadType,status:closure&&!reopened?'Resolved':'Active',opening,latest:history.at(-1),resolution:closure&&!reopened?closure:null,history};
    });
    const people=new Map(),unassignedSecrets=[];
    for(const fact of facts) {
        const entries=[...fact.knowledge],specified=new Set(entries.map(entry=>key(entry.person)));
        for(const person of fact.knownBy||[])if(!specified.has(key(person))) {
            const entry={person,method:'Recorded',sourceKeys:fact.sourceKeys,evidence:fact.evidence};
            entries.push(entry);fact.knowledge.push(entry);
        }
        for(const entry of entries) {
            const person=people.get(key(entry.person))||{name:entry.person,known:[],unaware:[],uncertain:[],history:[],slots:new Map()};
            const historical=['Past','Flashback'].includes(fact.timeline.frame);
            const group=historical?'history':entry.method==='Unaware'?'unaware':['Witnessed','Told','Public','Recorded'].includes(entry.method)?'known':'uncertain';
            const row={fact,...entry};
            if(historical)entry.historical=true;
            const slot=fact.topicKey?key(fact.topicKey):memoryRecordKey(fact);
            if(!['history','uncertain'].includes(group)) {
                const previous=person.slots.get(slot);
                if(previous) {
                    person[previous.group]=person[previous.group].filter(old=>old!==previous.row);
                    previous.row.historical=true;previous.entry.historical=true;person.history.push(previous.row);
                }
                person.slots.set(slot,{row,entry,group});
            }
            person[group].push(row);people.set(key(entry.person),person);
        }
    }
    unassignedSecrets.push(...facts.filter(fact=>fact.visibility==='Private'&&!fact.knowledge.some(entry=>!entry.historical&&['Witnessed','Told','Public','Recorded'].includes(entry.method))));
    const timeline=records.map(fact=>{
        const current=fact.timeline.frame==='Current',source=fact.sources[0];
        return {...fact,eventDay:fact.timeline.day??(current?source?.day??null:null),eventTime:fact.timeline.time||(current?source?.time||'':''),
            recordedDay:source?.day??null,recordedTime:source?.time||'',superseded:superseded.has(memoryRecordKey(fact))};
    }).sort((a,b)=>{
        if(a.eventDay!==null&&b.eventDay!==null)return a.eventDay-b.eventDay||a.eventTime.localeCompare(b.eventTime)||a.order-b.order;
        if(a.eventDay!==null||b.eventDay!==null)return a.eventDay!==null?-1:1;
        return a.order-b.order;
    });
    return {records,facts,threads,knowledge:[...people.values()].map(({slots,...person})=>person),unassignedSecrets,changes,timeline};
}
