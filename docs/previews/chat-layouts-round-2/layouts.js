/* Preview only. Each design has its own markup and spatial composition.
 * Nothing imports or changes RoleForge's live renderer or chat data. */
(() => {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg = (body,cls='',view='0 0 64 64') => `<svg class="${cls}" viewBox="${view}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
  const pen = svg('<path d="m5 20 4-9L21 3l3 3-9 12-10 4Zm4-9 6 7M5 22l5-4M19 5l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>','pen','0 0 28 28');
  const star = svg('<path d="m32 5 7 19 20 8-20 7-7 20-8-20-19-7 19-8Z" stroke="currentColor" stroke-width="1.2"/>');
  const seal = svg('<circle cx="32" cy="32" r="27" stroke="currentColor"/><circle cx="32" cy="32" r="20" stroke="currentColor" opacity=".5"/><path d="m32 8 21 36H11ZM32 56 11 20h42Z" stroke="currentColor"/><path d="M32 1v9M63 32h-9M32 63v-9M1 32h9" stroke="currentColor"/>','orbit');
  const lotus = svg('<path d="M32 51C11 45 6 31 9 20c13 1 20 13 23 22 3-9 10-21 23-22 3 11-2 25-23 31Z" stroke="currentColor"/><path d="M32 8c-13 15-13 28 0 41 13-13 13-26 0-41ZM10 57h44" stroke="currentColor"/>');
  const portrait = (type) => {
    const faces = {
      anime:'<path d="M8 60c0-15 7-23 24-23s24 8 24 23" fill="#51435e"/><path d="M17 36C8 20 15 5 32 5s24 15 15 31" fill="#d8c8ec"/><path d="M19 19c2-8 25-10 26 3v10c0 17-25 17-25 0Z" fill="#f7e4d5"/><path d="M16 26c10-1 11-10 13-13 3 7 14 5 19 14l-1-15-16-5-13 8Z" fill="#d8c8ec"/><path d="M24 30h3m10 0h3M29 40h6" stroke="#786778" stroke-width="2" stroke-linecap="round"/><path d="M26 46 32 53l6-7" fill="#a48acb"/>',
      dark:'<path d="M8 63c3-16 6-34 12-46C24 8 32 4 32 4s8 4 12 13c6 12 9 30 12 46" fill="#211e22" stroke="#70615b"/><path d="M21 24c3-9 19-9 22 0l-5 19H26Z" fill="#b7a58e"/><path d="m21 24 11 6 11-6M25 33h3m8 0h3" stroke="#3b2d2b"/><path d="M17 53 32 43l15 10" stroke="#665548"/>',
      future:'<path d="M10 64V49l14-10h16l14 10v15" fill="#132a31" stroke="#5eafb8"/><path d="m18 12 14-6 14 6 4 19-9 14H23L14 31Z" fill="#12262e" stroke="#95eff0"/><path d="M18 24h28v9H18Z" fill="#6fd6de" opacity=".8"/><path d="M24 17h16M27 39h10M18 54h28" stroke="#95eff0"/><path d="M32 7v5m0 35v8" stroke="#95eff0"/>',
    };
    return svg(faces[type],`portrait-${type}`);
  };
  const paragraph = (s,type) => `<p class="story-copy" data-copy="${type}">${escape(s[type])}</p>`;
  const record = (s,content,cls='') => `<button type="button" class="part-header ${cls}" data-profile="${escape(s.name)}" aria-label="ดูข้อมูล ${escape(s.name)}">${content}</button>`;
  const themes = [
    {key:'relic',name:'Relic Ledger',genre:'RoleForge',form:'แฟ้มระบบแบบเปิด · แกนบันทึกเหตุการณ์ · บทพูดเป็นแผ่นพับซ้อน',gimmick:'ตราระบบมีแสงวิ่งช้า ๆ',profile:{name:'Arin Vale',title:'ผู้พิทักษ์บันทึก',role:'นักเดินทาง',faction:'ROLEFORGE',narrative:'แสงสีทองทาบบนหน้าคัมภีร์ อารินวางดาบข้างโต๊ะ ก่อนเลื่อนแผนที่มาหาคุณอย่างเงียบงัน',dialogue:'เส้นทางข้างหน้ายังไม่ถูกเขียน หากคุณพร้อม เราจะเริ่มการเดินทางบทใหม่นี้ไปด้วยกัน'}},
    {key:'starfall',name:'Starfall Stage',genre:'Fantasy Anime',form:'ฉาก Visual Novel · ภาพตัวละครลอยเหนือชื่อ · บอลลูนบทพูดทรงอิสระ',gimmick:'ดาวลอยรอบภาพตัวละคร',profile:{name:'Lyra Dawn',title:'ผู้ใช้เวทดารา',role:'เอลฟ์ · สหาย',faction:'ASTER GUILD',narrative:'ละอองดาวลอยเหนือยอดหญ้า ไลราหันกลับมาพร้อมรอยยิ้ม ขณะที่แสงสีม่วงจาง ๆ วนรอบปลายนิ้วของเธอ',dialogue:'หลังภูเขาลูกนั้นมีทะเลดวงดาวอยู่จริงนะ! ฉันอยากให้คุณเป็นคนแรกที่ได้เห็นมันด้วยกัน'}},
    {key:'thorn',name:'Thorn Testament',genre:'Dark Fantasy',form:'แผ่นจารึกทรงมหาวิหาร · บันทึกบนกระดาษฉีก · คำพูดขนาดใหญ่ไร้กล่อง',gimmick:'แสงถ่านในตราและประกายเถ้า',profile:{name:'Seren Voss',title:'ผู้เฝ้าคำสาบาน',role:'มนุษย์ · นักล่า',faction:'ASHEN ORDER',narrative:'เถ้าถ่านปลิวผ่านซุ้มประตู เซเรนดึงผ้าคลุมให้แน่นขึ้น เสียงระฆังจากวิหารร้างดังมาเพียงครั้งเดียว',dialogue:'อย่าตอบเสียงที่เรียกชื่อคุณจากความมืด ไม่ว่ามันจะฟังเหมือนคนที่คุณรักมากแค่ไหนก็ตาม'}},
    {key:'grimoire',name:'Living Grimoire',genre:'Magical Academy',form:'หนังสือเวทเปิดสองหน้า · บรรยายหน้าซ้าย · บทพูดหน้าขวา · สันหนังสือจริง',gimmick:'ตราวงเวทหมุนเหนือสันหนังสือ',profile:{name:'Elian Ash',title:'ผู้พิทักษ์หอคัมภีร์',role:'มนุษย์ · จอมเวท',faction:'ASTRAL ACADEMY',narrative:'ตราเวทบนปกหนังสือหมุนช้า ๆ เอเลียนแตะปลายไม้กายสิทธิ์ลงบนโต๊ะ แสงดวงเล็กส่องขึ้นจากหมึกเก่า',dialogue:'คาถาไม่ได้เริ่มที่ไม้กายสิทธิ์ แต่มันเริ่มที่สิ่งที่คุณตั้งใจจะปกป้อง เปิดหน้าถัดไปสิ แล้วลองอีกครั้ง'}},
    {key:'lotus',name:'Lotus Scroll',genre:'Chinese Fantasy',form:'ม้วนคัมภีร์แนวนอน · ป้ายชื่อแนวตั้งด้านขวา · บทพูดเป็นข้อความหมึกบนกระดาษ',gimmick:'กลีบบัวลอยข้างตราประทับ',profile:{name:'Lin Yue',title:'ผู้สืบทอดสำนักเมฆา',role:'เซียน · นักกระบี่',faction:'CLOUD SECT',narrative:'สายลมพากลีบบัวผ่านศาลาริมน้ำ หลินเยว่เก็บกระบี่เข้าฝัก แล้วรินชาลงในถ้วยหยกที่วางตรงหน้าคุณ',dialogue:'กระบี่ที่สงบไม่ได้ไร้คม เช่นเดียวกับใจที่นิ่งไม่ได้ไร้ความฝัน ดื่มชาก่อนเถิด แล้วเราค่อยฝึกต่อ'}},
    {key:'neural',name:'Neural Link',genre:'Advanced Futuristic',form:'โมดูลสื่อสารแยกส่วน · ตัวละครเป็นสถานีเชื่อมต่อ · บันทึก Console · บทพูดเป็นสัญญาณ',gimmick:'เส้น Scan และแถบสัญญาณเคลื่อนไหว',profile:{name:'NOVA-07',title:'ระบบนำทางภาคสนาม',role:'แอนดรอยด์ · พันธมิตร',faction:'NEXUS',narrative:'เส้นสัญญาณสีฟ้าปรากฏเหนือแผงควบคุม โนวาหยุดประมวลผลชั่วครู่ ก่อนฉายแผนที่สถานีลงบนผนัง',dialogue:'ยืนยันเส้นทางใหม่แล้ว ประตูฝั่งตะวันออกยังเปิดอยู่ ฉันจะติดตามสัญญาณของคุณตลอดการเคลื่อนที่'}},
  ];
  const renderers = {
    relic(s) {
      const crest=svg('<path d="m32 3 25 15v28L32 61 7 46V18Z" stroke="currentColor"/><path d="M32 13v39M17 24h30M17 40h30M22 18v28M42 18v28" stroke="currentColor"/><path class="glint" d="m32 0 3 4-3 4-3-4Z" fill="currentColor"/>');
      return `<div class="relic-file"><div class="relic-spine decoration"><span>RF</span><i></i><span>01</span></div><div class="relic-content">
        ${record(s,`<span class="relic-crest">${crest}</span><span class="relic-identity"><small>CHARACTER RECORD / 001</small><strong>${escape(s.name)}</strong><span>${escape(s.title)} <b>◆</b> พันธมิตร</span></span><span class="record-arrow decoration">${svg('<path d="M4 12 12 4M4 4h8v8" stroke="currentColor"/>','','0 0 16 16')}</span>`,'relic-header')}
        <section class="part-narrative relic-entry"><div class="entry-index decoration"><span>01</span>${pen}</div><div><div class="entry-kicker decoration">CHRONICLE <span>บันทึกเหตุการณ์</span></div>${paragraph(s,'narrative')}<span class="entry-end decoration">◆ ──</span></div></section>
        <section class="part-dialogue relic-fold"><div class="fold-tab decoration">VOICE / ${escape(s.name)}</div><span class="fold-quote decoration">“</span>${paragraph(s,'dialogue')}<div class="fold-end decoration"><span>คำตอบจากพันธมิตร</span><i>▰ ▰ ▱</i></div></section>
      </div><span class="file-corner decoration"></span></div>`;
    },
    starfall(s) {
      return `<div class="starfall-stage">
        ${record(s,`<span class="starfall-name"><small>${escape(s.faction)}</small><strong>${escape(s.name)}</strong><span>${escape(s.title)} <i>✦</i> สหาย</span></span><span class="starfall-portrait"><span class="portrait-orbit decoration"></span>${portrait('anime')}<span class="star-a decoration">✦</span><span class="star-b decoration">✧</span></span>`,'starfall-header')}
        <section class="part-narrative starfall-caption"><div class="caption-stars decoration">✧ <span>ระหว่างการเดินทาง</span> ✧</div>${paragraph(s,'narrative')}</section>
        <section class="part-dialogue starfall-bubble"><span class="bubble-name decoration">${escape(s.name)} <i>✦</i></span><span class="bubble-tail decoration"></span>${paragraph(s,'dialogue')}<span class="bubble-next decoration">✦ ✧ ✦</span></section>
        <span class="stage-spark decoration">${star}</span>
      </div>`;
    },
    thorn(s) {
      return `<div class="thorn-testament">
        ${record(s,`<span class="cathedral-window"><svg viewBox="0 0 160 220" aria-hidden="true"><path d="M6 213V102C6 59 39 23 80 5c41 18 74 54 74 97v111Z" fill="#151314" stroke="#655149"/><path d="M16 203V105c0-36 28-68 64-88 36 20 64 52 64 88v98Z" fill="none" stroke="#3f3531"/><path d="M80 17v180M17 104h126M26 68h108" stroke="#322c29"/><circle cx="80" cy="75" r="18" fill="#5b2622" class="ember"/></svg><span class="dark-portrait">${portrait('dark')}</span></span><span class="thorn-title"><small>${escape(s.faction)}</small><strong>${escape(s.name)}</strong><span>${escape(s.title)}</span></span>`,'thorn-header')}
        <div class="thorn-texts"><section class="part-narrative torn-manuscript"><div class="manuscript-label decoration">${pen}<span>จากบันทึกที่เหลืออยู่</span><i>III</i></div>${paragraph(s,'narrative')}<span class="manuscript-rule decoration"></span></section>
        <section class="part-dialogue thorn-vow"><span class="vow-mark decoration">“</span>${paragraph(s,'dialogue')}<span class="vow-end decoration">⟡</span></section></div>
        <span class="ash ash-one decoration"></span><span class="ash ash-two decoration"></span>
      </div>`;
    },
    grimoire(s) {
      return `<div class="living-grimoire">
        ${record(s,`<span class="grimoire-title"><small>${escape(s.faction)}</small><strong>${escape(s.name)}</strong><span>${escape(s.title)}</span></span><span class="grimoire-seal">${seal}</span>`,'grimoire-header')}
        <div class="open-book"><section class="part-narrative book-page page-left"><div class="page-heading decoration">${pen}<span>THE CHRONICLE</span></div><span class="page-flourish decoration">✧</span>${paragraph(s,'narrative')}<span class="folio decoration">— 14 —</span></section>
        <section class="part-dialogue book-page page-right"><div class="page-heading decoration"><span>WORDS TO REMEMBER</span></div><span class="ink-quote decoration">“</span>${paragraph(s,'dialogue')}<span class="wax-seal decoration">A</span><span class="folio decoration">— 15 —</span></section><span class="book-binding decoration"></span></div>
      </div>`;
    },
    lotus(s) {
      return `<div class="lotus-scroll"><span class="scroll-roll roll-left decoration"></span><span class="scroll-roll roll-right decoration"></span>
        ${record(s,`<span class="lotus-title"><small>雲門</small><strong>林月</strong><span>${escape(s.name)}</span></span><span class="jade-emblem decoration">${lotus}</span><span class="chop decoration">雲<br>印</span><span class="lotus-affiliation">${escape(s.faction)}</span>`,'lotus-header')}
        <div class="scroll-leaf"><section class="part-narrative lotus-notes"><div class="scroll-heading decoration">${pen}<span>山水記 · บันทึกริมธาร</span></div>${paragraph(s,'narrative')}<span class="ink-wash decoration"></span></section>
        <section class="part-dialogue lotus-words"><span class="ink-opening decoration">「</span>${paragraph(s,'dialogue')}<span class="ink-closing decoration">」</span><span class="brush-rule decoration"></span></section></div><span class="petal decoration"></span>
      </div>`;
    },
    neural(s) {
      const waves=Array.from({length:9},(_,i)=>`<i style="--i:${i}"></i>`).join('');
      return `<div class="neural-link">
        ${record(s,`<span class="neural-avatar"><span class="avatar-scan decoration"></span>${portrait('future')}<span class="crosshair corner-tl decoration"></span><span class="crosshair corner-br decoration"></span></span><span class="neural-identity"><small><i></i> LINK ESTABLISHED</small><strong>${escape(s.name)}</strong><span>${escape(s.title)}</span><b>${escape(s.faction)} // ALLY</b></span>`,'neural-header')}
        <div class="neural-stream"><section class="part-narrative neural-log"><div class="console-caption decoration"><span>FIELD LOG</span><span>14:32:07</span></div><div class="console-body"><span class="console-lines decoration">01<br>02<br>03<br>04</span>${paragraph(s,'narrative')}</div><span class="console-end decoration">▮ บันทึกสถานการณ์ล่าสุด</span></section>
        <section class="part-dialogue neural-speech"><div class="signal-strip decoration"><span>TX</span><div class="signal-waves">${waves}</div></div><div class="transmission"><div class="transmission-label decoration">LIVE TRANSMISSION <span>●</span></div>${paragraph(s,'dialogue')}<span class="transmission-end decoration">SECURE CHANNEL / 07 <i>•••</i></span></div></section></div>
      </div>`;
    },
  };
  const grid=document.getElementById('design-gallery'),filter=document.getElementById('theme-filter'),size=document.getElementById('size-filter');
  const roots=[],cards=[];
  for(const [index,theme] of themes.entries()) {
    const article=document.createElement('article');article.className='design-demo';article.dataset.design=theme.key;
    article.innerHTML=`<div class="design-label"><span class="design-number">0${index+1}</span><div><small>${theme.genre}</small><h2>${theme.name}</h2></div><span class="design-type">${['DOSSIER','VISUAL NOVEL','GOTHIC RELIC','OPEN SPELLBOOK','HANDSCROLL','COMMS HUD'][index]}</span></div><div class="design-stage"><div class="rf2" data-theme="${theme.key}"><div class="plain-name">${escape(theme.profile.name)}</div>${renderers[theme.key](theme.profile)}</div></div><div class="design-note"><p>${theme.form}</p><small><span class="note-dot" aria-hidden="true"></span>${theme.gimmick}</small></div>`;
    grid.append(article);cards.push(article);roots.push(article.querySelector('.rf2'));
    const option=document.createElement('option');option.value=theme.key;option.textContent=`${theme.name} · ${theme.genre}`;filter.append(option);
  }
  function select(value) {document.body.classList.toggle('single-design',value!=='all');for(const card of cards)card.hidden=value!=='all'&&card.dataset.design!==value;filter.value=value;}
  filter.addEventListener('change',()=>select(filter.value));
  size.addEventListener('change',()=>document.body.classList.toggle('phone-mode',size.value==='phone'));
  for(const input of document.querySelectorAll('[data-part]'))input.addEventListener('change',()=>roots.forEach(root=>root.classList.toggle(`${input.dataset.part}-off`,!input.checked)));
  const observer=new IntersectionObserver(entries=>{for(const e of entries)e.target.classList.toggle('in-view',e.isIntersecting);});
  roots.forEach(root=>observer.observe(root));
  document.addEventListener('visibilitychange',()=>roots.forEach(root=>root.classList.toggle('tab-hidden',document.hidden)));
  const dialog=document.getElementById('profile-preview');
  for(const button of document.querySelectorAll('[data-profile]'))button.addEventListener('click',()=>{const s=themes.find(theme=>theme.profile.name===button.dataset.profile).profile;dialog.querySelector('h2').textContent=s.name;dialog.querySelector('p').textContent=[s.title,s.role,s.faction].join(' · ');dialog.showModal();});
  const params=new URL(location.href).searchParams,requested=params.get('theme');if(themes.some(theme=>theme.key===requested))select(requested);
  if(params.get('size')==='phone'){size.value='phone';document.body.classList.add('phone-mode');}
  window.roleforgeDesignStudy={ready:true,themes,roots,select};
})();
