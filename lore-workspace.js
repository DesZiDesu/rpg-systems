import { element } from './npc-chat.js?v=0.35.0';
import { LORE_CONTENT_LIMIT, LORE_ACTIVE_LIMIT } from './lore-core.js?v=0.35.0';

export function createLoreWorkspace(panel, api, say) {
    let owner = '', dirty = false, query = '', editing = null;
    const canLeave = () => !dirty || confirm('ยังมี Lore ที่ไม่ได้บันทึก ต้องการทิ้งการแก้ไขนี้หรือไม่?');
    const entries = () => api.listLore?.() || [];
    const button = (label, action) => {const b=element('button','',label);b.type='button';b.addEventListener('click',action);return b;};
    function save(next) {
        if(owner !== api.scopeInfo()?.key) throw Error('การ์ดเปลี่ยนแล้ว กรุณาเปิด Lore Management ใหม่');
        api.persistLore(next,owner);
    }
    function attempt(action){try{action();}catch(error){say(error.message);}}
    function list() {
        editing=null;dirty=false;panel.replaceChildren();
        const info=api.scopeInfo(), all=entries();
        panel.append(element('h3','','Lore Management'),element('p','trpg-muted',info?`Character · ${info.label} — ใช้ร่วมกันทุกแชทของการ์ดนี้`:'เปิดแชทของการ์ดตัวละครเดี่ยวเพื่อจัดการ Lore'));
        if(!info)return;
        const active=all.filter(item=>item.enabled),count=active.reduce((n,item)=>n+item.title.length+item.content.length,0);
        panel.append(element('p','trpg-muted',`เปิด ${active.length} / ${all.length} รายการ · เก็บ ${count.toLocaleString()} ตัวอักษรที่เปิดอยู่ (ไม่ใช่จำนวนที่ส่ง)`));
        const options=api.loreOptions?.()||{mode:'all',budget:LORE_ACTIVE_LIMIT};
        const config=element('form','trpg-lore-editor'),modeLabel=element('label','','วิธีส่ง Lore'),mode=element('select');mode.name='loreMode';
        for(const [value,label] of [['all','ส่งทุกรายการที่เปิด'],['smart','Smart · เฉพาะชื่อ/Keyword ที่ตรงกับบริบท']]){const option=element('option','',label);option.value=value;mode.append(option);}mode.value=options.mode;modeLabel.append(mode);
        const budgetLabel=element('label','','งบเนื้อหา Lore ต่อคำขอ (ตัวอักษร ไม่ใช่ tokens) · 0 = ไม่จำกัด'),budget=element('input');budget.type='number';budget.min='0';budget.step='1';budget.required=true;budget.name='loreBudget';budget.value=options.budget;budgetLabel.append(budget);
        const apply=element('button','','บันทึกการตั้งค่า Lore');apply.type='submit';config.append(modeLabel,budgetLabel,element('small','trpg-muted','Context 2,000,000 ของโมเดลเป็น tokens ไม่เท่ากับตัวอักษร และต้องแบ่งให้ประวัติแชท/คำตอบด้วย · Smart ตรวจ 6 ข้อความล่าสุดและคำขอเจนจาก UI โดยไม่เรียก AI เพิ่ม · ชื่อหรือ Keyword ตรงจึงส่ง ยกเว้นรายการส่งเสมอ'),apply);
        config.addEventListener('input',()=>dirty=true);config.addEventListener('change',()=>dirty=true);
        config.addEventListener('submit',event=>{event.preventDefault();attempt(()=>{if(owner!==api.scopeInfo()?.key)throw Error('การ์ดเปลี่ยนแล้ว');api.persistLoreOptions({mode:mode.value,budget:Number(budget.value)},owner);dirty=false;list();say('บันทึกแล้ว มีผลกับคำขอถัดไป');});});panel.append(config);
        const selection=api.loreSelection?.();
        if(selection)panel.append(element('p','trpg-muted',`แชทปัจจุบัน: เลือก ${selection.selected.length} / ${selection.enabled} รายการ · ${selection.characters.toLocaleString()} ตัวอักษร JSON (ไม่รวมคำสั่งกำกับ) · เกินงบ ${selection.skipped.length}${selection.skipped.length?' — '+selection.skipped.map(v=>v.title).join(', '):''} · ส่งทั้งรายการ ไม่ตัดเนื้อหากลางทาง`));
        const tools=element('div','trpg-lore-tools'),label=element('label','','ค้นหา Lore'),search=element('input');search.type='search';search.value=query;search.placeholder='ชื่อหรือเนื้อหา';label.append(search);
        tools.append(label,button('＋ สร้าง Lore ใหม่',()=>{if(canLeave())edit({id:'',title:'',content:'',enabled:true});}));panel.append(tools);
        const rows=element('div','trpg-lore-rows');panel.append(rows);
        function renderRows(){rows.replaceChildren();const shown=all.filter(item=>`${item.title} ${item.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
            for(const item of shown){
                const row=element('article','trpg-lore-row'),toggleLabel=element('label','trpg-lore-toggle'),toggle=element('input');toggle.type='checkbox';toggle.checked=item.enabled;toggle.setAttribute('aria-label',`เปิด Lore ${item.title}`);
                toggle.addEventListener('change',()=>attempt(()=>{if(!canLeave())return;save(entries().map(v=>v.id===item.id?{...v,enabled:toggle.checked}:v));list();say('บันทึกการเปิด–ปิด Lore แล้ว');}));
                toggle.addEventListener('change',()=>{toggle.checked=entries().find(v=>v.id===item.id)?.enabled===true;});
                toggleLabel.append(toggle,document.createTextNode(item.enabled?'เปิด':'ปิด'));
                const open=button(item.title,()=>{if(canLeave())edit(item);});open.className='trpg-lore-title';
                row.append(toggleLabel,open,element('p','trpg-lore-excerpt',item.content.slice(0,180)),button('ลบ',()=>{if(canLeave()&&confirm(`ลบ Lore “${item.title}”?`))attempt(()=>{save(entries().filter(v=>v.id!==item.id));list();say('ลบ Lore แล้ว');});}));rows.append(row);
            }
            if(!shown.length)rows.append(element('p','trpg-empty',query?'ไม่พบ Lore ที่ค้นหา':'ยังไม่มี Lore — กดสร้าง Lore ใหม่เพื่อเพิ่มข้อมูลโลก สถานที่ กฎ หรือประวัติ'));
        }
        search.addEventListener('input',()=>{query=search.value;renderRows();});renderRows();
    }
    function edit(item) {
        editing=item.id;dirty=false;panel.replaceChildren();say('');
        const form=element('form','trpg-lore-editor'),titleLabel=element('label','','ชื่อ Lore'),title=element('input'),bodyLabel=element('label','','เนื้อหา Lore'),body=element('textarea'),enabledLabel=element('label','trpg-lore-toggle'),enabled=element('input');
        title.value=item.title;title.required=true;title.maxLength=160;title.name='loreTitle';body.value=item.content;body.required=true;body.maxLength=LORE_CONTENT_LIMIT;body.rows=14;body.name='loreContent';enabled.type='checkbox';enabled.checked=item.enabled;
        titleLabel.append(title);bodyLabel.append(body);enabledLabel.append(enabled,document.createTextNode('เปิดใช้งาน · อนุญาตให้เลือกส่ง'));
        const keywordsLabel=element('label','','Keywords · คั่นด้วยจุลภาค (ชื่อ Lore ใช้เป็น Keyword ด้วย)'),keywords=element('input');keywords.name='loreKeywords';keywords.value=(item.keywords||[]).join(', ');keywordsLabel.append(keywords);
        const alwaysLabel=element('label','trpg-lore-toggle'),always=element('input');always.type='checkbox';always.name='loreAlways';always.checked=item.always===true;alwaysLabel.append(always,document.createTextNode('ส่งเสมอใน Smart · จัดก่อนรายการอื่น แต่ยังอยู่ภายในงบ'));
        const priorityLabel=element('label','','ลำดับความสำคัญ (-100 ถึง 100 · มากส่งก่อน)'),priority=element('input');priority.name='lorePriority';priority.type='number';priority.min='-100';priority.max='100';priority.value=item.priority||0;priorityLabel.append(priority);
        const counter=element('small','trpg-muted');const update=()=>counter.textContent=`${body.value.length.toLocaleString()} / ${LORE_CONTENT_LIMIT.toLocaleString()} ตัวอักษร`;update();
        form.addEventListener('input',()=>{dirty=true;update();});form.addEventListener('change',()=>dirty=true);
        const actions=element('div','trpg-lore-tools'),submit=element('button','trpg-primary','บันทึก Lore');submit.type='submit';actions.append(submit,button('กลับรายการ',()=>{if(canLeave())list();}));
        form.append(element('h3','',item.id?'แก้ไข Lore':'สร้าง Lore ใหม่'),titleLabel,bodyLabel,counter,enabledLabel,keywordsLabel,alwaysLabel,priorityLabel,actions);panel.append(form);
        form.addEventListener('submit',event=>{event.preventDefault();attempt(()=>{
            const all=entries();if(item.id&&!all.some(v=>v.id===item.id))throw Error('Lore นี้ถูกลบแล้ว กรุณากลับรายการ');
            const next={id:item.id||(globalThis.crypto?.randomUUID?.()||`lore-${Date.now()}-${Math.random().toString(36).slice(2)}`),title:title.value.trim(),content:body.value.trim(),enabled:enabled.checked,keywords:keywords.value,always:always.checked,priority:Number(priority.value)};
            save(item.id?all.map(v=>v.id===item.id?next:v):[...all,next]);dirty=false;list();say('บันทึก Lore แล้ว — มีผลกับการเจนครั้งถัดไป');
        });});title.focus();
    }
    return {canLeave,open(){owner=api.scopeInfo()?.key||'';query='';list();},reset(){dirty=false;editing=null;},refresh(){if(editing===null&&!dirty)list();}};
}
