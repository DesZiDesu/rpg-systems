// Package the screenshots/portable HTML produced by chat-folio.browser.mjs.
import http from 'node:http';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const destination=new URL('../docs/previews/chat-folio/',import.meta.url),source=process.env.CHAT_FOLIO_ARTIFACTS||'/tmp/roleforge-chat-folio';
await mkdir(new URL('screenshots/',destination),{recursive:true});await copyFile(`${source}/standalone.html`,new URL('standalone.html',destination));
for(const width of [390,1280])for(const variant of ['with-portrait','without-portrait','red'])await copyFile(`${source}/folio-${width}-${variant}.png`,new URL(`screenshots/folio-${width}-${variant}.png`,destination));
await copyFile(`${source}/folio-390-red.png`,new URL('folio-red-mobile.png',destination));await copyFile(`${source}/folio-1280-red.png`,new URL('folio-red-desktop.png',destination));
const server=http.createServer((_,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><title>Preview packaging</title>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,device]of [[390,'mobile'],[1280,'desktop']]){
  const images=await Promise.all(['with-portrait','without-portrait'].map(async variant=>'data:image/png;base64,'+(await readFile(`${source}/folio-${width}-${variant}.png`)).toString('base64')));
  const size=width===390?790:1236,page=await browser.newPage({viewport:{width:size,height:1500},deviceScaleFactor:1});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.setContent(`<!doctype html><html lang="th"><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#141a16;color:#d9e2d5;font:13px/1.6 system-ui,sans-serif}small{font-size:9px;letter-spacing:2px;color:#afc6b5}h1{font:400 30px/1.3 Georgia,serif;margin:9px 0 6px}p{margin:0 0 20px;color:#b4bdb1;font-size:12px}.screens{display:grid;grid-template-columns:${width===390?'repeat(2,minmax(0,1fr))':'minmax(0,1fr)'};gap:18px}.screen{min-width:0}.caption{display:block;font-size:12px;margin-bottom:9px;color:#c6d5c2}.screen img{width:100%;height:auto;display:block}.foot{margin:20px 0 0;font-size:11px}</style><small>ROLEFORGE 0.65.0 · PRODUCTION UI</small><h1>The Mage’s Folio</h1><p>${width===390?'มือถือ':'PC'} · ภาพ 1:1 · สีประจำตัว NPC · Header และ Narrative ไม่มีพื้นหลัง</p><div class="screens">${images.map((src,i)=>`<div class="screen"><span class="caption">${i===0?'มีภาพตัวละคร':'ไม่มีภาพตัวละคร'}</span><img src="${src}" alt="${i===0?'With portrait':'Without portrait'}"></div>`).join('')}</div><p class="foot">ใช้ renderer และ CSS จริงของส่วนเสริม · กรอบ SillyTavern และข้อมูลตัวอย่างใช้สำหรับ Preview</p></html>`);
  await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:new URL(`folio-${device}.png`,destination).pathname,fullPage:true});await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
await writeFile(new URL('PORTABLE-README.th.md',destination),'# RoleForge · The Mage’s Folio\n\nเปิด standalone.html ด้วยเบราว์เซอร์ ใช้งานได้ออฟไลน์ สลับ RoleForge Original / The Mage’s Folio เลือกสีตัวละคร ภาพ 1:1 ป้ายข้อมูล และเปิด/ปิด Header / Dialogue / Narrative ได้แยกกัน\n\nPreview จับ DOM จาก renderer จริง พร้อม CSS ภาพและฟอนต์ในไฟล์เดียว กรอบ SillyTavern และข้อมูล NPC เป็นตัวอย่าง ปุ่มข้อมูลเปิดรายละเอียดตัวอย่าง ปุ่มบทพากย์เปิดคำอธิบาย ไม่มีการเรียก API หรือเชื่อมต่อแชทผู้ใช้\n\nเมื่อติดตั้ง RoleForge 0.65.0 ให้เลือกธีมใน Extensions → RoleForge → Chat appearance & NPCs\n');
execFileSync('python',['-c',`from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
folder=Path(${JSON.stringify(destination.pathname)})
with ZipFile(folder/'roleforge-folio-preview.zip','w',ZIP_DEFLATED) as archive:
 for name in ['standalone.html','PORTABLE-README.th.md','folio-mobile.png','folio-desktop.png','folio-red-mobile.png','folio-red-desktop.png']:
  archive.write(folder/name,name)
 for image in sorted((folder/'screenshots').glob('*.png')): archive.write(image,'screenshots/'+image.name)
 archive.write(folder.parent/'chat-original/assets/FONT-LICENSE.txt','FONT-LICENSE.txt')
with ZipFile(folder/'roleforge-folio-preview.zip') as archive:
 assert archive.testzip() is None
 assert all(not name.startswith('/') and '..' not in Path(name).parts for name in archive.namelist())
 print('PASS portable archive CRC and relative paths:',len(archive.namelist()),'files')`],{stdio:'inherit'});
console.log('Packaged production previews:',destination.pathname);
