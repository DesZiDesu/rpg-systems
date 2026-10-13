// Production management preview, chat frames and player rendering on local hosts.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/',artifacts=process.env.CHAT_FIX_ARTIFACTS||'/tmp/roleforge-chat-fixes';
const server=http.createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!pathname.startsWith(base)||pathname.includes('..')){res.writeHead(404).end();return;}
 const file=pathname.slice(base.length),ext=file.split('.').at(-1);let data=await readFile(new URL(file,root));
 if(file==='docs/previews/h-stats-fixture.js')data=data.toString().replace("'MESSAGE_DELETED',","'MESSAGE_DELETED','MESSAGE_EDITED','MESSAGE_UPDATED','USER_MESSAGE_RENDERED',");
 res.setHeader('content-type',({html:'text/html',css:'text/css',jpg:'image/jpeg',woff2:'font/woff2',json:'application/json'})[ext]||'text/javascript');res.end(data);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await mkdir(artifacts,{recursive:true});
const origin=`http://127.0.0.1:${server.address().port}${base}`,themes=['roleforge','folio','chapter','codex','aincrad'],results=[];
const narrative='หลังจากอาหารมื้อค่ำ ทุกคนก็แยกกันไปนอน ซึ่งรูเดียสตอนที่หลับไปก็ได้เจอกับเทพมนุษย์ แน่นอนว่าในบทสนทนามีเรื่องของฉันอยู่ที่แม้แต่เทพมนุษย์ก็ไม่สามารถรับรู้ได้';
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(origin+'docs/previews/archive-qol/index.html');await page.waitForFunction(()=>window.previewReady);
  await page.evaluate(async origin=>{
   window.previewData.portrait=async()=>await(await fetch(origin+'docs/previews/chat-original/assets/sample-character.jpg')).blob();
   for(const file of ['styles/chat-themes.css','styles/chat-illustrated.css']){const link=document.createElement('link');link.rel='stylesheet';link.href=origin+file;document.head.append(link);await new Promise((r,j)=>{link.onload=r;link.onerror=j;});}
  },origin);
  for(const theme of themes){
   await page.evaluate(theme=>{document.querySelector('dialog [data-close]').click();window.previewData.settings().chatTheme=theme;window.workspace.open(window.previewData.listScope('character')[0]);},theme);
   await page.locator('[data-detail] .trpg-detail-actions button').first().click();
   const preview=page.locator('form [data-preview]');await preview.evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await preview.locator('.trpg-photo').waitFor();await page.waitForFunction(()=>document.querySelector('[data-preview] .trpg-photo')?.naturalWidth>0);
   assert.equal(await preview.getAttribute('data-rf-chat-theme'),theme);
   assert.equal(await preview.locator('.trpg-dialogue-copy').count(),1,'editor uses the production speech frame');assert.equal(await preview.locator('.trpg-narrative').count(),1);
   const heights=[];
   for(const size of [48,72,144]){
    await page.locator('input[name=portraitSize]').evaluate((input,size)=>{input.value=size;input.dispatchEvent(new Event('input',{bubbles:true}));},size);
    await page.waitForFunction(()=>document.querySelector('[data-preview] .trpg-photo')?.naturalWidth>0);
    const metrics=await preview.evaluate(n=>{const photo=(n.querySelector('.trpg-portrait')||n.querySelector('.trpg-photo')).getBoundingClientRect(),header=n.querySelector('.trpg-header');return{photo:photo.toJSON(),height:header.getBoundingClientRect().height,overflow:n.scrollWidth>n.clientWidth+1,headerOverflow:header.scrollWidth>header.clientWidth+1,wrapped:n.querySelector('.trpg-portrait')?.contains(n.querySelector('.trpg-photo'))};});
    assert.ok(Math.abs(metrics.photo.width-size)<1&&Math.abs(metrics.photo.height-size)<1,`${theme} preserves ${size}px at ${width}px: ${JSON.stringify(metrics)}`);assert.equal(metrics.overflow,false);assert.equal(metrics.headerOverflow,false);if(['chapter','codex','aincrad'].includes(theme))assert.ok(metrics.wrapped);heights.push(metrics.height);
    // The same record in a normal chat container follows the same size.
    const chatPhoto=await page.evaluate(async({origin,size,theme})=>{
     const {renderStoryBlocks}=await import(origin+'src/npc-chat.js');
     let host=document.querySelector('#portrait-chat-check');if(!host){host=document.createElement('div');host.id='portrait-chat-check';host.className='trpg-chat';document.body.append(host);}host.style.cssText=`position:absolute;top:0;left:12px;width:${Math.min(innerWidth-24,720)}px;font:16px/1.7 system-ui`;
     const profile={...window.previewData.listScope('character')[0],portraitSize:size},photo=document.querySelector('[data-preview] .trpg-photo').src;
     host.replaceChildren();renderStoryBlocks(host,[{type:'header',name:profile.name}],new Map([[profile.name.toLowerCase(),profile]]),profile.name,()=>{},async()=>photo,null,{theme});
     await new Promise(r=>setTimeout(r,20));const img=host.querySelector('.trpg-photo');if(!img.complete)await new Promise(r=>img.onload=r);
     const box=(host.querySelector('.trpg-portrait')||img).getBoundingClientRect();return {width:box.width,height:box.height,overflow:host.scrollWidth>host.clientWidth+1};
    },{origin,size,theme});
    assert.ok(Math.abs(chatPhoto.width-size)<1&&Math.abs(chatPhoto.height-size)<1,`${theme} actual chat also respects ${size}px: ${JSON.stringify(chatPhoto)}`);assert.equal(chatPhoto.overflow,false);
   }
   assert.ok(heights[2]>heights[0],`${theme} header follows the configured image size`);
   await page.evaluate(()=>document.querySelector('#portrait-chat-check')?.remove());
   if((width===390||width===1280)&&theme==='aincrad')await preview.screenshot({path:`${artifacts}/npc-preview-${width}.png`});
   await page.locator('form [name=name]').evaluate(n=>{n.value='LongCharacterNameWithoutSpaces'.repeat(8);n.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForTimeout(120);assert.equal(await preview.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'large picture and uninterrupted name fit');
   // Change preview frame switches through the actual appearance control refresh.
   if(theme==='aincrad'){
    await page.evaluate(()=>{const s=window.previewData.settings();s.showChatHeader=false;s.showChatDialogue=false;s.showChatNarrative=false;document.querySelector('form [name=title]').dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await preview.locator('.trpg-header').count(),0);assert.equal(await preview.locator('.trpg-dialogue.trpg-unframed').count(),1);assert.equal(await preview.locator('.trpg-narrative.trpg-unframed').count(),1);
    await page.evaluate(()=>{const s=window.previewData.settings();s.showChatHeader=s.showChatDialogue=s.showChatNarrative=true;});
   }
   await page.evaluate(()=>{window.confirm=()=>true;document.querySelector('dialog [data-close]').click();});
  }
  await page.addInitScript(()=>localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:false,autoContinuity:false,injectState:false,showSceneTracker:false,memoryAutoSummary:false}})));
  await page.goto(origin+'docs/previews/preview-user-chat.html?enabled=0');await page.waitForFunction(()=>window.userChatPreview?.ready).catch(error=>{console.error('User fixture errors:',errors);throw error;});
  await page.locator('[data-presentation-setting=userChatPresentation]').waitFor({state:'attached'});
  await page.locator('[data-presentation-setting=userChatPresentation]').evaluate(n=>{n.checked=true;n.dispatchEvent(new Event('change',{bubbles:true}));});
  const id=await page.evaluate(narrative=>{window.host.name1='มาริว';return window.userChatPreview.addMessage('*'+narrative+'*\n\n*รูเดียสในร่างเดิมมีวิธีการพูดที่ต่างจากรูเดียสโดยสิ้นเชิง*',{name:'มาริว'});},narrative);
  await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.USER_MESSAGE_RENDERED,id),id);
  const row=page.locator(`[mesid="${id}"] .mes_text`);
  const nativeId=await page.evaluate(narrative=>{const source='*'+narrative+'*\n\n*บรรยายอีกย่อหน้าหนึ่ง*',native=window.userChatPreview.nativeHtml(source).replaceAll('<em>','<span data-roleforge-story="narrative"><em>').replaceAll('</em>','</em></span>');return window.userChatPreview.addMessage(source,{name:'มาริว',native:native+'<aside class="native-widget"><button type="button">Native action</button><input type="checkbox" checked></aside>'});},narrative);
  await page.evaluate(id=>window.host.eventSource.emit(window.host.eventTypes.USER_MESSAGE_RENDERED,id),nativeId);
  const nativeRow=page.locator(`[mesid="${nativeId}"] .mes_text`);
  await page.evaluate(id=>{window.nativePlayerButton=document.querySelector(`[mesid="${id}"] button`);window.nativePlayerClicks=0;window.nativePlayerButton.onclick=()=>window.nativePlayerClicks++;},nativeId);
  // Management adds this legacy sheet after the other themes have loaded.
  await page.evaluate(async origin=>{const link=document.createElement('link');link.rel='stylesheet';link.href=origin+'styles/npc-ui.css?late-test';document.head.append(link);await new Promise((r,j)=>{link.onload=r;link.onerror=j;});},origin);
  for(const theme of themes){
   await page.locator('[data-presentation-setting=chatTheme]').evaluate((n,theme)=>{n.value=theme;n.dispatchEvent(new Event('change',{bubbles:true}));},theme);await page.waitForTimeout(180);
   const frame=row.locator('.trpg-user-chat');assert.equal(await frame.getAttribute('data-rf-chat-theme'),theme);assert.equal(await frame.locator('.trpg-narrative').count(),2);
   const metrics=await frame.locator('.trpg-narrative').first().evaluate(n=>{const p=n.querySelector('.trpg-prose-copy'),s=getComputedStyle(p),r=p.getBoundingClientRect(),marker=n.querySelector('.trpg-prose-mark'),m=marker.getBoundingClientRect(),outer=getComputedStyle(n);return{align:s.textAlign,em:n.querySelector('[data-roleforge-story]>em')?getComputedStyle(n.querySelector('[data-roleforge-story]>em')).fontStyle:null,padding:parseFloat(outer.paddingTop)+parseFloat(outer.paddingBottom),markX:m.x,copyX:r.x,copyRight:r.right,markRight:m.right,pen:n.querySelector('.trpg-prose-mark>svg')?.getBoundingClientRect().width||0,overflow:n.scrollWidth>n.clientWidth+1};});
   assert.ok(['start','left'].includes(metrics.align),'long player prose reads from the left inside a right-side frame');assert.equal(metrics.overflow,false);assert.ok(metrics.pen>0,'player pen remains visible');assert.ok(metrics.markRight>metrics.copyX,'player ornament stays on the right');
   if(['chapter','codex','aincrad'].includes(theme))assert.equal(metrics.padding,0,'legacy user padding never creates a large gap');
   assert.equal(await nativeRow.locator('.trpg-narrative').count(),2,'shared rendering finds the native player paragraphs');
   assert.equal(await nativeRow.locator('.trpg-prose-copy em').first().evaluate(n=>getComputedStyle(n).fontStyle),'normal','native Markdown delimiters inherit the framed prose style');
   assert.equal(await nativeRow.evaluate(n=>n.querySelector('button')===window.nativePlayerButton),true,'theme changes retain the native widget');await nativeRow.locator('button').click();
   if(theme==='aincrad'){
    assert.equal(await frame.locator('.trpg-narrative-tools').first().evaluate(n=>getComputedStyle(n).flexDirection),'row-reverse');
    if(width===390||width===1280){await page.evaluate(()=>{document.querySelectorAll('#chat>.mes').forEach(n=>n.style.display='none');});await row.evaluate(n=>{n.closest('.mes').style.display='block';n.closest('.mes').querySelector('.mes-title').hidden=true;});await page.screenshot({path:`${artifacts}/user-narrative-${width}.png`,fullPage:true});}
   }
  }
  assert.equal(await page.evaluate(()=>window.nativePlayerClicks),themes.length);
  assert.deepEqual(errors,[]);results.push({width,themes,portraitSizes:[48,72,144],managementPreview:true,nativePlayerMarkdown:true,lateLegacySheet:true,errors});console.log(`PASS ${width}px: five themes, exact picture sizes, real management preview and player narration`);await page.close();
 }
 await writeFile(`${artifacts}/validation.json`,JSON.stringify({results},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
