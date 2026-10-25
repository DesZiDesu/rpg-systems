# Pokémon · Preview 0.2.0

งานอยู่ใน branch `preview/pokemon-addon` โดยรวมฐาน RoleForge 0.86.0 แล้ว ยังไม่รวม Pokémon เข้า main

[อ่านระบบใหม่ วิธีลอง ขอบเขต และโปรโตคอล AI](UPDATE-0.2.0.th.md)

[ภาพรายชื่อ Legendary / Mythical และสนาม](reference.html) · [แผนและผลการพัฒนา](EXPANSION-PLAN.th.md)

## เริ่มลอง

ใช้ runtime สาขา preview ในสำเนา SillyTavern เปิด Workshop → Pokémon → ติดตั้ง/อัปเดต 0.2.0 → เปิดสำหรับการ์ด นำเข้าการ์ดตัวอย่าง `Pokemon-Preview-Adventure.json` หรือ `Pokemon-Feature-Tour.json` เพื่อเริ่มข้อมูลรายตัวแบบใหม่

หน้าบริการรวม Center ฝึกท่า Trainer/Gym ภารกิจ Sandbox และคลังร่วม ตั้งค่ามีทางเข้าจาก Workshop ด้วย ปุ่มย่อบนหัวหน้าต่างใช้เหนือ Chatbar ได้ มือถือเต็มจอ

ข้อมูลการเล่นอยู่ใน metadata ของข้อความ ไม่สุ่มค่าใหม่หลังรีโหลด Branch อ่านเพียงประวัติถึงจุดที่เลือก และปิด Addon แล้วเก็บบันทึกไว้

## ตรวจและสร้างวิดีโอ

```sh
npm test
npm run check
node tests/pokemon-v2.real.browser.mjs
PK_RECORD=1 PK_ARTIFACTS=/workspace/artifacts/pokemon-v2/recordings node tests/pokemon-v2.real.browser.mjs
PK_RECORDINGS=/workspace/artifacts/pokemon-v2/recordings PK_SHOWCASE=/workspace/artifacts/pokemon-v2/showcase node tests/build-pokemon-v2-showcase.mjs
```

วิดีโอ PC 1920×1080 (16:9) และ iPhone 1170×2532 ใช้ซับไทยขนาดใหญ่พร้อมสารบัญ แสดงกลไกและปุ่มจริงใน SillyTavern ฉากสถานที่และคำตอบบรรยายเป็น fixture / controlled SSE ไม่ใช้โมเดลหรือ Voice ภายนอก มือถือเป็น browser emulation

ดูแหล่งข้อมูลและภาพใน `src/workshop/pokemon/CREDITS.md` และ license ใน `src/workshop/pokemon/data/LICENSE-PokeAPI.txt`
