import {uiText,uiMarkup} from './ui-language.js?v=0.50.0';
import { element } from './npc-chat.js?v=0.50.0';
import { LORE_CONTENT_LIMIT, LORE_ACTIVE_LIMIT, LORE_BUDGET_MAX } from './lore-core.js?v=0.50.0';
import { LORE_FILE_LIMIT, exportLore, parseLoreFile, mergeLore } from './lore-transfer.js?v=0.50.0';

export function createLoreWorkspace(panel, api, say) {
    let owner = '', dirty = false, query = '', editing = null, saving = false;
    const canLeave = () => !saving && (!dirty || confirm(uiText("ยังมี Lore ที่ไม่ได้บันทึก ต้องการทิ้งการแก้ไขนี้หรือไม่?")));
    const entries = () => api.listLore?.() || [];
    const button = (label, action) => {const b=element('button','',label);b.type='button';b.addEventListener('click',action);return b;};
    async function save(next) {
        if(owner !== api.scopeInfo()?.key) throw Error(uiText("การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่"));
        await api.persistLore(next,owner);
        if(owner !== api.scopeInfo()?.key) throw Error(uiText("บันทึกการ์ดเดิมแล้ว แต่ตอนนี้เปิดการ์ดอื่นอยู่ กรุณาเปิด Lore Management ใหม่"));
    }
    async function attempt(action){
        if(saving)return;
        saving=true;panel.inert=true;
        try{await action();}catch(error){say(uiText(error.message));}
        finally{saving=false;panel.inert=false;}
    }
    function list() {
        editing=null;dirty=false;panel.replaceChildren();
        const info=api.scopeInfo(), all=entries();
        panel.append(element('h3','',uiText("Lore Management")),element('p','trpg-muted',info?uiText("Character · {0} — ใช้ร่วมกันทุกแชทของการ์ดนี้",[info.label]):uiText("เปิดแชทของการ์ดตัวละครเดี่ยวเพื่อจัดการ Lore")));
        if(!info)return;
        const options=api.loreOptions?.()||{budget:LORE_ACTIVE_LIMIT,mode:'all'};
        const active=all.filter(item=>item.enabled),count=active.reduce((n,item)=>n+item.title.length+item.content.length,0);
        panel.append(element('p','trpg-muted',uiText("เปิด {0} / {1} รายการ · คลัง {2} ตัวอักษร · งบส่งครั้งละ {3} ตัวอักษร — {4}",[active.length,all.length,count.toLocaleString(),options.budget.toLocaleString(),options.mode==='all'?uiText("ส่งรายการที่เปิดภายในงบ"):uiText("เลือกจากชื่อ คำค้น และเนื้อหาอัตโนมัติ")])));
        const preferences=element('div','trpg-lore-tools'),budgetLabel=element('label','',uiText("งบ Lore (ตัวอักษร ไม่ใช่ tokens)")),budget=element('input'),modeLabel=element('label','',uiText("การส่ง Lore")),mode=element('select');
        budget.type='number';budget.name='loreBudget';budget.min=1000;budget.max=LORE_BUDGET_MAX;budget.step=1000;budget.value=options.budget;budgetLabel.append(budget);
        for(const [value,label] of [['relevant',uiText("อัตโนมัติเฉพาะที่เกี่ยวข้อง · แนะนำ")],['all',uiText("รายการที่เปิดทั้งหมด")]]){const option=element('option','',label);option.value=value;mode.append(option);}mode.value=options.mode;mode.name='loreMode';modeLabel.append(mode);
        preferences.addEventListener('input',()=>dirty=true);preferences.addEventListener('change',()=>dirty=true);
        preferences.append(budgetLabel,modeLabel,button(uiText("บันทึกงบและโหมด"),()=>attempt(()=>{api.persistLoreOptions({budget:Number(budget.value),mode:mode.value},owner);dirty=false;list();say(uiText("บันทึกงบและโหมด Lore แล้ว"));})));
        if(api.persistLoreOptions)panel.append(preferences,element('p','trpg-muted',uiText("Context 2,000,000 tokens ไม่เท่ากับ 2,000,000 ตัวอักษร ควรเผื่อประวัติแชทและคำตอบ โหมดเฉพาะที่เกี่ยวข้องเลือกจากชื่อ คำค้น และคำในเนื้อหา Lore อัตโนมัติจาก 8 ข้อความล่าสุด โดยไม่เรียก AI เพิ่ม; ตรึงรายการที่จำเป็นได้")));
        const tools=element('div','trpg-lore-tools'),label=element('label','',uiText("ค้นหา Lore")),search=element('input');search.type='search';search.value=query;search.placeholder=uiText("ชื่อหรือเนื้อหา");label.append(search);
        const file=element('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.setAttribute('aria-label',uiText("Import Lore JSON"));
        file.addEventListener('change',()=>{
            const selected=file.files?.[0];file.value='';if(!selected)return;
            const target=owner;
            if(!canLeave())return;
            return attempt(async()=>{
                if(selected.size>LORE_FILE_LIMIT)throw Error(uiText("ไฟล์ Lore ต้องไม่เกิน 12 MB"));
                const imported=parseLoreFile(await selected.text());
                if(target!==owner||target!==api.scopeInfo()?.key)throw Error(uiText("การ์ดเปลี่ยนแล้ว กรุณาเลือกไฟล์ใหม่ในการ์ดที่ต้องการ"));
                const merged=mergeLore(entries(),imported);
                if(!merged.added){say(uiText("ไม่มีรายการใหม่ · ข้ามข้อมูลซ้ำ {0} รายการ",[merged.skipped]));return;}
                if(!confirm(uiText("นำเข้า Lore {0} รายการไปยัง {1}? ข้ามข้อมูลซ้ำ {2} รายการ โดยเก็บ Lore เดิมไว้ทั้งหมด",[merged.added,info.label,merged.skipped])))return;
                await save(merged.entries);list();say(uiText("นำเข้า Lore แล้ว {0} รายการ · ข้ามข้อมูลซ้ำ {1} รายการ",[merged.added,merged.skipped]));
            });
        });
        const download=button(uiText("Export JSON"),()=>attempt(()=>{
            if(owner!==api.scopeInfo()?.key)throw Error(uiText("การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่"));
            const blob=new Blob([exportLore(entries())],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=element('a');
            a.href=url;a.download='roleforge-lore.json';document.body.append(a);
            try{a.click();say(uiText("ส่งออก Lore ที่บันทึกแล้วเป็นไฟล์ JSON"));}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
        }));
        tools.append(label,button(uiText("＋ สร้าง Lore ใหม่"),()=>{if(canLeave())edit({id:'',title:'',content:'',enabled:true});}),button(uiText("Import JSON"),()=>{if(canLeave())file.click();}),download,file);panel.append(tools);
        panel.append(element('p','trpg-muted',uiText("Import/Export ไฟล์ Lore JSON · นำเข้าแบบเพิ่มรวมและข้ามรายการที่เหมือนกันทุกช่อง · เก็บชื่อ เนื้อหา คำค้น เปิด/ปิด และการตรึง · งบและโหมดของการ์ดนี้ไม่เปลี่ยน")));
        const rows=element('div','trpg-lore-rows');panel.append(rows);
        function renderRows(){rows.replaceChildren();const shown=all.filter(item=>`${item.title} ${item.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
            for(const item of shown){
                const row=element('article','trpg-lore-row'),toggleLabel=element('label','trpg-lore-toggle'),toggle=element('input');toggle.type='checkbox';toggle.checked=item.enabled;toggle.setAttribute('aria-label',uiText("เปิด Lore {0}",[item.title]));
                toggle.addEventListener('change',()=>attempt(async()=>{
                    try{await save(entries().map(v=>v.id===item.id?{...v,enabled:toggle.checked}:v));list();say(uiText("บันทึกการเปิด–ปิด Lore แล้ว"));}
                    finally{toggle.checked=entries().find(v=>v.id===item.id)?.enabled===true;}
                }));
                toggleLabel.append(toggle,document.createTextNode(item.enabled?uiText("เปิด"):uiText("ปิด")));
                const open=button(item.title,()=>{if(canLeave())edit(item);});open.className='trpg-lore-title';
                row.append(toggleLabel,open,element('p','trpg-lore-excerpt',item.content.slice(0,180)),button(uiText("ลบ"),()=>{if(confirm(uiText("ลบ Lore “{0}”?",[item.title])))return attempt(async()=>{await save(entries().filter(v=>v.id!==item.id));list();say(uiText("ลบ Lore แล้ว"));});}));rows.append(row);
            }
            if(!shown.length)rows.append(element('p','trpg-empty',query?uiText("ไม่พบ Lore ที่ค้นหา"):uiText("ยังไม่มี Lore — กดสร้าง Lore ใหม่เพื่อเพิ่มข้อมูลโลก สถานที่ กฎ หรือประวัติ")));
        }
        search.addEventListener('input',()=>{query=search.value;renderRows();});renderRows();
    }
    function edit(item) {
        editing=item.id;dirty=false;panel.replaceChildren();say('');
        const form=element('form','trpg-lore-editor'),titleLabel=element('label','',uiText("ชื่อ Lore")),title=element('input'),bodyLabel=element('label','',uiText("เนื้อหา Lore")),body=element('textarea'),enabledLabel=element('label','trpg-lore-toggle'),enabled=element('input');
        title.value=item.title;title.required=true;title.maxLength=160;title.name='loreTitle';body.value=item.content;body.required=true;body.maxLength=LORE_CONTENT_LIMIT;body.rows=14;body.name='loreContent';enabled.type='checkbox';enabled.checked=item.enabled;
        titleLabel.append(title);bodyLabel.append(body);enabledLabel.append(enabled,document.createTextNode(uiText("เปิดใช้งาน · ตามโหมดและงบที่ตั้งไว้")));
        const keywordsLabel=element('label','',uiText("คำค้นเสริม (ไม่จำเป็น · ระบบอ่านชื่อและเนื้อหาเอง)")),keywords=element('input'),alwaysLabel=element('label','trpg-lore-toggle'),always=element('input');keywords.name='loreKeywords';keywords.value=(item.keywords||[]).join(', ');keywordsLabel.append(keywords);always.type='checkbox';always.name='loreAlways';always.checked=item.always===true;alwaysLabel.append(always,document.createTextNode(uiText("ส่งรายการนี้ก่อนเสมอในโหมดเฉพาะที่เกี่ยวข้อง (ยังอยู่ภายในงบ)")));
        const counter=element('small','trpg-muted');const update=()=>counter.textContent=uiText("{0} / {1} ตัวอักษร",[body.value.length.toLocaleString(),LORE_CONTENT_LIMIT.toLocaleString()]);update();
        form.addEventListener('input',()=>{dirty=true;update();});form.addEventListener('change',()=>dirty=true);
        const actions=element('div','trpg-lore-tools'),submit=element('button','trpg-primary',uiText("บันทึก Lore"));submit.type='submit';actions.append(submit,button(uiText("กลับรายการ"),()=>{if(canLeave())list();}));
        form.append(element('h3','',item.id?uiText("แก้ไข Lore"):uiText("สร้าง Lore ใหม่")),titleLabel,bodyLabel,counter,enabledLabel,keywordsLabel,alwaysLabel,actions);panel.append(form);
        form.addEventListener('submit',event=>{event.preventDefault();return attempt(async()=>{
            const all=entries();if(item.id&&!all.some(v=>v.id===item.id))throw Error(uiText("Lore นี้ถูกลบแล้ว กรุณากลับรายการ"));
            const next={id:item.id||(globalThis.crypto?.randomUUID?.()||`lore-${Date.now()}-${Math.random().toString(36).slice(2)}`),title:title.value.trim(),content:body.value.trim(),enabled:enabled.checked,keywords:keywords.value.split(',').map(v=>v.trim()).filter(Boolean),always:always.checked};
            await save(item.id?all.map(v=>v.id===item.id?next:v):[...all,next]);dirty=false;list();say(uiText("บันทึก Lore แล้ว — มีผลกับการเจนครั้งถัดไป"));
        });});title.focus();
    }
    return {canLeave,open(){owner=api.scopeInfo()?.key||'';query='';list();},reset(){dirty=false;editing=null;},refresh(){if(editing===null&&!dirty)list();}};
}

