// Native drawer controls; the actual file parsing, review and compression run
// in the archive Worker. Download links remain clickable on mobile Safari.
export function mountNpcIconUpdate(root,api){
    const text=(th,en)=>api.language()==='th'?th:en,node=(tag,value='')=>{const n=document.createElement(tag);n.textContent=value;return n;};
    let review=null,page=0,busy=false,job=null,undoUrl='',exportUrl='',owner='';
    const title=node('h4',text('อัปเดตไอคอน NPC ของการ์ดเดิม','Update NPC icons in this card')),
        note=node('p',text('เลือกไฟล์อัปเดตเพื่อตรวจรายการก่อนใช้ เปลี่ยนเฉพาะภาพไอคอน ไม่เปลี่ยนแชท Stats หรือเวอร์ชันที่เลือก','Choose an update file and review it before applying. Changes only icon images; keeps chats, Stats and selected versions.')),
        choose=node('button',text('เลือกไฟล์อัปเดตไอคอน / Undo','Choose icon update / Undo file')),file=node('input'),
        replaceLabel=node('label'),replace=node('input'),status=node('p'),progress=node('progress'),cancel=node('button',text('ยกเลิก','Cancel')),
        list=node('div'),pager=node('div'),prev=node('button','‹'),next=node('button','›'),position=node('span'),
        apply=node('button',text('ใช้การอัปเดตไอคอน','Apply icon update')),undo=node('a',text('ดาวน์โหลดไฟล์ย้อนกลับก่อนอัปเดต','Download undo file before updating')),
        exportButton=node('button',text('ส่งออกการ์ดที่อัปเดตแล้ว','Export updated card')),exportLink=node('a',text('ดาวน์โหลดการ์ด','Download card'));
    root.className='rf-icon-update';note.className='notes';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    file.type='file';file.accept='.json,application/json';file.hidden=true;file.dataset.iconUpdateFile='';replace.type='checkbox';replaceLabel.append(replace,document.createTextNode(text('แทนที่ภาพที่ตั้งเองไว้ด้วย (ค่าเริ่มต้นจะข้าม)','Also replace existing custom images (skipped by default)')));
    for(const n of [choose,prev,next,apply,cancel,exportButton]){n.type='button';n.className='menu_button';}undo.className=exportLink.className='menu_button';
    apply.dataset.iconUpdateApply='';exportButton.dataset.iconUpdateExport='';undo.dataset.iconUpdateUndo='';list.dataset.iconUpdateRows='';
    list.className='rf-icon-update-list';pager.className='rf-icon-update-pager';pager.append(prev,position,next);root.replaceChildren(title,note,choose,replaceLabel,status,progress,cancel,list,pager,undo,apply,exportButton,exportLink,file);
    function clear(){review=null;page=0;for(const url of [undoUrl,exportUrl])if(url)URL.revokeObjectURL(url);undoUrl=exportUrl='';list.replaceChildren();for(const n of [pager,apply,undo,exportButton,exportLink])n.hidden=true;}
    function render(){
        list.replaceChildren();const labels={changed:text('พร้อมอัปเดต','Ready'),unchanged:text('ตรงกันแล้ว','Already set'),existing:text('เก็บภาพเดิม','Keep custom image'),missing:text('ไม่พบ ID','ID not found'),conflict:text('ภาพเปลี่ยนภายหลัง · ข้าม','Changed later · skip')};
        for(const row of review.rows.slice(page*10,page*10+10)){const line=node('div'),image=node('img'),name=node('strong',row.label),detail=node('small',[row.versionLabel,row.class,labels[row.status]].filter(Boolean).join(' · ')),copy=node('div');line.className='rf-icon-update-row';copy.append(name,detail);if(row.icon&&review.icons[row.icon]){image.src=review.icons[row.icon];image.alt=row.class;line.append(image);}line.append(copy);list.append(line);}
        pager.hidden=review.rows.length<=10;position.textContent=`${page+1} / ${Math.max(1,Math.ceil(review.rows.length/10))}`;prev.disabled=page===0;next.disabled=(page+1)*10>=review.rows.length;
    }
    function report(p){progress.max=p.total||1;progress.value=p.done||0;status.textContent=text('เตรียมข้อมูล','Preparing')+` · ${p.phase} · ${p.done}/${p.total}`;}
    async function act(fn){if(busy)return;busy=true;root.dataset.busy='true';root.setAttribute('aria-busy','true');choose.disabled=replace.disabled=apply.disabled=exportButton.disabled=true;progress.hidden=false;progress.removeAttribute('value');cancel.hidden=false;try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;job=null;if(owner&&owner!==api.owner()){clear();owner='';}root.dataset.busy='false';root.setAttribute('aria-busy','false');choose.disabled=replace.disabled=exportButton.disabled=false;apply.disabled=!review?.counts.changed;progress.hidden=cancel.hidden=true;}}
    choose.onclick=()=>file.click();file.onchange=()=>{const selected=file.files[0];file.value='';if(selected)void act(async()=>{clear();const result=await api.review(selected,{replaceExisting:replace.checked},report,j=>{job=j;});review=result;owner=api.owner();page=0;render();const c=result.counts;status.textContent=`${result.name} · `+text(`พร้อมอัปเดต ${c.changed} · ตรงกันแล้ว ${c.unchanged} · เก็บภาพเดิม ${c.existing} · ไม่พบ ${c.missing} · ข้ามการเปลี่ยนภายหลัง ${c.conflict}`,`Ready ${c.changed} · Already set ${c.unchanged} · Keep custom ${c.existing} · Missing ${c.missing} · Changed later ${c.conflict}`);undoUrl=URL.createObjectURL(result.backup);undo.href=undoUrl;undo.download='RoleForge-NPC-Icons-Undo.json';undo.hidden=apply.hidden=!c.changed;});};
    replace.onchange=()=>{clear();status.textContent=text('เลือกไฟล์อีกครั้งเพื่อตรวจรายการด้วยตัวเลือกใหม่','Choose the file again to review with the new option');};
    prev.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};cancel.onclick=()=>job?.cancel();
    apply.onclick=()=>void act(async()=>{if(!review)return;await api.apply(review,report,j=>{job=j;cancel.hidden=!j;});status.textContent=text(`อัปเดต ${review.counts.changed} ไอคอนแล้ว · แชทเดิมยังอยู่ · เก็บไฟล์ย้อนกลับไว้ได้`,`Updated ${review.counts.changed} icons. Existing chats kept. Save the undo file if needed.`);review.counts.changed=0;apply.hidden=true;exportButton.hidden=false;});
    exportButton.onclick=()=>void act(async()=>{const blob=await api.export();if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=URL.createObjectURL(blob);exportLink.href=exportUrl;exportLink.download='RoleForge-Updated-Character.json';exportLink.hidden=false;status.textContent=text('พร้อมดาวน์โหลดการ์ดที่รวมไอคอนแล้ว','Updated card ready to download');});
    clear();progress.hidden=cancel.hidden=true;root.dataset.busy='false';
    return {update(){if(owner&&owner!==api.owner()){job?.cancel();clear();owner='';status.textContent=busy?text('เปลี่ยนการ์ดแล้ว ยกเลิกการอัปเดตเดิม','Card changed. Cancelling the previous update.'):'';}}};
}
