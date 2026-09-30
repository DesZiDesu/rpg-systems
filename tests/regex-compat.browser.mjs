// Native SillyTavern-rendered HTML stays authoritative alongside RoleForge cards.
// Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/regex-compat.browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {displayRegexEnabled} from '../src/npc-chat.js';
const activeRegex={findRegex:'Hello',placement:[2],markdownOnly:true};
assert.equal(displayRegexEnabled({extensionSettings:{regex:[activeRegex]}}),true);
assert.equal(displayRegexEnabled({extensionSettings:{regex:[{...activeRegex,disabled:true}]}}),false);
assert.equal(displayRegexEnabled({extensionSettings:{regex:[{...activeRegex,placement:[1]}]}}),false);
assert.equal(displayRegexEnabled({extensionSettings:{regex:[{...activeRegex,markdownOnly:false,promptOnly:true}]}}),false);
assert.equal(displayRegexEnabled({extensionSettings:{regex:[{...activeRegex,promptOnly:true}]}}),true);
assert.equal(displayRegexEnabled({extensionSettings:{regex:[activeRegex],disabledExtensions:['regex']}}),false);
assert.equal(displayRegexEnabled({extensionSettings:{character_allowed_regex:[]},characterId:0,characters:[{avatar:'test.png',data:{extensions:{regex_scripts:[activeRegex]}}}]}),false);
assert.equal(displayRegexEnabled({extensionSettings:{character_allowed_regex:['test.png']},characterId:0,characters:[{avatar:'test.png',data:{extensions:{regex_scripts:[activeRegex]}}}]}),true);
assert.equal(displayRegexEnabled({extensionSettings:{preset_allowed_regex:{openai:[]}},getPresetManager:()=>({apiId:'openai',getSelectedPresetName:()=> 'Demo',readPresetExtensionField:()=>[activeRegex]})}),false);
assert.equal(displayRegexEnabled({extensionSettings:{preset_allowed_regex:{openai:['Demo']}},getPresetManager:()=>({apiId:'openai',getSelectedPresetName:()=> 'Demo',readPresetExtensionField:()=>[activeRegex]})}),true);
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){response.setHeader('content-type','application/json');response.end('[]');return;}
  if(!url.pathname.startsWith(base)||url.pathname.includes('..')){response.writeHead(404).end();return;}
  const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));
  response.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');response.end(body);
 }catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
const place='Guild Hall',story='You walk into the Guild Hall auction room and walk up to the mission board to read the posted jobs.';
const patch={ops:[],missionBoard:{title:'Guild Mission Board',location:place,evidence:story,missions:[{name:'Deliver medicine',objective:'Bring medicine to Cora',reward:'5 silver'}]},
 auction:{id:'regex-demo-auction',title:'Guild Hall Auction',location:place,evidence:story,denomination:'gold',entryFee:0,deposit:0,lots:[{id:'blade',name:'Moonblade',category:'Weapon',description:'A well-forged silver sword.',quantity:1,openingBid:3,minIncrement:1,bidders:[]}]}};
async function assertNative(page,label){
 const kept=await page.evaluate(()=>({
  same:window.nativeCard===document.querySelector('.regex-card'),html:window.nativeCard?.outerHTML,
  checked:document.querySelector('.regex-card input')?.checked,cards:document.querySelectorAll('.regex-card').length,
  clicks:window.regexClicks,
 }));
 assert.equal(kept.same,true,`${label}: DOM identity`);assert.equal(kept.html,await page.evaluate(()=>window.nativeHTML),`${label}: native HTML`);assert.equal(kept.checked,true,`${label}: input state`);assert.equal(kept.cards,1,`${label}: duplicate native content`);
 await page.locator('.regex-card button').click();assert.equal(await page.evaluate(()=>window.regexClicks),kept.clicks+1,`${label}: bound listener`);
}
async function renderNative(page,id,heading='Display-only regex replacement'){
 await page.evaluate(({id,heading})=>{
  const chat=document.querySelector('#chat');let row=chat.querySelector(`[mesid="${id}"]`);
  if(!row){row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);row.append(Object.assign(document.createElement('div'),{className:'mes_text'}));chat.append(row);}
  const content=row.querySelector('.mes_text');
  content.innerHTML=`<section class="regex-card" data-regex-widget="true" style="padding:12px;border:1px solid #d6b458"><h2>${heading}</h2><p><strong>Host Markdown</strong> <em>still formatted</em> <a href="https://example.com/quest">Quest link</a></p><table><tbody><tr><th>HP</th><td>12</td></tr></tbody></table><details open><summary>Character status</summary><pre><code>Rendered by another extension</code></pre></details><button type="button">Regex card action</button><label><input type="checkbox"> Remember choice</label></section>`;
  window.nativeCard=content.querySelector('.regex-card');window.regexClicks=0;
  window.nativeCard.querySelector('button').addEventListener('click',()=>{window.regexClicks++;});
  window.nativeCard.querySelector('input').checked=true;window.nativeHTML=window.nativeCard.outerHTML;
 },{id,heading});
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of (process.env.REGEX_WIDTHS||'320,390,1280').split(',').map(Number)){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>{
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',autoTrack:true,autoContinuity:false,chatPresentation:false,showSceneTracker:true,enableMissionBoard:true,enableAuctions:true,memoryAutoSummary:false}}));
   localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Nova'},npcs:[],quests:[],skills:[],inventory:[],location:{narrativeVersion:1,place:'Guild Hall'},onboarding:{locationSeeded:true},progression:{currency:{gold:20,silver:10,copper:0}}}}));
  });
  await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.querySelector('#tretaresia-rpg-overlay.is-ready'));
  await page.evaluate(()=>{document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#chat').style.cssText='display:block;padding:12px;font-size:16px;line-height:1.5;box-sizing:border-box';});
  const id=await page.evaluate(({story,patch})=>{
   window.host.chat.push({is_user:true,name:'Nova',mes:'I enter the Guild Hall auction room and read the mission board.'});
   const id=window.host.chat.length,mes=`${story}\n<!--tretaresia_patch:${JSON.stringify(patch)}-->`;
   window.host.chat.push({is_user:false,name:'Narrator',mes,swipe_id:0,swipes:[mes]});return id;
  },{story,patch});
  await renderNative(page,id);
  await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,id,'normal'),id);
  await page.locator('#chat .trpg-mission-board').waitFor({state:'visible'});await page.locator('#chat .trpg-auction').waitFor({state:'visible'});
  await assertNative(page,'scene + board + auction');
  await page.locator('.trpg-board-paper').first().click();assert(await page.locator('.trpg-board-detail').isVisible());await assertNative(page,'board details');
  // Even with character presentation enabled, rich/custom host output is kept.
  await page.evaluate(async id=>{window.host.extensionSettings.tretaresia_rpg.chatPresentation=true;await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);},id);
  await page.waitForTimeout(180);await assertNative(page,'presentation enabled');
  // An asynchronous native rerender replaces its own DOM, never our stale copy.
  await renderNative(page,id,'Native rerender after MESSAGE_UPDATED');
  await page.evaluate(async id=>{await window.host.eventSource.emit('MESSAGE_UPDATED',id);await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);},id);
  await page.waitForFunction(()=>document.querySelectorAll('#chat .trpg-mission-board').length===1&&document.querySelectorAll('#chat .trpg-auction').length===1);
  await assertNative(page,'native rerender');
  // Some formatters use wrapInner() instead of replacing the entire message.
  // Our previous cards must not remain nested and duplicate new addon cards.
  await page.evaluate(async id=>{
   const host=document.querySelector(`[mesid="${id}"] .mes_text`),wrapper=document.createElement('div');
   wrapper.className='other-extension-wrapper';wrapper.dataset.formatter='wrap-inner';
   wrapper.append(...host.childNodes);host.append(wrapper);window.nativeWrapper=wrapper;
   await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);
  },id);
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#chat .trpg-mission-board').count(),1,'wrapInner must not duplicate mission controls');
  assert.equal(await page.locator('#chat .trpg-auction').count(),1,'wrapInner must not duplicate auction controls');
  assert.equal(await page.evaluate(()=>document.querySelector('.other-extension-wrapper')===window.nativeWrapper),true);
  await assertNative(page,'native wrapper');
  // Disabling the scene tracker removes only its own prefix, retaining widgets.
  await page.evaluate(()=>{const check=document.querySelector('#tretaresia-rpg-show-scene-tracker');check.checked=false;check.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForTimeout(180);await assertNative(page,'tracker off');
  // A safe RoleForge protocol template still gets the original NPC presentation.
  const structuredId=await page.evaluate(()=>{
   window.host.extensionSettings.tretaresia_rpg.showSceneTracker=false;
   const mes='<tr-header name="Ashe"/><tr-narrative>She waits quietly.</tr-narrative><tr-dialogue name="Ashe">**Welcome**, traveler.</tr-dialogue>';
   const id=window.host.chat.length;window.host.chat.push({is_user:false,name:'Ashe',mes,swipe_id:0,swipes:[mes]});
   const row=document.createElement('div');row.className='mes';row.setAttribute('mesid',id);
   const text=document.createElement('div');text.className='mes_text';text.textContent=mes;row.append(text);document.querySelector('#chat').append(row);
   window.structuredOriginal=text.firstChild;return id;
  });
  await page.locator(`[mesid="${structuredId}"] .trpg-header`).waitFor();assert.equal(await page.locator(`[mesid="${structuredId}"] .trpg-dialogue strong`).textContent(),'Welcome');
  // Appended comments/action controls augment an unchanged story; they do not
  // replace it. Keep both the original body and those new native nodes.
  await page.evaluate(async id=>{
   const host=document.querySelector(`[mesid="${id}"] .mes_text`),button=document.createElement('button');
   button.className='native-story-control';button.textContent='Native story action';window.nativeControlClicks=0;
   button.addEventListener('click',()=>window.nativeControlClicks++);window.nativeComment=document.createComment('formatter marker');
   host.append(window.nativeComment,button);window.nativeControl=button;
   await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);
  },structuredId);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>window.structuredOriginal.isConnected),true,'Appended controls must not drop the unchanged story');
  await page.locator('.native-story-control').click();assert.equal(await page.evaluate(()=>window.nativeControlClicks),1);
  assert.equal(await page.evaluate(()=>window.nativeControl.isConnected&&window.nativeComment.isConnected),true);
  await page.evaluate(async id=>{window.nativeControl.remove();window.nativeComment.remove();await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);},structuredId);
  await page.locator(`[mesid="${structuredId}"] .trpg-header`).waitFor();
  // Turning presentation off restores the exact original native nodes.
  await page.evaluate(async id=>{window.host.extensionSettings.tretaresia_rpg.chatPresentation=false;await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);},structuredId);
  await page.waitForFunction(id=>document.querySelector(`[mesid="${id}"] .mes_text`).firstChild===window.structuredOriginal,structuredId);
  await page.evaluate(async id=>{window.host.extensionSettings.tretaresia_rpg.chatPresentation=true;await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);},structuredId);
  await page.locator(`[mesid="${structuredId}"] .trpg-header`).waitFor();
  // Wrapping an already formatted story restores its original native nodes
  // into that new wrapper, keeping the other formatter's container intact.
  await page.evaluate(async id=>{
   const host=document.querySelector(`[mesid="${id}"] .mes_text`),wrapper=document.createElement('div');
   wrapper.className='other-story-wrapper';wrapper.append(...host.childNodes);host.append(wrapper);window.storyWrapper=wrapper;
   await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);
  },structuredId);
  await page.waitForFunction(()=>document.querySelector('.other-story-wrapper')===window.storyWrapper&&window.structuredOriginal.parentNode===window.storyWrapper);
  assert.equal(await page.locator(`[mesid="${structuredId}"] .trpg-header`).count(),0);
  // A changed source plus fresh native output must never restore the old body,
  // including when the formatter also reparented our former story root.
  await page.evaluate(async id=>{
   const host=document.querySelector(`[mesid="${id}"] .mes_text`);host.replaceChildren(...window.storyWrapper.childNodes);
   await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);
  },structuredId);
  await page.locator(`[mesid="${structuredId}"] .trpg-header`).waitFor();
  await page.evaluate(async id=>{
   const host=document.querySelector(`[mesid="${id}"] .mes_text`),wrapper=document.createElement('div');wrapper.className='changed-source-wrapper';
   wrapper.append(...host.childNodes);window.nativeUpdatedNode=document.createElement('p');window.nativeUpdatedNode.textContent='Fresh native story after an edit.';wrapper.append(window.nativeUpdatedNode);host.append(wrapper);
   window.host.chat[id].mes='<tr-narrative>Fresh native story after an edit.</tr-narrative>';
   await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);
  },structuredId);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>window.nativeUpdatedNode.isConnected),true);
  assert.equal(await page.evaluate(()=>window.structuredOriginal.isConnected),false,'A changed source must not restore its stale original');
  assert.equal(await page.locator(`[mesid="${structuredId}"] .mes_text`).textContent(),'Fresh native story after an edit.');
  // ST display regex can emit simple text too; never reformat it from raw source.
  await page.evaluate(async id=>{
   window.host.extensionSettings.regex=[{findRegex:'traveler',replaceString:'friend',disabled:false,placement:[2],markdownOnly:true}];
   const text=document.querySelector(`[mesid="${id}"] .mes_text`);text.replaceChildren(Object.assign(document.createElement('p'),{textContent:'A plain display-only regex rewrite.'}));window.plainRegexNode=text.firstChild;
   await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);
  },structuredId);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(id=>document.querySelector(`[mesid="${id}"] .mes_text`).firstChild===window.plainRegexNode,structuredId),true);
  assert.equal(await page.locator(`[mesid="${structuredId}"] .trpg-header`).count(),0);
  // Preset and character-card regex are also respected, even if their output
  // happens to match raw text (there is no visible-text difference to detect).
  for(const scope of ['preset','character']){
   await page.evaluate(async({id,scope})=>{
    delete window.host.extensionSettings.regex;
    const scripts=[{findRegex:'Welcome',replaceString:'Welcome',disabled:false,placement:[2]}];
    window.host.getPresetManager=()=>({readPresetExtensionField:()=>scope==='preset'?scripts:[]});
    window.host.characters[window.host.characterId].data.extensions.regex_scripts=scope==='character'?scripts:[];
    const text=document.querySelector(`[mesid="${id}"] .mes_text`);text.replaceChildren(Object.assign(document.createElement('p'),{textContent:window.host.chat[id].mes}));window.scopedRegexNode=text.firstChild;
    await window.host.eventSource.emit(window.host.eventTypes.CHARACTER_MESSAGE_RENDERED,id);
   },{id:structuredId,scope});
   await page.waitForTimeout(180);
   assert.equal(await page.evaluate(id=>document.querySelector(`[mesid="${id}"] .mes_text`).firstChild===window.scopedRegexNode,structuredId),true,`${scope} regex native identity`);
   assert.equal(await page.locator(`[mesid="${structuredId}"] .trpg-header`).count(),0);
  }
  // Removing addons / changing chat cannot resurrect a previous host snapshot.
  await page.evaluate(async({id,structuredId})=>{
   window.host.chat[id].mes='The scene is over.';window.host.chat[id].swipe_id=1;window.host.chat[id].swipes[1]='The scene is over.';
   await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_SWIPED,id);
   window.host.extensionSettings.tretaresia_rpg.chatPresentation=false;
   window.host.chat=[{is_user:false,name:'Narrator',mes:'New chat, native card'}];
   document.querySelector('#chat').replaceChildren();
   await window.hStatsPreview.switchChat('regex-new-chat',{tretaresia_rpg_state:{npcs:[],location:{narrativeVersion:1,place:'Library'},onboarding:{locationSeeded:true}}});
  },{id,structuredId});
  await renderNative(page,0,'New chat native card');await page.waitForTimeout(180);await assertNative(page,'chat change');
  assert.equal(await page.locator('#chat .trpg-mission-board,#chat .trpg-auction').count(),0);
  assert.deepEqual(errors,[]);console.log(`Regex/native HTML compatibility passed at ${width}px`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
