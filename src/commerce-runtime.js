import {createCommerceSession,normalizeCommerce,prepareCommerceAction,applyCommerceDecision,commerceDecisionPrompt} from './commerce-engine.js?v=0.51.0';
import {createCommerceComposer} from './commerce-composer.js?v=0.51.0';

// Normalized legacy NPC records can acquire default timestamps on every read.
// Compare gameplay data, not those incidental normalization timestamps.
const stateFingerprint=state=>JSON.stringify(state,(key,value)=>['createdAt','updatedAt'].includes(key)?undefined:value);

export function createCommerceRuntime(api) {
    let busy=false,error='',errorId='',request=0,destroyed=false;
    const ui=createCommerceComposer({document:api.document||globalThis.document,language:()=>api.settings().language,perform:perform});
    const word=(th,en)=>api.settings().language==='th'?th:en;
    const errors={funds:['เงินที่ใช้ได้ไม่พอ','Insufficient available funds'],inventory:['สินค้าไม่พร้อมหรือจำนวนไม่พอ','The item is unavailable'],amount:['ราคาต้องเป็นจำนวนเต็มและสูงกว่าราคาปัจจุบัน','Enter a valid whole-number price'],
        budget:['คำตอบ NPC เกินงบหรือราคาไม่ถูกต้อง ลองอีกครั้งได้','NPC decision exceeded funds or used an invalid price. Try again.'],participants:['คำตอบยังตัดสินใจให้ผู้ประมูลไม่ครบ ลองอีกครั้งได้','The reply did not decide every bidder action. Try again.'],
        consent:['ราคายืนยันไม่ตรงกับที่ตกลง ลองอีกครั้งได้','The confirmation price did not match consent. Try again.'],committed:['ยังมีราคาประมูลที่ผูกพันอยู่ ให้รอการตัดสินก่อน','Your leading bid is still committed. Await a decision.'],
        response:['AI ส่งคำตอบไม่ครบ ลองอีกครั้งได้','AI returned an incomplete response. Try again.'],outcome:['ผลลัพธ์ไม่ตรงกับการกระทำ ลองอีกครั้งได้','The outcome did not match the action. Try again.'],
        stale:['แชตหรือรายการเปลี่ยนระหว่างรอ กรุณาตรวจรายการปัจจุบัน','The chat or item changed. Review the current interaction.'],save:['บันทึกไม่สำเร็จ ข้อความ เงิน และของยังเป็นค่าเดิม','Save failed. The previous message, funds and items were restored.'],
        unavailable:['โฮสต์นี้ยังไม่รองรับ API และการบันทึกข้อความที่จำเป็น','The host does not provide the required API or chat saving.'],active:['มีงานประมูลที่เปิดอยู่แล้ว','Another auction is active'],closed:['รายการนี้จบแล้ว','This interaction is closed'],cancelled:['หยุดการขอคำตอบแล้ว','The request was stopped']};
    function candidates(){
        const context=api.context(),state=api.state(),commerce=normalizeCommerce(state.commerce,state),out=[],seen=new Set();let latestInteractionSeen=false;
        for(let id=(context.chat||[]).length-1;id>=0;id--){const message=context.chat[id];if(!message||message.is_user||message.is_system)continue;
            const turnKey=api.turnKey(id),variant=api.variant(message),record=api.record(id,message);if(!record)continue;
            const events=[...(api.settings().enableAuctions&&record.auction?[record.auction]:[]),...(api.settings().enableMarketplace&&record.marketplace?.event&&(!['resolved','awaiting-reply'].includes(record.marketplace.status)||commerce.sessions.some(s=>s.eventId===record.marketplace.event.id))?[record.marketplace.event]:[])];
            for(const event of events){if(seen.has(event.id))continue;seen.add(event.id);
                const existing=commerce.sessions.find(s=>s.eventId===event.id);
                if(!existing&&latestInteractionSeen)continue;latestInteractionSeen=true;
                const candidate=existing||createCommerceSession(event,{messageId:id,turnKey,variant});
                if(!candidate||!['offered','open'].includes(candidate.status))continue;
                out.push({...candidate,source:{...candidate.source,messageId:id,turnKey,variant}});
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
    function view(){const candidate=candidates()[0];if(!candidate)return null;const context=api.context(),state=api.state();
        return{session:candidate,token:`${context.getCurrentChatId?.()}:${candidate.source.turnKey}:${candidate.source.variant}:${candidate.revision}`,
            playerName:state.player.name,busy,error:candidate.id===errorId?error:'',available:!api.isBusy()&&candidate.location.normalize('NFKC').toLocaleLowerCase()===state.location.place.normalize('NFKC').toLocaleLowerCase()};}
    function refresh(){if(!destroyed)ui.update(view());}
    async function perform(input){
        const current=view();if(destroyed||busy||!current?.available||current.session.id!==input.id||current.token!==input.token)return{ok:false,error:'stale'};
        const context=api.context(),metadata=context.chatMetadata,chatId=context.getCurrentChatId?.(),source=current.session.source,message=context.chat?.[source.messageId];
        const state=api.state(),prepared=prepareCommerceAction(state,current.session,input.action,input);
        if(!prepared.ok){errorId=input.id;error=errors[prepared.error]?.[api.settings().language==='th'?0:1]||prepared.error;refresh();return prepared;}
        prepared.session.source={...source};
        if(typeof context.generateQuietPrompt!=='function'||typeof context.saveMetadata!=='function'){
            errorId=input.id;error=word(...errors.unavailable);refresh();return{ok:false,error:'unavailable'};
        }
        const ticket=++request,snapshot={text:message.mes,variant:api.variant(message),state:stateFingerprint(state),length:context.chat.length};
        const unchanged=()=>ticket===request&&api.context().chatMetadata===metadata&&api.context().getCurrentChatId?.()===chatId
            &&api.context().chat?.[source.messageId]===message&&message.mes===snapshot.text&&api.variant(message)===snapshot.variant
            &&api.context().chat.length===snapshot.length&&(current.session.kind==='auction'?api.settings().enableAuctions:api.settings().enableMarketplace)&&stateFingerprint(api.state())===snapshot.state;
        busy=true;error='';errorId=input.id;api.setBusy(true);refresh();
        try{
            api.recordRequest('commerce',`${current.session.kind} · ${input.action}`);
            const raw=await context.generateQuietPrompt({quietPrompt:commerceDecisionPrompt(prepared,{language:api.settings().language,npcs:state.npcs.map(api.effectiveNpc|| (n=>n)),
                story:api.visible(message.mes),canon:api.canon?.()||''}),skipWIAN:false,responseLength:1500,removeReasoning:true});
            if(!unchanged())throw Error(ticket===request?'stale':'cancelled');
            const answer=api.parse(raw);
            if(!answer?.narrative||/<(?:script|iframe|img|style|input|button)\b|tretaresia_patch|```/iu.test(answer.narrative))throw Error('response');
            const result=applyCommerceDecision(state,prepared,answer);if(!result.ok)throw Error(result.error);
            // One host save owns both the appended reply and the financial result.
            await api.commit({context,source,message,previous:state,result,unchanged});
            error='';return{ok:true};
        }catch(failure){
            const code=errors[failure.message]?failure.message:'response';errorId=input.id;error=errors[code][api.settings().language==='th'?0:1];
            if(!errors[failure.message])error=word('API ไม่สามารถตอบได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่','The API request failed. Check the connection and try again.');
            api.log?.(failure);return{ok:false,error:code};
        }finally{busy=false;api.setBusy(false);refresh();}
    }
    return{view,refresh,perform,cancel(){request++;},isBusy:()=>busy,destroy(){destroyed=true;request++;ui.destroy();}};
}
