// Native SillyTavern card imports, catalog isolation, image saves and exports.
// Uses tiny local fixtures, an isolated profile and no model/provider calls.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engines=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const base=process.env.ST_REAL_URL;assert(base&&['127.0.0.1','localhost'].includes(new URL(base).hostname),'Use an isolated real SillyTavern profile.');
const out=process.env.ST_ICON_PACK_ARTIFACTS||'/tmp/roleforge-icon-pack-real';await mkdir(out,{recursive:true});
const release=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8')).version;
const npc={id:'shared-id',name:'Saber',roleIcon:'warrior',enabled:true,met:true,occupation:'Knight',identityColor:'#d8be77',stats:{hp:137,level:7},abilities:[{id:'guard',name:'Guard',description:'Hold the line.',proficiency:25}]};
function fixture(title,extensions={}){return{spec:'chara_card_v2',spec_version:'2.0',data:{name:title,description:'Local UI regression fixture',personality:'',scenario:'',mes_example:'',tags:[],first_mes:'<tr-header name="Saber"/><tr-dialogue name="Saber">Ready when you are.</tr-dialogue>',extensions:{tretaresia_rpg_npcs:[structuredClone(npc)],...extensions}}};}
const report={release,testedAt:new Date().toISOString(),cases:[],errors:[],providerCalls:[]};let browser,page;
async function ready(p){
 const mounted=p.waitForFunction(()=>document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation&&document.getElementById('tretaresia-npc-wand-launcher')?.onclick,{},{timeout:120000});
 const welcome=p.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');
 await Promise.race([mounted,welcome.click({timeout:120000})]);await mounted;
 await p.evaluate(()=>{window.__ready=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>__ready=true);});
 await Promise.race([p.waitForFunction(()=>__ready,{},{timeout:120000}),welcome.click({timeout:120000}).then(()=>p.waitForFunction(()=>__ready))]);
 assert.equal(await p.evaluate(()=>TretaresiaRelease),release);
}
async function fresh(){
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage();p.setDefaultTimeout(30000);
 p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(/\/api\/.*\/generate(?:\?|$)/u.test(r.url()))report.providerCalls.push(r.url());});p.on('dialog',d=>d.accept());
 await p.route('**/api/horde/text-models',r=>r.fulfill({json:[]}));await p.route('**/api/horde/status',r=>r.fulfill({json:{ok:false}}));
 await p.goto(base);await ready(p);return{context:c,page:p};
}
async function importCard(p,card){
 const path=out+'/'+card.data.name.replace(/[^\w-]/g,'_')+'.json';await writeFile(path,JSON.stringify(card));
 await p.evaluate(()=>{if(!document.getElementById('rf-catalog-import')){const n=document.createElement('input');n.type='file';n.hidden=true;n.id='rf-catalog-import';document.body.append(n);}});
 await p.locator('#rf-catalog-import').setInputFiles(path);
 await p.evaluate(async()=>{const c=SillyTavern.getContext(),form=new FormData();form.set('file_type','json');form.set('avatar',document.getElementById('rf-catalog-import').files[0]);const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:form}),body=await r.json();if(!r.ok||body.error)throw Error('Native import failed '+JSON.stringify(body));});
}
async function select(p,title){await p.evaluate(async title=>{const h=await import('/script.js');await h.getCharacters();const c=SillyTavern.getContext(),id=c.characters.findIndex(n=>n.name===title);if(id<0)throw Error('Missing fixture '+title);await h.selectCharacterById(String(id));},title);await p.waitForFunction(title=>{const c=SillyTavern.getContext();return c.characters[c.characterId]?.name===title&&Boolean(c.getCurrentChatId?.());},title);}
async function editor(p){
 await p.locator('#tretaresia-npc-wand-launcher').evaluate(n=>n.click());const d=p.locator('dialog.trpg-manager[open]');await d.waitFor();
 if(await d.locator('[data-scope-select]').inputValue()!=='character'){await d.locator('[data-archive-options-toggle]').click();await d.locator('[data-scope-select]').selectOption('character');}
 await d.locator('.trpg-person').first().click();await d.locator('[data-detail] .trpg-detail-actions button').first().click();
 await d.locator('.trpg-custom-icon-picker').evaluate(n=>{for(let p=n;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
 await d.getByRole('button',{name:'Upload custom icon',exact:true}).waitFor({state:'visible'});return d;
}
async function checkCatalog(p,expected){const d=await editor(p);assert.equal(await d.locator('.trpg-servant-gallery').count(),expected?1:0);assert.equal(await d.locator('select[aria-label="Servant icon set"]').count(),expected?1:0);assert.equal((await d.locator('.trpg-custom-icon-picker summary').innerText()).includes('Servant'),expected);if(expected)assert.equal(await d.locator('.trpg-servant-choice').count(),30);return d;}
async function archive(p){return p.evaluate(()=>{const c=SillyTavern.getContext();return structuredClone(c.characters[c.characterId].data.extensions.tretaresia_rpg_npcs);});}
async function save(p,d){await d.locator('[data-npc-save]').click();await p.waitForFunction(()=>document.querySelector('dialog.trpg-manager')?.dataset.view==='detail'&&document.querySelector('dialog.trpg-manager')?.getAttribute('aria-busy')!=='true');await d.locator('[data-close]').click();}
async function shot(p,d,name){await d.locator('.trpg-custom-icon-picker').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+name+'.png'});const bounds=await d.locator('.trpg-custom-icon-picker').evaluate(n=>({l:n.getBoundingClientRect().left,r:n.getBoundingClientRect().right,v:innerWidth,overflow:n.scrollWidth-n.clientWidth}));assert.ok(bounds.l>=-1&&bounds.r<=bounds.v+1&&bounds.overflow<=2,JSON.stringify(bounds));}
try{for(const engine of(process.env.ST_REAL_BROWSERS||'chromium').split(',')){
 browser=await engines[engine].launch({headless:true,...(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}:{})});let session=await fresh();page=session.page;
 const prefix='RF catalog '+engine+' '+Date.now(),titles=Object.fromEntries(['ordinary','legacy','explicit','optout','misleading','archive'].map(k=>[k,prefix+' '+k]));
 const pack=id=>({format:'roleforge-character-pack',version:1,id});
 const cards=[fixture(titles.ordinary,{roleforge_character_pack:pack('forest-world')}),fixture(titles.legacy,{roleforge_character_pack:pack('fate-nasuverse-v3-native')}),fixture(titles.explicit,{roleforge_character_pack:pack('renamed-story'),roleforge_icon_packs:['fate-servant-classes']}),fixture(titles.optout,{roleforge_character_pack:pack('fate-nasuverse-v3-core'),roleforge_icon_packs:[]}),fixture(titles.misleading,{roleforge_character_pack:pack('not-fate')})];
 cards[4].data.name=titles.misleading+=' Fate Nasuverse';
 cards.push(fixture(titles.archive,{roleforge_character_pack:pack('renamed-archive-card'),roleforge_world_archive:{format:'roleforge-world-archive-ref',version:1,archiveId:'fate-nasuverse-archive-v3-test',revision:'not-installed',manifestSha256:'a'.repeat(64),required:false}}));
 for(const card of cards)await importCard(page,card);
 const check={engine,browser:browser.version(),checks:[]};report.cases.push(check);report.sillyTavern=await(await page.request.get(new URL('/version',base).href)).json();
 for(const [key,expected]of[['ordinary',false],['legacy',true],['misleading',false],['explicit',true],['optout',false],['archive',true],['ordinary',false],['legacy',true]]){await select(page,titles[key]);const d=await checkCatalog(page,expected);await d.locator('[data-close]').click();console.log(engine+' '+key+' gallery='+expected);}
 check.checks.push('Six native fixture cards: ordinary/misleading names have no catalog; legacy Fate pack/archive IDs and explicit card marker show it; explicit empty marker disables it. Repeated card switches do not leak the catalog.');
 await select(page,titles.ordinary);let d=await checkCatalog(page,false);const before=await archive(page);
 const png=new URL('../assets/servant-classes/icons/saber.png',import.meta.url).pathname;
 const chooser=page.waitForEvent('filechooser');await d.getByRole('button',{name:'Upload custom icon',exact:true}).click();await(await chooser).setFiles(process.env.ST_GENERIC_ICON_FIXTURE||png);
 await page.waitForFunction(()=>document.querySelector('[name=roleIconImage]')?.value.startsWith('data:image/webp'));
 await shot(page,d,engine+'-ordinary-mobile');await save(page,d);let rows=await archive(page),generic=rows[0].roleIconImage;assert.ok(generic.startsWith('data:image/webp'));const after=structuredClone(rows);delete after[0].roleIconImage;delete after[0].updatedAt;assert.deepEqual(after,before);
 await select(page,titles.legacy);d=await checkCatalog(page,true);assert.ok(!(await archive(page))[0].roleIconImage);await d.locator('.trpg-servant-choice[aria-label=Caster]').click();await page.waitForFunction(()=>document.querySelector('[name=roleIconImage]')?.value.startsWith('data:image/webp'));await shot(page,d,engine+'-fate-mobile');await save(page,d);const fateImage=(await archive(page))[0].roleIconImage;assert.notEqual(fateImage,generic);
 await select(page,titles.ordinary);assert.equal((await archive(page))[0].roleIconImage,generic);d=await checkCatalog(page,false);await d.locator('[data-close]').click();
 check.checks.push('Visible generic upload button opens the native file chooser on an unrelated card; save changes only its image and edit timestamp. Fate class selection saves independently; identical NPC IDs across cards do not mix images.');
 await select(page,titles.explicit);d=await checkCatalog(page,true);await d.locator('[data-close]').click();
 const exported=await page.evaluate(async()=>{const c=SillyTavern.getContext(),r=await fetch('/api/characters/export',{method:'POST',headers:c.getRequestHeaders(),body:JSON.stringify({avatar_url:c.characters[c.characterId].avatar,format:'json'})});if(!r.ok)throw Error('Export failed');return r.json();});assert.deepEqual(exported.data.extensions.roleforge_icon_packs,['fate-servant-classes']);await writeFile(out+'/'+engine+'-exported-card.json',JSON.stringify(exported));
 await page.reload();await ready(page);await select(page,titles.ordinary);assert.equal((await archive(page))[0].roleIconImage,generic);d=await checkCatalog(page,false);
 if(engine==='chromium'){await page.setViewportSize({width:1440,height:1000});await shot(page,d,engine+'-ordinary-desktop');await d.locator('[data-close]').click();await select(page,titles.legacy);d=await checkCatalog(page,true);await shot(page,d,engine+'-fate-desktop');}
 await d.locator('[data-close]').click();await session.context.close();session=await fresh();page=session.page;exported.data.name=prefix+' portable';await importCard(page,exported);await select(page,exported.data.name);d=await checkCatalog(page,true);await d.locator('[data-close]').click();
 check.checks.push('Reload preserves card isolation and saved generic art. Native export/reimport into a fresh browser context preserves the explicit catalog marker. Mobile 390px screenshots use actual SillyTavern UI.');
 if(engine==='chromium')check.checks.push('Desktop 1440px catalog and generic-image editor screenshots fit the actual SillyTavern window.');
 await session.context.close();await browser.close();browser=null;console.log(engine+' passed');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.providerCalls,[]);report.status='PASS';await writeFile(out+'/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){report.status='FAIL';report.failure=error.stack;if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.html',await page.content());}await writeFile(out+'/validation-failed.json',JSON.stringify(report,null,2));throw error;}finally{if(browser)await browser.close();}
