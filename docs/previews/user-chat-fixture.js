// A local host only: actual RoleForge loader, settings and chat renderer.
import {startHStatsPreview} from './h-stats-fixture.js';
await startHStatsPreview();
document.querySelector('#tretaresia-rpg-close').click();
const params=new URLSearchParams(location.search);
const sources={
    user:'*ฉันหยุดตรงประตูร้าน แล้วยกหนังสือทั้งสามเล่มขึ้นดู*\n\n“ผมรับทั้งหมดครับ ขอราคาพิเศษหน่อยได้ไหม?”\n\n|หวังว่าเงินที่เหลือจะพอสำหรับคืนนี้|',
    ai:'*บาร์ธยิ้มแล้วพยักหน้า*\n\n"ทั้งสามเล่ม สี่สิบเหรียญเงินครับ"\n\n|วันนี้ขายได้ดีทีเดียว|',
};
const escape=text=>text.replace(/&/gu,'&amp;').replace(/</gu,'&lt;').replace(/>/gu,'&gt;');
function nativeHtml(source){return escape(source).replace(/\*\*([^*]+)\*\*/gu,'<strong>$1</strong>').replace(/(?<!\*)\*([^*]+)\*(?!\*)/gu,'<em>$1</em>').split(/\n\n/gu).map(paragraph=>`<p>${paragraph.replace(/\n/gu,'<br>')}</p>`).join('');}
function addMessage(source,{user=true,system=false,name=user?'Noah':'TRETARESIA RPG',native}={}){
    const id=window.host.chat.length;window.host.chat.push({name,is_user:user,is_system:system,mes:source});
    const row=document.createElement('article');row.className=`mes ${user?'user':'ai'}`;row.setAttribute('mesid',id);
    const title=document.createElement('div');title.className='mes-title';const avatar=document.createElement('span');avatar.textContent=user?'N':'RF';title.append(avatar,document.createTextNode(name));
    const body=document.createElement('div');body.className='mes_text';body.innerHTML=native??nativeHtml(source);row.append(title,body);document.querySelector('#chat').append(row);
    return id;
}
const setting=document.querySelector('[data-presentation-setting="userChatPresentation"]');
function applyColor(color){window.host.extensionSettings.tretaresia_rpg.accentColor=color;document.documentElement.style.setProperty('--tretaresia-accent',color);}
applyColor('#a9d98c');
if(params.get('enabled')!=='0'){setting.checked=true;setting.dispatchEvent(new Event('change',{bubbles:true}));}
const userId=addMessage(sources.user),aiId=addMessage(sources.ai,{user:false});
window.host.name1='Noah';window.host.messageFormatting=source=>nativeHtml(source);
document.querySelector('#demo-theme').addEventListener('change',event=>applyColor(event.target.value));
document.querySelector('#demo-language').addEventListener('change',event=>{window.host.extensionSettings.tretaresia_rpg.language=event.target.value;document.querySelector('[data-presentation-setting="userChatPresentation"]').dispatchEvent(new Event('change',{bubbles:true}));});
window.userChatPreview={ready:true,sources,userId,aiId,addMessage,nativeHtml};
await window.host.eventSource.emit(window.host.eventTypes.MESSAGE_SENT,userId);
