import {uiText,uiMarkup} from './ui-language.js?v=0.54.1';
import {POWER_ICONS,POWER_FILE_LIMIT,newPowerId,powerDefinition,powerValue,exportPowerPreset,importPowerPreset} from './power-presets.js?v=0.54.1';
const el=(tag,text='')=>{const node=document.createElement(tag);node.textContent=text;return node;};
const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
function download(text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download='roleforge-powers.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function mountPowerWorkspace(host,api){
 let config=api.config(),busy=false,editing;
 const root=el('section');root.className='rf-power-workspace';host.append(root);
 const status=el('p');status.setAttribute('role','status');
 const act=async fn=>{if(busy)return;busy=true;root.inert=true;try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;root.inert=false;}};
 const save=async next=>{await api.save(next);config=next;};
 function render(){
  editing=undefined;
  root.replaceChildren(el('h3',api.valuesOnly?uiText("Current powers"):uiText("Power Preset")),status);status.textContent='';
  if(!api.valuesOnly){
  const toolbar=el('div');toolbar.className='rf-power-toolbar';
  const select=el('select');select.setAttribute('aria-label',uiText("Power preset"));
  for(const [value,label]of [['tretaresia',uiText("Original Preset · พลังชุดเดิม")],['custom',uiText('Custom')]]){const o=el('option',label);o.value=value;select.append(o);}select.value=config.mode;
  select.onchange=()=>act(async()=>{await save({...config,mode:select.value});});
  const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.setAttribute('aria-label',uiText("Import Power Preset"));
  file.onchange=()=>act(async()=>{const f=file.files?.[0];file.value='';if(!f)return;if(f.size>POWER_FILE_LIMIT)throw Error(uiText("ไฟล์ต้องไม่เกิน 1 MB"));const next=importPowerPreset(await f.text());if(!confirm(uiText("นำเข้า “{0}” ({1} พลัง) แทน Preset ของการ์ดนี้? ค่าตัวละครเดิมจะยังถูกเก็บไว้",[next.name,next.definitions.length])))return;await save(next);});
  toolbar.append(select,button(uiText("Import JSON"),()=>file.click()),button(uiText("Export JSON"),()=>act(()=>download(exportPowerPreset(config.mode==='tretaresia'?api.builtin():config)))),file);root.append(toolbar);
  root.append(el('p',uiText("Preset ใช้ร่วมกันทุกแชทของการ์ดนี้ · ค่าพลังแยกตามแชท · การเปลี่ยน Preset หรือลบพลังไม่ลบค่าที่เก็บไว้")));
  if(config.mode!=='custom'){root.append(el('p',uiText("เลือก Custom เพื่อเริ่มสร้างระบบพลังจากว่าง หรือ Export Preset เดิมแล้ว Import กลับมาเพื่อปรับแต่ง")));return;}
  const name=el('input');name.value=config.name;name.maxLength=80;name.setAttribute('aria-label',uiText("Preset name"));
  root.append(name,button(uiText("บันทึกชื่อ Preset"),()=>act(()=>save({...config,name:name.value}))),button(uiText("＋ สร้างพลัง"),()=>edit()));
  if(!config.definitions.length)root.append(el('p',uiText("Custom ยังว่าง — กดสร้างพลังเพื่อเริ่ม ไม่มีพลังเดิมเพิ่มให้อัตโนมัติ")));
  }else if(!config.definitions.length)root.append(el('p',uiText("No powers configured. Manage presets in Extensions → RoleForge → Power Presets.")));
  const grid=el('div');grid.className='rf-power-grid';root.append(grid);
  for(const def of config.definitions){
   const card=el('article');card.className='rf-power-card';card.style.setProperty('--rf-power-color',def.color);card.dataset.powerId=def.id;
   const title=el('h4'),icon=el('i');icon.className='fa-solid fa-'+def.icon;title.append(icon,document.createTextNode(' '+def.name));
   card.append(title,el('p',def.description));
   if(api.valuesOnly){
   const value=powerValue(def,api.state().customPowers?.[def.id]),field=el(def.type==='rank'?'select':'input');field.setAttribute('aria-label',uiText('{0} value',[def.name]));
   if(def.type==='rank'){def.ranks.forEach((label,i)=>{const o=el('option',label);o.value=i;field.append(o);});field.value=value;}
   else if(def.type==='toggle'){field.type='checkbox';field.checked=value;}
   else{field.type='number';field.min=0;field.max=def.max;field.step='any';field.value=value;}
   card.append(field);
   if(def.type==='resource'){const meter=el('progress');meter.max=def.max;meter.value=value;meter.setAttribute('aria-label',def.name);card.append(meter,el('small',`${value} / ${def.max}`));}
   field.onchange=()=>act(async()=>{if(!field.checkValidity())throw Error(uiText("ค่าพลังอยู่นอกช่วงที่กำหนด"));await api.value(def.id,def.type==='toggle'?field.checked:Number(field.value));});
   }else card.append(button(uiText("แก้ไข"),()=>edit(def)),button(uiText("ลบ"),()=>{if(confirm(uiText("ลบพลัง “{0}” ออกจาก Preset? ค่าที่บันทึกไว้จะยังอยู่",[def.name])))return act(()=>save({...config,definitions:config.definitions.filter(d=>d.id!==def.id)}));}));grid.append(card);
  }
 }
 function edit(def=null){
  editing=def;
  const draft=def||{id:newPowerId(),name:'',description:'',type:'number',max:100,initial:0,ranks:[],color:'#a88bd4',icon:'bolt',selectable:true};
  const form=el('form');form.className='rf-power-editor';root.replaceChildren(el('h3',def?uiText("แก้ไขพลัง"):uiText("สร้างพลัง")),status,form);status.textContent='';
  function field(label,key,tag='input'){const wrap=el('label',label),input=el(tag);input.name=key;wrap.append(input);form.append(wrap);return input;}
  const name=field(uiText("ชื่อพลัง"),'name');name.required=true;name.maxLength=80;name.value=draft.name;
  const desc=field(uiText("คำอธิบายและข้อจำกัด"),'description','textarea');desc.maxLength=2000;desc.rows=4;desc.value=draft.description;
  const type=field(uiText("รูปแบบ"),'type','select');for(const [v,t]of [['number',uiText("ตัวเลข")],['resource',uiText("หลอดพลัง")],['rank',uiText("ระดับขั้น")],['toggle',uiText("เปิด / ปิด")]]){const o=el('option',t);o.value=v;type.append(o);}type.value=draft.type;
  const max=field(uiText("ค่าสูงสุด (ตัวเลข / หลอดพลัง)"),'max');max.type='number';max.min=1;max.max=1000000000;max.value=draft.max||100;
  const ranks=field(uiText("ชื่อระดับขั้น หนึ่งขั้นต่อบรรทัด"),'ranks','textarea');ranks.rows=4;ranks.value=draft.ranks.join('\n');
  const initial=field(uiText("ค่าเริ่มต้น (ระดับขั้นเริ่มที่ 0; เปิด=1 ปิด=0)"),'initial');initial.type='number';initial.min=0;initial.step='any';initial.value=Number(draft.initial);
  const color=field(uiText("สี"),'color');color.type='color';color.value=draft.color;
  const icon=field(uiText("ไอคอน"),'icon','select');for(const v of POWER_ICONS){const o=el('option',uiText(v));o.value=v;icon.append(o);}icon.value=draft.icon;
  const selectable=field(uiText("ให้เลือกในหน้าสร้างตัวละคร"),'selectable');selectable.type='checkbox';selectable.checked=draft.selectable;
  const submit=el('button',uiText("บันทึกพลัง"));submit.type='submit';form.append(submit,button(uiText("ยกเลิก"),render));
  form.onsubmit=e=>{e.preventDefault();return act(async()=>{const next=powerDefinition({...draft,name:name.value,description:desc.value,type:type.value,max:Number(max.value),initial:Number(initial.value),ranks:ranks.value.split('\n').map(s=>s.trim()).filter(Boolean),color:color.value,icon:icon.value,selectable:selectable.checked});await save({...config,definitions:def?config.definitions.map(d=>d.id===def.id?next:d):[...config.definitions,next]});});};
 }
 render();return {root,refreshLanguage(){
  if(editing===undefined){render();return;}
  const values=[...root.querySelectorAll('[name]')].map(n=>({name:n.name,value:n.value,checked:n.checked}));
  edit(editing);
  for(const saved of values){const input=root.querySelector(`[name="${saved.name}"]`);if(input){input.value=saved.value;input.checked=saved.checked;}}
 }};
}
