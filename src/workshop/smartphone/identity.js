import {clean,clone} from './model.js?v=0.89.0';

const normalized=v=>clean(v,160).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu,' ');
export function phoneNpcNames(npc){
 const names=[npc.name,...(Array.isArray(npc.aliases)?npc.aliases:[])].filter(v=>typeof v==='string');
 // Only explicit alias declarations are identity evidence. An incidental name in a
 // biography, relationship, dialogue or private thought cannot merge two people.
 for(const field of ['relationship','relationshipState','notes']){
  const text=String(npc[field]||'');
  const patterns=[/\balias\s*:\s*["“']?([\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} ._-]{0,80}?)(?=["”')\n,;]|$)/giu,/\b(?:using|uses|under)\s+(?:the\s+)?alias\s+["“']?([\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}._-]{0,60})(?:["”']|\b)/giu,/(?:ชื่อปลอม|นามแฝง)\s*[:：]\s*["“']?([\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} ._-]{0,80}?)(?=["”')\n,;]|$)/gu];
  for(const pattern of patterns)for(const match of text.matchAll(pattern))names.push(match[1].trim());
 }
 return [...new Set(names.filter(Boolean))];
}
export function phoneNpcForContact(contact,npcs){
 if(contact.npcId)return npcs.find(n=>n.id===contact.npcId)||null;
 const labels=[contact.label,contact.name].map(normalized).filter(Boolean);
 const matches=npcs.filter(n=>phoneNpcNames(n).some(name=>labels.includes(normalized(name))));
 return matches.length===1?matches[0]:null;
}
export function linkPhoneContacts(current,npcs){
 let phone=current;
 for(const contact of current.contacts){
  if(contact.npcId)continue;const npc=phoneNpcForContact(contact,npcs);if(!npc)continue;
  if(phone===current)phone=clone(current);
  Object.assign(phone.contacts.find(c=>c.id===contact.id),{npcId:npc.id,name:npc.name,created:false});
 }
 if(phone!==current)phone.revision++;return phone;
}
