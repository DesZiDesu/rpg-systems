# Character Creation preview — QA

> บันทึกผลต้นแบบก่อนรวม main: ส่วน RoleForge/Death Note นำเข้าใน 0.86.1 แล้ว ส่วน Pokémon ยังอยู่ในสาขาพรีวิว ดูสถานะส่งมอบและผลทดสอบรุ่น main ใน `docs/character-creation-v0.86.1.th.md`


- Base: Pokémon preview `4987203`; branch: `preview/addon-character-creation`. Main unchanged.
- Full unit suite: **1,944 passed / 0 failed / 0 skipped**. After the final scoped deletion-marker hardening, 255 relevant host/branch/creation tests passed again.
- `npm run check` and `git diff --check` passed.
- Original RoleForge browser regression: widths 320 / 390 / 1280 passed. Existing presets and selected values retained.
- Native SillyTavern 1.19.0: Chromium and WebKit desktop/mobile passed. Additional 320px mobile passed. No errors or warnings in final native reports.
- Real UI flow: delete the prewritten greeting, open creator, whole-field choice sheet, autosave and reload, Death Note one-book/non-deal-eye state, Pokémon real party/kit, world switch and language switch.
- Deleted-greeting recovery checks the exact hash, chat ID, card avatar and ungenerated greeting. It refuses new AI replies, another card, group chats and another branch.
- Opening-generation replies are controlled SSE fixtures; no external AI or Voice calls. Mobile evidence uses browser touch emulation, not a physical iPhone.
- MP4 delivery verified: H.264 / yuv420p / square pixels; PC 1920×1080, 210.688s; mobile 1170×2532, 160.375s; 17 embedded chapters each. Browser gallery tested at PC and mobile widths, chapter seeking and no horizontal overflow passed.

Screenshots and MP4s are provided in the separate showcase ZIP rather than committed as repository binaries. The capture and build scripts are versioned under `tests/`.
