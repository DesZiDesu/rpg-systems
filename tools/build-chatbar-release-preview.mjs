// Package the actual SillyTavern captures; no mock UI or generated images.
// Run after chatbar-settings.real / utility-dock-preview.real / dock-overflow.real.
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=new URL('../',import.meta.url),artifacts=process.env.CHATBAR_ARTIFACTS||'/workspace/artifacts';
const output=new URL('docs/previews/chatbar-windows-0760/',root);
const download=path.join(artifacts,'chatbar-windows-0760');
await mkdir(output,{recursive:true});await mkdir(download,{recursive:true});
const shots=[
 ['mobile-hub.png','chatbar-076-settings-native/mobile-hub.png','mobile','ตั้งค่าทุกหน้าต่างในที่เดียว','Extensions → RoleForge → หน้าต่างเหนือ Chatbar'],
 ['desktop-hub.png','chatbar-076-settings-native/desktop-hub.png','desktop','ตั้งค่าบน PC','หน้าเดียวกัน ใช้รูปแบบและสีตามธีม SillyTavern'],
 ['mobile-incantation.png','chatbar-076-settings-native/mobile-incantation.png','mobile','บทร่ายอยู่ในหน้าเดียวกัน','กติกา NPC และภาษาบทร่ายอยู่ในหัวข้อพับได้'],
 ['desktop-contextual.png','chatbar-076-settings-native/desktop-contextual.png','desktop','หน้าต่างตามสถานการณ์','เปิดระบบซื้อ ขาย ประมูล และ Memory จากหน้าเดียวกัน'],
 ['mobile-missions.png','chatbar-076-dock-native/mobile-buy-mission-dock.png','mobile','ภารกิจแบบใหม่','เป้าหมายถัดไป ความคืบหน้า รางวัล และตัวเลือกภารกิจ'],
 ['desktop-missions.png','chatbar-076-dock-native/desktop-buy-mission-dock.png','desktop','ภารกิจบน PC','ปัดแถบแท็บหรือใช้ปุ่มสี่ช่องเพื่อเลือกทุกหน้าต่าง'],
 ['mobile-inventory.png','chatbar-076-utility-mobile/mobile-inventory-panel.png','mobile','กระเป๋าเหนือช่องพิมพ์','ค้นหา แบ่งหมวด และแตะของเพื่อเปิดรายละเอียด'],
 ['desktop-inventory.png','chatbar-076-utility-desktop/desktop-inventory-panel.png','desktop','กระเป๋าบน PC','ดูของที่มีอยู่จริงโดยไม่ต้องเปิดหน้าหลัก RoleForge'],
 ['mobile-hstats.png','chatbar-076-utility-mobile/mobile-hstats-panel.png','mobile','H-Stats ที่เลือกเปิดเองได้','แสดงข้อมูลที่บันทึกไว้ ช่องที่ไม่ทราบยังคงไม่ทราบ'],
 ['desktop-hstats.png','chatbar-076-utility-desktop/desktop-hstats-panel.png','desktop','H-Stats บน PC','เลือกโปรไฟล์และหมวด โดยไม่เรียก AI จากการเปิดดู'],
 ['mobile-commerce.png','chatbar-076-dock-native/mobile-auction-dock.png','mobile','แท็บประมูลเมื่อมีหลายหน้าต่าง','ตัวเลือกทั้งหมดและปุ่มย่อมีพื้นที่ของตัวเอง'],
 ['desktop-commerce.png','chatbar-076-dock-native/desktop-auction-dock.png','desktop','หลายแท็บบน PC','เข้าถึงหน้าซื้อ ขาย หรือประมูลได้ครบ'],
];
for(const [file,source] of shots)await copyFile(path.join(artifacts,source),new URL(file,output));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function gallery(inline=false){
 const figures=await Promise.all(shots.map(async([file,,device,title,caption])=>{
  const src=inline?'data:image/png;base64,'+(await readFile(new URL(file,output))).toString('base64'):file;
  return `<figure data-device="${device}"><figcaption><strong>${escape(title)}</strong><span>${escape(caption)}</span></figcaption><a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${escape(title)}" loading="lazy"></a></figure>`;
 }));
 return `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RoleForge 0.76.0 — หน้าต่างเหนือ Chatbar</title><style>
 :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#141516;color:#eee;font:16px/1.7 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:28px 18px 60px}h1{font-size:clamp(24px,4vw,36px);line-height:1.35;margin:4px 0 14px}p{color:#bcbfc4;margin:8px 0 18px}nav{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0}button{padding:10px 18px;border:1px solid #555;border-radius:8px;background:#242629;color:inherit;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#e0d3b2;color:#24211b;border-color:#e0d3b2}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:22px;align-items:start}figure{margin:0;min-width:0;border:1px solid #3d4044;border-radius:10px;overflow:hidden;background:#1d1f22}figcaption{padding:16px;display:grid;gap:5px}figcaption span{font-size:14px;color:#bcbfc4}figure a{display:block;background:#111;text-align:center}img{max-width:100%;height:auto;display:block;margin:auto}figure[data-device=mobile] img{max-height:960px;object-fit:contain}figure[hidden]{display:none}.badge{color:#e0d3b2;letter-spacing:.08em;font-size:12px}.note{font-size:14px;border-top:1px solid #3d4044;margin-top:28px;padding-top:18px}
 </style><main><div class="badge">ROLEFORGE 0.76.0 · SILLYTAVERN 1.19.0</div><h1>หน้าต่างเหนือ Chatbar<br>ตั้งค่าจากหน้าเดียว</h1><p>ภาพจาก SillyTavern ที่รันทดสอบจริง ใช้ธีม Dark Lite<br>Extensions → RoleForge → หน้าต่างเหนือ Chatbar</p><nav aria-label="เลือกขนาดหน้าจอ"><button data-filter="mobile" aria-pressed="true">มือถือ</button><button data-filter="desktop" aria-pressed="false">PC</button><button data-filter="all" aria-pressed="false">ทั้งหมด</button></nav><div class="grid">${figures.join('')}</div><p class="note">มือถือทดสอบด้วย Chromium จำลองหน้าจอและสัมผัส การเจนข้อความใช้ SSE fixture ภายในผ่าน Generate ของ SillyTavern ไม่มีการเรียกโมเดลภายนอกระหว่างทดสอบ</p></main><script>function filter(value){for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===value));for(const f of document.querySelectorAll('[data-device]'))f.hidden=value!=='all'&&f.dataset.device!==value;}for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>filter(b.dataset.filter);filter('mobile');</script></html>`;
}
await writeFile(new URL('index.html',output),await gallery());
await writeFile(path.join(download,'preview.html'),await gallery(true));
await copyFile(new URL('mobile-hub.png',output),path.join(download,'mobile-settings.png'));
await copyFile(new URL('mobile-missions.png',output),path.join(download,'mobile-missions.png'));
console.log(`Packaged ${shots.length} real screenshots. Download: ${download}/preview.html`);
