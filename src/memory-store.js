import {removeMemoryChat} from './memory-deletion.js?v=0.61.0';
// IndexedDB stores originals without inflating every RPG turn snapshot or localStorage continuity.
export function createMemoryStore(indexedDB = globalThis.indexedDB) {
    let connection;
    const open = () => connection ||= new Promise((resolve,reject) => {
        if (!indexedDB) { reject(Error('MEMORY_STORAGE_UNAVAILABLE')); return; }
        const request = indexedDB.open('roleforge-memory-library',1);
        request.onupgradeneeded = () => request.result.createObjectStore('libraries');
        request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connection = null; }; resolve(db); };
        request.onerror = () => { connection = null; reject(Error('MEMORY_STORAGE_UNAVAILABLE')); };
        request.onblocked = () => { connection = null; reject(Error('MEMORY_STORAGE_BLOCKED')); };
    });
    return {
        async get(owner) {
            const db = await open();
            return new Promise((resolve,reject) => {
                const request = db.transaction('libraries','readonly').objectStore('libraries').get(owner);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(Error('MEMORY_STORAGE_READ_FAILED'));
            });
        },
        async put(owner,value,options={}) {
            const db = await open();
            return new Promise((resolve,reject) => {
                const transaction = db.transaction('libraries','readwrite'),table=transaction.objectStore('libraries');
                let saved,error='MEMORY_STORAGE_WRITE_FAILED';
                const read=table.get(owner);
                read.onsuccess=()=>{try{
                    if(options.expected!==undefined&&JSON.stringify(read.result||null)!==options.expected){error='MEMORY_CHANGED';transaction.abort();return;}
                    saved=structuredClone(value);
                    if(!options.rollback){
                        const restored=new Set(options.restoreChats||[]),deleted=[...new Set([...(read.result?.deletedChats||[]),...(saved.deletedChats||[])])].filter(id=>!restored.has(id));
                        for(const field of ['deletedChapters','deletedCapsules','deletedRecords'])saved[field]=[...new Set([...(read.result?.[field]||[]),...(saved[field]||[])])];
                        const updatedAt=saved.updatedAt;
                        if(deleted.length||saved.deletedChapters.length||saved.deletedCapsules.length||saved.deletedRecords.length)saved=removeMemoryChat(saved,deleted).next;
                        saved.deletedChats=deleted;saved.updatedAt=updatedAt;
                    }
                    table.put(saved,owner);
                    }catch{transaction.abort();}
                };
                transaction.oncomplete = () => resolve(saved);
                transaction.onerror = transaction.onabort = () => reject(Error(error));
            });
        },
    };
}
