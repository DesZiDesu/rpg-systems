import { element } from './npc-chat.js?v=0.37.1';
import { LORE_CONTENT_LIMIT, LORE_ACTIVE_LIMIT, LORE_BUDGET_MAX } from './lore-core.js?v=0.37.1';

export function createLoreWorkspace(panel, api, say) {
    let owner = '', dirty = false, query = '', editing = null, saving = false;
    const canLeave = () => !saving && (!dirty || confirm('ยังมี Lore ที่ไม่ได้บันทึก ต้องการทิ้งการแก้ไขนี้หรือไม่?'));
    const entries = () => api.listLore?.() || [];
    const button = (label, action) => {const b=element('button','',label);b.type='button';b.addEventListener('click',action);return b;};
    async function save(next) {
        if(owner !== api.scopeInfo()?.key) throw Error('การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่');
        await api.persistLore(next,owner);
        if(owner !== api.scopeInfo()?.key) throw Error('บันทึกการ์ดเดิมแล้ว แต่ตอนนี้เปิดการ์ดอื่นอยู่ กรุณาเปิด Lore Management ใหม่');
    }
    async function attempt(action){
        if(saving)return;
        saving=true;panel.inert=true;
        try{await action();}catch(error){say(error.message);}
        finally{saving=false;panel.inert=false;}
    }
    function list() {
        editing=null;dirty=false;panel.replaceChildren();
        const info=api.scopeInfo(), all=entries();
        panel.append(element('h3','','Lore Management'),element('p','trpg-muted',info?`Character · ${info.label} — ใช้ร่วมกันทุกแชทของการ์ดนี้`:'เปิดแชทของการ์ดตัวละครเดี่ยวเพื่อจัดการ Lore'));
        if(!info)return;
        const options=api.loreOptions?.()||{budget:LORE_ACTIVE_LIMIT,mode:'all'};
        const active=all.filter(item=>item.enabled),count=active.reduce((n,item)=>n+item.title.length+item.content.length,0);
        panel.append(element('p','trpg-muted',`เปิด ${active.length} / ${all.length} รายการ · คลัง ${count.toLocaleString()} ตัวอักษร · งบส่งครั้งละ ${options.budget.toLocaleString()} ตัวอักษร — ${options.mode==='all'?'ส่งรายการที่เปิดภายในงบ':'เลือกจากชื่อ คำค้น และเนื้อหาอัตโนมัติ'}`));
        const preferences=element('div','trpg-lore-tools'),budgetLabel=element('label','','งบ Lore (ตัวอักษร ไม่ใช่ tokens)'),budget=element('input'),modeLabel=element('label','','การส่ง Lore'),mode=element('select');
        budget.type='number';budget.name='loreBudget';budget.min=1000;budget.max=LORE_BUDGET_MAX;budget.step=1000;budget.value=options.budget;budgetLabel.append(budget);
        for(const [value,label] of [['relevant','อัตโนมัติเฉพาะที่เกี่ยวข้อง · แนะนำ'],['all','รายการที่เปิดทั้งหมด']]){const option=element('option','',label);option.value=value;mode.append(option);}mode.value=options.mode;mode.name='loreMode';modeLabel.append(mode);
        preferences.addEventListener('input',()=>dirty=true);preferences.addEventListener('change',()=>dirty=true);
        preferences.append(budgetLabel,modeLabel,button('บันทึกงบและโหมด',()=>attempt(()=>{api.persistLoreOptions({budget:Number(budget.value),mode:mode.value},owner);dirty=false;list();say('บันทึกงบและโหมด Lore แล้ว');})));
        if(api.persistLoreOptions)panel.append(preferences,element('p','trpg-muted','Context 2,000,000 tokens ไม่เท่ากับ 2,000,000 ตัวอักษร ควรเผื่อประวัติแชทและคำตอบ โหมดเฉพาะที่เกี่ยวข้องเลือกจากชื่อ คำค้น และคำในเนื้อหา Lore อัตโนมัติจาก 8 ข้อความล่าสุด โดยไม่เรียก AI เพิ่ม; ตรึงรายการที่จำเป็นได้'));
        const tools=element('div','trpg-lore-tools'),label=element('label','','ค้นหา Lore'),search=element('input');search.type='search';search.value=query;search.placeholder='ชื่อหรือเนื้อหา';label.append(search);
        tools.append(label,button('＋ สร้าง Lore ใหม่',()=>{if(canLeave())edit({id:'',title:'',content:'',enabled:true});}));panel.append(tools);
        const rows=element('div','trpg-lore-rows');panel.append(rows);
        function renderRows(){rows.replaceChildren();const shown=all.filter(item=>`${item.title} ${item.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
            for(const item of shown){
                const row=element('article','trpg-lore-row'),toggleLabel=element('label','trpg-lore-toggle'),toggle=element('input');toggle.type='checkbox';toggle.checked=item.enabled;toggle.setAttribute('aria-label',`เปิด Lore ${item.title}`);
                toggle.addEventListener('change',()=>attempt(async()=>{
                    try{await save(entries().map(v=>v.id===item.id?{...v,enabled:toggle.checked}:v));list();say('บันทึกการเปิด–ปิด Lore แล้ว');}
                    finally{toggle.checked=entries().find(v=>v.id===item.id)?.enabled===true;}
                }));
                toggleLabel.append(toggle,document.createTextNode(item.enabled?'เปิด':'ปิด'));
                const open=button(item.title,()=>{if(canLeave())edit(item);});open.className='trpg-lore-title';
                row.append(toggleLabel,open,element('p','trpg-lore-excerpt',item.content.slice(0,180)),button('ลบ',()=>{if(confirm(`ลบ Lore “${item.title}”?`))return attempt(async()=>{await save(entries().filter(v=>v.id!==item.id));list();say('ลบ Lore แล้ว');});}));rows.append(row);
            }
            if(!shown.length)rows.append(element('p','trpg-empty',query?'ไม่พบ Lore ที่ค้นหา':'ยังไม่มี Lore — กดสร้าง Lore ใหม่เพื่อเพิ่มข้อมูลโลก สถานที่ กฎ หรือประวัติ'));
        }
        search.addEventListener('input',()=>{query=search.value;renderRows();});renderRows();
    }
    function edit(item) {
        editing=item.id;dirty=false;panel.replaceChildren();say('');
        const form=element('form','trpg-lore-editor'),titleLabel=element('label','','ชื่อ Lore'),title=element('input'),bodyLabel=element('label','','เนื้อหา Lore'),body=element('textarea'),enabledLabel=element('label','trpg-lore-toggle'),enabled=element('input');
        title.value=item.title;title.required=true;title.maxLength=160;title.name='loreTitle';body.value=item.content;body.required=true;body.maxLength=LORE_CONTENT_LIMIT;body.rows=14;body.name='loreContent';enabled.type='checkbox';enabled.checked=item.enabled;
        titleLabel.append(title);bodyLabel.append(body);enabledLabel.append(enabled,document.createTextNode('เปิดใช้งาน · ตามโหมดและงบที่ตั้งไว้'));
        const keywordsLabel=element('label','','คำค้นเสริม (ไม่จำเป็น · ระบบอ่านชื่อและเนื้อหาเอง)'),keywords=element('input'),alwaysLabel=element('label','trpg-lore-toggle'),always=element('input');keywords.name='loreKeywords';keywords.value=(item.keywords||[]).join(', ');keywordsLabel.append(keywords);always.type='checkbox';always.name='loreAlways';always.checked=item.always===true;alwaysLabel.append(always,document.createTextNode('ส่งรายการนี้ก่อนเสมอในโหมดเฉพาะที่เกี่ยวข้อง (ยังอยู่ภายในงบ)'));
        const counter=element('small','trpg-muted');const update=()=>counter.textContent=`${body.value.length.toLocaleString()} / ${LORE_CONTENT_LIMIT.toLocaleString()} ตัวอักษร`;update();
        form.addEventListener('input',()=>{dirty=true;update();});form.addEventListener('change',()=>dirty=true);
        const actions=element('div','trpg-lore-tools'),submit=element('button','trpg-primary','บันทึก Lore');submit.type='submit';actions.append(submit,button('กลับรายการ',()=>{if(canLeave())list();}));
        form.append(element('h3','',item.id?'แก้ไข Lore':'สร้าง Lore ใหม่'),titleLabel,bodyLabel,counter,enabledLabel,keywordsLabel,alwaysLabel,actions);panel.append(form);
        form.addEventListener('submit',event=>{event.preventDefault();return attempt(async()=>{
            const all=entries();if(item.id&&!all.some(v=>v.id===item.id))throw Error('Lore นี้ถูกลบแล้ว กรุณากลับรายการ');
            const next={id:item.id||(globalThis.crypto?.randomUUID?.()||`lore-${Date.now()}-${Math.random().toString(36).slice(2)}`),title:title.value.trim(),content:body.value.trim(),enabled:enabled.checked,keywords:keywords.value.split(',').map(v=>v.trim()).filter(Boolean),always:always.checked};
            await save(item.id?all.map(v=>v.id===item.id?next:v):[...all,next]);dirty=false;list();say('บันทึก Lore แล้ว — มีผลกับการเจนครั้งถัดไป');
        });});title.focus();
    }
    return {canLeave,open(){owner=api.scopeInfo()?.key||'';query='';list();},reset(){dirty=false;editing=null;},refresh(){if(editing===null&&!dirty)list();}};
}
