// Runtime-owned CSS loading also protects installations running a cached loader.js.
// Keep the legacy root CSS shims: old bootstraps still request those URLs.
const pending = new WeakMap();

export function ensureRuntimeStyles({
    document: doc = globalThis.document,
    root = new URL('../', import.meta.url),
    version = '0.43.6',
    timeout = 12000,
} = {}) {
    if (!doc) return Promise.resolve();
    // Restore the UI fonts without making external requests part of startup's wait.
    if (!doc.getElementById('tretaresia-ui-fonts')) {
        const fonts = doc.createElement('link');
        fonts.id = 'tretaresia-ui-fonts';
        fonts.rel = 'stylesheet';
        fonts.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Chakra+Petch:wght@300;400;500;600;700&display=swap';
        doc.head.append(fonts);
    }
    let loads = pending.get(doc);
    if (!loads) pending.set(doc, loads = new Map());
    return Promise.all(['styles/style.css', 'styles/ui-polish.css'].map(file => {
        const url = new URL(file, root); url.searchParams.set('v', version);
        const href = url.href;
        if (loads.has(href)) return loads.get(href);
        const promise = new Promise((resolve, reject) => {
            let link = [...doc.querySelectorAll('link[rel="stylesheet"]')].find(node => node.href === href);
            if (link?.sheet) { resolve(); return; }
            const created = !link;
            link ||= doc.createElement('link');
            link.rel = 'stylesheet'; link.href = href;
            const finish = error => {
                clearTimeout(timer);
                link.removeEventListener('load', loaded);
                link.removeEventListener('error', failed);
                if (error) { link.remove(); reject(error); } else resolve();
            };
            const loaded = () => finish();
            const failed = () => finish(new Error(`Tretaresia stylesheet could not load: ${file}`));
            const timer = setTimeout(failed, timeout);
            link.addEventListener('load', loaded, {once:true});
            link.addEventListener('error', failed, {once:true});
            if (created) doc.head.append(link);
        });
        loads.set(href, promise);
        promise.catch(() => loads.delete(href));
        return promise;
    }));
}
