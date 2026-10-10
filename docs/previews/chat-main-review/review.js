// Local review harness, running inside an actual SillyTavern page.
// Uses the shipped Main Chat renderer, cropper, Scene Tracker and composer dock.
// It supplies fictional chat data only. No generation, API keys or gameplay writes.
import {createChatPresentation} from '../../../src/npc-chat.js';
import {createComposerDock} from '../../../src/composer-dock.js';
import {createIncantationComposer} from '../../../src/incantation-composer.js';
import {setUiLanguageProvider} from '../../../src/ui-language.js';

export const DESIGNS = Object.freeze([
  {number:1,key:'grimoire',rendererTheme:'arcane',name:'Living Grimoire'},
  {number:2,key:'lotus',rendererTheme:'jade',name:'Lotus Scroll'},
  {number:3,key:'novel',rendererTheme:'roleforge',name:'Monochrome Folio'},
]);
export const STORY = '<tr-header name="Aster Vale"/>\n<tr-narrative>อัสเตอร์ปิดคัมภีร์อย่างเบามือ ก่อนเลื่อนแผนที่มาตรงหน้าคุณ แสงตะเกียงทาบบนเส้นทางเลียบแม่น้ำ</tr-narrative>\n<tr-dialogue name="Aster Vale">เราจะออกเดินทางตอนฟ้าสาง ถ้าคุณพร้อม ผมจะนำทางไปเอง</tr-dialogue>\n<tr-narrative>เขาชี้ไปยังสะพานบนแผนที่ แล้วเงยหน้าขึ้นรอคำตอบจากคุณ</tr-narrative>\n<tr-dialogue name="Aster Vale">ระหว่างนี้พักให้เต็มที่เถอะ คืนนี้ยังมีเวลาอีกมาก</tr-dialogue>';

export async function startMainChatReview() {
  const host = () => window.SillyTavern.getContext();
  setUiLanguageProvider(() => 'th');
  const base = new URL('./',import.meta.url);
  const link = path => new Promise((resolve,reject) => {
    const css = document.createElement('link'); css.rel='stylesheet'; css.href=new URL(path,base).href;
    css.onload=resolve; css.onerror=reject; document.head.append(css);
  });
  await Promise.all(['../../../styles/npc-ui.css','../../../styles/chat-themes.css','../../../styles/incantation.css'].map(link));
  await link('./main-chat-themes.css');
  let selected=DESIGNS[0],portraits=true,sceneEnabled=true;
  const settings={language:'th',chatPresentation:true,chatRegexMode:'shared',showSceneTracker:true,enableVoiceAddon:false,userChatPresentation:false,chatEffects:false,showChatHeader:true,showChatNarrative:true,showChatDialogue:true,chatTheme:selected.rendererTheme};
  const profile={id:'review-aster',name:'Aster Vale',title:'นักเดินทาง',race:'มนุษย์',relationship:'พันธมิตร',faction:'สมาคมนักสำรวจ',identityColor:'#a4ba88',roleIcon:'book',portraitSize:72,portraitView:{mobile:{x:50,y:50,zoom:1},desktop:{x:50,y:50,zoom:1}}};
  const second={id:'review-venus',name:'Venus',title:'เจ้าของร้านปรุงยา',race:'มนุษย์',relationship:'ผู้รู้จัก',identityColor:'#a4ba88',roleIcon:'book',portraitSize:72};
  const scene={sequence:15,day:1,dayName:'Day 1',time:'19:00',period:'กลางคืน',location:'ห้องสมุดริมแม่น้ำ',region:'Kingsberg',continent:'Central Continent',weather:'ปลอดโปร่ง',temperature:12,participants:['Aster Vale'],position:'โต๊ะริมหน้าต่าง',season:'Spring',month:'Month 1',year:'1042',era:'Medieval',calendar:'Standard',lighting:'แสงตะเกียง',safety:'ปลอดภัย',objective:'เตรียมออกเดินทาง',atmosphere:'เงียบสงบ',elapsed:'5m'};
  const api={context:host,settings:()=>settings,state:()=>({npcs:[profile,second],player:{name:'Noah'}}),visible:text=>String(text),portrait:async p=>portraits&&p.id===profile.id?(await fetch(new URL('./assets/sample-character.jpg',base))).blob():null,sceneForMessage:(_id,message)=>sceneEnabled&&!message.is_user?scene:null};
  const presentation=createChatPresentation(api,p=>{
    const dialog=document.createElement('dialog');dialog.className='rf-review-profile';
    const name=document.createElement('h3');name.textContent=p.name;
    const text=document.createElement('p');text.textContent=[p.title,p.race,p.relationship,p.faction].filter(Boolean).join(' · ');
    const form=document.createElement('form');form.method='dialog';const close=document.createElement('button');close.textContent='ปิด';form.append(close);dialog.append(name,text,form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  });
  function mark() {for(const root of document.querySelectorAll('#chat .trpg-chat[data-rf-chat-theme]'))if(root.dataset.rfReviewTheme!==selected.key)root.dataset.rfReviewTheme=selected.key;}
  const observer=new MutationObserver(mark);observer.observe(document.getElementById('chat'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-rf-chat-theme']});
  const dock=createComposerDock({language:()=> 'th'});dock.scope('review');
  const composer=createIncantationComposer({dock,settings:()=>({language:'th',enableIncantation:true})});composer.update({player:{name:'Noah'},skills:[],abilities:[]},'review');
  // Use the host's own message DOM and message formatter, not a replica.
  await host().clearChat({clearData:true});
  const messages=[{name:'Noah',is_user:true,is_system:false,mes:'ฉันเปิดแผนที่แล้วถามว่าเราจะออกเดินทางเมื่อไหร่',send_date:'2026-10-10T19:00:00.000Z'},
    {name:'TRETARESIA RPG',is_user:false,is_system:false,mes:STORY,send_date:'2026-10-10T19:01:00.000Z',swipes:[STORY],swipe_id:0}];
  for(const message of messages){host().chat.push(message);host().addOneMessage(message,{scroll:false,showSwipes:false});}
  function refresh(){presentation.refresh();mark();}
  refresh();
  const review={
    ready:true,api,presentation,designs:DESIGNS,source:STORY,
    setTheme(key){const next=DESIGNS.find(x=>x.key===key);if(!next)throw Error('Unknown review design');selected=next;settings.chatTheme=selected.rendererTheme;refresh();},
    setPortrait(on){portraits=Boolean(on);refresh();},
    setFrame(part,on){const fields={header:'showChatHeader',narrative:'showChatNarrative',dialogue:'showChatDialogue'};if(!fields[part])throw Error('Unknown frame');settings[fields[part]]=Boolean(on);refresh();},
    setScene(on){sceneEnabled=Boolean(on);refresh();},
    setMode(mode){if(!['shared','native','roleforge'].includes(mode))throw Error('Unknown mode');settings.chatRegexMode=mode;refresh();},
    async replaceStory(source){const message=host().chat[1];message.mes=source;message.swipes=[source];host().updateMessageBlock(1,message);refresh();},
    scrollTop(){const chat=document.getElementById('chat'),row=chat.querySelector('[mesid="1"]');chat.scrollTop=(row?.offsetTop||0)-chat.offsetTop;},
    scrollBottom(){const chat=document.getElementById('chat');chat.scrollTop=chat.scrollHeight;},
    destroy(){observer.disconnect();presentation.destroy();composer.destroy();dock.destroy();},
  };
  window.mainChatReview=review;return review;
}
