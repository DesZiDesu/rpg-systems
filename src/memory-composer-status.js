import {MEMORY_CATEGORY_LABELS} from './memory-summaries.js?v=0.51.8';

// A separate memory request must not borrow SillyTavern's story-generation
// state or stop handler. Keep the native controls intact and restore their
// current host styles when a memory job leaves the composer.
const busyPhases = new Set(['loading','archiving','waiting','counting','summarizing','validating','saving','retrying']);
const phaseWords = {
    loading:['Opening memory archive','กำลังเปิดคลังความจำ'],
    archiving:['Saving original messages','กำลังเก็บข้อความต้นฉบับ'],
    waiting:['Memory summary waiting for the story','สรุปความจำกำลังรอเนื้อเรื่อง'],
    counting:['Checking summary input','กำลังตรวจข้อความที่จะสรุป'],
    summarizing:['AI is summarizing story memory','AI กำลังสรุปความจำเนื้อเรื่อง'],
    validating:['Checking the AI summary','กำลังตรวจสรุปของ AI'],
    saving:['Saving the completed summary','กำลังบันทึกสรุปที่เสร็จแล้ว'],
    retrying:['Waiting before retrying the summary','กำลังรอก่อนลองสรุปใหม่'],
    error:['Memory summary needs attention','สรุปความจำมีปัญหา'],
    interrupted:['Memory summary was interrupted','สรุปความจำหยุดกลางทาง'],
    cancelled:['Memory summary stopped','หยุดสรุปความจำแล้ว'],
    ready:['Story memory saved','บันทึกความจำเนื้อเรื่องแล้ว'],
    partial:['Summary batch saved','บันทึกชุดสรุปแล้ว'],
};
const duration = milliseconds => {
    const seconds = Math.max(0,Math.floor((Number(milliseconds) || 0) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}`;
};
const text = (node,value) => { if (node.textContent !== String(value)) node.textContent = String(value); };

export function createMemoryComposerStatus({document:doc = globalThis.document,cancel = () => {},open = () => {},retry = () => {},language = () => 'en'} = {}) {
    if (!doc?.createElement) return {update() { return false; },destroy() {}};
    const win = doc.defaultView || globalThis;
    let current = null, liveGeneration = false, scope = '', observedBusy = false, dismissed = '', mounted = null, nativeSend = null;
    let observer = null, resizeObserver = null, timer = null, clearTimer = null, queued = false, destroyed = false;
    const word = (en,th) => (current?.settings?.language || language()) === 'th' ? th : en;
    const make = (tag,cls) => { const node = doc.createElement(tag); if (cls) node.className = cls; return node; };
    const bar = make('div','rf-memory-composer-status');
    bar.setAttribute('role','group');
    const detail = make('div','rf-memory-composer-detail');
    const heading = make('div','rf-memory-composer-heading');
    const spinner = make('span','rf-memory-composer-spinner'); spinner.setAttribute('aria-hidden','true');
    const title = make('span','rf-memory-composer-title'); title.setAttribute('role','status'); title.setAttribute('aria-live','polite'); title.setAttribute('aria-atomic','true');
    heading.append(spinner,title);
    const progress = make('div','rf-memory-composer-progress');
    const error = make('div','rf-memory-composer-error');
    detail.append(heading,progress,error);
    const actions = make('div','rf-memory-composer-actions');
    const action = (name,handler) => {
        const button = make('button','rf-memory-composer-action'); button.type = 'button'; button.dataset.memoryComposerAction = name;
        button.addEventListener('click',event => { event.preventDefault(); event.stopPropagation(); handler(); });
        actions.append(button); return button;
    };
    const show = action('open',open), stop = action('cancel',cancel), again = action('retry',retry);
    const dismiss = action('dismiss',() => { dismissed = signature(); detach(); });
    bar.append(detail,actions);
    const slotStop = make('button','rf-memory-composer-stop'); slotStop.type = 'button'; slotStop.dataset.memoryComposerAction = 'cancel';
    const square = make('span','rf-memory-composer-stop-square'); square.setAttribute('aria-hidden','true'); slotStop.append(square);
    slotStop.addEventListener('click',event => { event.preventDefault(); event.stopPropagation(); cancel(); });
    const signature = () => `${scope}:${current?.job?.status || ''}:${current?.job?.updatedAt || ''}`;
    const visible = node => {
        if (!node?.isConnected || node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
        const style = win.getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && node.getClientRects().length > 0;
    };
    function releaseSend() {
        nativeSend?.classList.remove('rf-memory-native-send-hidden');
        nativeSend = null; slotStop.remove();
    }
    function detach() {
        releaseSend(); bar.remove(); mounted = null;
        observer?.disconnect(); observer = null;
        resizeObserver?.disconnect(); resizeObserver = null;
        win.removeEventListener('resize',scheduleRender);
        win.removeEventListener('scroll',scheduleRender,true);
        win.visualViewport?.removeEventListener('resize',scheduleRender);
        win.visualViewport?.removeEventListener('scroll',scheduleRender);
        win.clearInterval(timer); timer = null;
        win.clearTimeout(clearTimer); clearTimer = null;
    }
    function locate() {
        const form = doc.querySelector('#send_form');
        const textarea = form?.querySelector('#send_textarea') || doc.querySelector('#send_textarea');
        const anchor = form || textarea?.closest('form') || textarea?.parentElement;
        if (!anchor || !anchor.parentElement || !textarea || !visible(anchor) || !visible(textarea)) return null;
        return {anchor,textarea,send:form?.querySelector('#send_but') || doc.querySelector('#send_but')};
    }
    function scheduleRender() {
        if (queued || destroyed) return;
        queued = true;
        win.queueMicrotask(() => { queued = false; if (!destroyed) render(); });
    }
    function busy() { return busyPhases.has(current?.job?.status); }
    function activeJob() {
        return busy() && Boolean(current?.job?.startedAt || current?.job?.requestActive || current?.job?.status === 'summarizing');
    }
    function shouldShow() {
        if (!current || current.enabled === false || current.settings?.enableMemorySummaries === false || signature() === dismissed) return false;
        if (activeJob()) return true;
        if (['error','interrupted'].includes(current.job?.status)) return current.ready !== false;
        return observedBusy && ['ready','partial','cancelled'].includes(current.job?.status);
    }
    function ensureObserver() {
        if (observer || !win.MutationObserver || !doc.body) return;
        observer = new win.MutationObserver(records => {
            // Ignore our own countdown/text changes; observe host replacement,
            // native Stop state and theme changes without remounting the input.
            if (!records.some(record => !bar.contains(record.target) && !slotStop.contains(record.target))) return;
            scheduleRender();
        });
        observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
        win.addEventListener('resize',scheduleRender);
        win.addEventListener('scroll',scheduleRender,true);
        win.visualViewport?.addEventListener('resize',scheduleRender);
        win.visualViewport?.addEventListener('scroll',scheduleRender);
        if (!timer) timer = win.setInterval(() => { if (!destroyed) render(); },1000);
    }
    function placeBar(anchor) {
        const anchorStyle = win.getComputedStyle(anchor), parentStyle = win.getComputedStyle(anchor.parentElement);
        const constrainedFlow = ['fixed','absolute'].includes(anchorStyle.position)
            || (['flex','inline-flex'].includes(parentStyle.display) && parentStyle.flexDirection.startsWith('row'));
        const parent = constrainedFlow ? doc.body : anchor.parentElement;
        if (mounted !== anchor) {
            resizeObserver?.disconnect();
            resizeObserver = win.ResizeObserver ? new win.ResizeObserver(scheduleRender) : null;
            resizeObserver?.observe(anchor);
            mounted = anchor;
        }
        if (bar.parentElement !== parent || !constrainedFlow && bar.nextElementSibling !== anchor) {
            constrainedFlow ? parent.append(bar) : anchor.before(bar);
        }
        if (constrainedFlow) {
            const bounds = anchor.getBoundingClientRect();
            if (!bar.classList.contains('rf-memory-composer-fixed')) bar.classList.add('rf-memory-composer-fixed');
            bar.style.left = `${Math.max(0,bounds.left)}px`;
            bar.style.width = `${Math.min(bounds.width,win.innerWidth - Math.max(0,bounds.left))}px`;
            bar.style.bottom = `${Math.max(0,win.innerHeight - bounds.top + 5)}px`;
            bar.style.top = 'auto';
            bar.style.zIndex = String(Math.max(32,(Number.parseInt(anchorStyle.zIndex,10) || 0) + 1));
            // Very tall inputs near the top of a small viewport can leave room
            // below the composer instead. Keep every status action off input.
            if (bar.getBoundingClientRect().top < 0 && bounds.bottom + bar.offsetHeight + 5 <= win.innerHeight) {
                bar.style.top = `${bounds.bottom + 5}px`; bar.style.bottom = 'auto';
            }
        } else if (bar.classList.contains('rf-memory-composer-fixed')) {
            bar.classList.remove('rf-memory-composer-fixed');
            for (const property of ['left','width','bottom','top','z-index']) bar.style.removeProperty(property);
        }
    }
    function nativeStoryStopVisible() {
        return [...doc.querySelectorAll('#mes_stop,#stop_but,[data-action="stop-generation"]')].some(visible);
    }
    function placeStop(send,storyBusy) {
        if (!activeJob() || storyBusy || !send?.isConnected || !send.parentElement) { releaseSend(); return false; }
        if (nativeSend !== send) {
            releaseSend();
            // The host can temporarily hide Send while an unrelated action is
            // active. Only replace a Send that is actually available.
            if (!visible(send)) return false;
            const style = win.getComputedStyle(send), bounds = send.getBoundingClientRect();
            for (const property of ['color','background-color','background-image','border','border-radius','box-shadow','font-size',
                'margin','order','align-self','justify-self','grid-area','position','top','right','bottom','left','z-index']) slotStop.style.setProperty(property,style.getPropertyValue(property));
            slotStop.style.width = `${Math.max(36,bounds.width)}px`;
            slotStop.style.height = `${Math.max(36,bounds.height)}px`;
            nativeSend = send;
        }
        if (slotStop.parentElement !== send.parentElement || slotStop.nextElementSibling !== send) send.before(slotStop);
        if (!send.classList.contains('rf-memory-native-send-hidden')) send.classList.add('rf-memory-native-send-hidden');
        return true;
    }
    function render() {
        if (destroyed || !shouldShow()) { detach(); return; }
        const composer = locate();
        if (!composer) { releaseSend(); bar.remove(); mounted = null; ensureObserver(); return; }
        const {anchor,send} = composer, job = current.job || {}, status = job.status || 'idle';
        placeBar(anchor);
        ensureObserver();
        const storyBusy = Boolean(liveGeneration || nativeStoryStopVisible());
        bar.dataset.status = status; bar.dataset.storyBusy = String(storyBusy); bar.dataset.busy = String(activeJob());
        bar.setAttribute('aria-label',word('RoleForge memory summary','สรุปความจำ RoleForge'));
        const phase = phaseWords[status] || phaseWords.summarizing;
        const label = status === 'waiting' && !storyBusy ? word('Preparing the next summary batch','กำลังเตรียมชุดสรุปถัดไป') : phase[(current.settings?.language || language()) === 'th' ? 1 : 0];
        text(title,label);
        spinner.hidden = !activeJob();
        const total = Math.max(0,Number(job.totalMessages) || 0), processed = Math.min(total,Math.max(0,Number(job.processedMessages) || 0));
        const completed = Math.max(0,Number(job.completed) || 0);
        const bits = job.queued
            ? [word(`${Math.max(0,Number(job.savedChapters) || 0)} chapters saved`, `บันทึกแล้ว ${Math.max(0,Number(job.savedChapters) || 0)} บท`),
                word(`${Math.max(0,Number(job.remainingMessages) || 0)} pending`, `รอ ${Math.max(0,Number(job.remainingMessages) || 0)} ข้อความ`),
                completed
                    ? word('Next summary request is queued','คำขอสรุปถัดไปรอคิว')
                    : word('No summary API request this run yet','ยังไม่เรียก API สรุปรอบนี้')]
            : total
                ? [word(`${processed}/${total} messages saved`, `บันทึก ${processed}/${total} ข้อความ`),word(`${completed} batches`,`${completed} ชุด`)]
                : [word(`${completed} batches saved`,`บันทึกแล้ว ${completed} ชุด`)];
        if (activeJob()) {
            const started = Date.parse(job.startedAt);
            bits.push(duration(Number.isFinite(started) ? Date.now() - started : job.elapsedMs));
            if (Number(job.requestAttempt || job.attempt) > 1) bits.push(word(`Attempt ${job.requestAttempt || job.attempt}`,`ครั้งที่ ${job.requestAttempt || job.attempt}`));
        } else if (current.coverage?.pendingMessages > 0) bits.push(word(`${current.coverage.pendingMessages} remaining`, `เหลือ ${current.coverage.pendingMessages} ข้อความ`));
        if (job.apiCalls != null) bits.push(word(`${job.apiCalls} AI calls`,`${job.apiCalls} ครั้งที่เรียก AI`));
        if (job.category) {
            const labels = MEMORY_CATEGORY_LABELS[job.category];
            bits.push(labels ? word(...labels) : job.category);
        }
        text(progress,bits.join(' · '));
        const hasError = ['error','interrupted'].includes(status) && Boolean(job.error);
        const handoffWarning = job.rpgHandoff === 'disabled' ? word('Enable automatic character continuity before moving chats.', 'เปิดการสานต่อข้อมูลตัวละครก่อนย้ายแชต') : job.rpgHandoff === 'failed' ? word('RPG snapshot could not be saved. Export state before moving chats.', 'บันทึก snapshot RPG ไม่สำเร็จ ส่งออก State ก่อนย้ายแชต') : '';
        const problem = hasError ? job.error : job.promptWarning || handoffWarning || (job.droppedEvents > 0 ? word(`${job.droppedEvents} unverified event entries omitted. Summaries and originals saved; review Details.`, `ตัดดัชนีที่ตรวจหลักฐานไม่ได้ ${job.droppedEvents} รายการ บันทึกสรุปและต้นฉบับแล้ว ตรวจที่รายละเอียด`) : '');
        error.hidden = !problem;
        text(error,problem);
        if (error.title !== problem) error.title = problem;
        text(show,word('Details','รายละเอียด')); text(stop,word('Stop summary','หยุดสรุป')); text(again,word('Retry / continue','ลองใหม่ / ทำต่อ')); text(dismiss,'×');
        dismiss.setAttribute('aria-label',word('Dismiss summary status','ซ่อนสถานะสรุป'));
        show.title = word('Open Memory Summaries','เปิด Memory Summaries');
        const stopLabel = word('Stop memory summarization only','หยุดเฉพาะการสรุปความจำ');
        stop.setAttribute('aria-label',stopLabel); slotStop.setAttribute('aria-label',stopLabel); slotStop.title = stopLabel;
        const replaced = placeStop(send,storyBusy);
        stop.hidden = !activeJob() || replaced;
        again.hidden = !['error','interrupted','cancelled'].includes(status) || current.ready === false;
        dismiss.hidden = activeJob();
    }
    return {
        update(view,{liveGeneration:generating = false} = {}) {
            if (destroyed) return false;
            const nextScope = view?.chatId ? `${view.owner || ''}:${view.chatId}` : '';
            if (nextScope !== scope) { detach(); observedBusy = false; dismissed = ''; scope = nextScope; }
            const wasBusy = activeJob();
            current = view; liveGeneration = Boolean(generating);
            if (!['ready','partial','cancelled'].includes(view?.job?.status)) { win.clearTimeout(clearTimer); clearTimer = null; }
            if (activeJob()) { observedBusy = true; win.clearTimeout(clearTimer); clearTimer = null; }
            render();
            if (wasBusy && !activeJob() && ['ready','partial','cancelled'].includes(view?.job?.status)) {
                clearTimer = win.setTimeout(() => { dismissed = signature(); detach(); },8000);
            }
            return bar.isConnected;
        },
        destroy() { destroyed = true; detach(); current = null; },
    };
}
