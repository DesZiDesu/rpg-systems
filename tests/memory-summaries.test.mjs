import test from 'node:test';
import assert from 'node:assert/strict';
import * as memory from '../src/memory-summaries.js';
import {createMemorySummaries,requestMemorySummary,cleanMemorySummaryResponse,memorySummaryNativeGenerationActive,diagnoseMemoryApiFailure,memoryJobMessage} from '../src/memory-summary-runtime.js';
import {renderMemorySummaries} from '../src/memory-summary-ui.js';

const config = () => ({enableMemorySummaries:true,language:'en',memoryAutoSummary:true,memorySummaryInterval:5,memorySummaryBatchSize:10,memorySummaryProfile:'',memoryInject:true,memorySummaryBudget:1200,memoryRetrievalBudget:1000,memorySummaryInputBudget:12000});
test('detailed extraction targets grow with the selected output budget while retaining a finite response',()=>{
 const compact=memory.memorySummaryPrompt([], '', {}, '', 2400),detailed=memory.memorySummaryPrompt([], '', {}, '', 12000);
 assert.match(compact,/2400-token response limit/);assert.match(compact,/<=10 new events/);
 assert.match(detailed,/12000-token response limit/);assert.match(detailed,/<=48 new events/);
});
test('single request processes every pending message without silently applying the batch-size limit',async()=>{
 const f=fixture({settings:{memorySummaryStrategy:'single',memorySummaryBatchSize:2}});setBacklog(f,12);await f.runtime.open();
 assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,1);assert.equal(f.runtime.view().coverage.pendingMessages,0);
 assert.equal(f.runtime.view().job.apiCalls,1);assert.equal(f.runtime.view().job.plannedCalls,1);assert.equal(f.runtime.view().chapters[0].sources.length,12);
});
test('single request refuses oversized history before any AI attempt and keeps every original',async()=>{
 const f=fixture({settings:{memorySummaryStrategy:'single',memorySummaryInputBudget:4000}});setBacklog(f,8);
 f.context.chat.forEach(message=>message.mes+=' Long established story.'.repeat(250));await f.runtime.open();
 assert.equal(await f.runtime.run(),false);assert.equal(f.calls.length,0);assert.equal(f.runtime.view().job.code,'MEMORY_SINGLE_INPUT_TOO_LARGE');
 assert.equal(f.runtime.view().job.apiCalls,0);assert.equal(f.runtime.view().coverage.pendingMessages,8);assert.equal(f.data.get('card:cora').chats[0].messages.length,8);
});
test('one request prepares linked histories with colliding local message IDs and preserves source isolation',async()=>{
 const f=fixture({settings:{memorySummaryStrategy:'single'}});await f.runtime.open();
 f.context.chatId='second';f.context.chatMetadata={[memory.MEMORY_LINK_KEY]:{owner:'card:cora',ancestry:['first']}};
 f.context.chat=[{is_user:true,name:'Nova',mes:'Nova moved to Willow Village.'},{is_user:false,name:'Cora',mes:'Cora recalled the earlier river meeting.'}];await f.runtime.open();
 assert.equal(await f.runtime.run({prepare:true}),true);assert.equal(f.calls.length,1);
 const library=f.data.get('card:cora');assert.equal(memory.memoryCoverage(library,'first').pendingMessages,0);assert.equal(memory.memoryCoverage(library,'second').pendingMessages,0);
 const keys=library.chapters[0].sources.map(source=>source.segmentKey);assert.equal(new Set(keys).size,4);
 assert.equal(memory.latestMemoryRecap(library,['second']),'');assert(memory.latestMemoryRecap(library,['first','second']));
 library.chats[0].messages[0].fingerprint='edited';assert.equal(memory.memoryChapterValid(library,library.chapters[0]),false);
});
test('category mode uses exactly one call per category per batch with no paid merge request',async()=>{
 const f=fixture({settings:{memorySummaryStrategy:'categories',memorySummaryBatchSize:2}});setBacklog(f,3);await f.runtime.open();
 assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,memory.MEMORY_CATEGORIES.length*2);
 assert.equal(f.runtime.view().job.apiCalls,f.calls.length);assert.equal(f.runtime.view().job.apiCallsTotal,f.calls.length);
 assert.equal(f.runtime.view().coverage.pendingMessages,0);assert.equal(f.runtime.view().chapters.length,2);
 assert.deepEqual(new Set(f.runtime.view().facts.map(fact=>fact.category)),new Set(memory.MEMORY_CATEGORIES));
 assert.equal(f.data.get('card:cora').drafts.length,0);
 const panel={innerHTML:'',querySelectorAll:()=>[]};renderMemorySummaries(panel,f.runtime.view(),[]);assert.match(panel.innerHTML,/data-memory-api-calls/);assert.match(panel.innerHTML,/category:relations/);
 f.runtime.search('');const fact=f.runtime.view().facts[0];await f.runtime.force(fact.id);assert.match(f.runtime.prompt(),/First meeting/);
});
test('saved categories survive failure and reload; Retry calls only the remaining categories',async()=>{
 let attempts=0;const f=fixture({settings:{memorySummaryStrategy:'categories'},respond:prompt=>{if(++attempts===4)throw Object.assign(Error('Service unavailable'),{status:503});return simpleMemoryResponse(prompt);}});
 await f.runtime.open();assert.equal(await f.runtime.run(),false);assert.equal(f.calls.length,4);assert.equal(Object.keys(f.data.get('card:cora').drafts[0].parts).length,3);
 const resumed=fixture({data:f.data,settings:{memorySummaryStrategy:'categories'},respond:simpleMemoryResponse});await resumed.runtime.open();assert.equal(await resumed.runtime.run({retry:true}),true);
 assert.equal(resumed.calls.length,memory.MEMORY_CATEGORIES.length-3);assert.equal(resumed.runtime.view().job.apiCallsTotal,memory.MEMORY_CATEGORIES.length+1);assert.equal(resumed.runtime.view().coverage.pendingMessages,0);
});
test('editing a source invalidates cached category extraction instead of reusing old quoted facts',async()=>{
 let attempts=0;const f=fixture({settings:{memorySummaryStrategy:'categories'},respond:prompt=>{if(++attempts===3)throw Error('offline');return simpleMemoryResponse(prompt);}});
 await f.runtime.open();assert.equal(await f.runtime.run(),false);f.context.chat[0].mes='Nova met Cora in a DIFFERENT scene.';
 f.setResponder(simpleMemoryResponse);await f.runtime.observe();assert.equal(await f.runtime.run({retry:true}),true);
 assert.equal(f.calls.length,3+memory.MEMORY_CATEGORIES.length);
});
test('typed quotes, speaker, priority and unresolved commitments are retrieved under the token budget',async()=>{
 const f=fixture({respond:prompt=>{
  const source=JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1]).at(-1);
  return JSON.stringify({summary:'A promise was made.',recap:'Cora intends to return.',events:[{title:'River promise',detail:'Cora promised to return.',kind:'Plan',category:'relations',importance:'High',status:'Active',speaker:'Cora',quote:'Cora met Nova',sourceKeys:[source.segmentKey],evidence:'Cora met Nova'}]});
 }});await f.runtime.open();assert.equal(await f.runtime.run(),true);const fact=f.runtime.view().facts[0];assert.equal(fact.quote,'Cora met Nova');assert.equal(fact.category,'relations');
 const library=f.data.get('card:cora'),count=text=>Math.ceil(text.length/3);
 const chosen=await memory.memoryPromptSelection(library,['first'],'unrelated topic',f.settings,count);assert.match(chosen.references,/River promise/);assert.match(chosen.references,/"quote":"Cora met Nova"/);
 assert(await count(chosen.references)<=f.settings.memoryRetrievalBudget);
 const next={...structuredClone(library.chapters[0]),id:'resolved',parentId:library.chapters[0].id,parentRevision:1,events:[{...fact,status:'Resolved'}]};library.chapters.push(next);
 const index=memory.memoryFactIndex(library,['first']);assert.equal(index.length,1);assert.equal(index[0].status,'Resolved');
 const resolved=await memory.memoryPromptSelection(library,['first'],'River promise',f.settings,count,[fact]);
 assert.match(resolved.references,/"status":"Resolved"/);assert.doesNotMatch(resolved.references,/"status":"Active"/);
});
function fixture(options = {}) {
    const data = options.data || new Map(), notices = [], phases = [], calls = [], storageCalls = [], settings = {...config(),...options.settings};
    const state = {player:{name:'Nova'},location:{place:'River'},worldClock:{day:7,time:'23:00'},progression:{currency:{gold:6,silver:0,copper:120}},quests:[],npcs:[],social:{},storyMemories:[],storyAgenda:[]};
    const context = {owner:'card:cora',chatId:'first',chatMetadata:{},chat:[{is_user:true,name:'Nova',mes:'I went fishing at the river at night.'},{is_user:false,name:'Cora',mes:'Cora met Nova at the river that night. It was their first meeting.'}],
        getCurrentChatId(){return this.chatId;},getTokenCountAsync:async value => Math.ceil(value.length / 3),extensionSettings:{}};
    let responder = options.respond || (prompt => {
        const batch = JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1]);
        return JSON.stringify({summary:'Nova met Cora while fishing at the river at night.',recap:'Nova first met Cora while fishing by the river at night.',events:[{
            title:'First meeting with Cora',detail:'Nova met Cora while fishing at the river at night.',kind:'Event',people:['Nova','Cora','คอร่า'],places:['River','แม่น้ำ'],keywords:['fishing','ตกปลา','กลางคืน'],knownBy:['Nova','Cora'],whenText:'Day 7, night',sourceKeys:[batch.at(-1).segmentKey],evidence:batch.at(-1).text.slice(0,100),
        }]});
    });
    const store = {get:async owner => {storageCalls.push('get');return data.has(owner) ? structuredClone(data.get(owner)) : null;},put:async(owner,value) => { storageCalls.push('put');if(options.failSave?.(value))throw Error('MEMORY_STORAGE_WRITE_FAILED'); data.set(owner,structuredClone(value)); }};
    const runtime = createMemorySummaries({context:()=>context,owner:ctx=>ctx.owner,settings:()=>settings,state:()=>state,visible:value=>value.replace(/<!--[^]*?-->/g,''),scene:()=>({day:7,time:'23:00',location:'River'}),store,
        notify:(type,message)=>notices.push({type,message}),changed:view=>phases.push(view.job.status),parse:JSON.parse,timeout:Object.hasOwn(options,'timeout') ? options.timeout : 100,
        saveMetadata:async()=>options.metadataFail ? false : true,isGenerating:()=>options.generating?.() || false,continuity:options.continuity || (()=>{}),
        request:async(ctx,prompt,profile,signal)=>{calls.push({prompt,profile,signal});return responder(prompt,signal);}});
    return {runtime,data,notices,phases,calls,storageCalls,context,state,settings,setResponder:value=>{responder=value;}};
}

test('disabled startup performs no archive access, capture, API request or prompt injection',async()=>{
    const f=fixture({settings:{enableMemorySummaries:false}});
    assert.equal(await f.runtime.open(),null);
    assert.equal(await f.runtime.capture({force:true}),false);
    assert.equal(await f.runtime.observe({auto:true,forceCapture:true}),false);
    assert.equal(await f.runtime.run({prepare:true}),false);
    assert.equal(await f.runtime.preparePrompt(),'');assert.equal(f.runtime.prompt(),'');
    assert.equal(await f.runtime.import(memory.emptyMemoryLibrary('card:cora')),false);
    await assert.rejects(f.runtime.export(),/MEMORY_DISABLED/);
    assert.deepEqual(f.storageCalls,[]);assert.deepEqual(f.calls,[]);assert.deepEqual(f.notices,[]);
    assert.equal(f.runtime.view().job.status,'disabled');assert.equal(f.runtime.isBusy(),false);
    delete f.settings.enableMemorySummaries;
    assert.equal(await f.runtime.open(),null);assert.deepEqual(f.storageCalls,[]);
});

test('pause preserves the same archive and re-enable captures the current chat deliberately',async()=>{
    const f=fixture();await f.runtime.open();assert.equal(await f.runtime.run(),true);
    const archive=structuredClone(f.data.get('card:cora')),writes=f.storageCalls.length;
    assert.match(f.runtime.prompt(),/first met Cora/);
    f.settings.enableMemorySummaries=false;f.runtime.pause();
    f.context.chat.push({is_user:false,name:'Cora',mes:'Cora returned to the river after sunrise.'});
    assert.equal(await f.runtime.observe({auto:true}),false);assert.equal(await f.runtime.run(),false);
    assert.equal(f.runtime.prompt(),'');assert.equal(f.runtime.continuityLink(),null);
    assert.equal(f.storageCalls.length,writes);assert.deepEqual(f.data.get('card:cora'),archive);
    f.settings.enableMemorySummaries=true;await f.runtime.open();
    assert.equal(f.runtime.view().chapters.length,1);assert.equal(f.runtime.view().coverage.messages,3);
    f.runtime.search('Cora');assert(f.runtime.view().results.some(hit=>hit.type==='event'));
    assert.match(f.runtime.prompt(),/first met Cora/);
    assert.equal(f.data.get('card:cora').chapters[0].id,archive.chapters[0].id);
});

test('disabling during an API request invalidates the response even after a new job is enabled',async()=>{
    let release;const f=fixture({respond:()=>new Promise(resolve=>{release=resolve;})});
    await f.runtime.open();const oldJob=f.runtime.run({prepare:true});
    while(!release)await new Promise(resolve=>setTimeout(resolve,1));
    f.settings.enableMemorySummaries=false;f.runtime.pause();
    assert(f.calls[0].signal.aborted);assert.equal(f.runtime.isBusy(),false);assert.equal(f.runtime.prompt(),'');
    const savedWhileOff=structuredClone(f.data.get('card:cora'));assert.equal(await oldJob,false);
    assert.deepEqual(f.data.get('card:cora'),savedWhileOff);assert(!f.context.chatMetadata[memory.MEMORY_LINK_KEY]);
    f.settings.enableMemorySummaries=true;await f.runtime.open();
    f.setResponder(()=>JSON.stringify({summary:'Current enabled summary.',recap:'Current enabled recap.',events:[]}));
    assert.equal(await f.runtime.run(),true);
    const current=structuredClone(f.data.get('card:cora'));
    release(JSON.stringify({summary:'Stale disabled summary.',recap:'Stale disabled recap.',events:[]}));
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.deepEqual(f.data.get('card:cora'),current);
    assert.equal(f.runtime.view().chapters[0].summary,'Current enabled summary.');
    assert.equal(f.notices.filter(notice=>notice.type==='success').length,1);
    assert(!f.context.chatMetadata[memory.MEMORY_LINK_KEY]);
});

test('disabling during async result token counting cannot apply or save a stale chapter',async()=>{
    const f=fixture();await f.runtime.open();
    let release;
    f.context.getTokenCountAsync=value=>value.startsWith('{"summary":')
        ? new Promise(resolve=>{release=resolve;}) : Promise.resolve(Math.ceil(value.length/3));
    const pending=f.runtime.run();while(!release)await new Promise(resolve=>setTimeout(resolve,1));
    f.settings.enableMemorySummaries=false;f.runtime.pause();
    const saved=structuredClone(f.data.get('card:cora'));release(20);
    assert.equal(await pending,false);assert.deepEqual(f.data.get('card:cora'),saved);
    f.context.getTokenCountAsync=async value=>Math.ceil(value.length/3);
    f.settings.enableMemorySummaries=true;await f.runtime.open();
    assert.equal(f.runtime.view().chapters.length,0);assert.equal(await f.runtime.run(),true);
    assert.equal(f.runtime.view().chapters.length,1);
});

test('a paused prompt build cannot overwrite the prompt from a newly enabled lifecycle',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();
    f.context.chat.push({is_user:true,name:'Nova',mes:'Tell me about Cora and our first river encounter.'});
    let release,block=true;
    f.context.getTokenCountAsync=value=>{
        if(block){block=false;return new Promise(resolve=>{release=resolve;});}
        return Promise.resolve(Math.ceil(value.length/3));
    };
    const pending=f.runtime.preparePrompt();while(!release)await new Promise(resolve=>setTimeout(resolve,1));
    f.settings.enableMemorySummaries=false;f.runtime.pause();assert.equal(f.runtime.prompt(),'');
    f.settings.enableMemorySummaries=true;await f.runtime.open();const current=f.runtime.prompt();
    assert.match(current,/first met Cora/);release(20);
    assert.equal(await pending,'');assert.equal(f.runtime.prompt(),current);
});

test('archive preserves complete originals, long message segments and replaced/deleted variants',()=>{
    const library = memory.emptyMemoryLibrary('card:cora'), long = 'แม่น้ำกลางคืน'.repeat(3000);
    const messages = [{is_user:false,name:'Cora',mes:long + '<!-- tracker -->'}];
    memory.captureMemoryChat(library,{chatId:'chat',messages,visible:value=>value.replace(/<!--[^]*?-->/g,'')});
    assert.equal(library.chats[0].messages[0].raw,messages[0].mes);
    assert.equal(memory.memorySegments(library,'chat').map(source=>source.text).join(''),long);
    messages[0].mes = 'A different selected swipe.';
    memory.captureMemoryChat(library,{chatId:'chat',messages});
    assert.equal(library.chats[0].messages[0].variants[0].raw,long + '<!-- tracker -->');
    memory.captureMemoryChat(library,{chatId:'chat',messages:[]});
    assert(library.chats[0].removed.some(source=>source.text==='A different selected swipe.'));
});

test('summary rejects invented source references or quotes, and distinguishes plans from events',()=>{
    const batch=[{segmentKey:'1.0',text:'Cora plans to go fishing tomorrow.'}];
    const value={summary:'A planned outing.',recap:'Cora has not gone yet.',events:[{title:'Planned fishing',detail:'Cora intends to fish.',kind:'Plan',people:['Cora'],places:[],keywords:['fishing'],knownBy:[],sourceKeys:['1.0'],evidence:'plans to go fishing tomorrow.'}]};
    assert.equal(memory.validateMemorySummary(value,batch).events[0].kind,'Plan');
    assert.throws(()=>memory.validateMemorySummary({...value,events:[{...value.events[0],sourceKeys:['99.0']}]},batch),/EVIDENCE/);
    assert.throws(()=>memory.validateMemorySummary({...value,events:[{...value.events[0],evidence:'Cora already caught a fish.'}]},batch),/EVIDENCE/);
});

test('opening archives locally without an AI request; summary reports progress and never modifies money',async()=>{
    const f=fixture();await f.runtime.open();assert.equal(f.calls.length,0);
    const before=structuredClone(f.state);assert.equal(await f.runtime.run(),true);
    assert.equal(f.calls.length,1);assert.deepEqual(f.state,before);
    for(const phase of ['waiting','summarizing','validating','saving','ready'])assert(f.phases.includes(phase),phase);
    assert(f.notices.some(notice=>notice.type==='success'));assert.equal(f.runtime.view().coverage.pendingSegments,0);
    assert.equal(f.data.get('card:cora').chats[0].messages.length,2);
});

test('Thai names, places and minor original incidents are searchable only inside linked ancestry',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();
    f.runtime.search('คอร่า แม่น้ำ ตกปลา');assert(f.runtime.view().results.some(hit=>hit.type==='event'));
    f.context.chatId='alternate';f.context.chatMetadata={};f.context.chat=[{is_user:true,mes:'A different story branch.'}];await f.runtime.open();
    f.runtime.search('Cora fishing');assert.equal(f.runtime.view().results.length,0);
    await f.runtime.linkChat('first',true);f.runtime.search('Cora fishing');assert(f.runtime.view().results.length>0);
    await f.runtime.linkChat('first',false);assert.equal(f.runtime.view().results.length,0);
});

test('prepared handoff restores searchable meeting history in a new chat and survives reload',async()=>{
    const f=fixture();await f.runtime.open();assert.equal(await f.runtime.run({prepare:true}),true);
    const link=structuredClone(f.context.chatMetadata[memory.MEMORY_LINK_KEY]);assert(link.capsuleId);assert(link.ancestry.includes('first'));
    f.context.chatId='next';f.context.chatMetadata={[memory.MEMORY_LINK_KEY]:link};f.context.chat=[{is_user:true,mes:'Cora, remember our night fishing at the river?'}];await f.runtime.open();
    const prompt=await f.runtime.preparePrompt();assert.match(prompt,/first met Cora/);assert.match(prompt,/never replay rewards/);assert.match(prompt,/grants no NPC knowledge/);
    f.runtime.search('Cora');assert(f.runtime.view().results.some(hit=>hit.chatId==='first'));
    await f.runtime.open();assert.match(f.runtime.prompt(),/first met Cora/);
    assert.equal(f.state.progression.currency.gold,6);
});

test('invalid API response retains previous summaries and explicit retry recovers',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();const prior=f.runtime.view().chapters[0].summary;
    f.context.chat.push({is_user:false,name:'Cora',mes:'A new conversation.'});await f.runtime.observe();f.setResponder(()=>'{"summary":');
    assert.equal(await f.runtime.run(),false);assert.equal(f.runtime.view().job.status,'error');assert.equal(f.runtime.view().chapters[0].summary,prior);
    assert(f.notices.some(notice=>notice.type==='error'));f.setResponder(prompt=>{
        const source=JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1])[0];return JSON.stringify({summary:'New conversation.',recap:'Cora met Nova and later spoke again.',events:[{title:'Later conversation',detail:'Cora spoke again.',kind:'Event',people:['Cora'],places:[],keywords:[],knownBy:['Nova'],sourceKeys:[source.segmentKey],evidence:source.text}]});
    });assert.equal(await f.runtime.run(),true);assert.equal(f.runtime.view().coverage.pendingSegments,0);
});

test('editing or swiping invalidates affected summaries and all dependent recaps',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();
    f.context.chat.push({is_user:false,name:'Cora',mes:'Cora returned to the same river.'});await f.runtime.observe();await f.runtime.run();
    f.context.chat[1].mes='Nova did not meet Cora that night.';await f.runtime.observe();
    assert.equal(f.runtime.view().coverage.chapters,0);assert.equal(f.runtime.view().coverage.stale,2);
    f.runtime.search('Cora');assert(f.runtime.view().results.every(hit=>hit.type==='source'));
    assert.doesNotMatch(f.runtime.prompt(),/OVERVIEW:\nNova first met/);
    assert(f.data.get('card:cora').chats[0].messages[1].variants.length>0);
});

test('manual summary editing retains a version and invalidates dependent summaries',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();f.context.chat.push({is_user:false,mes:'Cora told Nova a story.'});await f.runtime.observe();await f.runtime.run();
    const first=f.runtime.view().chapters.at(-1);await f.runtime.editChapter(first.id,'Corrected chapter.','The player corrected the first meeting.');
    const changed=f.runtime.view().chapters.find(chapter=>chapter.id===first.id);assert.equal(changed.versions.length,1);assert.equal(changed.revision,2);
    assert.equal(f.runtime.view().coverage.stale,1);assert.match(f.runtime.prompt(),/player corrected/);
});

test('source changing during a request cannot commit the stale AI result',async()=>{
    let release;const f=fixture({respond:()=>new Promise(resolve=>{release=resolve;})});await f.runtime.open();const pending=f.runtime.run();
    while(!release)await new Promise(resolve=>setTimeout(resolve,1));f.context.chat[1].mes='A replaced message.';
    release(JSON.stringify({summary:'Stale',recap:'Stale',events:[]}));assert.equal(await pending,false);
    assert.equal(f.runtime.view().chapters.length,0);assert.equal(f.runtime.view().job.code,'MEMORY_CHANGED');
});

test('cancel and chat switch discard delayed responses without contaminating another chat',async()=>{
    let release;const f=fixture({respond:()=>new Promise(resolve=>{release=resolve;})});await f.runtime.open();const pending=f.runtime.run();
    while(!release)await new Promise(resolve=>setTimeout(resolve,1));f.context.chatId='other';f.context.chatMetadata={};f.context.chat=[{is_user:true,mes:'Another chat.'}];await f.runtime.open();
    assert.equal(await pending,false);release(JSON.stringify({summary:'Old',recap:'Old',events:[]}));
    assert.equal(f.runtime.view().chapters.length,0);assert.equal(f.data.get('card:cora').chapters.length,0);
});

test('timeout, storage failure and metadata failure produce actionable failure instead of success',async()=>{
    const timeout=fixture({respond:()=>new Promise(()=>{}),timeout:10});await timeout.runtime.open();assert.equal(await timeout.runtime.run(),false);assert.equal(timeout.runtime.view().job.code,'MEMORY_API_TIMEOUT');
    assert.equal(timeout.runtime.view().job.failedStage,'summarizing');assert.equal(timeout.calls.length,1);
    let fail=false;const storage=fixture({failSave:()=>fail});await storage.runtime.open();fail=true;assert.equal(await storage.runtime.run(),false);assert.equal(storage.runtime.view().job.code,'MEMORY_STORAGE_WRITE_FAILED');assert(!storage.notices.some(notice=>notice.type==='success'));
    const metadata=fixture({metadataFail:true});await metadata.runtime.open();assert.equal(await metadata.runtime.run({prepare:true}),false);assert.equal(metadata.runtime.view().job.code,'MEMORY_METADATA_SAVE_FAILED');
});

test('automatic summaries wait for interval and make only one batch request',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.observe({auto:true});assert.equal(f.calls.length,0);
    for(let i=0;i<5;i++)f.context.chat.push({is_user:false,name:'Cora',mes:'Cora: '+ 'A long chapter. '.repeat(2000)});
    await f.runtime.observe({auto:true});while(f.runtime.isBusy())await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(f.calls.length,1);assert(f.runtime.view().coverage.pendingSegments>0);assert.equal(f.runtime.view().job.status,'partial');
});

test('token budgets retain complete reference records and originals stay outside the prompt',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();const library=f.data.get('card:cora');
    const selection=await memory.memoryPromptSelection(library,['first'],'Cora fishing',{memorySummaryBudget:20,memoryRetrievalBudget:250},async value=>value.length);
    assert(selection.overview.length<=20);assert(selection.references.length<=250);
    for(const line of selection.references.split('\n').filter(Boolean))assert.doesNotThrow(()=>JSON.parse(line));
    const huge='UNRELATED_ARCHIVE_TOKEN'.repeat(1000);library.chats.push({id:'unlinked',messages:[{key:'0',text:huge,raw:huge,fingerprint:'old'}]});
    const safe=await memory.memoryPromptSelection(library,['first'],'Cora',f.settings,async value=>value.length/4);assert.doesNotMatch(safe.overview+safe.references,/UNRELATED_ARCHIVE_TOKEN/);
});

test('full backup roundtrip includes originals, rejects a different owner, and never overwrites newer local history',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();const backup=JSON.parse(await f.runtime.export());assert.equal(backup.chats[0].messages[1].raw,f.context.chat[1].mes);
    f.context.chat[1].mes='A newer local version.';await f.runtime.observe();assert.equal(await f.runtime.import(backup),true);assert.equal(f.runtime.source('first','1').raw,'A newer local version.');
    await assert.rejects(f.runtime.import({...backup,owner:'another-character'}),/INVALID_ARCHIVE/);
});

test('API adapter uses standalone generation or a chosen profile without changing the main connection',async()=>{
    let args;const chat=[{is_user:true,mes:'Continue our story.'}],current={chat,generateRaw:async value=>{args=value;return '{}';}};
    await requestMemorySummary(current,'SOURCE','','signal','compact');assert.equal(args.prompt,'SOURCE');assert.equal(args.trimNames,false);
    assert.equal(args.responseLength,2400);assert.deepEqual(current.chat,chat);assert(!Object.hasOwn(args,'api'));assert(!Object.hasOwn(args,'quietToLoud'));
    assert(!Object.hasOwn(args,'signal'));assert(!Object.hasOwn(args,'externalAbortSignal'));
    let sent;const profile={extensionSettings:{connectionManager:{profiles:[{id:'summary',name:'Summary'}]}},ConnectionManagerRequestService:{sendRequest:async(...values)=>{sent=values;return {content:'{}'};}}};
    assert.equal(await requestMemorySummary(profile,'SOURCE','summary',null),'{}');assert.equal(sent[0],'summary');assert.equal(sent[2],2400);assert.equal(sent[3].includePreset,true);assert.equal(sent[4],undefined);
    await assert.rejects(requestMemorySummary(profile,'SOURCE','missing',null),/PROFILE_UNAVAILABLE/);
});

test('default adapter uses native preset generation, including WI/AN, without raw fallback or connection changes',async()=>{
    let args,release,raw=0;
    const context={chat:[{mes:'Original story'}],generateRaw:()=>{raw++;},generateQuietPrompt:options=>{args=options;return new Promise(resolve=>{release=resolve;});}};
    const pending=requestMemorySummary(context,'SUMMARY TASK','',null);
    assert.equal(memorySummaryNativeGenerationActive(),true);
    assert.deepEqual(args,{quietPrompt:'SUMMARY TASK',skipWIAN:false,responseLength:2400,removeReasoning:false});
    release('{"summary":"done"}');assert.equal(await pending,'{"summary":"done"}');
    assert.equal(memorySummaryNativeGenerationActive(),false);assert.equal(raw,0);assert.equal(context.chat.length,1);
    context.generateQuietPrompt=async()=>{throw Error('HTTP 404');};
    await assert.rejects(requestMemorySummary(context,'TASK','',null),/404/);
    assert.equal(memorySummaryNativeGenerationActive(),false);assert.equal(raw,0);
    await assert.rejects(requestMemorySummary({generateRaw:()=>{raw++;}},'TASK','',null),/PRESET_UNAVAILABLE/);
    assert.equal(raw,0);
});

test('cancelled native requests release the prompt guard even when the provider never finishes',async()=>{
    const controller=new AbortController();let release;
    const context={generateQuietPrompt:()=>new Promise(resolve=>{release=resolve;})};
    const pending=requestMemorySummary(context,'TASK','',controller.signal);assert.equal(memorySummaryNativeGenerationActive(),true);
    controller.abort();assert.equal(memorySummaryNativeGenerationActive(),false);
    release('Late reply');await pending;assert.equal(memorySummaryNativeGenerationActive(),false);
    await assert.rejects(requestMemorySummary(context,'TASK','',controller.signal),/CANCELLED/);
    const literal='{"summary":"Keep <think>the note</think>","recap":"Note saved","events":[]}';
    assert.equal(cleanMemorySummaryResponse(literal,{removeReasoningFromString:()=>''}),literal);
});

test('local repairs resolve original message IDs and omitted optional metadata only with a real quote',()=>{
    const batch=[{key:'7',segmentKey:'7.1',text:'คอร่าเดินไปตกปลาที่แม่น้ำตอนกลางคืน'}];
    const input={summary:'พบคอร่า',recap:'คอร่าตกปลาตอนกลางคืน',events:[{title:'พบคอร่า',detail:'พบกันที่แม่น้ำ',kind:'event',sourceKeys:'7',evidence:'“คอร่าเดินไปตกปลา”',people:'คอร่า'}]};
    const repaired=memory.repairMemorySummary(input,batch);
    assert.deepEqual(repaired.events[0].sourceKeys,['7.1']);assert.deepEqual(repaired.events[0].people,['คอร่า']);assert.deepEqual(repaired.events[0].knownBy,[]);
    assert.equal(repaired.events[0].evidence,'คอร่าเดินไปตกปลา');assert.equal(repaired.evidenceReport.repairedEvents,1);
    assert.equal(input.events[0].kind,'event');assert.equal(input.events[0].sourceKeys,'7');
    const unsupported=memory.repairMemorySummary({...input,events:[{...input.events[0],evidence:'คอร่าไม่ได้ไปตกปลา'}]},batch);
    assert.equal(unsupported.events.length,0);assert.equal(unsupported.evidenceReport.droppedEvents,1);
    const wrongId=memory.repairMemorySummary({...input,events:[{...input.events[0],sourceKeys:['99']}]},batch);
    assert.equal(wrongId.events.length,0);
    assert.throws(()=>memory.repairMemorySummary({...input,recap:''},batch),/INVALID_SUMMARY/);
});

test('one unsupported event does not discard good events, the chapter, originals, or later batches',async()=>{
    const f=fixture({settings:{memorySummaryBatchSize:2},respond:prompt=>{
        const value=JSON.parse(simpleMemoryResponse(prompt));
        const source=JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1])[0];
        value.events=[{title:'Recorded source',detail:'An established event.',kind:'Event',people:[],places:[],keywords:[],knownBy:[],sourceKeys:[source.segmentKey],evidence:source.text},
            {title:'Unsupported interpretation',detail:'An invented event.',kind:'Event',people:[],places:[],keywords:[],knownBy:[],sourceKeys:[source.segmentKey],evidence:'THIS QUOTE NEVER OCCURRED'}];
        return JSON.stringify(value);
    }});
    setBacklog(f,5);await f.runtime.open();const originals=structuredClone(f.context.chat);
    assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,3);assert.equal(f.runtime.view().coverage.pendingMessages,0);
    assert.equal(f.runtime.view().job.droppedEvents,3);assert.equal(f.runtime.view().job.status,'ready');
    const saved=f.data.get('card:cora');assert.equal(saved.chapters.length,3);assert.equal(saved.chats[0].messages.length,5);
    assert(saved.chapters.every(chapter=>chapter.events.length===1 && chapter.evidenceReport.droppedEvents===1));
    assert.deepEqual(f.context.chat,originals);assert(f.notices.some(notice=>notice.type==='warning' && /unverified/.test(notice.message)));
    f.runtime.search('THIS QUOTE NEVER OCCURRED');assert.equal(f.runtime.view().results.length,0);
    const markup={innerHTML:'',querySelectorAll:()=>[]};renderMemorySummaries(markup,f.runtime.view(),[]);assert.match(markup.innerHTML,/data-memory-evidence-warning/);
});

test('all unusable event citations leave originals searchable, without inventing evidence or paid repairs',async()=>{
    const f=fixture({respond:()=>JSON.stringify({summary:'A source was archived.',recap:'A conversation happened.',events:[{title:'bad',detail:'bad',kind:'Event',evidence:'not in sources',sourceKeys:['unknown']}]})});
    await f.runtime.open();assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,1);
    assert.equal(f.runtime.view().chapters[0].events.length,0);assert.equal(f.runtime.view().job.droppedEvents,1);
    f.runtime.search('fishing');assert(f.runtime.view().results.some(hit=>hit.type==='source'));
    await f.runtime.run();assert.equal(f.runtime.view().job.droppedEvents,0);assert.equal(f.calls.length,1);
});

test('API diagnostics separate missing models, quota, permissions, context overflow and offline connections',()=>{
    for(const [input,pattern] of [[{status:404},/not found/],['Not Found',/not found/],[{code:'model_not_found'},/not found/],[Error('HTTP 429'),/Quota/],[{response:{status:401}},/authorization/],[Error('context length exceeded'),/exceeds/],[{status:503},/unavailable/],[Error('Failed to fetch'),/reach/]]) {
        const diagnosed=diagnoseMemoryApiFailure(input);assert.equal(diagnosed.message,'MEMORY_API_REQUEST_FAILED');assert.match(memoryJobMessage(diagnosed),pattern);
        assert.notEqual(memoryJobMessage(diagnosed,'th'),memoryJobMessage(diagnosed));
    }
});

test('empty and malformed responses stop once; explicit retry uses smaller batches and preserves preference',async()=>{
    for(const bad of ['',undefined,'{"summary":"truncated']) {
        const f=fixture({respond:()=>bad});setBacklog(f,12);await f.runtime.open();assert.equal(await f.runtime.run(),false);
        assert.equal(f.calls.length,1);assert.equal(f.runtime.view().chapters.length,0);assert.equal(f.runtime.view().job.recommendedBatchSize,5);
        f.setResponder(simpleMemoryResponse);assert.equal(await f.runtime.run({retry:true}),true);assert.equal(f.settings.memorySummaryBatchSize,10);
        assert.deepEqual(f.calls.slice(1).map(call=>new Set(JSON.parse(call.prompt.split('SOURCE SEGMENTS: ')[1]).map(source=>source.key)).size),[5,5,2]);
    }
});

test('preparing with character continuity off keeps archives and explicitly warns before changing chat',async()=>{
    const f=fixture({settings:{autoContinuity:false}});await f.runtime.open();assert.equal(await f.runtime.run({prepare:true}),true);
    assert.equal(f.runtime.view().job.rpgHandoff,'disabled');assert.equal(f.data.get('card:cora').capsules.length,1);
    assert(f.notices.some(notice=>/continuity is off/.test(notice.message)));
    const panel={innerHTML:'',querySelectorAll:()=>[]};renderMemorySummaries(panel,f.runtime.view(),[]);assert.match(panel.innerHTML,/data-memory-rpg-handoff-warning/);
});

test('preparing reports a failed RPG snapshot separately while keeping the saved archive and handoff link',async()=>{
    let attempts=0;const f=fixture({settings:{autoContinuity:true},continuity:()=>{attempts++;return false;}});
    await f.runtime.open();assert.equal(await f.runtime.run({prepare:true}),true);assert.equal(attempts,1);
    assert.equal(f.runtime.view().job.status,'ready');assert.equal(f.runtime.view().job.rpgHandoff,'failed');
    assert.equal(f.data.get('card:cora').capsules.length,1);assert(f.context.chatMetadata[memory.MEMORY_LINK_KEY].capsuleId);
    assert(f.notices.some(notice=>/Export state/.test(notice.message)));
    const panel={innerHTML:'',querySelectorAll:()=>[]};renderMemorySummaries(panel,f.runtime.view(),[]);assert.match(panel.innerHTML,/Export state as a backup/);
});

test('native raw reasoning is removed before parsing while literal summary tags and evidence remain intact',async()=>{
    const literal=JSON.stringify({summary:'Cora wrote <think>stay calm</think> in her notebook.',recap:'Cora kept her note.',events:[]});
    assert.equal(cleanMemorySummaryResponse(literal),literal);
    for(const tag of ['think','thinking','analysis'])assert.equal(cleanMemorySummaryResponse(`<${tag}>{"summary":"wrong reasoning object"}</${tag}>\n${literal}`),literal);
    assert.equal(cleanMemorySummaryResponse(`<think>unfinished\n${literal}`),`<think>unfinished\n${literal}`);
    assert.equal(cleanMemorySummaryResponse(`[[custom reasoning]]${literal}`,{removeReasoningFromString:value=>value.replace('[[custom reasoning]]','')}),literal);
    const f=fixture({respond:prompt=>`<think>{"summary":"not the answer"}</think>\n${simpleMemoryResponse(prompt)}`});
    await f.runtime.open();assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,1);
    assert.equal(f.runtime.view().chapters[0].recap,'The story continued with the saved events.');
});

test('native current-connection cancellation discards late raw results without stopping the main chat or appending messages',async()=>{
    let release,stops=0;const f=fixture();
    f.context.eventSource={emit:()=>{stops++;}};
    f.context.generateRaw=({prompt})=>new Promise(resolve=>{release=()=>resolve(simpleMemoryResponse(prompt));});
    f.setResponder(prompt=>requestMemorySummary(f.context,prompt,'',null,'compact'));
    await f.runtime.open();const original=structuredClone(f.context.chat),pending=f.runtime.run();
    while(!release)await new Promise(resolve=>setTimeout(resolve,1));
    f.runtime.cancel();assert.equal(await pending,false);assert.equal(stops,0);assert.deepEqual(f.context.chat,original);
    assert.equal(f.data.get('card:cora').chapters.length,0);release();await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(f.data.get('card:cora').chapters.length,0);assert.equal(stops,0);assert.deepEqual(f.context.chat,original);
    assert.equal(f.calls.length,1);
});

test('summary UI escapes sources and errors, exposes job progress, retry and separate token budgets',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();f.runtime.search('Cora');f.runtime.previewSource('first','1');const view=f.runtime.view();view.job.status='error';view.job.error='<img src=x onerror=alert(1)>';
    view.preview.text='<script>alert(1)</script>';const panel={innerHTML:''};renderMemorySummaries(panel,view,[{id:'s',name:'<unsafe profile>'}]);
    assert.match(panel.innerHTML,/aria-live="polite"/);assert.match(panel.innerHTML,/memory-summary-retry/);assert.match(panel.innerHTML,/memorySummaryInputBudget/);assert.match(panel.innerHTML,/&lt;script&gt;/);assert.doesNotMatch(panel.innerHTML,/<script>|<img src=x/);
    renderMemorySummaries(panel,{...view,settings:{...view.settings,language:'th'}});assert.match(panel.innerHTML,/งานความจำไม่สำเร็จ/);assert.match(panel.innerHTML,/เตรียมความจำสำหรับแชตใหม่/);
});

test('preparing also summarizes unfinished linked ancestor chats instead of claiming a complete handoff',async()=>{
    const f=fixture();await f.runtime.open();
    f.context.chatId='next';f.context.chatMetadata={[memory.MEMORY_LINK_KEY]:{owner:'card:cora',ancestry:['first']}};f.context.chat=[{is_user:true,mes:'Continue the story.'}];await f.runtime.open();
    assert(f.runtime.view().coverage.linkedPendingSegments>f.runtime.view().coverage.pendingSegments);
    assert.equal(await f.runtime.run({prepare:true}),true);assert.equal(f.runtime.view().coverage.linkedPendingSegments,0);
    assert(f.data.get('card:cora').chapters.some(chapter=>chapter.chatId==='first'));
    assert(f.data.get('card:cora').chapters.some(chapter=>chapter.chatId==='next'));
});

test('forced memories cannot inject an obsolete version after editing or swiping its source',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();f.runtime.search('Cora');const event=f.runtime.view().results.find(hit=>hit.type==='event');await f.runtime.force(event.id);
    const fingerprint=event.sources[0].fingerprint;f.context.chat[1].mes='Nobody met anyone at the river.';await f.runtime.observe();
    assert.doesNotMatch(f.runtime.prompt(),/"title":"First meeting with Cora"/);
    assert.match(f.runtime.source('first','1',fingerprint).text,/first meeting/);assert.equal(f.runtime.source('first','1',fingerprint).current,false);
    f.context.chat.splice(1,1);await f.runtime.observe();assert.match(f.runtime.source('first','1',fingerprint).text,/first meeting/);
});

test('reloading an unfinished job exposes interrupted status and never silently calls the API',async()=>{
    const f=fixture();await f.runtime.open();const saved=f.data.get('card:cora');saved.jobs.first={status:'summarizing',completed:0,total:1};f.data.set('card:cora',saved);
    const reloaded=fixture({data:f.data});await reloaded.runtime.open();assert.equal(reloaded.runtime.view().job.status,'interrupted');assert.equal(reloaded.calls.length,0);
});

test('generation-time refresh captures silent edits without an extra summarization API request',async()=>{
    let generating=false;const f=fixture({generating:()=>generating});await f.runtime.open();await f.runtime.run();
    f.context.chat[1].mes='Cora did not meet Nova.';generating=true;await f.runtime.observe({forceCapture:true});
    assert.equal(f.calls.length,1);assert.equal(f.runtime.view().coverage.stale,1);assert.doesNotMatch(f.runtime.prompt(),/OVERVIEW:\nNova first met/);
});

test('manual corrections supersede automatic event interpretations while preserving original evidence',async()=>{
    const f=fixture();await f.runtime.open();await f.runtime.run();const chapter=f.runtime.view().chapters[0];
    await f.runtime.editChapter(chapter.id,'The meeting was misunderstood.','The player corrected the event: Nova only heard about Cora.');
    f.runtime.search('Cora');assert(f.runtime.view().results.every(hit=>hit.type==='source'));assert.match(f.runtime.prompt(),/only heard about Cora/);
    assert.equal(f.data.get('card:cora').chapters[0].events.length,1);
});

test('chat IDs matching inherited property names receive isolated durable job records',async()=>{
    for(const id of ['__proto__','constructor']){
        const f=fixture();f.context.chatId=id;await f.runtime.open();assert.equal(await f.runtime.run(),true);
        assert.equal(f.runtime.view().job.status,'ready');assert(Object.hasOwn(f.data.get('card:cora').jobs,id));
    }
});

test('retrieval selects the matching incident inside a long original rather than only its beginning',async()=>{
    const f=fixture();f.context.chat[1].mes='Unrelated   background.\n\n'.repeat(1000)+'Cora met Nova while night fishing at the river.';await f.runtime.open();
    const selected=await f.runtime.preparePrompt();assert.match(selected,/Cora met Nova while night fishing/);assert(!selected.includes(f.context.chat[1].mes));
    const excerpt=memory.memorySnippet(f.context.chat[1].mes,'Cora river fishing',400);assert.match(excerpt,/night fishing/);assert(excerpt.length<=402);
});

const simpleMemoryResponse = prompt => {
    const batch=JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1]);
    return JSON.stringify({summary:`Saved ${batch.length} source segments.`,recap:'The story continued with the saved events.',events:[]});
};
function setBacklog(f,count) {
    f.context.chat=Array.from({length:count},(_,index)=>({is_user:index%2===0,name:index%2===0?'Nova':'Cora',mes:`Message ${index+1}: The party continued along the river.`}));
}

test('batch limits count original messages and allow a bounded configurable size',()=>{
    const library=memory.emptyMemoryLibrary('owner');
    memory.captureMemoryChat(library,{chatId:'chat',messages:Array.from({length:25},(_,i)=>({mes:`Message ${i}: `+'scene '.repeat(500)}))});
    const batch=memory.nextMemoryBatch(library,'chat',{maxChars:100000,maxMessages:5});
    assert.equal(new Set(batch.map(segment=>segment.key)).size,5);
    assert.equal(batch.length,10); // each original is stored as two segments
    assert.equal(memory.countMemoryBatches(memory.memorySegments(library,'chat'),{maxChars:100000,maxMessages:10}),3);
    assert.equal(memory.memoryCoverage(library,'chat').pendingMessages,25);
    assert.equal(memory.memoryCoverage(library,'chat').pendingSegments,50);
    for(const [input,expected] of [[undefined,5],[0,5],['bad',5],[5,5],[10.9,10],[1000,100],[1,1]])assert.equal(memory.normalizeMemoryBatchSize(input),expected);
});

test('manual backlog saves every ten messages and persists each completed checkpoint before the next API call',async()=>{
    let f;
    f=fixture({respond:prompt=>{
        const completed=f.calls.length-1;
        const archived=f.data.get('card:cora');
        assert.equal(archived.chapters.length,completed);
        assert.equal(archived.jobs.first.completed,completed);
        assert.equal(archived.jobs.first.processedMessages,completed*10);
        return simpleMemoryResponse(prompt);
    }});
    setBacklog(f,23);await f.runtime.open();assert.equal(await f.runtime.run(),true);
    assert.deepEqual(f.calls.map(call=>new Set(JSON.parse(call.prompt.split('SOURCE SEGMENTS: ')[1]).map(segment=>segment.key)).size),[10,10,3]);
    const view=f.runtime.view();assert.equal(view.job.completed,3);assert.equal(view.job.total,3);
    assert.equal(view.job.processedMessages,23);assert.equal(view.job.totalMessages,23);assert.equal(view.job.remainingMessages,0);
    assert.equal(view.job.savedChapters,3);assert.equal(view.coverage.pendingMessages,0);
    const sources=f.data.get('card:cora').chapters.flatMap(chapter=>chapter.sources.map(source=>source.segmentKey));
    assert.equal(sources.length,23);assert.equal(new Set(sources).size,23);
});

test('custom batches larger than ten messages are honored without exceeding source input limits',async()=>{
    const f=fixture({settings:{memorySummaryBatchSize:20},respond:simpleMemoryResponse});setBacklog(f,41);await f.runtime.open();
    assert.equal(await f.runtime.run(),true);
    assert.deepEqual(f.calls.map(call=>new Set(JSON.parse(call.prompt.split('SOURCE SEGMENTS: ')[1]).map(segment=>segment.key)).size),[20,20,1]);
    const long=fixture({settings:{memorySummaryBatchSize:100},respond:simpleMemoryResponse});
    long.context.chat=[{is_user:false,mes:'x'.repeat(25000)},{is_user:true,mes:'The next message.'}];await long.runtime.open();
    assert.equal(long.runtime.view().coverage.pendingMessages,2);assert.equal(long.runtime.view().coverage.pendingSegments,14);
    assert.equal(await long.runtime.run(),true);assert(long.calls.length>1);
    for(const call of long.calls){const batch=JSON.parse(call.prompt.split('SOURCE SEGMENTS: ')[1]);assert(batch.reduce((sum,source)=>sum+source.text.length,0)<=memory.MEMORY_BATCH_CHAR_LIMIT);}
    assert.equal(long.runtime.view().job.processedMessages,2);assert.equal(long.runtime.view().coverage.pendingMessages,0);
});

test('failed later batch leaves earlier chapters durable and retry resumes only uncovered messages',async()=>{
    let fail=true;
    const f=fixture({respond:prompt=>f.calls.length===2 && fail ? '{"summary":' : simpleMemoryResponse(prompt)});setBacklog(f,23);await f.runtime.open();
    assert.equal(await f.runtime.run(),false);
    assert.equal(f.runtime.view().job.completed,1);assert.equal(f.runtime.view().job.processedMessages,10);
    assert.equal(f.runtime.view().coverage.pendingMessages,13);assert.equal(f.data.get('card:cora').chapters.length,1);
    const saved=structuredClone(f.data.get('card:cora').chapters[0]);
    fail=false;assert.equal(await f.runtime.run(),true);
    assert.deepEqual(f.data.get('card:cora').chapters[0],saved);
    assert.deepEqual(f.calls.slice(2).map(call=>JSON.parse(call.prompt.split('SOURCE SEGMENTS: ')[1]).map(source=>source.key)),[
        Array.from({length:10},(_,i)=>String(i+10)),['20','21','22']]);
    assert.equal(f.data.get('card:cora').chapters.length,3);assert.equal(f.runtime.view().job.savedChapters,3);
});

test('a rejected chapter write rolls back uncovered sources in RAM and the error checkpoint',async()=>{
    let fail=true;
    const f=fixture({respond:simpleMemoryResponse,failSave:value=>{
        if(fail && value.chapters.length===2 && value.jobs.first.status==='saving'){fail=false;return true;}
        return false;
    }});setBacklog(f,23);await f.runtime.open();assert.equal(await f.runtime.run(),false);
    assert.equal(f.runtime.view().job.code,'MEMORY_STORAGE_WRITE_FAILED');
    assert.equal(f.runtime.view().coverage.pendingMessages,13);assert.equal(f.runtime.view().chapters.length,1);
    assert.equal(f.data.get('card:cora').chapters.length,1);assert.equal(f.data.get('card:cora').jobs.first.completed,1);
    assert.equal(await f.runtime.run(),true);assert.equal(f.data.get('card:cora').chapters.length,3);
    const sources=f.data.get('card:cora').chapters.flatMap(chapter=>chapter.sources.map(source=>source.segmentKey));
    assert.equal(sources.length,23);assert.equal(new Set(sources).size,23);
});

test('cancel during a later API request retains the first saved batch and discards late results',async()=>{
    let release;
    const f=fixture({respond:prompt=>f.calls.length===2 ? new Promise(resolve=>{release=()=>resolve(simpleMemoryResponse(prompt));}) : simpleMemoryResponse(prompt)});
    setBacklog(f,23);await f.runtime.open();const pending=f.runtime.run({prepare:true});
    while(!release)await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(f.data.get('card:cora').chapters.length,1);f.runtime.cancel();assert.equal(await pending,false);
    assert(f.calls[1].signal.aborted);assert.equal(f.runtime.view().job.prepare,true);
    assert.equal(f.runtime.view().job.completed,1);assert.equal(f.runtime.view().coverage.pendingMessages,13);
    release();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.data.get('card:cora').chapters.length,1);
});

test('hung summary token counting uses a conservative local bound, while cancellation starts no API call',async()=>{
    for(const cancel of [false,true]){
        const f=fixture({timeout:30,settings:{memoryInject:false}});await f.runtime.open();
        let counting=false;f.context.getTokenCountAsync=()=>{counting=true;return new Promise(()=>{});};
        const pending=f.runtime.run();while(!counting)await new Promise(resolve=>setTimeout(resolve,1));
        if(cancel)f.runtime.cancel();
        assert.equal(await pending,!cancel);assert.equal(f.runtime.isBusy(),false);assert.equal(f.calls.length,cancel?0:1);
        assert.equal(f.runtime.view().job.status,cancel?'cancelled':'ready');
        if(!cancel){
            assert.equal(f.runtime.view().job.tokenCountWarning,'MEMORY_TOKEN_COUNT_TIMEOUT');
            assert.equal(f.runtime.view().job.tokenCountEstimated,true);
            assert.equal(f.runtime.view().job.inputTokens,new TextEncoder().encode(f.calls[0].prompt).length);
            assert(f.runtime.view().job.inputTokens<=f.settings.memorySummaryInputBudget);
            assert.equal(f.data.get('card:cora').chapters.length,1);
            assert(f.notices.some(notice=>notice.type==='warning'));
        }
    }
});

test('an active main reply queues memory beyond the API deadline and resumes immediately on the native end event',async()=>{
    let generating=false;const f=fixture({timeout:20,generating:()=>generating});await f.runtime.open();generating=true;
    const pending=f.runtime.run();
    while(!f.runtime.view().job.queued)await new Promise(resolve=>setTimeout(resolve,1));
    await new Promise(resolve=>setTimeout(resolve,60));
    assert.equal(f.runtime.view().job.status,'waiting');assert.equal(f.runtime.view().job.code,'');
    assert.equal(f.runtime.view().job.waitingFor,'main-generation');assert.equal(f.calls.length,0);assert.equal(f.runtime.isBusy(),true);
    generating=false;const releasedAt=Date.now();f.runtime.notifyGenerationChanged();
    assert.equal(await pending,true);assert(Date.now()-releasedAt<200);
    assert.equal(f.calls.length,1);assert.equal(f.runtime.isBusy(),false);assert.equal(f.runtime.view().job.queued,false);
    assert.equal(f.runtime.view().coverage.pendingMessages,0);
});

test('a queued summary can be cancelled without making an API call or losing earlier saved chapters',async()=>{
    let generating=false;const f=fixture({timeout:20,generating:()=>generating});await f.runtime.open();assert.equal(await f.runtime.run(),true);
    const saved=structuredClone(f.data.get('card:cora').chapters);
    f.context.chat.push({is_user:false,name:'Cora',mes:'Cora arrived at the river again.'});await f.runtime.observe();generating=true;
    const pending=f.runtime.run({prepare:true});
    while(!f.runtime.view().job.queued)await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(f.runtime.view().job.savedChapters,1);assert.equal(f.runtime.view().job.remainingMessages,1);assert.equal(f.runtime.view().job.totalMessages,1);
    f.runtime.cancel();assert.equal(await pending,false);assert.equal(f.calls.length,1);
    assert.equal(f.runtime.view().job.status,'cancelled');assert.equal(f.runtime.view().job.queued,false);
    assert.deepEqual(f.data.get('card:cora').chapters,saved);assert.equal(f.runtime.view().coverage.pendingMessages,1);
    generating=false;f.runtime.notifyGenerationChanged();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.calls.length,1);
});

test('background native events do not overwrite a queued worker or run its strict prompt tokenizer',async()=>{
    let generating=false;const f=fixture({timeout:20,generating:()=>generating});await f.runtime.open();assert.equal(await f.runtime.run(),true);
    f.context.chat.push({is_user:false,name:'Cora',mes:'Cora arrived at the river again.'});await f.runtime.observe();generating=true;
    const pending=f.runtime.run();while(!f.runtime.view().job.queued)await new Promise(resolve=>setTimeout(resolve,1));
    let tokenCalls=0;f.context.getTokenCountAsync=()=>{tokenCalls++;throw Error('Tokenizer unavailable');};
    assert.equal(await f.runtime.observe(),true);assert.equal(tokenCalls,0);
    assert.equal(f.runtime.view().job.status,'waiting');assert.equal(f.runtime.view().job.queued,true);
    f.runtime.cancel();assert.equal(await pending,false);assert.equal(f.calls.length,1);
});

test('native main generation between memory batches queues without restarting the completed batch',async()=>{
    let generating=false;const f=fixture({timeout:20,generating:()=>generating,respond:prompt=>{
        if(f.calls.length===1)generating=true;
        return simpleMemoryResponse(prompt);
    }});setBacklog(f,12);await f.runtime.open();const pending=f.runtime.run();
    while(!(f.runtime.view().job.queued && f.runtime.view().job.completed===1))await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(f.calls.length,1);assert.equal(f.data.get('card:cora').chapters.length,1);
    const saved=structuredClone(f.data.get('card:cora').chapters[0]);await new Promise(resolve=>setTimeout(resolve,50));
    assert.equal(f.runtime.view().job.status,'waiting');assert.equal(f.runtime.view().coverage.pendingMessages,2);
    generating=false;f.runtime.notifyGenerationChanged();assert.equal(await pending,true);assert.equal(f.calls.length,2);
    assert.deepEqual(f.data.get('card:cora').chapters[0],saved);assert.equal(f.runtime.view().coverage.pendingMessages,0);
});

test('post-summary prompt preparation is cancellable and does not report success before it finishes',async()=>{
    const f=fixture();await f.runtime.open();const realCounter=f.context.getTokenCountAsync;
    let counting=false;
    f.context.getTokenCountAsync=value=>{
        if(value==='The story continued with the saved events.') {counting=true;return new Promise(()=>{});}
        return realCounter(value);
    };
    f.setResponder(simpleMemoryResponse);const pending=f.runtime.run();
    while(!counting)await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(f.data.get('card:cora').chapters.length,1);assert.equal(f.runtime.view().job.status,'counting');
    assert(!f.notices.some(notice=>notice.type==='success'));f.runtime.cancel();assert.equal(await pending,false);
    assert.equal(f.runtime.view().job.status,'cancelled');assert.equal(f.runtime.view().job.completed,1);
});

test('simultaneous runs on an unopened archive cannot start overlapping jobs',async()=>{
    let release;
    const f=fixture({respond:prompt=>new Promise(resolve=>{release=()=>resolve(simpleMemoryResponse(prompt));})});
    const first=f.runtime.run(),second=f.runtime.run();
    while(!release)await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal(f.calls.length,1);release();const results=await Promise.all([first,second]);
    assert.equal(results.filter(Boolean).length,1);assert.equal(f.data.get('card:cora').chapters.length,1);
});

test('failed handoff archive writes roll back the capsule and retain the previous chat link',async()=>{
    let fail=true;
    const f=fixture({respond:simpleMemoryResponse,failSave:value=>{
        if(fail && value.capsules.length){fail=false;return true;}return false;
    }});
    const previous={owner:'card:cora',ancestry:['first'],capsuleId:'previous-capsule'};
    f.context.chatMetadata[memory.MEMORY_LINK_KEY]=previous;await f.runtime.open();
    assert.equal(await f.runtime.run({prepare:true}),false);
    assert.equal(f.runtime.view().job.code,'MEMORY_STORAGE_WRITE_FAILED');
    assert.equal(f.runtime.view().capsules.length,0);assert.equal(f.data.get('card:cora').capsules.length,0);
    assert.deepEqual(f.context.chatMetadata[memory.MEMORY_LINK_KEY],previous);
    assert.equal(f.data.get('card:cora').chapters.length,1);
    assert.equal(await f.runtime.run({prepare:true}),true);assert.equal(f.calls.length,1);
    assert(f.context.chatMetadata[memory.MEMORY_LINK_KEY].capsuleId!=='previous-capsule');
});

test('failed chat metadata handoff keeps the durable capsule but restores the previous link',async()=>{
    const f=fixture({metadataFail:true,respond:simpleMemoryResponse});
    const previous={owner:'card:cora',ancestry:['first'],capsuleId:'previous-capsule'};
    f.context.chatMetadata[memory.MEMORY_LINK_KEY]=previous;await f.runtime.open();
    assert.equal(await f.runtime.run({prepare:true}),false);
    assert.equal(f.runtime.view().job.code,'MEMORY_METADATA_SAVE_FAILED');
    assert.deepEqual(f.context.chatMetadata[memory.MEMORY_LINK_KEY],previous);
    assert.equal(f.data.get('card:cora').chapters.length,1);assert.equal(f.data.get('card:cora').capsules.length,1);
});

test('a prompt tokenizer failure clears an earlier injection cache instead of exposing it',async()=>{
    const f=fixture({timeout:20});await f.runtime.open();await f.runtime.run();assert(f.runtime.prompt());
    f.settings.memorySummaryBudget=100;f.context.getTokenCountAsync=()=>new Promise(()=>{});
    await assert.rejects(f.runtime.preparePrompt(),/MEMORY_TOKEN_COUNT_TIMEOUT/);assert.equal(f.runtime.prompt(),'');
});

test('summary API time limits default to four minutes and remain configurable within safe bounds',async()=>{
    for(const [input,expected] of [[undefined,240],[0,240],['bad',240],[30,60],[60,60],[180.9,180],[600,600],[900,600]]){
        assert.equal(memory.normalizeMemorySummaryTimeoutSeconds(input),expected);
    }
    const f=fixture({timeout:null,settings:{memorySummaryTimeoutSeconds:60},respond:prompt=>new Promise(resolve=>setTimeout(()=>resolve(simpleMemoryResponse(prompt)),130))});
    await f.runtime.open();assert.equal(await f.runtime.run(),true);
    assert.equal(f.runtime.view().job.apiTimeoutSeconds,60);
    assert(f.runtime.view().job.requestElapsedMs>=100);
});

test('an explicit continuation after an API timeout uses smaller batches without replaying saved sources',async()=>{
    let fail=true;
    const f=fixture({timeout:30,respond:(prompt,signal)=>{
        if(f.calls.length===2 && fail)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Aborted')),{once:true}));
        return simpleMemoryResponse(prompt);
    }});setBacklog(f,23);await f.runtime.open();assert.equal(await f.runtime.run(),false);
    assert.equal(f.calls.length,2);assert.equal(f.runtime.view().job.code,'MEMORY_API_TIMEOUT');
    assert.equal(f.runtime.view().job.recommendedBatchSize,5);assert.equal(f.settings.memorySummaryBatchSize,10);
    assert.equal(f.runtime.view().coverage.pendingMessages,13);assert.equal(f.data.get('card:cora').chapters.length,1);
    const saved=structuredClone(f.data.get('card:cora').chapters[0]);
    fail=false;assert.equal(await f.runtime.run({retry:true}),true);
    assert.equal(f.runtime.view().job.activeBatchSize,5);assert.equal(f.runtime.view().job.batchSize,10);
    assert.deepEqual(f.calls.slice(2).map(call=>JSON.parse(call.prompt.split('SOURCE SEGMENTS: ')[1]).map(source=>source.key)),[
        ['10','11','12','13','14'],['15','16','17','18','19'],['20','21','22']]);
    assert.deepEqual(f.data.get('card:cora').chapters[0],saved);
    const sources=f.data.get('card:cora').chapters.flatMap(chapter=>chapter.sources.map(source=>source.segmentKey));
    assert.equal(sources.length,23);assert.equal(new Set(sources).size,23);
    assert.equal(f.runtime.view().job.recommendedBatchSize,0);
});

test('starting a normal summary after a timeout retains the configured batch preference',async()=>{
    let fail=true;
    const f=fixture({timeout:20,respond:(prompt,signal)=>fail ? new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Aborted')),{once:true})) : simpleMemoryResponse(prompt)});
    setBacklog(f,12);await f.runtime.open();assert.equal(await f.runtime.run(),false);
    fail=false;assert.equal(await f.runtime.run(),true);
    assert.deepEqual(f.calls.slice(1).map(call=>new Set(JSON.parse(call.prompt.split('SOURCE SEGMENTS: ')[1]).map(source=>source.key)).size),[10,2]);
});

test('API rejections report their stage and HTTP status without automatic paid retries',async()=>{
    const f=fixture({respond:()=>{throw Object.assign(Error('Provider rejected request'),{status:429});}});
    await f.runtime.open();assert.equal(await f.runtime.run(),false);
    assert.equal(f.calls.length,1);assert.equal(f.runtime.view().job.code,'MEMORY_API_REQUEST_FAILED');
    assert.equal(f.runtime.view().job.httpStatus,429);assert.equal(f.runtime.view().job.failedStage,'summarizing');
    assert.equal(f.data.get('card:cora').chapters.length,0);
});

test('a complete validated AI response is saved even when output usage token counting stalls',async()=>{
    const f=fixture({timeout:25,respond:simpleMemoryResponse});await f.runtime.open();
    const original=f.context.getTokenCountAsync;
    f.context.getTokenCountAsync=value=>value.startsWith('{"summary":') ? new Promise(()=>{}) : original(value);
    assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,1);assert.equal(f.data.get('card:cora').chapters.length,1);
    assert.equal(f.runtime.view().job.tokenCountEstimated,true);assert.equal(f.runtime.view().job.tokenCountWarning,'MEMORY_TOKEN_COUNT_TIMEOUT');
    assert.match(f.runtime.prompt(),/story continued/);
});

test('a prompt-injection tokenizer failure leaves the saved archive complete and warns separately until injection recovers',async()=>{
    const f=fixture({timeout:25,respond:simpleMemoryResponse});await f.runtime.open();
    const original=f.context.getTokenCountAsync;
    f.context.getTokenCountAsync=value=>value==='The story continued with the saved events.' ? new Promise(()=>{}) : original(value);
    assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,1);
    assert.equal(f.runtime.view().job.code,'');assert.equal(f.runtime.view().job.status,'ready');
    assert.equal(f.runtime.view().job.promptCode,'MEMORY_TOKEN_COUNT_TIMEOUT');assert(f.runtime.view().job.promptWarning);
    assert.equal(f.runtime.view().coverage.pendingMessages,0);assert.equal(f.data.get('card:cora').chapters.length,1);
    assert.equal(f.runtime.prompt(),'');
    assert(!f.notices.some(notice=>notice.type==='success'));assert(f.notices.some(notice=>notice.type==='warning'));
    f.context.getTokenCountAsync=original;await f.runtime.preparePrompt();assert.match(f.runtime.prompt(),/story continued/);
    assert.equal(f.runtime.view().job.promptWarning,'');assert.equal(f.runtime.view().job.promptCode,'');assert.equal(f.calls.length,1);
});

test('preparing a new chat keeps a complete handoff even when strict prompt injection cannot be counted',async()=>{
    const f=fixture({timeout:25,respond:simpleMemoryResponse});await f.runtime.open();const original=f.context.getTokenCountAsync;
    f.context.getTokenCountAsync=value=>value==='The story continued with the saved events.' ? new Promise(()=>{}) : original(value);
    assert.equal(await f.runtime.run({prepare:true}),true);assert.equal(f.runtime.view().coverage.pendingMessages,0);
    assert.equal(f.runtime.view().job.status,'ready');assert.equal(f.runtime.view().job.promptCode,'MEMORY_TOKEN_COUNT_TIMEOUT');
    assert.equal(f.data.get('card:cora').capsules.length,1);assert(f.context.chatMetadata[memory.MEMORY_LINK_KEY]?.capsuleId);
    assert.equal(f.runtime.prompt(),'');assert(!f.notices.some(notice=>notice.type==='success'));
});

test('a tokenizer fallback re-bounds a multibyte prior recap before judging the next input batch',async()=>{
    const f=fixture({timeout:25,settings:{memoryInject:false,memorySummaryInputBudget:4500},respond:()=>JSON.stringify({summary:'The earlier story was saved.',recap:'ก'.repeat(4000),events:[]})});
    await f.runtime.open();assert.equal(await f.runtime.run(),true);
    f.context.chat.push({is_user:false,name:'Cora',mes:'Cora returned to the river.'});await f.runtime.observe();
    const original=f.context.getTokenCountAsync;
    f.context.getTokenCountAsync=value=>value.startsWith('You are a factual role-play archivist.') ? new Promise(()=>{}) : original(value);
    f.setResponder(simpleMemoryResponse);
    assert.equal(await f.runtime.run(),true);assert.equal(f.calls.length,2);
    const prompt=f.calls.at(-1).prompt;
    const recap=JSON.parse(prompt.split('PRIOR CONTINUITY RECAP (may be incomplete): ')[1].split('\nCURRENT STATE REFERENCE: ')[0]);
    assert(new TextEncoder().encode(recap).length<=Math.floor(f.settings.memorySummaryInputBudget/4));
    assert(new TextEncoder().encode(prompt).length<=f.settings.memorySummaryInputBudget);
    assert.equal(f.runtime.view().coverage.pendingMessages,0);
});
