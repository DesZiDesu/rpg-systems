import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {CHAT_THEMES} from '../src/chat-themes.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.CHAT_THEME_ARTIFACTS||'/tmp/roleforge-chat-themes';
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!path.startsWith(base)||path.includes('..')){res.writeHead(404).end();return;}
 const file=path.slice(base.length);res.setHeader('content-type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/javascript');res.end(await readFile(new URL(file,root)));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));await mkdir(artifacts,{recursive:true});
const origin=`http://127.0.0.1:${server.address().port}${base}`,gallery=`${origin}docs/previews/chat-themes/index.html`;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:1800},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(gallery);await page.waitForFunction(()=>window.chatThemePreview?.ready);
  assert.equal(await page.locator('.theme-card').count(),6);
  const source=await page.locator('.story-surface').allTextContents();
  // All 8 independent combinations, applied to all 6 actual CSS/renderer themes.
  for(let flags=0;flags<8;flags++){
   for(const [index,part] of ['header','dialogue','narrative'].entries())await page.locator(`[data-part="${part}"]`).setChecked(Boolean(flags&(1<<index)));
   for(const {key} of CHAT_THEMES){
    const card=page.locator(`[data-theme="${key}"]`);
    assert.equal(await card.locator('.trpg-header').count(),Boolean(flags&1)?1:0);
    for(const [part,index] of [['dialogue',1],['narrative',2]]){
     const body=card.locator(`.trpg-${part}`),off=!(flags&(1<<index));
     assert.equal(await body.evaluate(node=>node.classList.contains('trpg-unframed')),off);
     if(off){const css=await body.evaluate(node=>{const style=getComputedStyle(node);return {background:style.backgroundImage,border:style.borderTopWidth,padding:style.paddingLeft,before:getComputedStyle(node,'::before').display};});assert.deepEqual(css,{background:'none',border:'0px',padding:'0px',before:'none'});}
     assert.ok((await body.innerText()).trim().length>15,'turning off a frame retains readable story text');
    }
   }
  }
  for(const part of ['header','dialogue','narrative'])await page.locator(`[data-part="${part}"]`).check();
  assert.deepEqual(await page.locator('.story-surface').allTextContents(),source);
  const styles=[];
  for(const {key} of CHAT_THEMES){
   await page.locator('#theme-filter').selectOption(key);
   const card=page.locator(`[data-theme="${key}"]`);await card.waitFor({state:'visible'});
   const bounds=await card.evaluate(node=>({right:node.getBoundingClientRect().right,scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(bounds.right<=width+1&&bounds.scroll<=width+1,`${key} fits ${width}px: ${JSON.stringify(bounds)}`);
   styles.push(await card.locator('.trpg-dialogue').evaluate(node=>{const c=getComputedStyle(node);return [c.backgroundImage,c.borderRadius,c.color].join('|');}));
   assert.equal(await card.locator('.rf-sigil-motion').evaluate(node=>getComputedStyle(node).animationName),'none','Reduce Motion suppresses decorative animation');
   if(width!==320)await card.screenshot({path:`${artifacts}/${key}-${width}.png`});
  }
  assert.equal(new Set(styles).size,6,'themes have six distinct actual visual treatments');
  await page.locator('#theme-filter').selectOption('all');
  if(width===1280){
   await page.locator('main').screenshot({path:`${artifacts}/all-six-desktop.png`});
   // A self-contained offline preview: inline the exact production styles and
   // rendered DOM. No external modules, fonts, network or AI needed to open it.
   const css=(await Promise.all(['styles/npc-ui.css','styles/chat-themes.css','docs/previews/chat-themes/gallery.css'].map(path=>readFile(new URL(path,root),'utf8')))).join('\n');
   const html=await page.evaluate(css=>{
    const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,link').forEach(node=>node.remove());
    const style=document.createElement('style');style.textContent=css;clone.querySelector('head').append(style);
    for(const header of clone.querySelectorAll('.trpg-header')){const plain=document.createElement('div');plain.className='trpg-speaker-label';plain.textContent=header.querySelector('strong').textContent;plain.hidden=true;header.before(plain);}
    clone.querySelector('.wordmark').setAttribute('href','#');
    return '<!doctype html>\n'+clone.outerHTML;
   },css);
   const behavior=`<script>
const filter=document.getElementById('theme-filter'),cards=[...document.querySelectorAll('.theme-card')],roots=[...document.querySelectorAll('.story-surface>.trpg-chat')];
filter.onchange=()=>{document.body.classList.toggle('single',filter.value!=='all');cards.forEach(card=>card.classList.toggle('is-selected',card.dataset.theme===filter.value));};
document.querySelectorAll('[data-part]').forEach(input=>input.onchange=()=>{roots.forEach(root=>{if(input.dataset.part==='header'){root.querySelector('.trpg-header').style.display=input.checked?'':'none';root.querySelector('.trpg-speaker-label').hidden=input.checked;}else if(input.dataset.part==='effects')root.classList.toggle('trpg-effects',input.checked);else root.querySelector('.trpg-'+input.dataset.part).classList.toggle('trpg-unframed',!input.checked);});});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.target.closest('.trpg-chat').classList.toggle('rf-motion-visible',e.isIntersecting)));roots.forEach(root=>observer.observe(root.querySelector('.rf-chat-sigil')));
document.addEventListener('visibilitychange',()=>roots.forEach(root=>root.classList.toggle('rf-motion-hidden',document.hidden)));
document.querySelectorAll('.trpg-header').forEach(header=>header.onclick=()=>{const dialog=document.getElementById('preview-dossier');dialog.querySelector('h2').textContent=header.querySelector('strong').textContent;dialog.querySelector('p').textContent=header.querySelector('.trpg-meta').textContent;dialog.showModal();});
</script>`;
   await writeFile(`${artifacts}/roleforge-chat-themes-preview.html`,html.replace('</body>',`${behavior}</body>`).replace(/^[ \t]+$/gm,''));
  }
  assert.deepEqual(errors,[]);console.log(`PASS six real themes, 48 independent combinations, readable text, Reduce Motion and overflow at ${width}px`);await page.close();
 }
 // Motion is bounded to decoration and sleeps while outside the viewport.
 const motion=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'no-preference'});await motion.goto(`${gallery}?theme=arcane`);await motion.waitForFunction(()=>window.chatThemePreview?.ready);
 await motion.locator('.is-selected .rf-sigil-motion').waitFor();await motion.waitForFunction(()=>document.querySelector('.is-selected .trpg-chat').classList.contains('rf-motion-visible'));
 assert.equal(await motion.locator('.is-selected .rf-sigil-motion').evaluate(node=>getComputedStyle(node).animationPlayState),'running');
  await motion.locator('.is-selected .trpg-header').hover();
  assert.equal(await motion.locator('.is-selected .trpg-header strong').evaluate(node=>getComputedStyle(node).animationName),'none','legacy text animation cannot override a selected theme');
  await motion.locator('.is-selected .trpg-narrative').hover();
  assert.equal(await motion.locator('.is-selected .trpg-narrative').evaluate(node=>getComputedStyle(node,':before').animationName),'none','legacy gold hover cannot bleed into another theme');
 await motion.locator('[data-part=effects]').uncheck();assert.equal(await motion.locator('.is-selected .rf-sigil-motion').evaluate(node=>getComputedStyle(node).animationName),'none');
 await motion.locator('[data-part=effects]').check();await motion.locator('#theme-filter').selectOption('all');await motion.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await motion.waitForFunction(()=>!document.querySelector('[data-theme=roleforge] .trpg-chat').classList.contains('rf-motion-visible'));
 assert.equal(await motion.locator('[data-theme=roleforge] .rf-sigil-motion').evaluate(node=>getComputedStyle(node).animationPlayState),'paused');await motion.close();
 console.log('PASS motion enabled/disabled and paused off-screen');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
