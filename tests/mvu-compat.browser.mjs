// Actual RoleForge + pinned ST Regex/Markdown/sanitizer + actual MVU rules and
// frontend. Helper normal/streaming DOM contracts are adapted; APIs are mocked.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {stRegexHost} from './fixtures/st-regex-host.mjs';
import {mvuRegexHost,gameMakerRevision,builderRevision} from './fixtures/mvu-regex-host.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const [upstream,mvu]=await Promise.all([stRegexHost(),mvuRegexHost()]);
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');
    if(upstream.has(url.pathname)){res.setHeader('content-type','text/javascript');res.end(upstream.get(url.pathname));return;}
    if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
    const path=url.pathname.slice(base.length);let body=await readFile(new URL(path,root));
    if(path==='docs/previews/preview-h-stats.html')body=body.toString().replace('</head>','<script src="/st-regex/showdown.js"></script><script src="/st-regex/purify.js"></script><script src="/st-regex/css.js"></script></head>');
    if(path==='docs/previews/h-stats-fixture.js')body="import {attachHost} from '/st-regex/adapter.js';\n"+body.toString()
        .replace("'MESSAGE_DELETED',","'MESSAGE_DELETED','MESSAGE_EDITED','MESSAGE_UPDATED','USER_MESSAGE_RENDERED',")
        .replace('window.SillyTavern={','attachHost(window.host);\n    window.SillyTavern={');
    res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,url=origin+base+'docs/previews/preview-h-stats.html?lang=en';
const story='<tr-header name="Cora"/><tr-narrative>She waits.</tr-narrative><tr-dialogue name="Cora">Welcome.</tr-dialogue>';
const suffix='\n<StatusPlaceHolderImpl/>\n<UpdateVariable><UpdateAnalysis>HP unchanged.</UpdateAnalysis><JSONPatch>[]</JSONPatch></UpdateVariable>';
async function add(page,text){
    const id=await page.evaluate(text=>{
        window.host.chat.push({name:'Nova',is_user:true,is_system:false,mes:'Continue the scene.'});
        const id=window.host.chat.length,message={name:'Narrator',is_user:false,is_system:false,mes:text,swipe_id:0,swipes:[text]};window.host.chat.push(message);
        const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);
        const body=document.createElement('div');body.className='mes_text';row.append(body);document.querySelector('#chat').append(row);
        window.host.updateMessageBlock(id,message);return id;
    },text);
    await page.evaluate(id=>window.host.eventSource.emit('CHARACTER_MESSAGE_RENDERED',id),id);await page.waitForTimeout(210);return id;
}
async function mode(page,value){await page.locator('[data-presentation-setting="chatRegexMode"]').selectOption(value);await page.waitForTimeout(210);}
const screenshots=process.env.MVU_COMPAT_SCREENSHOT_DIR;
if(screenshots)await mkdir(screenshots,{recursive:true});
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [390,1280]){
        const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));await page.route('https://**/*',route=>route.abort());
        await page.addInitScript(()=>localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',chatRegexMode:'shared',autoTrack:false,autoContinuity:false,showSceneTracker:false,enableVoiceAddon:true,memoryAutoSummary:false}})));
        await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
        await page.evaluate(()=>{
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
            document.querySelector('#chat').style.cssText='display:block;padding:12px;font:16px/1.5 system-ui;box-sizing:border-box';document.querySelector('#extensions_settings2').style.display='block';
            const style=document.createElement('style');style.textContent='.mes_text pre code{display:block;white-space:pre-wrap;overflow-x:auto}.hidden\\!{display:none!important}';document.head.append(style);
        });
        await page.evaluate(()=>window.hStatsPreview.switchChat('mvu-compat',{tretaresia_rpg_state:{player:{name:'Nova'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},location:{place:'Library',narrativeVersion:1}}}));
        await page.locator('[data-presentation-setting="chatPresentation"]').check();
        await page.evaluate(rules=>{window.host.characters[0].data.extensions.regex_scripts=rules;window.host.extensionSettings.character_allowed_regex=[window.host.characters[0].avatar];},mvu.rules);
        const id=await add(page,story+suffix),body=page.locator(`[mesid="${id}"] .mes_text`);
        assert.equal(await body.locator('pre code').count(),1);assert.equal(await body.locator('.trpg-header').count(),1);
        const stat=JSON.parse(mvu.layout.mvuData);stat.Mainchar.Name[0]='CompatibilityHero';
        await page.evaluate(({id,stat})=>{
            window.compatVariables={stat_data:stat};window.compatWrites=0;
            window.waitGlobalInitialized=async()=>{};window.Mvu={events:{VARIABLE_UPDATE_ENDED:'mvu-update'}};window.eventOn=()=>{};
            window.getVariables=()=>structuredClone(window.compatVariables);window.updateVariablesWith=async updater=>{window.compatWrites++;window.compatVariables=await updater(structuredClone(window.compatVariables));};
            const body=document.querySelector(`[mesid="${id}"] .mes_text`),pre=[...body.querySelectorAll('pre')].find(node=>node.textContent.includes('<!DOCTYPE html>'));
            const owner=document.createElement('div');owner.className='TH-render';pre.before(owner);owner.append(pre);
            const frame=document.createElement('iframe');frame.id=frame.name='TH-message--'+id;frame.style.cssText='width:100%;height:700px';frame.srcdoc=pre.querySelector('code').textContent;owner.append(frame);pre.classList.add('hidden!');window.compatFrame=frame;
        },{id,stat});
        await page.waitForFunction(()=>typeof window.compatFrame?.contentWindow.equipItem==='function',null,{timeout:10000});
        assert.equal(await page.evaluate(()=>typeof window.compatFrame.contentWindow.equipItem),'function');
        await page.evaluate(()=>{window.compatDocument=window.compatFrame.contentDocument;window.compatParent=window.compatFrame.parentNode;});
        for(const value of ['native','shared','roleforge','shared']){
            await mode(page,value);
            assert.equal(await page.evaluate(()=>window.compatFrame.isConnected&&window.compatFrame.parentNode===window.compatParent&&window.compatFrame.contentDocument===window.compatDocument),true,'all modes preserve the live Helper iframe and its DOM owner');
        }
        assert.equal(await page.evaluate(({id,text})=>window.host.chat[id].mes===text,{id,text:story+suffix}),true);
        // Bound controls must work on Helper's visible HTML copy, not its hidden source.
        await page.evaluate(id=>{
            const source=document.querySelector(`[mesid="${id}"] .mes_text`),copy=document.createElement('div');copy.className='TH-streaming';copy.innerHTML=source.innerHTML;
            source.after(copy);source.classList.add('hidden!');window.compatStream=copy;
        },id);
        await page.waitForTimeout(400);
        const stream=page.locator(`[mesid="${id}"] .TH-streaming`);
        assert.equal(await body.locator('.trpg-header,.rf-voice-dialogue-controls').count(),0,'hidden native surface has no stale RoleForge controls');
        assert.equal(await stream.locator('.trpg-header').count(),1);assert.equal(await stream.locator('.rf-voice-dialogue-controls').count(),2,JSON.stringify(await stream.locator('.rf-voice-dialogue-controls').evaluateAll(nodes=>nodes.map(node=>({cls:node.parentElement.className,text:node.parentElement.textContent.slice(0,260),root:node.closest('[data-roleforge-mount]')?.outerHTML.slice(0,100)})))));
        await stream.locator('.trpg-header').click();await page.waitForFunction(()=>document.querySelector('dialog[open]'));
        await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close()));
        if(await stream.locator('.rf-native-speech summary').count())await stream.locator('.rf-native-speech summary').click();
        await stream.locator('.rf-voice-setup').last().click();await page.locator('.rf-speech-editor').waitFor({timeout:3000});
        assert.match(await page.locator('.rf-speech-editor textarea').first().inputValue(),/Welcome/);await page.locator('.rf-speech-editor button[type="submit"]').click();
        // Vue may replace just its prose HTML; new controls need new listeners.
        await page.evaluate(id=>{
            const stream=window.compatStream,owner=stream.querySelector('.TH-render'),frame=owner.querySelector('iframe');window.compatStreamFrame=frame;window.compatStreamDocument=frame.contentDocument;
            const native=document.querySelector(`[mesid="${id}"] .mes_text`);for(const node of [...stream.childNodes])if(node!==owner)node.remove();
            const prose=document.createElement('div');prose.innerHTML=[...native.childNodes].filter(node=>node!==window.compatParent).map(node=>node.outerHTML??node.textContent).join('');stream.prepend(prose);
        },id);await page.waitForTimeout(300);
        assert.equal(await stream.locator('.trpg-header').count(),1);await stream.locator('.trpg-header').click();await page.waitForFunction(()=>document.querySelector('dialog[open]'));
        await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close()));
        assert.equal(await page.evaluate(()=>window.compatStreamFrame.contentDocument===window.compatStreamDocument),true,'prose/control refresh never remounts the frontend');
        if(screenshots)await stream.screenshot({path:`${screenshots}/mvu-roleforge-${width}.png`});
        await page.evaluate(()=>{window.compatStream.remove();document.querySelectorAll('.mes_text').forEach(node=>node.classList.remove('hidden!'));});await page.waitForTimeout(210);
        assert.equal(await body.locator('.trpg-header').count(),1);assert.equal(await page.evaluate(()=>window.compatFrame.contentDocument===window.compatDocument),true);
        // Actual exported Hide Far Chat: formatter empty, raw data still saved.
        await page.evaluate(()=>{for(let i=0;i<12;i++)window.host.chat.push({is_user:true,mes:'Later'});});
        await page.evaluate(id=>window.host.updateMessageBlock(id,window.host.chat[id]),id);await page.waitForTimeout(210);
        assert.equal((await body.innerText()).trim(),'');assert.equal(await body.locator('.trpg-chat').count(),0);
        assert.equal(await page.evaluate(({id,text})=>window.host.chat[id].mes===text,{id,text:story+suffix}),true);
        // Regex gets the reasoning envelope before RoleForge hides unhandled tags.
        await page.evaluate(()=>{window.host.characters[0].data.extensions.regex_scripts=[{id:'thinking',scriptName:'Thinking box',findRegex:'/<thinking>([\\s\\S]*?)<\\/thinking>/g',replaceString:'<details data-compat-thinking="yes"><summary>Thinking</summary>$1</details>',placement:[2],disabled:false,markdownOnly:true,promptOnly:false,trimStrings:[],substituteRegex:0}];});
        const thinking=await add(page,'<thinking>Formatted reasoning.</thinking>'+story);
        assert.equal(await page.locator(`[mesid="${thinking}"] [data-compat-thinking]`).count(),1);assert.match(await page.locator(`[mesid="${thinking}"] .mes_text`).innerText(),/Welcome/);
        assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>window.compatWrites),0,'display never writes MVU variables');
        console.log(`PASS MVU Regex, all modes, iframe identity, visible streaming controls, hidden history and thinking boxes at ${width}px (Game Maker ${gameMakerRevision}, Builder ${builderRevision})`);
        await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
