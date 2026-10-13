import {uiText,uiMarkup} from './ui-language.js?v=0.67.1';
import { element } from './npc-chat.js?v=0.67.1';
import { LORE_CONTENT_LIMIT, LORE_ACTIVE_LIMIT, LORE_BUDGET_MAX, loreEntryLimit } from './lore-core.js?v=0.67.1';
import { LORE_FILE_LIMIT, exportLoreFiles, parseLoreFile, mergeLore } from './lore-transfer.js?v=0.67.1';
import {createArchiveBrowser,createArchiveTools,changeArchiveEnabled,undoArchiveEnabled,archiveStateText,removeArchiveEntries} from './archive-browser.js?v=0.67.1';

export function createLoreWorkspace(panel, api, say, workspaceUi={}) {
    let owner = '', dirty = false, query = '', editing = null, saving = false, session=0, preferencesOpen=false, undo=[],renderList=null;
    const isEnabled=item=>item.enabled===true;
    const browser=createArchiveBrowser({isEnabled,searchText:item=>`${item.title} ${item.content} ${(item.keywords||[]).join(' ')}`});
    const canLeave = () => !saving && (!dirty || confirm(uiText("ยังมี Lore ที่ไม่ได้บันทึก ต้องการทิ้งการแก้ไขนี้หรือไม่?")));
    const entries = () => api.listLore?.() || [];
    const button = (label, action) => {const b=element('button','',label);b.type='button';b.addEventListener('click',action);return b;};
    async function save(next) {
        const target=owner,ticket=session;
        if(target !== api.scopeInfo()?.key) throw Error(uiText("การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่"));
        if(await api.persistLore(next,target)===false)throw Error(uiText('Could not save Lore changes.'));
        if(ticket!==session||target !== api.scopeInfo()?.key) throw Error(uiText("บันทึกการ์ดเดิมแล้ว แต่ตอนนี้เปิดการ์ดอื่นอยู่ กรุณาเปิด Lore Management ใหม่"));
    }
    async function attempt(action){
        if(saving)return;
        const ticket=session;saving=true;panel.inert=true;panel.setAttribute('aria-busy','true');workspaceUi.onBusy?.(true);
        try{await action();}catch(error){if(ticket===session)say(uiText(error.message));}
        finally{if(ticket===session){saving=false;panel.inert=workspaceUi.optionsOpen?.()===true;panel.setAttribute('aria-busy','false');workspaceUi.onBusy?.(false);if(editing===null&&owner===api.scopeInfo()?.key)renderList?.();}}
    }
    function setEnabled(ids,enabled){
        if(owner!==api.scopeInfo()?.key){say(uiText("การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่"));return;}
        if(!canLeave())return;
        return attempt(async()=>{
            const result=changeArchiveEnabled(entries(),ids,enabled,isEnabled);
            if(!result.changes.length){say(uiText('No enabled states changed.'));return;}
            await save(result.entries);undo=result.changes;browser.clear();list();
            say(uiText(enabled?'Enabled {0} entries.':'Disabled {0} entries. Data is kept.',[result.changes.length]));
        });
    }
    function restoreEnabled(){
        if(owner!==api.scopeInfo()?.key){say(uiText("การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่"));return;}
        if(!canLeave())return;
        return attempt(async()=>{
            const result=undoArchiveEnabled(entries(),undo,isEnabled);
            if(!result.changes.length){undo=[];list();say(uiText('Nothing to undo. Newer states were kept.'));return;}
            await save(result.entries);undo=[];browser.clear();list();say(uiText('Restored {0} enabled states.',[result.changes.length]));
        });
    }
    function deleteEntries(ids){
        if(saving)return;
        const ticket=session,target=owner,info=api.scopeInfo();
        const current=()=>ticket===session&&target===owner&&target===api.scopeInfo()?.key;
        if(!info||!current()){say(uiText('Chat/card changed. Reopen this list.'));return;}
        if(!canLeave()||!current())return;
        const selected=removeArchiveEntries(entries(),ids).removed;
        if(!selected.length){say(uiText('No selected entries remain to delete.'));return;}
        if(!confirm(uiText('Delete {0} Lore entries from {1}?\nThis affects all chats of this card and cannot be undone.',[selected.length,info.label])))return;
        if(!current()){say(uiText('Chat/card changed. Reopen this list.'));return;}
        return attempt(async()=>{
            const result=removeArchiveEntries(entries(),selected.map(item=>item.id));
            if(!result.removed.length){say(uiText('No selected entries remain to delete.'));return;}
            await save(result.entries);undo=[];browser.clear();list();say(uiText('Deleted {0} Lore entries.',[result.removed.length]));
        });
    }
    function list() {
        editing=null;dirty=false;panel.replaceChildren();workspaceUi.onView?.('list');
        const optionsPanel=workspaceUi.optionsPanel||panel;if(optionsPanel!==panel)optionsPanel.replaceChildren();
        const info=api.scopeInfo(), all=entries();
        optionsPanel.append(element('p','trpg-muted trpg-lore-scope',info?uiText("Character · {0} — ใช้ร่วมกันทุกแชทของการ์ดนี้",[info.label]):uiText("เปิดแชทของการ์ดตัวละครเดี่ยวเพื่อจัดการ Lore")));
        if(!info){if(optionsPanel!==panel)panel.append(element('p','trpg-empty',uiText("เปิดแชทของการ์ดตัวละครเดี่ยวเพื่อจัดการ Lore")));return;}
        const options=api.loreOptions?.()||{budget:LORE_ACTIVE_LIMIT,mode:'all'};
        const active=all.filter(item=>item.enabled),count=active.reduce((n,item)=>n+item.title.length+item.content.length,0);
        const preferenceDetails=element('details','trpg-lore-preferences');preferenceDetails.open=preferencesOpen;preferenceDetails.setAttribute('data-lore-preferences','');
        preferenceDetails.append(element('summary','',uiText('Lore storage & delivery')));
        preferenceDetails.addEventListener('toggle',()=>{if(preferenceDetails.isConnected!==false)preferencesOpen=preferenceDetails.open;});
        preferenceDetails.append(element('p','trpg-muted',uiText("เปิด {0} / {1} รายการ · คลัง {2} ตัวอักษร · งบส่งครั้งละ {3} ตัวอักษร — {4}",[active.length,all.length,count.toLocaleString(),options.budget.toLocaleString(),options.mode==='all'?uiText("ส่งรายการที่เปิดภายในงบ"):uiText("เลือกจากชื่อ คำค้น และเนื้อหาอัตโนมัติ")])));
        const preferenceMetadata=api.context?.().chatMetadata;
        const preferences=element('div','trpg-lore-tools'),budgetLabel=element('label','',uiText("งบ Lore (ตัวอักษร ไม่ใช่ tokens)")),budget=element('input'),modeLabel=element('label','',uiText("การส่ง Lore")),mode=element('select');
        const capacityLabel=element('label','',uiText('Lore entry capacity')),capacity=element('select'),limitLabel=element('label','',uiText('Maximum Lore entries')),limit=element('input');
        capacity.name='loreCapacity';for(const [value,label]of [['unlimited','Unlimited entries'],['limited','Set an entry limit']]){const option=element('option','',uiText(label));option.value=value;capacity.append(option);}capacity.value=loreEntryLimit(options)?'limited':'unlimited';capacityLabel.append(capacity);
        limit.name='loreEntryLimit';limit.type='number';limit.min=1;limit.step=1;limit.inputMode='numeric';limit.value=loreEntryLimit(options)||1000;limitLabel.append(limit);
        const syncCapacity=()=>{limitLabel.hidden=capacity.value==='unlimited';limit.disabled=limitLabel.hidden;};syncCapacity();capacity.addEventListener('change',syncCapacity);
        budget.type='number';budget.name='loreBudget';budget.min=1000;budget.max=LORE_BUDGET_MAX;budget.step=1000;budget.value=options.budget;budgetLabel.append(budget);
        for(const [value,label] of [['relevant',uiText("อัตโนมัติเฉพาะที่เกี่ยวข้อง · แนะนำ")],['all',uiText("รายการที่เปิดทั้งหมด")]]){const option=element('option','',label);option.value=value;mode.append(option);}mode.value=options.mode;mode.name='loreMode';modeLabel.append(mode);
        preferences.addEventListener('input',()=>dirty=true);preferences.addEventListener('change',()=>dirty=true);
        preferences.append(capacityLabel,limitLabel,budgetLabel,modeLabel,button(uiText('Save Lore settings'),()=>attempt(async()=>{const ticket=session,target=owner;if(api.context?.().chatMetadata!==preferenceMetadata)throw Error("Chat changed. Reopen Lore Management.");const entryLimit=capacity.value==='unlimited'?0:Number(limit.value);if(capacity.value!=='unlimited'&&(!Number.isSafeInteger(entryLimit)||entryLimit<1))throw Error(uiText('Enter a positive whole number for the Lore limit.'));await api.persistLoreOptions({budget:Number(budget.value),mode:mode.value,entryLimit},target);if(ticket!==session||api.context?.().chatMetadata!==preferenceMetadata)return;dirty=false;list();say(uiText('Lore settings saved.'));})));
        preferenceDetails.append(element('p','trpg-muted',uiText('Stored: {0} entries · Capacity: {1}',[all.length.toLocaleString(),loreEntryLimit(options)?loreEntryLimit(options).toLocaleString():uiText('Unlimited entries')])));
        preferenceDetails.append(element('p','trpg-muted',uiText('The entry limit controls new additions in this chat. Lowering it keeps existing records editable. AI delivery still uses the mode and context budget.')));
        if(api.persistLoreOptions){preferenceDetails.append(preferences,element('p','trpg-muted',uiText("Context 2,000,000 tokens ไม่เท่ากับ 2,000,000 ตัวอักษร ควรเผื่อประวัติแชทและคำตอบ โหมดเฉพาะที่เกี่ยวข้องเลือกจากชื่อ คำค้น และคำในเนื้อหา Lore อัตโนมัติจาก 8 ข้อความล่าสุด โดยไม่เรียก AI เพิ่ม; ตรึงรายการที่จำเป็นได้")));optionsPanel.append(preferenceDetails);}
        const tools=element('div','trpg-lore-tools trpg-lore-browser-tools'),label=element('label','',uiText("ค้นหา Lore")),search=element('input');search.type='search';search.value=query;search.placeholder=uiText('Title, keywords or content');search.setAttribute('data-lore-search','');label.append(search);
        const file=element('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.setAttribute('aria-label',uiText("Import Lore JSON"));
        file.addEventListener('change',()=>{
            const selected=file.files?.[0];file.value='';if(!selected)return;
            const target=owner,ticket=session;
            if(!canLeave())return;
            return attempt(async()=>{
                if(selected.size>LORE_FILE_LIMIT)throw Error(uiText("ไฟล์ Lore ต้องไม่เกิน 12 MB"));
                const imported=parseLoreFile(await selected.text());
                if(ticket!==session||target!==owner||target!==api.scopeInfo()?.key)throw Error(uiText("การ์ดเปลี่ยนแล้ว กรุณาเลือกไฟล์ใหม่ในการ์ดที่ต้องการ"));
                const merged=mergeLore(entries(),imported,api.loreOptions?.());
                if(!merged.added){say(uiText("ไม่มีรายการใหม่ · ข้ามข้อมูลซ้ำ {0} รายการ",[merged.skipped]));return;}
                if(!confirm(uiText("นำเข้า Lore {0} รายการไปยัง {1}? ข้ามข้อมูลซ้ำ {2} รายการ โดยเก็บ Lore เดิมไว้ทั้งหมด",[merged.added,info.label,merged.skipped])))return;
                workspaceUi.closeOptions?.();
                await save(merged.entries);list();say(uiText("นำเข้า Lore แล้ว {0} รายการ · ข้ามข้อมูลซ้ำ {1} รายการ",[merged.added,merged.skipped]));
            });
        });
        const exportParts=element('div','trpg-lore-option-actions');
        function downloadFile(text,name){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=name;document.body.append(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}}
        const download=button(uiText("Export JSON"),()=>attempt(()=>{
            if(owner!==api.scopeInfo()?.key)throw Error(uiText("การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่"));
            const files=exportLoreFiles(entries());exportParts.replaceChildren();
            if(files.length===1){downloadFile(files[0],'roleforge-lore.json');say(uiText("ส่งออก Lore ที่บันทึกแล้วเป็นไฟล์ JSON"));return;}
            exportParts.append(element('p','trpg-muted',uiText('Large archive: download all {0} parts, then import each file into the same card. Each file is within 12 MB.',[files.length])));
            files.forEach((text,index)=>exportParts.append(button(uiText('Download Lore part {0} / {1}',[index+1,files.length]),()=>downloadFile(text,`roleforge-lore-${String(index+1).padStart(3,'0')}-of-${files.length}.json`))));
            say(uiText('Prepared {0} Lore export files. No entries were removed.',[files.length]));
        }));
        tools.append(label);panel.append(tools);
        const actions=element('div','trpg-lore-option-actions');actions.append(button(uiText("＋ สร้าง Lore ใหม่"),()=>{if(canLeave())edit({id:'',title:'',content:'',enabled:true});}),button(uiText("Import JSON"),()=>{if(canLeave())file.click();}),download,file);optionsPanel.append(actions);
        const transferHelp=element('details','trpg-lore-transfer-help');transferHelp.append(element('summary','',uiText('About Lore import / export')),element('p','trpg-muted',uiText("Import/Export ไฟล์ Lore JSON · นำเข้าแบบเพิ่มรวมและข้ามรายการที่เหมือนกันทุกช่อง · เก็บชื่อ เนื้อหา คำค้น เปิด/ปิด และการตรึง · งบและโหมดของการ์ดนี้ไม่เปลี่ยน")));
        optionsPanel.append(exportParts,transferHelp);
        const pager=element('div','trpg-pagination');pager.setAttribute('data-lore-pagination','');
        const archiveTools=createArchiveTools(browser,{refresh:renderRows,change:setEnabled,undo:restoreEnabled,remove:deleteEntries,pager});panel.append(archiveTools.root);
        const heading=element('div','trpg-list-heading'),total=element('span');heading.append(element('span','',uiText('LORE RECORDS')),total);
        const rows=element('div','trpg-lore-rows'),scroller=element('div','trpg-archive-scroll');scroller.setAttribute('data-lore-scroll','');scroller.append(heading,rows);panel.append(scroller,archiveTools.dock);
        function renderRows({resetScroll=false}={}){rows.replaceChildren();const current=entries(),view=browser.view(current);archiveTools.update(view,{busy:saving,canUndo:undo.length>0});total.textContent=uiText('{0} / {1} entries',[view.filtered.length,current.length]);
            for(const item of view.items){
                const row=element('article',`trpg-lore-row trpg-archive-row${item.enabled?'':' is-disabled'}${browser.has(item.id)?' is-selected':''}`),toggleLabel=element('label','trpg-lore-toggle trpg-archive-switch'),toggle=element('input');row.setAttribute('data-archive-id',item.id);row.setAttribute('data-enabled',String(item.enabled));toggle.type='checkbox';toggle.checked=item.enabled;toggle.setAttribute('data-archive-toggle',item.id);toggle.setAttribute('aria-label',uiText("เปิด Lore {0}",[item.title]));
                toggleLabel.title=uiText(item.enabled?'Disable {0} (keep data)':'Enable {0}',[item.title]);
                toggle.addEventListener('change',async()=>{
                    try{await setEnabled([item.id],toggle.checked);}
                    finally{toggle.checked=entries().find(v=>v.id===item.id)?.enabled===true;}
                });
                toggleLabel.append(toggle,element('span','',archiveStateText(item.enabled)));
                const open=button(item.title,()=>{if(canLeave())edit(item);});open.className='trpg-lore-title';
                const copy=element('div','trpg-lore-copy');copy.append(open,element('p','trpg-lore-excerpt',item.content.slice(0,180)));if(item.always)copy.append(element('small','trpg-archive-pin',uiText('Pinned for relevant delivery')));
                row.append(toggleLabel,copy,button(uiText("ลบ"),()=>deleteEntries([item.id])));
                if(browser.selecting){
                    const label=element('label','trpg-archive-select'),check=element('input');check.type='checkbox';check.checked=browser.has(item.id);check.setAttribute('data-archive-select',item.id);check.setAttribute('aria-label',uiText('Select {0}',[item.title]));
                    check.addEventListener('change',()=>{if(saving)return;browser.select(item.id,check.checked);row.classList.toggle('is-selected',check.checked);archiveTools.update(browser.view(entries()),{canUndo:undo.length>0});});label.append(check);row.append(label);
                }
                rows.append(row);
            }
            if(!view.items.length)rows.append(element('p','trpg-empty',current.length?uiText('No entries match this search or filter'):uiText("ยังไม่มี Lore — กดสร้าง Lore ใหม่เพื่อเพิ่มข้อมูลโลก สถานที่ กฎ หรือประวัติ")));
            pager.replaceChildren();
            const prev=button('‹',()=>{if(saving)return;browser.setPage(view.page-1);renderRows({resetScroll:true});}),next=button('›',()=>{if(saving)return;browser.setPage(view.page+1);renderRows({resetScroll:true});});prev.setAttribute('aria-label',uiText("← ก่อนหน้า"));next.setAttribute('aria-label',uiText("ถัดไป →"));prev.disabled=saving||view.page===0;next.disabled=saving||view.page===view.pages-1;pager.append(prev,element('span','',`${view.page+1} / ${view.pages}`),next);
            if(resetScroll)scroller.scrollTop=0;
        }
        renderList=renderRows;search.addEventListener('input',()=>{if(saving)return;query=search.value;browser.setQuery(query);renderRows({resetScroll:true});});renderRows();
    }
    function edit(item) {
        workspaceUi.closeOptions?.();editing=item.id;renderList=null;dirty=false;panel.replaceChildren();workspaceUi.onView?.('edit');say('');
        const form=element('form','trpg-lore-editor'),titleLabel=element('label','',uiText("ชื่อ Lore")),title=element('input'),bodyLabel=element('label','',uiText("เนื้อหา Lore")),body=element('textarea'),enabledLabel=element('label','trpg-lore-toggle'),enabled=element('input');
        title.value=item.title;title.required=true;title.maxLength=160;title.name='loreTitle';body.value=item.content;body.required=true;body.maxLength=LORE_CONTENT_LIMIT;body.rows=14;body.name='loreContent';enabled.type='checkbox';enabled.checked=item.enabled;
        titleLabel.append(title);bodyLabel.append(body);enabledLabel.append(enabled,document.createTextNode(uiText("เปิดใช้งาน · ตามโหมดและงบที่ตั้งไว้")));
        const keywordsLabel=element('label','',uiText("คำค้นเสริม (ไม่จำเป็น · ระบบอ่านชื่อและเนื้อหาเอง)")),keywords=element('input'),alwaysLabel=element('label','trpg-lore-toggle'),always=element('input');keywords.name='loreKeywords';keywords.value=(item.keywords||[]).join(', ');keywordsLabel.append(keywords);always.type='checkbox';always.name='loreAlways';always.checked=item.always===true;alwaysLabel.append(always,document.createTextNode(uiText("ส่งรายการนี้ก่อนเสมอในโหมดเฉพาะที่เกี่ยวข้อง (ยังอยู่ภายในงบ)")));
        const counter=element('small','trpg-muted');const update=()=>counter.textContent=uiText("{0} / {1} ตัวอักษร",[body.value.length.toLocaleString(),LORE_CONTENT_LIMIT.toLocaleString()]);update();
        form.addEventListener('input',()=>{dirty=true;update();});form.addEventListener('change',()=>dirty=true);
        const actions=element('div','trpg-lore-tools'),submit=element('button','trpg-primary',uiText("บันทึก Lore"));submit.type='submit';actions.append(submit,button(uiText("กลับรายการ"),()=>{if(canLeave())list();}));
        if(item.id){const remove=button(uiText("ลบ"),()=>deleteEntries([item.id]));remove.className='trpg-danger';actions.append(remove);}
        form.append(element('h3','',item.id?uiText("แก้ไข Lore"):uiText("สร้าง Lore ใหม่")),titleLabel,bodyLabel,counter,enabledLabel,keywordsLabel,alwaysLabel,actions);panel.append(form);
        form.addEventListener('submit',event=>{event.preventDefault();return attempt(async()=>{
            const all=entries();if(item.id&&!all.some(v=>v.id===item.id))throw Error(uiText("Lore นี้ถูกลบแล้ว กรุณากลับรายการ"));
            const next={id:item.id||(globalThis.crypto?.randomUUID?.()||`lore-${Date.now()}-${Math.random().toString(36).slice(2)}`),title:title.value.trim(),content:body.value.trim(),enabled:enabled.checked,keywords:keywords.value.split(',').map(v=>v.trim()).filter(Boolean),always:always.checked};
            await save(item.id?all.map(v=>v.id===item.id?next:v):[...all,next]);dirty=false;list();say(uiText("บันทึก Lore แล้ว — มีผลกับการเจนครั้งถัดไป"));
        });});title.focus();
    }
    return {canLeave,open(){++session;owner=api.scopeInfo()?.key||'';query='';preferencesOpen=false;undo=[];browser.reset();saving=false;panel.inert=false;panel.setAttribute('aria-busy','false');workspaceUi.onBusy?.(false);list();},reset(){++session;dirty=false;editing=null;renderList=null;saving=false;panel.inert=false;panel.setAttribute('aria-busy','false');workspaceUi.onBusy?.(false);undo=[];browser.reset();},refresh(){if(!saving&&editing===null&&!dirty)list();}};
}

