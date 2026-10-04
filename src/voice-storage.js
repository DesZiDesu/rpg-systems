// Separate IndexedDB: neither credentials nor audio enter prompts, state exports,
// settings.json, chat metadata or continuity snapshots.
export function createVoiceStorage({indexedDB:db=globalThis.indexedDB,crypto:crypt=globalThis.crypto}={}) {
    let opening;const memory=new Map();
    function database(){
        if(!db)return Promise.resolve(null);
        opening ||= new Promise(resolve=>{
            const request=db.open('roleforge-voice-v1',2);
            request.onupgradeneeded=()=>{for(const name of ['secrets','audio','drafts'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name);};
            request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);
        });return opening;
    }
    async function operation(store,mode,action){
        const databaseRef=await database();if(!databaseRef)return null;
        return new Promise((resolve,reject)=>{
            const transaction=databaseRef.transaction(store,mode),request=action(transaction.objectStore(store));let result;
            if(request)request.onsuccess=()=>{result=request.result;};
            transaction.oncomplete=()=>resolve(result);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('Storage transaction aborted'));
        });
    }
    const canRemember=()=>Boolean(db&&crypt?.subtle);
    async function saveKey(namespace,value){
        if(!canRemember())return false;
        const key=await crypt.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
        const iv=crypt.getRandomValues(new Uint8Array(12));
        const ciphertext=await crypt.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value));
        if(!await database())return false;
        await operation('secrets','readwrite',store=>store.put({key,iv,ciphertext},namespace));return true;
    }
    async function readKey(namespace){
        if(!canRemember()||!namespace)return '';
        try{const record=await operation('secrets','readonly',store=>store.get(namespace));if(!record)return '';
            return new TextDecoder().decode(await crypt.subtle.decrypt({name:'AES-GCM',iv:record.iv},record.key,record.ciphertext));
        }catch{return '';}
    }
    const forgetKey=namespace=>operation('secrets','readwrite',store=>store.delete(namespace));
    async function audio(key){
        if(memory.has(key))return memory.get(key);
        try{return (await operation('audio','readonly',store=>store.get(key)))?.blob||null;}catch{return null;}
    }
    async function saveAudio(key,blob){
        memory.set(key,blob);if(memory.size>80)memory.delete(memory.keys().next().value);
        try{
            await operation('audio','readwrite',store=>store.put({blob,at:Date.now()},key));
            // Keep a bounded cache, including audio saved by other namespaces.
            await operation('audio','readwrite',store=>{
                const rows=[];let bytes=0;const request=store.openCursor();
                request.onsuccess=()=>{const cursor=request.result;if(cursor){rows.push({key:cursor.key,at:cursor.value.at,size:cursor.value.blob.size});bytes+=cursor.value.blob.size;cursor.continue();}
                    else{rows.sort((a,b)=>a.at-b.at);while(rows.length>80||bytes>32*1024*1024){const old=rows.shift();if(!old)break;bytes-=old.size;store.delete(old.key);}}};
            });
        }catch{/* Session cache remains available when disk storage is full. */}
    }
    async function clearAudio(namespace){
        const owns=key=>{try{return JSON.parse(key)[1]===namespace;}catch{return false;}};
        for(const key of memory.keys())if(owns(key))memory.delete(key);
        await operation('audio','readwrite',store=>{const request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(owns(cursor.key))cursor.delete();cursor.continue();};});
    }
    const drafts=new Map();
    async function readDraft(key){
        if(drafts.has(key))return drafts.get(key);
        try{return await operation('drafts','readonly',store=>store.get(key))||null;}catch{return null;}
    }
    async function saveDraft(key,value){
        const draft=value?{text:String(value.text||'').slice(0,20000),voice:String(value.voice||'').slice(0,160)}:null;
        drafts.set(key,draft);
        try{await operation('drafts','readwrite',store=>draft?store.put(draft,key):store.delete(key));}catch{/* The session draft is still usable. */}
    }
    return {canRemember,saveKey,readKey,forgetKey,audio,saveAudio,clearAudio,readDraft,saveDraft};
}
