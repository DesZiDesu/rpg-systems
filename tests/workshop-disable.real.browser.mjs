// Native SillyTavern regression: disabled addons must not retain direct shortcuts.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18182',out=process.env.WORKSHOP_ARTIFACTS||'/workspace/artifacts/workshop-v0.77.2';
const release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out+'/captures',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}),report={release,host:'SillyTavern 1.19.0',checks:[],errors:[],modelCalls:0};let page;
const root=()=>page.locator('#roleforge-workshop');
const idle=()=>page.waitForFunction(()=>!RoleForgeWorkshop.debug().busy);
const snapshot=()=>page.evaluate(()=>RoleForgeWorkshop.snapshot());
async function select(name){await page.evaluate(async name=>{const h=await import('/script.js'),c=SillyTavern.getContext(),index=c.characters.findLastIndex(x=>x.name===name);if(index<0)throw Error('Missing local test card: '+name);await h.selectCharacterById(String(index));},name);await page.waitForFunction(()=>RoleForgeWorkshop.debug().key.endsWith('::'+SillyTavern.getContext().getCurrentChatId()));await idle();}
async function chat(){await page.evaluate(()=>RoleForgeWorkshop.open('chat'));await root().waitFor({state:'visible'});}
async function toggle(id,on){await root().locator(`[data-ws-enable="${id}"]`).setChecked(on);await idle();assert.equal((await snapshot()).profile.enabled.includes(id),on);}
async function shortcuts(id,count){assert.equal(await page.locator(`[data-addon-launch="${id}"]`).count(),count,id+' floating shortcut');assert.equal(await page.locator('#rfws-addon-wand-'+id).count(),count,id+' Wand shortcut');}
async function shot(name){await page.evaluate(()=>{toastr.clear();document.activeElement?.blur();});await page.screenshot({path:out+'/captures/'+name+'.png'});}
try{
 for(const mobile of [true,false]){
  const device=mobile?'mobile':'desktop',context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
  await context.route('**/api/horde/**',r=>r.fulfill({json:[]}));await context.route('**/api/backends/chat-completions/generate',r=>{report.modelCalls++;return r.abort();});
  page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base+'/');await page.waitForFunction(()=>!!globalThis.RoleForgeWorkshop,{},{timeout:120000});
  const welcome=page.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');if(await welcome.count())await welcome.click();await page.selectOption('#themes','Dark Lite',{force:true});
  await select('Tensura · Jura Forest');const originalState=await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state));
  for(const id of ['great-sage','field-notes']){
   await page.evaluate(()=>RoleForgeWorkshop.open());await root().locator(`[data-ws-action=detail][data-id="${id}"]`).first().click();await root().locator('[data-ws-action=install]').click();await idle();await shortcuts(id,0);
  }
  await chat();await toggle('field-notes',true);await shortcuts('field-notes',1);await shortcuts('great-sage',0);await root().locator('[data-ws-action=close]').click();assert.equal(await root().isVisible(),false);
  const field=page.locator('[data-addon-launch=field-notes]');await field.press('ArrowUp');await idle();const layout=(await snapshot()).profile.launchers;
  await field.click();assert.equal(await page.evaluate(()=>RoleForgeWorkshop.debug().view),'notes');await root().locator('[data-ws-action=close]').click();
  await chat();await toggle('great-sage',true);await shortcuts('great-sage',1);await shortcuts('field-notes',1);
  await toggle('field-notes',false);await shortcuts('field-notes',0);await shortcuts('great-sage',1);await root().locator('[data-ws-action=close]').click();await shot(device+'-field-notes-off');
  await chat();await toggle('great-sage',false);await shortcuts('great-sage',0);assert.equal(await page.locator('.rfws-addon-orbits').isVisible(),false);assert.equal(await page.locator('#rf-dock-panel-great-sage').count(),0);
  await toggle('field-notes',true);await shortcuts('field-notes',1);assert.deepEqual((await snapshot()).profile.launchers,layout,'turning off preserves the saved launcher position');
  await select('Fate · Chaldea');await shortcuts('field-notes',0);await shortcuts('great-sage',0);await select('Tensura · Jura Forest');await shortcuts('field-notes',1);await shortcuts('great-sage',0);
  await chat();await toggle('great-sage',true);await page.evaluate(()=>RoleForgeWorkshop.openSage('settings'));
  assert.deepEqual(await root().locator('[name=theme] option').allTextContents(),['Prismatic','Azure Sage']);await root().locator('[name=theme]').selectOption('azure');await root().locator('[data-sage-settings] [type=submit]').click();await idle();await shot(device+'-theme-names');
  await chat();await toggle('great-sage',false);await toggle('field-notes',false);await shortcuts('great-sage',0);await shortcuts('field-notes',0);await root().locator('[data-ws-action=close]').click();await shot(device+'-all-off');
  await page.reload();await page.waitForFunction(()=>!!globalThis.RoleForgeWorkshop,{},{timeout:120000});await select('Tensura · Jura Forest');await shortcuts('field-notes',0);await shortcuts('great-sage',0);assert.equal((await snapshot()).profile.sage.theme,'azure');assert.equal(await page.locator('.rfws-addon-orbits').isVisible(),false);
  assert.equal(await page.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state)),originalState);assert.equal(report.modelCalls,0);
  report.checks.push({device,defaultOffHasNoShortcuts:true,disableRemovesFloatingAndWand:true,otherAddonStaysEnabled:true,allOffHidesRail:true,reenableRestoresSavedPosition:true,perChatScope:true,reloadStaysDisabled:true,themeNamesOnly:true,themePersists:true,noRoleForgeStateChanges:true,pass:true});await context.close();console.log('PASS native Workshop disable and theme names',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;console.error(error);process.exitCode=1;if(page&&!page.isClosed())await shot('failed-disable').catch(()=>{});}
finally{await writeFile(out+'/disable-validation.json',JSON.stringify(report,null,2));await browser.close();}
