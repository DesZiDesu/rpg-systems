// Native Send/Stop handlers survive a separate memory summary request.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/memory-composer-status.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root = new URL('../',import.meta.url), artifacts = '/workspace/artifacts/memory-composer';
await mkdir(artifacts,{recursive:true});
const fixture = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/memory-composer-status.css"><style>
:root{--SmartThemeBodyColor:#eee;--SmartThemeBlurTintColor:#171717;--SmartThemeEmColor:#f19191;--rpg-accent:#d6b458}*{box-sizing:border-box}body{margin:0;color:var(--SmartThemeBodyColor);background:#080808;font:15px system-ui,sans-serif}.shell{width:100%;max-width:760px;margin:auto;padding:10px}#chat{height:520px;display:flex;align-items:end;padding:18px;font-size:15px;line-height:1.7}#chat p{min-width:0;overflow-wrap:anywhere}#send_form{border:1px solid #3c3c3c;border-radius:24px;padding:12px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;background:#151515}#send_textarea{flex-basis:100%;width:100%;resize:none;min-height:66px;background:none;color:inherit;border:none;font:inherit;outline:0}#rightSendForm{margin-left:auto;display:flex;align-items:center}#send_but,#mes_stop{display:flex;align-items:center;justify-content:center;width:48px;height:48px;padding:0;border:0;border-radius:50%;background:#eee;color:#111;font-size:28px}#mes_stop{display:none}.host-user-control{border:0;background:none;color:inherit;font:inherit}#tretaresia-rpg-overlay{display:none}
</style></head><body><main class="shell"><div id="chat"><p>คอร่ายืนอยู่ริมแม่น้ำและโบกมือทักทาย ขณะนี้เป็นเวลากลางคืน</p></div><form id="send_form"><textarea id="send_textarea" placeholder="Type a message, or /? for help">Existing draft</textarea><button type="button" class="host-user-control">☰</button><button type="button" class="host-user-control">✧</button><div id="rightSendForm"><button id="send_but" type="button" aria-label="Send story">➤</button><button id="mes_stop" type="button" aria-label="Stop story">■</button></div></form></main><div id="tretaresia-rpg-overlay"></div><script type="module">
import {createMemoryComposerStatus} from '/src/memory-composer-status.js';
window.calls={send:0,storyStop:0,cancel:0,open:0,retry:0};
window.originalSend=document.querySelector('#send_but');window.originalTextarea=document.querySelector('#send_textarea');
originalSend.addEventListener('click',()=>calls.send++);
document.querySelector('#mes_stop').addEventListener('click',()=>calls.storyStop++);
document.querySelector('#send_form').addEventListener('submit',event=>event.preventDefault());
window.component=createMemoryComposerStatus({cancel:()=>calls.cancel++,open:()=>calls.open++,retry:()=>calls.retry++,language:()=>window.lang||'en'});
window.baseView={ready:true,enabled:true,owner:'npc',chatId:'first',settings:{enableMemorySummaries:true,language:'th'},coverage:{pendingMessages:42},job:{status:'idle'},chapters:[]};
window.update=(status,fields={},story=false)=>component.update({...baseView,job:{status,startedAt:new Date(Date.now()-95000).toISOString(),completed:3,total:10,processedMessages:30,totalMessages:90,updatedAt:'2026-10-01T12:00:00Z',...fields}},{liveGeneration:story});
window.loaded=true;
</script></body></html>`;
const server=http.createServer(async(request,response)=>{
    try {
        const pathname=new URL(request.url,'http://localhost').pathname;
        if(pathname==='/'){response.setHeader('content-type','text/html');response.end(fixture);return;}
        if(!/^\/(src|styles)\/[a-zA-Z0-9.-]+$/.test(pathname)){response.writeHead(404).end();return;}
        response.setHeader('content-type',pathname.endsWith('.css')?'text/css':'text/javascript');
        response.end(await readFile(new URL(pathname.slice(1),root)));
    }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.loaded);
        assert.equal(await page.evaluate(()=>update('summarizing')),true);
        const bar=page.locator('.rf-memory-composer-status'), slot=page.locator('.rf-memory-composer-stop');
        await bar.waitFor({state:'visible'});await slot.waitFor({state:'visible'});
        assert.match(await bar.innerText(),/AI กำลังสรุป.*30\/90.*1:3[56]/s);
        assert.equal(await page.locator('#send_but').isVisible(),false);
        assert.equal(await page.locator('#send_textarea').inputValue(),'Existing draft');
        assert.equal(await page.evaluate(()=>originalSend===document.querySelector('#send_but')&&originalTextarea===document.querySelector('#send_textarea')),true);
        await page.locator('#send_textarea').fill('Still editable while memory runs');
        await slot.click();
        assert.deepEqual(await page.evaluate(()=>calls),{send:0,storyStop:0,cancel:1,open:0,retry:0});
        await bar.locator('[data-memory-composer-action="open"]').click();
        assert.equal(await page.evaluate(()=>calls.open),1);
        const bounds=await bar.evaluate(node=>({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,scroll:document.documentElement.scrollWidth,width:innerWidth}));
        assert(bounds.left>=0&&bounds.right<=width&&bounds.scroll<=width,`${width}: ${JSON.stringify(bounds)}`);
        const inputBottom=await page.locator('#send_form').evaluate(node=>node.getBoundingClientRect().bottom);
        assert(inputBottom<=900,'main-chat summary status does not cover the composer');
        await page.locator('.shell').screenshot({path:`${artifacts}/summarizing-${width}.png`});

        // When the story owns native Stop, memory cannot consume that click.
        await page.evaluate(()=>{document.querySelector('#mes_stop').style.display='flex';document.querySelector('#send_but').style.display='none';update('waiting',{},true);});
        assert.equal(await slot.count(),0);
        await bar.locator('[data-memory-composer-action="cancel"]').waitFor({state:'visible'});
        await page.locator('#mes_stop').click();
        assert.equal(await page.evaluate(()=>calls.storyStop),1);assert.equal(await page.evaluate(()=>calls.cancel),1);
        await bar.locator('[data-memory-composer-action="cancel"]').click();
        assert.equal(await page.evaluate(()=>calls.cancel),2);
        assert.equal(await page.locator('#mes_stop').isVisible(),true);
        await page.evaluate(()=>{document.querySelector('#mes_stop').style.display='none';document.querySelector('#send_but').style.display='flex';update('summarizing');});
        await slot.waitFor({state:'visible'});

        // Host generation can start between component updates: the observer
        // yields the native control as soon as native Stop becomes visible.
        await page.evaluate(()=>document.querySelector('#mes_stop').style.display='flex');
        await page.waitForFunction(()=>!document.querySelector('.rf-memory-composer-stop'));
        assert.equal(await page.locator('#mes_stop').isVisible(),true);
        await page.evaluate(()=>{document.querySelector('#mes_stop').style.display='none';update('summarizing');});
        await slot.waitFor({state:'visible'});

        // A failed request restores the same native button and leaves an
        // actionable error with the completed-batch progress in main chat.
        await page.evaluate(()=>update('error',{error:'The summary API timed out. Saved batches are retained.',code:'MEMORY_API_TIMEOUT',finishedAt:new Date().toISOString()}));
        assert.equal(await page.locator('#send_but').isVisible(),true);
        assert.equal(await slot.count(),0);
        await page.locator('#send_but').click();assert.equal(await page.evaluate(()=>calls.send),1);
        await bar.locator('[data-memory-composer-action="retry"]').click();assert.equal(await page.evaluate(()=>calls.retry),1);
        assert.match(await bar.innerText(),/30\/90.*42.*timed out/s);
        await page.locator('.shell').screenshot({path:`${artifacts}/error-${width}.png`});
        await bar.locator('[data-memory-composer-action="dismiss"]').click();assert.equal(await bar.count(),0);

        // Composer rerenders keep their own handlers and draft. A detached
        // original Send must be released even if it is reused by the host.
        await page.evaluate(()=>{
            update('summarizing',{updatedAt:'different'});
            const form=document.querySelector('#send_form'),replacement=form.cloneNode(true);
            replacement.querySelector('#send_but').classList.remove('rf-memory-native-send-hidden');
            replacement.querySelector('.rf-memory-composer-stop')?.remove();
            replacement.querySelector('#send_but').addEventListener('click',()=>calls.send+=10);
            form.replaceWith(replacement);
        });
        await slot.waitFor({state:'visible'});
        assert.equal(await page.evaluate(()=>originalSend.classList.contains('rf-memory-native-send-hidden')),false);
        assert.equal(await page.locator('#send_textarea').inputValue(),'Still editable while memory runs');
        await page.evaluate(()=>update('ready',{finishedAt:new Date().toISOString()}));
        await page.locator('#send_but').click();assert.equal(await page.evaluate(()=>calls.send),11);

        // Disable/chat switches clean up immediately. A fresh archive load
        // alone never turns native Send into the memory Stop control.
        await page.evaluate(()=>{update('summarizing');component.update({...baseView,enabled:false,job:{status:'disabled'}});});
        assert.equal(await bar.count(),0);assert.equal(await slot.count(),0);assert.equal(await page.locator('#send_but').isVisible(),true);
        await page.evaluate(()=>{update('summarizing');component.update({...baseView,chatId:'other',job:{status:'idle'}});});
        assert.equal(await bar.count(),0);assert.equal(await page.locator('#send_but').isVisible(),true);
        assert.equal(await page.evaluate(()=>component.update({...baseView,job:{status:'loading'}})),false);
        assert.equal(await slot.count(),0);
        await page.evaluate(()=>{update('summarizing');component.destroy();});
        assert.equal(await bar.count(),0);assert.equal(await page.locator('#send_but').isVisible(),true);
        assert.equal(await page.locator('#send_textarea').inputValue(),'Still editable while memory runs');
        assert.deepEqual(errors,[]);
        await page.close();console.log(`memory composer ${width}: native controls, cancellation, errors, replacements and cleanup passed`);
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
