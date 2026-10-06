// Production-loader visual and interaction checks for redesigned Skill Storage.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=process.env.SKILL_ARTIFACT_DIR||new URL('test-results/skill-storage/',root).pathname;
await mkdir(artifacts,{recursive:true});
const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
    const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-skills.html?lang=th`;
const {storage,thaiSkills}=await import('../docs/previews/skills-fixture.js');
const catalog=[...thaiSkills,{id:'thunder',name:'สายฟ้า',type:'เวทมนตร์',description:'รวบรวมประจุไฟฟ้าแล้วส่งไปยังเป้าหมาย'},{id:'healing',name:'เยียวยา',type:'Healing',description:'ช่วยรักษาบาดแผลด้วยพลังชีวิต'},{id:'craft',name:'ตีเหล็ก',type:'Crafting',description:'สร้างและซ่อมแซมอุปกรณ์โลหะ'},{id:'night-vision',name:'Night vision',type:'Passive',description:'มองเห็นในความมืด'},{id:'mystery',name:'พลังลึกลับ',type:'General',description:'ยังไม่ทราบคุณสมบัติ'}];
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.SKILL_VISUAL_FONTS&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})});
 for(const width of [320,390,900,901,1280]){
  const page=await browser.newPage({viewport:{width,height:width<600?844:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  if(!process.env.SKILL_VISUAL_FONTS){await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.route('https://cdnjs.cloudflare.com/**',r=>r.fulfill({contentType:'text/css',body:''}));}
  await page.addInitScript(({storage})=>{
   localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',autoTrack:false,autoContinuity:false,enableIncantation:true,enableMarketplace:true,themePreset:'verdant',accentColor:'#79b463',accentAltColor:'#c6f0a8',inkColor:'#e8f0e2',surfaceColor:'#030704',eventNotifications:false,enableMemorySummaries:false}}));
   localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},skills:[storage],npcs:[],inventory:[],location:{place:"Rita Village · Central Continent · Miller's Clearing",narrativeVersion:1},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}));
  },{storage});
  await page.goto(url.replace('lang=th','lang=en'));await page.waitForFunction(()=>window.hStatsPreview?.ready);
  await page.waitForFunction(()=>window.skillsPreviewReady);await page.evaluate(()=>{window.browseCalls=0;window.host.generateRaw=async()=>{window.browseCalls++;return '{}';};});
  await page.evaluate(()=>document.querySelector('[data-tab="skills"]').click());
  const panel=page.locator('.tretaresia-tab-panel[data-panel="skills"]'),card=panel.locator('.tretaresia-skill-card').first();await card.locator('h4').waitFor({state:'visible'});
  // The old implicit grid let the action buttons size its first column; copy
  // was squeezed to a narrow sliver. The new copy owns the whole card width.
  const fit=await card.evaluate(el=>{const r=el.getBoundingClientRect(),copy=el.querySelector('.rf-skill-copy').getBoundingClientRect(),buttons=[...el.querySelectorAll('.rf-ability-actions button')].map(b=>{const x=b.getBoundingClientRect();return{width:x.width,height:x.height,right:x.right};});return{width:el.clientWidth,scroll:el.scrollWidth,height:r.height,copyRatio:copy.width/r.width,buttons,font:getComputedStyle(el.querySelector('p')).fontSize};});
  assert.ok(fit.copyRatio>.8,JSON.stringify(fit));assert.ok(fit.scroll<=fit.width+1,JSON.stringify(fit));assert.ok(fit.height<380,JSON.stringify(fit));assert.ok(fit.buttons.every(b=>b.height>=44&&b.width>90),JSON.stringify(fit));assert.equal(fit.font,'14px');
  assert.equal(await card.locator('[role="progressbar"]').getAttribute('aria-valuenow'),'0');assert.equal(await card.locator('[data-action="delete-skill"]').getAttribute('data-id'),'storage');assert.match(await card.innerText(),/Accessible pocket dimensions/);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.rf-skill-mastery-label')).visibility==='visible'&&getComputedStyle(document.querySelector('.rf-skill-remove')).visibility==='visible');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.rf-skill-mastery-label')).visibility==='visible');await page.evaluate(()=>document.fonts.ready);await page.locator('#tretaresia-rpg-overlay').screenshot({path:artifacts+`skills-storage-en-${width}.png`});
  // Both retained action hooks must work with the real extension handlers.
  await card.locator('[data-action="view-incantation"]').click();await page.locator('.rf-incantation:not(.rf-training-composer)').waitFor({state:'visible'});assert.match(await page.locator('.rf-incantation:not(.rf-training-composer)').innerText(),/Storage/);
  await page.evaluate(()=>document.querySelector('#tretaresia-rpg-wand-launcher').click());await panel.waitFor({state:'visible'});
  await card.locator('[data-action="begin-power-training"]').click();await page.locator('.rf-training-composer').waitFor({state:'visible'});assert.equal(await page.locator('#tretaresia-rpg-overlay').isVisible(),false);
  await page.evaluate(async list=>{window.host.chatMetadata.tretaresia_rpg_state.skills=list;window.host.extensionSettings.tretaresia_rpg.language='th';await window.host.eventSource.emit('CHAT_CHANGED');document.querySelector('#tretaresia-rpg-wand-launcher').click();document.querySelector('[data-tab="skills"]').click();},catalog);
  await panel.waitFor({state:'visible'});
  const size=width<=900?1:3,pages=Math.ceil(catalog.length/size),next=panel.locator('[data-skill-page="next"]'),previous=panel.locator('[data-skill-page="previous"]'),category=panel.locator('[data-skill-category]'),status=panel.locator('.rf-skill-page-status');
  assert.equal(await panel.locator('.tretaresia-skill-card').count(),size);assert.equal(await previous.isDisabled(),true);assert.match(await status.textContent(),new RegExp(`หน้า 1 / ${pages}`));
  assert.match(await category.innerText(),/เวทมนตร์ \(2\)/);assert.match(await category.innerText(),/ทั่วไป \(2\)/);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.rf-skill-mastery-label')).visibility==='visible'&&getComputedStyle(document.querySelector('.rf-skill-remove')).visibility==='visible');
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{document.querySelector('.tretaresia-rpg-panel-body').scrollTop=0;resolve();}))));
  await page.locator('#tretaresia-rpg-overlay').screenshot({path:artifacts+`skills-pagination-th-${width}.png`});
  const seen=[];
  for(let i=0;i<pages;i++){seen.push(...await panel.locator('.tretaresia-skill-card [data-action="delete-skill"]').evaluateAll(els=>els.map(el=>el.dataset.id)));if(i<pages-1)await next.click();}
  assert.deepEqual(seen,catalog.map(skill=>skill.id));assert.equal(await next.isDisabled(),true);
  // Filtering resets to page one and only includes skills in that category.
  await category.selectOption('magic');assert.match(await status.textContent(),new RegExp(`หน้า 1 / ${size===1?2:1}`));
  assert.deepEqual(await panel.locator('.tretaresia-skill-card h4').allTextContents(),size===1?['ลูกไฟ']:['ลูกไฟ','สายฟ้า']);
  if(size===1){await next.click();assert.deepEqual(await panel.locator('.tretaresia-skill-card h4').allTextContents(),['สายฟ้า']);}
  await category.selectOption('utility');assert.deepEqual(await panel.locator('.tretaresia-skill-card h4').allTextContents(),['มิติคลังเก็บของ']);assert.equal(await next.isDisabled(),true);
  await category.selectOption('all');assert.match(await status.textContent(),new RegExp(`หน้า 1 / ${pages}`));
  // Crossing the breakpoint preserves the first visible skill, then clamps pages.
  await next.click();const anchor=await panel.locator('.tretaresia-skill-card h4').first().innerText();
  await page.setViewportSize({width:size===1?1280:390,height:1000});
  await page.waitForFunction(expected=>document.querySelector('.tretaresia-skill-storage-grid').dataset.pageSize===String(expected),size===1?3:1);
  assert.ok((await panel.locator('.tretaresia-skill-card h4').allTextContents()).includes(anchor));
  await page.setViewportSize({width,height:width<600?844:1000});
  await page.waitForFunction(expected=>document.querySelector('.tretaresia-skill-storage-grid').dataset.pageSize===String(expected),size);
  await category.selectOption('all');
  for(let i=1;i<pages;i++)await next.click();
  // Delete from the last page; there must be no blank or out-of-range page.
  await panel.locator('.tretaresia-skill-card').last().locator('[data-action="delete-skill"]').click();
  await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.skills.length===7);
  assert.ok(await panel.locator('.tretaresia-skill-card').count()>0);assert.match(await status.textContent(),new RegExp(`หน้า ${Math.ceil(7/size)} / ${Math.ceil(7/size)}`));
  // Paging must not erase an in-progress draft in the add form.
  await panel.locator('.tretaresia-editor>summary').click();const form=panel.locator('form[data-form="skill"]');
  await form.locator('[name="name"]').fill('Mirror <Ward>');await form.locator('[name="description"]').fill('Guards against & reflects a weak spell.');
  await previous.click();assert.equal(await form.locator('[name="name"]').inputValue(),'Mirror <Ward>');
  await form.locator('[type="submit"]').click();await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.skills.length===8);
  await category.selectOption('all');for(let i=1;i<pages;i++)await next.click();
  assert.match(await panel.locator('.tretaresia-skill-card').last().innerText(),/Mirror <Ward>/);assert.equal(await panel.locator('ward').count(),0);
  assert.equal(await page.evaluate(()=>window.browseCalls),0,'classification, filtering and paging must not call the AI');
  for(const c of await panel.locator('.tretaresia-skill-card').all())assert.ok(await c.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  // Linked Character Life skills participate without duplicates or local deletion controls.
  await page.evaluate(()=>{window.CharacterLifeRpgBridge={listSkills:()=>[{name:'มิติคลังเก็บของ',category:'Utility'},{name:'ลางสังหรณ์',category:'Passive',rank:'Beginner'}]};document.querySelector('[data-tab="inventory"]').click();document.querySelector('[data-tab="skills"]').click();});
  await category.selectOption('passive');if(size===1)await next.click();
  const linked=panel.locator('.is-character-life-linked');await linked.waitFor({state:'visible'});assert.match(await linked.innerText(),/ลางสังหรณ์/);assert.equal(await linked.locator('[data-action="delete-skill"]').count(),0);assert.equal(await linked.locator('[role="progressbar"]').count(),0);
  assert.match(await category.textContent(),/ทั้งหมด \(9\)/);
  await page.evaluate(async()=>{delete window.CharacterLifeRpgBridge;window.host.chatMetadata.tretaresia_rpg_state.skills=[];await window.host.eventSource.emit('CHAT_CHANGED');});
  assert.equal(await panel.locator('.tretaresia-skill-card').count(),0);assert.equal(await category.isDisabled(),true);assert.equal(await next.isDisabled(),true);assert.equal(await previous.isDisabled(),true);assert.match(await status.textContent(),/0–0 \/ 0/);
  // A new chat must start at All / page one rather than inherit another chat's filter.
  await page.evaluate(async list=>{window.host.chatMetadata.tretaresia_rpg_state.skills=list;await window.host.eventSource.emit('CHAT_CHANGED');},catalog);
  await category.selectOption('magic');if(size===1)await next.click();
  await page.evaluate(async()=>{window.host.getCurrentChatId=()=> 'other-skill-preview';window.host.chatMetadata.tretaresia_rpg_state.skills=[{id:'other',name:'Different story skill'}];await window.host.eventSource.emit('CHAT_CHANGED');});
  assert.equal(await category.inputValue(),'all');assert.match(await status.textContent(),/1 \/ 1/);assert.equal(await panel.locator('.tretaresia-skill-card').count(),1);
  // Long configured ranks/names and enlarged reading text remain in the card.
  await page.evaluate(()=>{const c=document.querySelector('.tretaresia-skill-card');c.querySelector('h4').textContent='VeryLongUnbrokenSkillName'.repeat(4);c.querySelector('p').textContent='คำอธิบายทักษะที่ยาวมาก '.repeat(35);c.querySelector('.rf-skill-mastery-label strong').textContent='Custom rank with an unusually long name';c.querySelector('.rf-skill-copy p').style.fontSize='20px';});
  assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: full-width skill description, compact card, readable type, 44px controls, mastery, real ability/training/add/delete hooks, smart filters, all pages, responsive resize and preserved drafts, custom/long text without overflow`);await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
