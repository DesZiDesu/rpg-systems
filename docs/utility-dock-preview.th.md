# Preview — Inventory / Mission / H-Stats เหนือ Chatbar

บันทึก Preview ก่อนปล่อย 0.76.0 พัฒนาต่อจาก `acd1591` / RoleForge 0.75.0 ผลรุ่นที่ปล่อยและหน้าตั้งค่าปัจจุบันอยู่ใน [คู่มือ 0.76.0](chatbar-windows-v0.76.0.th.md)

## ปุ่มอาวุธ

Use, Reload, Unleash / Power down และ Inspect ใช้ native Continue เพื่อต่อข้อความ AI เดิม ไม่สร้างข้อความ User ไม่กรอกช่องพิมพ์แทนผู้เล่น และไม่ส่งข้อความร่างหรือคำสั่ง `/...` ที่ค้างอยู่

SillyTavern 1.19.0 ยังอ่านและอาจส่ง textarea เมื่อเรียก Continue ตามปกติ ระบบจึงใช้ `automatic_trigger: true` ร่วมกับ `depth: 1` ซึ่งเป็นเส้นทาง native ที่ข้าม input/commands/attachments โดยไม่แก้ DOM ของช่องพิมพ์ ไม่มี fallback ไปส่งข้อความ User หากยังไม่มีข้อความ AI ให้ต่อจะแจ้งให้รอคำตอบ AI ก่อน

คำยืนยันจากปุ่มบันทึกเป็น receipt ขนาดเล็กใน `message.extra.roleforge_weapon_buttons` แยกจากบทสนทนา ผูกกับอาวุธ การกระทำ และ swipe เดิม ผลยังต้องมีหลักฐานในเนื้อเรื่องที่เพิ่งต่อ การกดไม่ได้หักกระสุนหรือเปิดเอฟเฟกต์ทันที ระบบตรวจ nonce เพื่อกันการหักซ้ำเมื่อข้อความเดิมเปลี่ยน hash หลัง Continue และล้าง prompt ชั่วคราวเมื่อจบ ล้มเหลว หรือเปลี่ยนแชต

คำขอแนบเฉพาะรายการอาวุธ/กระสุนที่เป็นเจ้าของและตัวเลขที่ทราบ พร้อม protocol อาวุธ ไม่ใส่ภาพหรือ URL โมเดล และไม่อาศัยการมี User turn ก่อนหน้าเพื่อเริ่มทำงาน

## แผงใหม่

เปิดปิดแยกกันได้ที่ส่วนเสริม → RoleForge → หน้าต่างเหนือ Chatbar ค่าเริ่มต้นของแผงใหม่ทั้งสามเป็นปิด ใช้ dock เดิมและเปิดแผงที่ต้องการจากแถบได้โดยไม่เปิด RoleForge UI หลัก

- **Inventory:** ค้นหา หมวดหมู่ จำนวน และแบ่งหน้า 4 รายการบนพื้นที่แคบ / 6 รายการบนพื้นที่กว้าง แตะรายการเพื่อเปิดแผงไอเทมเดิมเหนือ chatbar และเลือกการกระทำต่อเอง ไม่ใช้หรือหักจำนวนเมื่อแตะรายการ
- **Mission:** ภารกิจที่เริ่มแล้วหรือรอตอบรับ ดีไซน์ย่อเน้นชื่อ เป้าหมายถัดไป และหลอดความคืบหน้า ย้ายตัวกรองสถานะไว้ในหัวแผง แยกรางวัลกับตัวสลับ “ภารกิจ 1/2” ให้ชัด พับคำอธิบาย/checklist ไว้ให้แตะขยาย จำนวนเป้าหมายหลักใช้ฐานเดียวกับเปอร์เซ็นต์ และระบุเป้าหมายเสริมแยก ไม่เผยคลังภารกิจที่ยังไม่ trigger ไม่ตอบรับ สำเร็จ หรือรับรางวัลให้เอง
- **H-Stats:** เลือกผู้เล่นหรือโปรไฟล์ในรายชื่อ H-Stats เดิม สลับ Overview / Body / History / Bonds / Preferences แสดงค่าที่บันทึกไว้ ช่องที่ว่างเป็น Unknown ไม่สร้าง baseline หรือเรียก AI เมื่อเปิดแผง

การเปลี่ยนแชตล้างคำค้น หน้า และตัวเลือกโปรไฟล์ในแผง โดยอ่าน Inventory/Quest/H-Stats จากแชตใหม่เท่านั้น การสลับแท็บเริ่มอ่านด้านบนของ dock และไม่เลื่อน main chat โดยตรง

## ทดสอบและ Preview

```sh
npm test
npm run check
node tests/utility-dock-preview.real.browser.mjs
UTILITY_DEVICE=desktop UTILITY_ARTIFACTS=/workspace/artifacts/utility-dock-desktop node tests/utility-dock-preview.real.browser.mjs
node tools/capture-utility-preview.mjs
node tools/build-utility-preview.mjs
```

ทดสอบกับ SillyTavern 1.19.0 revision `06bde93` และ Dark Lite ผ่าน native card import, Generate / StreamingProcessor และ local SSE fixtures แยก mobile/touch Chromium ที่ 320/390/430 px จาก Desktop Chromium ที่ 1440 px ยังไม่ได้ทดสอบ iPhone/Safari จริง และไม่ได้เรียกผู้ให้บริการโมเดลภายนอก

ผลทดสอบอยู่ใน `docs/validation-utility-dock-preview.json` ส่วนภาพจริง HTML เลือกดูมือถือ/PC และ GIF อยู่ที่ `/workspace/artifacts/utility-dock-preview/` ภาพรวมเป็นภาพ native UI ไม่ใช่ภาพที่ AI วาดจำลอง SillyTavern

ไฟล์หลัก: `src/weapon-continuation.js`, `src/weapon-core.js`, `src/utility-composer.js`, `src/composer-dock.js`, `styles/utility-composer.css`, `templates/settings.html`, `src/runtime-styles.js` และการเชื่อมใน `index.js`

## รอบปรับแถบแท็บ / Mission

`src/composer-dock.js` แยก `.rf-dock-tabs` ที่เลื่อนแนวนอนออกจาก `.rf-dock-controls` ที่มีตัวเลือกหน้าต่างทั้งหมดและปุ่มย่อ แท็บไม่ถูกบีบให้ชื่อหาย ปุ่มย่อไม่วางทับพื้นที่แท็บ เมื่อเลือกแท็บหรือมีหน้าซื้อขายใหม่ แถบเลื่อนให้เห็นแท็บที่เลือกโดยไม่เรียก scrollIntoView บน main chat

ปุ่มรูปสี่ช่องพร้อมจำนวนเปิดรายการ native select ของอุปกรณ์ได้ทุกหน้าต่าง แม้ dock จะย่ออยู่ ซื้อ/ขาย/ประมูลใช้ panel ID `commerce` เดียวกัน เปลี่ยนป้ายตาม session ไม่เพิ่มสามแท็บพร้อมกัน การปัดแถบและการเปลี่ยนหน้าต่างไม่ใช้ไอเทม ไม่เปลี่ยนเงิน และไม่เรียก AI

ทดสอบแถบแยก 11 หน้าต่างที่ 320/390/430/768/1440 px และใน SillyTavern จริง 9 หน้าต่าง พร้อม session ซื้อ ขาย ประมูล แยก mobile/touch และ Desktop รวมถึงท่าทางสัมผัส CDP สำหรับปัดแถบแล้วแตะแท็บประมูลจริง ไม่พึ่ง auto-scroll ของ Playwright อย่างเดียว

```sh
node tests/composer-dock.browser.mjs
node tests/dock-overflow.real.browser.mjs
node tools/capture-dock-overflow.mjs
node tools/build-dock-overflow-preview.mjs
CHROMIUM_EXECUTABLE=/usr/bin/chromium COMMERCE_ARTIFACT_DIR=/workspace/artifacts/dock-overflow-review/commerce-regression/ node tests/commerce-openings.browser.mjs
node tests/chat-scroll.browser.mjs
```

ผลรอบนี้อยู่ใน `docs/validation-dock-overflow-preview.json` และ `/workspace/artifacts/dock-overflow-review/` แกลเลอรี HTML แยกมือถือ/PC พร้อมหน้าซื้อ/ขาย/ประมูลและ Mission แบบขยาย GIF เป็นการปัดและสลับหน้าต่างจริงในเบราว์เซอร์ทดสอบ

ปรับ fixture `tests/commerce-openings.browser.mjs` ให้เปิด dock / เลือกแท็บก่อนกดใช้ และตรวจว่าทุกแท็บที่เกี่ยวข้องยังอยู่ แทนการคาดว่ามีสามแท็บตายตัว ไม่มีการลด assertion เรื่องเงิน จำนวนของ การเรียนพลัง หรือจำนวน API calls
