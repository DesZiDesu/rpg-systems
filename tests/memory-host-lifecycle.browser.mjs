// Reproduce native SillyTavern lifecycle failures through the actual production
// loader and the shared isolated preview, with a local native-generation fixture.
// CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/memory-host-lifecycle.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = new URL('../',import.meta.url),base = '/scripts/extensions/third-party/rpg-systems/';
const server = http.createServer(async (req,res) => {
    try {
        const url = new URL(req.url,'http://localhost');
        if (!url.pathname.startsWith(base) || url.pathname.includes('..')) { res.writeHead(404).end();return; }
        const path = url.pathname.slice(base.length),content = await readFile(new URL(path,root));
        res.setHeader('content-type',path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html' : path.endsWith('.json') ? 'application/json' : /\.(m?js)$/.test(path) ? 'text/javascript' : 'image/webp');
        res.end(content);
    } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const url = `http://127.0.0.1:${server.address().port}${base}docs/previews/preview-navigation-summary.html?lang=th&review=1&tab=summaries`;
const widths = process.env.MEMORY_HOST_WIDTHS ? process.env.MEMORY_HOST_WIDTHS.split(',').map(Number) : [320,390,1280];
const artifacts = process.env.MEMORY_HOST_SCREENSHOT_DIR || '/workspace/artifacts/memory-host-lifecycle';
await mkdir(artifacts,{recursive:true});
let browser;

async function createPage(width) {
    const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors = [],apiRequests = [];
    page.on('pageerror',error => errors.push(error.message));
    page.on('request',request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
    await page.route('https://fonts.googleapis.com/**',route => route.fulfill({contentType:'text/css',body:''}));
    await page.goto(url);
    await page.waitForFunction(() => window.navigationSummaryPreview?.ready && document.querySelector('[data-memory-pending]')?.textContent === '12');
    assert.equal(await page.evaluate(() => 'isGenerating' in window.host),false,'the official getContext shape does not have a synthetic isGenerating flag');
    assert.equal(await page.locator('#send_but').isVisible(),true);
    assert.equal(await page.locator('#mes_stop').isVisible(),false);
    await page.evaluate(() => { window.navigationSummaryPreview.api.successDelay = 80; });
    return {page,errors,apiRequests};
}
async function start(page) {
    await page.locator('[data-memory-addons-panel] [data-action="memory-summary-run"]').click();
    await page.locator('#preview-settings-close').click();
    // All composer panels start minimized since 0.59.0. Expand explicitly,
    // just as a player does, before checking progress/Cancel controls.
    await page.locator('.rf-composer-dock.is-minimized [data-dock-collapse]').click();
}
async function emit(page,type,...args) {
    await page.evaluate(async ({type,args}) => { await window.host.eventSource.emit(window.host.eventTypes[type],...args); },{type,args});
}
async function saved(page) {
    return page.evaluate(async () => {
        const {createMemoryStore} = await import('./../../src/memory-store.js');
        return (await createMemoryStore().get(window.navigationSummaryPreview.memoryOwner)).chapters;
    });
}
async function complete(page) {
    await page.locator('.rf-memory-composer-status[data-status="ready"]').waitFor({state:'visible',timeout:15000});
    assert.equal(await page.evaluate(() => window.navigationSummaryPreview.api.calls.length),3,'12 original messages complete as 5 + 5 + 2 through the current native preset API');
    assert.match(await page.locator('.rf-memory-composer-progress').innerText(),/12\/12/);
    assert.equal((await saved(page)).length,3);
    await page.evaluate(() => window.navigationSummaryPreview.open('summaries'));
    await page.waitForFunction(() => document.querySelector('[data-memory-pending]')?.textContent === '0');
    await page.locator('[data-memory-addons-panel] [data-memory-pending]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
        const node = document.querySelector('[data-memory-addons-panel] [data-memory-pending]');
        if (!node || !node.getBoundingClientRect().height) return false;
        for (let current = node;current;current = current.parentElement) {
            const style = getComputedStyle(current);
            if (style.visibility !== 'visible' || style.display === 'none' || Number(style.opacity) < .99) return false;
        }
        return true;
    });
    assert.equal(await page.locator('#send_but').isVisible(),true,'the native composer is restored after summary completion');
}
async function capture(page,name,width) {
    // The real shell and carousel can still transition after DOM readiness.
    // Await their finite animations, then paint two frames before capturing.
    await page.evaluate(async () => {
        const overlay = document.querySelector('#tretaresia-rpg-overlay.is-open');
        if (overlay) {
            const animations = overlay.getAnimations({subtree:true}).filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
            // A paused theme animation can have finite iterations without
            // ever finishing. It must not hang the browser verification.
            await Promise.race([Promise.allSettled(animations.map(animation => animation.finished)),new Promise(resolve=>setTimeout(resolve,1500))]);
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.screenshot({path:`${artifacts}/${name}-${width}.png`});
}
async function clean({page,errors,apiRequests}) {
    assert.deepEqual(errors,[],'production lifecycle emits no browser exceptions');
    assert.deepEqual(apiRequests,[],'the fixture makes no external or paid API request');
    await page.close();
}

try {
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for (const width of widths) {
        console.log(`CHECK native lifecycle ${width}px: orphan Start`);
        // A normal START can occur without END in real host commands. Native
        // Send/Stop show idle, so a stale event cannot create an endless wait.
        let fixture = await createPage(width);
        await emit(fixture.page,'GENERATION_STARTED','normal',{},false);
        await fixture.page.evaluate(() => window.navigationSummaryPreview.setApiMode('success'));
        await start(fixture.page);
        await complete(fixture.page);
        await capture(fixture.page,'memory-orphan-start-complete',width);
        await clean(fixture);

        // Native preset generation emits quiet START/END itself. It must not
        // wait on its own request, change RPG records, or reprocess old prose.
        fixture = await createPage(width);
        console.log(`CHECK native lifecycle ${width}px: preset generation`);
        await fixture.page.evaluate(() => {
            const nativeQuiet = window.host.generateQuietPrompt;
            window.quietRequests=[];window.quietStoryPrompts=[];
            window.beforeQuietState=JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state);
            window.beforeQuietChat=JSON.stringify(window.host.chat);
            window.host.extensionPrompts={userPreset:{value:'KEEP USER PRESET'}};
            window.host.setExtensionPrompt=(key,value)=>{if(key==='tretaresia_rpg_roleplay_state')window.quietStoryPrompt=value;};
            window.host.generateQuietPrompt=async options=>{
                window.quietRequests.push(options);
                window.navigationSummaryPreview.setNativeStoryBusy(true,{bodyState:true});
                await window.host.eventSource.emit('GENERATION_STARTED','quiet',{},false);
                await window.TretaresiaRpgGenerateInterceptor();
                window.quietStoryPrompts.push(window.quietStoryPrompt);
                try{return await nativeQuiet(options);}
                finally {
                    window.navigationSummaryPreview.setNativeStoryBusy(false,{bodyState:true});
                    await window.host.eventSource.emit('GENERATION_ENDED');
                }
            };
            window.navigationSummaryPreview.setApiMode('success');
        });
        await start(fixture.page);await complete(fixture.page);
        const nativeResult=await fixture.page.evaluate(()=>({
            requests:window.quietRequests.map(({skipWIAN,responseLength,removeReasoning})=>({skipWIAN,responseLength,removeReasoning})),
            prompts:window.quietStoryPrompts,sameState:window.beforeQuietState===JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state),
            sameChat:window.beforeQuietChat===JSON.stringify(window.host.chat),external:window.host.extensionPrompts.userPreset.value,
        }));
        assert.deepEqual(nativeResult.requests,Array.from({length:3},()=>({skipWIAN:false,responseLength:2400,removeReasoning:false})));
        assert.deepEqual(nativeResult.prompts,['','','']);assert.equal(nativeResult.sameState,true);assert.equal(nativeResult.sameChat,true);
        assert.equal(nativeResult.external,'KEEP USER PRESET');
        await clean(fixture);

        // Stopping the host's quiet request is cancellation, not an API error.
        // A late response cannot save a chapter; later requests still work.
        fixture = await createPage(width);
        console.log(`CHECK native lifecycle ${width}px: native cancellation`);
        await fixture.page.evaluate(() => {
            const nativeQuiet=window.host.generateQuietPrompt;
            document.querySelector('#mes_stop').addEventListener('click',async()=>{
                window.navigationSummaryPreview.setNativeStoryBusy(false,{bodyState:true});
                await window.host.eventSource.emit('GENERATION_STOPPED');
            });
            window.host.generateQuietPrompt=async options=>{
                window.navigationSummaryPreview.setNativeStoryBusy(true,{bodyState:true});
                await window.host.eventSource.emit('GENERATION_STARTED','quiet',{},false);
                try{return await nativeQuiet(options);}
                finally {
                    window.navigationSummaryPreview.setNativeStoryBusy(false,{bodyState:true});
                    await window.host.eventSource.emit('GENERATION_ENDED');
                }
            };
        });
        await start(fixture.page);
        await fixture.page.waitForFunction(()=>window.navigationSummaryPreview.api.calls.length===1);
        await fixture.page.locator('#mes_stop').click();
        await fixture.page.locator('.rf-memory-composer-status[data-status="cancelled"]').waitFor({state:'visible'});
        assert.equal((await saved(fixture.page)).length,0);
        await fixture.page.evaluate(()=>window.navigationSummaryPreview.api.pending());
        await fixture.page.waitForTimeout(120);assert.equal((await saved(fixture.page)).length,0);
        await fixture.page.evaluate(()=>window.navigationSummaryPreview.setApiMode('success'));
        await fixture.page.locator('[data-memory-composer-action="retry"]').click();
        await fixture.page.locator('.rf-memory-composer-status[data-status="ready"]').waitFor({state:'visible',timeout:15000});
        assert.equal((await saved(fixture.page)).length,3);
        await clean(fixture);

        // Exercise the event fallback too: with no native state available, a
        // dry run must not set the event flag and queue a real summary.
        fixture = await createPage(width);
        console.log(`CHECK native lifecycle ${width}px: dry run`);
        await fixture.page.evaluate(() => {
            document.querySelector('#mes_stop').remove();
            document.querySelector('#send_but').style.display = 'none';
            window.navigationSummaryPreview.setApiMode('success');
        });
        await emit(fixture.page,'GENERATION_STARTED','normal',{},true);
        await start(fixture.page);
        await fixture.page.locator('.rf-memory-composer-status[data-status="ready"]').waitFor({state:'visible',timeout:15000});
        assert.equal(await fixture.page.evaluate(() => window.navigationSummaryPreview.api.calls.length),3,'a dry run never blocks the actual summary even when no native state is readable');
        assert.equal((await saved(fixture.page)).length,3);
        await clean(fixture);

        // Real generation queues the worker without any API call or failed
        // wait timer. Ending the story wakes it automatically; no Retry click.
        fixture = await createPage(width);
        await fixture.page.evaluate(() => {
            window.navigationSummaryPreview.setApiMode('success');
            window.navigationSummaryPreview.setNativeStoryBusy(true,{bodyState:true});
        });
        await emit(fixture.page,'GENERATION_STARTED','normal',{},false);
        await start(fixture.page);
        await fixture.page.locator('.rf-memory-composer-status[data-status="waiting"]').waitFor({state:'visible'});
        await fixture.page.waitForTimeout(550);
        assert.equal(await fixture.page.evaluate(() => window.navigationSummaryPreview.api.calls.length),0);
        assert.equal(await fixture.page.locator('#mes_stop').isVisible(),true,'native story Stop retains control of the actual reply');
        assert.equal(await fixture.page.locator('.rf-memory-composer-stop').count(),0,'memory does not replace the native story Stop while queued');
        await capture(fixture.page,'memory-waiting-native-story',width);
        await fixture.page.evaluate(() => window.navigationSummaryPreview.setNativeStoryBusy(false,{bodyState:true}));
        await emit(fixture.page,'GENERATION_ENDED');
        await complete(fixture.page);
        assert.equal(await fixture.page.evaluate(() => window.navigationSummaryPreview.api.nativeStops),0);
        await clean(fixture);

        // Generation may start between batches. Commit the first five sources,
        // queue the remaining seven, then cancel without touching their source
        // messages, the already stored chapter or the host's native Stop.
        fixture = await createPage(width);
        await start(fixture.page);
        await fixture.page.waitForFunction(() => typeof window.navigationSummaryPreview.api.pending === 'function');
        await fixture.page.evaluate(() => window.navigationSummaryPreview.setNativeStoryBusy(true));
        await emit(fixture.page,'GENERATION_STARTED','normal',{},false);
        await fixture.page.evaluate(() => window.navigationSummaryPreview.resolveRequest());
        await fixture.page.locator('.rf-memory-composer-status[data-status="waiting"]').waitFor({state:'visible'});
        assert.match(await fixture.page.locator('.rf-memory-composer-progress').innerText(),/7/,'queued progress shows the seven messages still pending');
        const firstChapter = await saved(fixture.page);
        assert.equal(firstChapter.length,1);
        assert.equal(await fixture.page.evaluate(() => window.navigationSummaryPreview.api.calls.length),1);
        await fixture.page.locator('[data-memory-composer-action="cancel"]').click();
        await fixture.page.locator('.rf-memory-composer-status[data-status="cancelled"]').waitFor({state:'visible'});
        assert.deepEqual(await saved(fixture.page),firstChapter,'cancelling a queued worker leaves the validated saved chapter intact');
        assert.equal(await fixture.page.evaluate(() => window.navigationSummaryPreview.api.nativeStops),0,'memory Cancel never stops the host story');
        assert.equal(await fixture.page.locator('#mes_stop').isVisible(),true);
        await fixture.page.evaluate(() => window.navigationSummaryPreview.setNativeStoryBusy(false));
        await emit(fixture.page,'GENERATION_ENDED');
        await fixture.page.waitForTimeout(350);
        assert.equal(await fixture.page.evaluate(() => window.navigationSummaryPreview.api.calls.length),1,'ending the story cannot restart a cancelled worker');
        await fixture.page.evaluate(() => window.navigationSummaryPreview.open('summaries'));
        await fixture.page.waitForFunction(() => document.querySelector('[data-memory-pending]')?.textContent === '7');
        await clean(fixture);
        console.log(`PASS production native host lifecycle: native preset quiet requests without story changes, native Stop cancellation with late-result discard/retry, orphan START, ignored dry run, real queued summary with zero API calls/automatic resume, and saved-batch preservation at ${width}px`);
    }
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
