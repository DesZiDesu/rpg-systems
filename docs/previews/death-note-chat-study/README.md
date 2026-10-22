# Death Note — chat theme study

พรีวิวเพื่อเลือกดีไซน์ ยังไม่ติดตั้งเป็นธีมของ RoleForge และยังไม่รวมเข้า `main`

เปิด `Death-Note-Chat-Themes-Preview.html` ในเบราว์เซอร์ได้โดยตรง ไฟล์เดียวมีฟอนต์ ตรา ภาพจาก SillyTavern และตัวอย่างครบ โดยไม่ต้องเชื่อม API หรืออินเทอร์เน็ต

| แบบ | รูปแบบ |
| --- | --- |
| A · สมุดปกดำ / The Black Notebook | กรอบบทพูด NPC สีงาช้าง หมึกดำ; ผู้เล่นใช้หมึกบนพื้นเข้ม; ยมทูตใช้ตรากะโหลกกับหมึกแดงหม่น |
| B · แฟ้มคดียามค่ำ / Midnight Casefile | ดำเทา บรรทัดกระชับ แถบแฟ้ม; ผู้เล่นใช้เทาสีน้ำเงิน; ยมทูตใช้แดงเข้ม |

ทั้งสองแบบมี Header / Dialogue / Narrative / Thoughts สำหรับ NPC, User และ Shinigami รองรับไทย–อังกฤษ พับความคิดและปรับขนาดข้อความได้ ไม่เพิ่มป้าย “ผู้เล่น + ชื่อ” ซ้ำในข้อความ User ของ SillyTavern

## ขอบเขตการทำงานที่เสนอ

- เปิด Death Note Addon แล้วจึงเลือกธีมนี้ได้; ปิด Addon หรือเปลี่ยนแชทแล้วกลับไปใช้หน้าตาเดิม
- ใช้ข้อมูลประเภทตัวละครเพื่อแยกยมทูต ไม่ตัดสินจากชื่อ เช่น NPC มนุษย์ชื่อ Ryuk จะยังเป็นมนุษย์
- ยึดชื่อและรูปที่ผู้เล่นรับรู้จากระบบ Known Name / Death Note เดิม ไม่เผยชื่อจริง ชื่อปลอม ใบหน้า หรือเผ่าที่ผู้เล่นยังไม่รู้
- คนที่ยังมองไม่เห็นยมทูตจะไม่ได้รับข้อมูลเพิ่มจากหน้าตาธีม
- Thoughts คือข้อความความคิดของตัวละครที่ถูกเขียนเป็นส่วนหนึ่งของโรลเท่านั้น ไม่มีการดึง reasoning ลับของโมเดล ไม่ทำให้ทราบสิ่งที่ตัวละครยังไม่รู้
- เป็นการเปลี่ยนหน้าตา ไม่เปลี่ยนกฎสมุด สิทธิ์ถือครอง ค่าสถานะ หรือการต่อข้อความ AI

## ทดสอบอะไรแล้ว

ใช้ SillyTavern 1.19.0 / RoleForge 0.82.1 ในโปรไฟล์ทดสอบแยก มีการ์ดและข้อความตัวอย่างที่ระบุชัดว่าเป็น fixture ไม่เรียกผู้ให้บริการ AI

- คอม 1440 × 1000 และมือถือ 390 × 1000 แบบ Chromium touch emulation; **ยังไม่ได้ทดสอบบนเครื่อง iPhone/Safari จริง**
- Gallery ที่ 320, 390, 768 และ 1440 px; ข้อความยาว ขยายตัวอักษร ไทย/อังกฤษ พับความคิด และ reduced motion
- เปิด–ปิด Addon ผ่าน Workshop จริง แล้วตรวจว่าธีมทดลองหาย/กลับมา และข้อความเดิมยังอยู่
- ตรวจข้อความโรล ค่าสถานะ และข้อความร่างก่อน/หลังการดูพรีวิว ไม่เปลี่ยนค่า
- ล้างชั้นพรีวิวเมื่อเลิกใช้ และประกอบกลับได้เมื่อ host วาดข้อความใหม่

ผลตรวจอยู่ใน `validation/` และภาพจริงอยู่ใน `screenshots/`

## วิธีประกอบพรีวิว

`theme.js` และ `theme.css` เป็นชิ้นงานออกแบบที่แยกจาก runtime ส่วนเสริม ไม่มีไฟล์ production import เข้ามา `mountNativeStudy()` ใช้เฉพาะข้อความในโปรไฟล์ทดสอบที่มี marker `extra.roleforge_theme_study` ไม่ใช่การเปิดธีมให้แชทจริง

```sh
node docs/previews/death-note-chat-study/verify-gallery.mjs
node docs/previews/death-note-chat-study/verify-native.mjs
node docs/previews/death-note-chat-study/build-preview.mjs
node docs/previews/death-note-chat-study/verify-offline.mjs
```

ต้องมีโฮสต์ทดสอบที่ localhost:18182 และ Playwright/Chromium เช่นเดียวกับ browser checks อื่นใน repository; ตั้ง `DN_ST_HOST`, `DN_STUDY_URL`, `DN_STUDY_OUTPUT` เพื่อเปลี่ยนปลายทางได้ ห้ามชี้ native test ไปยังโปรไฟล์ใช้งานจริงเพราะจะสร้างการ์ด fixture

ใช้ฟอนต์เดิมใน repository และตรา `assets/workshop/death-note/rules-seal.png` ไม่มีบริการภาพหรือฟอนต์ภายนอก

---

English: this is an isolated design review, not an installed extension update. The offline HTML contains both designs and all assets. Native screenshots use explicitly marked story fixtures inside a separate real SillyTavern profile. Mobile verification uses Chromium touch emulation, not a physical iOS device. No model requests, hidden model reasoning, or live chat changes are involved.
