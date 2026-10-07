# User chat UI · 0.58.15

สวิตช์ **User-only Dialogue / Narrative / Inner thought UI** อยู่ที่ **Extensions → RoleForge → Chat appearance & NPCs** ปิดเป็นค่าเริ่มต้นและแยกจากสวิตช์จัดรูปแบบ NPC เปิดแล้วจะใช้กับข้อความ User ที่ส่งแล้ว รวมข้อความเก่าที่อ่านรูปแบบได้

| รูปแบบที่พิมพ์ | การแสดงผล |
| --- | --- |
| `"คำพูด"` หรือ `“คำพูด”` | การ์ดบทพูดแบบ RoleForge |
| `*คำบรรยาย*` | Narrative พร้อมปากกาและเส้นตกแต่งฝั่งขวา |
| `\|พูดในใจ\|` | พื้นโปร่งพร้อมเส้นบางบน–ล่างและหัวข้อพูดในใจ |
| ข้อความธรรมดา | ข้อความธรรมดาในตำแหน่งเดิมของข้อความ |

UI ของ User ชิดขวา ใช้สีธีม RoleForge ที่เลือกไว้และเปลี่ยนตามธีมทันที รูปปากกาเป็น SVG จึงแสดงได้แม้ฟอนต์ไอคอนของ host ยังไม่โหลด ข้อความต้นฉบับ ชื่อ และลำดับบล็อกยังคงเดิม สวิตช์นี้ไม่เพิ่มคำสั่งให้ AI และไม่แก้ข้อมูลที่ส่งเข้าบทสนทนา ความคิดยังเป็นข้อความในแชทตามปกติ ไม่ได้ซ่อนจากโมเดล

ตัวแปลงตรวจ `is_user === true` และข้ามข้อความระบบ ฝั่ง AI ที่ใช้เครื่องหมายทั้งสามจะใช้การแสดงผลปกติของ SillyTavern รวม Markdown เดิม ส่วน `<tr-header>`, `<tr-dialogue>` และ `<tr-narrative>` ของ NPC ยังทำงานด้วยระบบเดิม ไม่มีการสร้างปุ่ม NPC หรือ Voice ให้การ์ด User

ปิดสวิตช์แล้วคืน DOM ของ host เดิม รวม event listener ของ regex widget ระหว่างแก้ข้อความจะแสดง editor ของ host และเมื่อบันทึกจะใช้ข้อความที่แก้แล้ว ไม่คืนเนื้อหาเก่าทับ การ์ด User จะข้ามข้อความที่มีโค้ด ตาราง ลิงก์ HTML หรือ widget/wrapper จากตัวจัดรูปแบบอื่น เพื่อรักษาการทำงานเดิมของ SillyTavern เครื่องหมายที่ไม่ครบ เครื่องหมาย escape และ bold ไม่ถูกใช้สร้างการ์ดเกินมา จำกัดข้อความ 100,000 ตัวอักษรและ 150 บล็อก; เกินขอบเขตใช้ renderer ปกติ

## Preview

เปิด [preview-user-chat.html](previews/preview-user-chat.html) ผ่าน static HTTP server ของ repository เพื่อดู renderer จริงของ RoleForge บน host ตัวอย่าง เปลี่ยน Forest / Gold / Slate และภาษาไทย / English ได้ ข้อความ AI ด้านล่างใช้เครื่องหมายเดียวกันเพื่อเปรียบเทียบว่าฝั่ง AI ไม่ได้ถูกแปลง

## ตรวจสอบ

- `npm test`: 1,108 tests ผ่าน รวม parser, role guard, Markdown/escape, ขอบเขตข้อมูล, สีที่ปลอดภัย และการรักษา prompt/message
- `npm run check`: ผ่าน รวมโมดูล User chat ใหม่
- `npm run test:user-chat`: ผ่านที่ 320 / 390 / 1280px ตรวจชิดขวา ปากกาด้านขวาที่มองเห็นได้ สีสดตามธีม และไม่มี horizontal overflow
- Browser ตรวจ AI ทั้งขณะเปิด/ปิด NPC presentation, ข้อความระบบ, การแก้ข้อความ, เปิด–ปิดและคืน DOM เดิม, regex widget ที่ยังกดได้, wrapper ภายนอก, เปลี่ยนแชท และบันทึกสวิตช์ข้าม reload
- ปิด renderer แล้วคืนข้อความ native และ callback ที่มาภายหลังไม่ทำให้ UI กลับมา แม้ host ไม่มี `eventSource.off`
- เปิด Voice Addon แล้ว User ยังไม่มีปุ่มพากย์ และ NPC ที่มี presentation tags ยังมีปุ่มตามเดิม; Voice browser suite ตรวจ playback/cache/editor/library และ download/rename/clear MP3 ผ่านที่ 320 / 390 / 1280px
- `presentation-settings.browser.mjs`: ผ่านที่ 320 / 390 / 1280px ตรวจ NPC priority, tags/ข้อความธรรมดา, settings ภาษาไทย/อังกฤษ, persistence, regex และการเปลี่ยนแชท

ใช้ Chromium และ host/API fixtures ไม่ได้เรียก API เสียเงิน และไม่ได้ทดสอบ Safari บน iPhone เครื่องจริง ทุกไฟล์ runtime ใช้ cache version 0.58.15 เพื่อให้โมดูลและ stylesheet ตรงกัน ไม่มีการย้าย schema ของตัวละคร Inventory, Scene หรือ Memory

## ElevenLabs และเพลง

[Eleven Music](https://elevenlabs.io/docs/overview/capabilities/music) สร้างเพลงจากข้อความได้ ทั้งเพลงบรรเลง BGM/ambient/cinematic และเพลงร้อง ระบุแนว อารมณ์ เครื่องดนตรี โครงสร้าง และแก้เป็นช่วงได้ [Music API](https://elevenlabs.io/docs/api-reference/music/compose) เป็น API แยกและต้องมี paid plan ที่รองรับ ส่วน [Sound Effects](https://elevenlabs.io/docs/overview/capabilities/sound-effects) ใช้ทำเสียงฝน ลม ฝีเท้า การต่อสู้ และเสียงวน ambience

Voice Addon ปัจจุบันใช้ API พากย์ ไม่ได้เรียก Music/Sound Effects API โดย RoleForge มี Music panel สำหรับเพิ่มไฟล์เสียงในเครื่องและเปิด playlist/repeat อยู่แล้ว จึงนำเพลงที่สร้างจาก ElevenLabs แล้วดาวน์โหลดมาเพิ่มใน Music ได้ การสร้าง BGM จากในส่วนเสริมโดยตรงต้องเพิ่มการเชื่อมต่อ Music API แยกต่างหาก
