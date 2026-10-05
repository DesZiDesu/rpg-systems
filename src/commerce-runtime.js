import {requestCommerceDecision} from './commerce-generation.js?v=0.55.5';
import {inspectCommerceResponse} from './commerce-protocol.js?v=0.55.5';
import {resolveMarketplaceReply} from './marketplace-events.js?v=0.55.5';
import {requestedCommerceKind} from './main-chat-systems.js?v=0.55.5';
import {createCommerceSession,normalizeCommerce,prepareCommerceAction,applyCommerceDecision,commerceDecisionPrompt} from './commerce-engine.js?v=0.55.5';
import {createCommerceComposer} from './commerce-composer.js?v=0.55.5';
import {commerceOpeningRefused,requestCommerceOpening,validateCommerceOpening} from './commerce-opening.js?v=0.55.5';

// Normalized legacy NPC records can acquire default timestamps on every read.
// Compare gameplay data, not those incidental normalization timestamps.
const stateFingerprint=state=>JSON.stringify(state,(key,value)=>['createdAt','updatedAt'].includes(key)?undefined:value);

export function createCommerceRuntime(api) {
    let busy=false,error='',errorId='',diagnostics='',request=0,destroyed=false,opening=null;
    const openingAttempts=new WeakMap(),publicReplyCache=new WeakMap();
    let rendered='';
    const ui=createCommerceComposer({dock:api.dock,document:api.document||globalThis.document,language:()=>api.settings().language,perform:perform,poll:refresh,appearance:()=>api.settings()});
    const word=(th,en)=>api.settings().language==='th'?th:en;
    const errors={'intent':['ข้อความนี้ยังไม่ยืนยันเจตนาทำรายการนั้น รอบนี้ยังไม่เปลี่ยนเงินหรือของ','The message does not authorize that action; funds and items are unchanged'],'action':['AI เลือกการกระทำที่ไม่รองรับในระบบนี้','AI chose an action unsupported by this system'],'response-empty':['API ส่งคำตอบว่าง รอบนี้ยังไม่เปลี่ยนเงินหรือของ','The API returned an empty reply; funds and items are unchanged'],'response-decision':['คำตอบ API ไม่มีผลตัดสินที่ระบบอ่านได้ รอบนี้ยังไม่เปลี่ยนเงินหรือของ','The API reply has no readable decision; funds and items are unchanged'],'response-narrative':['API ส่งผลตัดสินแต่ไม่มีคำตอบ NPC รอบนี้ยังไม่เปลี่ยนเงินหรือของ','The API returned a decision without an NPC reply; funds and items are unchanged'],'response-conflict':['API ส่งผลตัดสินหลายชุดที่ขัดกัน รอบนี้ยังไม่เปลี่ยนเงินหรือของ','The API returned conflicting decisions; funds and items are unchanged'],'response-markup':['คำตอบ NPC มีข้อมูลระบบหรือรูปแบบที่แสดงไม่ได้','The NPC reply includes system data or unsupported markup'],'participants-missing':['AI ยังไม่ได้ตัดสินใจให้ผู้ประมูลบางคน รอบนี้ยังไม่เปลี่ยนเงินหรือของ','AI omitted a bidder decision; funds and items are unchanged'],'participant-identity':['AI ระบุผู้ประมูลที่ไม่อยู่ในรายการหรือชื่อกำกวม','AI identified an unknown or ambiguous bidder'],'participant-format':['AI ส่งรูปแบบผลผู้ประมูลที่อ่านไม่ได้','AI returned an unreadable bidder result'],'participant-action':['AI ยังไม่ระบุว่าจะบิด ผ่าน หรือถอนตัว','AI did not specify bid, pass or withdrawal'],'participant-reason':['AI ยังไม่ให้เหตุผลการตัดสินใจของผู้ประมูล','AI omitted a bidder motive'],'participant-duplicate':['AI ให้ผลของผู้ประมูลคนเดียวขัดกัน','AI returned conflicting decisions for one bidder'],evidence:['ข้อความยังไม่ยืนยันการกระทำนี้ กรุณาระบุให้ชัดหรือใช้ปุ่ม','The message does not authorize this action. Clarify it or use a button.'],terms:['เงื่อนไขสิทธิ์หรือของที่ส่งมอบไม่ครบ หรือเลยกำหนดแล้ว เงินและของยังไม่เปลี่ยน','The entitlement terms or delivery are invalid or expired; funds/items are unchanged'],ownership:['ของเช่า กุญแจสิทธิ์ หรือของที่ฝากทำงานอยู่ไม่สามารถขายได้','Rental assets, access keys and items with a service provider cannot be sold'],funds:['เงินที่ใช้ได้ไม่พอ','Insufficient available funds'],inventory:['สินค้าไม่พร้อมหรือจำนวนไม่พอ','The item is unavailable'],amount:['ราคาหรือหน่วยเงินไม่ถูกต้อง กรุณาตรวจยอดที่เสนอ','The amount or currency is invalid; check the proposed price'],
        budget:['คำตอบ NPC เกินงบหรือราคาไม่ถูกต้อง ลองอีกครั้งได้','NPC decision exceeded funds or used an invalid price. Try again.'],participants:['คำตอบยังตัดสินใจให้ผู้ประมูลไม่ครบ ลองอีกครั้งได้','The reply did not decide every bidder action. Try again.'],
        consent:['ราคายืนยันไม่ตรงกับที่ตกลง ลองอีกครั้งได้','The confirmation price did not match consent. Try again.'],committed:['ยังมีราคาประมูลที่ผูกพันอยู่ ให้รอการตัดสินก่อน','Your leading bid is still committed. Await a decision.'],
        response:['AI ส่งคำตอบไม่ครบ ลองอีกครั้งได้','AI returned an incomplete response. Try again.'],outcome:['ผลลัพธ์ไม่ตรงกับการกระทำ ลองอีกครั้งได้','The outcome did not match the action. Try again.'],
        stale:['แชตหรือรายการเปลี่ยนระหว่างรอ กรุณาตรวจรายการปัจจุบัน','The chat or item changed. Review the current interaction.'],save:['บันทึกไม่สำเร็จ ข้อความ เงิน และของยังเป็นค่าเดิม','Save failed. The previous message, funds and items were restored.'],
        unavailable:['โฮสต์นี้ยังไม่รองรับ API และการบันทึกข้อความที่จำเป็น','The host does not provide the required API or chat saving.'],active:['มีงานประมูลที่เปิดอยู่แล้ว','Another auction is active'],closed:['รายการนี้จบแล้ว','This interaction is closed'],cancelled:['หยุดการขอคำตอบแล้ว','The request was stopped']};
    function latestPublicOffer(context,state,commerce){
        const id=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system),message=context.chat?.[id];
        const userId=(context.chat||[]).findLastIndex(m=>m?.is_user&&!m.is_system),record=message&&api.record(id,message);
        // Re-read only the latest saved *failed public* opening after upgrades.
        // Never reinterpret a paid/cancelled offer or contradictory machine data.
        if(!api.settings().enableMarketplace||!message||userId<0||id<userId||record?.marketplace||record?.commerceOpening?.status!=='no-disclosed-offer'
            ||record.commerceOpening.source!=='public-dialogue'||record.commerceIntent?.kind==='none'||api.settings().autoTrack===false
            ||commerce.sessions.some(s=>s.source.messageId===id&&!['offered','open'].includes(s.status)))return null;
        const variant=api.variant(message),turnKey=api.turnKey(id),signature=JSON.stringify([variant,state.location?.place,state.worldClock,state.inventory]);
        let cached=publicReplyCache.get(message);
        if(cached?.signature!==signature){
            const result=resolveMarketplaceReply({story:api.visible(message.mes),user:api.visible(context.chat[userId].mes),location:state.location?.place,
                inventory:state.inventory,npcs:state.npcs,intent:record.commerceIntent,options:{clock:state.worldClock,eventId:`shop-${turnKey}-${variant}`}});
            cached={signature,event:result.event};publicReplyCache.set(message,cached);
        }
        const event=cached.event;if(!event)return null;
        const existing=commerce.sessions.find(s=>s.eventId===event.id);
        const candidate=existing||createCommerceSession(event,{messageId:id,turnKey,variant});
        return candidate&&['offered','open'].includes(candidate.status)?candidate:null;
    }
    function candidates(){
        const context=api.context(),state=api.state(),commerce=normalizeCommerce(state.commerce,state),out=[],seen=new Set();let latestInteractionSeen=false;
        const currentPublic=latestPublicOffer(context,state,commerce);if(currentPublic){out.push(currentPublic);seen.add(currentPublic.eventId);latestInteractionSeen=true;}
        for(let id=(context.chat||[]).length-1;id>=0;id--){const message=context.chat[id];if(!message||message.is_user||message.is_system)continue;
            const turnKey=api.turnKey(id),variant=api.variant(message),record=api.record(id,message);if(!record)continue;
            const events=[...(api.settings().enableAuctions&&record.auction?[record.auction]:[]),...(api.settings().enableMarketplace&&record.marketplace?.event&&(!['resolved','awaiting-reply'].includes(record.marketplace.status)||commerce.sessions.some(s=>s.eventId===record.marketplace.event.id))?[record.marketplace.event]:[])];
            for(const event of events){if(seen.has(event.id))continue;seen.add(event.id);
                const existing=commerce.sessions.find(s=>s.eventId===event.id);
                if(!existing&&latestInteractionSeen)continue;latestInteractionSeen=true;
                const candidate=existing||createCommerceSession(event,{messageId:id,turnKey,variant});
                if(!candidate||!['offered','open'].includes(candidate.status))continue;
                const anchor=existing?.source?.messageId;
                if(Number.isInteger(anchor)&&anchor!==id){const target=context.chat[anchor];if(!target||target.is_user||api.variant(target)!==existing.source.variant)continue;out.push(candidate);}
                else out.push({...candidate,source:{...candidate.source,messageId:id,turnKey,variant}});
            }
        }
        for(const session of commerce.sessions){if(!['offered','open'].includes(session.status)||seen.has(session.eventId))continue;
            if(session.kind==='auction'?!api.settings().enableAuctions:!api.settings().enableMarketplace)continue;
            let id=session.source.messageId;
            if(!Number.isInteger(id)&&session.source.legacy)id=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system);
            const message=context.chat?.[id];if(!message||message.is_user||message.is_system)continue;
            const variant=api.variant(message);if(!session.source.legacy&&variant!==session.source.variant)continue;
            out.push({...session,source:{...session.source,messageId:id,turnKey:api.turnKey(id),variant}});
        }
        return out.sort((a,b)=>(b.kind==='auction'&&b.status==='open'?1:0)-(a.kind==='auction'&&a.status==='open'?1:0));
    }
    function pendingView(context,state){
        const userId=(context.chat||[]).findLastIndex(m=>m?.is_user&&!m.is_system);if(userId<0)return null;
        const kind=requestedCommerceKind(context.chat[userId].mes,api.settings());
        // A genuine request shows a read-only waiting panel. It becomes a
        // transaction only after the completed reply supplies a valid offer.
        if(!kind)return null;
        const lastId=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system),last=context.chat[lastId];
        const complete=normalizeCommerce(state.commerce,state).sessions.some(s=>!['offered','open'].includes(s.status)&&s.source.messageId>userId);
        if(complete)return null;
        const waiting=lastId<userId||busy||api.isBusy()&&!api.isReplyComplete?.(last);
        const record=lastId>userId?api.record(lastId,last):null;
        if(record?.marketplace?.status==='resolved'||record?.commerceIntent?.kind==='none'||['no-intent','settled'].includes(record?.commerceOpening?.status))return null;
        if(!waiting&&commerceOpeningRefused(api.visible(last?.mes||'')))return null;
        const rejected=record?.commerceOpening?.status==='invalid-data';
        return{pending:{kind,waiting,status:waiting?'waiting':rejected?'invalid-data':'no-disclosed-offer'},busy:waiting,token:`pending:${userId}`,available:false,
            error:opening&&opening.message===last?opening.error:rejected?word('ข้อมูลรายการไม่ตรงกับข้อเสนอ NPC จึงยังยืนยันซื้อขายไม่ได้','Catalog data conflicts with the NPC offer; confirmation is unavailable'):'',
            diagnostics:opening&&opening.message===last?opening.diagnostics:rejected?JSON.stringify({release:globalThis.TretaresiaRelease||'0.55.5',system:kind,channel:'opening',error:'invalid-data',source:record.commerceOpening.source},null,2):''};
    }
    function view(){const candidate=candidates()[0],context=api.context(),state=api.state();if(!candidate)return pendingView(context,state);
        return{session:candidate,token:`${context.getCurrentChatId?.()}:${candidate.source.turnKey}:${candidate.source.variant}:${candidate.revision}`,
            playerName:state.player.name,busy:busy||api.isBusy(),error:candidate.id===errorId?error:'',diagnostics:candidate.id===errorId?diagnostics:'',available:!api.isBusy()&&!context.chat.at(-1)?.is_user&&candidate.location.normalize('NFKC').toLocaleLowerCase()===state.location.place.normalize('NFKC').toLocaleLowerCase()};}
    function refresh(){if(destroyed)return;const value=view(),signature=JSON.stringify([api.settings().language,api.settings().coinStyle,value]);if(signature!==rendered){rendered=signature;ui.update(value);}}
    function failureReport(session,action,code,raw,details,channel='button'){
        return JSON.stringify({release:globalThis.TretaresiaRelease||'0.55.5',channel,system:session?.kind,action,error:code,sessionId:session?.id,revision:session?.revision,people:details?.people||[],generation:typeof api.context().generateRaw==='function'?'native-task':'legacy-quiet',rawResponse:typeof raw==='string'?raw.slice(0,16000):raw??null},null,2);
    }
    async function recoverOpening(input){
        const context=api.context(),message=context.chat?.[input.messageId],variant=message&&api.variant(message);
        if(destroyed||busy||!message||message.is_user||openingAttempts.get(message)===variant)return{ok:false,error:'skipped'};
        openingAttempts.set(message,variant);
        const metadata=context.chatMetadata,chatId=context.getCurrentChatId?.(),length=context.chat.length,state=stateFingerprint(api.state()),ticket=++request;
        const enabled=()=>input.kind==='auction'?api.settings().enableAuctions:api.settings().enableMarketplace;
        const unchanged=()=>!destroyed&&ticket===request&&enabled()&&api.context().chatMetadata===metadata&&api.context().getCurrentChatId?.()===chatId
            &&api.context().chat.length===length&&api.context().chat[input.messageId]===message&&api.variant(message)===variant&&stateFingerprint(api.state())===state;
        const reference={...input,facts:context.chat.filter(m=>m&&!m.is_user&&!m.is_system).slice(-3).map(m=>api.visible(m.mes)).join('\n'),eventId:`recovered-${input.kind}-${api.turnKey(input.messageId)}-${variant}`};
        busy=true;opening={message,error:'',diagnostics:''};api.setBusy(true);refresh();let raw;
        try{
            api.recordRequest('commerce',`${input.kind} · recover opening`);
            raw=await requestCommerceOpening(context,reference,{visible:api.visible});
            if(!unchanged())return{ok:false,error:'stale'};
            let parsed;try{parsed=typeof raw==='object'?raw:api.parse(raw);}catch{}
            const result=validateCommerceOpening(parsed?.patch||parsed,reference);
            if(!result)throw Error('opening-data');
            opening=null;return{ok:true,...result};
        }catch(failure){
            if(!unchanged())return{ok:false,error:'stale'};
            const code=failure.message==='unavailable'?'unavailable':failure.message==='opening-data'?'opening-data':'opening-api';
            opening={message,error:word(code==='opening-data'?'AI ยังส่งข้อมูลรายการไม่ครบ เงินและของยังไม่เปลี่ยน โรลถามต่อในแชตได้':code==='unavailable'?'โฮสต์ยังไม่มี API สำหรับกู้รายการ':'กู้ข้อมูลรายการจาก API ไม่สำเร็จ เงินและของยังไม่เปลี่ยน',code==='opening-data'?'AI returned incomplete opening data. Funds/items are unchanged. Continue in chat.':code==='unavailable'?'The host has no opening recovery API.':'Opening recovery API failed. Funds/items are unchanged.'),diagnostics:failureReport({kind:input.kind},'recover-opening',code,raw,{},'opening')};
            return{ok:false,error:code};
        }finally{busy=false;api.setBusy(false);refresh();}
    }
    async function perform(input){
        const current=view();if(destroyed||busy||!current?.session||!current.available||current.session.id!==input.id||current.token!==input.token)return{ok:false,error:'stale'};
        const context=api.context(),metadata=context.chatMetadata,chatId=context.getCurrentChatId?.();
        // A rejected role-play decision leaves the financial session anchored
        // to its previous reply. Buttons still continue the latest NPC bubble.
        const latestId=(context.chat||[]).findLastIndex(m=>m&&!m.is_user&&!m.is_system);
        const source=latestId>current.session.source.messageId?{...current.session.source,messageId:latestId,turnKey:api.turnKey(latestId),variant:api.variant(context.chat[latestId])}:current.session.source;
        const message=context.chat?.[source.messageId];
        const state=api.state(),prepared=prepareCommerceAction(state,current.session,input.action,input);
        if(!prepared.ok){diagnostics='';errorId=input.id;error=errors[prepared.error]?.[api.settings().language==='th'?0:1]||prepared.error;refresh();return prepared;}
        prepared.session.source={...source};
        if((typeof context.generateRaw!=='function'&&typeof context.generateQuietPrompt!=='function')||typeof context.saveMetadata!=='function'){
            errorId=input.id;error=word(...errors.unavailable);refresh();return{ok:false,error:'unavailable'};
        }
        const ticket=++request,snapshot={text:message.mes,variant:api.variant(message),state:stateFingerprint(state),length:context.chat.length};
        const unchanged=()=>ticket===request&&api.context().chatMetadata===metadata&&api.context().getCurrentChatId?.()===chatId
            &&api.context().chat?.[source.messageId]===message&&message.mes===snapshot.text&&api.variant(message)===snapshot.variant
            &&api.context().chat.length===snapshot.length&&(current.session.kind==='auction'?api.settings().enableAuctions:api.settings().enableMarketplace)&&stateFingerprint(api.state())===snapshot.state;
        busy=true;error='';diagnostics='';errorId=input.id;api.setBusy(true);refresh();
        let raw;
        try{
            api.recordRequest('commerce',`${current.session.kind} · ${input.action}`);
            raw=await requestCommerceDecision(context,prepared,commerceDecisionPrompt(prepared,{language:api.settings().language,npcs:state.npcs.map(api.effectiveNpc|| (n=>n)),
                story:api.visible(message.mes),canon:api.canon?.()||''}),{visible:api.visible,settings:api.settings()});
            if(!unchanged())throw Error(ticket===request?'stale':'cancelled');
            const inspection=inspectCommerceResponse(raw,{parse:api.parse,visible:api.visible});if(!inspection.ok)throw Error(inspection.error);
            const answer=inspection.answer;
            if(!answer?.narrative||/<(?:script|iframe|img|style|input|button)\b|tretaresia_patch|```/iu.test(answer.narrative))throw Error('response-markup');
            const result=applyCommerceDecision(state,prepared,answer);if(!result.ok){const failure=Error(result.error);failure.details=result.details;throw failure;}
            // One host save owns both the appended reply and the financial result.
            await api.commit({context,source,message,previous:state,result,unchanged});
            error='';diagnostics='';return{ok:true};
        }catch(failure){
            const nativeEmpty=failure.message==='No message generated';
            const code=nativeEmpty?'response-empty':errors[failure.message]?failure.message:'response';diagnostics=failureReport(current.session,input.action,code,raw,failure.details);errorId=input.id;error=errors[code][api.settings().language==='th'?0:1]+(failure.details?.people?.length?' · '+failure.details.people.join(', '):'');
            if(!nativeEmpty&&!errors[failure.message])error=word('API ไม่สามารถตอบได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่','The API request failed. Check the connection and try again.');
            api.log?.(failure);return{ok:false,error:code};
        }finally{busy=false;api.setBusy(false);refresh();}
    }
    return{view,refresh,perform,recoverOpening,reportRoleplay(id,code,details,report={}){diagnostics=code?failureReport(view()?.session,report.action,code,report.raw,details,'roleplay'):'';errorId=id;error=code?(errors[code]||errors.response)[api.settings().language==='th'?0:1]+(details?.people?.length?' · '+details.people.join(', '):''):'';refresh();},cancel(){request++;},isBusy:()=>busy,destroy(){destroyed=true;request++;ui.destroy();}};
}
