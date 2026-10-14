// Portable contract validation. All paths are local archive members, never URLs.
export const WORLD_REF_FIELD='roleforge_world_archive';
export const WORLD_LIMITS=Object.freeze({zip:64*1024*1024,total:256*1024*1024,record:4*1024*1024,files:50000});
const forbidden=new Set(['__proto__','prototype','constructor']);
export function worldPath(value) {
    if(typeof value!=='string'||!value||value.length>500||value.startsWith('/')||value.includes('\\')||value.includes(':')||value.split('/').some(p=>!p||p==='.'||p==='..')||/[\x00-\x1f]/u.test(value))throw Error('Invalid World Pack path');
    return value;
}
export function safeWorldJson(text) {
    return JSON.parse(text,(key,value)=>{if(forbidden.has(key))throw Error('Unsafe World Pack object key');return value;});
}
export async function worldHash(bytes,provider=globalThis.crypto){
    if(provider?.subtle)return Array.from(new Uint8Array(await provider.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    // Plain HTTP LAN addresses used by mobile clients lack crypto.subtle.
    const {sha256}=await import('./vendor/js-sha256/index.js?v=0.69.0');return sha256(bytes);
}
export function worldRandomId(provider=globalThis.crypto){
    if(provider?.randomUUID)return provider.randomUUID();
    return Array.from(provider.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
}
export function worldRef(raw) {
    if(!raw||raw.format!=='roleforge-world-archive-ref'||raw.version!==1)return null;
    if(!/^[\w.:-]{1,160}$/u.test(raw.archiveId||'')||!/^[\w.:-]{1,100}$/u.test(raw.revision||'')||!/^\w{64}$/u.test(raw.manifestSha256||'')||!/^[a-f0-9]+$/iu.test(raw.manifestSha256))throw Error('Invalid World Pack reference');
    return {...raw,manifestPath:worldPath(raw.manifestPath||'manifest.json'),manifestSha256:raw.manifestSha256.toLowerCase()};
}
export const worldKey=ref=>`${ref.archiveId}@${ref.revision}@${ref.manifestSha256}`;
export function validateWorldManifest(raw) {
    if(!raw||raw.format!=='roleforge-world-pack'||raw.version!==1)throw Error('Unsupported World Pack format');
    worldRef({format:'roleforge-world-archive-ref',version:1,archiveId:raw.archiveId,revision:raw.revision,manifestSha256:'0'.repeat(64)});
    if(!Array.isArray(raw.files)||!raw.files.length||raw.files.length>WORLD_LIMITS.files)throw Error('Invalid World Pack file count');
    let total=0;const seen=new Set();
    for(const row of raw.files){worldPath(row.path);if(seen.has(row.path))throw Error('Duplicate World Pack path');seen.add(row.path);
        if(!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>WORLD_LIMITS.record||!/^[a-f0-9]{64}$/iu.test(row.sha256||''))throw Error('Invalid World Pack size or hash');total+=row.bytes;}
    if(total>WORLD_LIMITS.total)throw Error('World Pack exceeds decompressed size limit');
    for(const path of [raw.indexes?.npcs,raw.indexes?.lore,raw.presets])if(path&&!seen.has(worldPath(path)))throw Error('World Pack index/preset file is missing');
    if(!raw.indexes?.npcs||!raw.indexes?.lore)throw Error('World Pack requires NPC and Lore indexes');
    return raw;
}
export function validateWorldIndexes(manifest,npcs,lore) {
    if(!Array.isArray(npcs)||!Array.isArray(lore))throw Error('Invalid World Pack indexes');
    const paths=new Set(manifest.files.map(f=>f.path)),ids=new Set();let versions=0;
    for(const row of npcs){
        if(typeof row?.id!=='string'||!row.id||forbidden.has(row.id)||ids.has(row.id)||!row.name?.trim())throw Error('Duplicate or invalid NPC identity');ids.add(row.id);
        if(!paths.has(worldPath(row.basePath))||row.supplementsPath&&!paths.has(worldPath(row.supplementsPath)))throw Error('Missing NPC file');
        if(!Array.isArray(row.versions)||row.versions.length>20)throw Error('Invalid NPC version list');
        const vIds=new Set();for(const v of row.versions){if(typeof v.id!=='string'||!v.id||forbidden.has(v.id)||vIds.has(v.id)||!paths.has(worldPath(v.path)))throw Error('Invalid NPC version');vIds.add(v.id);versions++;}
        if(row.defaultVersionId&&!vIds.has(row.defaultVersionId))throw Error('Missing selected NPC version');
    }
    ids.clear();for(const row of lore){if(typeof row?.id!=='string'||!row.id||ids.has(row.id)||forbidden.has(row.id)||!row.title?.trim()||!paths.has(worldPath(row.path)))throw Error('Duplicate or invalid Lore identity');ids.add(row.id);}
    const counts=manifest.counts||{};
    if(counts.npcBodies!==npcs.length||counts.nativeVersions!==versions||counts.worldLore!==lore.length)throw Error('World Pack counts do not match indexes');
    return {npcBodies:npcs.length,nativeVersions:versions,worldLore:lore.length};
}
export function worldSearchText(value) {
    return [...new Set(String(value||'').normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}_-]+/gu)||[])].join(' ');
}
