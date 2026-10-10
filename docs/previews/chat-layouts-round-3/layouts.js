/* Design preview only. No RoleForge runtime, AI calls, or chat reads. */
(() => {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg = (body, cls = '', view = '0 0 64 64') => `<svg class="${cls}" viewBox="${view}" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const pen = svg('<path d="m5 20 4-9L21 3l3 3-9 12-10 4Zm4-9 6 7M5 22l5-4M19 5l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>', 'pen', '0 0 28 28');
  const seal = svg('<circle cx="32" cy="32" r="27" stroke="currentColor"/><circle cx="32" cy="32" r="20" stroke="currentColor" opacity=".5"/><path d="m32 8 21 36H11ZM32 56 11 20h42Z" stroke="currentColor"/><path d="M32 1v9M63 32h-9M32 63v-9M1 32h9" stroke="currentColor"/>', 'orbit');
  const lotus = svg('<path d="M32 51C11 45 6 31 9 20c13 1 20 13 23 22 3-9 10-21 23-22 3 11-2 25-23 31Z" stroke="currentColor"/><path d="M32 8c-13 15-13 28 0 41 13-13 13-26 0-41ZM10 57h44" stroke="currentColor"/>');
  const s = {
    name: 'Aster Vale',
    title: 'นักเดินทาง · พันธมิตร',
    narrative: 'อัสเตอร์วางคัมภีร์ลงข้างหน้าต่าง แสงจากโคมไฟทาบบนหน้ากระดาษ เขาเงยหน้ามองคุณ ก่อนเลื่อนแผนที่เข้ามาใกล้กว่าเดิม',
    dialogue: 'หากคุณพร้อม เราจะออกเดินทางตอนฟ้าสาง เก็บคำถามที่ยังไม่มีคำตอบไว้ก่อน บางทีเส้นทางข้างหน้าอาจบอกเราได้เอง',
    closing: 'นอกหน้าต่าง ลมค่ำค่อย ๆ พัดผ่านยอดไม้ หน้ากระดาษพลิกไปอีกหนึ่งหน้า และการเดินทางก็เริ่มต้นขึ้นอย่างเงียบงัน',
  };
  const portrait = (has, cls) => has ? `<span class="portrait-slot ${cls}"><img data-portrait src="./assets/sample-character.jpg" alt="ภาพตัวละครตัวอย่างที่คุณส่งมา" width="1280" height="1106" decoding="async"></span>` : '';
  const copy = type => `<p class="story-copy" data-copy="${type}">${escape(s[type])}</p>`;
  const header = (html, cls) => `<button type="button" class="part-header ${cls}" aria-label="ดูข้อมูล ${escape(s.name)}" data-profile>${html}</button>`;
  const themes = [
    {key: 'grimoire', number: '04', name: 'Living Grimoire', label: 'MAGICAL ACADEMY', description: 'หนังสือเวทสองหน้า · ภาพเป็นแผ่นภาพประจำตัวเหนือสันหนังสือ', note: 'ตราวงเวทหมุนช้า ๆ · บนมือถือเรียงเป็นสองหน้าต่อกัน'},
    {key: 'lotus', number: '05', name: 'Lotus Scroll', label: 'CHINESE FANTASY', description: 'ม้วนคัมภีร์ · ภาพอยู่บนป้ายชื่อแนวตั้งด้านขวา', note: 'กลีบบัวลอยข้างตราประทับ · ถ้าไม่มีภาพ ป้ายชื่อยังสมบูรณ์'},
    {key: 'novel', number: '07', name: 'Monochrome Folio', label: 'NOVEL / BLACK & WHITE', description: 'หน้าหนังสือนิยาย · ภาพประกอบขาวดำ · บรรยายและบทพูดไหลต่อกัน', note: 'เน้นพื้นที่อ่านและตัวอักษร · ไม่มีกรอบระบบหรือแสงเรือง'},
  ];
  const renderers = {
    grimoire(has) {
      return `<div class="living-grimoire">
        ${header(`${portrait(has, 'bookplate-portrait')}<span class="grimoire-title"><small>ASTRAL ACADEMY</small><strong>${escape(s.name)}</strong><span>${escape(s.title)}</span></span><span class="grimoire-seal ornament">${seal}</span>`, 'grimoire-header')}
        <div class="open-book">
          <section class="part-narrative book-page page-left"><div class="page-heading ornament">${pen}<span>THE CHRONICLE</span></div>${copy('narrative')}<div class="book-afterword">${copy('closing')}</div><span class="folio ornament">— 14 —</span></section>
          <section class="part-dialogue book-page page-right"><div class="page-heading ornament">WORDS TO REMEMBER</div><span class="ink-quote ornament">“</span>${copy('dialogue')}<span class="wax-seal ornament">A</span><span class="folio ornament">— 15 —</span></section>
          <span class="book-binding ornament"></span>
        </div>
      </div>`;
    },
    lotus(has) {
      return `<div class="lotus-scroll"><span class="scroll-roll roll-left ornament"></span><span class="scroll-roll roll-right ornament"></span>
        ${header(`${portrait(has, 'scroll-portrait')}<span class="lotus-title"><small>雲門</small><strong>旅人</strong><span>${escape(s.name)}</span></span><span class="jade-emblem ornament">${lotus}</span><span class="chop ornament">雲<br>印</span><span class="lotus-affiliation">CLOUD SECT</span>`, 'lotus-header')}
        <div class="scroll-leaf"><section class="part-narrative lotus-notes"><div class="scroll-heading ornament">${pen}<span>山水記 · บันทึกการเดินทาง</span></div>${copy('narrative')}<div class="scroll-afterword">${copy('closing')}</div><span class="ink-wash ornament"></span></section>
          <section class="part-dialogue lotus-words"><span class="ink-opening ornament">「</span>${copy('dialogue')}<span class="ink-closing ornament">」</span><span class="brush-rule ornament"></span></section></div><span class="petal ornament"></span>
      </div>`;
    },
    novel(has) {
      return `<div class="novel-page">
        ${header(`<span class="novel-heading"><small>THE QUIET BEFORE DAWN</small><span class="chapter-number">Chapter VII</span><strong>${escape(s.name)}</strong><span class="novel-subtitle">${escape(s.title)}</span></span>${portrait(has, 'novel-portrait')}`, 'novel-header')}
        <section class="part-narrative novel-prose"><div class="prose-kicker ornament">${pen}<span>คืนก่อนออกเดินทาง</span></div>${copy('narrative')}</section>
        <section class="part-dialogue novel-quotation"><span class="novel-quote ornament">“</span>${copy('dialogue')}<span class="quote-signature ornament">— ${escape(s.name)}</span></section>
        <section class="part-narrative novel-afterword">${copy('closing')}<span class="chapter-end ornament">⁂</span></section>
        <div class="novel-folio ornament"><span>THE WAYFARER</span><span>07</span></div>
      </div>`;
    },
  };
  const gallery = document.getElementById('design-gallery');
  const themeFilter = document.getElementById('theme-filter');
  const portraitFilter = document.getElementById('portrait-filter');
  const sizeFilter = document.getElementById('size-filter');
  const roots = [];
  for (const theme of themes) {
    const section = document.createElement('section');
    section.className = 'design-pair'; section.dataset.design = theme.key;
    section.innerHTML = `<div class="pair-heading"><span class="design-number">${theme.number}</span><div><small>${theme.label}</small><h2>${theme.name}</h2></div><p>${theme.description}</p></div><div class="variant-grid">${[true, false].map(has => `<article class="design-variant" data-variant="${has ? 'with' : 'without'}"><div class="variant-label"><span>${has ? 'มีภาพตัวละคร' : 'ไม่มีภาพตัวละคร'}</span><small>${has ? 'PORTRAIT' : 'TYPE ONLY'}</small></div><div class="design-stage"><div class="rf3 ${has ? 'has-portrait' : 'no-portrait'}" data-theme="${theme.key}"><div class="plain-name">${escape(s.name)}</div>${renderers[theme.key](has)}</div></div></article>`).join('')}</div><p class="design-note">${theme.note}</p>`;
    gallery.append(section);
    roots.push(...section.querySelectorAll('.rf3'));
    const option = document.createElement('option'); option.value = theme.key; option.textContent = theme.name; themeFilter.append(option);
  }
  function selectTheme(value) {
    for (const pair of gallery.querySelectorAll('.design-pair')) pair.hidden = value !== 'all' && pair.dataset.design !== value;
    themeFilter.value = value;
  }
  function selectPortrait(value) {
    for (const variant of gallery.querySelectorAll('.design-variant')) variant.hidden = value !== 'pair' && variant.dataset.variant !== value;
    document.body.classList.toggle('single-variant', value !== 'pair');
    portraitFilter.value = value;
  }
  themeFilter.addEventListener('change', () => selectTheme(themeFilter.value));
  portraitFilter.addEventListener('change', () => selectPortrait(portraitFilter.value));
  sizeFilter.addEventListener('change', () => document.body.classList.toggle('phone-mode', sizeFilter.value === 'phone'));
  for (const input of document.querySelectorAll('[data-part]')) input.addEventListener('change', () => roots.forEach(root => root.classList.toggle(`${input.dataset.part}-off`, !input.checked)));
  for (const image of gallery.querySelectorAll('[data-portrait]')) {
    let failed = false;
    function fallback() {
      if (failed) return;
      failed = true;
      const root = image.closest('.rf3'); root.classList.replace('has-portrait', 'no-portrait');
      image.closest('.portrait-slot').remove();
    }
    image.addEventListener('error', fallback, {once: true});
    if (image.complete && image.naturalWidth === 0) fallback();
  }
  const observer = new IntersectionObserver(entries => {for (const entry of entries) entry.target.classList.toggle('in-view', entry.isIntersecting);});
  roots.forEach(root => observer.observe(root));
  document.addEventListener('visibilitychange', () => roots.forEach(root => root.classList.toggle('tab-hidden', document.hidden)));
  const dialog = document.getElementById('profile-preview');
  for (const button of gallery.querySelectorAll('[data-profile]')) button.addEventListener('click', () => dialog.showModal());
  const params = new URL(location.href).searchParams;
  if (themes.some(theme => theme.key === params.get('theme'))) selectTheme(params.get('theme'));
  if (['pair', 'with', 'without'].includes(params.get('portrait'))) selectPortrait(params.get('portrait'));
  if (params.get('size') === 'phone') {sizeFilter.value = 'phone'; document.body.classList.add('phone-mode');}
  window.roleforgeDesignStudy = {ready: true, themes, roots, selectTheme, selectPortrait, source: s};
})();
