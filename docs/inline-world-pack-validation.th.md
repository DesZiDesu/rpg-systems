# ตรวจสอบการ์ดฝัง World Pack · 0.70.0

ฐานก่อนแก้: `main` รุ่น 0.69.0, commit `ea702c5fe0e7f56687d1ab3660a7a285ffe30edb` ตรวจตรงกับ `origin/main` ก่อนเริ่ม ใช้แพ็ก Fate ที่ผู้ใช้ส่งและอ่าน START-HERE / agent handoff / contract ก่อนทดสอบ

## ไฟล์หลักที่แก้

| ไฟล์ | งาน |
| --- | --- |
| `src/character-archive.js` | อ่าน payload; บันทึก ref/payload ร่วมกันผ่านคิวเขียนการ์ด; guard ก่อนส่ง; รักษาข้อมูลเมื่อเซิร์ฟเวอร์ปฏิเสธ |
| `src/world-pack-core.js` | contract/ขนาด inline envelope, error codes และ field name |
| `src/world-pack-inline.js` | codec ใน Worker: Base64, compressed SHA-256, streaming gzip ที่ตรวจขนาดระหว่างคลาย, CRC fallback, เก็บ byte ของ text ตามเดิม |
| `src/world-pack-worker.js` | แหล่ง inline ใช้ importWorld/validation/staged IndexedDB เดิม; typed missing/storage errors; สร้าง revision/hash/payload ใหม่; ส่งออกการ์ด JSON ผ่าน API ปกติของ ST |
| `src/world-pack-client.js` | เปิด ready ก่อนอ่าน payload; deduplicate งานติดตั้ง; ไม่ import ซ้ำหลัง reload; คำสั่ง Update/Export และลิงก์ดาวน์โหลดจริง |
| `index.js` | เชื่อมกับเปิดแชตและ async generation interceptor; ตรวจ owner/chat/ref/payload/revision หลังรอ; คง catalog เดิมจน native card write สำเร็จ |
| `ui-polish.css` | แถบเตรียมคลังแบบ native ST พร้อม Cancel |
| `manifest.json`, `package.json`, imports/styles/templates | รุ่น 0.70.0 และ cache version; ไม่เปลี่ยนตรรกะระบบอื่นจากการเปลี่ยนเลข query |
| `tests/world-pack-inline*.mjs`, `world-pack-client.test.mjs`, `character-archive.test.mjs`, `world-pack-storage.real.browser.mjs` | codec, ความเสียหาย/ขนาด, single import, async isolation, card-save failure, native round trip และ real Worker/IDB |
| `tests/character-forge.browser.mjs` | รอผล resize จริงแทนการรอ 80 ms คงที่ในตัวทดสอบ |

## Unit / host tests

`npm test`: **1,296 ผ่าน, 0 ไม่ผ่าน**; `npm run check` ผ่าน

รวม exact UTF-8/CRLF/LF/BOM preservation, Base64 และ gzip/hash ที่ผิด, ขนาดที่ประกาศผิด, ขยายเกินขนาดระหว่างคลาย, checksum/truncation, cancellation, unsafe/duplicate paths, prototype keys, ครั้งเดียวสำหรับ concurrent opens และไม่อ่าน payload เมื่อคลังพร้อมแล้ว ทดสอบทั้ง `DecompressionStream` และ streaming fallback พร้อม CRC

ตรวจการเขียน ref/payload ในคำขอเดียว การปฏิเสธการเขียนหรือ scope ที่เปลี่ยนไม่เปลี่ยนข้อมูลเดิม และ regression ชุด sparse state/swipe/manual-edit เดิมยังผ่าน

## SillyTavern ในเบราว์เซอร์จริง

ใช้ SillyTavern 1.19.0 บน localhost แยก data directory และ browser contexts, เปิดส่วนเสริม production จาก checkout นี้ ไม่มีการทดสอบกับข้อมูล production ของผู้ใช้ ไม่ได้ใช้ mock host แทน ST ในส่วนนี้

แพ็กจริง: **800 NPC, 1,771 เวอร์ชัน, 178 world Lore, 4,329 ability supplements** ตัว JSON envelope 16,432,537 bytes, gzip 1,358,915 bytes และการ์ดต้นฉบับพร้อม payload 1,839,088 bytes

รายการตรวจของ `tests/world-pack-inline.real.browser.mjs`:

1. Native Import การ์ด JSON ใบเดียวใน browser context ที่ IndexedDB ว่าง เปิดแชตแล้วติดตั้งเองพร้อม progress/Cancel ไม่ส่ง ZIP หรือ link เพิ่ม
2. เริ่ม generation interceptor ขณะติดตั้ง: preparation รอคลังพร้อมก่อนจบ และการเปิดหลายเส้นทางยังมี inline import เพียงครั้งเดียว
3. Reload และเตรียม prompt ซ้ำ: inline import/decompression เป็นศูนย์หลัง reload; version/hash ที่ติดตั้งพร้อมแล้วถูกใช้ซ้ำ
4. เปิด Character Management / สลับ Archer ทั้ง 11 เวอร์ชัน เลือก Strange Fake และแก้ notes; แก้ Lore ผ่าน editor จริง
5. สร้าง checkpoint ด้วย completed-reply fixture ผ่าน `MESSAGE_RECEIVED` ก่อนแก้ฐานข้อมูล แล้วใช้ `MESSAGE_SWIPED` ไป-กลับหลังแก้: manual database edits และเวอร์ชันไม่ย้อนทับตาม checkpoint เก่า
6. Export self-contained card ผ่านปุ่มจริงและดาวน์โหลด anchor จริง เทียบทุก field ของทุก base/version กับต้นฉบับ ยกเว้นการแก้ canary ที่ตั้งใจไว้ ตรวจสี Stats, รูปลักษณ์และ Ability รวมทั้งข้อมูลเสริม 4,329 รายการ
7. การ์ดที่บันทึกบนเซิร์ฟเวอร์และ JSON ที่ดาวน์โหลดนำเข้า browser contexts ใหม่ซึ่งไม่มีคลังได้เอง รวมการแก้ NPC/Lore และเลือกเวอร์ชันล่าสุด ไม่ใส่ payload ใน chat metadata/checkpoints/global settings
8. Chromium เพิ่มกรณี compressed hash ผิด, valid-hash gzip เสีย, Cancel, inject quota ระหว่าง staged writes และเปลี่ยน owner ระหว่างติดตั้ง: คลังเดิมยังอยู่และไม่ใช้ข้อมูลกับ owner ใหม่
9. `first_mes` ว่างยังแสดง Character Creation และ native preset ทั้งแปด components ยังเท่าเดิม

`tests/world-pack-storage.real.browser.mjs` ตรวจ ZIP schema/cancel/quota เดิม, native embedded migration, HTTP 503 ก่อนเขียนการ์ด, Update embedded archive ล้มเหลวแล้ว catalog เดิมยังใช้งานได้ และลองใหม่จึงบันทึก ref/payload ใหม่ร่วมกัน การลบดัชนีในคลังทดสอบอย่างจงใจให้ error `WORLD_PACK_STORAGE_INVALID` ไม่อ่าน payload เพื่อติดตั้งทับ

`tests/world-pack.real.browser.mjs` ตรวจ regression ของ ZIP/Core แบบเก่า รวม export/import backup, corruption, owner switch และ version/field fidelity กับแพ็ก Fate เดียวกัน

Character Forge fixture และ opening/proxy fixture แยกต่างหากผ่านที่ 320/390/1280 px ใช้ production iframe/loader และ controlled host ไม่ใช่หลักฐานเรียก Proxy จริง

ผลแต่ละ engine และรายการตรวจอยู่ใน [รายงาน JSON](validation-inline-world-packs-v0.70.0.json) และ [ภาพจากการทดสอบ](previews/inline-world-packs-0700/index.html)

## ขอบเขตและข้อจำกัด

- ใช้ Chromium และ WebKit บน Linux, viewport touch 390×844 และ desktop 1440×1000 ไม่ใช่ iPhone จริง ไม่อ้างว่าทดสอบ Safari/iOS บนอุปกรณ์จริง
- ทดสอบการย้ายเครื่องด้วยการ์ด JSON; ยังไม่ได้ทดสอบ PNG round trip ในรอบนี้
- **ไม่มี provider/model requests** การเตรียม prompt เรียก interceptor จริง แต่ข้อความตอบสำหรับ checkpoint เป็น fixture ที่ระบุชัด ไม่อ้างว่าทดสอบ proxy generation
- Quota ทดสอบด้วยการ inject `DOMException('…','QuotaExceededError')` ที่ `IDBObjectStore.put` ครั้งที่ 35 หลัง staging batch แรก commit ไม่ใช่การทำให้ดิสก์เครื่องจริงเต็ม
- ตัวสร้างการ์ดฝังคลังได้เมื่อคลังพร้อมใช้; native arrays รุ่นเดิมต้องย้ายเป็น World Pack ก่อนผ่านคำสั่งเดิม ผู้รับการ์ดที่ฝังแล้วนำเข้าใบเดียวได้
- ภาพ/เสียงที่เป็น URL/path นอกแพ็กไม่ถูกฝังเพิ่ม; เซฟแชตแยกจากการ์ด; การแก้ฐานข้อมูลหลัง export ต้องกด Update/Export ใหม่
- ครั้งแรกยังมีค่าอ่าน JSON ของ SillyTavern และค่า validation/เขียน IndexedDB ใน Worker ขนาด/เวลา/หน่วยความจำขึ้นกับอุปกรณ์ ขนาด envelope จำกัด 256 MiB และ gzip 64 MiB ไม่ใช่คำรับรองว่าแพ็กถึงเพดานจะทำงานลื่นบนทุกเครื่อง
- cold install ที่บันทึกในรอบผ่าน: Chromium 23.2 วินาที, WebKit 52.3 วินาทีขณะเครื่องมีงานทดสอบอื่น ไม่ใช่ benchmark เปรียบเทียบความเร็ว browser; มีรอบ WebKit เพิ่มเติมที่รันพร้อมอีกชุดและชน timeout ของตัวทดสอบ export ที่ 180 วินาที รอบแยกที่ใช้ไฟล์จริงผ่านครบ การติดตั้ง/ส่งออกครั้งแรกอาจใช้เวลานานตามภาระเครื่อง
- งานนี้ไม่เพิ่ม mention activation หรือการซิงก์ state กับ MVU การโหลดข้อมูลคงแยกจาก enabled/met/การอยู่ในฉาก และไม่เปลี่ยนเวอร์ชันเอง
