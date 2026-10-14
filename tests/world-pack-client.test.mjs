import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldPackClient} from '../src/world-pack-client.js';

test('a failed Worker drops stale sessions and reopens the stored archive in a new Worker',async()=>{
    const original=globalThis.Worker,workers=[];
    const ref={archiveId:'world',revision:'1',manifestSha256:'a'.repeat(64)};
    globalThis.Worker=class {
        constructor(){workers.push(this);}
        postMessage({id,action}){assert.equal(action,'open');queueMicrotask(()=>this.onmessage({data:{id,result:{sessionId:'session',revision:0,ref,npcs:[],lore:[]}}}));}
        terminate(){this.terminated=true;}
    };
    const client=createWorldPackClient();
    try{
        const first=await client.open('owner',ref);assert.equal(client.peek('owner',ref),first);
        workers[0].onerror({message:'Worker process stopped'});
        assert.equal(workers[0].terminated,true);assert.equal(client.peek('owner',ref),null);
        const restored=await client.open('owner',ref);assert.notEqual(restored,first);assert.equal(workers.length,2);
        assert.equal(client.peek('owner',ref),restored);
    }finally{client.dispose();globalThis.Worker=original;}
});

test('only an explicit missing-archive error installs inline data; concurrent opens decode once',async()=>{
    const original=globalThis.Worker,actions=[];let installed=false,payloadReads=0;
    const ref={archiveId:'inline',revision:'1',manifestSha256:'b'.repeat(64)},payload={data:'opaque'};
    globalThis.Worker=class {postMessage({id,action,payload:source}){actions.push(action);setTimeout(()=>{
        if(action==='import'){assert.equal(source.inline,payload);installed=true;this.onmessage({data:{id,result:{ref}}});}
        else if(!installed)this.onmessage({data:{id,error:{message:'Not present',name:'Error',code:'WORLD_PACK_MISSING'}}});
        else this.onmessage({data:{id,result:{sessionId:source.owner,ref,revision:0,npcs:[],lore:[]}}});
    },1);}terminate(){}};
    const client=createWorldPackClient(),options={payload:()=>{payloadReads++;return payload;}};
    try{
        await Promise.all([client.ensure('a',ref,options),client.ensure('a',ref,options),client.ensure('b',ref,options)]);
        assert.equal(payloadReads,1);assert.equal(actions.filter(a=>a==='import').length,1);
        await client.ensure('a',ref,{payload:()=>{throw Error('Cached open must not read payload');}});
        assert.equal(actions.filter(a=>a==='import').length,1);
    }finally{client.dispose();globalThis.Worker=original;}
});
test('quota, storage corruption and other Worker errors never trigger automatic import',async()=>{
    const original=globalThis.Worker;let error;
    globalThis.Worker=class {postMessage({id,action}){assert.equal(action,'open');queueMicrotask(()=>this.onmessage({data:{id,error}}));}terminate(){}};
    const client=createWorldPackClient(),ref={archiveId:'inline',revision:'1',manifestSha256:'b'.repeat(64)};
    try{for(error of [{name:'QuotaExceededError',message:'Storage full'},{name:'Error',code:'WORLD_PACK_STORAGE_INVALID',message:'Index corrupt'},{name:'Error',message:'Worker unavailable'}]){
        await assert.rejects(client.ensure('a',ref,{payload:()=>{throw Error('Must not import');}}),e=>e.message===error.message);
    }}finally{client.dispose();globalThis.Worker=original;}
});
test('changing owner while the Worker installs prevents the old request from publishing a catalog',async()=>{
    const original=globalThis.Worker;let active=true,installed=false;
    globalThis.Worker=class {postMessage({id,action}){queueMicrotask(()=>{
        if(action==='import'){installed=true;active=false;this.onmessage({data:{id,result:{}}});}
        else this.onmessage({data:{id,error:{code:'WORLD_PACK_MISSING',message:'Missing'}}});
    });}terminate(){}};
    const client=createWorldPackClient(),ref={archiveId:'inline',revision:'1',manifestSha256:'b'.repeat(64)};
    try{await assert.rejects(client.ensure('old',ref,{payload:()=>({}),valid:()=>active}),e=>e.code==='WORLD_PACK_CONTEXT_CHANGED');assert(installed);assert.equal(client.peek('old',ref),null);}
    finally{client.dispose();globalThis.Worker=original;}
});
