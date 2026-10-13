// Connect to a real, locally running SillyTavern with RoleForge installed.
// Use a separate test dataRoot; this creates a dummy card and saves test values.
// ST_REAL_URL=http://127.0.0.1:18174 ST_THEME_FILE=/path/to/theme.json npm run test:settings-theme:real
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const base=process.env.ST_REAL_URL,themeFile=process.env.ST_THEME_FILE;
assert(base&&themeFile,'Set ST_REAL_URL and ST_THEME_FILE. Use an isolated SillyTavern test dataRoot.');
assert(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Use a local test server, not a personal or public instance.');
const theme=JSON.parse(await readFile(themeFile,'utf8'));
const folder=new URL(process.env.ST_THEME_ARTIFACTS?`file://${process.env.ST_THEME_ARTIFACTS.replace(/\/$/,'')}/`:'../docs/previews/settings-theme-fix/',import.meta.url);
await mkdir(folder,{recursive:true});
const expectedStyles=String(theme.custom_css||'');
const report={host:'Real SillyTavern frontend/server; native theme import, real settings and chat persistence',theme:theme.name,themeCssSha256:createHash('sha256').update(expectedStyles).digest('hex'),cases:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const title='RoleForge Theme Test';
const pause=page=>page.waitForTimeout(120);
async function rootReady(page){
 await page.waitForFunction(()=>window.SillyTavern?.getContext?.().addOneMessage&&document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation,{},{timeout:60000});
 await page.waitForFunction(()=>![...document.querySelectorAll('.popup')].some(p=>p.textContent.includes('Initializing')));
 const welcome=page.locator('.popup:visible');
 if(await welcome.count()){
  const input=welcome.locator('textarea');if(await input.count())await input.first().fill('UI tester');
  await welcome.locator('.popup-button-ok').click();
 }
}
async function extensionDrawer(page){
 if(!await page.locator('#rm_extensions_block').isVisible())await page.locator('#extensions-settings-button').click();
 const content=page.locator('#tretaresia-rpg-settings .inline-drawer-content');
 if(!await content.isVisible())await page.locator('#tretaresia-rpg-settings .inline-drawer-toggle').click();
 await page.locator('#tretaresia-rpg-settings').scrollIntoViewIfNeeded();
}
async function open(page,id){
 await page.evaluate(id=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.open(id,{direct:true}),id);
 await pause(page);
}
async function home(page){
 await page.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.home());await pause(page);
}
async function selectTestCharacter(page){
 await page.waitForFunction(title=>[...document.querySelectorAll('.character_select')].some(n=>n.textContent.includes(title)),title);
 await page.evaluate(title=>[...document.querySelectorAll('.character_select')].find(n=>n.textContent.includes(title)).click(),title);
 await page.waitForFunction(()=>Boolean(SillyTavern.getContext().getCurrentChatId()));
}
async function layout(page,label){
 const metrics=await page.locator('#tretaresia-rpg-settings').evaluate(root=>{
  const box=root.getBoundingClientRect();
  const rows=[...root.querySelectorAll('.rf-settings-route')].filter(n=>n.getBoundingClientRect().height>0).map(n=>{
   const rect=n.getBoundingClientRect(),icon=n.firstElementChild.getBoundingClientRect(),copy=n.children[1],arrow=n.lastElementChild.getBoundingClientRect();
   return{left:icon.left-rect.left,right:rect.right-arrow.right,textOverflow:copy.scrollWidth-copy.clientWidth,top:rect.top,bottom:rect.bottom};
  });
  const search=[...root.querySelector('.rf-settings-search>div').children].map(n=>n.getBoundingClientRect().toJSON());
  return{width:innerWidth,left:box.left,right:box.right,overflow:root.scrollWidth-root.clientWidth,rows,search};
 });
 assert.ok(metrics.left>=-1&&metrics.right<=metrics.width+1&&metrics.overflow<=1,`${label}: drawer fits ${JSON.stringify(metrics)}`);
 for(const row of metrics.rows)assert.ok(row.left>=6&&row.right>=6&&row.textOverflow<=1,`${label}: content fits inside the button ${JSON.stringify(row)}`);
 for(let i=1;i<metrics.rows.length;i++)assert.ok(metrics.rows[i].top-metrics.rows[i-1].bottom>=4,`${label}: separate buttons have space between them`);
 if(metrics.search[0].height)assert.ok(Math.abs(metrics.search[0].height-metrics.search[1].height)<=1&&Math.abs(metrics.search[0].top-metrics.search[1].top)<=1,`${label}: search input and Clear align ${JSON.stringify(metrics.search)}`);
 return metrics;
}
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[],generation=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/\/api\/.*\/generate(?:\?|$)/.test(r.url()))generation.push(r.url());});
  // No fake SillyTavern context or extension handlers. Only prevent optional
  // Horde discovery from contacting an unrelated remote service on startup.
  await page.route('**/api/horde/text-models',route=>route.fulfill({json:[]}));
  await page.route('**/api/horde/status',route=>route.fulfill({json:{ok:false}}));
  await page.goto(base);await rootReady(page);
  if(!report.sillyTavern)report.sillyTavern=await (await page.request.get(new URL('/version',base).href)).json();
  if(!await page.locator('#themes option').evaluateAll((options,name)=>options.some(o=>o.value===name),theme.name)){
   await page.locator('#ui_preset_import_file').setInputFiles(themeFile);
   await page.waitForFunction(name=>[...document.querySelector('#themes').options].some(o=>o.value===name),theme.name);
  }
  await page.locator('#user-settings-button').click();await page.locator('#themes').selectOption(theme.name);
  await page.waitForFunction(css=>document.getElementById('customCSS').value===css,expectedStyles);
  await page.evaluate(async title=>{
   const context=SillyTavern.getContext();
   if(!context.characters.some(c=>c.name===title)){
    const form=new FormData();form.set('ch_name',title);form.set('description','Local UI integration test');form.set('first_mes','Welcome to the UI test.');form.set('creator','RoleForge test');form.set('fav','false');
    const response=await fetch('/api/characters/create',{method:'POST',headers:context.getRequestHeaders({omitContentType:true}),body:form});
    if(!response.ok)throw Error('Test card create failed: '+response.status);
    const {getCharacters}=await import('/script.js');await getCharacters();
   }
  },title);
  await selectTestCharacter(page);
  await extensionDrawer(page);await open(page,'general');await page.locator('#tretaresia-rpg-language').selectOption('th');
  await home(page);await layout(page,`${width}px home`);
  const neighbor=await page.locator('#extensions_settings .inline-drawer-header').first().evaluate(n=>{const c=getComputedStyle(n);return[c.fontFamily,c.backgroundImage,c.borderRadius];});
  const header=await page.locator('#tretaresia-rpg-settings .inline-drawer-header').evaluate(n=>{const c=getComputedStyle(n);return[c.fontFamily,c.backgroundImage,c.borderRadius];});
  assert.deepEqual(header,neighbor,'Native extension header retains the host theme');
  const before=await page.evaluate(()=>JSON.stringify([SillyTavern.getContext().extensionSettings.tretaresia_rpg,SillyTavern.getContext().chatMetadata.roleforge_chat_presets]));
  const pages=await page.locator('[data-rf-settings-page]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rfSettingsPage));
  for(const id of pages){await open(page,id);await layout(page,`${width}px ${id}`);}
  assert.equal(await page.evaluate(()=>JSON.stringify([SillyTavern.getContext().extensionSettings.tretaresia_rpg,SillyTavern.getContext().chatMetadata.roleforge_chat_presets])),before,'Navigation does not change real saved preferences');
  await home(page);await page.locator('#roleforge-settings-search').fill('ค่าเงิน');
  await page.locator('[data-rf-settings-results] [data-rf-settings-open=currency]').click();
  await page.locator('[data-rf-settings-back]').click();
  assert.equal(await page.locator('#roleforge-settings-search').inputValue(),'ค่าเงิน');await layout(page,`${width}px results`);
  await page.locator('[data-rf-settings-clear]').click();
  // Exercise a user draft and the extension's native Save through ST's real
  // chat metadata API; reload the application to verify the server copy.
  await open(page,'world');await page.locator('[data-rf-settings-page=world] [data-rf-settings-open=stats]').click();
  const intelligence=page.locator('#roleforge-stat-editor [name=value-intelligence]');await intelligence.fill('31');
  await page.locator('[data-rf-settings-back]').click();await page.locator('[data-rf-settings-page=world] [data-rf-settings-open=stats]').click();
  assert.equal(await intelligence.inputValue(),'31');
  await page.locator('#roleforge-stat-editor [data-stat-config] button[type=submit]').click();
  await page.waitForFunction(()=>SillyTavern.getContext().chatMetadata.tretaresia_rpg_state.player.attributes.intelligence===31);
  await page.waitForTimeout(1500);await page.reload();await rootReady(page);await selectTestCharacter(page);await extensionDrawer(page);await open(page,'stats');
  assert.equal(await intelligence.inputValue(),'31','Manual stat saved in real ST survives reload');
  if(width===390||width===1440){
   for(const [id,name]of [['home','home'],['world','world'],['interface','windows'],['stats','stats'],['currency','currency']]){
    if(id==='home')await home(page);else await open(page,id);
    await page.locator('#tretaresia-rpg-settings').scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.evaluate(()=>document.activeElement?.blur());
    await page.screenshot({path:new URL(`${width===390?'mobile':'pc'}-${name}.png`,folder).pathname});
   }
  }
  // The actual ST font-size setting makes titles wrap; nothing is clipped.
  await page.locator('#user-settings-button').click();
  await page.locator('#font_scale').evaluate(n=>{n.value='1.4';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('mouseup',{bubbles:true}));});
  await extensionDrawer(page);await home(page);await layout(page,`${width}px large text`);
  await page.locator('#user-settings-button').click();await page.locator('#font_scale').evaluate((n,value)=>{n.value=String(value);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('mouseup',{bubbles:true}));},theme.font_scale||1);
  if(width===1440){
   await page.locator('#themes').selectOption('Dark Lite');await extensionDrawer(page);await home(page);
   await layout(page,'Native Dark Lite home');await open(page,'world');await layout(page,'Native Dark Lite category');
   report.originalTheme=true;
  }
  assert.deepEqual(errors,[]);assert.deepEqual(generation,[],'No text generation during settings checks');
  report.cases.push({width,pages:pages.length,nativeThemeImport:true,themeCssUnchanged:true,layout:true,largeText:true,search:true,drafts:true,realSaveReload:true,aiCalls:0});
  console.log(`PASS real SillyTavern ${width}px: uploaded theme, native headers, all pages, search, drafts, server persistence and large text`);
  await page.close();
 }
 report.release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8')).version;
 await writeFile(new URL('validation.json',folder),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
