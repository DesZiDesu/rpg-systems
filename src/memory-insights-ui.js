import {memoryRecordKey} from './memory-insights.js?v=0.50.1';

export function createMemoryInsightRenderer(view,word,e,action) {
    const currentKeys=new Set((view.facts||[]).map(memoryRecordKey));
    const sourceButtons=fact=>(fact.sources||[]).map(source=>action('source',`#${Number(source.key)+1}`,`data-chat="${e(source.chatId||fact.chatId)}" data-key="${e(source.key)}" data-fingerprint="${e(source.fingerprint)}"`,'')).join('');
    const card=fact=>`<article class="rf-memory-fact"><strong>${e(fact.title)}</strong>
        <small>${e([fact.kind,fact.status||'Historical',fact.confidence,fact.visibility==='Private'?word('Private','ความลับ'):'',fact.disputed?word('Conflicting evidence','หลักฐานขัดกัน'):'',['Past','Flashback'].includes(fact.timeline?.frame)?fact.timeline.frame:'',fact.whenText].filter(Boolean).join(' · '))}</small>
        <p class="rf-memory-prose">${e(fact.detail)}</p>${fact.quote?`<blockquote>${e(fact.speaker)}: ${e(fact.quote)}</blockquote>`:''}
        ${fact.knownBy?.length?`<small>${e(word('Recorded as known by','ผู้ที่มีข้อมูลว่ารู้'))}: ${e(fact.knownBy.join(' · '))}</small>`:''}
        <small>${e([...(fact.people||[]),...(fact.places||[])].join(' · '))}</small>
        <div class="trpg-story-actions">${currentKeys.has(memoryRecordKey(fact))?action('force',word('Prioritize for replies','เลือกใช้ประกอบคำตอบ'),`data-id="${e(memoryRecordKey(fact))}"`):''}${sourceButtons(fact)}</div></article>`;
    const section=(name,title,count,content)=>`<details data-memory-section="insight:${name}"><summary>${e(title)} · ${count}</summary>${content||`<p>${e(word('No cited records yet. New summaries populate this view.','ยังไม่มีข้อมูลอ้างอิง ผลสรุปใหม่จะเติมส่วนนี้'))}</p>`}</details>`;
    const methods={Witnessed:word('Witnessed','เห็นเอง'),Told:word('Told','มีคนบอก'),Public:word('Public disclosure','เปิดเผยต่อสาธารณะ'),Unaware:word('Explicitly unaware','ระบุว่ายังไม่รู้'),Inferred:word('Inferred','อนุมาน'),Unknown:word('Unconfirmed','ยังไม่ยืนยัน'),Recorded:word('Previously recorded; method unspecified','บันทึกเดิม ไม่ระบุวิธีรู้')};
    const threads=view.threads||[],timeline=view.timeline||[],knowledge=view.knowledge||[],changes=view.changes||[],secrets=view.unassignedSecrets||[];
    const threadCards=threads.slice().sort((a,b)=>(a.status==='Resolved')-(b.status==='Resolved')||b.latest.order-a.latest.order).slice(0,50).map(thread=>`<details><summary>${e(thread.title)} · ${e(thread.status==='Resolved'?word('Resolved','คลี่คลายแล้ว'):word('Open','ยังค้าง'))}</summary>
        <small>${e(word('Opening evidence','หลักฐานที่เริ่มเรื่อง'))}</small>${card(thread.opening)}
        ${thread.resolution?`<small>${e(word('Confirmed resolution','หลักฐานที่ยืนยันว่าคลี่คลาย'))}</small>${card(thread.resolution)}`:thread.latest!==thread.opening?card(thread.latest):''}</details>`).join('');
    const timelineCards=timeline.slice(-100).map(fact=>`<details><summary>${e(fact.eventDay!==null?`${word('Day','วัน')} ${fact.eventDay} ${fact.eventTime}`:word('Event date unknown','ไม่ทราบวันเกิดเหตุ'))} · ${e(fact.title)}</summary>
        <small>${e(fact.timeline.frame)}${fact.recordedDay!==null?` · ${e(word('Recorded on day','บันทึกวันที่'))} ${fact.recordedDay} ${e(fact.recordedTime)}`:''}${fact.superseded?` · ${e(word('Superseded; retained history','ข้อมูลเก่าที่มีข้อมูลใหม่แทน'))}`:''}</small>${card(fact)}</details>`).join('');
    const knowledgeCards=knowledge.slice(0,50).map(person=>`<details><summary>${e(person.name)} · ${person.known.length} ${e(word('known','รายการที่รู้'))}</summary>
        ${['known','unaware','uncertain','history'].map(group=>person[group]?.length?`<h4>${e(group==='known'?word('Recorded knowledge','ข้อมูลว่ารู้'):group==='unaware'?word('Explicitly not known','ระบุว่ายังไม่รู้'):group==='history'?word('Historical knowledge','การรับรู้ในอดีต'):word('Unconfirmed knowledge','ยังไม่ยืนยันว่ารู้'))}</h4>
            ${person[group].slice(-30).reverse().map(entry=>`<small>${e(methods[entry.method]||entry.method)}</small>${card(entry.fact)}`).join('')}`:'').join('')}</details>`).join('');
    const changeCards=changes.slice(-30).reverse().map(change=>`<details><summary>${e(change.title)} · ${e(change.change.type)}</summary><p>${e(change.change.reason)}</p>
        <small>${e(change.applied?word('Linked correction replaces older context references','เชื่อมข้อมูลแก้ไขแล้ว ใช้แทนรายการเก่าใน context'):word('Historical or unsettled account; inspect both sources','ข้อมูลย้อนหลังหรือยังไม่ยุติ ตรวจหลักฐานทั้งสองฝั่ง'))}
        ${change.unlinked?` · ${e(word('Targets not linked','รายการอ้างอิงที่ยังเชื่อมไม่ได้'))}: ${change.unlinked}`:''}</small>${change.targets.map(card).join('')}${card(change)}</details>`).join('');
    const insights=`<details class="rf-memory-insights" data-memory-section="insights"><summary>${e(word('Smart memory views','มุมมอง Smart Memory'))}</summary>
        <p>${e(word('These views use saved citations locally, with no extra AI calls. Unknown knowledge is not public knowledge. Historical records and conflicting accounts remain available.','จัดจากข้อมูลที่บันทึกในเครื่อง ไม่เรียก AI เพิ่ม การไม่ระบุว่าใครรู้ไม่ได้แปลว่าทุกคนรู้ เก็บเหตุการณ์เก่าและหลักฐานที่ขัดกันไว้'))}</p>
        ${section('threads',word('Open threads / promises','เรื่องค้าง / สัญญา'),threads.filter(thread=>thread.status==='Active').length,threadCards)}
        ${section('timeline',word('Timeline / chronology','ลำดับเหตุการณ์'),timeline.length,`<p>${e(word('Dated events are chronological; unknown dates retain archive order. Recorded time does not date a flashback. Latest 100 entries shown.','เหตุการณ์ที่มีวันเรียงตามเวลา วันที่ไม่ทราบใช้ลำดับบันทึก เวลาที่บันทึกไม่ใช่วันเกิดเหตุย้อนอดีต แสดง 100 รายการล่าสุด'))}</p>${timelineCards}`)}
        ${section('knowledge',word('Knowledge / secrets','ใครรู้อะไร / ความลับ'),knowledge.length,knowledgeCards+(secrets.length?`<details><summary>${e(word('Secrets with no confirmed recipient','ความลับที่ยังไม่ระบุผู้รับรู้'))} · ${secrets.length}</summary>${secrets.slice(-30).map(card).join('')}</details>`:''))}
        ${section('changes',word('Corrections / contradictions','ข้อมูลแก้ไข / ขัดแย้ง'),changes.length,changeCards)}</details>`;
    return {card,insights};
}
