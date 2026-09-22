// Pure, allowlisted profile/import/chat helpers. No host or network access.
export const FIELDS = {
 name:'ชื่อ',title:'ตำแหน่ง / ฉายา',occupation:'อาชีพ / บทบาท',race:'เผ่าพันธุ์',age:'อายุ',gender:'เพศ',
 faction:'สังกัด',alignment:'จุดยืน',relationship:'ความสัมพันธ์กับผู้เล่น',relationshipState:'รายละเอียดความสัมพันธ์',
 location:'สถานที่ล่าสุด',lastSeen:'พบล่าสุด',activity:'กิจกรรมปัจจุบัน',maritalStatus:'สถานะสมรส',partner:'คู่ครอง',children:'บุตร',
 appearance:'รูปลักษณ์',personality:'บุคลิก',background:'ภูมิหลัง',goals:'เป้าหมาย',speechStyle:'ลักษณะการพูด',notes:'บันทึก',
};
export const RELATIONS = ['affection','trust','loyalty','fear','corruption','lust'];
export const STATS = ['level','hp','mp','stamina','strength','agility','intelligence','endurance'];
export const NPC_STARTING_STATS = Object.freeze({level:1,rank:'Unranked',hp:100,mp:30,stamina:100,strength:10,agility:10,intelligence:10,endurance:10});
export const NPC_STARTING_RELATIONS = Object.freeze({affection:0,trust:10,loyalty:0,fear:0,corruption:0,lust:0});
export const ATTRIBUTE_INSTRUCTIONS = `Every new NPC needs complete stats {level,rank,hp,mp,stamina,strength,agility,intelligence,endurance} and affection,trust,loyalty,fear,corruption,lust (numbers 0-100). Choose fictional starting values consistent with role, power and relationships, not all-zero placeholders. Level and core attributes should normally be positive; HP/stamina are positive for healthy active NPCs. Zero HP for death, zero MP for no magic and zero relationship meters where appropriate are valid. Never increase existing combat stats just for conversation. These are private bookkeeping values, not knowledge visible to characters.`;
// Missing numbers are not the same as intentional zero (death/no magic/no trust).
export function npcAttributeDefaults(raw={}, base={}) {
 const valid=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v));
 const pick=(v,b,d)=>valid(v)?Number(v):valid(b)?Number(b):d;
 return {...Object.fromEntries(RELATIONS.map(k=>[k,pick(raw[k],base[k],NPC_STARTING_RELATIONS[k])])),stats:{
  ...Object.fromEntries(STATS.map(k=>[k,pick(raw.stats?.[k],base.stats?.[k],NPC_STARTING_STATS[k])])),
  rank:usable(raw.stats?.rank)?raw.stats.rank:usable(base.stats?.rank)?base.stats.rank:NPC_STARTING_STATS.rank,
 }};
}
export function generatedAttributes(raw) {
 if(!raw||typeof raw!=='object'||RELATIONS.some(k=>!Number.isFinite(raw[k]))||STATS.some(k=>!Number.isFinite(raw.stats?.[k]))||!usable(raw.stats?.rank))throw Error('AI returned incomplete stats/relationships. Your draft was not changed.');
 const fields=profileFields(raw);
 if(STATS.every(k=>fields.stats[k]===0))throw Error('AI returned all-zero placeholder stats. Your draft was not changed.');
 return {...Object.fromEntries(RELATIONS.map(k=>[k,fields[k]])),stats:fields.stats};
}
export const ROLE_ICONS = {book:'book-open',compass:'compass',mage:'wand-magic-sparkles',warrior:'shield-halved',healer:'hand-holding-heart',merchant:'coins',noble:'crown',artisan:'hammer',scholar:'graduation-cap',guard:'shield',ranger:'bullseye',performer:'music'};
export const keyName = s => String(s || '').trim().normalize('NFKC').toLowerCase();
export const clean = (s, max=1000) => ['string','number'].includes(typeof s) ? String(s).trim().slice(0,max) : '';
export const usable = s => Boolean(clean(s)) && !/^(unknown|unspecified|n\/a|null|undefined|ไม่ทราบ|ไม่ระบุ|—|-)$/i.test(clean(s));
export const clamp = (n, low, high) => Math.min(high,Math.max(low,Number(n)||0));
export function identity(raw={}, base={}) {
 const result={};
 for(const k of ['appearance','personality','background','goals','speechStyle']) result[k]=clean(raw[k] ?? base[k],4000);
 const aliases=raw.aliases ?? base.aliases;
 result.aliases=(Array.isArray(aliases)?aliases:typeof aliases==='string'?aliases.split(','):[]).map(v=>clean(v,120)).filter(Boolean).slice(0,30);
 result.identityColor=/^#[0-9a-f]{6}$/i.test(raw.identityColor)?raw.identityColor:/^#[0-9a-f]{6}$/i.test(base.identityColor)?base.identityColor:'#d6b458';
 result.roleIcon=Object.hasOwn(ROLE_ICONS,raw.roleIcon)?raw.roleIcon:Object.hasOwn(ROLE_ICONS,base.roleIcon)?base.roleIcon:'book';
 result.portraitSize=clamp(raw.portraitSize ?? base.portraitSize ?? 72,48,144);
 result.portraitSource=['server','local','none','character-life'].includes(raw.portraitSource)?raw.portraitSource:['server','local','none','character-life'].includes(base.portraitSource)?base.portraitSource:'';
 const path=raw.portraitPath??base.portraitPath;
 result.portraitPath=typeof path==='string'&&/^\/?user\/images\/tretaresia-npc\/[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/.test(path)?path:'';
 result.npcScope=(raw.npcScope??base.npcScope)==='character'?'character':'chat';
 result.npcOwner=result.npcScope==='character'?clean(raw.npcOwner??base.npcOwner,500):'';
 result.portraitChatId=clean(raw.portraitChatId??base.portraitChatId,500);
 return result;
}
export function profileFields(raw={}) {
 const result={};
 for(const k of Object.keys(FIELDS)) if(raw[k]!==undefined) result[k]=clean(raw[k],['appearance','personality','background','goals','speechStyle'].includes(k)?4000:k==='name'?120:1000);
 for(const k of RELATIONS) if(Number.isFinite(raw[k]))result[k]=clamp(raw[k],0,100);
 if(raw.stats && typeof raw.stats==='object') {
  result.stats={};for(const k of STATS)if(Number.isFinite(raw.stats[k]))result.stats[k]=clamp(raw.stats[k],0,k==='level'?9999:999999);
  if(raw.stats.rank!==undefined)result.stats.rank=clean(raw.stats.rank,80);
 }
 if(Array.isArray(raw.abilities))result.abilities=raw.abilities.slice(0,100).filter(v=>v&&clean(v.name)).map(v=>({name:clean(v.name,120),category:clean(v.category,80),level:clean(v.level,80),description:clean(v.description,1000),proficiency:clamp(v.proficiency,0,100)}));
 if(Array.isArray(raw.aliases))result.aliases=raw.aliases.slice(0,30).map(v=>clean(v,120)).filter(Boolean);
 if(/^#[0-9a-f]{6}$/i.test(raw.identityColor))result.identityColor=raw.identityColor;
 if(Object.hasOwn(ROLE_ICONS,raw.roleIcon))result.roleIcon=raw.roleIcon;
 return result;
}
export function completeDraft(base, generated) {
 const next={...base}, incoming=profileFields(generated);
 for(const [k,v] of Object.entries(incoming)) {
  if(k==='stats'){next.stats={...v,...base.stats};continue;}
  if(Array.isArray(v)){if(!base[k]?.length)next[k]=v;continue;}
  if(!usable(base[k]))next[k]=v;
 }
 return next;
}
export function parseStory(source) {
 const text=String(source||'');
 if(!/<tr-(?:narrative|dialogue)\b/i.test(text)||text.length>300000)return null;
 const regex=/<tr-(narrative|dialogue)\b([^>]*)>([\s\S]*?)<\/tr-\1\s*>/gi;
 const blocks=[];let m,last=0;
 while((m=regex.exec(text))&&blocks.length<150){
  const before=text.slice(last,m.index).trim();if(before)blocks.push({type:'plain',text:before});
  const name=m[2].match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const body=m[3].replace(/<[^>]*>/g,'').slice(0,20000);
  blocks.push({type:m[1].toLowerCase(),name:clean(name?.[1]??name?.[2],120),text:body});last=regex.lastIndex;
 }
 if(!blocks.length)return null;
 const tail=text.slice(last).trim();
 if(tail && !/^<tr-(narrative|dialogue)\b/i.test(tail))blocks.push({type:'plain',text:tail});
 return blocks;
}
export function portraitData(value) {
 const s=typeof value==='string'?value:'';
 return s.length<=16*1024*1024 && /^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i.test(s)?s:'';
}
// Map only shared concepts, never import CL settings, private metadata or CSS.
export function importCharacters(data) {
 if(!data||typeof data!=='object')throw Error('ไฟล์ไม่มีข้อมูลตัวละคร');
 let records;
 if(data.format==='character-life-backup' && data.libraries)records=['global','character','chat'].flatMap(scope=>(Array.isArray(data.libraries[scope])?data.libraries[scope]:[]).map(v=>({...v,_scope:scope})));
 else if(Array.isArray(data))records=data;
 else if(Array.isArray(data.npcs))records=data.npcs;
 else if(data.npc && typeof data.npc==='object')records=[data.npc];
 else if(data.character && typeof data.character==='object')records=[data.character];
 else if(clean(data.name))records=[data];
 else throw Error('ไม่พบ NPC ใน JSON นี้ (ไม่รองรับไฟล์ธีมหรือไฟล์ตั้งค่า)');
 if(records.length>200)throw Error('นำเข้าได้ครั้งละไม่เกิน 200 ตัวละคร');
 const seen=new Map();
 for(const v of records){
  if(!v||typeof v!=='object'||!clean(v.name))continue;
  const n=profileFields(v);
  const mapping={role:'occupation',species:'race',affiliation:'faction',relationshipToUser:'relationship',currentState:'activity'};
  for(const [from,to]of Object.entries(mapping))if(clean(v[from]))n[to]=clean(v[from],to==='activity'?240:160);
  if(clean(v.role)&&!n.title)n.title=clean(v.role,120);
  if(clean(v.relationshipToUser)&&clean(v.relationship))n.relationshipState=clean(v.relationship,160);
  if(typeof v.abilities==='string' && v.abilities.trim())n.abilities=[{name:'Imported abilities',category:'Character Life',level:'Unknown',description:clean(v.abilities,1000),proficiency:0}];
  const palette=v.themeMode==='custom'?v.customPalette:v.autoPalette;
  const color=v.identityColor||palette?.header||v.accent;if(/^#[0-9a-f]{6}$/i.test(color))n.identityColor=color;
  const forms=Array.isArray(v.forms)?v.forms:[];
  const form=forms.find(f=>f.id===v.activeFormId)||forms[0]||{};
  const portraitId=clean(form.portraitId||v.portraitId,180);
  const image=portraitData(v.portrait)||portraitData(v.image)||portraitData(v.avatar)||portraitData(form.portrait)||portraitData(data.portraits?.[portraitId]);
  const descriptor=data.portraitFiles?.[portraitId];
  const frame={x:clamp(form.x??50,0,100),y:clamp(form.y??18,0,100),zoom:clamp(form.zoom??1,1,3)};
  if(portraitId||image)n.portraitView={desktop:frame,mobile:{...frame}};
  seen.set(keyName(n.name),{profile:n,image,portraitId,portraitPath:clean(descriptor?.path,500),sourceId:clean(v.id,120),scope:v._scope||'',hasImageReference:Boolean(portraitId||v.portrait||v.image||v.avatar||v.portraitUrl)});
 }
 if(!seen.size)throw Error('ไม่มีตัวละครที่มีชื่อให้นำเข้า');
 return [...seen.values()];
}
export async function readCharacterFile(file) {
 if(file.size>100*1024*1024)throw Error('ไฟล์ใหญ่เกิน 100 MB');
 const magic=new Uint8Array(await file.slice(0,4).arrayBuffer());
 if(magic[0]!==0x50||magic[1]!==0x4b){if(file.size>24*1024*1024)throw Error('JSON ใหญ่เกิน 24 MB');return {data:JSON.parse(await file.text()),images:new Map()};}
 // Character Life v3 writes uncompressed ZIP entries with sizes in local headers.
 let offset=0,data=null,count=0;const images=new Map();
 while(offset<file.size){
  if(++count>1000)throw Error('ZIP มีไฟล์มากเกินไป');
  const bytes=await file.slice(offset,offset+30).arrayBuffer();if(bytes.byteLength<4)throw Error('ZIP ไม่สมบูรณ์');const h=new DataView(bytes),sig=h.getUint32(0,true);
  if(sig===0x02014b50||sig===0x06054b50)break;
  if(sig!==0x04034b50||bytes.byteLength<30)throw Error('ZIP ไม่ถูกต้อง');
  const flags=h.getUint16(6,true),method=h.getUint16(8,true),size=h.getUint32(18,true),plain=h.getUint32(22,true),nameSize=h.getUint16(26,true),extra=h.getUint16(28,true);
  if((flags&9)||method!==0||size!==plain)throw Error('รองรับ ZIP แบบส่งออกจาก Character Life v3 เท่านั้น');
  const start=offset+30+nameSize+extra,end=start+size;if(end>file.size||size>24*1024*1024)throw Error('ZIP ไม่สมบูรณ์หรือรูปภาพใหญ่เกินไป');
  const name=new TextDecoder().decode(await file.slice(offset+30,offset+30+nameSize).arrayBuffer());
  if(name==='backup.json')data=JSON.parse(await file.slice(start,end).text());
  else if(/^portraits\/[a-z0-9_-]+\.(png|jpg|jpeg|webp|gif|avif)$/i.test(name))images.set(name,file.slice(start,end));
  offset=end;
 }
 if(data?.format!=='character-life-backup')throw Error('ZIP นี้ไม่ใช่ Character Life backup');
 return {data,images};
}
export function cropGeometry(width,height,frame,size=512) {
 const scale=Math.max(size/width,size/height)*clamp(frame.zoom??1,1,3);
 const w=width*scale,h=height*scale;
 return {w,h,x:-(w-size)*clamp(frame.x??50,0,100)/100,y:-(h-size)*clamp(frame.y??50,0,100)/100};
}
// User edits are not story-turn effects. Rebase only their changed fields into
// existing rollback snapshots so swiping an AI reply cannot undo a saved draft.
export function retainManualNpcEdits(history, before, after) {
 if(!history?.entries)return;
 const copy=value=>JSON.parse(JSON.stringify(value));
 for(const npc of after.npcs||[]){
  const old=(before.npcs||[]).find(v=>v.id===npc.id);
  const keys=Object.keys(npc).filter(k=>JSON.stringify(npc[k])!==JSON.stringify(old?.[k]));
  if(!keys.length)continue;
  for(const entry of history.entries)for(const snapshot of [entry.baseState,...Object.values(entry.variants||{}).map(v=>v.state)]){
   if(!snapshot||!Array.isArray(snapshot.npcs))continue;
   const target=snapshot.npcs.find(v=>v.id===npc.id);
   if(!target){if(snapshot.npcs.length<200)snapshot.npcs.push(copy(npc));continue;}
   for(const key of keys){
    if(key==='stats'&&old){target.stats||={};for(const stat of Object.keys(npc.stats))if(npc.stats[stat]!==old.stats?.[stat])target.stats[stat]=npc.stats[stat];}
    else target[key]=copy(npc[key]);
   }
  }
 }
}
export const CHAT_INSTRUCTIONS = `TRETARESIA CHAT PRESENTATION: Write the visible story as plain text inside these blocks, in story order:
<tr-narrative>Third-person scene/action narration only.</tr-narrative>
<tr-dialogue name="Exact NPC Name">Only words spoken by this character, without quotation marks.</tr-dialogue>
Do not emit HTML, Markdown fences, thought labels or role metadata inside blocks. Do not invent portrait URLs.
After the story, emit the existing tretaresia_patch as usual, outside these blocks. A newly relevant named NPC must be upserted into npcs in this SAME reply with name,title,occupation,race,age,gender,faction,relationship,relationshipState,location,activity,appearance,personality,background,goals,speechStyle,notes and identityColor (#RRGGBB). Populate supported fictional profile details consistently with the chat and user input; do not contradict canon. Never invent player decisions or raise combat stats without story evidence. Preserve IDs and existing facts. No separate AI call is needed. Hostile NPCs may be stored in NPC Management with isHostile:true; social rosters still only accept friendly NPCs.`;


// All-or-nothing AI form replacement. Never accept storage IDs, image paths or scope.
export function generatedDraft(raw) {
 if(!raw || typeof raw!=='object' || Array.isArray(raw))throw Error('AI did not return an NPC object.');
 const missing=Object.keys(FIELDS).filter(k=>typeof raw[k]!=='string'||!raw[k].trim());
 for(const k of RELATIONS)if(!Number.isFinite(raw[k]))missing.push(k);
 for(const k of STATS)if(!Number.isFinite(raw.stats?.[k]))missing.push(`stats.${k}`);
 if(typeof raw.stats?.rank!=='string'||!raw.stats.rank.trim())missing.push('stats.rank');
 if(!Array.isArray(raw.aliases))missing.push('aliases');
 if(!Array.isArray(raw.abilities)||raw.abilities.some(v=>!v||!clean(v.name)||!clean(v.category)||!clean(v.level)||!clean(v.description)||!Number.isFinite(v.proficiency)))missing.push('abilities');
 if(typeof raw.isHostile!=='boolean')missing.push('isHostile');
 if(!/^#[0-9a-f]{6}$/i.test(raw.identityColor))missing.push('identityColor');
 if(!Object.hasOwn(ROLE_ICONS,raw.roleIcon))missing.push('roleIcon');
 if(!Number.isFinite(raw.portraitSize))missing.push('portraitSize');
 if(missing.length)throw Error(`AI returned an incomplete NPC (${missing.join(', ')}). Your draft was not changed; try again.`);
 return {...profileFields(raw),...generatedAttributes(raw),isHostile:raw.isHostile,portraitSize:clamp(raw.portraitSize,48,144)};
}

// Conservative fallback for fully vowel-marked Thai transliterations. Unparsed
// syllables and ambiguous matches are rejected; explicit IDs/aliases take priority.
function thaiNameRomanization(value) {
 const s=keyName(value).replace(/[\s-]/g,'');
 const consonants={ก:'k',ค:'k',ข:'k',ฆ:'k',ง:'ng',จ:'j',ช:'ch',ซ:'s',ส:'s',ศ:'s',ษ:'s',ด:'d',ต:'t',ท:'t',ธ:'t',ถ:'t',น:'n',ณ:'n',บ:'b',ป:'p',พ:'p',ผ:'p',ฟ:'f',ม:'m',ย:'y',ร:'r',ล:'l',ว:'w',ฮ:'h',ห:'h'};
 const vowels={'า':'a','ะ':'a','ิ':'i','ี':'i','ุ':'u','ู':'u'};
 let result='',offset=0;
 while(offset<s.length){
  const leading=s[offset]==='โ'?'o':s[offset]==='เ'?'e':'';
  if(leading)offset++;
  const consonant=consonants[s[offset++]];if(!consonant)return '';
  const vowel=leading||vowels[s[offset++]];if(!vowel)return '';
  result+=consonant+vowel;
 }
 return result.length>=4?result:'';
}
export function resolveNpc(records, value) {
 const raw=typeof value==='string'?{name:value}:value||{};
 const id=raw.npcId||raw.id;
 const exact=id&&records.find(p=>p.id===id);if(exact)return exact;
 const requested=[raw.npcName||raw.name,...(Array.isArray(raw.aliases)?raw.aliases:[])].filter(Boolean).map(keyName);
 const names=p=>[p.name,...(p.aliases||[])].filter(Boolean).map(keyName);
 const direct=records.filter(p=>names(p).some(n=>requested.includes(n)));
 if(direct.length)return direct.length===1?direct[0]:null;
 const matches=records.filter(p=>names(p).some(n=>requested.some(r=>
  (/^[a-z]+$/.test(n)&&thaiNameRomanization(r)===n)||(/^[a-z]+$/.test(r)&&thaiNameRomanization(n)===r))));
 return matches.length===1?matches[0]:null;
}
