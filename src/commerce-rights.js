import {completeItemDefinition,ITEM_DEFINITION_INSTRUCTIONS} from './item-definition.js?v=0.58.3';
import {CURRENCY_VALUES} from './commerce-currency.js?v=0.58.3';
import {readCommercePrices} from './commerce-prices.js?v=0.58.3';
import {evidenceText,namedInteraction} from './interaction-evidence.js?v=0.58.3';

const clean=(value,max=300)=>typeof value==='string'?value.trim().slice(0,max):'';
const whole=(value,max=999999999)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
const clone=value=>structuredClone(value);
const units=['gold','silver','copper'];
const modes=['permanent','rental','access','service'];
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.codePointAt(0),16777619);return(n>>>0).toString(36);};
export function storyMinute(clock){
    if(!Number.isSafeInteger(clock?.day)||clock.day<1||!/^([01]\d|2[0-3]):[0-5]\d$/u.test(clock?.time||''))return null;
    const [h,m]=clock.time.split(':').map(Number);return(clock.day-1)*1440+h*60+m;
}
const stamp=value=>storyMinute(value)===null?null:{day:value.day,time:value.time};
export function normalizePurchaseTerms(raw){
    if(raw===undefined)return{mode:'permanent'};
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!modes.includes(raw.mode))return null;
    if(raw.mode==='permanent'){
        if(Object.keys(raw).some(k=>!['mode','scope','delivery'].includes(k)))return null;
        if(raw.scope===undefined&&raw.delivery===undefined)return{mode:'permanent'};
        const scope=clean(raw.scope,160),delivery=raw.delivery;
        if(!scope||!delivery||typeof delivery!=='object'||Array.isArray(delivery)||!clean(delivery.name,140)||delivery.category&&delivery.category!=='Key')return null;
        return{mode:'permanent',scope,delivery:completeItemDefinition({...delivery,name:clean(delivery.name,140),category:'Key',description:clean(delivery.description,300)})};
    }
    const from=raw.validFrom==null?null:stamp(raw.validFrom),until=raw.validUntil==null?null:stamp(raw.validUntil);
    if(raw.validFrom!=null&&!from||raw.validUntil!=null&&!until||from&&until&&storyMinute(until)<=storyMinute(from))return null;
    const duration=raw.durationMinutes===undefined?0:raw.durationMinutes,uses=raw.uses===undefined?0:raw.uses,deposit=raw.deposit===undefined?0:raw.deposit;
    if(!whole(duration,52560000)||!whole(uses,99999)||!whole(deposit))return null;
    const scope=clean(raw.scope,160),conditions=clean(raw.conditions,600),permanent=raw.permanent===true;
    if(!scope||raw.mode==='access'&&!permanent&&!until&&!duration&&!uses)return null;
    if(permanent&&(raw.mode!=='access'||until||duration||uses)||raw.mode==='rental'&&!until&&!duration&&!conditions)return null;
    if(raw.mode==='service'&&(uses||permanent)||raw.mode==='rental'&&uses)return null;
    let delivery=null;
    if(raw.delivery!=null){
        if(!raw.delivery||typeof raw.delivery!=='object'||!clean(raw.delivery.name,140))return null;
        delivery=completeItemDefinition({...raw.delivery,name:clean(raw.delivery.name,140),category:clean(raw.delivery.category,60)||'Item',description:clean(raw.delivery.description,300)});
    }
    const targetItemId=clean(raw.targetItemId,100);
    if(targetItemId&&raw.mode!=='service'||raw.mode==='rental'&&!delivery)return null;
    return{mode:raw.mode,scope,validFrom:from,validUntil:until,durationMinutes:duration,uses,deposit,permanent,
        conditions,includes:(Array.isArray(raw.includes)?raw.includes:[]).map(x=>clean(x,160)).filter(Boolean).slice(0,8),delivery,targetItemId,redeemers:(Array.isArray(raw.redeemers)?raw.redeemers:[]).map(x=>clean(x,120)).filter(Boolean).slice(0,8)};
}
export function normalizeCommerceRights(raw){
    const ids=new Set(),out=[];
    for(const value of Array.isArray(raw)?raw:[]){
        if(!value?.id||ids.has(value.id)||!['active','returned','completed','used','cancelled'].includes(value.status)||!units.includes(value.denomination))continue;
        const terms=normalizePurchaseTerms(value.terms);if(!terms||terms.mode==='permanent')continue;
        if(!whole(value.revision)||!whole(value.paid)||!whole(value.depositPaid)||!whole(value.depositRefunded)||value.depositRefunded>value.depositPaid||!whole(value.remainingUses,99999))continue;
        out.push({...clone(value),id:clean(value.id,180),terms,history:(value.history||[]).slice(-30)});ids.add(value.id);
    }
    return out;
}
export function rightStatus(right,clock){
    if(right.status!=='active')return right.status;
    const now=storyMinute(clock),from=storyMinute(right.starts),until=storyMinute(right.ends);
    if(now!==null&&from!==null&&now<from)return'upcoming';
    if(now!==null&&until!==null&&now>=until)return right.terms.mode==='service'?'due':'expired';
    if(right.terms.uses&&!right.remainingUses)return'used';
    return'active';
}
export function rightsView(state){return normalizeCommerceRights(state.commerce?.rights).map(r=>({...r,effectiveStatus:rightStatus(r,state.worldClock)}));}
export function rightsPromptReference(state){
    const rights=rightsView(state),current=rights.filter(r=>r.status==='active'||r.depositPaid>r.depositRefunded),closed=rights.filter(r=>!current.some(c=>c.id===r.id)).slice(-12);
    return [...current,...closed].map(({id,revision,itemName,terms,provider,location,starts,ends,remainingUses,status,effectiveStatus,inventoryItemId,denomination,depositPaid,depositRefunded})=>
        ({id,revision,itemName,terms,provider,location,starts,ends,remainingUses,status,effectiveStatus,inventoryItemId,denomination,depositPaid,depositRefunded}));
}
export function purchaseDeposit(lines){return lines.reduce((sum,line)=>sum+(line.entry.terms?.deposit||0)*line.quantity,0);}
export function purchaseTermsReady(terms,clock){
    if(!terms||terms.mode==='permanent')return true;
    const start=terms.validFrom||stamp(clock);if((terms.durationMinutes||terms.validUntil)&&!start)return false;
    const now=storyMinute(clock),until=storyMinute(terms.validUntil);
    return!(now!==null&&until!==null&&until<=now);
}
export function grantPurchaseRights(state,session,lines,putItem,now){
    state.commerce.rights=normalizeCommerceRights(state.commerce.rights);
    const catalogTotal=lines.reduce((sum,line)=>sum+line.entry.askPrice*line.quantity/(line.entry.item.quantity||1),0);
    let assigned=0;
    for(const [index,line] of lines.entries()){
        const share=index===lines.length-1?session.quote-assigned:Math.floor(session.quote*(line.entry.askPrice*line.quantity/(line.entry.item.quantity||1))/catalogTotal);assigned+=share;
        const terms=normalizePurchaseTerms(line.entry.terms),id=`${session.id}:${line.entry.id}`;
        if(!terms)return false;
        if(terms.mode==='permanent'){
            if(terms.delivery){
                if(line.quantity!==1)return false;
                const thai=/[\u0e00-\u0e7f]/u.test(terms.scope+terms.delivery.name);
                const description=[(thai?'กรรมสิทธิ์ถาวร · ':'Permanent ownership · ')+terms.scope,terms.delivery.description].filter(Boolean).join(' · ');
                if(!putItem({...terms.delivery,id:`property-key-${hash(id)}`,description},1))return false;
            }else if(!putItem({...line.entry.item,id:''},line.quantity))return false;
            continue;
        }
        if(line.quantity!==1||!purchaseTermsReady(terms,state.worldClock)||state.commerce.rights.some(r=>r.id===id))return false;
        if(terms.targetItemId&&(!(state.inventory||[]).some(i=>i.id===terms.targetItemId&&i.quantity===1)||itemSaleBlocked(state,terms.targetItemId)))return false;
        const starts=terms.validFrom||stamp(state.worldClock);
        let ends=terms.validUntil;
        if(!ends&&terms.durationMinutes){const value=storyMinute(starts)+terms.durationMinutes;ends={day:Math.floor(value/1440)+1,time:`${String(Math.floor(value%1440/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`};}
        const right={id,sessionId:session.id,itemName:line.entry.item.name,terms,location:session.location,provider:clone(session.npc),denomination:session.denomination,
            paid:share,depositPaid:terms.deposit,depositRefunded:0,status:'active',revision:0,starts,ends,remainingUses:terms.uses,
            inventoryItemId:terms.delivery&&terms.mode!=='service'?`right-item-${hash(id)}`:'',createdAt:now,history:[]};
        if(right.inventoryItemId&&!putItem({...terms.delivery,id:right.inventoryItemId,commerceRightId:id},1))return false;
        state.commerce.rights.push(right);
    }
    return true;
}
export function itemSaleBlocked(state,itemId){
    const item=state.inventory?.find(i=>i.id===itemId);
    return Boolean(item?.commerceRightId||normalizeCommerceRights(state.commerce?.rights).some(r=>r.status==='active'&&r.terms.targetItemId===itemId));
}
export function rightsInventoryValid(state){
    return normalizeCommerceRights(state.commerce?.rights).every(r=>{
        if(r.inventoryItemId&&!['returned','cancelled'].includes(r.status)){
            const item=state.inventory?.find(i=>i.id===r.inventoryItemId);
            if(!item||item.quantity!==1||item.commerceRightId!==r.id||item.name!==r.terms.delivery.name)return false;
        }
        return !(r.status==='active'&&r.terms.targetItemId&&!(state.inventory||[]).some(i=>i.id===r.terms.targetItemId&&i.quantity===1));
    });
}
const actionWords={return:/(?:รับคืน|คืน|return|received|accepted|hand(?:ed)? back)/iu,use:/(?:ใช้|ขึ้น(?:เรือ|รถ)|ตรวจ(?:ตั๋ว|บัตร)|use|redeem|board|admit)/iu,complete:/(?:เสร็จ|เรียบร้อย|ส่งมอบ|รับคืน|finished|completed|delivered|ready)/iu,refund:/(?:คืน(?:เงิน|มัดจำ)|(?:เงิน)?มัดจำคืน|refund|deposit back)/iu};
const denied=/(?:สมมุติ|พรุ่งนี้|ยังไม่|ไม่ได้|ไม่คืน|ไม่ใช้|ไม่มี|ถ้า|หาก|\bif\b|hypothetical|tomorrow|not yet|did not|will (?:return|refund|complete))/iu;
function quotedAmount(quote,amount,unit){return readCommercePrices(quote).some(p=>p.amount*CURRENCY_VALUES[p.denomination]===amount*CURRENCY_VALUES[unit]);}
export function applyRightsEvents(state,raw,{story='',user='',now=new Date().toISOString()}={}){
    const next=clone(state);next.commerce ||= {};next.commerce.rights=normalizeCommerceRights(next.commerce.rights);
    const events=[],errors=[],seen=new Set();
    for(const input of Array.isArray(raw)?raw.slice(0,20):[]){
        const r=next.commerce.rights.find(r=>r.id===input?.id),action=input?.action,quote=clean(input?.evidence,2000),userQuote=clean(input?.userEvidence,1000);
        const fail=code=>errors.push({id:input?.id||'',error:code});
        if(!r||seen.has(r.id)||input.revision!==r.revision){fail('stale');continue;}
        if(!actionWords[action]||!quote||!evidenceText(story).includes(evidenceText(quote))||denied.test(quote)||!actionWords[action].test(quote)
            ||![r.provider.name,...(action==='use'?r.terms.redeemers:[])].some(name=>namedInteraction(name,quote,story))||!(r.terms.delivery?[r.terms.delivery.name]:[r.terms.scope]).some(name=>evidenceText(quote).includes(evidenceText(name)))){fail('evidence');continue;}
        if(['return','use'].includes(action)&&(!userQuote||!evidenceText(user).includes(evidenceText(userQuote))||denied.test(userQuote)||!actionWords[action].test(userQuote))){fail('consent');continue;}
        if(action==='use'&&(r.terms.mode!=='access'||rightStatus(r,next.worldClock)!=='active'||!r.remainingUses)){fail('expired');continue;}
        if(action==='return'&&(!['rental','access'].includes(r.terms.mode)||!r.inventoryItemId||!['active','used'].includes(r.status))){fail('closed');continue;}
        if(action==='complete'&&(r.terms.mode!=='service'||r.status!=='active')){fail('closed');continue;}
        const refund=input.refundAmount===undefined?0:input.refundAmount;
        if(!whole(refund)||refund>r.depositPaid-r.depositRefunded||refund&&(!quotedAmount(quote,refund,r.denomination)||!actionWords.refund.test(quote))
            ||action==='refund'&&(!refund||!['returned','completed'].includes(r.status))||action==='use'&&refund){fail('refund');continue;}
        if(action==='return'){
            const item=next.inventory?.find(i=>i.id===r.inventoryItemId&&i.commerceRightId===r.id&&i.quantity===1);
            if(!item){fail('inventory');continue;}next.inventory=next.inventory.filter(i=>i.id!==item.id);r.status='returned';
        }
        if(action==='use'){r.remainingUses--;if(!r.remainingUses)r.status='used';}
        if(action==='complete'){
            if(r.terms.delivery){
                if(!evidenceText(quote).includes(evidenceText(r.terms.delivery.name))||next.inventory.length>=200){fail('delivery');continue;}
                const item={...r.terms.delivery,id:`service-delivery-${hash(r.id)}`,quantity:1};next.inventory.push(item);
            }
            r.status='completed';
        }
        if(refund){
            if(!actionWords.refund.test(quote)||!whole((next.progression.currency[r.denomination]||0)+refund)){fail('refund');return{ok:false,next:state,events:[],errors};}
            next.progression.currency[r.denomination]+=refund;r.depositRefunded+=refund;
        }
        r.revision++;r.history.push({action,evidence:quote,refundAmount:refund,at:now});seen.add(r.id);events.push({id:r.id,action,refundAmount:refund,name:r.itemName});
    }
    return{ok:events.length>0,next:events.length?next:state,events,errors};
}
export const COMMERCE_RIGHTS_INSTRUCTIONS=ITEM_DEFINITION_INSTRUCTIONS+'\n'+`PURCHASE TYPES / RIGHTS / RENTALS / SERVICES: every npcShop entry may include terms. Ordinary outright goods use terms:{mode:"permanent"} (legacy omission means ordinary goods only). Buying permanent ownership of a house, room, building or another real location keeps its property name and full property price in the catalog, but MUST deliver a key inventory item: terms:{mode:"permanent",scope:"exact property name/address",delivery:{name:"exact key name in the story language, e.g. กุญแจบ้านริมแม่น้ำ / Key to Riverside House",category:"Key",description:"public key/property details"}}. This form has no expiry, deposit or access/rental right; the inventory key records permanent ownership of its scope. State the property and show its physical key in NPC prose before confirmation. A key label may be derived from that exact disclosed property name; the NPC need not recite the full UI item label. Never put the building itself into the backpack, copy a key name from another property, or confuse permanent room ownership with a nightly stay. A property is one purchase, quantity 1. Ordinary goods still use mode:"permanent" without scope/delivery. A rented asset uses terms:{mode:"rental",scope:"actual asset/use",delivery:{name:"actual handed-over asset",category,description},validUntil:{day:2,time:"10:00"},deposit:0,conditions:"return terms",includes:[]}. An inn room uses terms:{mode:"access",scope:"room and venue",validUntil:{day:2,time:"10:00"},delivery:{name:"key label for this exact disclosed room"},deposit:0,includes:["breakfast"]}. Other access can use durationMinutes, uses:1 for a single ticket, or permanent:true for lifetime access. Access may list redeemers:["exact authorized NPC name"] when a different established conductor/guard admits the holder; otherwise confirmation must come from the provider. Never invent an authorized redeemer. A prepaid service uses terms:{mode:"service",scope:"agreed work",conditions:"completion/collection terms",validUntil:{day:2,time:"10:00"},targetItemId:"owned id only if the NPC takes this one owned item to work on",delivery:{name:"agreed new crafted product"}}; omit delivery when the work produces no new inventory item. Service payment grants an order, NOT completion, proficiency or Mastery. For opening evidence quote the shortest current priced offer clause; future checkout/collection timing belongs in the public terms, not a hypothetical offer. Specify only publicly stated actual facts; if delivery exists, present it in the current story. Physical property/room keys may use a label derived from their exact disclosed scope; other deliveries must be named exactly. Describe duration/deadline, inclusions and any refundable deposit explicitly before confirmation. deposit is an additional refundable payment per selected contract, NOT an auction hold or included in negotiated price. Currency is the catalog denomination. Nonpermanent entries are single contracts (quantity 1); multi-use rights use uses. No hidden fees, invented deadlines, forfeiture or recurring automatic payments. The engine delivers goods/grants rights/debits price plus deposits exactly once at confirmed purchase. Rental assets and access keys are not player-owned sale goods. A right may expire on STORY clock without deleting its key/card or refunding a deposit. Refuse expired ticket use; do not pretend retained keys extend a stay. For a later actual return/use/completed prepaid service/refund, include top-level commerceRights:[{id:"canonical saved right id",revision:0,action:"return"|"use"|"complete"|"refund",evidence:"exact present named provider confirmation quote",userEvidence:"exact player return/use clause",refundAmount:0}]. Echo current revision; one event per right per reply. return requires the player actually returning the linked asset and the original provider confirming receipt. use consumes one allowed use after actual user action/provider admission. complete requires the original provider actually completing/delivering prepaid work. The quote must name the scope/item, never plans/refusals/hypotheticals. Refund only the explicitly confirmed amount no larger than the remaining deposit; no automatic refund just because time passed, and refund may follow return in a later reply. Never duplicate money/inventory changes via ops for these events. Renewal/extension requires a fresh priced offer with a new event id and explicit purchase consent; existing deadlines and price are immutable. Use this same output in the normal reply, swipe or regenerate, with no additional API call to obtain rights metadata.`;
