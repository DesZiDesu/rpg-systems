# Pokémon 1.8.0 / RoleForge 0.91.0

## หลังจบการต่อสู้

- **Header ไม่หาย:** หลังกด Run จับได้ หรือชนะ ข้อความเก่าที่มี Pokémon คู่ต่อสู้ยังแสดง Header ของตัวนั้นด้วยค่าล่าสุด แทนที่จะขึ้นเป็นรหัส `pokemon:wild-…` ตัวที่จับได้จะชี้ไปที่ตัวในทีมของผู้เล่น
- **หมดสภาพ = กลับเข้าบอล:** โปเกมอนของผู้เล่นที่ HP เหลือ 0 จะไม่อยู่นอกบอลอีก AI ได้รับ `faintedParty` และกติกาว่าตัวนั้นไม่อยู่ในฉาก ห้ามพูด ห้ามขยับ และห้ามต่อสู้จนกว่าจะรักษา ถ้าทั้งทีมหมดสภาพ AI จะได้ `canBattle: false`
- **แชทหลักรู้ผลการต่อสู้:** เมื่อจบศึก AI ได้บันทึกครบ ได้แก่ผล สถานที่ จำนวนเทิร์น HP สุดท้ายของแต่ละตัว คู่ต่อสู้ และเหตุการณ์ในศึก
- **บรรยายต่อไม่ทับข้อความเดิม:** SillyTavern บันทึกการต่อข้อความจากสำเนาที่ส่งให้ AI ซึ่งอาจถูก Regex แบบ prompt-only แก้ไป ระบบจะนำข้อความใหม่มาต่อท้ายข้อความเดิมที่ไม่ถูกแก้ ทั้งแบบ streaming และไม่ streaming

## NPC มีทีมโปเกมอนของตัวเอง

- **ทีมตายตัว:** NPC เทรนเนอร์แต่ละคนมีทีมเดียว ใช้ตัวเดิมทุกครั้ง (Nature และค่าสเตตัสเหมือนเดิม) สายพันธุ์ไม่เปลี่ยน เลเวลขึ้นได้อย่างเดียว และเพิ่มสมาชิกได้เมื่อเนื้อเรื่องแสดงเท่านั้น
- **ที่มาของทีม:** การ์ดกำหนดได้ด้วย `npcTeams` หรือ AI ประกาศด้วยเหตุการณ์ `roster` ตอน NPC ปรากฏครั้งแรก ตัวละคร canon ใช้โปเกมอนตามต้นฉบับ ตัวละครใหม่ได้ทีมที่เหมาะสม ถ้าไม่มีใครประกาศ ระบบสร้างทีมประจำภูมิภาคจากชื่อ NPC ซึ่งได้ทีมเดิมทุกครั้ง
- **แสดงผล:** ดูทีมได้ที่ Services → Trainers → Known trainers โปเกมอนของ NPC มี Header ในแชทได้แม้ไม่อยู่ในศึก

## ขอประลองในโรลแล้วเริ่มศึกจริง

- **คำขอของผู้เล่นนับเป็นการยินยอม:** เมื่อผู้เล่นพิมพ์ เช่น "Canari, battle me!" หรือ "มาประลองกัน" แล้วคำตอบถัดไปมี Trainer event ศึกจะเริ่มทันที คำว่า "ไว้ก่อน" หรือการปฏิเสธจะไม่เริ่มศึก
- **ไม่ต้องระบุทีม:** โปรโตคอลเวอร์ชัน 5 ใช้ทีมประจำตัวของ NPC ได้เลย
- **ระบบสำรอง:** ถ้า AI ไม่ใส่ข้อมูลซ่อนเลย แต่เนื้อเรื่องเริ่มศึกแล้ว (เช่น "Canari sends out Pikachu!", "ส่ง … ออกมา") ศึกจะเริ่มได้ ระบบสำรองนี้ใช้กับคำตอบที่ได้รับหลังอัปเดตเท่านั้น แชทเก่าจะไม่มีศึกเพิ่มขึ้นมาเอง

## ชุดภาพตามเวอร์ชันเกม

- **ที่ตั้งค่า:** Settings → Pokémon art style → Game version sprites มี 38 แบบ ตั้งแต่ Gen I Red & Green, Yellow GBC, Crystal และ Emerald (เคลื่อนไหว), Platinum, Black & White, X & Y, Ultra Sun/Ultra Moon, Sword & Shield, Legends: Arceus, Scarlet & Violet, Legends: Z-A, Champions, Showdown ไปจนถึง HOME, Official artwork และ Dream World
- **มีผลทุกหน้าจอ:** ทีม, Pokédex, กล่อง, หน้ารายละเอียด, ภาพหน้าและหลังใน battle และ Header ในแชท
- **ถ้าเกมนั้นไม่มีภาพ:** ใช้เกมที่ใกล้ที่สุดในตระกูลเดียวกัน (พิกเซล, 3D หรือ HD) ภาพเคลื่อนไหวใช้ภาพเคลื่อนไหวก่อน ไม่สลับสีหรือฟอร์ม ตัว Shiny ได้ภาพ Shiny เสมอ ชุด artwork ไม่มีภาพหลัง ฝั่งผู้เล่นจึงใช้โมเดล HD ของ Gen IX
- **โมเดล 3D ขนาดใหญ่:** ชุดตั้งแต่ Sword & Shield ถึง Champions และ Let's Go มีไฟล์ละ 1.4–5.7MB จะเคลื่อนไหวเฉพาะใน battle, แชท และภาพใหญ่ หน้ารายการใช้ภาพนิ่ง HD ของ HOME ถ้าปิด Motion จะไม่มีภาพเคลื่อนไหวเลย
- **ที่มาของภาพ:** ทุกภาพมาจาก PokeAPI/sprites revision `97a7832d` ตรวจครบ 4,565,356 URL ทุกตัวมีไฟล์จริง และไม่มีครั้งไหนแสดงสีผิด ภาพยังโหลดเมื่อเปิดดูเหมือนเดิม

## โอกาสพบ Shiny

- **ตัวเลือก:** Settings → World & journey → Shiny encounter odds มีให้เลือก 1/8192 (คลาสสิก), 1/4096 (ค่าเริ่มต้น เท่าเกมปัจจุบัน), 1/1365 (Shiny Charm), 1/512, 1/100 และ 1/20
- **ไม่เปลี่ยนตัวเก่า:** ค่านี้ถูกบันทึกลงแชท จึงมีผลเฉพาะโปเกมอนป่าที่พบหลังเปลี่ยน ตัวที่พบหรือจับแล้วคงสีเดิม และย้อนตาม swipe/ลบได้
- **เฉพาะตัวป่า:** โปเกมอนของ Trainer ใช้โอกาสมาตรฐาน
- **แจ้งเตือน:** เมื่อพบตัว Shiny หน้าสู้จะขึ้น "✦ Shiny!" และบันทึกการเดินทางระบุว่าเป็นสีพิเศษ

## การตรวจสอบ

- **ชุดทดสอบ:** 2,218 รายการผ่าน รวมทดสอบใหม่ของ battle aftermath, NPC rosters, ชุดภาพ และโอกาส Shiny พร้อม `npm run check` และ `git diff --check`
- **SillyTavern 1.19.0 จริง** ทั้งคอมและ Chromium จำลองมือถือ:
  - Run แล้ว Header ยังอยู่
  - หมดสภาพแล้วกลับเข้าบอล
  - บรรยายต่อพร้อม Regex แบบ prompt-only
  - พิมพ์ "Canari, battle me!" แล้วกดส่ง และศึกยังอยู่หลังรีโหลด
  - Metagross Shiny ใน 10 ชุดภาพ
  - ตั้งโอกาส 1/20 แล้วพบ Shiny และค่ายังอยู่หลังรีโหลด
- **ข้อจำกัด:** คำตอบของ AI ในการทดสอบเป็นข้อความควบคุมที่ส่งผ่านระบบ chat-completion ของ SillyTavern ไม่ได้เรียกโมเดลจริง และไม่ได้ทดสอบบน iPhone จริง ผลอยู่ใน [validation.json](previews/pokemon-0.91.0/validation.json)

| | ภาพ |
| --- | --- |
| Header หลัง Run | [ก่อน](previews/pokemon-0.91.0/header-before-run-mobile.png) · [หลัง](previews/pokemon-0.91.0/header-after-run-mobile.png) |
| หมดสภาพ | [PC](previews/pokemon-0.91.0/fainted-desktop.png) |
| NPC ท้าประลอง / ทีมประจำตัว | [มือถือ](previews/pokemon-0.91.0/npc-battle-mobile.png) · [Known trainers](previews/pokemon-0.91.0/npc-rosters-desktop.png) |
| ชุดภาพ | [Scarlet & Violet](previews/pokemon-0.91.0/style-scarlet-violet-desktop.png) · [Platinum](previews/pokemon-0.91.0/style-platinum-desktop.png) · [มือถือ](previews/pokemon-0.91.0/style-scarlet-violet-mobile.png) · [Settings](previews/pokemon-0.91.0/style-settings-desktop.png) |
| Shiny | [PC](previews/pokemon-0.91.0/shiny-battle-desktop.png) · [มือถือ](previews/pokemon-0.91.0/shiny-battle-mobile.png) · [Settings](previews/pokemon-0.91.0/shiny-settings-desktop.png) |

## อัปเดต

อัปเดต RoleForge จาก main เป็น 0.91.0 แล้วรีโหลด SillyTavern จากนั้นไปที่ Workshop → Pokémon → Update 1.8.0 ไม่ต้องลบแชทหรือรีเซ็ตข้อมูล
