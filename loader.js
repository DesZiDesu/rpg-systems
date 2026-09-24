// Keep this entry small and stable: every page load resolves the installed release afresh.
const root = new URL('./', import.meta.url);
export function releaseUrl(file, version) {
    if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?$/i.test(version)) throw Error('Invalid Tretaresia release');
    const url = new URL(file, root); url.searchParams.set('v', version); return url.href;
}
async function installed() {
    const url = new URL('manifest.json', root); url.searchParams.set('_', Date.now());
    const response = await fetch(url, {cache:'no-store'});
    if (!response.ok) throw Error('Could not check the installed Tretaresia release');
    const manifest = await response.json(); releaseUrl('index.js', manifest.version); return manifest.version;
}
export async function onUpdate() {
    const version = await installed();
    if (version === globalThis.TretaresiaRelease) return;
    // A full reload removes old listeners. Never discard drafts or interrupt generation silently.
    let button = document.getElementById('tretaresia-apply-update');
    if (!button) {
        button = document.createElement('button'); button.id='tretaresia-apply-update';
        button.style.cssText='position:fixed;bottom:20px;left:20px;z-index:2147483647;padding:14px;background:#241e10;color:#ffe3a0;border:1px solid #b79850;max-width:85vw';
        button.onclick=()=>{if(confirm('Apply Tretaresia update? Save your drafts and wait for generation to finish first. This reloads the page; it does not clear Safari data.')) location.reload();};
        document.body.append(button);
    }
    button.textContent=`Tretaresia ${version} ready — Apply update`;
}
async function boot() {
    if (/[?&]tretaresia-safe=(1|true)(?:&|$)/i.test(location.search)) return;
    if (globalThis.TretaresiaBootStarted) return;
    globalThis.TretaresiaBootStarted=true;
    const version = await installed();
    const style=document.createElement('link'); style.rel='stylesheet'; style.href=releaseUrl('styles/ui-polish.css',version); document.head.append(style);
    await import(releaseUrl('index.js',version));
    globalThis.TretaresiaRelease=version;
}
if (typeof document !== 'undefined') void boot().catch(error=>{
    console.error('[Tretaresia loader]',error);
    globalThis.toastr?.error('Tretaresia could not load. Check your server connection and reload; do not clear browser data.');
});
