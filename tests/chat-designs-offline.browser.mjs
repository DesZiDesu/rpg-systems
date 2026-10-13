import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const html=await readFile(new URL('../docs/previews/chat-designs/standalone.html',import.meta.url),'utf8');
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1300},reducedMotion:'reduce'}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{requests.push(route.request().url());return route.abort();});await page.setContent(html);await page.waitForFunction(()=>window.chatDesignPreview?.ready);await page.locator('.extra-controls').evaluate(n=>n.open=true);
  for(const theme of ['chapter','codex','aincrad']){
   await page.locator(`[data-design="${theme}"]`).click();await page.waitForFunction(()=>document.querySelector('.trpg-photo')?.naturalWidth>0);
   assert.equal(await page.locator('#story').getAttribute('data-rf-chat-theme'),theme);
   await page.locator('#portrait').uncheck();assert.equal(await page.locator('.trpg-photo').count(),0);await page.locator('#portrait').check();
   await page.locator('#color').selectOption('#e65f70');for(const part of ['header','dialogue','narrative'])await page.locator('#'+part).uncheck();
   assert.equal(await page.locator('#story .trpg-header').count(),0);assert.equal(await page.locator('.trpg-prose-copy').first().evaluate(n=>getComputedStyle(n).fontStyle),'italic');
   assert.equal(await page.locator('.trpg-dialogue-copy').first().evaluate(n=>getComputedStyle(n).color),'rgb(230, 95, 112)');
   for(const part of ['header','dialogue','narrative'])await page.locator('#'+part).check();await page.locator('#color').selectOption('#d1b27c');
   await page.locator('.trpg-header').click();assert.equal(await page.locator('#preview-dialog').evaluate(n=>n.open),true);await page.locator('#close-dialog').click();
   await page.locator('.rf-voice-setup').first().click();assert.equal(await page.locator('#preview-dialog').evaluate(n=>n.open),true);await page.locator('#close-dialog').click();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log(`PASS ${width}px offline: all three designs, portraits, frame/color controls and dialogs with zero requests`);await page.close();
 }
}finally{await browser?.close();}
