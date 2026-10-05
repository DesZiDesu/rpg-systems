// Production-loader regression for the reported two-potion, three-each basket.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.COMMERCE_ARTIFACT_DIR||new URL('docs/previews/commerce-stock-v0561/',root).pathname;
await mkdir(artifacts,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
    const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
const names=['น้ำยาฟื้นฟูแผลระดับพื้นฐาน','น้ำยาถอนพิษทั่วไป'];
const story=`<tr-header name="Teresina"/><tr-dialogue name="Teresina">${names[0]} ขวดละ 30 เหรียญทองแดง ส่วน${names[1]} ขวดละ 50 เหรียญทองแดงจ้ะ</tr-dialogue>`;
async function reply(page,user,story,patch){
    await page.evaluate(async user=>{window.host.chat.push({is_user:true,name:'Noah',mes:user});await window.host.eventSource.emit('MESSAGE_SENT',window.host.chat.length-1);await window.host.eventSource.emit('GENERATION_STARTED','normal',{},false);await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat),100000,()=>{},'normal');},user);
    const id=await page.evaluate(({story,patch})=>{const id=window.host.chat.length,mes=story+(patch?`\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`:'');window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes]});const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const text=document.createElement('div');text.className='mes_text';text.textContent=story;row.append(text);document.querySelector('#chat').append(row);return id;},{story,patch});
    await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',id,'normal');await window.host.eventSource.emit('GENERATION_ENDED');},id);
    await page.waitForFunction(id=>Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`)),id);return id;
}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
        await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(()=>{
            localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:false,enableIncantation:false,eventNotifications:false,enableMemorySummaries:false}}));
            if(!localStorage.getItem('roleforge-hstats-preview-metadata'))localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],inventory:[],location:{place:'Oakland Pharmacy',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},worldClock:{day:1,time:'11:28'},progression:{currency:{gold:0,silver:10,copper:0}}}}));
        });
        await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
        await page.evaluate(()=>{
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
            const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;min-height:65px;box-sizing:border-box';form.append(input);document.body.append(form);
            window.calls=[];window.responses=[];window.host.generateRaw=async args=>{window.calls.push(args);const response=window.responses.shift();if(response===undefined)throw Error('Unexpected extra API request');return JSON.stringify(response);};window.host.updateMessageBlock=(id,message)=>document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes;
        });
        const patch={marketplace:{kind:'npcShop',id:'pharmacy',location:'Oakland Pharmacy',evidence:`${names[0]} ขวดละ 30 เหรียญทองแดง ส่วน${names[1]} ขวดละ 50 เหรียญทองแดงจ้ะ`,seller:{name:'Teresina'},denomination:'copper',items:names.map((name,i)=>({id:i?'antidote':'healing',name,category:'Consumable',description:i?'ยาสีเขียว ใช้ถอนพิษทั่วไป':'น้ำยาสีแดง ใช้ฟื้นฟูบาดแผล',properties:[i?'ลดพิษระดับต่ำ':'รักษาบาดแผล'],price:i?50:30,stockKnown:false,terms:{mode:'permanent'}}))}};
        await reply(page,'ขอซื้อยาฟื้นฟูกับยาแก้พิษอย่างละ 3 ขวดครับ',story,patch);
        const commerce=page.locator('.rf-commerce-composer');await commerce.locator('[data-commerce-action="confirm"]').waitFor();await commerce.locator('.rf-commerce-summary').click();
        await commerce.locator('[data-basket-item="antidote"]').check();
        for(const id of ['healing','antidote']){const input=commerce.locator(`[data-basket-quantity="${id}"]`);assert.equal(await input.getAttribute('max'),'99999');await input.fill('3');await input.dispatchEvent('change');}
        assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'240');assert.match(await commerce.innerText(),/90 ทองแดง/);assert.match(await commerce.innerText(),/150 ทองแดง/);assert.match(await commerce.innerText(),/รวม 6 ชิ้น/);
        assert.equal(await commerce.locator('[data-commerce-action="confirm"]').isEnabled(),true);assert.equal(await page.evaluate(()=>window.calls.length),0);
        await page.evaluate(()=>window.responses.push({narrative:'<tr-dialogue name="Teresina">ตกลงจ้ะ ยาสองชนิดอย่างละสามขวด รวมสองร้อยสี่สิบเหรียญทองแดง รอยืนยันชำระนะ</tr-dialogue>',decision:{outcome:'accept',amount:240}}));
        await commerce.locator('[data-commerce-action="offer"]').click();await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce?.sessions?.some(s=>s.agreed));
        let saved=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.equal(saved.inventory.length,0);assert.equal(saved.progression.currency.silver,10);assert.equal(saved.commerce.receipts.length,0);
        assert.equal(await commerce.locator('[data-commerce-action="confirm"]').isEnabled(),true);assert.equal(await commerce.locator('.rf-commerce-error').count(),0);
        const geometry=await commerce.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.ok(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));
        await page.locator('.rf-composer-dock').screenshot({path:artifacts+`pharmacy-agreed-${width}.png`});
        // Existing persisted sessions with the old placeholder recover on reload.
        const savedChat=await page.evaluate(()=>structuredClone(window.host.chat));await page.reload();await page.waitForFunction(()=>window.hStatsPreview?.ready);await page.evaluate(async savedChat=>{
            window.host.chat.splice(0,window.host.chat.length,...savedChat);
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';const form=document.createElement('form');form.id='send_form';const input=document.querySelector('#send_textarea');input.style.display='block';form.append(input);document.body.append(form);
            window.calls=[];window.host.generateRaw=async args=>{window.calls.push(args);return JSON.stringify({narrative:'<tr-narrative>เทเรซินารับเงิน 240 เหรียญทองแดงและส่งมอบยาฟื้นฟูสามขวดกับยาแก้พิษสามขวด</tr-narrative>',decision:{outcome:'accept',amount:240}});};window.host.updateMessageBlock=()=>{};await window.host.eventSource.emit('CHAT_CHANGED');
        },savedChat);
        await commerce.locator('[data-commerce-action="confirm"]').waitFor();await commerce.locator('.rf-commerce-summary').click();assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'240');assert.equal(await commerce.locator('[data-basket-quantity="healing"]').inputValue(),'3');
        await commerce.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce?.sessions?.some(s=>s.status==='completed'));
        saved=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.deepEqual([saved.progression.currency.gold,saved.progression.currency.silver,saved.progression.currency.copper],[0,7,60]);
        for(const name of names)assert.equal(saved.inventory.find(item=>item.name===name)?.quantity,3);
        assert.equal(saved.commerce.receipts.length,1);assert.equal(saved.commerce.receipts[0].amount,240);assert.equal(saved.commerce.receipts[0].quantity,6);assert.equal(await page.evaluate(()=>window.calls.length),1);
        const input=await page.evaluate(()=>JSON.parse(window.calls[0].prompt.split('REFERENCE DATA:\n')[1].split('\n')[0]));assert.ok(input.interaction.items.every(e=>e.stock===null&&e.stockKnown===false));assert.deepEqual(input.playerAction.items.map(e=>e.quantity),[3,3]);
        // A genuinely disclosed stock shortage still prevents an API request.
        const limited=structuredClone(patch);limited.marketplace.id='limited-stock';for(const entry of limited.marketplace.items){entry.stock=2;entry.stockKnown=true;}
        await reply(page,'ขอซื้อยาสองชนิดอย่างละ 3 ขวดอีกชุดครับ',story,limited);await commerce.locator('[data-commerce-action="confirm"]').waitFor();await commerce.locator('.rf-commerce-summary').click();await commerce.locator('[data-basket-item="antidote"]').check();
        for(const id of ['healing','antidote']){const quantity=commerce.locator(`[data-basket-quantity="${id}"]`);assert.equal(await quantity.getAttribute('max'),'2');await quantity.fill('3');await quantity.dispatchEvent('change');}
        await commerce.locator('[data-commerce-action="confirm"]').click();await commerce.locator('.rf-commerce-error').waitFor();assert.match(await commerce.innerText(),/สินค้าไม่พร้อมหรือจำนวนไม่พอ/);assert.equal(await page.evaluate(()=>window.calls.length),1);
        const unchanged=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.deepEqual(unchanged.progression.currency,saved.progression.currency);assert.deepEqual(unchanged.inventory,saved.inventory);assert.equal(unchanged.commerce.receipts.length,1);
        assert.deepEqual(errors,[]);console.log(`PASS ${width}px: 3+3 bottle basket, 90+150=240, unknown stock, offer without payment, saved session reload, exact once-only payment/receipt, one confirmation API, no overflow`);await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
