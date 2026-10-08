// Full production loader/settings/chat lifecycle; all messages and APIs are local fixtures.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
    const path=url.pathname.slice(base.length);let body=await readFile(new URL(path,root));
    if(path==='docs/previews/h-stats-fixture.js')body=body.toString().replace("'MESSAGE_DELETED',","'MESSAGE_DELETED','MESSAGE_EDITED','MESSAGE_UPDATED','USER_MESSAGE_RENDERED',");
    res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-user-chat.html?enabled=0`;
const artifacts=process.env.USER_CHAT_SCREENSHOT_DIR;
if(artifacts)await mkdir(artifacts,{recursive:true});
const row=(page,id)=>page.locator(`[mesid="${id}"] .mes_text`);
const control=page=>page.locator('[data-presentation-setting="userChatPresentation"]');
async function toggle(page,on){await control(page).evaluate((node,on)=>{node.checked=on;node.dispatchEvent(new Event('change',{bubbles:true}));},on);await page.waitForTimeout(180);}
async function add(page,source,options={}){
    const id=await page.evaluate(({source,options})=>window.userChatPreview.addMessage(source,options),{source,options});
    await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.USER_MESSAGE_RENDERED,id),id);await page.waitForTimeout(180);return id;
}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:1100},hasTouch:width<600,reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(`Browser error (${width}px): ${error.message}`);});
        await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(()=>{
            const key='roleforge-hstats-preview-settings';
            if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:false,injectState:false,showSceneTracker:false,memoryAutoSummary:false}}));
        });
        await page.goto(url);await page.waitForFunction(()=>window.userChatPreview?.ready);
        const {userId,aiId}=await page.evaluate(()=>({userId:window.userChatPreview.userId,aiId:window.userChatPreview.aiId}));
        assert.equal(await control(page).isChecked(),false,'old installations start with the player feature off');
        await page.evaluate(({userId,aiId})=>{
            window.userNative=document.querySelector(`[mesid="${userId}"] .mes_text`).firstChild;
            window.aiNative=document.querySelector(`[mesid="${aiId}"] .mes_text`).firstChild;
            window.originalMessages=JSON.stringify(window.host.chat);window.promptChanges=0;window.host.setExtensionPrompt=()=>window.promptChanges++;
        },{userId,aiId});
        assert.equal(await row(page,userId).locator('.trpg-user-chat').count(),0);
        await toggle(page,true);await row(page,userId).locator('.trpg-user-chat').waitFor();
        for(const cls of ['trpg-dialogue','trpg-narrative','trpg-user-thought'])assert.equal(await row(page,userId).locator(`.${cls}`).count(),1);
        assert.equal(await row(page,aiId).locator('.trpg-dialogue,.trpg-narrative,.trpg-user-thought,.trpg-user-header').count(),0,'AI shorthand never creates cards');
        assert(await page.evaluate(aiId=>document.querySelector(`[mesid="${aiId}"] .mes_text`).firstChild===window.aiNative,aiId),'AI native DOM is unchanged');
        assert.equal(await page.evaluate(()=>JSON.stringify(window.host.chat)===window.originalMessages),true,'rendering never rewrites the messages sent to AI');
        assert.equal(await page.evaluate(()=>window.promptChanges),0,'player toggle changes only local display');
        assert.equal(await row(page,userId).locator('.rf-voice-play,[data-voice-play-all],[data-trpg-open]').count(),0,'user cards do not become NPC or Voice controls');
        assert.equal(await row(page,userId).locator('.trpg-user-chat').evaluate(node=>getComputedStyle(node).getPropertyValue('--speaker').trim()),'#a9d98c');
        const layout=await row(page,userId).evaluate(host=>{
            const root=host.querySelector('.trpg-user-chat'),prose=root.querySelector('.trpg-narrative'),pen=prose.querySelector('svg'),copy=prose.querySelector('.trpg-prose-copy'),style=getComputedStyle(prose);
            return {align:getComputedStyle(root).textAlign,right:root.getBoundingClientRect().right,hostRight:host.getBoundingClientRect().right,paddingLeft:parseFloat(style.paddingLeft),paddingRight:parseFloat(style.paddingRight),penWidth:pen?.getBoundingClientRect().width||0,penRight:pen?.getBoundingClientRect().right||0,copyRight:copy.getBoundingClientRect().right};
        });
        assert.equal(layout.align,'right');assert(Math.abs(layout.right-layout.hostRight)<1);assert(layout.paddingLeft<=8&&layout.paddingRight>=30,'player prose has its ornament space on the right');assert(layout.penWidth>0&&layout.penRight>layout.copyRight,'pen is visible to the right even without the host icon font');
        assert.match(await page.locator('.trpg-user-presentation-help').innerText(),/เฉพาะ|User/);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page has no horizontal overflow');
        assert(await row(page,userId).evaluate(node=>node.scrollWidth<=node.clientWidth+1),'player UI fits the host');
        if(artifacts)await page.screenshot({path:`${artifacts}/preview-${width}.png`,fullPage:true});
        await page.selectOption('#demo-theme','#849bb5');await page.waitForTimeout(180);
        assert.equal(await row(page,userId).locator('.trpg-user-chat').evaluate(node=>getComputedStyle(node).getPropertyValue('--speaker').trim()),'#849bb5',JSON.stringify(await page.evaluate(()=>({color:window.host.extensionSettings.tretaresia_rpg.accentColor,theme:document.querySelector('#demo-theme').value,enabled:document.querySelector('[data-presentation-setting="userChatPresentation"]').checked}))));
        await page.selectOption('#demo-language','en');await page.waitForTimeout(180);assert.equal(await row(page,userId).locator('.trpg-user-thought small').innerText(),'Inner thought');
        await page.selectOption('#demo-language','th');await page.selectOption('#demo-theme','#a9d98c');await page.waitForTimeout(180);
        await toggle(page,false);assert(await page.evaluate(userId=>document.querySelector(`[mesid="${userId}"] .mes_text`).firstChild===window.userNative,userId),'disabling restores exact native nodes');
        await toggle(page,true);
        const widget=await add(page,'"Native widget" |thought|',{native:'<section class="custom-widget"><button type="button">Native action</button></section>'});
        await page.evaluate(id=>{window.widgetClicks=0;window.widget=document.querySelector(`[mesid="${id}"] .custom-widget`);window.widget.querySelector('button').addEventListener('click',()=>window.widgetClicks++);},widget);
        assert.equal(await row(page,widget).locator('.trpg-user-header').count(),1,'shared user identity accompanies the native Regex card');
        assert.equal(await row(page,widget).locator('.trpg-dialogue,.trpg-user-thought').count(),0,'whole-message Regex does not duplicate shorthand body');
        await row(page,widget).locator('button').click();await toggle(page,false);await toggle(page,true);
        assert.equal(await page.evaluate(id=>document.querySelector(`[mesid="${id}"] .custom-widget`)===window.widget,widget),true);assert.equal(await page.evaluate(()=>window.widgetClicks),1);
        for(const source of ['`|code|` "speech"','| Name | Value |\n| --- | --- |\n| Potion | 2 |','[link](https://example.com) *action*','<img src=x onerror=evil()> "speech"']){
            const id=await add(page,source);assert.equal(await row(page,id).locator('.trpg-user-chat').count(),0);assert.equal(await row(page,id).locator('img').count(),0);
        }
        const system=await add(page,'*action* "speech" |thought|',{system:true});assert.equal(await row(page,system).locator('.trpg-user-chat').count(),0);
        const unsafeName=await add(page,'"Hello."',{name:'<img src=x onerror=evil()>'});assert.equal(await row(page,unsafeName).locator('img').count(),0);assert.equal(await row(page,unsafeName).locator('.trpg-user-header strong').innerText(),'<img src=x onerror=evil()>');
        await page.evaluate(userId=>{const editor=document.createElement('textarea');editor.id='curEditTextarea';editor.className='edit_textarea';document.querySelector(`[mesid="${userId}"]`).append(editor);},userId);
        await page.waitForTimeout(180);assert.equal(await row(page,userId).locator('.trpg-user-chat').count(),0,'editing reveals the native editor without player cards');
        await page.evaluate(async userId=>{
            const source='*ฉันหยุดฟัง* "ใครอยู่ตรงนั้น?" |คืนนี้ต้องระวัง|';window.host.chat[userId].mes=source;
            const body=document.querySelector(`[mesid="${userId}"] .mes_text`);body.innerHTML=window.userChatPreview.nativeHtml(source);window.editedNative=body.firstChild;
            document.querySelector('#curEditTextarea').remove();await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_EDITED,userId);
        },userId);await page.waitForTimeout(180);assert.equal(await row(page,userId).locator('.trpg-user-thought p').innerText(),'คืนนี้ต้องระวัง');
        await toggle(page,false);assert(await page.evaluate(id=>document.querySelector(`[mesid="${id}"] .mes_text`).firstChild===window.editedNative,userId),'edited text restores rather than a stale native snapshot');await toggle(page,true);
        // Re-render a host update, then wrap a live card as another formatter does.
        await page.evaluate(async userId=>{const body=document.querySelector(`[mesid="${userId}"] .mes_text`);body.innerHTML=window.userChatPreview.nativeHtml(window.host.chat[userId].mes);await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_UPDATED,userId);},userId);await page.waitForTimeout(180);
        await page.evaluate(userId=>{const body=document.querySelector(`[mesid="${userId}"] .mes_text`),card=body.querySelector('.trpg-user-chat'),wrapper=document.createElement('section');wrapper.className='external-wrapper';card.replaceWith(wrapper);wrapper.append(card);},userId);await page.waitForTimeout(180);
        assert.equal(await row(page,userId).locator('.trpg-user-header').count(),1);assert.match(await row(page,userId).locator('.external-wrapper').innerText(),/คืนนี้ต้องระวัง/,'external wrapper survives with restored native content');
        await page.evaluate(async()=>{window.host.chat=[];document.querySelector('#chat').replaceChildren();await window.hStatsPreview.switchChat('user-preview-next');});
        const next=await add(page,'*A new scene.* "Hello again." |No old thoughts.|');assert.equal(await row(page,next).locator('.trpg-user-chat').count(),1);assert.equal(await page.locator('.trpg-user-chat').count(),1);
        // Explicit assistant presentation continues to work, separate from shorthand.
        await page.locator('[data-presentation-setting="chatPresentation"]').evaluate(node=>{node.checked=true;node.dispatchEvent(new Event('change',{bubbles:true}));});
        const npc=await add(page,'<tr-header name="Cora"/><tr-narrative>She waits.</tr-narrative><tr-dialogue name="Cora">Hello. |still speech|</tr-dialogue>',{user:false});
        assert.equal(await row(page,npc).locator('.trpg-dialogue').count(),1);assert.equal(await row(page,npc).locator('.trpg-user-chat,.trpg-user-thought').count(),0);
        const aiPlain=await add(page,'*A normal action.* "Normal speech." |Normal symbols.|',{user:false});assert.equal(await row(page,aiPlain).locator('.trpg-dialogue,.trpg-narrative,.trpg-user-thought,.trpg-user-header').count(),0,'AI shorthand remains native with NPC presentation enabled as well');
        await page.evaluate(()=>{window.host.extensionSettings.tretaresia_rpg.enableVoiceAddon=true;});await toggle(page,true);
        assert.equal(await row(page,next).locator('.rf-voice-play,[data-voice-play-all]').count(),0,'Voice enabled still cannot attach speech controls to player cards');assert(await row(page,npc).locator('.rf-voice-play').count()>0,'assistant Voice decoration continues to work');
        await page.reload();await page.waitForFunction(()=>window.userChatPreview?.ready);await page.waitForTimeout(180);assert.equal(await control(page).isChecked(),true,'user-only option persists after reload');assert.equal(await page.locator('.trpg-user-chat').count(),1);
        // Hosts without eventSource.off must not revive a disposed renderer.
        await page.evaluate(async()=>{
            await new Promise(resolve=>setTimeout(resolve,180));document.querySelector('#chat').remove();
            const chat=document.createElement('div');chat.id='chat';chat.innerHTML='<div class="mes" mesid="0"><div class="mes_text">"Lifecycle speech."</div></div>';document.body.append(chat);
            const callbacks=[],context={chat:[{is_user:true,name:'User',mes:'"Lifecycle speech."'}],getCurrentChatId:()=> 'isolated-lifecycle',eventTypes:{USER_MESSAGE_RENDERED:'player-rendered'},eventSource:{on:(type,fn)=>callbacks.push(fn)}};
            const {createChatPresentation}=await import('../../src/npc-chat.js?v=0.59.0');
            window.lifecyclePreview={callbacks,native:chat.querySelector('.mes_text').firstChild,renderer:createChatPresentation({context:()=>context,settings:()=>({userChatPresentation:true,language:'en'}),state:()=>({npcs:[]}),visible:text=>text},()=>{})};
        });await page.locator('#chat .trpg-user-chat').waitFor();
        await page.evaluate(()=>{window.lifecyclePreview.renderer.destroy();window.lifecyclePreview.callbacks.forEach(callback=>callback());window.lifecyclePreview.renderer.refresh();});await page.waitForTimeout(180);
        assert.equal(await page.locator('#chat .trpg-user-chat').count(),0);assert.equal(await page.evaluate(()=>document.querySelector('#chat .mes_text').firstChild===window.lifecyclePreview.native),true,'destroy restores native nodes and late events cannot remount UI');
        assert.deepEqual(errors,[]);await page.close();console.log(`User UI: ${width}px passed (AI isolation, native restoration, edit, regex, theme, reload, no overflow)`);
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
