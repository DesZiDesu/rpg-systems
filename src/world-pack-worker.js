import {inflateSync,zipSync,strToU8} from './vendor/fflate/index.js?v=0.79.1';
import {WORLD_LIMITS,WORLD_PAYLOAD_FIELD,WORLD_REF_FIELD,worldError,validateInlinePayload,worldPath,safeWorldJson,worldHash,worldRandomId,worldRef,worldKey,validateWorldManifest,validateWorldIndexes,worldSearchText} from './world-pack-core.js?v=0.79.1';
import {decodeInlineFiles,encodeInlineFiles} from './world-pack-inline.js?v=0.79.1';
import {npcArchiveSummary,loreArchiveSummary} from './archive-cache.js?v=0.79.1';
import {prepareLoreArchive,selectLore} from './lore-core.js?v=0.79.1';
import {NPC_ICON_UPDATE_BYTES,validateNpcIconUpdate,checkNpcIconTarget,planNpcIconUpdate} from './npc-icon-update.js?v=0.79.1';
import {STORY_PACK_FIELD,validateStoryPack,validateStoryEntry,storySummary} from './story-core.js?v=0.79.1';

const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true}),sessions=new Map(),cancelled=new Set();
const request=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
let database;
async function db(){return database||=await new Promise((resolve,reject)=>{const r=indexedDB.open('roleforge-world-packs',1);r.onupgradeneeded=()=>{r.result.createObjectStore('packs');r.result.createObjectStore('files');r.result.createObjectStore('edits');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(store,mode,run){const t=(await db()).transaction(store,mode),done=new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('World Pack storage was aborted'));});try{const result=await run(t.objectStore(store));await done;return result;}catch(e){try{t.abort();}catch{}await done.catch(()=>{});throw e;}}
const read=(store,key)=>transaction(store,'readonly',s=>request(s.get(key)));
const write=(store,key,value)=>transaction(store,'readwrite',s=>request(s.put(value,key)));
const fileAt=(key,path)=>read('files',[key,path]);
const progress=(id,phase,done,total)=>postMessage({id,progress:{phase,done,total}});
const checkCancelled=id=>{if(cancelled.has(id))throw Error('World Pack import cancelled');};
function storyMeta(raw){if(!raw)return null;const p=validateStoryPack({...raw,entries:[]});const {entries,...meta}=p;return meta;}
async function validatedStories(manifest,index,storageKey,job){
    if(!manifest.indexes?.stories)return {meta:null,summaries:[]};
    const meta=storyMeta(manifest.storyPack);if(!Array.isArray(index)||index.length!==manifest.counts.storyTemplates)throw Error('Story index/count mismatch');
    const ids=new Set(),paths=new Set(manifest.files.map(f=>f.path)),summaries=[];
    for(const row of index){checkCancelled(job);if(!row?.id||ids.has(row.id)||!paths.has(worldPath(row.path)))throw Error('Duplicate or missing story file');ids.add(row.id);const value=validateStoryEntry(await fileAt(storageKey,row.path));if(value.id!==row.id)throw Error('Story identity mismatch');summaries.push(storySummary(value));}
    return {meta,summaries};
}

// Inspect central directory before inflation, including uncompressed size limits.
function zipMembers(bytes){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
    if(end<0||view.getUint16(end+4,true)||view.getUint16(end+6,true))throw Error('Invalid or multipart World Pack ZIP');
    const count=view.getUint16(end+10,true);if(count===65535||count>WORLD_LIMITS.files)throw Error('ZIP64/oversized World Pack is unsupported');
    let offset=view.getUint32(end+16,true),total=0;const members=new Map();
    for(let i=0;i<count;i++){
        if(offset+46>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw Error('Invalid ZIP directory');
        const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),size=view.getUint32(offset+24,true),nameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
        const name=decoder.decode(bytes.subarray(offset+46,offset+46+nameLength));offset+=46+nameLength+extra+comment;
        if(name.endsWith('/'))continue;worldPath(name);
        if(members.has(name)||flags&1||![0,8].includes(method)||size>WORLD_LIMITS.total||compressed>WORLD_LIMITS.zip)throw Error('Duplicate, encrypted or oversized ZIP member');
        total+=size;if(total>WORLD_LIMITS.total)throw Error('ZIP decompressed size limit exceeded');
        members.set(name,async()=>{
            if(local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)throw Error('Invalid ZIP member header');
            const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
            if(start+compressed>bytes.length)throw Error('Truncated ZIP member');
            const data=bytes.subarray(start,start+compressed),result=method===0?data:inflateSync(data,{out:new Uint8Array(size)});
            if(result.length!==size)throw Error('ZIP member size mismatch');return result;
        });
    }return members;
}
async function importSources({zip,files,inline,expected},id){
    if(inline){if(!worldRef(expected))throw worldError('WORLD_PACK_INLINE_INVALID','An embedded archive requires its pinned reference');return decodeInlineFiles(inline,{check:()=>checkCancelled(id),progress:value=>progress(id,value.phase,value.done,value.total)});}
    if(zip){if(zip.size>WORLD_LIMITS.zip)throw Error('World Pack ZIP is too large');return zipMembers(new Uint8Array(await zip.arrayBuffer()));}
    if(!Array.isArray(files)||files.length>WORLD_LIMITS.files)throw Error('Select a World Pack ZIP or folder');
    const result=new Map();let total=0;
    for(const {path,file}of files){worldPath(path);if(result.has(path)||file.size>WORLD_LIMITS.total)throw Error('Duplicate or oversized World Pack file');total+=file.size;if(total>WORLD_LIMITS.total)throw Error('World Pack size limit exceeded');result.set(path,async()=>new Uint8Array(await file.arrayBuffer()));}
    return result;
}
async function removeStaging(key){await transaction('files','readwrite',async s=>{const range=IDBKeyRange.bound([key,''],[key,'\uffff']);await request(s.delete(range));});}
async function publish(stage,key,pack){
    const t=(await db()).transaction(['packs','files'],'readwrite'),packs=t.objectStore('packs'),files=t.objectStore('files');
    let reused=false;const done=new Promise((resolve,reject)=>{t.oncomplete=()=>resolve(reused);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('World Pack commit failed'));});
    const range=IDBKeyRange.bound([stage,''],[stage,'\uffff']),existing=packs.get(key);
    existing.onsuccess=()=>{if(existing.result?.ready){reused=true;files.delete(range);return;}
        const cursor=files.openCursor(range);cursor.onsuccess=()=>{if(cursor.result){files.put(cursor.result.value,[key,cursor.result.key[1]]);cursor.result.continue();}
            else{packs.put(pack,key);files.delete(range);}};};
    return done;
}
async function importWorld(payload,id){
    checkCancelled(id);const members=await importSources(payload,id),manifests=[...members.keys()].filter(p=>p==='manifest.json'||p.endsWith('/manifest.json'));
    if(manifests.length!==1)throw Error('Select one World Pack containing manifest.json');
    const path=manifests[0],prefix=path.slice(0,-'manifest.json'.length),manifestBytes=await members.get(path)();
    if(manifestBytes.length>WORLD_LIMITS.record)throw Error('World Pack manifest size limit exceeded');
    const manifest=validateWorldManifest(safeWorldJson(decoder.decode(manifestBytes)));
    const manifestSha256=await worldHash(manifestBytes),ref=worldRef({format:'roleforge-world-archive-ref',version:1,archiveId:manifest.archiveId,revision:manifest.revision,manifestPath:'manifest.json',manifestSha256,required:true,counts:manifest.counts}),key=worldKey(ref);
    if(payload.expected&&worldKey(worldRef(payload.expected))!==key)throw Error('World Pack does not match this card’s pinned archive revision/hash');
    const existing=Boolean((await read('packs',key))?.ready),stage=key+'#'+worldRandomId(),storageKey=existing?key:stage;
    const indexFiles=new Map();let done=0;
    try{
        for(let offset=0;offset<manifest.files.length;offset+=32){checkCancelled(id);const batch=[];
            for(const row of manifest.files.slice(offset,offset+32)){
                const source=members.get(prefix+row.path);if(!source)throw Error('Missing World Pack file: '+row.path);
                const bytes=await source();if(bytes.length!==row.bytes||await worldHash(bytes)!==row.sha256.toLowerCase())throw Error('World Pack hash/size mismatch: '+row.path);
                const value=safeWorldJson(decoder.decode(bytes));batch.push([row.path,value]);
                if([manifest.indexes.npcs,manifest.indexes.lore,manifest.indexes.stories].includes(row.path))indexFiles.set(row.path,value);
            }
            if(!existing)await transaction('files','readwrite',async s=>{for(const [path,value]of batch)s.put(value,[stage,path]);});
            done+=batch.length;progress(id,'validate',done,manifest.files.length);
        }
        validateWorldIndexes(manifest,indexFiles.get(manifest.indexes.npcs),indexFiles.get(manifest.indexes.lore));
        const stories=await validatedStories(manifest,indexFiles.get(manifest.indexes.stories),storageKey,id);
        if(existing)return {ref,reused:true};
        // Resolve every ID, version and supplement link before publishing readiness.
        let supplements=0;const npcSummaries=[];
        for(const row of indexFiles.get(manifest.indexes.npcs)){
            checkCancelled(id);const base=await fileAt(storageKey,row.basePath);if(base?.id!==row.id||base.name!==row.name)throw Error('NPC base identity mismatch');
            const versions=new Map();for(const v of row.versions){const value=await fileAt(storageKey,v.path);if(value?.id!==v.id||!value.fields||typeof value.fields!=='object'||Array.isArray(value.fields))throw Error('NPC version identity mismatch');versions.set(v.id,value);}
            const selected=row.defaultVersionId??base.activeAlternateId??'';
            npcSummaries.push({...npcArchiveSummary({...base,activeAlternateId:selected,alternateProfiles:versions.has(selected)?[versions.get(selected)]:[]},row.id),
                activeAlternateId:selected,versions:row.versions.map(v=>({id:v.id,label:v.label})),context:[row.sourceHint||''],_archiveSummary:true});
            if(npcSummaries.length%16===0)progress(id,'index',npcSummaries.length,manifest.counts.npcBodies);
            if(row.supplementsPath){const supplement=await fileAt(storageKey,row.supplementsPath);if(supplement?.npcId!==row.id||!Array.isArray(supplement.abilities))throw Error('NPC supplement mismatch');
                for(const a of supplement.abilities){const r=a.descriptionRef,fields=r?.versionId?versions.get(r.versionId)?.fields:null;if(r?.npcId!==row.id||r.versionId&&!fields||!(fields?.abilities??base.abilities??[]).some(p=>p.id===r.abilityId)||(a.versionIds||[]).some(v=>!versions.has(v)))throw Error('Unresolved ability supplement');}supplements+=supplement.abilities.length;
            }
        }
        for(const row of indexFiles.get(manifest.indexes.lore)){const value=await fileAt(storageKey,row.path);if(value?.id!==row.id||typeof value.content!=='string'||!value.content.trim())throw Error('Lore identity/content mismatch');}
        if(manifest.counts.abilitySupplements!==undefined&&supplements!==manifest.counts.abilitySupplements)throw Error('Ability supplement count mismatch');
        checkCancelled(id);const reused=await publish(stage,key,{ready:true,ref,manifest,manifestBytes,npcSummaries,storyMeta:stories.meta,storySummaries:stories.summaries,importedAt:new Date().toISOString()});progress(id,'ready',done,done);
        return {ref,reused};
    }catch(error){if(!existing)await removeStaging(stage).catch(()=>{});throw error;}
}
async function openSession({ref:raw,owner}){
    const ref=worldRef(raw);if(!ref)throw worldError('WORLD_PACK_REFERENCE_INVALID','Invalid World Pack reference');
    const key=worldKey(ref),pack=await read('packs',key);if(!pack)throw worldError('WORLD_PACK_MISSING','World Pack is missing in this browser. Use an embedded card or import its ZIP/folder.');
    if(!pack.ready||worldKey(pack.ref)!==key||!pack.manifest)throw worldError('WORLD_PACK_STORAGE_INVALID','Stored World Pack is incomplete or invalid. Existing data was kept; restore a verified backup.');
    const sessionId=key+'\u0000'+owner;
    if(sessions.has(sessionId))return sessionView(sessions.get(sessionId));
    const npcIndex=await fileAt(key,pack.manifest.indexes.npcs),loreIndex=await fileAt(key,pack.manifest.indexes.lore),edits=new Map(await transaction('edits','readonly',s=>request(s.getAll(IDBKeyRange.bound([key,owner,''],[key,owner,'\uffff'])))));
    if(!Array.isArray(npcIndex)||!Array.isArray(loreIndex))throw worldError('WORLD_PACK_STORAGE_INVALID','Stored World Pack indexes are missing. Existing data was kept; restore a verified backup.');
    const storyIndex=pack.manifest.indexes.stories?await fileAt(key,pack.manifest.indexes.stories):[];
    const storyCache=pack.storySummaries?{meta:pack.storyMeta,summaries:pack.storySummaries}:await validatedStories(pack.manifest,storyIndex,key,0);
    const storyHeader=edits.get('story-meta')?.value||storyCache.meta;
    const storyRows=new Map(storyCache.summaries.map(r=>[r.id,r]));
    for(const [k,edit]of edits)if(k.startsWith('stories:')){const identity=k.slice(8);if(edit.deleted)storyRows.delete(identity);else storyRows.set(identity,storySummary(edit.value));}
    const s={key,owner,sessionId,pack,npcIndex,loreIndex,edits,revision:0,npcs:[],lore:[],bodies:new Map(),storyIndex,storyMeta:storyHeader,stories:[...storyRows.values()]};
    const derived=new Map((pack.npcSummaries||[]).map(value=>[value.id,value]));
    for(const row of npcIndex){const edit=edits.get('npcs:'+row.id);if(edit?.deleted)continue;
        if(!edit&&derived.has(row.id)){s.npcs.push({...derived.get(row.id),npcOwner:owner});continue;}
        const base=edit?.value||await fileAt(key,row.basePath),selected=edit?base.activeAlternateId||'':row.defaultVersionId??base.activeAlternateId??'',alternate=row.versions.find(v=>v.id===selected),profile=alternate?await fileAt(key,alternate.path):null,
            summary=npcArchiveSummary({...base,alternateProfiles:base.alternateProfiles||(profile?[profile]:[]),activeAlternateId:selected},row.id,owner);
        s.npcs.push({...summary,activeAlternateId:base.activeAlternateId??row.defaultVersionId,versions:edit?.value?.alternateProfiles?.map(v=>({id:v.id,label:v.label}))||row.versions.map(v=>({id:v.id,label:v.label})),context:[...(summary.context||[]),row.sourceHint||''],_archiveSummary:true});
    }
    for(const row of loreIndex){const edit=edits.get('lore:'+row.id);if(edit?.deleted)continue;const raw=edit?.value||await fileAt(key,row.path);s.lore.push(raw);}
    for(const [key,edit]of edits){if(edit.deleted)continue;const [kind]=key.split(':');if(kind==='npcs'&&!npcIndex.some(r=>r.id===edit.value.id))s.npcs.push({...npcArchiveSummary(edit.value,edit.value.id,owner),_archiveSummary:true});if(kind==='lore'&&!loreIndex.some(r=>r.id===edit.value.id))s.lore.push(edit.value);}
    s.loreRaw=s.lore;s.lore=prepareLoreArchive(s.loreRaw);sessions.set(sessionId,s);return sessionView(s);
}
function sessionView(s){return {sessionId:s.sessionId,revision:s.revision,ref:s.pack.ref,counts:s.pack.manifest.counts,npcs:s.npcs,storyMeta:s.storyMeta,stories:s.stories,lore:s.loreRaw.map(raw=>({...loreArchiveSummary(raw,raw.id),searchText:worldSearchText(raw.content),_archiveSummary:true}))};}
async function storyBody(s,identity){const edit=s.edits.get('stories:'+identity);if(edit)return edit.deleted?null:edit.value;const row=s.storyIndex.find(r=>r.id===identity);return row?validateStoryEntry(await fileAt(s.key,row.path)):null;}
async function editStories({sessionId,pack:raw},job){
    const s=sessions.get(sessionId);if(!s)throw Error('World Pack session expired');
    const meta=storyMeta(raw),entries=raw.entries;if(!Array.isArray(entries))throw Error('Invalid story library edit');
    const oldById=new Map(s.stories.map(r=>[r.id,r])),ids=new Set(),updates=[];
    for(const entry of entries){checkCancelled(job);if(ids.has(entry.id))throw Error('Duplicate story identity');ids.add(entry.id);
        if(entry._storySummary){const old=oldById.get(entry.id);if(!old)throw Error('Story summary expired');if(entry.enabled!==old.enabled){const value=await storyBody(s,entry.id);updates.push(['stories:'+entry.id,{value:validateStoryEntry({...value,enabled:entry.enabled,revision:value.revision+1})}]);}}
        else updates.push(['stories:'+entry.id,{value:validateStoryEntry(entry)}]);}
    for(const row of s.stories)if(!ids.has(row.id))updates.push(['stories:'+row.id,{deleted:true}]);
    updates.push(['story-meta',{value:meta}]);
    await transaction('edits','readwrite',async store=>{for(const [k,v]of updates)store.put([k,v],[s.key,s.owner,k]);});
    for(const [k,v]of updates)s.edits.set(k,v);const rows=new Map(oldById);for(const [k,v]of updates)if(k.startsWith('stories:')){const identity=k.slice(8);if(v.deleted)rows.delete(identity);else rows.set(identity,storySummary(v.value));}
    s.storyMeta=meta;s.stories=[...rows.values()];s.revision++;return sessionView(s);
}
async function body(s,id){const edit=s.edits.get('npcs:'+id);if(edit)return edit.deleted?null:edit.value;const row=s.npcIndex.find(r=>r.id===id);if(!row)return null;
    const base=await fileAt(s.key,row.basePath),versions=[];for(const v of row.versions)versions.push(await fileAt(s.key,v.path));
    return {...base,alternateProfiles:versions,activeAlternateId:row.defaultVersionId??base.activeAlternateId??'',npcScope:'character',npcOwner:s.owner};
}
async function editSession({sessionId,kind,entries},id){const s=sessions.get(sessionId);if(!s||!['npcs','lore'].includes(kind)||!Array.isArray(entries))throw Error('Invalid World Pack edit');
    const old=kind==='npcs'?s.npcs:s.loreRaw,oldById=new Map(old.map(e=>[e.id,e])),retained=new Set(entries.map(e=>e.id)),updates=[];
    if(retained.size!==entries.length||entries.some(e=>typeof e.id!=='string'||!e.id||['__proto__','prototype','constructor'].includes(e.id)))throw Error('Duplicate or invalid archive record');
    for(const row of old)if(!retained.has(row.id))updates.push([kind+':'+row.id,{deleted:true}]);
    for(const entry of entries){if(entry._archiveSummary){const previous=oldById.get(entry.id);if(!previous)throw Error('World Pack summary expired');
            if(entry.enabled!==previous.enabled){const value=kind==='npcs'?await body(s,entry.id):previous;updates.push([kind+':'+entry.id,{value:{...value,enabled:entry.enabled}}]);}
        }else{if(!entry.id||!entry.name&&kind==='npcs'||!entry.title&&kind==='lore')throw Error('Invalid World Pack record');updates.push([kind+':'+entry.id,{value:entry}]);}}
    await transaction('edits','readwrite',async store=>{for(const [key,value]of updates)store.put([key,value],[s.key,s.owner,key]);});
    for(const [key,value]of updates)s.edits.set(key,value);
    const summaries=new Map(oldById);
    for(const [key,change]of updates){const identity=key.slice(kind.length+1);if(change.deleted){summaries.delete(identity);continue;}
        if(kind==='npcs'){const raw=change.value,original=oldById.get(identity);summaries.set(identity,{...npcArchiveSummary(raw,identity,s.owner),context:original?.context||[],_archiveSummary:true});}
        else summaries.set(identity,change.value);
    }
    if(kind==='npcs')s.npcs=[...summaries.values()];else{s.loreRaw=[...summaries.values()];s.lore=prepareLoreArchive(s.loreRaw);}
    s.revision++;return sessionView(s);
}
async function exportFiles({sessionId,storyPack},id,iconUpdates){const current=sessions.get(sessionId);if(!current)throw Error('Open a World Pack first');
    const s={...current,edits:new Map(current.edits),npcs:[...current.npcs],loreRaw:[...current.loreRaw],stories:[...current.stories]};
    if(storyPack){const pack=validateStoryPack(storyPack);s.storyMeta=storyMeta(pack);s.stories=pack.entries.map(storySummary);for(const entry of pack.entries)s.edits.set('stories:'+entry.id,{value:entry});}
    // Virtual edits for an image-only update. Do not mutate the live session or
    // its durable edits until the fully validated new revision is on the card.
    if(iconUpdates)for(const [key,value]of iconUpdates)s.edits.set('npcs:'+key,{value});
    // Build a complete portable revision including this card’s explicit edits.
    const payload=Object.create(null),npcIndex=[],loreIndex=[];
    for(const row of s.npcs){checkCancelled(id);const value=await body(s,row.id),{alternateProfiles,...base}=value,segment=encodeURIComponent(row.id).replaceAll('.','%2E'),basePath=`npcs/${segment}/base.json`,versions=[];
        const original=s.npcIndex.find(n=>n.id===row.id),sourceBase=original?await fileAt(s.key,original.basePath):null;
        if(sourceBase&&Object.hasOwn(sourceBase,'alternateProfiles'))base.alternateProfiles=[];
        payload[basePath]=base;
        for(const v of alternateProfiles||[]){const path=`npcs/${segment}/versions/${encodeURIComponent(v.id).replaceAll('.','%2E')}.json`;worldPath(path);payload[path]=v;versions.push({id:v.id,label:v.label,path});}
        const supplementsPath=original?.supplementsPath;
        if(supplementsPath){const supplement=await fileAt(s.key,supplementsPath),validVersions=new Set(versions.map(v=>v.id));
            payload[supplementsPath]={...supplement,abilities:supplement.abilities.filter(a=>!a.descriptionRef.versionId||validVersions.has(a.descriptionRef.versionId)).map(a=>({...a,versionIds:(a.versionIds||[]).filter(id=>validVersions.has(id))}))};}
        npcIndex.push({id:row.id,name:base.name,aliases:base.aliases||[],identityColor:base.identityColor,roleIcon:base.roleIcon,basePath,defaultVersionId:base.activeAlternateId||'',versions,...(supplementsPath?{supplementsPath}:{}),sourceHint:original?.sourceHint||''});
    }
    for(const row of s.loreRaw){const path=`lore/${encodeURIComponent(row.id).replaceAll('.','%2E')}.json`;worldPath(path);payload[path]=row;loreIndex.push({id:row.id,title:row.title,keywords:row.keywords,enabled:row.enabled,always:row.always,path});}
    payload['indexes/npcs.json']=npcIndex;payload['indexes/lore.json']=loreIndex;payload['presets.json']=await fileAt(s.key,s.pack.manifest.presets);
    if(s.storyMeta){const index=[];for(const row of s.stories){const path=`stories/${encodeURIComponent(row.id).replaceAll('.','%2E')}.json`;worldPath(path);payload[path]=await storyBody(s,row.id);index.push({id:row.id,path});}payload['indexes/stories.json']=index;}
    const files=[],zipped=Object.create(null);for(const [path,value]of Object.entries(payload)){const bytes=encoder.encode(JSON.stringify(value));files.push({path,bytes:bytes.length,sha256:await worldHash(bytes)});zipped[path]=bytes;}
    const manifest={...s.pack.manifest,revision:s.pack.ref.revision.slice(0,60)+'-backup-'+Date.now().toString(36)+'-'+worldRandomId().slice(0,8),files,counts:{...s.pack.manifest.counts,npcBodies:npcIndex.length,nativeVersions:npcIndex.reduce((n,r)=>n+r.versions.length,0),worldLore:loreIndex.length,abilitySupplements:Object.values(payload).filter(p=>p?.npcId&&Array.isArray(p.abilities)).reduce((n,p)=>n+p.abilities.length,0)}};
    if(s.storyMeta){manifest.indexes={...manifest.indexes,stories:'indexes/stories.json'};manifest.storyPack=s.storyMeta;manifest.counts.storyTemplates=s.stories.length;}
    const bytes=encoder.encode(JSON.stringify(manifest));zipped['manifest.json']=bytes;
    const ref={...s.pack.ref,counts:manifest.counts,revision:manifest.revision,manifestSha256:await worldHash(bytes)};
    if(current.revision!==s.revision)throw worldError('WORLD_PACK_CHANGED','Archive changed during export. Retry with the latest saved edits.');
    checkCancelled(id);return {files:zipped,ref,sourceRevision:s.revision};
}

async function exportSession(payload,id){const {files,ref}=await exportFiles(payload,id);return {blob:new Blob([zipSync(files,{level:6})],{type:'application/zip'}),ref};}
async function embedSession(payload,id,iconUpdates){
    const built=await exportFiles(payload,id,iconUpdates),inline=await encodeInlineFiles(new Map(Object.entries(built.files)),{check:()=>checkCancelled(id),progress:value=>progress(id,value.phase,value.done,value.total)});
    // Publish the new revision before changing the card. The previous revision
    // and this card's edits remain untouched if storage or card saving fails.
    const files=Object.entries(built.files).map(([path,bytes])=>({path,file:new Blob([bytes])}));
    await importWorld({files,expected:built.ref},id);
    if(sessions.get(payload.sessionId)?.revision!==built.sourceRevision)throw worldError('WORLD_PACK_CHANGED','Archive changed during embedding. Retry with the latest saved edits.');
    return {ref:built.ref,payload:inline,sourceRevision:built.sourceRevision};
}
const iconPlans=new Map();
async function reviewIcons({file,sessionId,records,target,replaceExisting=false},id){
    if(!file||file.size>NPC_ICON_UPDATE_BYTES)throw Error('NPC icon update exceeds the 16 MiB limit');
    const patch=validateNpcIconUpdate(safeWorldJson(await file.text())),s=sessionId?sessions.get(sessionId):null;
    if(sessionId&&!s)throw Error('World Pack session expired');
    const actual=s?{...target,archiveId:s.pack.ref.archiveId}:target,revision=s?.revision;
    checkNpcIconTarget(patch,actual||{});
    const byId=new Map();
    if(s){const ids=[...new Set(patch.entries.map(e=>e.npcId))];for(let i=0;i<ids.length;i++){checkCancelled(id);const value=await body(s,ids[i]);if(value)byId.set(value.id,value);if(i%16===0)progress(id,'icons',i,ids.length);}}
    else{if(!Array.isArray(records))throw Error('Open a character archive first');for(const r of records)byId.set(r.id,r);}
    const plan=planNpcIconUpdate(patch,byId,{target:actual,replaceExisting});
    if(s&&s.revision!==revision)throw worldError('WORLD_PACK_CHANGED','Archive changed during icon review. Review the update again.');
    checkCancelled(id);const token=worldRandomId();while(iconPlans.size>=3)iconPlans.delete(iconPlans.keys().next().value);
    iconPlans.set(token,{sessionId,revision,plan,records});
    return {token,name:patch.name,counts:plan.counts,icons:patch.icons,rows:plan.rows.map(({icon,...r},i)=>({...r,icon:patch.entries[i].icon??null})),backup:new Blob([JSON.stringify(plan.backup,null,2)],{type:'application/json'})};
}
async function applyIcons({token},id){
    const prepared=iconPlans.get(token);if(!prepared)throw Error('Icon review expired. Choose the update file again.');
    const {sessionId,revision,plan,records}=prepared;
    if(!plan.counts.changed)throw Error('No icon changes to apply');
    checkCancelled(id);
    if(!sessionId)return {records:records.map(r=>plan.updates.get(r.id)||r),counts:plan.counts};
    if(sessions.get(sessionId)?.revision!==revision)throw worldError('WORLD_PACK_CHANGED','Archive changed after review. Review the icons again.');
    return {...await embedSession({sessionId},id,plan.updates),counts:plan.counts};
}
async function exportCard({avatar,headers,expected,compressedSha256}){
    const response=await fetch('/api/characters/export',{method:'POST',headers,body:JSON.stringify({avatar_url:avatar,format:'json'})});
    if(!response.ok)throw Error('Could not export the saved card (HTTP '+response.status+')');
    const blob=await response.blob();if(blob.size>WORLD_LIMITS.total)throw Error('Character card exceeds export size limit');
    const card=safeWorldJson(await blob.text()),ext=card.data?.extensions||{};
    if(worldKey(worldRef(ext[WORLD_REF_FIELD])||{})!==worldKey(expected)||validateInlinePayload(ext[WORLD_PAYLOAD_FIELD]).compressedSha256!==compressedSha256)throw worldError('WORLD_PACK_CHANGED','Card changed during export. Prepare the self-contained card again.');
    return {blob,name:String(card.data?.name||card.name||'RoleForge').replace(/[\\/:*?"<>|\x00-\x1f]/gu,'_')+'-self-contained.json'};
}

async function externalizeNative({avatar,headers},id){
    const response=await fetch('/api/characters/export',{method:'POST',headers,body:JSON.stringify({avatar_url:avatar,format:'json'})});
    if(!response.ok)throw Error('Could not read the original card for migration (HTTP '+response.status+')');
    const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>WORLD_LIMITS.total)throw Error('Embedded card is too large');
    const card=safeWorldJson(decoder.decode(bytes)),extensions=card.data?.extensions||card.extensions||{};
    if(extensions.roleforge_world_archive)throw Error('This card already references a World Pack. Import its original pack to preserve supplements.');
    const npcs=extensions.tretaresia_rpg_npcs||[],lore=extensions.tretaresia_rpg_lore||[];
    const storyPack=extensions[STORY_PACK_FIELD]?validateStoryPack(extensions[STORY_PACK_FIELD]):null;
    if(!Array.isArray(npcs)||!Array.isArray(lore)||!npcs.length&&!lore.length&&!storyPack?.entries.length)throw Error('No embedded RoleForge archive to move');
    const payload=Object.create(null),npcIndex=[],loreIndex=[],segment=id=>encodeURIComponent(id).replaceAll('.','%2E');let versions=0;
    for(const npc of npcs){if(!npc?.id)throw Error('Save legacy NPC identities before moving this archive');const {alternateProfiles=[],...base}=npc,basePath=`npcs/${segment(npc.id)}/base.json`,list=[];payload[basePath]=base;
        for(const v of alternateProfiles){const path=`npcs/${segment(npc.id)}/versions/${segment(v.id)}.json`;payload[path]=v;list.push({id:v.id,label:v.label,path});versions++;}
        npcIndex.push({id:npc.id,name:npc.name,aliases:npc.aliases||[],identityColor:npc.identityColor,roleIcon:npc.roleIcon,basePath,defaultVersionId:npc.activeAlternateId||'',versions:list});
    }
    for(const entry of lore){if(!entry?.id)throw Error('Save legacy Lore identities before moving this archive');const path=`lore/${segment(entry.id)}.json`;payload[path]=entry;loreIndex.push({id:entry.id,title:entry.title,keywords:entry.keywords||[],enabled:entry.enabled,always:entry.always,path});}
    payload['indexes/npcs.json']=npcIndex;payload['indexes/lore.json']=loreIndex;payload['presets.json']=extensions.roleforge_character_pack||{format:'roleforge-character-pack',version:1};
    if(storyPack){const index=[];for(const entry of storyPack.entries){const path=`stories/${segment(entry.id)}.json`;payload[path]=entry;index.push({id:entry.id,path});}payload['indexes/stories.json']=index;}
    const files=[],sources=[];
    for(const [path,value]of Object.entries(payload)){worldPath(path);const raw=encoder.encode(JSON.stringify(value));files.push({path,bytes:raw.length,sha256:await worldHash(raw)});sources.push({path,file:new Blob([raw])});}
    const sourceHash=await worldHash(bytes),manifest={format:'roleforge-world-pack',version:1,archiveId:'local-world-'+sourceHash.slice(0,24),revision:'1',counts:{npcBodies:npcs.length,nativeVersions:versions,worldLore:lore.length,abilitySupplements:0},indexes:{npcs:'indexes/npcs.json',lore:'indexes/lore.json'},presets:'presets.json',files};
    if(storyPack){manifest.indexes.stories='indexes/stories.json';manifest.storyPack=storyMeta(storyPack);manifest.counts.storyTemplates=storyPack.entries.length;}
    sources.push({path:'manifest.json',file:new Blob([JSON.stringify(manifest)])});return {...await importWorld({files:sources},id),sourceHash};
}

const actions={import:importWorld,externalize:externalizeNative,open:openSession,
    async storyRecord({sessionId,id}){const s=sessions.get(sessionId);if(!s)throw Error('World Pack session expired');return storyBody(s,id);},
    async storyExport({sessionId}){const s=sessions.get(sessionId);if(!s?.storyMeta)return null;const entries=[];for(const row of s.stories)entries.push(await storyBody(s,row.id));return validateStoryPack({...s.storyMeta,entries});},
    storyEdit:editStories,
    async verifySource({avatar,headers,sourceHash}){const r=await fetch('/api/characters/export',{method:'POST',headers,body:JSON.stringify({avatar_url:avatar,format:'json'})});if(!r.ok||await worldHash(await r.arrayBuffer())!==sourceHash)throw Error('The card changed during migration. Embedded data was kept; retry from the updated card.');return true;},
    async records({sessionId,ids}){const s=sessions.get(sessionId);if(!s)throw Error('World Pack session expired');return Promise.all([...new Set(ids)].slice(0,32).map(id=>body(s,id)));},
    async lore({sessionId,query,options}){const s=sessions.get(sessionId);if(!s)throw Error('World Pack session expired');return selectLore(s.lore,options,query).entries;},
    async loreRecord({sessionId,id}){return sessions.get(sessionId)?.loreRaw.find(r=>r.id===id)||null;},
    async supplements({sessionId,id,versionId,abilityId,query=''}){const s=sessions.get(sessionId),row=s?.npcIndex.find(r=>r.id===id);if(!row?.supplementsPath||!abilityId)return [];
        const supplement=await fileAt(s.key,row.supplementsPath),version=row.versions.find(v=>v.id===versionId);
        return (supplement.abilities||[]).filter(a=>(a.versionIds||[]).includes(versionId)&&a.abilityId===abilityId)
            .filter(a=>!/atlasacademy|FGO|strengthStatus|Data unlock conditions/iu.test(a.additionalText)||/FGO|Grand Order/iu.test(version?.label||'')||/FGO|Grand Order|technical|simulation|ข้อมูลเกม|ข้อมูลอ้างอิง/iu.test(query))
            .slice(0,3).map(a=>({id:a.id,classification:a.classification,additionalText:a.additionalText,descriptionRef:a.descriptionRef,sourceRestriction:'Source-specific technical reference/citation only. A simulation duration or numeric unlock condition grants no in-story power, knowledge or unlock.'}));},
    edit:editSession,export:exportSession,embed:embedSession,exportCard,reviewIcons,applyIcons,
    async list(){return transaction('packs','readonly',async s=>(await request(s.getAll())).filter(p=>p.ready).map(p=>({ref:p.ref,importedAt:p.importedAt})));},
};
self.onmessage=async({data:{id,action,payload}})=>{if(action==='cancel'){cancelled.add(payload.id);return;}try{const result=await actions[action](payload,id);postMessage({id,result});}catch(error){postMessage({id,error:{message:error.message,name:error.name,code:error.code}});}finally{cancelled.delete(id);}};
