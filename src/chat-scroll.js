// Keep native auto-scroll following across the native -> RoleForge layout pass.
// A layout-induced scroll is not evidence that the reader scrolled up.
export function createChatScrollKeeper(api, { document: doc = globalThis.document } = {}) {
    const win = doc.defaultView;
    let chat = null, tail = null, scope = null, following = false, generating = false;
    let frame = null, touchY = null, pointerY = null, destroyed = false, awaitingDeparture = false;
    let readerViewport = null, resumeAllowed = false;
    const events = [];
    const resize = win?.ResizeObserver ? new win.ResizeObserver(() => follow()) : null;
    const currentScope = () => {
        const context = api.context();
        return { id: context.getCurrentChatId?.() || '', metadata: context.chatMetadata };
    };
    const sameScope = saved => {
        const current = currentScope();
        return saved && saved.id === current.id && saved.metadata === current.metadata;
    };
    const enabled = () => {
        const settings = api.context().powerUserSettings;
        return settings?.auto_scroll_chat_to_bottom === true && !settings.waifuMode;
    };
    const atBottom = () => chat && chat.scrollHeight - chat.clientHeight - chat.scrollTop < 5;
    const cancelFrame = () => {
        if (frame !== null) win.cancelAnimationFrame(frame);
        frame = null;
    };
    function setTop(top) {
        // Theme-level smooth scrolling must not animate each token's layout
        // correction, or cancel a reader's momentum with a redundant write.
        const target = Math.max(0, Math.min(top, chat.scrollHeight - chat.clientHeight));
        if (Math.abs(chat.scrollTop - target) < 0.5) return;
        chat.scrollTo({ top: target, behavior: 'instant' });
    }
    function pause() {
        awaitingDeparture = Boolean(atBottom()); following = false; resumeAllowed = false;
        readerViewport = awaitingDeparture ? null : measure(); cancelFrame();
    }
    function follow() {
        if (destroyed || !chat?.isConnected || !sameScope(scope) || !scope.id || !following || !enabled()) return;
        // Edit textarea / contenteditable owns its viewport and caret.
        if (chat.querySelector('#curEditTextarea,.edit_textarea,.mes_edit_textarea,[contenteditable=true]:focus')) { pause(); return; }
        if (chat.clientHeight > 0) setTop(chat.scrollHeight);
    }
    function queueFollow() {
        if (!following || !enabled() || frame !== null || !win) return;
        const ticket = scope;
        frame = win.requestAnimationFrame(() => {
            frame = null;
            if (sameScope(ticket) && ticket === scope) follow();
        });
    }
    function onScroll() {
        if (!sameScope(scope)) return;
        // An earlier programmatic scroll event may still be queued when an
        // upward gesture arrives. Wait until that gesture actually leaves.
        if (atBottom()) {
            if (awaitingDeparture) return;
            // Native streaming can briefly shrink the last message and clamp
            // scrollTop, or finish a pending bottom-scroll after a wheel event.
            // Neither means the reader chose to return to the bottom.
            if (generating && !following && readerViewport && !resumeAllowed) { restore(readerViewport); return; }
            following = true; readerViewport = null; resumeAllowed = false;
        } else {
            awaitingDeparture = false; if (!generating) following = false;
            if (!following) readerViewport = measure();
        }
        // During streaming, only actual input pauses following. Native DOM
        // replacement and browser anchoring also dispatch scroll events.
    }
    function onWheel(event) { if (event.deltaY < 0) pause(); else if (event.deltaY > 0) resumeAllowed = true; }
    function onTouchStart(event) { touchY = event.touches[0]?.clientY ?? null; }
    function onTouchMove(event) {
        const y = event.touches[0]?.clientY;
        if (touchY !== null && y !== undefined && y - touchY > 3) { pause(); touchY = y; }
        else if (touchY !== null && y !== undefined && touchY - y > 3) { resumeAllowed = true; touchY = y; }
    }
    function onPointerDown(event) {
        if (event.pointerType === 'touch') return;
        const rect = chat.getBoundingClientRect();
        if (event.clientX >= rect.right - Math.max(14, chat.offsetWidth - chat.clientWidth)) { pause(); pointerY = event.clientY; }
    }
    function onPointerMove(event) {
        if (pointerY === null || Math.abs(event.clientY - pointerY) < 2) return;
        if (event.clientY < pointerY) pause(); else resumeAllowed = true;
        pointerY = event.clientY;
    }
    function onKey(event) {
        if (event.target?.closest?.('input,textarea,select,[contenteditable=true]')) return;
        if (event.target !== doc.body && !chat?.contains(event.target)) return;
        if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || event.key === ' ' && event.shiftKey) pause();
        if (['ArrowDown', 'PageDown'].includes(event.key) || event.key === ' ' && !event.shiftKey) resumeAllowed = true;
        if (event.key === 'End') { awaitingDeparture = false; following = true; readerViewport = null; queueFollow(); }
    }
    function disconnect() {
        cancelFrame(); resize?.disconnect(); tail = null; touchY = pointerY = null;
        for (const [target, type, listener] of events) target.removeEventListener(type, listener);
        events.length = 0;
    }
    function listen(target, type, listener) {
        target.addEventListener(type, listener, { passive: true });
        events.push([target, type, listener]);
    }
    function observe() {
        if (destroyed) return;
        const next = doc.getElementById('chat'), nextScope = currentScope();
        if (next !== chat || !sameScope(scope)) {
            disconnect(); chat = next; scope = nextScope; generating = false; awaitingDeparture = false; readerViewport = null; resumeAllowed = false;
            following = Boolean(atBottom());
            if (chat) {
                listen(chat, 'scroll', onScroll); listen(chat, 'wheel', onWheel);
                listen(chat, 'touchstart', onTouchStart); listen(chat, 'touchmove', onTouchMove);
                listen(chat, 'pointerdown', onPointerDown); listen(doc, 'keydown', onKey);
                listen(doc, 'pointermove', onPointerMove); listen(doc, 'pointerup', () => { pointerY = null; });
                listen(doc, 'pointercancel', () => { pointerY = null; });
                resize?.observe(chat);
            }
        }
        const nextTail = chat?.querySelector('.mes:last-child');
        if (nextTail !== tail) {
            if (tail) resize?.unobserve(tail);
            tail = nextTail;
            if (tail) resize?.observe(tail);
        }
    }
    function measure() {
        if (!chat?.clientHeight) return null;
        const rect = chat.getBoundingClientRect();
        const point = doc.elementFromPoint?.(Math.min(rect.right - 1, rect.left + rect.width / 2), Math.min(rect.bottom - 1, rect.top + rect.height / 2));
        const anchor = point?.closest?.('.mes');
        return { chat, scope, following: following && enabled(), top: chat.scrollTop,
            anchor: anchor && chat.contains(anchor) ? anchor : null,
            offset: anchor?.getBoundingClientRect().top - rect.top };
    }
    function capture() {
        observe();
        // Capture runs after the native DOM replacement. Use the last settled
        // viewport when that replacement has already clamped a paused reader.
        return generating && !following && readerViewport || measure();
    }
    function restore(saved) {
        if (!saved || saved.chat !== chat || !sameScope(saved.scope)) return;
        observe();
        if (saved.following && following && enabled()) follow();
        else if (saved.anchor?.isConnected && chat.contains(saved.anchor)) {
            const offset = saved.anchor.getBoundingClientRect().top - chat.getBoundingClientRect().top;
            if (Math.abs(offset - saved.offset) > 0.5) setTop(chat.scrollTop + offset - saved.offset);
        } else setTop(saved.top);
        if (!following && !awaitingDeparture) readerViewport = measure();
    }
    return {
        observe, capture, restore,
        start(type, _options, dryRun) {
            if (dryRun || ['quiet', 'impersonate'].includes(type)) return;
            observe(); generating = true; awaitingDeparture = false; following = enabled(); resumeAllowed = false;
            readerViewport = following ? null : measure();
        },
        token() { observe(); queueFollow(); },
        end() { queueFollow(); generating = false; },
        reset() { disconnect(); chat = null; scope = null; readerViewport = null; following = generating = awaitingDeparture = resumeAllowed = false; },
        destroy() { destroyed = true; disconnect(); chat = null; scope = null; },
    };
}
