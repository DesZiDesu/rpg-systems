import {purchaseDeposit} from './commerce-rights.js?v=0.55.1';
import {purchaseTermLines,purchaseTypeLabel} from './commerce-rights-ui.js?v=0.55.1';
import {commerceBasketQuote} from './commerce-engine.js?v=0.55.1';
import {commerceIcon} from './commerce-icons.js?v=0.55.1';
import {convertMoney} from './commerce-currency.js?v=0.55.1';
// Compact composer UI. Read-only expansion/selection never calls an API;
// every game button delegates to the one asynchronous commerce runtime.
export function createCommerceComposer({document:doc=globalThis.document,perform=()=>{},language=()=> 'en',poll=()=>{},appearance=()=>({}),dock=null}={}) {
    if(!doc?.createElement)return{update(){},destroy(){}};
    const win=doc.defaultView||globalThis;let view=null,expanded=false,identity='',revision=-1,selected='',draft='',inputUnit='',chosen=null,observer,timer,queued=false;
    const node=(tag,cls,text)=>{const el=doc.createElement(tag);el.className=cls||'';if(text!==undefined)el.textContent=text;return el;};
    const bar=node('section','rf-commerce-composer');bar.setAttribute('aria-label','RoleForge commerce');
    const t=(th,en)=>language()==='th'?th:en;
    const moneyNode=(value,cls='',unit=view?.session.denomination)=>{const el=node('span',`rf-commerce-money ${cls}`);el.append(commerceIcon(doc,'coin',unit,appearance().coinStyle),doc.createTextNode(`${Number(value||0).toLocaleString()} ${t({gold:'ทอง',silver:'เงิน',copper:'ทองแดง'}[unit],unit)}`));return el;};
    const terms=()=>{const el=node('p','rf-commerce-terms');if(!view.session.entryFee&&!view.session.deposit){el.textContent=t('เข้าร่วมฟรี · ไม่มีมัดจำ','Free entry · No deposit');return el;}el.append(doc.createTextNode(t('ค่าเข้าไม่คืน ','Nonrefundable entry ')),moneyNode(view.session.entryFee),doc.createTextNode(t(' · เงินกันไว้คืนเมื่อจบ ',' · Refundable hold ')),moneyNode(view.session.deposit));return el;};
    function detach(){dock?.remove('commerce');bar.remove();observer?.disconnect();observer=null;clearInterval(timer);timer=null;}
    function locate(){const textarea=doc.querySelector('#send_textarea'),anchor=doc.querySelector('#send_form')||textarea?.closest('form')||textarea?.parentElement;
        if(!textarea||!anchor?.parentElement||win.getComputedStyle(textarea).display==='none'||win.getComputedStyle(anchor).display==='none')return null;return anchor;}
    function position(){if(!view)return;if(dock){bar.classList.remove('is-fixed');dock.panel('commerce',bar,{label:t({auction:'ประมูล',buy:'ซื้อ',sell:'ขาย'}[view.session?.kind||view.kind]||'ซื้อขาย',{auction:'Auction',buy:'Buy',sell:'Sell'}[view.session?.kind||view.kind]||'Commerce'),busy:view.busy});return;}const anchor=locate();if(!anchor)return;
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
    function observe(){if(!observer){observer=new win.MutationObserver(records=>{if(records.some(record=>!bar.contains(record.target)))schedule();});observer.observe(doc.body,{childList:true,subtree:true});timer=setInterval(()=>{position();poll();},400);}}
    function showError(){
        if(!view.error)return;
        const error=node('p','rf-commerce-error',view.error);error.setAttribute('role','alert');bar.append(error);
        if(view.diagnostics){const details=node('details','rf-commerce-diagnostics'),summary=node('summary','',t('ดูข้อมูลข้อผิดพลาด','View error details')),report=node('textarea','rf-commerce-diagnostic-report');report.readOnly=true;report.value=view.diagnostics;report.setAttribute('aria-label',t('ข้อมูลสำหรับตรวจสอบปัญหา','Diagnostic report'));
            const copy=node('button','rf-commerce-diagnostic-copy',t('คัดลอกข้อมูลตรวจสอบ','Copy diagnostic report'));copy.type='button';copy.addEventListener('click',async()=>{try{await win.navigator.clipboard.writeText(view.diagnostics);copy.textContent=t('คัดลอกแล้ว','Copied');}catch{report.focus();report.select();}});details.append(summary,report,copy);bar.append(details);}
    }
    function render(){
        if(!view){detach();return;}
        if(view.pending){
            const pending=view.pending;bar.replaceChildren();bar.dataset.kind=pending.kind;delete bar.dataset.session;bar.setAttribute('aria-busy',String(pending.waiting));
            const title=node('strong','rf-commerce-pending-title',pending.kind==='auction'?t('ประมูล','AUCTION'):pending.kind==='sell'?t('ขายสินค้า','SELL'):t('ซื้อสินค้า','BUY'));
            const status=node('p','rf-commerce-status',pending.waiting?t('รอ NPC แสดงรายการและราคา…','Waiting for NPC goods and prices…'):t('คำตอบนี้ยังไม่มีข้อมูลเปิดรายการครบ ลอง Swipe หรือ Regenerate ได้','This reply lacks complete opening data. Try Swipe or Regenerate.'));
            status.setAttribute('role','status');bar.append(title,status);if(!pending.waiting)showError();observe();position();return;
        }
        const session=view.session,lot=session.lots?.[session.index],kind=session.kind,auction=kind==='auction';
        const item=session.items?.find(entry=>entry.id===selected)||session.items?.find(entry=>entry.id===session.selectedId);
        const lines=chosen||session.basket||[{itemId:session.selectedId,quantity:item?.item.quantity||1}],basketTotal=!auction?commerceBasketQuote(session,lines):null;
        const newItem=selected&&selected!==session.selectedId,quote=auction?lot?.price||lot?.openingBid:chosen?basketTotal:newItem?item?.askPrice:session.quote;
        bar.replaceChildren();bar.classList.toggle('has-purchase-types',kind==='buy');bar.dataset.kind=kind;bar.dataset.session=session.id;bar.setAttribute('aria-busy',String(Boolean(view.busy)));
        const header=node('button','rf-commerce-summary');header.type='button';header.setAttribute('aria-expanded',String(expanded));
        const glyph=node('span','rf-commerce-glyph');glyph.append(commerceIcon(doc,kind==='buy'&&item?.terms?.mode&&item.terms.mode!=='permanent'?{rental:'rental',access:'key',service:'service'}[item.terms.mode]:kind));glyph.setAttribute('aria-hidden','true');
        const copy=node('span','rf-commerce-summary-copy'),eyebrow=node('small','',auction?t('ประมูล','AUCTION'):kind==='sell'?t('ขาย · '+session.npc.name,'SELL · '+session.npc.name):t('ซื้อ · '+session.npc.name,'BUY · '+session.npc.name));
        const names=!auction?lines.map(line=>session.items.find(entry=>entry.id===line.itemId)?.item.name).filter(Boolean):[];
        const name=node('strong','',auction?lot?.name:lines.length>1?t(`${lines.length} รายการ · ${names.slice(0,2).join(' / ')}`,`${lines.length} items · ${names.slice(0,2).join(' / ')}`):names[0]?(names[0]+(lines[0].quantity>1?` ×${lines[0].quantity}`:'')):session.title);name.title=auction?lot?.name||'':names.join(' / ');copy.append(eyebrow,name);
        const amount=moneyNode(quote,'rf-commerce-price'),chevron=node('span','rf-commerce-chevron');chevron.append(commerceIcon(doc,'chevron'));if(expanded)chevron.classList.add('is-expanded');header.append(glyph,copy,amount,chevron);
        header.addEventListener('click',()=>{expanded=!expanded;render();});bar.append(header);
        if(auction&&session.status==='offered'&&(session.entryFee||session.deposit))bar.append(terms());
        if(auction&&lot?.leader){const leader=lot.leader==='player'?view.playerName:session.participants.find(p=>p.id===lot.leader)?.name;bar.append(node('p','rf-commerce-leader',t('ผู้เสนอราคาสูงสุด · ','Leading · ')+leader));}
        if(!auction)bar.append(node('p','rf-commerce-leader',session.agreed?t('ตกลงราคาแล้ว · รอยืนยัน','Price agreed · Awaiting confirmation'):kind==='sell'?t('ข้อเสนอรับซื้อ · เลือกของที่จะขายได้','Purchase offer · Choose goods to sell'):t('ราคาทั้งตะกร้า · ยังไม่ยืนยัน','Basket total · Awaiting confirmation')));
        if(kind==='buy'){
            const deposit=purchaseDeposit(lines.map(line=>({...line,entry:session.items.find(e=>e.id===line.itemId)})).filter(line=>line.entry));
            const info=node('p','rf-purchase-summary-terms');
            const modes=[...new Set(lines.map(line=>session.items.find(e=>e.id===line.itemId)?.termsRequired?'unknown':session.items.find(e=>e.id===line.itemId)?.terms?.mode||'permanent'))];
            info.textContent=modes.map(mode=>mode==='unknown'?t('เงื่อนไขยังไม่ครบ','Terms incomplete'):purchaseTypeLabel(mode,language()==='th')).join(' / ');
            if(deposit){info.append(doc.createTextNode(t(' · มัดจำเพิ่ม ',' · Additional deposit ')),moneyNode(deposit),doc.createTextNode(t(' · จ่ายรวม ',' · Total due ')),moneyNode((quote||0)+deposit));}
            else if(!modes.includes('unknown'))info.append(doc.createTextNode(t(' · ไม่มีมัดจำ',' · No deposit')));
            bar.append(info);
        }
        if(expanded){
            const detail=node('div','rf-commerce-details');
            if(!auction){
                const list=node('div','rf-commerce-basket');
                for(const entry of session.items){
                    const line=lines.find(line=>line.itemId===entry.id),row=node('div','rf-commerce-basket-row'),check=node('input');check.type='checkbox';check.checked=Boolean(line);check.disabled=view.busy;check.setAttribute('aria-label',t('เลือก ','Select ')+entry.item.name);check.dataset.basketItem=entry.id;
                    const copy=node('label'),label=node('span','rf-purchase-choice-copy'),itemName=node('strong','',entry.item.name),quantity=node('input','rf-commerce-quantity');quantity.type='number';quantity.min='1';quantity.max=String(kind==='buy'&&(entry.terms?.mode&&entry.terms.mode!=='permanent'||entry.terms?.delivery)?1:kind==='sell'?entry.item.quantity:entry.stock);quantity.step='1';quantity.value=String(line?.quantity||entry.item.quantity||1);quantity.disabled=!line||view.busy||kind==='buy'&&(entry.terms?.mode&&entry.terms.mode!=='permanent'||entry.terms?.delivery);quantity.setAttribute('aria-label',t('จำนวน ','Quantity ')+entry.item.name);quantity.dataset.basketQuantity=entry.id;
                    label.append(itemName);if(kind==='buy')label.append(node('small','',entry.termsRequired?t('เงื่อนไขยังไม่ครบ','Terms incomplete'):purchaseTypeLabel(entry.terms?.mode||'permanent',language()==='th')));copy.append(check,label);const update=()=>{const map=new Map(lines.map(line=>[line.itemId,line.quantity]));if(check.checked)map.set(entry.id,Number(quantity.value));else map.delete(entry.id);chosen=[...map].map(([itemId,quantity])=>({itemId,quantity}));draft='';render();};check.addEventListener('change',update);quantity.addEventListener('change',update);
                    row.append(copy,quantity,moneyNode(entry.askPrice*Number(quantity.value)/(entry.item.quantity||1)));list.append(row);
                    if(kind==='buy'&&line){const terms=node('div','rf-purchase-option-terms');if(entry.item.description)terms.append(node('p','rf-commerce-description',entry.item.description));if(entry.item.properties?.length)terms.append(node('p','rf-commerce-description',entry.item.properties.join(' · ')));for(const text of purchaseTermLines(entry.terms,language()==='th',entry.termsRequired))terms.append(node('p','',text));if(entry.termsRequired)terms.append(node('p','rf-commerce-error',t('ยังไม่มีประเภทและเงื่อนไขครบ · Swipe หรือ Regenerate ได้','Purchase type/terms are incomplete · Swipe or Regenerate')));if(entry.terms?.deposit)terms.append(node('p','',t('มัดจำเพิ่ม ','Additional deposit ')+entry.terms.deposit+' '+t({gold:'ทอง',silver:'เงิน',copper:'ทองแดง'}[session.denomination],session.denomination)));list.append(terms);}
                }
                detail.append(list,node('p','rf-commerce-terms',kind==='buy'&&session.items.some(e=>e.terms?.mode&&e.terms.mode!=='permanent'||e.terms?.delivery)?session.items.some(e=>e.terms?.mode==='permanent'&&!e.terms.delivery&&!e.termsRequired)?t('ซื้อถาวรปรับจำนวนได้ · สิทธิ์และสัญญารายการละ 1 · เสนอราคาเป็นยอดรวม','Owned goods allow quantities · One contract per entry · Offers apply to the total'):t('เลือกสถานที่ สิทธิ์ หรือสัญญารายการละ 1 · เสนอราคาเป็นยอดรวม','One property, right or contract per entry · Offers apply to the total'):t('เลือกหลายรายการและจำนวนได้ · เสนอราคาเป็นยอดรวม','Choose items and quantities · Offers apply to the total')));
            }
            const description=auction?lot?.description:item?.item?.description;if(description)detail.append(node('p','rf-commerce-description',description));
            detail.append(node('div','rf-commerce-itemmeta',auction?`${lot?.category} · ×${lot?.quantity}`:t(`รวม ${lines.reduce((sum,line)=>sum+line.quantity,0)} ชิ้น`,`${lines.reduce((sum,line)=>sum+line.quantity,0)} items total`)));
            if(!auction){if(item?.item?.properties?.length)detail.append(node('p','rf-commerce-description',item.item.properties.join(' · ')));if(item?.note)detail.append(node('p','rf-commerce-description',item.note));if(kind==='buy')detail.append(node('p','rf-commerce-terms',item?.stockKnown===false?t('จำนวนในร้านยังไม่ระบุ','Stock not yet specified'):t(`เหลือในร้าน ${item?.stock} ชิ้น`,`${item?.stock} in stock`)));}
            if(auction){
                detail.append(terms());
                if(session.status==='offered'){
                    const join=node('button','rf-commerce-action rf-commerce-join',t('เข้าร่วมโดยยังไม่บิด','Join without bidding'));join.type='button';join.dataset.commerceAction='join';join.disabled=view.busy||!view.available;join.addEventListener('click',()=>{void perform({id:session.id,token:view.token,action:'join'});});detail.append(join);
                }
                const title=node('h5','',t('ผู้เข้าประมูล · เงินคงเหลือ','Bidders · Remaining funds'));detail.append(title);
                for(const participant of session.participants){const row=node('div','rf-commerce-bidder');row.append(node('span','',participant.name),moneyNode(participant.budget-participant.spent));if(lot?.withdrawn.includes(participant.id))row.append(node('small','',t('ถอนตัวแล้ว','Withdrawn')));detail.append(row);}
                if(!session.participants.length)detail.append(node('p','rf-commerce-description',t('ยังไม่มีผู้เข้าประมูลรายอื่น','No other bidders are present')));
                if(session.lots.length>1){detail.append(node('h5','',t('รายการประมูล','Catalog')));for(const entry of session.lots){const row=node('div','rf-commerce-catalog-row');row.append(node('span','',entry.name),moneyNode(entry.openingBid));detail.append(row);}}
            }else if(session.agreed)detail.append(node('p','rf-commerce-agreed',t('ตกลงราคาแล้ว · รอยืนยัน','Price agreed · Awaiting confirmation')));
            detail.append(node('p','rf-commerce-terms',t('โรลเสนอราคา ยืนยัน หรือถาม NPC ในแชตได้ · ปุ่มเป็นทางลัด','Role-play offers, confirmation or questions in chat · Buttons are shortcuts')));
            const last=session.history?.at(-1);if(last)detail.append(node('p','rf-commerce-last',t('ผลล่าสุด · ','Latest · ')+last.narrative.replace(/<[^>]*>/gu,' ').slice(0,500)));
            bar.append(detail);
        }
        const controls=node('div','rf-commerce-controls');
        const fullLabels={bid:'Bid',wait:t('รอการตัดสิน','Await decision'),offer:t('เสนอราคา','Offer price'),confirm:t('ยืนยันราคา','Confirm price'),leave:t('ออกประมูล','Leave auction'),cancel:kind==='sell'?t('ยกเลิกการขาย','Cancel sale'):t('ยกเลิกการซื้อ','Cancel purchase')};
        const button=(label,action,primary=false,disabled=false)=>{const el=node('button',`rf-commerce-action${primary?' is-primary':''}${['leave','cancel'].includes(action)?' is-quiet':''}`,label);el.type='button';el.dataset.commerceAction=action;el.title=fullLabels[action]||label;el.setAttribute('aria-label',fullLabels[action]||label);el.disabled=view.busy||!view.available||disabled||(!auction&&!['cancel'].includes(action)&&(!lines.length||basketTotal===null||kind==='buy'&&lines.some(line=>session.items.find(entry=>entry.id===line.itemId)?.termsRequired)));
            el.addEventListener('click',()=>{void perform({id:session.id,token:view.token,action,amount:Number(draft||input?.value),denomination:['bid','offer'].includes(action)?inputUnit||session.denomination:session.denomination,items:auction?undefined:chosen||session.basket,itemId:auction?undefined:lines[0]?.itemId||session.selectedId});});controls.append(el);return el;};
        let input;
        if(auction&&['sold','unsold'].includes(lot?.status))button(t('รายการถัดไป','Next lot'),'next',true);
        else{
            const priceField=node('div','rf-commerce-price-field');controls.append(priceField);
            input=node('input','rf-commerce-amount');input.type='number';input.inputMode='numeric';input.step='1';input.min=auction?String(lot?.leader?lot.price+lot.minIncrement:lot.openingBid):'1';
            const defaultAmount=auction?lot?.leader?lot.price+lot.minIncrement:lot?.openingBid:quote;input.value=draft||String(inputUnit&&inputUnit!==session.denomination?convertMoney(defaultAmount,session.denomination,inputUnit)||1:defaultAmount);if(inputUnit&&inputUnit!==session.denomination)input.min='1';input.disabled=view.busy||!view.available;input.setAttribute('aria-label',t('ราคาที่เสนอ','Offer amount'));
            input.addEventListener('input',()=>{draft=input.value;});const divider=node('span','rf-commerce-unit-divider');divider.setAttribute('aria-hidden','true');priceField.append(input,divider);
            const unitSelect=node('select','rf-commerce-unit');unitSelect.setAttribute('aria-label',t('หน่วยเงินที่เสนอ','Offer denomination'));for(const unit of ['gold','silver','copper']){const option=node('option','',t({gold:'ทอง',silver:'เงิน',copper:'ทองแดง'}[unit],unit));option.value=unit;option.selected=unit===(inputUnit||session.denomination);unitSelect.append(option);}unitSelect.disabled=view.busy||!view.available;unitSelect.addEventListener('change',()=>{inputUnit=unitSelect.value;draft='';render();});priceField.append(unitSelect);
            if(auction){button('Bid','bid',true,lot?.leader==='player');button(t('รอผล','Wait'),'wait',false,session.status==='offered');}
            else{button(t('เสนอ','Offer'),'offer',true);button(t('ยืนยัน','Confirm'),'confirm');}
        }
        button(auction?t('ออก','Leave'):t('ยกเลิก','Cancel'),auction?'leave':'cancel');bar.append(controls);
        if(view.busy){const status=node('p','rf-commerce-status',t('NPC กำลังพิจารณา…','NPCs are considering…'));status.setAttribute('role','status');bar.append(status);}
        else if(view.error)showError();
        else if(!view.available)bar.append(node('p','rf-commerce-status',t('รอแชตพร้อม หรือกลับไปยังสถานที่เดิม','Wait for the chat or return to this location')));
        observe();
        position();
    }
    win.addEventListener('resize',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
    return{update(value){view=value;if(value?.session?.id!==identity){identity=value?.session?.id||'';expanded=false;selected='';draft='';inputUnit='';chosen=null;revision=value?.session?.revision??-1;}else if(value?.session&&value.session.revision!==revision){revision=value.session.revision;selected=value.session.selectedId;draft='';inputUnit='';chosen=null;}render();},destroy(){view=null;detach();win.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);}};
}
