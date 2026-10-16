import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const out=process.env.CHAT_REVIEW_OUT||'/workspace/artifacts/roleforge-0.73.0/ui-restore',base=process.env.ST_REAL_URL||'http://127.0.0.1:18180';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:390,height:844}});p.setDefaultTimeout(30000);
const report={cases:[],errors:[],providerCalls:[]};p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(/\/api\/.*\/generate(?:\?|$)/u.test(r.url()))report.providerCalls.push(r.url());});
await p.route('**/api/horde/text-models',r=>r.fulfill({json:[]}));await p.route('**/api/horde/status',r=>r.fulfill({json:{ok:false}}));
async function ready(){
 const mounted=p.waitForFunction(()=>document.getElementById('tretaresia-npc-wand-launcher')?.onclick,{},{timeout:120000}),welcome=p.locator('dialog.popup').filter({hasText:'Welcome to SillyTavern!'}).locator('.popup-button-ok');
 await Promise.race([mounted,welcome.click({timeout:120000})]);await mounted;await p.evaluate(()=>{window.__ready=false;const c=SillyTavern.getContext();c.eventSource.on(c.eventTypes.APP_READY,()=>__ready=true);});await Promise.race([p.waitForFunction(()=>__ready,{},{timeout:120000}),welcome.click({timeout:120000}).then(()=>p.waitForFunction(()=>__ready))]);
}
async function snapshot(name){await p.waitForTimeout(650);const value=await p.evaluate(()=>({header:document.querySelectorAll('#chat .trpg-header').length,dialogue:document.querySelectorAll('#chat .trpg-dialogue').length,narrative:document.querySelectorAll('#chat .trpg-narrative').length,rows:[...document.querySelectorAll('#chat .mes')].map(n=>({id:n.getAttribute('mesid'),cards:n.querySelectorAll('.trpg-dialogue').length,markers:n.querySelectorAll('[data-roleforge-story]').length})),chat:SillyTavern.getContext().getCurrentChatId?.()}));report.cases.push({name,...value});console.log(name,JSON.stringify(value));return value;}
const title='RoleForge Story Workshop '+Date.now(),story='<tr-header name="Rin"/><tr-narrative>แสงไฟบนถนนฟุยุกิค่อย ๆ สว่างขึ้น</tr-narrative><tr-dialogue name="Rin">ถ้าพร้อมแล้ว เราไปท่าเรือกันเถอะ</tr-dialogue>';
const card={spec:'chara_card_v2',spec_version:'2.0',data:{name:title,description:'Isolated review fixture',personality:'',scenario:'',mes_example:'',tags:[],first_mes:story,extensions:{roleforge_character_pack:{format:'roleforge-character-pack',version:1,id:'fate-story-review'},tretaresia_rpg_npcs:[{id:'rin',name:'Rin',roleIcon:'mage',enabled:true,met:true,identityColor:'#c87371'}]}}};
await writeFile(out+'/reopen-fixture.json',JSON.stringify(card));
try{
 await p.goto(base);await ready();report.release=await p.evaluate(()=>TretaresiaRelease);report.sillyTavern=await(await p.request.get(base+'/version')).json();
 await p.evaluate(()=>{const n=document.createElement('input');n.type='file';n.id='review-import';n.hidden=true;document.body.append(n);});await p.locator('#review-import').setInputFiles(out+'/reopen-fixture.json');
 await p.evaluate(async()=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',document.getElementById('review-import').files[0]);const r=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),json=await r.json();if(!r.ok||json.error)throw Error('Card import failed');});
 await p.evaluate(async title=>{const h=await import('/script.js');await h.getCharacters();const c=SillyTavern.getContext();await h.selectCharacterById(String(c.characters.findIndex(n=>n.name===title)));},title);await snapshot('first greeting');
 await p.evaluate(async story=>{const c=SillyTavern.getContext();for(let i=0;i<6;i++){c.chat.push({is_user:true,name:'Master',mes:'เดินต่อ '+i,send_date:new Date().toISOString()});c.chat.push({is_user:false,name:'Rin',mes:story,send_date:new Date().toISOString(),extra:{}});}await(await import('/script.js')).redisplayChat({fade:false});await c.saveChat();},story);
 await snapshot('six saved replies');await p.evaluate(async()=>{await(await import('/script.js')).reloadCurrentChat();});await snapshot('reload saved chat');
 await p.reload();await ready();await p.evaluate(async title=>{const h=await import('/script.js');await h.getCharacters();const c=SillyTavern.getContext();await h.selectCharacterById(String(c.characters.findIndex(n=>n.name===title)));},title);await snapshot('cold browser reload and reopen saved card');
 await p.evaluate(()=>{const c=SillyTavern.getContext();for(let i=0;i<c.chat.length;i++)if(!c.chat[i].is_user)c.updateMessageBlock(i,c.chat[i]);});
 await snapshot('native batch update of unchanged replies');await p.screenshot({path:out+'/chat-after-batch.png'});
 const row=p.locator('#chat .mes[is_user="false"]').last();await row.locator('.mes_edit').click();await row.locator('.mes_edit_cancel').click();await snapshot('native edit and cancel last reply');await p.screenshot({path:out+'/chat-after-edit-cancel.png'});
 for(const check of report.cases.slice(1))for(const kind of ['header','dialogue','narrative'])assert.equal(check[kind],7,check.name+' / '+kind);assert.deepEqual(report.errors,[]);assert.deepEqual(report.providerCalls,[]);report.pass=true;report.fixtureTitle=title;await writeFile(out+'/chat-diagnosis.json',JSON.stringify(report,null,2));
}catch(e){report.error=e.stack;await writeFile(out+'/chat-diagnosis.json',JSON.stringify(report,null,2));await p.screenshot({path:out+'/chat-diagnosis-failed.png'});throw e;}finally{await b.close();}
