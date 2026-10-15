#!/usr/bin/env python3
"""Package an offline icon gallery with unaltered real SillyTavern screenshots."""
import base64
import collections
import html
import json
from pathlib import Path
import shutil
import sys

output, screenshots = Path(sys.argv[1]), Path(sys.argv[2])
patch = json.loads((output / 'Fate-Servant-Icons-Update.json').read_text())
counts = collections.Counter(r['icon'] for r in patch['entries'])
names = {'icons-mooncancer': 'Moon Cancer', 'icons-alterego': 'Alter Ego',
         'grands-caster': 'Grand Caster', 'beasts-none': 'Beast · generic'}
tiles = []
for key, source in patch['icons'].items():
    label = names.get(key, 'Beast ' + key[7:] if key.startswith('beasts-') else key.removeprefix('icons-').title())
    tiles.append(f'<article><img src="{source}" alt="{html.escape(label)}"><strong>{html.escape(label)}</strong><small>{counts[key]} ร่าง</small></article>')
shots = [('chromium-mobile-fate-roster.png', 'Preview-Mobile-NPC.png', 'NPC Management · มือถือ · คลัง Fate จริง'),
         ('chromium-mobile-03-icons-in-chat.png', 'Preview-Mobile-Chat.png', 'Main Chat · มือถือ · ข้อความตัวอย่าง'),
         ('chromium-desktop-fate-roster.png', 'Preview-Desktop-NPC.png', 'NPC Management · คอม · คลัง Fate จริง'),
         ('chromium-desktop-03-icons-in-chat.png', 'Preview-Desktop-Chat.png', 'Main Chat · คอม · ข้อความตัวอย่าง')]
sections = []
for source, name, label in shots:
    shutil.copyfile(screenshots / source, output / name)
    data = base64.b64encode((output / name).read_bytes()).decode()
    sections.append(f'<figure><figcaption>{label}</figcaption><img loading="lazy" src="data:image/png;base64,{data}" alt="{label}"></figure>')
page = '''<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fate · Servant icons — RoleForge 0.72.0</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0d0f13;color:#e7e5de;font:16px/1.65 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:32px 20px}header{padding:32px 0;border-bottom:1px solid #393529}header small{letter-spacing:.22em;color:#cfb977}h1{font-size:clamp(28px,5vw,48px);margin:8px 0}h2{font-size:23px;margin:36px 0 10px}p{max-width:800px;color:#bfbfb8}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#f0d998}a.button{padding:10px 16px;border:1px solid #645936;border-radius:8px;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.grid article{padding:22px 12px;background:#14171b;border:1px solid #333333;border-radius:12px;display:flex;align-items:center;flex-direction:column;gap:6px}.grid img{width:92px;height:92px;object-fit:contain}.grid strong{color:#eee2b8}.grid small{color:#999}.screens{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}figure{margin:0;background:#16181d;border:1px solid #343434;border-radius:12px;overflow:hidden}figure img{display:block;width:100%;height:auto}figcaption{padding:14px;color:#e6d49a}@media(max-width:680px){main{padding:22px 12px}.screens{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>
<main><header><small>ROLEFORGE 0.72.0 · FATE ARCHIVE</small><h1>Servant class icons</h1><p>ภาพสำหรับ 521 ร่าง · รับภาพต่อไปยัง 1,466 เวอร์ชัน · คงคลัง 800 NPC / 1,771 เวอร์ชัน / 178 Lore / 4,329 ข้อมูลพลังเสริม</p><nav><a class="button" href="#screens">ดูใน SillyTavern จริง</a><a class="button" href="#icons">ดูภาพไอคอนทุกแบบที่ใส่</a></nav></header>
<h2 id="screens">ภาพจาก SillyTavern จริง</h2><p>เครื่องทดสอบแยก: SillyTavern 1.19.0, Chromium ที่ขนาด 390 และ 1440 พิกเซล ภาพ NPC Management ใช้คลัง Fate จริง ส่วน Main Chat ใช้บทสนทนาตัวอย่างเพื่อดู Header ไม่ได้เรียกโมเดลและไม่ได้เข้าถึงเครื่องของผู้ใช้</p><div class="screens">''' + ''.join(sections) + '''</div><h2 id="icons">ภาพคลาสในไฟล์อัปเดต · 23 ภาพ</h2><p>แกลเลอรีนี้แสดงไฟล์ภาพที่ใส่ในการ์ด ภาพของ gears ใช้โทนทองเดิมร่วมกับตรา Beast สีแดง Unknown ใช้กับ 6 รายการที่คลาสไม่ยืนยันในข้อมูลต้นทาง มนุษย์และรายการอื่น 279 รายการยังใช้สัญลักษณ์เดิม</p><div class="grid">''' + ''.join(tiles) + '''</div><p>เครดิต: gears · Servant class icons · คำอธิบายและลิงก์ต้นทางอยู่ใน ATTRIBUTION.md</p></main></html>'''
(output / 'Preview.html').write_text(page)
if len(sys.argv) > 3:
    public = Path(sys.argv[3])
    public.mkdir(parents=True, exist_ok=True)
    for _, name, _ in shots:
        data = base64.b64encode((output / name).read_bytes()).decode()
        page = page.replace('data:image/png;base64,' + data, name)
        shutil.copyfile(output / name, public / name)
    (public / 'index.html').write_text(page)
print('Built offline preview and copied four real browser screenshots')
