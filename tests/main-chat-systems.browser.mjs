// Production loader, ordinary reply events, saved settings and actual Main Chat DOM.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
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
 await page.evaluate(async user=>{
  window.host.chat.push({is_user:true,name:'Player',mes:user});
  await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_SENT,window.host.chat.length-1);
  await window.host.eventSource.emit(window.host.eventTypes.GENERATION_STARTED,'normal',{},false);
  await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat),100000,()=>{},'normal');window.lastNormalPrompt=[...window.prompts.values()].join('\n');window.lastGenerationInjections=structuredClone(window.promptInjections);window.normalCalls=(window.normalCalls||0)+1;
 },user);
 if(user==='ขอดูสินค้าประมูล'){await page.locator('.rf-commerce-pending-title').waitFor();assert.equal(await page.locator('.rf-commerce-composer').getAttribute('data-kind'),'auction');assert.equal(await page.locator('.rf-commerce-composer button').count(),0);if(page.viewportSize().width===390&&process.env.COMMERCE_ARTIFACT_DIR){await mkdir(process.env.COMMERCE_ARTIFACT_DIR,{recursive:true});await page.locator(".rf-commerce-composer").screenshot({path:`${process.env.COMMERCE_ARTIFACT_DIR}/auction-waiting-390.png`});}}
 const id=await page.evaluate(({story,patch})=>{
  const id=window.host.chat.length,mes=story+(patch?`\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`:'');
  window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes]});
  document.querySelector('#chat').replaceChildren(...window.host.chat.map((message,index)=>{
   const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',index);
   const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes.replace(/<!--tretaresia_patch:[\s\S]*?-->/gu,'');row.append(text);return row;
  })); return id;
 },{story,patch});
 await page.evaluate(async id=>{await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,id,'normal');await window.host.eventSource.emit(window.host.eventTypes.GENERATION_ENDED);},id);
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
   const style=document.createElement('style');style.textContent='#send_form{position:fixed;bottom:0;left:0;width:100%;padding:10px;background:#191816;box-sizing:border-box}#send_textarea{display:block;box-sizing:border-box;width:100%;height:60px;font:inherit;background:#191816;color:#eee;border:1px solid #53462e;border-radius:12px;padding:10px}#send_but{background:#d8c28c;color:#262016;border:0;border-radius:8px;padding:8px 14px;margin-top:5px}';document.head.append(style);
   const form=document.createElement('form');form.id='send_form';form.append(document.querySelector('#send_textarea'));const send=document.createElement('button');send.id='send_but';send.type='button';send.textContent='Send';form.append(send);document.body.append(form);
   window.calls=0;window.responses=[];window.legacyCommerceCalls=0;
   window.host.generateQuietPrompt=async()=>{window.legacyCommerceCalls++;return '<tr-dialogue name="พ่อค้าผ้าคลุมดำ">ห้าเหรียญเงิน</tr-dialogue>';};
   window.host.generateRaw=async args=>{window.calls++;window.lastCommercePrompt=args.prompt;window.lastTaskSystem=args.systemPrompt;const reply=window.responses.shift();if(reply===undefined)throw Error('Unexpected request');if(window.deferQuiet){window.deferQuiet=false;await new Promise(resolve=>{window.releaseQuiet=resolve;});}return typeof reply==='string'?reply:JSON.stringify(reply);};
   window.host.updateMessageBlock=(id,message)=>{document.querySelector(`#chat .mes[mesid="${id}"] .mes_text`).textContent=message.mes;};
   window.prompts=new Map();window.promptInjections={};window.host.setExtensionPrompt=(key,value,position,depth,scan,role)=>{window.prompts.set(key,value);window.promptInjections[key]={value,position,depth,scan,role};};
  });
  const bar=page.locator('.rf-commerce-composer');
  const action=async(name,decision,narrative='NPC considers your terms carefully.')=>{
   const before=await page.evaluate(()=>window.calls);await page.evaluate(reply=>window.responses.push(reply),{narrative,decision});
   await bar.locator(`[data-commerce-action="${name}"]`).click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer[aria-busy="true"]'));
   assert.equal(await page.evaluate(()=>window.calls),before+1);assert.equal(await bar.locator('[role="alert"]').count(),0);
  };
  const beforeRegular=await page.evaluate(()=>window.calls);
  const liveSession=()=>page.evaluate(async()=>{await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat),100000,()=>{},'normal');const prompt=window.prompts.get('tretaresia_rpg_response_contract');return JSON.parse(prompt.split('REFERENCE DATA:\n').at(-1).split('\n')[0]).interaction;});
  const closeInChat=async(user,narrative,action,decision,amount)=>{const s=await liveSession();return receive(page,user,narrative,{commerce:{sessionId:s.id,revision:s.revision,evidence:user,action,decision,amount},ops:[]});};
  const regularBuy=await receive(page,'ขอซื้อ Potion','<tr-dialogue name="Rally">Potion สามเหรียญเงิน</tr-dialogue>',{sceneTracker:{loc:'Guild'},marketplace:{kind:'npcShop',id:'normal-buy',seller:{name:'Rally'},evidence:'Potion สามเหรียญเงิน',denomination:'silver',items:[{name:'Potion',price:3}]},ops:[]});
  await bar.locator('[data-commerce-action="confirm"]').waitFor();assert.equal(await page.evaluate(()=>window.calls),beforeRegular);assert.equal(await bar.getAttribute('data-kind'),'buy');assert.doesNotMatch(await regularBuy.innerText(),/(?:^|\n)null(?:\n|$)/u);
  if(process.env.PROMPT_ARTIFACT_DIR){await mkdir(process.env.PROMPT_ARTIFACT_DIR,{recursive:true});const capture=await page.evaluate(()=>({chat:window.host.chat.slice(0,-1).map(m=>({role:m.is_user?'user':'assistant',content:m.mes})),injections:window.lastGenerationInjections}));await (await import('node:fs/promises')).writeFile(`${process.env.PROMPT_ARTIFACT_DIR}/buy-${width}.json`,JSON.stringify(capture,null,2));}
  await closeInChat('ตกลง ซื้อราคา 3 เหรียญเงิน','Rally accepts three silver and hands you the potion.','confirm',{outcome:'accept',amount:3},3);assert.equal(await bar.count(),0);
  await receive(page,'ขาย Potion ให้ Mira','<tr-dialogue name="Mira">ข้ารับซื้อ Potion สามเหรียญเงิน</tr-dialogue>',{sceneTracker:{loc:'Guild'},marketplace:{kind:'npcPurchase',id:'normal-sell',buyer:{name:'Mira',budget:8},item:{itemName:'Potion',quantity:1},askPrice:3,denomination:'silver'},ops:[]});await bar.locator('[data-commerce-action="confirm"]').waitFor();assert.equal(await bar.getAttribute('data-kind'),'sell');assert.equal(await page.evaluate(()=>window.calls),beforeRegular);
  await closeInChat('ตกลง ขายราคา 3 เหรียญเงิน','Mira pays three silver and receives the potion.','confirm',{outcome:'accept',amount:3},3);assert.equal(await bar.count(),0);
  const normalAuctionPatch={sceneTracker:{loc:'Guild'},auction:{id:'normal-auction',location:'Guild',evidence:'สิบเหรียญเงิน!',denomination:'silver',lots:[{id:'shield',name:'Shield',openingBid:5,minIncrement:1,bidders:[{name:'Mira',budget:18}],currentBid:10,currentBidder:'Mira'}]},ops:[]};
  const regularAuction=await receive(page,'นั่งลงเข้าร่วมการประมูล','<tr-dialogue name="Mira">สิบเหรียญเงิน!</tr-dialogue>',normalAuctionPatch);await bar.locator('[data-commerce-action="bid"]').waitFor();assert.equal(await bar.getAttribute('data-kind'),'auction');assert.equal(await bar.locator('.rf-commerce-amount').inputValue(),'11');assert.equal(await page.evaluate(()=>window.calls),beforeRegular);
  const output=await page.evaluate(()=>window.lastGenerationInjections.tretaresia_rpg_response_contract);assert.equal(output.position,1);assert.equal(output.depth,0);assert.equal(output.role,0);assert.match(output.value,/"auction":/);assert.match(output.value,/MEMORY SUMMARIES:/);assert.match(output.value,/NPC DOSSIER/);
  if(process.env.PROMPT_ARTIFACT_DIR){const capture=await page.evaluate(()=>({chat:window.host.chat.slice(0,-1).map(m=>({role:m.is_user?'user':'assistant',content:m.mes})),injections:window.lastGenerationInjections}));await (await import('node:fs/promises')).writeFile(`${process.env.PROMPT_ARTIFACT_DIR}/auction-${width}.json`,JSON.stringify(capture,null,2));}
  const originalAuction=await page.evaluate(()=>({id:window.host.chat.length-1,text:window.host.chat.at(-1).mes}));
  for(const type of ['regenerate','swipe']){
   await page.evaluate(async type=>{await window.host.eventSource.emit(window.host.eventTypes.GENERATION_STARTED,type,{},false);await window.TretaresiaRpgGenerateInterceptor(structuredClone(window.host.chat.slice(0,-1)),100000,()=>{},type);window.replacementOutput=window.prompts.get('tretaresia_rpg_response_contract');window.lastGenerationInjections=structuredClone(window.promptInjections);},type);
   const replacement=await page.evaluate(()=>window.replacementOutput);assert.match(replacement,/"auction":/);assert.doesNotMatch(replacement,/CURRENT INTERACTION:/);
   if(process.env.PROMPT_ARTIFACT_DIR){const capture=await page.evaluate(()=>({chat:window.host.chat.slice(0,-1).map(m=>({role:m.is_user?'user':'assistant',content:m.mes})),injections:window.lastGenerationInjections}));await (await import('node:fs/promises')).writeFile(`${process.env.PROMPT_ARTIFACT_DIR}/${type}-${width}.json`,JSON.stringify(capture,null,2));}
   await page.evaluate(async patch=>{const id=window.host.chat.length-1,m=window.host.chat[id];m.swipe_id=(m.swipe_id||0)+1;patch.auction.evidence='สิบเอ็ดเหรียญเงิน!';patch.auction.lots[0].currentBid=11;const mes='<tr-dialogue name="Mira">สิบเอ็ดเหรียญเงิน!</tr-dialogue><!--tretaresia_patch:'+JSON.stringify(patch)+'-->';m.mes=mes;m.swipes[m.swipe_id]=mes;window.host.updateMessageBlock(id,m);await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,id,'normal');await window.host.eventSource.emit(window.host.eventTypes.GENERATION_ENDED);},normalAuctionPatch);
   await page.waitForFunction(()=>document.querySelector('.rf-commerce-amount')?.value==='12');assert.equal(await page.evaluate(()=>window.calls),beforeRegular);
  }
  await page.evaluate(async original=>{const m=window.host.chat[original.id];m.swipe_id=0;m.mes=m.swipes[0];window.host.updateMessageBlock(original.id,m);await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_SWIPED,original.id);},originalAuction);await page.waitForFunction(()=>document.querySelector('.rf-commerce-amount')?.value==='11');
  await closeInChat('ออกประมูล','Mira keeps the current bid while you leave.','leave',{outcome:'left'});assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.calls),beforeRegular);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),10);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),0);
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
  const auction=await receive(page,'ขอดูสินค้าประมูล','The auctioneer displays the auction catalog.',{sceneTracker:{loc:'Guild'},auction:{id:'new-ai-auction',denomination:'gold',entryFee:0,deposit:2,lots:[{id:'blade',name:'Blade',openingBid:3,minIncrement:1,bidders:[{name:'Rally',budget:20},{name:'Mira',budget:8}]}]},ops:[]});
  await bar.waitFor({state:'visible'});assert.equal(await auction.locator('.trpg-system-status').count(),0);assert.equal(await bar.locator('[data-commerce-action="bid"]').isEnabled(),true);assert.equal(await bar.locator('[data-commerce-action="join"]').count(),0);if(width===390&&process.env.COMMERCE_ARTIFACT_DIR)await bar.screenshot({path:`${process.env.COMMERCE_ARTIFACT_DIR}/auction-direct-bid-390.png`});await bar.locator('.rf-commerce-summary').click();assert.match(await bar.innerText(),/20 ทอง/);
  // Prose-only replies from the old preset must stay unpaid and expose the
  // exact failed response on mobile, then recover with one new native task.
  await page.evaluate(()=>window.responses.push('<tr-dialogue name="พ่อค้าผ้าคลุมดำ">ห้าเหรียญเงิน</tr-dialogue>'));
  await bar.locator('.rf-commerce-amount').fill('4');await bar.locator('[data-commerce-action="bid"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer[aria-busy="true"]'));
  assert.match(await bar.locator('[role="alert"]').innerText(),/ไม่มีผลตัดสิน/);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),50);
  await bar.locator('.rf-commerce-diagnostics summary').click();const failure=JSON.parse(await bar.locator('.rf-commerce-diagnostic-report').inputValue());assert.equal(failure.action,'bid');assert.equal(failure.system,'auction');assert.equal(failure.generation,'native-task');assert.equal(failure.error,'response-decision');assert.match(failure.rawResponse,/ห้าเหรียญเงิน/);
  if(width===390&&process.env.COMMERCE_ARTIFACT_DIR)await bar.screenshot({path:`${process.env.COMMERCE_ARTIFACT_DIR}/auction-diagnostic-390.png`});
  await bar.locator('.rf-commerce-diagnostics summary').click();
  await bar.locator('.rf-commerce-amount').fill('4');await action('bid',{outcome:'open',npcActions:[{name:'Rally',choice:'raise',bid_amount:'20',motive:'This heirloom is worth all my savings'},{name:'Mira',choice:'withdrawn',rationale:'Beyond my means'}]},'<tr-dialogue name="Rally">ข้าจะลงทั้งยี่สิบเหรียญเพื่อดาบเล่มนี้</tr-dialogue>');
  assert.equal(await auction.locator('.trpg-system-status').count(),0);assert.match(await bar.innerText(),/Rally/);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.length),0);
  await page.evaluate(()=>window.responses.push('The auctioneer closes the bidding.\n<!--tretaresia_patch:'+JSON.stringify({commerce:{decision:{outcome:'sold',participants:[{name:'Rally',action:'bid',amount:'20'},{name:'Mira',action:'withdraw'}]}}})+'-->'));await bar.locator('[data-commerce-action="wait"]').click();await page.waitForFunction(()=>!document.querySelector('.rf-commerce-composer'));assert.equal(await auction.locator('.trpg-system-status').count(),0);assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),50);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions.at(-1).participants[0].spent),20);
  // Real normal generation events use the user's role-play and one main reply,
  // followed by a button continuation anchored to that latest NPC reply.
  const quietBefore=await page.evaluate(()=>window.calls);
  const roleCatalog=await receive(page,'ขอดูสินค้าในร้านใหม่','Rally shows goods for sale. Potion: 3 silver.',{marketplace:{kind:'npcShop',id:'role-shop',seller:{name:'Rally'},denomination:'silver',items:[{name:'Potion',price:3}]},ops:[]});
  const openingText=await page.evaluate(()=>window.host.chat.at(-1).mes);
  const role=async(user,story,action,decision,amount)=>{
   // A catalog is persisted only once the first action occurs. Use the prompt's
   // interaction reference for an untouched opening session.
   const contract=await page.evaluate(async()=>{await window.TretaresiaRpgGenerateInterceptor();return [...window.prompts.values()].join('\n');});
   assert.match(contract,/NORMAL CHAT COMMERCE/);
   const reference=JSON.parse(contract.split('REFERENCE DATA:\n').at(-1).split('\n')[0]);
   const current=reference.interaction;
   return receive(page,user,story,{commerce:{sessionId:current.id,revision:current.revision,evidence:user,action,decision,amount},ops:[]});
  };
  const roleOffer=await role('ผมเสนอ 2 เหรียญเงิน','<tr-dialogue name="Rally">ตกลง สองเหรียญเงิน แต่ข้ารอเจ้ายืนยันก่อน</tr-dialogue>','offer',{outcome:'accept',amount:2},2);
  assert.equal(await page.evaluate(()=>window.calls),quietBefore);assert.equal(await bar.locator('.rf-commerce-amount').inputValue(),'2');assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),13);
  if(width===390&&process.env.ROLEPLAY_ARTIFACT_DIR){await mkdir(process.env.ROLEPLAY_ARTIFACT_DIR,{recursive:true});await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.screenshot({path:`${process.env.ROLEPLAY_ARTIFACT_DIR}/offer-390.png`});}
  const roleId=await roleOffer.getAttribute('mesid');await action('confirm',{outcome:'accept',amount:2},'<tr-dialogue name="Rally">นี่โพชั่นของเจ้า</tr-dialogue>');assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),11);assert.match(await roleOffer.innerText(),/นี่โพชั่นของเจ้า/);assert.equal(await page.evaluate(id=>window.host.chat[Number(id)-2].mes,roleId),openingText);
  await receive(page,'เสนอขาย Potion ให้ Mira','Mira offers to buy your Potion for 5 silver.',{marketplace:{kind:'npcPurchase',id:'role-sale',buyer:{name:'Mira',budget:7},item:{itemName:'Potion',quantity:1},askPrice:5,denomination:'silver'},ops:[]});
  const beforeRoleConfirm=await page.evaluate(()=>window.calls);
  await role('ตกลง ขายให้ราคา 5 เหรียญเงิน','Mira pays five silver and takes the potion.','confirm',{outcome:'accept',amount:5},5);assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.calls),beforeRoleConfirm);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),16);
  await receive(page,'ขอดูประมูลครั้งใหม่','The auctioneer displays the auction catalog.',{auction:{id:'role-auction',denomination:'gold',entryFee:1,deposit:2,lots:[{id:'shield',name:'Shield',openingBid:3,minIncrement:1,bidders:[{name:'Rally',budget:20}]}]},ops:[]});
  // Offered auction: the opening catalog has no saved canonical session yet.
  const prompt=await page.evaluate(async()=>{await window.TretaresiaRpgGenerateInterceptor();return [...window.prompts.values()].join('\n');});
  const referenceText=prompt.split('REFERENCE DATA:\n').at(-1);const payload=JSON.parse(referenceText.slice(0,referenceText.indexOf('\n')));
  const rival=payload.interaction.participants[0].id;
  await role('ผมยกป้ายบิด 4 เหรียญทอง','The auctioneer awards you the shield at four gold.','bid',{outcome:'sold',participants:[{id:rival,action:'withdraw',reason:'Saving my funds for a sword'}]},4);
  assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.calls),beforeRoleConfirm);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.gold),45);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.inventory.some(i=>i.name==='Shield')),true);
  await receive(page,'ขอดูร้านสุดท้าย','Rally shows shop goods for sale. Potion: 1 silver.',{marketplace:{kind:'npcShop',id:'race-shop',seller:{name:'Rally'},denomination:'silver',items:[{name:'Potion',price:1}]},ops:[]});
  const contract=await page.evaluate(async()=>{await window.TretaresiaRpgGenerateInterceptor();return [...window.prompts.values()].join('\n');});const raceSession=JSON.parse(contract.split('REFERENCE DATA:\n').at(-1).split('\n')[0]).interaction;
  await page.evaluate(()=>{window.deferQuiet=true;window.responses.push({narrative:'Rally receives your silver.',decision:{outcome:'accept',amount:1}});});
  await bar.locator('[data-commerce-action="confirm"]').click();await page.waitForFunction(()=>typeof window.releaseQuiet==='function');
  const cancelUser='ไม่ซื้อแล้ว ยกเลิก',cancellation=receive(page,cancelUser,'Rally puts the potion back.',{commerce:{sessionId:raceSession.id,revision:raceSession.revision,evidence:cancelUser,action:'cancel',decision:{outcome:'cancel'}},ops:[]});
  await page.waitForFunction(()=>window.host.chat.at(-1).mes.includes('Rally puts the potion back.'));
  assert.match(await page.evaluate(()=>window.lastNormalPrompt),/NORMAL CHAT COMMERCE/);
  await page.evaluate(()=>{window.releaseQuiet();delete window.releaseQuiet;});await cancellation;
  assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.currency.silver),16);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.commerce.sessions.at(-1).status),'cancelled');
  const boards=await receive(page,'ขออ่านกระดานภารกิจและกระดานกิลด์','You read the mission board. You browse the guild board.',{sceneTracker:{loc:'Guild'},missionBoard:{missions:[{name:'Delivery',objective:'Deliver the letter',reward:'3 silver'}]},groupBoard:{entries:[{kind:'guild',name:'Dawn'}]},ops:[['upsert','storyMemories',{id:'promise',title:'Return a book',kind:'Promise',detail:'Promised to return the book'}],['upsert','storyAgenda',{id:'meeting',title:'Meet Rally',dueDay:2}],['upsert','quests',{id:'job',name:'Errand',objectives:[{id:'step',title:'Bring the book'}]}]]});
  await boards.locator('.trpg-mission-board').waitFor();await boards.locator('.trpg-group-board').waitFor();await boards.locator('.trpg-story-events').waitFor();await boards.locator('.trpg-story-events>summary').click();assert.match(await boards.innerText(),/Return a book/);assert.match(await boards.innerText(),/Bring the book/);assert.match(await boards.innerText(),/Meet Rally/);
  // Exact failure pattern: an auctioneer quotes prices but the final reply
  // contains no patch, even if provider reasoning promises to emit one.
  const beforeOpening=await page.evaluate(()=>({calls:window.calls,wallet:JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state.progression.currency),items:JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state.inventory)}));
  await page.evaluate(()=>window.responses.push({auction:{location:'Guild',evidence:'Blade เริ่มต้นที่ 5 เหรียญเงิน',denomination:'silver',lots:[{id:'blade',name:'Blade',openingBid:5,minIncrement:1,bidders:[{name:'Fat Merchant',budget:18}],currentBid:6,currentBidder:'Fat Merchant'}]}}));
  const proseOnly='<tr-dialogue name="Auctioneer">Blade เริ่มต้นที่ 5 เหรียญเงิน</tr-dialogue><tr-dialogue name="Fat Merchant">6 เหรียญเงิน!</tr-dialogue>';
  const repaired=await receive(page,'เข้าร่วมประมูล',proseOnly);
  await bar.locator('[data-commerce-action="bid"]').waitFor();assert.equal(await bar.getAttribute('data-kind'),'auction');assert.equal(await bar.locator('.rf-commerce-amount').inputValue(),'7');assert.match(await bar.innerText(),/6 เงิน/);assert.match(await bar.innerText(),/Fat Merchant/);assert.equal(await page.evaluate(()=>window.calls),beforeOpening.calls+1);assert.match(await page.evaluate(()=>window.lastTaskSystem),/Recover ONE missing/);
  assert.equal(await page.evaluate(()=>window.host.chat.at(-1).mes),proseOnly);assert.equal(await page.evaluate(()=>JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state.progression.currency)),beforeOpening.wallet);assert.equal(await page.evaluate(()=>JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state.inventory)),beforeOpening.items);assert.doesNotMatch(await repaired.innerText(),/(?:^|\n)null(?:\n|$)/u);
  await bar.locator('.rf-commerce-summary').click();assert.match(await bar.innerText(),/18 เงิน/);
  if(width===390&&process.env.COMMERCE_ARTIFACT_DIR)await bar.screenshot({path:`${process.env.COMMERCE_ARTIFACT_DIR}/auction-auto-recovered-390.png`});
  await action('bid',{outcome:'open',participants:[{name:'Fat Merchant',action:'bid',amount:8,reason:'The blade fits my collection'}]},'<tr-dialogue name="Fat Merchant">Eight silver for my collection.</tr-dialogue>');assert.match(await bar.innerText(),/8 เงิน/);assert.equal(await bar.locator('.rf-commerce-amount').inputValue(),'9');
  await action('leave',{outcome:'left'},'The auctioneer allows you to leave after the merchant outbids you.');assert.equal(await bar.count(),0);assert.equal(await page.evaluate(()=>JSON.stringify(window.host.chatMetadata.tretaresia_rpg_state.progression.currency)),beforeOpening.wallet);
  const beforeFailure=await page.evaluate(()=>window.calls);await page.evaluate(()=>window.responses.push('The NPC only speaks; no structured data.'));
  await receive(page,'เข้าร่วมประมูล',proseOnly);await bar.locator('[role="alert"]').waitFor();assert.equal(await bar.getAttribute('data-kind'),'auction');assert.equal(await page.evaluate(()=>window.calls),beforeFailure+1);assert.equal(await bar.locator('[data-commerce-action]').count(),0);
  await bar.locator('.rf-commerce-diagnostics summary').click();const openingReport=JSON.parse(await bar.locator('.rf-commerce-diagnostic-report').inputValue());assert.equal(openingReport.channel,'opening');assert.equal(openingReport.error,'opening-data');assert.match(openingReport.rawResponse,/no structured data/);
  await page.evaluate(async()=>{await window.host.eventSource.emit(window.host.eventTypes.GENERATION_ENDED);await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,window.host.chat.length-1,'normal');});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.calls),beforeFailure+1);assert.equal(await bar.count(),1);
  await receive(page,'เข้าร่วมประมูล','<tr-dialogue name="Auctioneer">มาเริ่มกันที่ชิ้นแรกของวันนี้</tr-dialogue>');await bar.locator('.rf-commerce-pending-title').waitFor();assert.equal(await bar.count(),1);assert.equal(await page.evaluate(()=>window.calls),beforeFailure+1);
  await page.evaluate(()=>window.host.isGenerating=true);
  const missing=await receive(page,'ขอดูสินค้า','Rally แสดงสินค้าที่ขายในร้านให้ดู แต่ยังไม่ระบุราคา',{sceneTracker:{loc:'Guild'},ops:[]});await bar.locator('.rf-commerce-pending-title').waitFor();assert.equal(await missing.locator('.trpg-system-status').count(),0);assert.doesNotMatch(await missing.innerText(),/(?:^|\n)null(?:\n|$)/u);assert.equal(await bar.locator('button').count(),0);assert.doesNotMatch(await bar.innerText(),/รอ NPC/);assert.equal(await bar.getAttribute('aria-busy'),'false');await page.evaluate(()=>window.host.isGenerating=false);
  await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor());assert.match(await page.evaluate(()=>[...window.prompts.values()].join('\n')),/MAIN CHAT INTERACTION CHECK/);
  assert.equal(await page.evaluate(()=>window.legacyCommerceCalls),0);assert.match(await page.evaluate(()=>window.lastTaskSystem),/Recover ONE missing RoleForge commerce opening/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
  console.log(`PASS hybrid role-play/buttons, automatic one-call missing opening recovery, standing NPC price retained, non-looping failure diagnostics, latest-bubble continuation, consent settlement, all story cards and boards at ${width}px`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
