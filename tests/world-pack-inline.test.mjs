import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from '../src/vendor/fflate/index.js';
import {validateInlinePayload,worldHash,WORLD_LIMITS} from '../src/world-pack-core.js';
import {decodeInlineFiles,encodeInlineFiles} from '../src/world-pack-inline.js';

const encoder=new TextEncoder();
async function rawPayload(text){const bytes=encoder.encode(text),gzip=gzipSync(bytes);return {format:'roleforge-inline-world-pack',version:1,encoding:'gzip-base64',compressedBytes:gzip.length,uncompressedBytes:bytes.length,compressedSha256:await worldHash(gzip),data:Buffer.from(gzip).toString('base64')};}
const files=()=>new Map([['manifest.json',encoder.encode('{\n  "original": true\n}\n')],['lore/thai.json',encoder.encode('\ufeff{\r\n\t"text": "ทดสอบ  🧙"\r\n}\r\n')]]);

test('inline contract preserves exact original UTF-8 whitespace, CRLF, BOM and hashes',async()=>{
    const original=files(),payload=await encodeInlineFiles(original);assert.equal(validateInlinePayload(payload),payload);
    for(const decompressor of [DecompressionStream,null]){
        const decoded=await decodeInlineFiles(payload,{decompressor});
        for(const [path,bytes]of original){assert.deepEqual(await decoded.get(path)(),bytes);assert.equal(await worldHash(await decoded.get(path)()),await worldHash(bytes));}
    }
});
test('envelope checks bound declared sizes and Base64 before allocation',async()=>{
    const payload=await encodeInlineFiles(files());
    for(const delta of [{encoding:'zip'},{version:2},{compressedBytes:-1},{compressedBytes:WORLD_LIMITS.zip+1},{uncompressedBytes:WORLD_LIMITS.total+1},{uncompressedBytes:1.5},{compressedSha256:'x'.repeat(64)},{data:payload.data+'A'}])assert.throws(()=>validateInlinePayload({...payload,...delta}));
    await assert.rejects(decodeInlineFiles({...payload,data:'!'+payload.data.slice(1)}),/Base64/);
    await assert.rejects(decodeInlineFiles({...payload,compressedSha256:'0'.repeat(64)}),/SHA-256/);
});
test('streaming inflation stops at the declared bound, including the bounded fallback',async()=>{
    const bomb=await rawPayload(' '.repeat(2*1024*1024));
    for(const decompressor of [DecompressionStream,null]){
        const sizes=[];await assert.rejects(decodeInlineFiles({...bomb,uncompressedBytes:10},{decompressor,progress:v=>{if(v.phase==='decompress')sizes.push(v.done);}}),/declared decompressed size/);
        assert.deepEqual(sizes,[],'No oversized output chunk is retained or reported as valid');
    }
});
test('gzip checksum, truncation, inflated size and cancellation never produce usable files',async()=>{
    const payload=await encodeInlineFiles(files()),compressed=Buffer.from(payload.data,'base64');compressed[compressed.length-8]^=1;
    const broken={...payload,compressedSha256:await worldHash(compressed),data:compressed.toString('base64')};
    for(const decompressor of [DecompressionStream,null])await assert.rejects(decodeInlineFiles(broken,{decompressor}),/gzip/);
    await assert.rejects(decodeInlineFiles({...payload,uncompressedBytes:payload.uncompressedBytes+1}),/uncompressed size/);
    let checks=0;await assert.rejects(decodeInlineFiles(payload,{check:()=>{if(++checks>1)throw Error('World Pack import cancelled');}}),/cancelled/);
});
test('unsafe paths, duplicate files, missing manifests and unsafe JSON are rejected',async()=>{
    for(const rows of [[{path:'../manifest.json',text:'{}'}],[{path:'manifest.json',text:'{}'},{path:'manifest.json',text:'{}'}],[{path:'only.json',text:'{}'}]]){
        const payload=await rawPayload(JSON.stringify({format:'roleforge-inline-world-pack-files',version:1,files:rows}));await assert.rejects(decodeInlineFiles(payload));
    }
    await assert.rejects(decodeInlineFiles(await rawPayload('{"__proto__":{},"files":[]}')),/Unsafe/);
});
