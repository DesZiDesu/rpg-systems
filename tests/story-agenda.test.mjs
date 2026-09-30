import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStoryAgenda, upsertStoryAgenda, storyAgendaState, storyAgendaPrompt, storyAgendaSummary} from '../src/story-agenda.js';

const appointment = {title:'Meet Ashe', kind:'Appointment', dueDay:7, dueTime:'14:30', people:['Ashe'], location:'Guild hall'};

test('agenda normalization bounds values, ignores malformed entries and invents no dates', () => {
    const values = normalizeStoryAgenda([null, false, [], {}, {title:42}, {...appointment,
        detail:'x'.repeat(900), people:['Ashe','ashe','',42], dueDay:true, dueTime:'25:00',
        whenText:'Tomorrow afternoon', status:'unknown', unknown:'removed'}]);
    assert.equal(values.length,1);
    assert.equal(values[0].detail.length,700);
    assert.deepEqual(values[0].people,['ashe']);
    assert.equal(values[0].dueDay,null);
    assert.equal(values[0].dueTime,'');
    assert.equal(values[0].whenText,'Tomorrow afternoon');
    assert.equal(values[0].status,'Scheduled');
    assert.equal('unknown' in values[0],false);
    for (const dueDay of [0,-1,1.5,1000000,'','   ',null,undefined,NaN,{},Symbol('invalid')])
        assert.equal(normalizeStoryAgenda([{title:'Reminder',dueDay}])[0].dueDay,null);
    assert.equal(normalizeStoryAgenda([{title:'Reminder',dueDay:'8'}])[0].dueDay,8);
    assert.deepEqual(normalizeStoryAgenda({title:'Reminder'}),[]);
});

test('agenda IDs survive reload and repeats deduplicate by normalized title, kind and schedule', () => {
    const first = upsertStoryAgenda([],appointment,{sourceDay:3,sourceMessageId:8,source:'story'});
    assert.match(first[0].id,/^agenda-[a-f0-9]{8}$/);
    assert.equal(first[0].sourceDay,3);
    assert.equal(first[0].sourceMessageId,8);
    const reload = normalizeStoryAgenda(JSON.parse(JSON.stringify(first)));
    assert.deepEqual(reload,first);
    assert.deepEqual(upsertStoryAgenda(reload,appointment),first);
    const repeated = upsertStoryAgenda(reload,{...appointment,id:'ai-repeated-id',title:'  MEET   Ashe  ',detail:'Bring the letter'});
    assert.equal(repeated.length,1);
    assert.equal(repeated[0].id,first[0].id);
    assert.equal(repeated[0].detail,'Bring the letter');
    assert.equal(repeated[0].sourceDay,3);
    assert.deepEqual(upsertStoryAgenda(first,{...appointment,updatedAt:'new artificial timestamp'},
        {sourceDay:4,sourceMessageId:9,source:'retried'}),first);
});

test('inherited object names cannot become agenda statuses or break derived summaries', () => {
    const maliciousNames = ['__proto__','constructor','toString','valueOf','hasOwnProperty'];
    const entries = normalizeStoryAgenda(maliciousNames.map((status,index)=>({title:`Reminder ${index}`,status,dueDay:7})));
    assert.equal(entries.length,maliciousNames.length);
    for (const entry of entries) {
        assert.equal(entry.status,'Scheduled');
        assert.equal(storyAgendaState(entry,{day:7,time:'12:00'}),'Today');
    }
    const summary = storyAgendaSummary(entries,{day:7,time:'12:00'});
    assert.equal(summary.active,maliciousNames.length);
    assert.equal(summary.today,maliciousNames.length);
    assert.ok(storyAgendaPrompt(entries,{day:7,time:'12:00'}).includes('Reminder 0'));
});

test('partial ID updates postpone or cancel a reminder without discarding its other facts', () => {
    const first = upsertStoryAgenda([],{...appointment,id:'meeting',detail:'Bring the letter',evidence:'Ashe confirmed the meeting.'});
    const postponed = upsertStoryAgenda(first,{id:'meeting',dueDay:9,dueTime:'',whenText:'Day 9, time undecided'});
    assert.equal(postponed[0].title,appointment.title);
    assert.equal(postponed[0].dueDay,9);
    assert.equal(postponed[0].dueTime,'');
    assert.deepEqual(postponed[0].people,['Ashe']);
    assert.equal(postponed[0].detail,'Bring the letter');
    assert.equal(first[0].dueDay,7,'upsert must not mutate its input');
    const cancelled = upsertStoryAgenda(postponed,{id:'meeting',status:'Cancelled',resolution:'Ashe cancelled.'});
    assert.equal(cancelled[0].status,'Cancelled');
    assert.equal(cancelled[0].evidence,'Ashe confirmed the meeting.');
    assert.equal(cancelled[0].resolution,'Ashe cancelled.');
    assert.deepEqual(upsertStoryAgenda(cancelled,{id:'missing-id',status:'Completed'}),cancelled);
});

test('distinct days, event kinds and unresolved descriptions remain distinct appointments', () => {
    let values = upsertStoryAgenda([],appointment);
    values = upsertStoryAgenda(values,{...appointment,dueDay:8});
    values = upsertStoryAgenda(values,{...appointment,kind:'Deadline'});
    values = upsertStoryAgenda(values,{title:'Meet Ashe',whenText:'Next week'});
    values = upsertStoryAgenda(values,{title:'Meet Ashe',whenText:'Tomorrow'});
    values = upsertStoryAgenda(values,{title:'Meet Ashe',dueDay:7,whenText:'Morning'});
    values = upsertStoryAgenda(values,{title:'Meet Ashe',dueDay:7,whenText:'Evening'});
    assert.equal(values.length,7);
    assert.equal(new Set(values.map(entry=>entry.id)).size,7);
    const collided = upsertStoryAgenda([{...appointment,id:'keep'}, {...appointment,id:'duplicate',dueDay:8}],{id:'keep',dueDay:8});
    assert.equal(collided.length,1);
    assert.equal(collided[0].id,'keep');
});

test('malformed partial updates preserve closed status, kind and the known schedule', () => {
    const previous = upsertStoryAgenda([],{...appointment,id:'closed-deadline',kind:'Deadline',status:'Completed',
        resolution:'Delivered on time',createdAt:'2026-09-30T12:00:00Z',updatedAt:'2026-09-30T12:01:00Z'});
    for (const changes of [
        {status:'not-a-status'}, {status:'__proto__'}, {status:'constructor'}, {status:null}, {kind:'not-a-kind'}, {kind:undefined},
        {dueDay:-3}, {dueDay:true}, {dueDay:undefined}, {dueTime:'99:99'}, {dueTime:undefined},
        {status:'unknown',kind:'unknown',dueDay:-3,dueTime:'99:99',updatedAt:'2026-10-01T12:00:00Z'},
    ]) assert.deepEqual(upsertStoryAgenda(previous,{id:'closed-deadline',...changes}),previous);
    const validChange = upsertStoryAgenda(previous,{id:'closed-deadline',dueDay:9,dueTime:'99:99'});
    assert.equal(validChange[0].dueDay,9);
    assert.equal(validChange[0].dueTime,'14:30');
    assert.equal(validChange[0].status,'Completed');
    assert.equal(validChange[0].kind,'Deadline');
    const explicitlyCleared = upsertStoryAgenda(previous,{id:'closed-deadline',dueDay:null,dueTime:''});
    assert.equal(explicitlyCleared[0].dueDay,null);
    assert.equal(explicitlyCleared[0].dueTime,'');
    assert.equal(explicitlyCleared[0].status,'Completed');
    const explicitlyChanged = upsertStoryAgenda(previous,{id:'closed-deadline',status:'Scheduled',kind:'Appointment',dueDay:10,dueTime:'09:00'});
    assert.equal(explicitlyChanged[0].status,'Scheduled');
    assert.equal(explicitlyChanged[0].kind,'Appointment');
    assert.equal(explicitlyChanged[0].dueDay,10);
    assert.equal(explicitlyChanged[0].dueTime,'09:00');
    assert.deepEqual(normalizeStoryAgenda([previous[0],{id:'closed-deadline',status:'invalid',dueTime:'99:99'}]),previous);
});

test('malformed partial text and people updates preserve facts while explicit empty values clear optional facts', () => {
    const previous = upsertStoryAgenda([],{id:'meeting',title:'Meet Ashe',detail:'Confirmed at tavern',people:['Ashe'],
        evidence:'Ashe confirmed.',whenText:'After lunch',location:'Tavern',questId:'letter-delivery',
        resolution:'Bring the letter',source:'story',createdAt:'2026-09-30T12:00:00Z',updatedAt:'2026-09-30T12:01:00Z'});
    assert.deepEqual(upsertStoryAgenda(previous,{id:'meeting',detail:null,people:null,evidence:{}}),previous);
    for (const field of ['title','detail','whenText','location','questId','resolution','evidence','source','createdAt','updatedAt']) {
        for (const malformed of [null,undefined,{},[],false,42])
            assert.deepEqual(upsertStoryAgenda(previous,{id:'meeting',[field]:malformed}),previous,field);
    }
    for (const malformed of [null,undefined,{},'Ashe',42,[null],[''],['Cora',{}]])
        assert.deepEqual(upsertStoryAgenda(previous,{id:'meeting',people:malformed}),previous);
    const cleared = upsertStoryAgenda(previous,{id:'meeting',detail:'',people:[],evidence:'',location:'',whenText:'',questId:'',resolution:''});
    for (const field of ['detail','evidence','location','whenText','questId','resolution']) assert.equal(cleared[0][field],'');
    assert.deepEqual(cleared[0].people,[]);
    assert.equal(cleared[0].title,'Meet Ashe');
    assert.equal(cleared[0].id,'meeting');
    const invalidId = upsertStoryAgenda(previous,{...previous[0],id:{malformed:true},detail:'Bring two letters'});
    assert.equal(invalidId.length,1);
    assert.equal(invalidId[0].id,'meeting');
    assert.equal(invalidId[0].detail,'Bring two letters');
    assert.equal(previous[0].detail,'Confirmed at tavern');
});

test('clock advances and rewinds without mutating scheduled records', () => {
    const [entry] = normalizeStoryAgenda([appointment]);
    const before = structuredClone(entry);
    assert.equal(storyAgendaState(entry,{day:6,time:'23:59'}),'Upcoming');
    assert.equal(storyAgendaState(entry,{day:7,time:'14:29'}),'Upcoming');
    assert.equal(storyAgendaState(entry,{day:7,time:'14:30'}),'Due');
    assert.equal(storyAgendaState(entry,{day:7,time:'14:31'}),'Overdue');
    assert.equal(storyAgendaState(entry,{day:8,time:'00:00'}),'Overdue');
    assert.equal(storyAgendaState(entry,{day:6,time:'12:00'}),'Upcoming');
    assert.deepEqual(entry,before);
});

test('time-less deadlines stay Today all day and unknown days never guess midnight', () => {
    const [deadline] = normalizeStoryAgenda([{title:'Deliver letter',kind:'Deadline',dueDay:7}]);
    for (const currentTime of ['00:00','12:00','23:59',''])
        assert.equal(storyAgendaState(deadline,{day:7,time:currentTime}),'Today');
    assert.equal(storyAgendaState(deadline,{day:8,time:'00:00'}),'Overdue');
    assert.equal(storyAgendaState({...deadline,dueDay:null,dueTime:'12:00'},{day:8,time:'23:59'}),'Unscheduled');
    assert.equal(storyAgendaState({...deadline,dueDay:null,whenText:'Tomorrow afternoon'},{day:999999,time:'23:59'}),'Unscheduled');
    assert.equal(storyAgendaState(appointment,{day:7,time:'unknown'}),'Today');
    assert.equal(storyAgendaState(appointment,{day:null,time:'14:30'}),'Unscheduled');
});

test('completed and cancelled reminders remain closed after any clock change', () => {
    for (const closed of ['Completed','Cancelled']) for (const currentDay of [1,7,99])
        assert.equal(storyAgendaState({...appointment,status:closed},{day:currentDay,time:'14:30'}),closed);
});

test('agenda calculations are independent of real dates and time zones', () => {
    const [entry] = normalizeStoryAgenda([{...appointment,createdAt:'2099-05-07T19:30:00-11:00',updatedAt:'2000-01-01T00:00:00Z'}]);
    const clocks = [
        {day:7,time:'14:30',date:'1900-01-01',timezone:'Pacific/Honolulu'},
        {day:7,time:'14:30',date:'2099-12-31',timezone:'Asia/Bangkok'},
    ];
    for (const clock of clocks) assert.equal(storyAgendaState(entry,clock),'Due');
});

test('summary counts states and prioritizes overdue, due and earliest active reminders', () => {
    const values = [
        {title:'Later',dueDay:10}, {title:'Vague',whenText:'Soon'}, {title:'Today',dueDay:7},
        {title:'Closed',status:'Completed'}, {title:'Cancelled',status:'Cancelled'},
        {title:'Past',dueDay:6}, {title:'Now',dueDay:7,dueTime:'14:30'},
        {title:'Next',dueDay:8},
    ];
    const result = storyAgendaSummary(values,{day:7,time:'14:30'});
    assert.deepEqual({total:result.total,active:result.active,upcoming:result.upcoming,today:result.today,
        due:result.due,overdue:result.overdue,unscheduled:result.unscheduled,completed:result.completed,cancelled:result.cancelled},
        {total:8,active:6,upcoming:2,today:1,due:1,overdue:1,unscheduled:1,completed:1,cancelled:1});
    assert.deepEqual(result.entries.map(entry=>entry.title),['Past','Now','Today','Next','Later','Vague']);
    assert.equal(result.next.title,'Past');
    assert.equal(result.next.state,'Overdue');
});

test('bounded prompts retain vague reminders and cannot apply automatic consequences', () => {
    const values = Array.from({length:40},(_,index)=>({title:`Reminder ${index}`,dueDay:index+1,
        detail:'d'.repeat(700),evidence:'e'.repeat(700),people:Array.from({length:16},(_,i)=>'Person '+i+'p'.repeat(80))}));
    values.push({title:'Vague but important',whenText:'After the festival'},{title:'Closed secret',status:'Completed'});
    const prompt = storyAgendaPrompt(values,{day:5,time:'12:00'});
    assert.ok(prompt.length<=6000);
    assert.ok(prompt.includes('Vague but important'));
    assert.ok(prompt.includes('Relative or vague whenText is unresolved'));
    assert.ok(prompt.includes('never fail quests, spend money'));
    assert.equal(prompt.includes('Closed secret'),false);
    assert.ok(prompt.split('\n').filter(line=>line.startsWith('{')).length<=12);
    assert.equal(storyAgendaPrompt([{title:'Closed',status:'Completed'}],{day:1,time:'12:00'}),'');
});

test('normalization and upsert stay within a 200-entry chat archive', () => {
    const entries = Array.from({length:220},(_,index)=>({title:`Reminder ${index}`,dueDay:index+1}));
    const normalized = normalizeStoryAgenda(entries);
    assert.equal(normalized.length,200);
    assert.equal(normalized[0].title,'Reminder 20');
    const added = upsertStoryAgenda(normalized,{title:'Newest',dueDay:300});
    assert.equal(added.length,200);
    assert.equal(added.at(-1).title,'Newest');
    assert.deepEqual(normalizeStoryAgenda(normalized),normalized);
});
