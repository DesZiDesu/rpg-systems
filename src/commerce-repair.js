import {publicCommerceStory,publicTradeDialogues} from './commerce-dialogue-facts.js?v=0.58.13';
import {confirmedMarketplaceEvent} from './marketplace-events.js?v=0.58.13';
import {commerceOpeningRefused} from './commerce-opening.js?v=0.58.13';
import {createCommerceSession,commerceBasketQuote} from './commerce-engine.js?v=0.58.13';
import {selectionFromShopRequest,validateShopSelection,commerceQuantityFacts,disclosedShopStock} from './commerce-stock-selection.js?v=0.58.13';
import {readCommercePrices} from './commerce-prices.js?v=0.58.13';
import {evidenceText} from './interaction-evidence.js?v=0.58.13';
import {convertMoney} from './commerce-currency.js?v=0.58.13';
import {validStatEffects,normalizeItemUsage,ITEM_DEFINITION_INSTRUCTIONS} from './item-definition.js?v=0.58.13';
import {validItemLearning} from './item-learning.js?v=0.58.13';
import {requestCommerceTask} from './commerce-task.js?v=0.58.13';

const instructions=`Repair ONE incomplete current buy/sell offer after the player presses Fill offer details. Return ONLY JSON: {marketplace:{...},basketQuote?:{amount,denomination,evidence},selection?:{evidence,items:[{itemId,quantity}]}} or {unavailable:true,reason:"what the NPC must clarify"}. This is a data task, not another story turn or payment. Read the latest public NPC reply and the supplied preceding conversation to resolve references such as "all three books". Use only the current named merchant and location. Preserve exact publicly offered item names, prices, currency, disclosed stock and purchase terms. Never invent goods, prices, quantity, a discount, buyer funds, a paid transaction or a player decision. Private reasoning is not evidence. If names/prices are unavailable even in the supplied context, return unavailable instead of guessing. You may design ONLY missing item descriptions/properties/usage/skill effects consistently with established public facts and world canon; preserve known definitions. Include every required item field, even empty arrays or null. Unknown stock stays stockKnown:false; do not invent store counts. Ordinary goods use terms:{mode:"permanent"}; rooms/rentals/services keep publicly agreed scoped duration/return/key terms and deposits. Every line needs evidence containing its exact name and price in this merchant's public dialogue; evidence may come from the supplied preceding same-merchant conversation when the latest reply refers to that offer. Complete buy shape: marketplace:{kind:"npcShop",location,evidence,seller:{name},denomination,items:[{id,name,quantity:1,category,description,rarity,properties:[],usage:{...},price,denomination,stockKnown,negotiableKnown,terms:{...},evidence}]}. Complete sell shape: marketplace:{kind:"npcPurchase",location,evidence,buyer:{name},denomination,items:[{itemId,itemName,quantity,askPrice,denomination,evidence}]}, using only owned inventory. Selection quotes the current user request exactly. For all N distinct products, select every product with quantity:1, never N of every product. If the latest merchant quotes a discounted total, basketQuote is REQUIRED, with that exact current merchant quote and final amount; keep original unit prices separately. Do not divide a total price into invented unit prices. Only explicit quantities or an unambiguous all-products request justify a basket; otherwise omit selection/basketQuote. Do not return narrative, ops, commerce decisions, HTML or markdown.\n`+ITEM_DEFINITION_INSTRUCTIONS+'\nFor this explicit repair task, return JSON metadata only; the composer displays the descriptions and effects. Do not output a normal story reply or prose.';

export function commerceRepairReference(context,{messageId,kind,state,visible=value=>value,record=()=>null,locationFor=()=>null,canon=''}={}){
 const chat=context.chat||[],message=chat[messageId],userId=chat.findLastIndex(m=>m?.is_user&&!m.is_system);
 if(!message||message.is_user||messageId<=userId||!['buy','sell'].includes(kind))return null;
 const story=publicCommerceStory(visible(message.mes)),current=publicTradeDialogues(story);
 if(!current.length||commerceOpeningRefused(story))return null;
 const names=new Set(current.map(d=>d.name)),recent=[];
 // Only the contiguous recent conversation at this place can identify an old
 // catalog. Stop at another merchant, a settled trade, or a recorded move.
 for(let id=messageId-1;id>=Math.max(0,messageId-8);id--){
  const m=chat[id];if(!m||m.is_system)continue;
  const location=locationFor(id,m),r=record(id,m);
  if(location&&evidenceText(location)!==evidenceText(state.location?.place)||r?.marketplace?.status==='resolved'||r?.commerceOpening?.status==='settled'
   ||state.commerce?.sessions?.some(s=>s.source?.messageId===id&&!['offered','open'].includes(s.status)))break;
  const content=publicCommerceStory(visible(m.mes));
  if(!m.is_user){const speakers=publicTradeDialogues(content);if(speakers.some(d=>d.prices.length&&!names.has(d.name)))break;}
  recent.unshift({role:m.is_user?'user':'assistant',content:content.slice(-12000)});
 }
 const prior=recent.filter(m=>m.role==='assistant').map(m=>m.content).join('\n');
 // Price evidence is restricted to this reply's named merchant(s), even if a
 // bystander quoted unrelated goods in a previous message.
 const facts=[...publicTradeDialogues(prior),...current].filter(d=>names.has(d.name)).map(d=>`<tr-dialogue name="${d.name.replace(/["<>]/gu,'')}">${d.quote}</tr-dialogue>`).join('\n');
 return{kind,story,user:publicCommerceStory(visible(chat[userId].mes)),location:state.location?.place,facts,recentChat:recent,
  inventory:state.inventory||[],customPowers:state.customPowers||{},canon:String(canon).slice(0,10000)};
}
export async function requestCommerceRepair(context,reference){
 const prompt='COMMERCE REPAIR REFERENCE DATA:\n'+JSON.stringify(reference).replace(/</gu,'\\u003c');
 const responseLength=readCommercePrices(reference.facts||reference.story).length>12?8192:4096;
 return requestCommerceTask(context,{systemPrompt:instructions+'\nKeep each description and usage effect at most 240 characters and conditions at most 3 entries. Do not repeat the reference conversation.',prompt,responseLength,trimNames:false},
  {quietPrompt:instructions+'\n'+prompt,skipWIAN:true,removeReasoning:true});
}
function completeDefinition(item){
 const u=item?.usage;if(!item||!['name','category','description','rarity'].every(k=>typeof item[k]==='string'&&item[k].trim())||!Array.isArray(item.properties)||item.properties.some(p=>typeof p!=='string')||!u)return false;
 const normalized=normalizeItemUsage(u,item);
 return ['use','eat','drink','passive'].includes(u.action)&&typeof u.consumable==='boolean'&&typeof u.effect==='string'&&u.effect.trim()&&Array.isArray(u.conditions)&&u.conditions.every(c=>typeof c==='string')&&typeof u.target==='string'&&u.target.trim()
  &&u.cooldown&&['none','seconds','minutes','hours','days','turns'].includes(u.cooldown.unit)&&Number.isSafeInteger(u.cooldown.value)&&u.cooldown.value>=0&&(u.cooldown.unit==='none'?u.cooldown.value===0:u.cooldown.value>0)
  &&(u.charges===null||u.charges&&normalized.charges&&normalized.charges.max===u.charges.max&&normalized.charges.remaining===u.charges.remaining)&&validStatEffects(u.stats)&&validItemLearning(u.learns)&&!normalized.learningInvalid;
}
export function validateCommerceRepair(raw,reference,source){
 if(!raw||raw.unavailable||raw.ops||raw.commerce||raw.auction||raw.narrative)return null;
 const market=raw.marketplace;if(!market)return null;
 const story=publicCommerceStory(reference.story),facts=publicCommerceStory(reference.facts),dialogues=publicTradeDialogues(story);
 const npc=market.kind==='npcPurchase'?market.buyer?.name:market.seller?.name;
 if(!dialogues.some(d=>d.name===npc&&d.prices.length)||commerceOpeningRefused(story))return null;
 if(reference.kind==='buy'&&(!Array.isArray(market.items)||!market.items.length||market.items.length>40||!market.items.every(i=>completeDefinition(i)&&Number.isSafeInteger(i.quantity)&&i.quantity>=1&&typeof i.stockKnown==='boolean'&&typeof i.negotiableKnown==='boolean'&&i.terms&&typeof i.terms==='object')))return null;
 if(reference.kind==='buy'&&(market.items.some(i=>typeof i.id!=='string'||!i.id.trim())||new Set(market.items.map(i=>i.id)).size!==market.items.length||new Set(market.items.map(i=>evidenceText(i.name).toLocaleLowerCase())).size!==market.items.length))return null;
 if(reference.kind==='sell'&&market.buyer?.budget!=null)return null; // Unknown buyer funds are not invented by a repair.
 const event=confirmedMarketplaceEvent({...market,selection:undefined},facts,reference.user,reference.location,reference.inventory,{kind:reference.kind});
 if(!event||(reference.kind==='sell')!==(event.kind==='npcPurchase'))return null;
 const entries=event.items||[{id:event.item.id,item:event.item,askPrice:event.askPrice,denomination:event.denomination}];
 // Require every price to be tied to its own exact product in this merchant's
 // dialogue; a global matching number cannot authorize an invented unit price.
 if(entries.some(entry=>{
  const d=publicTradeDialogues(facts).findLast(d=>d.name===npc&&d.quote.includes(entry.item.name));if(!d)return true;
  const start=d.quote.indexOf(entry.item.name);
  const end=Math.min(...entries.filter(e=>e!==entry).map(e=>d.quote.indexOf(e.item.name)).filter(i=>i>start),d.quote.length);
  if(entry.item.quantity>1&&!commerceQuantityFacts(d.quote.slice(start,end)).some(f=>f.quantity===entry.item.quantity))return true;
  if(reference.kind==='buy'){
   const supplied=market.items.find(i=>i.name===entry.item.name),stock=disclosedShopStock(d.quote.slice(start,end));
   if(supplied.stockKnown&&(stock===null||supplied.stock!==stock)||stock!==null&&(!supplied.stockKnown||supplied.stock!==stock))return true;
  }
  return !readCommercePrices(d.quote.slice(start+entry.item.name.length,end)).some(p=>p.amount===entry.askPrice&&p.denomination===entry.denomination);
 }))return null;
 event.id=reference.eventId;
 const session=createCommerceSession(event,source);if(!session)return null;
 let selection=raw.selection||market.selection;
 if(reference.kind==='buy'&&selection){
  const all=/(?:ทั้ง(?:หมด|[0-9๐-๙]|ศูนย์|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)|\ball\b)/iu.test(reference.user),counts=commerceQuantityFacts(reference.user);
  const validAll=all&&(!counts.length||counts.length===1&&counts[0].quantity===entries.length)&&selection.evidence===reference.user&&selection.items?.length===entries.length&&entries.every(e=>selection.items.some(line=>line.itemId===e.id&&line.quantity===1));
  selection=validAll?{evidence:reference.user,items:entries.map(e=>({itemId:e.id,quantity:1}))}:validateShopSelection(selection,entries,reference.user);
  if(!selection)return null;
 }else if(reference.kind==='buy')selection=selectionFromShopRequest(entries,reference.user);
 if(selection){session.basket=selection.items;session.selectedId=selection.items[0].itemId;session.quote=commerceBasketQuote(session,selection.items);if(session.quote===null)return null;}
 const priorItems=entries.some(e=>!publicTradeDialogues(story).some(d=>d.name===npc&&d.quote.includes(e.item.name)));
 if(priorItems&&(!selection||!raw.basketQuote))return null;
 if(priorItems&&/(?:ทั้งหมด|ทั้ง[0-9๐-๙หนึ่งสองสามสี่ห้าหกเจ็ดแปดเก้า]|\ball\b)/iu.test(reference.user)){
  const prior=publicTradeDialogues(facts).filter(d=>d.name===npc&&!dialogues.some(c=>c.quote===d.quote));
  if(prior.reduce((count,d)=>count+d.prices.length,0)!==entries.length)return null;
 }
 if(raw.basketQuote){
  const q=raw.basketQuote;if(!selection||typeof q.evidence!=='string'||!q.evidence.trim()||!Number.isSafeInteger(q.amount)||q.amount<=0)return null;
  if(!/(?:รวม|ทั้งหมด|ทั้ง(?:[0-9๐-๙]|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)|ลดให้เหลือ|\b(?:total|bundle|all)\b)/iu.test(q.evidence))return null;
  if(/(?:ไม่ลด|ไม่ยอม|ไม่ตกลง|ไม่รับ|ปฏิเสธ|สมมุติ|สมมติ|พรุ่งนี้|\b(?:refuse|cannot|tomorrow|hypothetical)\b|won't|not accept)/iu.test(q.evidence))return null;
  const current=dialogues.filter(d=>d.name===npc&&d.prices.length),latest=current.at(-1),price=latest?.prices.at(-1);
  if(!latest?.quote.includes(q.evidence)||price?.amount!==q.amount||price?.denomination!==q.denomination||!readCommercePrices(q.evidence).some(p=>p.amount===q.amount&&p.denomination===q.denomination))return null;
  const amount=convertMoney(q.amount,q.denomination,session.denomination);if(amount===null)return null;session.quote=amount;
 }
 session.title=event.title||npc;return{event,session};
}
