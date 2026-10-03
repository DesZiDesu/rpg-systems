import {createMemoryInsightRenderer} from './memory-insights-ui.js?v=0.51.0';
import {memorySnippet,normalizeMemoryBatchSize,normalizeMemorySummaryTimeoutSeconds,MEMORY_BATCH_CHAR_LIMIT,MEMORY_CATEGORIES,MEMORY_CATEGORY_LABELS,normalizeMemoryStrategy,normalizeMemoryOutputTokens} from './memory-summaries.js?v=0.51.0';
const escape = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const memoryBusy = status => ['loading','archiving','waiting','counting','summarizing','validating','saving'].includes(status);
export function memoryPhaseLabel(status, language = 'en') {
    const labels = {idle:['Ready to archive','พร้อมเก็บประวัติ'],loading:['Loading memory archive','กำลังเปิดคลังความจำ'],archiving:['Saving original messages','กำลังเก็บข้อความต้นฉบับ'],
        waiting:['Summary queued until the story reply finishes','สรุปอยู่ในคิว รอคำตอบเนื้อเรื่องสร้างเสร็จ'],counting:['Checking tokens against the configured budget','กำลังตรวจจำนวนโทเคนตามงบที่ตั้งไว้'],summarizing:['Summarizing with SillyTavern’s API','กำลังใช้ API ของ SillyTavern สรุปความจำ'],validating:['Checking source evidence','กำลังตรวจหลักฐานต้นทาง'],saving:['Saving memory summary','กำลังบันทึกสรุปความจำ'],prompt:['Preparing memory for the story prompt','กำลังเตรียมความจำสำหรับคำตอบเนื้อเรื่อง'],
        ready:['Summary saved successfully','สรุปและบันทึกสำเร็จ'],partial:['Some messages still need summarizing','ยังมีข้อความรอสรุป'],error:['Memory operation failed','งานความจำไม่สำเร็จ'],cancelled:['Memory job cancelled','ยกเลิกงานความจำแล้ว'],interrupted:['Previous job was interrupted','งานก่อนหน้าหยุดกลางทาง']};
    return (labels[status] || labels.idle)[language === 'th' ? 1 : 0];
}
const panelState = new WeakMap();
const formKey = form => `${form.dataset.form}:${form.elements.namedItem('id')?.value || ''}`;
function rememberPanel(panel, scope) {
    if (typeof panel.addEventListener !== 'function' || typeof panel.querySelectorAll !== 'function' || typeof document === 'undefined') return null;
    let state = panelState.get(panel);
    if (!state) {
        state = {drafts:new Map(),timer:null};
        panelState.set(panel,state);
        const remember = event => {
            const control = event.target, form = control.form;
            if (!form?.dataset.form || !control.name) return;
            const key = formKey(form), draft = state.drafts.get(key) || new Map();
            draft.set(control.name,control.type === 'checkbox' ? control.checked : control.value);
            state.drafts.set(key,draft);
        };
        panel.addEventListener('input',remember);
        panel.addEventListener('change',remember);
        panel.addEventListener('submit',event => {
            if (event.target.dataset.form) state.drafts.delete(formKey(event.target));
        });
        panel.addEventListener('click',event => {
            const preset = event.target.closest('[data-memory-batch-size]');
            if (!preset) return;
            const input = preset.form?.elements.namedItem('memorySummaryBatchSize');
            if (!input) return;
            input.value = preset.dataset.memoryBatchSize;
            input.dispatchEvent(new Event('input',{bubbles:true}));
        });
    }
    const changedScope = scope && state.scope && scope !== state.scope;
    if (changedScope) state.drafts.clear();
    if (scope) state.scope = scope;
    const focus = document.activeElement;
    return {state,details:new Map([...panel.querySelectorAll('details[data-memory-section]')].map(node => [node.dataset.memorySection,node.open])),
        focus:!changedScope && panel.contains(focus) && focus.form?.dataset.form && focus.name ? {form:formKey(focus.form),name:focus.name,start:focus.selectionStart,end:focus.selectionEnd} : null};
}
function restorePanel(panel, remembered, busy, startedAt, requestStartedAt) {
    if (!remembered) return;
    const {state,details,focus} = remembered;
    for (const node of panel.querySelectorAll('details[data-memory-section]')) if (details.has(node.dataset.memorySection)) node.open = details.get(node.dataset.memorySection);
    for (const form of panel.querySelectorAll('form[data-form]')) {
        const key = formKey(form), draft = state.drafts.get(key);
        for (const [name,value] of draft || []) {
            const control = form.elements.namedItem(name);
            if (control) control.type === 'checkbox' ? control.checked = value : control.value = value;
        }
        if (focus?.form === key) {
            const control = form.elements.namedItem(focus.name);
            if (control && !control.disabled) {
                control.focus({preventScroll:true});
                if (typeof control.setSelectionRange === 'function' && focus.start != null) control.setSelectionRange(focus.start,focus.end);
            }
        }
    }
    clearInterval(state.timer);
    const start = Date.parse(startedAt);
    if (!busy || !Number.isFinite(start)) return;
    const update = () => {
        const overlay = panel.closest('#tretaresia-rpg-overlay');
        if (!panel.isConnected || panel.hasAttribute('data-panel') && !panel.classList.contains('is-active') || overlay && !overlay.classList.contains('is-open')) { clearInterval(state.timer); return; }
        const node = panel.querySelector('[data-memory-elapsed]');
        if (node) node.textContent = elapsedLabel(Date.now() - start);
        const request = panel.querySelector('[data-memory-request-elapsed]'), requestStart = Date.parse(requestStartedAt);
        if (request && Number.isFinite(requestStart)) request.textContent = elapsedLabel(Date.now() - requestStart);
    };
    update();
    state.timer = setInterval(update,1000);
}
const elapsedLabel = milliseconds => {
    const seconds = Math.max(0,Math.floor((Number(milliseconds) || 0) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}`;
};
export function renderMemorySummaries(panel, view, profiles = []) {
    if (!panel) return;
    const remembered = rememberPanel(panel,view.chatId ? `${view.owner || ''}:${view.chatId}` : '');
    const th = view.settings.language === 'th', word = (en,thai) => th ? thai : en;
    const e = escape, status = view.job.status, busy = memoryBusy(status), disabled = busy || !view.ready ? ' disabled' : '';
    const action = (name,label,attrs = '',disable = disabled) => `<button type="button" class="trpg-story-button" data-action="memory-summary-${name}" ${attrs}${disable}>${e(label)}</button>`;
    const facts = view.facts || [], categoryLabel = category => (MEMORY_CATEGORY_LABELS[category] || MEMORY_CATEGORY_LABELS.other)[th ? 1 : 0];
    const {card,insights}=createMemoryInsightRenderer(view,word,e,action);
    const atlas = `<details class="rf-memory-atlas" data-memory-section="atlas"><summary>${e(word('Structured memory atlas','คลังความจำแยกหมวด'))} · ${facts.length}</summary>
        <p>${e(word('Latest 30 records per category shown here. Search also checks older records and original messages. Only selected memories enter story context.','แสดง 30 รายการล่าสุดต่อหมวด ค้นหาได้ทั้งรายการเก่าและข้อความต้นฉบับ ส่งเข้า context เฉพาะความจำที่เลือก'))}</p>
        ${MEMORY_CATEGORIES.map(category => {
            const entries = facts.filter(fact => fact.category === category);
            return `<details data-memory-section="category:${category}"><summary>${e(categoryLabel(category))} · ${entries.length}</summary>${entries.length ? entries.slice(-30).reverse().map(card).join('') : `<p>${e(word('No indexed facts in this category yet. Original messages remain searchable.','ยังไม่มีข้อมูลดัชนีในหมวดนี้ ข้อความต้นฉบับยังค้นได้'))}</p>`}</details>`;
        }).join('')}</details>`;
    const label = memoryPhaseLabel(status,view.settings.language);
    const pendingMessages = view.coverage.pendingMessages ?? view.coverage.pendingSegments;
    const linkedPendingMessages = view.coverage.linkedPendingMessages ?? pendingMessages;
    const totalMessages = Math.max(0,Number(view.job.totalMessages) || 0), processedMessages = Math.min(totalMessages,Math.max(0,Number(view.job.processedMessages) || 0));
    const completed = Math.max(0,Number(view.job.completed) || 0), total = Math.max(completed,Number(view.job.total) || 0);
    const currentBatch = busy && view.job.batchMessages > 0 ? completed + 1 : completed;
    const batchSize = normalizeMemoryBatchSize(view.settings.memorySummaryBatchSize);
    const apiTimeout = normalizeMemorySummaryTimeoutSeconds(view.settings.memorySummaryTimeoutSeconds);
    const queued = status === 'waiting' && view.job.waitingFor === 'main-generation';
    const activeBatchSize = Math.max(1,Number(view.job.activeBatchSize) || batchSize);
    const shorterSegments = view.job.activeBatchCharLimit > 0 && view.job.activeBatchCharLimit < MEMORY_BATCH_CHAR_LIMIT;
    const diagnostics = view.job.error ? `<details class="rf-memory-diagnostics" data-memory-section="diagnostics"><summary>${e(word('Failure details','รายละเอียดปัญหา'))}</summary>
        ${view.job.code ? `<div><span>${e(word('Error code','รหัสปัญหา'))}</span><code data-memory-error-code>${e(view.job.code)}</code></div>` : ''}
        ${Number.isInteger(view.job.httpStatus) && view.job.httpStatus > 0 ? `<div><span>${e(word('API HTTP status','สถานะ HTTP ของ API'))}</span><strong>${e(view.job.httpStatus)}</strong></div>` : ''}
        ${view.job.failedStage ? `<div><span>${e(word('Failed step','ขั้นตอนที่หยุด'))}</span><strong data-memory-failed-stage>${e(memoryPhaseLabel(view.job.failedStage,view.settings.language))}</strong></div>` : ''}
        ${Number.isFinite(Number(view.job.failedAfterSeconds)) && view.job.failedAfterSeconds != null ? `<div><span>${e(word('Time waiting in that step','เวลาที่รอในขั้นตอนนั้น'))}</span><strong>${e(elapsedLabel(Number(view.job.failedAfterSeconds)*1000))}</strong></div>` : ''}
        ${view.job.code === 'MEMORY_API_TIMEOUT' ? `<p>${e(word('The summary API did not finish within its request limit. A slow model, a long response or a connection problem can cause this; the timeout alone cannot identify which.','API สรุปส่งผลไม่เสร็จภายในเวลารอ อาจเกิดจากโมเดลช้า คำตอบยาว หรือการเชื่อมต่อมีปัญหา การหมดเวลาอย่างเดียวระบุสาเหตุแน่ชัดไม่ได้'))}</p>` : ''}
        ${view.job.code === 'MEMORY_TOKEN_COUNT_TIMEOUT' ? `<p>${e(word('The tokenizer did not respond in time. This step counts text locally or through SillyTavern; it is separate from the summary model request.','ตัวนับโทเคนตอบไม่ทันเวลา ขั้นตอนนี้ใช้การนับของ SillyTavern และแยกจากคำขอให้โมเดลสรุป'))}</p>` : ''}
        <p>${e(word('Previously saved chapters are kept. Retry processes only the remaining sources; this failed request did not save an incomplete summary.','บทที่บันทึกแล้วอยู่ครบ กดลองใหม่เพื่อทำเฉพาะต้นทางที่เหลือ คำขอที่ล้มเหลวนี้ไม่ได้บันทึกสรุปที่ยังไม่ครบ'))}</p></details>` : '';
    const chapters = view.chapters.map(chapter => `<details class="rf-memory-chapter" data-memory-section="chapter:${e(chapter.id)}"><summary><strong>${e(chapter.summary.slice(0,160))}</strong><small>${e(chapter.chatId)} · v${chapter.revision} · ${e(chapter.valid ? word('Current','ใช้งานได้') : word('Source changed — rebuild required','ต้นทางเปลี่ยน — ต้องสรุปใหม่'))}</small></summary>
        ${chapter.evidenceReport?.droppedEvents ? `<div class="rf-memory-prompt-warning" data-memory-evidence-warning><strong>${e(word('Event index is incomplete','ดัชนีเหตุการณ์ไม่ครบ'))}</strong><p>${e(word(`${chapter.evidenceReport.droppedEvents} event entries lacked valid source citations and were omitted. The model-written summary and all original messages remain saved and searchable; review the summary if needed.`, `ตัดดัชนีเหตุการณ์ ${chapter.evidenceReport.droppedEvents} รายการที่ตรวจต้นทางไม่ได้ สรุปที่โมเดลเขียนและข้อความต้นฉบับยังบันทึกและค้นได้ ตรวจแก้สรุปได้หากจำเป็น`))}</p></div>` : ''}
        <p class="rf-memory-prose">${e(chapter.summary)}</p><details data-memory-section="versions:${e(chapter.id)}"><summary>${e(word('Sources and summary versions','ข้อความต้นทางและรุ่นสรุป'))}</summary>
        <div class="trpg-story-actions">${[...new Map(chapter.sources.map(source => [JSON.stringify([source.chatId || chapter.chatId,source.key]),source])).values()].map(source => action('source',`#${Number(source.key) + 1}`,`data-chat="${e(source.chatId || chapter.chatId)}" data-key="${e(source.key)}" data-fingerprint="${e(source.fingerprint)}"`,'')).join('')}</div>
        ${(chapter.versions || []).slice().reverse().map(version => `<details><summary>v${version.revision}</summary><p class="rf-memory-prose">${e(version.summary)}</p><p class="rf-memory-prose">${e(version.recap)}</p></details>`).join('')}</details>
        <details data-memory-section="edit:${e(chapter.id)}"><summary>${e(word('Edit summary','แก้ไขสรุป'))}</summary><form data-form="memory-summary-edit"><input type="hidden" name="id" value="${e(chapter.id)}"><label>${e(word('Chapter summary','สรุปบทนี้'))}<textarea name="summary" maxlength="5000" required${disabled}>${e(chapter.summary)}</textarea></label>
        <label>${e(word('Continuity recap through this chapter','ภาพรวมสำหรับเล่นต่อถึงบทนี้'))}<textarea name="recap" maxlength="7000" required${disabled}>${e(chapter.recap)}</textarea></label><p>${e(word('Editing retains the previous version. Later dependent summaries need rebuilding.','การแก้เก็บรุ่นเดิมไว้ สรุปบทถัดไปที่อ้างอิงบทนี้จะต้องสร้างใหม่'))}</p><button class="trpg-story-button" type="submit"${disabled}>${e(word('Save revision','บันทึกรุ่นใหม่'))}</button></form></details></details>`).join('');
    const hits = view.results.map(hit => `<article class="rf-memory-hit"><strong>${e(hit.title)}</strong><small>${e(hit.type === 'source' ? word('Original message','ข้อความต้นฉบับ') : hit.kind)} · ${e(hit.whenText)}</small>
        <p class="rf-memory-prose">${e(memorySnippet(hit.detail,view.query,1600))}</p><small>${e([...hit.people,...hit.places].join(' · '))}</small>
        <div class="trpg-story-actions">${action('force',word('Prioritize for replies','เลือกใช้ประกอบคำตอบ'),`data-id="${e(hit.id)}"`)}${hit.sources.map(source => action('source',`#${Number(source.key) + 1}`,`data-chat="${e(source.chatId || hit.chatId)}" data-key="${e(source.key)}" data-fingerprint="${e(source.fingerprint)}"`,'')).join('')}</div></article>`).join('');
    panel.innerHTML = `<section class="trpg-story-workspace rf-memory-workspace"><header class="trpg-story-heading"><div><h2>${e(word('Memory Summaries','สรุปความจำสำหรับย้ายแชต'))}</h2><p>${e(word('Original messages, event search and bounded continuity context','คลังข้อความต้นฉบับ ค้นเหตุการณ์ และส่งความจำภายในงบโทเคน'))}</p></div></header>
        <div class="rf-memory-job" data-status="${e(status)}" role="status" aria-live="polite" aria-busy="${busy}"><strong>${e(label)}</strong>
        <span class="rf-memory-pending">${e(word('Pending messages','ข้อความรอสรุป'))}: <strong data-memory-pending>${pendingMessages}</strong></span>
        <span>${e(word('Saved chapters','บทสรุปที่บันทึกแล้ว'))}: ${view.coverage.chapters} · ${e(word('Original messages','ข้อความต้นฉบับ'))}: ${view.coverage.messages}</span>
        <span data-memory-api-calls>${e(word('AI request attempts','ครั้งที่เรียก AI'))}: ${Math.max(0,Number(view.job.apiCalls)||0)} · ${e(word('Estimated for this run','ประมาณการรอบนี้'))}: ${Math.max(0,Number(view.job.plannedCalls)||0)} · ${e(word('Total recorded for this chat','สะสมที่บันทึกในแชตนี้'))}: ${Math.max(0,Number(view.job.apiCallsTotal)||0)}</span>
        ${view.job.category ? `<small data-memory-category-progress>${e(categoryLabel(view.job.category))} · ${view.job.categoryCompleted || 0}/${MEMORY_CATEGORIES.length} ${e(word('categories saved in this batch','หมวดบันทึกแล้วในชุดนี้'))}</small>` : ''}
        ${queued ? `<p class="rf-memory-queued" data-memory-queued>${e(word('The main story reply is still generating. Summary work will start automatically when it finishes; no summary API request has started while this job is queued. Saved chapters remain available.','คำตอบเนื้อเรื่องหลักกำลังสร้าง งานสรุปจะเริ่มเองเมื่อคำตอบจบ ระหว่างรอคิวยังไม่เรียก API สรุป บทที่บันทึกแล้วอยู่ครบ'))}</p>` : ''}
        ${linkedPendingMessages !== pendingMessages ? `<small>${e(word('Pending messages across linked history','ข้อความรอสรุปรวมประวัติที่เชื่อมไว้'))}: ${linkedPendingMessages}</small>` : ''}
        ${totalMessages ? `<div class="rf-memory-progress"><span>${e(word('Messages saved in this run','ข้อความที่สรุปและบันทึกในงานนี้'))}: <strong data-memory-processed>${processedMessages}/${totalMessages}</strong></span><progress max="${totalMessages}" value="${processedMessages}" aria-label="${e(word('Messages summarized and saved','ข้อความที่สรุปและบันทึกแล้ว'))}"></progress>
        <small>${e(word('Saved batches','ชุดที่บันทึกแล้ว'))}: ${completed}${total ? ` · ${e(word('Batch','ชุดที่'))}: ${currentBatch}/${Math.max(total,currentBatch)} ${e(word('(estimate)','(ประมาณ)'))}` : ''}</small>
        ${busy && view.job.batchMessages ? `<small>${e(word('This request','คำขอชุดนี้'))}: ${view.job.batchMessages} ${e(word('messages','ข้อความ'))} · ${view.job.batchSegments} ${e(word('segments','ช่วงข้อความ'))}</small>` : ''}</div>` : ''}
        <small>${e(word('Batch size','ขนาดชุดสรุป'))}: ${batchSize} ${e(word('messages maximum per request','ข้อความสูงสุดต่อคำขอ'))}. ${e(word('Long messages may be split to fit the input budget.','ข้อความยาวอาจแบ่งเป็นหลายคำขอให้พอดีงบ input'))}</small>
        ${view.coverage.pendingSegments !== pendingMessages ? `<small>${e(word('Pending source segments','ช่วงข้อความต้นทางที่รอสรุป'))}: ${view.coverage.pendingSegments} · ${e(word('A long original message can contain several segments.','ข้อความต้นฉบับยาวหนึ่งข้อความอาจมีหลายช่วง'))}</small>` : ''}
        ${activeBatchSize < batchSize || shorterSegments ? `<p class="rf-memory-adaptive" data-memory-adaptive>${e(word('Using smaller batches for this run','งานนี้ใช้ชุดเล็กลง'))}: ${activeBatchSize} ${e(word('messages per request.','ข้อความต่อคำขอ'))} ${shorterSegments ? e(word('Long messages use shorter source segments. ','ข้อความยาวใช้ช่วงต้นทางสั้นลง ')) : ''}${e(word('Your saved batch-size setting is unchanged.','การตั้งค่าขนาดชุดเดิมยังคงอยู่'))}</p>` : ''}
        ${busy && view.job.startedAt ? `<small>${e(word('Elapsed','เวลาที่ใช้'))}: <span data-memory-elapsed aria-live="off">${elapsedLabel(view.job.elapsedMs)}</span></small>` : ''}
        ${status === 'summarizing' && view.job.requestStartedAt ? `<small>${e(word('Waiting for this API request','รอ API ชุดนี้'))}: <span data-memory-request-elapsed aria-live="off">${elapsedLabel(view.job.requestElapsedMs)}</span> / ${elapsedLabel((view.job.apiTimeoutSeconds || apiTimeout)*1000)}</small>` : ''}
        ${view.job.error ? `<p class="rf-memory-error">${e(view.job.error)}</p>` : ''}${diagnostics}
        ${view.job.promptWarning ? `<div class="rf-memory-prompt-warning" data-memory-prompt-warning><strong>${e(word('Summaries are saved, but memory is not ready to include in story replies.','บันทึกสรุปแล้ว แต่ยังเตรียมความจำสำหรับแนบคำตอบเนื้อเรื่องไม่สำเร็จ'))}</strong><p>${e(view.job.promptWarning)}</p>${view.job.promptCode ? `<code data-memory-prompt-code>${e(view.job.promptCode)}</code>` : ''}<p>${e(word('The affected memory prompt was cleared. Check the tokenizer or memory budgets, then try again; saved chapters do not need summarizing again.','ล้าง prompt ความจำส่วนที่มีปัญหาแล้ว ตรวจตัวนับโทเคนหรืองบความจำแล้วลองใหม่ บทที่บันทึกแล้วไม่ต้องสรุปซ้ำ'))}</p></div>` : ''}
        ${view.job.droppedEvents > 0 ? `<div class="rf-memory-prompt-warning" data-memory-evidence-warning><strong>${e(word('Summaries saved with an incomplete event index','บันทึกสรุปแล้ว แต่ดัชนีเหตุการณ์ไม่ครบ'))}</strong><p>${e(word(`${view.job.droppedEvents} unverified entries omitted. Original messages are still searchable. Review the affected chapters below.`, `ตัดดัชนีที่ตรวจหลักฐานไม่ได้ ${view.job.droppedEvents} รายการ ข้อความต้นฉบับยังค้นได้ ดูบทที่มีคำเตือนด้านล่าง`))}</p></div>` : ''}
        ${['disabled','failed'].includes(view.job.rpgHandoff) ? `<div class="rf-memory-prompt-warning" data-memory-rpg-handoff-warning><strong>${e(word('RPG state handoff needs attention','ตรวจการย้ายข้อมูล RPG ก่อนย้ายแชต'))}</strong><p>${e(view.job.rpgHandoff === 'disabled' ? word('Automatic character continuity is off. Enable Carry this character into new chats automatically in extension settings to transfer RPG state and the story-memory link.','ปิดการสานต่อข้อมูลตัวละครอยู่ เปิด Carry this character into new chats automatically ในการตั้งค่าส่วนเสริมเพื่อย้ายข้อมูล RPG และจุดเชื่อมคลังเนื้อเรื่อง') : word('Story memory is saved, but the RPG state snapshot could not be saved. Export state as a backup before changing chats.','บันทึกคลังเนื้อเรื่องแล้ว แต่บันทึก snapshot ข้อมูล RPG ไม่สำเร็จ ส่งออก State สำรองก่อนย้ายแชต'))}</p></div>` : ''}
        ${!busy && view.job.recommendedBatchSize && view.job.code === 'MEMORY_API_TIMEOUT' ? `<p class="rf-memory-adaptive" data-memory-retry-size>${e(word('Retry / continue will use up to','ลองใหม่ / ทำต่อ จะใช้ไม่เกิน'))} ${Math.min(batchSize,view.job.recommendedBatchSize)} ${e(word('messages per request to shorten the next call. No paid API retry starts until you press it.','ข้อความต่อคำขอให้คำขอถัดไปสั้นลง ยังไม่เรียก API เสียโควต้าซ้ำจนกว่าจะกด'))}</p>` : ''}
        ${view.job.updatedAt ? `<small>${e(view.job.updatedAt)}</small>` : ''}
        ${view.job.tokenCountWarning ? `<p class="rf-memory-token-warning">${e(view.job.tokenCountWarning)}</p>` : ''}
        ${view.job.inputTokens != null ? `<small>${e(view.job.tokenCountEstimated ? word('Latest request token estimate (conservative UTF-8 byte count)','ค่าประมาณโทเคนคำขอล่าสุด (เผื่อจากจำนวนไบต์ UTF-8)') : word('Latest summary task tokens, counted with the active tokenizer','โทเคนงานสรุปล่าสุด นับด้วย tokenizer ปัจจุบัน'))}: input ${view.job.inputTokens} · output ${view.job.outputTokens ?? '—'}</small>` : ''}
        ${view.coverage.stale ? `<p>${e(word('Changed/swiped sources and dependent recaps are excluded until rebuilt.','สรุปที่ต้นทางถูกแก้หรือเปลี่ยน swipe รวมถึงสรุปที่อ้างอิงต่อ จะไม่ถูกใช้จนกว่าจะสร้างใหม่'))}</p>` : ''}</div>
        <div class="trpg-story-actions">${action('run',word('Summarize pending messages','สรุปข้อความที่ยังเหลือ'))}${action('prepare',word('Prepare for a new chat','เตรียมความจำสำหรับแชตใหม่'))}${busy ? action('cancel',queued ? word('Cancel queued summary','ยกเลิกคิวสรุป') : word('Cancel job','ยกเลิกงาน'),'','') : ''}
        ${['error','cancelled','interrupted'].includes(status) ? action('retry',word('Retry / continue','ลองใหม่ / ทำต่อ')) : ''}</div>
        <p class="trpg-story-note">${e(word('Manual summaries and new-chat preparation process the remaining messages one batch at a time, saving each finished batch before continuing. Cancel or retry keeps saved batches. Automatic summaries process one batch per trigger. Separate API calls consume input/output tokens; archived originals stay local until selected for a request.','สรุปเองและเตรียมแชตใหม่ทำข้อความที่เหลือทีละชุด บันทึกทันทีเมื่อแต่ละชุดเสร็จ แล้วจึงทำชุดถัดไป ยกเลิกหรือลองใหม่ยังเก็บชุดที่บันทึกแล้ว อัตโนมัติทำหนึ่งชุดต่อครั้ง การเรียก API แยกใช้ input/output tokens ต้นฉบับอยู่ในเครื่องจนกว่าจะเลือกส่ง'))}</p>
        <details class="rf-memory-settings" data-memory-section="settings"><summary>${e(word('Batch size, summary API and context budgets','ขนาดชุดสรุป API และงบ context'))}</summary><form data-form="memory-summary-settings">
        <label>${e(word('Messages per summary request','จำนวนข้อความต่อคำขอสรุป'))}<input name="memorySummaryBatchSize" type="number" min="1" max="100" step="1" value="${batchSize}" required></label>
        <div class="rf-memory-batch-presets" role="group" aria-label="${e(word('Batch size presets','ขนาดชุดสรุปแนะนำ'))}">${[5,10,20,50].map(size => `<button type="button" class="trpg-story-button" data-memory-batch-size="${size}">${size} ${e(word('messages','ข้อความ'))}</button>`).join('')}</div>
        <small>${e(word('Choose 1–100 original user/character messages. Start with 5–10 for faster requests. The input token budget may reduce a batch further. Save settings before starting a job.','เลือกได้ 1–100 ข้อความผู้เล่น/ตัวละคร เริ่มที่ 5–10 เพื่อให้แต่ละคำขอสั้นลง งบ input tokens อาจลดขนาดชุดลงอีก บันทึกการตั้งค่าก่อนเริ่มงาน'))}</small>
        <label class="trpg-story-check"><input type="checkbox" name="memoryAutoSummary"${view.settings.memoryAutoSummary ? ' checked' : ''}><span>${e(word('Summarize automatically after completed replies','สรุปอัตโนมัติหลังคำตอบสร้างเสร็จ'))}</span></label>
        <label>${e(word('Completed replies per automatic summary','จำนวนคำตอบต่อการสรุปอัตโนมัติ'))}<input name="memorySummaryInterval" type="number" min="5" max="100" value="${view.settings.memorySummaryInterval}"></label>
        <label>${e(word('API / model for summaries','API / โมเดลสำหรับสรุป'))}<select name="memorySummaryProfile"><option value="">${e(word('Main chat: current SillyTavern API and model','แชตหลัก: API และโมเดลปัจจุบันของ SillyTavern'))}</option>${profiles.map(profile => `<option value="${e(profile.id)}"${profile.id === view.settings.memorySummaryProfile ? ' selected' : ''}>${e(profile.name)}</option>`).join('')}${view.settings.memorySummaryProfile && !profiles.some(profile => profile.id === view.settings.memorySummaryProfile) ? `<option selected value="${e(view.settings.memorySummaryProfile)}">${e(word('Unavailable profile','โปรไฟล์ไม่พร้อมใช้งาน'))}</option>` : ''}</select></label>
        <label>${e(word('Current API generation method','วิธีเจนเมื่อใช้ API ปัจจุบัน'))}<select name="memorySummaryMode"><option value="preset"${view.settings.memorySummaryMode !== 'compact' ? ' selected' : ''}>${e(word('SillyTavern preset (recommended)','SillyTavern preset (แนะนำ)'))}</option><option value="compact"${view.settings.memorySummaryMode === 'compact' ? ' selected' : ''}>${e(word('Compact prompt (previous method)','Compact prompt (วิธีเดิม)'))}</option></select></label>
        <label>${e(word('Memory optimization strategy','วิธีจัดความจำ'))}<select name="memorySummaryStrategy">${[
            ['batch',word('All categories, one call per message batch (recommended)','รวมทุกหมวด แบ่งข้อความเป็นชุด (แนะนำ)')],
            ['single',word('All pending history and categories in one call','รวมประวัติที่เหลือและทุกหมวดในคำขอเดียว')],
            ['categories',word('One call per category per message batch','หนึ่งคำขอต่อหมวด ต่อชุดข้อความ')],
        ].map(([value,label])=>`<option value="${value}"${normalizeMemoryStrategy(view.settings.memorySummaryStrategy)===value ? ' selected' : ''}>${e(label)}</option>`).join('')}</select></label>
        <small>${e(word(`One-request mode refuses before calling AI if all sources cannot fit; it never silently splits. Category mode uses up to ${MEMORY_CATEGORIES.length} calls per batch and saves each category for continuation. Retries count as new attempts; these counters are not provider billing totals.`, `โหมดคำขอเดียวตรวจงบก่อนเรียก AI ถ้าใส่ต้นทางทั้งหมดไม่ได้จะหยุด ไม่แบ่งเอง โหมดแยกหมวดใช้สูงสุด ${MEMORY_CATEGORIES.length} ครั้งต่อชุด และบันทึกแต่ละหมวดเพื่อทำต่อ การลองใหม่เพิ่มจำนวนครั้ง ตัวเลขนี้ไม่ใช่ยอดเรียกเก็บของผู้ให้บริการ`))}</small>
        <label>${e(word('Maximum output tokens per AI request','งบ output tokens สูงสุดต่อคำขอ AI'))}<input name="memorySummaryOutputTokens" type="number" min="1200" max="12000" value="${normalizeMemoryOutputTokens(view.settings.memorySummaryOutputTokens)}"></label>
        <small>${e(word('Preset mode uses native quiet generation with your enabled preset prompts, including JB, chat context, lore and Author’s Note according to SillyTavern settings. Compact mode sends only the summary task with current API/model settings. A selected Connection Manager profile uses its preset instead.','โหมด preset ใช้ทางเจน quiet ของ SillyTavern รวม prompt ที่เปิดไว้ใน preset เช่น JB บริบทแชต lore และ Author’s Note ตามการตั้งค่า SillyTavern ส่วน Compact ส่งเฉพาะงานสรุปด้วย API/โมเดลปัจจุบัน หากเลือก Connection Manager จะใช้ preset ของโปรไฟล์นั้น'))}</small>
        <small>${e(word('The main-chat option uses SillyTavern’s current API, model and generation settings for a separate summary request. No story message is added. Choose a Connection Manager profile only to use another connection/model.','ตัวเลือกแชตหลักใช้ API โมเดล และการตั้งค่าเจนปัจจุบันของ SillyTavern ส่งคำขอสรุปแยกโดยไม่เพิ่มข้อความเนื้อเรื่อง เลือกโปรไฟล์ Connection Manager เมื่อต้องการใช้การเชื่อมต่อหรือโมเดลอื่น'))}</small>
        <label>${e(word('API request timeout (seconds)','เวลารอ API ต่อคำขอ (วินาที)'))}<input name="memorySummaryTimeoutSeconds" type="number" min="60" max="600" step="1" value="${apiTimeout}" required></label>
        <small>${e(word('Default 240 seconds; choose 60–600 for each request. A longer limit can help slow models, but does not make them faster. Each request uses the API; category mode makes one request per category. Failed calls and manual retries may still consume provider quota/tokens.','เริ่มต้น 240 วินาที ตั้งได้ 60–600 ต่อคำขอ เพิ่มเวลาได้เมื่อโมเดลช้า แต่ไม่ได้ทำให้โมเดลเร็วขึ้น แต่ละคำขอเรียก API แยก โหมดแยกหมวดมีหลายคำขอต่อชุด คำขอที่ล้มเหลวและการลองใหม่อาจยังใช้โควต้า/โทเคนของผู้ให้บริการ'))}</small>
        <label>${e(word('Summary task input token budget','งบ input tokens ของงานสรุป'))}<input name="memorySummaryInputBudget" type="number" min="4000" max="64000" value="${view.settings.memorySummaryInputBudget}"></label>
        <small>${e(word('This budget covers the summary task. Preset mode adds native chat/preset context, managed by SillyTavern’s model context limit.','งบนี้นับเฉพาะงานสรุป โหมด preset มีบริบทแชต/preset เพิ่ม ซึ่ง SillyTavern จัดตาม context limit ของโมเดล'))}</small>
        <label class="trpg-story-check"><input type="checkbox" name="memoryInject"${view.settings.memoryInject ? ' checked' : ''}><span>${e(word('Include selected memories in story prompts','ส่งความจำที่เลือกเข้า prompt เนื้อเรื่อง'))}</span></label>
        <label>${e(word('Overview token budget','งบโทเคนภาพรวม'))}<input name="memorySummaryBudget" type="number" min="200" max="12000" value="${view.settings.memorySummaryBudget}"></label>
        <label>${e(word('Retrieved memory token budget','งบโทเคนความจำที่ค้นได้'))}<input name="memoryRetrievalBudget" type="number" min="200" max="12000" value="${view.settings.memoryRetrievalBudget}"></label>
        <button type="submit" class="trpg-story-button"${disabled}>${e(word('Save settings','บันทึกการตั้งค่า'))}</button></form></details>
        <p>${e(word('Memory prompt tokens including instructions','โทเคนความจำที่ส่ง รวมคำอธิบาย'))}: ${view.prompt?.tokens || 0}${view.estimated ? ` · ${e(view.settings.memorySummaryProfile ? word('Active tokenizer estimate may differ from the summary profile','ค่าจาก tokenizer ปัจจุบันอาจต่างจากโปรไฟล์สรุป') : word('conservative byte estimate','ประมาณแบบเผื่อจากจำนวนไบต์'))}` : ''} · ${e(word('Selected references','รายการที่เลือก'))}: ${view.prompt?.selected?.length || 0}</p>
        <form data-form="memory-summary-search"><label>${e(word('Search people, places or events','ค้นบุคคล สถานที่ หรือเหตุการณ์'))}<input name="query" maxlength="500" value="${e(view.query)}" placeholder="${e(word('Cora river fishing night','คอร่า แม่น้ำ ตกปลา กลางคืน'))}"></label><button class="trpg-story-button" type="submit">${e(word('Search archive','ค้นในคลัง'))}</button></form>
        ${view.forced?.length ? `<p>${e(word('Prioritized references','รายการที่จัดลำดับก่อน'))}: ${view.forced.length} ${action('clear',word('Clear selection','ล้างการเลือก'),'','')}</p>` : ''}
        <div class="rf-memory-results">${hits || (view.query ? `<p>${e(word('No matching source in the selected chat history. Try a name, alias or place.','ไม่พบในประวัติแชตที่เลือก ลองค้นชื่อ ชื่ออื่น หรือสถานที่'))}</p>` : '')}</div>
        ${view.preview ? `<details class="rf-memory-source" data-memory-section="source:${e(view.preview.chatId)}:${e(view.preview.key)}" open><summary>${e(word('Original source','ข้อความต้นทาง'))} · ${e(view.preview.chatId)} · #${Number(view.preview.key) + 1}${view.preview.current === false ? ` · ${e(word('Previous version','รุ่นก่อนแก้ไข'))}` : ''}</summary><pre>${e(view.preview.text)}</pre></details>` : ''}
        <details data-memory-section="history"><summary>${e(word('Choose history for this chat','เลือกประวัติที่จะใช้ในแชตนี้'))}</summary><p>${e(word('Only this chat and explicitly linked ancestors are searched. Alternative story branches stay separate.','ค้นเฉพาะแชตนี้และประวัติที่เชื่อมไว้ แชตที่เป็นเรื่องอีกแขนงจะไม่ถูกรวมเอง'))}</p>
        ${view.chats.map(chat => `<article class="rf-memory-history"><span>${e(chat.name)} · ${chat.messages} ${e(word('messages','ข้อความ'))}</span>${chat.id !== view.chatId ? action('link',view.ancestry.includes(chat.id) ? word('Exclude history','ไม่นำประวัตินี้มาใช้') : word('Include history','นำประวัตินี้มาใช้'),`data-id="${e(chat.id)}" data-include="${!view.ancestry.includes(chat.id)}"`) : `<small>${e(word('Current chat','แชตปัจจุบัน'))}</small>`}</article>`).join('')}</details>
        ${insights}${atlas}<details data-memory-section="chapters"><summary>${e(word('Chapter archive and revisions','คลังบทสรุปและรุ่นแก้ไข'))}</summary>${chapters || `<p>${e(word('No summaries yet. Summarize the current chat or link an archived history.','ยังไม่มีบทสรุป กดสรุปแชตนี้หรือเลือกประวัติที่เก็บไว้'))}</p>`}</details>
        <details data-memory-section="handoffs"><summary>${e(word('Prepared handoff versions','รุ่นความจำที่เตรียมย้ายแชต'))}</summary>${(view.capsules || []).map(capsule => `<details><summary>${e(capsule.createdAt)} · ${e(capsule.chatId)}</summary><p class="rf-memory-prose">${e(capsule.recap)}</p></details>`).join('') || `<p>${e(word('Prepare a new-chat memory package to save a handoff version.','กดเตรียมความจำสำหรับแชตใหม่เพื่อเก็บรุ่นส่งต่อ'))}</p>`}</details>
        <div class="trpg-story-actions">${action('export',word('Export full memory backup','ส่งออกคลังความจำทั้งหมด'))}<label class="trpg-story-button rf-memory-import">${e(word('Import memory backup','นำเข้าคลังความจำ'))}<input type="file" accept="application/json,.json" data-memory-import${disabled}></label></div>
        <p>${e(word('Original messages are stored in this browser’s IndexedDB. Export this archive to move devices or back up originals; RPG state export alone does not include it.','ข้อความต้นฉบับเก็บใน IndexedDB ของเบราว์เซอร์นี้ ต้องส่งออกคลังนี้เพื่อย้ายอุปกรณ์หรือสำรองต้นฉบับ การส่งออกสถานะ RPG อย่างเดียวไม่รวมคลังนี้'))}</p>
        </section>`;
    restorePanel(panel,remembered,busy,view.job.startedAt,view.job.requestStartedAt);
}
