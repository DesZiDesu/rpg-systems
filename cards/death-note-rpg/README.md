# Death Note RPG

ฉบับไม่มีภาพตัวละครแยกต่างหาก: **[Death-Note-RPG-No-Portraits.json](build/Death-Note-RPG-No-Portraits.json)** หรือ **[PNG](build/Death-Note-RPG-No-Portraits.png)** — ตัวละครและทุกเวอร์ชันอยู่ครบ มีข้อความเริ่มต้นภาษาไทย 10 แบบ แบบละ 2 ย่อหน้า เลือกโดยปัดข้อความแรกใน SillyTavern [อ่านฉากเริ่มทั้งหมดและวิธีใช้](build/Death-Note-RPG-No-Portraits.th.md) ฉาก 6/9 ใช้ Japanese films ส่วนที่เหลือใช้ Manga ในเมนู Campaign เมื่อเปิด Death Note Addon ฉาก 5 และ 10 จะแสดงสมุดที่ผู้เล่นถืออยู่ทันทีตามข้อความเปิดที่เลือก ฉากที่เห็นสมุดตกหรือ Light ได้สมุดจะไม่มอบสมุดให้ผู้เล่น

นำเข้า **[Death-Note-RPG.png](build/Death-Note-RPG.png)** หรือ **[Death-Note-RPG.json](build/Death-Note-RPG.json)** เพียงไฟล์เดียวใน SillyTavern ที่ติดตั้ง RoleForge **0.82.2 ขึ้นไป** ไม่ต้องนำเข้า World Pack, Lorebook หรือภาพแยก ไฟล์ทั้งสองมีข้อมูลเหมือนกัน เลือกนำเข้าอย่างใดอย่างหนึ่ง

1. อัปเดต RoleForge แล้ว reload SillyTavern
2. Import การ์ดและเปิดแชทใหม่ เมนู Death Note จะเตรียมให้แชทนี้ครั้งแรก การปิด Addon เองภายหลังจะไม่ถูกการ์ดเปิดคืน
3. เปิดเมนูไม้กายสิทธิ์ → **Campaign** เลือกฉบับและโหมด ก่อนกดเริ่มใน Character Creation หากยังไม่เลือก ระบบจะเปิดตัวเลือกเมื่อพยายามเริ่มเรื่อง
4. กรอกตัวละคร สถานที่ และฉากเปิดให้ตรงฉบับที่เลือก แล้วเริ่มเล่น ตั้งค่าโมเดล/API ใน SillyTavern ตามปกติ การ์ดไม่เปลี่ยนการเชื่อมต่อให้
5. เมื่อเรื่องถึงเงื่อนไข ภารกิจจะแสดงให้รับ ปฏิเสธ หรือพักได้ เล่นอิสระจะไม่เปิดเควสต้นฉบับอัตโนมัติ เลือกฉบับใหม่โดยเริ่มแชทใหม่

มีตัวละคร **208 รายการ**, เวอร์ชัน/ช่วงชีวิต **652 แฟ้ม**, Lore **65 รายการ**, Story / Mission **146 บท** ใน **13 เส้นทาง** รวมตัวละครหลัก 39 แฟ้มละเอียด ตัวละครสนับสนุน 86 และรายย่อย 83 แฟ้มสั้นตามข้อมูลที่ตรวจได้ ไม่แต่งประวัติเต็มขึ้นมาให้ตัวละครที่ต้นฉบับกล่าวถึงเพียงชื่อ

เส้นทางแยกกัน: Manga, Anime, Japanese films (2006 / The Last Name / L: Change the WorLd / New Generation / 2016), Another Note, L: Change the WorLd ฉบับนิยาย, TV drama 2015, US film 2017, Musical, C-Kira, a-Kira, Pilot, Spiraling Trap และ Audio drama เส้นทางเกมและละครเสียงเป็นโครงเล่นที่ดัดแปลงจากข้อมูลที่ยืนยันได้ ไม่มีบทถอดเสียงหรือเฉลยปริศนาครบจากต้นฉบับที่หาไม่ได้ Relight และ L FILE No. 15 มีข้อมูลประกอบ/เวอร์ชันอ้างอิง ไม่ใช่แคมเปญเพิ่มอีกสองเส้น

ภารกิจตรวจฉบับ โหมด บทก่อนหน้า และเหตุที่เกิดในฉากจริง ไม่ใช้แค่การพูดชื่อภารกิจ ผู้เล่นเปลี่ยนผลของเรื่องได้ หากเหตุสำคัญถูกป้องกัน ระบบจะไม่บังคับฆ่าตัวละครเพื่อซ่อมเส้นเรื่อง บทที่ขาดเงื่อนไขจะรอหรือพักไว้ การไม่รับภารกิจไม่หยุดชีวิตของ NPC

ภาพเป็นไฟล์ฝังในการ์ด ใช้กรอบ 1:1 และเลือกภาพที่เห็นใบหน้ากับคอ/เสื้อเท่าที่มี บางตัวละครไม่มีภาพหน้าเผยแพร่ เช่น Beyond Birthday ไม่มีการเอาหน้า L มาอ้างเป็นหน้าจริง คนที่หาใบหน้าไม่ได้จะเว้นภาพไว้ รายชื่อภาพและแหล่งที่มาอยู่ใน [source-map.json](data/source-map.json) และใน metadata ของการ์ด ภาพอ้างอิงเป็นผลงานของเจ้าของสิทธิ์แต่ละราย ปกเป็นภาพสร้างใหม่

สมุดไม่ได้เข้ากระเป๋าฟรี: ต้องพบและเลือกหยิบในโรล ผู้ถือกับเจ้าของสิทธิ์แยกกัน ชื่อที่ได้ยินอาจเป็นชื่อปลอม ชื่อจริงและการจำหน้าแยกกัน ดวงตาไม่ได้เปิดให้ตั้งแต่ต้นและไม่แสดงวันตายเดิมที่ไม่มีข้อมูล ห้ามถือวันตายด้วยสมุดในต้นฉบับเป็นอายุขัยธรรมชาติ

กติกาพิเศษอย่าง Death Eraser ของ Pilot และการเผาหน้าเฉพาะฉบับ US เป็นเหตุในโรลตามฉบับนั้น ไม่มีปุ่มเฉพาะเพิ่มใน Addon และปุ่มล้างหน้ากระดาษไม่ทำให้คนฟื้น การเปลี่ยนกฎขายสมุดของ a-Kira ต้องเกิดตามเวลาในเรื่อง ไม่ใช้ย้อนหลังกับยุคก่อน

**BANK / CASH / COIN** ใช้กระเป๋าแบบหน่วยแลกกันของ RoleForge: 1 BANK = 100 CASH = 10,000 COIN ยอดเริ่มต้นศูนย์จนกำหนดทรัพย์สินในการสร้างตัวละคร **ยังไม่ใช่บัญชีธนาคาร/เงินสดแยกที่ห้ามใช้แทนกัน**

การเลือก Campaign ตั้งเวอร์ชันเริ่มต้นเป็นข้อมูลเฉพาะแชท ไม่เปลี่ยนแฟ้มต้นฉบับหรือสถานะเคยพบ/เปิดติดตาม สามารถดูข้อมูลต้นฉบับใน NPC Management → ⋯ → Characters ส่วนเวอร์ชันช่วงชีวิตถัดไปเลือกเองในตัวจัดการ หรือให้ข้อมูลสถานะพัฒนาจากเหตุจริงในโรล ชื่อที่ผู้เล่นยังไม่รู้จะถูก Addon ปิดบังไว้

## English

Import either the single PNG card or the JSON alternative into SillyTavern with RoleForge 0.82.2+. Both embed the same world archive, portraits, presets and missions. Open **Wand → Campaign**, choose a source and canon/free play, then complete Character Creation. The card prepares the bundled Death Note addon once for this chat and respects later explicit disable. It grants no notebook, eye deal, funds, relationships or secret identities. Your model connection stays under your control.

208 character references, 652 adaptation/period dossiers, 65 Lore entries and 146 authored mission chapters across 13 isolated routes. Brief incidental references retain unknown facts rather than inventing complete biographies. Source-specific pilot/US-film exceptions remain narrated events without dedicated addon controls. BANK/CASH/COIN are convertible wallet denominations, not independent bank/cash accounts. Missing or unpublished faces remain blank. All portrait provenance is included; no external portrait download is required during play.

## Build and validation

`node cards/death-note-rpg/tools/build.mjs` builds PNG and JSON, checks every subfile hash, validates the World Pack and Story schemas, checks all 13 routes in canon and free mode, and confirms PNG metadata round-trips. Raster assets remain unchanged; framing lives in RoleForge metadata.

`node cards/death-note-rpg/tools/build-no-portraits.mjs` builds the separate no-portrait edition from that card without changing the original. It strips images from all base/alternate NPC records, repacks and checks the archive, and embeds the ten Thai greetings. `node --test tests/death-note-no-portraits.test.mjs` compares all NPC facts, every version and all Lore/mission bytes with the original. `node tests/death-note-no-portraits.real.browser.mjs` tests native JSON/PNG import, all ten greeting swipes, the source selector and image-free dossiers on desktop and touch-emulated mobile; it makes no provider-generation requests.

Native validation: `node tests/death-note-card.real.browser.mjs` and repeat with `DN_CARD_FILE=.../Death-Note-RPG.png`. The tests use real SillyTavern import, Worker storage, Campaign and NPC Management, with fresh desktop and touch-emulated mobile browser contexts. Provider generation is controlled separately; this is not a physical iPhone test or a claim that every model follows the instructions perfectly.

ภาพจาก SillyTavern: [เลือกเส้นเรื่องบนคอม](screenshots/desktop-campaign.png) · [เลือกบนมือถือ](screenshots/mobile-campaign.png) · [Portrait บนคอม](screenshots/desktop-portrait.png) · [Portrait บนมือถือ](screenshots/mobile-portrait.png)


อัปเดตสำหรับ RoleForge 0.83.0: ตั้งค่าดวงตาผู้เล่นและ NPC ใน Workshop → Death Note → ตั้งค่า ได้ทั้งแบบแลกและไม่ผ่านข้อตกลง Beyond Birthday ระบุเป็นมนุษย์ที่มีดวงตาตั้งแต่เกิด ไม่ได้รับสมุดอัตโนมัติ แต่ละเล่มเก็บรหัสเดิมและแยกยมทูตดั้งเดิม เจ้าของปัจจุบัน ผู้ติดตาม ผู้ถือ และสิทธิ์มนุษย์ไว้ การ์ดเก่ารองรับการอ่านข้อมูลเดิม ไม่ต้องนำเข้าใหม่เพื่อใช้ระบบใหม่ หากต้องการ metadata ฉบับใหม่ใช้ไฟล์ build นี้กับแชทใหม่ โดยเก็บแชทเก่าไว้ได้
