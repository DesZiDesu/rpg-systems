# Original · Light / Dark / User Setting · RoleForge 0.64.0

เหลือดีไซน์ **Original** ของ RoleForge แบบเดียวสำหรับ Header / Dialogue / Narrative โดยใช้ป้ายตัวละคร กรอบบทพูด และเส้นบรรยายเดิม ภาพตัวละครยังเป็นสี่เหลี่ยม 1:1 และ UI ฝั่งผู้เล่นยังอยู่ด้านขวา

ตั้งค่าที่ **Extensions → RoleForge → Chat appearance & NPCs → Color mode · this chat** หน้าตั้งค่าใน drawer ยังใช้หน้าตาปกติของ SillyTavern

| ตัวเลือก | การแสดงผล |
| --- | --- |
| Light Mode | กรอบสว่างและตัวอักษรเข้มตลอด |
| Dark Mode | กรอบมืดและตัวอักษรสว่างตลอด |
| User Setting | ค่าเริ่มต้น ตามโหมดสว่าง/มืดของระบบปฏิบัติการ |

บน iOS เมื่อเลือก **User Setting** การเปิด/ปิด Dark Mode ของเครื่องจะเปลี่ยนสีทันที รวมถึงเมื่อระบบสลับอัตโนมัติ ใช้ `prefers-color-scheme` ผ่าน CSS จึงไม่ต้องรีโหลด ไม่เรียก AI และไม่สร้างหรือย้าย DOM ของข้อความเพื่อเปลี่ยนสี โหมดนี้เปลี่ยนเฉพาะบล็อกบทสนทนา RoleForge ส่วนธีม SillyTavern, หน้าหลักของ RoleForge และ UI ของ Regex/MVU ใช้การตั้งค่าของตนเอง

เปิด/ปิดทั้งสามส่วนได้แยกกัน:

- **Header:** ปิดป้ายข้อมูลและภาพตัวละคร แต่คงชื่อผู้พูดเป็นข้อความธรรมดา
- **Dialogue:** ปิดกรอบบทพูด แต่คงคำพูดและลำดับเนื้อเรื่อง
- **Narrative:** ปิดกรอบและลายเส้นบรรยาย แต่คงข้อความบรรยาย

ตัวอย่าง ปิด Header และ Narrative แต่เปิด Dialogue ได้ คำบรรยายยังอ่านได้โดยไม่มีกรอบ ส่วนบทพูดยังมีกรอบตามเดิม Voice และ native widgets ยังคงใช้งานได้ตามการตั้งค่าของแต่ละระบบ

ระบบจำค่าแยกแชท และรวมไว้ใน World preset / RoleForge Character Card Pack การนำเข้าธีมรุ่นเก่าจะเปลี่ยนเป็น Original พร้อมเก็บตัวเลือกเปิด/ปิดกรอบไว้ หากไม่มีโหมดสีจะใช้ User Setting เมื่อบันทึกไม่สำเร็จ UI และ preset จะคืนค่าก่อนหน้า

ข้อมูล preset ใช้รูปแบบนี้:

```json
"chatAppearance": {
  "theme": "roleforge",
  "colorMode": "system",
  "header": true,
  "dialogue": true,
  "narrative": true,
  "effects": true
}
```

`colorMode` รับ `light`, `dark`, `system` ส่วน `effects` คงไว้เพื่อรองรับ preset เดิมและเอฟเฟกต์ hover ของ Original ไม่มีตัวเลือกธีมอื่นหรือระบบ animation ของธีมที่ยกเลิก

ดู [Preview แบบโต้ตอบ](previews/chat-original/index.html), [ไฟล์เดียวเปิดออฟไลน์](previews/chat-original/standalone.html) หรือ [ดาวน์โหลดภาพ PC / มือถือและ Preview](previews/chat-original/roleforge-original-preview.zip)

ภาพ Main Chat ถ่ายจาก renderer และ CSS รุ่นนี้ภายใน **SillyTavern 1.19.0 ที่ติดตั้งแยกใน workspace** ด้วยตัวละครและข้อความจำลอง ไม่ได้เข้าถึงเครื่อง เซิร์ฟเวอร์ หรือประวัติแชทของผู้ใช้ ชุดทดสอบหน้าจอเป็น Chromium จำลองขนาด ไม่ได้ทดสอบ Safari บน iPhone จริง รายละเอียดอยู่ใน [ผลตรวจ](validation-chat-original-v0.64.0.json)

หลังอัปเดตให้โหลด SillyTavern ใหม่เพื่อรับ JavaScript / CSS รุ่น 0.64.0
