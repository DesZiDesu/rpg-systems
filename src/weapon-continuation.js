import {WEAPON_INSTRUCTIONS} from './weapon-core.js?v=0.80.2';
// Button consent belongs to the assistant continuation, never a fabricated User
// turn. Only small receipts are saved; the transient prompt is always cleared.
export const WEAPON_BUTTON_KEY='roleforge_weapon_buttons';
const actions=new Set(['use','reload','activate','deactivate','describe']);
const rows=message=>Array.isArray(message?.extra?.[WEAPON_BUTTON_KEY])?message.extra[WEAPON_BUTTON_KEY]:[];
export function weaponButtonAuthorizations(message,visible=value=>value){
 const source=String(visible(message?.mes||'')||''),swipe=Number(message?.swipe_id)||0;
 return rows(message).slice(0,128).filter(r=>r&&typeof r.id==='string'&&/^wb-[a-z0-9-]{8,80}$/iu.test(r.id)&&actions.has(r.action)&&typeof r.itemId==='string'&&r.swipe===swipe&&Number.isSafeInteger(r.offset)&&r.offset>=0&&r.offset<=source.length&&(!Number.isSafeInteger(r.end)||r.end>=r.offset)).map(r=>({id:r.id,itemId:r.itemId,action:r.action,story:source.slice(r.offset,Number.isSafeInteger(r.end)?r.end:undefined)}));
}
export async function continueWeaponAction({context,weapon,action,scope,language='en',id=()=>crypto.randomUUID(),visible=value=>value,reference={}}={}){
 const th=language==='th',captured=scope(),chat=context.chat,target=chat?.at(-1);
 if(!captured||!actions.has(action)||!weapon||typeof context.generate!=='function'||typeof context.setExtensionPrompt!=='function')throw Error(th?'ยังใช้คำสั่งอาวุธไม่ได้':'Weapon continuation is unavailable.');
 if(!target||target.is_user||target.is_system||!String(target.mes||'').trim())throw Error(th?'ต้องมีคำตอบ AI ก่อน จึงจะกดเจนต่อได้':'Wait for an assistant reply before continuing it.');
 if(rows(target).length>=128)throw Error(th?'ข้อความนี้มีคำสั่งอาวุธครบแล้ว กรุณาเริ่มเทิร์นใหม่':'Start a new story turn before adding more weapon actions.');
 // The host serializes weapon actions. Reuse one prompt slot instead of
 // accumulating an empty extension-prompt key for every click across chats.
 const before=target.mes,request={id:'wb-'+id(),itemId:weapon.itemId,action,swipe:Number(target.swipe_id)||0,offset:String(visible(before)||'').trimEnd().length},key='roleforge_weapon_continue';
 const event={id:request.id,requestId:request.id,actor:'player',outcome:'success',action,itemId:weapon.itemId,evidence:'exact new visible outcome naming the weapon'};
 const instruction=`${WEAPON_INSTRUCTIONS}\nCURRENT OWNED WEAPON / AMMO FACTS: ${JSON.stringify(reference)}\nContinue the current assistant scene from its ending. Resolve this explicit weapon-button request: ${JSON.stringify({weapon:weapon.name,action,requestId:request.id})}. Use the established world rules and actual Inventory. Do not add or quote a User message, invent player dialogue, or repeat earlier prose/events. Write only the new continuation, using <tr-narrative> for narration and <tr-dialogue name="speaker"> for actual dialogue. If the requested action actually succeeds, append ONE fresh tretaresia_patch with weaponEvents:[${JSON.stringify(event)}]; include count and ammoItemId when applicable, or weapon metadata for inspection. This button request is the player's consent: use requestId instead of inventing userEvidence. Evidence must quote this NEW continuation, name the weapon and show the player's completed action. Failure grants no effect. Keep earlier patches unchanged and do not repeat their resource costs.`;
 target.extra||={};target.extra[WEAPON_BUTTON_KEY]=[...rows(target),request];
 const changed=()=>{if(scope()!==captured)context.setExtensionPrompt(key,'',1,0,false,0);},chatChangedEvent=context.eventTypes?.CHAT_CHANGED;
 if(chatChangedEvent)context.eventSource?.on?.(chatChangedEvent,changed);
 try{
  context.setExtensionPrompt(key,instruction,1,0,false,0);
  // Native Continue still reads/sends the textarea at depth zero in ST 1.19.
  // Its nested-generation path bypasses input/commands/attachments; automatic
  // trigger also forbids a new User message. Never touch the user's draft DOM.
  await context.generate('continue',{automatic_trigger:true,depth:1});
  if(scope()!==captured||context.chat!==chat||chat.at(-1)!==target)throw Error(th?'แชทเปลี่ยนระหว่างรอ คำสั่งนี้ไม่ใช้กับแชทใหม่':'The chat changed; this request cannot affect the new chat.');
  if(target.mes===before)throw Error(th?'AI ยังไม่ได้เจนต่อ ลองใหม่ได้':'No continuation was generated. Try again.');
  return true;
 }finally{
  try{
   request.end=String(visible(target.mes||'')||'').length;
   if(target.mes===before)target.extra[WEAPON_BUTTON_KEY]=rows(target).filter(r=>r.id!==request.id);
  }finally{
   if(chatChangedEvent)context.eventSource?.removeListener?.(chatChangedEvent,changed);
   context.setExtensionPrompt(key,'',1,0,false,0);
  }
 }
}
