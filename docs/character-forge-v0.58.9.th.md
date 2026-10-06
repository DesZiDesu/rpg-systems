# Character Forge 0.58.9

เอามุมตกแต่งรูปตัว L ทั้งสี่ออกตามภาพที่ผู้เล่นส่งมา คงกรอบฟอร์มและลายตารางเดิมไว้

## สาเหตุของการเลื่อนไปด้านข้าง

การปรับพื้นที่เลื่อนใน 0.58.8 ทำให้ `#trapp` เป็น scroll container ลายหกเหลี่ยมของ loader ใช้ `inset:-40px` และขยายพ้นกรอบ แม้ loader จะมี `visibility:hidden` หลังโหลดเสร็จแล้ว ขอบเขตของลูกยังเพิ่ม scrollable overflow ได้

ทดสอบก่อนแก้ที่จอ 320px: clientWidth ของฟอร์ม 310px แต่ scrollWidth 350px และตั้ง scrollLeft ได้ 40px ตรงกับอาการในภาพ การตรวจรุ่นก่อนดูความกว้างของหน้า host แต่ไม่ได้ดูพื้นที่เลื่อนภายใน iframe จึงพลาดจุดนี้

แก้ให้ loader ตัดลายตกแต่งอยู่ในกรอบของตัวเอง และกำหนดฟอร์มให้เลื่อนเฉพาะแนวตั้ง ช่องกรอกยุบใน grid ได้ และข้อความยาวตัดบรรทัดในพื้นที่ของฟอร์ม การตรวจยืนยันทั้ง scrollWidth ภายในและการลองตั้ง scrollLeft ไม่ใช่ตรวจแค่ว่ามองไม่เห็น scrollbar

## สีจากธีม RoleForge

parent ส่งสี Accent, Highlight, Text และ Surface จาก settings ไปยัง iframe ผ่านช่องข้อความที่ตรวจ origin/source เดิม ฝั่งฟอร์มรับเฉพาะรหัสสี #RRGGBB ใช้กับปุ่ม กรอบ ลายตาราง พื้นหลัง ข้อความ loader และลูกศรเลือกประเภทไอเทม

เปลี่ยน preset หรือสีในหน้าตั้งค่าแล้วฟอร์มอัปเดตทันที ไม่สร้าง iframe ใหม่หรือทิ้งข้อมูลที่กรอก ปุ่มสลับสว่างในฟอร์มยังเก็บสี accent ที่ผู้เล่นเลือกไว้ สีตัวอักษรบนปุ่มที่เลือกคำนวณจาก highlight และปรับปลาย gradient ให้มี contrast อย่างน้อย 4.5:1

ไม่มีการเปลี่ยนโครงสร้าง Preset, profile, RPG state หรือระบบซื้อขาย รุ่นนี้เปลี่ยน layout/สีและ asset cache version

## การตรวจ

- npm test: 1,058 unit/host tests ผ่าน
- npm run check: syntax checks ผ่าน
- test:forge ที่ 320/390/1280px ผ่านทั้งการบล็อกฟอนต์ภายนอก และการโหลด Orbitron/Chakra Petch จริงผ่าน proxy
- ตรวจว่า root และ wrap ไม่ล้นแนวนอน ตั้ง scrollLeft แล้วได้ 0 แนวตั้งยังเลื่อนได้ หลังเปลี่ยน viewport, composer height, theme, ข้อความยาว และ reload draft
- ตรวจสี Abyss, Parchment, Forge, Verdant และ Custom ผ่าน UI controls จริง สีที่ iframe ได้ตรงกับ settings ชื่อที่กรอกไม่หาย
- กรณี Origin Skill, Party/Guild, Arsenal, Rank และ BEGIN จากการตรวจฟอร์มเดิมยังผ่าน
- startup browser ตรวจ current/cached legacy loader และ drawer browser ตรวจ native controls/locale/scoping/geometry

เป็นการทดสอบ Chromium กับ host จำลอง SillyTavern ยังไม่ได้ทดสอบบน iPhone จริง ข้อจำกัดเดิมของชุดทดสอบซื้อขายรวมบันทึกอยู่ใน [รายงาน 0.58.8](character-forge-v0.58.8.th.md)
