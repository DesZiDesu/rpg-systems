import {renderAuctionCard} from './auction-ui.js?v=0.45.3';
import { renderMissionBoard } from './mission-board-ui.js?v=0.45.3';
import {uiText} from './ui-language.js?v=0.45.3';
import { MEDALLION_ROLES, MEDALLION_FRAME } from './npc-medallions.js?v=0.45.3';
import { identity, resolveNpcSpeaker, keyName, parseStory, ROLE_ICONS, usable } from './npc-core.js?v=0.45.3';
import { croppedPortrait } from './npc-portraits.js?v=0.45.3';
import { renderSceneTracker } from './scene-tracker.js?v=0.45.3';

export function element(tag, className = '', text) {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
export function icon(name) { const node = element('i', `fa-solid fa-${name}`); node.setAttribute('aria-hidden','true'); return node; }
// Saved legacy keys keep their original Font Awesome appearance.
export function roleIcon(key) {
    const [style,role] = String(key || '').split(':');
    if (!['medallion','emblem'].includes(style) || !Object.hasOwn(MEDALLION_ROLES,role)) return icon(ROLE_ICONS[key] || ROLE_ICONS.book);
    const node=element('span','trpg-role-art'); node.setAttribute('aria-hidden','true');
    const shape=MEDALLION_ROLES[role].shape;
    // No user text enters markup: both paths and frame come from the static allowlist.
    node.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 ${style==='medallion'?'128 128':'96 96'}" focusable="false">${style==='medallion'?MEDALLION_FRAME+'<g transform="translate(24 24) scale(.8333333)">'+shape+'</g>':shape}</svg>`;
    return node;
}
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
    header.setAttribute('aria-label',uiText("เปิดข้อมูล {0}",[p.name]));
    const details=element('span','trpg-identity'), role=element('span','trpg-role'); role.append(roleIcon(p.roleIcon));
    role.append(document.createTextNode([p.title,p.occupation].filter(usable).filter((v,i,a)=>a.indexOf(v)===i).join(' · ') || 'ROLEFORGE'));
    details.append(role,element('strong','',p.name));
    const meta=element('span','trpg-meta');for(const value of [p.race,p.relationship,p.faction].filter(usable))meta.append(element('span','',value));details.append(meta);
    const action=element('span','trpg-open-record');action.append(icon('address-card'),element('small','',uiText("ข้อมูลตัวละคร")));
    header.append(details,action);header.addEventListener('click',()=>open(p));return header;
}

// Keep every block in story order. A header starts a character's turn; prose
// before the first header stays global, and later prose belongs to that turn.
export function renderStoryBlocks(root, blocks, lookup, fallbackName, open, imageFor, previousSpeaker = null) {
    let section = null;
    const startSpeaker = name => {
        const profile = resolveNpcSpeaker([...new Set(lookup.values())], name);
        // Canonical profiles unify aliases without conflating distinct NPCs.
        const speaker = profile || keyName(name);
        if (speaker === previousSpeaker && section) return section;
        const p = profile || { name };
        section = element('section', 'trpg-speaker');
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
        root.append(section);
        previousSpeaker = speaker;
        return section;
    };
    for (const block of blocks) {
        if (block.type === 'header') { startSpeaker(block.name || fallbackName || 'NPC'); continue; }
        if (block.type === 'narrative') { (section || root).append(narrative(block.text)); continue; }
        if (block.type === 'plain') { (section || root).append(appendStoryText(element('div', 'trpg-plain'),block.text)); continue; }
        if (block.type === 'dialogue') startSpeaker(block.name || fallbackName || 'NPC').append(appendStoryText(element('div', 'trpg-dialogue'),block.text));
    }
}

// Only an immediately preceding structured assistant message can continue a
// speaker. User/system turns or unstructured responses start a new sequence.
export function priorDialogueSpeaker(messages, id, lookup, visible) {
    const prior = messages?.[id - 1];
    if (!prior || prior.is_user || prior.is_system) return null;
    const blocks = parseStory(visible(prior.mes || ''));
    const last = blocks?.findLast(block => block.type === 'dialogue' || block.type === 'header');
    if (!last) return null;
    const name = last.name || prior.name || 'NPC';
    return resolveNpcSpeaker([...new Set(lookup.values())], name) || keyName(name);
}

function diaryBook(note) {
    const window = element('aside','trpg-diary-book');
    window.setAttribute('aria-label',uiText('Diary · {0}',[note.npcName]));
    const bar=element('div','trpg-diary-bar'),heading=element('strong','',uiText('{0} / PERSONAL JOURNAL',[note.npcName]));
    const close=element('button','', uiText("×"));close.type='button';close.setAttribute('aria-label',uiText('Close diary'));
    bar.append(heading,close);window.append(bar);
    const book=element('div','trpg-diary-spread'),left=element('div','trpg-diary-page'),right=element('div','trpg-diary-page');
    left.append(element('small','',new Date(note.at).toLocaleDateString()),element('h3','',note.npcName),element('span','trpg-diary-rune','✦'));
    right.append(element('small','',uiText("PRIVATE THOUGHTS")),element('p','',note.text),element('small','',`— ${note.npcName}`));
    book.append(left,right);window.append(book);
    const cover=element('div','trpg-diary-cover',uiText('{0}\nDIARY',[note.npcName]));cover.hidden=true;window.append(cover);
    const footer=element('div','trpg-diary-footer'),fold=element('button','',uiText("Close book"));fold.type='button';footer.append(fold);window.append(footer);
    close.addEventListener('click',()=>window.remove());
    fold.addEventListener('click',()=>{cover.hidden=!cover.hidden;book.hidden=!book.hidden;fold.textContent=uiText(book.hidden?'Open book':'Close book');});
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
    card.append(element('span','trpg-writ-sigil','✦'),element('small','trpg-writ-eyebrow',uiText("THE HOUSEHOLD COVENANT")),element('h3','',offer.npcName),
        element('p','',uiText('Requests to join your household as {0}',[offer.role])));
    if(offer.status==='pending'){
        const actions=element('div','trpg-writ-actions');
        for(const [label,accepted] of [['Accept',true],['Decline',false]]){
            const button=element('button',accepted?'trpg-writ-accept':'trpg-writ-reject',uiText(label));button.type='button';
            button.addEventListener('click',async()=>{
                actions.querySelectorAll('button').forEach(item=>item.disabled=true);
                const saved=await api.answerHouseholdOffer(messageId,offer.npcId,accepted);
                if(!saved)actions.querySelectorAll('button').forEach(item=>item.disabled=false);
            });actions.append(button);
        }
        card.append(actions);
    }else card.append(element('p',`trpg-writ-status${offer.status==='rejected'?' is-rejected':''}`,offer.status==='accepted'?uiText("Accepted · {0}",[offer.role]):uiText("Declined")));
    return card;
}

function groupInvitation(offer, messageId, api) {
    const guild = offer.kind === 'guild';
    const card = element('section',`trpg-group-invite ${guild ? 'is-guild' : 'is-party'}`);
    card.append(element('small','trpg-group-invite-type',guild ? uiText("OFFICIAL CHARTER · GUILD INVITATION") : uiText("FIELD DISPATCH · PARTY INVITATION")));
    const seal = element('span','trpg-group-invite-seal',guild ? '✦' : '◆');seal.setAttribute('aria-hidden','true');card.append(seal);
    card.append(element('h3','',offer.name),element('p','trpg-group-invite-from',`${offer.inviterName} · ${guild ? uiText("ผู้แทนกิลด์") : uiText("ผู้เชิญเข้าปาร์ตี้")}`));
    if (offer.description) card.append(element('p','trpg-group-invite-desc',offer.description));
    const facts = element('div','trpg-group-invite-facts');
    const role = element('div');role.append(element('small','',uiText("ตำแหน่งที่คุณจะได้รับ")),element('strong','',offer.role));
    const count = element('div');count.append(element('small','',uiText("สมาชิกก่อน → หลังเข้าร่วม")),
        element('strong','',offer.memberCount === null ? uiText("ยังไม่ทราบ") : uiText("{0} → {1} คน",[offer.memberCount,offer.memberCount + 1])));
    const rank = element('div');rank.append(element('small','',uiText("แรงก์กลุ่ม")),element('strong','',offer.rank || uiText("ยังไม่ทราบ")));
    const quests = element('div');quests.append(element('small','',uiText("ภารกิจสำเร็จ")),element('strong','',offer.completedQuests === null || offer.completedQuests === undefined ? uiText("ยังไม่ทราบ") : uiText("{0} ภารกิจ",[offer.completedQuests])));
    const reputation = element('div');reputation.append(element('small','',uiText("Reputation")),element('strong','',offer.reputation === null || offer.reputation === undefined ? uiText("ยังไม่ทราบ") : String(offer.reputation)));
    facts.append(role,count,rank,quests,reputation);card.append(facts);
    if (offer.leaderName) card.append(element('p','trpg-group-invite-roster',uiText("หัวหน้า: {0}",[offer.leaderName])));
    const names = (offer.members || []).map(person => person.name).join(', ');
    if (names) card.append(element('p','trpg-group-invite-roster',uiText("สมาชิกที่รู้จัก: {0}{1}",[names,offer.memberCount !== null && offer.memberCount > offer.members.length ? ` · อีก ${offer.memberCount - offer.members.length} คนยังไม่ทราบชื่อ` : ''])));
    if (offer.status === 'pending') {
        const actions = element('div','trpg-group-invite-actions');
        for (const [label,accepted] of [[guild ? uiText("รับตรากิลด์") : uiText("ยอมรับคำเชิญ"),true],[uiText("ปฏิเสธ"),false]]) {
            const button = element('button',accepted ? 'trpg-group-invite-accept' : 'trpg-group-invite-reject',label);button.type='button';button.disabled=Boolean(offer.preview);
            button.addEventListener('click',async()=>{
                actions.querySelectorAll('button').forEach(item=>item.disabled=true);
                try { if (!await api.answerGroupOffer(messageId,offer.key,accepted)) actions.querySelectorAll('button').forEach(item=>item.disabled=false); }
                catch { actions.querySelectorAll('button').forEach(item=>item.disabled=false); }
            });actions.append(button);
        }
        card.append(actions);
        if(offer.preview)card.append(element('p','trpg-group-invite-status',uiText("กำลังรับคำเชิญ… ตอบรับได้เมื่อข้อความเสร็จ")));
    } else card.append(element('p','trpg-group-invite-status',offer.status === 'accepted' ? uiText("เข้าร่วมแล้ว · {0}",[offer.role]) : uiText("ปฏิเสธคำเชิญแล้ว")));
    return card;
}

// SillyTavern has already run Markdown, display regex and its HTML sanitizer on
// .mes_text. Keep that DOM authoritative: reparsing message.mes loses custom
// cards, formatting, bound listeners and display-only regex replacements.
export function displayRegexEnabled(context = {}) {
    const settings=context.extensionSettings||context.extension_settings||{};
    if (settings.disabledExtensions?.includes('regex')) return false;
    const character=context.characters?.[context.characterId];
    const lists=[settings.regex];
    // Honor ST's per-card/preset opt-in when the host exposes those lists.
    if (!Array.isArray(settings.character_allowed_regex)||settings.character_allowed_regex.includes(character?.avatar)) lists.push(character?.data?.extensions?.regex_scripts);
    try {
        const manager=context.getPresetManager?.(),allowed=settings.preset_allowed_regex;
        const name=manager?.getSelectedPresetName?.();
        if (!allowed || !manager?.apiId || !name || allowed[manager.apiId]?.includes(name)) lists.push(manager?.readPresetExtensionField?.({path:'regex_scripts'}));
    } catch { /* Older hosts may not expose an active preset. */ }
    return lists.some(list=>Array.isArray(list)&&list.some(script=>script&&!script.disabled&&script.findRegex
        && (!script.promptOnly||script.markdownOnly)
        && Array.isArray(script.placement)&&script.placement.some(placement=>[0,2].includes(Number(placement)))));
}

function supportsStoryPresentation(nodes, source, blocks, context) {
    if (!blocks || displayRegexEnabled(context)) return false;
    // Explicit story tags and simple bold/italic are our presentation protocol.
    // Links, tables, code, custom tags/attributes and regex widgets belong to the
    // host renderer. Do not try to reconstruct them from unsanitized model HTML.
    if (/<(?!\/?(?:tr-(?:header|narrative|dialogue)|header|narrative|dialogue)\b)[a-z!][^>]*>/i.test(source)) return false;
    const allowed=new Set(['P','BR','STRONG','EM','Q','TR-HEADER','TR-NARRATIVE','TR-DIALOGUE']);
    for (const node of nodes) {
        const descendants=node.nodeType===1?[node,...node.querySelectorAll('*')]:[];
        for (const child of descendants) {
            if (!allowed.has(child.tagName)) return false;
            if ([...child.attributes].some(attribute=>!child.tagName.startsWith('TR-')||attribute.name!=='name')) return false;
        }
    }
    const hostText=nodes.map(node=>node.textContent||'').join('');
    if (hostText===source) return true; // Hosts which escape the protocol tags.
    const expected=element('span');
    for (const block of blocks) if (block.text) appendStoryText(expected,block.text);
    const compact=value=>value.replace(/\s+/g,'');
    return compact(hostText)===compact(expected.textContent||'');
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
    const nativeNodes=(host,entry)=>[...host.childNodes].filter(node=>!entry?.roots.includes(node));
    function restore(host, entry, source){
        // Never restore a stale snapshot over a native edit, swipe, streaming
        // update or another extension's newly rendered content.
        if(entry.storyRoot&&host.contains(entry.storyRoot)){
            // Another formatter may wrap our existing story. Restore its
            // original native nodes in place, preserving that new wrapper.
            const unchanged=source!==undefined&&entry.source===source;
            const restoreOriginal=source===undefined
                ? entry.storyRoot.parentNode!==host||!nativeNodes(host,entry).length
                : unchanged;
            if(restoreOriginal)entry.storyRoot.replaceWith(...entry.original);
            else entry.storyRoot.remove();
        }
        // Exact node references belong to us even after wrapInner()/reparenting.
        // Never remove the other formatter's wrapper or its native child nodes.
        for(const root of entry.roots)root.remove();
        mounted.delete(host);
    }
    function render(){
        timer=null;const context=api.context(),chatId=context.getCurrentChatId?.()||'';
        if(chatId!==currentChat){currentChat=chatId;clearPortraits();document.querySelectorAll('.trpg-diary-book').forEach(book=>book.remove());for(const [host,entry]of mounted)restore(host,entry);}
        const settings=api.settings();
        const npcs=api.state().npcs||[], lookup=new Map();
        for(const npc of npcs)for(const name of [npc.name,...(npc.aliases||[])])if(!lookup.has(keyName(name)))lookup.set(keyName(name),npc);
        for(const [host]of mounted)if(!host.isConnected)mounted.delete(host);
        for(const host of document.querySelectorAll('#chat .mes .mes_text')){
            const mes=host.closest('.mes'), id=Number(mes.getAttribute('mesid')), message=context.chat?.[id];
            let old=mounted.get(host);
            if(!message || message.is_user || message.is_system || mes.querySelector('.mes_edit_textarea')){if(old)restore(host,old);continue;}
            const source=api.visible(message.mes||'');
            // A host rerender may replace only part of .mes_text. Remove our old
            // UI without overwriting the new nodes; use those nodes from here on.
            if(old?.storyRoot && (old.storyRoot.parentNode!==host||nativeNodes(host,old).length)){
                restore(host,old,source);old=null;
            }
            const original=old?.storyRoot?.parentNode===host?old.original:nativeNodes(host,old);
            const parsed=settings.chatPresentation?parseStory(source):null;
            const blocks=supportsStoryPresentation(original,source,parsed,context)?parsed:null;
            const scene=settings.showSceneTracker?api.sceneForMessage?.(id,message):null;
            const offers=api.socialEventsForMessage?.(id,message)?.offers||[];
            const groupOffers=api.socialEventsForMessage?.(id,message)?.groupOffers||[];
            const notes=api.diaryForMessage?.(id,message)||[];
            const board=api.missionBoardForMessage?.(id,message);
            const auction=api.auctionForMessage?.(id,message);
            if(!blocks&&!scene&&!offers.length&&!groupOffers.length&&!notes.length&&!board&&!auction){if(old)restore(host,old,source);continue;}
            const previousSpeaker=priorDialogueSpeaker(context.chat,id,lookup,api.visible);
            const previousKey=typeof previousSpeaker==='object'&&previousSpeaker
                ? JSON.stringify([previousSpeaker.id,previousSpeaker.name,previousSpeaker.npcScope,previousSpeaker.npcOwner]) : previousSpeaker;
            const signature=`${revision}:${settings.chatEffects}:${settings.language}:${Boolean(blocks)}:${previousKey}:${JSON.stringify(scene)}:${JSON.stringify(offers)}:${JSON.stringify(groupOffers)}:${JSON.stringify(notes)}:${JSON.stringify(board)}:${JSON.stringify(auction)}:${source}`;
            if(old?.signature===signature && old.roots.every(root=>root.parentNode===host))continue;
            if(old)restore(host,old,source);
            const prefix=element('div','trpg-chat'),suffix=element('div','trpg-chat');
            for(const root of [prefix,suffix])root.classList.toggle('trpg-effects',Boolean(settings.chatEffects));
            if(scene)prefix.append(renderSceneTracker(scene,settings.language));
            const storyRoot=blocks?element('div','trpg-chat'):null;
            if(storyRoot){storyRoot.classList.toggle('trpg-effects',Boolean(settings.chatEffects));renderStoryBlocks(storyRoot,blocks,lookup,message.name,open,imageFor,previousSpeaker);}
            if(board)suffix.append(renderMissionBoard(board,id,api));
            if(auction)suffix.append(renderAuctionCard(auction,api,id));
            for(const offer of offers)suffix.append(householdInvitation(offer,id,api));
            for(const offer of groupOffers)suffix.append(groupInvitation(offer,id,api));
            for(const note of notes){
                const button=element('button','trpg-diary-trigger',uiText('✦  {0} · Open diary',[note.npcName]));button.type='button';
                button.addEventListener('click',()=>{
                    document.querySelectorAll('.trpg-diary-book').forEach(book=>book.remove());
                    const book=diaryBook(note);document.body.append(book);
                });suffix.append(button);
            }
            const roots=[];
            if(storyRoot){host.replaceChildren(storyRoot);roots.push(storyRoot);}
            if(prefix.childNodes.length){host.prepend(prefix);roots.push(prefix);}
            if(suffix.childNodes.length){host.append(suffix);roots.push(suffix);}
            mounted.set(host,{roots,storyRoot,original:storyRoot?original:null,source,signature});
        }
    }
    function schedule(){if(timer==null)timer=setTimeout(render,90);}
    const observer=new MutationObserver(records=>{
        if(records.some(r=>{
            const target=r.target.nodeType===1?r.target:r.target.parentElement;
            if(target?.closest('.trpg-chat'))return false;
            // Our own sibling insertion/removal must not retrigger mounting.
            if(r.type==='childList'&&[...r.addedNodes,...r.removedNodes].length&&[...r.addedNodes,...r.removedNodes].every(node=>node.nodeType===1&&node.classList.contains('trpg-chat')))return false;
            return target?.closest('#chat');
        }))schedule();
    });
    // Observe only the chat, not the full settings/editor tree. Host events handle chat replacement.
    function observe(){observer.disconnect();const chat=document.getElementById('chat');if(chat)observer.observe(chat,{childList:true,subtree:true,characterData:true});schedule();}
    const context=api.context();for(const event of ['CHAT_CHANGED','CHARACTER_MESSAGE_RENDERED','MESSAGE_UPDATED','MESSAGE_EDITED','MESSAGE_SWIPED','MESSAGE_DELETED','GENERATION_ENDED','STREAM_TOKEN_RECEIVED','GENERATION_STARTED']){
        const type=(context.eventTypes||context.event_types)?.[event];if(type)context.eventSource?.on(type,observe);
    }
    observe();
    return {refresh(){revision++;clearPortraits();schedule();},reset(){currentChat='';observe();},destroy(){clearTimeout(timer);observer.disconnect();clearPortraits();document.querySelectorAll('.trpg-diary-book').forEach(book=>book.remove());for(const [host,entry]of mounted)restore(host,entry);}};
}
