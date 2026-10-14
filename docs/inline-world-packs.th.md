# การ์ดไฟล์เดียวที่ฝัง World Pack · RoleForge 0.70.0

## สำหรับผู้เล่น

Import การ์ดเข้า SillyTavern ตามปกติ แล้วเปิดแชต RoleForge จะตรวจ reference ที่ปัก revision/hash ไว้ หากคลังพร้อมแล้วจะใช้ IndexedDB เดิมทันที หากยังไม่มีจะเตรียมคลังจาก payload ในการ์ดผ่าน Worker พร้อมแถบความคืบหน้าและปุ่ม Cancel ไม่ต้อง Import ZIP หรือเลือกเชื่อมคลังเอง

prompt ที่ใช้คลังรอให้ติดตั้งเสร็จก่อน ไม่มีการเรียกโมเดลหรือบริการภายนอกเพื่อเตรียมคลัง การอ่านประวัติไม่ได้เปิดใช้ NPC, เปลี่ยน `met`, เพิ่มผู้ร่วมฉาก หรือสลับเวอร์ชันที่เลือกเอง

ครั้งแรกอาจใช้เวลาหลายวินาทีตามขนาดแพ็กและอุปกรณ์ การโหลดหน้าใหม่/ส่งข้อความต่อจะไม่ถอด Base64 หรือคลาย gzip ซ้ำถ้า revision/hash นั้นยังพร้อมใช้งาน IndexedDB อยู่ในเบราว์เซอร์และ address นั้น แต่ **payload ยังคงอยู่ในการ์ด** จึงติดตั้งใหม่ได้เมื่อย้ายเครื่อง

## สำหรับผู้สร้างและผู้แก้การ์ด

เปิด **RoleForge → Presets & character cards → Character card → World Pack**

- **Update embedded archive** รวมคลังและการแก้ NPC/Lore ของการ์ดนี้ สร้าง manifest/hash/revision ใหม่ บีบอัดใน Worker และตรวจ/บันทึกคลังใหม่ให้ครบก่อนบันทึก reference กับ payload ลงการ์ดในคำขอเดียว หลังจากนั้นส่งออกการ์ดจาก SillyTavern ได้ตามปกติ
- **Export self-contained card** ทำขั้นตอนเดียวกัน แล้วเตรียมลิงก์ **Download self-contained card** เป็นไฟล์ Character Card JSON ใบเดียว กดลิงก์ดาวน์โหลดที่ปรากฏหลังเตรียมไฟล์ โดยเฉพาะ Safari ที่ต้องมีการกดจากผู้ใช้
- การแก้ NPC/Lore ระหว่างเล่นยังบันทึกได้ตามเดิม แต่ต้องกดคำสั่งข้างต้นเพื่อรวมการแก้ล่าสุดกลับไปใน payload ก่อนแจกหรือย้ายเครื่อง ไม่บีบอัดการ์ดใหม่ทุกข้อความ
- คลังรุ่นเก่าจะไม่ถูกลบอัตโนมัติ การ์ด reference-only และ Import/Export World Pack ZIP/folder เดิมยังใช้ได้
- การ์ดเดิมที่ฝังอาร์เรย์ NPC/Lore ปกติยังใช้ได้ หากต้องการแปลงเป็น World Pack ให้ใช้ **Move embedded archive to World Pack** ก่อน แล้วจึง Update/Export self-contained card การย้ายจะตรวจและเก็บข้อมูลก่อนลบอาร์เรย์เดิมตามคำสั่งผู้ใช้

**Save setup in this card** ยังแยกจากการอัปเดตคลัง คำสั่ง Update/Export เก็บ preset และ `first_mes` เดิมของการ์ด ไม่คัดลอกความคืบหน้าแชตแทนค่าเริ่มต้น หากต้องพาเซฟแชตไปด้วย ให้ส่งออกแชตแยกตามปกติ การ์ด PNG ที่ส่งออกผ่าน SillyTavern คง fields เหล่านี้ได้เช่นเดียวกับ JSON; คำสั่งใหม่ดาวน์โหลดเป็น JSON โดยตรง

## สัญญาข้อมูลสำหรับเครื่องมือสร้างการ์ด

ใช้ `data.extensions.roleforge_world_archive` version 1 เดิม ปัก `archiveId`, `revision`, `manifestPath`, `manifestSha256`, `required` และ counts เพิ่ม `data.extensions.roleforge_world_archive_payload`:

```json
{
  "format": "roleforge-inline-world-pack",
  "version": 1,
  "encoding": "gzip-base64",
  "compressedBytes": 123,
  "uncompressedBytes": 456,
  "compressedSha256": "SHA-256 ของไบต์ gzip 64 หลักฐานสิบหก",
  "data": "Base64 มาตรฐานของไบต์ gzip"
}
```

JSON ที่ได้หลังคลาย gzip:

```json
{
  "format": "roleforge-inline-world-pack-files",
  "version": 1,
  "files": [
    {"path": "manifest.json", "text": "ข้อความ UTF-8 ต้นฉบับของ manifest"},
    {"path": "indexes/npcs.json", "text": "ข้อความ UTF-8 ต้นฉบับของ index"}
  ]
}
```

ตัวอย่างข้างต้นแสดงโครงสร้าง ไม่ใช่แพ็กที่นำเข้าได้จริง ต้องใส่ทุกไฟล์ที่ manifest อ้างถึง รวมทั้ง NPC/versions, Lore, supplements และ presets `manifestSha256` คำนวณจากไบต์ UTF-8 ของ `manifest.json` และ hash ใน `manifest.files` คำนวณจากไบต์ UTF-8 ต้นฉบับของไฟล์นั้น **อย่า parse/stringify ไฟล์ย่อยก่อนฝัง** เก็บช่องว่าง บรรทัด CRLF/LF และ BOM ตามต้นฉบับ การ encode ข้อความไฟล์ย่อยกลับเป็น UTF-8 ต้องได้ไบต์เดิมจึงผ่าน validation

ถอด Base64 ตรวจ compressed hash คลาย gzip ตรวจ manifest/paths/hashes/ขนาด/จำนวนรายการ/ลิงก์เวอร์ชัน และ staged writes ทำใน Worker ใช้กระบวนการ import ของ ZIP เดิม ประกาศ ready หลัง commit สำเร็จเท่านั้น

ขีดจำกัด: gzip ไม่เกิน 64 MiB, JSON envelope หลังคลายไม่เกิน 256 MiB, ไฟล์ย่อยไม่เกิน 4 MiB, payload ไม่เกิน 50,000 ไฟล์บวก manifest และไม่เกิน 20 เวอร์ชันต่อ NPC ตรวจขนาดที่ประกาศก่อนจัดสรร และตรวจจำนวนไบต์ต่อ chunk ระหว่างคลาย หากไม่มี `DecompressionStream` ใช้ streaming fallback ที่แบ่ง compressed input เป็นช่วงเล็กและตรวจ CRC/ขนาด gzip รองรับ single-member gzip ที่ตัวส่งออกสร้าง; gzip หลาย member ต้องใช้ `DecompressionStream`

## ข้อผิดพลาดและการสำรอง

- `WORLD_PACK_MISSING`: ไม่พบ revision/hash ที่ต้องใช้ และไม่มี payload ให้ติดตั้ง อาจเป็นการ์ด Core รุ่นเดิมที่ต้องใช้ ZIP
- `WORLD_PACK_INLINE_*`: encoding/Base64, gzip, hash หรือขนาด payload ผิด ไม่เผยแพร่คลังบางส่วน
- `WORLD_PACK_STORAGE_INVALID`: มีคลังอยู่แต่ข้อมูล/ดัชนีไม่ครบ ไม่ตีความเป็น “ไม่มีคลัง” และไม่ติดตั้งใหม่ทับโดยอัตโนมัติ
- `QuotaExceededError`: เบราว์เซอร์เขียนข้อมูลไม่ได้ เก็บคลังและการ์ดเก่าไว้ ควรสำรองก่อนจัดพื้นที่หรือเปลี่ยนเบราว์เซอร์
- เปลี่ยน owner/chat/reference ระหว่างรอ: ไม่ใช้ผลกับแชตปัจจุบัน คลังที่ตรวจและบันทึกเสร็จอาจอยู่ในเครื่องต่อ แต่ไม่ผูกข้อมูลข้ามการ์ด
- เซิร์ฟเวอร์ปฏิเสธการบันทึกการ์ด: reference/payload เดิมยังอยู่ และ UI ยังใช้คลังเดิมได้ ไม่เปลี่ยน catalog ที่ใช้อยู่ก่อนเซิร์ฟเวอร์ยอมรับ

ภาพ/เสียงที่อ้าง URL หรือพาธของ SillyTavern ไม่ถูกฝังเพิ่ม ต้องสำรอง asset ตามระบบเดิม ตัว JSON ของการ์ดยังต้องผ่านการอ่านของ SillyTavern ก่อน Worker ทำงาน และขึ้นกับข้อจำกัดการนำเข้าของเซิร์ฟเวอร์นั้น
