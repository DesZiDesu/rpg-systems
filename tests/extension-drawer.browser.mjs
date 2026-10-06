// Production loader in an isolated host: organized settings, responsive panes,
// preserved actions, actual saved preferences and runtime settings workspaces.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/extension-drawer.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = new URL('../', import.meta.url), base = '/scripts/extensions/third-party/rpg-systems/';
const artifacts = process.env.DRAWER_SCREENSHOT_DIR || '/workspace/artifacts/roleforge-drawer-0461';
await mkdir(artifacts, {recursive:true});
const template = await readFile(new URL('templates/settings.html', root), 'utf8');
const ids = [...template.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const fixture = pane => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--mainFontSize:14px;--SmartThemeBodyColor:#ece7da;--SmartThemeBlurTintColor:#161616;--SmartThemeBorderColor:#444;--SmartThemeQuoteColor:#b3b3b3;--white30a:rgba(255,255,255,.3);--grey30a:rgba(128,128,128,.3);--black70a:rgba(0,0,0,.7)}
body{margin:0;background:#090909;color:var(--SmartThemeBodyColor);font:var(--mainFontSize) system-ui,sans-serif}
#extensions_settings2{width:${pane};max-width:100%;box-sizing:border-box;padding:8px}
/* SillyTavern release/public/style.css: native width:min-content reproduced the
   mobile button collapse. Keep these host rules in this production fixture. */
.menu_button{color:var(--SmartThemeBodyColor);filter:grayscale(.5);background-color:var(--SmartThemeBlurTintColor);border:1px solid var(--SmartThemeBorderColor);border-radius:5px;padding:3px 5px;width:min-content;cursor:pointer;margin:5px 0;display:flex;align-items:center;justify-content:center;text-align:center}
#extensions_settings2 .inline-drawer-toggle.inline-drawer-header{background-image:linear-gradient(348deg,var(--white30a) 2%,var(--grey30a) 10%,var(--black70a) 95%,var(--SmartThemeQuoteColor) 100%);margin-bottom:5px;border-radius:10px;padding:2px 5px;border:1px solid var(--SmartThemeBorderColor)}
.inline-drawer-header{display:flex;justify-content:space-between;align-items:center;padding:5px 0;cursor:pointer}
.inline-drawer-icon{display:block;cursor:pointer;font-size:calc(var(--mainFontSize)*1.5);filter:brightness(75%)}
.checkbox_label{display:flex;flex-direction:row;column-gap:5px;align-items:baseline}
.inline-drawer-content{display:none}.inline-drawer.is-open>.inline-drawer-content{display:block}
#extensionsMenu,#chat,#send_textarea,#extensionsMenuButton{display:none}
</style></head><body>
<button id="extensionsMenuButton">Extensions</button><div id="extensionsMenu"></div>
<div id="extensions_settings2"><div id="native-neighbour" class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header interactable"><b>Regular Expression</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down" aria-hidden="true"></div></div></div></div><div id="chat"></div><textarea id="send_textarea"></textarea>
<script>
const callbacks=new Map(),eventTypes=Object.fromEntries(['CHAT_CHANGED','MESSAGE_SENT','GENERATION_STARTED','GENERATION_AFTER_COMMANDS','MESSAGE_RECEIVED','MESSAGE_SWIPED','MESSAGE_DELETED','MESSAGE_EDITED','MESSAGE_UPDATED','CHARACTER_MESSAGE_RENDERED','GENERATION_ENDED','GENERATION_STOPPED','STREAM_TOKEN_RECEIVED'].map(type=>[type,type]));
const initial={tretaresia_rpg:{language:'th',autoTrack:false,injectState:false,autoContinuity:false,chatPresentation:false,showSceneTracker:false,memoryAutoSummary:false}};
window.aiRequests=0;window.notices=[];
window.host={extensionSettings:JSON.parse(localStorage.getItem('rf-drawer-settings')||'null')||initial,chatMetadata:{},
 chat:[{is_user:true,name:'ผู้เล่น',mes:'ฉันเดินไปที่แม่น้ำ'},{is_user:false,name:'ผู้บรรยาย',mes:'คอร่ายืนอยู่ข้างแม่น้ำและโบกมือทักทาย'}],
 characters:[{name:'Drawer test',avatar:'drawer-test.png',first_mes:'',data:{extensions:{}}}],characterId:0,eventTypes,
 eventSource:{on(type,fn){const list=callbacks.get(type)||[];list.push(fn);callbacks.set(type,list);},off(type,fn){callbacks.set(type,(callbacks.get(type)||[]).filter(next=>next!==fn));},async emit(type,...args){await Promise.all((callbacks.get(type)||[]).map(fn=>fn(...args)));}},
 getCurrentChatId:()=> 'drawer-test',getRequestHeaders:()=>({'Content-Type':'application/json'}),
 saveSettingsDebounced(){localStorage.setItem('rf-drawer-settings',JSON.stringify(this.extensionSettings));},saveMetadata:async()=>{},setExtensionPrompt(){},
 generateRaw:async()=>{window.aiRequests++;return '{}';},
 renderExtensionTemplateAsync:async(folder,name)=>{const response=await fetch('/scripts/extensions/'+folder+'/'+name+'.html');if(!response.ok)throw Error('Template '+response.status);return response.text();}};
window.SillyTavern={getContext:()=>window.host,libs:{}};
window.toastr={error:message=>window.notices.push(message),warning:message=>window.notices.push(message),info:message=>window.notices.push(message),success:message=>window.notices.push(message)};
document.addEventListener('click',event=>{const toggle=event.target.closest('.inline-drawer-toggle');if(!toggle)return;const drawer=toggle.closest('.inline-drawer');drawer.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(drawer.classList.contains('is-open')));});
</script><script type="module" src="${base}loader.js"></script></body></html>`;
const server = http.createServer(async(request, response) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname === '/') {response.setHeader('content-type', 'text/html');response.end(fixture(url.searchParams.get('pane') === '300' ? '300px' : '100%'));return;}
        if (url.pathname.startsWith('/api/')) {response.setHeader('content-type','application/json');response.end('[]');return;}
        if (!url.pathname.startsWith(base) || url.pathname.includes('..')) {response.writeHead(404).end();return;}
        const path = url.pathname.slice(base.length), data = await readFile(new URL(path, root));
        response.setHeader('content-type', path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html' : path.endsWith('.json') ? 'application/json' : path.endsWith('.js') ? 'text/javascript' : 'image/webp');response.end(data);
    } catch {response.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

async function ready(page) {
    await page.waitForFunction(() => window.TretaresiaRelease && document.querySelector('#tretaresia-presentation-settings .trpg-settings'));
    await page.locator('#tretaresia-rpg-settings .inline-drawer-toggle').click();
    await page.locator('#tretaresia-rpg-open-from-settings').waitFor({state:'visible'});
}
async function openFold(page, selector) {
    const fold = page.locator(selector);
    if (!await fold.evaluate(node => node.open)) await fold.locator(':scope > summary').click();
    assert(await fold.evaluate(node => node.open));
}
async function fit(page, name) {
    const metrics = await page.locator('#tretaresia-rpg-settings').evaluate(node => {
        const outer = node.getBoundingClientRect();
        const wide = [...node.querySelectorAll('*')].filter(child => {
            const rect = child.getBoundingClientRect();
            return rect.width && rect.height && (rect.left < outer.left - 1 || rect.right > outer.right + 1);
        }).slice(0, 8).map(child => ({id:child.id,class:child.className,left:child.getBoundingClientRect().left,right:child.getBoundingClientRect().right}));
        const sections = [...node.querySelector('.rf-settings-sections').children].map(child => child.getBoundingClientRect());
        return {width:innerWidth,left:outer.left,right:outer.right,client:node.clientWidth,scroll:node.scrollWidth,wide,overlap:sections.some((rect,index) => index && sections[index-1].bottom > rect.top + 1),document:document.documentElement.scrollWidth};
    });
    assert(metrics.left >= -1 && metrics.right <= metrics.width + 1 && metrics.scroll <= metrics.client + 1 && metrics.document <= metrics.width + 1 && !metrics.overlap && !metrics.wide.length, `${name}: ${JSON.stringify(metrics)}`);
}

let browser;
try {
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    const scenarios = [{width:320,pane:'full'}, {width:390,pane:'full'}, {width:1280,pane:'300'}, {width:1280,pane:'full'}];
    for (const {width,pane} of scenarios) {
        const page = await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}), errors = [];
        page.setDefaultTimeout(15000);page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
        await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType:'text/css',body:''}));
        await page.goto(`http://127.0.0.1:${server.address().port}/?pane=${pane}`);await ready(page);
        const settings = page.locator('#tretaresia-rpg-settings'), name = `${width}-${pane}`;
        for (const id of ids) assert.equal(await settings.locator(`[id="${id}"]`).count(), id === 'tretaresia-rpg-settings' ? 0 : 1, `original/new hook ${id} retained exactly once`);
        assert.equal(await settings.locator('.rf-settings-fold').count(),5);
        assert.equal(await settings.locator('.rf-settings-fold[open]').count(),0,'advanced groups begin collapsed');
        assert.equal(await page.locator('#tretaresia-presentation-settings [data-presentation-setting]').count(),3);
        assert.equal(await settings.locator(':scope > .trpg-settings').count(),0,'NPC runtime settings stay inside their dedicated group');
        assert.equal(await page.locator('.trpg-presentation-status').count(),1);
        assert.match(await page.locator('.trpg-presentation-status').innerText(), /RoleForge.*คำตอบล่าสุดไม่มีบล็อกจัดรูปแบบ/);
        assert.equal(await page.locator('#roleforge-optional-settings [data-optional-setting]').count(),9);
        // Compare with a neighbouring native extension, including the closed
        // header: RoleForge must inherit the host typography, colour and chrome.
        const nativeStyle = await page.locator('#native-neighbour .inline-drawer-header').evaluate(node => {
            const style=getComputedStyle(node);return [style.color,style.fontFamily,style.padding,style.borderRadius,style.backgroundImage];
        });
        const roleforgeStyle = await settings.locator('.inline-drawer-header').evaluate(node => {
            const style=getComputedStyle(node);return [style.color,style.fontFamily,style.padding,style.borderRadius,style.backgroundImage];
        });
        assert.deepEqual(roleforgeStyle,nativeStyle,'drawer header matches native extensions');
        assert.equal(await settings.locator('.rf-settings-brand').count(),0,'drawer has no oversized branded hero');
        const actions = await settings.locator('.rf-settings-quick-actions').evaluate(node => {
            const rect=node.getBoundingClientRect();return {width:rect.width,children:[...node.children].map(button=>{
                const box=button.getBoundingClientRect();return {width:box.width,height:box.height,text:button.innerText};
            })};
        });
        for(const action of actions.children){
            assert(action.width >= (actions.width-8)/2-1,`native min-content must not shrink the action button: ${JSON.stringify(actions)}`);
            assert(action.height <= 62,`action wraps by words, never one letter per row: ${JSON.stringify(actions)}`);
        }
        await fit(page, `${name} default`);
        await settings.locator('.inline-drawer-toggle').click();
        await page.locator('#extensions_settings2').screenshot({path:`${artifacts}/drawer-closed-${name}.png`});
        await settings.locator('.inline-drawer-toggle').click();
        await settings.screenshot({path:`${artifacts}/drawer-${name}.png`});

        // These click the production handlers. Opening either UI does not make
        // a generation request or submit the Manual Sync form.
        await page.locator('#tretaresia-rpg-open-from-settings').click();
        await page.locator('#tretaresia-rpg-overlay.is-ready').waitFor({state:'visible'});
        await page.locator('#tretaresia-rpg-close').click();
        await page.locator('#tretaresia-rpg-sync-from-settings').click();
        await page.locator('#tretaresia-manual-sync [data-form="manual-sync"]').waitFor({state:'visible'});
        await page.locator('#tretaresia-manual-sync header [data-action="close-manual-sync"]').click();
        await page.locator('#tretaresia-rpg-close').click();
        await page.locator('#tretaresia-presentation-settings [data-trpg-open]').click();
        await page.locator('.trpg-manager[open]').waitFor({state:'visible'});
        await page.locator('.trpg-manager [data-close]').click();

        await page.locator('#tretaresia-rpg-roleplay-language').selectOption('th');
        await page.locator('#tretaresia-rpg-activity-indicator').selectOption('compact');
        await page.locator('#tretaresia-rpg-show-scene-tracker').check();
        await page.locator('#tretaresia-presentation-settings [data-presentation-setting="preserveNativeChat"]').check();
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rf-drawer-settings')).tretaresia_rpg);
        assert.equal(saved.roleplayLanguage,'th');assert.equal(saved.activityIndicator,'compact');assert.equal(saved.showSceneTracker,true);assert.equal(saved.preserveNativeChat,true);
        await page.reload();await ready(page);
        assert.equal(await page.locator('#tretaresia-rpg-roleplay-language').inputValue(),'th');
        assert.equal(await page.locator('#tretaresia-rpg-activity-indicator').inputValue(),'compact');
        assert(await page.locator('#tretaresia-rpg-show-scene-tracker').isChecked());
        assert(await page.locator('[data-presentation-setting="preserveNativeChat"]').isChecked());

        // Locale changes refresh translated groups without replacing their
        // runtime controls, saved values, listeners or unsent inputs.
        await page.locator('#tretaresia-rpg-language').selectOption('en');
        assert.match(await settings.locator('.tretaresia-rpg-settings-copy').first().innerText(),/persistent RoleForge role-play state/);
        assert.equal(await page.locator('#tretaresia-presentation-settings [data-presentation-setting]').count(),3);
        await page.locator('#tretaresia-rpg-language').selectOption('th');

        const folds = settings.locator('.rf-settings-fold');
        for (const fold of await folds.all()) await fold.locator(':scope > summary').click();
        await openFold(page,'#roleforge-power-settings');await openFold(page,'#roleforge-forge-settings');
        await page.locator('#roleforge-power-editor .rf-power-workspace').waitFor();
        await page.locator('#roleforge-forge-editor .rf-forge-workspace').waitFor();
        assert.equal(await page.locator('#roleforge-writing-settings [data-adult-list]').count(),1);
        assert.equal(await page.locator('#roleforge-diagnostics-settings [data-tretaresia-request-usage]').count(),1);
        assert(await page.locator('#roleforge-diagnostics-settings [data-tretaresia-request-usage]').isVisible());
        await page.locator('#tretaresia-rpg-density').selectOption('compact');
        await page.locator('#tretaresia-rpg-glow').evaluate(node => {node.value='24';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
        const advanced = await page.evaluate(() => JSON.parse(localStorage.getItem('rf-drawer-settings')).tretaresia_rpg);
        assert.equal(advanced.density,'compact');assert.equal(Number(advanced.glowStrength),24);
        for (const details of await settings.locator('details').all()) if (!await details.evaluate(node => node.open)) await details.locator(':scope > summary').click();
        await fit(page, `${name} all advanced groups`);
        assert.equal(await page.evaluate(() => window.aiRequests),0,'opening settings/managers and changing local preferences makes no model calls');
        assert.deepEqual(errors,[]);
        console.log(`PASS organized drawer, preserved hooks/actions, persistence, dynamic workspaces and expanded geometry at ${width}px / ${pane} pane`);
        await page.close();
    }
} finally {
    await browser?.close();await new Promise(resolve => server.close(resolve));
}
