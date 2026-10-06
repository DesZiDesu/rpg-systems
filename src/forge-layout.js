// Observe the host's chat viewport, never change the host's composer or chat size.
export function fitForgeToChat(card, chat) {
    let pending = 0, stopped = false, frameDocument = null;
    const frame = card.querySelector('iframe');
    const editingField = () => {
        const field = frameDocument?.activeElement;
        return field?.matches('input:not([type=button]):not([type=submit]), textarea, select') ? field : null;
    };
    const revealField = () => {
        const field = editingField(), root = frameDocument?.getElementById('trapp');
        if (!field || !root || !field.getClientRects().length) return;
        // Scroll only the iframe's form, rather than asking Safari to pan every
        // ancestor of a field deep inside an iframe.
        const bounds = root.getBoundingClientRect(), rect = field.getBoundingClientRect();
        if (rect.bottom > bounds.bottom - 12) root.scrollTop += rect.bottom - bounds.bottom + 12;
        else if (rect.top < bounds.top + 12) root.scrollTop -= bounds.top + 12 - rect.top;
    };
    const resize = () => {
        pending = 0;
        if (stopped || !card.isConnected) return;
        const style = getComputedStyle(chat), rect = chat.getBoundingClientRect();
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const occupied = [...chat.children].filter(node => node !== card).reduce((total, node) => {
            const css = getComputedStyle(node);
            return total + (css.display === 'none' ? 0 : node.getBoundingClientRect().height + (parseFloat(css.marginTop) || 0) + (parseFloat(css.marginBottom) || 0));
        }, 0);
        const viewport = window.visualViewport;
        const bottom = viewport ? Math.min(rect.bottom, viewport.offsetTop + viewport.height) : rect.bottom;
        let available = bottom - Math.max(rect.top, viewport?.offsetTop || 0);
        // iOS may first pan the visual viewport past the iframe while opening
        // its keyboard. That transient empty intersection is not a 1px chat.
        if (available <= 0 || (viewport?.offsetTop > 0 && available < Math.min(80, chat.clientHeight, viewport.height))) {
            available = Math.min(chat.clientHeight, viewport?.height || chat.clientHeight);
        }
        const height = Math.max(1, Math.floor(available - (padding || 0) - occupied));
        card.style.setProperty('--rf-forge-height', `${height}px`);
        if (editingField()) {
            const bounds = card.getBoundingClientRect(), top = viewport?.offsetTop || 0;
            if (bounds.bottom <= top || bounds.top >= top + (viewport?.height || window.innerHeight)) {
                card.scrollIntoView({block:'nearest', inline:'nearest'});
            }
            revealField();
        }
    };
    const schedule = () => { if (!pending && !stopped) pending = requestAnimationFrame(resize); };
    const bindFrame = () => {
        frameDocument?.removeEventListener('focusin', schedule);
        frameDocument = frame?.contentDocument || null;
        frameDocument?.addEventListener('focusin', schedule);
        schedule();
    };
    const observer = new ResizeObserver(schedule); observer.observe(chat);
    const removal = new MutationObserver(() => { if (!card.isConnected) stop(); else schedule(); });
    removal.observe(chat, { childList: true });
    function stop() {
        stopped = true; observer.disconnect(); removal.disconnect(); cancelAnimationFrame(pending);
        window.removeEventListener('resize', schedule);
        window.visualViewport?.removeEventListener('resize', schedule);
        window.visualViewport?.removeEventListener('scroll', schedule);
        frame?.removeEventListener('load', bindFrame);
        frameDocument?.removeEventListener('focusin', schedule);
        frameDocument = null;
    }
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    frame?.addEventListener('load', bindFrame);
    bindFrame();
    resize(); return stop;
}
