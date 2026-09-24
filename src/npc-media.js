import { preparePortrait } from './npc-portraits.js?v=0.43.0';

export function portraitPath(value) {
    return typeof value==='string' && /^\/?user\/images\/tretaresia-npc\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/.test(value) ? '/'+value.replace(/^\//,'') : '';
}
export async function uploadPortrait(blob, {fetcher=fetch, headers, prepare=preparePortrait, cryptoProvider=globalThis.crypto}={}) {
    const compressed=await prepare(blob);
    if(compressed.size>256*1024)throw Error('Portrait exceeds 256 KB');
    const bytes=new Uint8Array(await compressed.arrayBuffer());
    // Content-addressed names reuse the same compressed image across scopes.
    // crypto.subtle is unavailable on the plain-HTTP LAN URLs often used by iPhones.
    const digest=cryptoProvider?.subtle ? new Uint8Array(await cryptoProvider.subtle.digest('SHA-256',bytes))
        : cryptoProvider?.getRandomValues(new Uint8Array(24));
    if(!digest)throw Error('Secure random image naming is unavailable in this browser');
    const filename=Array.from(digest,v=>v.toString(16).padStart(2,'0')).join('');
    let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    const format=compressed.type==='image/webp'?'webp':compressed.type==='image/jpeg'?'jpg':null;
    if(!format)throw Error('Unsupported portrait encoding');
    const response=await fetcher('/api/images/upload',{method:'POST',headers,body:JSON.stringify({image:btoa(binary),format,ch_name:'tretaresia-npc',filename})});
    if(!response.ok)throw Error(`Server image upload failed (${response.status}); original image kept`);
    const path=portraitPath((await response.json()).path);
    if(!path)throw Error('Server returned an unexpected image path');
    return {portraitPath:path,portraitSource:'server',hasPortrait:true,portraitChatId:''};
}
export async function readServerPortrait(entry, fetcher=fetch) {
    const path=portraitPath(entry.portraitPath);if(!path)return null;
    const response=await fetcher(path,{credentials:'same-origin'});
    if(!response.ok)throw Error(`Portrait unavailable on server (${response.status})`);
    return response.blob();
}

// Upload first, then let the caller persist links in the same scope. Never delete originals.
export async function collectPortraitBackups(records,{read,upload,valid,onProgress=()=>{}}) {
    const updates=new Map();let missing=0;
    const candidates=records.filter(p=>p.portraitSource!=='server'&&p.portraitSource!=='none'&&(p.hasPortrait||p.characterLifePortraitId));
    for(const p of candidates){
        if(!valid())return {updates,missing,aborted:true};
        onProgress(updates.size+missing+1,candidates.length);
        const original=JSON.stringify(p);
        try {
            const blob=await read(p);if(!valid())return {updates,missing,aborted:true};
            if(!blob){missing++;continue;}
            const reference=await upload(blob);if(!valid())return {updates,missing,aborted:true};
            updates.set(p.id,{reference,original});
        }catch{missing++;}
    }
    return {updates,missing,aborted:false};
}

