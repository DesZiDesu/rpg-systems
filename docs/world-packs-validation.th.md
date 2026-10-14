# ตรวจสอบ RoleForge 0.69.0 กับคลังขนาดใหญ่

ทดสอบส่วนเสริมจริงใน **SillyTavern 1.19.0 (`06bde93`)** ด้วย profile แยกจากข้อมูลผู้ใช้ บน Chromium 151 และ WebKit 26.5 ใน Linux หน้าจอจำลองมือถือ 390×844 และคอม 1440×1000 ใช้ native Import/Export, บันทึกการ์ด, metadata และ IndexedDB จริง

[ภาพหน้าจอมือถือ / คอม](previews/world-packs-0690/index.html) · [ผลตรวจแบบ JSON](validation-world-packs-v0.69.0.json) · [วิธีใช้งาน](world-packs.th.md)

## แพ็กที่ตรวจ

อ่าน START-HERE, AGENT-HANDOFF และ WORLD-PACK-CONTRACT ของ `Fate-Nasuverse-v3-Agent-Test-Bundle.zip` ก่อนทดสอบ ตรวจ hash ครบ 3,552 ไฟล์: NPC 800 ตัว, เวอร์ชัน 1,771 รายการ, Lore โลก 178 รายการ และข้อมูลเสริมพลัง 4,329 รายการ

ใช้ Native control ฝังข้อมูลเพื่อเก็บ baseline บน 0.68.5 แล้วใช้ Core + World Pack บนรุ่นใหม่ ไม่ใช้ Core ที่มี NPC ฝัง 0 รายการเป็นหลักฐานว่าคลังครบ ข้อมูล Fate ต้นฉบับไม่ได้ถูกแก้หรือนำมารวมใน repository และไม่ได้ใช้แพตช์ mention activation สำหรับ 0.68.4

## ผลที่ตรวจผ่าน

- แสดง Management ครั้งละ 20 รายการ ค้นชื่อโดยไม่ normalize ประวัติทั้งคลัง เปิดหนึ่งตัวจึง normalize หนึ่งตัว
- เปิด Gilgamesh Archer ครบ 11 เวอร์ชัน เลือก Strange Fake และแก้ notes จาก UI จริง โดยชื่อร่วมกับ Caster ไม่ขัดขวางการบันทึกตัวเดิม
- เรียก generation interceptor จริง 10 รอบ จำนวน normalize ของ cache คลังคงเดิม ไม่ส่งดัชนีรายชื่อทั้ง 800 ตัวเข้า prompt และไม่คัดลอก 1,771 เวอร์ชันลง checkpoint
- การค้นประวัติไม่เปิดใช้งานตัวละคร ไม่เปลี่ยน `met` และไม่สลับเวอร์ชันที่ผู้ใช้เลือก Quiet / impersonation ไม่โหลดประวัติเพิ่ม
- Export ผ่าน Worker แล้วกดลิงก์ดาวน์โหลดจริงทั้ง Chromium และ WebKit วิธีนี้รองรับ Safari ที่ต้องการการกดใหม่หลังเตรียมไฟล์เสร็จ
- เทียบฟิลด์ต้นฉบับทุกตัวละครและทุกเวอร์ชันหลัง Export รวมสี Stats และคำอธิบายพลังยาว ข้อมูลครบ ยกเว้นการเปลี่ยนเวอร์ชันกับ notes ของ Archer ที่จงใจแก้ในทดสอบ Lore 178 และข้อมูลเสริม 4,329 รายการตรงกับต้นฉบับ
- นำ Backup เข้า browser context ใหม่ที่ไม่มีคลังเดิม เชื่อมการ์ดและ reload แล้วยังครบ 800 / 1,771 พร้อมเวอร์ชันและ notes ที่แก้
- ระหว่างหน่วงการอ่าน Worker แล้วสลับการ์ด คำขอเก่าถูกหยุด ไม่มี NPC หรือข้อมูล prompt ข้ามการ์ด
- ไฟล์ hash ผิดยังถูกปฏิเสธแม้เคยติดตั้ง revision นั้นแล้ว ข้อมูล hash ถูกแต่ ID ไม่ตรงก็ถูกปฏิเสธก่อนประกาศพร้อมใช้
- ยกเลิก Import และจำลอง `QuotaExceededError` หลังบันทึก staging batch แรก: transaction ถัดไปถูกยกเลิก ล้างไฟล์ชั่วคราว และอ่านคลังเดิมต่อได้ การทดสอบ quota เป็น fault injection ใน Worker/IndexedDB จริง
- ย้าย NPC / Lore ฝังในการ์ดผ่าน API จริง เก็บเวอร์ชัน พลังยาว และ Preset ครบ หากบันทึกการ์ดตอบ HTTP 503 ข้อมูลฝังเดิมและ reference เดิมยังอยู่ เมื่อ retry สำเร็จจึงนำอาร์เรย์ฝังเดิมออก และคงผลหลังโหลดหน้าใหม่
- Unit/host tests ตรวจว่าเมื่อคลัง required ยังไม่มีในเบราว์เซอร์ จะเก็บส่วนต่าง NPC, contact และ party ไว้รอคลังกลับมา รวมถึงการ rollback หลังแก้ canon, เวอร์ชันที่ลบ, cache eviction และการเปลี่ยน archive
- ตรวจเมนูสามจุดซ้ำบน WebKit touch 390px และ Chromium touch/mouse 390/1440px ด้วย 500 NPC / 4,019 Lore: เลือกหน้า/ทุกผลค้นหา/ข้ามหน้า, ยกเลิก, ปิด/Undo, ลบพร้อมยืนยัน และ keyboard focus ผ่าน ไม่มีข้อมูลหายจากรายการที่ยังไม่ได้โหลด

## การวัด

ตารางใน [ภาพและผลวัด](previews/world-packs-0690/index.html) สร้างจากผลรอบทดสอบจริง มีเวลานำเข้าคลังครั้งแรก เวลาเปิดรายการย่อ และการเตรียม prompt 10 รอบ ตัวเลขเป็นการสังเกตบนเครื่องทดสอบ ไม่ใช่การรับประกันความเร็วของมือถือทุกเครื่อง

ช่วง Import มี timer บนหน้าหลักทำงานต่อเนื่อง งานตรวจและเก็บข้อมูลหลักอยู่ใน Worker การนับ normalize เป็น counter ของ cache ประวัติคลัง ไม่รวมนำสถานะของตัวละครที่กำลังใช้อยู่มาจัดรูปแบบตามปกติ

Native control บนรุ่นเดิมใช้เวลาเปิดประมาณ 24.6 วินาทีและเปิด Management 3.3 วินาที พร้อม long task สูงสุด 16 วินาที ผลนี้เก็บคนละ profile และคนละรูปแบบการจัดเก็บกับ Core + ZIP จึงใช้ประกอบการหาคอขวด ไม่ใช้สรุปอัตราเร็วเปรียบเทียบโดยตรง baseline มี page error JSON parsing หนึ่งรายการที่ไม่ได้เก็บ stack ไว้ จึงไม่ระบุว่าเกิดจากส่วนใด; บันทึกข้อความ error ไว้ใน JSON รอบ validation ปิดการค้นหา Horde ภายนอกที่ไม่เกี่ยวกับการทดสอบ

## ขอบเขตหลักฐาน

ชุด unit/host และ syntax ต้องผ่านก่อน commit ผลจำนวนรายการอยู่ใน JSON การทดสอบ browser ไม่เรียก API โมเดล จึงยืนยันการค้น/เตรียมข้อมูล/จัดเก็บ/แสดง UI แต่ยังไม่ยืนยันคุณภาพการโรลของ Proxy หรือโมเดลใดโดยเฉพาะ WebKit บน Linux ไม่ใช่การทดสอบบน iPhone จริง และการจำลอง quota ไม่ใช่การทำให้ดิสก์เครื่องผู้ใช้เต็ม

ไม่ได้รับไฟล์ v2 ต้นฉบับ จึงไม่อ้างว่าเทียบทุกเวอร์ชันกับ v2 ได้เอง หรือทำ canon audit ใหม่ ข้อมูลต้นทางและการลด Lore ซ้ำเป็นของแพ็กที่ส่งมา

## รันทดสอบซ้ำ

ใช้ profile ของ SillyTavern สำหรับทดสอบเท่านั้น แล้วตั้ง `ST_REAL_URL` เป็น localhost ของ profile นั้น

```sh
npm test
npm run check
npm run test:world-pack
ST_REAL_URL=http://127.0.0.1:18175 \
  FATE_BUNDLE_ROOT=/path/to/extracted-bundle \
  FATE_BUNDLE_ZIP=/path/to/Fate-Nasuverse-v3-Agent-Test-Bundle.zip \
  ST_REAL_BROWSERS=chromium,webkit npm run test:world-pack:real
ST_REAL_URL=http://127.0.0.1:18175 npm run test:world-pack:storage:real
ST_REAL_URL=http://127.0.0.1:18175 npm run test:archive-menu:real
```

Browser scripts ใช้ Playwright ที่ติดตั้งไว้ในเครื่องทดสอบ และ Chromium ที่ `/usr/bin/chromium` ตามค่าเริ่มต้น ไม่ต้อง Import ไฟล์แพ็ก Fate เข้า repository เพื่อรัน unit tests
