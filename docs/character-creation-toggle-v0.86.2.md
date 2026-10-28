# Addon character creation — 0.86.2

Open **Workshop → Death Note → Configure → Use addon character creation**. The same switch is also available on the addon detail page. It saves immediately for every chat of the selected character.

- **On** uses the addon creator. This remains the default for existing installations.
- **Off** uses the standard RoleForge creator. The addon stays enabled.
- Switching preserves a separate draft for each creator, including addon choices and standard RoleForge loadouts. It changes presentation only; it does not erase existing story progress, possessions or abilities.
- The creator is not replaced during opening generation. A new first reply still closes it normally.
- Backup/export/import preserve the preference through Workshop's existing character settings storage.
- The Pokémon preview has its own independent switch in Workshop details and Pokémon settings. Its engine, catalogue and artwork remain outside main.

## ภาษาไทย

ไปที่ **Workshop → Death Note → ตั้งค่า → ใช้หน้าสร้างตัวละครของ Addon** หรือดูที่หน้ารายละเอียด Addon สวิตช์บันทึกทันทีสำหรับทุกแชทของการ์ดนี้

เปิดเพื่อใช้หน้าสร้างเฉพาะของ Addon ปิดเพื่อใช้หน้าสร้าง RoleForge มาตรฐาน โดยยังเปิดใช้งาน Addon ตามปกติ เก็บร่างของแต่ละแบบแยกกัน ไม่ลบข้อมูลโรลหรือสิ่งที่ได้รับไปแล้ว ค่าเริ่มต้นคือเปิดเพื่อรักษาพฤติกรรมเดิม

Pokémon ที่อยู่ในพรีวิวมีสวิตช์แยกของตนเองด้วย และยังไม่รวม Addon Pokémon เข้า main

## Validation

- Full automated suite: 1,883 passed, zero failures/skips. After the final live-opening guard adjustment, 256 relevant host/creation/Workshop tests passed again.
- `npm run check` and `git diff --check` passed.
- SillyTavern 1.19.0: Chromium desktop/mobile and WebKit mobile passed. Verified full-field choices, toggling, preference reload, separate draft restoration, addon still enabled, and a real owned notebook/innate eyes after creation.
- Pokémon preview: mobile checks passed for both independent toggles, restoring selected region/starter/nickname, real party/kit initialization, and the two-addon chooser. Its engine remains outside main.
- AI replies use controlled SSE fixtures. Mobile is touch browser emulation, not a physical iPhone. The final WebKit run uses the host's real local tokenizer endpoint.
