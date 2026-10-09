import {normalizeLocationMemory,locationGraph} from './location-memory.js?v=0.62.0';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const words = language => language === 'th'
    ? {title:'รายการสถานที่',search:'ค้นหาสถานที่',current:'อยู่ที่นี่',unknown:'ยังไม่ทราบระยะ',estimate:'ประมาณ',via:'ตามเส้นทางที่บันทึก',distance:'ระยะจากจุดปัจจุบัน',hint:'กดชื่อสถานที่เพื่อดูรายละเอียด · หน้าละ 10 รายการ',empty:'ยังไม่มีสถานที่ตรงกับคำค้น',prev:'ก่อนหน้า',next:'ถัดไป'}
    : {title:'Location List',search:'Search places',current:'You are here',unknown:'Distance unknown',estimate:'Approx.',via:'Via known routes',distance:'Distance from current place',hint:'Tap a place for details · 10 places per page',empty:'No matching places yet',prev:'Previous',next:'Next'};
function pageMarkup(entries, current, language, query = '', page = 0, graph=locationGraph(entries)) {
    const w=words(language),needle=query.normalize('NFKC').toLocaleLowerCase().trim();
    const filtered=entries.filter(e=>[e.name,e.region,e.continent,e.parentName,...e.aliases].join(' ').normalize('NFKC').toLocaleLowerCase().includes(needle));
    const pages=Math.max(1,Math.ceil(filtered.length/10));page=Math.min(Math.max(0,page),pages-1);
    const origin=graph.find(current);
    filtered.sort((a,b)=>Number(b.id===origin?.id)-Number(a.id===origin?.id));
    const rows=filtered.slice(page*10,page*10+10).map(entry=>{
        const route=graph.distance(current,entry.name);
        const distance=route?.current?w.current:route?.distance?[route.estimated?w.estimate:'',route.distance,route.calculated?'· '+w.via:''].filter(Boolean).join(' '):w.unknown;
        return `<details class="rf-location-list-row${route?.current?' is-current':''}"><summary><strong title="${escape(entry.name)}">${escape(entry.name)}</strong><small title="${escape(w.distance)}">${escape(distance)}</small><span class="rf-location-chevron" aria-hidden="true">⌄</span></summary><div class="rf-location-list-detail"><p class="rf-location-path">${graph.path(entry.name).map(escape).join(' <span aria-hidden="true">→</span> ')}</p><p class="rf-location-distance">${escape(w.distance)} · ${escape(distance)}</p>${entry.detail?`<p>${escape(entry.detail)}</p>`:''}${entry.conditions?`<p>${escape(entry.conditions)}</p>`:''}${entry.landmarks.map(landmark=>`<p><strong>${escape(landmark.name)}</strong>${landmark.detail?' · '+escape(landmark.detail):''}</p>`).join('')}</div></details>`;
    }).join('')||`<p class="tretaresia-location-empty">${w.empty}</p>`;
    return {page,pages,html:rows+`<nav class="rf-location-list-pages" aria-label="${escape(w.title)}"><button type="button" data-location-page="-1" ${page===0?'disabled':''}>${w.prev}</button><span>${page+1} / ${pages} · ${filtered.length}</span><button type="button" data-location-page="1" ${page===pages-1?'disabled':''}>${w.next}</button></nav>`};
}
export function locationListMarkup(source, current, language='en') {
    const entries=normalizeLocationMemory(source),w=words(language);
    return `<details class="rf-location-list"><summary class="rf-location-list-toggle"><span class="rf-location-list-dash" aria-hidden="true"></span><strong>${w.title}</strong><small>${entries.length}</small><span class="rf-location-chevron" aria-hidden="true">⌄</span></summary><div class="rf-location-list-content"><p class="rf-location-list-hint">${w.hint}</p><label><span>${w.search}</span><input type="search" data-location-search placeholder="${w.search}" autocomplete="off"></label><div data-location-rows>${pageMarkup(entries,current,language).html}</div></div></details>`;
}
export function mountLocationList(panel,source,current,language='en') {
    const root=panel?.querySelector('.rf-location-list');if(!root)return;
    const entries=normalizeLocationMemory(source),graph=locationGraph(entries),input=root.querySelector('[data-location-search]'),rows=root.querySelector('[data-location-rows]');let page=0;
    const paint=()=>{const next=pageMarkup(entries,current,language,input.value,page,graph);page=next.page;rows.innerHTML=next.html;};
    input.addEventListener('input',()=>{page=0;paint();});
    rows.addEventListener('click',event=>{const button=event.target.closest('[data-location-page]');if(!button||button.disabled)return;page+=Number(button.dataset.locationPage);paint();});
}
