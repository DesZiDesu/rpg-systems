# ตรวจ Repository สำหรับ Public release 0.56.2

**รายงานนี้เป็น snapshot ก่อน cleanup** รายการที่ลบภายหลังและผลทดสอบอยู่ใน [รายงาน cleanup](repository-cleanup-v0.56.2.th.md)

ตรวจวันที่ 5 ตุลาคม 2026 จาก commit `859fa6e66a65345328eaadcc2d99550a6d717dfc` ครบ 605 ไฟล์ที่ Git ติดตาม ก่อนเพิ่มเอกสาร Public ชุดนี้ ขนาดเนื้อหาไฟล์รวม 25.33 MiB โฟลเดอร์ `.git` ในเครื่องมีประวัติและ object เพิ่มอีกประมาณ 66 MiB ซึ่งเป็นข้อมูล Git ไม่ใช่ไฟล์ของส่วนเสริมที่ควรลบทิ้ง

**ไม่พบไฟล์ขยะชัดเจนอย่าง node_modules, cache, log, .tmp, .bak, .env หรือผลทดสอบชั่วคราวที่ถูกติดตามใน snapshot นี้** พบไฟล์สำหรับพัฒนา/ประวัติที่ไม่จำเป็นต่อการเล่น และภาพซ้ำจริง แต่บางไฟล์ยังใช้ใน tests หรือเอกสาร จึงแยกเป็นรายการตรวจเพื่อจัดการได้โดยมีหลักฐาน

## ภาพรวมทุกไฟล์

| กลุ่ม | จำนวน | ขนาด | ข้อสรุป |
| --- | ---: | ---: | --- |
| Runtime ที่เข้าถึงจากตัวโหลดปัจจุบันและทางเข้า CSS เดิม | 117 | 2.79 MiB | เก็บ: JavaScript, CSS, manifest และ templates ที่ใช้งานจริง |
| โมดูลเก่าที่ไม่อยู่ในเส้นทาง runtime ปัจจุบัน | 5 | 65.53 KiB | ผู้เล่นไม่ต้องโหลด แต่ checks/tests บางส่วนยังต้องใช้ |
| Tests และ fixtures | 111 | 1.34 MiB | ไม่จำเป็นต่อการเล่น แต่จำเป็นต่อการตรวจ regression |
| ภาพพรีวิว | 291 | 20.18 MiB | เป็นสัดส่วนหลักของขนาด repo; ไม่ถูกโหลดในการเปิด RoleForge ปกติ |
| HTML/JS/CSS/JSON ของพรีวิว | 35 | 285.78 KiB | ใช้ดูแบบและเป็น host fixture ของ browser tests |
| เอกสารและ README ย้อนหลัง | 40 | 503.52 KiB | ไม่ใช่ runtime แต่เป็นวิธีใช้งานและหลักฐานประวัติ |
| ต้นฉบับงานออกแบบ | 3 | 90.15 KiB | ใช้สร้าง artwork ใหม่หรือแก้ต้นฉบับ |
| README, LICENSE, package.json | 3 | 99.88 KiB | เก็บเพื่อผู้ใช้ ใบอนุญาต และคำสั่งตรวจโครงการ |

รายการชื่อ ขนาด ประเภท และการอ้างอิงที่พบของทั้ง 605 ไฟล์อยู่ใน [inventory JSON](repository-audit-v0.56.2.json) กราฟ runtime ตรวจ imports, CSS imports, manifest/loader, templates และ stylesheet ที่โหลดผ่านโค้ด ไม่พบ local dependency ของ runtime หาย

## ไฟล์เก่าที่อาจจัดการในรอบ cleanup

| ไฟล์ | สถานะปัจจุบัน | ผลถ้าลบทันที |
| --- | --- | --- |
| [src/auction-ui.js](../src/auction-ui.js) | UI เดิม ไม่อยู่ใน bootstrap ปัจจุบัน; host tests ยัง import helper | tests ที่ใช้ helper จะพัง |
| [src/marketplace-ui.js](../src/marketplace-ui.js) | UI เดิม; host tests ยัง import renderer | tests ที่ใช้ renderer จะพัง |
| [src/marketplace-chat-ui.js](https://github.com/DesZiDesu/rpg-systems/blob/c590f77369711b039a8b567a8f882c09cba072f6/src/marketplace-chat-ui.js) | การ์ดตลาดเดิม; syntax-check script ยังระบุไฟล์ | คำสั่ง check จะพังหากไม่แก้พร้อมกัน |
| [src/mastery-training.js](../src/mastery-training.js) | engine ฝึกแบบเดิม; unit/host tests และ UI เดิมยังอ้าง | ต้องย้ายหรือปรับ legacy tests ก่อน |
| [src/mastery-training-ui.js](https://github.com/DesZiDesu/rpg-systems/blob/c590f77369711b039a8b567a8f882c09cba072f6/src/mastery-training-ui.js) | UI ฝึกเดิม; syntax-check script ยังระบุไฟล์ | ต้องแก้คำสั่ง check และตรวจ UI ปัจจุบันใหม่ |

รวม 5 ไฟล์ประมาณ 65.53 KiB การสแกนยืนยันได้ว่า loader ปัจจุบันไม่เรียกไฟล์เหล่านี้ ไม่ได้พิสูจน์ว่าไม่มีผู้ใช้ภายนอก import API เก่าเอง รายงานนี้เก็บไฟล์ไว้พร้อมบอก dependency เพื่อให้การลบภายหลังทำพร้อม tests/checks ได้

ไฟล์ [style.css](../style.css), [npc-ui.css](../npc-ui.css) และ [ui-polish.css](../ui-polish.css) ที่ root มีขนาดเล็กและดูคล้ายซ้ำกับ `styles/` แต่เป็น compatibility entry สำหรับตัวโหลดหรือโมดูลเก่าที่เบราว์เซอร์เก็บไว้ **ยังจำเป็น** การตรวจ browser ครอบคลุมทั้ง loader ปัจจุบันและ loader เก่า จึงเก็บไว้

## ภาพซ้ำและพรีวิวเก่า

เทียบ SHA-256 ของเนื้อหาพบภาพเหมือนกันทุก byte **7 กลุ่ม รวม 16 ไฟล์** ถ้าเก็บอย่างละหนึ่งไฟล์จะลดได้ 9 สำเนา รวม 282,108 bytes หรือประมาณ 275.50 KiB:

| กลุ่ม | สำเนาที่พบ |
| --- | --- |
| สิทธิ์ซื้อขาย 0.53.0 | `commerce-rights-v0530/14-ticket-used.png`, `15-rental-expired.png`, `17-owned-goods.png` |
| ห้องพัก desktop | `commerce-v0541/room-offer-1280.png`, `commerce-v0550/room-offer-1280.png` |
| ห้องพัก 320 px | `commerce-v0541/room-offer-320.png`, `commerce-v0550/room-offer-320.png` |
| ห้องพัก 390 px | `commerce-v0541/room-offer-390.png`, `commerce-v0550/room-offer-390.png` |
| ราคาต่อรอง desktop | `inventory-rights-v0554/discount-agreed-1280.png`, `inventory-v0555/discount-agreed-1280.png`, `items-v0560/commerce-regression/discount-agreed-1280.png` |
| ราคาต่อรอง 320 px | `inventory-rights-v0554/discount-agreed-320.png`, `items-v0560/commerce-regression/discount-agreed-320.png` |
| ราคาต่อรอง 390 px | `inventory-rights-v0554/discount-agreed-390.png`, `items-v0560/commerce-regression/discount-agreed-390.png` |

ทั้งหมดอยู่ใต้ `docs/previews/` การรวมสำเนาหรือเก็บพรีวิวเก่าแยกจากแพ็กเกจติดตั้งไม่กระทบ runtime แต่ต้องแก้ลิงก์ gallery/เอกสารและตำแหน่ง output ของ browser scripts ที่เกี่ยวข้องพร้อมกัน จึงยังเก็บภาพไว้ในรอบรายงานนี้

Static scan พบพรีวิวหลายไฟล์ที่ไม่มีลิงก์ตรง แต่คำว่าไม่มีลิงก์ตรงไม่เท่ากับไฟล์ไม่ถูกใช้ ตัวอย่าง gallery สร้างชื่อภาพตามความกว้าง และ browser tests อ่าน fixture ผ่านเส้นทางที่ประกอบขึ้น พรีวิว `preview-h-stats.html`, `h-stats-fixture.js` และ `voice-addon-fixture.js` จึงไม่ควรถูกเหมารวมลบทั้งโฟลเดอร์ พรีวิวทั้งหมดไม่จำเป็นสำหรับการเล่น แต่บางส่วนจำเป็นสำหรับการทดสอบใน repo

`design/build-medallions.py` เป็นตัวสร้าง artwork ที่อยู่ใน `src/npc-medallions.js` ส่วน JSON และ SVG ใน `design/` เป็นต้นฉบับ/ภาพตรวจงาน ไม่ต้องโหลดขณะเล่น แต่มีเหตุผลในการเก็บสำหรับพัฒนา

## README และสิ่งที่แก้ในรอบนี้

- เก็บ README เดิมที่ [docs/archive/README-v0.56.2-development.md](archive/README-v0.56.2-development.md) พร้อมประวัติการพัฒนา และปรับ relative links ให้ใช้ได้จากตำแหน่งใหม่
- เขียน [README Public](../README.md) ใหม่สำหรับ **0.56.2** และเพิ่ม [คู่มือเริ่มต้นภาษาไทย](getting-started.th.md) ครอบคลุมติดตั้ง การเล่น ระบบเสริม ค่าเริ่มต้น API/เครดิต การอัปเดต การสำรองข้อมูล และวิธีรายงานปัญหา
- แก้ลิงก์เสียจริง 2 จุดใน README ย้อนหลัง 0.42.0: ไป archive 0.40.10 และ LICENSE
- ตรวจ placeholder ชื่อภาพ `-W.png` ใน gallery เก่า: เป็นการแทนค่าผ่าน JavaScript ไม่ใช่ไฟล์หาย ตรวจทั้ง 27 เส้นทางที่แทนเป็น 320/390/1280 แล้วมีไฟล์ครบ
- เพิ่ม `.gitignore` สำหรับ dependencies, logs, test output, cache และ local credentials เพื่อไม่ให้ไฟล์ระหว่างพัฒนาหลุดเข้ามาใน release
- แก้คำอธิบายโครงสร้าง: README เก่าเคยกล่าวถึง `assets/` ทั้งที่ snapshot นี้ไม่มีโฟลเดอร์นั้น เอกสารใหม่อธิบายโครงสร้างที่มีจริง

หมายเลข runtime ยังเป็น **0.56.2** ตรงกับ manifest และ cache URLs เปลี่ยนเฉพาะเอกสารและ ignore rules; core modules, styles และ templates เดิมยังอยู่ครบ Repository เป็น Public อยู่แล้วและใช้ `main` เป็น branch ติดตั้ง

## ตรวจการทำงานหลังแก้

- `npm test`: **869 tests ผ่าน**
- `npm run check`: syntax ผ่าน; repository-layout test ตรวจ imports และ cache versions ตรงกับ manifest
- Production startup browser: loader ปัจจุบันและ loader เก่าที่ **320 / 390 / 1280 px** เปิด settings, ทุกแท็บ และ NPC Manager ได้ครบ ไม่มี asset 404 หรือ runtime error
- ตรวจลิงก์ใน README ใหม่ คู่มือไทย archive ที่ย้าย และรายงานนี้กับไฟล์จริง

การทดสอบใช้ host/provider responses ที่ควบคุมไว้ ไม่เรียกบัญชี AI หรือ ElevenLabs แบบเสียเงิน ผลตรวจยืนยันการเปลี่ยนเอกสารและโครงสร้างในรอบนี้ ไม่ใช่คำรับรองว่าโมเดลหรือ preset ทุกตัวจะส่งข้อมูลครบทุกครั้ง
