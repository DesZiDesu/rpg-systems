// Production renderer/CSS, character colors, native DOM identity and a portable preview.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/',artifacts=process.env.CHAT_FOLIO_ARTIFACTS||'/tmp/roleforge-chat-folio';
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith(base)||path.includes('..')){res.writeHead(404).end();return;}
 const file=path.slice(base.length),ext=file.split('.').at(-1);res.setHeader('content-type',({html:'text/html',css:'text/css',jpg:'image/jpeg',woff2:'font/woff2',json:'application/json'})[ext]||'text/javascript');res.end(await readFile(new URL(file,root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await mkdir(artifacts,{recursive:true});
const origin=`http://127.0.0.1:${server.address().port}${base}`,url=`${origin}docs/previews/chat-folio/index.html`;
let browser;
async function select(page,id,value){await page.locator(`#${id}`).selectOption(value);await page.waitForTimeout(30);}
async function frames(page,flags){for(const [index,part]of ['header','dialogue','narrative'].entries())await page.locator(`[data-part="${part}"]`).setChecked(Boolean(flags&(1<<index)));}
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of process.env.CHAT_FOLIO_WIDTHS?.split(',').map(Number)||[320,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:1400},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(url);await page.waitForFunction(()=>window.folioChatPreview?.ready);await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);
  const stage=page.locator('.preview-stage'),story=page.locator('.mes_text>.trpg-chat');await select(page,'device',width<500?'mobile':'desktop');
  const text=await story.locator('.trpg-prose-copy,.trpg-dialogue-copy').allTextContents();
  for(const theme of ['roleforge','folio']){
   await select(page,'theme',theme);const plates=[];
   for(const color of theme==='folio'?['#abc4b6','#e65f70','#76b9e8']:['#abc4b6']){
    await select(page,'color',color);
    for(let flags=0;flags<8;flags++){
     await frames(page,flags);
     assert.equal(await story.getAttribute('data-rf-chat-theme'),theme);assert.equal(await story.locator('.trpg-header').count(),flags&1?1:0);
     assert.equal(await story.locator('.trpg-dialogue.trpg-unframed').count(),flags&2?0:2);assert.equal(await story.locator('.trpg-narrative.trpg-unframed').count(),flags&4?0:2);
     assert.deepEqual(await story.locator('.trpg-prose-copy,.trpg-dialogue-copy').allTextContents(),text,'frame switches preserve story copy');
     assert.equal(await story.locator('.rf-voice-dialogue-controls').count(),4,'Voice controls survive each frame combination');
     const speech=await story.locator('.trpg-dialogue-copy').first().evaluate(n=>({quotes:['::before','::after'].map(p=>getComputedStyle(n,p).content),color:getComputedStyle(n).color}));
     if(!(flags&2)){assert.deepEqual(speech.quotes,[JSON.stringify('"'),JSON.stringify('"')]);assert.equal(speech.color,`rgb(${color.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')})`);}
     assert.equal(await story.locator('.trpg-prose-copy').first().evaluate(n=>getComputedStyle(n).fontStyle),flags&4?'normal':'italic');
     assert.equal(await stage.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,`${theme} fits ${width}px`);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'page has no horizontal scroll');
    }
    await frames(page,7);
    if(theme==='folio'){
     assert.equal(await story.locator('.trpg-identity>strong').evaluate(n=>getComputedStyle(n).color),`rgb(${color.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')})`);
     const style=await story.locator('.trpg-dialogue').first().evaluate(n=>{
      const plate=getComputedStyle(n,'::before').backgroundColor,copy=getComputedStyle(n.querySelector('.trpg-dialogue-copy')).color;
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
      const rgb=color=>{ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
      const lum=c=>rgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
      const a=lum(plate),b=lum(copy);return {plate,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
     });
     assert.ok(style.ratio>=4.5,`speech contrast ${style.ratio}`);plates.push(style.plate);
     assert.equal(await story.locator('.trpg-header,.trpg-narrative').evaluateAll(nodes=>nodes.every(n=>{const s=getComputedStyle(n);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage==='none'&&s.boxShadow==='none';})),true,'Header/Narrative are transparent');
     const [label,copy]=await Promise.all([story.locator('.trpg-dialogue-label').first().boundingBox(),story.locator('.trpg-dialogue-copy').first().evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);return {y:r.getBoundingClientRect().y};})]);assert.ok(label.y+label.height<=copy.y+1,'speech begins below its raised name tab');
     const [prose,pen]=await Promise.all([story.locator('.trpg-prose-copy').first().boundingBox(),story.locator('.trpg-prose-mark').first().boundingBox()]);assert.ok(pen.y>=prose.y+prose.height-1,'pen signature follows narration');
    }
   }
   if(theme==='folio')assert.equal(new Set(plates).size,3,'all three identity colors tint the actual speech background');
   for(const photo of [false,true]){
    await page.locator('#portrait').setChecked(photo);assert.equal(await story.locator('.trpg-photo').count(),photo?1:0);
    if(photo){await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);const [image,name]=await Promise.all([story.locator('.trpg-photo').boundingBox(),story.locator('.trpg-identity>strong').boundingBox()]);assert.ok(Math.abs(image.width-image.height)<1);assert.equal(await story.locator('.trpg-photo').evaluate(n=>n.naturalWidth===n.naturalHeight),true);if(theme==='folio')assert.ok(image.x>name.x+name.width,'square portrait sits on the right');}
   }
  }
  await select(page,'theme','folio');await select(page,'color','#abc4b6');await select(page,'badge','ability');assert.equal(await story.locator('.trpg-header-badge').textContent(),'Water MagicIntermediate');
  await select(page,'badge','off');assert.equal(await story.locator('.trpg-header-badge').count(),0);await select(page,'badge','occupation');
  await story.locator('.trpg-header').click();assert.equal(await page.locator('#preview-profile').evaluate(n=>n.open),true);await page.locator('#preview-profile button').click();
  await story.locator('.rf-voice-setup').first().click();assert.equal(await page.locator('#preview-voice').evaluate(n=>n.open),true);await page.locator('#preview-voice button').click();
  // Long names, roles, ranks and uninterrupted prose must fit both layouts.
  await page.evaluate(()=>{window.folioSaved=structuredClone(window.folioChatPreview.profile);Object.assign(window.folioChatPreview.profile,{name:'A very long character name without truncating any part of it '.repeat(3),title:'Long title '.repeat(20),occupation:'Profession '.repeat(30),stats:{rank:'Senior '.repeat(20)}});window.folioChatPreview.blocks.forEach(b=>{if(b.name)b.name=window.folioChatPreview.profile.name;});window.folioChatPreview.render();});
  const [longLabel,longCopy]=await Promise.all([story.locator('.trpg-dialogue-label').first().boundingBox(),story.locator('.trpg-dialogue-copy').first().evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);return {y:r.getBoundingClientRect().y};})]);assert.ok(longLabel.y+longLabel.height<=longCopy.y+1);assert.equal(await stage.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'long fields do not overflow');
  await page.evaluate(()=>{Object.assign(window.folioChatPreview.profile,window.folioSaved);window.folioChatPreview.blocks.forEach(b=>{if(b.name)b.name=window.folioChatPreview.profile.name;});window.folioChatPreview.render();});
  if(width===390||width===1280){
   for(const photo of [true,false]){await page.locator('#portrait').setChecked(photo);if(photo)await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);await stage.screenshot({path:`${artifacts}/folio-${width}-${photo?'with':'without'}-portrait.png`});}
   await page.locator('#portrait').check();await select(page,'color','#e65f70');await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);await stage.screenshot({path:`${artifacts}/folio-${width}-red.png`});await select(page,'color','#abc4b6');
  }
  if(width===1280){
   // Structured native HTML keeps buttons, input state and a running iframe
   // across Folio mounting/restoring. Different NPCs keep different colors.
   const native=await page.evaluate(async origin=>{
    const [{mountSharedStory},{speakerHeader,narrative},{dialogueFrame},{applyChatTheme}]=await Promise.all([import(origin+'src/chat-compat.js'),import(origin+'src/npc-chat.js'),import(origin+'src/chat-folio.js'),import(origin+'src/chat-themes.js')]);
    const host=document.createElement('div');host.innerHTML='<tr-header name="Red"></tr-header><tr-dialogue name="Red">Red reply.</tr-dialogue><tr-dialogue name="Red">Hello <button>Native action</button><input type="checkbox" checked><iframe title="Native widget" srcdoc="<script>parent.nativeFolioLoads=(parent.nativeFolioLoads||0)+1;window.fixture=123;<\/script>"></iframe></tr-dialogue><tr-header name="Blue"></tr-header><tr-dialogue name="Blue">Blue reply.</tr-dialogue>';document.body.append(host);
    const button=host.querySelector('button'),input=host.querySelector('input'),iframe=host.querySelector('iframe');let clicks=0;button.addEventListener('click',()=>clicks++);await new Promise(resolve=>iframe.addEventListener('load',resolve,{once:true}));
    const nativeWindow=iframe.contentWindow,nodes=[...host.childNodes],profiles={Red:{name:'Red',identityColor:'#e65f70',occupation:'Detective',stats:{rank:'Senior'}},Blue:{name:'Blue',identityColor:'#76b9e8'}},blocks=[{type:'header',name:'Red'},{type:'dialogue',name:'Red',text:'Red reply.'},{type:'dialogue',name:'Red',text:'Hello Native action'},{type:'header',name:'Blue'},{type:'dialogue',name:'Blue',text:'Blue reply.'}];
    const mount=view=>{const mounted=mountSharedStory({host,nodes,blocks,header:(name,prior,colorOnly)=>({key:name,color:profiles[name].identityColor,node:colorOnly||prior===name?null:speakerHeader(profiles[name],()=>{},view)}),narrative,dialogue:name=>dialogueFrame(name,view)});mounted.roots.forEach(r=>applyChatTheme(r,view));return mounted;};
    const first=mount({theme:'folio'});button.click();const plates=[...host.querySelectorAll('.trpg-dialogue')].map(n=>getComputedStyle(n,'::before').backgroundColor);const badges=[...host.querySelectorAll('.trpg-header-badge')].map(n=>n.textContent);
    first.restore();const second=mount({theme:'roleforge'});button.click();second.restore();await new Promise(resolve=>setTimeout(resolve,50));
    const result={sameNodes:host.querySelector('button')===button&&host.querySelector('input')===input&&host.querySelector('iframe')===iframe,inputChecked:input.checked,clicks,loads:window.nativeFolioLoads,sameWindow:iframe.contentWindow===nativeWindow&&nativeWindow.fixture===123,plates,badges};host.remove();return result;
   },origin);
   assert.equal(native.sameNodes,true);assert.equal(native.inputChecked,true);assert.equal(native.clicks,2);assert.equal(native.loads,1);assert.equal(native.sameWindow,true);assert.equal(new Set(native.plates).size,2,'shared speakers retain individual colors');assert.deepEqual(native.badges,['DetectiveSenior'],'nonmagic profile uses real job and rank');
   await frames(page,7);await select(page,'badge','occupation');
   const templates={};for(const theme of ['roleforge','folio']){templates[theme]={};await select(page,'theme',theme);for(const badge of ['occupation','ability','off']){templates[theme][badge]={};await select(page,'badge',badge);for(const photo of [true,false]){await page.locator('#portrait').setChecked(photo);if(photo)await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);templates[theme][badge][String(photo)]=await story.innerHTML();}}}
   await select(page,'theme','folio');await select(page,'badge','occupation');await page.locator('#portrait').check();await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);
   const image=await page.evaluate(async()=>{const blob=await(await fetch(window.folioChatPreview.photoUrl)).blob();return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});});
   const avatar=`data:image/jpeg;base64,${(await readFile(new URL('docs/previews/chat-original/assets/sample-character.jpg',root))).toString('base64')}`;
   let css=(await Promise.all(['styles/npc-ui.css','styles/voice-addons.css','styles/chat-themes.css','docs/previews/chat-folio/gallery.css'].map(p=>readFile(new URL(p,root),'utf8')))).join('\n');
   css=css.replace('url(../chat-original/assets/preview-icons.woff2)',`url(data:font/woff2;base64,${(await readFile(new URL('docs/previews/chat-original/assets/preview-icons.woff2',root))).toString('base64')})`);
   for(const theme of Object.keys(templates))for(const badge of Object.keys(templates[theme]))for(const photo of Object.keys(templates[theme][badge]))templates[theme][badge][photo]=templates[theme][badge][photo].replace(/src="blob:[^"]+"/g,`src="${image}"`);
   const html=await page.evaluate(({css,avatar})=>{const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,link').forEach(n=>n.remove());const style=document.createElement('style');style.textContent=css;clone.querySelector('head').append(style);clone.querySelector('.host-avatar').src=avatar;clone.querySelector('.mes_text>.trpg-chat').replaceChildren();return '<!doctype html>\n'+clone.outerHTML;},{css,avatar});
   const behavior=`const templates=${JSON.stringify(templates).replace(/</g,'\\u003c')};\nconst root=document.querySelector('.mes_text>.trpg-chat');
function render(){const theme=document.querySelector('#theme').value,badge=document.querySelector('#badge').value,photo=document.querySelector('#portrait').checked,color=document.querySelector('#color').value;root.innerHTML=templates[theme][badge][String(photo)];root.dataset.rfChatTheme=theme;root.style.setProperty('--speaker',color);root.querySelectorAll('.trpg-header,.trpg-speaker').forEach(n=>n.style.setProperty('--speaker',color));for(const part of ['header','dialogue','narrative']){const enabled=document.querySelector('[data-part='+part+']').checked;if(part==='header'){const header=root.querySelector('.trpg-header');header.hidden=!enabled;const plain=document.createElement('div');plain.className='trpg-speaker-label';plain.textContent='Aster Vale';plain.hidden=enabled;header.before(plain);}else root.querySelectorAll('.trpg-'+part).forEach(n=>n.classList.toggle('trpg-unframed',!enabled));}}
document.querySelectorAll('[data-part],#theme,#badge,#portrait,#color').forEach(n=>n.addEventListener('change',render));document.querySelector('#device').addEventListener('change',e=>document.querySelector('.preview-stage').dataset.device=e.target.value);root.addEventListener('click',e=>{if(e.target.closest('.trpg-header'))document.querySelector('#preview-profile').showModal();else if(e.target.closest('[data-roleforge-control=voice]'))document.querySelector('#preview-voice').showModal();});render();`;
   await writeFile(`${artifacts}/standalone.html`,html.replace('</body>',`<script>${behavior}</script></body>`).replace(/^[ \t]+$/gm,''));
   const offline=await browser.newPage({viewport:{width:390,height:1200}});await offline.route('**/*',r=>r.abort());await offline.setContent(await readFile(`${artifacts}/standalone.html`,'utf8'));await select(offline,'device','mobile');await select(offline,'color','#e65f70');await frames(offline,0);assert.equal(await offline.locator('.trpg-header').isVisible(),false);assert.equal(await offline.locator('.trpg-prose-copy').first().evaluate(n=>getComputedStyle(n).fontStyle),'italic');assert.equal(await offline.locator('.trpg-dialogue-copy').first().evaluate(n=>getComputedStyle(n).color),'rgb(230, 95, 112)');await select(offline,'theme','roleforge');await frames(offline,7);assert.equal(await offline.locator('.trpg-photo').evaluate(n=>n.naturalWidth>0),true);await offline.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: 2 themes, 8 frame combinations, 3 Folio colors, contrast, square portraits, long text and live Voice controls`);await page.close();
 }
 console.log('PASS native stateful widgets, individual speaker colors and single-file offline preview');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
