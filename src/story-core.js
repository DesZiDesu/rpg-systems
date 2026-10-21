import {sha256} from './vendor/js-sha256/index.js?v=0.80.1';
import {currencyScheme} from './currency-config.js?v=0.80.1';

export const STORY_PACK_FIELD='roleforge_story_pack';
export const STORY_CONTRACTS_KEY='roleforge_story_contracts';
export const STORY_FORMAT='roleforge-story-preset';
export const STORY_FILE_LIMIT=8*1024*1024;
const record=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const own=(o,k)=>Object.hasOwn(o||{},k),clone=v=>structuredClone(v);
const forbidden=new Set(['__proto__','constructor','prototype']);
const key=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
function text(v,label,max=120,required=false){if(typeof v!=='string'||v.length>max||required&&!v.trim())throw Error(`Invalid ${label}.`);return v.trim();}
function id(v,label='story ID'){const s=text(v,label,64,true);if(!/^[a-z0-9][\w.:-]*$/iu.test(s)||forbidden.has(s))throw Error(`Invalid ${label}.`);return s;}
function integer(v,label,min=0,max=999999999){if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(`Invalid ${label}.`);return v;}
const optional=(v,label,max)=>v===undefined?'':text(v,label,max);
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);Object.values(v).forEach(freeze);}return v;};
export const STORY_RULE_TYPES=Object.freeze(['location','npc','item','stat','power','quest','flag','day','time','event']);
export const STORY_STAT_PATHS=Object.freeze(['player.hp.current','player.hp.max','player.mp.current','player.mp.max','player.stamina.current','player.stamina.max','player.level','player.attributes.intelligence','player.attributes.strength','player.attributes.defense','player.attributes.agility']);
export function validateStoryRules(raw,depth=0){
 if(!record(raw)||depth>4||!['all','any'].includes(raw.match)||!Array.isArray(raw.rules)||raw.rules.length>32)throw Error('Invalid story condition group.');
 return{match:raw.match,rules:raw.rules.map(r=>{
  if(record(r)&&own(r,'rules'))return validateStoryRules(r,depth+1);
  if(!record(r)||!STORY_RULE_TYPES.includes(r.type))throw Error('Unknown story condition.');
  const type=r.type,target=text(r.target??'', 'condition target',180,true),op=r.op??'gte';
  if(!['eq','neq','gte','lte','gt','lt'].includes(op))throw Error('Invalid condition comparison.');
  if(type==='stat'&&!STORY_STAT_PATHS.includes(target)&&!/^player\.(?:customStats|attributes)\.[a-z][\w-]{0,63}$/iu.test(target))throw Error('Unsupported story stat path.');
  if(['item','stat','power','day'].includes(type)&&!Number.isFinite(r.value??1))throw Error('Invalid condition threshold.');
  if(['item','day'].includes(type))integer(r.value??1,'condition quantity',1);
  if(['event','flag'].includes(type))id(target,'condition identity');
  if(type==='flag'&&!['boolean','number','string'].includes(typeof(r.value??true)))throw Error('Invalid flag comparison.');
  if(type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/u.test(String(r.value)))throw Error('Use HH:mm story time.');
  const field=r.field??(type==='npc'?'met':type==='location'?'place':'');
  if(type==='npc'&&!['met','present','enabled'].includes(field)||type==='location'&&!['place','region','continent','path','id'].includes(field))throw Error('Invalid condition field.');
  return{type,target,op,...(field?{field}:{}),value:['item','stat','power','day'].includes(type)?r.value??1:type==='time'?r.value:type==='flag'?r.value??true:true,
   ...(type==='event'?{description:optional(r.description,'event meaning',1200)}:{}),...(r.versionId?{versionId:text(r.versionId,'NPC version',100,true)}:{}),...(r.not===true?{not:true}:{})};
 })};
}
export function validateStoryEntry(raw){
 if(!record(raw))throw Error('Invalid story template.');
 const kind=raw.kind??'mission',startMode=raw.startMode??'offer';
 if(!['mission','story'].includes(kind)||!['offer','automatic'].includes(startMode))throw Error('Invalid story type or start mode.');
 if(raw.enabled!==undefined&&typeof raw.enabled!=='boolean')throw Error('Invalid story enabled switch.');
 const triggers=validateStoryRules(raw.triggers||{match:raw.match||'all',rules:raw.rules||[]});
 if(!triggers.rules.length)throw Error('Add at least one start condition.');
 if(!Array.isArray(raw.objectives)||!raw.objectives.length||raw.objectives.length>40)throw Error('Use 1–40 story objectives.');
 const objectiveIds=new Set(),objectiveTitles=new Set(),objectives=raw.objectives.map(o=>{
  if(!record(o))throw Error('Invalid story objective.');const identity=id(o.id,'objective ID');
  if(objectiveIds.has(identity))throw Error('Duplicate objective ID.');objectiveIds.add(identity);const title=text(o.title,'objective title',180,true);if(objectiveTitles.has(key(title)))throw Error('Objective titles must be distinct.');objectiveTitles.add(key(title));
  return{id:identity,title:text(o.title,'objective title',180,true),optional:o.optional===true,
   ...(o.when?{when:validateStoryRules(o.when)}:{}),notes:optional(o.notes,'objective notes',1200)};
 });
 const r=raw.reward??{};if(!record(r)||r.delivery!==undefined&&!['claim','complete'].includes(r.delivery))throw Error('Invalid story reward.');
 const money=(r.money??[]);if(!Array.isArray(money)||money.length>64)throw Error('Invalid currency rewards.');
 const units=new Set();const currency=money.map(m=>{if(!record(m))throw Error('Invalid currency reward.');const unit=id(m.unit,'currency unit');if(units.has(unit))throw Error('Duplicate reward currency unit.');units.add(unit);return{unit,amount:integer(m.amount,'currency reward')};});
 const items=r.items??[];if(!Array.isArray(items)||items.length>20)throw Error('Use at most 20 item rewards.');
 const itemIds=new Set(),itemRewards=items.map(i=>{if(!record(i))throw Error('Invalid item reward.');const identity=id(i.id,'reward item ID');if(itemIds.has(identity))throw Error('Duplicate reward item ID.');itemIds.add(identity);return{id:identity,name:text(i.name,'reward item name',100,true),quantity:integer(i.quantity??1,'reward item quantity',1,99999),description:optional(i.description,'reward item description',600),category:optional(i.category,'reward item category',60)||'Quest reward'};});
 const flags=r.flags??[];if(!Array.isArray(flags)||flags.length>16)throw Error('Invalid story unlocks.');
 const flagRewards=flags.map(f=>{if(!record(f)||!['string','number','boolean'].includes(typeof f.value)||typeof f.value==='number'&&!Number.isFinite(f.value))throw Error('Invalid story flag.');return{id:id(f.id,'flag ID'),value:typeof f.value==='string'?text(f.value,'flag value',160):f.value};});
 return{id:id(raw.id),revision:integer(raw.revision??1,'template revision',1),name:text(raw.name,'story title',120,true),kind,enabled:raw.enabled!==false,
  summary:optional(raw.summary,'story summary',4000),authorNotes:optional(raw.authorNotes,'story guidance',12000),startMode,
  priority:integer(raw.priority??0,'story priority',0,100),triggers,objectives,
  reward:{experience:integer(r.experience??0,'experience reward'),money:currency,items:itemRewards,flags:flagRewards,delivery:r.delivery??'claim',description:optional(r.description,'reward description',1000)}};
}
const packCache=new WeakMap();
export function validateStoryPack(raw){
 if(!record(raw)||raw.format!==STORY_FORMAT||raw.version!==1||raw.previewOnly)throw Error(raw?.previewOnly?'Preview-only files cannot be used as live story presets.':'Unsupported Story / Mission preset.');
 if(packCache.has(raw))return packCache.get(raw);
 if(!Array.isArray(raw.entries))throw Error('The story preset needs an entries array.');
 const ids=new Set(),entries=raw.entries.map(e=>{const n=validateStoryEntry(e);if(ids.has(n.id))throw Error('Duplicate story template ID.');ids.add(n.id);return n;});
 const pack={format:STORY_FORMAT,version:1,id:id(raw.id,'story pack ID'),revision:integer(raw.revision??1,'pack revision',1),name:text(raw.name,'story pack name',120,true),entries};
 if(new TextEncoder().encode(JSON.stringify(pack)).length>STORY_FILE_LIMIT)throw Error('Story preset exceeds 8 MiB. Use an embedded World Pack for a larger library.');
 freeze(pack);packCache.set(raw,pack);packCache.set(pack,pack);return pack;
}
export function emptyStoryPack(name='Stories & missions',identity='stories'){return validateStoryPack({format:STORY_FORMAT,version:1,id:identity,revision:1,name,entries:[]});}
export function exportStoryPack(pack){return JSON.stringify(validateStoryPack(pack),null,2);}
export function importStoryPack(source){if(typeof source!=='string'||new TextEncoder().encode(source).length>STORY_FILE_LIMIT)throw Error('Story preset must be at most 8 MiB.');let raw;try{raw=JSON.parse(source.replace(/^\uFEFF/u,''));}catch{throw Error('Invalid Story / Mission JSON.');}return validateStoryPack(raw);}
export function storySummary(entry){const e=validateStoryEntry(entry);return{id:e.id,revision:e.revision,name:e.name,kind:e.kind,enabled:e.enabled,summary:e.summary.slice(0,400),startMode:e.startMode,priority:e.priority,triggers:e.triggers,objectiveCount:e.objectives.length,rewardDescription:e.reward.description,searchText:key([e.name,e.summary].join(' ')),_storySummary:true};}
const catalogCache=new WeakMap();
export function storyCatalog(raw){const pack=validateStoryPack(raw);if(catalogCache.has(pack))return catalogCache.get(pack);const byId=new Map(pack.entries.map(e=>[e.id,e])),summaries=freeze(pack.entries.map(storySummary)),catalog={pack,summaries,summaryById:new Map(summaries.map(e=>[e.id,e])),get:identity=>byId.get(identity)||null};catalogCache.set(pack,catalog);return catalog;}
export const storyInstanceId=(packId,templateId)=>'story-'+sha256(JSON.stringify([packId,templateId])).slice(0,48);
export const storyContractId=entry=>sha256(JSON.stringify(validateStoryEntry(entry)));
export const storyFactKey=(packId,templateId,eventId)=>JSON.stringify([packId,templateId,eventId]);
export const storyFlagKey=(packId,identity)=>JSON.stringify([packId,identity]);
export function normalizeStoryRuntime(raw){
 const result={version:1,instances:[],facts:[],flags:{}};if(!record(raw))return result;
 const used=new Set();
 for(const v of Array.isArray(raw.instances)?raw.instances:[]){try{if(!record(v)||!/^story-[a-f0-9]{48}$/u.test(v.id)||used.has(v.id)||!['Offered','Active','Completed','Failed','Declined','On Hold'].includes(v.status)||!/^([a-f0-9]{64})$/u.test(v.contractId))continue;
  const packId=id(v.packId),templateId=id(v.templateId);if(v.id!==storyInstanceId(packId,templateId))continue;used.add(v.id);
  result.instances.push({id:v.id,packId,templateId,contractId:v.contractId,status:v.status,revision:integer(v.revision,'instance revision',1),rewardClaimed:v.rewardClaimed===true,sourceMessageId:Number.isInteger(v.sourceMessageId)?v.sourceMessageId:null,sourceTurn:optional(v.sourceTurn,'source turn',200),sourceVariant:optional(v.sourceVariant,'source variant',200),createdAt:optional(v.createdAt,'creation time',60),updatedAt:optional(v.updatedAt,'update time',60)});
 }catch{}}
 for(const f of Array.isArray(raw.facts)?raw.facts:[]){try{result.facts.push({packId:id(f.packId),templateId:id(f.templateId),eventId:id(f.eventId,'event ID'),evidence:text(f.evidence,'event evidence',1200,true),sourceMessageId:Number.isInteger(f.sourceMessageId)?f.sourceMessageId:null,sourceTurn:optional(f.sourceTurn,'event turn',200),sourceVariant:optional(f.sourceVariant,'event variant',200)});}catch{}}
 if(record(raw.flags))for(const [k,v]of Object.entries(raw.flags)){if(k.length<=180&&!forbidden.has(k)&&['boolean','number','string'].includes(typeof v)&&!(typeof v==='number'&&!Number.isFinite(v)))result.flags[k]=typeof v==='string'?v.slice(0,160):v;}
 return result;
}
export function validateStoryContracts(raw={},instances=[]){if(!record(raw)||new TextEncoder().encode(JSON.stringify(raw)).length>STORY_FILE_LIMIT)throw Error('Invalid or oversized saved story contracts.');const result={};for(const [hash,value]of Object.entries(raw)){const entry=validateStoryEntry(value);if(!/^[a-f0-9]{64}$/u.test(hash)||storyContractId(entry)!==hash)throw Error('Saved story contract hash mismatch.');result[hash]=entry;}for(const instance of instances)if(!result[instance.contractId])throw Error('Story progress is missing its saved contract. Restore a complete chat backup.');return result;}
const compare=(a,b,op)=>op==='eq'?a===b:op==='neq'?a!==b:op==='gte'?a>=b:op==='lte'?a<=b:op==='gt'?a>b:a<b;
export function evaluateStoryRules(group,state,{packId='',templateId='',npc=identity=>state.npcs?.find(n=>n.id===identity),participants=[]}={}){
 const runtime=state.storyMissions||{instances:[],facts:[],flags:{}},rows=[];
 function leaf(r){let value=null,actual=null,expected=r.value;
  if(r.type==='location'){const loc=state.location;if(loc){actual=r.field==='path'?[loc.continent,loc.region,loc.place].filter(Boolean).join(' > '):loc[r.field];if(r.field==='id'&&!actual){const matches=(Array.isArray(state.locationMemory)?state.locationMemory:state.locationMemory?.entries||[]).filter(e=>[e.name,...(e.aliases||[])].some(n=>key(n)===key(loc.place))&&(!e.region||!loc.region||key(e.region)===key(loc.region))&&(!e.continent||!loc.continent||key(e.continent)===key(loc.continent)));if(matches.length===1)actual=matches[0].id;}if(typeof actual==='string'&&actual.trim()&&!/^(unknown|none|n\/a|ไม่ทราบ)$/iu.test(actual.trim())){const normalize=r.field==='path'?v=>key(v).replace(/\s*(?:→|->|>)\s*/gu,' > '):key;value=normalize(actual)===normalize(r.target);}}}
  if(r.type==='npc'){const n=npc(r.target);if(r.field==='present'){if(Array.isArray(participants))value=participants.some(p=>key(p)===key(r.target)||n&&key(p)===key(n.name));}else if(n&&typeof n[r.field]==='boolean')value=n[r.field];if(r.versionId&&n){if(n.activeAlternateId!==r.versionId)value=false;}else if(r.versionId&&!n)value=null;actual=value;}
  if(r.type==='item'){actual=(state.inventory||[]).filter(i=>i.id===r.target).reduce((n,i)=>n+(Number(i.quantity)||0),0);value=compare(actual,expected,r.op);}
  if(r.type==='stat'){actual=r.target.split('.').reduce((o,k)=>o?.[k],state);if(typeof actual==='number'&&Number.isFinite(actual))value=compare(actual,expected,r.op);}
  if(r.type==='power'){actual=state.customPowers?.[r.target];if(typeof actual==='number'&&Number.isFinite(actual))value=compare(actual,expected,r.op);}
  if(r.type==='day'){actual=state.worldClock?.day;if(Number.isFinite(actual))value=compare(actual,expected,r.op);}
  if(r.type==='time'){actual=state.worldClock?.time;if(/^([01]\d|2[0-3]):[0-5]\d$/u.test(actual||''))value=compare(actual,r.value,r.op);}
  if(r.type==='quest'){const q=(state.quests||[]).find(q=>q.id===r.target||q.id===storyInstanceId(packId,r.target));actual=q?.status;value=q?q.status==='Completed':null;}
  if(r.type==='flag'){const k=storyFlagKey(packId,r.target);actual=runtime.flags?.[k];if(own(runtime.flags,k))value=compare(actual,expected,['eq','neq'].includes(r.op)?r.op:'eq');}
  if(r.type==='event'){actual=(runtime.facts||[]).find(f=>f.packId===packId&&f.templateId===templateId&&f.eventId===r.target);value=actual?true:null;}
  if(r.not&&value!==null)value=!value;rows.push({rule:r,result:value,actual:actual??null});return value;
 }
 function visit(g){if(!g.rules.length)return null;const values=g.rules.map(r=>r.rules?visit(r):leaf(r));return g.match==='all'?values.some(v=>v===false)?false:values.every(v=>v===true)?true:null:values.some(v=>v===true)?true:values.every(v=>v===false)?false:null;}
 const result=visit(group);return{result,rows};
}
export function storyEligibility(summary,state,options={}){const test=evaluateStoryRules(summary.triggers,state,{...options,templateId:summary.id});return{...test,eligible:summary.enabled!==false&&test.result===true};}
export function storyRewardDescription(reward){return[reward.description,reward.experience&&`EXP +${reward.experience}`,...reward.money.filter(m=>m.amount).map(m=>`${m.unit} +${m.amount}`),...reward.items.map(i=>`${i.name} ×${i.quantity}`)].filter(Boolean).join(' · ');}
export function startStory(state,entry,packId,{accept=false,source={}}={}){
 const definition=validateStoryEntry(entry),instanceId=storyInstanceId(packId,definition.id),contractId=storyContractId(definition),runtime=normalizeStoryRuntime(state.storyMissions);
 const existing=runtime.instances.find(i=>i.id===instanceId);if(existing){if(accept&&existing.status==='Offered'){existing.status='Active';existing.updatedAt=new Date().toISOString();const q=state.quests?.find(q=>q.id===instanceId);if(q)q.status='Active';state.storyMissions=runtime;return{changed:true,instance:existing,contractId,definition};}return{changed:false,instance:existing,contractId,definition};}
 if(state.quests?.some(q=>q.id===instanceId))throw Error('A quest already uses this story identity.');
 const status=accept||definition.startMode==='automatic'?'Active':'Offered',now=new Date().toISOString();
 const instance={id:instanceId,packId,templateId:definition.id,contractId,revision:definition.revision,status,rewardClaimed:false,sourceMessageId:source.messageId??null,sourceTurn:source.turnKey??'',sourceVariant:source.variant??'',createdAt:now,updatedAt:now};
 runtime.instances.push(instance);state.storyMissions=runtime;state.quests||=[];state.quests.push({id:instanceId,name:definition.name,type:definition.kind==='story'?'Story':'Mission',status,objective:definition.summary.slice(0,500),notes:definition.summary.slice(0,1000),reward:storyRewardDescription(definition.reward).slice(0,160),objectives:definition.objectives.map(o=>({id:o.id,title:o.title,optional:o.optional,notes:o.notes,status:'Pending',evidence:'',sourceMessageId:null})),progress:0,rewardClaimed:false,source:'Story / Mission Manager',receivedAt:now,updatedAt:now});
 return{changed:true,instance,contractId,definition};
}
export function storyObjectivesReady(quest){return Boolean(quest?.objectives?.length)&&quest.objectives.filter(o=>!o.optional).every(o=>o.status==='Completed');}
export function finishStory(state,instanceId,status='Completed'){
 const instance=state.storyMissions?.instances.find(i=>i.id===instanceId),q=state.quests?.find(q=>q.id===instanceId);if(!instance||!q||!['Active','On Hold'].includes(instance.status)||!['Completed','Failed'].includes(status))return false;
 if(status==='Completed'&&!storyObjectivesReady(q))return false;instance.status=q.status=status;instance.updatedAt=q.updatedAt=new Date().toISOString();if(status==='Completed'){q.progress=100;q.completedAt=q.updatedAt;}return true;
}
const nonFact=/\b(?:if|hypothetical|would|might|plans? to|pretend|ooc)\b|สมมุติ|สมมติ|ถ้าหาก|ถ้า(?:พรุ่งนี้|วัน|จะ)|นอกบท|วางแผนว่าจะ/iu;
export function validStoryEvidence(event,story){return typeof event?.evidence==='string'&&event.evidence.trim().length>=4&&event.evidence.length<=1200&&!nonFact.test(event.evidence)&&String(story||'').includes(event.evidence.trim());}
export function applyStoryEvents(state,events,{packId,definitions,contracts,story,user='',source={},participants=[],npc}={}){
 const runtime=normalizeStoryRuntime(state.storyMissions);state.storyMissions=runtime;let changes=0;
 for(const event of Array.isArray(events)?events.slice(0,40):[]){
  if(!record(event)||!validStoryEvidence(event,story))continue;
  if(event.action==='trigger'){
   const definition=definitions.get(event.templateId);if(!definition?.enabled)continue;
   const targets=[];const walk=g=>g.rules.forEach(r=>r.rules?walk(r):r.type==='event'&&targets.push(r.target));walk(definition.triggers);
   if(!targets.includes(event.eventId))continue;
   const f={packId,templateId:definition.id,eventId:event.eventId,evidence:event.evidence.trim(),sourceMessageId:source.messageId??null,sourceTurn:source.turnKey??'',sourceVariant:source.variant??''};
   if(!runtime.facts.some(x=>storyFactKey(x.packId,x.templateId,x.eventId)===storyFactKey(f.packId,f.templateId,f.eventId))){runtime.facts.push(f);changes++;}continue;
  }
  const instance=runtime.instances.find(i=>i.id===event.instanceId),q=state.quests?.find(q=>q.id===event.instanceId),definition=instance&&contracts[instance.contractId];
  if(!instance||instance.packId!==packId||!q||!definition)continue;
  if(event.action==='accept'&&instance.status==='Offered'&&!nonFact.test(user)&&/\b(?:accept|take (?:the|this) (?:quest|mission|job))\b|รับ(?:งาน|ภารกิจ|เควส)|ตกลงรับ/iu.test(user)){
   const available=runtime.instances.filter(i=>i.status==='Offered');if(available.length===1||key(user).includes(key(q.name))){instance.status=q.status='Active';instance.updatedAt=new Date().toISOString();changes++;}continue;
  }
  if(!['Active','On Hold','Completed'].includes(instance.status))continue;
  if(event.action==='objective'&&instance.status==='Active'){
   const o=q.objectives.find(o=>o.id===event.objectiveId);if(!o||o.status==='Completed')continue;const expected=definition.objectives.find(x=>x.id===o.id);if(expected?.when&&evaluateStoryRules(expected.when,state,{packId,templateId:instance.templateId,npc,participants}).result!==true)continue;
   o.status='Completed';o.evidence=event.evidence.trim();o.sourceMessageId=source.messageId??null;changes++;
  }
  if(event.action==='complete'&&finishStory(state,instance.id))changes++;
  if(event.action==='fail'&&finishStory(state,instance.id,'Failed'))changes++;
 }
 for(const instance of runtime.instances.filter(i=>i.packId===packId&&i.status==='Active')){
  const definition=contracts[instance.contractId],q=state.quests?.find(q=>q.id===instance.id);if(!definition||!q)continue;
  for(const o of definition.objectives){const target=q.objectives.find(x=>x.id===o.id);if(target&&target.status!=='Completed'&&o.when?.rules.length&&evaluateStoryRules(o.when,state,{packId,templateId:instance.templateId,npc,participants}).result===true){target.status='Completed';target.evidence='Confirmed state conditions';target.sourceMessageId=source.messageId??null;changes++;}}
 }
 return changes;
}
export function storyRewardOperations(state,instance,definition){
 const q=state.quests?.find(q=>q.id===instance.id);if(instance.status!=='Completed'||instance.rewardClaimed||q?.rewardClaimed||!storyObjectivesReady(q))return null;
 const r=definition.reward,units=new Set(currencyScheme(state.progression.currency).units.map(u=>u.id)),meta={category:'quest-reward',questId:instance.id,reason:definition.name};
 for(const m of r.money)if(m.amount&&!units.has(m.unit))throw Error(`Reward currency “${m.unit}” is missing. Match this world's Currency Preset before claiming.`);
 const ops=[];if(r.experience)ops.push(['inc','progression.experience',r.experience,meta]);for(const m of r.money)if(m.amount)ops.push(['inc',`progression.currency.${m.unit}`,m.amount,meta]);
 for(const i of r.items)ops.push(['inc','inventory',clone(i),meta]);return ops;
}
export function markStoryReward(state,instanceId,definition){const instance=state.storyMissions?.instances.find(i=>i.id===instanceId),q=state.quests?.find(q=>q.id===instanceId);if(!instance||!q||instance.rewardClaimed)return false;instance.rewardClaimed=q.rewardClaimed=true;q.rewardClaimedAt=new Date().toISOString();for(const f of definition.reward.flags)state.storyMissions.flags[storyFlagKey(instance.packId,f.id)]=f.value;return true;}
export function managedStoryOperation(state,operation){
 const [,path,v,meta]=operation;if(/^storyMissions(?:\.|$)/u.test(String(path)))return true;
 const instances=state.storyMissions?.instances||[],identities=new Set(instances.map(i=>i.id));if(!identities.size)return false;
 if(path==='quests'||path==='questObjectives'){const qid=path==='questObjectives'?v?.questId:v?.id;return identities.has(qid)||(path==='quests'&&(state.quests||[]).some(q=>identities.has(q.id)&&key(q.name)===key(v?.name)));}
 return identities.has(meta?.questId)||identities.has(meta?.missionId);
}
export function storyPrompt({packId,entries,instances,quests,contracts,budget=10000}={}){
 if(!entries?.length&&!instances?.length)return'';
 const rows=[],active=[];
 for(const instance of instances||[]){const definition=contracts[instance.contractId],q=quests.find(q=>q.id===instance.id);if(!definition||!q||['Failed','Declined'].includes(instance.status)||instance.rewardClaimed)continue;active.push({instanceId:instance.id,templateId:instance.templateId,status:instance.status,name:q.name,summary:definition.summary.slice(0,1000),guidance:definition.authorNotes.slice(0,1800),objectives:q.objectives.filter(o=>o.status!=='Completed').slice(0,8).map(o=>({id:o.id,title:o.title,status:o.status,optional:o.optional})),progress:{completed:q.objectives.filter(o=>!o.optional&&o.status==='Completed').length,required:q.objectives.filter(o=>!o.optional).length},reward:definition.reward.delivery});}
 for(const entry of entries||[])rows.push({templateId:entry.id,name:entry.name,kind:entry.kind,startMode:entry.startMode,summary:entry.summary.slice(0,1000),guidance:entry.authorNotes.slice(0,1200),triggers:entry.triggers});
 const instruction='Story / Mission Manager: use only the supplied unlocked/candidate templates. Preserve player agency; an offer is not acceptance. Never create duplicate quests or pay these rewards through ops. Advance active objectives only after a confirmed event in THIS completed reply. Return storyEvents in the same tretaresia_patch: [{action:"accept",instanceId,evidence:"acceptance acknowledged in this reply; user must explicitly accept"},{action:"objective",instanceId,objectiveId,evidence:"exact quote from this reply"},{action:"complete",instanceId,evidence:"confirmed completion quote"},{action:"claim",instanceId,evidence:"actual reward handover quote"},{action:"trigger",templateId,eventId,evidence:"confirmed event quote"}]. Unknown IDs, imagined/future/OOC events and user-only quotes are not progress. The extension checks prerequisites and handles payouts. Do not reveal later chapters or hidden guidance verbatim. Already claimed rewards stay claimed. No separate AI request.';
 let payload={packId,active,candidates:rows};while(JSON.stringify(payload).length>budget&&payload.candidates.length)payload.candidates.pop();while(JSON.stringify(payload).length>budget&&payload.active.length>1)payload.active.pop();
 return instruction+'\n<roleforge_story_reference>\n'+JSON.stringify(payload)+'\n</roleforge_story_reference>';
}
