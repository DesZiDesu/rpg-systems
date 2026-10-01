// Full production loader/runtime preview: the native navigation callbacks and
// memory archive/generation lifecycle run unchanged with a local API fixture.
// CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/navigation-summary.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{
    try {const url=new URL(req.url,'http://localhost');
        if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
        if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
        const path=url.pathname.slice(base.length),content=await readFile(new URL(path,root));
        res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':/\.(m?js)$/.test(path)?'text/javascript':'image/webp');res.end(content);
    }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-navigation-summary.html`;
const artifacts=process.env.NAVIGATION_SCREENSHOT_DIR||'/workspace/artifacts/navigation-summary-preview';
await mkdir(artifacts,{recursive:true});
let browser;
const widths=process.env.NAVIGATION_WIDTHS?process.env.NAVIGATION_WIDTHS.split(',').map(Number):[320,390,1280];
async function capture(page,name,width){await page.screenshot({path:`${artifacts}/${name}-${width}.png`});}
async function noOverflow(page,width){const sizes=await page.evaluate(()=>({document:document.documentElement.scrollWidth,
    navigation:document.querySelector('#roleforge-module-navigation').scrollWidth,
    width:document.querySelector('#roleforge-module-navigation').clientWidth}));
    assert(sizes.document<=width+1,`document overflow at ${width}: ${JSON.stringify(sizes)}`);
    assert(sizes.navigation<=sizes.width+1,`navigation overflow at ${width}: ${JSON.stringify(sizes)}`);}
async function panel(page,id){await page.evaluate(id=>window.navigationSummaryPreview.open(id),id);await page.locator(`[data-panel="${id}"].is-active`).waitFor();return page.locator(`[data-panel="${id}"].is-active`);}
async function chooseLayoutInSettings(page,mode,width){
    await page.evaluate(()=>window.navigationSummaryPreview.openSettings());
    const control=page.locator('#tretaresia-rpg-module-navigation');
    await control.waitFor({state:'visible'});
    assert.equal(await page.locator('label[for="tretaresia-rpg-module-navigation"] > span').innerText(),'รูปแบบเลือกหมวด');
    assert.deepEqual(await control.locator('option').allTextContents(),['เลื่อนทีละหมวด (เดิม)','เมนูเลือกหมวด','ตารางหมวด']);
    await control.selectOption(mode);
    assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.moduleNavigationMode),mode);
    await control.scrollIntoViewIfNeeded();
    if(mode==='grid')await capture(page,'navigation-extension-settings',width);
    await page.locator('#preview-settings-close').click();
    await panel(page,'status');
}
try {
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of widths){
        const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
        await page.goto(url+'?lang=th&review=1');await page.waitForFunction(()=>window.navigationSummaryPreview?.ready);
        const originalState=await page.evaluate(()=>JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state));
        for(const mode of ['carousel','menu','grid']){
            await chooseLayoutInSettings(page,mode,width);
            assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.moduleNavigationMode),mode);
            assert.equal(await page.locator('#roleforge-module-navigation').getAttribute('data-mode'),mode);
            assert.equal(await page.locator('#tretaresia-rpg-overlay [data-rf-nav-mode],#tretaresia-rpg-overlay .rf-nav-preferences').count(),0,'layout preferences stay in Extension Settings only');
            assert.equal(await page.locator('#tretaresia-rpg-overlay select#tretaresia-rpg-module-navigation').count(),0);
            assert.equal(await page.locator('#roleforge-module-navigation').isVisible(),mode!=='carousel','original carousel has no extra navigation header');
            await noOverflow(page,width);
            await capture(page,`navigation-${mode}`,width);
            if(mode==='carousel'){
                const before=await page.locator('[data-panel].is-active').getAttribute('data-panel');
                await page.locator('[data-action="tab-next"]').click();
                assert.notEqual(await page.locator('[data-panel].is-active').getAttribute('data-panel'),before);
                await panel(page,'status');
                continue;
            }
            assert.equal(await page.locator('#tretaresia-module-slider').isVisible(),false,'original carousel hidden in chosen alternative');
            await page.locator('[data-rf-nav-launch]').click();
            await page.locator('.rf-nav-picker').waitFor({state:'visible'});
            assert.equal(await page.locator('[data-rf-nav-launch]').getAttribute('aria-expanded'),'true');
            await capture(page,`navigation-${mode}-open`,width);
            assert(await page.locator('[data-rf-nav-tab="summaries"]').count(),'enabled memory module listed');
            assert.equal(await page.locator('[data-rf-nav-tab]').count(),17,'every existing RoleForge tab available directly');
            assert.equal(await page.locator('[data-rf-nav-tab="npcs"] .rf-nav-choice-label').innerText(),'NPC','NPC tile uses a short, readable label');
            if(mode==='menu'){
                await page.locator('[data-rf-nav-search]').fill('summaries');
                assert.equal(await page.locator('[data-rf-nav-tab]').count(),1);
                await capture(page,'navigation-menu-search',width);
            }
            await page.locator('[data-rf-nav-tab="summaries"]').click();
            await page.locator('[data-panel="summaries"].is-active .rf-memory-workspace').waitFor();
            assert.equal(await page.locator('.rf-nav-picker').isVisible(),false);
            await capture(page,`navigation-${mode}-selected`,width);
            await panel(page,'status');
        }
        assert.equal(await page.evaluate(()=>JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state)),originalState,'layout switches preserve RPG state');
        await page.reload();await page.waitForFunction(()=>window.navigationSummaryPreview?.ready);
        assert.equal(await page.locator('#tretaresia-rpg-module-navigation').inputValue(),'grid','chosen navigation survives reload in Extension Settings');
        await page.evaluate(()=>{window.originalSend=document.querySelector('#send_but');window.originalInput=document.querySelector('#send_textarea');});
        const current=await panel(page,'summaries');
        await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='12');
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.calls.length),0,'preview startup does not call the summary API');
        await current.locator('[data-action="memory-summary-run"]').click();
        await page.waitForFunction(()=>typeof window.navigationSummaryPreview.api.pending==='function');
        await page.locator('#tretaresia-rpg-close').click();
        await page.locator('.rf-memory-composer-status[data-status="summarizing"]').waitFor({state:'visible'});
        assert.equal(await page.locator('#send_but').isVisible(),false);
        assert.equal(await page.locator('.rf-memory-composer-stop').isVisible(),true);
        await page.locator('#send_textarea').fill('I can type while the summary is running.');
        await capture(page,'main-chat-memory-busy',width);
        await page.evaluate(()=>window.navigationSummaryPreview.resolveRequest());
        await page.waitForFunction(()=>window.navigationSummaryPreview.api.calls.length===2&&typeof window.navigationSummaryPreview.api.pending==='function');
        assert.match(await page.locator('.rf-memory-composer-progress').innerText(),/5\/12/,'first saved batch reflected in composer');
        await capture(page,'main-chat-memory-saved-batch',width);
        await page.locator('.rf-memory-composer-stop').click();
        await page.locator('.rf-memory-composer-status[data-status="cancelled"]').waitFor({state:'visible'});
        assert.equal(await page.locator('#send_but').isVisible(),true);
        assert.equal(await page.locator('.rf-memory-composer-stop').count(),0);
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.nativeStops),0,'summary stop does not click native story Stop');
        assert.equal(await page.evaluate(()=>window.originalSend===document.querySelector('#send_but')&&window.originalInput===document.querySelector('#send_textarea')),true,'native composer nodes preserved');
        await capture(page,'main-chat-memory-cancelled',width);
        await page.locator('#send_but').click();
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.nativeSends),1,'native Send still works after cancellation');
        await page.evaluate(()=>window.navigationSummaryPreview.setApiMode('error'));
        await page.locator('[data-memory-composer-action="retry"]').click();
        await page.locator('.rf-memory-composer-status[data-status="error"]').waitFor({state:'visible'});
        assert.equal(await page.locator('#send_but').isVisible(),true);
        await capture(page,'main-chat-memory-error',width);
        await page.locator('[data-memory-composer-action="open"]').click();
        await page.locator('[data-panel="summaries"].is-active').waitFor({state:'visible'});
        const diagnostics=page.locator('.rf-memory-diagnostics');await diagnostics.locator('summary').click();
        assert.equal(await page.locator('[data-memory-error-code]').innerText(),'MEMORY_API_REQUEST_FAILED');
        assert.equal(await page.locator('[data-memory-pending]').innerText(),'7','saved batch survives failed retry');
        await capture(page,'memory-error-diagnostics',width);
        await page.evaluate(()=>window.navigationSummaryPreview.setApiMode('success'));
        await page.locator('[data-action="memory-summary-retry"]').click();
        await page.locator('#tretaresia-rpg-close').click();
        await page.locator('.rf-memory-composer-status[data-status="ready"]').waitFor({state:'visible',timeout:20000});
        assert.equal(await page.locator('#send_but').isVisible(),true);
        assert.match(await page.locator('.rf-memory-composer-progress').innerText(),/7\/7/);
        await capture(page,'main-chat-memory-success',width);
        await panel(page,'summaries');
        await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='0');
        await page.locator('[data-memory-pending]').scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-memory-pending]')).visibility==='visible');
        assert.equal(await page.locator('[data-memory-pending]').innerText(),'0');
        assert.match(await page.locator('.rf-memory-job').innerText(),/3/);
        await capture(page,'memory-summary-completed',width);
        // Turning the system off restores the real Send immediately, without
        // waiting for the composer's one-second timer or a delayed API result.
        await page.evaluate(async()=>{
            window.host.chat.push({is_user:true,name:'Nova',mes:'I plan another quiet visit to the river.'});
            window.navigationSummaryPreview.setApiMode('manual');
            await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);
        });
        await page.waitForFunction(()=>document.querySelector('[data-memory-pending]')?.textContent==='1');
        await page.locator('[data-action="memory-summary-run"]').click();
        await page.waitForFunction(()=>typeof window.navigationSummaryPreview.api.pending==='function');
        await page.locator('#tretaresia-rpg-close').click();
        await page.locator('.rf-memory-composer-stop').waitFor({state:'visible'});
        const disabled = await page.evaluate(()=>{
            const control=document.querySelector('[data-optional-setting="enableMemorySummaries"]');
            control.checked=false;control.dispatchEvent(new Event('change',{bubbles:true}));
            return {stop:document.querySelectorAll('.rf-memory-composer-stop').length,
                hidden:document.querySelector('#send_but').classList.contains('rf-memory-native-send-hidden'),
                bar:document.querySelectorAll('.rf-memory-composer-status').length};
        });
        assert.deepEqual(disabled,{stop:0,hidden:false,bar:0});
        await page.evaluate(()=>window.navigationSummaryPreview.resolveRequest());
        // The preview never touches another demo's settings or any user owner.
        assert.equal(await page.evaluate(()=>localStorage.getItem('roleforge-hstats-preview-settings')),null);
        assert.deepEqual(errors,[]);
        console.log(`PASS actual Extension Settings layouts carousel/menu/grid with no modal preferences, all 17 direct module selections/search/persistence, unchanged RPG state, composer summary Stop/save/cancel/error/retry/success and native Send identity at ${width}px`);
        await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
