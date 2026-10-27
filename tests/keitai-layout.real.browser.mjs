import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const mobile=process.env.PHONE_DEVICE!=='desktop',web=process.env.PHONE_BROWSER==='webkit';
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18350',out=process.env.PHONE_ARTIFACTS||'/workspace/artifacts/aster-k06-polish/'+(web?'webkit':mobile?'mobile':'desktop');
await mkdir(out,{recursive:true});
const browser=await(web?webkit.launch({headless:true}):chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}));
const viewport=mobile?{width:390,height:844}:{width:1920,height:1080};
const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1}),page=await context.newPage();
page.setDefaultTimeout(45000);
const errors=[],checks={},metrics={};let report;
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));
await context.route('**/api/backends/chat-completions/generate',r=>r.fulfill({json:{choices:[{message:{role:'assistant',content:'<tr-narrative>The evening is quiet.</tr-narrative>'},finish_reason:'stop'}]}}));
const root=()=>page.locator('#rf-aster-keitai'),screen=()=>root().locator('#k06-screen');
async function idle(){await page.waitForFunction(()=>document.querySelector('#rf-aster-keitai')?.getAttribute('aria-busy')!=='true');}
async function click(selector){const n=root().locator(selector).first();mobile?await n.tap():await n.click();await idle();}
async function open(app){await page.evaluate(app=>RoleForgePhone.open(app),app);await page.waitForTimeout(80);}
async function snap(name){await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));if(mobile){const v=await page.evaluate(()=>({top:visualViewport.offsetTop,height:visualViewport.height})),b=await root().locator('.k06-window').boundingBox();metrics[name]={visual:v,window:b};assert(Math.abs(b.y-v.top)<2,'Phone header moved outside the visual viewport');assert(Math.abs(b.height-v.height)<2,'Phone height does not follow the visual viewport');}await page.screenshot({path:out+'/'+name+'.png'});}
async function swipe(){
 const b=await screen().boundingBox();
 if(mobile&&!web){const cdp=await context.newCDPSession(page),x=b.x+b.width*.8,y=b.y+b.height-30;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*Math.max(60,b.height-90)/12}]});await page.waitForTimeout(18);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else if(web&&mobile){/* Playwright cannot dispatch native swipes/wheels in mobile WebKit. */await screen().evaluate(n=>n.scrollBy(0,700));}else{await page.mouse.move(b.x+b.width*.8,b.y+b.height*.7);await page.mouse.wheel(0,700);}
 await page.waitForTimeout(350);
}
try{
 await page.goto(base);await page.waitForFunction(()=>globalThis.RoleForgeWorkshop&&document.querySelector('#tretaresia-rpg-settings')?.rfSettingsNavigation,null,{timeout:120000});
 const welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'});if(await welcome.isVisible())await welcome.locator('.popup-button-ok').click();
 await page.waitForFunction(()=>SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),null,{timeout:120000});
 await page.evaluate(async()=>{
  const c=SillyTavern.getContext(),name='K06 layout QA '+Date.now(),card={spec:'chara_card_v2',spec_version:'2.0',data:{name,description:'Fictional adults in a Japanese city. No required year.',first_mes:'You check the Aster K06 flip phone.',extensions:{roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['smartphone']},roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:false},initialState:{player:{name:'Kai'},inventory:[{id:'phone',name:'Aster K06 flip phone',quantity:1}],worldClock:{day:7,time:'18:42'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}}}};
  const f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'layout.json',{type:'application/json'}));
  const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await r.json();if(!r.ok||v.error)throw Error('QA card import failed');
  const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));await RoleForgeWorkshop.ready();
 });
 await page.waitForFunction(()=>globalThis.RoleForgePhone?.get().enabled);
 await page.evaluate(async()=>{await RoleForgePhone.preferences({deviceType:'keitai',language:'en',sound:false,motion:false});RoleForgePhone.open('home');});
 await root().locator('.k06-window').waitFor({state:'visible'});await snap('01-home');
 const box=await root().locator('.k06-window').boundingBox(),lcd=await root().locator('.lcd').boundingBox();metrics.initial={box,lcd};
 if(mobile){assert.equal(box.x,0);assert.equal(box.y,0);assert.equal(box.width,390);assert.equal(box.height,844);assert.equal(lcd.width,390);assert(lcd.height>750);assert(await root().locator('.keypad-shell').isHidden());await click('.k06-titlebar [data-k06=menu]');}else{assert(await root().locator('.keypad-shell').isVisible());await click('[data-key=ok]');}
 assert.equal(await root().locator('.menu-app').count(),9);await snap('02-menu');checks.fullscreenOrHardware=true;
 await open('settings');await snap('03-settings-top');
 const before=await screen().evaluate(n=>n.scrollTop);await swipe();const after=await screen().evaluate(n=>n.scrollTop);assert(after>before+50);metrics.settingsScroll={before,after};checks.scrolling=true;metrics.scrollInput=web&&mobile?'DOM scroll (WebKit automation limitation)':mobile?'Native CDP touch swipe':'Native mouse wheel';
 // A setting near the bottom must open a picker in the visible LCD, not at the page's scroll origin.
 await root().locator('[data-key=callInput]').scrollIntoViewIfNeeded();const prior=await screen().evaluate(n=>n.scrollTop);await click('[data-k06=choose-option][data-key=callInput]');
 const picker=root().locator('#k06-lcd-picker'),pr=await picker.boundingBox(),sr=await screen().boundingBox();assert(Math.abs(pr.y-sr.y)<2);assert(pr.height<=sr.height+1);await snap('04-picker-after-scroll');
 await click('[data-k06=pick-option][data-key=callInput][data-value=phone]');assert.equal(await page.evaluate(()=>RoleForgePhone.get().config.callInput),'phone');assert(Math.abs(await screen().evaluate(n=>n.scrollTop)-prior)<3);checks.pickerAfterScroll=true;
 await root().locator('[data-k06=sync]').scrollIntoViewIfNeeded();await snap('05-settings-bottom');
 // Host checkbox skins must not clip the phone's circular switch thumb into a checkmark.
 assert.equal(await root().locator('[data-config=wand]').evaluate(n=>getComputedStyle(n,'::before').clipPath),'none');checks.hostStyleIsolation=true;
 await open('contact-edit');await root().locator('[name=label]').fill('Misaki · Photographer');await root().locator('[name=number]').fill('090-2846-0618');await root().locator('[name=email]').fill('misaki@aster.example');await root().locator('[name=notes]').fill('Meet near the station. สถานีริมอ่าว');
 await root().locator('[name=notes]').blur();await snap('06-contact-edit');
 if(mobile){
  // Simulate the reduced visual viewport of an open software keyboard; this is not a physical iPhone keyboard test.
  await page.setViewportSize({width:390,height:410});await root().locator('[name=notes]').tap();await page.waitForTimeout(200);
  const input=await root().locator('[name=notes]').boundingBox(),area=await screen().boundingBox();assert(input.y>=area.y);assert(input.y+input.height<=area.y+area.height);assert.equal(await root().locator('[name=label]').inputValue(),'Misaki · Photographer');assert.equal(await root().locator('[name=notes]').evaluate(n=>getComputedStyle(n).fontSize),'16px');
  await snap('07-keyboard-viewport');await swipe();await root().locator('#k06-contact [type=submit]').scrollIntoViewIfNeeded();await click('#k06-contact [type=submit]');checks.keyboardViewportSave=true;
  await page.setViewportSize(viewport);
 }else{await swipe();await click('#k06-contact [type=submit]');}
 assert.equal(await page.evaluate(()=>RoleForgePhone.world().contacts.find(c=>c.label==='Misaki · Photographer')?.notes),'Meet near the station. สถานีริมอ่าว');checks.contactSave=true;await snap('08-contact-saved');
 await open('settings');await click('[data-k06=choose-option][data-key=language]');await click('[data-k06=pick-option][data-key=language][data-value=th]');assert.match(await screen().innerText(),/ตั้งค่าเครื่อง/);await snap('09-thai-settings');checks.bilingual=true;
 await open('settings');await click('[data-k06=choose-option][data-key=language]');await open('home');assert.equal(await root().locator('#k06-lcd-picker').count(),0);checks.pickerDismissOnNavigation=true;await click(mobile?'.k06-titlebar [data-k06=fold]':'#k06-fold');assert(await root().locator('.handset.closed').count());await snap('10-closed-display');await click('#k06-open-lid');assert.equal(await root().locator('.handset.closed').count(),0);checks.fold=true;
 if(mobile){
  for(const size of [{width:320,height:568},{width:430,height:932},{width:844,height:390}]){
   await page.setViewportSize(size);await open('contact-edit');await root().locator('[name=label]').fill('Viewport '+size.width);await root().locator('[name=notes]').fill('Scroll to save');await root().locator('[name=notes]').blur();await swipe();await root().locator('#k06-contact [type=submit]').scrollIntoViewIfNeeded();await click('#k06-contact [type=submit]');
   const b=await root().locator('.lcd').boundingBox();assert.equal(Math.round(b.width),size.width);assert(await root().locator('.keypad-shell').isHidden());if(size.width===844){const bar=await root().locator('.k06-titlebar').boundingBox();await page.mouse.move(bar.x+35,bar.y+25);await page.mouse.down();await page.mouse.move(bar.x+140,bar.y+65,{steps:4});await page.mouse.up();const win=await root().locator('.k06-window').boundingBox();assert.equal(win.x,0);assert.equal(win.y,0);}await snap('11-viewport-'+size.width);
  }await page.setViewportSize(viewport);checks.smallLargeLandscape=true;
 }
 await open('home');await click('[data-k06=close]');assert(await root().locator('.k06-window').isHidden());checks.close=true;
 assert.deepEqual(errors,[]);report={pass:true,host:'SillyTavern 1.19.0',browser:web?'WebKit':'Chromium',mobile,physicalDevice:false,checks,metrics,errors};
}catch(e){await page.screenshot({path:out+'/failure.png'});report={pass:false,error:e.stack,checks,metrics,errors};console.error(e);process.exitCode=1;}
finally{await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await context.close();await browser.close();}
if(report.pass)console.log('PASS K06 layout',mobile?'mobile':'desktop',web?'WebKit':'Chromium',checks);
