# Death Note — refined chat preview

พรีวิวรอบใหม่ให้ตรวจหน้าตาก่อน ยังไม่ติดตั้งธีมใน RoleForge และยังไม่รวมเข้า `main` ไฟล์ `Death-Note-Refined-Preview.html` เปิดในเบราว์เซอร์ได้โดยตรง รวมฟอนต์และภาพไว้ในไฟล์เดียว

## ดีไซน์

- Header เป็นป้ายชื่อมุมตัด มีเส้นบางสมมาตรสองฝั่ง และ Dialogue เป็นกรอบเส้นเดียวตัดมุมทแยง ไม่มีแถบสีด้านข้าง
- Header / Narrative / Dialogue / Thoughts ของ NPC, User และ Shinigami ใช้ชุดตัวอักษรเดียวกัน ยมทูตใช้แดงหม่นเฉพาะจุด
- ไม่เพิ่มป้าย “ผู้เล่น + ชื่อ” ซ้ำในข้อความ User ของ SillyTavern
- Scene Tracker แสดงสถานที่ เวลา อากาศ อุณหภูมิ และผู้ร่วมฉากก่อน ส่วนข้อมูลอื่นกดเปิดอ่านได้ครบ
- Voice Addon **เริ่มปิดในพรีวิว** ปิดแล้วไม่มีแถวเสียง ปุ่มแก้บทพากย์ หรือช่องว่างของแถวนั้น
- เปิด Voice แล้วมีไอคอนเวกเตอร์ Play/Pause/Cancel และปากกาแก้บทพากย์ของคำบรรยายกับบทพูด ปุ่มมีพื้นที่แตะ 44 × 44 px ตามพฤติกรรมเดิมของ Voice Addon ซึ่งพากย์ข้อความ AI ไม่เพิ่มเสียงให้ข้อความ User
- ไทย/อังกฤษ, ขยายข้อความ, พับความคิด, reduced motion และจอแคบ

ธีมนี้เสนอให้เลือกได้เฉพาะเมื่อเปิด Death Note Addon การปิด Addon ต้องกลับธีมเดิม และต้องใช้ชื่อ/ใบหน้าที่ผู้เล่นรู้จริงจากระบบ Known Name เดิม การตกแต่งไม่เผยชื่อจริงหรือเผ่าที่ผู้เล่นยังไม่รู้ Thoughts เป็นข้อความตัวละครที่เขียนเป็นส่วนหนึ่งของโรล ไม่มีการอ่าน reasoning ลับของโมเดล

## ตรวจสอบใน SillyTavern

ใช้ SillyTavern 1.19.0 / RoleForge 0.82.1 กับโปรไฟล์ทดสอบแยก ข้อความและการ์ดเป็น fixture ไม่มีคำขอเจนข้อความจริงไปยังโมเดล

- Gallery: 320, 390, 768, 1440 px ภาษาไทย/อังกฤษ เปิดและปิด Voice, ข้อความยาว ขยายฟอนต์ และพับรายละเอียดฉาก
- Native: คอม 1440 × 1050 และมือถือ Chromium touch emulation 390 × 844 **ไม่ใช่ iPhone/Safari จริง**
- เปิด/ปิด Voice ผ่านการตั้งค่าจริง ปุ่มใหม่เชื่อมกับ Speech Editor และการเล่นเสียงเดิมของ RoleForge
- HTTP ของ ElevenLabs ถูกแทนด้วย local fixtures และไฟล์เสียงทดสอบในเครื่อง ตรวจ loading/play/pause/resume โดยไม่ใช้บัญชีหรือโควตาจริง
- เมื่อปิด Voice จำนวนปุ่มเสียงเป็นศูนย์และความสูงข้อความกลับเท่าเดิม
- Scene Tracker ใช้ snapshot จาก scene history จริงในแชท fixture ข้อมูลรายละเอียดไม่หายเมื่อพับ
- ตรวจข้อความโรล ค่าสถานะ และข้อความร่างก่อน/หลัง ไม่เปลี่ยนค่า
- ปิด Death Note Addon แล้วเอารูปแบบทดลองออก พร้อมคืน DOM เดิมที่ยังเก็บอยู่

ภาพอยู่ใน `screenshots/` และผลตรวจอยู่ใน `validation/`

## โค้ดพรีวิว

ไม่มี production module import โค้ดนี้ Native bridge ทำงานเฉพาะข้อความทดสอบที่มี marker `extra.roleforge_quiet_ink` จึงไม่ได้เพิ่มธีมให้แชทผู้ใช้จริง

```sh
node docs/previews/death-note-quiet-ink/verify-gallery.mjs
node docs/previews/death-note-quiet-ink/verify-native.mjs
node docs/previews/death-note-quiet-ink/build-preview.mjs
node docs/previews/death-note-quiet-ink/verify-offline.mjs
```

Native tests ต้องชี้ไปที่โปรไฟล์ SillyTavern ทดสอบใน localhost เท่านั้น มีการนำเข้าการ์ด fixture และปรับการตั้งค่า Voice ในโปรไฟล์นั้น `DN_ST_HOST`, `DN_QUIET_URL`, `DN_QUIET_OUTPUT` ใช้เปลี่ยนปลายทางและตำแหน่งผลตรวจได้

`fixtures/playback-test.mp3` เป็นเสียงสังเคราะห์ทดสอบในเครื่องจาก Flite ที่ใช้ตรวจวงจรการเล่นเสียง ไม่ใช่เสียงตัวละครหรือเสียงจากบัญชี ElevenLabs

English: isolated visual review, not an installed runtime update. Voice is off by default. The offline HTML includes fonts and real-host screenshots. Gallery playback demonstrates UI states only; native verification binds the actual Voice Addon to intercepted local audio fixtures. Mobile checks use Chromium touch emulation, not physical iOS Safari. No live model or voice provider is called.
