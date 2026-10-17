// Real settings bindings and editors in the isolated SillyTavern host.
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const artifacts=new URL((process.env.SETTINGS_ARTIFACTS||new URL('../docs/previews/settings-drawer-review/',import.meta.url).pathname).replace(/\/?$/u,'/'),'file:');await mkdir(new URL('screenshots/',artifacts),{recursive:true});
const source=await readFile(new URL('index.js',root),'utf8');
const drawerCode=source.slice(source.indexOf('async function addSettingsDrawer()'),source.indexOf('function bindChatEvents()'));
const expectedBindings=[...drawerCode.matchAll(/bind(?:Checkbox|SettingControl)\('([^']+)'\s*,/gu)].map(m=>m[1]).concat(['tretaresia-rpg-inventory-composer','tretaresia-rpg-missions-composer','tretaresia-rpg-hstats-composer']);
const results={scope:'Production settings navigation and save handlers in an isolated SillyTavern host',widths:[],errors:[]};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
 if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
 const path=url.pathname.slice(base.length);res.setHeader('cache-control','no-store');res.setHeader('content-type',path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':path.endsWith('.json')?'application/json':path.endsWith('.woff2')?'font/woff2':'text/javascript');res.end(await readFile(new URL(path,root)));
}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const hostCss=`:root{--SmartThemeBodyColor:#ddd;--SmartThemeBorderColor:#484848;--SmartThemeBlurTintColor:#292929;--SmartThemeChatTintColor:#202020;--SmartThemeQuoteColor:#d4c59b}html,body{margin:0;background:#202020;color:#ddd;font:16px/1.6 system-ui,sans-serif}.preview-host{display:none!important}#extensions_settings2{box-sizing:border-box;display:block!important;position:fixed;top:42px;bottom:0;right:0;width:460px;max-width:100%;padding:14px;overflow:auto;scrollbar-width:thin;background:#202020;color:#ddd;font:16px/1.6 system-ui,sans-serif}.inline-drawer-header{display:flex;justify-content:space-between;align-items:center;padding:10px 0;font-weight:600}.inline-drawer-icon{color:#999}.inline-drawer-content{display:none}.text_pole{background:#161616;color:#ddd;border:1px solid #555;border-radius:5px;padding:8px;width:100%;min-width:0}.checkbox_label{display:flex;align-items:center;gap:8px}.menu_button{background:#303030;color:#ddd;border:1px solid #555;border-radius:5px;padding:7px 10px;font:inherit}.st-review-toolbar{position:fixed;inset:0 0 auto;height:42px;display:flex;align-items:center;justify-content:center;gap:28px;background:#202020;border-bottom:1px solid #404040;color:#999;font-size:19px}.native-settings-header h2{font:600 19px/1.5 system-ui;margin:3px 0 10px}.native-settings-header p{font-size:13px;color:#aaa;margin:0 0 12px}.native-settings-header .menu_button{min-height:40px;font-size:12px}.native-settings-header>div{display:flex;gap:8px;margin-bottom:12px}.native-settings-addon{font-size:16px;font-weight:600;display:flex;justify-content:space-between;align-items:center;padding:11px 0;color:#ccc}.native-settings-addon i{color:#999;font-size:14px}.review-chat{margin:84px auto;max-width:630px;color:#aaa;padding:25px 470px 25px 0;font-size:14px}.review-chat p{line-height:1.9}@media(max-width:600px){#extensions_settings2{width:100%;border:0}.review-chat{display:none}}`;
const iconCodes={book:'f02d','book-open':'f518',sliders:'f1de',display:'e163',globe:'f0ac','boxes-stacked':'f468','arrows-rotate':'f021','circle-info':'f05a','chevron-right':'f054','angle-left':'f104',xmark:'f00d','circle-chevron-down':'f13a','up-right-from-square':'f35d',rotate:'f2f1',heart:'f004',coins:'f51e',bolt:'f0e7','user-pen':'f4ff',cubes:'f1b3',palette:'f53f',comments:'f086',bell:'f0f3','feather-pointed':'f56b','id-card':'f2c2',user:'f007',image:'f03e','layer-group':'f5fd','face-smile':'f118',download:'f019','circle-check':'f058','shield-halved':'f3ed'};
const iconData=(await readFile(new URL('docs/previews/chat-original/assets/preview-icons.woff2',root))).toString('base64');
const iconCss=`@font-face{font-family:SettingsReviewIcons;src:url(data:font/woff2;base64,${iconData})}.fa-solid,.fa-regular,.fa-solid:before,.fa-regular:before{font-family:SettingsReviewIcons!important;font-style:normal}`+Object.entries(iconCodes).map(([name,code])=>`.fa-${name}:before{content:"\\${code}"}`).join('');
const wait=async page=>{await page.waitForTimeout(80);};
async function go(page,id){await page.evaluate(id=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.open(id,{direct:true}),id);await wait(page);}
async function home(page){await page.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.home());await wait(page);}
async function fit(page,label){
 const bounds=await page.evaluate(()=>{const drawer=document.getElementById('extensions_settings2'),n=document.getElementById('tretaresia-rpg-settings');const rect=n.getBoundingClientRect();return{page:document.documentElement.scrollWidth-innerWidth,drawer:drawer.scrollWidth-drawer.clientWidth,root:n.scrollWidth-n.clientWidth,rootWidth:n.clientWidth,drawerLeft:drawer.scrollLeft,rootMargin:getComputedStyle(n).margin,rootMin:getComputedStyle(n).minWidth,left:rect.left,right:rect.right,width:innerWidth};});
 assert.ok(bounds.page<=1&&bounds.drawer<=1&&bounds.root<=1&&bounds.left>=-1&&bounds.right<=bounds.width+1,`${label}: ${JSON.stringify(bounds)}`);
}
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'th',autoTrack:false,injectState:false,autoContinuity:false,enableMemorySummaries:false,chatPresentation:false}})));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=th`);await page.waitForFunction(()=>window.hStatsPreview?.ready&&document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation);await wait(page);
  await page.addStyleTag({content:hostCss+'\n'+iconCss});
  await page.evaluate(()=>{
   document.getElementById('tretaresia-rpg-close').click();document.getElementById('tretaresia-rpg-settings').querySelector('.inline-drawer-content').style.display='block';
   window.settingsAiCalls=0;window.host.generateRaw=window.host.generateQuietPrompt=async()=>{window.settingsAiCalls++;throw Error('Settings must not call AI');};
   const toolbar=document.createElement('div');toolbar.className='st-review-toolbar';toolbar.innerHTML='<i class="fa-solid fa-sliders"></i><span>A</span><i class="fa-solid fa-book-open"></i><i class="fa-solid fa-user"></i><i class="fa-solid fa-image"></i><i class="fa-solid fa-cubes"></i><i class="fa-solid fa-face-smile"></i>';document.body.append(toolbar);
   const native=document.createElement('div');native.className='native-settings-header';native.innerHTML='<h2>โปรแกรมส่วนขยาย</h2><p>☑ แจ้งเตือนเมื่อมีการอัปเดตส่วนขยาย</p><div><button class="menu_button" type="button">จัดการส่วนขยาย</button><button class="menu_button" type="button">ติดตั้งส่วนขยาย</button></div><div class="native-settings-addon">Character Expressions <i class="fa-solid fa-circle-chevron-down"></i></div><div class="native-settings-addon">TTS <i class="fa-solid fa-circle-chevron-down"></i></div>';
   document.getElementById('extensions_settings2').prepend(native);
   const scene=document.createElement('div');scene.className='review-chat';scene.innerHTML='<b>SillyTavern · โฮสต์จำลอง</b><p>พรีวิวหน้าตั้งค่าใหม่ของ RoleForge<br>เมนูหลัก 7 หมวด พร้อมค้นหาและหน้าจัดการ</p>';document.body.append(scene);
  });await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-rf-settings-groups]>button').count(),7);
  assert.equal(await page.locator('[data-rf-settings-page]').count(),20);
  for(const id of expectedBindings)assert.equal(await page.locator('#'+id).count(),1,`Existing setting ${id} is retained once`);
  assert.equal(await page.locator('[data-rf-settings-page]:not([hidden])').count(),0);
  for(const id of ['status-composer','inventory-composer','missions-composer','hstats-composer','stat-training-composer','incantation','weapons','status-layout','stat-training-layout','coin-style','npc-incantation','incantation-language','incantation-custom-language'])assert.equal(await page.locator('[data-rf-settings-page="chatbar"] #tretaresia-rpg-'+id).count(),1);
  for(const key of ['enableAuctions','enableMarketplace','enableMemorySummaries']){assert.equal(await page.locator('#roleforge-chatbar-optional-settings [data-optional-setting="'+key+'"]').count(),1);assert.equal(await page.locator('#roleforge-optional-settings [data-optional-setting="'+key+'"]').count(),0);}
  for(const id of ['weapons','incantation']){await go(page,id);assert.equal(await page.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.current),'chatbar');assert.equal(await page.locator('#roleforge-chatbar-'+id).getAttribute('open'),'');}await home(page);

  const before=await page.evaluate(()=>JSON.stringify([window.host.extensionSettings,window.host.chatMetadata]));
  for(const id of ['general','chatbar','interface','world','presets','tracking','advanced','chat-appearance','interface-colors','stats','currency','powers','forge','incantation','optional','diary','preset-library','card-pack','notifications','writing','diagnostics']){await go(page,id);await fit(page,id);}
  assert.equal(await page.evaluate(()=>JSON.stringify([window.host.extensionSettings,window.host.chatMetadata])),before,'Navigation changes no saved values or state');
  await go(page,'stats');await page.locator('#extensions_settings2').evaluate(n=>{n.scrollTop=n.scrollHeight;});await go(page,'currency');
  assert.ok(await page.locator('#roleforge-currency-editor').evaluate(n=>n.getBoundingClientRect().top>=document.querySelector('[data-rf-settings-header]').getBoundingClientRect().bottom-1),'A new editor opens at its top below the sticky Back header');
  await home(page);await page.locator('#roleforge-settings-search').fill('Header');await wait(page);assert.ok(await page.locator('[data-rf-settings-results] [data-rf-settings-open="chat-appearance"]').count());
  await page.locator('[data-rf-settings-results] [data-rf-settings-open="chat-appearance"]').click();assert.equal(await page.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.current),'chat-appearance');
  await page.locator('[data-rf-settings-back]').click();assert.equal(await page.locator('#roleforge-settings-search').inputValue(),'Header','Back preserves the search');
  await page.locator('#roleforge-settings-search').fill('ค่าเงิน');await page.locator('#roleforge-settings-search').press('Enter');await wait(page);assert.equal(await page.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.current),'currency','Thai search opens the currency editor');
  await home(page);await page.locator('#roleforge-settings-search').fill('<svg onload=alert(1)>');assert.equal(await page.locator('[data-rf-settings-empty]').isVisible(),true);assert.equal(await page.locator('[data-rf-settings-results] svg').count(),0,'Search text is never interpreted as HTML');await page.locator('[data-rf-settings-clear]').click();
  await go(page,'world');await page.locator('[data-rf-settings-page="world"] [data-rf-settings-open="stats"]').click();
  const intelligence=page.locator('#roleforge-stat-editor [name="value-intelligence"]'),initialInt=await intelligence.inputValue();await intelligence.fill('31.25');await page.locator('[data-rf-settings-back]').click();await page.locator('[data-rf-settings-page="world"] [data-rf-settings-open="stats"]').click();assert.equal(await intelligence.inputValue(),'31.25','Unsaved numeric draft survives Back');
  await page.locator('#roleforge-stat-editor [data-stat-config] button[type=submit]').click();await page.waitForFunction(()=>window.host.chatMetadata.tretaresia_rpg_state.player.attributes.intelligence===31.25);
  await go(page,'currency');const initialCurrency=await page.locator('#roleforge-currency-editor [name=currencyName]').inputValue();await page.locator('#roleforge-currency-editor [name=currencyName]').fill('Draft currency name');await page.locator('[data-rf-settings-back]').click();await page.locator('[data-rf-settings-page="world"] [data-rf-settings-open="currency"]').click();assert.equal(await page.locator('#roleforge-currency-editor [name=currencyName]').inputValue(),'Draft currency name','Currency draft is retained');
  await go(page,'tracking');await page.locator('#tretaresia-rpg-notify-stats').uncheck();assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.notifyStatGrowth),false,'Original checkbox binding still saves');
  await go(page,'general');await page.locator('#tretaresia-rpg-language').selectOption('en');await page.waitForFunction(()=>document.querySelector('[data-rf-settings-title]').textContent==='General play');await page.locator('#tretaresia-rpg-language').selectOption('th');await page.waitForFunction(()=>document.querySelector('[data-rf-settings-title]').textContent==='การเล่นทั่วไป');
  await home(page);await fit(page,'home');
  if(width===390||width===1440){
   // Capture the ordinary demo values rather than the draft used by the assertions.
   await go(page,'stats');await intelligence.fill(initialInt);await page.locator('#roleforge-stat-editor [data-stat-config] button[type=submit]').click();await page.waitForFunction(value=>window.host.chatMetadata.tretaresia_rpg_state.player.attributes.intelligence===Number(value),initialInt);
   await go(page,'currency');await page.locator('#roleforge-currency-editor [name=currencyName]').fill(initialCurrency);await home(page);
   for(const [id,name]of [['home','home'],['chatbar','chatbar'],['interface','windows'],['world','world'],['stats','stats'],['currency','currency'],['presets','presets'],['chat-appearance','chat'],['tracking','tracking']]){
    if(id==='home'){await home(page);await page.locator('#extensions_settings2').evaluate(n=>{n.scrollTop=0;});}else await go(page,id);
    await page.mouse.move(1,1);await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:new URL(`screenshots/${width===390?'mobile':'pc'}-${name}.png`,artifacts).pathname});
   }
   await home(page);await page.locator('#roleforge-settings-search').fill('ค่าเงิน');await page.locator('#extensions_settings2').evaluate(n=>{n.scrollTop=0;});await wait(page);await page.screenshot({path:new URL(`screenshots/${width===390?'mobile':'pc'}-search.png`,artifacts).pathname});
   if(width===390){
    await page.locator('[data-rf-settings-clear]').click();await page.locator('#extensions_settings2').evaluate(n=>{n.scrollTop=0;});
    const snapshot=await page.evaluate(()=>{for(const n of document.getElementById('extensions_settings2').querySelectorAll('input,select,textarea')){if(n.tagName==='SELECT')for(const o of n.options)o.toggleAttribute('selected',o.selected);else if(n.tagName==='TEXTAREA')n.textContent=n.value;else if(n.type==='checkbox')n.toggleAttribute('checked',n.checked);else if(n.type!=='file')n.setAttribute('value',n.value);}return {html:document.getElementById('extensions_settings2').outerHTML,styles:[...document.querySelectorAll('style,link[rel=stylesheet]')].map(n=>n.tagName==='STYLE'?{text:n.textContent}:{href:n.href}),theme:document.documentElement.getAttribute('style')||'',version:window.TretaresiaRelease};});
    await writeFile(new URL('snapshot.json',artifacts),JSON.stringify(snapshot));
   }
  }
  assert.equal(await page.evaluate(()=>window.settingsAiCalls),0);assert.deepEqual(errors,[]);results.widths.push({width,groups:7,pages:20,controls:expectedBindings.length,search:true,back:true,drafts:true,realSave:true,languageSwitch:true,overflow:false,aiCalls:0});
  console.log(`PASS settings ${width}px: 7 groups, all bindings retained, search, drafts, actual saves, bilingual labels and zero AI calls`);await page.close();
 }
 await writeFile(new URL('validation.json',artifacts),JSON.stringify(results,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
