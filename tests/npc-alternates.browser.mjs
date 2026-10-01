// Actual loader, NPC manager and server image protocol; no model/API generation.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/npc-alternates.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const seed={id:'cora',name:'Cora',aliases:['คอร่า'],age:'28',race:'Human',gender:'Female',occupation:'Healer',title:'Guild healer',
 appearance:'BASE_ADULT_APPEARANCE: ผมยาว เสื้อคลุมสีเขียว',background:'BASE_ADULT_BACKGROUND: เปิดคลินิกในกิลด์',personality:'ใจเย็น',
 goals:'ดูแลคลินิก',speechStyle:'พูดสุภาพ',relationship:'Ally',location:'Riverside village',met:true,isHostile:false,enabled:true,
 npcScope:'chat',npcOwner:'',identityColor:'#81a78a',roleIcon:'healer',portraitSource:'local',hasPortrait:true,
 stats:{level:12,hp:100,mp:60,stamina:100,rank:'Adept'},affection:10,trust:70,loyalty:60,notes:'ข้อมูลตัวอย่างสำหรับทดสอบ'};
const images=new Map();let uploads=0;
const server=http.createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/api/images/upload'&&request.method==='POST'){
   let content='';for await(const chunk of request)content+=chunk;
   const image=JSON.parse(content),path=`/user/images/tretaresia-npc/${image.filename}.${image.format}`;
   images.set(path,{body:Buffer.from(image.image,'base64'),type:`image/${image.format==='jpg'?'jpeg':image.format}`});uploads++;
   response.setHeader('content-type','application/json');response.end(JSON.stringify({path}));return;
  }
  if(images.has(url.pathname)){const image=images.get(url.pathname);response.setHeader('content-type',image.type);response.end(image.body);return;}
  if(url.pathname.startsWith('/api/')){response.setHeader('content-type','application/json');response.end('[]');return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){response.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length);let body=await readFile(new URL(path,root));
  if(path==='docs/previews/h-stats-fixture.js'){
   body=body.toString().replace("Object.assign(storedSettings.tretaresia_rpg,{autoContinuity:false,chatPresentation:false});","Object.assign(storedSettings.tretaresia_rpg,{autoContinuity:false,chatPresentation:true});");
   body=body.replace('    window.SillyTavern=',`    window.host.chatMetadata=readStored(metadataKey,{tretaresia_rpg_state:{npcs:[${JSON.stringify(seed)}]}});
    window.host.chat=[{is_user:true,name:'Nova',mes:'ฉันเดินไปหาคอร่าที่แม่น้ำ'}];
    window.host.characters[0].data.extensions.tretaresia_rpg_npcs=readStored('roleforge-alternate-test-card',[]);
    window.alternatePrompts=new Map();window.host.setExtensionPrompt=(key,value)=>window.alternatePrompts.set(key,value);
    window.host.fetch=async(url,options)=>{if(url==='/api/characters/merge-attributes'){
     const records=JSON.parse(options.body).data.extensions.tretaresia_rpg_npcs;
     localStorage.setItem('roleforge-alternate-test-card',JSON.stringify(records));return new Response('{}',{headers:{'Content-Type':'application/json'}});
    }return fetch(url,options);};
    window.SillyTavern=`);
   body=body.replace("url.pathname.startsWith('/api/'))return Promise.resolve", "url.pathname.startsWith('/api/')&&url.pathname!=='/api/images/upload')return Promise.resolve");
  }
  response.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':'text/javascript');response.end(body);
 }catch(error){response.writeHead(500).end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`;
const widths=(process.env.NPC_ALTERNATES_WIDTHS||'320,390,1280').split(',').map(Number);
const artifacts=process.env.NPC_ALTERNATES_SCREENSHOT_DIR;if(artifacts)await mkdir(artifacts,{recursive:true});
async function ready(page){
 await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));
 await page.evaluate(()=>{
  document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';
  document.querySelector('#extensions_settings2').style.display='block';document.querySelector('#chat').style.cssText='display:block;padding:12px;font-size:16px;line-height:1.5';
 });
}
async function openNpc(page,scope='chat'){
 await page.locator('#tretaresia-rpg-settings [data-trpg-open]').evaluate(button=>{for(let node=button.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;});
 await page.locator('#tretaresia-rpg-settings [data-trpg-open]').click();await page.locator('dialog.trpg-manager[open]').waitFor();
 if(await page.locator('[data-scope-select]').inputValue()!==scope)await page.locator('[data-scope-select]').selectOption(scope);
 await page.locator('.trpg-person').click();await page.locator('[data-alternate-select]').waitFor();
}
const rootRecord=page=>page.evaluate(()=>structuredClone(window.host.chatMetadata.tretaresia_rpg_state.npcs[0]));
async function headerReply(page){
 const id=await page.evaluate(()=>{
  const mes='<tr-header name="Cora"/><tr-narrative>เธอหยุดข้างแม่น้ำ</tr-narrative><tr-dialogue name="Cora">สวัสดีค่ะ</tr-dialogue>';
  const id=window.host.chat.length;window.host.chat.push({is_user:false,name:'Narrator',mes,swipes:[mes],swipe_id:0});
  const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const body=document.createElement('div');body.className='mes_text';body.textContent=mes;row.append(body);document.querySelector('#chat').append(row);return id;
 });
 await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id),id);
 await page.locator(`[mesid="${id}"] .trpg-header`).waitFor();return id;
}
async function prompt(page){await page.evaluate(()=>window.TretaresiaRpgGenerateInterceptor());return page.evaluate(()=>[...window.alternatePrompts.values()].join('\n'));}
async function assertFits(page,width){
 const bounds=await page.locator('dialog.trpg-manager').evaluate(node=>({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width:innerWidth,scroll:node.scrollWidth,client:node.clientWidth}));
 assert(bounds.left>=-1&&bounds.right<=width+1&&bounds.scroll<=bounds.client+1,`NPC manager fits viewport: ${JSON.stringify(bounds)}`);
 const section=await page.locator('[data-alternates]').evaluate(node=>({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,scroll:node.scrollWidth,client:node.clientWidth}));
 assert(section.left>=-1&&section.right<=width+1&&section.scroll<=section.client+1,`Alternate controls fit viewport: ${JSON.stringify(section)}`);
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{const key='roleforge-hstats-preview-settings';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:false,injectState:true,autoContinuity:false,chatPresentation:true,showSceneTracker:false,memoryAutoSummary:false,npcGenerationScope:'chat'}}));});
  await page.goto(url);await ready(page);await openNpc(page);await assertFits(page,width);
  const before=await rootRecord(page);assert.equal(before.id,'cora');assert.equal(before.age,'28');
  // Cancelling a new-version form does not create a record or change selection.
  await page.locator('[data-alternate-add]').click();await page.locator('[name="alternate.newLabel"]').fill('ยังไม่บันทึก');await page.locator('[data-alternate-cancel]').click();
  assert.deepEqual((await rootRecord(page)).alternateProfiles||[],[]);assert.equal((await rootRecord(page)).activeAlternateId||'','');
  // Use the actual create/editor/save controls; there must remain only one NPC.
  await page.locator('[data-alternate-add]').click();await page.locator('[name="alternate.newLabel"]').fill('วัยเด็ก · อายุ 9 ปี');
  await page.locator('[name="alternate.newDescription"]').fill('ก่อนเข้ากิลด์ อาศัยอยู่ในหมู่บ้านริมแม่น้ำ');
  await page.locator('[data-alternate-submit]').click();await page.locator('#trpg-npc-form:not([hidden])').waitFor();
  await page.waitForFunction(()=>!document.querySelector('#trpg-npc-form fieldset').disabled);
  const created=await rootRecord(page);assert.equal(created.alternateProfiles.length,1);assert.equal(Object.hasOwn(created.alternateProfiles[0],'hasPortrait'),false,'new version inherits the original portrait until explicitly changed');
  assert.equal(await page.locator('#trpg-npc-form [data-preview] img').count(),1,'inherited base portrait remains visible in the alternate draft');
  assert.equal(await page.locator('#trpg-npc-form [name="name"]').isEditable(),false,'alternate editor cannot split or rename the NPC identity');
  await page.locator('#trpg-npc-form [name="alternate.label"]').fill('วัยเด็ก · คอร่าอายุ 9 ปี');
  await page.locator('#trpg-npc-form [name="age"]').fill('9');
  await page.locator('#trpg-npc-form [name="appearance"]').fill('CHILD_APPEARANCE: ผมสั้น เสื้อสีฟ้า');
  await page.locator('#trpg-npc-form [name="background"]').fill('CHILD_BACKGROUND: อาศัยกับครอบครัวริมแม่น้ำ');
  await page.locator('#trpg-npc-form [name="occupation"]').fill('นักเรียน');
  await page.locator('#trpg-npc-form [name="title"]').fill('เด็กในหมู่บ้าน');
  const photo=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=120;canvas.height=160;const g=canvas.getContext('2d');g.fillStyle='#53839c';g.fillRect(0,0,120,160);g.fillStyle='#e4dcc7';g.beginPath();g.arc(60,48,24,0,Math.PI*2);g.fill();g.fillStyle='#c7dfeb';g.fillRect(25,80,70,80);return canvas.toDataURL('image/png').split(',')[1];});
  await page.locator('[data-npc-portrait]').setInputFiles({name:'childhood.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
  await page.waitForFunction(()=>!document.querySelector('#trpg-npc-form fieldset').disabled);
  await page.locator('[data-editor-actions] button[type="submit"]').click();await page.locator('[data-detail]:not([hidden]) [data-alternate-select]').waitFor();
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.npcs[0].alternateProfiles?.[0]?.fields.age==='9');
  const saved=await rootRecord(page),alternate=saved.alternateProfiles[0],alternateId=alternate.id;
  assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.npcs.length),1);
  assert.equal(saved.id,before.id);assert.equal(saved.name,before.name);assert.equal(saved.age,before.age);assert.equal(saved.appearance,before.appearance);assert.equal(saved.background,before.background);
  assert.equal(saved.portraitSource,before.portraitSource);assert.equal(saved.hasPortrait,before.hasPortrait);
  assert.equal(saved.activeAlternateId,alternateId);assert.equal(alternate.fields.age,'9');assert.equal(alternate.label,'วัยเด็ก · คอร่าอายุ 9 ปี');assert.equal(alternate.portraitSource,'server');assert.match(alternate.portraitPath,/^\/user\/images\/tretaresia-npc\//);
  assert.match(await page.locator('[data-detail] .trpg-read-fields').first().innerText(),/CHILD_BACKGROUND|CHILD_APPEARANCE/);
  await assertFits(page,width);
  if(artifacts){await page.locator('.trpg-record').evaluate(node=>node.scrollTop=0);await page.locator('dialog.trpg-manager').screenshot({path:`${artifacts}/npc-childhood-${width}.png`});await page.locator('[data-alternates]').screenshot({path:`${artifacts}/npc-alternate-controls-${width}.png`});}
  await page.locator('[data-close]').click();const messageId=await headerReply(page);
  assert.match(await page.locator(`[mesid="${messageId}"] .trpg-header`).innerText(),/นักเรียน/);
  let sent=await prompt(page);assert.match(sent,/CHILD_APPEARANCE|CHILD_BACKGROUND/);assert.doesNotMatch(sent,/BASE_ADULT_APPEARANCE|BASE_ADULT_BACKGROUND/,'inactive adult dossiers never mix into active story prompt');
  // Original and alternate remain separately saved, selected version survives reload.
  await openNpc(page);await page.locator('[data-alternate-select]').selectOption('');await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.npcs[0].activeAlternateId==='');
  assert.match(await page.locator('[data-detail] .trpg-read-fields').first().innerText(),/BASE_ADULT/);sent=await prompt(page);assert.match(sent,/BASE_ADULT_APPEARANCE/);assert.doesNotMatch(sent,/CHILD_APPEARANCE|CHILD_BACKGROUND/);
  await page.locator('[data-alternate-select]').selectOption(alternateId);await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.npcs[0].activeAlternateId===document.querySelector('[data-alternate-select]').value);
  await page.reload();await ready(page);await openNpc(page);assert.equal(await page.locator('[data-alternate-select]').inputValue(),alternateId);assert.equal((await rootRecord(page)).alternateProfiles[0].portraitPath,alternate.portraitPath);
  // Leaving an edited version discards only its unsaved draft.
  await page.locator('[data-detail] .trpg-detail-actions .trpg-primary').click();await page.waitForFunction(()=>!document.querySelector('#trpg-npc-form fieldset').disabled);
  await page.locator('#trpg-npc-form [name="age"]').fill('99');await page.locator('[data-back]').click();await page.locator('.trpg-person').click();
  assert.equal((await rootRecord(page)).alternateProfiles[0].fields.age,'9');
  // Scope copy retains all versions and each portrait; copied identity is independent.
  await page.locator('.trpg-detail-actions button').filter({hasText:'สร้างสำเนา'}).click();await page.locator('.trpg-person').waitFor();await page.locator('.trpg-person').click();
  const card=await page.evaluate(()=>structuredClone(window.host.characters[0].data.extensions.tretaresia_rpg_npcs));
  assert.equal(card.length,1);assert.notEqual(card[0].id,saved.id);assert.equal(card[0].age,'28');assert.equal(card[0].activeAlternateId,alternateId);assert.equal(card[0].alternateProfiles[0].fields.age,'9');
  assert.equal(card[0].alternateProfiles[0].portraitPath,alternate.portraitPath);assert.equal(card[0].portraitSource,'server');assert.notEqual(card[0].portraitPath,alternate.portraitPath,'copied base portrait is not replaced by the active version’s portrait');
  const cardSnapshot=structuredClone(card[0]);
  // Delete selected alternate from Chat only; revert original, preserve copied archive.
  await page.locator('[data-back]').click();await page.locator('[data-scope-select]').selectOption('chat');await page.locator('.trpg-person').click();await page.locator('[data-alternate-delete]').click();
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.npcs[0].alternateProfiles.length===0);
  const deleted=await rootRecord(page);assert.equal(deleted.id,'cora');assert.equal(deleted.activeAlternateId,'');assert.equal(deleted.age,'28');assert.equal(deleted.background,before.background);assert.equal(deleted.portraitSource,'local');
  assert.deepEqual(await page.evaluate(()=>window.host.characters[0].data.extensions.tretaresia_rpg_npcs[0]),cardSnapshot);
  await assertFits(page,width);assert.deepEqual(errors,[]);console.log(`PASS NPC alternate add/edit/image/save, base identity and prompt isolation, switch/reload/cancel, scope portraits and deletion at ${width}px`);await page.close();
 }
 assert(uploads>=widths.length*2,'real image upload protocol was exercised for alternate and base scope copy');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
