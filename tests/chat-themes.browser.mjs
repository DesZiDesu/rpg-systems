// Original production renderer: transparent headers/narration, all eight
// frame combinations on either native host palette and an offline preview.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.CHAT_THEME_ARTIFACTS||'/tmp/roleforge-chat-original';
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(!path.startsWith(base)||path.includes('..')){res.writeHead(404).end();return;}
 const file=path.slice(base.length);res.setHeader('content-type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.woff2')?'font/woff2':'text/javascript');res.end(await readFile(new URL(file,root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await mkdir(artifacts,{recursive:true});
const origin=`http://127.0.0.1:${server.address().port}${base}`,gallery=`${origin}docs/previews/chat-original/index.html`;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:1600},colorScheme:'dark',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());await page.goto(gallery);await page.waitForFunction(()=>window.originalChatPreview?.ready);await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);
  const surface=page.locator('.story-surface'),story=surface.locator('.trpg-chat');
  const text=await story.locator('.trpg-prose-copy,.trpg-dialogue').allTextContents();
  assert.equal(await page.locator('#color-mode').count(),0);
  for(const host of ['light','dark']){
   await page.evaluate(host=>{
    document.documentElement.style.setProperty('--SmartThemeBodyColor',host==='light'?'#35342f':'#e3dfd5');
    document.querySelector('.story-surface').style.backgroundColor=host==='light'?'#faf9f4':'#202020';
   },host);
   for(const os of ['light','dark']){
    await page.evaluate(()=>window.colorModeRoot=originalChatPreview.root);await page.emulateMedia({colorScheme:os});
    assert.equal(await story.evaluate(node=>getComputedStyle(node).colorScheme===getComputedStyle(node.parentElement).colorScheme),true,'Original inherits the host color scheme');
    assert.equal(await story.getAttribute('data-rf-color-mode'),null);
    assert.equal(await page.evaluate(()=>window.colorModeRoot===document.querySelector('.story-surface>.trpg-chat')),true,'OS changes must not recreate chat DOM');
    const readability=await story.evaluate(root=>{
     const ctx=document.createElement('canvas').getContext('2d');
     const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
     const lum=color=>rgb(color).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
     const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
     const c=getComputedStyle(root),bg=getComputedStyle(root.parentElement).backgroundColor;
     return {prose:ratio(c.color,bg),profileLabel:ratio(getComputedStyle(root.querySelector('.trpg-open-record small')).color,bg),npc:rgb(getComputedStyle(root.querySelector('.trpg-role')).color)};
    });
    assert(readability.prose>=4.5&&readability.profileLabel>=4.5,`readable text on ${host} host, OS ${os}: ${JSON.stringify(readability)}`);
    assert.deepEqual(readability.npc,[164,186,136],'Original retains the configured NPC identity color');
    for(let flags=0;flags<8;flags++){
     for(const [bit,part] of ['header','dialogue','narrative'].entries())await page.locator(`[data-part="${part}"]`).setChecked(Boolean(flags&(1<<bit)));
     assert.equal(await story.locator('.trpg-header').count(),flags&1?1:0);
     assert.equal(await story.locator('.trpg-speaker-label').count(),flags&1?0:1);
     for(const [part,bit] of [['dialogue',1],['narrative',2]]){
      const body=story.locator(`.trpg-${part}`).first(),off=!(flags&(1<<bit));assert.equal(await body.evaluate(n=>n.classList.contains('trpg-unframed')),off);
      if(off)assert.deepEqual(await body.evaluate(n=>{const c=getComputedStyle(n);return{background:c.backgroundImage,border:c.borderTopWidth,padding:c.paddingLeft,before:getComputedStyle(n,'::before').display};}),{background:'none',border:'0px',padding:'0px',before:'none'});
      const marks=await body.locator(part==='dialogue'?'.trpg-dialogue-copy':'.trpg-prose-copy').evaluate(n=>['::before','::after'].map(p=>getComputedStyle(n,p).content));
      assert.deepEqual(marks,off?[JSON.stringify(part==='dialogue'?'"':'*'),JSON.stringify(part==='dialogue'?'"':'*')]:['none','none'],'literal delimiters appear only when their frame is off');
     }
     const gaps=await story.evaluate(root=>{const boxes=[...root.querySelectorAll('.trpg-header,.trpg-speaker-label,.trpg-narrative,.trpg-dialogue')].map(n=>n.getBoundingClientRect());return boxes.slice(1).map((box,i)=>box.top-boxes[i].bottom);});
     assert(gaps.every(gap=>gap>=0&&gap<=12),`compact flow at ${width}px, flags ${flags}: ${gaps}`);
     assert.deepEqual(await story.locator('.trpg-prose-copy,.trpg-dialogue').allTextContents(),text,'disabling frames retains every paragraph in order');
     assert.equal(await story.evaluate(root=>[root,...root.querySelectorAll('.trpg-speaker,.trpg-header,.trpg-user-header,.trpg-narrative,.trpg-prose-glow,.trpg-unframed')].every(node=>{
      const c=getComputedStyle(node);return c.backgroundColor==='rgba(0, 0, 0, 0)'&&c.backgroundImage==='none'&&c.boxShadow==='none';
     })),true,`no painted container behind Header/Narrative on ${host} host, OS ${os}, flags ${flags}`);
     assert.equal(await story.evaluate(root=>[...root.querySelectorAll('.trpg-prose-copy,.trpg-unframed,.trpg-speaker-label')].every(node=>getComputedStyle(node).color===getComputedStyle(root).color)),true,'unframed text follows native host ink');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no horizontal overflow at ${width}px`);
    }
    for(const part of ['header','dialogue','narrative'])await page.locator(`[data-part="${part}"]`).check();
   }
  }
  await page.evaluate(()=>{document.documentElement.style.removeProperty('--SmartThemeBodyColor');document.querySelector('.story-surface').style.removeProperty('background-color');});
  assert.equal(await story.locator('.rf-chat-sigil').count(),0);
  // Narration may precede the first header, and a reply can change speakers.
  // Keep those boundaries as compact as a single speaker's alternating turn.
  for(const enabled of [true,false]){
   const gaps=await page.evaluate(async({url,enabled})=>{
    const {renderStoryBlocks}=await import(url),sample=document.createElement('div');sample.className='trpg-chat';document.body.append(sample);
    const blocks=[{type:'narrative',text:'The river is quiet.'},{type:'narrative',text:'A lantern appears.'},{type:'header',name:'Alice'},{type:'dialogue',name:'Alice',text:'Welcome.'},{type:'header',name:'Bob'},{type:'narrative',text:'He nods.'},{type:'dialogue',name:'Bob',text:'Hello.'}];
    renderStoryBlocks(sample,blocks,new Map(),'Narrator',()=>{},async()=>null,null,{header:enabled,dialogue:enabled,narrative:enabled});
    const boxes=[...sample.querySelectorAll('.trpg-header,.trpg-speaker-label,.trpg-narrative,.trpg-dialogue')].map(n=>n.getBoundingClientRect());sample.remove();return boxes.slice(1).map((box,i)=>box.top-boxes[i].bottom);
   },{url:`${origin}src/npc-chat.js?v=0.64.2`,enabled});
   assert(gaps.every(gap=>gap>=0&&gap<=12),`compact global narration and speaker changes at ${width}px: ${gaps}`);
  }
  for(const portrait of [false,true]){
   await page.locator('#portrait').setChecked(portrait);assert.equal(await story.locator('.trpg-photo').count(),portrait?1:0);
   if(portrait){await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);assert.equal(await story.locator('.trpg-photo').evaluate(n=>n.offsetWidth===n.offsetHeight&&n.naturalWidth===n.naturalHeight),true);}
  }
  if(width!==320)await surface.screenshot({path:`${artifacts}/original-${width}.png`});
  if(width===1280){
   const styles=['styles/npc-ui.css','styles/chat-themes.css','docs/previews/chat-original/gallery.css'];
   let css=(await Promise.all(styles.map(file=>readFile(new URL(file,root),'utf8')))).join('\n');
   // Only the preview includes this licensed Font Awesome font. The installed
   // extension uses the host's icons and introduces no font request.
   const font=(await readFile(new URL('docs/previews/chat-original/assets/preview-icons.woff2',root))).toString('base64');
   css=css.replace('url(assets/preview-icons.woff2)','url(data:font/woff2;base64,'+font+')');
   const html=await page.evaluate(async css=>{
    const original=document.querySelector('.trpg-photo'),data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);fetch(original.src).then(r=>r.blob()).then(blob=>r.readAsDataURL(blob));});
    const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,link').forEach(n=>n.remove());
    for(const select of clone.querySelectorAll('select')){const value=document.getElementById(select.id).value;for(const option of select.options)option.toggleAttribute('selected',option.value===value);}
    const style=document.createElement('style');style.textContent=css;clone.querySelector('head').append(style);
    clone.querySelectorAll('img.trpg-photo').forEach(n=>n.src=data);
    const header=clone.querySelector('.trpg-header'),plain=document.createElement('div');plain.className='trpg-speaker-label';plain.textContent=header.querySelector('strong').textContent;plain.hidden=true;header.before(plain);
    clone.querySelector('.screens').remove();clone.querySelector('main>p:last-child').remove();
    return '<!doctype html>\n'+clone.outerHTML;
   },css);
   const behavior='<script>'+String.raw`
const root=document.querySelector('.story-surface>.trpg-chat');
document.getElementById('device').onchange=e=>root.parentElement.dataset.device=e.target.value;
document.querySelectorAll('[data-part]').forEach(input=>input.onchange=()=>{
 const part=input.dataset.part;
 if(part==='header'){root.querySelector('.trpg-header').hidden=!input.checked;root.querySelector('.trpg-speaker-label').hidden=input.checked;}
 else root.querySelectorAll('.trpg-'+part).forEach(node=>node.classList.toggle('trpg-unframed',!input.checked));
});
document.getElementById('portrait').onchange=e=>root.querySelector('.trpg-photo').hidden=!e.target.checked;
root.querySelector('.trpg-header').onclick=()=>document.getElementById('preview-profile').showModal();
`+'</script>';
   await writeFile(`${artifacts}/standalone.html`,html.replace('</body>',behavior+'</body>').replace(/^[ \t]+$/gm,''));
   const offline=await browser.newPage({viewport:{width:390,height:1200},colorScheme:'light'});
   await offline.route('**/*',r=>r.abort());await offline.setContent(await readFile(`${artifacts}/standalone.html`,'utf8'));
   assert.equal(await offline.locator('#color-mode').count(),0,'offline preview has no retired color control');
   assert.equal(await offline.locator('.trpg-chat').getAttribute('data-rf-color-mode'),null);
   for(const part of ['header','dialogue','narrative'])await offline.locator(`[data-part="${part}"]`).uncheck();
   assert.deepEqual(await offline.locator('.trpg-prose-copy,.trpg-dialogue').allTextContents(),text);assert.equal(await offline.locator('.trpg-header').isVisible(),false);
   for(const [selector,mark] of [['.trpg-dialogue-copy','"'],['.trpg-prose-copy','*']])assert.equal(await offline.locator(selector).first().evaluate(n=>getComputedStyle(n,'::before').content),JSON.stringify(mark));
   await offline.locator('[data-part="header"]').check();assert.equal(await offline.locator('.trpg-header').isVisible(),true);await offline.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS transparent Original, 2 host palettes × 2 OS schemes × 8 frame combinations, square portraits and no overflow at ${width}px`);await page.close();
 }
 console.log('PASS single-file offline preview without network');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
