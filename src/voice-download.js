// Download the provider's original MP3; never rename other audio as MP3.
export async function isMp3Blob(blob) {
    if(!blob?.size || typeof blob.slice!=='function')return false;
    const bytes=new Uint8Array(await blob.slice(0,10).arrayBuffer());
    if(bytes.length<4)return false;
    if(bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33)return bytes.length===10;
    return bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0&&((bytes[1]>>3)&3)!==1&&((bytes[1]>>1)&3)===1&&(bytes[2]>>4)!==15&&((bytes[2]>>2)&3)!==3;
}
export function mp3Filename(value,fallback='RoleForge-voice-test') {
    let name=String(value??'').normalize('NFC').replace(/\.mp3$/iu,'').replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/gu,'-').replace(/^[.\s]+|[.\s]+$/gu,'');
    let bytes=0;const encoder=new TextEncoder();
    name=Array.from(name).slice(0,100).filter(character=>{bytes+=encoder.encode(character).length;return bytes<=200;}).join('').replace(/[.\s]+$/gu,'');
    if(!name)return value===fallback?'RoleForge-voice-test.mp3':mp3Filename(fallback,'RoleForge-voice-test');
    if(/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(name))name='RoleForge-'+name;
    return name+'.mp3';
}
export function defaultTestFilename(clip) {
    const date=new Date(clip.createdAt),pad=value=>String(value).padStart(2,'0');
    const stamp=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    return mp3Filename(`${Array.from(clip.voiceName||'RoleForge').slice(0,32).join('')}_${stamp}`);
}
export function downloadMp3(clip,name,{document:doc=globalThis.document,url=globalThis.URL,schedule=globalThis.setTimeout}={}) {
    if(!clip?.blob?.size)throw Error('No generated test audio to download');
    const source=url.createObjectURL(clip.blob),link=doc.createElement('a');
    try{link.href=source;link.download=mp3Filename(name,defaultTestFilename(clip));link.hidden=true;doc.body.append(link);link.click();}
    finally{link.remove();schedule(()=>url.revokeObjectURL(source),60000);}
}
