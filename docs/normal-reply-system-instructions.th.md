# v0.51.5 — Instruction ทุกระบบในคำตอบปกติ

เดิมมี instruction อยู่แล้ว ไม่ใช่ไม่มี prompt เลย แต่คำสั่ง Header บอกให้ส่ง scene ก่อนเนื้อเรื่องและ event หลังบล็อก ขณะที่ protocol ส่วนอื่นให้รวมไว้ท้ายคำตอบเดียวกัน อีกทั้งคำสั่งและตัวอย่างอยู่รวมกับ state/reference ขนาดใหญ่ ตัวอย่างทั่วไปไม่ได้แสดง auction/marketplace และ generation interceptor ไม่ใช้ outgoing chat/type ที่ SillyTavern ส่งมา ในคำตอบดิบที่ผู้ใช้ให้มา มีเนื้อเรื่องและบทพูด แต่ไม่มี tretaresia_patch แม้ Thinking กล่าวถึง module การประมูล

นี่เป็นหลักฐานว่าคำตอบนั้นไม่ได้ส่ง payload ที่ UI ต้องใช้ ยังไม่ใช่หลักฐานว่าทุก provider ละเลย instruction ด้วยเหตุผลเดียวกัน การแก้ครั้งนี้จึงตรวจทั้ง prompt ที่ส่งออกจริง รูปแบบข้อมูลที่สอน และตัวอ่านคำตอบ

## สิ่งที่แก้

เพิ่ม `tretaresia_rpg_response_contract` เป็น SYSTEM injection แบบ IN_CHAT depth 0 แยกจาก state ที่ depth 1 ผ่าน `setExtensionPrompt` และ refresh ใน official `generate_interceptor` ตอน normal, swipe และ regenerate โดยใช้ outgoing history/type จริง คำสั่งนี้บอกให้จบเนื้อเรื่องก่อน แล้วส่ง **comment เดียวที่ปิดครบ** `<!--tretaresia_patch:{...}-->` ภายนอก tr-header/tr-dialogue/tr-narrative และต้องอยู่ใน final answer ด้วย ไม่ใช่กล่าวว่าจะทำใน Thinking

State reference เดิมยังส่งรายละเอียด canonical paths, IDs, field constraints และข้อมูลที่บันทึกแล้ว คู่มือใหม่บอกแต่ละระบบว่าควรใช้เมื่อไหร่ ส่งตรงไหน และห้ามทำอะไร พร้อมตัวอย่าง comment สำหรับซื้อ ขาย ประมูล หรือ interaction ที่เปิดอยู่ตามบริบทจริง ระบบเสริมที่ปิดจะไม่ถูกสอนว่าใช้งานได้

| ระบบ | เมื่อไหร่และข้อมูลที่ส่ง |
| --- | --- |
| Header / Dialogue / Narrative | เนื้อเรื่องใช้ tr-header, tr-dialogue, tr-narrative ตามการตั้งค่า; JSON อยู่นอกบล็อก |
| Scene Tracker | sceneTracker ใน patch เดียวกัน; ฉากแรกต้องครบ 19 fields ฉากต่อไปส่งสิ่งที่เปลี่ยนและ fields ที่ยังขาด |
| ตัวละคร / อาชีพ / Origin | set canonical player fields ตามข้อเท็จจริงที่ยืนยัน |
| HP / MP / Stamina / Hunger / Thirst / Condition | set/inc เมื่อเกิดผลจริงจากความเสียหาย การใช้พลัง การกิน ดื่ม รักษา หรือพัก |
| Aura / Fitness / Custom Powers | canonical scalars หรือ customPowers ของ preset ที่ผู้ใช้กำหนดเท่านั้น |
| EXP / Rank / Reputation / Kills | inc/set พร้อมเหตุผล; level/reward ที่ extension คำนวณไม่เพิ่มซ้ำ |
| เงิน / Inventory / Equipment / Constructs | ops พร้อมเหตุผลตามการรับ/ใช้จริง; catalog ไม่โอนเงินหรือของ |
| Skill / Magic / Sword / Technique | skills ใช้ rank; proficiencies ใช้ proficiency ตามการเรียน/ฝึกจริง |
| NPC / ความสัมพันธ์ / สถิติ / Ability / Meter | npcs, npcValues, npcAbilities, npcMeters พร้อม canonical NPC ID |
| NPC Knowledge / Activity | npcKnowledge เฉพาะสิ่งที่ NPC ได้เรียนรู้จริง; ไม่สร้างชีวิตนอกฉากจากข้อมูลลับ |
| NPC Diary | append npcDiary เมื่อเข้าเงื่อนไขการพบ NPC และความถี่; OFF ห้ามส่ง |
| Contact / Letter | contacts และ letters เมื่อมีการติดต่อ/จดหมายจริง; บทพูดไม่ใช่จดหมาย |
| Party / Guild / Household | offer invitation เมื่อเชิญจริง; ยังไม่เป็นสมาชิกก่อนยอมรับ; สมาชิกที่ยืนยันแล้วใช้ established membership |
| Quest / Mission / Dungeon | quests ตามการรับและความคืบหน้าจริง; reward จ่ายครั้งเดียวตาม receipt |
| Combat / Effect | combatLogs และ effects เมื่อมี hit/injury/buff จริง พร้อม HP ที่ได้รับผล |
| Travel / Location / Weather / Local Map | canonical travel, journey, locations, regionalWeather และ scene map collections จากหลักฐานในเรื่อง |
| H-Stats | npcHStats/playerHStats เฉพาะ supported fields และข้อเท็จจริงที่ยืนยัน |
| Auction | top-level auction พร้อม lots, ราคาเป็นตัวเลข, งบจริงของคู่แข่ง และ currentBid/currentBidder หากมีการบิดแล้ว |
| Buy | marketplace.kind = npcShop เมื่อ NPC เสนอขายหรือแสดงสินค้า/ราคา |
| Sell | marketplace.kind = npcPurchase เมื่อ NPC เสนอรับซื้อของที่ผู้เล่นมี |
| การโรลระหว่างซื้อ/ขาย/ประมูล | commerce พร้อม sessionId/revision และ decision; ไม่สร้าง catalog ซ้ำหรือโอนของผ่าน ops ซ้ำ |
| Mission Board | missionBoard สูงสุด 4 รายการ; ยังไม่รับภารกิจเพียงเพราะอ่านบอร์ด |
| Guild / Party Board | groupBoard สูงสุด 12 รายการ; pageSize 1–6 ค่าเริ่มต้น 3 |
| เรื่องสำคัญ / สัญญา / ความลับ / เรื่องค้าง | storyMemories ใน ops พร้อมหลักฐานและ status |
| นัดหมาย / Deadline | storyAgenda ตามวันเวลาในเรื่อง; ไม่เดาวันที่หากข้อมูลไม่พอ |
| Quest Checklist | objectives ใน quest ใหม่; questObjectives สำหรับความคืบหน้าของเป้าหมายเดิม |
| Memory Summary / Power Mastery | ใช้ reference/results ของ task เดิม; ไม่สร้าง summary หรือเล่น reward ซ้ำใน story patch |
| Portrait / Preset / Scope / Backup / Settings | ผู้ใช้จัดการผ่าน UI; AI ห้ามสร้าง control operations แทน |

ราคาใน JSON ต้องเป็นตัวเลข แต่บทพูดเขียน “สิบเหรียญเงิน” ได้ ตัวอ่าน evidence ของ Auction/Buy/Sell และ opening recovery รับราคาภาษาไทยที่เขียนเป็นคำแล้ว โดยยังตรวจคนขาย/คนซื้อ ของที่ถืออยู่ และฉากปัจจุบัน ไม่ตีความแผนอนาคตเป็นการซื้อขายจริง

คำตอบใหม่ที่มีข้อมูลครบเปิด UI ได้ใน turn นั้น การโรลต่อใช้ commerce ในคำตอบปกติเดียวกัน ไม่มี task API เพิ่มเพื่อเปิด catalog ที่ครบแล้ว ปุ่มเกมยังเรียก API ตาม flow เดิม และระบบ opening recovery ที่ทำไว้ยังอยู่ตามคำสั่งผู้ใช้ หากคำตอบจบแต่ยังไม่ครบ แถบแจ้งให้ Swipe/Regenerate แทนการแสดงว่ารอ AI ตลอด ทั้งนี้การตรวจสถานะซ้ำไม่เรียก API และไม่รีเซ็ตค่าที่กำลังพิมพ์

## การตรวจสอบ

ทดสอบ unit/host, production loader และ Main Chat DOM ที่ 320/390/1280 px: เปิดซื้อ/ขาย/ประมูลจาก reply เดียวโดยไม่มี task เพิ่ม, role-play ยืนยันและออกจาก interaction, written Thai prices, fixed budgets, swipe/regenerate rollback, เปิด/ปิดระบบ, invitation/boards/story receipts และ null regression ของเดิม

ตรวจ prompt ที่จับจาก official interceptor ด้วยฟังก์ชัน `getExtensionPrompt` และ `populationInjectionPrompts` จาก SillyTavern release commit `06bde939fb1e9c4c8d8641d810f0a916b5bce127`: ทั้ง 12 captures ของ buy/auction/regenerate/swipe ที่สามขนาดหน้าจอวางคู่มือใหม่เป็น SYSTEM หลัง user ล่าสุด และเก็บ state depth 1 ไว้ก่อนหน้า Source ของ host ใช้ตรวจใน scratch ไม่ได้รวมเข้า extension

คำตอบ provider ในชุดทดสอบเป็นข้อมูลจำลอง ยังไม่ได้เรียก provider ส่วนตัวที่ผู้ใช้ใช้อยู่ จึงยืนยันได้ว่าการประกอบ prompt, parsing, state และ UI ผ่านกรณีที่ทดสอบ แต่ไม่รับรองว่าทุก model จะทำตาม instruction ทุกครั้ง

อัปเดต extension เป็น v0.51.5 แล้ว reload หน้า จากนั้น Swipe หรือ Regenerate คำตอบที่ไม่มี patch ได้ ไม่ต้องล้างข้อมูล RPG
