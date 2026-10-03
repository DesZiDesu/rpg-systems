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
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:1100}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,showSceneTracker:true,eventNotifications:false,enableMarketplace:true,enableAuctions:true,enableMissionBoard:true,enableGroupBoard:true,enableStoryMemory:true,enableStoryAgenda:true,enableQuestObjectives:true,enableMemorySummaries:true,memoryAutoSummary:false}}));
   localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Player'},npcs:[],quests:[],inventory:[],location:{narrativeVersion:1,place:'Guild'},onboarding:{locationSeeded:true},progression:{currency:{silver:10,gold:50}}}}));
  });
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));
  await page.evaluate(()=>{
   document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#chat').style.cssText='display:block;padding:12px;box-sizing:border-box';
   window.calls=0;window.host.generateRaw=async()=>{window.calls++;throw Error('Unexpected paid call');};window.prompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.prompts.set(key,value);
   const send=document.createElement('button');send.id='send_but';send.onclick=()=>{window.sentActions=(window.sentActions||0)+1;};document.body.append(send);
  });
  const shopStory='<tr-header name="Rally"></tr-header><tr-narrative>Rally shows goods for sale in the shop.\n- Potion: 2 silver\n- Antidote: 4 silver</tr-narrative>';
  const recovered=await receive(page,'ขอดูสินค้าที่ขาย',shopStory);
  await recovered.locator('.trpg-marketplace-event-shop').waitFor({state:'visible'});
  assert.match(await recovered.innerText(),/Potion/);assert.equal(await recovered.locator('.trpg-system-status').count(),0);
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),10);
  const quote='ข้าแสดงสินค้าที่ขายในร้านให้ดู';
  const shop={kind:'npcShop',seller:{name:'Rally'},denomination:'silver',items:[{itemName:'Potion',price:2,stock:3}]};
  const haggled=await receive(page,'ต่อรองราคาสินค้า',`<tr-header name="Rally"></tr-header><tr-dialogue name="Rally">${quote}. ถ้าซื้อสองขวดจะลดราคาให้</tr-dialogue>`,{sceneTracker:{loc:'Guild'},marketplace:shop,ops:[]});
  await haggled.locator('.trpg-marketplace-event-shop').waitFor({state:'visible'});
  const sold=await receive(page,'ฉันซื้อ Potion ราคา 2 silver','Rally hands you a Potion after receiving 2 silver. Rally shows the goods for sale.',{sceneTracker:{loc:'Guild'},marketplace:shop,ops:[['inc','progression.currency.silver',-2,{category:'purchase',reason:'Bought Potion'}],['inc','inventory',{name:'Potion',quantity:1},{category:'purchase',reason:'Bought Potion'}]]});
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),8);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory[0].quantity),1);
  await sold.locator('.trpg-marketplace-event-shop').waitFor({state:'visible'});
  const buyOffer={kind:'npcPurchase',buyer:{name:'Mira'},item:{itemName:'Potion',quantity:1},askPrice:5,denomination:'silver'};
  const offer=await receive(page,'ฉันเสนอขาย Potion ให้ Mira','<tr-header name="Mira"></tr-header><tr-dialogue name="Mira">I offer to buy your Potion for 5 silver.</tr-dialogue>',{sceneTracker:{loc:'Guild'},marketplace:buyOffer,ops:[]});
  await offer.locator('.trpg-marketplace-event-offer').waitFor({state:'visible'});
  await offer.locator('.trpg-marketplace-primary').click();await page.waitForFunction(()=>window.sentActions===1);
  assert.match(await page.locator('#send_textarea').inputValue(),/ตกลงขาย Potion/);
  const sale=await receive(page,'ตกลงขาย Potion จำนวน 1 ให้ Mira ในราคา 5 silver','Mira pays you 5 silver and takes the Potion.',{sceneTracker:{loc:'Guild'},ops:[['inc','progression.currency.silver',5,{category:'sale',reason:'Sold Potion to Mira'}],['inc','inventory',{name:'Potion',quantity:-1},{category:'sale',reason:'Sold Potion to Mira'}]]});
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),13);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),0);
  const auction=await receive(page,'ขอดูรายการประมูล','The auctioneer displays the auction catalog.',{sceneTracker:{loc:'Guild'},auction:{denomination:'gold',lots:[{name:'Blade',openingBid:5,minIncrement:1}],evidence:'The auctioneer displays the auction catalog.'},ops:[]});
  await auction.locator('.trpg-auction').waitFor({state:'visible'});
  const boards=await receive(page,'ขออ่านกระดานภารกิจและกระดานกิลด์','You read the mission board. You browse the guild board.',{sceneTracker:{loc:'Guild'},missionBoard:{missions:[{name:'Delivery',objective:'Deliver the letter',reward:'3 silver'}]},groupBoard:{entries:[{kind:'guild',name:'Dawn'}]},ops:[['upsert','storyMemories',{id:'promise',title:'Return a book',kind:'Promise',detail:'Promised to return the book'}],['upsert','storyAgenda',{id:'meeting',title:'Meet Rally',dueDay:2}],['upsert','quests',{id:'job',name:'Errand',objectives:[{id:'step',title:'Bring the book'}]}]]});
  await boards.locator('.trpg-mission-board').waitFor({state:'visible'});await boards.locator('.trpg-group-board').waitFor({state:'visible'});
  const state=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state);assert.equal(state.storyMemories.length,1);assert.equal(state.storyAgenda.length,1);assert.equal(state.quests[0].objectives.length,1);
  const missing=await receive(page,'ขอดูสินค้า','Rally แสดงสินค้าที่ขายในร้านให้ดู แต่ยังไม่ระบุราคา',{sceneTracker:{loc:'Guild'},ops:[]});
  await missing.locator('.trpg-system-status').waitFor({state:'visible'});await missing.locator('.trpg-system-status button').click();
  assert.match(await page.locator('#send_textarea').inputValue(),/ขอดูรายการสินค้า/);
  if(width===390)await missing.screenshot({path:'/workspace/artifacts/roleforge-main-chat-feedback-390.png'});assert.equal(await page.evaluate(()=>window.calls),0);
  await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor());assert.match(await page.evaluate(()=>[...window.prompts.values()].join('\n')),/MAIN CHAT INTERACTION CHECK/);
  const ooc=await receive(page,'OOC: ขอดูสินค้า','Rally แสดงสินค้าที่ขายในร้าน',{sceneTracker:{loc:'Guild'},ops:[]});assert.equal(await ooc.locator('.trpg-system-status,.trpg-marketplace-event').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
  console.log(`PASS real Main Chat recovery, stationary haggling, purchase/sale settlement and NPC offer acceptance, auction, both boards, memories, agenda, objectives, missing-detail draft, prompt and OOC gates at ${width}px`);
  await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
