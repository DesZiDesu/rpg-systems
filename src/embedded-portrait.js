// Portable raster portraits inside character-card archives. No network fetches,
// SVG, executable URLs or unbounded Base64 decoding.
export const EMBEDDED_PORTRAIT_LIMIT=256*1024;
export function embeddedPortraitSource(value){
 if(typeof value!=='string'||value.length>Math.ceil(EMBEDDED_PORTRAIT_LIMIT/3)*4+40)return '';
 const m=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/u);
 if(!m||m[2].length%4||m[2].length/4*3-(m[2].endsWith('==')?2:m[2].endsWith('=')?1:0)>EMBEDDED_PORTRAIT_LIMIT)return '';
 return value;
}
export function embeddedPortraitBlob(value){
 const source=embeddedPortraitSource(value);if(!source)return null;
 try{
  const split=source.indexOf(','),raw=atob(source.slice(split+1)),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const type=source.slice(5,split-7),png=type==='image/png'&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,
   jpeg=type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255,
   webp=type==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  return png||jpeg||webp?new Blob([bytes],{type}):null;
 }catch{return null;}
}
