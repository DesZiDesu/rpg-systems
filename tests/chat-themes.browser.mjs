// Original production renderer: forced/OS palettes, all independent frames,
// square portraits, narrow screens and a self-contained offline preview.
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
  assert.equal(await page.locator('#color-mode option').count(),3);
  for(const mode of ['light','dark','system']){
   await page.locator('#color-mode').selectOption(mode);
   for(const os of ['light','dark']){
    await page.evaluate(()=>window.colorModeRoot=originalChatPreview.root);await page.emulateMedia({colorScheme:os});
    assert.equal(await story.evaluate(node=>getComputedStyle(node).colorScheme),mode==='system'?os:mode);
    assert.equal(await page.evaluate(()=>window.colorModeRoot===document.querySelector('.story-surface>.trpg-chat')),true,'OS changes must not recreate chat DOM');
    const readability=await story.evaluate(root=>{
     const ctx=document.createElement('canvas').getContext('2d');
     const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
     const lum=color=>rgb(color).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
     const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
     const c=getComputedStyle(root),dialogue=getComputedStyle(root.querySelector('.trpg-dialogue'));
     return {prose:ratio(c.color,c.backgroundColor),dialogue:Math.min(...['--rf-chat-dialogue','--rf-chat-dialogue-end'].map(key=>ratio(dialogue.color,c.getPropertyValue(key)))),profileLabel:ratio(getComputedStyle(root.querySelector('.trpg-open-record small')).color,c.backgroundColor),npc:rgb(getComputedStyle(root.querySelector('.trpg-role')).color)};
    });
    assert(readability.prose>=4.5&&readability.dialogue>=4.5&&readability.profileLabel>=4.5,`readable text contrast in ${mode}/${os}: ${JSON.stringify(readability)}`);
    if((mode==='system'?os:mode)==='dark')assert.deepEqual(readability.npc,[164,186,136],'Original preserves the NPC identity color');
    for(let flags=0;flags<8;flags++){
     for(const [bit,part] of ['header','dialogue','narrative'].entries())await page.locator(`[data-part="${part}"]`).setChecked(Boolean(flags&(1<<bit)));
     assert.equal(await story.locator('.trpg-header').count(),flags&1?1:0);
     assert.equal(await story.locator('.trpg-speaker-label').count(),flags&1?0:1);
     for(const [part,bit] of [['dialogue',1],['narrative',2]]){
      const body=story.locator(`.trpg-${part}`).first(),off=!(flags&(1<<bit));assert.equal(await body.evaluate(n=>n.classList.contains('trpg-unframed')),off);
      if(off)assert.deepEqual(await body.evaluate(n=>{const c=getComputedStyle(n);return{background:c.backgroundImage,border:c.borderTopWidth,padding:c.paddingLeft,before:getComputedStyle(n,'::before').display};}),{background:'none',border:'0px',padding:'0px',before:'none'});
     }
     assert.deepEqual(await story.locator('.trpg-prose-copy,.trpg-dialogue').allTextContents(),text,'disabling frames retains every paragraph in order');
     assert(await story.evaluate(node=>{const color=getComputedStyle(node).color,bg=getComputedStyle(node).backgroundColor;return color!==bg;}),'readable inherited foreground');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no horizontal overflow at ${width}px`);
    }
    for(const part of ['header','dialogue','narrative'])await page.locator(`[data-part="${part}"]`).check();
   }
  }
  assert.equal(await story.locator('.rf-chat-sigil').count(),0);
  for(const portrait of [false,true]){
   await page.locator('#portrait').setChecked(portrait);assert.equal(await story.locator('.trpg-photo').count(),portrait?1:0);
   if(portrait){await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);assert.equal(await story.locator('.trpg-photo').evaluate(n=>n.offsetWidth===n.offsetHeight&&n.naturalWidth===n.naturalHeight),true);}
  }
  for(const mode of ['light','dark']){
   await page.locator('#color-mode').selectOption(mode);if(width!==320)await surface.screenshot({path:`${artifacts}/original-${mode}-${width}.png`});
  }
  if(width===1280){
   await page.locator('#color-mode').selectOption('system');
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
document.getElementById('color-mode').onchange=e=>root.dataset.rfColorMode=e.target.value;
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
   assert.equal(await offline.locator('#color-mode').inputValue(),'system','offline control agrees with the saved sample appearance');
   assert.equal(await offline.locator('.trpg-chat').evaluate(n=>getComputedStyle(n).colorScheme),'light');
   for(const mode of ['light','dark','system']){await offline.locator('#color-mode').selectOption(mode);assert.equal(await offline.locator('.trpg-chat').getAttribute('data-rf-color-mode'),mode);}
   for(const part of ['header','dialogue','narrative'])await offline.locator(`[data-part="${part}"]`).uncheck();
   assert.deepEqual(await offline.locator('.trpg-prose-copy,.trpg-dialogue').allTextContents(),text);assert.equal(await offline.locator('.trpg-header').isVisible(),false);
   await offline.locator('[data-part="header"]').check();assert.equal(await offline.locator('.trpg-header').isVisible(),true);await offline.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS Original, 3 modes × 2 OS schemes × 8 frame combinations, square portraits and no overflow at ${width}px`);await page.close();
 }
 console.log('PASS single-file offline preview without network');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
