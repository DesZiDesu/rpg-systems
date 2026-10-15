// Portable raster icons. SVG/HTML is never injected into the page.
export const ICON_TEXT_LIMIT=32768;
export function customIconSource(value){
    if(typeof value!=='string'||value.length>ICON_TEXT_LIMIT)return '';
    const source=value.trim();
    if(/^data:image\/(?:png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/]+=*$/u.test(source))return source;
    if(source.length<=2048&&/^https:\/\/[^\s<>"']+$/u.test(source)){try{const url=new URL(source);return !url.username&&!url.password?url.href:'';}catch{}}
    if(/^\/(?:user\/images|scripts\/extensions)\/[A-Za-z0-9_./% -]+\.(?:png|webp|jpg|jpeg|gif|avif)$/iu.test(source)&&!source.includes('..'))return source;
    return '';
}
export async function prepareCustomIcon(file){
    if(!file||file.size>8*1024*1024||!/^image\/(?:png|jpeg|webp|gif|avif|svg\+xml)$/u.test(file.type))throw Error('Choose a PNG, WebP, JPG, GIF, AVIF or SVG image up to 8 MiB.');
    const url=URL.createObjectURL(file),image=new Image();
    try{
        await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Could not decode this icon image.'));image.src=url;});
        const canvas=document.createElement('canvas'),scale=Math.min(1,192/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/webp',.88);
        if(!customIconSource(data))throw Error('This image is too detailed for a small portable icon. Choose a simpler image.');
        return data;
    }finally{URL.revokeObjectURL(url);}
}
