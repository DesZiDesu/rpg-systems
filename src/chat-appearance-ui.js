import {CHAT_APPEARANCE_KEYS,chatAppearance} from './chat-themes.js?v=0.64.2';
import {element,renderStoryBlocks} from './npc-chat.js?v=0.64.2';

// Native SillyTavern controls; the expandable sample uses the real renderer.
export function mountChatAppearanceControls(parent,api) {
    const root=element('div','rf-chat-appearance-settings'),controls=new Map(),texts=new Map();let busy=false,previewKey='',scope=null;
    const description=element('small','rf-chat-theme-description');root.append(description);
    const switches=element('div','rf-chat-appearance-switches');
    for(const key of ['showChatHeader','showChatDialogue','showChatNarrative']){
        const label=element('label','checkbox_label'),input=element('input'),text=element('span');input.type='checkbox';input.dataset.presentationSetting=key;
        controls.set(key,input);texts.set(key,text);label.append(input,text);switches.append(label);
    }
    root.append(switches);
    const help=element('small','rf-chat-appearance-help'),status=element('small','rf-chat-appearance-status');status.setAttribute('role','status');root.append(help,status);
    const details=element('details','rf-chat-theme-preview'),summary=element('summary'),sample=element('div','trpg-chat');details.append(summary,sample);root.append(details);
    const gallery=element('a','menu_button');gallery.href=new URL('../docs/previews/chat-original/index.html',import.meta.url).href;gallery.target='_blank';gallery.rel='noopener';root.append(gallery);parent.append(root);
    const t=(en,th)=>api.settings().language==='th'?th:en;
    function update(){
        const metadata=api.context().chatMetadata;if(metadata!==scope){scope=metadata;status.textContent='';previewKey='';}
        const settings=api.settings(),view=chatAppearance(settings);
        description.textContent='Original · RoleForge';
        for(const [key,label] of [['showChatHeader',['Header · character nameplate','Header · ป้ายตัวละคร']],['showChatDialogue',['Dialogue · speech frame','Dialogue · กรอบบทพูด']],['showChatNarrative',['Narrative · narration frame','Narrative · กรอบบรรยาย']]])texts.get(key).textContent=t(...label);
        help.textContent=t('Enable Header, Dialogue and Narrative independently. Saved for this chat. Without a frame, speech appears as "text" and narration as *text*; Header becomes a plain speaker name. Header and Narrative have no background. Regex/MVU widgets keep their own design.','เปิด/ปิด Header, Dialogue และ Narrative ได้อิสระ จำค่าแยกแชท เมื่อปิดกรอบ บทพูดแสดงเป็น "text" และคำบรรยายเป็น *text* ส่วน Header เหลือชื่อผู้พูดธรรมดา Header กับ Narrative ไม่มีพื้นหลัง UI ของ Regex/MVU ใช้หน้าตาของตัวเอง');
        summary.textContent=t('Preview Original','ดูตัวอย่าง Original');gallery.textContent=t('PC / mobile preview ↗','พรีวิว PC / มือถือ ↗');
        if(!busy)for(const [key,input] of controls)input.checked=view[CHAT_APPEARANCE_KEYS[key]];
        const signature=JSON.stringify([view,settings.language]);
        if(details.open&&signature!==previewKey){
            previewKey=signature;sample.replaceChildren();
            const name='Liora',profile={name,title:t('Keeper of stories','ผู้ดูแลเรื่องราว'),race:t('Human','มนุษย์'),relationship:t('Ally','พันธมิตร'),identityColor:'#b9a077',roleIcon:'book'};
            renderStoryBlocks(sample,[{type:'header',name},{type:'narrative',text:t('A quiet light rests between the pages. She looks up as you enter.','แสงนุ่มนวลทาบอยู่ระหว่างหน้าหนังสือ เธอเงยหน้าขึ้นเมื่อคุณก้าวเข้ามา')},{type:'dialogue',name,text:t('Every journey deserves a beginning. Shall we write yours?','ทุกการเดินทางควรมีจุดเริ่มต้น เรามาเขียนเรื่องราวของคุณกันไหม?')}],new Map([[name.toLowerCase(),profile]]),name,()=>{},async()=>null,null,view);
        }
    }
    details.addEventListener('toggle',()=>{if(details.open)update();});
    for(const [key,input] of controls)input.addEventListener('change',async()=>{
        if(busy)return;busy=true;const metadata=api.context().chatMetadata;for(const control of controls.values())control.disabled=true;
        status.textContent=t('Saving…','กำลังบันทึก…');
        try{await api.saveChatAppearanceSetting(key,input.checked);if(api.context().chatMetadata===metadata)status.textContent=t('Saved for this chat.','บันทึกให้แชทนี้แล้ว');}
        catch(error){if(api.context().chatMetadata===metadata)status.textContent=error.message;}
        finally{busy=false;for(const control of controls.values())control.disabled=false;update();}
    });
    update();return {update,destroy(){root.remove();}};
}
