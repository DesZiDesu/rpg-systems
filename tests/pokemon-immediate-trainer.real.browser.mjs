// Records the installed addon in real ST. Story replies are controlled fixtures;
// every encounter, confirmation, move, HP change and result uses production code.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {encodePokemonShowcase} from './helpers/pokemon-showcase-encode.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=process.env.ST_REAL_URL||'http://127.0.0.1:18404',out=process.env.PK_VIDEO_ARTIFACTS||'/workspace/artifacts/pokemon-immediate-trainer';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));await mkdir(out+'/proof',{recursive:true});await mkdir(out+'/videos',{recursive:true});
const cacheRoot=process.env.PK_MEDIA_CACHE||'/workspace/artifacts/pokemon-main-chat-battles/media-cache';let media={};try{media=JSON.parse(await readFile(cacheRoot+'/index.json','utf8'));}catch{}
const report={host:'SillyTavern 1.19.0',release:'0.90.17',liveModel:false,storyReplies:'controlled fixtures through native ST rendering/events',gameplay:'production UI and engine only',subtitles:false,audio:false,cases:[],errors:[]};
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});let p,ctx,device;
const app=()=>p.locator('#roleforge-pokemon');
const world=()=>p.evaluate(()=>RoleForgePokemon.world());
const pause=ms=>p.waitForTimeout(ms);
async function ready(){await p.waitForFunction(()=>globalThis.TretaresiaRelease==='0.90.17'&&globalThis.RoleForgeWorkshop&&SillyTavern.getContext().eventSource.autoFireLastArgs?.has(SillyTavern.getContext().eventTypes.APP_READY),null,{timeout:120000});}
async function setting(key,value){await p.locator('[data-presentation-setting="'+key+'"]').first().evaluate((n,value)=>{if(n.type==='checkbox')n.checked=value;else n.value=value;n.dispatchEvent(new Event('change',{bubbles:true}));},value);await p.waitForFunction(key=>!document.querySelector('[data-presentation-setting="'+key+'"]')?.disabled,key);await pause(150);}
async function smooth(node){await node.evaluate(n=>n.scrollIntoView({block:'center',behavior:'smooth'}));await pause(650);}
async function click(action,extra=''){const node=app().locator('[data-pk-action="'+action+'"]'+extra+':visible').first();await smooth(node);await node.click();await p.waitForFunction(()=>!RoleForgePokemon.debug().mutating&&!RoleForgePokemon.debug().working);}
async function motion(){await p.waitForFunction(()=>!RoleForgePokemon.debug().mutating&&!document.querySelector('#roleforge-pokemon .pk-arena.pkm-inline'));}
async function shot(name){await p.screenshot({path:out+'/proof/'+device+'-'+name+'.png'});}
async function add(text,user=false,dwell=0){
 const id=await p.evaluate(async({text,user})=>{const c=SillyTavern.getContext(),h=await import('/script.js'),id=c.chat.length,m={name:user?'ไค':c.name2,is_user:user,is_system:false,send_date:new Date().toISOString(),mes:text,extra:{}};c.chat.push(m);h.addOneMessage(m);document.querySelector('#chat .mes:last-child')?.scrollIntoView({block:'end',behavior:'smooth'});return id;},{text,user});
 await pause(dwell);
 await p.evaluate(async({id,user})=>{const c=SillyTavern.getContext();await c.eventSource.emit(user?c.eventTypes.USER_MESSAGE_RENDERED:c.eventTypes.MESSAGE_RECEIVED,id);if(!user)await c.eventSource.emit(c.eventTypes.CHARACTER_MESSAGE_RENDERED,id);await c.saveChat();},{id,user});return id;
}
async function send(text){await p.locator('#send_textarea').pressSequentially(text,{delay:24});await pause(550);await p.locator('#send_textarea').fill('');await add(text,true);await pause(1300);}
async function prepare(kind){
 const card={spec:'chara_card_v2',spec_version:'2.0',data:{name:kind==='wild'?'Pokémon · Route 1':'Pokémon · Mira Challenge',description:'Controlled main-chat battle video fixture. No model calls.',first_mes:'<tr-narrative>คุณอยู่บน Route 1 ลมพัดผ่านแนวหญ้าข้างทาง โปเกบอลของ Pikachu พร้อมอยู่ที่เข็มขัดของคุณ</tr-narrative>',extensions:{roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['pokemon']},roleforge_pokemon:{format:'roleforge-pokemon-rules',version:1,engineVersion:4,started:true,region:'Kanto',initialParty:[{key:'pikachu',level:18},{key:'bulbasaur',level:10}],initialInventory:{'poke-ball':5,potion:3}},roleforge_character_pack:{format:'roleforge-character-pack',version:1,systems:{autoTrack:false,eventNotifications:false,showSceneTracker:false},initialState:{player:{name:'ไค',age:'24'},npcs:kind==='trainer'?[{id:'mira',name:'Mira',race:'Human',profession:'Pokémon Trainer',met:true,enabled:true,identityColor:'#92b6cf',age:'24'}]:[],location:{place:'Route 1',region:'Kanto',continent:'โลกโปเกมอน',narrativeVersion:1},worldClock:{day:1,time:'10:15'},onboarding:{identitySeeded:true,locationSeeded:true,loadoutSeeded:true}}}}}};
 await p.evaluate(async card=>{const c=SillyTavern.getContext(),f=new FormData();f.set('file_type','json');f.set('avatar',new File([JSON.stringify(card)],'battle-video.json',{type:'application/json'}));const res=await fetch('/api/characters/import',{method:'POST',headers:c.getRequestHeaders({omitContentType:true}),body:f}),v=await res.json();if(!res.ok||v.error)throw Error('Video card import failed');const h=await import('/script.js');await h.getCharacters();await h.selectCharacterById(String(c.characters.findIndex(n=>n.avatar===v.file_name||n.avatar===v.file_name+'.png')));await RoleForgeWorkshop.ready();},card);
 await p.waitForFunction(()=>globalThis.RoleForgePokemon?.world()?.started);
 await p.selectOption('#themes','Dark Lite',{force:true});await p.selectOption('#tretaresia-rpg-language','th',{force:true});await setting('chatRegexMode','roleforge');await setting('chatTheme','roleforge');await setting('userChatPresentation',true);for(const key of['showChatHeader','showChatDialogue','showChatNarrative'])await setting(key,true);
 await p.locator('#reduced_motion').evaluate(n=>{if(n.checked){n.checked=false;globalThis.$(n).trigger('input');}});
 await p.evaluate(()=>RoleForgePokemon.open('settings'));await click('theme-set','[data-theme=original]');await click('dex-image-set','[data-mode=sprite]');if((await world()).settings.motion===false)await click('motion-toggle');await click('close');
 const hide=p.locator('#roleforge-pokemon-dock [data-pk-action=hide-dock]');if(await hide.isVisible())await hide.click();
 await p.evaluate(()=>{toastr.remove();document.activeElement?.blur();const chat=document.getElementById('chat');chat.scrollTo({top:0,behavior:'instant'});});await pause(800);
}
async function fight(kind){
 const foes=[],moves=[];let rounds=0;
 while((await world()).battle){
  assert(rounds++<14,'Battle did not finish within the recording budget');await motion();const before=await world(),battle=before.battle;if(!battle)break;foes.push(battle.wild.key);
  const fightButton=app().locator('[data-pk-action=battle-menu][data-pane=moves]');if(await fightButton.isVisible())await click('battle-menu','[data-pane=moves]');await pause(900);
  const actor=before.pokemon[battle.activeUid],move=actor.moves.find(v=>v.id===84&&v.pp>0)||actor.moves.find(v=>[98,33,22].includes(v.id)&&v.pp>0);assert(move,'Expected an available attack');
  await click('attack','[data-move="'+move.id+'"]');await motion();await pause(1250);moves.push({moveId:move.id,opponent:battle.wild.key,hpBefore:actor.hp,hpAfter:(await world()).pokemon[actor.uid].hp});
  if(foes.length===1)await shot(kind+'-first-attack');
 }
 const end=await world();assert.equal(end.lastBattle?.result,'victory');assert.equal(end.wins,1);if(kind==='trainer'){assert.equal(end.lastBattle.trainer,'Mira');assert.deepEqual([...new Set(foes)],['pidgey','rattata']);assert(end.logs.some(e=>e.key==='trainer-next'));assert.equal(end.trainerChallenges[0].status,'completed');}
 await pause(2400);await shot(kind+'-victory');await click('close');
 const result=kind==='wild'?'Pikachu กลับมายืนข้างคุณหลังเอาชนะ Rattata ป่าบน Route 1 มันสะบัดหูแล้วเงยหน้ารอคำสั่งต่อไป':'หลังเอาชนะ Pidgey และ Rattata คุณชนะการประลองกับ Mira บน Route 1 เธอเก็บโปเกบอลกลับและยิ้มให้คู่หูของคุณ';
 await add('<tr-header name="pokemon:initial-0"/><tr-narrative>'+result+'</tr-narrative><tr-dialogue name="pokemon:initial-0">ปิกา…ปิกาจู!</tr-dialogue>',false,0);await pause(4500);await shot(kind+'-back-in-chat');assert.equal((await world()).wins,1,'Return to story must not award the result twice');
 const prompt=await p.evaluate(()=>{const c=SillyTavern.getContext(),v=c.extensionPrompts?.roleforge_pokemon_world;return typeof v==='string'?v:v?.value||'';});
 return {rounds,moves,opponents:[...new Set(foes)],lastBattle:end.lastBattle,mainChatWorldContainsResult:prompt.includes('lastBattle')&&prompt.includes('victory'),stateUnchangedAfterStory:true};
}

const recordings=[];
try{for(const mobile of [false,true]){
 device=mobile?'mobile':'desktop';const viewport=mobile?{width:390,height:844}:{width:1600,height:900};
 ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,reducedMotion:'no-preference',recordVideo:{dir:out+'/raw',size:viewport}});
 await ctx.route('**/api/horde/**',r=>r.fulfill({json:[]}));await ctx.route('**/api/backends/**/generate',r=>{report.errors.push('Unexpected model call');return r.abort();});
 await ctx.route('https://raw.githubusercontent.com/PokeAPI/sprites/**',async r=>{const file=media[r.request().url()];if(file)await r.fulfill({body:await readFile(cacheRoot+'/'+file),contentType:file.endsWith('.gif')?'image/gif':'image/png'});else await r.continue();});
 p=await ctx.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base);await ready();await p.addStyleTag({content:'#toast-container,.tretaresia-activity-island{visibility:hidden!important}'});
 await prepare('trainer');const start=await p.evaluate(()=>performance.now()/1000);await pause(1500);
 await send('*ฉันเดินผ่าน Mira บน Route 1 พร้อม Pikachu*');
 const proof='Mira บังคับคุณต่อสู้บน Route 1 ด้วย Pidgey เลเวล 8 และ Rattata เลเวล 10 และเริ่มการต่อสู้ทันที';
 const source='<tr-header name="Mira"/><tr-narrative>'+proof+'</tr-narrative><tr-dialogue name="Mira">ส่งคู่หูของเธอออกมาได้เลย!</tr-dialogue><!--roleforge_pokemon:'+JSON.stringify({version:4,events:[{type:'trainer',mode:'immediate',name:'Mira',place:'Route 1',team:[{key:'pidgey',level:8},{key:'rattata',level:10}],evidence:proof}]})+'-->';
 await p.locator('#send_textarea').fill('UNSENT DRAFT');const sourceIndex=await add(source,false,2300);
 await app().waitFor({state:'visible'});await motion();assert.equal((await world()).battle.trainer.name,'Mira');assert.equal((await world()).battle.trainer.team.length,2);
 assert.equal(await p.locator('#send_textarea').inputValue(),'UNSENT DRAFT');await shot('immediate-auto-open');await pause(2000);
 const outcome=await fight('trainer'),end=await p.evaluate(()=>performance.now()/1000);
 console.log('Fought',device);const before=await world(),avatar=await p.evaluate(()=>{const c=SillyTavern.getContext();return c.characters[c.characterId].avatar;});await p.reload();await ready();await p.evaluate(async avatar=>{const c=SillyTavern.getContext(),h=await import('/script.js');await h.selectCharacterById(String(c.characters.findIndex(v=>v.avatar===avatar)));await RoleForgeWorkshop.ready();},avatar);await p.waitForFunction(()=>globalThis.RoleForgePokemon?.world()?.wins===1);assert(!await app().isVisible(),'Reload does not force old battles open');assert.deepEqual((await world()).lastBattle,before.lastBattle);
 await p.evaluate(async index=>{const c=SillyTavern.getContext();c.chat.splice(index);await c.eventSource.emit(c.eventTypes.MESSAGE_DELETED,index);await c.saveChat();},sourceIndex);
 assert.equal((await world()).battle,null);assert.equal((await world()).wins,0);assert.equal((await world()).trainerChallenges?.length||0,0);
 await add(source);await app().waitFor({state:'visible'});await motion();await click('close');
 await p.evaluate(async()=>{const c=SillyTavern.getContext(),m=c.chat.at(-1);m.swipes=[m.mes,'<tr-narrative>เส้นทางเงียบสงบ</tr-narrative>'];m.swipe_id=1;m.mes=m.swipes[1];await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED,c.chat.length-1);});
 assert.equal((await world()).battle,null);
 await p.evaluate(async()=>{const c=SillyTavern.getContext(),m=c.chat.at(-1);m.swipe_id=0;m.mes=m.swipes[0];await c.eventSource.emit(c.eventTypes.MESSAGE_SWIPED,c.chat.length-1);});
 assert.equal((await world()).battle.trainer.name,'Mira');assert(!await app().isVisible(),'Old swipe restores game without stealing focus');
 await p.evaluate(()=>RoleForgePokemon.open('settings'));await click('motion-toggle');await click('close');
 await p.evaluate(async()=>{const c=SillyTavern.getContext();c.chat.pop();await c.eventSource.emit(c.eventTypes.MESSAGE_DELETED,c.chat.length);});
 await add(source);await app().waitFor({state:'visible'});assert.equal(await app().locator('.pk-arena.pkm-inline').count(),0,'Immediate battle also opens with animations off');
 const row={device,kind:'immediate-trainer',start,end,...outcome,automaticOpen:true,trainerMenuClicks:0,draftPreserved:true,reload:true,deleteRollback:true,swipeRollback:true,motionOffAutoOpen:true};report.cases.push(row);
 const path=await p.video().path();await ctx.close();ctx=null;recordings.push({device,kind:row.kind,path,clips:[[start,end]]});console.log('PASS',device);
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e);await p?.screenshot({path:out+'/proof/'+device+'-failure.png'}).catch(()=>{});}finally{await ctx?.close();await browser.close();await writeFile(out+'/validation.json',JSON.stringify(report,null,2));}
if(!process.exitCode)for(const video of recordings){const target=out+'/videos/'+video.device+'.mp4';encodePokemonShowcase(video,target);console.log('VIDEO',target);}
