// Real renderer, CSS and Voice controls inside a simulated ST chat shell.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/',artifacts=process.env.CHAT_DESIGN_ARTIFACTS||'/tmp/roleforge-chat-designs';
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith(base)||path.includes('..')){res.writeHead(404).end();return;}
 const file=path.slice(base.length),ext=file.split('.').at(-1);res.setHeader('content-type',({html:'text/html',css:'text/css',jpg:'image/jpeg',woff2:'font/woff2',json:'application/json'})[ext]||'text/javascript');res.end(await readFile(new URL(file,root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await mkdir(artifacts,{recursive:true});
const origin=`http://127.0.0.1:${server.address().port}${base}`,url=origin+'docs/previews/chat-designs/index.html',results=[];
let browser;
const flags=async(page,value)=>{for(const [bit,part]of ['header','dialogue','narrative'].entries())await page.locator('#'+part).setChecked(Boolean(value&(1<<bit)));};
async function ready(page){await page.waitForFunction(()=>window.chatDesignPreview?.ready);await page.locator('.extra-controls').evaluate(n=>n.open=true);await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);}
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1300},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto(url);await ready(page);
  const story=page.locator('#story');const texts=await story.locator('.trpg-prose-copy,.trpg-dialogue-copy').allTextContents();
  for(const theme of ['chapter','codex','aincrad']){
   await page.locator(`[data-design="${theme}"]`).click();
   const names=[];
   for(const color of ['#d1b27c','#e65f70','#76b9e8']){
    await page.locator('#color').selectOption(color);
    for(let combination=0;combination<8;combination++){
     await flags(page,combination);assert.equal(await story.getAttribute('data-rf-chat-theme'),theme);
     assert.equal(await story.locator('.trpg-header').count(),combination&1?1:0);
     assert.equal(await story.locator('.trpg-dialogue.trpg-unframed').count(),combination&2?0:2);
     assert.equal(await story.locator('.trpg-narrative.trpg-unframed').count(),combination&4?0:2);
     assert.deepEqual(await story.locator('.trpg-prose-copy,.trpg-dialogue-copy').allTextContents(),texts);
     assert.equal(await story.locator('.rf-voice-dialogue-controls').count(),4,'Voice controls remain available');
     assert.equal(await story.locator('.trpg-header,.trpg-narrative').evaluateAll(nodes=>nodes.every(n=>{const s=getComputedStyle(n);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage==='none'&&s.boxShadow==='none';})),true,'Header and Narrative are transparent');
     assert.equal(await story.locator('.trpg-prose-copy').first().evaluate(n=>getComputedStyle(n).fontStyle),combination&4?'normal':'italic');
     if(!(combination&2)){
      const s=await story.locator('.trpg-dialogue-copy').first().evaluate(n=>({color:getComputedStyle(n).color,quotes:['::before','::after'].map(p=>getComputedStyle(n,p).content)}));
      assert.deepEqual(s.quotes,[JSON.stringify('"'),JSON.stringify('"')]);assert.equal(s.color,`rgb(${color.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')})`);
     }
     assert.equal(await story.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,`${theme} fits ${width}px at flags ${combination}`);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'workbench fits viewport');
    }
    await flags(page,7);names.push(await story.locator('.trpg-identity>strong').evaluate(n=>getComputedStyle(n).color));
   }
   assert.equal(new Set(names).size,3,'nameplate tracks each NPC identity color');await page.locator('#color').selectOption('#d1b27c');
   assert.equal(await story.locator('.rf-voice-button:not([hidden])').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44;})),true,'actual Voice buttons have 44px targets');
   assert.equal(await story.locator('.trpg-narrative .trpg-prose-mark>svg').first().isVisible(),true,'narration includes its pen');
   await page.locator('#badge').selectOption('off');assert.equal(await story.locator('.trpg-header-badge').count(),0);await page.locator('#badge').selectOption('ability');assert.equal(await story.locator('.trpg-header-badge').textContent(),'เวทน้ำระดับกลาง');
   if(theme==='aincrad'){
    assert.deepEqual(await story.locator('.trpg-npc-stat').allTextContents(),['HP100','Lv7']);await page.locator('#npc-stats').uncheck();assert.equal(await story.locator('.trpg-npc-vitals').count(),0);await page.locator('#npc-stats').check();
    await page.evaluate(()=>{window.savedStats=window.chatDesignPreview.profile.stats;window.chatDesignPreview.profile.stats={hp:0};window.chatDesignPreview.render();});assert.deepEqual(await story.locator('.trpg-npc-stat').allTextContents(),['HP0']);assert.equal(await story.locator('.trpg-npc-hp').getAttribute('class'),'trpg-npc-stat trpg-npc-hp is-empty');
    await page.evaluate(()=>{window.chatDesignPreview.profile.stats={hp:'',level:null};window.chatDesignPreview.render();});assert.equal(await story.locator('.trpg-npc-stat').count(),0);
    await page.evaluate(()=>{window.chatDesignPreview.profile.stats=window.savedStats;window.chatDesignPreview.render();});
   }
   await page.locator('#portrait').check();
   for(const size of [48,144,72]){
    await page.locator('#portrait-size').evaluate((n,size)=>{n.value=size;n.dispatchEvent(new Event('input',{bubbles:true}));},size);
    await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);
    assert.equal(await page.locator('#portrait-size-value').textContent(),size+' px');
    const box=await story.locator('.trpg-portrait').boundingBox();assert.ok(Math.abs(box.width-size)<1&&Math.abs(box.height-size)<1,'preview slider preserves the configured square frame');
    assert.equal(await story.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'large portraits fit the chat');
   }
   for(const photo of [true,false]){
    await page.locator('#portrait').setChecked(photo);
    if(photo){await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);const [frame,name]=await Promise.all([story.locator('.trpg-portrait').boundingBox(),story.locator('.trpg-identity>strong').boundingBox()]);assert.ok(Math.abs(frame.width-frame.height)<1,'portrait is square');assert.equal(theme==='codex'?frame.x>name.x+name.width:frame.x+frame.width<=name.x,true,'portrait sits on the approved side');}
    else assert.equal(await story.locator('.trpg-photo').count(),0);
    if(width===390||width===1440){await page.locator('.extra-controls').evaluate(n=>n.open=false);await page.screenshot({path:`${artifacts}/${theme}-${width}-${photo?'portrait':'no-portrait'}.png`,fullPage:true});await page.locator('#chat-host').screenshot({path:`${artifacts}/${theme}-${width}-${photo?'portrait':'no-portrait'}-chat.png`});await story.screenshot({path:`${artifacts}/${theme}-${width}-${photo?'portrait':'no-portrait'}-detail.png`});await page.locator('.extra-controls').evaluate(n=>n.open=true);}
   }
   await page.locator('#portrait').check();await page.locator('#long-text').check();assert.equal(await story.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'long uninterrupted prose fits');await page.locator('#long-text').uncheck();
   await page.evaluate(()=>{window.savedProfile=structuredClone(window.chatDesignPreview.profile);window.savedNames=window.chatDesignPreview.blocks.map(b=>b.name);Object.assign(window.chatDesignPreview.profile,{name:'Very long name '.repeat(16),title:'Long title '.repeat(20),faction:'AnUninterruptedFactionName'.repeat(12)});window.chatDesignPreview.blocks.forEach(b=>{if(b.name)b.name=window.chatDesignPreview.profile.name;});window.chatDesignPreview.render();});
   assert.equal(await story.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'long NPC fields fit');
   assert.equal(await story.locator('.trpg-identity>strong').textContent(),'Very long name '.repeat(16));
   const [label,copy]=await Promise.all([story.locator('.trpg-speech-top').first().boundingBox(),story.locator('.trpg-dialogue-copy').first().boundingBox()]);assert.ok(label.y+label.height<=copy.y+1,'long name never overlaps speech');
   await page.evaluate(()=>{Object.assign(window.chatDesignPreview.profile,window.savedProfile);window.chatDesignPreview.blocks.forEach((b,i)=>{if(b.name)b.name=window.savedNames[i];});window.chatDesignPreview.render();});
   await story.locator('.trpg-header').click();assert.equal(await page.locator('#preview-dialog').evaluate(n=>n.open),true);await page.locator('#close-dialog').click();await story.locator('.rf-voice-setup').first().click();assert.equal(await page.locator('#preview-dialog').evaluate(n=>n.open),true);await page.locator('#close-dialog').click();
  }
  assert.deepEqual(errors,[]);results.push({width,themes:3,frameCombinations:8,characterColors:3,portraits:['with','without'],overflow:false,runtimeErrors:errors});console.log(`PASS ${width}px: all approved designs, frames, colors, portraits, Voice, long text and NPC HUD`);await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1300},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto(url);await ready(page);
 await page.locator('[data-design="aincrad"]').click();await page.waitForTimeout(400);
 assert.equal(await page.locator('#story').evaluate(n=>n.getAnimations({subtree:true}).every(a=>a.playState==='finished')),true,'finite entrance ends within 330ms');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#story').evaluate(n=>n.getAnimations({subtree:true}).length),0,'Reduce Motion disables entrance');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const native=await page.evaluate(async origin=>{
  const [{mountSharedStory},{speakerHeader,narrative,createChatPresentation},{dialogueFrame},{applyChatTheme}]=await Promise.all([import(origin+'src/chat-compat.js'),import(origin+'src/npc-chat.js'),import(origin+'src/chat-folio.js'),import(origin+'src/chat-themes.js')]);
  const host=document.createElement('div');host.innerHTML='<tr-header name="Red"></tr-header><tr-narrative>Native prose.</tr-narrative><tr-dialogue name="Red">Hello <button>Native action</button><input type="checkbox" checked></tr-dialogue><section class="TH-render"><iframe title="Native MVU widget" srcdoc="<script>parent.nativeDesignLoads=(parent.nativeDesignLoads||0)+1;window.fixture=123;<\/script>"></iframe></section><tr-header name="Blue"></tr-header><tr-dialogue name="Blue">Blue reply.</tr-dialogue>';document.body.append(host);
  const button=host.querySelector('button'),input=host.querySelector('input'),iframe=host.querySelector('iframe'),card=host.querySelector('.TH-render');let clicks=0;button.addEventListener('click',()=>clicks++);await new Promise(resolve=>iframe.addEventListener('load',resolve,{once:true}));
  const nativeWindow=iframe.contentWindow,nodes=[...host.childNodes],profiles={Red:{name:'Red',identityColor:'#e65f70',occupation:'Detective',stats:{rank:'Senior',hp:0,level:4}},Blue:{name:'Blue',identityColor:'#76b9e8'}},blocks=[{type:'header',name:'Red'},{type:'narrative',text:'Native prose.'},{type:'dialogue',name:'Red',text:'Hello Native action'},{type:'header',name:'Blue'},{type:'dialogue',name:'Blue',text:'Blue reply.'}];
  for(const theme of ['chapter','codex','aincrad','roleforge']){
   const view={theme},mount=mountSharedStory({host,nodes,blocks,header:(name,prior,colorOnly)=>({key:name,color:profiles[name].identityColor,node:colorOnly||prior===name?null:speakerHeader(profiles[name],()=>{},view)}),narrative:text=>narrative(text,true,view),dialogue:name=>dialogueFrame(name,view)});mount.roots.forEach(r=>applyChatTheme(r,view));button.click();mount.restore();
   if(host.querySelector('button')!==button||host.querySelector('input')!==input||host.querySelector('iframe')!==iframe||host.querySelector('.TH-render')!==card)throw Error('Native nodes changed by '+theme);
  }
  const result={inputChecked:input.checked,clicks,loads:window.nativeDesignLoads,sameWindow:iframe.contentWindow===nativeWindow&&nativeWindow.fixture===123};host.remove();
  const chat=document.createElement('div');chat.id='chat';const row=document.createElement('div');row.className='mes';row.setAttribute('mesid','0');const body=document.createElement('div');body.className='mes_text';row.append(body);chat.append(row);document.body.append(chat);
  const message={name:'Red',mes:'<tr-header name="Red"/><tr-dialogue name="Red">First reply.</tr-dialogue>'},context={chat:[message],isGenerating:false,getCurrentChatId:()=> 'motion-check'},settings={chatTheme:'aincrad',chatEffects:true,chatPresentation:true,chatRegexMode:'shared'};body.textContent=message.mes;
  const presentation=createChatPresentation({context:()=>context,settings:()=>settings,state:()=>({npcs:[]}),visible:t=>t},()=>{});
  await new Promise(resolve=>setTimeout(resolve,140));result.initialEntrance=Boolean(body.querySelector('.trpg-entrance'));
  presentation.refresh();await new Promise(resolve=>setTimeout(resolve,140));result.refreshEntrance=Boolean(body.querySelector('.trpg-entrance'));
  context.isGenerating=true;message.mes='<tr-header name="Red"/><tr-dialogue name="Red">Streaming revision.</tr-dialogue>';body.textContent=message.mes;await new Promise(resolve=>setTimeout(resolve,140));result.streamingEntrance=Boolean(body.querySelector('.trpg-entrance'));result.streamedText=body.querySelector('.trpg-dialogue-copy')?.textContent;
  presentation.destroy();chat.remove();return result;
 },origin);
 assert.deepEqual(native,{inputChecked:true,clicks:4,loads:1,sameWindow:true,initialEntrance:true,refreshEntrance:false,streamingEntrance:false,streamedText:'Streaming revision.'});assert.deepEqual(errors,[]);await page.close();
 console.log('PASS finite/reduced entrance, no streaming replay, native actions/input and a single mounted MVU iframe across designs');
 await writeFile(`${artifacts}/validation.json`,JSON.stringify({results,nativeAndMotion:native},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
