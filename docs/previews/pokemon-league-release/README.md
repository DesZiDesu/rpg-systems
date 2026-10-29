# Pokémon League Circuit — released renderer

ภาพจาก SillyTavern 1.19.0 จริง ใช้โค้ดส่วนเสริมที่จะปล่อย 0.90.16 / Pokémon 1.7.1 ไม่มีตัวตกแต่งพรีวิวแทรก ธีมโฮสต์ Dark Lite ตามไฟล์ที่ผู้ใช้ให้ ข้อความเป็นข้อมูลทดสอบ ไม่เรียกโมเดล

- [คอม / Artwork](desktop-artwork.png) · [รายละเอียด](desktop-artwork-detail.png)
- [มือถือจำลอง / Artwork](mobile-artwork.png) · [รายละเอียด](mobile-artwork-detail.png)
- [มือถือจำลอง / Sprite](mobile-sprite.png) · [รายละเอียด](mobile-sprite-detail.png)
- [มือถือจำลอง / nickname หลังตั้งชื่อจริง](mobile-nickname.png) · [รายละเอียด](mobile-nickname-detail.png)

ตรวจ 5 ธีม × 8 สถานะกรอบ × 2 หน้าจอ รวมถึงเปิดรายละเอียดรายตัว ตั้งชื่อ/รีโหลด/ลบย้อนข้อมูล, native Shared HTML และ listener, เจ้าของตัวป่า และปิด–เปิด addon โดยไม่เสียข้อมูล ผลใน [validation.json](validation.json)

มือถือใช้ Chromium touch emulation 390 × 900 และตรวจความกว้าง 320 px เพิ่ม ไม่ใช่ Safari บน iPhone จริง รูป Screenshot เป็นภาพนิ่งแม้ Sprite animation เปิดอยู่
