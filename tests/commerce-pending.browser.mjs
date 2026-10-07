// Production-loader regression for the reported Thai three-book request and missing commerce dock.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.COMMERCE_ARTIFACT_DIR||new URL('docs/previews/commerce-pending-v0581/',root).pathname;
await mkdir(artifacts,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
    const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
const user='“ซื้อทั้งสามเล่มเลยแล้วกัน.. ช่วยลดให้หน่อยได้มั้ยครับ..? สักนิดก็ยังดี..”';
const story='<tr-header name="Barth"/><tr-dialogue name="Barth">ปกติสามเล่มรวมกันอยู่ที่สี่สิบห้าเหรียญเงิน ข้าลดให้เหลือสี่สิบเหรียญเงินถ้วนก็แล้วกัน</tr-dialogue>';
async function setup(page){
    await page.evaluate(()=>{
        document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
        document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
        const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';
        const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;min-height:65px;box-sizing:border-box';form.append(input);document.body.append(form);
        window.calls=[];window.host.generateRaw=window.host.generateQuietPrompt=async args=>{window.calls.push(args);throw Error('Unexpected secondary API request');};
        window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
    });
}
async function start(page,user){
    await page.evaluate(async user=>{
        window.host.chat.push({is_user:true,name:'Noah',mes:user});
        await window.host.eventSource.emit('MESSAGE_SENT',window.host.chat.length-1);
        await window.host.eventSource.emit('GENERATION_STARTED','normal',{},false);
        await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat),100000,()=>{},'normal');
    },user);
}
async function finish(page,story){
    const id=await page.evaluate(story=>{
        const id=window.host.chat.length;window.host.chat.push({is_user:false,name:'Narrator',mes:story,swipe_id:0,swipes:[story]});
        const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const text=document.createElement('div');text.className='mes_text';text.textContent=story;row.append(text);document.querySelector('#chat').append(row);return id;
    },story);
    await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',id,'normal');await window.host.eventSource.emit('GENERATION_ENDED');},id);
    await page.waitForFunction(id=>Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`)),id);
}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
        await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(()=>{
            localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:false,enableIncantation:false,eventNotifications:false,enableMemorySummaries:false}}));
            if(!localStorage.getItem('roleforge-hstats-preview-metadata'))localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],inventory:[],location:{place:'Oakland Bookstore',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},worldClock:{day:1,time:'20:46'},progression:{currency:{name:'Coins',gold:0,silver:100,copper:0}}}}));
        });
        await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);await setup(page);
        const bar=page.locator('.rf-commerce-composer'),tab=page.locator('[data-dock-panel=commerce]');
        const before=await page.evaluate(()=>structuredClone(window.host.chatMetadata.tretaresia_rpg_state));
        await start(page,user);await page.locator('[data-dock-panel=commerce]').click();await bar.locator('.rf-commerce-pending-title').waitFor({state:'visible'});
        assert.match(await bar.innerText(),/รอ AI ตอบข้อเสนอและราคา/);assert.equal(await tab.isVisible(),true);
        assert.match(await page.evaluate(()=>window.prompts.get('tretaresia_rpg_response_contract')),/CURRENT TRADE OUTPUT: the player is requesting a buy offer/);
        await finish(page,story);await page.locator('[data-dock-panel=commerce]').click();await page.waitForFunction(()=>document.querySelector('.rf-commerce-status')?.textContent.includes('พบข้อเสนอราคา'));
        assert.match(await bar.innerText(),/AI ยังส่งข้อมูลรายการไม่ครบ/);assert.equal(await bar.locator('[data-commerce-action]').count(),0);
        const geometry=await bar.evaluate(el=>{const rect=el.getBoundingClientRect(),form=document.querySelector('#send_form').getBoundingClientRect();return{bottom:rect.bottom,formTop:form.top,left:rect.left,right:rect.right,width:el.clientWidth,scroll:el.scrollWidth};});
        assert.ok(geometry.bottom<=geometry.formTop+1,JSON.stringify(geometry));assert.ok(geometry.left>=-1&&geometry.right<=width+1,JSON.stringify(geometry));assert.ok(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));
        await page.locator('.rf-composer-dock').screenshot({path:artifacts+`pending-books-${width}.png`});
        let after=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.deepEqual(after.progression.currency,before.progression.currency);assert.deepEqual(after.inventory,before.inventory);assert.equal(after.commerce?.receipts?.length||0,0);assert.equal(await page.evaluate(()=>window.calls.length),0);
        // Simulate the pre-update saved chat: no marketplace/intent/opening record.
        const oldChat=await page.evaluate(async()=>{const chat=structuredClone(window.host.chat);window.host.chatMetadata.tretaresia_rpg_social_events={};await window.host.saveMetadata();return chat;});
        await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready);await setup(page);
        await page.evaluate(async chat=>{window.host.chat.splice(0,window.host.chat.length,...chat);await window.host.eventSource.emit('CHAT_CHANGED');},oldChat);
        await page.locator('.rf-composer-dock.is-minimized').waitFor({state:'visible'});await tab.click();await bar.locator('.rf-commerce-pending-title').waitFor({state:'visible'});assert.match(await bar.innerText(),/พบข้อเสนอราคา/);assert.equal(await tab.isVisible(),true);assert.equal(await page.evaluate(()=>window.calls.length),0);
        after=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.deepEqual(after.progression.currency,before.progression.currency);assert.deepEqual(after.inventory,before.inventory);
        await page.evaluate(async()=>{window.host.extensionSettings.tretaresia_rpg.enableMarketplace=false;await window.host.eventSource.emit('CHAT_CHANGED');});await bar.waitFor({state:'detached'});
        await page.evaluate(async()=>{window.host.extensionSettings.tretaresia_rpg.enableMarketplace=true;await window.host.eventSource.emit('CHAT_CHANGED');});await tab.click();await bar.locator('.rf-commerce-pending-title').waitFor({state:'visible'});
        await start(page,'ซื้อหนังสือมาแล้ว ฉันเก็บใส่กระเป๋า');await finish(page,'<tr-narrative>หนังสืออยู่ในกระเป๋าของโนอาห์</tr-narrative>');await bar.waitFor({state:'detached'});
        assert.equal(await page.evaluate(()=>window.calls.length),0);assert.deepEqual(errors,[]);
        console.log(`PASS ${width}px: exact three-book request, normal reply contract, visible waiting/incomplete dock above ChatBar, old saved chat recovery, disabled gate, genuine settled follow-up, no API/payment/inventory changes or overflow`);await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
