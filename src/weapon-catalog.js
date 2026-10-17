// Built-in art is a display catalog, never a source of inventory or ammunition.
export const WEAPON_CATEGORIES=Object.freeze([
 ['sword','melee','Sword','ดาบ','none'],['greatsword','melee','Greatsword','ดาบใหญ่','none'],
 ['katana','melee','Katana','คาตานะ','none'],['rapier','melee','Rapier','ดาบเรเปียร์','none'],
 ['dual-blades','melee','Dual blades','ดาบคู่','none'],['dagger','melee','Dagger','มีด / กริช','none'],
 ['axe','melee','Axe','ขวาน','none'],['hammer','melee','War hammer','ค้อนสงคราม','none'],
 ['mace','melee','Mace / club','กระบอง','none'],['spear','melee','Spear / lance','หอก / ทวน','none'],
 ['polearm','melee','Polearm','ง้าว / อาวุธด้ามยาว','none'],['scythe','melee','Scythe','เคียว','none'],
 ['whip','melee','Whip','แส้','none'],['chain','melee','Chain weapon','อาวุธโซ่','none'],
 ['gauntlet','melee','Gauntlets','สนับมือ / ถุงมือเกราะ','none'],
 ['bow','ranged','Bow','ธนู','arrows'],['crossbow','ranged','Crossbow','หน้าไม้','arrows'],
 ['throwing','ranged','Throwing blades','มีด / ดาวกระจาย','quantity'],['boomerang','ranged','Boomerang','บูมเมอแรง','quantity'],
 ['pistol','firearms','Pistol','ปืนพก','magazine'],['revolver','firearms','Revolver','ปืนลูกโม่','rounds'],
 ['smg','firearms','Submachine gun','ปืนกลมือ','magazine'],['rifle','firearms','Rifle','ปืนไรเฟิล','magazine'],
 ['shotgun','firearms','Shotgun','ปืนลูกซอง','rounds'],['sniper','firearms','Precision rifle','ปืนซุ่มยิง','magazine'],
 ['machine-gun','firearms','Machine gun','ปืนกล','magazine'],['launcher','firearms','Launcher','เครื่องยิง','rounds'],
 ['staff','arcane','Magic staff','คทาเวท','none'],['wand','arcane','Wand','ไม้กายสิทธิ์','none'],
 ['grimoire','arcane','Grimoire','คัมภีร์เวท','charges'],['catalyst','arcane','Catalyst / orb','สื่อเวท / ลูกแก้ว','charges'],
 ['shield','defense','Shield','โล่','none'],['energy','special','Energy weapon','อาวุธพลังงาน','energy'],
 ['relic','special','Relic / other','วัตถุพิเศษ / อื่น ๆ','none'],
].map(([id,group,en,th,resourceMode])=>Object.freeze({id,group,en,th,resourceMode})));
export const WEAPON_GROUPS=Object.freeze({melee:['Melee','ประชิด'],ranged:['Ranged','ระยะไกล'],firearms:['Firearms','ปืน'],arcane:['Arcane','เวท'],defense:['Defense','ป้องกัน'],special:['Special','พิเศษ']});
export const WEAPON_CATEGORY_IDS=Object.freeze(WEAPON_CATEGORIES.map(c=>c.id));
export const weaponCategory=id=>WEAPON_CATEGORIES.find(c=>c.id===id)||WEAPON_CATEGORIES.at(-1);
const asset=path=>{const url=new URL(path,import.meta.url);url.searchParams.set('v',new URL(import.meta.url).searchParams.get('v')||'0.75.0');return url.href;};
export const weaponModelUrl=id=>asset(`../assets/weapons/generic/${weaponCategory(id).id}.svg`);
export const SPECIAL_WEAPON_MODELS=Object.freeze({
 'excalibur-morgan':{id:'excalibur-morgan',name:'Excalibur Morgan',category:'sword',aliases:['excalibur morgan','excalibur morgan (saber alter)','เอ็กซ์คาลิเบอร์ มอร์แกน','เอกซ์คาลิเบอร์ มอร์แกน'],image:asset('../assets/weapons/special/excalibur-morgan.png')},
 excalibur:{id:'excalibur',name:'Excalibur',category:'sword',aliases:['excalibur','excalibur (saber)','excalibur: sword of promised victory','เอ็กซ์คาลิเบอร์','เอ็กซ์คาลิเบอร','เอกซ์คาลิเบอร์'],image:asset('../assets/weapons/special/excalibur-front.jpg')},
 ea:{id:'ea',name:'Ea',category:'sword',aliases:['ea','ea (gilgamesh)','เออา','เออา ดาบผ่าโลก','sword of rupture ea','ea sword of rupture'],image:asset('../assets/weapons/special/ea.jpg')},
});
const key=v=>String(v||'').normalize('NFKC').toLocaleLowerCase().replace(/[“”"']/gu,'').trim();
export function namedWeaponModel(name){return Object.values(SPECIAL_WEAPON_MODELS).find(m=>m.aliases.includes(key(name)))?.id||'';}
