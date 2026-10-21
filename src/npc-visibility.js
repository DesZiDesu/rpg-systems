import {uiLanguage} from './ui-language.js?v=0.81.2';
// Optional player-view policy. It never changes archive records or stable IDs.
let provider=null,revision=0;
export const npcVisibilityRevision=()=>revision;
export const npcIdentityProtected=()=>Boolean(provider);
export function setNpcVisibilityProvider(next){provider=typeof next==='function'?next:null;revision++;globalThis.dispatchEvent?.(new Event('roleforge-npc-visibility'));}
export function playerNpc(profile){
 if(!provider||!profile?.id)return profile;
 const value=provider(profile),name=typeof value==='string'?value:value?.name;if(typeof name!=='string')return profile;const sight=typeof value==='object'&&value?.sight?value.sight:null;
 const names=[profile.name,...profile.aliases||[]].filter(Boolean).sort((a,b)=>b.length-a.length);
 const redact=value=>typeof value==='string'?/^(?:data:|https?:|blob:)/u.test(value)?value:names.reduce((text,real)=>text.split(real).join(name),value):Array.isArray(value)?value.map(redact):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,(/(?:Id|Ids|Key|Url|URL)$/u.test(k)||['id','roleIconImage','npcOwner','src','path'].includes(k))?v:redact(v)])):value;
 return {...redact(profile),id:profile.id,name,aliases:[],_rfFaceKnowledge:value?.face?{...value.face,evidence:redact(value.face.evidence)}:null,...(sight?{_rfNameSight:sight}:{_rfNameSight:null})};
}

let storyGuard=null;
export const setNpcStoryGuard=next=>{storyGuard=typeof next==='function'?next:null;};
export const filterNpcStoryOps=(ops,context)=>storyGuard?storyGuard(ops,context):ops;

export function appendPlayerNpcName(node,profile){
 node.textContent=profile.name||'???';const sight=profile._rfNameSight;if(!sight)return node;node.classList.add('rf-npc-eye-identity');
 if(sight.trueName&&sight.trueName!==profile.name){const real=node.ownerDocument.createElement('span');real.className='rf-npc-true-name';real.textContent=' ('+sight.trueName+')';node.append(real);}else node.classList.add('rf-npc-true-name');
 if(sight.lifespan){const life=node.ownerDocument.createElement('small');life.className='rf-npc-original-lifespan';life.textContent=sight.lifespan;life.title=uiLanguage()==='th'?'อายุขัยเดิมที่ดวงตามองเห็น':'Original natural lifespan';node.append(life);}
 return node;
}
