// Full production loader and runtime in the same static preview host used for review.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/h-stats.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{
    try {
        const url=new URL(req.url,'http://localhost');
        if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
        if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
        const path=url.pathname.slice(base.length),data=await readFile(new URL(path,root));
        res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html'
            :path.endsWith('.json')?'application/json':/\.(m?js)$/.test(path)?'text/javascript':'image/webp');res.end(data);
    } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+base+'docs/previews/preview-h-stats.html?lang=en';
const artifacts=process.env.HSTATS_SCREENSHOT_DIR||'/workspace/artifacts';
await mkdir(artifacts,{recursive:true});
let browser;
async function selected(page,id) {
    const name=id==='ashe'?'Ashe':id==='teresina'?'Teresina':'Cora';
    await page.waitForFunction(({id,name})=>window.host.chatMetadata.tretaresia_rpg_selected_hstats_npc===id
        &&document.querySelector('#tretaresia-rpg-overlay')?.classList.contains('is-ready')
        &&document.querySelector('.tretaresia-h-identity h3')?.innerText===name,{id,name});
    assert.equal(await page.locator('.tretaresia-h-identity h3').innerText(),name);
}
async function visibleIds(page) {return page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_visible_hstats_npcs);}
async function setLayout(page,layout) {
    const details=page.locator('.tretaresia-h-layout-settings');
    if(!await details.evaluate(node=>node.open))await details.locator('summary').click();
    await page.locator(`[data-action="set-hstats-layout"][data-id="${layout}"]`).click();
    assert.equal(await page.locator('.tretaresia-h-shell').getAttribute('data-h-layout'),layout);
    assert.equal(await page.locator('.tretaresia-h-roster').getAttribute('data-h-layout'),layout);
    assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.hStatsLayout),layout);
}
async function touchTargets(page,selectors) {
    for(const selector of selectors)for(const node of await page.locator(selector).all()) {
        if(!await node.isVisible())continue;
        const box=await node.boundingBox();
        assert(box.width>=43.9&&box.height>=43.9,`${selector}: ${box.width.toFixed(1)}×${box.height.toFixed(1)} must be at least 44×44`);
    }
}
async function noOverflow(page,width) {
    const sizes=await page.evaluate(()=>({document:document.documentElement.scrollWidth,
        shell:document.querySelector('.tretaresia-h-shell').scrollWidth,
        shellWidth:document.querySelector('.tretaresia-h-shell').clientWidth}));
    assert(sizes.document<=width+1,`Document overflow at ${width}px: ${JSON.stringify(sizes)}`);
    assert(sizes.shell<=sizes.shellWidth+1,`H-Stats shell overflow at ${width}px: ${JSON.stringify(sizes)}`);
}
try {
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of process.env.HSTATS_GROUPS_ONLY?[]:[320,390,1280]) {
        const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
        await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
        const panel=page.locator('[data-panel="hstats"]');await panel.waitFor({state:'visible'});
        await selected(page,'ashe');assert.deepEqual(await visibleIds(page),['ashe','teresina']);
        assert.equal(await page.locator('.tretaresia-h-shell').getAttribute('data-h-layout'),'tabs');
        assert.equal(await panel.locator('[data-action="remove-hstats-npc"],[data-action="request-hide-hstats-npc"]').count(),0,'No close/hide control beside character switching');
        assert.equal(await page.locator('.tretaresia-h-layout-settings').evaluate(node=>node.open),false,'Choice panel starts collapsed');
        await panel.locator('[data-action="select-hstats-npc"][data-id="teresina"]').click();await selected(page,'teresina');
        assert.deepEqual(await visibleIds(page),['ashe','teresina'],'Switching never hides a character');
        await panel.locator('[data-action="select-hstats-npc"][data-id="ashe"]').click();
        for(const layout of ['tabs','cards','compact']) {
            await setLayout(page,layout);await noOverflow(page,width);
            await touchTargets(page,['.tretaresia-h-layout-settings summary','[data-action="set-hstats-layout"]','[data-action="toggle-hstats-manage"]',
                '.tretaresia-h-roster [data-action="select-hstats-npc"]','select[name="hStatsSelectedNpc"]','select[name="hStatsNpcId"]','[data-action="add-hstats-npc"]']);
            if(layout==='cards') {
                await page.waitForFunction(()=>document.querySelectorAll('.tretaresia-h-card-portrait img').length===2);
                assert.equal(await panel.locator('.tretaresia-h-card-portrait img').count(),2,'Portrait cards use the production portrait hydrator');
            }
            if(width===390) {
                await panel.evaluate(node=>node.closest('.tretaresia-rpg-panel-body').scrollTop=0);
                await page.screenshot({path:artifacts+`/hstats-${layout}-mobile.png`});
            }
            if(width===1280&&layout==='cards')await page.screenshot({path:artifacts+'/hstats-cards-desktop.png'});
        }
        await panel.locator('select[name="hStatsSelectedNpc"]').selectOption('teresina');await selected(page,'teresina');
        await panel.locator('select[name="hStatsSelectedNpc"]').selectOption('ashe');await selected(page,'ashe');
        const retained=await page.evaluate(()=>JSON.stringify(window.host.characters[0].data.extensions.tretaresia_rpg_npcs));
        await panel.locator('[data-action="toggle-hstats-manage"]').click();
        await panel.locator('[data-action="request-hide-hstats-npc"][data-id="ashe"]').click();
        assert.deepEqual(await visibleIds(page),['ashe','teresina'],'Request does not hide until confirmation');
        assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'cancel-hide-hstats-npc','Focus defaults to cancel');
        await touchTargets(page,['[data-action="request-hide-hstats-npc"]','[data-action="cancel-hide-hstats-npc"]','[data-action="confirm-hide-hstats-npc"]']);
        await panel.locator('[data-action="cancel-hide-hstats-npc"]').click();
        assert.deepEqual(await visibleIds(page),['ashe','teresina']);
        assert.equal(await panel.locator('[data-action="confirm-hide-hstats-npc"]').count(),0);
        await panel.locator('[data-action="request-hide-hstats-npc"][data-id="ashe"]').click();
        await panel.locator('[data-action="confirm-hide-hstats-npc"]').click();
        assert.deepEqual(await visibleIds(page),['teresina']);await selected(page,'teresina');
        assert.equal(await page.evaluate(()=>JSON.stringify(window.host.characters[0].data.extensions.tretaresia_rpg_npcs)),retained,'Hide preserves dossiers and stats');
        await touchTargets(page,['[data-action="undo-hide-hstats-npc"]']);
        await panel.locator('[data-action="undo-hide-hstats-npc"]').click();
        assert.deepEqual(await visibleIds(page),['ashe','teresina']);await selected(page,'ashe');
        await panel.locator('[data-action="request-hide-hstats-npc"][data-id="ashe"]').click();
        await panel.locator('[data-action="confirm-hide-hstats-npc"]').click();
        await panel.locator('select[name="hStatsNpcId"]').selectOption('ashe');
        await panel.locator('[data-action="add-hstats-npc"]').click();await selected(page,'ashe');
        assert.deepEqual(await visibleIds(page),['teresina','ashe']);
        await panel.locator('select[name="hStatsNpcId"]').selectOption('cora');
        await panel.locator('[data-action="add-hstats-npc"]').click();await selected(page,'cora');
        assert.deepEqual(await visibleIds(page),['teresina','ashe','cora']);
        await panel.locator('[data-action="toggle-hstats-manage"]').click();
        assert.equal(await panel.locator('[data-action="request-hide-hstats-npc"]').count(),0);
        // The new controls are translated independently of user-entered NPC prose.
        await setLayout(page,'cards');
        assert(!/[ก-๛]/.test(await panel.locator('.tretaresia-h-controls').innerText()),'English directory controls');
        await page.evaluate(()=>{
            const language=document.querySelector('#tretaresia-rpg-language');
            language.value='th';language.dispatchEvent(new Event('change',{bubbles:true}));
            document.querySelector('[data-tab="hstats"]')?.click();
        });
        await panel.locator('.tretaresia-h-controls').waitFor();
        assert.match(await panel.locator('.tretaresia-h-controls').innerText(),/[ก-๛]/,'Thai directory controls');
        assert.equal(await panel.locator('[data-action="toggle-hstats-manage"]').innerText(),'จัดการรายชื่อ');
        await noOverflow(page,width);
        await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready);
        assert.equal(await page.locator('.tretaresia-h-shell').getAttribute('data-h-layout'),'cards','Choice survives reload');
        assert.equal(await page.locator('#tretaresia-rpg-language').inputValue(),'th','Language survives reload');
        await selected(page,'cora');
        // Pending confirmation and undo from another chat cannot affect the new chat.
        await panel.locator('[data-action="toggle-hstats-manage"]').click();
        await panel.locator('[data-action="request-hide-hstats-npc"][data-id="cora"]').click();
        await page.evaluate(async()=>{window.staleHideButton=document.querySelector('[data-action="confirm-hide-hstats-npc"]').cloneNode(true);await window.hStatsPreview.switchChat('h-stats-other-chat');});
        assert.deepEqual(await visibleIds(page),['ashe','teresina']);
        assert.equal(await panel.locator('[data-action="confirm-hide-hstats-npc"]').count(),0);
        assert.equal(await panel.locator('[data-action="request-hide-hstats-npc"]').count(),0);
        await page.evaluate(()=>{const panel=document.querySelector('[data-panel="hstats"]');panel.append(window.staleHideButton);window.staleHideButton.click();window.staleHideButton.remove();});
        assert.deepEqual(await visibleIds(page),['ashe','teresina'],'Stale confirmation cannot hide in another chat');
        await panel.locator('[data-action="toggle-hstats-manage"]').click();
        await panel.locator('[data-action="request-hide-hstats-npc"][data-id="ashe"]').click();
        await panel.locator('[data-action="confirm-hide-hstats-npc"]').click();
        await page.evaluate(async()=>{window.staleUndoButton=document.querySelector('[data-action="undo-hide-hstats-npc"]').cloneNode(true);await window.hStatsPreview.switchChat('h-stats-third-chat');});
        assert.equal(await panel.locator('[data-action="undo-hide-hstats-npc"]').count(),0);
        await page.evaluate(()=>{const panel=document.querySelector('[data-panel="hstats"]');panel.append(window.staleUndoButton);window.staleUndoButton.click();window.staleUndoButton.remove();});
        assert.deepEqual(await visibleIds(page),['ashe','teresina'],'Stale undo cannot cross chats');
        assert.deepEqual(errors,[]);
        console.log(`PASS H-Stats layouts, portraits, safe hide, cancel, undo, add back, chat isolation, English/Thai and reload at ${width}px`);
        await page.close();
    }
    // An old completed story can establish memberships without an inline patch.
    // Opening the extension must recover them without accepting an invitation.
    const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
    await page.goto(url+'&groups=1');await page.waitForFunction(()=>window.hStatsPreview?.ready);
    await page.evaluate(()=>document.querySelector('[data-tab="groups"]').click());
    const groups=page.locator('[data-panel="groups"]');await groups.waitFor({state:'visible'});
    await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state?.social?.party?.name==='Moonlight'
        &&window.host.chatMetadata.tretaresia_rpg_state?.social?.guilds?.some(guild=>guild.name==='Dawnspire'));
    await page.waitForFunction(()=>document.querySelector('[data-panel="groups"] .tretaresia-party-card h4')?.innerText==='Moonlight'
        &&document.querySelector('[data-panel="groups"] .tretaresia-guild-card h4')?.innerText==='Dawnspire');
    assert.equal(await groups.locator('.tretaresia-party-card h4').innerText(),'Moonlight');
    assert.equal(await groups.locator('.tretaresia-guild-card h4').innerText(),'Dawnspire');
    const state=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state),guild=state.social.guilds.find(guild=>guild.name==='Dawnspire');
    assert.equal(state.social.party.leaderId,'ashe');assert.equal(guild.leaderId,'ashe');
    assert.equal(state.social.party.playerRole,'Member');assert.equal(guild.playerRole,'Member');
    assert.equal(state.player.party,'Moonlight');assert.equal(state.player.guild,'Dawnspire');
    for(const card of ['.tretaresia-party-card','.tretaresia-guild-card']) {
        const members=await groups.locator(card+' .tretaresia-social-member-list strong').allTextContents();
        assert(members.some(name=>name.includes('Nova')),card+' must show the player as a member');
        assert(members.some(name=>name.includes('Ashe')),card+' must show the established NPC leader');
    }
    const metrics=await page.evaluate(()=>window.hStatsPreview.groupFixture);
    assert.deepEqual(Object.fromEntries(['gold','silver','copper'].map(key=>[key,state.progression.currency[key]])),metrics.initialCurrency,'Recovering membership never charges a guild founding fee');
    assert.equal(metrics.joinClicks,0,'Recovery needs no invitation acceptance');
    assert.equal(metrics.aiRequests,0,'Recovery reads existing story without an AI request');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:artifacts+'/groups-recovered-mobile.png'});
    console.log('PASS existing-story Party/Guild recovery in production Groups UI, Ashe leadership, player membership, unchanged balance and no extra AI at 390px');
    await page.close();
} finally {await browser?.close();server.close();}
