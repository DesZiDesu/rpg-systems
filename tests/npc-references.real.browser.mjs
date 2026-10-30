import {FIELDS,NPC_STARTING_STATS,NPC_STARTING_RELATIONS} from '../src/npc-core.js';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium,webkit}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18230',out=process.env.NPC_REFERENCE_ARTIFACTS||'/workspace/artifacts/npc-references';
const web=process.env.PHONE_BROWSER==='webkit';
await mkdir(out,{recursive:true});
const browser=await(web?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}));
const report={host:'SillyTavern',browser:web?'WebKit':'Chromium',mobileEmulation:true,keyboard:'Focus tests and reduced visual viewport; no physical iOS keyboard',devices:[],errors:[]};
let context;
try{for(const mobile of [false,true]){
 const device=mobile?'mobile':'desktop';if(process.env.PHONE_DEVICE&&process.env.PHONE_DEVICE!==device)continue;
 context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1920,height:1080},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage();page.on('dialog',d=>d.accept());page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
 await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
 // Layout verification never sends a request to a real model or voice provider.
 let imageCalls=0,totalCalls=0;
 await context.route('**/api/backends/chat-completions/generate',async r=>{const body=r.request().postDataJSON();const images=(body.messages||[]).flatMap(m=>Array.isArray(m.content)?m.content.filter(p=>p.type==='image_url'):[]);totalCalls++;const content=images.length?['Straight black hair, brown eyes, and a green casual shirt.','Straight black hair, brown eyes, and silver battle armor.'][imageCalls++]:JSON.stringify({...Object.fromEntries(Object.keys(FIELDS).map(k=>[k,'Not established'])),...NPC_STARTING_RELATIONS,stats:{...NPC_STARTING_STATS},aliases:[],abilities:[],isHostile:false,identityColor:'#6d9b84',roleIcon:'healer',name:'Lysa',appearance:'Incorrect model appearance.',background:'A fictional city resident.'});await r.fulfill({json:{choices:[{message:{role:'assistant',content},finish_reason:'stop'}]}});});
 await page.goto(base);
 await page.waitForFunction(()=>globalThis.RoleForgeWorkshop&&document.querySelector('#tretaresia-rpg-settings')?.rfSettingsNavigation,null,{timeout:120000});
 const done=()=>page.waitForFunction(()=>SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),null,{timeout:120000});
 await Promise.race([done(),page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok').click({timeout:120000}).then(done)]);
 await page.evaluate(async name=>{
  const c=SillyTavern.getContext(),card={spec:'chara_card_v2',spec_version:'2.0',data:{name,description:'A modern fictional city. All characters are adults.',first_mes:'You check your Aster One at home.',extensions:{
   roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:[]},
   roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:false,enableMemorySummaries:false,eventNotifications:false},initialState:{player:{name:'Mael',age:'25'},inventory:[{id:'aster',name:'Aster One Smartphone',quantity:1}],npcs:[{id:'cassandra',name:'Cassandra',age:'27',met:true}],worldClock:{day:1,time:'19:30'},location:{place:'Home'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}
  }}};
  const f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'phone-layout.json',{type:'application/json'}));
  const response=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await response.json();if(!response.ok||v.error)throw Error('Card import failed');
  const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));await RoleForgeWorkshop.ready();
 },'NPC reference QA · '+device+' · '+Date.now());

 await page.evaluate(async()=>{const c=SillyTavern.getContext(),h=await import('/script.js'),o=await import('/scripts/openai.js');c.extensionSettings.tretaresia_rpg.language='en';h.changeMainAPI('openai');Object.assign(o.oai_settings,{chat_completion_source:'custom',custom_url:'http://127.0.0.1:18230/fixture-only',custom_model:'gpt-4o',image_inlining:true,media_inlining:true,stream_openai:false,openai_max_context:32768,openai_max_tokens:2400});h.setOnlineStatus('local-fixture');document.querySelector('#tretaresia-npc-wand-launcher').click();});
 const manager=page.locator('dialog.trpg-manager[open]');await manager.waitFor();await manager.locator('[data-archive-options-toggle]').click();await manager.locator('[data-new]').click();await manager.locator('[data-draft-scope]').selectOption('chat');await manager.locator('[data-npc-brief]').fill('Create Lysa. The references show the same person: casual outfit and battle armor. Keep both looks distinct.');
 const fixtureImages=await page.evaluate(()=>['#5a8d73','#8c94a3'].map((color,i)=>{const c=document.createElement('canvas');c.width=280;c.height=360;const g=c.getContext('2d');g.fillStyle='#e2d8c8';g.fillRect(0,0,280,360);g.fillStyle='#302c32';g.beginPath();g.ellipse(140,134,59,83,0,0,Math.PI*2);g.fill();g.fillStyle=color;g.beginPath();g.ellipse(140,335,103,126,0,0,Math.PI*2);g.fill();g.fillStyle='#e4bda4';g.beginPath();g.ellipse(140,145,43,55,0,0,Math.PI*2);g.fill();g.fillStyle='#27232a';g.fillRect(105,86,70,42);g.fillStyle='#514437';g.fillRect(118,144,7,5);g.fillRect(155,144,7,5);g.strokeStyle='#ad796d';g.lineWidth=2;g.beginPath();g.arc(140,169,10,0,Math.PI);g.stroke();g.fillStyle='#fff';g.font='16px sans-serif';g.textAlign='center';g.fillText(i?'BATTLE ARMOR':'CASUAL',140,325);return c.toDataURL('image/png').split(',')[1];}));
 const files=fixtureImages.map((image,i)=>({name:'look-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')}));await manager.locator('[data-npc-reference]').setInputFiles(files);await page.waitForFunction(()=>document.querySelector('[data-reference-preview]')?.children.length===2&&document.querySelector('dialog.trpg-manager').getAttribute('aria-busy')!=='true');await manager.locator('[data-reference-label="0"]').fill('Casual');await manager.locator('[data-reference-label="1"]').fill('Battle armor');
 await manager.locator('[data-reference-preview]').scrollIntoViewIfNeeded();await page.evaluate(()=>toastr.remove());await page.screenshot({path:out+'/'+device+'-references.png'});
 assert.equal(await manager.locator('[data-npc-reference]').getAttribute('multiple'),'');assert(await manager.locator('.trpg-record').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
 await manager.locator('[data-generate-npc]').click();await page.waitForTimeout(1200);console.log('STATUS',device,await manager.locator('[role=status]').textContent(),'image calls',imageCalls,'total',totalCalls);await page.waitForFunction(()=>document.querySelector('dialog.trpg-manager [name=name]')?.value==='Lysa'&&document.querySelector('dialog.trpg-manager').getAttribute('aria-busy')!=='true',null,{timeout:90000});
 assert.equal(imageCalls,2);assert.equal(totalCalls,3);const appearance=await manager.locator('[name=appearance]').inputValue();assert.match(appearance,/Casual.*green casual shirt[\s\S]*Battle armor.*silver battle armor/);assert.equal(await manager.locator('[data-reference-preview] img').count(),2);assert.equal(await manager.locator('[data-reference-label="1"]').inputValue(),'Battle armor');
 await manager.locator('[name=appearance]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+device+'-generated.png'});
 await manager.locator('[data-npc-save]').click();await page.waitForFunction(()=>document.querySelector('dialog.trpg-manager')?.dataset.view==='detail');
 const saved=await page.evaluate(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state?.npcs.find(n=>n.name==='Lysa'));assert(saved);assert.equal(saved.appearance,appearance);assert(!saved.hasPortrait);assert.doesNotMatch(JSON.stringify(saved),/data:image|blob:http|references|referenceImages/);
 report.devices.push({device,imageCalls,totalCalls,twoLooks:true,labelsSurviveGeneration:true,mainPortraitUnchanged:true,noReferenceBytesSaved:true,pass:true});await context.close();context=null;console.log('PASS',device);
}assert.deepEqual(report.errors,[]);
}catch(error){const page=context?.pages().at(-1);if(page){await page.screenshot({path:out+'/failure.png'});console.log('FAILURE STATUS',await page.locator('dialog.trpg-manager [role=status]').textContent().catch(()=>''));}throw error;}finally{await context?.close().catch(()=>{});await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
