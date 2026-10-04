// Real production prompt assembly, reply processing and composer. Model replies
// are fixtures; assertions separate ordinary replies from additional API calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {innUser,innEvidence,innStory,innOffer} from './fixtures/inn-offer.mjs';
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
const artifacts='/workspace/artifacts/inn-commerce',fixArtifacts='/workspace/artifacts/roleforge-v0531';await mkdir(artifacts,{recursive:true});await mkdir(fixArtifacts,{recursive:true});
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
const typedInnStory=innStory+'<tr-dialogue name="Garrick">ห้องพักแต่ละแบบใช้ได้หนึ่งคืน รวมอาหารเช้าง่ายๆ กับน้ำอุ่นหนึ่งถัง ห้องพักธรรมดาชั้นสองใช้กุญแจห้องพักธรรมดาชั้นสอง ห้องกว้างหน่อย มีอ่างอาบน้ำส่วนตัวใช้กุญแจห้องอ่างอาบน้ำส่วนตัว ไม่มีมัดจำ</tr-dialogue>';
function typedInnOffer(id='inline-room-offer'){const offer=innOffer();offer.id=id;offer.items=offer.items.map((e,i)=>({...e,category:'Access',description:i?'ห้องกว้างพร้อมอ่างอาบน้ำส่วนตัว':'ห้องชั้นสอง เตียงเดี่ยวสะอาดสะอ้าน',properties:['สิทธิ์พักหนึ่งคืน','รวมอาหารเช้าและน้ำอุ่น'],terms:{mode:'access',scope:e.name,durationMinutes:1440,deposit:0,includes:['อาหารเช้าง่ายๆ','น้ำอุ่นหนึ่งถัง'],conditions:'สิทธิ์พักหนึ่งคืน',delivery:{name:i?'กุญแจห้องอ่างอาบน้ำส่วนตัว':'กุญแจห้องพักธรรมดาชั้นสอง',category:'Key',description:'กุญแจสำหรับห้องที่เลือกเท่านั้น'}}}));return offer;}
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of process.env.INN_WIDTHS?process.env.INN_WIDTHS.split(",").map(Number):[320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
        await page.addInitScript(()=>{
            localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:false,enableMemorySummaries:false,enableIncantation:true,eventNotifications:false}}));
            localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],inventory:[],location:{place:'Oakland Inn',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},progression:{currency:{gold:2,silver:100,copper:50}}}}));
        });
        await page.goto(`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`);await page.waitForFunction(()=>window.hStatsPreview?.ready);
        await page.evaluate(()=>{
            window.host.extensionSettings.tretaresia_rpg.chatPresentation=true;
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
            document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
            const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;min-height:60px';form.append(input);document.body.append(form);
            window.calls=[];window.responses=[];window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
            window.host.generateRaw=async args=>{window.calls.push(args);const response=window.responses.shift();if(response===undefined)throw Error('Unexpected additional API call');return typeof response==='string'?response:JSON.stringify(response);};
            window.host.updateMessageBlock=(id,message)=>document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes;
        });
        const skill={id:'demon-eye',name:'ดวงตามาร',type:'Passive',mastery:20,description:'มองเห็นร่องรอยพลังเวท',ability:{kind:'passive',effect:'มองเห็นร่องรอยพลังเวท',costKnown:true,costs:[],cooldown:{unit:'none',value:0,remaining:0,ready:true},incantation:{required:false,short:'',full:'',silent:{available:false}}}};
        await receive(page,'ฉันมีสกิลดวงตามารอยู่แล้ว จึงใช้มองร่องรอยพลังเวท','<tr-narrative>ดวงตามารที่ Noah มีอยู่แล้วมองเห็นร่องรอยพลังเวทบนประตู</tr-narrative>',{sceneTracker:{loc:'Oakland Inn'},ops:[['upsert','skills',skill]]});
        assert.match(await page.evaluate(()=>window.outgoingContract),/already-known skills/);
        assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.skills.find(s=>s.id==='demon-eye').mastery),20);
        assert.equal(await page.evaluate(()=>window.calls.length),0,'recording an established skill from the normal reply adds no API call');
        await receive(page,innUser,typedInnStory,{sceneTracker:{loc:'Oakland Inn',d:1,t:'10:20'},marketplace:typedInnOffer(),ops:[]});
        const bar=page.locator('.rf-commerce-composer[data-kind="buy"]');await bar.locator('[data-commerce-action="confirm"]').waitFor();
        assert.equal(await page.evaluate(()=>window.calls.length),0,'the room list opens from the same reply, without recovery');
        assert.match(await page.evaluate(()=>window.outgoingContract),/REQUIRED THIS REPLY: marketplace.kind="npcShop"/);
        assert.match(await page.evaluate(()=>window.outgoingContract),/ROOMS \/ RENTALS \/ PRICED SERVICES/);
        assert.match(await page.evaluate(()=>window.outgoingContract),/Every item needs description, category, properties/);
        assert.equal(await bar.locator('[data-commerce-action="confirm"]').isEnabled(),true);
        assert.deepEqual(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency),{gold:2,silver:100,copper:50,name:'Coins'});
        assert.equal(await bar.locator('.rf-commerce-diagnostic-report').count(),0);
        if(width===390)await page.locator('.rf-composer-dock').screenshot({path:fixArtifacts+'/buy-compact-390.png'});
        await bar.locator('.rf-commerce-summary').click();assert.equal(await bar.locator('.rf-commerce-basket-row').count(),2);
        assert.match(await bar.innerText(),/ห้องพักธรรมดาชั้นสอง/);assert.match(await bar.innerText(),/อ่างอาบน้ำส่วนตัว/);
        assert.match(await bar.innerText(),/สิทธิ์ใช้งาน/);assert.match(await bar.innerText(),/1440/);assert.doesNotMatch(await bar.innerText(),/เงื่อนไขยังไม่ครบ|ซื้อถาวร/);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.screenshot({path:`${artifacts}/rooms-inline-${width}.png`});
        if(width===390)await page.locator('.rf-composer-dock').screenshot({path:fixArtifacts+'/buy-details-390.png'});
        // Swipe/regenerate prompt assembly uses the opening schema, not a stale
        // interaction from the reply being replaced.
        for(const type of ['swipe','regenerate']){
            await page.evaluate(async type=>{await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat.slice(0,-1)),100000,()=>{},type);window.replacementContract=window.prompts.get('tretaresia_rpg_response_contract');},type);
            assert.match(await page.evaluate(()=>window.replacementContract),/REQUIRED THIS REPLY: marketplace.kind="npcShop"/);
        }
        // One explicit purchase task appends markup to the original message,
        // settles five silver once and delivers a linked timed-access key.
        await page.evaluate(()=>window.responses.push({narrative:'Garrick นับเหรียญเงินห้าเหรียญ แล้วส่งกุญแจห้องพักธรรมดาชั้นสองให้\n<tr-dialogue name="Garrick">พักได้หนึ่งคืน อาหารเช้ารวมแล้ว</tr-dialogue>',decision:{outcome:'accept',amount:5}}));
        await bar.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));
        assert.equal(await page.evaluate(()=>window.calls.length),1);assert.match(await page.evaluate(()=>window.calls[0].systemPrompt),/Always wrap actions in <tr-narrative>/);
        assert.match(await page.evaluate(()=>window.host.chat.at(-1).mes),/<tr-narrative>Garrick นับเหรียญเงิน/);
        assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),95);
        assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.rights.length),1);
        assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory[0].name),'กุญแจห้องพักธรรมดาชั้นสอง');
        const purchased=page.locator('#chat .mes').last();await purchased.locator('.trpg-narrative').filter({hasText:'Garrick นับเหรียญเงิน'}).waitFor();
        if(width===390){const captureStyle=await page.addStyleTag({content:'#send_form,.rf-composer-dock,#tretaresia-event-stack,#tretaresia-activity-island{display:none!important}'});try{await page.waitForTimeout(200);await purchased.locator('.trpg-narrative').filter({hasText:'Garrick นับเหรียญเงิน'}).screenshot({path:fixArtifacts+'/purchase-continuation-390.png'});await purchased.locator('.trpg-dialogue').filter({hasText:'พักได้หนึ่งคืน อาหารเช้ารวมแล้ว'}).screenshot({path:fixArtifacts+'/purchase-dialogue-390.png'});}finally{await captureStyle.evaluate(el=>el.remove());}}
        // A fresh normal offer adds no catalog-generation API after settlement.
        await receive(page,innUser,typedInnStory,{sceneTracker:{loc:'Oakland Inn',d:1,t:'10:20'},marketplace:typedInnOffer('fresh-room-offer'),ops:[]});
        await bar.locator('[data-commerce-action="cancel"]').waitFor();
        await page.evaluate(()=>window.responses.push({narrative:'Garrick เก็บสมุดบัญชี รอให้ตัดสินใจภายหลัง',decision:{outcome:'cancel'}}));
        await bar.locator('[data-commerce-action="cancel"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));
        assert.equal(await page.evaluate(()=>window.calls.length),2);
        assert.match(await page.evaluate(()=>window.host.chat.at(-1).mes),/<tr-narrative>Garrick เก็บสมุดบัญชี/);
        // A provider omitting the catalog must not trigger another API automatically.
        // Incomplete legacy room options remain blocked, never permanent ownership.

        await receive(page,innUser,innStory,{sceneTracker:{loc:'Oakland Inn'},ops:[]});
        await bar.waitFor();
        assert.equal(await page.evaluate(()=>window.calls.length),2);
        const confirm=bar.locator('[data-commerce-action="confirm"]');
        if(await confirm.count())assert.equal(await confirm.isDisabled(),true);
        assert.equal(await bar.locator('.rf-commerce-diagnostic-report').count(),0);
        assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),95);
        assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),1);
        assert.deepEqual(errors,[]);console.log(`PASS current conditional inn room prices inline with zero extra calls, same-turn ability registration, swipe/regenerate contract, complete access terms, missing catalog without extra calls and unchanged wallet/inventory at ${width}px`);await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
