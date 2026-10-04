// Production drawer migration and native host routing with real IndexedDB.
// Provider replies are controlled fixtures; no external model calls are made.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{
    try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
        if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
        const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));
        res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':/\.(m?js)$/.test(path)?'text/javascript':'image/webp');res.end(body);
    }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const artifacts=new URL('docs/previews/memory-addons-v0522/',root);await mkdir(artifacts,{recursive:true});
const preserved={memorySummaryBatchSize:50,memorySummaryInterval:7,memoryInject:false,memorySummaryBudget:1110,memoryRetrievalBudget:520,memorySummaryInputBudget:7000,memorySummaryOutputTokens:2600,memorySummaryTimeoutSeconds:60,memorySummaryStrategy:'single'};
async function capture(page,name,width){
    // Model the main RoleForge drawer folded, leaving Memory open independently.
    const main=page.locator('#tretaresia-rpg-settings>.inline-drawer>.inline-drawer-content');
    const prior=await main.evaluate(node=>{const style=node.style.cssText;node.style.display='none';return style;});
    try{await page.locator('#preview-extension-drawer').evaluate(node=>node.scrollTop=0);await page.screenshot({path:new URL(`${name}-${width}.png`,artifacts).pathname});}
    finally{await main.evaluate((node,style)=>node.style.cssText=style,prior);}
}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(values=>{if(!localStorage.getItem('roleforge-navigation-summary-preview-settings'))localStorage.setItem('roleforge-navigation-summary-preview-settings',JSON.stringify({tretaresia_rpg:{...values,enableMemorySummaries:true}}));},preserved);
        await page.goto(`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-navigation-summary.html?lang=th&review=1&tab=summaries`);
        await page.waitForFunction(()=>window.navigationSummaryPreview?.ready&&document.querySelector('[data-memory-pending]')?.textContent==='12');
        const panel=page.locator('[data-memory-addons-panel]'),drawer=page.locator('#roleforge-memory-addons>details');
        assert.equal(await page.locator('#extensions_settings2>#roleforge-memory-addons').count(),1);
        assert.equal(await page.locator('[data-tab="summaries"],[data-panel="summaries"]').count(),0);
        assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,window.host.extensionSettings.tretaresia_rpg[key]])),Object.keys(preserved)),preserved);
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.calls.length),0);
        await capture(page,'overview',width);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        const colors=await drawer.evaluate(node=>({bg:getComputedStyle(node).backgroundColor,accent:getComputedStyle(node).getPropertyValue('--rpg-accent').trim()}));
        assert.deepEqual(colors,{bg:'rgb(32, 32, 32)',accent:'#aaa'});
        // A native collapse is a visual choice: a running summary still saves.
        await panel.locator('[data-action="memory-summary-run"]').click();
        await page.waitForFunction(()=>typeof window.navigationSummaryPreview.api.pending==='function');
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.calls.length),1);
        assert(await page.evaluate(()=>window.navigationSummaryPreview.api.notice.some(notice=>notice.type==='info'&&notice.message.includes('API'))));
        await capture(page,'running',width);
        await drawer.locator(':scope>summary').click();assert.equal(await drawer.evaluate(node=>node.open),false);
        await page.evaluate(()=>window.navigationSummaryPreview.resolveRequest());
        await page.locator('.rf-memory-job[data-status="ready"]').waitFor({state:'attached'});
        assert.equal(await drawer.evaluate(node=>node.open),false,'progress updates never reopen a folded drawer');
        await drawer.locator(':scope>summary').click();
        assert.equal(await panel.locator('[data-memory-summarized]').innerText(),'12');
        assert.equal(await panel.locator('[data-memory-chapters]').innerText(),'1');
        // Off hides the drawer without deleting stored summaries or preferences.
        const toggle=page.locator('#roleforge-optional-settings [data-optional-setting="enableMemorySummaries"]');
        await toggle.uncheck();assert.equal(await page.locator('#roleforge-memory-addons').isVisible(),false);
        await toggle.check();await panel.locator('[data-memory-chapters]').waitFor({state:'visible'});
        await page.waitForFunction(()=>document.querySelector('[data-memory-chapters]')?.textContent==='1');
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.calls.length),1);
        await page.reload();await page.waitForFunction(()=>window.navigationSummaryPreview?.ready&&document.querySelector('[data-memory-chapters]')?.textContent==='1');
        assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,window.host.extensionSettings.tretaresia_rpg[key]])),Object.keys(preserved)),preserved);
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.calls.length),0,'opening a saved archive never calls AI');
        // The main-chat View button opens native Extension Settings directly.
        await panel.locator('[data-action="memory-summary-run"]').click();await page.locator('.rf-memory-job[data-status="ready"]').waitFor();
        await page.locator('#preview-settings-close').click();
        await page.evaluate(()=>{window.nativeDrawerOpens=0;document.querySelector('#extensions-settings-button>.drawer-toggle').addEventListener('click',()=>window.nativeDrawerOpens++);});
        await page.locator('[data-memory-composer-action="open"]').click();
        await panel.waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.nativeDrawerOpens),1);
        assert.equal(await page.locator('#tretaresia-rpg-overlay').evaluate(node=>node.classList.contains('is-open')),false);
        // Source inspection and grouped settings save preserve other groups.
        await panel.locator('[data-action="memory-summary-open-search"]').click();
        assert.equal(await panel.locator('[name="query"]').evaluate(node=>document.activeElement===node),true);
        await panel.locator('[name="query"]').fill('Cora');await panel.locator('[data-form="memory-summary-search"] [type=submit]').click();
        await panel.locator('[data-action="memory-summary-source"]').first().click();
        assert.match(await panel.locator('.rf-memory-source pre').innerText(),/Moonlit River/);
        await panel.locator('[data-memory-section="context"]>summary').click();
        await panel.locator('[name="memorySummaryBudget"]').fill('1200');
        await panel.locator('[data-memory-settings-group="context"] [type=submit]').click();
        assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBatchSize),50);
        assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryOutputTokens),2600);
        assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memoryInject),false);
        // Global settings remain usable when no chat is selected, and prior-chat
        // drafts/controls cannot leak into the new context.
        await panel.locator('[name="memorySummaryBudget"]').fill('999');
        await page.evaluate(async()=>{window.host.getCurrentChatId=()=>undefined;window.host.characterId=undefined;window.host.chatMetadata={};window.host.chat=[];await window.host.eventSource.emit('CHAT_CHANGED');});
        await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='—');
        assert.equal(await panel.locator('[name="memorySummaryBudget"]').inputValue(),'1200');
        assert.equal(await panel.locator('[data-action="memory-summary-run"]').isDisabled(),true);
        await panel.locator('[name="memorySummaryBudget"]').fill('1300');await panel.locator('[data-memory-settings-group="context"] [type=submit]').click();
        assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.memorySummaryBudget),1300);
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.calls.length),0);
        assert.deepEqual(errors,[]);
        console.log(`PASS separate native Memory Addons drawer, legacy settings/archive preservation, collapse during API, enable/off/reload, API notice, composer routing, local search, grouped settings and no-chat draft isolation at ${width}px`);
        await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
