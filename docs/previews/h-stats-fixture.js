// A minimal SillyTavern host running the actual loader, templates and runtime.
// Serve the repository with any static HTTP server, then open preview-h-stats.html.
import {H_FIELDS} from '../../src/h-stats.js';
import {packScopedNpcs} from '../../src/npc-scopes.js';

const root = new URL('../../', import.meta.url);
const settingsKey = 'roleforge-hstats-preview-settings';
const metadataKey = 'roleforge-hstats-preview-metadata';
const owner = 'card:h-stats-demo.png';
const neutralStats = Object.fromEntries(H_FIELDS.map(field => [field.key,
    field.type === 'text' ? 'No record yet' : field.type === 'boolean' ? false
        : field.type === 'stage' ? 1 : field.type === 'hearts' ? 5 : 0]));
const demoNpcs = [
    {id:'ashe',name:'Ashe',title:'Party leader',color:'#849bb5',roleIcon:'sword'},
    {id:'teresina',name:'Teresina',title:'Guild adviser',color:'#b590b7',roleIcon:'book'},
    {id:'cora',name:'Cora',title:'Healer',color:'#81a78a',roleIcon:'healer'},
].map(entry => ({...entry,age:'28',gender:'Female',race:'Human',occupation:entry.title,
    faction:"Adventurer's Guild",location:"Adventurer's Guild",relationship:'Ally',met:true,
    isHostile:false,enabled:true,npcScope:'character',npcOwner:owner,identityColor:entry.color,
    portraitSource:'local',hasPortrait:true,affection:50,trust:70,loyalty:70,
    hStats:{...neutralStats},hStatsGenerated:[],notes:'Neutral interface demo.'}));

function demoMetadata(groups = false) {
    const state = {npcs:demoNpcs,npcScopes:{owner,bases:Object.fromEntries(demoNpcs.map(npc=>[npc.id,npc]))}};
    if(groups)Object.assign(state,{player:{name:'Nova',party:'Solo',guild:'Unaffiliated'},
        progression:{currency:{gold:25,silver:13,copper:7}},social:{party:null,guilds:[]}});
    return {tretaresia_rpg_state:packScopedNpcs(state,demoNpcs,owner),
        tretaresia_rpg_visible_hstats_npcs:['ashe','teresina'],tretaresia_rpg_selected_hstats_npc:'ashe'};
}

function readStored(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
}

async function portraitBlob(npc) {
    const canvas = document.createElement('canvas'); canvas.width=360; canvas.height=480;
    const context=canvas.getContext('2d'),gradient=context.createLinearGradient(0,0,360,480);
    gradient.addColorStop(0,npc.color);gradient.addColorStop(1,'#181c25');
    context.fillStyle=gradient;context.fillRect(0,0,360,480);
    context.fillStyle='rgba(248,244,232,.12)';context.beginPath();context.arc(180,162,72,0,Math.PI*2);context.fill();
    context.beginPath();context.ellipse(180,362,130,144,0,0,Math.PI*2);context.fill();
    context.fillStyle='#f4eedf';context.textAlign='center';context.font='600 90px Georgia';context.fillText(npc.name[0],180,235);
    context.font='18px system-ui';context.fillText(npc.name,180,435);
    return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
}

export async function startHStatsPreview() {
    const params=new URLSearchParams(location.search),callbacks=new Map(),portraits=new Map();
    const groupsDemo=params.get('groups')==='1';
    const groupFixture={partyName:'Moonlight',guildName:'Dawnspire',initialCurrency:{gold:25,silver:13,copper:7},aiRequests:0,joinClicks:0};
    await Promise.all(demoNpcs.map(async npc=>portraits.set(npc.id,await portraitBlob(npc))));
    const storedSettings=readStored(settingsKey,{});
    storedSettings.tretaresia_rpg ||= {};
    Object.assign(storedSettings.tretaresia_rpg,{autoContinuity:false,chatPresentation:false});
    if(groupsDemo)storedSettings.tretaresia_rpg.autoTrack=true;
    if(!storedSettings.tretaresia_rpg.language)storedSettings.tretaresia_rpg.language=params.get('lang')==='en'?'en':'th';
    if(['tabs','cards','compact'].includes(params.get('layout')))storedSettings.tretaresia_rpg.hStatsLayout=params.get('layout');
    const eventTypes=Object.fromEntries(['CHAT_CHANGED','MESSAGE_SENT','GENERATION_STARTED','GENERATION_AFTER_COMMANDS','MESSAGE_RECEIVED','MESSAGE_SWIPED','MESSAGE_DELETED','CHARACTER_MESSAGE_RENDERED','GENERATION_ENDED','GENERATION_STOPPED','STREAM_TOKEN_RECEIVED'].map(type=>[type,type]));
    let chatId='h-stats-preview';
    window.host={extensionSettings:storedSettings,chatMetadata:groupsDemo?demoMetadata(true):readStored(metadataKey,demoMetadata()),
        chat:groupsDemo?[
            {name:'Nova',is_user:true,is_system:false,mes:'ฉันตรวจดูรายชื่อปาร์ตี้และกิลด์ของตัวเอง'},
            {name:'Narrator',is_user:false,is_system:false,mes:'คุณอยู่ในปาร์ตี้ “Moonlight” อยู่แล้ว โดยมี Ashe เป็นหัวหน้า. คุณเป็นสมาชิกกิลด์ “Dawnspire” อยู่แล้ว โดยมี Ashe เป็นหัวหน้า.'},
        ]:[],
        characters:[{name:'H-Stats preview',avatar:'h-stats-demo.png',first_mes:'',data:{extensions:{tretaresia_rpg_npcs:demoNpcs}}}],characterId:0,eventTypes,
        eventSource:{on(type,fn){const list=callbacks.get(type)||[];list.push(fn);callbacks.set(type,list);},async emit(type,...args){await Promise.all((callbacks.get(type)||[]).map(fn=>fn(...args)));}},
        getCurrentChatId:()=>chatId,getRequestHeaders:()=>({'Content-Type':'application/json'}),
        saveSettingsDebounced(){localStorage.setItem(settingsKey,JSON.stringify(this.extensionSettings));},
        async saveMetadata(){localStorage.setItem(metadataKey,JSON.stringify(window.host.chatMetadata));},
        setExtensionPrompt(){},
        renderExtensionTemplateAsync:async(folder,name)=>{
            const response=await fetch(new URL('templates/'+name+'.html',root));
            if(!response.ok)throw Error('Template '+response.status);return response.text();
        },
    };
    if(groupsDemo){
        window.host.name1='Nova';
        window.host.generateQuietPrompt=window.host.generateRaw=async()=>{groupFixture.aiRequests++;return '{}';};
        document.addEventListener('click',event=>{
            if(event.target.closest('.trpg-group-invite-accept'))groupFixture.joinClicks++;
        },true);
    }
    window.SillyTavern={getContext:()=>window.host,libs:{localforage:{async getItem(key){return portraits.get(key.split(':').at(-1))||null;},async setItem(){},async removeItem(){}}}};
    window.toastr={error:message=>console.error('TOAST: '+message),warning(){},info(){},success(){}};
    // Static previews have no SillyTavern API. Production imports remain untouched.
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,options)=>{
        const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
        if(url.origin===location.origin&&url.pathname.startsWith('/api/'))return Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}}));
        return nativeFetch(input,options);
    };
    // The Forge uses SillyTavern's installed-extension URL; adapt it in the demo host.
    const iframeObserver=new MutationObserver(()=>document.querySelectorAll('iframe').forEach(frame=>{
        const prefix='/scripts/extensions/third-party/rpg-systems/';
        if(frame.getAttribute('src')?.startsWith(prefix))frame.src=new URL(frame.getAttribute('src').slice(prefix.length),root).href;
    }));
    iframeObserver.observe(document.body,{childList:true,subtree:true});
    window.hStatsPreview={
        demoNpcs,settingsKey,metadataKey,groupFixture:groupsDemo?groupFixture:null,
        async switchChat(id,metadata=demoMetadata()) {chatId=id;window.host.chatMetadata=metadata;await window.host.eventSource.emit(eventTypes.CHAT_CHANGED);},
        freshMetadata:demoMetadata,
    };
    const open=async()=>{
        document.querySelector('#tretaresia-rpg-wand-launcher')?.click();
        await new Promise((resolve,reject)=>{
            const deadline=Date.now()+20000;
            const check=()=>{
                if(document.querySelector('#tretaresia-rpg-overlay.is-open [data-tab="hstats"]'))return resolve();
                if(Date.now()>deadline)return reject(Error('RoleForge interface timed out'));
                setTimeout(check,25);
            };check();
        });
        document.querySelector('[data-tab="hstats"]')?.click();
    };
    document.querySelector('#preview-open').onclick=open;
    document.querySelector('#preview-reset').onclick=()=>{localStorage.removeItem(settingsKey);localStorage.removeItem(metadataKey);location.reload();};
    document.querySelector('#preview-language').value=storedSettings.tretaresia_rpg.language;
    document.querySelector('#preview-language').onchange=event=>{
        const select=document.querySelector('#tretaresia-rpg-language');
        select.value=event.target.value;select.dispatchEvent(new Event('change',{bubbles:true}));open();
    };
    await import(new URL('loader.js',root));
    await new Promise((resolve,reject)=>{
        const deadline=Date.now()+20000;
        const check=()=>{
            if(window.TretaresiaRelease&&document.querySelector('#tretaresia-rpg-wand-launcher'))return resolve();
            if(Date.now()>deadline)return reject(Error('RoleForge startup timed out'));
            setTimeout(check,25);
        };check();
    });
    await open();
    await new Promise((resolve,reject)=>{
        const deadline=Date.now()+20000;
        const check=()=>{
            if(document.querySelector('#tretaresia-rpg-overlay.is-ready [data-panel="hstats"].is-active'))return resolve();
            if(Date.now()>deadline)return reject(Error('H-Stats preview timed out'));
            setTimeout(check,25);
        };check();
    });
    document.querySelector('#preview-status').textContent='RoleForge '+window.TretaresiaRelease+' · พร้อมทดลองทั้ง 3 รูปแบบ';
    window.hStatsPreview.ready=true;
}
