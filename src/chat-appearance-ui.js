import {CHAT_THEMES,CHAT_APPEARANCE_KEYS,chatAppearance,createThemeMotion} from './chat-themes.js?v=0.63.0';
import {element,renderStoryBlocks} from './npc-chat.js?v=0.63.0';

// Native SillyTavern controls; the expandable sample uses the real story renderer.
export function mountChatAppearanceControls(parent,api) {
    const root=element('div','rf-chat-appearance-settings'),controls=new Map(),texts=new Map(),motion=createThemeMotion();let busy=false,previewKey='',scope=null;
    const row=element('label','trpg-formatting-mode'),title=element('span'),select=element('select','text_pole');
    select.dataset.presentationSetting='chatTheme';controls.set('chatTheme',select);texts.set('theme',title);
    for(const theme of CHAT_THEMES){const option=element('option','',`${theme.name} · ${theme.genre}`);option.value=theme.key;select.append(option);}row.append(title,select);root.append(row);
    const description=element('small','rf-chat-theme-description');root.append(description);
    const switches=element('div','rf-chat-appearance-switches');
    for(const key of ['showChatHeader','showChatDialogue','showChatNarrative','chatEffects']){
        const label=element('label','checkbox_label'),input=element('input'),text=element('span');input.type='checkbox';input.dataset.presentationSetting=key;
        controls.set(key,input);texts.set(key,text);label.append(input,text);switches.append(label);
    }
    root.append(switches);
    const help=element('small','rf-chat-appearance-help'),status=element('small','rf-chat-appearance-status');status.setAttribute('role','status');root.append(help,status);
    const details=element('details','rf-chat-theme-preview'),summary=element('summary'),sample=element('div','trpg-chat');details.append(summary,sample);root.append(details);
    const gallery=element('a','menu_button');gallery.href=new URL('../docs/previews/chat-themes/index.html',import.meta.url).href;gallery.target='_blank';gallery.rel='noopener';root.append(gallery);parent.append(root);
    const t=(en,th)=>api.settings().language==='th'?th:en;
    function update(){
        const metadata=api.context().chatMetadata;if(metadata!==scope){scope=metadata;status.textContent='';previewKey='';}
        const settings=api.settings(),view=chatAppearance(settings),theme=CHAT_THEMES.find(theme=>theme.key===view.theme);
        title.textContent=t('Story theme · this chat','ธีมบทสนทนา · แชทนี้');description.textContent=settings.language==='th'?theme.descriptionTh:theme.description;
        for(const [key,label] of [['showChatHeader',['Header · character nameplate','Header · ป้ายตัวละคร']],['showChatDialogue',['Dialogue · speech frame','Dialogue · กรอบบทพูด']],['showChatNarrative',['Narrative · narration frame','Narrative · กรอบบรรยาย']],['chatEffects',['Animated accents','เอฟเฟกต์เคลื่อนไหว']]])texts.get(key).textContent=t(...label);
        help.textContent=t('Saved separately for each chat. Disabling a frame keeps its text readable; Header becomes a plain speaker name. Regex cards keep their own design. User UI follows these choices when enabled. Motion stops off-screen and respects Reduce Motion.','จำแยกแต่ละแชท ปิดกรอบแล้วยังอ่านเนื้อหาได้ Header เหลือชื่อผู้พูดธรรมดา การ์ด Regex ใช้หน้าตาของตัวเอง UI ฝั่ง User ใช้ตัวเลือกนี้เมื่อเปิดไว้ เอฟเฟกต์หยุดเมื่อพ้นหน้าจอและรองรับ Reduce Motion');
        summary.textContent=t('Preview this theme','ดูตัวอย่างธีมนี้');gallery.textContent=t('View all 6 themes ↗','ดูพรีวิวทั้ง 6 ธีม ↗');
        if(!busy)for(const [key,input] of controls){const value=view[CHAT_APPEARANCE_KEYS[key]];if(input.type==='checkbox')input.checked=value;else input.value=value;}
        const signature=JSON.stringify([view,settings.language]);
        if(details.open&&signature!==previewKey){
            previewKey=signature;motion.remove(sample);sample.replaceChildren();
            const name='Liora',profile={name,title:t('Keeper of stories','ผู้ดูแลเรื่องราว'),race:t('Human','มนุษย์'),relationship:t('Ally','พันธมิตร'),identityColor:'#b9a077',roleIcon:'book'};
            renderStoryBlocks(sample,[{type:'header',name},{type:'narrative',text:t('A quiet light rests between the pages. She looks up as you enter.','แสงนุ่มนวลทาบอยู่ระหว่างหน้าหนังสือ เธอเงยหน้าขึ้นเมื่อคุณก้าวเข้ามา')},{type:'dialogue',name,text:t('Every journey deserves a beginning. Shall we write yours?','ทุกการเดินทางควรมีจุดเริ่มต้น เรามาเขียนเรื่องราวของคุณกันไหม?')}],new Map([[name.toLowerCase(),profile]]),name,()=>{},async()=>null,null,view);
            motion.add(sample);
        }
    }
    details.addEventListener('toggle',()=>{if(details.open){update();motion.add(sample);}else motion.remove(sample);});
    for(const [key,input] of controls)input.addEventListener('change',async()=>{
        if(busy)return;busy=true;const metadata=api.context().chatMetadata;for(const control of controls.values())control.disabled=true;
        status.textContent=t('Saving…','กำลังบันทึก…');
        try{await api.saveChatAppearanceSetting(key,input.type==='checkbox'?input.checked:input.value);if(api.context().chatMetadata===metadata)status.textContent=t('Saved for this chat.','บันทึกให้แชทนี้แล้ว');}
        catch(error){if(api.context().chatMetadata===metadata)status.textContent=error.message;}
        finally{busy=false;for(const control of controls.values())control.disabled=false;update();}
    });
    update();return {update,destroy(){motion.destroy();root.remove();}};
}
