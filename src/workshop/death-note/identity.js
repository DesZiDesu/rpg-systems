// Only visible, completed disclosures teach identities. Library names and
// dialogue/header attributes are references, never evidence on their own.
const norm=s=>String(s||'').normalize('NFKC').replace(/\s+/gu,' ').trim().toLocaleLowerCase();
export const identityText=s=>String(s||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?(?:-->|$)/gu,'').replace(/<[^>]*>/gu,' ').replace(/\s+/gu,' ').trim();
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
export function containsIdentity(text,value){
 const name=norm(value);if(!name||name==='???')return false;
 return new RegExp('(?<![a-z0-9_])'+escape(name)+'(?![a-z0-9_])','iu').test(norm(text));
}
const speculative=/\b(?:if|would|could|will|pretend|imagine|plans? to)\b|สมมติ|กำลังจะ|อาจจะ|ถ้าหาก|ถ้าคุณ|ถ้าฉัน|ถ้าผม|อยาก.{0,24}(?:เห็น|ดู|อ่าน|รู้)|ตั้งใจจะ/iu;
const unavailableFace=/ไม่(?:เคย)?เห็น(?:หน้า|ใบหน้า)|ยังไม่.{0,18}(?:เห็น|หน้า)|(?:ปิดบัง|ปกปิด|บดบัง|เบลอ|พร่ามัว).{0,12}(?:หน้า|ภาพ)|(?:หน้า|ภาพ).{0,12}(?:เบลอ|พร่ามัว|ถูกปิด|ไม่ชัด)|\b(?:cannot|can't|didn't|not|never)\b.{0,22}(?:see|seen|face|photo)|\b(?:masked|blurred|obscured|concealed)\b/iu;
export function seenFace(evidence,{npcViewer=false}={}){
 if(speculative.test(evidence)||unavailableFace.test(evidence))return false;
 if(!npcViewer&&/\b(?:he|she|they|an NPC)\b.{0,20}\b(?:sees?|saw|views?)\b|(?:เขา|เธอ|พวกเขา)มองเห็น/iu.test(evidence)&&!/(?:คุณ|ฉัน|ผม|ผู้เล่น)|\b(?:you|I|player)\b/iu.test(evidence))return false;
 const face=/ใบหน้า|หน้าตา|ภาพถ่าย|รูปถ่าย|รูปหน้า|ภาพใบหน้า|\b(?:face|photograph|photo|mugshot|portrait)\b/iu.test(evidence);
 const witnessed=/เห็น|มอง|เผย|ถอดหน้ากาก|ชัดเจน|แสดง|ปรากฏ|จดจำ|จำ(?:ใบ)?หน้า|รู้(?:จัก)?ชื่อและ(?:ใบหน้า|หน้าตา)|รู้ทั้งชื่อและหน้าตา|\b(?:see|sees|seen|saw|view|views|viewed|shows?|display\w*|reveal\w*|unmask\w*|clear\w*|recogniz\w*)\b/iu.test(evidence);
 return face&&witnessed;
}
export function learnedName(evidence,name){
 if(!containsIdentity(evidence,name)||speculative.test(evidence)||/ยังไม่(?:รู้|ทราบ|บอก)|ไม่(?:ได้|เคย)(?:รู้|ทราบ|เห็น)|\b(?:not|never|cannot|can't)\b.{0,24}(?:learn|read|know|name)/iu.test(evidence))return false;
 const target=escape(name),directory=new RegExp('(?:directory|roster|contact entry|student record|รายชื่อ|ทะเบียน|ทำเนียบ).{0,220}'+target,'iu');
 if(directory.test(evidence)&&/(?:you|your|I|we)|(?:คุณ|ฉัน|ผม)|(?:click\w*|open\w*|read\w*|pull\w*)/iu.test(evidence))return true;
 // A narrator merely using someone's name is not a disclosure to the player.
 return /(?:คุณ|ฉัน|ผม|เรา|ข้า).{0,45}(?:อ่าน|ได้ยิน|รู้(?:จัก)?ชื่อ|จำชื่อ|ทราบชื่อ)|(?:ชื่อ|นาม).{0,12}(?:คือ|ว่า|ระบุ)|(?:ข่าว|รายงาน|เอกสาร|บัตร|ป้าย|หนังสือพิมพ์|จอ).{0,100}(?:ชื่อ|ระบุ)|(?:บอก|แจ้ง|แนะนำ).{0,18}(?:คุณ|ฉัน|ผม).{0,75}(?:ชื่อ|นาม)|\b(?:tells?|told|informs?|introduces?)\b.{0,30}\b(?:you|me)\b.{0,80}\b(?:name|named|called)\b|\b(?:you|I|we)\b.{0,55}\b(?:read|learn\w*|hear\w*|heard|know\w*|saw)\b.{0,70}\b(?:name|named|called)\b|\b(?:news|report|document|caption|badge|ID card|nameplate|screen)\b.{0,100}\b(?:name|named|identif\w*|labels?|reads?)\b/iu.test(evidence);
}
export function identityBound(evidence,npc,npcs,claim=''){
 const labels=[npc.name,...npc.aliases||[],npc.title,npc.occupation].filter(Boolean);
 return labels.some(label=>containsIdentity(evidence,label)&&npcs.filter(n=>[n.name,...n.aliases||[],n.title,n.occupation].some(v=>norm(v)===norm(label))).length===1)||
  Boolean(claim&&[npc.name,...npc.aliases||[]].some(v=>norm(v)===norm(claim))&&containsIdentity(evidence,claim)&&npcs.filter(n=>[n.name,...n.aliases||[]].some(v=>norm(v)===norm(claim))).length===1);
}
// A library alias alone (for example “Kira” in general news) does not
// establish which hidden person bears it. A named person or unique visible role
// can anchor an actual reported alias, including a false one.
export function nameDisclosure(evidence,npc,npcs,name){
 const intrinsic=npc.identityNames||[npc.name];
 const anchored=intrinsic.some(n=>containsIdentity(evidence,n))||[npc.title,npc.occupation].filter(Boolean).some(role=>containsIdentity(evidence,role)&&npcs.filter(n=>[n.title,n.occupation].includes(role)).length===1);
 return (anchored||seenFace(evidence))&&learnedName(evidence,name);
}
function playerRecognition(evidence,name){
 if(!containsIdentity(evidence,name)||speculative.test(evidence)||/\(\(|\bOOC\b|ไม่ได้|ยังไม่|\b(?:don't|do not|never)\b/iu.test(evidence))return false;
 const target=escape(name);
 return new RegExp('(?:\\b(?:this|that) is\\s+|\\bI (?:already )?(?:know|recognize|remember)\\s+(?:the name\\s+)?|นี่(?:คือ|ก็)|(?:ฉัน|ผม|เรา)(?:รู้จัก|รู้ชื่อ|จำชื่อ)(?:อยู่แล้ว)?\\s*)'+target+'(?![a-z0-9_])','iu').test(evidence);
}
export function observedIdentities(source,npcs,{playerAuthored=false}={}){
 const events=[],visible=String(source||'').replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/giu,'').replace(/<!--[\s\S]*?(?:-->|$)/gu,'');
 const passages=visible.split(/<\/(?:tr-narrative|tr-dialogue|p)>|\n\s*\n/iu).map(identityText).filter(s=>s&&s.length<=1200);
 for(const evidence of passages){
  const matches=npcs.filter(n=>identityBound(evidence,n,npcs));
  for(const npc of matches){
   const names=[npc.name,...npc.aliases||[]].filter(Boolean),name=names.filter(n=>nameDisclosure(evidence,npc,npcs,n)||(playerAuthored&&playerRecognition(evidence,n))).sort((a,b)=>b.length-a.length)[0];
   if(name)events.push({type:'name-learned',npcId:npc.id,claimedName:name,source:'visible-story',evidence});
   // Names may be disclosed together; one face witness never proves all faces.
   if(matches.length===1&&seenFace(evidence))events.push({type:'face-seen',npcId:npc.id,evidence});
  }
 }
 return events;
}
