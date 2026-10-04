// Real production prompt assembly, reply processing and composer. Model replies
// are fixtures; assertions separate ordinary replies from additional API calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {roomUser,roomQuote,roomStory} from './fixtures/disclosed-rooms.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{
    try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
        if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
        const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));
        res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
    }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const artifacts='/workspace/artifacts/commerce-openings',fixArtifacts='/workspace/artifacts/roleforge-v0532';await mkdir(artifacts,{recursive:true});await mkdir(fixArtifacts,{recursive:true});
async function receive(page,user,story,patch,type='normal'){
    await page.evaluate(async({user,type})=>{
        window.host.chat.push({is_user:true,name:'Noah',mes:user});await window.host.eventSource.emit('MESSAGE_SENT',window.host.chat.length-1);
        await window.host.eventSource.emit('GENERATION_STARTED',type,{},false);
        await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat),100000,()=>{},type);
        window.outgoingContract=window.prompts.get('tretaresia_rpg_response_contract');
    },{user,type});
    const id=await page.evaluate(({story,patch})=>{
        const id=window.host.chat.length,mes=story+(patch?`\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`:'');
        window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes]});
        document.querySelector('#chat').replaceChildren(...window.host.chat.map((message,index)=>{const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',index);const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes.replace(/<!--tretaresia_patch:[\s\S]*?-->/gu,'');row.append(text);return row;}));return id;
    },{story,patch});
    await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',id,'normal');await window.host.eventSource.emit('GENERATION_ENDED');},id);
    await page.waitForFunction(id=>Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`)),id);
}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(()=>{
            localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:false,enableMemorySummaries:false,eventNotifications:false}}));
            localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],inventory:[{id:'sword',name:'ดาบเหล็ก',quantity:1,category:'Weapon'}],location:{place:'Oakland Inn',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},worldClock:{day:7,time:'18:30'},progression:{currency:{gold:2,silver:100,copper:50}}}}));
        });
        await page.goto(`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`);await page.waitForFunction(()=>window.hStatsPreview?.ready);
        await page.evaluate(()=>{
            window.host.extensionSettings.tretaresia_rpg.chatPresentation=true;
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
            document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
            const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;min-height:60px';form.append(input);document.body.append(form);
            window.calls=[];window.responses=[];window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
            window.host.generateRaw=async args=>{window.calls.push(args);const response=window.responses.shift();if(response===undefined)throw Error('Unexpected additional API call');return JSON.stringify(response);};
            window.host.updateMessageBlock=(id,message)=>document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes;
        });
        // Even an erroneous catalog cannot override a valid AI classification
        // that these words are mere conversation. Wallet and goods stay intact.
        const misleadingShop={kind:'npcShop',id:'no-intent-shop',location:'Oakland Inn',evidence:'ข้าแสดงสินค้าที่ขายในร้าน ยาราคา 2 เหรียญเงิน',seller:{name:'Garrick'},denomination:'silver',items:[{name:'ยา',price:2}]};
        for(const user of ['ฉันพูดคำว่า “ซื้อ” เฉยๆ ยังไม่ได้ต้องการทำรายการ','ฉันพูดว่าของนี้ขายยาก ไม่ได้จะขายดาบ','ซื้อหรือขายดีนะ ฉันยังตัดสินใจไม่ได้']){
            await receive(page,user,'<tr-dialogue name="Garrick">'+misleadingShop.evidence+'</tr-dialogue>',{sceneTracker:{loc:'Oakland Inn'},commerceIntent:{kind:'none',evidence:user},marketplace:misleadingShop,ops:[]});
            assert.equal(await page.locator('.rf-commerce-composer').count(),0);
            assert.equal(await page.evaluate(()=>window.calls.length),0);
            assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),100);
            const intent=await page.evaluate(()=>Object.values(window.host.chatMetadata.tretaresia_rpg_social_events).flatMap(Object.values).at(-1).commerceIntent);assert.equal(intent.kind,'none');
        }
        assert.match(await page.evaluate(()=>window.outgoingContract),/Never make a separate API call to classify intent/);
        if(width===390)await page.screenshot({path:fixArtifacts+'/talk-no-commerce-390.png'});
        // No marketplace object: the complete public room menu is sufficient
        // locally, including the story date from this reply's abbreviated clock.
        const legacyRooms={kind:'npcShop',location:'Oakland Inn',seller:{name:'Garrick'},evidence:roomQuote,denomination:'silver',items:[{name:'ห้องพักเดี่ยวธรรมดาชั้นสอง',price:5},{name:'ห้องพักพิเศษชั้นสอง',price:10}]};
        await receive(page,roomUser,roomStory,{sceneTracker:{loc:'Oakland Inn',d:7,t:'18:30'},commerceIntent:{kind:'buy',evidence:roomUser},...(width===320?{marketplace:legacyRooms}:{}),ops:[]});
        const bar=page.locator('.rf-commerce-composer[data-kind="buy"]');await bar.locator('[data-commerce-action="confirm"]').waitFor();
        assert.equal(await page.evaluate(()=>window.calls.length),0);
        await bar.locator('.rf-commerce-summary').click();
        assert.equal(await bar.locator('.rf-commerce-basket-row').count(),2);
        assert.match(await bar.innerText(),/ซุปร้อน|ระเบียง/);assert.match(await bar.innerText(),/Day 8|วันที่ 8|วัน 8/);assert.match(await bar.innerText(),/12:00/);
        assert.equal(await bar.locator('[data-commerce-action="confirm"]').isEnabled(),true);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        if(width===390)await page.locator('.rf-composer-dock').screenshot({path:fixArtifacts+'/room-offer-390.png'});
        await page.evaluate(()=>window.responses.push({narrative:'<tr-narrative>Garrick รับเงินห้าเหรียญเงินและยื่นกุญแจห้องพักเดี่ยวธรรมดาชั้นสองให้</tr-narrative><tr-dialogue name="Garrick">คืนกุญแจก่อนเที่ยงวันพรุ่งนี้นะ</tr-dialogue>',decision:{outcome:'accept',amount:5}}));
        await bar.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));
        const stay=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);
        assert.equal(stay.progression.currency.silver,95);assert.equal(stay.inventory.find(i=>i.category==='Key').name,'กุญแจห้องพักเดี่ยวธรรมดาชั้นสอง');assert.deepEqual(stay.commerce.rights[0].ends,{day:8,time:'12:00'});
        assert.equal(await page.evaluate(()=>window.calls.length),1);
        // Owned locations show a full property price but grant an owned key,
        // with a generic physical key in prose rather than an unnatural label.
        const propertyUser='ฉันขอซื้อบ้านริมแม่น้ำแบบถาวร',propertyQuote='ข้าขายบ้านริมแม่น้ำ ราคา 20 เหรียญทองแดง รวมกรรมสิทธิ์ถาวร';
        const propertyStory=`<tr-dialogue name="Garrick">${propertyQuote}</tr-dialogue><tr-narrative>Garrick หยิบกุญแจทองเหลืองมาวางบนโต๊ะให้ดู</tr-narrative>`;
        const property={kind:'npcShop',id:'owned-house',location:'Oakland Inn',evidence:propertyQuote,seller:{name:'Garrick'},denomination:'copper',items:[{name:'บ้านริมแม่น้ำ',price:20,category:'Property',description:'บ้านริมแม่น้ำพร้อมกรรมสิทธิ์ถาวร',stockKnown:false,negotiableKnown:false,terms:{mode:'permanent',scope:'บ้านริมแม่น้ำ',delivery:{name:'กุญแจบ้านริมแม่น้ำ',category:'Key',description:'กุญแจประตูบ้านริมแม่น้ำ'}}}]};
        await receive(page,propertyUser,propertyStory,{sceneTracker:{loc:'Oakland Inn',d:7,t:'18:35'},commerceIntent:{kind:'buy',evidence:propertyUser},marketplace:property,ops:[]});
        await bar.locator('[data-commerce-action="confirm"]').waitFor();await bar.locator('.rf-commerce-summary').click();
        assert.match(await bar.innerText(),/กุญแจบ้านริมแม่น้ำ/);assert.match(await bar.innerText(),/ซื้อถาวร|กรรมสิทธิ์ถาวร/);
        assert.equal(await bar.locator('.rf-commerce-quantity').isDisabled(),true);
        if(width===390)await page.locator('.rf-composer-dock').screenshot({path:fixArtifacts+'/property-offer-390.png'});
        await page.evaluate(()=>window.responses.push({narrative:'<tr-narrative>Garrick รับเงินยี่สิบเหรียญทองแดงแล้วส่งกุญแจบ้านริมแม่น้ำพร้อมกรรมสิทธิ์ให้</tr-narrative>',decision:{outcome:'accept',amount:20}}));
        await bar.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));
        const owned=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);
        assert.equal(owned.progression.currency.copper,30);assert.equal(owned.commerce.rights.length,1);
        const key=owned.inventory.find(i=>i.name==='กุญแจบ้านริมแม่น้ำ');assert.ok(key);assert.equal(key.category,'Key');assert.equal(key.commerceRightId,undefined);assert.match(key.description,/กรรมสิทธิ์ถาวร · บ้านริมแม่น้ำ/);
        assert.equal(owned.inventory.some(i=>i.name==='บ้านริมแม่น้ำ'),false);assert.equal(await page.evaluate(()=>window.calls.length),2);
        await page.locator('#chat .mes').last().locator('.trpg-narrative').filter({hasText:'Garrick รับเงินยี่สิบ'}).waitFor();
        if(width===390){await page.evaluate(()=>document.querySelector('#tretaresia-rpg-wand-launcher').click());await page.locator('#tretaresia-rpg-overlay').waitFor({state:'visible'});await page.evaluate(()=>document.querySelector('[data-tab="inventory"]').click());await page.waitForTimeout(850);await page.screenshot({animations:'disabled',path:fixArtifacts+'/property-key-inventory-390.png'});await page.locator('.tretaresia-list-card').filter({hasText:'กุญแจบ้านริมแม่น้ำ'}).screenshot({animations:'disabled',path:fixArtifacts+'/property-key-card-390.png'});}
        // A real owned-item sell request still opens a buyer offer. Presenting
        // the offer alone must not sell the sword or change the player's wallet.
        if(width===390)await page.evaluate(()=>document.querySelector('#tretaresia-rpg-close').click());
        const sellUser='ฉันขอขายดาบเหล็กให้เจ้าของร้าน',sellQuote='ข้ารับซื้อดาบเหล็ก 12 เหรียญเงิน';
        await receive(page,sellUser,`<tr-dialogue name="Garrick">${sellQuote}</tr-dialogue>`,{sceneTracker:{loc:'Oakland Inn'},commerceIntent:{kind:'sell',evidence:sellUser},marketplace:{kind:'npcPurchase',id:'real-sword-sale',location:'Oakland Inn',evidence:sellQuote,buyer:{name:'Garrick',budget:20},item:{itemId:'sword',itemName:'ดาบเหล็ก',quantity:1},askPrice:12,denomination:'silver'},ops:[]});
        await page.locator('.rf-commerce-composer[data-kind="sell"] [data-commerce-action="offer"]').waitFor();
        assert.equal(await page.evaluate(()=>window.calls.length),2);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.find(i=>i.id==='sword').quantity),1);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),95);
        assert.deepEqual(errors,[]);console.log(`PASS intent-none prevents buy/sell windows; a complete no-object Thai room menu opens in the same reply with no API; checkout/key settlement and permanent property key at ${width}px`);await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
