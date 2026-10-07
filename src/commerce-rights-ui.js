import {rightsView} from './commerce-rights.js?v=0.58.15';
import {commerceIconMarkup} from './commerce-icons.js?v=0.58.15';
const escape=value=>String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function purchaseTypeLabel(mode,thai=true){return(thai?{permanent:'ซื้อถาวร',rental:'เช่า',access:'สิทธิ์ใช้งาน',service:'งานบริการ'}:{permanent:'Own permanently',rental:'Rental',access:'Access',service:'Service'})[mode]||'';}
export function storyDateLabel(value,thai=true){return value?`${thai?'วันที่':'Day'} ${value.day} · ${value.time}`:'';}
export function purchaseTermLines(terms,thai=true,incomplete=false){
    if(incomplete)return[thai?'ประเภทและระยะเวลายังไม่ยืนยัน · ยังซื้อไม่ได้':'Type and duration are unconfirmed · Purchase unavailable'];
    if(!terms||terms.mode==='permanent')return[thai?'เป็นกรรมสิทธิ์ของคุณ · ไม่มีวันหมดอายุ':'Your property · No expiry',
        ...(terms?.delivery?[(thai?'สถานที่ · ':'Property · ')+terms.scope,(thai?'ได้รับ · ':'Receive · ')+terms.delivery.name]:[])];
    const lines=[purchaseTypeLabel(terms.mode,thai)+' · '+terms.scope];
    if(terms.validFrom)lines.push((thai?'เริ่ม ':'Starts ')+storyDateLabel(terms.validFrom,thai));
    if(terms.validUntil)lines.push((thai?'ถึง ':'Until ')+storyDateLabel(terms.validUntil,thai));
    if(terms.durationMinutes)lines.push(`${thai?'ระยะเวลา':'Duration'} · ${terms.durationMinutes} ${thai?'นาทีในเรื่อง':'story minutes'}`);
    if(terms.permanent)lines.push(thai?'สิทธิ์ถาวร · ไม่มีวันหมดอายุ':'Permanent access · No expiry');
    if(terms.uses)lines.push(`${terms.uses} ${thai?'ครั้ง':'uses'}`);
    if(terms.delivery)lines.push((thai?'ได้รับ':'Receive')+' · '+terms.delivery.name+(terms.mode==='service'?(thai?' เมื่อทำเสร็จ':' on completion'):''));
    if(terms.includes?.length)lines.push((thai?'รวม':'Includes')+' · '+terms.includes.join(' · '));
    if(terms.conditions)lines.push(terms.conditions);
    if(terms.mode==='service')lines.push(thai?'ชำระเพื่อเปิดงาน · ยังไม่ถือว่าทำเสร็จ':'Payment opens an order · Completion is tracked separately');
    return lines;
}
export function renderRightsInventory(state,{thai=true,coinStyle='stack'}={}){
    const rights=rightsView(state);if(!rights.length)return'';
    const status=thai?{active:'ใช้ได้',upcoming:'ยังไม่ถึงเวลา',expired:'หมดสิทธิ์',due:'ถึงกำหนดรับงาน',returned:'คืนแล้ว',completed:'เสร็จแล้ว',used:'ใช้ครบแล้ว',cancelled:'ยกเลิก'}:{active:'Active',upcoming:'Upcoming',expired:'Expired',due:'Due for collection',returned:'Returned',completed:'Completed',used:'Used',cancelled:'Cancelled'};
    const unit=d=>(thai?{gold:'ทอง',silver:'เงิน',copper:'ทองแดง'}:{gold:'gold',silver:'silver',copper:'copper'})[d];
    const money=(n,d)=>`${commerceIconMarkup('coin',d,coinStyle)} ${Number(n).toLocaleString()} ${unit(d)}`;
    const card=r=>{
        const linked=state.inventory.find(i=>i.id===r.inventoryItemId),title=linked?.name||r.itemName,ended=['returned','completed','cancelled'].includes(r.status);
        const label=r.terms.mode==='service'?(thai?'สถานะงาน':'Order status'):r.terms.mode==='rental'?(thai?'กำหนดคืน':'Return deadline'):(thai?'สิทธิ์ใช้งาน':'Access');
        let timing=r.ends?`${thai?'ถึง':'Until'} ${storyDateLabel(r.ends,thai)}`:r.terms.permanent?(thai?'สิทธิ์ถาวร':'Permanent access'):r.terms.uses?`${r.remainingUses} / ${r.terms.uses} ${thai?'ครั้งที่เหลือ':'uses remaining'}`:r.terms.conditions;
        if(r.effectiveStatus==='expired')timing=(thai?'ครบกำหนด ':'Expired ')+storyDateLabel(r.ends,thai);
        const details=[[(thai?'ประเภท':'Type'),purchaseTypeLabel(r.terms.mode,thai)],[(thai?'ผู้ให้บริการ / เจ้าของ':'Provider / owner'),r.provider.name],[(thai?'สถานที่':'Location'),r.location],[(thai?'สิ่งที่ใช้ได้':'Scope'),r.terms.scope]];
        if(r.terms.redeemers.length)details.push([thai?'ผู้รับตรวจสิทธิ์':'Authorized admission',r.terms.redeemers.join(' · ')]);
        if(r.starts)details.push([thai?'เริ่มใช้สิทธิ์':'Starts',storyDateLabel(r.starts,thai)]);
        if(r.terms.includes.length)details.push([thai?'รวม':'Includes',r.terms.includes.join(' · ')]);
        const explain=r.effectiveStatus==='expired'&&linked?(thai?'สิทธิ์สิ้นสุดแล้ว กุญแจหรือของยังอยู่จนกว่าจะคืนจริง':'Access has ended. The linked item remains until its actual return.'):
            r.terms.mode==='rental'?(thai?'ของเช่าเป็นของเจ้าของเดิม · โรลคืนกับผู้ให้เช่า':'The asset belongs to its original owner. Return it through role-play.'):
            r.terms.mode==='service'&&!ended?(thai?'งานยังต้องได้รับการยืนยันว่าเสร็จจากผู้ให้บริการ':'The provider must confirm the work is complete.'):
            r.terms.uses?(thai?'ใช้ในโรลเพื่อบันทึกจำนวนครั้ง ไม่ต้องกดเรียกเพิ่ม':'Role-play its use to track remaining uses.'):'';
        return `<article class="rf-right-card" data-right-id="${escape(r.id)}" data-right-status="${escape(r.effectiveStatus)}"><header><span class="rf-right-icon">${commerceIconMarkup(linked?.category?.toLowerCase()==='key'?'key':r.terms.mode==='service'?'service':r.terms.mode==='rental'?'rental':'key')}</span><span><strong>${escape(title)}</strong><small>${escape(r.location)}${linked?(thai?' · 1 ชิ้น':' · 1 item'):''}</small></span><em>${escape(status[r.effectiveStatus])}</em></header>${linked?`<button type="button" class="rf-inventory-select" aria-label="${escape((thai?'เลือกไอเทม ':'Select item ')+linked.name)}" data-action="select-item" data-id="${escape(linked.id)}">${commerceIconMarkup('key')}${thai?'เลือกไอเทม':'Select item'}</button>`:''}<div class="rf-right-validity"><span>${escape(label)}</span><strong>${escape(timing||status[r.effectiveStatus])}</strong>${r.terms.uses&&r.ends?`<small>${r.remainingUses} / ${r.terms.uses} ${thai?'ครั้งที่เหลือ':'uses remaining'}</small>`:''}</div><details><summary><span class="rf-right-expand">${thai?'ดูสิทธิ์และเงื่อนไข':'Rights and terms'}</span><span class="rf-right-collapse">${thai?'ซ่อนสิทธิ์และเงื่อนไข':'Hide rights and terms'}</span></summary><dl>${details.map(([a,b])=>`<dt>${escape(a)}</dt><dd>${escape(b)}</dd>`).join('')}<dt>${thai?'ชำระแล้ว':'Paid'}</dt><dd class="rf-commerce-money">${money(r.paid,r.denomination)}</dd>${r.depositPaid?`<dt>${thai?'มัดจำที่จ่าย':'Deposit paid'}</dt><dd class="rf-commerce-money">${money(r.depositPaid,r.denomination)}</dd><dt>${thai?'มัดจำที่คืนแล้ว':'Deposit refunded'}</dt><dd class="rf-commerce-money">${money(r.depositRefunded,r.denomination)}</dd>`:''}</dl>${r.terms.conditions&&r.terms.conditions.trim()!==String(timing||'').trim()?`<p>${escape(r.terms.conditions)}</p>`:''}${explain?`<p>${escape(explain)}</p>`:''}</details>${r.depositPaid>r.depositRefunded&&ended?`<p class="rf-right-refund-pending">${thai?'ยังมีมัดจำรอการคืน':'Deposit refund still pending'} · ${money(r.depositPaid-r.depositRefunded,r.denomination)}</p>`:''}</article>`;
    };
    const active=rights.filter(r=>!['returned','completed','cancelled'].includes(r.status)),history=rights.filter(r=>['returned','completed','cancelled'].includes(r.status));
    return `<section class="rf-rights-inventory" aria-label="${thai?'สิทธิ์ ของเช่า และงานบริการ':'Access, rentals and services'}"><h4>${thai?'สิทธิ์ ของเช่า และงานบริการ':'Access, rentals and services'} <small>${active.length}</small></h4><div class="rf-rights-grid">${active.map(card).join('')}</div>${history.length?`<details class="rf-rights-history"><summary>${thai?'ประวัติสิทธิ์และบริการ':'Rights and service history'} · ${history.length}</summary><div class="rf-rights-grid">${history.slice(-100).reverse().map(card).join('')}</div></details>`:''}</section>`;
}
