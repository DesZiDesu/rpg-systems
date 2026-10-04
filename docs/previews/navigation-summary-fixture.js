// This isolated demo runs the real production loader/templates/runtime.
// Serve the repository over HTTP and open preview-navigation-summary.html.
import {packScopedNpcs} from '../../src/npc-scopes.js';

const root = new URL('../../',import.meta.url);
const storagePrefix = 'roleforge-navigation-summary-preview';
const settingsKey = `${storagePrefix}-settings`;
const metadataKey = `${storagePrefix}-metadata`;
const owner = 'card:roleforge-navigation-summary-demo.png';
const memoryOwner = 'character:roleforge-navigation-summary-demo.png';
const chatId = 'roleforge-navigation-summary-demo';
const demoNpcs = [{id:'cora',name:'Cora',age:'28',gender:'Female',race:'Human',title:'River guide',occupation:'Guide',
    color:'#b0baa1',identityColor:'#b0baa1',roleIcon:'book',npcScope:'character',npcOwner:owner,
    met:true,enabled:true,isHostile:false,hasPortrait:false,location:'Moonlit River',relationship:'Friend',
    affection:45,trust:60,loyalty:50,notes:'Met Nova while fishing at the river at night.'}];
const demoChat = [
    ['Nova',true,'I walk to the Moonlit River near Willow Village to fish at night.'],
    ['Cora',false,'At the Moonlit River, Cora meets Nova for the first time. She shares fishing advice.'],
    ['Nova',true,'I introduce myself to Cora and offer to share my fishing bait.'],
    ['Cora',false,'Cora thanks Nova. They sit together by the Moonlit River and talk under the stars.'],
    ['Nova',true,'I ask Cora what brought her to Willow Village.'],
    ['Cora',false,'Cora explains that she works as a guide near Willow Village and knows the river well.'],
    ['Nova',true,'I catch a small fish and show it to Cora.'],
    ['Cora',false,'Cora smiles at Nova. She recommends returning the small fish to the Moonlit River.'],
    ['Nova',true,'I release the small fish. I ask Cora to meet here tomorrow night.'],
    ['Cora',false,'Cora agrees to meet Nova again tomorrow night at the Moonlit River.'],
    ['Nova',true,'I pack my fishing gear and say goodbye to Cora.'],
    ['Cora',false,'Cora waves goodbye. Nova returns safely to Willow Village after the fishing trip.'],
].map(([name,is_user,mes])=>({name,is_user,is_system:false,mes}));

function freshMetadata() {
    const state = {player:{name:'Nova',race:'Human',class:'Traveler',level:4},npcs:demoNpcs,
        npcScopes:{owner,bases:Object.fromEntries(demoNpcs.map(npc=>[npc.id,npc]))},
        progression:{currency:{gold:8,silver:25,copper:12}},
        location:{place:'Moonlit River',district:'Willow Village',narrativeVersion:1},
        worldClock:{day:7,time:'22:15'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}};
    return {tretaresia_rpg_state:packScopedNpcs(state,demoNpcs,owner)};
}
function readStored(key,fallback) {try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
async function waitFor(test,label) {
    const deadline=Date.now()+25000;
    while(!test()){if(Date.now()>deadline)throw Error(label+' timed out');await new Promise(resolve=>setTimeout(resolve,25));}
}
function summaryResponse(prompt) {
    const segments=JSON.parse(prompt.split('SOURCE SEGMENTS: ')[1]);
    const source=segments[0];
    return JSON.stringify({summary:'Nova and Cora became friends while fishing at the Moonlit River at night.',
        recap:'On Day 7 at night, Nova met Cora at the Moonlit River near Willow Village. They shared bait, spoke about the village, and agreed to meet again tomorrow night.',
        events:[{title:'Fishing at the Moonlit River',detail:'Nova and Cora spent the evening fishing and talking at the Moonlit River.',kind:'Event',
            people:['Nova','Cora'],places:['Moonlit River','Willow Village'],keywords:['fishing','night','first meeting'],knownBy:['Nova','Cora'],whenText:'Day 7, night',
            sourceKeys:[source.segmentKey],evidence:source.text.slice(0,120)}]});
}

export async function startNavigationSummaryPreview() {
    const params=new URLSearchParams(location.search),callbacks=new Map();
    document.body.classList.toggle('preview-review',params.get('review')==='1');
    const storedSettings=readStored(settingsKey,{});
    storedSettings.tretaresia_rpg ||= {};
    Object.assign(storedSettings.tretaresia_rpg,{autoContinuity:false,chatPresentation:false,autoTrack:false,
        enableMemorySummaries:true,memoryAutoSummary:false,showSceneTracker:false,showTravelTracker:false});
    storedSettings.tretaresia_rpg.memorySummaryBatchSize ||= 5;
    storedSettings.tretaresia_rpg.language=params.get('lang')||storedSettings.tretaresia_rpg.language||'th';
    if(['carousel','menu','grid'].includes(params.get('mode')))storedSettings.tretaresia_rpg.moduleNavigationMode=params.get('mode');
    const eventTypes=Object.fromEntries(['CHAT_CHANGED','MESSAGE_SENT','GENERATION_STARTED','GENERATION_AFTER_COMMANDS','MESSAGE_RECEIVED',
        'MESSAGE_SWIPED','MESSAGE_DELETED','CHARACTER_MESSAGE_RENDERED','GENERATION_ENDED','GENERATION_STOPPED','STREAM_TOKEN_RECEIVED'].map(type=>[type,type]));
    window.host={name1:'Nova',name2:'Nova · คืนที่แม่น้ำ',extensionSettings:storedSettings,chatMetadata:readStored(metadataKey,freshMetadata()),chat:structuredClone(demoChat),
        characters:[{name:'Navigation preview',avatar:'roleforge-navigation-summary-demo.png',first_mes:'',data:{extensions:{tretaresia_rpg_npcs:demoNpcs}}}],
        characterId:0,eventTypes,eventSource:{on(type,callback){const list=callbacks.get(type)||[];list.push(callback);callbacks.set(type,list);},
            async emit(type,...args){await Promise.all((callbacks.get(type)||[]).map(callback=>callback(...args)));}},
        getCurrentChatId:()=>chatId,getRequestHeaders:()=>({'Content-Type':'application/json'}),
        saveSettingsDebounced(){localStorage.setItem(settingsKey,JSON.stringify(this.extensionSettings));},
        async saveMetadata(){localStorage.setItem(metadataKey,JSON.stringify(window.host.chatMetadata));},
        getTokenCountAsync:async value=>Math.ceil(value.length/3),setExtensionPrompt(){},
        renderExtensionTemplateAsync:async(folder,name)=>{const response=await fetch(new URL(`templates/${name}.html`,root));if(!response.ok)throw Error(`Template ${response.status}`);return response.text();},
    };
    window.SillyTavern={getContext:()=>window.host,libs:{localforage:{async getItem(){return null;},async setItem(){},async removeItem(){}}}};
    const api={mode:params.get('api')||'manual',calls:[],pending:null,notice:[],nativeSends:0,nativeStops:0,successDelay:1300};
    const status=document.querySelector('#preview-status');
    window.toastr=Object.fromEntries(['error','warning','info','success'].map(type=>[type,message=>{api.notice.push({type,message});status.textContent=message;} ]));
    window.host.generateRaw=async({prompt,signal})=>{
        api.calls.push(prompt);document.querySelector('#preview-next').hidden=false;
        status.textContent=`API ตัวอย่าง · คำขอที่ ${api.calls.length} กำลังรอผล`;
        if(api.mode==='error'){const error=Error('Demo service unavailable');error.status=503;throw error;}
        return new Promise((resolve,reject)=>{
            let settled=false;
            const settle=()=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);api.pending=null;document.querySelector('#preview-next').hidden=true;resolve(summaryResponse(prompt));};
            const abort=()=>{if(settled)return;settled=true;api.pending=null;document.querySelector('#preview-next').hidden=true;const error=Error('Aborted');error.name='AbortError';reject(error);};
            api.pending=settle;signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
            if(api.mode==='success')setTimeout(settle,api.successDelay);
        });
    };
    window.host.generateQuietPrompt=({quietPrompt})=>window.host.generateRaw({prompt:quietPrompt});
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,options)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
        return url.origin===location.origin&&url.pathname.startsWith('/api/')?Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}})):nativeFetch(input,options);};
    const iframeObserver=new MutationObserver(()=>document.querySelectorAll('iframe').forEach(frame=>{const prefix='/scripts/extensions/third-party/rpg-systems/';
        if(frame.getAttribute('src')?.startsWith(prefix))frame.src=new URL(frame.getAttribute('src').slice(prefix.length),root).href;}));
    iframeObserver.observe(document.body,{childList:true,subtree:true});
    const open=async(tab='status')=>{
        if(tab==='summaries'){await waitFor(()=>document.querySelector('#roleforge-memory-addons > details'),'Memory drawer mount');openSettings();const drawer=document.querySelector('#roleforge-memory-addons > details');if(!drawer.open)drawer.querySelector('summary').click();await waitFor(()=>document.querySelector('#roleforge-memory-addons .rf-memory-workspace'),'Memory drawer');return;}
        document.querySelector('#preview-extension-drawer').hidden=true;
        document.querySelector('#rm_extensions_block')?.classList.add('closedDrawer');
        if(!document.querySelector('#tretaresia-rpg-overlay.is-open'))document.querySelector('#tretaresia-rpg-wand-launcher')?.click();
        await waitFor(()=>document.querySelector('#tretaresia-rpg-overlay.is-open.is-ready'),'RoleForge interface');
        // Existing native tab callbacks handle all routing in this demo.
        document.querySelector(`#tretaresia-rpg-overlay [data-tab="${tab}"]`)?.click();
        await waitFor(()=>document.querySelector(`#tretaresia-rpg-overlay [data-panel="${tab}"].is-active`),`Panel ${tab}`);
    };
    const openSettings=()=>{
        if(document.querySelector('#tretaresia-rpg-overlay.is-open'))document.querySelector('#tretaresia-rpg-close')?.click();
        const drawer=document.querySelector('#preview-extension-drawer');drawer.hidden=false;drawer.scrollTop=0;document.querySelector('#rm_extensions_block')?.classList.remove('closedDrawer');
    };
    window.navigationSummaryPreview={api,settingsKey,metadataKey,owner,memoryOwner,chatId,demoChat,ready:false,open,openSettings,
        setApiMode(mode){api.mode=mode;document.querySelector('#preview-api').value=mode;},resolveRequest(){api.pending?.();},
        setNativeStoryBusy(busy,{bodyState = false} = {}) {
            // Official getContext() does not expose isGenerating. Model the
            // host's native composer instead of adding a synthetic default flag.
            document.querySelector('#mes_stop').style.display=busy?'grid':'none';
            document.querySelector('#send_but').style.display=busy?'none':'';
            if(bodyState)document.body.dataset.generating=String(busy);
            else delete document.body.dataset.generating;
        },
        async resetMemory(){const {createMemoryStore}=await import('../../src/memory-store.js');const store=createMemoryStore();await store.put(memoryOwner,null);window.host.chatMetadata=freshMetadata();localStorage.removeItem(metadataKey);location.reload();},
    };
    document.querySelector('#preview-open').onclick=()=>open();
    document.querySelector('#preview-settings').onclick=openSettings;
    document.querySelector('#extensions-settings-button > .drawer-toggle').onclick=openSettings;
    document.querySelector('#extensionsMenuButton').onclick=openSettings;
    document.querySelector('#preview-settings-close').onclick=()=>{document.querySelector('#preview-extension-drawer').hidden=true;document.querySelector('#rm_extensions_block')?.classList.add('closedDrawer');};
    document.querySelector('#preview-summarize').onclick=async()=>{await open('summaries');await waitFor(()=>document.querySelector('[data-memory-pending]')&&document.querySelector('#roleforge-memory-addons [data-action="memory-summary-run"]:not(:disabled)'),'Memory capture');document.querySelector('#roleforge-memory-addons [data-action="memory-summary-run"]').click();};
    document.querySelector('#preview-next').onclick=()=>api.pending?.();
    document.querySelector('#preview-api').value=api.mode;document.querySelector('#preview-api').onchange=event=>{api.mode=event.target.value;};
    document.querySelector('#preview-reset').onclick=async()=>{localStorage.removeItem(settingsKey);localStorage.removeItem(metadataKey);await window.navigationSummaryPreview.resetMemory();};
    document.querySelector('#preview-language').value=storedSettings.tretaresia_rpg.language;
    document.querySelector('#preview-language').onchange=event=>{const select=document.querySelector('#tretaresia-rpg-language');select.value=event.target.value;select.dispatchEvent(new Event('change',{bubbles:true}));};
    document.querySelector('#send_form').addEventListener('submit',event=>{event.preventDefault();api.nativeSends++;status.textContent='นี่คือ composer ตัวอย่าง ข้อความไม่ได้ส่งไปที่ API';});
    document.querySelector('#mes_stop').addEventListener('click',()=>{api.nativeStops++;});
    await import(new URL('loader.js',root));
    await waitFor(()=>window.TretaresiaRelease&&document.querySelector('#tretaresia-rpg-wand-launcher'),'RoleForge startup');
    await open(params.get('tab')||'status');
    status.textContent=`RoleForge ${window.TretaresiaRelease} · ตัวอย่างพร้อมทดลอง`;
    window.navigationSummaryPreview.ready=true;
}
