import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18180',out=process.env.UTILITY_ARTIFACTS||'/workspace/artifacts/utility-dock-preview',release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url))).version;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const names=(await readdir(out)).filter(n=>/^Utility_Preview_\d+\.json$/.test(n));const files=await Promise.all(names.map(async n=>({n,time:(await stat(out+'/'+n)).mtimeMs})));files.sort((a,b)=>b.time-a.time);const title=JSON.parse(await readFile(out+'/'+files[0].n)).data.name;
const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}),report={errors:[],modelRequests:0,title,missionLayouts:[]},ext='/scripts/extensions/third-party/rpg-systems/';let p;
async function ready(){await p.waitForFunction(()=>document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation&&document.getElementById('tretaresia-npc-wand-launcher')?.onclick,{},{timeout:120000});await p.evaluate(()=>{window.__weaponReady=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>__weaponReady=true);});const loaded=p.waitForFunction(()=>__weaponReady,{},{timeout:120000}),welcome=p.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');await Promise.race([loaded,welcome.click({timeout:120000}).then(()=>loaded)]);assert.equal(await p.evaluate(()=>TretaresiaRelease),release);}
async function importCard(card){const path=out+'/'+card.data.name.replace(/\W/gu,'_')+'.json';await writeFile(path,JSON.stringify(card));await p.evaluate(()=>{if(!document.getElementById('weapon-import')){const n=document.createElement('input');n.type='file';n.id='weapon-import';n.hidden=true;document.body.append(n);}});await p.locator('#weapon-import').setInputFiles(path);await p.evaluate(async()=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',document.getElementById('weapon-import').files[0]);const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),result=await r.json();if(!r.ok||result.error)throw Error(JSON.stringify(result));await(await import('/script.js')).getCharacters();});}
async function select(title){await p.evaluate(async title=>{const h=await import('/script.js');await h.selectCharacterById(String(SillyTavern.getContext().characters.findIndex(c=>c.name===title)));},title);await p.waitForFunction(()=>!!SillyTavern.getContext().getCurrentChatId?.());await p.waitForTimeout(600);}
async function drawer(){if(!await p.locator('#rm_extensions_block').isVisible())await p.locator('#extensions-settings-button .drawer-toggle').click();if(!await p.locator('#tretaresia-rpg-settings .inline-drawer-content').isVisible())await p.locator('#tretaresia-rpg-settings .inline-drawer-toggle').click();await p.evaluate(()=>document.getElementById('tretaresia-rpg-settings').rfSettingsNavigation.open('weapons',{direct:true}));}
async function closeDrawer(){if(await p.locator('#rm_extensions_block').isVisible())await p.locator('#extensions-settings-button .drawer-toggle').click();}
const manager=()=>p.locator('#roleforge-weapon-manager[open]'),dock=()=>p.locator('.rf-weapon-composer');
async function openPanel(){await p.waitForFunction(()=>document.getElementById('rf-dock-panel-weapons')?.isConnected);if(await p.locator('[data-dock-panel=weapons]').count())await p.locator('[data-dock-panel=weapons]').click();else if(!await dock().isVisible())await p.locator('.rf-dock-collapse').click();await dock().waitFor();await p.waitForTimeout(100);}
async function settings(){await openPanel();await dock().locator('[data-weapon-config]').click();await manager().waitFor();}
async function save(){await manager().locator('[type=submit]').click();await p.waitForFunction(()=>!document.getElementById('roleforge-weapon-manager').open);await p.waitForTimeout(150);}
async function choose(id){await settings();await manager().locator('[name=item]').selectOption(id);await manager().locator('[name=equip]').check();await save();await openPanel();await p.waitForFunction(()=>[...document.querySelectorAll('.rf-weapon-composer img')].every(n=>n.complete&&n.naturalWidth));}

try{
 for(const desktop of [false,true]){
  const device=desktop?'desktop':'mobile';p=await b.newPage({viewport:{width:desktop?1440:390,height:desktop?1000:844},isMobile:!desktop,hasTouch:!desktop,deviceScaleFactor:desktop?1:1.5,reducedMotion:'reduce'});p.on('pageerror',e=>report.errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/api/horde/text-models',r=>r.fulfill({json:[]}));await p.route('**/api/horde/status',r=>r.fulfill({json:{ok:false}}));await p.route('**/api/backends/chat-completions/generate',r=>{report.modelRequests++;return r.abort();});
  await p.goto(base);await ready();await select(title);await p.waitForTimeout(900);await drawer();await p.selectOption('#tretaresia-rpg-language','th',{force:true});await closeDrawer();await p.evaluate(async()=>{(await import('/script.js')).setOnlineStatus('Preview');});
  const before=await p.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state));
  await mkdir(out+'/frames',{recursive:true});let frame=0;
  for(const id of ['inventory','missions','hstats']){
   await p.locator(`[data-dock-panel=${id}]`).click();const panel=p.locator('.rf-utility-'+id);await panel.waitFor();if(id==='inventory')await panel.locator('[data-utility-search]').fill('');if(id==='hstats')await panel.locator('[data-utility-person]').selectOption('mira');
   await p.evaluate(()=>{document.querySelector('.rf-composer-dock').scrollTop=0;document.activeElement?.blur();toastr?.clear();});await p.waitForTimeout(150);
   await p.screenshot({path:out+'/'+device+'-'+id+'.png'});await panel.screenshot({path:out+'/'+device+'-'+id+'-panel.png'});
   if(id==='missions'){const metrics=await panel.evaluate(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,overflow:n.scrollWidth>n.clientWidth+1}));assert(!metrics.overflow);assert(metrics.height<340,JSON.stringify(metrics));report.missionLayouts.push({device,...metrics});await panel.locator('[data-mission-details] summary').click();assert(await panel.locator('.rf-utility-objectives').isVisible());await panel.screenshot({path:out+'/'+device+'-missions-expanded-panel.png'});await panel.locator('[data-mission-details] summary').click();await p.evaluate(()=>document.querySelector('.rf-composer-dock').scrollTop=0);await p.waitForTimeout(100);}

   if(!desktop)for(let i=0;i<12;i++){await p.screenshot({path:out+'/frames/'+String(frame++).padStart(3,'0')+'.png',clip:{x:0,y:204,width:390,height:640}});await p.waitForTimeout(100);}
  }
  assert.equal(await p.evaluate(()=>JSON.stringify(SillyTavern.getContext().chatMetadata.tretaresia_rpg_state)),before);await p.close();
 }
 assert.equal(report.modelRequests,0);assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await writeFile(out+'/capture-validation.json',JSON.stringify(report,null,2));await b.close();}
