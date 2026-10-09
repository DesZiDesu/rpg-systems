# นำเข้าข้อมูล RoleForge พร้อมการ์ดตัวละคร

RoleForge 0.61.0 รองรับ `roleforge_character_pack` v1 และคลัง NPC/Lore ที่ฝังอยู่ในการ์ด การ์ด Madoka One Card ที่แนบมาใช้รูปแบบนี้อยู่แล้ว ไม่ต้อง apply patch ใน zip หรือนำเข้าไฟล์ Power, Forge, NPC, Lore และ State แยก

**อัปเดต 0.62.0:** แพ็ก v1 เพิ่ม Currency, Stat training และ World systems ได้ Configuration ถูกคัดลอกแยกต่อแชทเมื่อเปิดครั้งแรก การแก้ preset ใน drawer ใช้กับแชทปัจจุบัน ต้องกด Save setup in this card เพื่อส่งต่อค่าที่แก้ให้ผู้รับการ์ด ดู [คู่มือ preset แยกแชท](chat-presets-v0.62.0.th.md) เนื้อหาและผลตรวจด้านล่างเป็นรายงานรุ่น 0.61.0

## สำหรับผู้เล่น

1. อัปเดต RoleForge จาก main แล้ว reload SillyTavern
2. ใช้ปุ่ม Import Character ของ SillyTavern นำเข้า `Madoka-Magica-RPG-One-Card.json`
3. เปิดแชทเดี่ยวใหม่กับการ์ดนั้น แล้วเล่นตามปกติ

เมื่อเปิดการ์ด RoleForge อ่านคลัง NPC และ Lore, Power preset, Character Forge preset, งบ/โหมดค้นหา Lore และข้อมูลผู้เล่น/โลกเริ่มต้นจากการ์ดโดยตรง ไม่เรียก AI เพิ่มเพื่อ import และไม่คัดลอกข้อมูลซ้ำลง global settings

การ์ดที่แนบมามี Lore **169 รายการ** (เปิด 100), NPC **12 ตัว**, Power **12 แบบ**, Character Forge และโลกเริ่มต้นที่ไม่มีการทำสัญญาหรือให้สิ่งของอัตโนมัติ Lore ใช้ Relevant mode งบ **6,000 ตัวอักษร** NPC reference ไม่ถือว่าเคยพบหรือสร้างความสัมพันธ์กับผู้เล่น

ค่าที่ผู้ใช้บันทึกเองสำหรับการ์ดมีลำดับสูงกว่าค่าจากแพ็ก รวมถึง preset ที่ตั้งใจปล่อยว่าง ข้อมูล RPG ที่บันทึกในแชทเดิมมีลำดับสูงกว่าค่าเริ่มต้นของการ์ด การเปิดแชทกลุ่มไม่ใช้ defaults ของการ์ดเดี่ยว

## สำหรับผู้สร้างการ์ด

1. ตั้ง Power และ Character Forge preset ใน drawer ตามปกติ
2. จัดการ NPC ในขอบเขต **Character** และ Lore ของการ์ดนั้น
3. เปิด **Extensions → RoleForge → World rules & presets → RoleForge Character Card Pack**
4. กด **บันทึกชุดข้อมูลลงการ์ด** แล้ว Export การ์ดผ่าน SillyTavern
5. ส่งการ์ดที่ Export ให้ผู้เล่น ผู้เล่น import การ์ดครั้งเดียวได้ข้อมูลทั้งชุด

ปุ่มใช้หน้าตา drawer ของ SillyTavern บันทึก preset และคลังสองชุดด้วยคำขอเดียว เก็บข้อมูล extension อื่น เช่น Regex/MVU ไว้ และแจ้งข้อผิดพลาดหากบันทึกไม่สำเร็จ โดยไม่เปลี่ยนข้อมูล export ในหน่วยความจำก่อน server ยืนยัน ต้องกดบันทึกแพ็กอีกครั้งเมื่อต้องการส่งต่อการแก้ preset ล่าสุด

ตัวเลือก **ใช้ข้อมูลผู้เล่นและโลกปัจจุบันเป็นค่าเริ่มต้นของแชทใหม่** ปิดเป็นค่าเริ่มต้น เมื่อปิดจะรักษา initialState เดิมของการ์ด เมื่อเปิดจะเก็บผู้เล่น ค่าสถานะ/ค่าเงิน คลัง/อุปกรณ์ สกิล วิชา เควสต์ ภูมิศาสตร์และฉากเป็น template ไม่รวม NPC ฝั่ง Chat, ประวัติส่วนตัว, จดหมาย, บิลรายการเก่า, งานซื้อขาย/ฝึกที่กำลังทำ หรือ media บนเครื่อง ผู้รับยังคงใช้ข้อมูลแชทเดิมของตนหากมี

## รูปแบบข้อมูล

เก็บภายใต้ `data.extensions` ของ character card:

- `tretaresia_rpg_npcs`: native NPC archive มี stable ID
- `tretaresia_rpg_lore`: native Lore archive มี stable ID และ enabled/always flags
- `roleforge_character_pack`: `{format:"roleforge-character-pack",version:1,powerPreset,forgePreset,loreOptions,initialState}`

`powerPreset` และ `forgePreset` เป็น configuration ที่ผ่าน validator เดิม ไม่ใช่ wrapper ของไฟล์ export แต่ละส่วนที่ผิดรูปแบบจะ fallback แยกกัน `initialState` ต้องเป็น JSON object ไม่เกิน 1 MiB และผ่าน state normalizer ของ RoleForge รองรับทั้ง `data.extensions` ที่โฮสต์ parse แล้วและ fallback จาก `json_data`

การ์ดที่ไม่มีแพ็กยังใช้พฤติกรรมเดิม การนำเข้าไม่เปลี่ยน API key, Proxy, โมเดล, generation settings หรือเปิด Memory/Voice addon การ์ดไม่ได้ติดตั้ง RoleForge ให้เอง และไฟล์เสียง/portrait ที่อยู่เฉพาะเครื่องไม่ได้กลายเป็นไฟล์แนบในการ์ด

## การตรวจสอบ

ทดสอบกับ JSON card ใน bundle จริง ผ่าน host integration และ browser UI ที่ 320/390/1280 พิกเซล ครอบคลุมการโหลดทุกคลัง/พรีเซ็ต, การบันทึกแพ็ก, export JSON แล้ว reimport ด้วย avatar ใหม่, การบันทึกล้มเหลว, ลำดับ override, แชทเดิม, group exclusion, ข้อมูลผิดรูปแบบ และ state ขนาดเกินกำหนด คำขอ card-save ใน browser เป็น mock และไม่ได้เรียก Proxy API

คำสั่ง: `npm test`, `npm run check`, `npm run test:character-pack` ใช้ `ROLEFORGE_CHARACTER_CARD=/path/to/card.json` เพื่อทดสอบการ์ดจริง หากไม่ตั้งค่านี้ browser test ใช้การ์ดตัวอย่างขนาดเล็กใน repository ยังตรวจ Regex/MVU, ไอเทม และซื้อขายร่วมกับการเปลี่ยนแปลงนี้ด้วย

ผลตรวจ release: **1,178 unit tests ผ่าน**, syntax และ diff check ผ่าน, browser การ์ดจริง/Regex/ไอเทม/ซื้อขายผ่านที่ 320/390/1280 พิกเซล และ MVU ผ่านที่ 390/1280 พิกเซล ตรวจสัญญา native card deep-merge และล้าง template fields เก่าด้วย deletion marker ของ SillyTavern โดยไม่แตะ extension อื่น
