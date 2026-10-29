# Pokémon 1.6.3 / RoleForge 0.90.13 — Art Style ร่วมและเสียงปุ่มใหม่

ไปที่ **Pokémon → ตั้งค่า → หน้าต่างและธีม → รูปแบบภาพโปเกมอน** (English: Settings → Appearance → Pokémon art style) เลือก Artwork หรือ Sprite แล้วบันทึกและเปลี่ยนภาพทันที

## สาเหตุและการแก้

| จุดที่พบ | สาเหตุ | ผลหลังแก้ |
| --- | --- | --- |
| เลือก Sprite แล้วหน้าทีมยังเป็น Artwork | รุ่น 1.6.2 ใช้ตัวเลือกเฉพาะภาพอ้างอิงใน Pokédex โดยภาพตัวที่เป็นเจ้าของยังเรียกตัวแสดง Artwork แยกกัน | ใช้ตัวแสดงภาพตาม Art Style ร่วมกันในหน้าเลือกคู่หู ทีม รายละเอียดตัวที่เป็นเจ้าของ กล่อง Journey Pokédex ภาพฟอร์ม บริการ/ฝึกท่า ตัวเลือก Sandbox แผงคู่หูเหนือแชท และหน้าเลือก/ทบทวนคู่หูใน Character Creation |
| ปุ่ม Nickname ติดกับ Train & manage moves | ปุ่มทั้งสองวางต่อกันในข้อความ HTML โดยไม่มี container กำหนดระยะห่าง | แถวปุ่มมี gap 12px ตัดลงแถวใหม่ได้ จัดฟอร์มชื่อเล่นแยกแถว และจำกัดความกว้างช่องพิมพ์บนมือถือ |
| เสียงกดมาช้า | ไฟล์เก่ามีช่วงเงียบก่อนเริ่มเสียงประมาณ 175ms และเริ่มผ่าน HTML audio ทุกครั้ง | ใช้ไฟล์ใหม่ที่ผู้ใช้ส่ง ตัดช่วงเงียบต้นไฟล์ เตรียมและถอดรหัสเสียงไว้ล่วงหน้า แล้วเริ่ม sample จากหน่วยความจำเมื่อกด |

หน้า Character Creation รับค่าเดียวกันจากตัวละคร เมื่อสลับ Art Style ระหว่างที่มีแบบร่างอยู่ ภาพเลือกคู่หูและภาพทบทวนเปลี่ยนตามโดยไม่ล้างชื่อหรือคู่หูที่เลือกไว้

ค่า Sprite ที่เลือกไว้จาก 1.6.2 ใช้งานต่อได้ทันที ใช้คีย์ค่าที่บันทึกเดิมและยังจำแยกตามตัวละคร ไม่ต้องสลับปุ่มซ้ำหรือรีเซ็ตแชท ภาพเมนูใช้ Sprite ภาพนิ่งหันหน้า ส่วนตัวแสดงในสนามยังรักษาด้านหลังของฝ่ายผู้เล่น/ด้านหน้าฝ่ายตรงข้าม และกฎ Motion ตามเดิม

ภาพของตัวที่เป็นเจ้าของส่งข้อมูลรายตัวไปเลือกฟอร์ม Shiny และภาพเพศเมียตามดัชนี หากไม่มีภาพเพศเฉพาะจะใช้ภาพมาตรฐานของฟอร์มนั้น ระบบภาพสำรองเมื่อ URL โหลดไม่ได้ยังทำงานเหมือนเดิม การเปลี่ยน Art Style ไม่แก้ทีม สเตตัส ไอเทม หรือความคืบหน้า

## เสียงที่ใช้

ไฟล์ต้นทางคือ `Pokemon_A_Button__Sound_Effect_HD.m4a` ที่ผู้ใช้ส่งในรอบนี้ แปลงเป็น PCM WAV mono 44.1kHz ตัดช่วงต้น/ท้ายที่เงียบและใช้ fade สั้นกันเสียงคลิก ไฟล์ผลลัพธ์ยาว 0.74 วินาที การตรวจ sample ยืนยันว่ามีเสียงภายใน 10ms แรกของไฟล์

เตรียม Web Audio buffer หนึ่งครั้งต่อการเปิดส่วนเสริม ใช้โหมด latency แบบ interactive และเริ่มเสียงใหม่แทนเสียงปุ่มก่อนหน้าที่ค้างอยู่ เบราว์เซอร์ที่ใช้ Web Audio ไม่ได้มี media playback สำรอง เมื่อปิดเสียงจะไม่มีเสียงจากการกดปุ่มถัดไป การทำลายส่วนเสริมหยุดเสียงและปิด audio context ด้วย

การเริ่มเสียงจริงยังขึ้นกับข้อกำหนดการแตะหน้าจอของเบราว์เซอร์และอุปกรณ์ การตรวจเวลาที่บันทึกใน browser เป็นเวลาสั่งเริ่ม sample ไม่ใช่การวัดเสียงออกลำโพงจริง

## ตรวจสอบ

- 400 unit/host tests ผ่าน (375 Pokémon/Workshop/host และ 25 Character Creation) พร้อม syntax checks รวมการใช้ sample ซ้ำ การตัดเสียงเดิม การ dispose ระหว่างรอ unlock และ media fallback
- ตรวจเมทริกซ์เมนู 84 กรณีต่ออุปกรณ์ (168 กรณีรวมคอม/มือถือ) เพิ่มจากการตรวจภาพรายตัวและ Character Creation
- SillyTavern 1.19.0: คอมและมือถือจำลอง ทั้ง Original/Aperture ตรวจ Artwork/Sprite ในทีม Journey Pokédex รายละเอียด ฟอร์ม Center Training กล่อง และแผงเหนือแชท
- ตรวจ Giratina Origin ตรงฟอร์ม และแก้ตัว QA ผ่าน Sandbox เพื่อยืนยันว่า Pikachu Shiny เพศเมียใช้ภาพตรง variant ในทีม รวมการสลับกลับเป็น Shiny Artwork
- ตรวจระยะ Train/Nickname และฟอร์มแก้ชื่อที่ 320/390/1280/1920px พร้อมตรวจข้อความปุ่มภาษาไทย/อังกฤษบนมือถือ
- ตรวจหน้าสร้างตัวละครทั้งหน้าเลือกคู่หูและทบทวน รวมการเปลี่ยน Art Style ขณะที่เปิดแบบร่างอยู่ และไล่เมนูย่อยที่เหลือของทั้งสองธีมด้วยข้อมูล QA
- ตรวจค่าเดิมยังอยู่หลังข้อความใหม่ แชทใหม่ สลับตัวละคร และรีโหลด รวมภาพ Artwork สำรองเมื่อจำลอง Sprite โหลดไม่ได้
- ตรวจการเล่นเสียงจริงผ่าน Web Audio ใน browser, ถอดรหัสครั้งเดียว, ปิด/เปิดเสียง และ motion การพบ/จับสำเร็จ/จับล้มเหลว/ชนะ/แพ้ การล็อกปุ่ม ย้อนข้อความ และ reduced motion
- ตรวจติดตั้ง Pokémon 1.6.3 จาก Workshop และเลือกคู่หูจากการ์ดไทย/อังกฤษ

ใช้การ์ด QA และเหตุการณ์ควบคุม ไม่แก้แชทจริงของผู้ใช้ ไม่มี live model หรือ live voice ภาพมือถือเป็น browser emulation ยังไม่ได้ตรวจบน iPhone จริง WebKit ในเครื่องทดสอบขาดไลบรารีระบบ จึงไม่นับเป็นผลทดสอบที่ผ่าน

## ภาพจาก SillyTavern

| | Original | Aperture |
| --- | --- | --- |
| มือถือ · ทีม Sprite | [ภาพ](previews/pokemon-art-style/mobile-original-party.webp) | [ภาพ](previews/pokemon-art-style/mobile-classic-dark-party.webp) |
| มือถือ · รายละเอียด/ปุ่ม | [ภาพ](previews/pokemon-art-style/mobile-original-owned-detail-en.webp) | [ภาพ](previews/pokemon-art-style/mobile-classic-dark-owned-detail-en.webp) |
| คอม · ทีม Sprite | [ภาพ](previews/pokemon-art-style/desktop-original-party.webp) | [ภาพ](previews/pokemon-art-style/desktop-classic-dark-party.webp) |
| คอม · รายละเอียด/ปุ่ม | [ภาพ](previews/pokemon-art-style/desktop-original-owned-detail.webp) | [ภาพ](previews/pokemon-art-style/desktop-classic-dark-owned-detail.webp) |

[หน้าเลือกคู่หูใน Character Creation](previews/pokemon-art-style/mobile-creator-starters.webp) · [หน้าทบทวน Sprite](previews/pokemon-art-style/mobile-creator-review-sprite.webp) · [หน้าทบทวน Artwork](previews/pokemon-art-style/mobile-creator-review-artwork.webp) · [เมนูเปลี่ยนตัวในสนาม](previews/pokemon-art-style/mobile-battle-party-sprites.webp) · [ตั้งค่ามือถือ](previews/pokemon-art-style/mobile-original-settings.webp) · [ฟอร์มชื่อเล่น](previews/pokemon-art-style/mobile-original-nickname-editor.webp) · [Shiny เพศเมีย](previews/pokemon-art-style/mobile-shiny-female-party.webp) · [ผลตรวจทุกหน้า](previews/pokemon-art-style/surfaces-validation.json) · [ผลตรวจภาพ/เสียง](previews/pokemon-art-style/validation.json) · [ผลตรวจข้อความ EN มือถือ](previews/pokemon-art-style/mobile-review.json) · [Motion](previews/pokemon-art-style/motion-validation.json) · [การติดตั้ง](previews/pokemon-art-style/installation-validation.json)

## อัปเดต

อัปเดต RoleForge บน main เป็น **0.90.13** แล้ว reload SillyTavern จากนั้น Workshop → Pokémon → Update **1.6.3** ค่า Art Style เดิมและข้อมูลการเล่นยังอยู่
