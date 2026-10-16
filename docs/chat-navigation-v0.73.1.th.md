# RoleForge 0.73.1 — NPC Manager และการเลื่อนแชท

ฐานก่อนแก้: `025b9e401e6e40b0d1cefa90450ddba7fa64fb0e` (0.73.0)

## จำหน้าจัดการ NPC

- จำหมวด **Character / Chat** และแท็บ **NPC / Lore** ที่ผู้ใช้เลือกไว้ ผ่านการตั้งค่าของโปรไฟล์ SillyTavern จึงอยู่ต่อหลังรีโหลดเบราว์เซอร์
- ปิดแล้วเปิดในแชทเดิมยังรักษาหน้ารายการ คำค้น และตัวกรองที่เปิดไว้ระหว่าง session นั้น
- ยกเลิกการเลือกหลายรายการเมื่อปิด เพื่อไม่เหลือชุดรายการพร้อมลบโดยไม่ตั้งใจ
- การเลือกดูคลัง Character ไม่เปลี่ยน **หมวดสำหรับเก็บ NPC ที่สร้างใหม่จากเนื้อเรื่อง**
- แชทกลุ่มที่ไม่มีคลัง Character ใช้ Chat แทน โดยรักษาตัวเลือก Character ไว้สำหรับกลับไปแชทตัวละคร
- การเปิด NPC จาก Header ยังคงเปิดข้อมูลของ NPC ที่กด ไม่เขียนทับหมวด/แท็บที่เลือกไว้สำหรับปุ่ม Manager

## แก้ auto-scroll ระหว่างเจน

ทำซ้ำปัญหาได้ด้วย `Generate` และ `StreamingProcessor` ของ SillyTavern จริง: native renderer วาดข้อความแล้ว RoleForge จึงเปลี่ยนเป็น Header/Dialogue/Narrative ภายหลัง ความสูงสองรูปแบบต่างกัน ทำให้ scroll handler ของโฮสต์เข้าใจว่าออกจากท้ายแชทแล้วและเปิด scroll lock

ในการทดสอบก่อนแก้ เปิด auto-scroll แต่ข้อความท้ายสุดห่างจาก viewport ถึง **14,898px** หลังเจน

แนวแก้:

- ขณะ streaming ประกอบ UI หลัง native DOM เปลี่ยนก่อน paint ถัดไป ลดการสลับความสูงระหว่างข้อความดิบกับ UI
- รักษาตำแหน่งท้ายแชทตามตัวเลือก auto-scroll ของ SillyTavern รวมถึงตอนภาพหรือ layout มีความสูงเปลี่ยน
- แยกการเลื่อนจาก layout ออกจาก wheel/touch/keyboard/scrollbar ที่ผู้ใช้ตั้งใจเลื่อนขึ้น
- ป้องกัน scroll event เก่าที่ค้างอยู่ดึงผู้ใช้กลับลงมาหลังเริ่มเลื่อนอ่านประวัติ
- เมื่อผู้ใช้กลับลงท้ายแชท ให้ตามข้อความต่อ ปิด auto-scroll แล้วไม่บังคับตาม
- รักษา anchor ของข้อความที่กำลังอ่าน เมื่อเปลี่ยน UI ของข้อความอื่นด้านบน
- ชดเชยตำแหน่งทันทีแม้ธีมตั้ง smooth scrolling และรักษานโยบาย Waifu/visual-novel ของโฮสต์
- การเปลี่ยนหมวด/แท็บของ Manager ไม่ทำให้รีเฟรชการแสดงผลประวัติทั้งแชท

## ไฟล์สำคัญ

- `src/npc-workspace.js`: การจำหมวด/แท็บและคืนหน้ารายการ
- `src/chat-scroll.js`: การตามท้ายข้อความ การพักอ่าน และการเก็บ anchor ตามขอบเขตแชท
- `src/npc-chat.js`: เชื่อม lifecycle กับ native events และจัด UI streaming ก่อน paint
- `tests/npc-scroll.real.browser.mjs`: เรียก native Generate กับ SSE ที่ส่งเป็นช่วงจากเซิร์ฟเวอร์ทดสอบ localhost
- `tests/chat-scroll.browser.mjs`: ตรวจ viewport, pending scroll events, การเปลี่ยนแชทและ cleanup
- `tests/chat-render-performance.browser.mjs`: ตรวจงานเฉพาะข้อความท้ายและไม่ render ประวัติซ้ำเพราะตั้งค่า Manager

ส่วนไฟล์ที่เปลี่ยน `v=0.73.1` ใช้ล้าง cache ให้โมดูลและ CSS โหลดเป็นรุ่นเดียวกัน

## การทดสอบ

[รายงานการทดสอบ](validation/chat-navigation-v0.73.1.json) แยก unit, browser fixtures และการรันใน SillyTavern จริง

รันซ้ำในโปรไฟล์ทดสอบแยก:

```sh
npm test
npm run check
npm run test:scroll
ST_REAL_URL=http://127.0.0.1:18180 npm run test:scroll:real
```

ทดสอบจริงด้วย SillyTavern 1.19.0 / 06bde93 บน Chromium ที่ 390×844 และ 1440×960 ใช้ข้อความจาก local SSE fixture ผ่าน pipeline เจนจริง ไม่มีการเรียกผู้ให้บริการโมเดลหรือใช้ API key

ตรวจเจนปกติ, Continue, เลื่อนอ่านแล้วกลับลงมา, ปิด auto-scroll, ธีม smooth scrolling พร้อม stream fade, การจำหมวด/แท็บหลัง reload และการรักษาหน้า/ล้างการเลือกหลายรายการ

ไม่ได้ทดสอบ iPhone เครื่องจริง และ WebKit runner ในเครื่องนี้เปิดไม่สำเร็จเพราะขาด system libraries จึงไม่อ้างว่าผ่าน Safari
