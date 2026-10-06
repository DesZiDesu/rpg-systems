# Character Forge 0.58.8

## การใช้งาน

ตั้งค่าใน Extensions → RoleForge → Character Forge Preset: หน้า drawer ใช้ช่อง `text_pole`, ปุ่ม `menu_button` และสีของธีม SillyTavern ไม่ใช้ธีมทองของ Forge เลือก Custom แล้วเพิ่มหนึ่งตัวเลือกต่อหนึ่งช่อง กด Enter หรือ + Add choice เพื่อเพิ่ม และ × เพื่อลบ สำหรับการวางหลายบรรทัดให้เปิด Bulk entry แล้ว Apply list จากนั้น Save preset

แก้ Social Standing, Origin locations, Skill categories, Mastery ranks, Path ranks, Arsenal types และ Alignment ได้ เปลี่ยน Rank heading เป็น Military Rank, School year หรือชื่อที่เหมาะกับโลก และปิด Show rank ได้ การซ่อนอันดับไม่ลบ EXP หรือข้อมูล progression เดิม

Preset เป็นของการ์ดตัวละครและใช้ร่วมกันทุกแชทของการ์ดนั้น ส่วน draft และ profile เป็นของแต่ละแชท การตั้งค่า Preset ไม่เขียนทับ profile ที่บันทึกแล้ว มี Import/Export JSON เหมือนเดิม

Character Creation คงธีม Forge เดิม Origin Skill เริ่มปิด กดเพิ่มเพื่อเปิดชื่อ หมวด คำอธิบาย และ Mastery หรือกดลบเพื่อเริ่มโดยไม่มี Origin Skill ได้ Abilities ยังเพิ่มแยกได้ ฟอร์มแยก Affiliation, Guild และ Party การระบุ Party ไม่สร้าง NPC สมาชิก หัวหน้าหรือประวัติสำเร็จภารกิจขึ้นเอง Alignment เป็นข้อมูลบุคลิกส่วนตัวให้ผู้บรรยายอ้างอิง ไม่เพิ่มคะแนนชื่อเสียง/โบนัสหรือทำให้ NPC รู้ความลับเอง ประเภท Arsenal ใหม่เป็นป้ายหมวด ไม่เปิดกลไกการใช้/สวมใส่ที่ไม่ได้กำหนด

## สาเหตุและการแก้

- เดิม iframe สูง 72dvh บนมือถือและไม่อิงพื้นที่แชทจริง เปลี่ยนเป็นวัดพื้นที่ chat ที่เหลือ รองรับ viewport/ขนาด composer และให้เลื่อนฟอร์มภายใน ไม่แก้ขนาด chat หรือช่องพิมพ์ของ host
- Social Standing รองรับ Preset อยู่แล้ว แต่ editor ใช้ textarea ใหญ่ เปลี่ยนเป็นรายการช่องกรอกที่แก้/ลบแยกได้
- เดิม Affiliation ถูกคัดลอกเข้า Guild เสมอ ตอนนี้แยกกัน โดย draft v1 ที่ไม่มีช่อง Guild จะย้ายค่ารวมเดิมให้ และ draft v2 เคารพช่อง Guild ที่ตั้งใจเว้นว่าง
- เดิม Origin Skill ว่างไม่เพิ่ม skill แต่ยังแสดง Unknown / Undiscovered ตอนนี้ระบุ None พร้อมกฎไม่ให้ AI สร้างสกิลกำเนิดซ่อนเร้นหรืออนุมานสกิลเริ่มต้นเพิ่มเองเมื่อมี profile จาก Forge
- Preset v1 เก่าที่ยังไม่มี Arsenal/Alignment/ชื่อหัวข้อ/การแสดง Rank ได้ค่าเริ่มต้นสำหรับช่องใหม่เท่านั้น ไม่ล้างตัวเลือกเก่า
- ลอง BEGIN ใหม่หลัง provider ล้มเหลวจะปรับ loadout ให้ตรงกับ draft ล่าสุด ลบเฉพาะ skill/item ID ที่ Forge เป็นผู้สร้าง ไม่ลบข้อมูลที่เพิ่มด้วยมือ และไม่ให้ของเดิมค้างหลังเอาออกจากฟอร์ม

## การตรวจสอบ

- npm test: 1,058 ผ่าน รวม migration/import-export/scoping, แยก Party/Guild, ไม่มี Origin Skill, normalization และการลองเปิดเรื่องใหม่
- npm run check: ตรวจ syntax runtime รวมโมดูลวัดพื้นที่ Forge
- test:forge: production loader + iframe + controlled host ที่ 320/390/1280px ทดสอบ composer สูงขึ้น, viewport ลดลง, sibling ใน chat, reload draft, ปุ่ม Origin, บันทึก Party/Alignment, editor แบบ native, Preset Arsenal/ซ่อน Rank และเปิดเรื่องผ่าน main generation ครั้งเดียวโดยไม่มี user message เพิ่ม รวมการแก้ EXP เมื่อซ่อน Rank โดยไม่เปลี่ยนอันดับเดิม
- startup.browser: current และ cached legacy loader, settings และทุกแท็บ
- extension-drawer.browser: native drawer, locale, persisted settings และ geometry รวม drawer กว้าง 300px

การตรวจเบราว์เซอร์ใช้ Chromium กับ host จำลอง API ของ SillyTavern ไม่ใช่การทดสอบ Safari บน iPhone จริง ภาพและผลแสดงว่า layout ตรงใน host ที่ควบคุมได้ แต่ยังไม่ยืนยันทุกธีม/เวอร์ชันของ SillyTavern

อัปเดต asset cache version เป็น 0.58.8 พร้อมกัน ไม่ล้าง browser storage หรือข้อมูลแชท

## ผลตรวจเพิ่มเติมและข้อจำกัดเดิม

- Skill Storage browser ผ่านที่ 320/390/900/901/1280px
- Optional Systems browser ผ่านที่ 320/390/1280px
- Chat null/presentation browser ผ่านที่ 390/1280px ทั้งเปิดและปิด presentation
- `npm run test:chat` ยังไม่ผ่านทั้งชุด: `main-chat-systems.browser.mjs:133` คาดว่าข้อความ prompt มี `NORMAL CHAT COMMERCE` แต่ไม่พบในจังหวะทดสอบนั้น ยืนยันโดยรันไฟล์เดียวกันบนสำเนา main ก่อนแก้ (4226d68 / 0.58.7) แล้วได้ assertion เดียวกัน ไม่ได้แก้ runtime ซื้อขายในอัปเดตนี้ และไม่ถือว่าชุดตรวจนี้ผ่าน
- การตรวจ drawer พบ assertion เดิมคาด Optional Systems 6 รายการทั้งที่ระบบปัจจุบันมี 9 และ selector คำอธิบายตั้งค่าตรง 2 ย่อหน้า ปรับการตรวจให้ตรงกับ UI ปัจจุบัน แล้ว drawer ผ่านทั้ง 4 ขนาด ไม่ได้เปลี่ยนจำนวนระบบหรือข้อความจริงเพื่อให้การตรวจผ่าน
