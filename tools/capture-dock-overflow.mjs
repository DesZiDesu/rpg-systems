// Read-only captures from the native SillyTavern test profile.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18180',out=process.env.DOCK_ARTIFACTS||'/workspace/artifacts/dock-overflow-review',release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}),report={source:'Actual SillyTavern read-only captures',calls:0,errors:[],layouts:[]};let p;
async function ready(){await p.waitForFunction(()=>document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation&&document.getElementById('tretaresia-npc-wand-launcher')?.onclick,{},{timeout:120000});await p.evaluate(()=>{window.__weaponReady=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>__weaponReady=true);});const loaded=p.waitForFunction(()=>__weaponReady,{},{timeout:120000}),welcome=p.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');await Promise.race([loaded,welcome.click({timeout:120000}).then(()=>loaded)]);assert.equal(await p.evaluate(()=>TretaresiaRelease),release);}
async function importCard(card){const path=out+'/'+card.data.name.replace(/\W/gu,'_')+'.json';await writeFile(path,JSON.stringify(card));await p.evaluate(()=>{if(!document.getElementById('weapon-import')){const n=document.createElement('input');n.type='file';n.id='weapon-import';n.hidden=true;document.body.append(n);}});await p.locator('#weapon-import').setInputFiles(path);await p.evaluate(async()=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',document.getElementById('weapon-import').files[0]);const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),result=await r.json();if(!r.ok||result.error)throw Error(JSON.stringify(result));await(await import('/script.js')).getCharacters();});}
async function select(title){await p.evaluate(async title=>{const h=await import('/script.js');await h.selectCharacterById(String(SillyTavern.getContext().characters.findIndex(c=>c.name===title)));},title);await p.waitForFunction(()=>!!SillyTavern.getContext().getCurrentChatId?.());await p.waitForTimeout(600);}
async function drawer(){if(!await p.locator('#rm_extensions_block').isVisible())await p.locator('#extensions-settings-button .drawer-toggle').click();if(!await p.locator('#tretaresia-rpg-settings .inline-drawer-content').isVisible())await p.locator('#tretaresia-rpg-settings .inline-drawer-toggle').click();await p.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.open('weapons',{direct:true}));}
async function closeDrawer(){if(await p.locator('#rm_extensions_block').isVisible())await p.locator('#extensions-settings-button .drawer-toggle').click();}


async function activate(id){await p.locator('[data-dock-picker]').selectOption(id);await p.waitForTimeout(120);await p.evaluate(()=>{document.querySelector('.rf-composer-dock').scrollTop=0;document.activeElement?.blur();toastr?.clear();});}
try{
 for(const desktop of [false,true]){
  const device=desktop?'desktop':'mobile';p=await b.newPage({viewport:{width:desktop?1440:390,height:desktop?1000:844},isMobile:!desktop,hasTouch:!desktop,deviceScaleFactor:desktop?1:1.5,reducedMotion:'reduce'});p.on('pageerror',e=>report.errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/api/horde/text-models',r=>r.fulfill({json:[]}));await p.route('**/api/horde/status',r=>r.fulfill({json:{ok:false}}));await p.route('**/api/backends/chat-completions/generate',r=>{report.calls++;return r.abort();});
  await p.goto(base);await ready();await p.selectOption('#themes','Dark Lite',{force:true});
  for(const kind of ['buy','sell','auction']){
   const title=await p.evaluate(prefix=>SillyTavern.getContext().characters.map(c=>c.name).filter(n=>n.startsWith(prefix)).sort().at(-1),'Dock Overflow '+device+' '+kind+' ');assert(title);await select(title);await p.waitForTimeout(500);await p.evaluate(async()=>{(await import('/script.js')).setOnlineStatus('Preview');});
   await activate('inventory');await p.locator('[data-utility-item=potion]').click();await p.locator('.rf-item-panel').waitFor();const before=await p.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state));await p.locator('#send_textarea').fill('');
   await activate('missions');await p.screenshot({path:out+'/'+device+'-'+kind+'-mission.png'});await p.locator('.rf-composer-dock').screenshot({path:out+'/'+device+'-'+kind+'-mission-dock.png'});if(kind==='buy'){await p.locator('.rf-utility-missions').screenshot({path:out+'/'+device+'-mission-panel.png'});await p.locator('[data-mission-details] summary').click();await p.locator('.rf-composer-dock').screenshot({path:out+'/'+device+'-mission-expanded.png'});await p.locator('[data-mission-details] summary').click();}
   await activate('commerce');assert(await p.locator('.rf-commerce-composer[data-kind='+kind+']').isVisible());await p.screenshot({path:out+'/'+device+'-'+kind+'.png'});await p.locator('.rf-composer-dock').screenshot({path:out+'/'+device+'-'+kind+'-dock.png'});await p.locator('.rf-dock-navigation').screenshot({path:out+'/'+device+'-'+kind+'-tabs.png'});
   if(kind==='auction'){
    const picker=p.locator('[data-dock-picker]');await picker.focus();await p.keyboard.press('Space');await p.waitForTimeout(180);await p.screenshot({path:out+'/'+device+'-all-windows.png'});await p.keyboard.press('Escape');
   }
   const m=await p.locator('.rf-dock-tabs').evaluate(n=>({width:n.clientWidth,contentWidth:n.scrollWidth,panels:n.querySelectorAll('[role=tab]').length,right:n.getBoundingClientRect().right,controlLeft:document.querySelector('.rf-dock-controls').getBoundingClientRect().left}));assert(m.right<=m.controlLeft);report.layouts.push({device,kind,...m});assert.equal(await p.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state)),before);
  }
  await p.close();
 }
 assert.equal(report.calls,0);assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await writeFile(out+'/capture-validation.json',JSON.stringify(report,null,2));await b.close();}
