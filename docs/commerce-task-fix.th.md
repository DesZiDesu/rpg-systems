# v0.51.3 — แก้คำขอของปุ่มที่กลายเป็นบทโรลปกติ

## อาการและสาเหตุ

ผู้ใช้รายงานว่าทุกปุ่มยกเว้นออกประมูลเกิดข้อผิดพลาด และส่งข้อความ NPC เสนอราคาเปิด 5 เงินมา ขณะที่ช่อง Bid ในภาพเป็น 6 เงิน ข้อความที่ได้รับมีแต่ tr-narrative / tr-header / tr-dialogue ไม่มีผลตัดสินที่ engine อ่านได้ ถ้านี่เป็นคำตอบ API เต็ม ปุ่มจะไม่สามารถบันทึกผลการกระทำได้ หากเป็นการคัดลอกเฉพาะข้อความที่เห็นในแชต ยังสรุปไม่ได้ว่า hidden patch ของคำตอบจริงมีอะไรอยู่บ้าง เราไม่ได้เข้าถึง request/response ของ provider ผู้ใช้โดยตรง

ตรวจโค้ดพบว่า:

- ปุ่มใช้ generateQuietPrompt ซึ่งเส้นทาง native ของ SillyTavern รวม preset และ context ของแชต การสั่งเพียงว่าให้ส่ง JSON ท้าย prompt ยังเสี่ยงถูกคำสั่งให้เจนเรื่องเล่าตามปกติกลบ และ AI อาจยึดคำขอ user ครั้งก่อนแทนการกดปุ่มล่าสุด
- Prompt การโรลบอกทั้ง action ของประมูลและกฎการเสนอ/ยืนยันราคาซื้อขายในส่วนเดียวกัน จึงมีคำสั่งให้ใช้ confirm อยู่แม้เปิด auction
- Error consent ใช้กับทั้งเจตนาที่ไม่ชัด/ปฏิเสธ และราคายืนยันผิด ทำให้ข้อความ “ราคายืนยันไม่ตรงกับที่ตกลง” ชวนเข้าใจผิด ในเส้นทางปุ่ม auction ไม่มีการตรวจราคายืนยันแบบ trade โดยตรง
- ตัวอ่านผลเดิมรับ prose นอก JSON เฉพาะเมื่อ decision อยู่ใน commerce.decision จึงปฏิเสธ prose + JSON decision ที่ครบจริงบางแบบ รวมทั้ง flattened results และ response text alias

## การแก้

ปุ่มเลือกใช้ context.generateRaw ของ SillyTavern โดยใช้ API/โมเดลและ sampler ของ connection ปัจจุบัน ไม่ต้องตั้ง API key เพิ่ม คำสั่งระบบของ request ระบุว่าเป็นการตัดสินการกระทำปุ่มนี้ พร้อม contract เฉพาะชนิดและ action แยกจาก preset ของบทโรล มีรายละเอียดตัวละครที่จำกัดขนาด, lore, NPC motives/funds, latest story และแชตล่าสุดเป็น reference จึงยังมีบริบทสำหรับบทพูด NPC

เจ้าของรายการและราคาที่ prepare แล้วเป็นข้อมูลหลัก: หลัง Bid 6 เงิน player เป็นผู้นำที่ 6 ก่อนให้ AI ประเมินคู่แข่ง งบ NPC มาจากเงินจริงเดิม ไม่มีการเติมการผ่านให้ NPC ที่เงียบ ไม่มีเพดานอิงกระเป๋าผู้เล่นหรือชัยชนะบังคับ

หาก host เก่าไม่มี generateRaw จะใช้ quiet request หนึ่งครั้งโดยปิด world-info additions ที่ซ้ำซ้อน ไม่ยิงคำขอซ้ำอัตโนมัติเมื่อ API ล้มเหลว โฮสต์ที่มี generateRaw จะไม่สลับกลับไปยิง quiet หลัง failure

เพิ่ม output budget ของ task เป็น 4096 โดยสั่ง narration สั้น 2–5 ประโยค แยกสัญญาการโรล auction กับ trade และใช้ JSON Schema ในข้อความกำหนดรูปแบบแทนตัวอย่างที่มี placeholder action/ราคา 0 ไม่บังคับ provider ผ่าน response_format ที่ proxy บางตัวอาจไม่รองรับ

รองรับคำพูด NPC + JSON decision ที่แยกกัน, code fence, direct commerce outcome และ flattened results โดยรับเฉพาะผลชัดเจน ไม่มีการสร้าง decision จากบทพูด เช่น “ห้าเหรียญเงิน” เพียงอย่างเดียว ข้อมูลหลายชุดที่ขัดกันถูกปฏิเสธ และ reasoning blocks ที่รู้จักไม่ถูกแสดงเป็นบท NPC

แยก error เจตนา, action ผิดชนิด, ราคายืนยัน trade, response ว่าง, decision ขาด, NPC prose ขาด, decision ขัดกัน และ markup ที่แสดงไม่ได้ เมื่อ error มี “ดูข้อมูลข้อผิดพลาด” และ “คัดลอกข้อมูลตรวจสอบ” บนมือถือ มีรุ่น, button/roleplay, ชนิด, action, error และ raw response ไม่รวม API key, URL การเชื่อมต่อ หรือ prompt ที่มีข้อมูลอ้างอิงทั้งหมด Diagnostic อยู่ใน runtime ปัจจุบัน ไม่มีการส่งออกอัตโนมัติ

## การยืนยัน

ทดสอบ native task path โดยให้ quiet preset ตอบเพียงบทโรลแบบที่รายงาน แต่ task path ส่งผลชัดเจน ตรวจทุกปุ่ม join/bid/wait/next/leave, retry หลัง prose-only failure, การต่อ bubble เดิม, เงินและของ, once-only receipts และ reload ตรวจบทโรลที่มีคำปฏิเสธเรื่องอื่น, การปฏิเสธประมูลจริง, conditional bid, trade confirmation และ contract ที่ไม่ปะปนกัน

ผ่าน unit/host 603 tests และ syntax checks พร้อม production-loader browser ที่ 320/390/1280px รวมปุ่ม/โรล, เงินคงเดิมเมื่อผิดพลาด, diagnostic textarea บนมือถือ, การกลับมาใช้ปุ่มหลัง failure, ระบบเสริมและ memory pause/resume ภาพ UI ใช้ข้อมูลและคำตอบจำลอง การทดสอบไม่ได้เรียก provider ของผู้ใช้จริง

อัปเดต extension เป็น 0.51.3 แล้ว reload หนึ่งครั้ง ไม่ต้องล้าง RPG data หาก provider ยังตอบผิดรูปแบบ สามารถคัดลอกข้อมูลตรวจสอบจาก error เพื่อระบุสาเหตุของคำตอบเต็มได้
