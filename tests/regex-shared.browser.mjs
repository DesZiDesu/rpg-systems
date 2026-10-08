// Real pinned ST Regex + MessageFormatter + Showdown + DOMPurify/sanitizer hooks;
// actual RoleForge loader, settings, renderer, Voice and composer UI.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {stRegexHost,upstreamRevision} from './fixtures/st-regex-host.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const upstream=await stRegexHost(),root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
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
}catch(error){console.error(error.message);res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const artifacts=process.env.REGEX_SHARED_SCREENSHOT_DIR;if(artifacts)await mkdir(artifacts,{recursive:true});
const source='<tr-header name="Cora"/>\n<tr-narrative>She waits **quietly**.</tr-narrative>\n<tr-dialogue name="Cora">Welcome, traveler.</tr-dialogue>';
const row=(page,id)=>page.locator(`[mesid="${id}"] .mes_text`);
const script=(findRegex,replaceString,extra={})=>({id:'test-rule',scriptName:'Local test rule',findRegex,replaceString,trimStrings:[],placement:[2],markdownOnly:true,promptOnly:false,disabled:false,substituteRegex:0,...extra});
async function rules(page,{global=[],character=[],preset=[]}={}){
    await page.evaluate(({global,character,preset})=>{
        const s=window.host.extensionSettings;s.regex=global;s.character_allowed_regex=[window.host.characters[0].avatar];s.preset_allowed_regex={openai:['Test']};
        window.host.characters[0].data.extensions.regex_scripts=character;
        window.host.getPresetManager=()=>({apiId:'openai',getSelectedPresetName:()=> 'Test',readPresetExtensionField:()=>preset});
    },{global,character,preset});
}
async function add(page,text=source,{user=false,display}={}){
    const id=await page.evaluate(({text,user,display})=>{
        if(!user)window.host.chat.push({name:'Nova',is_user:true,is_system:false,mes:'Continue the scene.'});
        const id=window.host.chat.length,message={name:user?'Nova':'Narrator',is_user:user,is_system:false,mes:text,swipe_id:0,swipes:[text]};
        if(display!==undefined)message.extra={display_text:display};window.host.chat.push(message);
        const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);
        const body=document.createElement('div');body.className='mes_text';row.append(body);document.querySelector('#chat').append(row);
        window.host.updateMessageBlock(id,message);
        window.nativeByMessage ||= new Map();window.nativeByMessage.set(id,[...body.querySelectorAll('[data-native]')]);
        for(const card of body.querySelectorAll('[data-native]')){
            card.dataset.clicks='0';card.querySelector('button')?.addEventListener('click',()=>card.dataset.clicks=String(Number(card.dataset.clicks)+1));
            const input=card.querySelector('input');if(input)input.checked=true;
        }
        return id;
    },{text,user,display});
    await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id),id);await page.waitForTimeout(180);return id;
}
async function mode(page,value){await page.locator('[data-presentation-setting="chatRegexMode"]').selectOption(value);await page.waitForTimeout(180);}
async function assertNative(page,id){
    assert.equal(await page.evaluate(id=>window.nativeByMessage.get(id).every(card=>card.isConnected&&document.querySelector(`[mesid="${id}"] .mes_text`).contains(card)&&(!card.querySelector('input')||card.querySelector('input').checked)),id),true,'original regex card and input state stay connected');
    const buttons=row(page,id).locator('[data-native] button');
    for(let index=0;index<await buttons.count();index++){
        const before=await buttons.nth(index).evaluate(button=>Number(button.closest('[data-native]').dataset.clicks));
        await buttons.nth(index).click();assert.equal(await buttons.nth(index).evaluate(button=>Number(button.closest('[data-native]').dataset.clicks)),before+1,'bound regex action remains active');
    }
}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of (process.env.REGEX_WIDTHS||'320,390,1280').split(',').map(Number)){
        const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
        await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(()=>localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',chatRegexMode:'shared',autoTrack:false,autoContinuity:false,showSceneTracker:false,enableVoiceAddon:true,memoryAutoSummary:false}})));
        await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
        await page.evaluate(()=>{
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
            document.querySelector('#chat').style.cssText='display:block;padding:12px;font:16px/1.5 system-ui;box-sizing:border-box';
            // Native SillyTavern rules for code blocks (the RPG fixture omits
            // the host stylesheet). Keep its own horizontal scroller intact.
            const style=document.createElement('style');style.textContent='.mes_text pre code{display:block;overflow-x:auto;padding:1em}code{white-space:pre-wrap}';document.head.append(style);
            document.querySelector('#extensions_settings2').style.display='block';
            const wrap=document.createElement('div');wrap.id='send-form-wrap';const form=document.createElement('div');form.id='send_form';wrap.append(form);document.body.append(wrap);
            const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;height:50px';form.append(input);
        });
        await page.evaluate(()=>window.hStatsPreview.switchChat('regex-shared-ui',{tretaresia_rpg_state:{player:{name:'Nova'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},location:{place:'Library',narrativeVersion:1}}}));
        await page.locator('[data-presentation-setting="chatPresentation"]').check();
        // The engine applies global → preset → character scripts once, to the
        // complete message. Regex-generated HTML remains inside NPC blocks.
        await rules(page,{
            global:[script('/Welcome/g','Greetings')],
            preset:[script('/traveler/g','friend')],
            character:[script('/quietly/g','quietly <span data-native="inline"><button type="button">Action</button><input type="checkbox"></span>'),script('/Greetings, friend\\./g','Greetings, friend. <a href="https://example.com/quest">Quest</a><table data-native="table"><tr><td>HP</td><td>12</td></tr></table>')],
        });
        const id=await add(page);
        assert.equal(await row(page,id).locator('.trpg-header').count(),1);assert.equal(await row(page,id).locator('.trpg-narrative').count(),1);assert.equal(await row(page,id).locator('.trpg-dialogue').count(),1);
        assert.match(await row(page,id).locator('.trpg-dialogue').innerText(),/Greetings, friend/);assert.doesNotMatch(await row(page,id).innerText(),/Welcome, traveler/);
        await assertNative(page,id);assert.equal(await row(page,id).locator('table td').last().innerText(),'12');assert.equal(await row(page,id).locator('a').getAttribute('href'),'https://example.com/quest');
        assert.equal(await row(page,id).locator('.rf-voice-dialogue-controls').count(),2);assert.equal(await row(page,id).locator('[data-voice-play-all]').count(),1);
        assert.equal(await page.evaluate(id=>window.host.chat[id].mes===window.host.chat[id].swipes[0],id),true,'display-only regex never changes the raw message');
        // Disable/re-enable frames while retaining the exact widget, listener,
        // checkbox, link and table. No stale or duplicate Voice controls.
        await mode(page,'native');assert.equal(await row(page,id).locator('.trpg-header,.rf-voice-dialogue-controls').count(),0);await assertNative(page,id);
        await mode(page,'shared');await assertNative(page,id);assert.equal(await row(page,id).locator('.rf-voice-dialogue-controls').count(),2);
        await mode(page,'roleforge');assert.equal(await row(page,id).locator('[data-native]').count(),0);assert.match(await row(page,id).locator('.trpg-dialogue').innerText(),/Welcome, traveler/);
        await mode(page,'shared');await assertNative(page,id);assert.equal(await row(page,id).locator('.rf-voice-dialogue-controls').count(),2,'returning from original mode restores native children, not an empty snapshot');
        if(artifacts&&[390,1280].includes(width))await row(page,id).screenshot({path:`${artifacts}/regex-and-roleforge-${width===390?'mobile':'desktop'}.png`});
        // ST owns flags, placement, depth, capture groups and replacement
        // macros. RoleForge consumes that result once without bypassing them.
        await rules(page,{global:[
            script('/Welcome/g','DISABLED',{disabled:true}),
            script('/Welcome/g','PROMPT_ONLY',{markdownOnly:false,promptOnly:true}),
            script('/Welcome/g','USER_ONLY',{placement:[1]}),
            script('/Welcome/g','OLDER_DEPTH',{minDepth:2,maxDepth:5}),
            script('/(Welcome), (traveler)\\./g','<strong>$1</strong>, $2. {{user}}'),
        ]});
        const captures=await add(page);assert.match(await row(page,captures).locator('.trpg-dialogue').innerText(),/Welcome, traveler\. Nova/);
        assert.equal(await row(page,captures).locator('.trpg-dialogue strong').innerText(),'Welcome');
        assert.doesNotMatch(await row(page,captures).innerText(),/DISABLED|PROMPT_ONLY|USER_ONLY|OLDER_DEPTH/);
        // A catch-all regex removes the protocol and creates one custom card.
        // Keep all native card HTML untouched; NPC/Voice are separate controls.
        await rules(page,{global:[script('/[\\s\\S]+/','<section data-native="whole" style="padding:12px;background:#19212a"><h3>Regex inventory</h3><table><tr><td>Coins</td><td>40</td></tr></table><button type="button">Open card</button><input type="checkbox"></section>')]});
        const whole=await add(page);await assertNative(page,whole);
        assert.equal(await row(page,whole).locator('.trpg-header').count(),1);assert.equal(await row(page,whole).locator('.trpg-dialogue,.trpg-narrative').count(),0);
        assert.equal(await row(page,whole).locator('.rf-native-speech').count(),1);assert.equal(await row(page,whole).locator('.rf-voice-dialogue-controls').count(),2);
        assert.equal(await row(page,whole).locator('h3').innerText(),'Regex inventory');assert.equal(await row(page,whole).locator('table td').last().innerText(),'40');
        await row(page,whole).locator('.rf-native-speech summary').click();
        await row(page,whole).locator('.rf-voice-setup').last().click();await page.locator('.rf-speech-editor').waitFor({timeout:3000});
        assert.match(await page.locator('.rf-speech-editor textarea').first().inputValue(),/Welcome, traveler/);
        await page.locator('.rf-speech-editor button[type="submit"]').click();
        if(artifacts&&width===390)await row(page,whole).screenshot({path:`${artifacts}/whole-message-fallback-mobile.png`});
        // Existing display_text overrides belong to ST/other formatters.
        const override=await add(page,source,{display:'<section data-native="override"><p>Override UI</p><button type="button">Action</button></section>'});
        assert.match(await row(page,override).innerText(),/Regex inventory/);assert.doesNotMatch(await row(page,override).innerText(),/Welcome, traveler/);
        await assertNative(page,override);
        // Source-level regex results with rich HTML are kept as host HTML; no
        // reconstruction from parseStory's stripped plain text.
        await rules(page);const stored=await add(page,'<tr-header name="Cora"/><tr-dialogue name="Cora">A stored card <span data-native="stored"><button>Action</button><input type="checkbox"></span></tr-dialogue>');await assertNative(page,stored);
        await rules(page,{global:[script('/name="Cora"/g','name="Coraline"')]});
        const renamed=await add(page);assert.match(await row(page,renamed).locator('.trpg-header').innerText(),/Coraline/);
        assert.equal(await page.evaluate(id=>window.host.chat[id].mes,renamed),source,'display names never rename stored NPC/story data');
        await rules(page);
        // Planning stays private without sacrificing any native widget.
        const privateId=await add(page,'<planning>PRIVATE_REASONING_DO_NOT_DISPLAY</planning>'+source);
        assert.doesNotMatch(await row(page,privateId).innerText(),/PRIVATE_REASONING|planning/);assert.equal(await row(page,privateId).locator('.trpg-dialogue').count(),1);
        // Player shorthand and assistant shorthand remain separate even when
        // their display-only regex renders a whole-message native card.
        await page.locator('[data-presentation-setting="userChatPresentation"]').check();
        await rules(page,{global:[script('/Hello/g','Hello <span data-native="player-inline"><button>Player action</button><input type="checkbox"></span>',{placement:[1]}),script('/Think/g','Consider',{placement:[1]})]});
        const styledUser=await add(page,'*I wait* "Hello" |Think|',{user:true});await assertNative(page,styledUser);
        assert.equal(await row(page,styledUser).locator('.trpg-user-header').count(),1);assert.equal(await row(page,styledUser).locator('.trpg-dialogue').count(),1);assert.equal(await row(page,styledUser).locator('.trpg-narrative').count(),1);assert.equal(await row(page,styledUser).locator('.trpg-user-thought').count(),1);assert.match(await row(page,styledUser).locator('.trpg-user-thought').innerText(),/Consider/);
        assert.equal(await row(page,styledUser).locator('.trpg-prose-mark svg').count(),1,'player narrative keeps its pen');assert.equal(await row(page,styledUser).locator('.rf-voice-play,.trpg-header').count(),0);
        if(artifacts&&width===390)await row(page,styledUser).screenshot({path:`${artifacts}/user-regex-mobile.png`});
        await rules(page,{global:[script('/[\\s\\S]+/','<section data-native="user"><button>Player card</button><input type="checkbox"></section>',{placement:[1]})]});
        const user=await add(page,'*I wait* "Hello" |A thought|',{user:true});await assertNative(page,user);assert.equal(await row(page,user).locator('.trpg-user-header').count(),1);assert.equal(await row(page,user).locator('.rf-voice-play,.trpg-header').count(),0);
        const ai=await add(page,'*I wait* "Hello" |A thought|');assert.equal(await row(page,ai).locator('.trpg-user-header,.trpg-user-thought').count(),0);
        // encode_tags, code examples and protected tag attributes remain native
        // formatting concerns; literal code is not mounted as story UI.
        await rules(page);await page.evaluate(()=>window.stRegex.power_user.encode_tags=true);
        const encoded=await add(page);assert.equal(await row(page,encoded).locator('.trpg-dialogue').count(),1);assert.doesNotMatch(await row(page,encoded).innerText(),/<tr-dialogue/);
        await page.evaluate(()=>window.stRegex.power_user.encode_tags=false);
        const literal=await add(page,'```html\n<tr-dialogue name="Cora">Example</tr-dialogue>\n```');assert.equal(await row(page,literal).locator('pre code').count(),1);assert.match(await row(page,literal).locator('pre code').innerText(),/tr-dialogue/);assert.equal(await row(page,literal).locator('.trpg-header,.rf-voice-play').count(),0,'literal examples do not create speakers or audio');
        // Native content can update after initial mounting. Preserve listeners
        // while the RoleForge controls refresh to the changed visible speech.
        await page.evaluate(id=>{const target=document.querySelector(`[mesid="${id}"] [data-roleforge-story="dialogue"]`);target.firstChild.textContent='Updated native speech.';},encoded);await page.waitForTimeout(240);
        assert.match(await row(page,encoded).locator('.trpg-dialogue').innerText(),/Updated native speech/);assert.equal(await row(page,encoded).locator('.rf-voice-dialogue-controls').count(),2);
        await page.evaluate(id=>{for(const marker of document.querySelectorAll(`[mesid="${id}"] [data-roleforge-name="Cora"]`))marker.dataset.roleforgeName='Coraline';},encoded);await page.waitForTimeout(240);
        assert.match(await row(page,encoded).locator('.trpg-header').innerText(),/Coraline/);assert.equal(await row(page,encoded).locator('.rf-voice-dialogue-controls').count(),2,'late native boundary edits refresh without duplicate controls');
        // Late/old-host flattened reasoning is removed surgically, rather than
        // sacrificing the native card to a raw-text fallback.
        await page.evaluate(async id=>{const body=document.querySelector(`[mesid="${id}"] .mes_text`);body.innerHTML='<section data-native="late-private"><p>PRIVATE_REASONING_DO_NOT_DISPLAY</p><button>Action</button><input type="checkbox"></section>';const card=body.firstChild;window.nativeByMessage.set(id,[card]);card.dataset.clicks='0';card.querySelector('input').checked=true;card.querySelector('button').addEventListener('click',()=>card.dataset.clicks=String(Number(card.dataset.clicks)+1));await window.host.eventSource.emit('CHARACTER_MESSAGE_RENDERED',id);},privateId);await page.waitForTimeout(180);await assertNative(page,privateId);assert.doesNotMatch(await row(page,privateId).innerText(),/PRIVATE_REASONING/);
        // Iframe widgets can be inserted by other extensions after sanitizing.
        // Atomic DOM moves retain their document; older-browser fallback keeps
        // the stateful widget unmoved and offers speech controls separately.
        for(const olderBrowser of [false,true]){
            if(olderBrowser)await page.evaluate(()=>{window.atomicMove=Element.prototype.moveBefore;Element.prototype.moveBefore=undefined;});
            const frameId=await add(page);
            await page.evaluate(async id=>{
                const body=document.querySelector(`[mesid="${id}"] .mes_text`);body.innerHTML='<span data-roleforge-story="dialogue" data-roleforge-name="Cora"></span>';
                const frame=document.createElement('iframe');frame.style.cssText='width:100%;height:60px;border:0';frame.srcdoc='<input value="Saved state">';window.nativeFrame=frame;
                const loaded=new Promise(resolve=>frame.onload=resolve);body.firstChild.append(frame);await loaded;window.originalFrameDoc=frame.contentDocument;frame.contentDocument.querySelector('input').value='Edited inside widget';
            },frameId);await page.waitForTimeout(240);
            assert.equal(await page.evaluate(()=>window.nativeFrame.contentDocument===window.originalFrameDoc&&window.nativeFrame.contentDocument.querySelector('input').value==='Edited inside widget'),true,'iframe document and edited state survive shared presentation');
            await mode(page,'native');assert.equal(await page.evaluate(()=>window.nativeFrame.contentDocument===window.originalFrameDoc),true,'unwrapping does not reload native iframe');await mode(page,'shared');
            const lateId=await add(page);
            await page.evaluate(async id=>{
                const target=document.querySelector(`[mesid="${id}"] [data-roleforge-story="dialogue"]`),owner=document.createElement('div');owner.className='TH-render';target.append(owner);
                const frame=document.createElement('iframe');frame.style.cssText='width:100%;max-width:100%;box-sizing:border-box';frame.srcdoc='<input value="Late widget">';const loaded=new Promise(resolve=>frame.onload=resolve);owner.append(frame);await loaded;
                window.lateFrame=frame;window.lateDocument=frame.contentDocument;window.lateOwner=owner;frame.contentDocument.querySelector('input').value='Preserved late state';
            },lateId);await page.waitForTimeout(240);
            for(const presentation of ['native','roleforge','shared']){
                await mode(page,presentation);
                assert.equal(await page.evaluate(()=>window.lateFrame.isConnected&&window.lateFrame.parentNode===window.lateOwner&&window.lateFrame.contentDocument===window.lateDocument&&window.lateFrame.contentDocument.querySelector('input').value==='Preserved late state'),true,'late Helper adoption preserves its live iframe even without atomic moves');
            }
            if(olderBrowser)await page.evaluate(()=>Element.prototype.moveBefore=window.atomicMove);
        }
        await rules(page,{global:[script('/[\\s\\S]+/','<style>.hidden-card{color:red}</style><!--Hidden by Regex-->')]});
        const hidden=await add(page);assert.equal(await row(page,hidden).locator('.trpg-chat').count(),0,'style/comment-only Regex output stays hidden: '+await row(page,hidden).innerHTML());
        await rules(page);
        // Actual native editor lifecycle: in-flight updates do not mount over
        // the editor; a native rerender on save decorates only the new content.
        await page.evaluate(id=>{const body=document.querySelector(`[mesid="${id}"] .mes_text`);body.replaceChildren();const editor=document.createElement('textarea');editor.id='curEditTextarea';editor.className='edit_textarea';editor.value=window.host.chat[id].mes;body.append(editor);window.sharedEditor=editor;},stored);
        await page.evaluate(id=>window.host.eventSource.emit('MESSAGE_UPDATED',id),stored);await page.waitForTimeout(180);assert.equal(await row(page,stored).locator('.trpg-chat').count(),0);assert.equal(await page.evaluate(()=>window.sharedEditor.isConnected),true);
        await page.evaluate(async id=>{const message=window.host.chat[id];message.mes='<tr-dialogue name="Cora">Edited response.</tr-dialogue>';message.swipes[0]=message.mes;await window.host.updateMessageBlock(id,message);await window.host.eventSource.emit('MESSAGE_UPDATED',id);},stored);await page.waitForTimeout(180);assert.match(await row(page,stored).locator('.trpg-dialogue').innerText(),/Edited response/);assert.equal(await row(page,stored).locator('[data-native="stored"]').count(),0);
        // Streaming, swipe and native reparenting never restore a stale card.
        await page.evaluate(async id=>{const message=window.host.chat[id];message.mes='<tr-dialogue name="Cora">New swipe.</tr-dialogue>';message.swipe_id=1;message.swipes[1]=message.mes;await window.host.updateMessageBlock(id,message);await window.host.eventSource.emit('MESSAGE_SWIPED',id);},stored);await page.waitForTimeout(180);assert.match(await row(page,stored).innerText(),/New swipe/);assert.doesNotMatch(await row(page,stored).innerText(),/Edited response/);
        await page.evaluate(id=>{const body=document.querySelector(`[mesid="${id}"] .mes_text`),wrap=document.createElement('section');wrap.dataset.foreign='wrapper';wrap.append(...body.childNodes);body.append(wrap);},stored);await page.waitForTimeout(240);assert.equal(await row(page,stored).locator('.trpg-header').count(),1);assert.equal(await row(page,stored).locator('.trpg-dialogue').count(),1);
        await mode(page,'native');assert.equal(await row(page,stored).locator('[data-foreign="wrapper"]').count(),1);assert.match(await row(page,stored).innerText(),/New swipe/);await mode(page,'shared');
        // Composer UI stays independent of the chat regex and starts minimized.
        await page.waitForFunction(()=>document.querySelector('[data-dock-panel="status"]'));
        await page.locator('[data-dock-panel="status"]').click();assert(await page.locator('.rf-user-status').isVisible());
        await page.locator('[data-dock-panel="stats"]').click();assert(await page.locator('.rf-stat-training').isVisible());
        const overflow=await page.evaluate(()=>{const chat=document.querySelector('#chat');return chat.scrollWidth>chat.clientWidth+1?[...chat.querySelectorAll('*')].filter(node=>node.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(node=>({tag:node.tagName,cls:node.className,text:node.textContent.slice(0,80),width:node.getBoundingClientRect().width})):[];});assert.deepEqual(overflow,[],'shared UI fits mobile and desktop');
        assert.deepEqual(errors,[]);console.log(`PASS shared Regex + NPC/Voice/User UI, exact DOM, lifecycle and composers at ${width}px (ST ${upstreamRevision})`);await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
