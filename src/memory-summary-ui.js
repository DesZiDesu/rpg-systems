import {createMemoryInsightRenderer} from './memory-insights-ui.js?v=0.55.1';
import {memorySnippet,normalizeMemoryBatchSize,normalizeMemorySummaryTimeoutSeconds,MEMORY_BATCH_CHAR_LIMIT,MEMORY_CATEGORIES,MEMORY_CATEGORY_LABELS,normalizeMemoryStrategy,normalizeMemoryOutputTokens} from './memory-summaries.js?v=0.55.1';
const escape = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const memoryBusy = status => ['loading','archiving','waiting','counting','summarizing','validating','saving'].includes(status);
export function memoryPhaseLabel(status, language = 'en') {
    const labels = {idle:['Ready to archive','พร้อมเก็บประวัติ'],loading:['Loading memory archive','กำลังเปิดคลังความจำ'],archiving:['Saving original messages','กำลังเก็บข้อความต้นฉบับ'],
        waiting:['Summary queued until the story reply finishes','สรุปอยู่ในคิว รอคำตอบเนื้อเรื่องสร้างเสร็จ'],counting:['Checking tokens against the configured budget','กำลังตรวจจำนวนโทเคนตามงบที่ตั้งไว้'],summarizing:['Summarizing with SillyTavern’s API','กำลังใช้ API ของ SillyTavern สรุปความจำ'],validating:['Checking source evidence','กำลังตรวจหลักฐานต้นทาง'],saving:['Saving memory summary','กำลังบันทึกสรุปความจำ'],prompt:['Preparing memory for the story prompt','กำลังเตรียมความจำสำหรับคำตอบเนื้อเรื่อง'],
        ready:['Summary saved successfully','สรุปและบันทึกสำเร็จ'],partial:['Some messages still need summarizing','ยังมีข้อความรอสรุป'],error:['Memory operation failed','งานความจำไม่สำเร็จ'],cancelled:['Memory job cancelled','ยกเลิกงานความจำแล้ว'],interrupted:['Previous job was interrupted','งานก่อนหน้าหยุดกลางทาง']};
    return (labels[status] || labels.idle)[language === 'th' ? 1 : 0];
}
const panelState = new WeakMap();
const formKey = form => `${form.dataset.form}:${form.dataset.memorySettingsGroup || ''}:${form.elements.namedItem('id')?.value || ''}`;
function rememberPanel(panel, scope) {
    if (typeof panel.addEventListener !== 'function' || typeof panel.querySelectorAll !== 'function' || typeof document === 'undefined') return null;
    let state = panelState.get(panel);
    if (!state) {
        state = {drafts:new Map(),timer:null};
        panelState.set(panel,state);
        const remember = event => {
            if (state.rendering || !panel.contains(event.target)) return;
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
        const overlay = panel.closest('#tretaresia-rpg-overlay'), drawer = panel.closest('.rf-memory-addon-drawer');
        if (drawer && !drawer.open || panel.closest('[hidden]') || !panel.isConnected || panel.hasAttribute('data-panel') && !panel.classList.contains('is-active') || overlay && !overlay.classList.contains('is-open')) { clearInterval(state.timer); return; }
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
    const remembered = rememberPanel(panel,`${view.owner || ''}:${view.chatId || ''}`);
    if (remembered) remembered.state.rendering = true;
    const th = view.settings.language === 'th', word = (en,thai) => th ? thai : en;
    const e = escape, status = view.job.status, busy = memoryBusy(status), disabled = busy || !view.ready ? ' disabled' : '';
    const action = (name,label,attrs = '',disable = disabled) => `<button type="button" class="trpg-story-button${name==='run'?' rf-memory-primary':''}" data-action="memory-summary-${name}" ${attrs}${disable}>${e(label)}${name==='run'?`<small class="rf-memory-api-badge">${e(word('API call','เรียก API'))}</small>`:''}</button>`;
    const facts = view.facts || [], categoryLabel = category => (MEMORY_CATEGORY_LABELS[category] || MEMORY_CATEGORY_LABELS.other)[th ? 1 : 0];
    const {card,insights}=createMemoryInsightRenderer(view,word,e,action);
    const atlas = `<details class="rf-memory-atlas" data-memory-section="atlas"><summary>${e(word('Memory categories','ความจำแยกหมวด'))} · ${facts.length}</summary>
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
    const settingsDisabled = busy ? ' disabled' : '';
    const numberField = (name,label,min,max,value) => `<label class="rf-memory-field">${e(label)}<input name="${name}" type="number" min="${min}" max="${max}" step="1" value="${e(value)}" required></label>`;
    const check = (name,label,value) => `<label class="rf-memory-setting-row"><span>${e(label)}</span><span class="rf-memory-switch"><input type="checkbox" name="${name}"${value ? ' checked' : ''}><i aria-hidden="true"></i></span></label>`;
    const settingsForm = (group,content) => `<form data-form="memory-summary-settings" data-memory-settings-group="${group}">${content}<button type="submit" class="trpg-story-button"${settingsDisabled}>${e(word('Save settings','บันทึกการตั้งค่า'))}</button></form>`;
    const fold = (key,title,meta,content,open=false,classes='') => `<details class="rf-memory-fold ${classes}" data-memory-section="${key}"${open ? ' open' : ''}><summary><span>${e(title)}</span>${meta!==''?`<small>${e(meta)}</small>`:''}</summary><div class="rf-memory-fold-body">${content}</div></details>`;
    const autoSettings = settingsForm('auto',check('memoryAutoSummary',word('Summarize after completed AI replies','สรุปหลังคำตอบ AI สร้างเสร็จ'),view.settings.memoryAutoSummary)+`<div class="rf-memory-fields">${numberField('memorySummaryInterval',word('Every how many replies','ทุกกี่คำตอบ'),5,100,view.settings.memorySummaryInterval)}${numberField('memorySummaryBatchSize',word('Messages per batch','ข้อความต่อชุด'),1,100,batchSize)}</div><div class="rf-memory-batch-presets">${[5,10,20,50].map(size=>`<button type="button" class="trpg-story-button" data-memory-batch-size="${size}">${size}</button>`).join('')}</div><p class="rf-memory-hint">${e(word('Each request is announced. Automatic summaries wait for the main reply and process one batch per trigger. Long messages may need smaller batches.','แจ้งก่อนเรียก API แต่ละชุด รอคำตอบหลักจบก่อนสรุปอัตโนมัติครั้งละหนึ่งชุด ข้อความยาวอาจต้องแบ่งชุดเล็กลง'))}</p>`);
    const contextSettings = settingsForm('context',check('memoryInject',word('Include selected memories in story prompts','ส่งความจำที่เลือกเข้า prompt'),view.settings.memoryInject)+`<div class="rf-memory-fields">${numberField('memorySummaryBudget',word('Overview tokens','งบโทเคนภาพรวม'),200,12000,view.settings.memorySummaryBudget)}${numberField('memoryRetrievalBudget',word('Retrieved memory tokens','งบโทเคนค้นคืน'),200,12000,view.settings.memoryRetrievalBudget)}</div><p class="rf-memory-hint">${e(word('Select relevant saved memories within these budgets. Selecting and searching memories make no extra AI request.','เลือกความจำที่เกี่ยวข้องภายในงบ การเลือกและค้นข้อมูลที่บันทึกแล้วไม่เรียก AI เพิ่ม'))}</p>`);
    const apiSettings = settingsForm('api',`<div class="rf-memory-fields"><label class="rf-memory-field rf-memory-full">${e(word('API / model for summaries','API / โมเดลสำหรับสรุป'))}<select name="memorySummaryProfile"><option value="">${e(word('Current SillyTavern API / model','API / โมเดลปัจจุบันของ SillyTavern'))}</option>${profiles.map(profile=>`<option value="${e(profile.id)}"${profile.id===view.settings.memorySummaryProfile?' selected':''}>${e(profile.name)}</option>`).join('')}${view.settings.memorySummaryProfile&&!profiles.some(profile=>profile.id===view.settings.memorySummaryProfile)?`<option selected value="${e(view.settings.memorySummaryProfile)}">${e(word('Unavailable profile','โปรไฟล์ไม่พร้อมใช้งาน'))}</option>`:''}</select></label>
        <label class="rf-memory-field rf-memory-full">${e(word('Generation method with current API','วิธีเจนเมื่อใช้ API ปัจจุบัน'))}<select name="memorySummaryMode"><option value="preset"${view.settings.memorySummaryMode!=='compact'?' selected':''}>SillyTavern preset</option><option value="compact"${view.settings.memorySummaryMode==='compact'?' selected':''}>Compact prompt</option></select></label>
        <label class="rf-memory-field rf-memory-full">${e(word('Memory strategy','วิธีจัดความจำ'))}<select name="memorySummaryStrategy">${[['batch',word('All categories · message batches','รวมทุกหมวด · แบ่งข้อความเป็นชุด')],['single',word('All pending messages · one request','รวมข้อความที่เหลือ · คำขอเดียว')],['categories',word('Separate requests per category','แยกคำขอต่อหมวด')]].map(([value,label])=>`<option value="${value}"${normalizeMemoryStrategy(view.settings.memorySummaryStrategy)===value?' selected':''}>${e(label)}</option>`).join('')}</select></label>
        ${numberField('memorySummaryInputBudget',word('Input token budget','งบ input tokens'),4000,64000,view.settings.memorySummaryInputBudget)}${numberField('memorySummaryOutputTokens',word('Output token budget','งบ output tokens'),1200,12000,normalizeMemoryOutputTokens(view.settings.memorySummaryOutputTokens))}${numberField('memorySummaryTimeoutSeconds',word('API timeout (seconds)','เวลารอ API (วินาที)'),60,600,apiTimeout)}</div>
        <p class="rf-memory-hint">${e(word(`One-request mode checks the budget first and does not silently split. Category mode can use up to ${MEMORY_CATEGORIES.length} calls per batch. Retrying is another API request.`, `โหมดคำขอเดียวตรวจงบก่อนและไม่แบ่งเอง โหมดแยกหมวดใช้สูงสุด ${MEMORY_CATEGORIES.length} ครั้งต่อชุด การลองใหม่เป็นคำขอ API อีกครั้ง`))}</p><p class="rf-memory-hint">${e(word('The input budget covers the summary task; preset mode also includes native chat/preset context within the model limit.','งบ input นี้ใช้กับงานสรุป โหมด preset ยังมีบริบทแชตและ preset ที่ SillyTavern จัดตามขนาด context ของโมเดล'))}</p>`);
    const archive = `<form data-form="memory-summary-search"><label class="rf-memory-field">${e(word('People, places or events','บุคคล สถานที่ หรือเหตุการณ์'))}<input name="query" type="search" maxlength="500" value="${e(view.query)}" placeholder="${e(word('Cora, river, fishing','คอร่า แม่น้ำ ตกปลา'))}"></label><button class="trpg-story-button" type="submit">${e(word('Search archive','ค้นในคลัง'))}</button></form>
        ${view.forced?.length?`<p>${e(word('Prioritized references','รายการที่จัดลำดับก่อน'))}: ${view.forced.length} ${action('clear',word('Clear selection','ล้างการเลือก'),'','')}</p>`:''}<div class="rf-memory-results">${hits||(view.query?`<p>${e(word('No matching sources. Try a name, alias or place.','ไม่พบข้อความต้นทาง ลองค้นชื่อ ชื่ออื่น หรือสถานที่'))}</p>`:'')}</div>
        ${view.preview?`<details class="rf-memory-source" data-memory-section="source:${e(view.preview.chatId)}:${e(view.preview.key)}" open><summary>${e(word('Original source','ข้อความต้นทาง'))} · ${e(view.preview.chatId)} · #${Number(view.preview.key)+1}${view.preview.current===false?` · ${e(word('Previous version','รุ่นก่อนแก้ไข'))}`:''}</summary><pre>${e(view.preview.text)}</pre></details>`:''}
        <details data-memory-section="chapters"><summary>${e(word('Chapter archive and revisions','คลังบทสรุปและรุ่นแก้ไข'))} · ${view.chapters.length}</summary>${chapters||`<p>${e(word('No summaries yet. Summarize this chat or link an archived history.','ยังไม่มีบทสรุป กดสรุปแชตนี้หรือเชื่อมประวัติที่เก็บไว้'))}</p>`}</details>`;
    const history = `<p class="rf-memory-hint">${e(word('Only this chat and explicitly linked history are included. Alternative branches stay separate.','ใช้เฉพาะแชตนี้และประวัติที่เชื่อมไว้ แชตที่เป็นเรื่องอีกแขนงจะไม่ถูกรวมเอง'))}</p>${view.chats.map(chat=>`<article class="rf-memory-history"><span>${e(chat.name)}<small>${chat.messages} ${e(word('messages','ข้อความ'))}</small></span>${chat.id!==view.chatId?action('link',view.ancestry.includes(chat.id)?word('Exclude history','ไม่นำมาใช้'):word('Include history','นำมาใช้'),`data-id="${e(chat.id)}" data-include="${!view.ancestry.includes(chat.id)}"`):`<small>${e(word('Current chat','แชตปัจจุบัน'))}</small>`}</article>`).join('')}
        <details data-memory-section="handoffs"><summary>${e(word('Prepared handoff versions','รุ่นความจำที่เตรียมย้ายแชต'))} · ${(view.capsules||[]).length}</summary>${(view.capsules||[]).map(capsule=>`<details><summary>${e(capsule.createdAt)} · ${e(capsule.chatId)}</summary><p class="rf-memory-prose">${e(capsule.recap)}</p></details>`).join('')||`<p>${e(word('Prepare new-chat memory to save a handoff version.','กดเตรียมความจำสำหรับแชตใหม่เพื่อเก็บรุ่นส่งต่อ'))}</p>`}</details>`;
    const backup = `<div class="trpg-story-actions">${action('export',word('Export memory library','ส่งออกคลังความจำ'))}<label class="trpg-story-button rf-memory-import">${e(word('Import memory library','นำเข้าคลังความจำ'))}<input type="file" accept="application/json,.json" data-memory-import${disabled}></label></div><p class="rf-memory-hint">${e(word('Includes summaries and original messages for backup or moving devices. RPG state export alone does not include the memory archive. Import/export does not call AI.','สำรองบทสรุปและข้อความต้นฉบับเพื่อย้ายอุปกรณ์ การส่งออกสถานะ RPG อย่างเดียวไม่รวมคลังความจำ การนำเข้าและส่งออกไม่เรียก AI'))}</p>`;
    const jobDetails = `        <span data-memory-api-calls>${e(word('AI request attempts','ครั้งที่เรียก AI'))}: ${Math.max(0,Number(view.job.apiCalls)||0)} · ${e(word('Estimated for this run','ประมาณการรอบนี้'))}: ${Math.max(0,Number(view.job.plannedCalls)||0)} · ${e(word('Total recorded for this chat','สะสมที่บันทึกในแชตนี้'))}: ${Math.max(0,Number(view.job.apiCallsTotal)||0)}</span>
        ${view.job.category ? `<small data-memory-category-progress>${e(categoryLabel(view.job.category))} · ${view.job.categoryCompleted || 0}/${MEMORY_CATEGORIES.length} ${e(word('categories saved in this batch','หมวดบันทึกแล้วในชุดนี้'))}</small>` : ''}
        ${linkedPendingMessages !== pendingMessages ? `<small>${e(word('Pending messages across linked history','ข้อความรอสรุปรวมประวัติที่เชื่อมไว้'))}: ${linkedPendingMessages}</small>` : ''}
        ${totalMessages ? `<div class="rf-memory-progress"><span>${e(word('Messages saved in this run','ข้อความที่สรุปและบันทึกในงานนี้'))}: <strong data-memory-processed>${processedMessages}/${totalMessages}</strong></span><progress max="${totalMessages}" value="${processedMessages}" aria-label="${e(word('Messages summarized and saved','ข้อความที่สรุปและบันทึกแล้ว'))}"></progress>
        <small>${e(word('Saved batches','ชุดที่บันทึกแล้ว'))}: ${completed}${total ? ` · ${e(word('Batch','ชุดที่'))}: ${currentBatch}/${Math.max(total,currentBatch)} ${e(word('(estimate)','(ประมาณ)'))}` : ''}</small>
        ${busy && view.job.batchMessages ? `<small>${e(word('This request','คำขอชุดนี้'))}: ${view.job.batchMessages} ${e(word('messages','ข้อความ'))} · ${view.job.batchSegments} ${e(word('segments','ช่วงข้อความ'))}</small>` : ''}</div>` : ''}
        <small>${e(word('Batch size','ขนาดชุดสรุป'))}: ${batchSize} ${e(word('messages maximum per request','ข้อความสูงสุดต่อคำขอ'))}. ${e(word('Long messages may be split to fit the input budget.','ข้อความยาวอาจแบ่งเป็นหลายคำขอให้พอดีงบ input'))}</small>
        ${view.coverage.pendingSegments !== pendingMessages ? `<small>${e(word('Pending source segments','ช่วงข้อความต้นทางที่รอสรุป'))}: ${view.coverage.pendingSegments} · ${e(word('A long original message can contain several segments.','ข้อความต้นฉบับยาวหนึ่งข้อความอาจมีหลายช่วง'))}</small>` : ''}
        ${activeBatchSize < batchSize || shorterSegments ? `<p class="rf-memory-adaptive" data-memory-adaptive>${e(word('Using smaller batches for this run','งานนี้ใช้ชุดเล็กลง'))}: ${activeBatchSize} ${e(word('messages per request.','ข้อความต่อคำขอ'))} ${shorterSegments ? e(word('Long messages use shorter source segments. ','ข้อความยาวใช้ช่วงต้นทางสั้นลง ')) : ''}${e(word('Your saved batch-size setting is unchanged.','การตั้งค่าขนาดชุดเดิมยังคงอยู่'))}</p>` : ''}
        ${status === 'summarizing' && view.job.requestStartedAt ? `<small>${e(word('Waiting for this API request','รอ API ชุดนี้'))}: <span data-memory-request-elapsed aria-live="off">${elapsedLabel(view.job.requestElapsedMs)}</span> / ${elapsedLabel((view.job.apiTimeoutSeconds || apiTimeout)*1000)}</small>` : ''}
        ${view.job.promptWarning ? `<div class="rf-memory-prompt-warning" data-memory-prompt-warning><strong>${e(word('Summaries are saved, but memory is not ready to include in story replies.','บันทึกสรุปแล้ว แต่ยังเตรียมความจำสำหรับแนบคำตอบเนื้อเรื่องไม่สำเร็จ'))}</strong><p>${e(view.job.promptWarning)}</p>${view.job.promptCode ? `<code data-memory-prompt-code>${e(view.job.promptCode)}</code>` : ''}<p>${e(word('The affected memory prompt was cleared. Check the tokenizer or memory budgets, then try again; saved chapters do not need summarizing again.','ล้าง prompt ความจำส่วนที่มีปัญหาแล้ว ตรวจตัวนับโทเคนหรืองบความจำแล้วลองใหม่ บทที่บันทึกแล้วไม่ต้องสรุปซ้ำ'))}</p></div>` : ''}
        ${view.job.droppedEvents > 0 ? `<div class="rf-memory-prompt-warning" data-memory-evidence-warning><strong>${e(word('Summaries saved with an incomplete event index','บันทึกสรุปแล้ว แต่ดัชนีเหตุการณ์ไม่ครบ'))}</strong><p>${e(word(`${view.job.droppedEvents} unverified entries omitted. Original messages are still searchable. Review the affected chapters below.`, `ตัดดัชนีที่ตรวจหลักฐานไม่ได้ ${view.job.droppedEvents} รายการ ข้อความต้นฉบับยังค้นได้ ดูบทที่มีคำเตือนด้านล่าง`))}</p></div>` : ''}
        ${['disabled','failed'].includes(view.job.rpgHandoff) ? `<div class="rf-memory-prompt-warning" data-memory-rpg-handoff-warning><strong>${e(word('RPG state handoff needs attention','ตรวจการย้ายข้อมูล RPG ก่อนย้ายแชต'))}</strong><p>${e(view.job.rpgHandoff === 'disabled' ? word('Automatic character continuity is off. Enable Carry this character into new chats automatically in extension settings to transfer RPG state and the story-memory link.','ปิดการสานต่อข้อมูลตัวละครอยู่ เปิด Carry this character into new chats automatically ในการตั้งค่าส่วนเสริมเพื่อย้ายข้อมูล RPG และจุดเชื่อมคลังเนื้อเรื่อง') : word('Story memory is saved, but the RPG state snapshot could not be saved. Export state as a backup before changing chats.','บันทึกคลังเนื้อเรื่องแล้ว แต่บันทึก snapshot ข้อมูล RPG ไม่สำเร็จ ส่งออก State สำรองก่อนย้ายแชต'))}</p></div>` : ''}
        ${!busy && view.job.recommendedBatchSize && view.job.code === 'MEMORY_API_TIMEOUT' ? `<p class="rf-memory-adaptive" data-memory-retry-size>${e(word('Retry / continue will use up to','ลองใหม่ / ทำต่อ จะใช้ไม่เกิน'))} ${Math.min(batchSize,view.job.recommendedBatchSize)} ${e(word('messages per request to shorten the next call. No paid API retry starts until you press it.','ข้อความต่อคำขอให้คำขอถัดไปสั้นลง ยังไม่เรียก API เสียโควต้าซ้ำจนกว่าจะกด'))}</p>` : ''}
        ${view.job.updatedAt ? `<small>${e(view.job.updatedAt)}</small>` : ''}
        ${view.job.tokenCountWarning ? `<p class="rf-memory-token-warning">${e(view.job.tokenCountWarning)}</p>` : ''}
        ${view.job.inputTokens != null ? `<small>${e(view.job.tokenCountEstimated ? word('Latest request token estimate (conservative UTF-8 byte count)','ค่าประมาณโทเคนคำขอล่าสุด (เผื่อจากจำนวนไบต์ UTF-8)') : word('Latest summary task tokens, counted with the active tokenizer','โทเคนงานสรุปล่าสุด นับด้วย tokenizer ปัจจุบัน'))}: input ${view.job.inputTokens} · output ${view.job.outputTokens ?? '—'}</small>` : ''}
        ${view.coverage.stale ? `<p>${e(word('Changed/swiped sources and dependent recaps are excluded until rebuilt.','สรุปที่ต้นทางถูกแก้หรือเปลี่ยน swipe รวมถึงสรุปที่อ้างอิงต่อ จะไม่ถูกใช้จนกว่าจะสร้างใหม่'))}</p>` : ''}
        ${diagnostics}`;
    const budget = Math.max(1,Number(view.settings.memorySummaryBudget)+Number(view.settings.memoryRetrievalBudget)||2200),tokens=Math.max(0,Number(view.prompt?.tokens)||0),percent=Math.round(tokens/budget*100);
    const currentChat = view.chats.find(chat=>chat.id===view.chatId)?.name||view.chatId||word('Open a chat to use memory','เปิดแชตเพื่อใช้คลังความจำ');
    panel.innerHTML = `<section class="rf-memory-workspace">
        <div class="rf-memory-job" data-status="${e(status)}" role="status" aria-live="polite" aria-busy="${busy}"><div class="rf-memory-current"><strong>${e(currentChat)}</strong><span>${e(label)}</span></div>
        <div class="rf-memory-stats"><div><strong data-memory-summarized>${view.ready?Math.max(0,view.coverage.messages-pendingMessages):'—'}</strong><small>${e(word('Summarized messages','ข้อความที่สรุปแล้ว'))}</small></div><div><strong data-memory-pending>${view.ready?pendingMessages:'—'}</strong><small>${e(word('Pending messages','ข้อความรอสรุป'))}</small></div><div><strong data-memory-chapters>${view.ready?view.coverage.chapters:'—'}</strong><small>${e(word('Saved chapters','บทที่บันทึกแล้ว'))}</small></div></div>
        <div class="rf-memory-main-actions">${action('run',word('Summarize pending messages','สรุปข้อความที่เหลือ'))}${action('prepare',word('Prepare for a new chat','เตรียมความจำสำหรับแชตใหม่'))}${action('open-search',word('Search memory','ค้นความจำ'),'',view.ready?'':' disabled')}</div>
        <p class="rf-memory-hint">${e(word('Saved after every completed batch. New-chat preparation may call AI for pending messages.','บันทึกทุกชุดที่เสร็จ การเตรียมแชตใหม่อาจเรียก AI หากยังมีข้อความรอสรุป'))}</p>
        ${busy?`<div class="rf-memory-active-job"><span>${e(label)}${totalMessages?` · ${processedMessages}/${totalMessages} ${e(word('saved','บันทึกแล้ว'))}`:''}</span>${action('cancel',queued?word('Cancel queue','ยกเลิกคิว'):word('Stop','หยุด'),'','')}${view.job.startedAt?`<small>${e(word('Elapsed','เวลาที่ใช้'))}: <span data-memory-elapsed aria-live="off">${elapsedLabel(view.job.elapsedMs)}</span></small>`:''}${totalMessages?`<progress max="${totalMessages}" value="${processedMessages}" aria-label="${e(word('Messages saved','ข้อความที่บันทึกแล้ว'))}"></progress>`:''}</div>`:''}
        ${queued?`<p class="rf-memory-queued" data-memory-queued>${e(word('Waiting for the main reply to finish. No summary API request has started yet.','รอคำตอบหลักสร้างเสร็จ ระหว่างรอคิวยังไม่เรียก API สรุป'))}</p>`:''}
        ${view.job.error?`<p class="rf-memory-error">${e(view.job.error)}</p>`:''}${['error','cancelled','interrupted'].includes(status)?`<div class="trpg-story-actions">${action('retry',word('Retry / continue','ลองใหม่ / ทำต่อ'))}</div>`:''}
        ${!view.ready?`<p class="rf-memory-hint">${e(word('Open a character or group chat. Memory settings can be adjusted here.','เปิดแชตตัวละครหรือกลุ่มเพื่อใช้คลัง สามารถปรับการตั้งค่าความจำที่นี่ได้'))}</p>`:''}</div>
        <section class="rf-memory-budget"><div><strong>${e(word('Memory sent into context','ความจำที่ส่งเข้า context'))}</strong><span data-memory-context-tokens>${view.ready?`${view.estimated?'~':''}${tokens.toLocaleString()}`:'—'} / ${budget.toLocaleString()} tokens</span></div><progress value="${Math.min(tokens,budget)}" max="${budget}" aria-label="${e(word('Memory token budget','งบโทเคนความจำ'))}"></progress><small>${e(word(`Overview ${Number(view.settings.memorySummaryBudget).toLocaleString()} · retrieved ${Number(view.settings.memoryRetrievalBudget).toLocaleString()}`,`ภาพรวม ${Number(view.settings.memorySummaryBudget).toLocaleString()} · ค้นคืน ${Number(view.settings.memoryRetrievalBudget).toLocaleString()}`))}<span>${view.ready?percent+'%':''}</span></small><p class="rf-memory-hint">${e(word('Memory tokens include instructions; these are not the full model context or provider billing totals.','นับโทเคนความจำรวมคำอธิบาย ไม่ใช่ context ทั้งหมดของโมเดลหรือยอดเรียกเก็บ'))}</p></section>
        ${fold('auto',word('Automatic summaries','สรุปอัตโนมัติ'),view.settings.memoryAutoSummary?word(`Every ${view.settings.memorySummaryInterval} replies`,`ทุก ${view.settings.memorySummaryInterval} คำตอบ`):word('Off','ปิดอยู่'),autoSettings)}
        ${fold('context',word('Memory for replies','ความจำสำหรับคำตอบ'),view.settings.memoryInject?word('Enabled','เปิดใช้งาน'):word('Off','ปิดอยู่'),contextSettings)}
        ${fold('archive',word('Search & chapter archive','ค้นหาและคลังบทสรุป'),word(`${view.chapters.length} chapters`,`${view.chapters.length} บท`),archive,Boolean(view.query||view.preview))}
        ${atlas}${insights}
        ${fold('settings',word('API & summary method','API และวิธีสรุป'),view.settings.memorySummaryProfile?profiles.find(profile=>profile.id===view.settings.memorySummaryProfile)?.name||word('Unavailable profile','โปรไฟล์ไม่พร้อม'):word('Current API','API ปัจจุบัน'),apiSettings,false,'rf-memory-settings')}
        ${fold('history',word('Linked history & new chats','ประวัติที่เชื่อมและย้ายแชต'),word(`${view.ancestry.length} chats`,`${view.ancestry.length} แชต`),history)}
        ${fold('backup',word('Library backup','สำรองและจัดการคลัง'),word('This browser','ในเบราว์เซอร์นี้'),backup)}
        ${fold('job',word('Latest job details','รายละเอียดงานล่าสุด'),memoryPhaseLabel(status,view.settings.language),jobDetails,status==='error')}
        <p class="rf-memory-footer">${e(word('Originals are stored in this browser. Stopping a job keeps saved batches. Turning off Memory Addons hides this drawer and preserves the library.','ต้นฉบับเก็บในเบราว์เซอร์นี้ หยุดงานแล้วเก็บชุดที่บันทึกไว้ ปิด Memory Addons เพื่อซ่อน drawer และเก็บคลังเดิม'))}</p>
        </section>`;
    restorePanel(panel,remembered,busy,view.job.startedAt,view.job.requestStartedAt);
    // Reveal a new failure once; later refreshes still respect manual folding.
    if (remembered) {
        if (status === 'error' && remembered.state.status !== status) panel.querySelector('[data-memory-section="job"]').open = true;
        remembered.state.status = status;
        remembered.state.rendering = false;
    }
}
