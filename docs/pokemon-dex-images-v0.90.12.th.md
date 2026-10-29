# Pokémon 1.6.2 / RoleForge 0.90.12 — เลือกภาพ Pokédex

ไปที่ **Pokémon → ตั้งค่า → หน้าต่างและธีม → ภาพใน Pokédex** แล้วเลือก **อาร์ตเวิร์ก** หรือ **Sprite** กดแล้วบันทึกทันที รองรับทั้ง Original และ Aperture

ตัวเลือกมีผลกับรายการ Pokédex หน้ารายละเอียดสายพันธุ์ และภาพฟอร์มอ้างอิง ภาพ Sprite เป็นภาพนิ่งหันหน้า คงสัดส่วนภาพและใช้การขยายแบบ pixelated ภาพพอร์ตเทรตของตัวที่อยู่ในทีมและการเลือกภาพในสนามต่อสู้ยังทำงานแยกกัน

ค่าผูกกับตัวละคร จึงอยู่ต่อหลัง AI ตอบ สร้างแชทใหม่ สลับการ์ดกลับมา หรือรีโหลด ค่าเริ่มต้นของการ์ดที่ยังไม่เคยเลือกคือ Artwork การเปลี่ยนภาพไม่แก้ทีม ค่าสเตตัส ไอเทม หรือความคืบหน้าการเล่น

## แหล่งภาพและภาพสำรอง

ดัชนี Sprite ที่มีอยู่รองรับภาพนิ่งด้านหน้าครบ 1,579 รายการฟอร์มของ 1,025 สายพันธุ์ จึงไม่ต้องเพิ่มภาพจากเว็บไซต์ใหม่ในอัปเดตนี้ ใช้ฟอร์มที่ตรงกับรายการ เช่น Flabébé สีเหลืองและ Koraidon Gliding Build ตามชุดข้อมูลเดิม บางรายการเป็นภาพเรนเดอร์จากเกม รวมถึงภาพ PNG สำรองในส่วนเสริมสำหรับเก้าฟอร์มหายาก จึงไม่ใช่ pixel art ทุกตัว ดู [แหล่งภาพและการครอบคลุม](pokemon-facing-v0.90.10.md)

หากโหลด Sprite ไม่สำเร็จ ระบบลองภาพนิ่งสำรองที่ตรงฟอร์ม จากนั้นใช้ Artwork ของรายการนั้น หากทั้งสองอย่างไม่พร้อม จะแสดงเครื่องหมายภาพไม่พร้อมใช้งานแทนภาพเสีย ทั้งนี้การมี URL ในดัชนีไม่รับประกันว่าเว็บไซต์ภายนอกจะพร้อมใช้งานตลอดเวลา

## การตรวจสอบ

- ผ่าน 371 unit/host tests และ syntax checks
- ทดสอบใน SillyTavern 1.19.0 ทั้ง PC และมือถือจำลอง สองธีม พร้อมตรวจ Settings ที่ความกว้าง 320/390/1280/1920px
- ตรวจสลับ Artwork/Sprite ในรายการ รายละเอียด และภาพฟอร์ม รวมถึง Sprite ของฟอร์มที่มีไฟล์ภายในส่วนเสริม
- ตรวจการจำค่าหลังข้อความใหม่ แชทใหม่ สลับตัวละคร และรีโหลด พร้อมยืนยันว่าข้อมูลเกมไม่เปลี่ยน
- จำลอง Sprite โหลดล้มเหลวเพื่อตรวจภาพ Artwork สำรอง
- ติดตั้ง Pokémon 1.6.2 ผ่าน Workshop และเลือกคู่หูจากการ์ดไทย/อังกฤษผ่านทั้ง PC/มือถือ

ใช้การ์ด QA และข้อความควบคุม ไม่มีการเรียกโมเดลภายนอกหรือแก้แชทของผู้ใช้ ภาพมือถือเป็น browser emulation ยังไม่ได้ทดสอบบน iPhone จริง และไม่ได้ดาวน์โหลดตรวจทุก URL ใหม่ทั้งหมดในรอบนี้

## ภาพจาก SillyTavern

| | Original | Aperture |
| --- | --- | --- |
| PC · ตั้งค่า | [ภาพ](previews/pokemon-dex-images/desktop-original-settings.webp) | [ภาพ](previews/pokemon-dex-images/desktop-classic-dark-settings.webp) |
| PC · Sprite | [ภาพ](previews/pokemon-dex-images/desktop-original-sprites.webp) | [ภาพ](previews/pokemon-dex-images/desktop-classic-dark-sprites.webp) |
| มือถือ · ตั้งค่า | [ภาพ](previews/pokemon-dex-images/mobile-original-settings.webp) | [ภาพ](previews/pokemon-dex-images/mobile-classic-dark-settings.webp) |
| มือถือ · Sprite | [ภาพ](previews/pokemon-dex-images/mobile-original-sprites.webp) | [ภาพ](previews/pokemon-dex-images/mobile-classic-dark-sprites.webp) |

[รายละเอียดและฟอร์ม](previews/pokemon-dex-images/mobile-classic-dark-detail.webp) · [ฟอร์ม Flabébé สีเหลือง](previews/pokemon-dex-images/mobile-original-exact-form.webp) · [ภาพสำรองเมื่อโหลดล้มเหลว](previews/pokemon-dex-images/mobile-image-failure-fallback.webp) · [ผลตรวจ](previews/pokemon-dex-images/validation.json)

## อัปเดต

อัปเดต RoleForge จาก main เป็น **0.90.12** แล้ว reload SillyTavern จากนั้น Workshop → Pokémon → Update **1.6.2** ไม่ต้องลบแชทหรือรีเซ็ตเกม
