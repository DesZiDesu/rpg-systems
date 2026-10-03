// Production loader, ordinary reply events, saved settings and actual Main Chat DOM.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright` : 'playwright');
const root=new URL('../',import.meta.url), base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));
  res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
async function receive(page,user,story,patch){
 const id=await page.evaluate(({user,story,patch})=>{
  window.host.chat.push({is_user:true,name:'Player',mes:user}); const id=window.host.chat.length;
  const mes=story+(patch?`\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`:'');
  window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes]});
  document.querySelector('#chat').replaceChildren(...window.host.chat.map((message,index)=>{
   const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',index);
   const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes.replace(/<!--tretaresia_patch:[\s\S]*?-->/gu,'');row.append(text);return row;
  })); return id;
 },{user,story,patch});
 await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,id,'normal'),id);
 await page.waitForFunction(id=>Object.keys(window.host.chatMetadata.tretaresia_rpg_scene_history||{}).some(key=>key.startsWith(`${id}:`)),id);
 await page.waitForTimeout(200);return page.locator(`#chat .mes[mesid="${id}"]`);
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('console',msg=>{if(msg.type()==='error'||msg.type()==='warning')console.log(msg.type(),msg.text());});page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,showSceneTracker:true,eventNotifications:false,enableMarketplace:true,enableAuctions:true,enableMissionBoard:true,enableGroupBoard:true,enableStoryMemory:true,enableStoryAgenda:true,enableQuestObjectives:true,enableMemorySummaries:true,memoryAutoSummary:false}}));
   localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Player'},npcs:[],quests:[],inventory:[],location:{narrativeVersion:1,place:'Guild'},onboarding:{locationSeeded:true},progression:{currency:{silver:10,gold:50}}}}));
  });
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);
  await page.evaluate(()=>{
   document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#chat').style.cssText='display:block;padding:12px 12px 240px;box-sizing:border-box';
   window.host.extensionSettings.tretaresia_rpg.chatPresentation=true;
   const style=document.createElement('style');style.textContent='#send_form{position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#191816;box-sizing:border-box}#send_textarea{display:block;width:100%;height:60px;font:inherit}';document.head.append(style);
   const form=document.createElement('form');form.id='send_form';form.append(document.querySelector('#send_textarea'));const send=document.createElement('button');send.id='send_but';send.type='button';send.textContent='Send';form.append(send);document.body.append(form);
   window.calls=0;window.responses=[];window.host.generateQuietPrompt=async args=>{window.calls++;await window.host.eventSource.emit(window.host.eventTypes.GENERATION_STARTED,'quiet',{},false);window.lastCommercePrompt=args.quietPrompt;const reply=window.responses.shift();if(!reply)throw Error('Unexpected request');await window.host.eventSource.emit(window.host.eventTypes.GENERATION_ENDED);return JSON.stringify(reply);};
   window.host.updateMessageBlock=(id,message)=>{document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes;};
   window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
  });
  const bar=page.locator('.rf-commerce-composer');
  const action=async(name,decision,narrative='NPC considers your terms carefully.')=>{
   const before=await page.evaluate(()=>window.calls);await page.evaluate(reply=>window.responses.push(reply),{narrative,decision});
   await bar.locator(`[data-commerce-action="${name}"]`).click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer[aria-busy="true"]'));
   assert.equal(await page.evaluate(()=>window.calls),before+1);assert.equal(await bar.locator('[role="alert"]').count(),0);
  };
  const recovered=await receive(page,'ขอดูสินค้าที่ขาย','<tr-header name="Rally"></tr-header><tr-narrative>Rally shows goods for sale in the shop.\n- Potion: 2 silver\n- Antidote: 4 silver</tr-narrative>');
  await bar.waitFor({state:'visible'});assert.equal(await recovered.locator('.trpg-marketplace-event,.trpg-auction').count(),0);
  const original=await page.evaluate(()=>({text:window.host.chat.at(-1).mes,len:window.host.chat.length,user:window.host.chat.at(-2).mes}));
  await bar.locator('.rf-commerce-summary').click();await bar.locator('.rf-commerce-summary').click();assert.equal(await page.evaluate(()=>window.calls),0);
  await action('confirm',{outcome:'accept',amount:2},'<tr-dialogue name="Rally">ตกลง ข้ารับสองเหรียญเงิน นี่โพชั่นของเจ้า</tr-dialogue>');
  assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),8);
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory[0].quantity),1);
  assert.equal(await page.evaluate(()=>window.host.chat.length),original.len);assert.equal(await page.evaluate(()=>window.host.chat.at(-2).mes),original.user);assert.ok((await page.evaluate(()=>window.host.chat.at(-1).mes)).startsWith(original.text));
  await recovered.getByText('ตกลง ข้ารับสองเหรียญเงิน นี่โพชั่นของเจ้า',{exact:false}).waitFor();
  const sale=await receive(page,'ฉันเสนอขาย Potion ให้ Mira','<tr-header name="Mira"></tr-header><tr-dialogue name="Mira">I offer to buy your Potion for 5 silver.</tr-dialogue>',{sceneTracker:{loc:'Guild'},marketplace:{kind:'npcPurchase',id:'sale',buyer:{name:'Mira',budget:7},item:{itemName:'Potion',quantity:1},askPrice:5,denomination:'silver'},ops:[]});
  await bar.locator('.rf-commerce-amount').fill('6');await action('offer',{outcome:'counter',amount:5});
  assert.equal(await bar.locator('.rf-commerce-amount').inputValue(),'5');assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory[0].quantity),1);
  await action('confirm',{outcome:'accept',amount:5});assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),13);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),0);
  const auction=await receive(page,'ขอดูรายการประมูล','The auctioneer displays the auction catalog.',{sceneTracker:{loc:'Guild'},auction:{id:'new-ai-auction',denomination:'gold',entryFee:0,deposit:2,lots:[{id:'blade',name:'Blade',openingBid:3,minIncrement:1,bidders:[{name:'Rally',budget:20},{name:'Mira',budget:8}]}]},ops:[]});
  await bar.waitFor({state:'visible'});await action('join',{outcome:'joined'});await bar.locator('.rf-commerce-summary').click();assert.match(await bar.innerText(),/20 ทอง/);
  const bidders=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions.at(-1).participants.map(p=>p.id));
  await bar.locator('.rf-commerce-amount').fill('4');await action('bid',{outcome:'open',participants:[{id:bidders[0],action:'bid',amount:20,reason:'This heirloom is worth all my savings'},{id:bidders[1],action:'withdraw',reason:'Beyond my means'}]},'<tr-dialogue name="Rally">ข้าจะลงทั้งยี่สิบเหรียญเพื่อดาบเล่มนี้</tr-dialogue>');
  assert.match(await bar.innerText(),/Rally/);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),0);
  await action('wait',{outcome:'sold',participants:[]});assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),50);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions.at(-1).participants[0].spent),20);
  const boards=await receive(page,'ขออ่านกระดานภารกิจและกระดานกิลด์','You read the mission board. You browse the guild board.',{sceneTracker:{loc:'Guild'},missionBoard:{missions:[{name:'Delivery',objective:'Deliver the letter',reward:'3 silver'}]},groupBoard:{entries:[{kind:'guild',name:'Dawn'}]},ops:[['upsert','storyMemories',{id:'promise',title:'Return a book',kind:'Promise',detail:'Promised to return the book'}],['upsert','storyAgenda',{id:'meeting',title:'Meet Rally',dueDay:2}],['upsert','quests',{id:'job',name:'Errand',objectives:[{id:'step',title:'Bring the book'}]}]]});
  await boards.locator('.trpg-mission-board').waitFor();await boards.locator('.trpg-group-board').waitFor();await boards.locator('.trpg-story-events').waitFor();await boards.locator('.trpg-story-events>summary').click();assert.match(await boards.innerText(),/Return a book/);assert.match(await boards.innerText(),/Bring the book/);assert.match(await boards.innerText(),/Meet Rally/);
  const missing=await receive(page,'ขอดูสินค้า','Rally แสดงสินค้าที่ขายในร้านให้ดู แต่ยังไม่ระบุราคา',{sceneTracker:{loc:'Guild'},ops:[]});await missing.locator('.trpg-system-status').waitFor();
  await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor());assert.match(await page.evaluate(()=>[...window.prompts.values()].join('\n')),/MAIN CHAT INTERACTION CHECK/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
  console.log(`PASS production API-per-action composer, same-message continuation, consent settlement, independent NPC all-in winner, all story record cards and both boards at ${width}px`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
