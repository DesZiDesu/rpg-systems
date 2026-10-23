import {WORLD_REF_FIELD,worldRef,worldKey,worldError} from './world-pack-core.js?v=0.85.2';
import {freezeArchiveRecord} from './archive-cache.js?v=0.85.2';
import {readCharacterExtension} from './character-archive.js?v=0.85.2';

export function createWorldPackClient({normalizeNpc=value=>value,onProgress=()=>{}}={}) {
    let worker,sequence=0;const pending=new Map(),catalogs=new Map(),opens=new Map(),installs=new Map(),revisions=new Map();
    function rpc(action,payload,progress=onProgress){
        if(!worker){worker=new Worker(new URL('./world-pack-worker.js?v=0.85.2',import.meta.url),{type:'module'});
            worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;if(data.progress){job.progress(data.progress);return;}pending.delete(data.id);data.error?job.reject(Object.assign(Error(data.error.message),{name:data.error.name,code:data.error.code})):job.resolve(data.result);};
            worker.onerror=event=>{const error=Error(event.message||'World Pack Worker could not start');for(const job of pending.values())job.reject(error);pending.clear();catalogs.clear();opens.clear();installs.clear();revisions.clear();worker.terminate();worker=null;};}
        const id=++sequence,promise=new Promise((resolve,reject)=>{pending.set(id,{resolve,reject,progress});worker.postMessage({id,action,payload});});
        promise.cancel=()=>worker?.postMessage({action:'cancel',payload:{id}});return promise;
    }
    function install(view,owner){
        revisions.set(owner+'\u0000'+worldKey(view.ref),view.revision);
        const existing=catalogs.get(owner),same=existing?.sessionId===view.sessionId&&existing.revision===view.revision;
        if(same)return existing;
        const details=new Map(),raws=new Map(),storyDetails=new Map(),summaries=Object.freeze(view.npcs.map(value=>freezeArchiveRecord({...value,npcScope:'character',npcOwner:owner}))),summaryById=new Map(summaries.map(v=>[v.id,v]));
        let normalized=0,pinned=new Set();
        const catalog={owner,kind:'npcs',external:true,sessionId:view.sessionId,revision:view.revision,ref:view.ref,
            summaries,ids:Object.freeze(summaries.map(v=>v.id)),loreSummaries:freezeArchiveRecord(view.lore),preparedLore:Object.freeze([]),
            storyMeta:freezeArchiveRecord(view.storyMeta||null),storySummaries:freezeArchiveRecord(view.stories||[]),
            async storyRecord(id){if(storyDetails.has(id))return storyDetails.get(id);const value=await rpc('storyRecord',{sessionId:this.sessionId,id});if(value)storyDetails.set(id,freezeArchiveRecord(value));for(const key of storyDetails.keys())if(storyDetails.size>48&&key!==id)storyDetails.delete(key);return value;},
            storyExport:()=>rpc('storyExport',{sessionId:view.sessionId}),
            async saveStories(pack){return install(await rpc('storyEdit',{sessionId:this.sessionId,pack}),owner);},
            get size(){return summaries.length;},get normalizedCount(){return normalized;},get cachedCount(){return details.size;},
            has:id=>summaryById.has(id),summary:id=>summaryById.get(id),raw:id=>raws.get(id),get:id=>details.get(id)||null,
            getMany(ids){return ids.map(id=>this.get(id)).filter(Boolean);},all(){return this.getMany(this.ids);},
            async load(ids,{pin=false}={}){
                const requested=[...new Set(ids)].filter(id=>this.has(id));if(pin)pinned=new Set(requested);
                const missing=requested.filter(id=>!details.has(id));
                for(let start=0;start<missing.length;start+=16){const rows=await rpc('records',{sessionId:this.sessionId,ids:missing.slice(start,start+16)});
                    for(const raw of rows.filter(Boolean)){raws.set(raw.id,freezeArchiveRecord(raw));details.set(raw.id,freezeArchiveRecord(normalizeNpc(raw,owner)));normalized++;}}
                // Bounded cache, but never evict the runtime cast while a sync
                // state reader still needs its baseline for chat deltas.
                for(const id of details.keys())if(details.size>48&&!pinned.has(id)&&!requested.includes(id)){details.delete(id);raws.delete(id);}
                return this.getMany(requested);
            },
            async lore(query,options){const rows=await rpc('lore',{sessionId:this.sessionId,query,options});this.preparedLore=freezeArchiveRecord(rows);return rows;},
            loreRecord:id=>rpc('loreRecord',{sessionId:view.sessionId,id}),
            supplements:options=>rpc('supplements',{sessionId:view.sessionId,...options}),
            async save(kind,entries){const result=await rpc('edit',{sessionId:this.sessionId,kind,entries});return install(result,owner);},
            export:()=>rpc('export',{sessionId:view.sessionId}),
        };catalogs.set(owner,catalog);return catalog;
    }
    return {rpc,revision:(owner,ref)=>revisions.get(owner+'\u0000'+worldKey(ref)),peek(owner,ref){const value=catalogs.get(owner);return value&&(!ref||worldKey(value.ref)===worldKey(ref))?value:null;},
        async open(owner,ref){const current=this.peek(owner,ref);if(current)return current;const key=owner+'\u0000'+worldKey(ref);if(!opens.has(key)){const task=rpc('open',{owner,ref}).then(view=>install(view,owner)).finally(()=>opens.delete(key));opens.set(key,task);}return opens.get(key);},
        async ensure(owner,ref,{payload=()=>null,valid=()=>true,progress=onProgress,onJob=()=>{}}={}){
            const check=()=>{if(!valid())throw worldError('WORLD_PACK_CONTEXT_CHANGED','Chat/card or archive changed while preparing the embedded archive.');};
            check();try{const catalog=await this.open(owner,ref);check();return catalog;}
            catch(error){check();if(error.code!=='WORLD_PACK_MISSING')throw error;}
            // Only absence authorizes automatic installation. Quota, corrupt
            // storage, Worker failure and invalid refs are never import signals.
            const key=worldKey(ref);let entry=installs.get(key);
            if(!entry){const inline=payload();if(!inline)throw worldError('WORLD_PACK_MISSING','World Pack is missing in this browser and the card has no embedded payload. Import its ZIP/folder.');
                entry={listeners:new Set(),task:null};entry.task=rpc('import',{inline,expected:ref},value=>{for(const listener of entry.listeners)listener(value);});
                installs.set(key,entry);void entry.task.finally(()=>{if(installs.get(key)===entry)installs.delete(key);}).catch(()=>{});
            }
            entry.listeners.add(progress);onJob(entry.task);progress({phase:'prepare',done:0,total:1});
            try{await entry.task;check();const catalog=await this.open(owner,ref);check();return catalog;}
            finally{entry.listeners.delete(progress);onJob(null);}
        },
        import:(source,progress)=>rpc('import',source,progress),list:()=>rpc('list',{}),
        dispose(){worker?.terminate();worker=null;for(const job of pending.values())job.reject(Error('World Pack closed'));pending.clear();catalogs.clear();opens.clear();installs.clear();revisions.clear();},
    };
}
export function characterWorldRef(context,owner){
    return worldRef(readCharacterExtension(context,owner,WORLD_REF_FIELD));
}

// Keep controls in SillyTavern’s native drawer style.
export function mountWorldPackControls(root,api){
    const text=(th,en)=>api.language()==='th'?th:en,node=(tag,value='')=>{const n=document.createElement(tag);n.textContent=value;return n;};
    let busy=false,job=null,downloadOwner='';const downloadUrls=[];
    const heading=node('h4',text('World Pack · คลังข้อมูลขนาดใหญ่','World Pack · reference library')),
        note=node('p',text('การ์ดที่ฝังคลังบีบอัดจะติดตั้งอัตโนมัติเมื่อเปิดแชต ใช้ Update embedded archive หลังแก้ข้อมูล เพื่อพาข้อมูลล่าสุดไปกับการ์ด คลังที่ติดตั้งเก็บในเบราว์เซอร์นี้','Cards with an embedded compressed archive install automatically when opened. Update the embedded archive after editing so the latest changes travel with the card. Installed libraries are stored in this browser.')),
        status=node('p'),actions=node('div'),downloads=node('div'),file=node('input'),folder=node('input'),progress=node('progress'),cancel=node('button',text('ยกเลิก','Cancel'));
    status.setAttribute('role','status');note.className='notes';file.type=folder.type='file';file.accept='.zip';file.hidden=folder.hidden=true;folder.multiple=true;folder.setAttribute('webkitdirectory','');progress.hidden=cancel.hidden=true;
    const button=(th,en,fn)=>{const b=node('button',text(th,en));b.type='button';b.className='menu_button';b.addEventListener('click',fn);actions.append(b);return b;};
    function clearDownloads(){for(const url of downloadUrls)URL.revokeObjectURL(url);downloadUrls.length=0;downloads.replaceChildren();downloads.hidden=true;downloadOwner='';}
    async function act(fn){if(busy)return;clearDownloads();busy=true;root.dataset.busy='true';actions.inert=true;progress.hidden=false;progress.removeAttribute('value');cancel.hidden=true;try{const message=await fn();status.textContent=typeof message==='string'?message:text('คลังพร้อมใช้งาน','Library ready');}catch(e){status.textContent=e.message;}finally{job=null;busy=false;root.dataset.busy='false';actions.inert=false;cancel.hidden=progress.hidden=true;}}
    const report=value=>{progress.max=value.total||1;progress.value=value.done||0;status.textContent=text('ตรวจและบันทึกคลัง','Validating and storing archive')+` · ${value.done}/${value.total}`;};
    const matchLabel=node('label'),match=node('input');match.type='checkbox';match.checked=true;matchLabel.append(match,document.createTextNode(text('ตรวจให้ตรงกับคลังที่การ์ดระบุ (ปิดเมื่อนำเข้า Backup ที่แก้ไขแล้ว)','Match the card’s pinned archive (turn off for an edited backup)')));root.append(matchLabel);
    const importFiles=(files,isFolder)=>act(async()=>{const ticket=api.ticket(),expected=match.checked?api.ref():null;job=api.client.import(isFolder?{files:[...files].map(file=>({file,path:file.webkitRelativePath||file.name})),expected}:{zip:files[0],expected},report);cancel.hidden=false;const result=await job;cancel.hidden=true;await api.attach(result.ref,ticket);});
    file.addEventListener('change',()=>{if(file.files.length)void importFiles(file.files,false);file.value='';});folder.addEventListener('change',()=>{if(folder.files.length)void importFiles(folder.files,true);folder.value='';});
    button('Import World Pack ZIP','Import World Pack ZIP',()=>file.click());button('Import โฟลเดอร์','Import folder',()=>folder.click());
    button('ย้ายคลังฝังในการ์ดไป World Pack','Move embedded archive to World Pack',()=>void act(async()=>{const ticket=api.ticket();if(!ticket.owner)throw Error('Open a character card first.');
        job=api.client.rpc('externalize',{avatar:ticket.owner.slice(5),headers:ticket.context.getRequestHeaders()},report);cancel.hidden=false;const result=await job;cancel.hidden=true;await api.attach(result.ref,ticket,{clearEmbedded:true,sourceHash:result.sourceHash});}));
    const download=(blob,name,label)=>{const url=URL.createObjectURL(blob),a=node('a',label);downloadUrls.push(url);a.href=url;a.download=name;a.className='menu_button';downloads.append(a);downloads.hidden=false;};
    async function embed(exporting){const ticket=api.ticket(),catalog=await api.current();if(!api.valid(ticket))throw Error('Chat/card changed. Reopen World Pack settings.');
        job=api.client.rpc('embed',{sessionId:catalog.sessionId},report);cancel.hidden=false;const result=await job;cancel.hidden=true;
        if(!api.valid(ticket))throw Error('Chat/card or archive changed. Existing card data was kept.');
        await api.attach(result.ref,ticket,{payload:result.payload});
        if(exporting){const current=api.ticket();if(current.owner!==ticket.owner||current.metadata!==ticket.metadata||worldKey(current.ref||{})!==worldKey(result.ref))throw Error('Chat/card changed. Export from the intended card.');
            const card=await api.client.rpc('exportCard',{avatar:ticket.owner.slice(5),headers:ticket.context.getRequestHeaders(),expected:result.ref,compressedSha256:result.payload.compressedSha256});
            if(!api.valid(current))throw Error('Chat/card changed during export.');downloadOwner=ticket.owner;download(card.blob,card.name,text('ดาวน์โหลดการ์ดไฟล์เดียว','Download self-contained card'));}
        return text(exporting?'เตรียมการ์ดแล้ว · กดดาวน์โหลดด้านล่าง':'อัปเดตคลังฝังในการ์ดแล้ว · ส่งออกการ์ดจาก SillyTavern ได้ตามปกติ',exporting?'Card prepared. Download it below.':'Embedded archive updated. You can also export this card normally from SillyTavern.');
    }
    button('Update embedded archive','Update embedded archive',()=>void act(()=>embed(false)));
    button('Export self-contained card','Export self-contained card',()=>void act(()=>embed(true)));
    button('Export / Backup','Export / Backup',()=>void act(async()=>{const ticket=api.ticket(),catalog=await api.current(),result=await catalog.export();
        if(!api.valid(ticket))throw Error(text('การ์ดเปลี่ยนแล้ว กรุณาสำรองจากการ์ดที่ต้องการอีกครั้ง','Card changed. Prepare the backup again from the intended card.'));
        // Safari requires a fresh user gesture after the Worker finishes. Keep
        // real links available instead of two delayed programmatic downloads.
        downloadOwner=ticket.owner;download(result.blob,`${result.ref.archiveId}-backup.zip`,text('ดาวน์โหลด World Pack ZIP','Download World Pack ZIP'));
        download(new Blob([JSON.stringify(result.ref,null,2)],{type:'application/json'}),'roleforge-world-reference.json',text('ดาวน์โหลด reference JSON','Download reference JSON'));
        return text('เตรียมสำรองแล้ว · กดดาวน์โหลด ZIP ด้านล่าง ไฟล์ reference ใช้กับแพ็กสำรองนี้','Backup prepared. Download the ZIP below; the reference JSON belongs to this backup.');}));
    const libraries=node('select');libraries.className='text_pole';actions.append(libraries);
    button('ดูคลังที่ติดตั้ง','Refresh installed libraries',()=>void act(async()=>{libraries.replaceChildren();for(const row of await api.client.list()){const option=node('option',`${row.ref.archiveId} · ${row.ref.revision}`);option.value=JSON.stringify(row.ref);libraries.append(option);}}));
    button('เชื่อมคลังที่เลือก','Link selected library',()=>void act(async()=>{if(!libraries.value)throw Error(text('เลือกคลังก่อน','Choose a library first'));await api.attach(JSON.parse(libraries.value),api.ticket());}));
    cancel.type='button';cancel.className='menu_button';cancel.addEventListener('click',()=>job?.cancel());
    clearDownloads();root.dataset.busy='false';root.replaceChildren(heading,note,status,matchLabel,actions,downloads,progress,cancel,file,folder);
    return {update(){if(downloadOwner&&downloadOwner!==api.owner())clearDownloads();if(!busy){const ref=api.ref();status.textContent=ref?`${ref.archiveId} · ${ref.revision} · ${api.client.peek(api.owner(),ref)?text('พร้อมใช้','ready'):text('ยังไม่โหลด · Import/เชื่อมคลังในเบราว์เซอร์นี้','not loaded · import/link the archive in this browser')}`:text('การ์ดนี้ใช้คลังฝังในการ์ด','This card uses an embedded archive');}}};
}
