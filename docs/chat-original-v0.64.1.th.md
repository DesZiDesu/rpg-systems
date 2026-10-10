# Original · เปิด/ปิดแยกส่วน · RoleForge 0.64.1

ใช้ดีไซน์ **Original** ของ RoleForge แบบเดียว เปิด/ปิด **Header**, **Dialogue** และ **Narrative** ได้อิสระ ไม่มีตัวเลือก Light Mode / Dark Mode / User Setting

ตั้งค่าที่ **Extensions → RoleForge → Chat appearance & NPCs** หน้าตั้งค่าใช้ checkbox ปกติของ SillyTavern และมีตัวอย่างที่กดเปิดดูได้

| สวิตช์ | เมื่อเปิด | เมื่อปิด |
| --- | --- | --- |
| Header | ป้ายตัวละคร ข้อมูล และภาพ 1:1 | เหลือชื่อผู้พูดธรรมดา |
| Dialogue | กรอบบทพูด Original | คำพูดเป็นข้อความธรรมดา |
| Narrative | ไอคอนปากกาและเส้นบรรยาย Original | คำบรรยายเป็นข้อความธรรมดา |

เปิดเฉพาะ Header, เปิด Header + Dialogue, เปิด Dialogue + Narrative หรือจัดชุดอื่นได้ครบทั้ง 8 แบบ ข้อความและลำดับเนื้อเรื่องยังอยู่เมื่อปิดกรอบ เปิดทั้งสามส่วนเป็นค่าเริ่มต้น และสวิตช์ใช้ร่วมกับ UI ฝั่งผู้เล่นที่อยู่ด้านขวา

**Header และ Narrative ไม่มีพื้นหลัง** รวมถึงตัวครอบข้อความ พื้นหลังกรอบบทพูดยังเป็นแบบ Original สีข้อความบนพื้นที่โปร่งใสอิงธีม SillyTavern และชื่อยังใช้สีประจำตัวละคร

ระบบจำสวิตช์แยกแต่ละแชท และรวมไว้ใน World preset / RoleForge Character Card Pack การนำเข้า preset ธีมรุ่นเก่าจะใช้ Original พร้อมเก็บสวิตช์เดิม ส่วนค่าโหมดสีที่เคยบันทึกไว้ใน preset จะไม่ถูกใช้หรือส่งออกจาก preset เมื่อบันทึกไม่สำเร็จ checkbox และ preset จะคืนค่าก่อนหน้า

ตัวอย่างข้อมูล preset:

```json
"chatAppearance": {
  "theme": "roleforge",
  "header": true,
  "dialogue": false,
  "narrative": false,
  "effects": true
}
```

`effects` เก็บไว้รองรับ preset เดิมและเอฟเฟกต์ Original ไม่มีตัวเลือก animation หรือธีมใหม่ สวิตช์ไม่เรียก AI และ UI ของ Regex/MVU ยังใช้หน้าตาของตัวเอง

ดู [Preview แบบโต้ตอบ](previews/chat-original/index.html), [ไฟล์เดียวเปิดออฟไลน์](previews/chat-original/standalone.html) หรือ [ดาวน์โหลดภาพ PC / มือถือและ Preview](previews/chat-original/roleforge-original-preview.zip)

ภาพถ่ายจาก renderer และ CSS รุ่นนี้ภายใน **SillyTavern 1.19.0 ที่ติดตั้งแยกใน workspace** ด้วยตัวละครและข้อความจำลอง ไม่ได้เข้าถึงเครื่อง เซิร์ฟเวอร์ หรือประวัติแชทของผู้ใช้ ชุดทดสอบใช้ Chromium จำลองขนาดหน้าจอ ไม่ได้ทดสอบ Safari บน iPhone จริง รายละเอียดอยู่ใน [ผลตรวจ](validation-chat-original-v0.64.1.json)

หลังอัปเดตให้โหลด SillyTavern ใหม่เพื่อรับ JavaScript / CSS รุ่น 0.64.1
