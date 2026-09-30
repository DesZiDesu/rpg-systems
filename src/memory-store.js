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
        async put(owner,value) {
            const db = await open();
            return new Promise((resolve,reject) => {
                const transaction = db.transaction('libraries','readwrite');
                transaction.objectStore('libraries').put(value,owner);
                transaction.oncomplete = () => resolve();
                transaction.onerror = transaction.onabort = () => reject(Error('MEMORY_STORAGE_WRITE_FAILED'));
            });
        },
    };
}
