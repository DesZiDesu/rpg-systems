import {startHStatsPreview} from './h-stats-fixture.js';
import {groupInvitation,householdInvitation} from '../../src/npc-chat.js';
import {createMemoryComposerStatus} from '../../src/memory-composer-status.js';
const place="Adventurer's Guild";
const scene={loc:place,t:'08:35',w:'Clear',temp:22,who:['Rally','Mira'],day:1,dayName:'Day 1',month:'Bloom',year:'1024',era:'New Era',calendar:'Local Calendar',period:'Morning',season:'Spring',lighting:'แสงเช้า',position:'หน้าเคาน์เตอร์กิลด์',objective:'คุยกับพ่อค้า',safety:'Safe',atmosphere:'สงบ',elapsed:'3m'};
const opening='<tr-header name="Rally" occupation="พ่อค้าเสบียง"></tr-header><tr-dialogue name="Rally">ลองดูของก่อนสิ ข้าคัดไว้สำหรับนักเดินทางอย่างเจ้า</tr-dialogue>';
const shop={kind:'npcShop',id:'gallery-shop',location:place,seller:{name:'Rally'},denomination:'silver',title:'ร้านเสบียงของ Rally',items:[{id:'potion',itemName:'โพชั่นฟื้นฟู',description:'ขวดแก้วบรรจุสมุนไพรสีแดง ใช้ฟื้นกำลังหลังเดินทาง',category:'ยา',price:3,stock:4},{id:'rope',itemName:'เชือกปีนเขา',description:'เชือกถักมือ ยาว 20 เมตร',category:'อุปกรณ์',price:6,stock:2}]};
const offer={kind:'npcPurchase',id:'gallery-sale',location:place,buyer:{name:'Mira',budget:25},item:{id:'moonblade',itemName:'ดาบจันทร์เงิน',quantity:1,category:'อาวุธ',description:'ดาบจากช่างเงินแห่งหอจันทร์'},askPrice:12,denomination:'silver'};
const auction={id:'gallery-auction',location:place,title:'ประมูลของจากคาราวาน',denomination:'silver',entryFee:0,deposit:0,lots:[{id:'moonblade',name:'ดาบจันทร์เงิน',description:'ดาบเหล็กเงินสภาพสมบูรณ์ คมดาบตรวจสอบแล้ว',category:'อาวุธ',quantity:1,openingBid:3,minIncrement:1,bidders:[{name:'Rally',budget:20},{name:'Mira',budget:12},{name:'Garrick',budget:8}]}]};
const missions={title:'กระดานภารกิจ',location:place,missions:[{name:'เสบียงสู่หมู่บ้านเหนือ',description:'คาราวานกำลังขาดผู้คุ้มกันเส้นทางป่า',objective:'ส่งเสบียงถึงหมู่บ้านโดยปลอดภัย',reward:'8 เหรียญเงิน',giver:'ผู้ดูแลกิลด์',difficulty:'C',objectives:[{title:'พบหัวหน้าคาราวาน'},{title:'เดินทางถึงหมู่บ้าน'}]},{name:'ตามหาแมวของเจ้าของโรงเตี๊ยม',objective:'พาแมวกลับโรงเตี๊ยม',reward:'2 เหรียญเงิน',difficulty:'E'}]};
const groups={title:'กระดานปาร์ตี้และกิลด์',location:place,entries:[{kind:'party',name:'คณะดาวเหนือ',description:'รับเพื่อนร่วมทางสำรวจเส้นทางภูเขา',leader:'Garrick',memberCount:3,maxMembers:5,openSpots:2,rank:'C',requirements:['มีอุปกรณ์เดินทาง'],tags:['สำรวจ']},{kind:'guild',name:'กิลด์ช่างเงินจันทรา',description:'รับนักผจญภัยช่วยรวบรวมวัสดุ',leader:'Mira',memberCount:18,maxMembers:24,openSpots:6,rank:'B'}]};
const sections=[['scene','ฉาก / NPC','SCENE · NPC DIALOGUE'],['buy','ซื้อ / ต่อรอง','BUY · NEGOTIATE'],['sell','ขาย / ต่อรอง','SELL · NEGOTIATE'],['auction','ประมูล','AUCTION · AI DECISIONS'],['missions','ภารกิจ','MISSION BOARD'],['groups','ปาร์ตี้ / กิลด์','PARTY & GUILD BOARD'],['invitations','คำเชิญ','GROUP & HOUSEHOLD INVITATIONS'],['records','เรื่อง / นัดหมาย / เควส','STORY RECORDS'],['resources','เงิน / ไอเทม','WALLET & INVENTORY'],['summary','Summary','MEMORY SUMMARY']];
const settings={language:'th',autoTrack:true,autoContinuity:false,chatPresentation:true,showSceneTracker:true,eventNotifications:false,activityIndicator:'off',enableMarketplace:true,enableAuctions:true,enableMissionBoard:true,enableGroupBoard:true,enableStoryMemory:true,enableStoryAgenda:true,enableQuestObjectives:true,enableMemorySummaries:true,memoryAutoSummary:false};
localStorage.setItem('roleforge-hstats-preview-settings',JSON.stringify({tretaresia_rpg:settings}));
localStorage.setItem('roleforge-hstats-preview-metadata',JSON.stringify({tretaresia_rpg_state:{player:{name:'Noah'},npcs:[],location:{place,narrativeVersion:1},onboarding:{locationSeeded:true},progression:{currency:{name:'เหรียญ',silver:30,gold:0,copper:0}},inventory:[{id:'moonblade',name:'ดาบจันทร์เงิน',quantity:1,category:'อาวุธ'}]}}));
await startHStatsPreview();
document.querySelector('#tretaresia-rpg-close').click();Object.assign(window.host.extensionSettings.tretaresia_rpg,settings);
window.galleryCalls=0;
window.host.updateMessageBlock=(id,message)=>{document.querySelector(`.mes[mesid="${id}"] .mes_text`).textContent=message.mes;};
window.host.generateQuietPrompt=async({quietPrompt})=>{
 window.galleryCalls++;const data=JSON.parse(quietPrompt.split('REFERENCE DATA:\n')[1].split('\n')[0]),{interaction:s,playerAction:a}=data;
 let decision,narrative;
 if(s.kind==='auction'){
  const lot=s.lots[s.index],responses=lot.bidders.filter(id=>!lot.withdrawn.includes(id)&&id!==lot.leader).map(id=>({id,action:'withdraw',reason:'ของชิ้นนี้ไม่ตรงกับที่ตั้งใจมาหา'}));
  decision={outcome:a.action==='join'?'joined':a.action==='leave'?(lot.leader==='player'?'sold':'left'):a.action==='next'?'next':lot.leader?'sold':'unsold',participants:responses};
  narrative=a.action==='join'?'<tr-narrative>ผู้ดำเนินการประมูลรับรองการเข้าร่วมและนำดาบขึ้นแสดง</tr-narrative>':lot.leader?'<tr-dialogue name="Mira">ข้าขอผ่านก่อน ของชิ้นนี้ไม่เหมาะกับข้าเท่าไร</tr-dialogue><tr-narrative>ผู้ดำเนินการเคาะปิดรายการตามราคาผู้เสนอสูงสุด</tr-narrative>':'<tr-narrative>ผู้ดำเนินการรับทราบและปิดการเข้าร่วมของเจ้า</tr-narrative>';
 }else{decision={outcome:a.action==='cancel'?'cancel':'accept',amount:a.action==='offer'?a.amount:s.quote};narrative=a.action==='cancel'?'<tr-dialogue name="'+s.npc.name+'">ไว้วันหน้าค่อยคุยกันใหม่ก็ได้</tr-dialogue>':a.action==='offer'?'<tr-dialogue name="'+s.npc.name+'">ราคานี้ข้ารับได้ ถ้าเจ้าพร้อมก็ตกลงตามนี้</tr-dialogue>':'<tr-dialogue name="'+s.npc.name+'">ตกลงตามที่คุยไว้ ยินดีที่ได้ค้าขายกับเจ้า</tr-dialogue>';}
 return JSON.stringify({narrative,decision});
};
// Both native paths are simulated in this portable preview.
window.host.generateRaw=({prompt})=>window.host.generateQuietPrompt({quietPrompt:prompt});
let memory=null,epoch=0;
function draw(){document.querySelector('#chat').replaceChildren(...window.host.chat.map((message,id)=>{const row=document.createElement('article');row.className='mes'+(message.is_user?' mes-user':'');row.setAttribute('mesid',id);const name=document.createElement('b');name.className='mes-name';name.textContent=message.name;const text=document.createElement('div');text.className='mes_text';text.textContent=message.mes.replace(/<!--tretaresia_patch:[\s\S]*?-->/gu,'');row.append(name,text);return row;}));}
async function show(key){
 const ticket=++epoch;memory?.destroy();memory=null;document.querySelector('#gallery-feedback').textContent='';
 for(const button of document.querySelectorAll('.gallery-nav button'))button.classList.toggle('is-active',button.dataset.section===key);
 document.querySelector('#gallery-caption').textContent=sections.find(section=>section[0]===key)[2];
 const state=window.host.chatMetadata.tretaresia_rpg_state;state.commerce={version:1,sessions:[],receipts:[],migratedLegacy:[]};state.auctions=[];state.auctionReceipts=[];state.storyMemories=[];state.storyAgenda=[];state.quests=[];state.progression.currency.silver=30;state.inventory=[{id:'moonblade',name:'ดาบจันทร์เงิน',quantity:1,category:'อาวุธ'}];
 window.host.chatMetadata.tretaresia_rpg_social_events={};window.host.chatMetadata.tretaresia_rpg_turn_history=undefined;
 let user='ฉันคุยกับ Rally ที่กิลด์',story=opening,patch={sceneTracker:scene,ops:[]};
 if(key==='buy'){user='ขอดูสินค้าที่ Rally ขาย';story+='<tr-narrative>Rally แสดงสินค้าที่ขายในร้านให้ดู</tr-narrative>';patch.marketplace=shop;}
 if(key==='sell'){user='ฉันเสนอขายดาบให้ Mira';story='<tr-header name="Mira" occupation="นักสะสม"></tr-header><tr-dialogue name="Mira">ข้าขอซื้อดาบจันทร์เงินของเจ้า 12 เหรียญเงิน ตกลงไหม</tr-dialogue><tr-narrative>Mira เสนอซื้อดาบจันทร์เงินของคุณที่กิลด์</tr-narrative>';patch.marketplace=offer;}
 if(key==='auction'){user='ฉันขอดูรายการประมูล';story='<tr-narrative>คุณเดินเข้าร่วมงานประมูล ผู้ดำเนินการแสดงดาบจันทร์เงินให้ผู้เข้าประมูลดู</tr-narrative>';patch.auction=auction;}
 if(key==='missions'){user='ฉันอ่านกระดานภารกิจ';story='<tr-narrative>คุณอ่านกระดานภารกิจที่กิลด์ ใบประกาศใหม่ติดอยู่สองใบ</tr-narrative>';patch.missionBoard=missions;}
 if(key==='groups'){user='ฉันดูกระดานปาร์ตี้และกิลด์';story='<tr-narrative>คุณอ่านกระดานปาร์ตี้และกิลด์ที่หน้าหอประชุม</tr-narrative>';patch.groupBoard=groups;}
 if(key==='records'){user='ฉันสัญญาว่าจะคืนหนังสือให้ Mira พรุ่งนี้ แล้วรับภารกิจ';story='<tr-dialogue name="Mira">ข้าจะรอรับหนังสือคืนที่นี่พรุ่งนี้เก้าโมง แล้วอย่าลืมพบหัวหน้าคาราวานด้วย</tr-dialogue>';patch.ops=[['upsert','storyMemories',{id:'promise',title:'คืนหนังสือให้ Mira',detail:'Noah สัญญาว่าจะนำหนังสือแผนที่มาคืน',kind:'Promise'}],['upsert','storyAgenda',{id:'meeting',title:'พบ Mira ที่กิลด์',dueDay:2,dueTime:'09:00'}],['upsert','quests',{id:'delivery',name:'เสบียงสู่หมู่บ้านเหนือ',objectives:[{id:'first',title:'พบหัวหน้าคาราวาน',status:'Completed'},{id:'next',title:'เดินทางถึงหมู่บ้าน',status:'Pending'}]}]];}
 if(key==='resources'){story='<tr-narrative>คุณรับเหรียญเงินและโพชั่นจากผู้ดูแลกิลด์เป็นรางวัลจากการช่วยงาน</tr-narrative>';patch.ops=[['inc','progression.currency.silver',4,{reason:'รางวัลช่วยงานกิลด์',category:'currency'}],['inc','inventory',{name:'โพชั่นฟื้นฟู',quantity:2},{reason:'รางวัลช่วยงานกิลด์',category:'inventory'}]];}
 if(key==='summary')story='<tr-dialogue name="Rally">เดินทางปลอดภัย แล้วกลับมาเล่าให้ข้าฟังบ้างล่ะ</tr-dialogue>';
 window.host.chat=[{is_user:true,name:'Noah',mes:user},{is_user:false,name:'ผู้บรรยาย',mes:story+'\n<!--tretaresia_patch:'+JSON.stringify(patch)+'-->',swipe_id:0}];draw();
 await window.host.eventSource.emit(window.host.eventTypes.CHAT_CHANGED);await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_RECEIVED,1,'normal');
 if(ticket!==epoch)return;
 if(key==='invitations'){
  const api={answerGroupOffer:async()=>false,answerHouseholdOffer:async()=>false};const root=document.createElement('div');root.className='trpg-chat gallery-extra';document.querySelector('#chat').append(root);
  root.append(groupInvitation({kind:'party',name:'คณะดาวเหนือ',inviterName:'Garrick',role:'ผู้ร่วมทาง',description:'มาสำรวจช่องเขาด้วยกัน พวกเรายังขาดอีกสองคน',memberCount:3,rank:'C',leaderName:'Garrick',status:'pending',preview:true},1,api));
  root.append(householdInvitation({npcName:'Mira',role:'ผู้ดูแลบ้าน',status:'pending',preview:true},1,api));
 }
 if(key==='summary'){memory=createMemoryComposerStatus({language:()=> 'th',open:()=>{document.querySelector('#gallery-feedback').textContent='ในแชตจริง ปุ่มนี้เปิดคลังสรุปความจำ';},cancel:()=>{memory.update({chatId:'gallery',enabled:true,settings:{language:'th'},job:{status:'cancelled',completed:1,totalMessages:24,processedMessages:12}});}});memory.update({chatId:'gallery',enabled:true,settings:{language:'th',enableMemorySummaries:true},job:{status:'summarizing',startedAt:new Date().toISOString(),totalMessages:24,processedMessages:12,completed:1,apiCalls:1}});}
 window.gallerySection=key;window.galleryReady=true;
}
for(const [key,label]of sections){const button=document.createElement('button');button.type='button';button.dataset.section=key;button.textContent=label;button.onclick=()=>void show(key);document.querySelector('.gallery-nav').append(button);}
window.galleryShow=show;await show(new URLSearchParams(location.search).get('system')||'buy');
