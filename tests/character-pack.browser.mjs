// Actual loader and UI, declarative card data, mocked card-save endpoint.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {oneCardFixture} from './fixtures/one-card.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const card=process.env.ROLEFORGE_CHARACTER_CARD?JSON.parse(await readFile(process.env.ROLEFORGE_CHARACTER_CARD,'utf8')):oneCardFixture();
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{try{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!path.startsWith(base)||path.includes('..')){res.writeHead(404).end();return;}
    const file=path.slice(base.length),body=await readFile(new URL(file,root));
    res.setHeader('content-type',file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.json')?'application/json':file.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}${base}docs/previews/preview-h-stats.html?lang=en`;
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',route=>route.abort());
        await page.addInitScript(()=>localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:{language:'en',autoContinuity:false,autoTrack:false,enableMemorySummaries:false}})));
        await page.goto(url);await page.waitForFunction(()=>window.hStatsPreview?.ready);await page.waitForSelector('#roleforge-character-pack',{state:'attached'});
        await page.evaluate(async card=>{
            document.querySelector('#tretaresia-rpg-close').click();document.querySelector('.preview-host').style.display='none';document.querySelector('#extensions_settings2').style.display='block';document.querySelector('#tretaresia-rpg-settings .inline-drawer-content').style.display='block';
            window.host.characters=[{avatar:'one-card.png',name:card.data.name,data:structuredClone(card.data),json_data:JSON.stringify(card)}];window.host.characterId=0;window.host.groupId=null;
            window.cardRequests=[];window.host.fetch=async(url,options)=>{window.cardRequests.push(JSON.parse(options.body));return{ok:!window.cardSaveFails,status:window.cardSaveFails?503:200};};
            await window.hStatsPreview.switchChat('one-card-new',{});
            document.querySelectorAll('#tretaresia-rpg-settings details').forEach(node=>node.open=true);
        },card);
        await page.waitForFunction(n=>document.querySelectorAll('#roleforge-power-editor [data-power-id]').length===n,card.data.extensions.roleforge_character_pack.powerPreset.definitions.length);
        assert.equal(await page.locator('#roleforge-forge-editor input').evaluateAll((inputs,data)=>inputs.some(input=>input.value===data.extensions.roleforge_character_pack.forgePreset.origins[0]),card.data),true);
        const pack=page.locator('#roleforge-character-pack'),save=pack.locator('[data-pack-save]');
        assert.equal(await pack.locator('[data-pack-seed]').isChecked(),false);assert.equal(await save.isEnabled(),true);
        await save.click();await page.waitForFunction(()=>document.querySelector('[data-pack-status]').textContent.includes('Saved.'));
        const saved=await page.evaluate(()=>window.host.characters[0].data.extensions);
        assert.equal(saved.tretaresia_rpg_lore.length,card.data.extensions.tretaresia_rpg_lore.length);assert.equal(saved.tretaresia_rpg_npcs.length,card.data.extensions.tretaresia_rpg_npcs.length);
        assert.deepEqual(saved.roleforge_character_pack.initialState,card.data.extensions.roleforge_character_pack.initialState);
        assert.equal(await page.evaluate(()=>window.cardRequests.length),1,'one atomic save, no AI');
        const previous=await page.evaluate(()=>window.host.characters[0].json_data);
        await page.evaluate(()=>window.cardSaveFails=true);await save.click();await page.waitForFunction(()=>document.querySelector('[data-pack-status]').textContent.includes('503'));
        assert.equal(await page.evaluate(()=>window.host.characters[0].json_data),previous,'failed save leaves export data unchanged');
        await page.evaluate(()=>{
            window.cardSaveFails=false;
            const old=window.host.characters[0].data.extensions.roleforge_character_pack;
            window.host.characters[0].data.extensions.roleforge_character_pack={...old,initialState:{...old.initialState,contacts:[{name:'Private old contact'}],commerce:{sessions:[{id:'old-trade'}]}}};
        });
        await pack.locator('[data-pack-seed]').check();await save.click();await page.waitForFunction(()=>document.querySelector('[data-pack-status]').textContent.includes('Saved.'));
        const template=await page.evaluate(()=>window.host.characters[0].data.extensions.roleforge_character_pack.initialState);
        assert.equal(template.contacts,undefined);assert.equal(template.commerce,undefined);
        const update=await page.evaluate(()=>window.cardRequests.at(-1).data.extensions.roleforge_character_pack.initialState);
        assert.equal(update.contacts,'__@@UNSET@@__');assert.equal(update.commerce,'__@@UNSET@@__');assert.equal(JSON.stringify(update).includes('Private old contact'),false);
        // A card exported via native JSON retains the pack when imported as a
        // different avatar, without any separate preset/archive imports.
        await page.evaluate(async()=>{
            const exported=JSON.parse(window.host.characters[0].json_data);window.cardSaveFails=false;
            window.host.characters.push({avatar:'reimported.png',name:exported.data.name,data:exported.data,json_data:JSON.stringify(exported)});window.host.characterId=1;
            await window.hStatsPreview.switchChat('reimported-new',{});document.querySelectorAll('#tretaresia-rpg-settings details').forEach(node=>node.open=true);
        });
        await page.waitForFunction(n=>document.querySelectorAll('#roleforge-power-editor [data-power-id]').length===n,card.data.extensions.roleforge_character_pack.powerPreset.definitions.length);
        await page.evaluate(async()=>{window.host.groupId='group';await window.hStatsPreview.switchChat('group',{});});assert.equal(await save.isDisabled(),true,'no single-card setup applied to group chats');
        const overflow=await pack.evaluate(node=>node.scrollWidth>node.clientWidth+1);assert.equal(overflow,false,'native pack drawer fits the viewport');
        assert.deepEqual(errors,[]);console.log(`PASS ${width}px: one-card Powers/Forge/archives, native setup drawer, atomic save, failure protection, exported-card reimport and group exclusion`);await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
