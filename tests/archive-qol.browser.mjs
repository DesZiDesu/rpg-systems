import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(new URL('..',import.meta.url).pathname),output=path.join(root,'docs/previews/archive-qol/screenshots');
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
    try{const pathname=new URL(req.url,'http://localhost').pathname,filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+'/')){res.writeHead(403).end();return;}res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');res.end(await readFile(filename));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/docs/previews/archive-qol/index.html`;
let browser;
const report=[];
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:width===320?700:width===390?844:960},isMobile:width<650,hasTouch:width<650}),errors=[];
        let discard=true;page.on('dialog',dialog=>discard?dialog.accept():dialog.dismiss());page.on('pageerror',error=>errors.push(error.message));
        async function load(){await page.goto(url);await page.waitForFunction(()=>window.previewReady);await page.locator('dialog[open] [data-list] .trpg-archive-row').first().waitFor();}
        async function state(){return page.evaluate(()=>window.previewState());}
        async function waitSaved(){await page.waitForFunction(()=>document.querySelector('dialog')?.getAttribute('aria-busy')!=='true'&&document.querySelector('[data-lore-panel]')?.getAttribute('aria-busy')!=='true');}
        const npc=page.locator('.trpg-browser'),lore=page.locator('[data-lore-panel]');
        const menu=page.locator('[data-archive-menu]');
        async function openTools(){if(!await menu.isVisible())await page.locator('[data-archive-options-toggle]').click();}
        async function closeTools(){if(await menu.isVisible())await page.locator('[data-archive-menu-close]').click();}
        async function choice(container,key){const button=container.locator(`[data-archive-${key}]`);if(!await button.isVisible())await container.locator('[data-archive-selection-menu]').click();await button.click();}
        async function preferences(){await openTools();if(!await menu.locator('[data-lore-preferences]').evaluate(n=>n.open))await menu.locator('[data-lore-preferences] summary').click();}
        async function assertListSpace(container){
            const metrics=await container.evaluate(n=>{const s=n.querySelector('.trpg-archive-scroll'),d=n.querySelector('.trpg-archive-dock'),r=s.querySelector('.trpg-archive-row'),box=s.getBoundingClientRect();return{first:r.getBoundingClientRect().top,visible:[...s.querySelectorAll('.trpg-archive-row')].filter(row=>{const b=row.getBoundingClientRect();return b.top>=box.top&&b.bottom<=box.bottom;}).length,scrollHeight:s.clientHeight,height:innerHeight,parentScroll:n.scrollHeight-n.clientHeight,dock:d.getBoundingClientRect().toJSON()};});
            if(width<650){assert.ok(metrics.first<metrics.height*.34,JSON.stringify(metrics));assert.ok(metrics.visible>=3,JSON.stringify(metrics));assert.equal(metrics.parentScroll,0);assert.ok(metrics.dock.bottom<=metrics.height+1);}
            return metrics;
        }
        async function checkLayout(){
            const layout=await page.locator('dialog').evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth,overflow:[...node.querySelectorAll('.trpg-browser,.trpg-lore-panel,.trpg-archive-row,.trpg-archive-tools')].filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+2).map(n=>n.className)}));
            assert.ok(layout.scroll<=layout.width+2,JSON.stringify(layout));assert.deepEqual(layout.overflow,[],`overflow at ${width}`);
        }
        async function screenshot(name){await checkLayout();await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:path.join(output,`${name}-${width}.png`)});}
        await load();const initial=await state();assert.equal(await npc.locator('.trpg-archive-row').count(),20);
        const normalMetrics=await assertListSpace(npc);
        await screenshot('characters');
        const scroller=npc.locator('[data-npc-scroll]');await scroller.evaluate(n=>n.scrollTop=260);const scrollBefore=await scroller.evaluate(n=>n.scrollTop),dockBefore=await npc.locator('.trpg-archive-dock').boundingBox();
        await openTools();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),true);assert.equal(await menu.isVisible(),false);assert.equal(await scroller.evaluate(n=>n.scrollTop),scrollBefore);assert.equal(await page.locator('[data-archive-options-toggle]').evaluate(n=>n===document.activeElement),true);
        await scroller.evaluate(n=>n.scrollTop=520);assert.equal((await npc.locator('.trpg-archive-dock').boundingBox()).y,dockBefore.y);await scroller.evaluate(n=>n.scrollTop=0);
        if(width<650){
            const area=await scroller.boundingBox(),cdp=await page.context().newCDPSession(page);
            const x=area.x+area.width/2,y=area.y+area.height*.8;
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
            for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*25}]});await page.evaluate(()=>new Promise(requestAnimationFrame));}
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
            await page.waitForFunction(()=>document.querySelector('[data-npc-scroll]').scrollTop>100);
            assert.equal(await page.locator('dialog').getAttribute('data-view'),'list','swiping over a row must not open its profile');
            assert.equal((await npc.locator('.trpg-archive-dock').boundingBox()).y,dockBefore.y);await cdp.detach();await scroller.evaluate(n=>n.scrollTop=0);
            await npc.locator('[data-search]').focus();await page.setViewportSize({width,height:480});await page.waitForFunction(()=>document.querySelector('dialog').classList.contains('trpg-keyboard-open'));
            const inputBox=await npc.locator('[data-search]').boundingBox(),listBox=await scroller.boundingBox();assert.ok(inputBox.y>=0&&inputBox.y+inputBox.height<480);assert.ok(listBox.height>100);
            await page.evaluate(()=>document.activeElement.blur());await page.setViewportSize({width,height:width===320?700:844});await page.waitForFunction(()=>!document.querySelector('dialog').classList.contains('trpg-keyboard-open'));
        }
        await npc.locator('[data-archive-filter=disabled]').click();assert.equal(await npc.locator('.trpg-archive-row').count(),16);
        assert.equal(await npc.locator('.trpg-archive-row:not(.is-disabled)').count(),0);
        assert.equal(await npc.locator('.is-disabled').first().evaluate(n=>getComputedStyle(n).borderTopStyle),'dashed');
        const id=await npc.locator('.trpg-archive-row').first().getAttribute('data-archive-id');
        await npc.locator('.trpg-archive-switch').first().click();await waitSaved();assert.equal((await state()).character.find(n=>n.id===id).enabled,true);
        assert.equal(await npc.locator('.trpg-archive-row').count(),15);assert.equal(await npc.locator('[data-archive-filter=disabled]').getAttribute('aria-pressed'),'true');
        await npc.locator('[data-archive-undo]').click();await waitSaved();assert.equal(await npc.locator('.trpg-archive-row').count(),16);
        await npc.locator('[data-archive-filter=all]').click();await npc.locator('[data-archive-select-mode]').click();
        await assertListSpace(npc);
        await choice(npc,'select-page');assert.match(await npc.locator('.trpg-archive-selected-count').innerText(),/20/);
        await npc.locator('[data-pagination] button').last().click();assert.match(await npc.locator('.trpg-archive-selected-count').innerText(),/20/);
        await npc.locator('[data-archive-select]').first().check();assert.match(await npc.locator('.trpg-archive-selected-count').innerText(),/21/);
        await npc.locator('[data-search]').fill('Roxy');assert.match(await npc.locator('.trpg-archive-selected-count').innerText(),/0/);
        await npc.locator('[data-archive-filter=disabled]').click();await choice(npc,'select-results');
        const targets=await npc.locator('[data-archive-select]:checked').evaluateAll(nodes=>nodes.map(n=>n.dataset.archiveSelect));assert.equal(targets.length,2);
        await npc.locator('[data-search]').scrollIntoViewIfNeeded();await screenshot('characters-batch');
        const before=await state();await npc.locator('[data-archive-enable]').click();await waitSaved();const after=await state();
        assert.equal(after.persistCount,before.persistCount+1,'batch must persist once');
        for(const old of before.character){const current=after.character.find(n=>n.id===old.id);assert.equal(current.enabled,targets.includes(old.id)?true:old.enabled);assert.equal(current.notes,old.notes);assert.deepEqual(current.alternateProfiles,old.alternateProfiles);}
        assert.equal(await npc.locator('.trpg-archive-row').count(),0);await choice(npc,'undo');await waitSaved();
        await choice(npc,'select-page');await page.evaluate(()=>window.failSave=true);const failureBefore=await state();
        await npc.locator('[data-archive-enable]').click();await waitSaved();assert.match(await page.locator('dialog [role=status]').innerText(),/failed/);assert.deepEqual((await state()).character,failureBefore.character);
        assert.equal(await npc.locator('[data-archive-select]:checked').count(),2);assert.equal(await npc.locator('[data-archive-enable]').isEnabled(),true);await page.evaluate(()=>window.failSave=false);
        await openTools();await page.locator('[data-scope-select]').selectOption('chat');assert.equal(await npc.locator('[data-archive-select]').count(),0);assert.equal(await npc.locator('[data-archive-undo]').isVisible(),false);
        assert.equal(await npc.locator('[data-archive-filter=all]').getAttribute('aria-pressed'),'true');assert.deepEqual((await state()).local,initial.local);
        // No stale write can reach a different card/chat when a save finishes late.
        await page.evaluate(()=>window.deferSave=true);await npc.locator('.trpg-archive-switch').first().click();await page.waitForFunction(()=>typeof window.finishSave==='function');
        assert.equal(await page.locator('[data-scope-select]').isDisabled(),true);assert.equal(await npc.locator('[data-search]').isDisabled(),true);
        const deferredBefore=await state();await page.evaluate(()=>{window.previewSwitch('another-card','another-chat');window.finishSave();window.deferSave=false;});
        await page.waitForFunction(()=>!document.querySelector('dialog').open);assert.deepEqual((await state()).local,deferredBefore.local);
        // Lore uses strict enabled=true semantics, keywords and the existing budget.
        await load();await page.locator('[data-management-tab=lore]').click();const loreInitial=await state();
        assert.equal(await menu.locator('[data-lore-preferences]').evaluate(n=>n.open),false);assert.equal(await lore.locator('.trpg-lore-row').count(),20);await assertListSpace(lore);await screenshot('lore');
        await lore.locator('[data-archive-filter=disabled]').click();assert.equal(await lore.locator('.trpg-lore-row').count(),14);
        const loreId=await lore.locator('.trpg-lore-row').first().getAttribute('data-archive-id');await lore.locator('[data-archive-toggle]').first().click();await waitSaved();assert.equal((await state()).lore.find(n=>n.id===loreId).enabled,true);
        await lore.locator('[data-archive-undo]').click();await waitSaved();assert.deepEqual((await state()).lore,loreInitial.lore);
        await lore.locator('[data-archive-filter=all]').click();await lore.locator('[data-lore-search]').fill('ฟิตโตอา');assert.equal(await lore.locator('.trpg-lore-row').count(),7,'keywords must be searchable');
        await lore.locator('[data-lore-search]').fill('');await lore.locator('[data-archive-select-mode]').click();await choice(lore,'select-page');
        await lore.locator('[data-lore-pagination] button').last().click();assert.match(await lore.locator('.trpg-archive-selected-count').innerText(),/20/);
        await choice(lore,'select-results');assert.match(await lore.locator('.trpg-archive-selected-count').innerText(),/43/);
        await preferences();await menu.locator('[name=loreBudget]').fill('1000');await menu.locator('[name=loreMode]').selectOption('all');
        await menu.getByRole('button',{name:'บันทึกงบและโหมด',exact:true}).click();await waitSaved();
        await closeTools();await lore.locator('[data-archive-enable]').click();await waitSaved();
        assert.match(await page.locator('dialog [role=status]').innerText(),/1,000/);assert.deepEqual((await state()).lore,loreInitial.lore);assert.match(await lore.locator('.trpg-archive-selected-count').innerText(),/43/);
        await preferences();await menu.locator('[name=loreBudget]').fill('60000');await menu.locator('[name=loreMode]').selectOption('relevant');await menu.getByRole('button',{name:'บันทึกงบและโหมด',exact:true}).click();await waitSaved();
        await closeTools();const beforeLoreSave=(await state()).persistCount;await lore.locator('[data-archive-enable]').click();await waitSaved();
        const activated=await state();assert.equal(activated.persistCount,beforeLoreSave+1);assert.ok(activated.lore.every(n=>n.enabled));
        for(const old of loreInitial.lore){const current=activated.lore.find(n=>n.id===old.id);assert.equal(current.content,old.content);assert.deepEqual(current.keywords,old.keywords);assert.equal(current.always,old.always);}
        await choice(lore,'undo');await waitSaved();assert.deepEqual((await state()).lore,loreInitial.lore);
        await lore.locator('[data-archive-filter=disabled]').click();await choice(lore,'select-results');await lore.locator('[data-lore-search]').scrollIntoViewIfNeeded();await screenshot('lore-batch');
        // Unsaved budget values cannot be discarded by a one-click row toggle.
        await preferences();await menu.locator('[name=loreBudget]').fill('70000');await closeTools();discard=false;
        await lore.locator('[data-archive-toggle]').first().click();await waitSaved();await openTools();assert.equal(await menu.locator('[name=loreBudget]').inputValue(),'70000');await closeTools();assert.deepEqual((await state()).lore,loreInitial.lore);discard=true;
        // A stale list must never write another card's Lore, even without an event.
        await page.evaluate(()=>window.previewSwitch('other-card','preview-chat',{emit:false}));await lore.locator('[data-archive-enable]').click();await waitSaved();assert.match(await page.locator('dialog [role=status]').innerText(),/การ์ดเปลี่ยน/);assert.deepEqual((await state()).lore,[]);
        assert.equal((await state()).requests,0);
        // English labels and pathological imported names also fit a narrow phone.
        await page.goto(url+'?lang=en');await page.waitForFunction(()=>window.previewReady);
        assert.match(await npc.locator('[data-archive-filter=enabled]').innerText(),/^Enabled/);await checkLayout();
        await page.evaluate(async()=>{
            const saved=window.previewState(),sample=saved.character[0];
            const records=Array.from({length:200},(_,i)=>({...sample,id:`long-${i}`,name:`${String(i).padStart(3,'0')} ${'LongImportedName'.repeat(8)}`,occupation:'Long occupation '.repeat(5),location:'Long location '.repeat(7),enabled:i%2===0}));
            await window.previewData.persistScope('character',records,'test',saved.chat,saved.owner);window.workspace.refresh();
        });
        assert.equal(await npc.locator('.trpg-archive-row').count(),20);await checkLayout();
        await npc.locator('[data-archive-select-mode]').click();await choice(npc,'select-results');assert.match(await npc.locator('.trpg-archive-selected-count').innerText(),/200/);await checkLayout();
        assert.deepEqual(errors,[]);report.push({width,pass:true,languages:['th','en'],maximumNpcRecords:200,listTop:normalMetrics.first,visibleNpcRows:normalMetrics.visible,listViewportHeight:normalMetrics.scrollHeight});await page.close();
        console.log(`PASS archive QoL ${width}: filters, quick toggle, cross-page selection, single-save batches, Undo, failures, scope guards, budget, draft protection, no overflow`);
    }
    const version=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')).version;
    await writeFile(path.join(root,'docs/previews/archive-qol/validation.json'),JSON.stringify({version,testedAt:new Date().toISOString(),productionModules:['src/npc-workspace.js','src/lore-workspace.js','src/archive-browser.js','styles/npc-ui.css'],viewports:report,liveUserServerAccess:false,aiRequests:0},null,2)+'\n');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
