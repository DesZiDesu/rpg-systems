// Actual loader, native settings and renderer: independent per-chat frames.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/',artifacts=process.env.CHAT_APPEARANCE_ARTIFACTS||'/tmp/roleforge-chat-appearance';
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;if(path.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!path.startsWith(base)||path.includes('..')){res.writeHead(404).end();return;}const file=path.slice(base.length);res.setHeader('content-type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/javascript');res.end(await readFile(new URL(file,root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await mkdir(artifacts,{recursive:true});
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const source='<tr-header name="Cora"/><tr-narrative>She waits **quietly** beside the river.</tr-narrative><tr-dialogue name="Cora">Welcome back, traveler.</tr-dialogue>';
const control=(page,key)=>page.locator(`[data-presentation-setting="${key}"]`);
async function change(page,key,value){
 const input=control(page,key);await input.setChecked(value);
 await input.waitFor({state:'visible'});await page.waitForFunction(key=>!document.querySelector(`[data-presentation-setting="${key}"]`).disabled,key);
 await page.waitForTimeout(150);
}
async function ready(page){
 await page.waitForFunction(()=>window.hStatsPreview?.ready);await page.waitForSelector('[data-presentation-setting=showChatHeader]',{state:'attached'});
 await page.evaluate(()=>{document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#extensions_settings2').style.display='block';document.querySelector('#tretaresia-rpg-settings .inline-drawer-content').style.display='block';document.querySelector('#chat').style.cssText='display:block;padding:12px;box-sizing:border-box;font:16px/1.6 system-ui';});
}
async function add(page,text=source,{rich=false,user=false}={}){
 const id=await page.evaluate(({text,rich,user})=>{
  const id=window.host.chat.length;window.host.chat.push({name:user?'Nova':'Narrator',is_user:user,mes:text,swipes:[text],swipe_id:0});
  const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);const body=document.createElement('div');body.className='mes_text';row.append(body);document.querySelector('#chat').append(row);
  if(rich){body.innerHTML='<section class="regex-card"><p>Native Regex scene</p><button>Native action</button><input type="checkbox" checked></section>';window.nativeCard=body.firstChild;window.nativeClicks=0;window.nativeCard.querySelector('button').onclick=()=>window.nativeClicks++;}
  else body.textContent=text;
  return id;
 },{text,rich,user});
 await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id),id);await page.waitForTimeout(180);return id;
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.route('https://**/*',r=>r.abort());
  await page.addInitScript(()=>localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',autoTrack:false,injectState:false,autoContinuity:false,showSceneTracker:false,memoryAutoSummary:false}})));
  await page.goto(url);await ready(page);
  await page.evaluate(async()=>{window.host.characters=[{avatar:'A.png',data:{extensions:{}}},{avatar:'B.png',data:{extensions:{roleforge_character_pack:{format:'roleforge-character-pack',version:1,chatAppearance:{theme:'arcane',colorMode:'light',header:true,dialogue:true,narrative:false,effects:false}}}}}];window.host.characterId=0;window.host.chat=[];document.querySelector('#chat').replaceChildren();window.themeAiCalls=0;window.host.generateQuietPrompt=async()=>{window.themeAiCalls++;throw Error('Appearance must not call AI');};await window.hStatsPreview.switchChat('A',{});});
  await control(page,'chatPresentation').check();
  const id=await add(page),row=page.locator(`[mesid="${id}"] .mes_text`);await row.locator('.trpg-header').waitFor();
  assert.equal(await control(page,'chatColorMode').count(),0);assert.equal(await control(page,'chatTheme').count(),0);
  for(let flags=0;flags<8;flags++){
   for(const [bit,key] of ['showChatHeader','showChatDialogue','showChatNarrative'].entries())await change(page,key,Boolean(flags&(1<<bit)));
   assert.equal(await row.locator('.trpg-header').count(),flags&1?1:0);
   assert.equal(await row.locator('.trpg-dialogue.trpg-unframed').count(),flags&2?0:1);
   assert.equal(await row.locator('.trpg-narrative.trpg-unframed').count(),flags&4?0:1);
   assert.equal(await row.locator('[data-rf-color-mode]').count(),0);
   assert.equal(await page.evaluate(()=>Object.hasOwn(window.host.chatMetadata.roleforge_chat_presets.config.chatAppearance,'colorMode')),false);
   assert.equal(await page.evaluate(id=>window.host.chat[id].mes,id),source);
  }
  for(const [key,part] of [['showChatHeader','header'],['showChatDialogue','dialogue'],['showChatNarrative','narrative']]){
   await change(page,key,false);
   if(part==='header'){assert.equal(await row.locator('.trpg-header').count(),0);assert.equal(await row.locator('.trpg-speaker-label').innerText(),'Cora');}
   else assert.equal(await row.locator(`.trpg-${part}`).evaluate(node=>node.classList.contains('trpg-unframed')),true);
   assert.match(await row.innerText(),/She waits.*quietly.*beside the river/s);assert.match(await row.innerText(),/Welcome back/);
   for(const other of ['dialogue','narrative'].filter(v=>v!==part))assert.equal(await row.locator(`.trpg-${other}.trpg-unframed`).count(),0,'other frames stay on');
   await change(page,key,true);
  }
  // Native widgets and bound actions keep their DOM identity through toggles.
  const rich=await add(page,source,{rich:true});
  for(const key of ['showChatHeader','showChatDialogue','showChatNarrative'])for(const value of [false,true]){await change(page,key,value);assert.equal(await page.evaluate(()=>document.querySelector('.regex-card')===window.nativeCard&&window.nativeCard.querySelector('input').checked),true);await page.locator('.regex-card button').click();}
  assert.equal(await page.evaluate(()=>window.nativeClicks),6);assert.equal(await page.locator(`[mesid="${rich}"] .trpg-dialogue`).count(),0,'whole-message native card is never duplicated');
  // OS appearance cannot activate a retired palette or rebuild native widgets.
  await page.evaluate(id=>{window.systemStoryRoot=document.querySelector(`[mesid="${id}"] .trpg-chat[data-rf-chat-theme]`);window.originalSpeechBackground=getComputedStyle(document.querySelector(`[mesid="${id}"] .trpg-dialogue`)).backgroundImage;},id);
  for(const scheme of ['light','dark','light']){
   await page.emulateMedia({colorScheme:scheme});
   assert.equal(await row.locator('.trpg-dialogue').evaluate(node=>getComputedStyle(node).backgroundImage),await page.evaluate(()=>window.originalSpeechBackground));
   assert.equal(await page.evaluate(id=>document.querySelector(`[mesid="${id}"] .trpg-chat[data-rf-chat-theme]`)===window.systemStoryRoot&&document.querySelector('.regex-card')===window.nativeCard,id),true,'OS color switch keeps exact original DOM nodes');
   assert.equal(await page.evaluate(id=>window.host.chat[id].mes,id),source);
  }
  await control(page,'userChatPresentation').check();const user=await add(page,'*I open the door.* "Hello." |Be careful.|',{user:true});
  assert.equal(await page.locator(`[mesid="${user}"] .trpg-user-chat`).getAttribute('data-rf-chat-theme'),'roleforge');
  {
   const style=await page.locator(`[mesid="${user}"] .trpg-user-chat`).evaluate(root=>({
    transparent:[root,...root.querySelectorAll('.trpg-user-header,.trpg-narrative,.trpg-prose-glow')].every(node=>{const c=getComputedStyle(node);return c.backgroundImage==='none'&&c.backgroundColor==='rgba(0, 0, 0, 0)'&&c.boxShadow==='none';}),
    name:getComputedStyle(root.querySelector('.trpg-user-header')).color,
    thought:getComputedStyle(root.querySelector('.trpg-user-thought small')).color,
   }));
   assert.equal(style.transparent,true,'player Header/Narrative and their parent stay transparent');
   assert.equal(style.thought,style.name,'inner thought label retains the player accent on transparent backgrounds');
  }
  await change(page,'showChatHeader',false);await change(page,'showChatDialogue',false);assert.equal(await page.locator(`[mesid="${user}"] .trpg-user-header`).count(),0);assert.equal(await page.locator(`[mesid="${user}"] .trpg-dialogue.trpg-unframed`).count(),1);assert.equal(await page.locator(`[mesid="${user}"] .trpg-narrative:not(.trpg-unframed)`).count(),1);assert.equal(await page.locator(`[mesid="${user}"] .trpg-user-thought`).count(),1);
  // Failed native saves roll the preset and state back, and show the real error.
  await page.evaluate(()=>{window.themeBefore=JSON.stringify(window.host.chatMetadata);window.themeSave=window.host.saveMetadata;window.host.saveMetadata=async()=>{throw Error('theme-save-failed');};});
  // A rejected save restores the checkbox immediately, so click physically
  // rather than setChecked(), which requires the attempted state to stick.
  await control(page,'showChatNarrative').click();await page.waitForFunction(()=>document.querySelector('.rf-chat-appearance-status').textContent.includes('theme-save-failed'));
  assert.equal(await control(page,'showChatNarrative').isChecked(),true);assert.equal(await page.evaluate(()=>JSON.stringify(window.host.chatMetadata)===window.themeBefore),true);await page.evaluate(()=>window.host.saveMetadata=window.themeSave);
  assert.equal(await page.evaluate(()=>window.themeAiCalls),0,'frame switches never call AI');
  await page.evaluate(()=>window.themeChatA=structuredClone(window.host.chatMetadata));
  await page.evaluate(async()=>{window.host.characterId=1;window.host.chat=[];document.querySelector('#chat').replaceChildren();await window.hStatsPreview.switchChat('B',{});});
  assert.equal(await control(page,'showChatHeader').isChecked(),true);assert.equal(await control(page,'showChatNarrative').isChecked(),false,'new chat adopts card frame defaults');assert.equal(await page.evaluate(()=>window.host.chatMetadata.roleforge_chat_presets.config.chatAppearance.theme),'roleforge');
  assert.equal(await page.evaluate(()=>Object.hasOwn(window.host.chatMetadata.roleforge_chat_presets.config.chatAppearance,'colorMode')),false,'legacy card color modes are removed');
  await change(page,'showChatNarrative',true);await page.evaluate(async()=>{window.host.characterId=0;await window.hStatsPreview.switchChat('A',window.themeChatA);});
  assert.equal(await control(page,'showChatHeader').isChecked(),false);assert.equal(await control(page,'showChatDialogue').isChecked(),false);assert.equal(await control(page,'showChatNarrative').isChecked(),true);assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.showChatHeader),true,'chat appearance never overwrites global defaults');
  // The isolated host has one disk-cache slot; ST loads a separate chat file.
  // Cache the selected A metadata before reloading this fixture.
  await page.evaluate(()=>window.host.saveMetadata());
  await page.reload();await ready(page);assert.equal(await control(page,'showChatHeader').isChecked(),false,'frame choices survive reload');assert.equal(await control(page,'showChatDialogue').isChecked(),false);assert.equal(await control(page,'showChatNarrative').isChecked(),true);assert.equal(await control(page,'chatColorMode').count(),0);
  await page.locator('.rf-chat-theme-preview').evaluate(n=>n.open=true);await page.locator('.rf-chat-theme-preview .trpg-narrative').waitFor();await page.locator('.rf-chat-appearance-settings').screenshot({path:`${artifacts}/settings-${width}.png`});
  assert.deepEqual(errors,[]);console.log(`PASS Original only, 8 independent frame combinations, user UI, Regex identity, rollback, card defaults and per-chat persistence at ${width}px`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
