import { identity, resolveNpcSpeaker, keyName, parseStory, ROLE_ICONS, usable } from './npc-core.js?v=0.41.0';
import { croppedPortrait } from './npc-portraits.js?v=0.41.0';
import { renderSceneTracker } from './scene-tracker.js?v=0.41.0';

export function element(tag, className = '', text) {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
export function icon(name) { const node = element('i', `fa-solid fa-${name}`); node.setAttribute('aria-hidden','true'); return node; }
// Only support the two requested inline marks. Never parse model text as HTML.
export function appendStoryText(node,value){
    const source=String(value??''),pattern=/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
    let cursor=0,matched=false,part;
    while((part=pattern.exec(source))){
        if(part.index>0&&source[part.index-1]==='\\')continue;
        if(!part[1]?.trim()&&!part[2]?.trim())continue;
        if(part.index>cursor)node.append(document.createTextNode(source.slice(cursor,part.index)));
        const styled=element(part[1]!==undefined?'strong':'em','',part[1]??part[2]);node.append(styled);
        cursor=pattern.lastIndex;matched=true;
    }
    if(!matched)node.textContent=source;
    else if(cursor<source.length)node.append(document.createTextNode(source.slice(cursor)));
    return node;
}
export function narrative(text) {
    const node = element('div','trpg-narrative');
    for (const part of ['mark','top','glow','end']) { const deco=element('span',`trpg-prose-${part}`);deco.setAttribute('aria-hidden','true');if(part==='mark')deco.append(icon('feather-pointed'));node.append(deco); }
    node.append(appendStoryText(element('span','trpg-prose-copy'),text)); return node;
}
export function speakerHeader(profile, open) {
    const p={...profile,...identity(profile)}, header=element('button','trpg-header'); header.type='button';
    header.style.setProperty('--speaker',p.identityColor); header.style.setProperty('--portrait',`${p.portraitSize}px`);
    header.setAttribute('aria-label',`เปิดข้อมูล ${p.name}`);
    const details=element('span','trpg-identity'), role=element('span','trpg-role'); role.append(icon(ROLE_ICONS[p.roleIcon]));
    role.append(document.createTextNode([p.title,p.occupation].filter(usable).filter((v,i,a)=>a.indexOf(v)===i).join(' · ') || 'TRETARESIA'));
    details.append(role,element('strong','',p.name));
    const meta=element('span','trpg-meta');for(const value of [p.race,p.relationship,p.faction].filter(usable))meta.append(element('span','',value));details.append(meta);
    const action=element('span','trpg-open-record');action.append(icon('address-card'),element('small','','ข้อมูลตัวละคร'));
    header.append(details,action);header.addEventListener('click',()=>open(p));return header;
}

// Group headers by dialogue speaker, including assistant continuations. Narrative
// and untagged prose retain their exact order without ending a speaker's turn.
export function renderStoryBlocks(root, blocks, lookup, fallbackName, open, imageFor, previousSpeaker = null) {
    for (const block of blocks) {
        if (block.type === 'narrative') { root.append(narrative(block.text)); continue; }
        if (block.type === 'plain') { root.append(appendStoryText(element('div', 'trpg-plain'),block.text)); continue; }
        const name = block.name || fallbackName || 'NPC';
        const profile = lookup.get(keyName(name)) || resolveNpcSpeaker([...new Set(lookup.values())], name);
        // Canonical profile object also unifies aliases, without conflating
        // distinct records with the same display label or different scopes.
        const speaker = profile || keyName(name);
        const p = profile || { name };
        const section = element('section', 'trpg-speaker');
        section.style.setProperty('--speaker', identity(p).identityColor);
        if (speaker !== previousSpeaker) {
            const header = speakerHeader(p, open);
            section.append(header);
            if (p.id) void imageFor(p).then(url => {
                if (!url || !header.isConnected) return;
                const image = element('img', 'trpg-photo');
                image.alt = p.name; image.src = url;
                image.width = image.height = p.portraitSize || 72;
                header.prepend(image);
            });
        }
        section.append(appendStoryText(element('div', 'trpg-dialogue'),block.text));
        root.append(section);
        previousSpeaker = speaker;
    }
}

// Only an immediately preceding structured assistant message can continue a
// speaker. User/system turns or unstructured responses start a new sequence.
export function priorDialogueSpeaker(messages, id, lookup, visible) {
    const prior = messages?.[id - 1];
    if (!prior || prior.is_user || prior.is_system) return null;
    const blocks = parseStory(visible(prior.mes || ''));
    const last = blocks?.findLast(block => block.type === 'dialogue');
    if (!last) return null;
    const name = last.name || prior.name || 'NPC';
    return lookup.get(keyName(name)) || resolveNpcSpeaker([...new Set(lookup.values())], name) || keyName(name);
}

function diaryBook(note) {
    const window = element('aside','trpg-diary-book');
    window.setAttribute('aria-label',`Diary · ${note.npcName}`);
    const bar=element('div','trpg-diary-bar'),heading=element('strong','',`${note.npcName} / PERSONAL JOURNAL`);
    const close=element('button','', '×');close.type='button';close.setAttribute('aria-label','Close diary');
    bar.append(heading,close);window.append(bar);
    const book=element('div','trpg-diary-spread'),left=element('div','trpg-diary-page'),right=element('div','trpg-diary-page');
    left.append(element('small','',new Date(note.at).toLocaleDateString()),element('h3','',note.npcName),element('span','trpg-diary-rune','✦'));
    right.append(element('small','','PRIVATE THOUGHTS'),element('p','',note.text),element('small','',`— ${note.npcName}`));
    book.append(left,right);window.append(book);
    const cover=element('div','trpg-diary-cover',`${note.npcName}\nDIARY`);cover.hidden=true;window.append(cover);
    const footer=element('div','trpg-diary-footer'),fold=element('button','','Close book');fold.type='button';footer.append(fold);window.append(footer);
    close.addEventListener('click',()=>window.remove());
    fold.addEventListener('click',()=>{cover.hidden=!cover.hidden;book.hidden=!book.hidden;fold.textContent=book.hidden?'Open book':'Close book';});
    let start=null;
    bar.addEventListener('pointerdown',event=>{
        if(event.target.closest('button'))return;
        const rect=window.getBoundingClientRect();
        start={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};bar.setPointerCapture(event.pointerId);
    });
    bar.addEventListener('pointermove',event=>{
        if(!start)return;
        window.style.left=`${Math.max(0,Math.min(innerWidth-window.offsetWidth,start.left+event.clientX-start.x))}px`;
        window.style.top=`${Math.max(0,Math.min(innerHeight-window.offsetHeight,start.top+event.clientY-start.y))}px`;
    });
    for(const type of ['pointerup','pointercancel'])bar.addEventListener(type,()=>{start=null});
    return window;
}

function householdInvitation(offer, messageId, api) {
    const card=element('section','trpg-household-writ');
    card.append(element('span','trpg-writ-sigil','✦'),element('small','trpg-writ-eyebrow','THE HOUSEHOLD COVENANT'),element('h3','',offer.npcName),
        element('p','',`Requests to join your household as ${offer.role}`));
    if(offer.status==='pending'){
        const actions=element('div','trpg-writ-actions');
        for(const [label,accepted] of [['Accept',true],['Decline',false]]){
            const button=element('button',accepted?'trpg-writ-accept':'trpg-writ-reject',label);button.type='button';
            button.addEventListener('click',async()=>{
                actions.querySelectorAll('button').forEach(item=>item.disabled=true);
                const saved=await api.answerHouseholdOffer(messageId,offer.npcId,accepted);
                if(!saved)actions.querySelectorAll('button').forEach(item=>item.disabled=false);
            });actions.append(button);
        }
        card.append(actions);
    }else card.append(element('p',`trpg-writ-status${offer.status==='rejected'?' is-rejected':''}`,offer.status==='accepted'?`Accepted · ${offer.role}`:'Declined'));
    return card;
}

function groupInvitation(offer, messageId, api) {
    const guild = offer.kind === 'guild';
    const card = element('section',`trpg-group-invite ${guild ? 'is-guild' : 'is-party'}`);
    card.append(element('small','trpg-group-invite-type',guild ? 'OFFICIAL CHARTER · GUILD INVITATION' : 'FIELD DISPATCH · PARTY INVITATION'));
    const seal = element('span','trpg-group-invite-seal',guild ? '✦' : '◆');seal.setAttribute('aria-hidden','true');card.append(seal);
    card.append(element('h3','',offer.name),element('p','trpg-group-invite-from',`${offer.inviterName} · ${guild ? 'ผู้แทนกิลด์' : 'ผู้เชิญเข้าปาร์ตี้'}`));
    if (offer.description) card.append(element('p','trpg-group-invite-desc',offer.description));
    const facts = element('div','trpg-group-invite-facts');
    const role = element('div');role.append(element('small','','ตำแหน่งที่คุณจะได้รับ'),element('strong','',offer.role));
    const count = element('div');count.append(element('small','','สมาชิกก่อน → หลังเข้าร่วม'),
        element('strong','',offer.memberCount === null ? 'ยังไม่ทราบ' : `${offer.memberCount} → ${offer.memberCount + 1} คน`));
    facts.append(role,count);card.append(facts);
    if (offer.leaderName) card.append(element('p','trpg-group-invite-roster',`หัวหน้า: ${offer.leaderName}`));
    const names = (offer.members || []).map(person => person.name).join(', ');
    if (names) card.append(element('p','trpg-group-invite-roster',`สมาชิกที่รู้จัก: ${names}${offer.memberCount !== null && offer.memberCount > offer.members.length ? ` · อีก ${offer.memberCount - offer.members.length} คนยังไม่ทราบชื่อ` : ''}`));
    if (offer.status === 'pending') {
        const actions = element('div','trpg-group-invite-actions');
        for (const [label,accepted] of [[guild ? 'รับตรากิลด์' : 'ยอมรับคำเชิญ',true],['ปฏิเสธ',false]]) {
            const button = element('button',accepted ? 'trpg-group-invite-accept' : 'trpg-group-invite-reject',label);button.type='button';button.disabled=Boolean(offer.preview);
            button.addEventListener('click',async()=>{
                actions.querySelectorAll('button').forEach(item=>item.disabled=true);
                try { if (!await api.answerGroupOffer(messageId,offer.key,accepted)) actions.querySelectorAll('button').forEach(item=>item.disabled=false); }
                catch { actions.querySelectorAll('button').forEach(item=>item.disabled=false); }
            });actions.append(button);
        }
        card.append(actions);
        if(offer.preview)card.append(element('p','trpg-group-invite-status','กำลังรับคำเชิญ… ตอบรับได้เมื่อข้อความเสร็จ'));
    } else card.append(element('p','trpg-group-invite-status',offer.status === 'accepted' ? `เข้าร่วมแล้ว · ${offer.role}` : 'ปฏิเสธคำเชิญแล้ว'));
    return card;
}

export function createChatPresentation(api, open) {
    const mounted=new Map(), portraits=new Map();let timer,revision=0,epoch=0,currentChat='';
    function clearPortraits(){++epoch;for(const record of portraits.values())if(record.url)URL.revokeObjectURL(record.url);portraits.clear();}
    async function imageFor(p){
        const frame=p.portraitView?.[matchMedia('(max-width: 650px)').matches?'mobile':'desktop']||{x:50,y:50,zoom:1};
        const key=JSON.stringify([currentChat,p.id,p.updatedAt,p.characterLifePortraitId,frame]);
        if(portraits.has(key))return portraits.get(key).promise;
        const record={url:null},ticket=epoch;
        record.promise=(async()=>{try{const blob=await api.portrait(p);if(!blob)return null;const result=await croppedPortrait(blob,frame);if(ticket!==epoch)return null;record.url=URL.createObjectURL(result);return record.url;}catch{return null;}})();
        portraits.set(key,record);return record.promise;
    }
    function restore(host, entry){if(entry.root.parentNode===host)host.replaceChildren(...entry.original);mounted.delete(host);}
    function render(){
        timer=null;const context=api.context(),chatId=context.getCurrentChatId?.()||'';
        if(chatId!==currentChat){currentChat=chatId;clearPortraits();document.querySelectorAll('.trpg-diary-book').forEach(book=>book.remove());for(const [host,entry]of mounted)restore(host,entry);}
        const settings=api.settings();
        const npcs=api.state().npcs||[], lookup=new Map();
        for(const npc of npcs)for(const name of [npc.name,...(npc.aliases||[])])if(!lookup.has(keyName(name)))lookup.set(keyName(name),npc);
        for(const [host]of mounted)if(!host.isConnected)mounted.delete(host);
        for(const host of document.querySelectorAll('#chat .mes .mes_text')){
            const mes=host.closest('.mes'), id=Number(mes.getAttribute('mesid')), message=context.chat?.[id];
            if(!message || message.is_user || message.is_system || mes.querySelector('.mes_edit_textarea'))continue;
            const source=api.visible(message.mes||''),blocks=settings.chatPresentation?parseStory(source):null,old=mounted.get(host);
            const scene=settings.showSceneTracker?api.sceneForMessage?.(id,message):null;
            const offers=api.socialEventsForMessage?.(id,message)?.offers||[];
            const groupOffers=api.socialEventsForMessage?.(id,message)?.groupOffers||[];
            const notes=api.diaryForMessage?.(id,message)||[];
            if(!blocks&&!scene&&!offers.length&&!groupOffers.length&&!notes.length){if(old)restore(host,old);continue;}
            const previousSpeaker=priorDialogueSpeaker(context.chat,id,lookup,api.visible);
            const previousKey=typeof previousSpeaker==='object'&&previousSpeaker
                ? JSON.stringify([previousSpeaker.id,previousSpeaker.name,previousSpeaker.npcScope,previousSpeaker.npcOwner]) : previousSpeaker;
            const signature=`${revision}:${settings.chatEffects}:${settings.language}:${Boolean(blocks)}:${previousKey}:${JSON.stringify(scene)}:${JSON.stringify(offers)}:${JSON.stringify(groupOffers)}:${JSON.stringify(notes)}:${source}`;
            if(old?.signature===signature && old.root.parentNode===host)continue;
            const original=old?.root.parentNode===host?old.original:[...host.childNodes];
            const root=element('div','trpg-chat');root.classList.toggle('trpg-effects',Boolean(settings.chatEffects));
            if(scene)root.append(renderSceneTracker(scene,settings.language));
            if(blocks)renderStoryBlocks(root, blocks, lookup, message.name, open, imageFor, previousSpeaker);
            else root.append(appendStoryText(element('div','trpg-plain'),source));
            for(const offer of offers)root.append(householdInvitation(offer,id,api));
            for(const offer of groupOffers)root.append(groupInvitation(offer,id,api));
            for(const note of notes){
                const button=element('button','trpg-diary-trigger',`✦  ${note.npcName} · Open diary`);button.type='button';
                button.addEventListener('click',()=>{
                    document.querySelectorAll('.trpg-diary-book').forEach(book=>book.remove());
                    const book=diaryBook(note);document.body.append(book);
                });root.append(button);
            }
            mounted.set(host,{root,original,signature});host.replaceChildren(root);
        }
    }
    function schedule(){if(timer==null)timer=setTimeout(render,90);}
    const observer=new MutationObserver(records=>{
        if(records.some(r=>{
            const target=r.target.nodeType===1?r.target:r.target.parentElement;
            if(target?.closest('.trpg-chat'))return false;
            if(r.type==='childList'&&r.addedNodes.length===1&&r.addedNodes[0].classList?.contains('trpg-chat'))return false;
            return target?.closest('#chat');
        }))schedule();
    });
    // Observe only the chat, not the full settings/editor tree. Host events handle chat replacement.
    function observe(){observer.disconnect();const chat=document.getElementById('chat');if(chat)observer.observe(chat,{childList:true,subtree:true,characterData:true});schedule();}
    const context=api.context();for(const event of ['CHAT_CHANGED','CHARACTER_MESSAGE_RENDERED','MESSAGE_SWIPED','MESSAGE_DELETED','GENERATION_ENDED','STREAM_TOKEN_RECEIVED','GENERATION_STARTED']){
        const type=(context.eventTypes||context.event_types)?.[event];if(type)context.eventSource?.on(type,observe);
    }
    observe();
    return {refresh(){revision++;clearPortraits();schedule();},reset(){currentChat='';observe();},destroy(){clearTimeout(timer);observer.disconnect();clearPortraits();document.querySelectorAll('.trpg-diary-book').forEach(book=>book.remove());for(const [host,entry]of mounted)restore(host,entry);}};
}
