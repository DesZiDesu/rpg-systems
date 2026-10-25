// Chat state holds selected dossiers and field deltas. Canon and historical
// versions stay in a reference catalog, outside serialized state/checkpoints.
import {pruneNpcReferences} from './npc-scopes.js?v=0.86.2';
const UNSAFE=new Set(['__proto__','constructor','prototype']);
const RESERVED=new Set([...UNSAFE,'id','npcScope','npcOwner']);
const baselineReferences=new WeakMap(),arrayIndexes=new WeakMap();
const absent=Object.freeze({_roleforge_absent:true});
const own=(value,key)=>Boolean(value)&&Object.hasOwn(value,key);
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const copy=value=>value===undefined?undefined:globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=500&&!UNSAFE.has(id);
const ids=value=>[...new Set((Array.isArray(value)?value:[]).filter(validId))];
const encode=value=>value===undefined?absent:copy(value);
const decode=value=>value&&typeof value==='object'&&value._roleforge_absent===true&&Object.keys(value).length===1?undefined:value;

export function sameNpcValue(a,b) {
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
    const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>own(b,key)&&sameNpcValue(a[key],b[key]));
}

// Editors normalize the fields they expose. Preserve untouched raw canon,
// including longer legacy text and supplemental/unknown metadata.
export function preserveNpcCanon(raw,next,before) {
    if(sameNpcValue(next,before))return copy(raw);
    if(Array.isArray(next)){
        if(next.every(value=>value&&typeof value==='object'&&typeof value.id==='string')){const result=next.map(value=>{
            const original=Array.isArray(raw)?raw.find(r=>r.id===value.id):null,previous=Array.isArray(before)?before.find(r=>r.id===value.id):null;
            return original&&previous?preserveNpcCanon(original,value,previous):copy(value);
        });const previousIds=new Set((Array.isArray(before)?before:[]).map(v=>v.id)),nextIds=new Set(next.map(v=>v.id));
            for(const value of Array.isArray(raw)?raw:[])if(value?.id&&!previousIds.has(value.id)&&!nextIds.has(value.id))result.push(copy(value));return result;
        }return copy(next);
    }
    if(next&&before&&typeof next==='object'&&typeof before==='object'){
        const result=copy(record(raw));
        for(const key of Object.keys(before))if(!own(next,key))delete result[key];
        for(const [key,value]of Object.entries(next)){if(UNSAFE.has(key))continue;if(!sameNpcValue(value,before[key]))result[key]=preserveNpcCanon(raw?.[key],value,before[key]);}
        return result;
    }
    return copy(next);
}

function libraryView(library) {
    if(library&&typeof library.get==='function'&&typeof library.has==='function')return library;
    if(!Array.isArray(library))return new Map();
    if(!Object.isFrozen(library))return new Map(library.filter(p=>validId(p?.id)).map(p=>[p.id,p]));
    if(!arrayIndexes.has(library))arrayIndexes.set(library,new Map(library.filter(p=>validId(p?.id)).map(p=>[p.id,p])));
    return arrayIndexes.get(library);
}

export function inheritNpcBaselines(target,source,fallback) {
    const scope=target?.npcScopes;
    if(!scope||typeof scope!=='object')return target;
    const origin=[source?.npcScopes,fallback?.npcScopes].find(value=>value?.owner===scope.owner&&baselineReferences.has(value));
    if(origin)baselineReferences.set(scope,baselineReferences.get(origin));
    return target;
}

export function sparseNpcScope(value,owner=value?.owner||'') {
    const source=value?.owner===owner?value:{};
    const clean=field=>Object.fromEntries(Object.entries(record(source[field])).filter(([id,data])=>validId(id)&&data&&typeof data==='object'&&!Array.isArray(data))
        .map(([id,data])=>[id,Object.fromEntries(Object.entries(data).filter(([key])=>!RESERVED.has(key)).map(([key,item])=>[key,copy(item)]))]));
    const overrides=clean('overrides'),bases={};
    for(const [id,delta]of Object.entries(overrides)){
        const original=source.bases?.[id];if(!original)continue;
        bases[id]=baselineSubset(delta,original);
    }
    const archives={};
    for(const [key,value]of Object.entries(record(source.archives)))if(validId(key)&&value&&typeof value==='object'){
        const {archives:ignored,...fields}=value;const saved=sparseNpcScope({...fields,owner,archives:undefined},owner);
        delete saved.archives;archives[key]=saved;
    }
    const result={format:2,owner,archiveId:typeof source.archiveId==='string'?source.archiveId:'',archiveRevision:source.archiveRevision??'',overrides,bases,hidden:ids(source.hidden),activeIds:ids(source.activeIds),archives};
    if(baselineReferences.has(source))baselineReferences.set(result,baselineReferences.get(source));
    return result;
}

function baselineSubset(delta,before) {
    const result={};
    for(const [key,value]of Object.entries(record(delta))){
        if(RESERVED.has(key)||!own(before,key))continue;
        if(key==='alternateProfiles'){
            const versions=[];
            for(const version of Array.isArray(value)?value:[]){
                const original=before[key]?.find(p=>p.id===version.id);
                if(original)versions.push({id:version.id,...baselineSubset(version,original)});
            }
            if(versions.length)result[key]=versions;
        }else if(['stats','hStats','fields'].includes(key))result[key]=baselineSubset(value,before[key]);
        else result[key]=copy(before[key]);
    }
    return result;
}

function fieldDelta(value,before) {
    const delta={},bases={};
    for(const [key,item]of Object.entries(record(value))){
        if(RESERVED.has(key)||sameNpcValue(item,before?.[key]))continue;
        delta[key]=copy(item);bases[key]=encode(before?.[key]);
    }
    return {delta,bases};
}

function dossierDelta(value,before,current=before) {
    const result={delta:{},bases:{}};
    for(const [key,item]of Object.entries(record(value))){
        if(RESERVED.has(key)||sameNpcValue(item,before?.[key]))continue;
        if(key==='alternateProfiles'){
            const changes=[],bases=[];
            for(const version of Array.isArray(item)?item:[]){
                if(!validId(version?.id))continue;
                const original=current?.alternateProfiles?.find(p=>p.id===version.id);
                if(!original)continue; // Deleted canon versions never return.
                const previous=before?.alternateProfiles?.find(p=>p.id===version.id)||original;
                const changed=dossierDelta(version,previous,original);
                if(Object.keys(changed.delta).length){changes.push({id:version.id,...changed.delta});bases.push({id:version.id,...changed.bases});}
            }
            if(changes.length){result.delta[key]=changes;result.bases[key]=bases;}
        }else if(['stats','hStats','fields'].includes(key)){
            const changed=key==='fields'?dossierDelta(item,before?.[key],current?.[key]):fieldDelta(item,before?.[key]);
            const rebased=rebaseDelta(changed.delta,changed.bases,current?.[key]);
            if(Object.keys(rebased).length){result.delta[key]=rebased;result.bases[key]=Object.fromEntries(Object.keys(rebased).map(field=>[field,changed.bases[field]]));}
        }else if(sameNpcValue(before?.[key],current?.[key])){
            result.delta[key]=copy(item);result.bases[key]=encode(before?.[key]);
        }
    }
    return result;
}

// The compact old baseline is stored only for changed fields. A later manual
// canon edit wins over a checkpoint's older value, independently per field.
function rebaseDelta(delta,bases,current) {
    const result={};
    for(const [key,value]of Object.entries(record(delta))){
        if(RESERVED.has(key))continue;
        if(key==='alternateProfiles'){
            const versions=[];
            for(const change of Array.isArray(value)?value:[]){
                const version=current?.alternateProfiles?.find(p=>p.id===change?.id);
                if(!version)continue;
                const baseline=Array.isArray(bases?.[key])?bases[key].find(p=>p.id===change.id):undefined;
                const changed=rebaseDelta(change,baseline,version);
                if(Object.keys(changed).length)versions.push({id:change.id,...changed});
            }
            if(versions.length)result[key]=versions;
        }else if(['stats','hStats','fields'].includes(key)){
            const changed=rebaseDelta(value,bases?.[key],current?.[key]);
            if(Object.keys(changed).length)result[key]=changed;
        }else if(!own(bases,key)||sameNpcValue(decode(bases[key]),current?.[key]))result[key]=copy(value);
    }
    return result;
}

function mergeDossier(base,delta) {
    const result={...copy(base),...copy(delta)};
    for(const key of ['stats','hStats','fields'])if(delta?.[key])result[key]=key==='fields'?mergeDossier(base?.[key]||{},delta[key]):{...copy(base?.[key]||{}),...copy(delta[key])};
    return result;
}

export function runtimeNpcDossier(base,delta={},owner='') {
    const {alternateProfiles,...fields}=base;
    const {alternateProfiles:changes,...overrides}=delta;
    const result=mergeDossier(fields,overrides);
    const active=(Array.isArray(alternateProfiles)?alternateProfiles:[]).find(p=>p.id===result.activeAlternateId);
    const changed=Array.isArray(changes)?changes.find(p=>p.id===active?.id):null;
    result.alternateProfiles=active?[mergeDossier(active,changed||{})]:[];
    if(result.activeAlternateId&&!active)result.activeAlternateId='';
    result.npcScope='character';result.npcOwner=owner;
    return result;
}

function cloneStateWithoutNpcs(state) {
    const {npcs,npcScopes,...rest}=state;
    return copy(rest);
}

export function hydrateSparseNpcs(state,library,owner='',{activeIds}={}) {
    const catalog=libraryView(library),scope=sparseNpcScope(state.npcScopes,owner);
    if(catalog.unavailable&&state.npcScopes?.owner===owner){
        const result=cloneStateWithoutNpcs(state);result.npcs=(state.npcs||[]).filter(p=>p.npcScope!=='character').map(p=>copy(p));result.npcScopes=scope;return result;
    }
    const archiveId=catalog.ref?.archiveId||catalog.archiveId||'embedded',changed=scope.archiveId&&scope.archiveId!=='embedded'&&scope.archiveId!==archiveId;
    if(changed){const previous={...scope};delete previous.archives;scope.archives[scope.archiveId]=previous;
        const restored=scope.archives[archiveId]||{};for(const key of ['overrides','bases'])scope[key]=copy(restored[key]||{});scope.hidden=ids(restored.hidden);scope.activeIds=ids(restored.activeIds);delete scope.archives[archiveId];
    }
    scope.archiveId=archiveId;scope.archiveRevision=catalog.ref?.revision??catalog.revision??'';
    const previousIds=ids([...(state.npcScopes?.sharedIds||[]),...Object.keys(state.npcScopes?.bases||{}),...(state.npcScopes?.hidden||[]),...(state.npcScopes?.activeIds||[]),...(state.npcs||[]).filter(p=>p.npcScope==='character').map(p=>p.id)]);
    const retired=previousIds.filter(id=>changed||state.npcScopes?.owner!==owner||!catalog.has(id));
    const result=pruneNpcReferences(cloneStateWithoutNpcs(state),[...retired,...scope.hidden]);
    const local=(state.npcs||[]).filter(p=>p.npcScope!=='character').map(p=>({...copy(p),npcScope:'chat',npcOwner:''}));
    const selected=ids(activeIds??scope.activeIds),hidden=new Set(scope.hidden),localNames=new Set(local.map(p=>String(p.name).normalize('NFKC').toLocaleLowerCase())),references=new Map();
    const shared=[];
    for(const id of selected){
        if(hidden.has(id))continue;
        const base=catalog.get(id);if(!base||localNames.has(String(base.name).normalize('NFKC').toLocaleLowerCase()))continue;
        const delta=rebaseDelta(scope.overrides[id],scope.bases[id],base);
        const npc=runtimeNpcDossier(base,delta,owner);
        shared.push(npc);references.set(id,base);
    }
    result.npcs=[...local,...shared];scope.activeIds=shared.map(p=>p.id);result.npcScopes=scope;
    baselineReferences.set(scope,references);
    return result;
}

function retainUnloadedAlternates(delta,bases,previousDelta,previousBases,materialized) {
    const loaded=new Set(materialized.map(p=>p.id));
    const changes=(Array.isArray(previousDelta?.alternateProfiles)?previousDelta.alternateProfiles:[]).filter(p=>!loaded.has(p.id));
    const originals=(Array.isArray(previousBases?.alternateProfiles)?previousBases.alternateProfiles:[]).filter(p=>!loaded.has(p.id));
    const merged=[...copy(changes),...(delta.alternateProfiles||[])],mergedBases=[...copy(originals),...(bases.alternateProfiles||[])];
    if(merged.length){delta.alternateProfiles=merged;bases.alternateProfiles=mergedBases;}
}

export function packSparseNpcs(state,library,owner='',{detectRemovals=true}={}) {
    const catalog=libraryView(library),scope=sparseNpcScope(state.npcScopes,owner),result=cloneStateWithoutNpcs(state);
    if(catalog.unavailable&&state.npcScopes?.owner===owner){result.npcs=(state.npcs||[]).filter(p=>p.npcScope!=='character').map(p=>copy(p));result.npcScopes=scope;return result;}
    const references=baselineReferences.get(state.npcScopes)||new Map(),overrides={...scope.overrides},bases={...scope.bases};
    const local=(state.npcs||[]).filter(p=>p.npcScope!=='character').map(p=>({...copy(p),npcScope:'chat',npcOwner:''}));
    const shared=(state.npcs||[]).filter(p=>p.npcScope==='character'&&p.npcOwner===owner),present=new Set(shared.map(p=>p.id)),hidden=new Set(scope.hidden);
    for(const npc of shared){
        const current=catalog.get(npc.id);
        if(!current){local.push({...copy(npc),npcScope:'chat',npcOwner:''});continue;}
        const baseline=references.get(npc.id)||current;
        const changed=dossierDelta(npc,baseline,current);
        retainUnloadedAlternates(changed.delta,changed.bases,overrides[npc.id],bases[npc.id],npc.alternateProfiles||[]);
        if(Object.keys(changed.delta).length){overrides[npc.id]=changed.delta;bases[npc.id]=changed.bases;}
        else{delete overrides[npc.id];delete bases[npc.id];}
    }
    // Absence from an unloaded library is never a deletion. Only a dossier
    // known to be in this working state can be explicitly removed from it.
    if(detectRemovals)for(const id of scope.activeIds)if(!present.has(id)&&catalog.has(id))hidden.add(id);
    for(const id of Object.keys(overrides))if(!catalog.has(id)){delete overrides[id];delete bases[id];}
    result.npcs=local;
    result.npcScopes={format:2,owner,archiveId:catalog.ref?.archiveId||catalog.archiveId||scope.archiveId||'embedded',archiveRevision:catalog.ref?.revision??catalog.revision??scope.archiveRevision,
        activeIds:shared.filter(p=>catalog.has(p.id)).map(p=>p.id),overrides,bases,hidden:[...hidden].filter(id=>catalog.has(id)),archives:scope.archives};
    return result;
}
