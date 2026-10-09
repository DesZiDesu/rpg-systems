import {PRESET_COMPONENTS,PRESET_FILE_LIMIT,presetLibrary,exportWorldPreset,importWorldPreset} from './world-presets.js?v=0.62.0';
const labels={world:['ทุกระบบของโลก','World · all systems'],powerPreset:['พลัง','Power'],forgePreset:['สร้างตัวละคร','Character Creation'],currencyPreset:['ค่าเงิน','Currency'],trainingPreset:['สถิติและวิธีฝึก','Stats & training'],loreOptions:['โหมดและงบ Lore','Lore options'],systems:['ระบบที่เปิดใช้','World systems']};
const node=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function mountPresetWorkspace(root,api) {
    let signature='',metadata=null,selected='',kind='world',name='',busy=false,libraryRef=null,lastLanguage='';
    const fold=root.closest('details');
    const t=(th,en)=>api.language()==='th'?th:en;
    const label=key=>labels[key][api.language()==='th'?0:1];
    const records=()=>presetLibrary(api.settings());
    function download(source,filename){const url=URL.createObjectURL(new Blob([source],{type:'application/json'})),a=node('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    async function act(fn){
        if(busy)return;busy=true;root.inert=true;const captured=api.context().chatMetadata;
        try{await fn();if(api.context().chatMetadata===captured)update(true);}
        catch(error){if(api.context().chatMetadata===captured){const status=root.querySelector('[role=status]');if(status)status.textContent=error.message;}}
        finally{busy=false;root.inert=false;}
    }
    function update(force=false){
        const context=api.context(),key=context.getCurrentChatId?.()||'',library=records(),language=api.language();
        if(!force&&root.childElementCount&&metadata===context.chatMetadata&&libraryRef===library&&lastLanguage===language&&fold&&!fold.open)return;
        const config=api.current();
        const next=JSON.stringify([key,library,config,api.language()]);
        if(!force&&metadata===context.chatMetadata&&(busy||root.contains(document.activeElement)))return;
        if(!force&&metadata===context.chatMetadata&&signature===next)return;
        signature=next;metadata=context.chatMetadata;libraryRef=library;lastLanguage=language;
        if(!library.some(r=>r.id===selected))selected='';
        root.replaceChildren();
        root.append(node('p',t('เลือก preset ให้แชทนี้เท่านั้น · โหลดเป็นสำเนา การแก้หรือลบในคลังไม่เปลี่ยนแชทอื่น · เก็บเงินและความคืบหน้าเดิม','Presets apply only to this chat. Loading makes a copy; editing or deleting a library preset leaves existing chats unchanged. Money and progress are preserved.')));
        const scopeLabel=node('label',t('ระบบที่ต้องการบันทึก','System to save')),scope=node('select');scope.className='text_pole';scope.dataset.presetKind='';
        for(const key of ['world',...PRESET_COMPONENTS]){const o=node('option',label(key));o.value=key;scope.append(o);}scope.value=kind;scope.onchange=()=>{kind=scope.value;};scopeLabel.append(scope);
        const nameLabel=node('label',t('ชื่อ preset','Preset name')),input=node('input');input.className='text_pole';input.maxLength=120;input.value=name;input.dataset.presetName='';input.oninput=()=>{name=input.value;};nameLabel.append(input);
        const pickerLabel=node('label',t('คลัง preset','Preset library')),picker=node('select');picker.className='text_pole';picker.dataset.presetSelect='';
        const placeholder=node('option',t('เลือกชุดที่บันทึกไว้','Select a saved preset'));placeholder.value='';picker.append(placeholder);
        for(const record of library){const o=node('option',`${record.name} · ${Object.keys(record.config).map(label).join(', ')}`);o.value=record.id;picker.append(o);}picker.value=selected;
        picker.onchange=()=>{selected=picker.value;const r=library.find(r=>r.id===selected);if(r){name=r.name;input.value=name;}};pickerLabel.append(picker);
        const actions=node('div');actions.className='flex-container flexGap5';
        const button=(key,text,fn,needsChat=false)=>{const b=node('button',text);b.type='button';b.className='menu_button';b.dataset.presetAction=key;b.disabled=needsChat&&!context.getCurrentChatId?.();b.onclick=()=>act(fn);actions.append(b);};
        const capturedConfig=()=>kind==='world'?api.current():{[kind]:api.current()[kind]};
        button('create',t('บันทึกเป็นชุดใหม่','Save as new'),()=>api.save({name:input.value,config:capturedConfig()}),true);
        button('load',t('ใช้กับแชทนี้','Load into this chat'),async()=>{const r=records().find(r=>r.id===selected);if(!r)throw Error(t('เลือก preset ก่อน','Select a preset first'));if(confirm(t('โหลดการตั้งค่าชุดนี้ลงแชทปัจจุบัน? จะรักษาเงินและความคืบหน้าไว้','Load this configuration into the current chat? Money and progress will be preserved.')))await api.apply(r.config);},true);
        button('rename',t('เปลี่ยนชื่อ','Rename'),()=>{const r=records().find(r=>r.id===selected);if(!r)throw Error(t('เลือก preset ก่อน','Select a preset first'));return api.save({...r,name:input.value},r.id);});
        button('replace',t('อัปเดตชุดที่เลือก','Update selected'),()=>{const r=records().find(r=>r.id===selected);if(!r)throw Error(t('เลือก preset ก่อน','Select a preset first'));if(confirm(t('แทนที่ preset ในคลังด้วยการตั้งค่าปัจจุบัน? แชทที่โหลดไปแล้วจะคงค่าเดิม','Replace this library preset with the current configuration? Existing chat copies stay unchanged.')))return api.save({name:input.value,config:capturedConfig()},r.id);},true);
        button('delete',t('ลบชุดที่เลือก','Delete selected'),()=>{const r=records().find(r=>r.id===selected);if(!r)throw Error(t('เลือก preset ก่อน','Select a preset first'));if(confirm(t('ลบ preset นี้จากคลัง? แชทที่ใช้อยู่ยังเก็บสำเนาไว้','Delete this library preset? Existing chats retain their copies.')))return api.remove(r.id);});
        button('export',t('Export ชุดที่เลือก','Export selected'),()=>{const r=records().find(r=>r.id===selected);if(!r)throw Error(t('เลือก preset ก่อน','Select a preset first'));download(exportWorldPreset(r.config,r.name),'roleforge-preset.json');});
        const file=node('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.dataset.presetImport='';file.onchange=()=>{const f=file.files?.[0];file.value='';if(f)void act(async()=>{if(f.size>PRESET_FILE_LIMIT)throw Error(t('ไฟล์ต้องไม่เกิน 1 MB','Files must be at most 1 MB'));const parsed=importWorldPreset(await f.text());await api.save(parsed);name=parsed.name;});};
        button('import',t('Import JSON เข้าคลัง','Import JSON to library'),()=>file.click());
        button('reset',t('กลับค่าจากการ์ด','Reset chat to card defaults'),async()=>{if(confirm(t('กลับไปใช้การตั้งค่าเริ่มต้นของการ์ด? เงินและความคืบหน้าจะยังอยู่','Restore card defaults for this chat? Money and progress are preserved.')))await api.reset();},true);
        const status=node('p',t(`บันทึกไว้ ${library.length}/100 ชุด · ไฟล์ preset ไม่มีข้อมูลผู้เล่นหรือ API key`,`Saved ${library.length}/100 presets. Preset files contain no player progress or API keys.`));status.className='rf-native-editor-status';status.setAttribute('role','status');
        root.append(scopeLabel,nameLabel,pickerLabel,actions,file,status);
    }
    fold?.addEventListener('toggle',()=>{if(fold.open)update(true);});
    update();return {update};
}
