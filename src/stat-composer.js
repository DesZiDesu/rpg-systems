import {deathNoteSummary} from './npc-visibility.js?v=0.84.0';
import {composerIcon as glyph} from './composer-icons.js?v=0.84.0';
import {statTrainingTargets} from './stat-training.js?v=0.84.0';
import {currencyDisplay} from './currency-config.js?v=0.84.0';
import {commerceIconMarkup} from './commerce-icons.js?v=0.84.0';

const esc=v=>String(v??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const translated=(v,th,target)=>{
 if(target?.path.startsWith('player.customStats.'))return String(v||'');
 const parts=String(v||'').split(' / ');return th?parts.at(-1):parts[0];
};


export const STAT_COMPOSER_LAYOUTS=Object.freeze(['A','B','C']);
export const normalizeStatComposerLayout=value=>STAT_COMPOSER_LAYOUTS.includes(value)?value:'C';

export function createStatComposer({document:doc=globalThis.document,dock,settings=()=>({}),train=async()=>{},transfer=()=>{},configureLifespan=()=>globalThis.RoleForgeWorkshop?.openDeathNoteSettings?.(),busy=()=>false}={}){
 const status=doc.createElement('section'),training=doc.createElement('section');
 status.className='rf-stat-composer rf-user-status';training.className='rf-stat-composer rf-stat-training';
 let state=null,scope='',selected='hp',method=0,working=false,fingerprint='',detailsOpen=false,error='';
 const t=(th,en)=>settings().language==='th'?th:en;
 const head=(label,id,icon)=>`<header class="rf-ability-heading"><span>${glyph(icon)}${esc(label)}</span><div><button type="button" class="rf-ability-button" data-stat-minimize="${id}" aria-label="${esc(t('ย่อหน้าต่าง เก็บสถานะไว้','Minimize, keep state'))}" title="${esc(t('ย่อหน้าต่าง เก็บสถานะไว้','Minimize, keep state'))}">−</button></div></header>`;
 const title=target=>({hp:t('พลังชีวิตสูงสุด','Maximum health'),mp:t('มานาสูงสุด','Maximum mana'),stamina:t('สตามิน่าสูงสุด','Maximum stamina'),intelligence:t('สติปัญญา','Intelligence'),strength:t('พละกำลัง','Strength'),defense:t('การป้องกัน','Defense'),agility:t('ความคล่องตัว','Agility')})[target.id]||target.name;
 const methodTitle=(target,index)=>{
  const labels={hp:[['ความทนทาน','Endurance'],['แรงต้าน','Resistance']],mp:[['สมาธิ','Meditation'],['ส่งพลัง','Channeling']],stamina:[['สลับช่วงพัก','Intervals'],['ออกแรงต่อเนื่อง','Paced movement']],intelligence:[['ศึกษา','Study'],['ค้นคว้า','Research']],strength:[['แรงต้าน','Resistance'],['แบกและออกแรง','Carrying']],defense:[['ตั้งการ์ด','Guard'],['สมดุล','Balance']],agility:[['ฟุตเวิร์ก','Footwork'],['ตอบสนอง','Reaction']]};
  const label=labels[target.id]?.[index];return label?t(...label):t('วิธีฝึก '+(index+1),'Method '+(index+1));
 };
 function vital(name,icon,raw,classes=''){
  const value=Number(raw?.current)||0,max=Math.max(1,Number(raw?.max)||100),ratio=Math.max(0,Math.min(100,value/max*100));
  const label=name==='HUNGER'?t('ความอิ่ม','Hunger'):name==='THIRST'?t('น้ำ','Thirst'):name;
  return `<div class="rf-stat-vital ${classes}" data-vital="${name}"><div><span>${glyph(icon)}<span>${esc(label)}</span></span><b>${value}<small> / ${max}</small></b></div><div class="rf-stat-track" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(max,Math.max(0,value))}" aria-valuetext="${value} / ${max}"><i style="width:${ratio}%"></i></div></div>`;
 }
 const lifeSummary=()=>{const summary=deathNoteSummary();return summary&&scope&&(!globalThis.SillyTavern||globalThis.SillyTavern.getContext().chatMetadata===summary.contextToken)&&(summary.scope===scope||summary.scope?.endsWith('::'+scope))?summary.playerLifespan:null;};
 function lifespanMarkup(){
  const life=lifeSummary();if(!life)return '';
  const wasOpen=status.querySelector('[data-stat-life-details]')?.open;
  return `<section class="rf-stat-lifespan" aria-label="${t('อายุขัย','Lifespan')}"><div class="rf-stat-life-main"><div><small>DEATH NOTE · ${t('อายุขัย','LIFESPAN')}</small><strong>${esc(life.remaining)}</strong><span>${esc(t('เวลาที่เหลือในเรื่อง','Remaining story time'))}</span></div><button type="button" data-stat-life-config aria-label="${t('ตั้งค่าอายุขัย','Configure lifespan')}" title="${t('ตั้งค่าอายุขัย','Configure lifespan')}"><i class="fa-solid fa-sliders" aria-hidden="true"></i></button></div><details data-stat-life-details${wasOpen?' open':''}><summary>${t('รายละเอียดอายุขัย','Lifespan details')} <span aria-hidden="true">⌄</span></summary><dl><div><dt>${t('อายุขัยเดิม','Original natural deadline')}</dt><dd>${esc(life.naturalText)}</dd></div><div><dt>${t('กำหนดปัจจุบัน','Current deadline')}</dt><dd>${esc(life.deadlineText)}</dd></div><div><dt>${t('สัดส่วนหลังแลกดวงตา','Fraction after bargains')}</dt><dd>${Math.round(life.fraction*100)}%</dd></div></dl><p>${t('ข้อมูลผู้สร้างโรล · ตัวละครไม่ได้รู้ค่านี้โดยอัตโนมัติ','Author information · characters do not automatically know this value')}</p></details></section>`;
 }
 function renderStatus(){
  if(!state||!scope||!settings().showStatusComposer){dock.remove('status');return;}
  const p=state.player||{},layout=normalizeStatComposerLayout(settings().statusComposerLayout),targets=statTrainingTargets(state),currency=state.progression?.currency;
  status.dataset.layout=layout;status.setAttribute('aria-label',t('สถานะผู้เล่น','Player status'));
  const health=vital('HP','hp',p.hp,'rf-stat-health'),secondary=`<div class="rf-stat-secondary">${vital('MP','mp',p.mp)}${vital('ST','stamina',p.stamina)}</div>`,needs=`<div class="rf-stat-needs">${vital('HUNGER','hunger',{current:p.survival?.hunger,max:100})}${vital('THIRST','thirst',{current:p.survival?.thirst,max:100})}</div>`;
  const values=targets.filter(d=>!d.path.endsWith('.max')&&d.showStatus),coreValues=values.filter(d=>!d.path.startsWith('player.customStats.')),custom=values.filter(d=>d.path.startsWith('player.customStats.'));
  const valueMarkup=d=>`<span><small>${esc(d.name)}</small><strong>${d.value}${d.unit?` <small class="rf-stat-unit">${esc(d.unit)}</small>`:''}</strong></span>`;
  const attributes=`<div class="rf-stat-values">${coreValues.map(valueMarkup).join('')}</div>`,customValues=custom.length?`<div class="rf-stat-custom-values">${custom.map(valueMarkup).join('')}</div>`:'';
  const condition=p.condition?`<span class="rf-stat-condition"><i></i>${esc(p.condition)}</span>`:'',identity=`<div class="rf-stat-identity">${layout==='A'?`<span class="rf-stat-seal">${esc(Array.from(String(p.name||'?'))[0])}<small>${esc(p.level)}</small></span>`:''}<div>${layout==='A'?`<small class="rf-stat-eyebrow">${esc(t('ข้อมูลตัวละคร','CHARACTER RECORD'))}</small>`:''}<strong>${esc(p.name||'—')}</strong><small>LV ${esc(p.level)}${p.profession?' · '+esc(p.profession):''}</small></div>${condition}</div>`;
  const context=[p.party,p.guild].filter(Boolean).join(' · '),footer=`<div class="rf-stat-footer"><div class="rf-stat-context"><span>${glyph('pin')}${esc(state.location?.place||'—')}</span>${context?`<span>${esc(context)}</span>`:''}</div><div class="rf-stat-wallet">${currencyDisplay(currency).map(u=>`<span>${commerceIconMarkup('coin',u.id,currency?.scheme?u.iconSet:settings().coinStyle||u.iconSet,currency?.scheme?u:undefined)}<b>${u.amount.toLocaleString()}</b><small>${esc(u.symbol||u.name)}</small></span>`).join('')}<button type="button" class="rf-money-entry" data-stat-transfer>${glyph('transfer')}${esc(t('โอนเงิน','Transfer'))}</button></div></div>`;
  let vitals=health+secondary;
  if(layout==='B'){
   const value=Number(p.hp?.current)||0,max=Math.max(1,Number(p.hp?.max)||100),ratio=Math.max(0,Math.min(100,value/max*100));
   vitals=`<div class="rf-stat-core-vitals"><div class="rf-stat-hp-ring"><svg viewBox="0 0 112 112" aria-hidden="true"><circle class="rf-stat-ring-base" cx="56" cy="56" r="46"/><circle class="rf-stat-ring-fill" cx="56" cy="56" r="46" pathLength="100" stroke-dasharray="${ratio} 100"/></svg><div>${glyph('hp')}<b>${value}</b><small>HP / ${max}</small></div>${health}</div>${secondary}</div>`;
  }
  status.innerHTML=head(t('สถานะผู้เล่น','Player status'),'status','hp')+`<div class="rf-ability-body rf-stat-status-body">${identity}<div class="rf-stat-vitals">${vitals}</div>${needs}${attributes}${customValues}${lifespanMarkup()}${footer}</div>`;
  dock.panel('status',status,{label:t('สถานะ','Status')});
 }
 function renderTraining(){
  if(!state||!scope||!settings().showStatTrainingComposer){dock.remove('stats');return;}
  const existing=training.querySelector('[data-stat-details]');if(existing)detailsOpen=existing.open;
  const all=statTrainingTargets(state).filter(d=>d.showTraining),layout=normalizeStatComposerLayout(settings().statTrainingLayout);
  if(!all.some(d=>d.id===selected)){selected=all[0]?.id||'';method=0;detailsOpen=false;}
  const target=all.find(d=>d.id===selected),disabled=working||busy(),th=settings().language==='th';
  training.dataset.layout=layout;training.setAttribute('aria-label',t('ฝึกค่าสถานะ','Stat training'));
  const options=`<div class="rf-stat-options" role="group" aria-label="${esc(t('เลือกค่าสถานะที่จะฝึก','Choose a stat to train'))}">${all.map(d=>`<button type="button" class="rf-ability-button${d.path.startsWith('player.customStats.')?' rf-custom-stat':''}" data-stat-select="${esc(d.id)}" aria-pressed="${d.id===selected}"><span>${glyph(d.id)}<b>${esc(d.name)}</b></span><small>${d.value}${d.path.endsWith('.max')?' MAX':d.unit?' '+esc(d.unit):''}</small></button>`).join('')}</div>`;
  let content=options;
  if(target){
   method=Math.min(method,target.methods.length-1);
   const capacity=target.path.endsWith('.max'),hint=capacity?t('เพิ่มค่าสูงสุดถาวร · ค่าปัจจุบันและความเหนื่อยเป็นไปตามโรล','Permanent max growth. Current resources and fatigue follow the story.'):t('เพิ่มค่าตัวเลขของสถิติเมื่อฝึกสำเร็จ','This numeric stat grows after successful practice.');
   const meaning=translated(target.description,th,target),gain=`<span class="rf-stat-gain">${esc(t('สูงสุด','Up to'))} <b>+${target.gain}</b></span>`,focus=`<div class="rf-stat-focus">${layout==='B'?`<div class="rf-stat-focus-round">${glyph(target.id)}<b>${target.value}</b><small>${esc(target.name)}${capacity?' MAX':target.unit?' · '+esc(target.unit):''}</small></div>`:''}<div><strong>${layout==='C'?glyph(target.id):''}${esc(title(target))}</strong>${layout!=='C'?`<p>${esc(meaning)}</p>`:''}</div>${layout!=='B'?`<div class="rf-stat-focus-value"><b>${target.value}</b><small>${esc(target.name)}${capacity?' MAX':target.unit?' · '+esc(target.unit):''}</small>${gain}</div>`:gain}</div>`;
   const methods=`<div class="rf-stat-methods" role="group" aria-label="${esc(t('วิธีฝึก','Practice method'))}">${target.methods.map((m,i)=>`<button type="button" class="rf-ability-button rf-stat-method-choice" data-stat-method-choice="${i}" aria-pressed="${i===method}"${disabled?' disabled':''}><span class="rf-stat-method-number">${String(i+1).padStart(2,'0')}</span><span><b>${esc(methodTitle(target,i))}</b>${layout!=='B'?`<small>${esc(translated(m,th,target))}</small>`:''}</span><i>${glyph(i===method?'check':'chevron')}</i></button>`).join('')}</div>`;
   const exercise=`<div class="rf-stat-method"><span>${glyph('train')}${esc(t('แนวฝึกที่เลือก','Selected exercise'))}</span><p>${esc(translated(target.methods[method],th,target))}</p></div>`;
   const details=`<details class="rf-stat-practice-details" data-stat-details${detailsOpen?' open':''}><summary>${glyph('info')}${esc(t('วิธีฝึกและเงื่อนไขทั้งหมด','Full practice method and conditions'))}</summary><p>${esc(meaning)}</p>${exercise}<p class="rf-ability-note rf-stat-hint">${esc(hint)}</p><p class="rf-ability-note">${esc(t('AI ต่อฉากในแชทหลัก · ผลเพิ่มเมื่อฝึกสำเร็จจริง','AI continues in the main chat. Gains require successful completed practice.'))}</p></details>`;
   const button=`<div class="rf-ability-actions"><button type="button" class="rf-ability-button is-primary rf-stat-start" data-stat-start${disabled?' disabled':''}>${glyph('train')}${esc(working?t('กำลังส่ง…','Sending…'):t('เริ่มฝึก '+target.name,'Train '+target.name))}</button></div>`;
   const note=`<small class="rf-stat-quiet">${esc(t('AI ต่อฉากในแชทหลัก · เลือกปุ่มยังไม่เพิ่มค่า','AI continues in the main chat. Selecting a button does not grant growth.'))}</small>`;
   content=layout==='C'?focus+options+methods+details+button+note:options+focus+methods+(layout==='B'?exercise:'')+`<p class="rf-stat-hint">${glyph('info')}${esc(hint)}</p>`+button+note;
  }else content+=`<p class="rf-ability-note">${esc(t('ซ่อนปุ่มฝึกทั้งหมดไว้ ปรับได้ที่ส่วนเสริม → RoleForge → ค่าสถานะ','All practice buttons are hidden. Configure them in Extensions → RoleForge → User stats.'))}</p>`;
  if(error)content+=`<p class="rf-stat-error" role="alert">${esc(error)}</p>`;
  training.innerHTML=head(t('ฝึกค่าสถานะ','Stat training'),'stats','train')+`<div class="rf-ability-body rf-stat-training-body">${content}</div>`;
  dock.panel('stats',training,{label:t('ฝึก Stats','Train stats'),busy:working});
 }
 function render(){if(state){renderStatus();renderTraining();}}
 status.addEventListener('click',e=>{if(e.target.closest('[data-stat-life-config]')){configureLifespan();return;}if(e.target.closest('[data-stat-transfer]')){transfer();return;}if(e.target.closest('[data-stat-minimize]'))dock.minimize('status');});
 training.addEventListener('click',async e=>{
  const choice=e.target.closest('[data-stat-select]');if(choice){selected=choice.dataset.statSelect;method=0;detailsOpen=false;const detail=training.querySelector('[data-stat-details]');if(detail)detail.open=false;renderTraining();return;}
  const exercise=e.target.closest('[data-stat-method-choice]');if(exercise&&!working&&!busy()){method=Number(exercise.dataset.statMethodChoice)||0;renderTraining();return;}
  if(e.target.closest('[data-stat-minimize]')){dock.minimize('stats');return;}
  if(!e.target.closest('[data-stat-start]')||working||busy()||!state||!scope)return;const requestScope=scope;error='';working=true;renderTraining();
  try{await train(selected,method);}catch{if(scope===requestScope)error=t('ส่งคำขอฝึกไม่สำเร็จ ลองใหม่ได้','Could not start training. You can try again.');}finally{working=false;fingerprint='';renderTraining();}
 });
 return {
  update(next,key){
   if(!key){state=null;scope='';error='';fingerprint='';dock.remove('status');dock.remove('stats');return;}
   if(scope!==key){scope=key;selected='hp';method=0;detailsOpen=false;error='';training.innerHTML='';fingerprint='';}state=next;
   const cfg=settings(),nextFingerprint=JSON.stringify([scope,state.player,state.statTraining,state.progression?.currency,state.location?.place,lifeSummary(),cfg.showStatusComposer,cfg.showStatTrainingComposer,cfg.statusComposerLayout,cfg.statTrainingLayout,cfg.language,cfg.coinStyle,busy()]);
   if(fingerprint===nextFingerprint)return;fingerprint=nextFingerprint;render();
  },
  destroy(){state=null;scope='';dock.remove('status');dock.remove('stats');},
 };
}
