// Ability origin is an actor fact, independent of notebook possession and UI.
export const actorKey=id=>typeof id==='string'&&id.length>0&&id.length<180&&!['__proto__','constructor','prototype'].includes(id);
export const isShinigami=npc=>/^(?:shinigami|ยมทูต)$/iu.test(String(npc?.race||''));
export const isHuman=npc=>/^(?:human|มนุษย์)$/iu.test(String(npc?.race||''));
export const EYE_SOURCES=['none','deal','innate','gift','roleplay'];
export const cleanEyeSource=value=>EYE_SOURCES.includes(typeof value==='string'?value:value?.source)?(typeof value==='string'?value:value.source):'none';
export function eyeAbility(world,actorId='player'){
 const stored=world.actorEyes?.[actorId];
 // Read old saves, without converting a paid deal to free innate eyes.
 const source=stored?cleanEyeSource(stored):actorId==='player'&&world.eyes?'deal':'none';
 const memoryLost=actorId==='player'?world.memoryLost:world.actorMemoryLost?.[actorId];
 return {source,active:source!=='none'&&(source!=='deal'||!memoryLost),paidFraction:world.lifeFractions?.[actorId]??(actorId==='player'?world.lifespanFraction:1)??1};
}
export function syncPlayerEyes(world){world.eyes=eyeAbility(world).active;world.lifespanFraction=world.lifeFractions?.player??world.lifespanFraction??1;world.lifeDeadlineSeconds=world.lifeDeadlines?.player??world.lifeDeadlineSeconds;}
export function loseFinalRights(world,actorId){
 if(Object.values(world.books).some(b=>b.ownerId===actorId))return;
 if(actorId==='player')world.memoryLost=true;else (world.actorMemoryLost||={})[actorId]=true;
 if(eyeAbility(world,actorId).source==='deal')(world.actorEyes||={})[actorId]={source:'none'};
 syncPlayerEyes(world);
}
export function defaultDeathNoteSettings(raw={}){
 return {header:raw.header!==false,dialogue:raw.dialogue!==false,npc:raw.npc!==false,lifespan:raw.lifespan!==false,color:/^#[\da-f]{6}$/iu.test(raw.color||'')?raw.color:'#e78287',lifespanMode:raw.lifespanMode==='simulated'?'simulated':'authored'};
}
export function eyeSourceLabel(source,language='th'){
 const th={none:'ไม่มีดวงตา',deal:'ข้อตกลงดวงตา',innate:'มีตั้งแต่เกิด',gift:'ได้รับพลังโดยไม่แลก',roleplay:'กำหนดจากโรล'};
 const en={none:'No eyes',deal:'Eye bargain',innate:'Born with eyes',gift:'Granted without a bargain',roleplay:'Established in roleplay'};
 return (language==='en'?en:th)[source]||(language==='en'?en:th).none;
}
