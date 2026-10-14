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
