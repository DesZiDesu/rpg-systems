import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const base = 'http://127.0.0.1:18182';
const out = process.env.DN_ARTIFACTS || '/workspace/artifacts/death-note-identity-v0.82.1';
const DRAFT = 'DEATH_NOTE_CLOSE_UNSENT_DRAFT';
const names = ['Elias Voss', 'Mara Hale', 'Silas Vale', 'Ada North'];
const deferred = () => {let resolve; const promise = new Promise(r => {resolve = r;}); return {promise, resolve};};
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage']});
const report = {realSillyTavern: true, liveModel: false, controlledDelayedSSE: true, theme: 'Dark Lite', devices: [], errors: []};
let p, device, mode, calls=0, expectedName=names[0];
const book = () => p.locator('#roleforge-death-note-preview');
const dock = () => p.locator('#roleforge-death-note-dock');
const press = locator => device === 'mobile' ? locator.tap() : locator.click();

async function ready() {
    await p.waitForFunction(() => document.getElementById('tretaresia-rpg-settings')?.rfSettingsNavigation && globalThis.RoleForgeWorkshop, {}, {timeout: 120000});
    await p.evaluate(() => {
        window.__dnCloseReady = false;
        const c = SillyTavern.getContext();
        c.eventSource.on(c.eventTypes.APP_READY, () => {window.__dnCloseReady = true;});
    });
    const loaded = p.waitForFunction(() => window.__dnCloseReady, {}, {timeout: 120000});
    const welcome = p.locator('dialog.popup').filter({hasText: 'Welcome to SillyTavern!'}).locator('.popup-button-ok');
    await Promise.race([loaded, welcome.click({timeout: 120000}).then(() => loaded)]);
}

function fixture(title) {
    const card={spec: 'chara_card_v2', spec_version: '2.0', data: {
        name: title, description: 'Independent fictional adult thriller test. Every character is over 30.',
        personality: '', scenario: '', mes_example: '',
        first_mes: '<tr-narrative>คุณอยู่ในห้องทำงาน มีสมุดปกดำอยู่บนโต๊ะ คุณยังไม่เคยพบคนในรายงานและยังไม่เคยเห็นใบหน้า</tr-narrative>',
        extensions: {
            roleforge_death_note: {format: 'roleforge-death-note-rules', version: 1, knownFaces: Object.fromEntries(names.map((_, i) => ['person-' + i, false]))},
            roleforge_character_pack: {format: 'roleforge-character-pack', version: 1,
                systems: {autoTrack: true, enableMemorySummaries: false, eventNotifications: false},
                initialState: {
                    player: {name: 'Nox', age: '34'},
                    inventory: [{id: 'death-note-book', name: 'Death Note', quantity: 1, category: 'Artifact', properties: ['roleforge:addon:death-note']}],
                    npcs: names.map((name, i) => ({id: 'person-' + i, name, age: '36', race: 'Human', met: false, enabled: false, stats: {hp: 100}})),
                    worldClock: {day: 1, time: '20:15'}, location: {place: 'ห้องทำงาน', region: 'Tokyo', continent: 'Japan', narrativeVersion: 1},
                    onboarding: {identitySeeded: true, locationSeeded: true, loadoutSeeded: true}
                }
            }
        }
    }};
    if(device==='mobile'){const e=card.data.extensions;e.tretaresia_rpg_npcs=e.roleforge_character_pack.initialState.npcs;e.roleforge_character_pack.initialState.npcs=[];}
    return card;
}

async function prepare() {
    console.log('Loading SillyTavern', device);
    await p.goto(base); await ready();
    console.log('Host ready', device);
    report.roleForgeVersion = await p.evaluate(() => globalThis.TretaresiaRelease);
    report.hostVersion = await (await p.request.get(base + '/version')).json();
    await p.selectOption('#themes', 'Dark Lite', {force: true});
    await p.selectOption('#tretaresia-rpg-language', device==='mobile'?'en':'th', {force: true});
    const title = 'Death Note identity regression · ' + device + ' · ' + Date.now();
    await p.evaluate(async card => {
        const c = SillyTavern.getContext(), f = new FormData();
        f.set('file_type', 'json'); f.set('avatar', new File([JSON.stringify(card)], 'death-note-close.json', {type: 'application/json'}));
        const r = await fetch('/api/characters/import', {method: 'POST', headers: c.getRequestHeaders({omitContentType: true}), body: f});
        if (!r.ok || (await r.json()).error) throw Error('Card import failed');
        const host = await import('/script.js'); await host.getCharacters();
        await host.selectCharacterById(String(c.characters.findIndex(v => v.name === card.data.name)));
    }, fixture(title));
    await p.waitForFunction(() => RoleForgeWorkshop.debug().key.endsWith('::' + SillyTavern.getContext().getCurrentChatId()));
    await p.locator('#send_textarea').fill('');
    await p.evaluate(() => RoleForgeWorkshop.open());
    const ws = p.locator('#roleforge-workshop');
    await ws.locator('[data-ws-search]').fill('Death Note');
    await press(ws.locator('[data-ws-action=detail][data-id=death-note]'));
    for (const action of ['update', 'install']) {
        const button = ws.locator('[data-ws-action=' + action + '][data-id=death-note]');
        if (await button.count()) await press(button);
    }
    await ws.locator('[data-ws-enable=death-note]').check();
    await p.waitForFunction(() => RoleForgeWorkshop.debug().enabled.includes('death-note'));
    await press(ws.locator('[data-ws-action=open-addon][data-id=death-note]'));
    await book().waitFor({state: 'visible'});
    await backend();
    console.log('Notebook ready', device);
    return title;
}

async function backend() {
    await p.evaluate(async () => {
        const host = await import('/script.js'), o = await import('/scripts/openai.js');
        host.changeMainAPI('openai');
        Object.assign(o.oai_settings, {chat_completion_source: 'custom', custom_url: 'http://127.0.0.1:18182/death-note-controlled-fixture', custom_model: 'death-note-close', stream_openai: true, openai_max_context: 32768, openai_max_tokens: 1600});
        host.setOnlineStatus('Death Note controlled close regression');
    });
}

async function send(text,nextMode){
 mode=nextMode;const before=calls;await p.evaluate(()=>window.__dnIdentityReply=false);
 await p.locator('#send_textarea').fill(text);await press(p.locator('#send_but'));
 await p.waitForFunction(()=>!document.querySelector('#send_form')?.classList.contains('stop_generate'),{}, {timeout:45000});
 await p.waitForFunction(()=>globalThis.__dnIdentityReply===true,{}, {timeout:45000});
 await p.evaluate(()=>window.__dnIdentityReply=false);
 assert.equal(calls,before+1,'one request for an actual player Send');
 await p.waitForTimeout(1500);
}
async function count(){return p.evaluate(()=>({users:SillyTavern.getContext().chat.filter(m=>m.is_user).length,total:SillyTavern.getContext().chat.length}));}
async function write(surface,name){
 const sheet=surface.locator('[data-dn-paper]'),box=await sheet.boundingBox(),used=await sheet.locator('[data-paper-block]').count(),position={x:Math.min(40,box.width*.15),y:box.height*(used?.65:.12)};
 if(device==='mobile')await sheet.tap({position});else await sheet.click({position});
 await surface.locator('.is-selected textarea').fill(name);
 // Intentionally leave the text editor selected. Neither move confirmation nor
 // the notebook Continue button is required to submit a later native Send.
}
try{
 for(const mobile of [false,true]){
  device=mobile?'mobile':'desktop';calls=0;expectedName=names[0];
  const ctx=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile});
  p=await ctx.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>{if(mode==='inscription-fail'&&e.message==='Got response status 503'){(report.expectedFailures||=[]).push({device,error:e.message});return;}report.errors.push({device,error:e.message});});
  await p.route('**/api/horde/**',r=>r.fulfill({json:[]}));
  await p.route('**/api/backends/chat-completions/generate',async route=>{
   calls++;const messages=route.request().postDataJSON().messages.map(m=>typeof m.content==='string'?m.content:JSON.stringify(m.content)).join('\n');let text;
   if(mode==='news'){
    assert(!/INSCRIPTION: /.test(messages));
    text='<tr-narrative>'+(mobile?'You read the news report identifying the suspect as Elias Voss. His clear photograph shows his face on the screen.':'คุณเปิดข่าวอ่าน รายงานระบุชื่อคนร้ายว่า Elias Voss และแสดงภาพถ่ายใบหน้าของเขาให้คุณเห็นชัดเจน')+'</tr-narrative>';
   }else if(mode==='inscription'||mode==='inscription-fail'){
    const requests=[...messages.matchAll(/INSCRIPTION: (\{[^\n]+\})/gu)].map(m=>JSON.parse(m[1]));assert(requests.length,'written paper must be staged before the native request');
    const unique=[...new Map(requests.map(r=>[r.id,r])).values()];assert.equal(unique.length,1);const r=unique[0];assert.equal(r.name,expectedName);assert.equal(r.faceKnown,true);assert.equal(r.trigger,'next-reply');
    if(mode==='inscription-fail'){await route.fulfill({status:503,json:{error:{message:'Controlled next-reply failure'}}});return;}
    const evidence=r.name+' has died after forty seconds.';
    text='<tr-narrative>'+evidence+'</tr-narrative><!--roleforge_death_note:'+JSON.stringify({requestId:r.id,status:'resolved',elapsedSeconds:40,evidence})+'-->';
   }else{assert(!/INSCRIPTION: /.test(messages));text='<tr-narrative>คุณรอดูรายงานข่าวฉบับต่อไปในห้องทำงาน</tr-narrative>';}
   await route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{index:0,delta:{content:text},finish_reason:null}]})+'\n\ndata: [DONE]\n\n'});
  });
  const title=await prepare();await p.evaluate(()=>{const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.GENERATION_ENDED,()=>window.__dnIdentityReply=true);});
  await press(book().locator('[data-dn-action=close]'));
  assert.equal((await p.evaluate(()=>RoleForgeDeathNote.world())).claims['person-0'],undefined);
  await send('ฉันเปิดข่าวคดีฆาตกรรม ดูชื่อและภาพถ่ายของคนร้าย','news');
  await p.waitForFunction(()=>RoleForgeDeathNote.world().claims['person-0']?.name==='Elias Voss'&&RoleForgeDeathNote.world().faces['person-0']);
  const identity=await p.evaluate(()=>({world:RoleForgeDeathNote.world(),state:SillyTavern.getContext().chatMetadata.tretaresia_rpg_state}));
  assert.equal(identity.state.npcs.find(n=>n.id==='person-0')?.met??identity.state.npcScopes?.overrides?.['person-0']?.met??false,false);
  await p.locator('#tretaresia-npc-wand-launcher').evaluate(n=>n.click());
  const manager=p.locator('dialog.trpg-manager[open]');
  await manager.locator('[data-archive-options-toggle]').click();
  await manager.locator('[data-scope-select]').selectOption(mobile?'character':'chat');
  await manager.locator('[data-search]').fill('Elias Voss');
  await manager.locator('.trpg-person').filter({hasText:'Elias Voss'}).first().waitFor();
  await manager.locator('[data-close]').click();
  await p.evaluate(()=>RoleForgeDeathNote.open('write'));await write(book(),names[0]);
  const prior=calls;await press(book().locator('[data-dn-action=close]'));await p.waitForTimeout(450);assert.equal(calls,prior,'typing and closing do not call AI');
  // A page turn before sending must not lose pending ink on an earlier page.
  await p.evaluate(()=>RoleForgeDeathNote.open('write'));await press(book().locator('[data-dn-action=paper-next]').first());await p.waitForFunction(()=>!RoleForgeDeathNote.debug().working);await press(book().locator('[data-dn-action=close]'));
  const before=await count();await send('ฉันนั่งอ่านข่าวต่อและรอดูว่าเกิดอะไรขึ้น',mobile?'inscription-fail':'inscription');
  if(mobile){
   assert.equal((await p.evaluate(()=>RoleForgeDeathNote.records())).length,1);assert.equal((await p.evaluate(()=>RoleForgeDeathNote.records()))[0].status,'waiting');
   mode='inscription';await p.evaluate(()=>SillyTavern.getContext().generate('normal',{}));await p.waitForTimeout(1500);
  }
  await p.waitForFunction(()=>RoleForgeDeathNote.records().some(e=>e.name==='Elias Voss'&&e.status==='resolved'));
  const after=await count();assert.deepEqual(after,{users:before.users+1,total:before.total+2},'only the real Send and its assistant reply were added');
  const prefix=await p.evaluate(async count=>{const c=SillyTavern.getContext(),base='/scripts/extensions/third-party/rpg-systems/src/workshop/death-note/',core=await import(base+'core.js?v='+TretaresiaRelease),paper=await import(base+'paper.js?v='+TretaresiaRelease),chat=c.chat.slice(0,count);return{entries:core.ledger(chat).length,paper:paper.readPaper(chat,'death-note-book')};},before.total);
  assert.equal(prefix.entries,0,'a branch before the actual Send has no deferred request from its future');assert.equal(prefix.paper.pages[0].blocks[0]?.submittedText||'','');
  const outcome=await p.evaluate(()=>({records:RoleForgeDeathNote.records(),state:SillyTavern.getContext().chatMetadata.tretaresia_rpg_state,paper:RoleForgeDeathNote.debug().paper}));
  assert.equal(outcome.records.length,1);assert.equal((outcome.state.npcs.find(n=>n.id==='person-0')?.stats.hp??outcome.state.npcScopes?.overrides?.['person-0']?.stats?.hp),0);assert.equal(outcome.paper.pages[0].blocks[0].text,'Elias Voss');assert.equal(outcome.paper.pages[0].blocks[0].submittedText,'Elias Voss');
  await p.evaluate(()=>RoleForgeDeathNote.open('write'));await press(book().locator('[data-dn-action=paper-prev]').first());await p.waitForFunction(()=>!RoleForgeDeathNote.debug().working);await p.screenshot({path:out+'/'+device+'-written-paper.png'});await press(book().locator('[data-dn-action=dock]'));await p.screenshot({path:out+'/'+device+'-chatbar.png'});
  await send('ฉันจดจ่อกับข่าวฉบับถัดไป','ordinary');assert.equal((await p.evaluate(()=>RoleForgeDeathNote.records())).length,1);
  expectedName=names[1];await write(dock(),expectedName);
  const dockBefore=await count();await send('ฉันอ่านข่าวที่ระบุชื่อ Mara Hale และเห็นภาพถ่ายใบหน้าชัดเจนแล้ว จากนั้นฉันรอดูข่าวต่อ','inscription');
  await p.waitForFunction(()=>RoleForgeDeathNote.records().some(e=>e.name==='Mara Hale'&&e.status==='resolved'));
  assert.deepEqual(await count(),{users:dockBefore.users+1,total:dockBefore.total+2});
  assert.equal((await p.evaluate(()=>RoleForgeDeathNote.records())).length,2);
  report.devices.push({device,branchBeforeSendHasNoFutureInscription:true,chatbarNoConfirm:true,latestUserFaceEvidence:true,mobileTouchEmulation:mobile,archivedNpc:mobile,retryAfterFailedNormalReply:mobile,newsNameAndPhotoWithoutMet:true,npcManagementReportedName:true,noConfirmNeeded:true,earlierPageInkProcessed:true,noCallWhileTyping:true,oneNormalReply:true,noSyntheticUser:true,realHPUpdated:true,noDuplicateNextReply:true,inkPreserved:true});
  await p.reload();await ready();await p.evaluate(async title=>{const c=SillyTavern.getContext(),host=await import('/script.js');await host.getCharacters();await host.selectCharacterById(String(c.characters.findIndex(v=>v.name===title)));await RoleForgeWorkshop.ready();},title);
  await p.waitForFunction(()=>globalThis.RoleForgeDeathNote?.debug().enabled&&RoleForgeDeathNote.world().claims['person-0']?.name==='Elias Voss');
  assert.equal((await p.evaluate(()=>RoleForgeDeathNote.records())).length,2);assert.equal((await p.evaluate(()=>RoleForgeDeathNote.records()))[0].status,'resolved');report.devices.at(-1).reloadPersists=true;
  await ctx.close();console.log('PASS identity and next reply',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.failure=error.stack;console.error(error);process.exitCode=1;if(p&&!p.isClosed()){await p.screenshot({path:out+'/failed.png'});await writeFile(out+'/debug.json',JSON.stringify(await p.evaluate(()=>({chat:SillyTavern.getContext().chat,metadata:SillyTavern.getContext().chatMetadata,debug:globalThis.RoleForgeDeathNote?.debug(),world:globalThis.RoleForgeDeathNote?.world()})),null,2));}}
finally{await writeFile(out+'/validation.json',JSON.stringify(report,null,2));await browser.close();}
