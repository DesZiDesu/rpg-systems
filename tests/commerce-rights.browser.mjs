// Real production prompt assembly, reply processing and composer. Model replies
// are fixtures; assertions separate ordinary replies from additional API calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
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
const artifacts='/workspace/artifacts/commerce-rights';await mkdir(artifacts,{recursive:true});
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
        document.querySelector('#chat').replaceChildren(...window.host.chat.map((message,index)=>{const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',index);const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes.replace(/<!--tretaresia_patch:[\s\S]*?-->/gu,'').replace(/<\/?tr-[^>]*>/gu,'');row.append(text);return row;}));return id;
    },{story,patch});
    await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',id,'normal');await window.host.eventSource.emit('GENERATION_ENDED');},id);
    await page.waitForFunction(id=>Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`)),id);
}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of process.env.RIGHTS_WIDTHS?process.env.RIGHTS_WIDTHS.split(",").map(Number):[320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(()=>{
            localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:false,enableMemorySummaries:false,enableIncantation:true,eventNotifications:false}}));
            localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],inventory:[],location:{place:'Oakland Inn',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},progression:{currency:{gold:2,silver:100,copper:50}}}}));
        });
        await page.goto(`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`);await page.waitForFunction(()=>window.hStatsPreview?.ready);
        await page.evaluate(()=>{
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
            document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
            const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;min-height:60px';form.append(input);document.body.append(form);
            window.calls=[];window.responses=[];window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
            window.host.generateRaw=async args=>{window.calls.push(args);const response=window.responses.shift();if(response===undefined)throw Error('Unexpected additional API call');return typeof response==='string'?response:JSON.stringify(response);};
            window.host.updateMessageBlock=(id,message)=>document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes.replace(/<\/?tr-[^>]*>/gu,'');
        });
        const state=()=>page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);
        const openInventory=async()=>{await page.evaluate(()=>document.querySelector('#tretaresia-rpg-wand-launcher').click());await page.locator('#tretaresia-rpg-overlay').waitFor({state:'visible'});await page.evaluate(()=>document.querySelector('[data-tab="inventory"]').click());};
        const closeInventory=async()=>{await page.evaluate(()=>document.querySelector('#tretaresia-rpg-close').click());};
        const shot=async name=>{if(width===390){await page.waitForTimeout(850);await page.screenshot({animations:'disabled',path:`${artifacts}/${name}.png`});}};
        const npc=quote=>`<tr-dialogue name="Garrick">${quote}</tr-dialogue>`;
        const offers=[
            {id:'cloak',itemName:'เสื้อคลุม',price:4,stock:3,terms:{mode:'permanent'}},
            {id:'room203',itemName:'ห้องเดี่ยว',price:5,terms:{mode:'access',scope:'ห้อง 203 Oakland Inn',validUntil:{day:2,time:'10:00'},delivery:{name:'กุญแจห้อง 203'},includes:['อาหารเช้า','น้ำอุ่น 1 ถัง'],deposit:3,conditions:'คืนกุญแจตอนเช็กเอาต์'}},
            {id:'horse',itemName:'เช่าม้า',price:6,terms:{mode:'rental',scope:'ม้าขนเทา',durationMinutes:1440,delivery:{name:'ม้าเช่าขนเทา'},deposit:10,conditions:'นำม้ากลับมาคืนที่คอกของ Garrick'}},
            {id:'ferry',itemName:'ตั๋วเรือ',price:2,terms:{mode:'access',scope:'เรือข้ามแม่น้ำ',uses:1,delivery:{name:'ตั๋วเรือข้ามแม่น้ำ'}}},
            {id:'forge',itemName:'สั่งตีดาบ',price:7,terms:{mode:'service',scope:'งานตีดาบเหล็ก',validUntil:{day:2,time:'12:00'},delivery:{name:'ดาบเหล็กสั่งทำ'},conditions:'มารับดาบเมื่อช่างยืนยันว่าทำเสร็จ'}},
            {id:'library',itemName:'สมาชิกห้องสมุด',price:10,terms:{mode:'access',scope:'ห้องสมุด',permanent:true,conditions:'เข้าอ่านหนังสือได้ตลอดชีพ'}}
        ];
        const quote='เสื้อคลุมราคา 4 เงิน ห้องเดี่ยวราคา 5 เงิน รับกุญแจห้อง 203 พร้อมอาหารเช้าและน้ำอุ่นหนึ่งถัง มัดจำ 3 เงิน เช่าม้าราคา 6 เงิน รับม้าเช่าขนเทา มัดจำ 10 เงิน ตั๋วเรือราคา 2 เงิน รับตั๋วเรือข้ามแม่น้ำ สั่งตีดาบราคา 7 เงิน ได้ดาบเหล็กสั่งทำเมื่อเสร็จ สมาชิกห้องสมุดตลอดชีพราคา 10 เงิน';
        const marketplace={kind:'npcShop',id:'all-types',location:'Oakland Inn',seller:{name:'Garrick'},denomination:'silver',evidence:quote,items:offers};
        await receive(page,'ฉันขอดูสินค้าและบริการที่ซื้อหรือเช่าได้',npc(quote),{sceneTracker:{loc:'Oakland Inn',d:1,t:'10:20'},marketplace,ops:[]});
        assert.equal((await state()).inventory.length,0);assert.equal(await page.evaluate(()=>window.calls.length),0);
        assert.match(await page.evaluate(()=>window.outgoingContract),/PURCHASE TYPES \/ RIGHTS \/ RENTALS \/ SERVICES/);
        await page.locator('[data-dock-panel=commerce]').click();
        const bar=page.locator('.rf-commerce-composer[data-kind="buy"]');await bar.locator('.rf-commerce-summary').click();
        assert.equal(await bar.locator('.rf-commerce-basket-row').count(),6);
        await shot('01-catalog');
        // Choose each type locally: no API call is needed to inspect terms.
        for(const [id,name] of [['room203','02-room-offer'],['horse','03-rental-offer'],['ferry','04-ticket-offer'],['forge','05-service-offer'],['library','06-lifetime-offer']]){
            await bar.locator('input[data-basket-item]').evaluateAll((inputs,id)=>{for(const input of inputs){if(input.checked!== (input.dataset.basketItem===id)){input.checked=input.dataset.basketItem===id;input.dispatchEvent(new Event('change',{bubbles:true}));break;}}},id);
            // Re-rendered checkboxes need another pass until only the target remains.
            for(let step=0;step<10;step++){
                const wrong=bar.locator(`input[data-basket-item]:checked:not([data-basket-item="${id}"])`);if(!await wrong.count())break;await wrong.first().uncheck();
            }
            if(!await bar.locator(`input[data-basket-item="${id}"]`).isChecked())await bar.locator(`input[data-basket-item="${id}"]`).check();
            await shot(name);
        }
        await bar.locator('input[data-basket-item="library"]').uncheck();await bar.locator('input[data-basket-item="room203"]').check();
        assert.match(await bar.innerText(),/มัดจำเพิ่ม/);assert.match(await bar.innerText(),/8 เงิน/);
        await page.locator('.rf-dock-collapse').click();assert.equal(await bar.isVisible(),false);await shot('07-minimized');await page.locator('.rf-dock-collapse').click();
        // One explicit game button dispatch, saving the same message and a receipt.
        await page.evaluate(()=>window.responses.push({narrative:'Garrick รับเงินค่าห้องและมัดจำ ก่อนส่งกุญแจห้อง 203 ให้',decision:{outcome:'accept',amount:5}}));
        await bar.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.rights.length===1);
        const paid=await state();assert.equal(paid.progression.currency.silver,92);assert.equal(paid.inventory[0].name,'กุญแจห้อง 203');assert.equal(paid.inventory[0].commerceRightId,paid.commerce.rights[0].id);assert.equal(await page.evaluate(()=>window.calls.length),1);
        await openInventory();await page.locator('.rf-right-card summary').click();assert.equal(await page.locator('.rf-right-card').count(),1);assert.match(await page.locator('.rf-right-card').innerText(),/มัดจำที่จ่าย/);await shot('08-room-active');await closeInventory();
        // A pure clock advance expires access without another task or erasing the key.
        await receive(page,'เช้าวันถัดมาฉันเก็บสัมภาระเตรียมลงไปคืนกุญแจ','<tr-narrative>เวลาเช็กเอาต์ผ่านไปแล้ว Noah เก็บสัมภาระในห้อง</tr-narrative>',{sceneTracker:{loc:'Oakland Inn',d:2,t:'10:05'},ops:[]});
        assert.equal((await state()).inventory.length,1);assert.equal((await state()).progression.currency.silver,92);assert.equal(await page.evaluate(()=>window.calls.length),1);
        await openInventory();assert.equal(await page.locator('.rf-right-card[data-right-status="expired"]').count(),1);await shot('09-room-expired');await closeInventory();
        const current=(await state()).commerce.rights[0];
        const returned='ข้ารับคืนกุญแจห้อง 203 แล้ว นี่เงินมัดจำคืน 3 เงิน';
        await receive(page,'ฉันคืนกุญแจห้อง 203 ให้ Garrick',npc(returned),{sceneTracker:{loc:'Oakland Inn',d:2,t:'10:06'},commerceRights:[{id:current.id,revision:current.revision,action:'return',evidence:returned,userEvidence:'ฉันคืนกุญแจห้อง 203 ให้ Garrick',refundAmount:3}],ops:[['inc','progression.currency.silver',3],['delete','inventory',paid.inventory[0].id]]});
        assert.equal((await state()).progression.currency.silver,95);assert.equal((await state()).inventory.length,0);assert.equal((await state()).commerce.rights[0].status,'returned');assert.equal(await page.evaluate(()=>window.calls.length),1,'lifecycle events use the same normal reply, without recovery or another task');
        await openInventory();await page.locator('.rf-rights-history>summary').click();await page.locator('.rf-right-card summary').click();await shot('10-returned-refund');await closeInventory();
        // A fresh service purchase has no immediate crafted inventory output.
        const serviceQuote='สั่งตีดาบราคา 7 เงิน ได้ดาบเหล็กสั่งทำเมื่อทำเสร็จ';
        await receive(page,'ฉันขอสั่งตีดาบ',npc(serviceQuote),{sceneTracker:{loc:'Oakland Inn'},marketplace:{...marketplace,id:'service-order',evidence:serviceQuote,items:[offers[4]]},ops:[]});
        const serviceSession=await bar.getAttribute('data-session');assert.ok(serviceSession);
        await receive(page,'ตกลง ซื้อราคา 7 เงิน',npc('ข้ารับงานตีดาบเหล็กไว้แล้ว มารับเมื่อทำเสร็จ'),{sceneTracker:{loc:'Oakland Inn'},commerce:{sessionId:serviceSession,revision:0,action:'confirm',amount:7,denomination:'silver',evidence:'ตกลง ซื้อราคา 7 เงิน',decision:{outcome:'accept',amount:7}},ops:[]});
        const service=(await state()).commerce.rights.find(r=>r.terms.mode==='service');assert.ok(service);assert.equal((await state()).inventory.length,0);assert.equal((await state()).progression.currency.silver,88);assert.equal(await page.evaluate(()=>window.calls.length),1);
        await openInventory();await shot('11-service-pending');await closeInventory();
        await receive(page,'ฉันรอจนถึงเวลานัดรับดาบ','<tr-narrative>เวลานัดรับงานมาถึงแล้ว Noah รอให้ Garrick นำดาบออกมา</tr-narrative>',{sceneTracker:{loc:'Oakland Inn',d:2,t:'12:00'},ops:[]});
        await openInventory();assert.equal(await page.locator('.rf-right-card[data-right-status="due"]').count(),1);await shot('18-service-due');await closeInventory();
        const complete='งานตีดาบเหล็กเสร็จเรียบร้อยแล้ว ข้าส่งมอบดาบเหล็กสั่งทำให้เจ้า';
        await receive(page,'ฉันมารับดาบที่สั่งทำ',npc(complete),{sceneTracker:{loc:'Oakland Inn',d:2,t:'12:00'},commerceRights:[{id:service.id,revision:0,action:'complete',evidence:complete}],ops:[['inc','inventory',{name:'ดาบเหล็กสั่งทำ',quantity:1}]]});
        assert.equal((await state()).inventory.length,1);assert.equal((await state()).inventory[0].name,'ดาบเหล็กสั่งทำ');assert.equal((await state()).commerce.rights.find(r=>r.id===service.id).status,'completed');assert.equal(await page.evaluate(()=>window.calls.length),1);
        await openInventory();await page.locator('.rf-rights-history>summary').click();await shot('12-service-completed');await closeInventory();
        const otherQuote='เสื้อคลุมราคา 4 เงิน เช่าม้าราคา 6 เงิน รับม้าเช่าขนเทา มัดจำ 10 เงิน ตั๋วเรือราคา 2 เงิน รับตั๋วเรือข้ามแม่น้ำ สมาชิกห้องสมุดตลอดชีพราคา 10 เงิน';
        await receive(page,'ฉันขอซื้อเสื้อคลุม ตั๋วเรือ สมาชิกห้องสมุด และเช่าม้า',npc(otherQuote),{sceneTracker:{loc:'Oakland Inn'},marketplace:{...marketplace,id:'other-types',evidence:otherQuote,items:[offers[0],offers[2],offers[3],offers[5]]},ops:[]});
        await bar.locator('.rf-commerce-summary').click();
        for(const id of ['horse','ferry','library'])await bar.locator(`input[data-basket-item="${id}"]`).check();
        await page.evaluate(()=>window.responses.push({narrative:'Garrick รับเงิน ส่งเสื้อคลุม ม้าเช่าขนเทา และตั๋วเรือ พร้อมยืนยันสมาชิกห้องสมุด',decision:{outcome:'accept',amount:22}}));
        await bar.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.rights.length===5);
        assert.equal((await state()).progression.currency.silver,56);assert.equal((await state()).inventory.length,4);assert.equal(await page.evaluate(()=>window.calls.length),2);
        await openInventory();assert.ok(await page.getByText('เป็นกรรมสิทธิ์ของคุณ',{exact:true}).count()>=2);await shot('13-owned-rental-ticket-lifetime');await page.locator('.rf-owned-caption').first().scrollIntoViewIfNeeded();await shot('17-owned-goods');await closeInventory();
        const horse=(await state()).commerce.rights.find(r=>r.terms.mode==='rental'),ticket=(await state()).commerce.rights.find(r=>r.itemName==='ตั๋วเรือ');
        const used='เจ้าใช้ตั๋วเรือข้ามแม่น้ำเพื่อขึ้นเรือแล้ว';
        await receive(page,'ฉันใช้ตั๋วเรือข้ามแม่น้ำ',npc(used),{sceneTracker:{loc:'Oakland Inn'},commerceRights:[{id:ticket.id,revision:0,action:'use',evidence:used,userEvidence:'ฉันใช้ตั๋วเรือข้ามแม่น้ำ'}],ops:[]});
        assert.equal((await state()).commerce.rights.find(r=>r.id===ticket.id).remainingUses,0);assert.equal(await page.evaluate(()=>window.calls.length),2);
        await openInventory();await shot('14-ticket-used');await closeInventory();
        await receive(page,'ฉันพาม้ากลับมาที่คอก','<tr-narrative>ม้าขนเทาหยุดที่คอก กำหนดเช่าสิ้นสุดแล้ว</tr-narrative>',{sceneTracker:{loc:'Oakland Inn',d:3,t:'12:10'},ops:[]});
        await openInventory();assert.equal(await page.locator('.rf-right-card[data-right-status="expired"]').count(),1);await shot('15-rental-expired');await closeInventory();
        const horseReturn='ข้ารับคืนม้าเช่าขนเทาแล้ว นี่มัดจำคืน 10 เงิน';
        await receive(page,'ฉันคืนม้าเช่าขนเทาให้ Garrick',npc(horseReturn),{sceneTracker:{loc:'Oakland Inn'},commerceRights:[{id:horse.id,revision:0,action:'return',evidence:horseReturn,userEvidence:'ฉันคืนม้าเช่าขนเทาให้ Garrick',refundAmount:10}],ops:[]});
        assert.equal((await state()).progression.currency.silver,66);assert.equal((await state()).inventory.length,3);assert.equal((await state()).commerce.rights.find(r=>r.terms.permanent).status,'active');assert.equal(await page.evaluate(()=>window.calls.length),2);
        await openInventory();await page.locator('.rf-rights-history>summary').click();await shot('16-rental-returned');await closeInventory();
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
        console.log(`PASS ${width}px: actual loader, all purchase types, inline metadata, deposits, key persistence, story expiry, return/refund, service delivery, duplicate-ops protection, two explicit API buttons only; zero added lifecycle tasks`);await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
