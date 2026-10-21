import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const input=resolve(process.env.DN_ARTIFACTS||'/workspace/artifacts/death-note-v0.81.0-paper-final');
const output=resolve('docs/previews/death-note-v0.81.0');
const validation=JSON.parse(await readFile(input+'/validation.json','utf8'));
if(!validation.pass||validation.failure||validation.errors.length||validation.devices.length!==2)throw Error('Both native SillyTavern runs must pass before publishing screenshots');
const unitLog=await readFile(process.env.DN_UNIT_LOG||'/workspace/artifacts/death-note-release-final-unit.log','utf8');
const tests=Number(unitLog.match(/ℹ tests (\d+)/u)?.[1]),passed=Number(unitLog.match(/ℹ pass (\d+)/u)?.[1]),failed=Number(unitLog.match(/ℹ fail (\d+)/u)?.[1]);
if(!tests||tests!==passed||failed!==0)throw Error('The complete unit suite must pass before publishing');
validation.unit={command:'npm test',tests,passed,failed};
await mkdir(output,{recursive:true});
const views=[
 ['paper-selected','เขียนและจัดหน้าอิสระ','แตะเพื่อพิมพ์ เลือกกรอบ ลากตำแหน่ง ปรับขนาด แล้วกด ✓ หรือ ×'],
 ['rules','กติกาสีดำ · ไทย','ตราจากภาพอ้างอิง ฟอนต์ลายมือ และลูกศรแบบไม่มีกรอบ'],
 ['rules-english','Rules · English','ข้อความปุ่มและกติกาทั้ง 71 หน้าเปลี่ยนตามภาษา RoleForge'],
 ['eyes-name-lifespan','ดวงตายมทูต','ชื่อที่รับรู้ยังอยู่ ชื่อจริงสีแดงอยู่ข้างกัน อายุขัยเดิมแสดงเมื่อมีข้อมูล'],
 ['forged-page','หน้ากฎที่จารึกเพิ่ม','อ่านข้อความได้เหมือนหน้าสมุด แต่ไม่มีอำนาจเปลี่ยนกฎจริง']
];
for(const device of ['desktop','mobile'])for(const [name]of views)await copyFile(`${input}/${device}-${name}.png`,`${output}/${device}-${name}.png`);
await writeFile(output+'/validation.json',JSON.stringify(validation,null,2));
const cards=views.map(([name,title,caption])=>`<section><h2>${title}</h2><p>${caption}</p><div class="pair">${['desktop','mobile'].map(device=>`<figure class="${device}"><a href="${device}-${name}.png"><img src="${device}-${name}.png" loading="lazy" alt="${title} — ${device==='desktop'?'คอม':'มือถือ'}"></a><figcaption>${device==='desktop'?'Desktop · 1440 × 1000':'Mobile · 390 × 844 · touch emulation'}</figcaption></figure>`).join('')}</div></section>`).join('');
await writeFile(output+'/index.html',`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Death Note · RoleForge 0.81.0</title><style>
*{box-sizing:border-box}body{margin:0;background:#111110;color:#ded8c8;font:15px/1.8 system-ui,sans-serif}main{max-width:1300px;margin:auto;padding:48px 24px 80px}header{border-bottom:1px solid #89784b55;padding-bottom:24px;margin-bottom:30px}header small{color:#b8a36a;letter-spacing:.15em}h1{font:clamp(30px,5vw,54px)/1.3 Georgia,serif;font-weight:400;margin:12px 0}h2{font-size:21px;font-weight:500;margin:0}p{color:#a9a497;margin:8px 0 22px}a{color:#d3bc7d;text-underline-offset:4px}section{padding:30px 0;border-bottom:1px solid #89784b33}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,300px);gap:24px;align-items:start}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;border:1px solid #766a4a55;border-radius:4px}figcaption{font-size:12px;color:#aaa18c;margin:10px 0}footer{font-size:13px;color:#918b7d;margin-top:32px}@media(max-width:700px){main{padding:30px 16px}.pair{grid-template-columns:1fr;gap:20px}.mobile{max-width:390px;margin:auto}.pair:before{content:'Desktop';font-size:12px;color:#aaa18c}.desktop figcaption{display:none}}
</style><main><header><small>ROLEFORGE 0.81.0 · DEATH NOTE 0.3.0</small><h1>Death Note</h1><p>ภาพหน้าจอจาก SillyTavern 1.19.0 ที่รันจริง · ธีม Dark Lite</p><a href="../../death-note-v0.81.0.th.md">คู่มือและขอบเขตระบบ</a> · <a href="validation.json">ผลตรวจสอบ</a></header>${cards}<footer>ทดสอบ Continue ด้วย SSE fixture ที่ควบคุมผ่านทางเดิน generate ของ SillyTavern จริง ไม่ได้ใช้โมเดลภายนอก มือถือเป็น Chromium touch emulation ไม่ใช่ iPhone / Safari จริง แตะภาพเพื่อดูขนาดเต็ม</footer></main></html>`);
console.log('Built '+output);
