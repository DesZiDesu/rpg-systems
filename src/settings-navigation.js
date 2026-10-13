// The drawer owns navigation only. Existing inputs, editors and save handlers
// stay mounted; moving between pages never writes settings or discards a draft.
export const SETTINGS_ROUTES = Object.freeze({
    general: { icon:'sliders', title:['General play','การเล่นทั่วไป'], description:['Language, actions and continuity','ภาษา การส่งคำสั่ง และการสานต่อแชท'], aliases:'language ภาษา interaction delivery continuity ต่อเนื่อง launcher' },
    interface: { icon:'display', title:['Windows & appearance','หน้าต่างและรูปลักษณ์'], description:['Chatbar windows, chat cards and colors','หน้าต่างเหนือแชท รูปแบบข้อความ และสี'], aliases:'UI appearance layout หน้าต่าง สี header dialogue narrative status training' },
    world: { icon:'globe', title:['World & rules','โลกและกติกา'], description:['Stats, currency, powers and optional systems','Stats ค่าเงิน พลัง และระบบเสริม'], aliases:'world rules โลก กติกา stat เงิน power magic skill' },
    presets: { icon:'boxes-stacked', title:['Presets & character cards','Preset และการ์ดตัวละคร'], description:['Reusable setups, import/export and card packs','คลังชุดตั้งค่า Import/Export และแพ็กลงการ์ด'], aliases:'preset import export library card JSON คลัง การ์ด นำเข้า ส่งออก' },
    tracking: { icon:'arrows-rotate', title:['Tracking & notifications','ติดตามและแจ้งเตือน'], description:['Story updates, prompts and event alerts','ข้อมูลจากโรล การแนบสถานะ และการแจ้งเตือน'], aliases:'tracking prompt patch auto notify ติดตาม แจ้งเตือน' },
    advanced: { icon:'circle-info', title:['Advanced & diagnostics','ขั้นสูงและตรวจปัญหา'], description:['Request usage and tracking guide','จำนวนคำขอและคู่มือการติดตามข้อมูล'], aliases:'advanced diagnostics API request debug error ขั้นสูง ปัญหา คำขอ' },
    'chat-appearance': { parent:'interface', icon:'comments', title:['Chat cards & NPCs','รูปแบบข้อความและ NPC'], description:['Header, Dialogue, Narrative, themes and Regex','Header Dialogue Narrative ธีม และ Regex'], aliases:'header dialogue narrative theme regex shared native ผู้เล่น NPC บรรยาย บทพูด สีตัวละคร' },
    'interface-colors': { parent:'interface', icon:'palette', title:['RoleForge colors & density','สีและความหนาแน่น RoleForge'], description:['Accent, aura color, glass and glow','สีหลัก สีออร่า ความโปร่ง และแสง'], aliases:'accent aura density glass glow color สี มานา ออร่า' },
    stats: { parent:'world', icon:'heart', title:['Stats & practice','ค่าสถานะและการฝึก'], description:['Values, custom stats and practice methods','ค่าปัจจุบัน Custom Stats และวิธีฝึก'], aliases:'HP MP ST MAX INT STR DF AG stamina intelligence strength defense agility stats ฝึก สถิติ พลังชีวิต สตามิน่า' },
    currency: { parent:'world', icon:'coins', title:['Currency & exchange rates','ค่าเงินและอัตราแลก'], description:['Units, exchange rates and animated icons','หน่วยเงิน อัตราแลก และไอคอนเคลื่อนไหว'], aliases:'currency money gold silver copper dollar banknote icons coin เงิน ทอง เงินทองแดง ธนบัตร เหรียญ อัตราแลก' },
    powers: { parent:'world', icon:'bolt', title:['Power systems','ระบบพลัง'], description:['Configure this chat’s power preset','กำหนดระบบพลังของแชทนี้'], aliases:'power powers mana magic MP aura resource พลัง เวท มานา ออร่า' },
    forge: { parent:'world', icon:'user-pen', title:['Character Creation','การสร้างตัวละคร'], description:['Origin, skill, mastery, arsenal and path choices','ถิ่นกำเนิด สกิล ความเชี่ยวชาญ อาวุธ และเส้นทาง'], aliases:'forge creation character origin standing arsenal weapon rank party guild alignment preset ตัวละคร ถิ่นกำเนิด สถานะสังคม อาวุธ อันดับ ฝ่าย' },
    incantation: { parent:'world', icon:'book-open', title:['Incantation rules','กติกาวิชาและบทร่าย'], description:['NPC chants and incantation language','การร่ายของ NPC และภาษาบทร่าย'], aliases:'incantation chant NPC language บทร่าย ร่ายเวท ภาษา' },
    optional: { parent:'world', icon:'cubes', title:['Optional systems','ระบบเสริม'], description:['Enable only the systems you use','เลือกเปิดระบบที่ต้องการเล่น'], aliases:'optional marketplace shop negotiation auction mission party guild dungeon memory survival hunger thirst ระบบเสริม ตลาด ซื้อขาย ประมูล กิลด์ ปาร์ตี้ ภารกิจ ความจำ' },
    diary: { parent:'world', icon:'book', title:['NPC diary','บันทึกของ NPC'], description:['How often NPCs record their thoughts','ความถี่ในการบันทึกความคิดของ NPC'], aliases:'NPC diary thoughts frequency บันทึก ไดอารี่ ความคิด ความถี่' },
    'preset-library': { parent:'presets', icon:'boxes-stacked', title:['Preset library','คลัง Preset'], description:['Create, load, rename, delete and share setups','สร้าง ใช้ เปลี่ยนชื่อ ลบ และแชร์ชุดตั้งค่า'], aliases:'preset import export save create delete rename reset library JSON คลัง ลบ บันทึก เปลี่ยนชื่อ โหลด' },
    'card-pack': { parent:'presets', icon:'id-card', title:['Pack setup into a character card','แพ็กข้อมูลลงการ์ดตัวละคร'], description:['NPCs, Lore, presets and optional starting state','NPC Lore Preset และค่าเริ่มต้นที่เลือกเก็บ'], aliases:'card character pack bundle NPC lore import export starting state การ์ด ตัวละคร แพ็ก เริ่มต้น นำเข้า ส่งออก' },
    notifications: { parent:'tracking', icon:'bell', title:['Notification events','เลือกเหตุการณ์แจ้งเตือน'], description:['EXP, stats, items, combat, money and quests','EXP ค่าสถานะ ไอเทม ต่อสู้ เงิน และภารกิจ'], aliases:'notify notification duration pop-up exp level training inventory combat currency quests แจ้งเตือน ระยะเวลา เลเวล เงิน' },
    writing: { parent:'general', icon:'feather-pointed', title:['Writing preferences','แนวการเขียน'], description:['Optional writing style, tags and prompt editor','สไตล์ แท็ก และคำสั่งการเขียนที่เลือกใช้'], aliases:'writing NSFW adult tags prompt style enhance เขียน ผู้ใหญ่ แท็ก สไตล์' },
    diagnostics: { parent:'advanced', icon:'circle-info', title:['Request usage & tracking guide','จำนวนคำขอและคู่มือการติดตาม'], description:['Check request counts and understand updates','ตรวจจำนวนคำขอและวิธีอัปเดตข้อมูล'], aliases:'API request diagnostics debug tracking patch error latency performance usage คำขอ ปัญหา ช้า คู่มือ' },
});

const COPY = {
    'search-label':['Find a setting','ค้นหาการตั้งค่า'],
    'search-placeholder':['Try “Header”, “currency” or “HP”','เช่น Header, ค่าเงิน หรือ HP'],
    back:['Back','กลับ'],
    language:['Language','ภาษา'],
    actions:['Actions & continuity','การส่งคำสั่งและการสานต่อแชท'],
    'above-chatbar':['Windows above Chatbar','หน้าต่างเหนือ Chatbar'],
    'scene-and-navigation':['Scene display & navigation','ฉากและการเลือกหน้าต่าง'],
    'coin-icons':['Default coin icon set','ชุดไอคอนเงินเริ่มต้น'],
    'chant-rules':['Incantation rules','กติกาบทร่าย'],
    'story-tracking':['Track normal story replies','ติดตามคำตอบในแชทหลัก'],
    'notification-switches':['Notifications','การแจ้งเตือน'],
};
const normalized = value => String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu,' ').trim();

export function mountSettingsNavigation(root, {language=()=> 'en'} = {}) {
    if (!root) return null;
    if (root.rfSettingsNavigation) return root.rfSettingsNavigation;
    const doc=root.ownerDocument, win=doc.defaultView;
    const home=root.querySelector('[data-rf-settings-home]'), header=root.querySelector('[data-rf-settings-header]');
    if (!home || !header) return null;
    const input=root.querySelector('#roleforge-settings-search'), results=root.querySelector('[data-rf-settings-results]');
    const groups=root.querySelector('[data-rf-settings-groups]'), empty=root.querySelector('[data-rf-settings-empty]');
    const pages=new Map([...root.querySelectorAll('[data-rf-settings-page]')].map(node=>[node.dataset.rfSettingsPage,node]));
    const title=header.querySelector('[data-rf-settings-title]'), breadcrumb=header.querySelector('[data-rf-settings-breadcrumb]');
    let stack=[{id:'home'}], index=[], scheduled=0, destroyed=false, activeLanguage='en';
    const t=pair=>pair[activeLanguage==='th'?1:0];
    const text=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
    const node=(tag,cls,value)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el;};
    const scrollHost=()=>{
        for(let parent=root.parentElement;parent;parent=parent.parentElement){
            const style=win.getComputedStyle(parent);
            if(/auto|scroll/u.test(style.overflowY))return parent;
        }
        return doc.scrollingElement;
    };
    const remember=()=>{
        const frame=stack.at(-1),host=scrollHost();
        frame.scroll=host?.scrollTop||0;frame.host=host;frame.focus=doc.activeElement;
    };
    const restore=frame=>{
        win.requestAnimationFrame(()=>{
            if(destroyed||stack.at(-1)!==frame)return;
            const host=frame.host?.isConnected?frame.host:scrollHost();
            if(host)host.scrollTop=frame.scroll||0;
            if(frame.focus?.isConnected&&!frame.focus.closest('[hidden]'))frame.focus.focus?.({preventScroll:true});
        });
    };
    function paint() {
        const id=stack.at(-1).id;
        home.hidden=id!=='home';header.hidden=id==='home';
        for(const [key,page]of pages)page.hidden=key!==id;
        if(id!=='home'){
            text(title,t(SETTINGS_ROUTES[id].title));
            const parent=SETTINGS_ROUTES[id].parent;
            text(breadcrumb,parent?t(SETTINGS_ROUTES[parent].title):'RoleForge');
        }
        root.dataset.rfSettingsCurrent=id;
    }
    function open(id,{direct=false,focus=true}={}) {
        if(!pages.has(id)||stack.at(-1).id===id)return false;
        remember();
        if(direct){
            const parent=SETTINGS_ROUTES[id].parent;
            stack=[stack[0],...(parent?[{id:parent}]:[]),{id}];
        }else stack.push({id});
        paint();
        const frame=stack.at(-1);
        win.requestAnimationFrame(()=>{
            if(destroyed||stack.at(-1)!==frame)return;
            const host=scrollHost();
            if(host){
                const top=host===doc.scrollingElement?0:host.getBoundingClientRect().top;
                // The header is sticky; measure its static parent so a scrolled
                // editor never carries its old offset into the next page.
                host.scrollTop+=header.parentElement.getBoundingClientRect().top-top-8;
            }
            if(focus)title.focus({preventScroll:true});
        });
        return true;
    }
    function back() {
        if(stack.length<2)return false;
        stack.pop();paint();restore(stack.at(-1));return true;
    }
    function routeButton(id,{result=false}={}) {
        const route=SETTINGS_ROUTES[id],button=node('button','rf-settings-route menu_button');
        button.type='button';button.dataset.rfSettingsOpen=id;
        const icon=node('i','fa-solid fa-'+route.icon);icon.setAttribute('aria-hidden','true');
        const copy=node('span'),name=node('strong','',t(route.title));
        const detail=result&&route.parent?t(SETTINGS_ROUTES[route.parent].title):t(route.description);
        copy.append(name,node('small','',detail));
        const arrow=node('i','fa-solid fa-chevron-right');arrow.setAttribute('aria-hidden','true');
        button.append(icon,copy,arrow);return button;
    }
    function search() {
        const terms=normalized(input.value).split(' ').filter(Boolean);
        groups.hidden=Boolean(terms.length);results.hidden=!terms.length;empty.hidden=true;
        if(!terms.length){results.replaceChildren();return;}
        const matches=index.filter(item=>terms.every(term=>item.key.includes(term)))
            .sort((a,b)=>Number(Boolean(SETTINGS_ROUTES[b.id].parent))-Number(Boolean(SETTINGS_ROUTES[a.id].parent)));
        results.replaceChildren(...matches.map(item=>routeButton(item.id,{result:true})));
        empty.hidden=matches.length>0;
        text(empty,activeLanguage==='th'?'ไม่พบการตั้งค่า ลองใช้ชื่อระบบหรือชื่อค่า เช่น HP หรือ Regex':'No settings found. Try a system or value name, such as HP or Regex.');
    }
    function refresh() {
        if(destroyed)return;
        activeLanguage=language()==='th'?'th':'en';
        for(const el of root.querySelectorAll('[data-rf-label]')){
            const pair=COPY[el.dataset.rfLabel];if(pair)text(el,t(pair));
        }
        input.placeholder=t(COPY['search-placeholder']);
        input.setAttribute('aria-label',t(COPY['search-label']));
        root.querySelector('[data-rf-settings-clear]').setAttribute('aria-label',activeLanguage==='th'?'ล้างคำค้น':'Clear search');
        for(const button of root.querySelectorAll('[data-rf-settings-open]')){
            const route=SETTINGS_ROUTES[button.dataset.rfSettingsOpen];if(!route)continue;
            text(button.querySelector('[data-rf-route-title]'),t(route.title));
            text(button.querySelector('[data-rf-route-description]'),t(route.description));
            const icon=button.querySelector('[data-rf-route-icon]');if(icon)icon.className='fa-solid fa-'+route.icon;
        }
        // Index captions and option labels, never input/textarea values or chat text.
        index=[...pages].map(([id,page])=>{
            const route=SETTINGS_ROUTES[id];
            const captions=[...page.querySelectorAll('label,legend,summary,h3,option')].map(el=>el.textContent).join(' ');
            return {id,key:normalized([...route.title,...route.description,route.aliases,captions].join(' '))};
        });
        search();paint();
    }
    const schedule=()=>{if(!scheduled&&!destroyed)scheduled=win.requestAnimationFrame(()=>{scheduled=0;refresh();});};
    const onClick=event=>{
        const button=event.target.closest('button');if(!button||!root.contains(button))return;
        if(button.dataset.rfSettingsOpen){event.preventDefault();open(button.dataset.rfSettingsOpen);}
        else if(button.hasAttribute('data-rf-settings-back')){event.preventDefault();back();}
        else if(button.hasAttribute('data-rf-settings-clear')){input.value='';search();input.focus();}
    };
    const onInput=event=>{if(event.target===input)search();};
    const onKey=event=>{
        if(event.target===input&&event.key==='Escape'&&input.value){event.preventDefault();event.stopPropagation();input.value='';search();}
        else if(event.target===input&&event.key==='Enter'){
            const first=results.querySelector('[data-rf-settings-open]');if(first){event.preventDefault();event.stopPropagation();open(first.dataset.rfSettingsOpen);}
        }else if(event.key==='Escape'&&!event.target.matches('input,textarea,select')&&back()){event.preventDefault();event.stopPropagation();}
    };
    root.addEventListener('click',onClick);root.addEventListener('input',onInput);root.addEventListener('change',schedule);root.addEventListener('keydown',onKey);
    const observer=new win.MutationObserver(schedule);
    for(const page of pages.values())observer.observe(page,{childList:true,subtree:true});
    const api={
        open,back,refresh,
        reveal(target){const page=target?.closest?.('[data-rf-settings-page]');return page?open(page.dataset.rfSettingsPage,{direct:true,focus:false}):false;},
        get current(){return stack.at(-1).id;},
        home(){while(stack.length>1)stack.pop();paint();restore(stack[0]);},
        destroy(){destroyed=true;if(scheduled)win.cancelAnimationFrame(scheduled);observer.disconnect();root.removeEventListener('click',onClick);root.removeEventListener('input',onInput);root.removeEventListener('change',schedule);root.removeEventListener('keydown',onKey);delete root.rfSettingsNavigation;},
    };
    root.rfSettingsNavigation=api;refresh();return api;
}
