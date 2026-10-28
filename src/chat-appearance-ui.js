import {CHAT_THEMES,CHAT_APPEARANCE_KEYS,chatAppearance} from './chat-themes.js?v=0.90.0';
import {element,renderStoryBlocks} from './npc-chat.js?v=0.90.0';

// Native SillyTavern controls; the expandable sample uses the real renderer.
export function mountChatAppearanceControls(parent,api) {
    const root=element('div','rf-chat-appearance-settings'),controls=new Map(),texts=new Map();let busy=false,previewKey='',scope=null;
    function field(key,input){const row=element('label','rf-chat-appearance-field'),label=element('span');input.classList.add('text_pole');input.dataset.presentationSetting=key;controls.set(key,input);texts.set(key,label);row.append(label,input);root.append(row);return row;}
    const theme=element('select');for(const item of CHAT_THEMES){const option=element('option','',item.name);option.value=item.key;theme.append(option);}field('chatTheme',theme);
    const description=element('small','rf-chat-theme-description');root.append(description);
    const switches=element('div','rf-chat-appearance-switches');
    for(const key of ['showChatHeader','showChatDialogue','showChatNarrative']){
        const label=element('label','checkbox_label'),input=element('input'),text=element('span');input.type='checkbox';input.dataset.presentationSetting=key;
        controls.set(key,input);texts.set(key,text);label.append(input,text);switches.append(label);
    }
    root.append(switches);
    const effects=element('input');effects.type='checkbox';const effectsRow=field('chatEffects',effects);
    const vitals=element('input');vitals.type='checkbox';const vitalsRow=field('chatNpcVitals',vitals),vitalsHelp=element('small','rf-chat-appearance-help');root.append(vitalsHelp);
    for(const [row,input] of [[effectsRow,effects],[vitalsRow,vitals]]){row.classList.add('checkbox_label','rf-chat-appearance-check');input.classList.remove('text_pole');row.prepend(input);}
    const badge=element('select'),badgeOptions=new Map();for(const value of ['occupation','ability','off']){const option=element('option');option.value=value;badge.append(option);badgeOptions.set(value,option);}
    const badgeRow=field('chatHeaderBadgeMode',badge),ability=element('input');ability.type='text';ability.maxLength=120;
    const abilityRow=field('chatHeaderBadgeAbility',ability),suggestions=element('datalist');suggestions.id='rf-chat-badge-abilities';ability.setAttribute('list',suggestions.id);abilityRow.append(suggestions);
    const badgeHelp=element('small','rf-chat-appearance-help');root.append(badgeHelp);
    const help=element('small','rf-chat-appearance-help'),status=element('small','rf-chat-appearance-status');status.setAttribute('role','status');root.append(help,status);
    const details=element('details','rf-chat-theme-preview'),summary=element('summary'),sample=element('div','trpg-chat');details.append(summary,sample);root.append(details);
    const gallery=element('a','menu_button');gallery.href=new URL('../docs/previews/chat-designs/index.html',import.meta.url).href;gallery.target='_blank';gallery.rel='noopener';root.append(gallery);parent.append(root);
    const t=(en,th)=>api.settings().language==='th'?th:en;
    function update(){
        const metadata=api.context().chatMetadata;if(metadata!==scope){scope=metadata;status.textContent='';previewKey='';}
        const settings=api.settings(),view=chatAppearance(settings);
        const selected=CHAT_THEMES.find(item=>item.key===view.theme);
        texts.get('chatTheme').textContent=t('Chat design','ดีไซน์ในแชท');description.textContent=t(selected.description,selected.descriptionTh);
        texts.get('chatHeaderBadgeMode').textContent=t('Header badge','ป้ายข้อมูล Header');
        texts.get('chatEffects').textContent=t('Design motion effects','ลูกเล่นการเคลื่อนไหวของดีไซน์');effectsRow.hidden=false;
        texts.get('chatNpcVitals').textContent=t('Aincrad · NPC HP / Lv','Aincrad · HP / Lv ของ NPC');vitalsRow.hidden=vitalsHelp.hidden=view.theme!=='aincrad';
        vitalsHelp.textContent=t('Reads NPC stats.hp and stats.level. Missing values are hidden; HP 0 is shown. The underline is decorative, not a health percentage. Entrance motion is brief, skips streaming updates and respects Reduce Motion.','อ่าน stats.hp และ stats.level ของ NPC ซ่อนค่าที่ไม่มีข้อมูลและแสดง HP 0 เส้นใต้เป็นของตกแต่ง ไม่ใช่เปอร์เซ็นต์เลือด ลูกเล่นเข้าแชทเป็นภาพเคลื่อนไหวสั้น ไม่เล่นซ้ำระหว่างสตรีม และรองรับ Reduce Motion');
        for(const [value,labels]of [['occupation',['Occupation + NPC rank','อาชีพ + ระดับ NPC']],['ability',['Selected skill + mastery','สกิลที่เลือก + ขั้นความเชี่ยวชาญ']],['off',['Hide badge','ซ่อนป้ายข้อมูล']]])badgeOptions.get(value).textContent=t(...labels);
        texts.get('chatHeaderBadgeAbility').textContent=t('Skill name or category from NPC abilities','ชื่อสกิลหรือหมวดหมู่จากข้อมูลสกิล NPC');ability.placeholder=t('For example: Water Magic or Marksmanship','เช่น เวทน้ำ หรือการยิงปืน');
        badgeRow.hidden=badgeHelp.hidden=view.theme==='roleforge';abilityRow.hidden=view.theme==='roleforge'||view.badgeMode!=='ability';
        badgeHelp.textContent=t('Occupation uses the NPC’s overall rank, not magic mastery. Skill mode uses that skill’s level. Select a specific name if a category contains several skills. Missing facts are hidden; any genre works. Saved for this chat.','โหมดอาชีพใช้ระดับโดยรวมของ NPC ไม่ใช่ขั้นเวทมนตร์ โหมดสกิลใช้ขั้นของสกิลนั้น ถ้าหมวดมีหลายสกิลให้เลือกชื่อสกิลโดยตรง ข้อมูลที่ยังไม่มีจะถูกซ่อน ใช้ได้ทุกแนวเรื่อง บันทึกแยกแชท');
        const choices=[...new Set((api.state?.().npcs||[]).flatMap(npc=>(npc.abilities||[]).flatMap(skill=>[skill.name,skill.category])).filter(value=>typeof value==='string'&&value.trim()))].sort();
        if(JSON.stringify(choices)!==suggestions.dataset.choices){suggestions.dataset.choices=JSON.stringify(choices);suggestions.replaceChildren(...choices.map(value=>{const option=element('option');option.value=value;return option;}));}
        for(const [key,label] of [['showChatHeader',['Header · character nameplate','Header · ป้ายตัวละคร']],['showChatDialogue',['Dialogue · speech frame','Dialogue · กรอบบทพูด']],['showChatNarrative',['Narrative · narration frame','Narrative · กรอบบรรยาย']]])texts.get(key).textContent=t(...label);
        help.textContent=t('Enable Header, Dialogue and Narrative independently. Saved for this chat. Without a frame, speech appears as "text" in the speaker’s character color and narration in italics; Header becomes a plain speaker name. Header and Narrative have no background. Player |thoughts| remain unspoken. Player and NPC inner thoughts are always borderless, independently of Dialogue frames, and are never voiced; ordinary narrative italics stay narration. Regex/MVU widgets keep their own design.','เปิด/ปิด Header, Dialogue และ Narrative ได้อิสระ จำค่าแยกแชท เมื่อปิดกรอบ บทพูดแสดงเป็น "text" ด้วยสีประจำตัวผู้พูด และคำบรรยายเป็นตัวเอียงโดยไม่มีดอกจัน ส่วน Header เหลือชื่อผู้พูดธรรมดา Header กับ Narrative ไม่มีพื้นหลัง ผู้เล่นใช้ |พูดในใจ| ได้ตามเดิม ความคิดผู้เล่นและ NPC ไม่มีกรอบเสมอ ไม่ขึ้นกับสวิตช์ Dialogue และไม่ถูกพากย์ ตัวเอียงในบรรยายทั่วไปคงเดิม UI ของ Regex/MVU ใช้หน้าตาของตัวเอง');
        summary.textContent=`${t('Preview','ดูตัวอย่าง')} · ${selected.name}`;gallery.textContent=t('PC / mobile preview ↗','พรีวิว PC / มือถือ ↗');
        if(!busy)for(const [key,input] of controls)if(input.type==='checkbox')input.checked=view[CHAT_APPEARANCE_KEYS[key]];else input.value=view[CHAT_APPEARANCE_KEYS[key]];
        const signature=JSON.stringify([view,settings.language]);
        if(details.open&&signature!==previewKey){
            previewKey=signature;sample.replaceChildren();
            const name='Liora',profile={name,title:t('Keeper of stories','ผู้ดูแลเรื่องราว'),occupation:t('Librarian','บรรณารักษ์'),stats:{rank:t('Senior','อาวุโส'),hp:100,level:7},race:t('Human','มนุษย์'),relationship:t('Ally','พันธมิตร'),identityColor:'#b9a077',roleIcon:'book'};
            renderStoryBlocks(sample,[{type:'header',name},{type:'narrative',text:t('A quiet light rests between the pages. She looks up as you enter.','แสงนุ่มนวลทาบอยู่ระหว่างหน้าหนังสือ เธอเงยหน้าขึ้นเมื่อคุณก้าวเข้ามา')},{type:'dialogue',name,text:t('Every journey deserves a beginning. Shall we write yours?','ทุกการเดินทางควรมีจุดเริ่มต้น เรามาเขียนเรื่องราวของคุณกันไหม?')}],new Map([[name.toLowerCase(),profile]]),name,()=>{},async()=>null,null,view);
        }
    }
    details.addEventListener('toggle',()=>{if(details.open)update();});
    for(const [key,input] of controls)input.addEventListener('change',async()=>{
        if(busy)return;busy=true;const metadata=api.context().chatMetadata;for(const control of controls.values())control.disabled=true;
        status.textContent=t('Saving…','กำลังบันทึก…');
        try{await api.saveChatAppearanceSetting(key,input.type==='checkbox'?input.checked:input.value);if(api.context().chatMetadata===metadata)status.textContent=t('Saved for this chat.','บันทึกให้แชทนี้แล้ว');}
        catch(error){if(api.context().chatMetadata===metadata)status.textContent=error.message;}
        finally{busy=false;for(const control of controls.values())control.disabled=false;update();}
    });
    update();return {update,destroy(){root.remove();}};
}
