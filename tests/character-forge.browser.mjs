// Production loader + iframe + drawer, with saved drafts and a controlled host.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.FORGE_SCREENSHOT_DIR||'/workspace/artifacts/forge-0588';await mkdir(artifacts,{recursive:true});
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--SmartThemeBodyColor:#ddd;--SmartThemeBlurTintColor:#202020;--SmartThemeBorderColor:#555}
*{box-sizing:border-box}body{margin:0;background:#202020;color:#ddd;font:14px system-ui;height:100dvh;display:flex;flex-direction:column}
header{height:48px;flex-shrink:0;padding:12px}#chat{flex:1;min-height:0;overflow:auto;padding:0;display:flex;flex-direction:column}
#send_form{flex-shrink:0;padding:8px;height:96px}#send_textarea{width:100%;height:70px;background:#222;border:1px solid #555;color:#ddd;border-radius:12px}
#extensions_settings2{display:none;position:fixed;inset:48px 0 0;overflow:auto;background:#202020;z-index:9999;padding:12px}
.inline-drawer-content{display:block}.text_pole{width:100%;border-radius:6px;border:1px solid #555;background:#111;color:#ddd;padding:8px;font:inherit}
.menu_button{padding:8px;border-radius:6px;border:1px solid #555;background:#333;color:#ddd;font:inherit}
#extensionsMenu,#extensionsMenuButton{display:none}
</style><header>SillyTavern · Character Forge</header><button id="extensionsMenuButton"></button><div id="extensionsMenu"></div><div id="extensions_settings2"></div><div id="chat"></div><form id="send_form"><textarea id="send_textarea" placeholder="Type a message"></textarea></form>
<script>
const callbacks=new Map(),eventTypes=Object.fromEntries(['CHAT_CHANGED','MESSAGE_SENT','GENERATION_STARTED','GENERATION_AFTER_COMMANDS','MESSAGE_RECEIVED','MESSAGE_SWIPED','MESSAGE_DELETED','CHARACTER_MESSAGE_RENDERED','GENERATION_ENDED','GENERATION_STOPPED','STREAM_TOKEN_RECEIVED'].map(k=>[k,k]));
window.host={extensionSettings:{tretaresia_rpg:{language:'en',autoTrack:false,injectState:true,autoContinuity:false,chatPresentation:false}},chatMetadata:{},chat:[],characters:[{name:'Forge',avatar:'forge.png',first_mes:'',data:{extensions:{}}}],characterId:0,eventTypes,
 eventSource:{on(t,f){const list=callbacks.get(t)||[];list.push(f);callbacks.set(t,list)},async emit(t,...args){await Promise.all((callbacks.get(t)||[]).map(f=>f(...args))) }},
 getCurrentChatId:()=> 'forge-test',getRequestHeaders:()=>({'Content-Type':'application/json'}),saveSettingsDebounced(){},saveMetadata:async()=>{},setExtensionPrompt(...args){window.lastPrompt=args},
 generate:async()=>{window.generationCount=(window.generationCount||0)+1;window.host.chat.push({is_user:false,mes:'Your story begins.'})},
 renderExtensionTemplateAsync:async(folder,name)=>(await fetch('/scripts/extensions/'+folder+'/'+name+'.html')).text()};
window.SillyTavern={getContext:()=>window.host,libs:{}};window.toastr={error:console.error,warning(){},info(){},success(){}};
</script><script type="module" src="${base}loader.js"></script>`;
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end(fixture);return}if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return}if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return}const path=url.pathname.slice(base.length);res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':'text/javascript');res.end(await readFile(new URL(path,root)))}catch{res.writeHead(404).end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.FORGE_VISUAL_FONTS&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:width<600,reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(12000);console.log('Start',width);
  page.on('pageerror',e=>errors.push(e.message));if(!process.env.FORGE_VISUAL_FONTS)await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#tretaresia-character-forge iframe').waitFor();
  const f=page.frameLocator('#tretaresia-character-forge iframe');await f.locator('#fName').waitFor({state:'attached'});await f.locator('#trSkip').evaluate(n=>n.click());await f.locator('#trapp:not(.loading)').waitFor();
  const checkFit=async()=>{await page.waitForTimeout(80);const fit=await page.evaluate(()=>{const c=document.querySelector('#chat').getBoundingClientRect(),f=document.querySelector('#tretaresia-character-forge iframe').getBoundingClientRect();return{gap:c.bottom-f.bottom,overflow:document.documentElement.scrollWidth-innerWidth}});assert.ok(Math.abs(fit.gap)<=1,JSON.stringify(fit));assert.ok(fit.overflow<=1);
   const inside=await f.locator('#trapp').evaluate(root=>{root.scrollLeft=1000;const wrap=root.querySelector('.wrap');const result={width:root.clientWidth,scrollWidth:root.scrollWidth,scrollLeft:root.scrollLeft,wrapWidth:wrap.clientWidth,wrapScroll:wrap.scrollWidth,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};root.scrollLeft=0;return result});
   assert.ok(inside.scrollWidth<=inside.width+1,JSON.stringify(inside));assert.equal(inside.scrollLeft,0,JSON.stringify(inside));assert.ok(inside.wrapScroll<=inside.wrapWidth+1,JSON.stringify(inside));
  };
  console.log('Loaded frame',width);await checkFit();await page.locator('#send_form').evaluate(n=>n.style.height='180px');await checkFit();await page.setViewportSize({width:Math.max(390,width),height:600});await checkFit();await page.setViewportSize({width,height:844});await page.locator('#send_form').evaluate(n=>n.style.height='96px');await checkFit();
  if(width<600){
    // Safari keyboard opening can pan its visual viewport beyond the iframe
    // before the host has resized. Do not turn that transient state into 1px.
    await f.locator('#fName').fill('Ari');await f.locator('#fCont').focus();
    assert.ok(await f.locator('#fCont').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=16));
    await page.evaluate(()=>{window.originalForgeViewport=Object.getOwnPropertyDescriptor(window,'visualViewport');const v=new EventTarget();v.height=360;v.offsetTop=document.querySelector('#chat').getBoundingClientRect().bottom+40;Object.defineProperty(window,'visualViewport',{configurable:true,value:v});window.dispatchEvent(new Event('resize'));});
    await page.waitForTimeout(100);
    assert.ok(await page.locator('#tretaresia-character-forge iframe').evaluate(n=>n.clientHeight>=300),'keyboard pan must not collapse the iframe');
    const visible=await f.locator('#fCont').evaluate(n=>{const root=document.getElementById('trapp'),r=n.getBoundingClientRect(),b=root.getBoundingClientRect();return {focused:document.activeElement===n,top:r.top,bottom:r.bottom,height:b.height};});
    assert.ok(visible.focused&&visible.top>=0&&visible.bottom<=visible.height,JSON.stringify(visible));
    await page.evaluate(()=>{window.visualViewport.offsetTop=document.querySelector('#chat').getBoundingClientRect().bottom-4;window.dispatchEvent(new Event('resize'));});
    await page.waitForTimeout(80);
    assert.ok(await page.locator('#tretaresia-character-forge iframe').evaluate(n=>n.clientHeight>=300),'a thin viewport intersection must not collapse the form either');
    // Changing fields while open scrolls the form, not the host to a blank area.
    await f.locator('#fName').focus();await page.waitForTimeout(80);
    assert.ok(await f.locator('#fName').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=document.getElementById('trapp').clientHeight;}));
    await page.evaluate(()=>{Object.defineProperty(window,'visualViewport',window.originalForgeViewport);delete window.originalForgeViewport;window.dispatchEvent(new Event('resize'));});
    await f.locator('#fName').evaluate(n=>n.blur());await checkFit();
    await page.setViewportSize({width,height:400});await f.locator('#fCont').fill('Arcadia');await page.waitForTimeout(100);
    assert.ok(await f.locator('#fCont').evaluate(n=>{const r=n.getBoundingClientRect();return document.activeElement===n&&r.top>=0&&r.bottom<=document.getElementById('trapp').clientHeight;}));
    await page.waitForFunction(()=>Object.values(window.host.chatMetadata).some(v=>v?.draft?.fields?.fCont==='Arcadia'));
    if(width===390)await page.screenshot({path:artifacts+'/keyboard-sized-viewport-mobile.png'});
    await page.setViewportSize({width,height:844});await f.locator('#fCont').evaluate(n=>n.blur());await checkFit();
  }
  assert.equal(await f.locator('.corner').count(),0);
  if(process.env.FORGE_VISUAL_FONTS){const fonts=await f.locator('#trapp').evaluate(async()=>{await document.fonts.ready;return [...document.fonts].filter(face=>face.status==='loaded').map(face=>face.family)});assert.ok(fonts.includes('Orbitron'),JSON.stringify(fonts));console.log('Real Forge fonts loaded',width);}
  // Use real theme controls: palette changes arrive live without replacing the iframe or draft.
  await f.locator('#fName').fill('Ari');
  await page.locator('#tretaresia-control-trigger').evaluate(n=>n.click());
  for(const preset of ['abyss','parchment','forge','verdant']){
    await page.locator('[data-ui-setting=themePreset]').selectOption(preset);
    const expected=await page.evaluate(()=>{const c=window.host.extensionSettings.tretaresia_rpg;return {accent:c.accentColor,highlight:c.accentAltColor,text:c.inkColor,surface:c.surfaceColor}});
    await f.locator('#trapp').evaluate((root,c)=>new Promise(resolve=>{const check=()=>{if(root.style.getPropertyValue('--gold')===c.accent)resolve();else requestAnimationFrame(check)};check()}),expected);
    const colors=await f.locator('#trapp').evaluate(root=>{const css=root.style;return {accent:css.getPropertyValue('--gold'),highlight:css.getPropertyValue('--gold2'),text:css.getPropertyValue('--txt'),surface:css.getPropertyValue('--bg')}});
    assert.deepEqual(colors,expected);
    const contrasts=await f.locator('#trapp').evaluate(root=>{
      function lum(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
      const on=lum(root.style.getPropertyValue('--on-accent'));
      return ['--gold2','--goldd'].map(key=>{const bg=lum(root.style.getPropertyValue(key));return (Math.max(on,bg)+.05)/(Math.min(on,bg)+.05);});
    });assert.ok(contrasts.every(value=>value>=4.5),JSON.stringify(contrasts));await checkFit();
  }
  await f.locator('#trapp').evaluate(root=>new Promise(resolve=>{const check=()=>{if(root.style.getPropertyValue('--gold')==='#79b463')resolve();else requestAnimationFrame(check)};check()}));
  assert.equal(await f.locator('#fName').inputValue(),'Ari');
  assert.equal(await f.locator('#trapp').evaluate(n=>n.style.getPropertyValue('--bg')),'#030704');
  await page.locator('[data-action=close-control-center]').click();
  await f.locator('#trapp').evaluate(()=>{window.TR.tab('t1');document.getElementById('trapp').scrollTop=0;});
  await checkFit();if(width===390)await page.screenshot({path:artifacts+'/character-theme-verdant-mobile.png'});
  await page.locator('#tretaresia-control-trigger').evaluate(n=>n.click());
  await page.locator('[data-ui-setting=accentColor]').evaluate(n=>{n.value='#a673db';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});
  await f.locator('#trapp').evaluate(root=>new Promise(resolve=>{const check=()=>{if(root.style.getPropertyValue('--gold')==='#a673db')resolve();else requestAnimationFrame(check)};check()}));
  await page.locator('[data-action=close-control-center]').click();
  await checkFit();
  // Local light-mode switch retains the selected accent and a saved draft.
  await f.locator('#trapp').evaluate(()=>window.TR.th());assert.equal(await f.locator('#trapp').evaluate(n=>n.style.getPropertyValue('--gold')),'#a673db');
  await checkFit();await f.locator('#trapp').evaluate(()=>window.TR.th());
  // Longer labels and enlarged text must wrap inside the iframe rather than pan sideways.
  const title=await f.locator('.h1').textContent();await f.locator('.h1').evaluate(n=>n.textContent='LongUnbrokenCharacterForgeHeading'.repeat(3));await checkFit();await f.locator('.h1').evaluate((n,text)=>n.textContent=text,title);
  await f.locator('#fName').fill('Ari');await f.locator('#tab_t3').click();assert.equal(await f.locator('#originForm').isVisible(),false);await f.locator('#originAdd').click();await f.locator('#fOrigin').fill('Dawn');await f.locator('#originRemove').click();assert.equal(await f.locator('#fOrigin').inputValue(),'');
  await f.locator('#tab_t4').click();const vertical=await f.locator('#trapp').evaluate(n=>{n.scrollTop=1000;return n.scrollTop});assert.ok(vertical>0,'vertical scrolling must remain enabled');await checkFit();await f.locator('#fAffil').fill('Academy');await f.locator('#fParty').fill('Moonlight');await f.locator('#alignmentChips button').filter({hasText:'Villain'}).click();
  console.log('Fields entered',width);await page.waitForFunction(()=>Object.values(window.host.chatMetadata).some(v=>v?.draft?.fields?.fParty==='Moonlight' && v?.draft?.alignment==='Villain'));
  const draft=await page.evaluate(()=>Object.values(window.host.chatMetadata).find(v=>v?.draft)?.draft);assert.equal(draft.version,2);assert.equal(draft.originEnabled,false);assert.equal(draft.alignment,'Villain');assert.equal(draft.fields.fGuild,'');
  await page.locator('#tretaresia-character-forge iframe').evaluate(n=>n.contentWindow.location.reload());await f.locator('#trSkip').waitFor();await f.locator('#trSkip').evaluate(n=>n.click());await f.locator('#trapp:not(.loading)').waitFor();assert.equal(await f.locator('#fParty').inputValue(),'Moonlight');assert.equal(await f.locator('#originForm').isVisible(),false);await f.locator('#tab_t4').click();
  if(width===390)await page.screenshot({path:artifacts+'/character-path-mobile.png'});
  // Exercise native preset workspace and save to the actual owner card.
  await page.locator('#extensions_settings2').evaluate(n=>n.style.display='block');
  await page.locator('#tretaresia-rpg-settings').evaluate(n=>{n.querySelectorAll('details').forEach(d=>d.open=true);n.querySelectorAll('.inline-drawer-content').forEach(d=>d.style.display='block')});
  const w=page.locator('#roleforge-forge-editor .rf-forge-workspace');await w.waitFor({state:'attached'});
  await w.locator('select').selectOption('custom');await w.locator('.rf-forge-editor').waitFor();
  const groups=w.locator('fieldset');
  for (const [label,values] of [['Origin locations',['Arcadia']],['Social standings',['Citizen','Merchant']]]) {const group=groups.filter({hasText:label});for(const value of values){await group.locator('button').filter({hasText:'+ Add choice'}).click();await group.locator('input').last().fill(value);}}
  const arsenals=groups.filter({hasText:'Arsenal types'});await arsenals.locator('button').filter({hasText:'+ Add choice'}).click();await arsenals.locator('input').fill('Firearm');
  await w.locator('label').filter({hasText:'Rank heading'}).locator('input').fill('School year');await w.locator('input[type=checkbox]').uncheck();
  await w.locator('button[type=submit]').click();await w.locator('input[type=checkbox]').waitFor();
  await page.waitForFunction(()=>Object.values(window.host.extensionSettings.tretaresia_rpg.roleforgeForgePresets||{}).some(p=>p.rankLabel==='School year'));
  if(width===390){await w.evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:artifacts+'/custom-preset-native-mobile.png'});}
  await page.locator('#extensions_settings2').evaluate(n=>n.style.display='none');await f.locator('#itAdd').click();assert.ok((await f.locator('#itT').locator('option').allTextContents()).includes('Firearm'));assert.equal(await f.locator('#rankField').isVisible(),false);
  // Saved profile uses the main generation API once and no extra user message.
  await f.locator('#trapp').evaluate(()=>window.TR.send());await page.waitForFunction(()=>window.generationCount===1);assert.equal(await page.evaluate(()=>window.host.chat.some(m=>m.is_user)),false);assert.equal(await page.locator('#tretaresia-character-forge').count(),0);
  const state=await page.evaluate(()=>Object.values(window.host.chatMetadata).find(v=>v?.player&&v?.inventory));assert.equal(state.player.originSkill,'None');assert.equal(state.player.party,'Moonlight');assert.equal(state.player.guild,'Unaffiliated');assert.equal(state.skills.length,0);
  // Hidden rank must survive a manual EXP edit rather than the empty preset's default option.
  await page.locator('#tretaresia-rpg-wand-launcher').evaluate(n=>n.click());await page.locator('#tretaresia-rpg-overlay.is-ready').waitFor();await page.locator('[data-tab=rank]').evaluate(n=>n.click());
  const rankForm=page.locator('[data-form=rank]');await rankForm.evaluate(n=>n.closest('details').open=true);
  assert.equal(await rankForm.locator('[name=adventurerRank]').isVisible(),false);
  const beforeRank=await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.adventurerRank);
  await rankForm.locator('[name=experience]').fill('7');await rankForm.locator('button[type=submit]').click();
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.experience===7);assert.equal(await page.evaluate(()=>window.host.chatMetadata.tretaresia_rpg_state.progression.adventurerRank),beforeRank);
  assert.deepEqual(errors,[]);await page.close();console.log(`Forge ${width}px: fit, optional skill, saved fields, native preset, custom Arsenal and opening passed`);
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
