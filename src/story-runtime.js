import {sha256} from './vendor/js-sha256/index.js?v=0.85.9';
import {STORY_CONTRACTS_KEY,STORY_FILE_LIMIT,validateStoryPack,validateStoryEntry,emptyStoryPack,storyCatalog,storySummary,storyContractId,storyInstanceId,normalizeStoryRuntime,storyEligibility,startStory,finishStory,storyObjectivesReady,applyStoryEvents,validStoryEvidence,storyRewardOperations,markStoryReward,storyPrompt} from './story-core.js?v=0.85.9';

const clone=structuredClone,headers=pack=>{const {entries,...meta}=pack;return meta;};
export function createStoryRuntime(api){
 const empties=new Map(),contractCaches=new WeakMap(),prepared=new WeakMap();let flight=null;
 const context=()=>api.context(),owner=()=>api.owner()||'',chatId=()=>context().getCurrentChatId?.()||'';
 function empty(scope){const k=owner()+':'+scope;if(!empties.has(k))empties.set(k,emptyStoryPack('Stories & missions','stories-'+sha256(k).slice(0,20)));return empties.get(k);}
 function library(scope='active'){
  const override=api.chatPack?.();const useChat=scope==='chat'||scope==='active'&&Boolean(override);
  if(useChat&&override){const c=storyCatalog(override);return{scope:'chat',meta:headers(c.pack),summaries:c.summaries,identity:c.pack,get:async id=>c.get(id),export:async()=>c.pack};}
  const external=api.external?.();
  if(external?.external){const meta=external.storyMeta||headers(empty('character'));return{scope:useChat?'chat':'character',external:true,meta,summaries:external.storySummaries||[],identity:external,get:id=>external.storyRecord(id),export:async()=>await external.storyExport()||empty('character')};}
  const c=storyCatalog(api.nativePack?.()||empty('character'));return{scope:useChat?'chat':'character',meta:headers(c.pack),summaries:c.summaries,identity:c.pack,get:async id=>c.get(id),export:async()=>c.pack};
 }
 function ticket(scope='active'){const lib=library(scope);return{metadata:context().chatMetadata,owner:owner(),chatId:chatId(),identity:lib.identity,scope,lib};}
 function valid(t){if(context().chatMetadata!==t.metadata||owner()!==t.owner||chatId()!==t.chatId)return false;try{return library(t.scope).identity===t.identity;}catch{return false;}}
 const check=t=>{if(!valid(t))throw Error('Chat/card or story library changed. Reopen Story / Mission Manager.');};
 function contracts(metadata=context().chatMetadata){const raw=metadata?.[STORY_CONTRACTS_KEY];if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};if(contractCaches.has(raw))return contractCaches.get(raw);const result={};for(const [hash,value]of Object.entries(raw))try{if(!/^[a-f0-9]{64}$/u.test(hash))continue;const entry=validateStoryEntry(value);if(storyContractId(entry)===hash)result[hash]=Object.freeze(entry);}catch{}contractCaches.set(raw,result);return result;}
 function facts(state,participants){return{npc:id=>api.npc?.(id,state)||state.npcs?.find(n=>n.id===id),participants:participants??api.participants?.()??[]};}
 function status(entry,state,lib=library(),participants){const instance=state.storyMissions?.instances?.find(i=>i.id===storyInstanceId(lib.meta.id,entry.id));return{instance,quest:instance&&state.quests.find(q=>q.id===instance.id),...storyEligibility(entry,state,{packId:lib.meta.id,...facts(state,participants)})};}
 function relevant(lib,state,participants){return lib.summaries.filter(e=>{
  if(!e.enabled||state.storyMissions?.instances?.some(i=>i.id===storyInstanceId(lib.meta.id,e.id)))return false;
  const result=status(e,state,lib,participants);return result.eligible||result.result===null&&result.rows.some(r=>r.rule.type==='event'&&r.result===null)&&result.rows.filter(r=>r.result===null).every(r=>r.rule.type==='event');
 }).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)).slice(0,8);}
 async function prepare(state=api.state(),{participants}={}){
  const t=ticket();if(!t.chatId)return null;
  const selected=relevant(t.lib,state,participants),rows=await Promise.all(selected.map(e=>t.lib.get(e.id)));check(t);
  const definitions=new Map(rows.filter(Boolean).map(validateStoryEntry).map(e=>[e.id,e]));
  const record={identity:t.identity,definitions,candidates:rows.filter(Boolean).map(e=>status(e,state,t.lib,participants).eligible?e:{...e,authorNotes:''})};prepared.set(t.metadata,record);return record;
 }
 function prompt(state){let t;try{t=ticket();}catch{return'';}const p=prepared.get(t.metadata);if(!p||p.identity!==t.identity)return'';return storyPrompt({packId:t.lib.meta.id,entries:p.candidates,instances:state.storyMissions?.instances||[],quests:state.quests||[],contracts:contracts(t.metadata)});}
 function mergeContracts(current,updates){const next={...current,...updates};if(new TextEncoder().encode(JSON.stringify(next)).length>STORY_FILE_LIMIT)throw Error('Active story contracts exceed 8 MiB. Export a chat backup before starting more stories.');return next;}
 async function savePack(raw,{scope='active',expected=ticket(scope)}={}){
  if(flight||api.busy?.())throw Error('Wait for generation and pending saves before editing stories.');check(expected);
  const entries=raw.entries;
  if(!Array.isArray(entries))throw Error('Story entries are missing.');
  let release;flight=new Promise(resolve=>{release=resolve;});try{
   if(expected.lib.external&&expected.lib.scope==='character'){
    await api.saveExternal({...raw,entries},expected);return;
   }
   const complete=await Promise.all(entries.map(e=>e._storySummary?expected.lib.get(e.id):e));check(expected);
   const pack=validateStoryPack({...raw,entries:complete});
   if(expected.lib.scope==='chat')await api.saveChatPack(pack,expected);else await api.saveCharacterPack(pack,expected);
  }finally{flight=null;release();prepared.delete(expected.metadata);api.refresh?.();}
 }
 async function saveEntry(raw,{scope='active',expected=ticket(scope)}={}){
  const entry=validateStoryEntry(raw),lib=expected.lib,old=lib.summaries.find(e=>e.id===entry.id);
  if(old&&entry.revision!==old.revision)throw Error('This template changed in another editor. Reload it before saving.');
  return savePack({...lib.meta,revision:lib.meta.revision+1,entries:old?lib.summaries.map(e=>e.id===entry.id?{...entry,revision:entry.revision+1}:e):[...lib.summaries,entry]},{scope,expected});
 }
 async function remove(identity,options={}){const t=options.expected||ticket(options.scope);return savePack({...t.lib.meta,revision:t.lib.meta.revision+1,entries:t.lib.summaries.filter(e=>e.id!==identity)},{...options,expected:t});}
 async function toggle(identity,options={}){const t=options.expected||ticket(options.scope),entry=await t.lib.get(identity);check(t);if(!entry)throw Error('This template no longer exists.');return saveEntry({...entry,enabled:!entry.enabled},{...options,expected:t});}
 async function payout(state,instanceId,allContracts){const instance=state.storyMissions.instances.find(i=>i.id===instanceId),definition=instance&&allContracts[instance.contractId];if(!definition)throw Error('The saved story contract is missing. Restore its chat backup.');const ops=storyRewardOperations(state,instance,definition);if(ops===null)return{next:state,changed:false};
  if((state.progression.experience||0)+definition.reward.experience>999999999)throw Error('This experience reward exceeds the supported exact range.');
  for(const reward of definition.reward.items){const count=state.inventory.filter(i=>i.id===reward.id).reduce((n,i)=>n+i.quantity,0);if(count+reward.quantity>99999)throw Error('The reward would exceed the item quantity limit.');}
  const paid=ops.length?api.applyReward(state,ops):{next:clone(state),accepted:0,notifications:[]};
  if(paid.accepted!==ops.length)throw Error('A reward component could not be applied. No story reward was paid.');
  if(!api.fundsValid(paid.next))throw Error('The reward exceeds this wallet’s exact range. No story reward was paid.');
  markStoryReward(paid.next,instanceId,definition);return{next:paid.next,changed:true,notifications:paid.notifications||[]};
 }
 async function act(action,identity,{objectiveId,completed=true,scope='active'}={}){
  if(flight||api.busy?.())throw Error('Wait for generation and pending saves.');const t=ticket(scope);if(!t.chatId)throw Error('Open a chat before using Story / Mission Manager.');
  let release;flight=new Promise(resolve=>{release=resolve;});
  const oldContracts=t.metadata[STORY_CONTRACTS_KEY];
  try{
   let next=clone(api.state());next.storyMissions=normalizeStoryRuntime(next.storyMissions);let allContracts=contracts(t.metadata),changed=false;
   if(action==='accept'||action==='offer'){
    const instance=next.storyMissions.instances.find(i=>i.id===storyInstanceId(t.lib.meta.id,identity));
    const definition=instance?allContracts[instance.contractId]:await t.lib.get(identity);check(t);if(!definition)throw Error('This template is unavailable.');
    if(!instance||instance.status==='Offered'){if(!status(definition,next,t.lib).eligible)throw Error('The start conditions are not met.');}
    const result=startStory(next,definition,t.lib.meta.id,{accept:action==='accept'});changed=result.changed;
    if(changed)allContracts=mergeContracts(allContracts,{[result.contractId]:result.definition});
   }else{
    const instance=next.storyMissions.instances.find(i=>i.id===identity),q=next.quests.find(q=>q.id===identity);if(!instance||!q)throw Error('This mission no longer exists.');
    if(action==='accept-instance'&&instance.status==='Offered'){const definition=allContracts[instance.contractId];if(!definition)throw Error('The saved story contract is missing.');if(!storyEligibility(definition,next,{packId:instance.packId,...facts(next)}).eligible)throw Error('The start conditions are not met.');instance.status=q.status='Active';instance.updatedAt=new Date().toISOString();changed=true;}
    if(action==='objective'){if(instance.status!=='Active')throw Error('Only active objectives can be edited.');const objective=q.objectives.find(o=>o.id===objectiveId);if(!objective)throw Error('Objective not found.');objective.status=completed?'Completed':'Pending';objective.evidence='Confirmed by the player';objective.source='manual-story';changed=true;}
    if(action==='complete'){changed=finishStory(next,identity);if(!changed&&!['Completed','Failed'].includes(instance.status))throw Error('Finish the required objectives first.');}
    if(action==='decline'&&instance.status==='Offered'){instance.status='Declined';q.status='On Hold';changed=true;}
    if(action==='claim'){const result=await payout(next,identity,allContracts);next=result.next;changed=result.changed;}
    if(action==='pause'&&['Active','On Hold'].includes(instance.status)){instance.status=q.status=instance.status==='Active'?'On Hold':'Active';changed=true;}
    if(action==='complete'&&changed&&allContracts[instance.contractId]?.reward.delivery==='complete'){const paid=await payout(next,identity,allContracts);next=paid.next;}
   }
   check(t);if(!changed)return false;
   t.metadata[STORY_CONTRACTS_KEY]=allContracts;
   if(!await api.persist(next,'story-manager',{saveBeforeRender:true}))throw Error('Story progress could not be saved.');
   prepared.delete(t.metadata);return true;
  }catch(error){if(t.metadata[STORY_CONTRACTS_KEY]!==oldContracts){if(oldContracts===undefined)delete t.metadata[STORY_CONTRACTS_KEY];else t.metadata[STORY_CONTRACTS_KEY]=oldContracts;}throw error;}
  finally{flight=null;release();api.refresh?.();}
 }
 async function processReply(state,events,{story,user='',source={},participants=[]}={}){
  events=Array.isArray(events)?events:[];
  const t=ticket(),p=await prepare(state,{participants});check(t);if(!p)return{next:state,changes:0};
  let next=clone(state);next.storyMissions=normalizeStoryRuntime(next.storyMissions);let allContracts=contracts(t.metadata),changes=0;const notifications=[],errors=[];
  const packIds=new Set([t.lib.meta.id,...next.storyMissions.instances.map(i=>i.packId)]);
  for(const packId of packIds)changes+=applyStoryEvents(next,events,{packId,definitions:packId===t.lib.meta.id?p.definitions:new Map(),contracts:allContracts,story,user,source,participants,npc:id=>api.npc?.(id,next)||next.npcs.find(n=>n.id===id)});
  let started=0;for(const definition of p.definitions.values()){
   if(started>=3)break;
   if(status(definition,next,t.lib,participants).eligible){const result=startStory(next,definition,t.lib.meta.id,{source});if(result.changed){allContracts=mergeContracts(allContracts,{[result.contractId]:result.definition});changes++;started++;notifications.push({kind:'quest',title:definition.name,detail:result.instance.status==='Offered'?'New mission available':'Story started'});}}
  }
  for(const instance of [...next.storyMissions.instances]){
   const definition=allContracts[instance.contractId];if(!definition||instance.status!=='Completed'||instance.rewardClaimed)continue;
   const claim=(events||[]).some(e=>e?.action==='claim'&&e.instanceId===instance.id&&validStoryEvidence(e,story));
   if(definition.reward.delivery!=='complete'&&!claim)continue;
   try{const paid=await payout(next,instance.id,allContracts);next=paid.next;if(paid.changed){changes++;notifications.push(...paid.notifications,{kind:'quest',title:definition.name,detail:'Mission reward received'});}}
   catch(error){errors.push(error.message);}
  }
  check(t);return{next,changes,contracts:allContracts,notifications,errors};
 }
 function guardsOperation(state,operation){const [,path,value]=operation;if(path!=='quests')return false;const p=prepared.get(context().chatMetadata);if(!p)return false;const names=new Set(p.candidates.map(e=>e.name.normalize('NFKC').toLowerCase().trim()));return typeof value?.name==='string'&&names.has(value.name.normalize('NFKC').toLowerCase().trim());}
 return{library,ticket,valid,contracts,prepare,prompt,status,guardsOperation,savePack,saveEntry,remove,toggle,act,processReply,
  get busy(){return Boolean(flight);},async idle(){if(flight)await flight;},
  async exportPack(scope='active'){const t=ticket(scope),pack=await t.lib.export();check(t);return validateStoryPack(pack);},
  async read(identity,scope='active'){const t=ticket(scope),entry=await t.lib.get(identity);check(t);return entry;},
  refresh(){prepared.delete(context().chatMetadata);},
 };
}
