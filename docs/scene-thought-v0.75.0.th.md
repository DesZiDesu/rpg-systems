# RoleForge 0.75.0 — Scene Status, Inner Thoughts และ Morgan

## สิ่งที่เปลี่ยน

- Live Scene Status และ Inner Thoughts ของผู้เล่นใช้ธีมเดียวกับ Header / Dialogue โดยอัตโนมัติ ทั้ง RoleForge Original, The Mage’s Folio, The Gilded Chapter, The Royal Codex และ Aincrad Interface
- Scene Status เก็บเลขฉาก วัน เวลา สถานที่ ภูมิภาค โลก อากาศ อุณหภูมิ และผู้ร่วมฉากเหมือนเดิม รายละเอียดเพิ่มเติมยังกดขยายได้ ชื่อสถานที่ยาวขึ้นบรรทัดได้
- Inner Thoughts ใช้ข้อความ `|พูดในใจ|` ของ User ตามเดิม กรอบ เส้น และป้ายปรับตามธีม ข้อความอ่านจากซ้ายตามปกติ
- เอาแถบ RoleForge “ผู้เล่น + ชื่อ” ที่ซ้ำด้านบนข้อความ User ออก ชื่อผู้ส่งของ SillyTavern และชื่อในกรอบบทพูดยังคงระบุผู้พูด
- Custom attribute แยกค่าและหน่วย เช่น `Energy Control 0 practice points` หน่วยเป็นตัวเล็กสีรองและขึ้นบรรทัดได้ ไม่เปลี่ยนชื่อ หน่วย หรือค่าที่ผู้สร้างการ์ดกำหนด
- ไอคอนฝึกในหัวหน้าต่างและปุ่มเริ่มฝึกใช้ `fa-dumbbell` ของ SillyTavern แทนภาพ SVG เดิม
- เพิ่ม Excalibur Morgan ตามภาพที่อนุมัติ พร้อมออร่าแดงเฉพาะใบดาบ โลหะดำและด้ามไม่ถูกย้อมเป็นลำแสง

## วิธีใช้

1. อัปเดตส่วนเสริมแล้ว Reload SillyTavern
2. ไปที่ RoleForge → หน้าต่างและรูปลักษณ์ → รูปแบบข้อความ เลือกธีมเดิมที่ต้องการ Scene Status และ Inner Thoughts จะตามธีมของแชตนั้น
3. เปิด Scene Tracker หากต้องการข้อมูลฉาก และเปิด User-only Dialogue / Narrative / Inner thought UI หากต้องการจัดรูปแบบข้อความผู้เล่น
4. เขียน `|ข้อความที่คิดในใจ|` ในข้อความ User ตามปกติ ไม่ต้องสร้างข้อมูลชนิดใหม่
5. หากใช้ Morgan ให้เปิดระบบ Weapons ของแชตนั้นและมีไอเทม `Excalibur Morgan` ใน Inventory ก่อน เลือกอาวุธในหน้าจัดการอาวุธ หรือเลือกภาพ Morgan ให้ไอเทมที่มีอยู่แล้วอย่างชัดเจน
6. ปุ่ม Unleash ส่งการกระทำเข้าแชตหลัก เอฟเฟกต์เปิดหลัง AI ยืนยันการใช้งานตามเงื่อนไขโลก ไม่เพิ่มอาวุธหรือพลังให้เอง และไม่ได้เรียกโมเดลเพิ่มเพื่อแสดงภาพ

Header / Dialogue / Narrative ยังเปิดปิดแยกกันได้ Scene Tracker ใช้สวิตช์เดิมของตัวเอง ชุดธีมนี้ไม่มีระบบ Dark/Light Mode เพิ่ม และไม่เปลี่ยนข้อความต้นฉบับเพื่อเปลี่ยนรูปแบบ

## ไฟล์หลัก

- `src/scene-tracker.js`, `src/npc-chat.js`: ส่งธีมให้การ์ดข้อมูลฉาก
- `src/user-chat.js`, `src/chat-compat.js`: ความคิดผู้เล่นและการเอาแถบชื่อซ้ำออก รวมโหมด Shared
- `styles/chat-scene-thought.css`: รูปทรงของทั้งห้าธีม โหลดผ่าน stylesheet ธีมเดิมและมี selector เฉพาะ UI ของ RoleForge
- `src/stat-composer.js`, `styles/stat-composer.css`: ค่า/หน่วยและไอคอนฝึก
- `src/weapon-{catalog,core,art,morgan-art,composer,manager}.js`: การเลือกภาพ Morgan และการแสดงผล
- `assets/weapons/special/excalibur-morgan.png`: ภาพโปร่งใสที่อนุมัติ 2172×724, 364,156 ไบต์ ไม่ต้องเก็บ GIF หรือเฟรมภาพในส่วนเสริม

SHA-256 ของ Morgan: `6351a0ab7d7bd129178983e80c7e91c8fe1749905cc8465b3a91e88c54be17da`

## Preview และการทดสอบซ้ำ

เปิด [Preview ทั้งห้าธีม](previews/scene-thought-review/index.html) ผ่าน HTTP ของ repository หรือใช้ไฟล์ `scene-thought-preview.html` ในผลทดสอบ ซึ่งรวม CSS และฟอนต์ไว้แล้ว เปิดแบบออฟไลน์ได้ มีตัวเลือกธีม ขนาดแชต และปุ่มขยายรายละเอียดจริง

```sh
npm test
npm run check
node tests/scene-thought.real.browser.mjs
ST_SCENE_DEVICE=desktop ST_SCENE_ARTIFACTS=/tmp/roleforge-scene-desktop node tests/scene-thought.real.browser.mjs
node tests/weapons.real.browser.mjs
node tools/build-scene-thought-preview.mjs
```

การทดสอบ `.real.browser.mjs` ต้องใช้ SillyTavern ท้องถิ่นที่ติดตั้ง repository นี้ไว้ ค่าเริ่มต้นคือ `http://127.0.0.1:18180` เปลี่ยนด้วย `ST_REAL_URL` ส่วน `CHROMIUM_EXECUTABLE` และ `CODEX_PRIMARY_RUNTIME_NODE_MODULES` ใช้ระบุ Chromium/Playwright ของเครื่องทดสอบ

ผล unit tests แยกจากผลทดสอบเบราว์เซอร์ใน [validation report](validation-scene-thought-v0.75.0.json) การทดสอบมือถือเป็น Chromium จำลอง touch/mobile ไม่ใช่ Safari บน iPhone จริง และคำตอบ AI ในการทดสอบเป็น SSE fixture ท้องถิ่นผ่าน Generate/StreamingProcessor จริง ไม่ได้เรียกผู้ให้บริการโมเดล
