import test from 'node:test';
import assert from 'node:assert/strict';
import * as memory from '../src/memory-summaries.js';
import {normalizeMemoryDetails} from '../src/memory-insights.js';
import {renderMemorySummaries} from '../src/memory-summary-ui.js';

function archive(lines) {
    const library=memory.emptyMemoryLibrary('owner');
    memory.captureMemoryChat(library,{chatId:'main',messages:lines.map(mes=>({mes,name:'Nova',is_user:true})),scene:()=>({day:10,time:'21:00',location:'River'})});
    return library;
}
function add(library,index,fields={},chatId='main') {
    const source=memory.memorySegments(library,chatId).find(segment=>segment.key===String(index));
    const value=memory.repairMemorySummary({summary:'Saved facts.',recap:'Current history.',events:[{title:`Fact ${index}`,detail:source.text,kind:'Event',people:['Cora'],places:[],keywords:['Cora'],knownBy:[],sourceKeys:[source.segmentKey],evidence:source.text,...fields}]},[source]);
    const parent=library.chapters.filter(chapter=>chapter.chatId===chatId).at(-1);
    const chapter={id:`chapter-${chatId}-${index}`,chatId,...value,sources:[(({text,...rest})=>rest)(source)],revision:1,parentId:parent?.id||'',parentRevision:parent?.revision||0};
    library.chapters.push(chapter);
    return memory.memoryInsightViews(library,[chatId]).records.find(record=>record.chapterId===chapter.id);
}
const config={language:'en',memoryInject:true,memorySummaryBudget:500,memoryRetrievalBudget:4000,memorySummaryInputBudget:12000,memorySummaryBatchSize:5,memorySummaryTimeoutSeconds:240};
const count=text=>Math.ceil(text.length/3);

test('new category aliases distinguish world canon, chronology and character boundaries',()=>{
    assert.equal(memory.MEMORY_CATEGORIES.length,15);
    for(const [alias,expected] of [['Lore / Canon','lore'],['Chronology','timeline'],['Preferences / Boundaries','preferences']])assert.equal(memory.memoryCategory(alias),expected);
});
test('knowledge methods require their own matching citation and unawareness/inference do not grant knowledge',()=>{
    const source={segmentKey:'0.0',text:'Nova saw the seal. Cora has not been told. Den only guessed.'};
    const value=normalizeMemoryDetails({kind:'Claim',knownBy:['Cora','Den'],sourceKeys:['0.0'],knowledge:[
        {person:'Nova',method:'Witnessed',sourceKeys:['0.0'],evidence:'Nova saw the seal.'},
        {person:'Cora',method:'Unaware',sourceKeys:['0.0'],evidence:'Cora has not been told.'},
        {person:'Den',method:'Inferred',sourceKeys:['0.0'],evidence:'Den only guessed.'},
        {person:'Fake',method:'Told',sourceKeys:['0.0'],evidence:'An invented quotation'},
        {person:'Future',method:'Public',sourceKeys:['later'],evidence:'Nova saw the seal.'},
    ],timeline:{frame:'Past',day:'2',time:'29:00'}},[source]);
    assert.equal(value.confidence,'Uncertain');assert.deepEqual(value.knownBy,['Nova']);assert.equal(value.knowledge.length,3);
    assert.equal(value.visibility,'Unknown');assert.deepEqual(value.timeline,{frame:'Past',day:null,time:''});
});
test('a flashback cannot replace present preferences; a cited current change links its reason and supersedes the old record',()=>{
    const library=archive(['Cora prefers coffee now.','In childhood Cora preferred tea on Day 2.','Cora now prefers water because coffee makes her ill.']);
    const current=add(library,0,{category:'preferences',topicKey:'Cora drink',timeline:{frame:'Current'},title:'Current drink'});
    add(library,1,{category:'preferences',topicKey:'Cora drink',timeline:{frame:'Flashback',day:2},change:{type:'PreferenceChange',targets:[memory.memoryRecordKey(current)],reason:'Childhood memory'}});
    let view=memory.memoryInsightViews(library,['main']);assert(view.facts.some(fact=>fact.id===current.id));assert.equal(view.changes[0].applied,false);
    const water=add(library,2,{category:'preferences',topicKey:'Cora drink',timeline:{frame:'Current'},title:'Current drink',change:{type:'PreferenceChange',targets:[memory.memoryRecordKey(current)],reason:'Coffee causes illness'}});
    view=memory.memoryInsightViews(library,['main']);assert(!view.facts.some(fact=>fact.chapterId===current.chapterId));assert(view.facts.some(fact=>fact.chapterId===water.chapterId));
    assert.equal(view.timeline[0].eventDay,2);assert.equal(view.timeline[0].recordedDay,10);assert(view.timeline.find(fact=>fact.chapterId===current.chapterId).superseded);
});
test('an unverified correction preserves canon; a confirmed correction removes stale context facts but retains original history',async()=>{
    const library=archive(['The guild requires silver.','Cora claims gold is required.','The official guild rule confirms gold is required.']);
    const silver=add(library,0,{category:'lore',topicKey:'Guild entry',title:'Silver rule'});
    const claim=add(library,1,{category:'lore',kind:'Claim',change:{type:'Correction',targets:[memory.memoryRecordKey(silver)],reason:'A claim'}});
    assert(memory.memoryFactIndex(library,['main']).some(fact=>fact.chapterId===silver.chapterId));
    const gold=add(library,2,{category:'lore',topicKey:'Guild entry',title:'Gold rule',change:{type:'Correction',targets:[memory.memoryRecordKey(silver),memory.memoryRecordKey(claim)],reason:'Confirmed official rule'}});
    const view=memory.memoryInsightViews(library,['main']);assert.deepEqual(view.facts.map(fact=>fact.chapterId),[gold.chapterId]);assert.equal(view.changes.at(-1).targets.length,2);
    assert(memory.searchMemoryLibrary(library,['main'],'silver').some(hit=>hit.type==='source'));
    const chosen=await memory.memoryPromptSelection(library,['main'],'silver',config,count,[silver]);
    const entries=chosen.references.split('\n').map(line=>JSON.parse(line));assert(entries.some(entry=>entry.title==='Gold rule'));
    assert(!entries.some(entry=>entry.title==='Silver rule'));assert(entries.find(entry=>entry.category==='original').corrections.some(entry=>entry.title==='Gold rule'));
    assert(count(chosen.references)<=config.memoryRetrievalBudget);
});
test('unresolved contradictory accounts retain both evidence paths and warn the model within its budget',async()=>{
    const library=archive(['Cora says the key is silver.','Den says the same key is gold.']);
    const first=add(library,0,{category:'lore',title:'Silver key'});
    add(library,1,{category:'lore',title:'Gold key',kind:'Claim',confidence:'Disputed',change:{type:'Contradiction',targets:[memory.memoryRecordKey(first)],reason:'Witnesses disagree'}});
    const view=memory.memoryInsightViews(library,['main']);assert.equal(view.facts.length,2);assert(view.facts.every(fact=>fact.disputed));assert.equal(view.changes[0].applied,false);
    const chosen=await memory.memoryPromptSelection(library,['main'],'key',config,count);assert.match(chosen.references,/Unresolved conflicting evidence/);assert.match(chosen.references,/conflictingAccounts/);
});
test('promises close only through a confirmed event, link opening and resolution evidence, and can reopen',()=>{
    const library=archive(['Cora promises to return.','Den claims Cora returned.','Cora returns to the river.','Cora promises to return again.']);
    const opening=add(library,0,{title:'Return promise',category:'relations',kind:'Plan',status:'Active',threadKey:'Cora return river',threadType:'Promise'});
    add(library,1,{title:'Rumoured return',category:'relations',kind:'Claim',status:'Resolved',resolves:[memory.memoryRecordKey(opening)]});
    assert.equal(memory.memoryInsightViews(library,['main']).threads.find(thread=>thread.title==='Return promise').status,'Active');
    const closure=add(library,2,{title:'Confirmed return',category:'relations',status:'Resolved',resolves:[memory.memoryRecordKey(opening)]});
    let thread=memory.memoryInsightViews(library,['main']).threads.find(thread=>thread.title==='Return promise');assert.equal(thread.status,'Resolved');assert.equal(thread.resolution.chapterId,closure.chapterId);
    add(library,3,{title:'Another return promise',category:'relations',kind:'Plan',status:'Active',threadKey:'Cora return river'});
    thread=memory.memoryInsightViews(library,['main']).threads.find(thread=>thread.title==='Return promise');assert.equal(thread.status,'Active');assert.equal(thread.resolution,null);
});
test('cross-branch, future and self correction targets do not change current facts or leak hidden history',()=>{
    const library=archive(['A public fact.','A later assertion.']);
    memory.captureMemoryChat(library,{chatId:'branch',messages:[{mes:'SECRET alternate history.',name:'Cora'}]});
    const secret=add(library,0,{visibility:'Private'},'branch');
    const first=add(library,0,{title:'Public fact'});
    add(library,1,{change:{type:'Correction',targets:[memory.memoryRecordKey(secret),'chapter-main-99::future','missing'],reason:'Invalid target'}});
    const view=memory.memoryInsightViews(library,['main']);assert(view.facts.some(fact=>fact.chapterId===first.chapterId));assert.equal(view.changes[0].unlinked,3);assert.equal(view.changes[0].applied,false);
    assert(!JSON.stringify(view).includes('SECRET'));assert(!JSON.stringify(memory.memoryReferenceHints(library,['main'],'Cora')).includes('SECRET'));
});
test('knowledge views preserve proven recipients and explicitly unaware actors; unknown legacy methods stay unknown',()=>{
    const library=archive(['Nova sees the hidden seal. Cora has not been told.','Den was told about the seal.']);
    add(library,0,{visibility:'Private',knowledge:[{person:'Nova',method:'Witnessed',sourceKeys:['0.0'],evidence:'Nova sees the hidden seal.'},{person:'Cora',method:'Unaware',sourceKeys:['0.0'],evidence:'Cora has not been told.'}]});
    add(library,1,{knownBy:['Den']});
    const view=memory.memoryInsightViews(library,['main']);assert.equal(view.knowledge.find(person=>person.name==='Cora').known.length,0);assert.equal(view.knowledge.find(person=>person.name==='Cora').unaware.length,1);
    assert.equal(view.knowledge.find(person=>person.name==='Nova').known[0].method,'Witnessed');assert.equal(view.knowledge.find(person=>person.name==='Den').known[0].method,'Recorded');
    assert.equal(view.timeline[0].eventDay,null);assert.equal(view.timeline[0].recordedDay,10);
});
test('new local views survive archive round trips without mutation and disappear when their source becomes stale',()=>{
    const library=archive(['Cora promised to return.']);add(library,0,{status:'Active',kind:'Plan',threadKey:'return'});
    const original=JSON.stringify(library),copy=memory.normalizeMemoryLibrary(JSON.parse(original),'owner');
    assert.equal(memory.memoryInsightViews(copy,['main']).threads.length,1);assert.equal(JSON.stringify(library),original);
    copy.chats[0].messages[0].fingerprint='changed';assert.equal(memory.memoryInsightViews(copy,['main']).threads.length,0);
});
test('a later rumour cannot reopen a confirmed closed promise or replace its confirmed resolution',()=>{
    const library=archive(['Cora promises to return.','Cora returns.','Den claims Cora did not return.']);
    const opening=add(library,0,{kind:'Plan',status:'Active',threadKey:'Cora return'});
    const closure=add(library,1,{status:'Resolved',resolves:[memory.memoryRecordKey(opening)]});
    add(library,2,{kind:'Claim',status:'Resolved',threadKey:'Cora return'});
    const view=memory.memoryInsightViews(library,['main']);assert.equal(view.threads[0].status,'Resolved');
    assert(view.facts.some(fact=>fact.chapterId===closure.chapterId&&fact.status==='Resolved'));
});
test('a witnessed disclosure updates current recipient knowledge and keeps earlier unawareness in history',()=>{
    const library=archive(['Cora has not been told the secret.','Nova tells Cora the secret.']);
    add(library,0,{topicKey:'hidden seal',visibility:'Private',knowledge:[{person:'Cora',method:'Unaware',sourceKeys:['0.0'],evidence:'Cora has not been told the secret.'}]});
    add(library,1,{topicKey:'hidden seal',visibility:'Private',knowledge:[{person:'Cora',method:'Told',sourceKeys:['1.0'],evidence:'Nova tells Cora the secret.'}]});
    const view=memory.memoryInsightViews(library,['main']),cora=view.knowledge.find(person=>person.name==='Cora');
    assert.equal(cora.known.length,1);assert.equal(cora.unaware.length,0);assert.equal(cora.history.length,1);
    assert.equal(view.records[0].knowledge[0].historical,true);
});
test('labelling a flashback as a generic correction still cannot overwrite a present preference',()=>{
    const library=archive(['Cora currently likes coffee.','In childhood Cora liked tea.']);
    const current=add(library,0,{category:'preferences',topicKey:'drink',timeline:{frame:'Current'}});
    add(library,1,{category:'preferences',topicKey:'drink',timeline:{frame:'Flashback'},change:{type:'Correction',targets:[memory.memoryRecordKey(current)],reason:'Childhood clarification'}});
    const view=memory.memoryInsightViews(library,['main']);assert.equal(view.changes[0].applied,false);assert(view.facts.some(fact=>fact.chapterId===current.chapterId));
});
test('workspace exposes all four local views and escapes actor names, quotes and correction reasons',()=>{
    const library=archive(['Cora knows <img src=x onerror=alert(1)> is a dangerous inscription.']);
    add(library,0,{category:'lore',visibility:'Private',knownBy:['<img src=x onerror=alert(1)>'],change:{type:'Contradiction',targets:['missing'],reason:'<script>bad</script>'}});
    const view={...memory.memoryInsightViews(library,['main']),ready:true,settings:config,job:{status:'idle'},coverage:{pendingMessages:0},prompt:{},query:'',results:[],ancestry:['main'],chats:[],chapters:[]};
    const panel={innerHTML:'',querySelectorAll:()=>[]};renderMemorySummaries(panel,view);
    for(const name of ['threads','timeline','knowledge','changes'])assert.match(panel.innerHTML,new RegExp(`insight:${name}`));
    assert.match(panel.innerHTML,/category:lore/);assert.match(panel.innerHTML,/category:preferences/);assert.doesNotMatch(panel.innerHTML,/<script>bad|<img src=x/);
});
