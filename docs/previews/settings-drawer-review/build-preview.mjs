import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {build}=require(process.env.ESBUILD_MODULE||'esbuild');
const folder=new URL('./',import.meta.url),root=new URL('../../../',folder);
const snapshot=JSON.parse(await readFile(new URL('snapshot.json',folder),'utf8'));
async function inlineStyles(file){
 let css=await readFile(file,'utf8');
 for(const match of [...css.matchAll(/@import\s+url\(['"]?([^'")]+)['"]?\)\s*;/g)]){
  const replacement=/^https?:/.test(match[1])?'':await inlineStyles(new URL(match[1].split('?')[0],file));
  css=css.replace(match[0],()=>replacement);
 }
 return css;
}
let css='';
for(const entry of snapshot.styles){
 if(entry.text!==undefined)css+=entry.text+'\n';
 else{
  const path=new URL(entry.href).pathname,base='/scripts/extensions/third-party/rpg-systems/';
  if(path.startsWith(base))css+=await inlineStyles(new URL(path.slice(base.length),root))+'\n';
 }
}
for(const match of [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)]){
 if(match[1].includes('assets/chat-fonts/')){
  const file=new URL('assets/chat-fonts/'+match[1].split('assets/chat-fonts/')[1].split('?')[0],root);
  css=css.replaceAll(match[0],`url(data:font/woff2;base64,${(await readFile(file)).toString('base64')})`);
 }
}
css+=`\n.review-chat{box-sizing:border-box;position:fixed;left:7vw;top:75px;right:510px;margin:0;padding:25px;max-width:650px}.review-chat h1{font:600 25px/1.5 system-ui,sans-serif;margin:0 0 8px;color:#ddd}.review-chat ul{padding-left:22px;line-height:2}.review-chat a{color:#ccc}.review-note{padding:9px 0;margin:0 0 10px;font-size:12px;line-height:1.6;color:#aaa;border-bottom:1px solid #444}.review-toast{position:fixed;bottom:18px;right:18px;z-index:1000;padding:12px 16px;max-width:min(370px,calc(100vw - 36px));box-sizing:border-box;border:1px solid #555;border-radius:6px;background:#303030;color:#ddd;font:14px/1.6 system-ui,sans-serif;box-shadow:0 3px 20px #0005}.review-toast[hidden]{display:none}.review-unsupported{font:14px/1.6 system-ui;color:#aaa;padding:10px;border:1px solid #555}@media(max-width:1000px){.review-chat{display:none}}`;
const js=await build({entryPoints:[new URL('preview-runtime.js',folder).pathname],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',minify:true,logLevel:'silent'});
const theme=(snapshot.theme||'').replaceAll('&','&amp;').replaceAll('"','&quot;');
const html=`<!doctype html><html lang="th" style="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RoleForge · Settings drawer review</title><style>${css}</style></head><body>
<div class="st-review-toolbar" aria-hidden="true"><i class="fa-solid fa-sliders"></i><span>A</span><i class="fa-solid fa-book-open"></i><i class="fa-solid fa-user"></i><i class="fa-solid fa-image"></i><i class="fa-solid fa-cubes"></i><i class="fa-solid fa-face-smile"></i></div>
<main class="review-chat"><h1>RoleForge · จัดหน้าตั้งค่าใหม่</h1><p>คงหน้าตา SillyTavern<br>เมนูหลัก 6 หมวด พร้อมค้นหาและหน้าจัดการเต็ม drawer</p><ul><li>ค้นหาชื่อระบบหรือชื่อค่า เช่น Header, ค่าเงิน หรือ HP</li><li>เปิดหน้าจัดการแล้วกดกลับได้ ร่างที่พิมพ์ไว้ยังอยู่</li><li>มือถือแสดงทีละหน้าเต็มความกว้าง</li></ul><p>ไฟล์นี้เป็นพรีวิวออฟไลน์สำหรับตรวจการจัดวาง<br>การบันทึกและ Import/Export ใช้ในส่วนเสริมจริง<br>RoleForge 0.68.0 · ฟอร์มไม่บันทึกค่าจริง</p></main>
${snapshot.html}
<div class="review-toast" role="status" hidden></div>
<script>${js.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>
</body></html>`;
await writeFile(new URL('index.html',folder),html.replace(/[\t ]+$/gm,''));
await writeFile(new URL('FONT-LICENSE.txt',folder),await readFile(new URL('assets/chat-fonts/LICENSE.txt',root)));
await writeFile(new URL('ICON-LICENSE.txt',folder),await readFile(new URL('../chat-original/assets/FONT-LICENSE.txt',folder)));
console.log('Built self-contained review:',Buffer.byteLength(html).toLocaleString(),'bytes');
