// Identity/revision cache for reference archives. No whole-archive signatures,
// no host globals, and no normalization of a dossier just to draw its row.
const RESERVED=new Set(['__proto__','constructor','prototype']);
export const archiveText=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().trim();
const label=value=>typeof value==='string'?value.trim():'';
const labels=value=>(Array.isArray(value)?value:typeof value==='string'?[value]:[]).filter(v=>typeof v==='string').map(label).filter(Boolean);
const metadata=value=>labels([value?.series,value?.arc,value?.timeline,value?.era,value?.category,...labels(value?.tags)]);
function mentionPosition(text,name) {
    let position=text.lastIndexOf(name);
    while(position>=0){
        const before=text[position-1]||'',after=text[position+name.length]||'';
        if(!(/[a-z0-9_]/i.test(name[0])&&/[a-z0-9_]/i.test(before))
            &&!(/[a-z0-9_]/i.test(name.at(-1))&&/[a-z0-9_]/i.test(after)))return position;
        position=position>0?text.lastIndexOf(name,position-1):-1;
    }
    return -1;
}
const contextTerms=value=>[...new Set([archiveText(value),...archiveText(value).split(/[/:|—–]+/u)].map(v=>v.trim()))].filter(v=>v.length>=3);
const identityIndexes=new WeakMap(),genericNames=new Set(['the','lord','lady','king','queen','sir','saint','grand','young','old','adult','little','child','summer','assassin','saber','caster','lancer','ruler','alter','unknown']);
function searchIdentities(summaries){
    if(identityIndexes.has(summaries))return identityIndexes.get(summaries);
    const counts=new Map(),bases=new Map();
    for(const p of summaries){const parts=archiveText(p.archiveIdentity||p.name).replace(/\([^)]*\)/gu,'').split(/[—–]/u)[0].split('/').map(v=>v.trim()).filter(Boolean);bases.set(p.id,parts);
        for(const word of new Set(parts.flatMap(v=>v.split(/\s+/u))))counts.set(word,(counts.get(word)||0)+1);}
    const index=new Map(summaries.map(p=>{const declared=[p.archiveIdentity||p.name,p.name,...(p.aliases||[])].map(archiveText).filter(n=>n.length>=2);
        const unique=(bases.get(p.id)||[]).map(v=>v.split(/\s+/u)[0]).filter(word=>word.length>=4&&!genericNames.has(word)&&counts.get(word)===1);
        return [p.id,[...new Set([...declared,...unique])]];}));identityIndexes.set(summaries,index);return index;
}

export function freezeArchiveRecord(value) {
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){
        for(const item of Object.values(value))freezeArchiveRecord(item);
        Object.freeze(value);
    }
    return value;
}

function fallbackId(owner,kind,index,name) {
    let hash=2166136261;
    for(const character of `${owner}:${kind}:${name}`){hash^=character.codePointAt(0);hash=Math.imul(hash,16777619);}
    return `archive-${(hash>>>0).toString(36)}-${index}`;
}

export function npcArchiveSummary(raw,id,owner='') {
    const active=Array.isArray(raw.alternateProfiles)?raw.alternateProfiles.find(p=>p?.id===raw.activeAlternateId):null;
    const fields=active?.fields||{};
    const summary={id,name:label(fields.name)||label(raw.name),title:label(fields.title??raw.title),
        occupation:label(fields.occupation??raw.occupation),race:label(fields.race??raw.race),
        faction:label(fields.faction??raw.faction),aliases:labels(raw.aliases),
        enabled:raw.enabled!==false,met:raw.met===true,isHostile:Boolean(raw.isHostile??raw.hostile),npcScope:raw.npcScope||'character',npcOwner:owner,
        identityColor:active?.identityColor||raw.identityColor,roleIcon:active?.roleIcon||raw.roleIcon,
        hasPortrait:active?.hasPortrait??raw.hasPortrait,portraitSource:active?.portraitSource||raw.portraitSource,
        portraitPath:active?.portraitPath||raw.portraitPath,portraitChatId:active?.portraitChatId||raw.portraitChatId,
        portraitSize:active?.portraitSize||raw.portraitSize,
        portraitView:structuredClone(active?.portraitView||raw.portraitView),
        activeAlternateId:raw.activeAlternateId||'',alternateProfiles:[],
        archiveIdentity:label(raw.name),context:metadata(raw),
        versions:(Array.isArray(raw.alternateProfiles)?raw.alternateProfiles:[]).filter(p=>p&&typeof p.id==='string')
            .map(p=>({id:p.id,label:label(p.label),context:metadata(p)}))};
    return freezeArchiveRecord(summary);
}

export function loreArchiveSummary(raw,id) {
    return freezeArchiveRecord({id,title:label(raw.title),keywords:labels(raw.keywords),enabled:raw.enabled===true,
        always:raw.always===true,characters:label(raw.title).length+(typeof raw.content==='string'?raw.content.length:0),
        preview:typeof raw.content==='string'?raw.content.slice(0,160):'',context:metadata(raw)});
}

export function createArchiveCatalog(source,{owner='',kind='npcs',revision=0,normalize=value=>structuredClone(value),
    summarize=kind==='npcs'?npcArchiveSummary:loreArchiveSummary,maxDetails=48}={}) {
    const rawById=new Map(),summaries=[],summaryById=new Map(),details=new Map();
    let normalized=0,all=null,pinned=new Set();
    for(const [index,raw]of (Array.isArray(source)?source:[]).entries()){
        if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
        const name=label(kind==='npcs'?raw.name:raw.title);
        if(!name)continue;
        const id=typeof raw.id==='string'&&raw.id&&!RESERVED.has(raw.id)?raw.id:fallbackId(owner,kind,index,name);
        if(rawById.has(id))continue;
        rawById.set(id,raw);const summary=summarize(raw,id,owner);summaries.push(summary);summaryById.set(id,summary);
    }
    Object.freeze(summaries);
    return {
        owner,kind,revision,summaries,ids:Object.freeze([...rawById.keys()]),
        get size(){return summaries.length;},get normalizedCount(){return normalized;},get cachedCount(){return details.size;},pin(ids){pinned=new Set(ids);},
        has:id=>rawById.has(id),raw:id=>rawById.get(id),summary:id=>summaryById.get(id),
        get(id){
            if(!rawById.has(id))return null;
            if(!details.has(id)){
                const raw=rawById.get(id),value=normalize({...raw,id},owner);
                details.set(id,value?freezeArchiveRecord(value):null);normalized++;
                for(const old of details.keys())if(details.size>maxDetails&&old!==id&&!pinned.has(old))details.delete(old);
            }
            return details.get(id);
        },
        getMany(ids){return [...new Set(ids)].map(id=>this.get(id)).filter(Boolean);},
        all(){return all||=Object.freeze(this.getMany(this.ids));},
    };
}

export function createArchiveRevisionCache() {
    const owners=new Map();
    return {
        read(owner,kind,source,options={}){
            const key=`${owner}\u0000${kind}`,previous=owners.get(key),revision=options.revision??0;
            if(previous?.source===source&&previous.revision===revision){owners.delete(key);owners.set(key,previous);return previous.catalog;}
            const catalog=createArchiveCatalog(source,{...options,owner,kind,revision});
            owners.set(key,{source,revision,catalog});if(owners.size>16)owners.delete(owners.keys().next().value);return catalog;
        },
        invalidate(owner,kind){for(const key of owners.keys())if(key===`${owner}\u0000${kind}`||kind===undefined&&key.startsWith(`${owner}\u0000`))owners.delete(key);},
        clear(){owners.clear();},
    };
}

// Only a bounded set of identity/period matches leaves the internal index.
// Selecting a reference period never edits activeAlternateId/enabled/met.
export function searchNpcArchive(summaries,query,{limit=16,context=''}={}) {
    const text=archiveText(`${context}\n${query}`),candidates=[],index=searchIdentities(summaries);
    for(const summary of summaries){
        const names=index.get(summary.id)||[];
        const matches=names.map(name=>({name,position:mentionPosition(text,name)})).filter(m=>m.position>=0)
            .sort((a,b)=>b.position-a.position||b.name.length-a.name.length);
        if(!matches.length)continue;
        const {position,name:identity}=matches[0];
        let score=position+identity.length*1000,referenceAlternateId='';
        for(const term of (summary.context||[]).flatMap(contextTerms))if(text.includes(term))score+=100000;
        let bestVersionScore=0;
        for(const version of summary.versions||[]){
            const terms=[version.label,...(version.context||[])].flatMap(contextTerms);
            const matched=terms.filter(t=>text.includes(t)).length;
            if(matched>bestVersionScore){bestVersionScore=matched;referenceAlternateId=version.id;}
        }
        score+=bestVersionScore*100000;
        candidates.push({id:summary.id,identity,score,referenceAlternateId,start:position,end:position+identity.length});
    }
    candidates.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const seen=new Set();return candidates.filter(item=>!candidates.some(other=>other.id!==item.id&&other.identity.length>item.identity.length&&other.start<=item.start&&other.end>=item.end))
        .filter(item=>!candidates.some(other=>other.id!==item.id&&other.identity===item.identity&&other.score===item.score))
        .filter(item=>!seen.has(item.identity)&&seen.add(item.identity)).slice(0,limit).map(({start,end,...item})=>item);
}

export function resolveIndexedNpc(summaries,identity){
    if(!identity)return null;const id=typeof identity==='object'?identity.npcId||identity.id:'';
    if(id){const exact=summaries.find(p=>p.id===id);if(exact)return exact;}
    const name=typeof identity==='string'?identity:identity.npcName||identity.name||'';if(!name)return null;
    const matches=searchNpcArchive(summaries,name,{limit:2});
    return matches.length===1&&matches[0].identity===archiveText(name)?summaries.find(p=>p.id===matches[0].id)||null:null;
}
