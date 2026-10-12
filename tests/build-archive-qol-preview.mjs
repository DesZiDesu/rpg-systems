// Bundle the real workspace so the review preview works from a single local
// HTML file, including offline. Install esbuild outside the repository or set
// ARCHIVE_PREVIEW_ESBUILD to its package path; runtime extension has no dependency.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const esbuild=require(process.env.ARCHIVE_PREVIEW_ESBUILD||'/tmp/roleforge-archive-preview-tools/node_modules/esbuild');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname),folder=path.join(root,'docs/previews/archive-qol');
const built=await esbuild.build({entryPoints:[path.join(folder,'preview.js')],bundle:true,write:false,format:'esm',minify:true,target:'es2022',plugins:[{
    name:'inline-production-styles',setup(build){
        build.onResolve({filter:/\?.*$/},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0])}));
        build.onLoad({filter:/\.js$/},async args=>{
            let contents=await readFile(args.path,'utf8');
            const expression=/new URL\((['"])([^'"]+\.css(?:\?[^'"]*)?)\1,\s*import\.meta\.url\)\.href/g;
            for(const match of [...contents.matchAll(expression)]){
                const css=await readFile(path.resolve(path.dirname(args.path),match[2].split('?')[0]));
                contents=contents.replace(match[0],JSON.stringify('data:text/css;base64,'+css.toString('base64')));
            }
            return {contents,loader:'js',resolveDir:path.dirname(args.path)};
        });
    }
}]});
const font=await readFile(path.join(root,'docs/previews/chat-original/assets/preview-icons.woff2'));
let html=await readFile(path.join(folder,'index.html'),'utf8');
html=html.replace("url('../chat-original/assets/preview-icons.woff2')",`url('data:font/woff2;base64,${font.toString('base64')}')`);
// A replacement callback preserves literal $&, $' and similar text in bundled
// regexes; a replacement string would interpret them and corrupt the script.
html=html.replace('<script type="module" src="./preview.js"></script>',()=>`<script type="module">${built.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
await writeFile(path.join(folder,'standalone.html'),html);
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    const offline=await browser.newContext({viewport:{width:390,height:900}}),requests=[],errors=[];
    await offline.route('http://**/*',route=>{requests.push(route.request().url());route.abort();});await offline.route('https://**/*',route=>{requests.push(route.request().url());route.abort();});
    const page=await offline.newPage();page.on('pageerror',error=>{errors.push(error.message);console.error('OFFLINE PREVIEW',error.message);});page.on('dialog',dialog=>dialog.accept());
    // The managed browser blocks file:// navigation. Load the exact standalone
    // bytes into a fresh document with all HTTP(S) blocked to verify portability.
    await page.setContent(html);await page.waitForFunction(()=>window.previewReady);
    async function choice(container,key){const button=page.locator(`${container} [data-archive-${key}]`);if(!await button.isVisible())await page.locator(`${container} [data-archive-selection-menu]`).click();await button.click();}
    assert.equal(await page.locator('.trpg-browser .trpg-archive-row').count(),20);
    await page.locator('.trpg-browser [data-archive-filter=disabled]').click();await page.locator('.trpg-browser [data-archive-select-mode]').click();await choice('.trpg-browser','select-results');
    await page.locator('.trpg-browser [data-archive-enable]').click();assert.ok((await page.evaluate(()=>window.previewState())).character.every(n=>n.enabled));
    await choice('.trpg-browser','undo');assert.equal((await page.evaluate(()=>window.previewState())).character.filter(n=>!n.enabled).length,16);
    await choice('.trpg-browser','select-results');await choice('.trpg-browser','delete');assert.equal((await page.evaluate(()=>window.previewState())).character.length,32);
    await page.locator('[data-management-tab=lore]').click();assert.equal(await page.locator('.trpg-lore-panel .trpg-lore-row').count(),20);
    await page.locator('.trpg-lore-panel [data-archive-filter=disabled]').click();await page.locator('.trpg-lore-panel [data-archive-select-mode]').click();await choice('.trpg-lore-panel','select-results');await page.locator('.trpg-lore-panel [data-archive-enable]').click();
    assert.ok((await page.evaluate(()=>window.previewState())).lore.every(n=>n.enabled));assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
    await page.locator('.trpg-lore-panel [data-archive-filter=all]').click();await choice('.trpg-lore-panel','select-results');await choice('.trpg-lore-panel','delete');assert.deepEqual((await page.evaluate(()=>window.previewState())).lore,[]);assert.deepEqual(errors,[]);
    await page.close();await offline.close();
    for(const [device,width,size]of [['mobile',390,840],['desktop',1280,1280]]){
        for(const batch of [false,true]){
            const images=[];for(const name of ['characters','lore'])images.push('data:image/png;base64,'+(await readFile(path.join(folder,`screenshots/${name}${batch?'-batch':''}-${width}.png`))).toString('base64'));
            const page=await browser.newPage({viewport:{width:size,height:1800}});
            await page.setContent(`<!doctype html><html lang="th"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#141412;color:#e6d6b2;font:13px/1.6 system-ui,sans-serif}small{font-size:10px;letter-spacing:2px;color:#b7a471}h1{font-size:27px;margin:8px 0}p{color:#b5ae9c;margin:0 0 20px}.screens{display:grid;grid-template-columns:${device==='mobile'?'repeat(2,minmax(0,1fr))':'minmax(0,1fr)'};gap:16px}.screen{min-width:0}.screen>span{display:block;margin-bottom:8px;font-size:12px}.screen img{width:100%;height:auto;display:block}.foot{margin:20px 0 0;font-size:11px}</style><small>ROLEFORGE 0.66.2 · PRODUCTION UI</small><h1>Character / Lore · ${batch?'เลือกหลายรายการ':'เปิด–ปิดง่ายขึ้น'}</h1><p>${device==='mobile'?'มือถือ':'PC'} · รายชื่อเป็นพื้นที่หลัก · ปุ่มจัดการอยู่ด้านล่าง</p><div class="screens">${images.map((src,i)=>`<div class="screen"><span>${i===0?'Character / NPC':'Lore Management'}</span><img src="${src}" alt="${i===0?'Character':'Lore'} preview"></div>`).join('')}</div><p class="foot">ใช้ workspace และ CSS จริงกับข้อมูลตัวอย่าง · ไม่เชื่อมต่อแชทผู้ใช้ · Preview รุ่น 0.66.2</p></html>`);
            await page.waitForFunction(()=>[...document.images].every(n=>n.complete&&n.naturalWidth));
            const contentHeight=await page.evaluate(()=>Math.ceil(document.body.getBoundingClientRect().height));await page.setViewportSize({width:size,height:contentHeight});
            await page.screenshot({path:path.join(folder,`${device}${batch?'-batch':''}.png`),fullPage:true});await page.close();
        }
    }
}finally{await browser?.close();}
await writeFile(path.join(folder,'README.th.md'),'# RoleForge · Character / Lore QoL preview\n\nเปิด standalone.html ในเบราว์เซอร์ ใช้งานได้ออฟไลน์ด้วย UI และฟังก์ชันของส่วนเสริมจริง ข้อมูลทั้งหมดเป็นตัวอย่างในหน้านี้ ไม่มีการเชื่อมต่อ SillyTavern ของผู้ใช้หรือเรียก AI\n\n- หน้าหลักเหลือค้นหา ตัวกรอง และรายชื่อ · รายชื่อเลื่อนในพื้นที่เดียว\n- ตัวกรองทั้งหมด / เปิดอยู่ / ปิดอยู่ พร้อมจำนวน\n- ปุ่ม ⋯ ข้างหัวหน้าต่างรวมเลือกคลัง สร้าง นำเข้า สำรองภาพ และตั้งค่า Lore\n- เปลี่ยนหน้าและเลือกหลายรายการจากแถบด้านล่าง · ไม่เพิ่มแผงสูงด้านบน\n- ปุ่มเปิด–ปิดที่แถวรายการ · รายการปิดมีกรอบขีด ป้าย และสีแยกชัด โดยไม่ลบข้อมูล\n- กดเลือก แล้ว ⋯ ด้านล่างเพื่อเลือกหน้านี้ หรือผลค้นหาทุกหน้า · 20 รายการต่อหน้า\n- เลือกหลายรายการแล้วใช้ ⋯ ด้านล่าง → ลบที่เลือก · ยืนยันจำนวนและคลัง · Undo ไม่กู้รายการที่ลบ\n- แถวรายการบนมือถือสั้นลง · กดชื่อเพื่อดูรายละเอียดเต็มหรือลบ Lore\n- คงการเลือกเมื่อเปลี่ยนหน้า · ล้างเมื่อเปลี่ยนคำค้น ตัวกรอง แชท หรือ Scope\n- เปิด / ปิดรายการที่เลือก และย้อนสถานะล่าสุด · ไม่ทับคำอธิบายหรือข้อมูลอื่น\n- งบ Lore เดิมยังตรวจสอบก่อนบันทึก · เลือกเกินงบแล้วจะเก็บสถานะเดิมทั้งหมด\n- จำนวน Lore ตั้งค่าได้ในเมนู ⋯ → คลังและการส่ง Lore · ค่าเริ่มต้นไม่จำกัดจำนวนรายการ งบส่งให้ AI ยังแยกต่างหาก\n- คลัง Lore ใหญ่เกิน 12 MB จะมีไฟล์ส่งออกหลายส่วนให้ดาวน์โหลดแล้วนำเข้าแต่ละไฟล์ได้\n- ค่าเปิด–ปิดใช้ขอบเขตการเก็บเดิม: NPC มี Chat / Character; Lore ผูกกับการ์ด · เปิด Lore หมายถึงอนุญาตตามโหมดและงบ ไม่ใช่ส่งทุกรายการทุกครั้ง\n\nPreview รุ่น 0.66.2 · ใช้ข้อมูลตัวอย่างเพื่อทดลอง UI\n');
execFileSync('python',['-c',`from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
folder=Path(${JSON.stringify(folder)})
with ZipFile(folder/'roleforge-archive-qol-preview.zip','w',ZIP_DEFLATED) as z:
 for name in ['standalone.html','README.th.md','mobile.png','desktop.png','mobile-batch.png','desktop-batch.png','validation.json']: z.write(folder/name,name)
 z.write(folder.parent/'chat-original/assets/FONT-LICENSE.txt','FONT-LICENSE.txt')
with ZipFile(folder/'roleforge-archive-qol-preview.zip') as z:
 assert z.testzip() is None
 assert all(not name.startswith('/') and '..' not in Path(name).parts for name in z.namelist())
 print('PASS preview ZIP CRC and relative paths:',len(z.namelist()),'files')`],{stdio:'inherit'});
console.log('PASS offline preview: real workspace functions, NPC/Lore bulk + Undo + Delete, no network/AI calls');
