// Self-contained production renderer preview. No remote fonts, AI or Voice API.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {build}=require(process.env.ROLEFORGE_PREVIEW_ESBUILD||'esbuild');
const root=new URL('../',import.meta.url),folder=new URL('docs/previews/chat-designs/',root),artifacts=process.env.CHAT_DESIGN_ARTIFACTS||'/tmp/roleforge-chat-designs';
const photo='data:image/jpeg;base64,'+(await readFile(new URL('docs/previews/chat-original/assets/sample-character.jpg',root))).toString('base64');
let css='';
for(const file of ['styles/npc-ui.css','styles/voice-addons.css','styles/chat-themes.css','styles/chat-illustrated.css','docs/previews/chat-designs/gallery.css']){
 let part=await readFile(new URL(file,root),'utf8');
 for(const match of [...part.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)]){
  if(match[1].startsWith('data:'))continue;
  const asset=await readFile(new URL(match[1],new URL(file,root))),mime=match[1].endsWith('.woff2')?'font/woff2':'application/octet-stream';
  part=part.replaceAll(match[0],`url(data:${mime};base64,${asset.toString('base64')})`);
 }
 css+=part+'\n';
}
const js=(await readFile(new URL('gallery.js',folder),'utf8')).replace("new URL('../chat-original/assets/sample-character.jpg',import.meta.url)",()=>JSON.stringify(photo));
const compiled=await build({stdin:{contents:js,resolveDir:folder.pathname,sourcefile:'gallery.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,logLevel:'silent'});
let html=(await readFile(new URL('index.html',folder),'utf8')).replace(/\s*<link rel="stylesheet"[^>]*>/g,'');
html=html.replace('</head>',()=>`<style>${css}</style></head>`).replaceAll('../chat-original/assets/sample-character.jpg',photo);
html=html.replace(/<script type="module"[^>]*><\/script>/,()=>`<script type="module">${compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
await writeFile(new URL('standalone.html',folder),html);
await mkdir(new URL('screenshots/',folder),{recursive:true});
for(const theme of ['chapter','codex','aincrad'])for(const [width,device]of [[390,'mobile'],[1440,'desktop']])for(const variant of ['portrait','no-portrait']){
 await copyFile(`${artifacts}/${theme}-${width}-${variant}-chat.png`,new URL(`screenshots/${theme}-${device}-${variant}.png`,folder));
}
await copyFile(`${artifacts}/validation.json`,new URL('browser-validation.json',folder));
await copyFile(new URL('assets/chat-fonts/LICENSE.txt',root),new URL('FONT-LICENSE.txt',folder));
await writeFile(new URL('README.txt',folder),'RoleForge 0.67.0 · Production chat designs\n\nเปิด standalone.html ในเบราว์เซอร์เพื่อดูทั้งสามดีไซน์ ใช้งานออฟไลน์ได้ พร้อมตัวเลือกมือถือ/PC ภาพ 1:1 สีตัวละคร และสวิตช์แยก Header/Dialogue/Narrative\n\nใช้ renderer และ CSS จริงของ RoleForge กรอบ SillyTavern ข้อมูล NPC และข้อความเป็นตัวอย่าง ไม่ได้เข้าถึง SillyTavern ของผู้ใช้ ไม่เรียก AI หรือ Voice API ปุ่มบทพากย์เปิดคำอธิบาย ปุ่มฟังปิดอยู่จนเชื่อมต่อเสียงในส่วนเสริมจริง\n\nดีไซน์: The Gilded Chapter / The Royal Codex / Aincrad Interface\nในส่วนเสริมจริงเลือกที่ Extensions → RoleForge → Chat appearance & NPCs → Chat design การตั้งค่าจำแยกแชท และคง RoleForge Original กับ The Mage’s Folio ไว้\n\nHP/Lv อ่านจาก stats.hp / stats.level ของ NPC ซ่อนเมื่อไม่มีข้อมูล เส้นใต้ HP เป็นของตกแต่ง ไม่มีการสมมุติ HP สูงสุด\n\nฟอนต์ Noto: SIL Open Font License 1.1 (FONT-LICENSE.txt)\n');
execFileSync('python',['-c',`from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
p=Path(${JSON.stringify(folder.pathname)})
with ZipFile(p/'roleforge-chat-designs-preview.zip','w',ZIP_DEFLATED) as z:
 for name in ['standalone.html','README.txt','FONT-LICENSE.txt','browser-validation.json']:z.write(p/name,name)
 for image in sorted((p/'screenshots').glob('*.png')):z.write(image,'screenshots/'+image.name)
with ZipFile(p/'roleforge-chat-designs-preview.zip') as z:
 assert z.testzip() is None
 assert all(not n.startswith('/') and '..' not in Path(n).parts for n in z.namelist())
 print('PASS portable preview archive:',len(z.namelist()),'files')`],{stdio:'inherit'});
console.log('Built offline production preview:',Buffer.byteLength(html),'bytes');
