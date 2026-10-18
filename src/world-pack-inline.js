// Worker-only codec. Subfile text is encoded verbatim before manifest hashes.
import {Gunzip,gzipSync} from './vendor/fflate/index.js?v=0.77.1';
import {WORLD_LIMITS,validateInlinePayload,safeWorldJson,worldPath,worldHash,worldError} from './world-pack-core.js?v=0.77.1';

const encoder=new TextEncoder(),yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
const crcTable=Uint32Array.from({length:256},(_,value)=>{for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);return value>>>0;});

export async function decodeInlineFiles(raw,{check=()=>{},progress=()=>{},decompressor=globalThis.DecompressionStream}={}){
    const payload=validateInlinePayload(raw),compressed=new Uint8Array(payload.compressedBytes);let offset=0;
    for(let start=0;start<payload.data.length;start+=32768){
        check();const part=payload.data.slice(start,start+32768),last=start+32768>=payload.data.length;
        if(!(last?/^[A-Za-z0-9+/]*={0,2}$/u:/^[A-Za-z0-9+/]+$/u).test(part))throw worldError('WORLD_PACK_INLINE_INVALID','Invalid embedded World Pack Base64');
        let binary;try{binary=atob(part);}catch{throw worldError('WORLD_PACK_INLINE_INVALID','Invalid embedded World Pack Base64');}
        if(offset+binary.length>compressed.length)throw worldError('WORLD_PACK_INLINE_SIZE','Embedded World Pack compressed size mismatch');
        for(let i=0;i<binary.length;i++)compressed[offset++]=binary.charCodeAt(i);
        if(start%524288===0){progress({phase:'decode',done:offset,total:compressed.length});await yieldTask();}
    }
    if(offset!==compressed.length)throw worldError('WORLD_PACK_INLINE_SIZE','Embedded World Pack compressed size mismatch');
    if(await worldHash(compressed)!==payload.compressedSha256.toLowerCase())throw worldError('WORLD_PACK_INLINE_HASH','Embedded World Pack compressed SHA-256 mismatch');
    check();const chunks=[];let total=0,checksum=0xffffffff;
    const accept=chunk=>{check();total+=chunk.length;
        if(total>payload.uncompressedBytes||total>WORLD_LIMITS.total)throw worldError('WORLD_PACK_INLINE_SIZE','Embedded World Pack exceeds declared decompressed size');
        if(!decompressor)for(const byte of chunk)checksum=crcTable[(checksum^byte)&255]^(checksum>>>8);
        chunks.push(chunk);progress({phase:'decompress',done:total,total:payload.uncompressedBytes});
    };
    try{
        if(decompressor){
            const reader=new Blob([compressed]).stream().pipeThrough(new decompressor('gzip')).getReader();
            try{for(;;){check();const {value,done}=await reader.read();if(done)break;accept(value);}}
            finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
        }else{
            // Bounded compressed chunks cap each inflation step. Check output
            // before retaining it; never use an unbounded gunzipSync fallback.
            const stream=new Gunzip(accept);stream.onmember=()=>{throw Error('Multi-member gzip requires DecompressionStream');};
            for(let start=0;start<compressed.length;start+=1024){check();stream.push(compressed.subarray(start,start+1024),start+1024>=compressed.length);if(start%32768===0)await yieldTask();}
            const trailer=new DataView(compressed.buffer,compressed.byteOffset+compressed.length-8,8);
            if(trailer.getUint32(0,true)!==((checksum^0xffffffff)>>>0)||trailer.getUint32(4,true)!==(total>>>0))throw Error('gzip checksum/size mismatch');
        }
    }catch(error){if(error.code?.startsWith('WORLD_PACK_')||/cancelled/iu.test(error.message))throw error;throw worldError('WORLD_PACK_INLINE_GZIP','Invalid embedded World Pack gzip: '+error.message);}
    if(total!==payload.uncompressedBytes)throw worldError('WORLD_PACK_INLINE_SIZE','Embedded World Pack uncompressed size mismatch');
    check();const decoder=new TextDecoder('utf-8',{fatal:true}),parts=[];for(const chunk of chunks)parts.push(decoder.decode(chunk,{stream:true}));parts.push(decoder.decode());
    const envelope=safeWorldJson(parts.join(''));chunks.length=parts.length=0;
    if(envelope?.format!=='roleforge-inline-world-pack-files'||envelope.version!==1||!Array.isArray(envelope.files)||!envelope.files.length||envelope.files.length>WORLD_LIMITS.files+1)throw worldError('WORLD_PACK_INLINE_INVALID','Invalid embedded World Pack files envelope');
    const members=new Map();let bytes=0;
    for(const row of envelope.files){check();const path=worldPath(row?.path);
        if(members.has(path)||typeof row.text!=='string'||row.text.length>WORLD_LIMITS.record)throw worldError('WORLD_PACK_INLINE_INVALID','Duplicate or oversized embedded World Pack file');
        const original=encoder.encode(row.text);bytes+=original.length;
        if(original.length>WORLD_LIMITS.record||bytes>WORLD_LIMITS.total)throw worldError('WORLD_PACK_INLINE_SIZE','Embedded World Pack file size limit exceeded');
        members.set(path,async()=>original);
    }
    if(!members.has('manifest.json'))throw worldError('WORLD_PACK_INLINE_INVALID','Embedded World Pack requires manifest.json');
    return members;
}

export async function encodeInlineFiles(files,{check=()=>{},progress=()=>{}}={}){
    if(files.size>WORLD_LIMITS.files+1)throw Error('Too many embedded World Pack files');
    const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}),rows=[];
    for(const [path,bytes]of files){check();worldPath(path);rows.push({path,text:decoder.decode(bytes)});}
    const bytes=encoder.encode(JSON.stringify({format:'roleforge-inline-world-pack-files',version:1,files:rows}));
    if(bytes.length>WORLD_LIMITS.total)throw worldError('WORLD_PACK_INLINE_SIZE','Embedded World Pack exceeds decompressed size limit');
    progress({phase:'compress',done:0,total:bytes.length});await yieldTask();check();
    const compressed=gzipSync(bytes,{level:6,mtime:0});if(compressed.length>WORLD_LIMITS.zip)throw worldError('WORLD_PACK_INLINE_SIZE','Embedded World Pack compressed size limit exceeded');
    const parts=[];for(let start=0;start<compressed.length;start+=24576){check();parts.push(btoa(String.fromCharCode(...compressed.subarray(start,start+24576))));if(start%393216===0)await yieldTask();}
    return {format:'roleforge-inline-world-pack',version:1,encoding:'gzip-base64',compressedBytes:compressed.length,uncompressedBytes:bytes.length,compressedSha256:await worldHash(compressed),data:parts.join('')};
}
