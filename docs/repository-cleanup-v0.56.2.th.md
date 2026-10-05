# รายงาน cleanup สำหรับ RoleForge 0.56.2

ทำวันที่ 5 ตุลาคม 2026 ต่อจาก [รายงานตรวจ Repository](repository-audit-v0.56.2.th.md) โดยลบเฉพาะไฟล์ที่ไม่อยู่ใน runtime ปัจจุบัน หรือมีสำเนาเหมือนกันทุก byte ที่เก็บไว้ครบแล้ว หมายเลขรุ่นยังเป็น 0.56.2

## รายการที่ลบ

| ไฟล์ที่ลบ | ขนาด bytes | เหตุผล / ไฟล์ที่ใช้แทน |
| --- | ---: | --- |
| `docs/previews/commerce-rights-v0530/15-rental-expired.png` | 58,089 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/commerce-rights-v0530/14-ticket-used.png` แทน |
| `docs/previews/commerce-rights-v0530/17-owned-goods.png` | 58,089 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/commerce-rights-v0530/14-ticket-used.png` แทน |
| `docs/previews/commerce-v0550/room-offer-1280.png` | 40,288 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/commerce-v0541/room-offer-1280.png` แทน |
| `docs/previews/commerce-v0550/room-offer-320.png` | 32,898 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/commerce-v0541/room-offer-320.png` แทน |
| `docs/previews/commerce-v0550/room-offer-390.png` | 35,090 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/commerce-v0541/room-offer-390.png` แทน |
| `docs/previews/inventory-v0555/discount-agreed-1280.png` | 14,715 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/inventory-rights-v0554/discount-agreed-1280.png` แทน |
| `docs/previews/items-v0560/commerce-regression/discount-agreed-1280.png` | 14,715 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/inventory-rights-v0554/discount-agreed-1280.png` แทน |
| `docs/previews/items-v0560/commerce-regression/discount-agreed-320.png` | 13,961 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/inventory-rights-v0554/discount-agreed-320.png` แทน |
| `docs/previews/items-v0560/commerce-regression/discount-agreed-390.png` | 14,263 | สำเนาเหมือนกันทุก byte; ใช้ `docs/previews/inventory-rights-v0554/discount-agreed-390.png` แทน |
| `src/marketplace-chat-ui.js` | 18,643 | UI เดิม; ไม่มี import จาก runtime หรือ tests ปัจจุบัน และนำออกจาก syntax check แล้ว |
| `src/mastery-training-ui.js` | 5,422 | UI เดิม; ไม่มี import จาก runtime หรือ tests ปัจจุบัน และนำออกจาก syntax check แล้ว |

รวม **11 ไฟล์ / 306,173 bytes (299.00 KiB)** จากเนื้อหาที่ติดตามใน Git ไฟล์เก่ายังย้อนดูได้จากประวัติ Git; การลบรอบนี้ไม่ได้ลดขนาดประวัติ `.git` เดิม

## สิ่งที่ปรับพร้อมกัน

- แก้ลิงก์ภาพใน gallery สิทธิ์ซื้อขาย 0.53.0 ให้ใช้ภาพต้นฉบับ `14-ticket-used.png` โดยคงหัวข้อและหน้าจอ gallery ไว้ครบ
- นำ UI เก่า 2 ไฟล์ออกจาก `npm run check` โดยไม่ตัด tests หรือลด coverage ของระบบปัจจุบัน
- เก็บรายงาน audit/JSON เดิมเป็น snapshot ก่อนลบ และเปลี่ยนลิงก์ซอร์สที่ลบในรายงานให้เปิดจาก commit เดิมได้
- สำเนาภาพอื่นที่ลบไม่มีลิงก์ใช้งานตรงหรือเส้นทางภาพแบบแทนความกว้างจาก gallery ปัจจุบัน

## ไฟล์ที่ยังเก็บ

`src/auction-ui.js`, `src/marketplace-ui.js` และ `src/mastery-training.js` ยังถูกใช้จาก tests; `style.css`, `npc-ui.css` และ `ui-polish.css` ที่ root รองรับตัวโหลดเก่าที่ถูก cache ไว้ ไม่ลบไฟล์ runtime, templates, tests/fixtures, ต้นฉบับ artwork, คู่มือหรือประวัติ README ส่วนภาพพรีวิวที่เหลือยังมีประโยชน์ในการดูแบบและประวัติการแก้ไข

## การตรวจหลังลบ

- `npm test`: **869 tests ผ่าน** ไม่มีการตัด tests ออก
- `npm run check`: syntax ผ่าน
- Browser startup: ตัวโหลดปัจจุบันและตัวโหลดเก่าเปิด settings, ทุกแท็บ และ NPC Manager ได้ที่ **320 / 390 / 1280 px** รวม 6 กรณีผ่าน
- runtime closure ของไฟล์จริงทั้ง **117 ไฟล์เหมือนก่อนลบ** และไม่มี runtime import หาย
- Markdown links และภาพ gallery ทุกขนาดมีปลายทางครบ รวมเส้นทางที่ JavaScript แทนความกว้าง
- ตรวจ SHA-256 ใหม่แล้วไม่มีไฟล์ภาพซ้ำเหมือนกันทุก byte เหลือจากกลุ่มที่รายงานไว้

การตรวจใช้ host/provider fixtures ที่ควบคุมไว้ ไม่เรียก API แบบเสียเงิน การเปลี่ยนแปลงนี้ไม่แตะข้อมูลผู้เล่นใน chat metadata, inventory, Memory หรือ Voice settings
