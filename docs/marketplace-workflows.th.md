# Marketplace · ตลาดขายของแบบต่อรอง

ระบบนี้ต่อยอดจาก Auction House เดิม โดยแยกบทบาทให้ชัดเจน: Auction คือผู้เล่นเข้าไปเสนอราคาเพื่อซื้อ ส่วน Marketplace คือผู้เล่นนำไอเทมใน Inventory มาลงขายและเจรจากับผู้ซื้อ NPC หน้าการ์ดเป็น ledger แบบ VesperChain และแสดงใต้ข้อความต้นทางใน Main Chat พร้อมรายการเดียวกันในแท็บ Marketplace

## Workflow

1. เปิด `Extensions → RoleForge → Optional systems → Negotiated Marketplace`
2. เปิดแท็บ `Marketplace`
3. เลือกไอเทม จำนวน ราคาตั้ง ราคาต่ำสุด และกลุ่มผู้ซื้อ
4. กด `ลงรายการขาย` ระบบ Reserve จำนวนไอเทมนั้นทันที
5. กด `ขอข้อเสนอจากผู้ซื้อ` เพื่อรับ Offer
6. เลือก `รับข้อเสนอ`, `ปฏิเสธ` หรือกรอก `Counteroffer`
7. เมื่อกดให้ผู้ซื้อพิจารณา ระบบจะตอบตามงบของผู้ซื้อแบบ deterministic
8. เมื่อขายสำเร็จ ระบบลดไอเทม เพิ่มเงิน สร้าง Receipt และปิด Listing ใน Transaction เดียว
9. หลังสร้าง Listing การ์ดข้อเสนอจะถูกผูกกับคำตอบ NPC ล่าสุดใน Main Chat กดการกระทำจากการ์ดได้ทันที หรือกลับไปทำต่อจากแท็บ Marketplace

ราคาขั้นต่ำถูกเก็บเป็นกติกาภายใน Listing ส่วนงบสูงสุดของผู้ซื้อไม่ถูกส่งเข้า UI หรือ prompt ของ AI การแก้ไขทุกอย่างต้องผ่านปุ่มใน UI และ story patch ไม่สามารถสร้างหรือชำระ Marketplace transaction ได้

## สถานะ

`Active → Negotiating → Sold`

รายการที่ยังไม่มีข้อเสนอสามารถ `Cancelled` ได้ และการ Cancel จะคืนจำนวนไอเทมที่ Reserve ไว้โดยอัตโนมัติ

## หน้าจอ

- Main Chat: การ์ดการค้าและการ์ดประมูลใช้กรอบไม้เข้ม แผ่นกระดาษ และตราทองเหลืองใต้ข้อความ NPC แสดงผู้ซื้อ/ล็อต ราคา และปุ่ม Accept/Counter/Decline หรือ Join/Bid/Wait/Leave
- Desktop: แสดงสถิติสามช่องและ Listing แบบสองคอลัมน์ พร้อมปุ่ม Offer/Counteroffer ในการ์ด
- Mobile: Listing เรียงหนึ่งคอลัมน์, ฟอร์มสองคอลัมน์, การ์ด Main Chat เปลี่ยนเป็นปุ่มแนวตั้ง และไม่มี horizontal overflow
- Preview: เปิด `docs/previews/marketplace.html` แล้วเลือก Desktop หรือ Mobile เพื่อดูทั้งการค้าและประมูลใน Main Chat
