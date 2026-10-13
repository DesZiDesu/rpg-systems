# RoleForge settings drawer review

พรีวิวการจัดหน้า RoleForge 0.68.0

เปิด `index.html` ได้ออฟไลน์ทั้งมือถือและ PC ช่องค้นหา เมนู และปุ่มกลับใช้โค้ด navigation ตัวเดียวกับส่วนเสริมที่แก้จริง ภาพและฟอร์มมาจากส่วนเสริมที่รันในโฮสต์ทดสอบ ด้วยข้อมูลตัวอย่าง

พรีวิวออฟไลน์ใช้ตรวจการจัดวางเท่านั้น ไม่บันทึกค่า ไม่เรียก AI และไม่ทำ Import/Export การทำงานเหล่านี้ทดสอบแยกในส่วนเสริมจริงผ่าน browser tests

| หมวดหลัก | ข้อมูลที่จัดไว้ |
| --- | --- |
| การเล่นทั่วไป | ภาษา การส่งคำสั่ง สานต่อแชท และแนวการเขียน |
| หน้าต่างและรูปลักษณ์ | หน้าต่างเหนือ Chatbar, Scene Tracker, Header/Dialogue/Narrative, Regex, สี และรูปแบบ RoleForge |
| โลกและกติกา | Stats/Training, ค่าเงิน, Power, Character Creation, Incantation, ระบบเสริม และ NPC Diary |
| Preset และการ์ดตัวละคร | คลัง Preset และการแพ็ก NPC/Lore/ค่าตั้งค่าลงการ์ด |
| ติดตามและแจ้งเตือน | ติดตามเนื้อเรื่อง แนบสถานะ และเลือกเหตุการณ์แจ้งเตือน |
| ขั้นสูงและตรวจปัญหา | จำนวนคำขอและคู่มือการติดตาม |

รายการที่ต้องแก้ข้อมูลยาวเปิดเป็นหน้าจัดการของตัวเอง มี Back และเก็บร่างในฟอร์มไว้เมื่อเปลี่ยนหน้า รวม 20 หน้า คงตัวควบคุมและการบันทึกเดิมทั้งหมด ไม่มีการเปลี่ยนรูปแบบข้อมูลหรือเพิ่มระบบ Custom Bars ในรอบนี้

การตรวจ: syntax, unit tests 1,235 รายการ, navigation ที่ 320/390/768/1440px และ browser regressions ของ startup, presentation/Regex, Stats/Currency, Presets และภาษา ไม่ใช่การทดสอบบน iOS จริง

ภาพใน `screenshots/` เป็นภาพจากการรันส่วนเสริมที่แก้จริง ภาพ PC แสดง drawer ด้านขวา ภาพมือถือแสดงเต็มความกว้าง

หากต้องการสร้างพรีวิวใหม่ ให้ติดตั้ง Playwright และ esbuild สำหรับงานพัฒนา แล้วรันจากราก repo:

```sh
npm run test:settings
node docs/previews/settings-drawer-review/build-preview.mjs
node docs/previews/settings-drawer-review/check-preview.mjs
```

`snapshot.json` เป็นไฟล์ชั่วคราวที่ชุดทดสอบสร้างเพื่อประกอบ HTML ออฟไลน์ ไม่ต้องใช้ไฟล์นี้เมื่อติดตั้งส่วนเสริม
