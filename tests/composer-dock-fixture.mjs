// A player opens the minimized dock before interacting with a panel.
export async function openDockPanel(page, id = 'commerce') {
    const dock = page.locator('.rf-composer-dock');
    await dock.waitFor({state: 'visible'});
    const tab = dock.locator(`[data-dock-panel="${id}"]`);
    if (await tab.count()) await tab.click();
    else {
        const expand = dock.locator('[data-dock-collapse]');
        if (await expand.getAttribute('aria-expanded') === 'false') await expand.click();
    }
}
