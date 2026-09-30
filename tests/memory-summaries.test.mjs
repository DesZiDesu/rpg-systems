import test from 'node:test';
import assert from 'node:assert/strict';
import * as memory from '../src/memory-summaries.js';
import {createMemorySummaries,requestMemorySummary} from '../src/memory-summary-runtime.js';
import {renderMemorySummaries} from '../src/memory-summary-ui.js';

const config = () => ({language:'en',memoryAutoSummary:true,memorySummaryInterval:5,memorySummaryProfile:'',memoryInject:true,memorySummaryBudget:1200,memoryRetrievalBudget:1000,memorySummaryInputBudget:12000});
function fixture(options = {}) {
    const data = options.data || new Map(), notices = [], phases = [], calls = [], settings = config();
    const state = {player:{name:'Nova'},location:{place:'River'},worldClock:{day:7,time:'23:00'},progression:{currency:{gold:6,silver:0,copper:120}},quests:[],npcs:[],social:{},storyMemories:[],storyAgenda:[]};
    const context = {owner:'card:cora',chatId:'first',chatMetadata:{},chat:[{is_user:true,name:'Nova',mes:'I went fishing at the river at night.'},{is_user:false,name:'Cora',mes:'Cora met Nova at the river that night. It was their first meeting.'}],
        getCurrentChatId(){return this.chatId;},getTokenCountAsync:async value => Math.ceil(value.length / 3),extensionSettings:{}};
    let responder = options.respond || (prompt => {
        const batch = JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1]);
        return JSON.stringify({summary:'Nova met Cora while fishing at the river at night.',recap:'Nova first met Cora while fishing by the river at night.',events:[{
            title:'First meeting with Cora',detail:'Nova met Cora while fishing at the river at night.',kind:'Event',people:['Nova','Cora','คอร่า'],places:['River','แม่น้ำ'],keywords:['fishing','ตกปลา','กลางคืน'],knownBy:['Nova','Cora'],whenText:'Day 7, night',sourceKeys:[batch.at(-1).segmentKey],evidence:batch.at(-1).text.slice(0,100),
        }]});
    });
    const store = {get:async owner => data.has(owner) ? structuredClone(data.get(owner)) : null,put:async(owner,value) => { if(options.failSave?.())throw Error('MEMORY_STORAGE_WRITE_FAILED'); data.set(owner,structuredClone(value)); }};
    const runtime = createMemorySummaries({context:()=>context,owner:ctx=>ctx.owner,settings:()=>settings,state:()=>state,visible:value=>value.replace(/<!--[^]*?-->/g,''),scene:()=>({day:7,time:'23:00',location:'River'}),store,
        notify:(type,message)=>notices.push({type,message}),changed:view=>phases.push(view.job.status),parse:JSON.parse,timeout:options.timeout || 100,
        saveMetadata:async()=>options.metadataFail ? false : true,isGenerating:()=>options.generating?.() || false,
        request:async(ctx,prompt,profile,signal)=>{calls.push({prompt,profile,signal});return responder(prompt,signal);}});
    return {runtime,data,notices,phases,calls,context,state,settings,setResponder:value=>{responder=value;}};
}

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
    const timeout=fixture({respond:()=>new Promise(()=>{}),timeout:10});await timeout.runtime.open();assert.equal(await timeout.runtime.run(),false);assert.equal(timeout.runtime.view().job.code,'MEMORY_TIMEOUT');
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
    f.context.chat[1].mes='A newer local version.';await f.runtime.observe();await f.runtime.import(backup);assert.equal(f.runtime.source('first','1').raw,'A newer local version.');
    await assert.rejects(f.runtime.import({...backup,owner:'another-character'}),/INVALID_ARCHIVE/);
});

test('API adapter uses standalone generation or a chosen profile without changing the main connection',async()=>{
    let args;const current={generateRaw:async value=>{args=value;return '{}';}};await requestMemorySummary(current,'SOURCE','','signal');assert.equal(args.prompt,'SOURCE');assert.equal(args.trimNames,false);
    let sent;const profile={extensionSettings:{connectionManager:{profiles:[{id:'summary',name:'Summary'}]}},ConnectionManagerRequestService:{sendRequest:async(...values)=>{sent=values;return {content:'{}'};}}};
    assert.equal(await requestMemorySummary(profile,'SOURCE','summary',null),'{}');assert.equal(sent[0],'summary');assert.equal(sent[4].temperature,0.15);
    await assert.rejects(requestMemorySummary(profile,'SOURCE','missing',null),/PROFILE_UNAVAILABLE/);
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
