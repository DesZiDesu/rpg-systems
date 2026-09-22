import { identity, keyName, parseStory, ROLE_ICONS, usable } from './npc-core.js?v=0.34.0';
import { croppedPortrait } from './npc-portraits.js?v=0.34.0';

export function element(tag, className = '', text) {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
export function icon(name) { const node = element('i', `fa-solid fa-${name}`); node.setAttribute('aria-hidden','true'); return node; }
export function narrative(text) {
    const node = element('div','trpg-narrative');
    for (const part of ['mark','top','glow','end']) { const deco=element('span',`trpg-prose-${part}`);deco.setAttribute('aria-hidden','true');if(part==='mark')deco.append(icon('feather-pointed'));node.append(deco); }
    node.append(element('span','trpg-prose-copy',text)); return node;
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
        if (block.type === 'plain') { root.append(element('div', 'trpg-plain', block.text)); continue; }
        const name = block.name || fallbackName || 'NPC';
        const profile = lookup.get(keyName(name));
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
        section.append(element('div', 'trpg-dialogue', block.text));
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
    return lookup.get(keyName(name)) || keyName(name);
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
        if(chatId!==currentChat){currentChat=chatId;clearPortraits();for(const [host,entry]of mounted)restore(host,entry);}
        const settings=api.settings();
        if(!settings.chatPresentation){for(const [host,entry]of mounted)restore(host,entry);return;}
        const npcs=api.state().npcs||[], lookup=new Map();
        for(const npc of npcs)for(const name of [npc.name,...(npc.aliases||[])])if(!lookup.has(keyName(name)))lookup.set(keyName(name),npc);
        for(const [host]of mounted)if(!host.isConnected)mounted.delete(host);
        for(const host of document.querySelectorAll('#chat .mes .mes_text')){
            const mes=host.closest('.mes'), id=Number(mes.getAttribute('mesid')), message=context.chat?.[id];
            if(!message || message.is_user || message.is_system || mes.querySelector('.mes_edit_textarea'))continue;
            const source=api.visible(message.mes||''),blocks=parseStory(source),old=mounted.get(host);
            if(!blocks){if(old)restore(host,old);continue;}
            const previousSpeaker=priorDialogueSpeaker(context.chat,id,lookup,api.visible);
            const previousKey=typeof previousSpeaker==='object'&&previousSpeaker
                ? JSON.stringify([previousSpeaker.id,previousSpeaker.name,previousSpeaker.npcScope,previousSpeaker.npcOwner]) : previousSpeaker;
            const signature=`${revision}:${settings.chatEffects}:${previousKey}:${source}`;
            if(old?.signature===signature && old.root.parentNode===host)continue;
            const original=old?.root.parentNode===host?old.original:[...host.childNodes];
            const root=element('div','trpg-chat');root.classList.toggle('trpg-effects',Boolean(settings.chatEffects));
            renderStoryBlocks(root, blocks, lookup, message.name, open, imageFor, previousSpeaker);
            mounted.set(host,{root,original,signature});host.replaceChildren(root);
        }
    }
    function schedule(){clearTimeout(timer);timer=setTimeout(render,90);}
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
    const context=api.context();for(const event of ['CHAT_CHANGED','CHARACTER_MESSAGE_RENDERED','MESSAGE_SWIPED','MESSAGE_DELETED','GENERATION_ENDED']){
        const type=(context.eventTypes||context.event_types)?.[event];if(type)context.eventSource?.on(type,observe);
    }
    observe();
    return {refresh(){revision++;clearPortraits();schedule();},reset(){currentChat='';observe();},destroy(){clearTimeout(timer);observer.disconnect();clearPortraits();for(const [host,entry]of mounted)restore(host,entry);}};
}
