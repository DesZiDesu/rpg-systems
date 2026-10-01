// Native generation state takes priority over events: START can fire for a
// dry run or a slash command which never produces a corresponding END event.
const booleanValue = value => typeof value === 'boolean' ? value : null;

function visible(node, doc) {
    if (!node || node.isConnected === false) return false;
    for (let current = node; current; current = current.parentElement) {
        if (current.hidden) return false;
        const style = doc.defaultView?.getComputedStyle?.(current) || current.style;
        if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
    }
    return true;
}

function suppliedState(source) {
    if (!source) return null;
    try {
        const value = typeof source.isGenerating === 'function' ? source.isGenerating() : source.isGenerating;
        if (booleanValue(value) !== null) return value;
        const send = booleanValue(source.is_send_press), group = booleanValue(source.is_group_generating);
        if (send !== null && group !== null) return send || group;
        if (send === true || group === true) return true;
    } catch { /* A host fork may not provide a readable state yet. */ }
    return null;
}

export function hostReplyGenerating({context, native, document: doc = globalThis.document, fallback = false} = {}) {
    const authoritative = suppliedState(native) ?? suppliedState(context);
    if (authoritative !== null) return authoritative;
    const generating = doc?.body?.dataset?.generating;
    if (generating === 'true') return true;
    if (generating === 'false') return false;
    const stop = doc?.getElementById?.('mes_stop');
    if (stop) return visible(stop, doc);
    // RoleForge's own summary Stop and temporary Send class are deliberately
    // excluded: neither represents a story generation owned by the host.
    const send = doc?.getElementById?.('send_but');
    if (send && visible(send, doc)) return false;
    return Boolean(fallback);
}

/** Reuse the host's already loaded module and its live exported bindings. */
export async function loadHostGenerationModule(doc = globalThis.document, importer = url => import(url)) {
    if (!doc?.baseURI) return null;
    const base = new URL(doc.baseURI);
    const scripts = [...(doc.scripts || [])];
    const script = scripts.find(node => {
        if (!node.src) return false;
        try {
            const url = new URL(node.src, base);
            return url.origin === base.origin && /(?:^|\/)script\.js$/.test(url.pathname);
        } catch { return false; }
    });
    if (!script) return null;
    try { return await importer(new URL(script.src, base).href); }
    catch { return null; }
}
