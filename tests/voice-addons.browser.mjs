// Production loader, native dialogue rendering, real browser Audio / IndexedDB.
// Provider replies and waveform are local fixtures; no paid requests are made.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {testMp3Base64} from '../docs/previews/voice-test-audio.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=new URL('../',import.meta.url),base='/scripts/extensions/third-party/rpg-systems/';
const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('[]');return;}
    if(!url.pathname.startsWith(base)||url.pathname.includes('..')){res.writeHead(404).end();return;}
    const path=url.pathname.slice(base.length),body=await readFile(new URL(path,root));res.setHeader('content-type',path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.js')?'text/javascript':'image/webp');res.end(body);
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const artifacts=new URL(process.env.VOICE_SCREENSHOT_DIR?process.env.VOICE_SCREENSHOT_DIR.replace(/\/?$/u,'/'):'docs/previews/voice-v0550/',root);await mkdir(artifacts,{recursive:true});
let browser;
try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [320,390,1280]){
        const page=await browser.newPage({viewport:{width,height:950},hasTouch:width<600,reducedMotion:'reduce'}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
        await page.goto(`http://127.0.0.1:${server.address().port}${base}docs/previews/voice-addon.html?lang=th&addon=voice&review=1`);
        await page.waitForFunction(()=>window.voicePreview?.ready&&document.querySelectorAll('.trpg-dialogue').length===2);
        const toggle=page.locator('[data-optional-setting="enableVoiceAddon"]'),memory=page.locator('[data-optional-setting="enableMemorySummaries"]');
        assert.equal(await toggle.isChecked(),false);assert.equal(await memory.isChecked(),false);
        assert.equal(await page.locator('.trpg-dialogue .rf-voice-play').count(),0);assert.equal(await page.locator('#roleforge-voice-addons').isVisible(),false);
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.length),0);
        await page.evaluate(()=>window.navigationSummaryPreview.openSettings());await toggle.check();
        const panel=page.locator('[data-voice-panel]'),drawer=page.locator('#roleforge-voice-addons>details');
        assert.equal(await drawer.evaluate(node=>node.open),false,'enabling Voice starts its settings collapsed');assert.equal(await panel.isVisible(),false);
        await drawer.locator(':scope>summary').click();await panel.waitFor({state:'visible'});
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.length),0,'enabling without a key never calls ElevenLabs');
        await page.locator('#tretaresia-rpg-settings>.inline-drawer>.inline-drawer-content').evaluate(node=>node.style.display='none');
        await page.locator('#roleforge-voice-addons').scrollIntoViewIfNeeded();
        await page.screenshot({path:new URL(`settings-disconnected-${width}.png`,artifacts).pathname});
        await panel.locator('[name="key"]').fill('sk_demo-not-a-real-key');await panel.locator('[name="remember"]').check();await panel.locator('[data-voice-connect-button]').click();
        await page.waitForFunction(()=>document.querySelector('[data-voice-connection]')?.textContent==='เชื่อมแล้ว');
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),0);
        await panel.locator('[name="default"]').selectOption('demo-garrick');await panel.locator('[name="female"]').selectOption('demo-cora');await panel.locator('[name="male"]').selectOption('demo-garrick');await panel.locator('[name="narrator"]').selectOption('demo-garrick');
        await panel.locator('[data-voice-npcs]>summary').click();await panel.locator('select[aria-label="เสียงของ Garrick"]').selectOption('demo-garrick');
        assert.equal(await panel.locator('[data-voice-quota]').innerText(),'28,200 / 30,000');
        await panel.locator('summary').filter({hasText:'My Voices'}).click();await panel.locator('[data-voice-my-list] [data-voice-action="preview"]').first().click();
        await page.waitForFunction(()=>window.voicePreview.sounds.at(-1)?.src.startsWith('blob:')&&!window.voicePreview.sounds.at(-1)?.paused);await page.evaluate(()=>window.voicePreview.finishAudio());
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),0,'provider samples play without generating new audio');
        await panel.locator('summary').filter({hasText:'My Voices'}).click();
        const vault=await page.evaluate(async()=>{
            const id=window.host.extensionSettings.tretaresia_rpg.voiceVaultId;
            const db=await new Promise(resolve=>{const request=indexedDB.open('roleforge-voice-v1');request.onsuccess=()=>resolve(request.result);});
            return new Promise(resolve=>{const request=db.transaction('secrets').objectStore('secrets').get(id);request.onsuccess=()=>resolve({extractable:request.result.key.extractable,encrypted:request.result.ciphertext instanceof ArrayBuffer,settings:JSON.stringify(window.host.extensionSettings),metadata:JSON.stringify(window.host.chatMetadata)});});
        });
        assert.equal(vault.extractable,false);assert.equal(vault.encrypted,true);assert(!vault.settings.includes('sk_demo'));assert(!vault.metadata.includes('sk_demo'));
        await page.locator('#roleforge-voice-addons').scrollIntoViewIfNeeded();await page.screenshot({path:new URL(`settings-connected-${width}.png`,artifacts).pathname});
        await page.locator('#preview-settings-close').click();
        assert.equal(await page.locator('.trpg-dialogue .rf-voice-play').first().isDisabled(),false);assert.equal(await page.locator('.trpg-dialogue').first().evaluate(node=>{const copy=node.cloneNode(true);copy.querySelector('.rf-voice-dialogue-controls')?.remove();return copy.textContent;}),'ทางเดินข้างหน้ามืดมาก ระวังด้วยนะคะ');assert.equal(await page.locator('.trpg-dialogue > .rf-voice-dialogue-controls').count(),2);assert(await page.locator('.trpg-dialogue .rf-voice-play').first().evaluate(button=>{const outer=button.closest('.trpg-dialogue').getBoundingClientRect(),inner=button.getBoundingClientRect();return inner.left>=outer.left&&inner.right<=outer.right&&inner.bottom<=outer.bottom;}));
        await page.screenshot({path:new URL(`dialogue-ready-${width}.png`,artifacts).pathname});
        const play=page.locator('.trpg-dialogue .rf-voice-play').first();await play.click();await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='พักเสียง');
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),1);
        const firstRequest=await page.evaluate(()=>window.voicePreview.calls.find(c=>c.path==='/v1/text-to-dialogue'));
        assert.deepEqual(firstRequest.body,{model_id:'eleven_v4',inputs:[{text:'[whispers] ทางเดินข้างหน้ามืดมาก ระวังด้วยนะคะ',voice_id:'demo-cora'}]});
        await page.screenshot({path:new URL(`dialogue-playing-${width}.png`,artifacts).pathname});
        await play.click();assert.equal(await play.innerText(),'ฟังต่อ');await play.click();await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='พักเสียง');
        await page.locator('.trpg-dialogue .rf-voice-stop').first().click();await play.click();await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='พักเสียง');
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),1,'replay uses the cached audio');
        await page.evaluate(()=>window.voicePreview.finishAudio());
        await page.locator('[data-voice-play-all]').click();await page.waitForFunction(()=>document.querySelector('.rf-voice-narrative-controls .rf-voice-play')?.textContent==='พักเสียง');assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').at(-1).body.inputs[0].text),'คอร่าหยุดตรงประตู ก่อนหันกลับมาพูดกับคุณเบา ๆ');await page.evaluate(()=>window.voicePreview.finishAudio());await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='พักเสียง');await page.evaluate(()=>window.voicePreview.finishAudio());
        await page.waitForFunction(()=>document.querySelectorAll('.trpg-dialogue .rf-voice-play')[1]?.textContent==='พักเสียง');
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').at(-1).body.inputs[0].voice_id),'demo-garrick');await page.evaluate(()=>window.voicePreview.finishAudio());
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),3);
        assert(await page.evaluate(()=>window.navigationSummaryPreview.api.notice.some(n=>n.type==='info'&&n.message.includes('สร้างเสียงบทพูด'))));
        assert.equal(await page.evaluate(()=>window.navigationSummaryPreview.api.calls.length),0,'Voice never calls the story model');
        // Opening/editing/saving a speech draft is local; AI source stays identical.
        const speechBefore=await page.evaluate(()=>window.voicePreview.calls.length);
        const original=await page.evaluate(()=>window.host.chat[1].mes);
        await page.locator('.trpg-dialogue .rf-voice-setup').first().click();const editor=page.locator('dialog.rf-speech-editor[open]');await editor.waitFor();
        assert.match(await editor.locator('[data-speech-voice]').innerText(),/Cora/);
        await editor.locator('[data-speech-text]').evaluate(node=>node.setSelectionRange(0,0));await editor.locator('[data-speech-tag="sniff"]').click();assert.match(await editor.locator('[data-speech-text]').inputValue(),/^\[sniff\] \[whispers\]/);
        await editor.locator('[data-speech-text]').fill('[laughs] '+ 'ระวังทางข้างหน้านะคะ');
        await editor.locator('[data-speech-action="save"]').click();await page.waitForFunction(()=>document.querySelector('[data-speech-status]')?.textContent.includes('บันทึกบทพากย์'));
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.length),speechBefore);
        assert.equal(await page.evaluate(()=>window.host.chat[1].mes),original);
        assert(!JSON.stringify(await page.evaluate(()=>window.host.chatMetadata)).includes('[laughs] ระวังทางข้างหน้า'));
        assert(await editor.evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&node.scrollWidth<=node.clientWidth+1;}));
        await page.screenshot({path:new URL(`speech-editor-${width}.png`,artifacts).pathname});
        await editor.locator('[data-speech-voice]').selectOption('demo-garrick');await editor.locator('[data-speech-action="save"]').click();await page.waitForFunction(()=>document.querySelector('[data-speech-status]')?.textContent.includes('บันทึกบทพากย์'));
        await editor.locator('[data-speech-action="generate"]').click();await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='พักเสียง');
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').at(-1).body.inputs[0].text),'[laughs] ระวังทางข้างหน้านะคะ');assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').at(-1).body.inputs[0].voice_id),'demo-garrick','per-block voice override applies without changing NPC assignment');assert.equal(await editor.locator('[data-speech-action="generate"]').isDisabled(),true,'a playing draft cannot accidentally dispatch the same generation twice');
        await editor.locator('[data-speech-action="stop"]').click();
        await page.keyboard.press('Escape');await page.reload();await page.waitForFunction(()=>window.voicePreview?.ready&&document.querySelector('[data-voice-connection]')?.textContent==='เชื่อมแล้ว');assert.equal(await drawer.evaluate(node=>node.open),false,'saved enabled Voice still starts collapsed on reload');
        await page.locator('.trpg-dialogue .rf-voice-setup').first().click();await editor.waitFor();
        assert.equal(await editor.locator('[data-speech-text]').inputValue(),'[laughs] ระวังทางข้างหน้านะคะ','saved drafts survive reload separately from the original');assert.equal(await editor.locator('[data-speech-voice]').inputValue(),'demo-garrick');
        assert.equal(await page.evaluate(()=>window.host.chat[1].mes),original);
        await editor.locator('[data-speech-action="restore"]').click();await editor.locator('[data-speech-action="save"]').click();await page.waitForFunction(()=>document.querySelector('[data-speech-status]')?.textContent.includes('บันทึกบทพากย์'));
        await page.keyboard.press('Escape');
        // A native header still opens the NPC record; audio belongs inside its quote.
        assert.equal(await page.locator('.trpg-header button').count(),0);
        await page.locator('.trpg-header').first().click();await page.locator('dialog.trpg-manager[open]').waitFor({state:'visible'});await page.keyboard.press('Escape');
        // Saved key restores independently of message-generation credentials.
        await page.reload();await page.waitForFunction(()=>window.voicePreview?.ready&&document.querySelector('[data-voice-connection]')?.textContent==='เชื่อมแล้ว');assert.equal(await drawer.evaluate(node=>node.open),false,'saved enabled Voice still starts collapsed on reload');
        await page.waitForFunction(()=>document.querySelectorAll('.trpg-dialogue .rf-voice-play').length===2&&!document.querySelector('.trpg-dialogue .rf-voice-play').disabled);
        await page.locator('.trpg-dialogue .rf-voice-play').first().click();await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='พักเสียง');
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),0,'IndexedDB audio is reused across reload');await page.evaluate(()=>window.voicePreview.finishAudio());
        // Switching / editing cancels
        await page.locator('.trpg-dialogue .rf-voice-setup').first().click();await editor.waitFor();
        // A pending generation cannot play late audio.
        await page.evaluate(async()=>{window.voicePreview.holdSpeech();window.host.chat[1].mes=window.voicePreview.story.replace('ระวังด้วยนะคะ','ระวังลื่นด้วยนะคะ');await window.host.eventSource.emit('MESSAGE_UPDATED',1);});
        await page.waitForFunction(()=>document.querySelector('.trpg-dialogue')?.textContent.includes('ลื่น'));assert.equal(await editor.count(),0,'editing the source closes its old speech editor');
        await page.locator('.trpg-dialogue .rf-voice-play').first().click();await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='ยกเลิก');
        await page.evaluate(async()=>{await window.host.eventSource.emit('MESSAGE_SWIPED',1);window.voicePreview.releaseSpeech();});
        await page.waitForFunction(()=>document.querySelector('.trpg-dialogue .rf-voice-play')?.textContent==='ฟังบทพูด');assert.equal(await page.evaluate(()=>window.voicePreview.sounds.length),1,'late provider output does not start playback');
        // The Library picker loads and adds actual voice IDs, without generating audio.
        await page.locator('.trpg-dialogue .rf-voice-setup').first().click();await page.locator('[data-speech-action="settings"]').click();await panel.locator('[data-voice-library]>summary').click();await panel.locator('[name="library-search"]').fill('Mira');await panel.locator('[data-voice-library-search] button').click();
        await panel.locator('[data-voice-action="add"]').click();await page.waitForFunction(()=>document.querySelector('[name="default"] option[value="demo-library"]'));
        const before=await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length);
        await page.evaluate(()=>window.voicePreview.failQuota(true));await panel.locator('[data-voice-action="quota"]').click();await page.waitForFunction(()=>document.querySelector('[data-voice-quota-error]')?.textContent.includes('403'));
        assert.notEqual(await panel.locator('[data-voice-quota]').innerText(),'—','read failure keeps the timestamped prior quota');
        await page.screenshot({path:new URL(`library-and-quota-${width}.png`,artifacts).pathname});
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),before);
        // Autoplay waits for the completed native reply, and duplicate end events
        // cannot generate the same dialogue twice.
        await panel.locator('[name="autoplay"]').check();await page.locator('#preview-settings-close').click();
        await page.evaluate(async()=>{
            window.navigationSummaryPreview.setNativeStoryBusy(true);await window.host.eventSource.emit('GENERATION_STARTED','normal');
            const message={name:'Narrator',is_user:false,mes:'<tr-narrative>คอร่าเดินต่ออย่างเงียบ ๆ</tr-narrative><tr-dialogue name="Cora" delivery="softly">ถึงห้องแล้วค่ะ พักผ่อนให้สบายนะคะ</tr-dialogue>'};window.host.chat.push(message);
            const row=document.createElement('article');row.className='mes';row.setAttribute('mesid','2');const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes;row.append(text);document.querySelector('#chat').append(row);
            await window.host.eventSource.emit('MESSAGE_RECEIVED',2,'normal');
        });
        await page.waitForTimeout(550);assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),before);
        await page.evaluate(async()=>{window.navigationSummaryPreview.setNativeStoryBusy(false);await window.host.eventSource.emit('GENERATION_ENDED');});
        await page.waitForFunction(()=>document.querySelector('#chat [mesid="2"] .rf-voice-play')?.textContent==='พักเสียง');
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),before+1);
        await page.evaluate(async()=>{await window.host.eventSource.emit('GENERATION_ENDED');});await page.waitForTimeout(100);
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),before+1);
        await page.evaluate(async()=>{window.host.getCurrentChatId=()=> 'another-voice-chat';await window.host.eventSource.emit('CHAT_CHANGED');});
        assert.equal(await page.evaluate(()=>window.voicePreview.sounds.at(-1).paused),true,'chat changes stop the active player');
        // Export only the generated test, never another chat or library clip.
        await page.evaluate(()=>window.navigationSummaryPreview.openSettings());await drawer.locator(':scope>summary').evaluate(node=>{node.closest('details').open=true;});await panel.waitFor({state:'visible'});
        await panel.locator('[data-voice-test-fold]>summary').click();const testForm=panel.locator('[data-voice-test]'),exportPanel=panel.locator('[data-voice-test-export]');assert.equal(await exportPanel.isVisible(),false);
        const spoken='[warmly] เสียงทดลอง '+ 'ก'.repeat(1850),speechCount=await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length);
        await testForm.locator('textarea').fill(spoken);await testForm.locator('button[type=submit]').click();await exportPanel.waitFor({state:'visible'});
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.filter(c=>c.path==='/v1/text-to-dialogue').length),speechCount+1);assert.equal(await exportPanel.locator('[data-voice-test-copy]').innerText(),spoken);
        assert.match(await exportPanel.locator('[data-voice-test-info]').innerText(),/MP3/);assert.match(await exportPanel.locator('[name="test-filename"]').inputValue(),/\.mp3$/);
        await page.evaluate(()=>window.voicePreview.finishAudio());await page.waitForFunction(()=>document.querySelector('[data-voice-action="stop"]').disabled);
        await exportPanel.locator('[name="test-filename"]').fill('บทพากย์ / ทดสอบ:หนึ่ง.MP3');const apiCount=await page.evaluate(()=>window.voicePreview.calls.length);
        const saving=page.waitForEvent('download');await exportPanel.locator('[data-voice-action="download-test"]').click();const downloaded=await saving;
        assert.equal(downloaded.suggestedFilename(),'บทพากย์ - ทดสอบ-หนึ่ง.mp3');const saved=new URL(`test-export-${width}.mp3`,artifacts).pathname;await downloaded.saveAs(saved);assert.deepEqual(await readFile(saved),Buffer.from(testMp3Base64,'base64'));
        assert.equal(await page.evaluate(()=>window.voicePreview.calls.length),apiCount,'download creates no API or quota request');
        await exportPanel.scrollIntoViewIfNeeded();await page.screenshot({path:new URL(`test-mp3-${width}.png`,artifacts).pathname});
        const fit=await exportPanel.evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));assert(fit.scroll<=fit.client+1);if(width<600)assert.equal(await exportPanel.locator('[name="test-filename"]').evaluate(node=>getComputedStyle(node).fontSize),'16px');
        await exportPanel.locator('[data-voice-action="clear-test"]').click();assert.equal(await exportPanel.isVisible(),false);assert.equal(await page.evaluate(()=>window.voicePreview.calls.length),apiCount);
        // Off removes controls and does not erase the voice assignments or saved key.
        await page.evaluate(()=>{window.navigationSummaryPreview.openSettings();document.querySelector('#tretaresia-rpg-settings>.inline-drawer>.inline-drawer-content').style.display='';});await toggle.uncheck();assert.equal(await page.locator('#roleforge-voice-addons').isVisible(),false);await page.waitForFunction(()=>!document.querySelector('.trpg-dialogue .rf-voice-play'));
        const count=await page.evaluate(()=>window.voicePreview.calls.length);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.voicePreview.calls.length),count);
        assert.equal(await memory.isChecked(),false);assert.equal(await page.evaluate(()=>window.host.extensionSettings.tretaresia_rpg.voiceDefaultId),'demo-garrick');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
        console.log(`PASS Voice opt-in, encrypted key, quota, dialogue/playback/cache/reload, NPC defaults, narration/editor, cancellation, Library, MP3 test download/rename/clear and API notices at ${width}px`);
        await page.close();
    }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
