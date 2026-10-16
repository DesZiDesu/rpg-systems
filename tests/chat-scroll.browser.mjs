import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<style>#chat{width:500px;height:350px;overflow:auto}.mes{height:120px;box-sizing:border-box}</style><div id="chat" tabindex="0"></div>');return;}if(path!=='/src/chat-scroll.js'){res.writeHead(404).end();return;}res.setHeader('Content-Type','text/javascript');res.end(await readFile(new URL('src/chat-scroll.js',root)));}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.evaluate(async()=>{const {createChatScrollKeeper}=await import('/src/chat-scroll.js');window.context={id:'one',chatMetadata:{},powerUserSettings:{auto_scroll_chat_to_bottom:true},getCurrentChatId(){return this.id;}};window.pane=document.getElementById('chat');for(let i=0;i<40;i++){const row=document.createElement('div');row.className='mes';row.textContent='Line '+i;pane.append(row);}window.keeper=createChatScrollKeeper({context:()=>context});window.gap=()=>pane.scrollHeight-pane.clientHeight-pane.scrollTop;window.frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));pane.scrollTop=pane.scrollHeight;keeper.observe();keeper.start('normal');const saved=keeper.capture();pane.lastElementChild.style.height='700px';keeper.restore(saved);});await p.waitForTimeout(70);assert.equal(await p.evaluate(()=>gap()),0);
// A queued programmatic bottom-scroll event must not cancel an upward gesture.
await p.evaluate(async()=>{pane.dispatchEvent(new WheelEvent('wheel',{deltaY:-400,bubbles:true}));pane.dispatchEvent(new Event('scroll'));pane.scrollTop-=400;pane.dispatchEvent(new Event('scroll'));window.readerTop=pane.scrollTop;pane.lastElementChild.style.height='1000px';await frames();});assert.equal(await p.evaluate(()=>pane.scrollTop),await p.evaluate(()=>readerTop));
// A pending native bottom-scroll after departure must not resume following.
await p.evaluate(async()=>{pane.scrollTop=pane.scrollHeight;pane.dispatchEvent(new Event('scroll'));await frames();});assert.equal(await p.evaluate(()=>pane.scrollTop),await p.evaluate(()=>readerTop));
// Nor may native layout shrinkage lose the position inside a long last message.
await p.evaluate(async()=>{const before=keeper.capture();pane.lastElementChild.style.height='40px';const saved=keeper.capture();pane.lastElementChild.style.height='1000px';keeper.restore(saved);await frames();window.expectedReaderTop=before.top;});assert.equal(await p.evaluate(()=>pane.scrollTop),await p.evaluate(()=>expectedReaderTop));
await p.evaluate(async()=>{pane.dispatchEvent(new WheelEvent('wheel',{deltaY:2000,bubbles:true}));pane.scrollTop=pane.scrollHeight;pane.dispatchEvent(new Event('scroll'));pane.lastElementChild.style.height='1200px';await frames();});assert.equal(await p.evaluate(()=>gap()),0);
// The same pause/resume policy applies to slow touch gestures, keys and dragging
// the scrollbar. A raw/native layout clamp must not count as downward input.
for(const input of ['touch','keyboard','scrollbar']){
    const result=await p.evaluate(async input=>{
        keeper.start('normal');pane.scrollTo({top:pane.scrollHeight,behavior:'instant'});
        const touch=(type,y)=>{const event=new Event(type,{bubbles:true});Object.defineProperty(event,'touches',{value:[{clientY:y}]});pane.dispatchEvent(event);};
        if(input==='touch'){touch('touchstart',200);for(const y of [201,202,204])touch('touchmove',y);}
        if(input==='keyboard')pane.dispatchEvent(new KeyboardEvent('keydown',{key:'PageUp',bubbles:true}));
        if(input==='scrollbar'){pane.dispatchEvent(new PointerEvent('pointerdown',{clientX:pane.getBoundingClientRect().right-1,clientY:200,pointerType:'mouse',bubbles:true}));document.dispatchEvent(new PointerEvent('pointermove',{clientY:150}));}
        pane.scrollTop-=300;pane.dispatchEvent(new Event('scroll'));const before=pane.scrollTop;
        pane.scrollTop=pane.scrollHeight;pane.dispatchEvent(new Event('scroll'));const held=pane.scrollTop;
        if(input==='touch')touch('touchmove',150);
        if(input==='keyboard')pane.dispatchEvent(new KeyboardEvent('keydown',{key:'PageDown',bubbles:true}));
        if(input==='scrollbar'){document.dispatchEvent(new PointerEvent('pointermove',{clientY:250}));document.dispatchEvent(new PointerEvent('pointerup'));}
        pane.scrollTop=pane.scrollHeight;pane.dispatchEvent(new Event('scroll'));pane.lastElementChild.style.height=parseInt(pane.lastElementChild.style.height)+100+'px';await frames();
        return{before,held,gap:gap()};
    },input);
    assert.equal(result.held,result.before,input+' preserves reader position');assert.equal(result.gap,0,input+' resumes at bottom');
}
// Auto-scroll off preserves the visible historical anchor after earlier rows resize.
const anchor=await p.evaluate(()=>{context.powerUserSettings.auto_scroll_chat_to_bottom=false;pane.scrollTop=1500;pane.dispatchEvent(new Event('scroll'));const saved=keeper.capture(),before=saved.anchor.getBoundingClientRect().top;pane.firstElementChild.style.height='600px';keeper.restore(saved);return{before,after:saved.anchor.getBoundingClientRect().top,gap:gap()};});assert(Math.abs(anchor.before-anchor.after)<1);assert(anchor.gap>500);
await p.evaluate(async()=>{pane.style.scrollBehavior='smooth';context.powerUserSettings.auto_scroll_chat_to_bottom=true;keeper.start('normal');const saved=keeper.capture();pane.lastElementChild.style.height='1500px';keeper.restore(saved);await frames();});assert.equal(await p.evaluate(()=>gap()),0,'theme smooth scrolling cannot animate each layout correction');
// Quiet/dry-run events do not start following, and visual-novel mode keeps host policy.
for(const kind of ['quiet','dry-run','waifu']){const result=await p.evaluate(async kind=>{keeper.reset();pane.style.scrollBehavior='auto';pane.scrollTop=1300;pane.dispatchEvent(new Event('scroll'));context.powerUserSettings.waifuMode=kind==='waifu';keeper.observe();keeper.start(kind==='quiet'?'quiet':'normal',{},kind==='dry-run');const before=pane.scrollTop,saved=keeper.capture();pane.lastElementChild.style.height=parseInt(pane.lastElementChild.style.height)+200+'px';keeper.restore(saved);await frames();return{before,after:pane.scrollTop};},kind);assert.equal(result.after,result.before,kind);}
// Pending callbacks cannot scroll another chat or a replaced #chat node.
await p.evaluate(async()=>{context.powerUserSettings.waifuMode=false;keeper.start('normal');keeper.token();context.id='two';context.chatMetadata={};pane.scrollTop=500;keeper.reset();await frames();});assert.equal(await p.evaluate(()=>pane.scrollTop),500);
await p.evaluate(async()=>{keeper.observe();keeper.start('normal');keeper.token();keeper.destroy();pane.scrollTop=600;pane.lastElementChild.style.height='2000px';await frames();});assert.equal(await p.evaluate(()=>pane.scrollTop),600);assert.deepEqual(errors,[]);console.log('PASS native auto-scroll, queued input, reader anchors, smooth CSS, quiet/dry-run, visual-novel policy, chat switches and cleanup');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
