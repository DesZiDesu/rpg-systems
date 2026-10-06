import {createItemComposer} from './item-composer.js?v=0.58.8';
import {normalizeItemSystem,currentItemNpcs,prepareItemAction,validateItemResponse,applyItemDecision,missingInventoryDetails,applyItemDetails,configureItemUsage} from './item-core.js?v=0.58.8';
import {requestItemDecision,requestItemDetails} from './item-generation.js?v=0.58.8';
import {evidenceText} from './interaction-evidence.js?v=0.58.8';
import {hasTaskGeneration} from './task-generation.js?v=0.58.8';
const fingerprint=s=>JSON.stringify(s,(k,v)=>['updatedAt','createdAt'].includes(k)?undefined:v);
export function createItemRuntime(api){
 let scope='',pending=null,phase='',receipt=null,error='',retry=null,ticket=0,destroyed=false,inFlight=false,lastPools='',progress=null,saving=false;
 const t=(th,en)=>api.settings().language==='th'?th:en;
 const ui=createItemComposer({dock:api.dock,document:api.document,language:()=>api.settings().language,perform:input=>void perform(input),inspect:item=>api.inspect(item),cancel,clearResult:()=>{receipt=null;error='';retry=null;progress=null;refresh();}});
 const messages={reserved:['จำนวนนี้กันไว้ในรายการขาย ยกเลิกหรือลดรายการขายก่อน','This quantity is reserved for sale; cancel or reduce the listing first.'],provider:['สิทธิ์แบบจำกัดจำนวนครั้งต้องให้ผู้ให้บริการยืนยันการใช้ในโรล','Ask the provider to redeem this limited-use entitlement in role-play.'],stale:['รายการ แชต หรือฉากเปลี่ยนระหว่างรอ กรุณาเลือกรายการใหม่','The item, chat or scene changed. Choose again.'],inventory:['ไอเทมหรือจำนวนไม่พร้อมใช้งาน','The item or requested quantity is unavailable.'],npc:['ผู้รับไม่ได้อยู่ในฉากปัจจุบัน','The recipient is not in this scene.'],ownership:['ของเช่าหรือของที่ฝากบริการต้องจัดการผ่านผู้ให้บริการ','Manage rental/service assets through their provider.'],expired:['สิทธิ์ใช้ไอเทมยังไม่พร้อมหรือหมดอายุ','This entitlement is inactive or expired.'],unknown:['ยังไม่ทราบวิธีใช้ไอเทมนี้','The item use is unknown.'],cooldown:['ไอเทมยังอยู่ใน Cooldown','The item is on cooldown.'],charges:['ใช้ครบจำนวนครั้งแล้ว','No charges remain.'],capacity:['พื้นที่บันทึกเต็ม รายการยังไม่เปลี่ยน','Storage capacity reached; nothing changed.'],unavailable:['โฮสต์ยังไม่รองรับ API และการบันทึกที่จำเป็น','The host lacks the required generation or saving API.'],save:['บันทึกไม่สำเร็จ ข้อความและคลังกลับเป็นค่าเดิม ลองใหม่ได้','Save failed. The previous message and inventory were restored.'],duplicate:['รายการนี้บันทึกแล้ว จึงไม่ทำซ้ำ','This action is already recorded.'],response:['AI ส่งข้อมูลผลรายการไม่ครบ คลังยังไม่เปลี่ยน','AI returned an incomplete item decision. Inventory unchanged.'],narrative:['คำตอบไอเทมไม่มี narrative/dialogue ที่ใช้ได้ คลังยังไม่เปลี่ยน','The item response lacks valid narrative/dialogue. Inventory unchanged.'],learned:['รู้วิชานี้แล้วหรือความชำนาญเต็ม ไอเทมยังอยู่ครบ','Already learned or mastery is full. Nothing consumed.'],learning:['ข้อมูลวิชาที่ไอเทมมอบไม่ถูกต้อง คลังยังไม่เปลี่ยน','Invalid granted ability metadata. Nothing changed.'],effects:['ข้อมูลผลต่อร่างกายไม่ถูกต้อง คลังยังไม่เปลี่ยน','Invalid meter effects. Inventory unchanged.'],evidence:['ผลรายการยังไม่มีข้อความยืนยันที่ตรงกัน คลังยังไม่เปลี่ยน','The result lacks matching narrative evidence. Inventory unchanged.']};
 messages['response-empty']=['API ไม่มีข้อความผลไอเทม · ลองใหม่ได้ คลังยังไม่เปลี่ยน','The API returned no item reply. Retry. Inventory unchanged.'];
 messages['response-truncated']=['คำตอบไอเทมครบขีดจำกัดโทเคนก่อนส่งข้อมูลครบ · เพิ่มขีดจำกัดคำตอบแล้วลองใหม่ คลังยังไม่เปลี่ยน','The item reply reached the output token limit. Increase the response limit and retry. Inventory unchanged.'];
 messages['response-api']=['เรียก API ไอเทมไม่สำเร็จ · ตรวจการเชื่อมต่อแล้วลองใหม่ คลังยังไม่เปลี่ยน','The item API request failed. Check the connection and retry. Inventory unchanged.'];
 function status(code){error=t(...(messages[code]||messages.response));api.notify('warning',error);}
 function sourceAt(context,id){const m=context.chat[id];return m?{messageId:id,turnKey:api.turnKey(id),variant:api.variant(m)}:null;}
 function pools(state,context){return normalizeItemSystem(state.itemSystem).loot.filter(p=>evidenceText(p.location)===evidenceText(state.location?.place)&&p.entries.some(e=>e.remaining)&&(p.origin==='drop'||context.chat?.[p.source.messageId]&&!context.chat[p.source.messageId].is_user&&api.turnKey(p.source.messageId)===p.source.turnKey&&api.variant(context.chat[p.source.messageId])===p.source.variant)).reverse();}
 function view(){const context=api.context(),state=api.state();const latest=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system),participants=api.participants(latest,context.chat?.[latest]);return{scope:context.getCurrentChatId?.()?JSON.stringify([context.getCurrentChatId(),api.owner?.()]):'',state,npcs:currentItemNpcs(state,participants),pools:pools(state,context),phase,receipt,error,progress,saving,retry:Boolean(retry),requestLabel:pending?.prepared.action==='enrich'?t('AI เติมรายละเอียดและวิธีใช้เฉพาะที่ขาด','AI fills missing descriptions and usage'):pending?.prepared.action==='collect'?t('เก็บ Loot ที่เลือก','Collect selected loot'):pending?.prepared.item?.name||'',turn:api.turn(),externalBusy:api.isBusy()};}
 function refresh(){if(destroyed)return;const key=api.context().getCurrentChatId?.()?JSON.stringify([api.context().getCurrentChatId(),api.owner?.()]):'';if(scope!==key){cancel(false);scope=key;receipt=null;error='';retry=null;lastPools='';}const next=view();ui.update(next);const ids=next.pools.map(p=>p.id).join('|');if(ids&&ids!==lastPools)ui.openLoot(next.pools[0].id);lastPools=ids;}
 function cancel(show=true){if(saving&&show)return;ticket++;pending=null;phase='';retry=null;error='';progress=null;if(show){receipt=null;refresh();} /* Generation result is ignored, never applied after cancellation. */ }
 async function perform(input){
  if(destroyed||pending||inFlight||saving)return;
  receipt=null;error='';progress=null;const original=input.retry?retry:input;retry=null;if(!original){refresh();return;}
  const context=api.context(),state=api.state(),id=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system),message=context.chat?.[id];
  if(!context.getCurrentChatId?.()||!message&&!['enrich','configure'].includes(original.action)||typeof context.saveMetadata!=='function'||original.action!=='configure'&&!hasTaskGeneration(context)){status('unavailable');refresh();return;}
  if(original.action==='configure'){const result=configureItemUsage(state,original.itemId,original.usage);if(!result.ok){status(result.error);refresh();return;}const before=fingerprint(state),metadata=context.chatMetadata,chatId=context.getCurrentChatId(),owner=api.owner?.();const unchanged=()=>api.context().chatMetadata===metadata&&api.context().getCurrentChatId?.()===chatId&&api.owner?.()===owner&&fingerprint(api.state())===before;try{saving=true;await api.commitDetails({context,next:result.next,unchanged});receipt={action:'configure',outcome:'success',reason:t('บันทึกคุณสมบัติและผลต่อสเตตัสแล้ว','Item properties and stat effects saved.')};}catch{status('save');}finally{saving=false;refresh();}return;}
  const prepared=original.action==='enrich'?{ok:true,request:{id:'details-'+Date.now(),action:'enrich',location:state.location?.place}}:prepareItemAction(state,original,{participants:api.participants(id,message),turn:api.turn(),requestId:'item-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random()),location:state.location?.place});
  if(!prepared.ok){status(prepared.error);refresh();return;}
  const source=sourceAt(context,id);pending={input:structuredClone(original),prepared:prepared.request,source,message,variant:source?.variant,metadata:context.chatMetadata,chatId:context.getCurrentChatId(),owner:api.owner?.()};phase='queued';refresh();ui.showRequest();await resume();
 }
 async function resume(){
  if(destroyed||!pending||inFlight||api.isBusy())return;
  const context=api.context(),state=api.state(),job=pending;
  if(context.chatMetadata!==job.metadata||context.getCurrentChatId?.()!==job.chatId||api.owner?.()!==job.owner||job.message&&(context.chat?.[job.source.messageId]!==job.message||api.variant(job.message)!==job.variant)){cancel(false);status('stale');refresh();return;}
  const userId=(context.chat||[]).findLastIndex(m=>m?.is_user&&!m.is_system),id=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system);
  if(id<userId||id>=0&&!api.ready(id,context.chat[id]))return;
  if(job.prepared.action==='enrich'){await enrich(job);return;}
  if(evidenceText(state.location?.place)!==evidenceText(job.prepared.location)){pending=null;phase='';status('stale');refresh();return;}
  const prepared=prepareItemAction(state,job.input,{participants:api.participants(id,context.chat[id]),turn:api.turn(),requestId:job.prepared.id,location:state.location.place});
  if(!prepared.ok){pending=null;phase='';status(prepared.error);refresh();return;}
  const source=sourceAt(context,id),message=context.chat[id],request={...prepared.request,source},savedText=message.mes,variant=api.variant(message),count=context.chat.length,stateKey=fingerprint(state),token=++ticket;
  const unchanged=()=>!destroyed&&token===ticket&&api.context().chatMetadata===job.metadata&&api.context().getCurrentChatId?.()===job.chatId&&api.owner?.()===job.owner&&api.context().chat?.[id]===message&&message.mes===savedText&&api.variant(message)===variant&&api.context().chat.length===count&&fingerprint(api.state())===stateKey;
  phase='working';inFlight=true;api.setBusy(true);refresh();
  try{
   api.recordRequest('items',request.action);
   const raw=await requestItemDecision(context,request,{state,story:api.visible(message.mes),canon:api.canon?.()||'',settings:api.settings()});
   if(!unchanged())throw Error('stale');let parsed;try{parsed=typeof raw==='object'?raw:api.parse(raw);}catch{throw Error('response');}
   const checked=validateItemResponse(parsed,request),result=applyItemDecision(state,request,checked);if(!result.ok)throw Error(result.error);
   saving=true;refresh();await api.commit({context,source,message,previous:state,result,unchanged});saving=false;if(token!==ticket)return;
   receipt=result.receipt;retry=null;error='';pending=null;phase='';
  }catch(failure){if(token===ticket){retry=job.input;pending=null;phase='';status(failure?.code||failure?.message||'response');api.log?.(failure);}}
  finally{saving=false;inFlight=false;api.setBusy(false);refresh();}
 }
 async function enrich(job){
  const context=api.context(),rows=missingInventoryDetails(api.state()),token=++ticket;
  if(!rows.length){pending=null;phase='';receipt={action:'enrich',outcome:'success',reason:t('ข้อมูลไอเทมครบแล้ว ไม่ได้เรียก API','Item details are complete; no API request was made.')};refresh();return;}
  const jobProgress=progress={done:0,total:rows.length};phase='working';inFlight=true;api.setBusy(true);refresh();let updated=0,unresolved=0;
  try{
   for(let offset=0;offset<rows.length;offset+=6){
    if(token!==ticket)return;if(api.isBusy())throw Error('stale');
    const state=api.state(),stateKey=fingerprint(state),chatSnapshot=JSON.stringify((context.chat||[]).map(m=>[m?.is_user,m?.mes,m?.swipe_id])),owner=api.owner?.();
    const unchanged=()=>!destroyed&&token===ticket&&api.context().chatMetadata===job.metadata&&api.context().getCurrentChatId?.()===job.chatId&&api.owner?.()===owner&&JSON.stringify((api.context().chat||[]).map(m=>[m?.is_user,m?.mes,m?.swipe_id]))===chatSnapshot&&fingerprint(api.state())===stateKey;
    const items=rows.slice(offset,offset+6).map(r=>({item:state.inventory.find(i=>i.id===r.item.id),missing:r.missing}));if(items.some(r=>!r.item))throw Error('stale');
    const request={id:job.prepared.id+'-'+offset,action:'enrich',items},latest=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system);
    api.recordRequest('items','enrich · '+(offset/6+1)+'/'+Math.ceil(rows.length/6));
    const raw=await requestItemDetails(context,request,{state,story:api.visible(context.chat?.[latest]?.mes||''),canon:api.canon?.()||'',settings:api.settings()});
    if(!unchanged())throw Error('stale');let parsed;try{parsed=typeof raw==='object'?raw:api.parse(raw);}catch{throw Error('response');}
    const result=applyItemDetails(state,request,parsed);if(!result.ok)throw Error(result.error);
    saving=true;refresh();await api.commitDetails({context,next:result.next,unchanged});saving=false;updated+=result.updated.length;unresolved+=result.unresolved.length;jobProgress.done+=items.length;refresh();
   }
   if(token===ticket){receipt={action:'enrich',outcome:'success',reason:t(`อัปเดตข้อมูล ${updated} รายการ · ยังยืนยันข้อมูลไม่ครบ ${unresolved} รายการ`,`Updated ${updated} items · ${unresolved} still have unknown information`)};pending=null;phase='';retry=null;error='';}
  }catch(failure){if(token===ticket){retry={action:'enrich'};pending=null;phase='';status(failure?.code||failure?.message||'response');if(progress?.done)error+=t(' · เก็บข้อมูลจากชุดที่บันทึกแล้วไว้',' · Previously saved batches are retained');api.log?.(failure);}}
  finally{saving=false;inFlight=false;api.setBusy(false);refresh();}
 }
 return{view,refresh,resume,perform,openItem(id){if(!pending&&!inFlight){receipt=null;error='';progress=null;}refresh();ui.openItem(id);},openLoot(id){refresh();ui.openLoot(id);},cancel,isBusy:()=>inFlight,destroy(){destroyed=true;cancel(false);ui.destroy();}};
}
