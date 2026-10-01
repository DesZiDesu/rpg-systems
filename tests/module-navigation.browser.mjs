// Browser coverage for the production module navigation component, including
// mobile layout, native host control styles, accessibility and direct actions.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/module-navigation.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root=new URL('../',import.meta.url), artifacts=process.env.MODULE_NAVIGATION_SCREENSHOT_DIR || '/workspace/artifacts/module-navigation-preview';
await mkdir(artifacts,{recursive:true});
const fixture=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/module-navigation.css">
<style>body{margin:0;background:#090a08;color:#eee9de;font:14px system-ui,sans-serif}button{width:min-content;display:flex;font-size:18px;margin:5px 0;filter:grayscale(.5);border-radius:8px}select{width:100%;font-size:18px}#tretaresia-rpg-overlay{width:100%;max-width:860px;margin:auto;overflow:hidden}.fixture-heading{display:flex;justify-content:space-between;padding:22px 20px 18px;border-bottom:1px solid #7b6634}.fixture-heading small{display:block;letter-spacing:2px;color:#b8a06a;font-size:8px}.fixture-heading strong{display:block;letter-spacing:1px;color:#e3c77b;font-size:23px;margin-top:5px}.fixture-heading span{align-self:center;color:#b9b09b;font-size:23px}.old-carousel{display:flex;justify-content:space-between;align-items:center;border:1px solid #6d5d37;color:#dbbf71;margin:12px;padding:22px 14px;font-size:16px;letter-spacing:2px}.fixture-content{height:770px;padding:25px 20px;background:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:40px 40px}.fixture-content h1{font-size:21px;font-weight:500;letter-spacing:1px}.fixture-content p{color:#827b67;font-size:13px}</style></head><body>
<div id="tretaresia-rpg-overlay"><header class="fixture-heading"><div><small>ROLEFORGE ROLE-PLAY</small><strong>ROLEFORGE</strong></div><span>×</span></header><div id="carousel" class="old-carousel"><span>‹</span><span>STATUS</span><span>01 / 17</span><span>›</span></div><nav id="navigation"></nav><main class="fixture-content"><h1 id="active-title">Status</h1><p>Character overview</p></main></div>
<script type="module">
import {mountModuleNavigation} from '/src/module-navigation.js';
const ids=['status','scene','inventory','skills','techniques','quests','memories','summaries','agenda','rank','groups','household','npcs','hstats','mail','music','systems'];
const en=['Status','Scene','Inventory','Skills','Powers','Quests','Story Memory','Memory Summaries','Appointments','Rank','Party & Guild','Household','NPCs','H-Stats','Mailbox','Music','System Audit'];
const th=['สถานะ','ฉากปัจจุบัน','กระเป๋า','สกิล','พลัง','เควสต์','ความทรงจำเนื้อเรื่อง','สรุปความทรงจำ','นัดหมาย','แรงก์','ปาร์ตี้และกิลด์','ครัวเรือน','NPC','H-Stats','จดหมาย','เพลง','ตรวจสอบระบบ'];
const language=new URLSearchParams(location.search).get('language')||'en';
window.tabs=ids.map((id,index)=>({id,label:(language==='th'?th:en)[index]}));window.activations=[];
// Layout belongs to Extension Settings; the component accepts only updates.
window.setMode=mode=>{localStorage.setItem('rf-nav-mode',mode);window.navigation.update({mode});};
window.navigation=mountModuleNavigation({host:document.querySelector('#navigation'),carousel:document.querySelector('#carousel'),tabs:window.tabs,activeId:'status',language,mode:localStorage.getItem('rf-nav-mode')||'carousel',onActivate(id){window.activations.push(id);document.querySelector('#active-title').textContent=window.tabs.find(tab=>tab.id===id).label;}});
window.ready=true;
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
    try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end(fixture);return;}
        if(!/^\/(src|styles)\/[a-z0-9-]+\.(js|css)$/.test(url.pathname)){res.writeHead(404).end();return;}
        res.setHeader('content-type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(new URL(url.pathname.slice(1),root)));
    }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280])for(const language of ['en','th']){
        const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/?language=${language}`);
        await page.waitForFunction(()=>window.ready);
        const original=await page.locator('#carousel').innerHTML();
        assert(await page.locator('#carousel').isVisible());
        assert.equal(await page.locator('[data-rf-nav-mode], .rf-nav-preferences').count(),0,'layout chooser is absent from the RPG modal');
        assert(!await page.locator('#navigation').isVisible(),'classic carousel has no additional navigation row');
        assert.equal(await page.locator('#navigation').innerHTML(),'');
        await page.evaluate(()=>window.setMode('menu'));
        assert(!await page.locator('#carousel').isVisible());
        assert.equal(await page.locator('#carousel').innerHTML(),original,'classic DOM is preserved');
        await page.locator('[data-rf-nav-launch]').click();
        assert.equal(await page.locator('[data-rf-nav-tab]').count(),17);
        assert.equal(await page.locator('[data-rf-nav-launch]').getAttribute('aria-expanded'),'true');
        await page.evaluate(()=>window.navigation.update({activeId:'status',tabs:window.tabs.map(tab=>({...tab}))}));
        assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-rf-nav-search')),true,'unchanged progress refresh keeps search focus');
        if(language==='en'){
            await page.locator('[data-rf-nav-search]').fill('summ');
            assert.equal(await page.locator('[data-rf-nav-tab]').count(),1);
            assert.equal(await page.locator('[data-rf-nav-tab]').getAttribute('data-rf-nav-tab'),'summaries');
            await page.locator('[data-rf-nav-search]').fill('definitely no such module');
            assert.equal(await page.locator('[data-rf-nav-tab]').count(),0);
            assert(await page.locator('.rf-nav-empty').isVisible());
            await page.locator('[data-rf-nav-search]').fill('');
        }
        await page.locator('[data-rf-nav-search]').press('ArrowDown');
        assert.equal(await page.evaluate(()=>document.activeElement.dataset.rfNavTab),'status');
        await page.keyboard.press('End');
        assert.equal(await page.evaluate(()=>document.activeElement.dataset.rfNavTab),'systems');
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-rf-nav-launch')),true);
        assert.equal(await page.locator('[data-rf-nav-launch]').getAttribute('aria-expanded'),'false');
        await page.locator('[data-rf-nav-launch]').click();
        await page.locator('.rf-nav-picker').screenshot({path:`${artifacts}/menu-${width}-${language}.png`});
        await page.locator('[data-rf-nav-tab="summaries"]').click();
        assert.deepEqual(await page.evaluate(()=>window.activations),['summaries']);
        assert.equal(await page.locator('[data-rf-nav-launch]').getAttribute('aria-expanded'),'false');
        assert.match(await page.locator('.rf-nav-current-label').innerText(),language==='th'?/สรุปความทรงจำ/:/Memory Summaries/);
        await page.evaluate(()=>window.setMode('grid'));
        await page.locator('[data-rf-nav-launch]').click();
        assert.equal(await page.locator('[data-rf-nav-tab]').count(),17);
        assert.equal(await page.locator('[aria-current="page"]').getAttribute('data-rf-nav-tab'),'summaries');
        // Every module is a normal keyboard-focusable button in both layouts.
        assert(await page.locator('[data-rf-nav-tab]').evaluateAll(nodes=>nodes.every(node=>node.tabIndex===0)));
        const fit=await page.locator('#navigation').evaluate(node=>{
            const outer=node.getBoundingClientRect(),visible=[...node.querySelectorAll('*')].filter(child=>{const rect=child.getBoundingClientRect();return rect.width&&rect.height;});
            return {document:document.documentElement.scrollWidth,viewport:innerWidth,wide:visible.filter(child=>{const rect=child.getBoundingClientRect();return rect.left<outer.left-1||rect.right>outer.right+1;}).map(child=>child.className)};
        });
        assert(fit.document<=fit.viewport+1&&!fit.wide.length,`${width}/${language}: ${JSON.stringify(fit)}`);
        if(width===390){
            const grid=await page.locator('.rf-nav-picker').evaluate(picker=>{
                const buttons=[...picker.querySelectorAll('[data-rf-nav-tab]')],character=buttons.slice(0,5);
                const bounds=picker.getBoundingClientRect();
                return {columns:new Set(character.map(button=>button.getBoundingClientRect().top)).size,
                    targets:buttons.every(button=>button.getBoundingClientRect().width>=44&&button.getBoundingClientRect().height>=44),
                    allVisible:buttons.every(button=>button.getBoundingClientRect().top>=bounds.top&&button.getBoundingClientRect().bottom<=bounds.bottom)};
            });
            assert.equal(grid.columns,1,'five character modules occupy a single row at 390px');
            assert(grid.targets,'all module targets meet 44px minimum size');
            assert(grid.allVisible,'all seventeen modules are visible without scrolling at 390px');
        }
        const iconBounds=await page.locator('.rf-nav-choice .rf-nav-icon').evaluateAll(nodes=>nodes.map(svg=>{
            const bounds=svg.getBBox();return {id:svg.closest('[data-rf-nav-tab]').dataset.rfNavTab,x:bounds.x,y:bounds.y,right:bounds.x+bounds.width,bottom:bounds.y+bounds.height};
        }));
        assert(iconBounds.every(bounds=>bounds.x>=1&&bounds.y>=1&&bounds.right<=23&&bounds.bottom<=23),`inset SVG contours: ${JSON.stringify(iconBounds)}`);
        await page.locator('.rf-nav-picker').screenshot({path:`${artifacts}/grid-${width}-${language}.png`});
        await page.locator('[data-rf-nav-tab="npcs"]').click();
        assert.deepEqual(await page.evaluate(()=>window.activations),['summaries','npcs']);
        await page.reload();await page.waitForFunction(()=>window.ready);
        assert.equal(await page.locator('#navigation').getAttribute('data-mode'),'grid','mode persists through Extension Settings owner');
        assert.equal(await page.locator('[data-rf-nav-mode], .rf-nav-preferences').count(),0);
        await page.evaluate(()=>window.navigation.update({activeId:'music'}));
        assert.match(await page.locator('.rf-nav-current-label').innerText(),language==='th'?/เพลง/:/Music/);
        await page.evaluate(()=>window.setMode('carousel'));
        assert(!await page.locator('#navigation').isVisible());
        assert.equal(await page.locator('#navigation').innerHTML(),'');
        assert(await page.locator('#carousel').isVisible());
        assert.equal(await page.locator('#carousel').innerHTML(),original);
        await page.evaluate(()=>window.navigation.destroy());
        assert.equal(await page.locator('#navigation').innerHTML(),'');
        assert(await page.locator('#carousel').isVisible());
        assert.deepEqual(errors,[]);
        await page.close();
        console.log(`module navigation: ${width}px / ${language} passed`);
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
