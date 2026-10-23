import {uiLanguage} from './ui-language.js?v=0.85.4';
// Optional player-view policy. It never changes archive records or stable IDs.
let provider=null,revision=0;
export const npcVisibilityRevision=()=>revision;
export const npcIdentityProtected=()=>Boolean(provider);
export function setNpcVisibilityProvider(next){provider=typeof next==='function'?next:null;revision++;globalThis.dispatchEvent?.(new Event('roleforge-npc-visibility'));}
export function playerNpc(profile){
 if(!provider||!profile?.id)return profile;if(profile._rfVisibilityRevision===revision)return profile;
 const value=provider(profile),name=typeof value==='string'?value:value?.name;if(typeof name!=='string')return profile;const sight=typeof value==='object'&&value?.sight?value.sight:null;
 const names=[profile.name,...profile.aliases||[]].filter(Boolean).sort((a,b)=>b.length-a.length);
 const redact=value=>typeof value==='string'?/^(?:data:|https?:|blob:)/u.test(value)?value:names.reduce((text,real)=>text.split(real).join(name),value):Array.isArray(value)?value.map(redact):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,(/(?:Id|Ids|Key|Url|URL)$/u.test(k)||['id','roleIconImage','npcOwner','src','path'].includes(k))?v:redact(v)])):value;
 return {...redact(profile),id:profile.id,name,aliases:[],_rfVisibilityRevision:revision,_rfEyeDisplay:value?.display||null,_rfDeathNote:value?.deathNote||null,_rfFaceKnowledge:value?.face?{...value.face,evidence:redact(value.face.evidence)}:null,...(sight?{_rfNameSight:sight}:{_rfNameSight:null})};
}

let storyGuard=null;
export const setNpcStoryGuard=next=>{storyGuard=typeof next==='function'?next:null;};
export const filterNpcStoryOps=(ops,context)=>storyGuard?storyGuard(ops,context):ops;

export function appendPlayerNpcName(node,profile,slot='npc'){
 node.textContent=profile.name||'???';const sight=profile._rfNameSight;if(!sight||profile._rfEyeDisplay?.[slot]===false)return node;node.style.setProperty('--rf-eye-color',profile._rfEyeDisplay?.color||'#e78287');node.classList.add('rf-npc-eye-identity');
 if(sight.trueName&&sight.trueName!==profile.name){const real=node.ownerDocument.createElement('span');real.className='rf-npc-true-name';real.textContent=' ('+sight.trueName+')';node.append(real);}else {const real=node.ownerDocument.createElement('span');real.className='rf-npc-true-name';real.textContent=profile.name||sight.trueName;node.replaceChildren(real);}
 if(sight.lifespan&&profile._rfEyeDisplay?.lifespan!==false){const life=node.ownerDocument.createElement('small');life.className='rf-npc-original-lifespan';life.textContent=sight.lifespan;life.title=sight.lifespanSource==='simulation'?(uiLanguage()==='th'?'อายุขัยจำลองเกมที่บันทึกไว้ ไม่ใช่ข้อมูลต้นฉบับ':'Saved simulated game lifespan, not canon'):uiLanguage()==='th'?'อายุขัยเดิมที่ดวงตามองเห็น':'Original natural lifespan';node.append(life);}
 return node;
}

// Read-only addon sections disappear when the provider is removed. Never store
// projected identity, private lifespans or these UI fields back in NPC records.
export function deathNoteNpcSection(profile,doc=globalThis.document){
 const data=profile?._rfDeathNote;if(!data||!data.race&&!data.eyeSource&&!data.books?.length)return null;
 const th=uiLanguage()==='th',section=doc.createElement('section');section.className='trpg-read-section rf-dn-npc-facts';
 const heading=doc.createElement('h3');heading.textContent='Death Note';section.append(heading);
 const add=text=>{const p=doc.createElement('p');p.textContent=text;section.append(p);};
 if(data.race)add(th?'เผ่าพันธุ์: ยมทูต':'Race: Shinigami');if(data.eyeSource)add(data.eyeSource);
 for(const b of data.books||[])add(b.id+' · '+[b.holder?(th?'ถือสมุด':'Physical holder'):'',b.owner?(th?'เจ้าของสิทธิ์':'Human rights owner'):'',b.originalShinigami?(th?'ยมทูตดั้งเดิม':'Original Shinigami'):'',b.currentShinigami?(th?'ยมทูตเจ้าของปัจจุบัน':'Current Shinigami owner'):'',b.attachedShinigami?(th?'ยมทูตประจำสมุด':'Attached Shinigami'):''].filter(Boolean).join(' / '));
 return section;
}
let addonSummary=null;
export function setDeathNoteSummary(value){addonSummary=value||null;globalThis.dispatchEvent?.(new Event('roleforge-death-note-visibility'));}
export const deathNoteSummary=()=>addonSummary;
