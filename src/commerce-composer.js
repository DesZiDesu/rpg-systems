// Compact composer UI. Read-only expansion/selection never calls an API;
// every game button delegates to the one asynchronous commerce runtime.
export function createCommerceComposer({document:doc=globalThis.document,perform=()=>{},language=()=> 'en'}={}) {
    if(!doc?.createElement)return{update(){},destroy(){}};
    const win=doc.defaultView||globalThis;let view=null,expanded=false,identity='',revision=-1,selected='',draft='',observer,timer,queued=false;
    const node=(tag,cls,text)=>{const el=doc.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
    const bar=node('section','rf-commerce-composer');bar.setAttribute('aria-label','RoleForge commerce');
    const t=(th,en)=>language()==='th'?th:en;
    const price=value=>`${Number(value||0).toLocaleString()} ${t({gold:'ทอง',silver:'เงิน',copper:'ทองแดง'}[view?.session.denomination],view?.session.denomination)}`;
    function detach(){bar.remove();observer?.disconnect();observer=null;clearInterval(timer);timer=null;}
    function locate(){const textarea=doc.querySelector('#send_textarea'),anchor=doc.querySelector('#send_form')||textarea?.closest('form')||textarea?.parentElement;
        if(!textarea||!anchor?.parentElement||win.getComputedStyle(textarea).display==='none'||win.getComputedStyle(anchor).display==='none')return null;return anchor;}
    function position(){if(!view)return;const anchor=locate();if(!anchor)return;
        const anchorStyle=win.getComputedStyle(anchor),parentStyle=win.getComputedStyle(anchor.parentElement);
        const fixed=['fixed','absolute'].includes(anchorStyle.position)||(['flex','inline-flex'].includes(parentStyle.display)&&parentStyle.flexDirection.startsWith('row'));
        if(fixed){const rect=anchor.getBoundingClientRect(),memory=doc.querySelector('.rf-memory-composer-status.rf-memory-composer-fixed'),memoryRect=memory?.getBoundingClientRect();
            const top=memoryRect&&memoryRect.height&&memoryRect.bottom<=rect.top+12?Math.min(rect.top,memoryRect.top-5):rect.top;
            bar.classList.add('is-fixed');Object.assign(bar.style,{left:`${Math.max(0,rect.left)}px`,width:`${Math.min(rect.width,win.innerWidth-Math.max(0,rect.left))}px`,bottom:`${Math.max(0,win.innerHeight-top)}px`,zIndex:String(Math.max(32,(Number.parseInt(anchorStyle.zIndex,10)||0)+1))});if(bar.parentElement!==doc.body)doc.body.append(bar);}
        else{bar.classList.remove('is-fixed');bar.style.left='';bar.style.width='';bar.style.bottom='';bar.style.zIndex='';
            // Memory owns the slot immediately before the input. Keeping our
            // bar before memory avoids two observers repeatedly swapping them.
            const slot=anchor.previousElementSibling?.classList.contains('rf-memory-composer-status')?anchor.previousElementSibling:anchor;
            if(bar.nextElementSibling!==slot)slot.before(bar);}
    }
    function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;position();});}
    function render(){
        if(!view){detach();return;}
        const session=view.session,lot=session.lots?.[session.index],kind=session.kind,auction=kind==='auction';
        const item=session.items?.find(entry=>entry.id===selected)||session.items?.find(entry=>entry.id===session.selectedId);
        const newItem=selected&&selected!==session.selectedId,quote=auction?lot?.price||lot?.openingBid:newItem?item?.askPrice:session.quote;
        bar.replaceChildren();bar.dataset.kind=kind;bar.dataset.session=session.id;bar.setAttribute('aria-busy',String(Boolean(view.busy)));
        const header=node('button','rf-commerce-summary');header.type='button';header.setAttribute('aria-expanded',String(expanded));
        const glyph=node('span','rf-commerce-glyph',auction?'⚖︎':kind==='sell'?'↗':'↙');glyph.setAttribute('aria-hidden','true');
        const copy=node('span','rf-commerce-summary-copy'),eyebrow=node('small','',auction?t('ประมูล','AUCTION'):kind==='sell'?t('ขาย · '+session.npc.name,'SELL · '+session.npc.name):t('ซื้อ · '+session.npc.name,'BUY · '+session.npc.name));
        const name=node('strong','',auction?lot?.name:item?.item?.name||session.title);copy.append(eyebrow,name);
        const amount=node('span','rf-commerce-price',price(quote)),chevron=node('span','rf-commerce-chevron',expanded?'⌃':'⌄');header.append(glyph,copy,amount,chevron);
        header.addEventListener('click',()=>{expanded=!expanded;render();});bar.append(header);
        if(auction&&lot?.leader){const leader=lot.leader==='player'?view.playerName:session.participants.find(p=>p.id===lot.leader)?.name;bar.append(node('p','rf-commerce-leader',t('ผู้เสนอราคาสูงสุด · ','Leading · ')+leader));}
        if(expanded){
            const detail=node('div','rf-commerce-details');
            if(!auction&&session.items.length>1){const select=node('select','rf-commerce-select');select.setAttribute('aria-label',t('เลือกสินค้า','Choose item'));
                for(const entry of session.items){const option=node('option','',`${entry.item.name} · ${price(entry.askPrice)}`);option.value=entry.id;option.selected=entry.id===(selected||session.selectedId);select.append(option);}
                select.disabled=view.busy;select.addEventListener('change',()=>{selected=select.value;draft='';render();});detail.append(select);}
            const description=auction?lot?.description:item?.item?.description;if(description)detail.append(node('p','rf-commerce-description',description));
            detail.append(node('div','rf-commerce-itemmeta',`${auction?lot?.category:item?.item?.category||t('สินค้า','Item')} · ×${auction?lot?.quantity:item?.item?.quantity||1}`));
            if(!auction){if(item?.item?.properties?.length)detail.append(node('p','rf-commerce-description',item.item.properties.join(' · ')));if(item?.note)detail.append(node('p','rf-commerce-description',item.note));if(kind==='buy')detail.append(node('p','rf-commerce-terms',item?.stockKnown===false?t('จำนวนในร้านยังไม่ระบุ','Stock not yet specified'):t(`เหลือในร้าน ${item?.stock} ชิ้น`,`${item?.stock} in stock`)));}
            if(auction){
                detail.append(node('p','rf-commerce-terms',t('ค่าเข้า ','Entry ')+price(session.entryFee)+t(' · มัดจำคืนได้ ',' · Refundable deposit ')+price(session.deposit)));
                const title=node('h5','',t('ผู้เข้าประมูล · เงินคงเหลือ','Bidders · Remaining funds'));detail.append(title);
                for(const participant of session.participants){const row=node('div','rf-commerce-bidder');row.append(node('span','',participant.name),node('strong','',price(participant.budget-participant.spent)));if(lot?.withdrawn.includes(participant.id))row.append(node('small','',t('ถอนตัวแล้ว','Withdrawn')));detail.append(row);}
                if(!session.participants.length)detail.append(node('p','rf-commerce-description',t('ยังไม่มีผู้เข้าประมูลรายอื่น','No other bidders are present')));
                if(session.lots.length>1){detail.append(node('h5','',t('รายการประมูล','Catalog')));for(const entry of session.lots)detail.append(node('div','rf-commerce-catalog-row',`${entry.name} · ${price(entry.openingBid)}`));}
            }else if(session.agreed)detail.append(node('p','rf-commerce-agreed',t('ตกลงราคาแล้ว · รอยืนยัน','Price agreed · Awaiting confirmation')));
            const last=session.history?.at(-1);if(last)detail.append(node('p','rf-commerce-last',t('ผลล่าสุด · ','Latest · ')+last.narrative.replace(/<[^>]*>/gu,' ').slice(0,500)));
            bar.append(detail);
        }
        const controls=node('div','rf-commerce-controls');
        const button=(label,action,primary=false,disabled=false)=>{const el=node('button',`rf-commerce-action${primary?' is-primary':''}`,label);el.type='button';el.dataset.commerceAction=action;el.disabled=view.busy||!view.available||disabled;
            el.addEventListener('click',()=>{void perform({id:session.id,token:view.token,action,amount:Number(draft||input?.value),itemId:selected||session.selectedId});});controls.append(el);return el;};
        let input;
        if(auction&&session.status==='offered')button(t('เข้าร่วม','Join'),'join',true);
        else if(auction&&['sold','unsold'].includes(lot?.status))button(t('รายการถัดไป','Next lot'),'next',true);
        else{
            input=node('input','rf-commerce-amount');input.type='number';input.inputMode='numeric';input.step='1';input.min=auction?String(lot?.leader?lot.price+lot.minIncrement:lot.openingBid):'1';
            input.value=draft||String(auction?lot?.leader?lot.price+lot.minIncrement:lot?.openingBid:quote);input.disabled=view.busy||!view.available;input.setAttribute('aria-label',t('ราคาที่เสนอ','Offer amount'));
            input.addEventListener('input',()=>{draft=input.value;});controls.append(input);
            if(auction){button('Bid','bid',true,lot?.leader==='player');button(t('รอการตัดสิน','Await decision'),'wait');}
            else{button(t('เสนอราคา','Offer'),'offer',true);button(t('ยืนยันราคา','Confirm'),'confirm');}
        }
        button(auction?t('ออกประมูล','Leave'):kind==='sell'?t('ยกเลิกการขาย','Cancel sale'):t('ยกเลิกการซื้อ','Cancel purchase'),auction?'leave':'cancel');bar.append(controls);
        if(view.busy){const status=node('p','rf-commerce-status',t('NPC กำลังพิจารณา…','NPCs are considering…'));status.setAttribute('role','status');bar.append(status);}
        else if(view.error){const error=node('p','rf-commerce-error',view.error);error.setAttribute('role','alert');bar.append(error);}
        else if(!view.available)bar.append(node('p','rf-commerce-status',t('รอแชตพร้อม หรือกลับไปยังสถานที่เดิม','Wait for the chat or return to this location')));
        if(!observer){observer=new win.MutationObserver(records=>{if(records.some(record=>!bar.contains(record.target)))schedule();});observer.observe(doc.body,{childList:true,subtree:true});timer=setInterval(position,400);}
        position();
    }
    win.addEventListener('resize',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
    return{update(value){view=value;if(value?.session.id!==identity){identity=value?.session.id||'';expanded=false;selected='';draft='';revision=value?.session.revision??-1;}else if(value&&value.session.revision!==revision){revision=value.session.revision;selected=value.session.selectedId;draft='';}render();},destroy(){view=null;detach();win.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);}};
}
