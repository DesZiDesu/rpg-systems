# Death Note RPG — RoleForge 0.82.0

ตัวการ์ดอยู่ที่ `cards/death-note-rpg/build/Death-Note-RPG.png` และ JSON ทางเลือก ทั้งสองมี World Pack, ภาพ, presets และภารกิจครบในไฟล์เดียว ดูคู่มือและข้อจำกัดรายละเอียดที่ `cards/death-note-rpg/README.md`

การ์ดมี 208 ตัวละคร (39 แฟ้มละเอียด, 86 สนับสนุน, 83 แฟ้มอ้างอิงสั้น), 652 เวอร์ชัน/ช่วงชีวิต, 65 Lore, 146 บทภารกิจ และ 13 เส้นทางแยกกัน ภาพจริงที่ฝังได้มี 108 ตัวละครและภาพแยกบางฉบับ รวม 124 ไฟล์ภาพที่ใช้งาน ตัวละครที่ไม่มีภาพหน้าที่ตรวจได้เว้นภาพไว้ ไม่ใช้รูปคนอื่นมาสวมเป็นหน้าจริง

## Runtime

- เพิ่มภาพ NPC แบบ `portraitSource: embedded` / `portraitImage` รองรับ raster data URI ที่ตรวจรูปแบบและขนาด ไม่ใช้ remote image fetch ภาพเวอร์ชันต่าง ๆ พกไปกับการ์ดได้ การเปลี่ยนภาพเองและการเอาภาพออกยังมีผลตามเดิม AI เปลี่ยนภาพผ่าน patches ไม่ได้
- เพิ่ม `roleforge_campaigns` เป็นข้อมูลตัวเลือกฉบับจากการ์ด เปิดจากไม้กายสิทธิ์หรือการตั้งค่า ไม่มีสคริปต์จากการ์ด การเลือกบันทึกธงและเวอร์ชันเริ่มต้นเฉพาะแชท ไม่เปิดติดตาม NPC ไม่เปลี่ยน met ไม่ให้ไอเทม และไม่แก้แฟ้มฐาน ข้อมูล NPC ที่ยังไม่เปิดเก็บเป็น delta เล็ก ๆ ไม่คัดลอกภาพลง checkpoint
- เพิ่ม `roleforge_workshop` สำหรับขอเปิดเฉพาะ Addon ที่ RoleForge มีใน catalog ติดตั้งด้วยการตรวจ hash เดิม ห้ามใช้ URL หรือโค้ด Addon จากการ์ดโดยตรง บันทึกค่าครั้งแรกแบบ atomic จึงไม่เขียนทับการปิดเองจากอีกแท็บ และรอให้การตั้งค่าพร้อมก่อนส่ง generation
- ชื่อจริงของ Death Note รองรับชื่อแยกตามเวอร์ชัน และ `null` สำหรับชื่อเต็มที่ต้นฉบับไม่เปิดเผย ป้องกันเอารหัส A, Y462 หรือชื่อที่แต่งขึ้นมาอ้างเป็นชื่อจริง
- รวมตัวแก้ Workshop checksum จาก 0.81.2: CRLF/BOM แปลงกลับได้เฉพาะเมื่อ hash ตรงกับ catalog, `.gitattributes` บังคับ LF และ URL ดาวน์โหลดมี hash ป้องกันแคชต่างรุ่น

## การตรวจสอบ

- Build validator ตรวจ schema, hash ทุกไฟล์, decode archive กลับ, round-trip PNG metadata และเงื่อนไขทั้ง 13 ฉบับในโหมดตามเรื่อง/อิสระ
- Unit suite และ syntax check ของ runtime
- Native SillyTavern 1.19.0: JSON และ PNG ผ่าน import จริงใน browser ที่ยังไม่มี IndexedDB ของส่วนเสริม ทั้ง desktop และ mobile emulation เลือกฉบับ บันทึกเวอร์ชัน NPC เปิดรูปฝังใน NPC Management และ reload ได้ ภารกิจจาก completed-reply fixture เปิดเฉพาะเส้นที่เลือก
- Native Continue แบบ controlled delayed SSE: ปิดสมุดระหว่างรอข้อความได้ ข้อความมาต่อฝั่ง assistant เดิม ไม่มี User turn เพิ่ม ผ่านทั้ง desktop/mobile รวมกรณี request ล้มเหลวและลองใหม่
- Native Worker ติดตั้งครบสาม Addon จาก CRLF + BOM ได้ แพ็กแก้เนื้อหาถูกปฏิเสธ เก็บแพ็กเดิมและเคารพโปรไฟล์ที่ปิด Addon ไว้

การทดสอบมือถือใช้ Chromium touch emulation ไม่ใช่ Safari บน iPhone จริง Native generation ใช้ controlled SSE ไม่ได้อ้างว่าได้ตรวจทุกโมเดลภายนอก

## การจัดเก็บ

`data/*.mjs` เป็นข้อมูลที่เขียนขึ้นและจัดแหล่ง/ฉบับ, `assets/portraits` เก็บ reference image ต้นทาง, `data/portrait-sources.json` เก็บ URL/hash, `data/source-map.json` เก็บเฉพาะแหล่งภาพที่ใช้งานพร้อม NPC/version, `tools` เป็น builder/downloader/PNG metadata codec และ `build` เป็นไฟล์สำหรับผู้เล่น ไม่เก็บ credential, chat history ของผู้เล่น หรือ browser database ในการ์ด
