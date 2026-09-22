import { clamp, cropGeometry } from './npc-core.js?v=0.32.1';

export async function decodePortrait(blob) {
    if (!(blob instanceof Blob) || blob.size > 16 * 1024 * 1024) throw Error('ภาพต้องมีขนาดไม่เกิน 16 MB');
    const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const signature = String.fromCharCode(...bytes);
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8) && !signature.startsWith('\x89PNG') && !signature.startsWith('GIF8')
        && !(signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') && !signature.includes('ftypavif')) {
        throw Error('ใช้ภาพ JPG, PNG, WebP, GIF หรือ AVIF (ไม่รับ SVG)');
    }
    const url = URL.createObjectURL(blob);
    try {
        const image = new Image(); image.src = url; await image.decode();
        if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw Error('ภาพมีความละเอียดสูงเกินไป (สูงสุด 40 MP)');
        return image;
    } finally { URL.revokeObjectURL(url); }
}

export async function preparePortrait(blob) {
    const image = await decodePortrait(blob);
    const canvas = document.createElement('canvas');
    for (const edge of [1024,768,512,384]) {
        const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        const encode=type=>new Promise(resolve=>canvas.toBlob(resolve,type,.8));
        let output=await encode('image/webp');
        if(output?.type!=='image/webp')output=await encode('image/jpeg');
        if(output && output.size<=256*1024)return output;
    }
    throw Error('ไม่สามารถย่อภาพให้เล็กกว่า 256 KB ได้');
}

export async function croppedPortrait(blob, frame) {
    const image = await decodePortrait(blob), canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const g = cropGeometry(image.naturalWidth, image.naturalHeight, frame);
    canvas.getContext('2d').drawImage(image, g.x, g.y, g.w, g.h);
    return new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('แสดงภาพไม่ได้')), 'image/webp', .9));
}

// Pointer capture supports mouse, one-finger pan and two-finger pinch on iOS Safari.
export function portraitEditor(host, onChange) {
    host.innerHTML = `<canvas width="512" height="512" aria-label="ลากภาพ หรือใช้สองนิ้วซูม" tabindex="0"></canvas>
        <p>ลากภาพเพื่อจัดตำแหน่ง · ใช้สองนิ้วซูม หรือใช้แถบปรับด้านล่าง</p>
        <label>ซูม <input type="range" data-axis="zoom" min="1" max="3" step="0.01" value="1"></label>
        <label>ซ้าย ↔ ขวา <input type="range" data-axis="x" min="0" max="100" step="0.1" value="50"></label>
        <label>บน ↔ ล่าง <input type="range" data-axis="y" min="0" max="100" step="0.1" value="50"></label>
        <button type="button" data-reset>จัดภาพกึ่งกลาง</button>`;
    const canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d'), pointers = new Map();
    const controller = new AbortController(), options = { signal: controller.signal };
    let image = null, frame = { x: 50, y: 50, zoom: 1 }, baseline = null, generation = 0;
    function paint(emit = true) {
        ctx.clearRect(0, 0, 512, 512);
        if (image) { const g = cropGeometry(image.naturalWidth, image.naturalHeight, frame); ctx.drawImage(image, g.x, g.y, g.w, g.h); }
        for (const input of host.querySelectorAll('[data-axis]')) input.value = frame[input.dataset.axis];
        if (emit) onChange({ ...frame });
    }
    function gesture() {
        const points = [...pointers.values()].slice(0, 2);
        return { x: points.reduce((n,p)=>n+p.x,0)/points.length, y: points.reduce((n,p)=>n+p.y,0)/points.length,
            distance: points.length === 2 ? Math.hypot(points[1].x-points[0].x, points[1].y-points[0].y) : 0 };
    }
    function rebase() { baseline = pointers.size ? { ...gesture(), frame: { ...frame } } : null; }
    function position(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX-r.left)*512/r.width, y: (e.clientY-r.top)*512/r.height }; }
    canvas.addEventListener('pointerdown', e => { if (!image || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, position(e)); rebase(); }, options);
    canvas.addEventListener('pointermove', e => {
        if (!pointers.has(e.pointerId) || !baseline) return;
        e.preventDefault(); pointers.set(e.pointerId, position(e)); const g = gesture();
        frame.zoom = clamp(baseline.frame.zoom * (g.distance && baseline.distance ? g.distance/baseline.distance : 1), 1, 3);
        const before = cropGeometry(image.naturalWidth, image.naturalHeight, baseline.frame), after = cropGeometry(image.naturalWidth, image.naturalHeight, frame);
        const ratio = frame.zoom/baseline.frame.zoom;
        const x = g.x - (baseline.x-before.x)*ratio, y = g.y - (baseline.y-before.y)*ratio;
        frame.x = after.w > 512 ? clamp(-x/(after.w-512)*100,0,100) : 50;
        frame.y = after.h > 512 ? clamp(-y/(after.h-512)*100,0,100) : 50;
        paint();
    }, options);
    for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, e => { pointers.delete(e.pointerId); rebase(); }, options);
    canvas.addEventListener('keydown', e => {
        const changes = {ArrowLeft:['x',-2],ArrowRight:['x',2],ArrowUp:['y',-2],ArrowDown:['y',2],'+':['zoom',.1],'-':['zoom',-.1]};
        if (!changes[e.key]) return; e.preventDefault(); const [axis,delta] = changes[e.key];
        frame[axis] = clamp(frame[axis]+delta,axis==='zoom'?1:0,axis==='zoom'?3:100); paint();
    }, options);
    host.addEventListener('input', e => { if(e.target.dataset.axis){frame[e.target.dataset.axis]=Number(e.target.value); paint();} }, options);
    host.querySelector('[data-reset]').addEventListener('click', () => {frame={x:50,y:50,zoom:1};paint();}, options);
    return {
        async set(blob, nextFrame) { const token=++generation; const decoded=blob?await decodePortrait(blob):null; if(token!==generation)return; image=decoded;frame={x:50,y:50,zoom:1,...nextFrame};host.hidden=!image;paint(false); },
        frame: () => ({ ...frame }),
        destroy() { ++generation; controller.abort(); pointers.clear(); image=null; },
    };
}
