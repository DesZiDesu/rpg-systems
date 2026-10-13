// Other feature tests reveal their editor through the drawer's real navigation.
export async function revealSetting(page, selector) {
    await page.locator(selector).first().evaluate(node=>{
        node.closest('#tretaresia-rpg-settings')?.rfSettingsNavigation?.reveal(node);
    });
    await page.waitForTimeout(40);
}
