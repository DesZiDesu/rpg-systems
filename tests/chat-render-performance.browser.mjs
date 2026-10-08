import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),baseline=process.env.CHAT_RENDER_BASELINE==='1';
const old=baseline?execFileSync('git',['show','HEAD:src/npc-chat.js'],{cwd:root,encoding:'utf8'}):null;
const server=http.createServer(async(req,res)=>{try{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/'){res.setHeader('content-type','text/html');res.end('<!DOCTYPE html><html><body><div id="chat"></div></body></html>');return;}
    if(!path.startsWith('/src/')||path.includes('..')){res.writeHead(404).end();return;}
    res.setHeader('content-type','text/javascript');res.end(path==='/src/npc-chat.js'&&old?old:await readFile(new URL(path.slice(1),root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(async()=>{
        const {createChatPresentation}=await import('/src/npc-chat.js');
        const events=new Map(),chat=[],count=200;window.perfReads=0;window.perfChanges=0;
        const context={chat,getCurrentChatId:()=> 'render-performance',eventTypes:{STREAM_TOKEN_RECEIVED:'stream'},eventSource:{on:(type,fn)=>events.set(type,fn),off:type=>events.delete(type)}};
        const settings={language:'en',chatRegexMode:'shared',chatPresentation:true,showSceneTracker:true,enableVoiceAddon:false};
        for(let i=0;i<count;i++){
            chat.push({is_user:true,mes:'Continue.'});const id=chat.length,source=`<tr-dialogue name="Cora">Reply ${i}.</tr-dialogue>`;chat.push({is_user:false,mes:source});
            const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const body=document.createElement('div');body.className='mes_text';body.textContent=source;row.append(body);document.getElementById('chat').append(row);
        }
        const api={context:()=>context,settings:()=>settings,state:()=>({npcs:[]}),visible:text=>text,sceneForMessage:()=>{window.perfReads++;return null;}};
        window.perfPresentation=createChatPresentation(api,()=>{});
        const observer=new MutationObserver(records=>{window.perfChanges+=records.length;});observer.observe(document.getElementById('chat'),{childList:true,subtree:true});
        window.updatePerfTail=()=>{window.perfReads=0;window.perfChanges=0;const last=chat.length-1;chat[last].mes='<tr-dialogue name="Cora">Updated tail.</tr-dialogue>';document.querySelector(`[mesid="${last}"] .mes_text`).textContent=chat[last].mes;events.get('stream')();};
    });
    await page.waitForFunction(()=>document.querySelectorAll('.trpg-dialogue').length===200);
    assert.equal(await page.evaluate(()=>window.perfReads),200);
    await page.evaluate(()=>window.updatePerfTail());await page.waitForTimeout(180);
    const metrics=await page.evaluate(()=>({rows:200,updatedSceneReads:window.perfReads,domMutations:window.perfChanges,tail:document.querySelector('.mes:last-child .trpg-dialogue').textContent}));
    assert.equal(metrics.updatedSceneReads,baseline?200:1,'streaming tail must not reread scene data for the entire history');assert.equal(metrics.tail,'Updated tail.');
    await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>window.perfReads),baseline?200:1,'no formatter/observer feedback loop');assert.deepEqual(errors,[]);
    console.log(JSON.stringify({implementation:baseline?'HEAD baseline':'working tree',...metrics}));await page.evaluate(()=>window.perfPresentation.destroy());
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
