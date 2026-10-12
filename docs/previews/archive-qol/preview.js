import {createNpcWorkspace} from '../../../src/npc-workspace.js';
import {characterLore,writeCharacterLore,loreOptions,writeLoreOptions} from '../../../src/lore-core.js';
import {lorePrompt} from '../../../src/lore-core.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const settings={language:new URLSearchParams(location.search).get('lang')==='en'?'en':'th',chatPresentation:false,npcGenerationScope:'character',showWandLauncher:false};
document.documentElement.lang=settings.language;
const people=[
 ['Rudeus Greyrat','Water Mage','Human','Ranoa Academy','#91b9d5','emblem:mage'],
 ['Sylphiette','Royal Guard','Elf','Asura Palace','#b9d496','emblem:healer'],
 ['Roxy Migurdia','Magic Instructor','Migurd','Rikarisu','#96abda','emblem:mage'],
 ['Eris Boreas Greyrat','Swordswoman','Human','Fittoa','#d89286','emblem:warrior'],
 ['Ruijerd Superdia','Warrior','Superd','Central Continent','#b4cba2','emblem:warrior'],
 ['Orsted','Dragon God','Dragon','Northern Road','#d1b67e','emblem:warrior'],
 ['Nanahoshi Shizuka','Researcher','Human','Ranoa Academy','#c6b6d1','emblem:scholar'],
 ['Zanoba Shirone','Artisan','Human','Ranoa Academy','#cba689','emblem:artisan'],
];
function seedNpcs(scope,count){return Array.from({length:count},(_,i)=>{
 const [name,occupation,race,location,identityColor,roleIcon]=people[i%people.length];
 return {id:`${scope}-${i}`,name:i<8?name:`${name} · Archive ${String(i+1).padStart(2,'0')}`,occupation,race,location,identityColor,roleIcon,title:'',faction:i%2?'Asura Kingdom':'Ranoa Academy',met:i%4!==0,isHostile:false,enabled:i%3!==2,npcScope:scope,npcOwner:scope==='character'?'demo-card':'',notes:'Preview data only.',abilities:[],stats:{rank:'Intermediate'},alternateProfiles:[]};
});}
const loreSeeds=[
 ['Ranoa University of Magic','สถาบันเวทมนตร์ทางตอนเหนือ มีห้องสมุดขนาดใหญ่และหอพักสำหรับนักเรียน',['รานัว','academy']],
 ['Asura Kingdom','อาณาจักรของมนุษย์บนทวีปกลาง มีเมืองหลวงและเมืองบริวารหลายแห่ง',['อัสรา','kingdom']],
 ['Fittoa Region','พื้นที่เกษตรกรรมและเมืองเล็ก ๆ ทางตะวันออกของอาณาจักร ใช้ประกอบการเดินทางในเนื้อเรื่อง',['fittoa','ฟิตโตอา']],
 ['Magic & Sword Ranks','ลำดับความสามารถใช้ Beginner, Intermediate, Advanced และ Saint ตามกฎของโลกตัวอย่าง',['rank','ลำดับ']],
 ['Demon Continent','ทวีปที่มีภูมิประเทศแห้งแล้งและชุมชนหลากหลายเผ่าพันธุ์',['demon','ทวีป']],
 ['Greyrat Family','ข้อมูลครอบครัวและความสัมพันธ์ของตัวละครตัวอย่าง ใช้อ้างอิงเมื่อปรากฏในฉาก',['greyrat','ครอบครัว']],
];
let chat='preview-chat',owner='demo-card',metadata={},character=[],local=[],persistCount=0;
const eventListeners=new Map();
const context={chat:[],getCurrentChatId:()=>chat,get chatMetadata(){return metadata;},eventTypes:{CHAT_CHANGED:'chat-changed'},eventSource:{on(name,fn){if(!eventListeners.has(name))eventListeners.set(name,new Set());eventListeners.get(name).add(fn);},off(name,fn){eventListeners.get(name)?.delete(fn);}},saveSettingsDebounced(){}};
window.SillyTavern={getContext:()=>({...context,extensionSettings:{tretaresia_rpg:settings}})};
function seed(){
 character=seedNpcs('character',48);local=seedNpcs('chat',24);persistCount=0;
 const lore=Array.from({length:43},(_,i)=>{const [title,content,keywords]=loreSeeds[i%loreSeeds.length];return {id:`lore-${i}`,title:i<6?title:`${title} · ${String(i+1).padStart(2,'0')}`,content,keywords,enabled:i%3!==1,always:i===3};});
 writeLoreOptions(settings,{mode:'relevant',budget:60000},owner,owner);writeCharacterLore(settings,lore,owner,owner);
}
seed();
const api={context:()=>context,settings:()=>settings,scopeInfo:()=>owner?{key:owner,label:owner==='demo-card'?'Six-Faced World · Sample card':'Another sample card'}:null,
 state:()=>({npcs:[...local,...character],systems:{audit:[]}}),listScope:scope=>scope==='character'?clone(character):clone(local),
 listLore:()=>characterLore(settings,owner),loreOptions:()=>loreOptions(settings,owner),lorePrompt:()=>lorePrompt(characterLore(settings,owner),loreOptions(settings,owner)),
 persistLoreOptions:(options,expected)=>writeLoreOptions(settings,options,expected,owner),
 async persistLore(entries,expected){if(window.failSave)throw Error('Preview save failed');if(window.deferSave)await new Promise(resolve=>window.finishSave=resolve);if(expected!==owner)throw Error('Card changed');writeCharacterLore(settings,entries,expected,owner);persistCount++;},
 async persistScope(scope,npcs,source,expectedChat,expectedOwner){
  if(window.failSave)throw Error('Preview save failed');if(window.deferSave)await new Promise(resolve=>window.finishSave=resolve);
  if(expectedChat!==chat||expectedOwner!==owner)throw Error('Chat/card changed');if(scope==='character')character=clone(npcs);else local=clone(npcs);persistCount++;return true;
 },
 portrait:async()=>null,profile:value=>value,visible:value=>value,updatePrompt(){},notify(){},parseJson:JSON.parse,
};
const workspace=createNpcWorkspace(api);window.workspace=workspace;
window.previewState=()=>({owner,chat,character:clone(character),local:clone(local),lore:api.listLore(),options:api.loreOptions(),persistCount,requests:0});
window.previewData=api;
window.previewSwitch=(nextOwner,nextChat,{emit=true}={})=>{owner=nextOwner;chat=nextChat;metadata={};if(emit)for(const listener of eventListeners.get('chat-changed')||[])listener();};
document.querySelector('[data-preview-npc]').addEventListener('click',()=>workspace.open());
document.querySelector('[data-preview-lore]').addEventListener('click',()=>{workspace.open();document.querySelector('[data-management-tab=lore]').click();});
document.querySelector('[data-preview-reset]').addEventListener('click',()=>{seed();workspace.open();});
workspace.open();window.previewReady=true;
