// A separate, data-only card edition. The illustrated edition is never rewritten.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {OPENINGS_TH} from '../data/openings-th.mjs';
import {decodeInlineFiles,encodeInlineFiles} from '../../../src/world-pack-inline.js';
import {validateWorldManifest,validateWorldIndexes} from '../../../src/world-pack-core.js';
import {validateStoryPack} from '../../../src/story-core.js';
import {cardPng,readCardPng} from './png-card.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=process.env.DN_NO_PORTRAITS_OUT||'/workspace/artifacts/death-note-no-portraits/download';
const stem='Death-Note-RPG-No-Portraits',hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const encode=value=>new TextEncoder().encode(JSON.stringify(value)+'\n');
const source=JSON.parse(await readFile(path.join(root,'build/Death-Note-RPG.json'),'utf8'));
const card=structuredClone(source),data=card.data,ext=data.extensions;
const original=await decodeInlineFiles(ext.roleforge_world_archive_payload),files=new Map();
for(const [name,read]of original)files.set(name,await read());
const parse=name=>JSON.parse(new TextDecoder().decode(files.get(name)));
const oldManifest=validateWorldManifest(parse('manifest.json'));
assert.equal(hash(files.get('manifest.json')),ext.roleforge_world_archive.manifestSha256);
for(const file of oldManifest.files){assert.equal(files.get(file.path).length,file.bytes,file.path);assert.equal(hash(files.get(file.path)),file.sha256,file.path);}

const photoFields=new Set(['portraitImage','portraitPath','portraitId','portraitChatId','portraitView','portraitSize','roleIconImage']);
function withoutPortraits(value){
 if(Array.isArray(value))return value.map(withoutPortraits);
 if(!value||typeof value!=='object')return value;
 const next={};
 for(const [key,v]of Object.entries(value)){
  if(photoFields.has(key))continue;
  if(key==='hasPortrait'){next[key]=false;continue;}
  if(key==='portraitSource'){next[key]='none';continue;}
  next[key]=withoutPortraits(v);
 }
 if(next.appearance==='Use the attached source portrait, if present. Further visual details are not established by this short reference.')next.appearance='Further visual details are not established by this short reference. No character portrait is supplied.';
 return next;
}
for(const [name,bytes]of files){
 if(name.startsWith('npcs/'))files.set(name,encode(withoutPortraits(JSON.parse(new TextDecoder().decode(bytes)))));
}

data.name='Death Note RPG — No Portraits';
data.character_version='1.0.1-no-portraits.2';
data.tags=[...new Set([...data.tags,'No Portraits','Thai Openings'])];
data.first_mes=OPENINGS_TH[0].text;
data.alternate_greetings=OPENINGS_TH.slice(1).map(o=>o.text);
data.personality+=' Default narration is Thai. Keep openings short, atmospheric, and responsive to the player.';
data.scenario='The selected first message establishes the opening scene and era. Openings 1–5, 7–8 and 10 use the manga continuity; 6 and 9 use the Japanese film sequel Light Up the New World (2016). Choose the matching source in Wand → Campaign before the first normal reply. Continue from the selected opening rather than replaying earlier chapters. The player remains free to diverge from canon.';
data.system_prompt+='\nThis card has no character portraits. Never assume a reference image is visible or fetch/generate a portrait automatically. Treat the ACTIVE opening message only as established story context; other alternate greetings are unrealized alternatives. Read the current scene, not the card’s default greeting, when deciding notebook possession, location, affiliation and what has already happened. RoleForge immediately seeds notebook possession from the selected visible greeting when the Death Note addon is enabled. Preserve that same inventory item in later state patches; never add a second copy. Reconcile other opening facts through ordinary RoleForge state patches. Openings 5 and 10 explicitly establish player notebook possession; openings 1, 2, 3, 4, 6, 7, 8 and 9 do not. An unopened notebook on the ground is not in inventory. In opening 2 only Light has picked up that notebook. In opening 10 the first Shinigami encounter occurs three weeks after receiving the notebook; do not assume the player has killed anyone or bought the eyes. Opening 8 is the manga death of L, not his film strategy. His death is private to actual witnesses/recipients, not public knowledge. Opening 7 does not predetermine the player’s exact age, abilities or closeness to Near/Mello. Prefer Thai narration and original dialogue; never speak or decide for {{user}}.';
data.post_history_instructions+='\nContinue the selected opening in its established era. Do not restart Light’s first discovery when the scene is already after Lind L. Tailor, after L, or in 2016. Do not mix unused openings or import manga succession events into the film sequel. Historical opening events are not newly completed player quests and grant no retrospective rewards. If an optional mission still lacks its prerequisites, leave it unavailable; continue the roleplay normally rather than fabricating quest completions.';
const ordering=OPENINGS_TH.map((o,i)=>`${i+1}. ${o.title} — ${o.continuity==='jp-films'?'Japanese films':'Manga'}`).join('\n');
data.creator_notes=`ฉบับไม่มีภาพตัวละคร: ตัวละคร 208 รายการ ทุกช่วงชีวิต/เวอร์ชัน 652 แฟ้ม Lore 65 รายการ และภารกิจ 146 บทเหมือนฉบับเดิม แต่ไม่มีภาพในตัวละครหลักหรือเวอร์ชันย่อย\n\nนำเข้าไฟล์ PNG หรือ JSON อย่างใดอย่างหนึ่ง ไม่ต้องติดตั้งคลังเสริม ใช้ RoleForge 0.82.2 ขึ้นไป เลือกข้อความเริ่มต้นจากการปัดข้อความแรกใน SillyTavern (1 ข้อความหลัก + Alternate Greetings 9 ข้อความ รวม 10 แบบ) ก่อนส่งโรล เปิดไม้กายสิทธิ์ → Campaign เลือก Manga สำหรับ 1–5, 7–8, 10 หรือ Japanese films สำหรับ 6, 9 เลือกโหมดตามเนื้อเรื่องหรืออิสระได้ตามต้องการ\n\n${ordering}\n\nฉาก 5 และ 10 กำหนดว่าได้รับสมุดมาแล้ว เมื่อเปิด Death Note Addon ระบบจะแสดงสมุดที่ถืออยู่ทันทีจากข้อความเปิดที่เลือก โดยไม่ต้องรอคำตอบ AI แรก ฉากอื่นไม่ได้มอบสมุดให้ผู้เล่นอัตโนมัติ การเริ่มกลางเรื่องไม่ให้รางวัลเควสย้อนหลัง และภารกิจที่ขาดเงื่อนไขยังรอได้\n\nBANK / CASH / COIN และข้อมูลทุกฉบับยังอยู่ครบ ภาพปก PNG เป็นปกการ์ดเท่านั้น ไม่มีภาพใบหน้า NPC ฝังอยู่ในคลัง\n\nNo-portrait edition: all 208 NPCs, 652 alternate dossiers, 65 Lore records, 146 mission chapters and 13 routes retained. One main greeting plus nine Thai alternatives. Choose Manga for openings 1–5, 7–8, 10; Japanese films for 6 and 9. With the Death Note addon enabled, notebook possession is seeded immediately from the active greeting in openings 5 and 10; later state patches preserve the same book. Other opening facts use ordinary RoleForge tracking. Requires RoleForge 0.82.2+. Model/API settings are unchanged.`;

ext.roleforge_character_pack.name=data.name;
ext.roleforge_character_pack.initialState.player.originSkill='กำหนดจากตัวละครของผู้เล่นและฉากเริ่มต้นที่เลือก';
files.set('presets.json',encode(ext.roleforge_character_pack));
ext.roleforge_sources.portraits=[];
ext.roleforge_sources.coverage=ext.roleforge_sources.coverage.map(row=>({...row,portrait:false}));
ext.roleforge_sources.notes='Complete no-portrait edition of the original authored RoleForge card. All NPC identities, alternate dossiers, source references, lore and missions are retained. No character portraits or custom image icons are included. Ten original Thai opening scenes; unused greetings are alternatives, not current history.';
const manifest={...parse('manifest.json'),archiveId:'death-note-rpg-no-portraits',name:data.name,files:oldManifest.files.map(row=>({path:row.path,bytes:files.get(row.path).length,sha256:hash(files.get(row.path))}))};
validateWorldManifest(manifest);validateWorldIndexes(manifest,parse('indexes/npcs.json'),parse('indexes/lore.json'));
files.set('manifest.json',encode(manifest));
ext.roleforge_world_archive={...ext.roleforge_world_archive,archiveId:manifest.archiveId,manifestSha256:hash(files.get('manifest.json'))};
ext.roleforge_world_archive_payload=await encodeInlineFiles(files);

const decoded=await decodeInlineFiles(ext.roleforge_world_archive_payload);
assert.equal(decoded.size,original.size);
for(const [name,read]of decoded){const bytes=await read();assert.equal(hash(bytes),hash(files.get(name)),name);assert(!new TextDecoder().decode(bytes).includes('data:image/'),name);}
const npcIndex=parse('indexes/npcs.json'),loreIndex=parse('indexes/lore.json'),storyIndex=parse('indexes/stories.json');
assert.equal(npcIndex.length,208);assert.equal(npcIndex.reduce((n,r)=>n+r.versions.length,0),652);assert.equal(loreIndex.length,65);assert.equal(storyIndex.length,146);
validateStoryPack({...manifest.storyPack,entries:storyIndex.map(r=>parse(r.path))});
assert.equal(OPENINGS_TH.length,10);assert.equal(new Set(OPENINGS_TH.map(o=>o.text)).size,10);
for(const opening of OPENINGS_TH){assert(opening.text.split(/\n\s*\n/u).length<=3);assert(opening.text.length<=1200);assert(/[ก-๛]/u.test(opening.text));}
assert.deepEqual(ext.roleforge_death_note,source.data.extensions.roleforge_death_note);
assert.deepEqual(ext.roleforge_campaigns,source.data.extensions.roleforge_campaigns);
assert(!JSON.stringify(card).includes('data:image/'));

await mkdir(out,{recursive:true});await mkdir(path.join(root,'build'),{recursive:true});
const jsonBytes=Buffer.from(JSON.stringify(card)),pngBytes=cardPng(await readFile(path.join(root,'assets/cover.png')),card);
assert.deepEqual(readCardPng(pngBytes),card);
for(const [suffix,bytes]of [['json',jsonBytes],['png',pngBytes]]){const file=path.join(root,'build',stem+'.'+suffix);await writeFile(file,bytes);await copyFile(file,path.join(out,stem+'.'+suffix));}
const greetings=OPENINGS_TH.map((o,i)=>`## ${i+1}. ${o.title}\n\n${o.text.replace(/<\/?tr-dialogue\b[^>]*>/gu,'')}`).join('\n\n');
const guide=`# Death Note RPG — ไม่มีภาพตัวละคร\n\nนำเข้า **${stem}.json** หรือ **${stem}.png** เพียงไฟล์เดียวใน SillyTavern ที่มี RoleForge 0.82.2+ เลือกอย่างใดอย่างหนึ่ง ทั้งสองไฟล์มีข้อมูลเดียวกัน\n\nเลือกฉากเริ่มต้นโดยปัดข้อความแรก: มี 1 ข้อความหลัก + Alternate Greetings 9 แบบ รวม 10 แบบตามลำดับด้านล่าง เปิดเมนูไม้กายสิทธิ์ → Campaign ก่อนส่งโรล เลือก **Manga** สำหรับ 1–5, 7–8, 10 หรือ **Japanese films** สำหรับ 6, 9 เมื่อเปิด Death Note Addon ฉาก 5 และ 10 จะแสดงสมุดที่ถืออยู่ทันทีตามข้อความเปิดที่เลือก ฉากที่ยังไม่ได้ถือสมุดจะไม่มอบสมุดอัตโนมัติ ภารกิจเก่าที่ขาดเงื่อนไขไม่ถูกจบหรือให้รางวัลย้อนหลัง และยังเล่นโรลกลางเรื่องต่อได้ตามปกติ\n\nมีตัวละคร 208 รายการ / 652 เวอร์ชัน / Lore 65 รายการ / ภารกิจ 146 บท / 13 เส้นทางเหมือนฉบับเดิม ไม่มี portrait หรือภาพไอคอนตัวละคร ทั้งในแฟ้มหลักและเวอร์ชันย่อย ไฟล์ PNG ยังคงใช้ภาพปกการ์ด ส่วน JSON ไม่มีภาพปก\n\n${greetings}\n`;
await writeFile(path.join(root,'build',stem+'.th.md'),guide);await writeFile(path.join(out,stem+'.th.md'),guide);
const report={edition:'no-portraits',...manifest.counts,routes:ext.roleforge_campaigns.options.length,portraits:0,openingCount:10,openings:OPENINGS_TH.map((o,i)=>({number:i+1,id:o.id,title:o.title,continuity:o.continuity,paragraphs:o.text.split(/\n\s*\n/u).length,characters:o.text.length})),files:files.size,allSubfileHashesVerified:true,allNpcVersionsPreserved:true,pngMetadataRoundTrip:true,jsonBytes:jsonBytes.length,pngBytes:pngBytes.length,sourceJsonBytes:(await readFile(path.join(root,'build/Death-Note-RPG.json'))).length,jsonSha256:hash(jsonBytes),pngSha256:hash(pngBytes)};
await writeFile(path.join(root,'build/no-portraits-coverage.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(out,'no-portraits-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
