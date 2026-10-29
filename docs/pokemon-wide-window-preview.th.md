# Pokémon · พรีวิวหน้าต่าง PC 16:9 และ Settings ใหม่

ภาพพรีวิวเดิมจากสาขา `preview/pokemon-desktop-169-settings` การจัดวางนี้รวมใน RoleForge 0.90.11 / Pokémon 1.6.1 แล้ว พร้อมปรับแผงเหนือ Chatbar และการเปิดสนามอัตโนมัติ ดู [รายงานอัปเดต](pokemon-ui-v0.90.11.th.md)

- หน้าต่าง PC ทั้งบานเป็น 16:9 เช่น 1680×945 บนจอ 1920×1080 และลดขนาดให้พอดีจอ สนามด้านในยังเป็น 16:9 โดยไม่ยืดภาพ
- ทีมเรียงแนวตั้งข้างสนามบน PC คำสั่งต่อสู้อยู่ด้านล่าง ในหน้าจอแคบมาก เนื้อหาจะเลื่อนภายในหน้าต่างเพื่อคงขนาดที่อ่านได้
- หัวหน้าต่างทั้ง Original และ Aperture ใช้ไอคอน Poké Ball แทน Pokémon / Your expedition
- Settings แบ่งเป็น Appearance, Experience, World & journey และ Journey tools ปุ่มอยู่ในแนวเดียวกัน มีภาพตัวอย่างธีม สวิตช์แบบเหลี่ยม และตารางเลือกภูมิภาค
- มือถือใช้หน้าต่างเต็มจอแนวตั้ง สนามยังเป็น 16:9 หน้า Settings เรียงคอลัมน์เดียวและเลื่อนถึงตัวเลือกท้ายหน้าได้

ทดสอบใน SillyTavern 1.19.0 ด้วยการ์ด QA และเหตุการณ์ควบคุม ไม่เรียกโมเดลหรือแก้แชทของผู้ใช้ ภาพมือถือเป็น browser emulation ไม่ใช่ iPhone จริง ตรวจ PC 1920×1080, 1440×900, 1366×768, 1280×720 และ 1024×768 ทั้งสองธีม ตรวจ Settings มือถือที่ความกว้าง 320/360/390/430px พร้อมทดสอบเปิด/ปิดเสียงและ Motion เลือกสนาม และเปิดคู่มือ ผล `npm run check` และ `git diff --check` ผ่าน

## PC

| หน้า | Original | Aperture |
| --- | --- | --- |
| สนามต่อสู้ | [ดูภาพ](previews/pokemon-wide-window/desktop-original-battle.webp) | [ดูภาพ](previews/pokemon-wide-window/desktop-classic-dark-battle.webp) |
| ตั้งค่า | [ดูภาพ](previews/pokemon-wide-window/desktop-original-settings.webp) | [ดูภาพ](previews/pokemon-wide-window/desktop-classic-dark-settings.webp) |
| ตั้งค่า · ท้ายหน้า | [ดูภาพ](previews/pokemon-wide-window/desktop-original-settings-bottom.webp) | [ดูภาพ](previews/pokemon-wide-window/desktop-classic-dark-settings-bottom.webp) |
| ทีม | [ดูภาพ](previews/pokemon-wide-window/desktop-original-team.webp) | [ดูภาพ](previews/pokemon-wide-window/desktop-classic-dark-team.webp) |
| Pokédex | [ดูภาพ](previews/pokemon-wide-window/desktop-original-dex.webp) | [ดูภาพ](previews/pokemon-wide-window/desktop-classic-dark-dex.webp) |
| กล่อง | [ดูภาพ](previews/pokemon-wide-window/desktop-original-storage.webp) | [ดูภาพ](previews/pokemon-wide-window/desktop-classic-dark-storage.webp) |
| กระเป๋า | [ดูภาพ](previews/pokemon-wide-window/desktop-original-bag.webp) | [ดูภาพ](previews/pokemon-wide-window/desktop-classic-dark-bag.webp) |

## มือถือ

| หน้า | Original | Aperture |
| --- | --- | --- |
| สนามต่อสู้ | [ดูภาพ](previews/pokemon-wide-window/mobile-original-battle.webp) | [ดูภาพ](previews/pokemon-wide-window/mobile-classic-dark-battle.webp) |
| ตั้งค่า | [ดูภาพ](previews/pokemon-wide-window/mobile-original-settings.webp) | [ดูภาพ](previews/pokemon-wide-window/mobile-classic-dark-settings.webp) |
| ตั้งค่า · ท้ายหน้า | [ดูภาพ](previews/pokemon-wide-window/mobile-original-settings-bottom.webp) | [ดูภาพ](previews/pokemon-wide-window/mobile-classic-dark-settings-bottom.webp) |
| ทีม | [ดูภาพ](previews/pokemon-wide-window/mobile-original-team.webp) | [ดูภาพ](previews/pokemon-wide-window/mobile-classic-dark-team.webp) |
| Pokédex | [ดูภาพ](previews/pokemon-wide-window/mobile-original-dex.webp) | [ดูภาพ](previews/pokemon-wide-window/mobile-classic-dark-dex.webp) |
| กล่อง | [ดูภาพ](previews/pokemon-wide-window/mobile-original-storage.webp) | [ดูภาพ](previews/pokemon-wide-window/mobile-classic-dark-storage.webp) |
| กระเป๋า | [ดูภาพ](previews/pokemon-wide-window/mobile-original-bag.webp) | [ดูภาพ](previews/pokemon-wide-window/mobile-classic-dark-bag.webp) |

[ผลตรวจรูปทรงหน้าต่าง สนาม และตำแหน่ง HP](previews/pokemon-wide-window/validation.json)
