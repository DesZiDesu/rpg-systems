// Actual extension loader and native chat events. The reported final response
// is supplied verbatim, with reasoning separate and no machine marketplace.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {mixedRoomUser,mixedRoomStory,mixedRoomThoughts} from './fixtures/mixed-room-offer.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=new URL('docs/previews/commerce-v0553/',root).pathname;await mkdir(artifacts,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
 const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
async function start(page,user){await page.evaluate(async user=>{
 window.host.chat.push({is_user:true,name:'Noah',mes:user});await window.host.eventSource.emit('MESSAGE_SENT',window.host.chat.length-1);await window.host.eventSource.emit('GENERATION_STARTED','normal',{},false);
 await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat),100000,()=>{},'normal');
},user);}
async function finish(page,story,patch=null){
 const id=await page.evaluate(({story,patch})=>{
  const id=window.host.chat.length,mes=story+(patch?`\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`:'');window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes],extra:{reasoning:window.reportThoughts}});
  const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const text=document.createElement('div');text.className='mes_text';text.textContent=story;row.append(text);document.querySelector('#chat').append(row);return id;
 },{story,patch});
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
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,enableMarketplace:true,enableAuctions:true,enableIncantation:true,eventNotifications:false,enableMemorySummaries:false}}));
   const detail='สร้างความเสียหายจากความร้อนและแรงกระแทกด้วยการควบคุมออร่าอย่างต่อเนื่อง '+ 'คำอธิบายยาวที่ต้องอ่านได้ครบภายในกรอบหน้าต่าง '.repeat(8);
   localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],skills:[],proficiencies:{techniques:[{id:'fire',name:'Fire Ball',category:'Magic',proficiency:6,description:'วิชาลูกไฟ',ability:{kind:'magic',effect:detail,target:'เป้าหมายเดี่ยว',range:'ระยะกลาง',costKnown:true,costs:[{resource:'Aura',amount:null,note:'ปริมาณออร่าที่ใช้แปรผันตามขนาดและความรุนแรงของลูกไฟ'}],cooldown:{unit:'unknown',condition:detail},conditions:[detail],strengths:[detail],weaknesses:[detail],incantation:{required:true,short:'จงลุกโชน!',full:'เพลิงที่หลับใหล จงรวมตัว\nรับเจตนาของข้าแล้วมุ่งสู่เป้าหมาย!',silent:{available:false,reason:'ระดับความเชี่ยวชาญยังต่ำเกินไป จำเป็นต้องใช้คำพูดเพื่อช่วยกำหนดทิศทางและควบคุมการไหลของพลัง '+detail}}}}]},inventory:[{id:'sword',name:'ดาบเหล็ก',category:'Weapon',quantity:1},{id:'shield',name:'โล่ไม้',category:'Armor',quantity:1}],location:{place:'Oakland Inn',narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true},worldClock:{day:1,time:'10:20'},progression:{currency:{gold:1,silver:10,copper:50}}}}));
  });
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
  await page.evaluate(()=>{
   document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 250px;font-size:16px;line-height:1.6;box-sizing:border-box';
   const form=document.createElement('form');form.id='send_form';form.style.cssText='position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#181818;box-sizing:border-box';const input=document.querySelector('#send_textarea');input.style.cssText='display:block;width:100%;height:65px;box-sizing:border-box';form.append(input);document.body.append(form);
   window.calls=[];window.responses=[];window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
   window.host.generateRaw=async args=>{window.calls.push(args);const response=window.responses.shift();if(response===undefined)throw Error('Unexpected extra API request');return JSON.stringify(response);};
   window.host.updateMessageBlock=(id,message)=>document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes;
  });
  await start(page,'ฉันมองไปรอบโรงเตี๊ยม');await finish(page,'<tr-narrative>การ์ริกยืนอยู่หลังเคาน์เตอร์ คุณยังอยู่ในโรงเตี๊ยม</tr-narrative>');
  const abilities=page.locator('.rf-incantation').first();await abilities.locator('[data-ability-select]').selectOption('technique:fire');await abilities.locator('[data-ability-action="details"]').click();
  await page.addStyleTag({content:'.rf-incantation dd{font-size:24px;white-space:nowrap;min-width:400px}.rf-incantation .rf-ability-stats span,.rf-incantation .rf-ability-note{white-space:nowrap}'});
  const fits=await abilities.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,dd:[...el.querySelectorAll('dd')].map(dd=>({width:dd.clientWidth,scroll:dd.scrollWidth,size:getComputedStyle(dd).fontSize,white:getComputedStyle(dd).whiteSpace}))}));
  assert.ok(fits.scroll<=fits.width+1,JSON.stringify(fits));for(const dd of fits.dd){assert.ok(dd.scroll<=dd.width+1,JSON.stringify(dd));assert.equal(dd.size,'11px');assert.equal(dd.white,'normal');}
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`ability-details-${width}.png`});
  await abilities.locator('[data-ability-action="train"]').click();const training=page.locator('.rf-training-composer');await training.locator('[data-ability-action="practice-control"]').waitFor();
  // Waiting begins with the real user request. Reading planning grants nothing.
  await page.evaluate(thoughts=>window.reportThoughts=thoughts,mixedRoomThoughts);await start(page,mixedRoomUser);
  const commerce=page.locator('.rf-commerce-composer');await commerce.locator('.rf-commerce-pending-title').waitFor();assert.equal(await commerce.getAttribute('data-kind'),'buy');assert.match(await commerce.innerText(),/รอ AI/);assert.equal(await commerce.locator('[data-commerce-action]').count(),0);assert.equal(await page.locator('[data-dock-panel="commerce"]').innerText(),'ซื้อ · …');
  assert.equal(await page.evaluate(()=>window.calls.length),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),2);
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`waiting-buy-${width}.png`});
  await page.locator('[data-dock-panel="abilities"]').click();assert.equal(await abilities.isVisible(),true);
  const id=await finish(page,mixedRoomStory);await commerce.locator('[data-commerce-action="confirm"]').waitFor();assert.equal(await commerce.isVisible(),true,'ready offer activates commerce even if another tab was selected during thinking');assert.equal(await training.isVisible(),false);
  assert.equal(await page.evaluate(()=>window.calls.length),0,'final NPC menu adds no opening API call');await commerce.locator('.rf-commerce-summary').click();
  const rows=commerce.locator('.rf-commerce-basket-row');assert.equal(await rows.count(),2);assert.match(await rows.nth(0).innerText(),/5 ทองแดง/);assert.match(await rows.nth(1).innerText(),/2 เงิน/);assert.doesNotMatch(await commerce.locator('.rf-purchase-option-terms').innerText(),/อาหารเช้า/);
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`mixed-room-${width}.png`});
  await commerce.locator('input[aria-label="เลือก ห้องพักรวมเตียงเดี่ยว"]').uncheck();await commerce.locator('input[aria-label="เลือก ห้องพักเดี่ยวชั้นบน"]').check();assert.equal(await commerce.locator('.rf-commerce-unit').inputValue(),'silver');assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'2');assert.match(await commerce.locator('.rf-commerce-price').innerText(),/2 เงิน/);assert.match(await commerce.innerText(),/อาหารเช้า/);
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`selected-private-room-${width}.png`});
  await page.evaluate(()=>window.responses.push({narrative:'<tr-narrative>การ์ริกรับเงินสองเหรียญเงินแล้วส่งกุญแจห้องพักเดี่ยวชั้นบนให้</tr-narrative><tr-dialogue name="Garrick">อาหารเช้ารวมอยู่แล้ว พักให้สบายหนึ่งคืนนะ</tr-dialogue>',decision:{outcome:'accept',amount:200}}));
  await commerce.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));
  let value=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.deepEqual([value.progression.currency.gold,value.progression.currency.silver,value.progression.currency.copper],[1,8,50]);assert.equal(value.inventory.filter(e=>e.category==='Key').length,1);assert.equal(value.inventory.find(e=>e.category==='Key').name,'กุญแจห้องพักเดี่ยวชั้นบน');assert.equal(value.commerce.rights[0].ends,null);assert.equal(await page.evaluate(()=>window.calls.length),1);
  assert.equal(await page.evaluate(()=>window.calls[0].prompt.includes('"amount":200')),true);
  await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_RECEIVED',id,'normal');await window.host.eventSource.emit('GENERATION_ENDED');},id);assert.equal(await page.locator('.rf-commerce-composer').count(),0);
  await page.locator('[data-dock-panel="training"]').click();await training.locator('[data-ability-action="stop"]').first().click();
  // An upgraded chat with a saved failed public opening is re-read locally.
  const upgradeId=await page.evaluate(({user,story})=>{const id=window.host.chat.length+1;window.host.chat.push({is_user:true,name:'Noah',mes:user},{is_user:false,name:'Narrator',mes:story,swipe_id:0,swipes:[story]});const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const text=document.createElement('div');text.className='mes_text';text.textContent=story;row.append(text);document.querySelector('#chat').append(row);return id;},{user:mixedRoomUser,story:mixedRoomStory});
  await page.evaluate(async()=>{await window.host.eventSource.emit('GENERATION_ENDED');});await commerce.locator('[data-commerce-action="confirm"]').waitFor();
  await page.waitForFunction(()=>Object.values(window.host.chatMetadata.tretaresia_rpg_social_events).flatMap(Object.values).some(r=>r.commerceOpening?.status==='ready'&&r.marketplace?.event?.items.length===2));
  // Replace only the newest event's opening record with a v0.55.2 failure.
  await page.evaluate(()=>{const records=Object.values(window.host.chatMetadata.tretaresia_rpg_social_events).flatMap(Object.values);const latest=records.at(-1);delete latest.marketplace;latest.missingSystems=['buy'];latest.commerceOpening={status:'no-disclosed-offer',source:'public-dialogue'};});
  await page.locator('[data-dock-panel="abilities"]').click();await page.waitForTimeout(500);await page.locator('[data-dock-panel="commerce"]').click();assert.equal(await commerce.locator('[data-commerce-action="confirm"]').isEnabled(),true);assert.equal(await page.evaluate(()=>window.calls.length),1,'local recovery of saved failure adds no API');
  // Cancel that recovered offer; it must not appear again after its continuation.
  await page.evaluate(()=>window.responses.push({narrative:'<tr-narrative>การ์ริกปิดสมุดเมื่อการเช่าครั้งใหม่นี้ถูกยกเลิก ไม่มีการรับเงินหรือส่งกุญแจเพิ่ม</tr-narrative>',decision:{outcome:'cancel'}}));await commerce.locator('[data-commerce-action="cancel"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));assert.equal(await page.evaluate(()=>window.calls.length),2);
  await start(page,'ฉันขอขายดาบเหล็กกับโล่ไม้');await commerce.locator('.rf-commerce-pending-title').waitFor();assert.equal(await commerce.getAttribute('data-kind'),'sell');assert.equal(await page.locator('[data-dock-panel="commerce"]').innerText(),'ขาย · …');
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`waiting-sell-${width}.png`});
  await finish(page,'<tr-dialogue name="Garrick">ข้ารับซื้อดาบเหล็ก 2 เหรียญเงิน และรับซื้อโล่ไม้ 5 เหรียญทองแดง</tr-dialogue>');await commerce.locator('[data-commerce-action="confirm"]').waitFor();await commerce.locator('.rf-commerce-summary').click();await commerce.locator('input[aria-label="เลือก โล่ไม้"]').uncheck();assert.equal(await commerce.locator('.rf-commerce-amount').inputValue(),'2');
  await page.locator('.rf-composer-dock').screenshot({path:artifacts+`mixed-sale-${width}.png`});
  await page.evaluate(()=>window.responses.push({narrative:'<tr-narrative>การ์ริกรับดาบเหล็กเพียงเล่มเดียวแล้วจ่ายเงินสองเหรียญเงิน โล่ไม้ยังอยู่กับผู้เล่น</tr-narrative>',decision:{outcome:'accept',amount:200}}));await commerce.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));
  value=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.deepEqual([value.progression.currency.gold,value.progression.currency.silver,value.progression.currency.copper],[1,8,250]);assert.equal(value.inventory.some(e=>e.id==='sword'),false);assert.equal(value.inventory.find(e=>e.id==='shield').quantity,1);assert.equal(await page.evaluate(()=>window.calls.length),3);
  await start(page,'ฉันพูดคำว่าซื้อเฉยๆ ไม่ได้จะซื้อ');assert.equal(await commerce.count(),0);await finish(page,'<tr-dialogue name="Garrick">ข้ายังไม่ได้เสนอสินค้าอะไรให้เจ้า</tr-dialogue>',{commerceIntent:{kind:'none',evidence:'ไม่ได้จะซื้อ'}});assert.equal(await commerce.count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);console.log(`PASS ${width}px: real waiting -> same-reply mixed-unit room offer with no key/no patch -> exact selected payment/key; failed saved opening recovers locally, cancel/repeat protection; mixed sale/exclusion; long skill metadata wraps despite host styles; no opening API`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
