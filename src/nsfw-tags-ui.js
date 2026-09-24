import {ADULT_TAGS,ADULT_TAG_THAI,TAG_LIMIT,CUSTOM_LIMIT,normalizeTag,uniqueTags,parseTagCatalog} from './nsfw-enhance.js?v=0.41.1';

const CATALOG_KEY='tretaresia-rpg-adult-catalog-v1';
const item=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};

// Imported catalogs stay in browser storage. Only selected names and a small
// number of user-created tags enter extension settings or model prompts.
export async function mountAdultTagControls(root,{settings,save,refresh,storage}){
 if(!root)return;
 const search=root.querySelector('[data-adult-search]'),list=root.querySelector('[data-adult-list]');
 const counter=root.querySelector('[data-adult-count]'),status=root.querySelector('[data-adult-status]');
 const create=root.querySelector('[data-adult-create]'),name=root.querySelector('[data-adult-name]'),file=root.querySelector('[data-adult-file]');
 let imported=[];
 try{
  const saved=storage?await storage.getItem(CATALOG_KEY):JSON.parse(localStorage.getItem(CATALOG_KEY)||'[]');
  imported=uniqueTags(saved,10000);
 }catch{status.textContent='อ่านรายการที่นำเข้าไว้ไม่ได้ · ยังใช้รายการเริ่มต้นและแท็กที่เลือกได้';}
 const persist=()=>{save();refresh();};
 function render(){
  const all=uniqueTags([...ADULT_TAGS,...settings.nsfwCustomTags,...imported,...settings.nsfwTags],10000);
  const term=search.value.trim().normalize('NFKC').toLocaleLowerCase();
  const thai=settings.language==='th';
  const chosen=new Set(settings.nsfwTags.map(t=>t.toLocaleLowerCase()));
  const custom=new Set(settings.nsfwCustomTags.map(t=>t.toLocaleLowerCase()));
  const matches=all.filter(t=>t.toLocaleLowerCase().includes(term)||ADULT_TAG_THAI[t]?.toLocaleLowerCase().includes(term)).sort((a,b)=>Number(chosen.has(b.toLocaleLowerCase()))-Number(chosen.has(a.toLocaleLowerCase()))||(thai?ADULT_TAG_THAI[a]||a:a).localeCompare(thai?ADULT_TAG_THAI[b]||b:b,thai?'th':'en'));
  counter.textContent=thai?`เปิด ${settings.nsfwTags.length}/${TAG_LIMIT} · พบ ${matches.length} จาก ${all.length} แท็ก`:`Selected ${settings.nsfwTags.length}/${TAG_LIMIT} · ${matches.length} of ${all.length} tags`;
  list.replaceChildren();
  for(const tag of matches.slice(0,80)){
   const row=item('div');row.className='tretaresia-adult-tag';
   const label=item('label');label.className='checkbox_label';const check=item('input');check.type='checkbox';check.checked=chosen.has(tag.toLocaleLowerCase());
   const display=thai&&ADULT_TAG_THAI[tag]||tag;
   check.setAttribute('aria-label',`${check.checked?(thai?'ปิด':'Disable'):(thai?'เปิด':'Enable')} ${display}`);
   check.addEventListener('change',()=>{
    const existing=settings.nsfwTags.filter(t=>t.toLocaleLowerCase()!==tag.toLocaleLowerCase());
    if(check.checked&&existing.length>=TAG_LIMIT){check.checked=false;status.textContent=`เลือกได้สูงสุด ${TAG_LIMIT} แท็ก เพื่อไม่ให้พรอมต์ยาวเกินไป`;return;}
    settings.nsfwTags=check.checked?[...existing,tag]:existing;persist();render();
   });const caption=item('span',display);if(thai&&ADULT_TAG_THAI[tag])caption.append(item('small',tag));label.append(check,caption);row.append(label);
   if(custom.has(tag.toLocaleLowerCase())){
    const remove=item('button','ลบ');remove.type='button';remove.className='menu_button tretaresia-adult-remove';remove.setAttribute('aria-label',`ลบแท็กที่สร้างเอง ${tag}`);
    remove.addEventListener('click',()=>{settings.nsfwCustomTags=settings.nsfwCustomTags.filter(t=>t.toLocaleLowerCase()!==tag.toLocaleLowerCase());settings.nsfwTags=settings.nsfwTags.filter(t=>t.toLocaleLowerCase()!==tag.toLocaleLowerCase());persist();render();});row.append(remove);
   }
   list.append(row);
  }
  if(matches.length>80)list.append(item('p',thai?`แสดง 80 รายการแรกจาก ${matches.length} · พิมพ์ชื่อเพื่อค้นหาเพิ่มเติม`:`Showing the first 80 of ${matches.length} · search to narrow the list`));
  if(!matches.length)list.append(item('p',thai?'ไม่พบแท็ก · ลองสร้างชื่อใหม่ด้านล่าง':'No tags found · create a custom tag below'));
 }
 search.addEventListener('input',render);
 create.addEventListener('submit',event=>{
  event.preventDefault();const tag=normalizeTag(name.value);
  if(!tag){status.textContent='กรอกชื่อแท็กก่อน';return;}
  if(settings.nsfwCustomTags.length>=CUSTOM_LIMIT){status.textContent=`แท็กที่สร้างเองเต็ม ${CUSTOM_LIMIT} รายการ`;return;}
  const all=uniqueTags([...ADULT_TAGS,...settings.nsfwCustomTags,...imported]);
  if(all.some(t=>t.toLocaleLowerCase()===tag.toLocaleLowerCase()||ADULT_TAG_THAI[t]===tag)){status.textContent='ชื่อแท็กนี้มีอยู่แล้ว · ค้นหาแล้วเปิดจากรายการ';search.value=tag;render();return;}
  settings.nsfwCustomTags.push(tag);name.value='';search.value=tag;status.textContent=`สร้าง ${tag} แล้ว · กดเปิดเมื่อพร้อม`;persist();render();
 });
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];file.value='';if(!selected)return;
  try{
   if(selected.size>1024*1024)throw Error('ไฟล์แท็กต้องเล็กกว่า 1 MB');
   const incoming=parseTagCatalog(await selected.text());
   if(!incoming.length)throw Error('ไม่พบชื่อแท็กในไฟล์');
   const combined=uniqueTags([...imported,...incoming],10000);
   if(storage)await storage.setItem(CATALOG_KEY,combined);else localStorage.setItem(CATALOG_KEY,JSON.stringify(combined));
   imported=combined;status.textContent=`นำเข้า ${incoming.length} แท็กแล้ว · รายการเต็มอยู่ในเบราว์เซอร์นี้และยังไม่ส่งเข้า AI จนกว่าจะกดเปิด`;render();
  }catch(error){status.textContent=`นำเข้าไม่ได้: ${error.message}`;}
 });
 render();
 return {refresh:render};
}

