// Observe the host's chat viewport, never change the host's composer or chat size.
export function fitForgeToChat(card, chat) {
    let pending = 0, stopped = false;
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
        const height = Math.max(1, Math.floor(bottom - Math.max(rect.top, viewport?.offsetTop || 0) - (padding || 0) - occupied));
        card.style.setProperty('--rf-forge-height', `${height}px`);
    };
    const schedule = () => { if (!pending && !stopped) pending = requestAnimationFrame(resize); };
    const observer = new ResizeObserver(schedule); observer.observe(chat);
    const removal = new MutationObserver(() => { if (!card.isConnected) stop(); else schedule(); });
    removal.observe(chat, { childList: true });
    function stop() {
        stopped = true; observer.disconnect(); removal.disconnect(); cancelAnimationFrame(pending);
        window.removeEventListener('resize', schedule);
        window.visualViewport?.removeEventListener('resize', schedule);
        window.visualViewport?.removeEventListener('scroll', schedule);
    }
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    resize(); return stop;
}
