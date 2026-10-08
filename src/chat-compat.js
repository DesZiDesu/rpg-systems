// Compose with the host's already formatted DOM. Never run regex per block or
// recreate another extension's card with innerHTML/clones.
import {parseUserMessage} from './user-chat.js?v=0.61.0';
import {cleanChatProse} from './foreign-chat.js?v=0.61.0';
export function chatPresentationMode(settings = {}) {
    return ['shared','native','roleforge'].includes(settings.chatRegexMode)
        ? settings.chatRegexMode : settings.preserveNativeChat === true ? 'native' : 'shared';
}

const escapeAttribute = value => String(value ?? '').replace(/[&<>"']/g, mark => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[mark]));
const storyName = attrs => {
    const found = attrs.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    return (found?.[1] ?? found?.[2] ?? found?.[3] ?? '').slice(0,120);
};

// Called AFTER regex and Markdown, BEFORE the host sanitizer. Neutral, standard
// spans keep protocol boundaries through DOMPurify; all model/regex HTML still
// passes through the host's sanitizer, with no relaxed sanitizer configuration.
export function annotateStoryHtml(html, doc = globalThis.document) {
    if (typeof html !== 'string' || html.length > 1000000 || !/(?:<|&lt;)tr-(?:header|narrative|dialogue)\b/i.test(html)) return html;
    let active = false;
    const decode = text => {
        if (!doc || !text.includes('&')) return text;
        const area = doc.createElement('textarea');area.innerHTML = text;return area.value;
    };
    // Literal examples/code/styles belong to the host, including escaped tags.
    const protectedOrTag = /<(pre|code|style|custom-style|script)\b[^>]*>[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->|<\/?[\w:-]+\b(?:[^"'<>]|"[^"]*"|'[^']*')*>|&lt;\/?tr-(?:header|narrative|dialogue)\b[\s\S]*?&gt;/gi;
    let output = html.replace(protectedOrTag, (whole, protectedTag) => {
        if (protectedTag) return whole;
        const tag=/^<(\/?)(?:tr-)(header|narrative|dialogue)\b([\s\S]*?)>$/i.exec(whole)
            || /^&lt;(\/?)(?:tr-)(header|narrative|dialogue)\b([\s\S]*?)&gt;$/i.exec(whole);
        if(!tag)return whole;
        const [,close,type,attributes]=tag,kind=type.toLowerCase();
        const attrs=whole.startsWith('&lt;')?decode(attributes.replace(/<\/?q\b[^>]*>/gi,'')):attributes;
        if (close) { if (kind === 'header' || !active) return '';active = false;return '</span>'; }
        const end = active ? '</span>' : '';active = kind !== 'header';
        const marker = `<span data-roleforge-story="${kind}" data-roleforge-name="${escapeAttribute(decode(storyName(attrs)))}">`;
        return end + marker + (active ? '' : '</span>');
    });
    if (active) output += '</span>';
    return output;
}

const formattingHooks = new WeakMap();
function userFormattedBlocks(source) {
    const protectedHtml=[];
    const neutral=String(source).replace(/<(pre|code|style|script|table)\b[^>]*>[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->|<\/?[\w:-]+\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi,html=>{
        const index=protectedHtml.push(html)-1;return `\uE000${index}\uE001`;
    });
    return parseUserMessage({is_user:true,mes:neutral})?.map(block=>({...block,text:block.text.replace(/\uE000(\d+)\uE001/g,(_,index)=>protectedHtml[index])}));
}
export function annotateUserHtml(html,blocks,doc=globalThis.document) {
    if(!blocks||!doc||html.length>1000000)return html;
    const template=doc.createElement('template');template.innerHTML=html;
    const forbidden='pre,code,style,script,custom-style,table,[data-roleforge-story]';
    const textFor=block=>{const copy=doc.createElement('template');copy.innerHTML=block.text.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g,(_,bold,em)=>bold??em);return compact(copy.content.textContent);};
    for(const block of blocks){
        if(!['dialogue','narrative','thought'].includes(block.type))continue;
        const marker=doc.createElement('span');marker.dataset.roleforgeStory=block.type;
        if(block.type==='thought'){
            const walker=doc.createTreeWalker(template.content,4,{acceptNode:node=>node.parentElement?.closest(forbidden)?2:1});let text;
            while((text=walker.nextNode())){
                const index=text.data.indexOf(`|${block.text}|`);if(index<0)continue;
                const piece=text.splitText(index);piece.splitText(block.text.length+2);piece.before(marker);marker.append(piece);break;
            }
        }else{
            const tag=block.type==='dialogue'?'q':'em',expected=textFor(block);
            const target=[...template.content.querySelectorAll(tag)].find(node=>!node.closest(forbidden)
                && compact(node.textContent.replace(/^["“]|["”]$/g,''))===expected);
            if(target){target.before(marker);marker.append(target);}
        }
    }
    return template.innerHTML;
}
export function installChatFormattingHooks(api) {
    const formatter = api.context().messageFormatter;
    if (typeof formatter?.addHook !== 'function') return () => {};
    let record = formattingHooks.get(formatter);
    if(record){record.api=api;return ()=>{if(record.api===api)record.api=null;};}
    record={api,userBlocks:new WeakMap(),reasoning:new WeakMap()};formattingHooks.set(formatter,record);
    const assistant = meta => !meta.isUser && !meta.isSystem && !meta.isReasoning;
    const clean = (text, meta) => {
        if (!record.api || !assistant(meta)) return text;
        // Give display Regex the original reasoning tags. Strip only our own
        // transport here; unhandled reasoning is removed AFTER Regex below.
        const output = record.api.transport ? record.api.transport(text) : text;
        const message = record.api.context().chat?.[meta.messageId];
        if (message) record.reasoning.set(message, {source:output,formatted:false});
        return output;
    };
    const userBlocks=(text,meta)=>{
        const message=record.api?.context().chat?.[meta.messageId];
        if(message&&meta.isUser&&!meta.isSystem&&!meta.isReasoning&&parseUserMessage(message))record.userBlocks.set(message,userFormattedBlocks(text));
        if (record.api && assistant(meta)) {
            const visible = cleanChatProse(text, record.api.reasoning || record.api.visible);
            const prior = message && record.reasoning.get(message);
            if (prior) {
                // A registered Regex can deliberately render a thinking box.
                // Such host HTML belongs to Regex; do not scrub its text later.
                prior.formatted = visible !== prior.source && [...prior.source.matchAll(/<(think|thinking|analysis|reasoning|planning)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)]
                    .some(match => match[2].trim() && visible.includes(match[2].trim()));
            }
            return visible;
        }
        return text;
    };
    const annotate = (html, meta) => {
        if(!record.api||meta.isSystem||meta.isReasoning||chatPresentationMode(record.api.settings())!=='shared')return html;
        if(meta.isUser)return record.api.settings().userChatPresentation?annotateUserHtml(html,record.userBlocks.get(record.api.context().chat?.[meta.messageId])):html;
        return record.api.settings().chatPresentation?annotateStoryHtml(html):html;
    };
    // Read-only cleanup never changes the stored message or runs Regex twice.
    formatter.addHook(clean, {stage:formatter.stage?.BEFORE_REGEX || 'beforeRegex',order:formatter.order?.EARLY ?? 10});
    formatter.addHook(userBlocks, {stage:formatter.stage?.AFTER_REGEX || 'afterRegex',order:formatter.order?.LATEST ?? 100});
    formatter.addHook(annotate, {stage:formatter.stage?.AFTER_MARKDOWN || 'afterMarkdown',order:formatter.order?.LATEST ?? 100});
    // Current SillyTavern has addHook but no removeHook. Register once per
    // singleton and release the API reference on destroy; inactive hooks pass
    // through unchanged and a new workspace reuses the same registrations.
    return () => {if(record.api===api)record.api=null;};
}

export function formattedReasoning(context, message) {
    return Boolean(formattingHooks.get(context.messageFormatter)?.reasoning.get(message)?.formatted);
}

// Frontend documents and their live renderer containers are opaque. Atomic
// browser moves can preserve an iframe but still violate a Vue/Helper owner's
// lifecycle, so never wrap or reparent these subtrees in any browser.
const frontendSelector = 'iframe,.TH-render,[data-roleforge-opaque]';
export function foreignFrontend(nodes) {
    return nodes.some(root => root.nodeType === 1 && (
        root.matches(frontendSelector) || root.querySelector(frontendSelector)
        || [root,...root.querySelectorAll('pre')].some(node => node.tagName === 'PRE'
            && /<!doctype\s+html|<html\b|<head\b/i.test(node.textContent))));
}
export function nativeDisplayPresent(nodes) {
    const shown = element => {
        for(let node=element;node;node=node.parentElement){
            if(node.matches('style,script,custom-style,template')||node.hidden||node.classList.contains('hidden!')
                ||node.style.display==='none'||node.style.visibility==='hidden')return false;
            if(node.id==='chat')break;
        }
        return true;
    };
    return nodes.some(root => {
        if(root.nodeType===3)return Boolean(root.textContent.trim())&&shown(root.parentElement);
        if(root.nodeType!==1||!shown(root))return false;
        if(root.shadowRoot||[root,...root.querySelectorAll('iframe,img,video,audio,canvas,input,button,hr,svg')]
            .some(node=>node.matches('iframe,img,video,audio,canvas,input,button,hr,svg')&&shown(node)))return true;
        const walker=root.ownerDocument.createTreeWalker(root,4);let text;
        while((text=walker.nextNode()))if(text.textContent.trim()&&shown(text.parentElement))return true;
        return false;
    });
}
export function relinquishPresentation(root) {
    // A foreign renderer can adopt an already mounted block later. Do not
    // unwrap/reparent its live subtree even when changing presentation modes.
    root.querySelectorAll('[data-roleforge-control]').forEach(node=>{
        if(!foreignFrontend([node]))node.remove();
    });
    delete root.dataset.roleforgeMount;root.dataset.roleforgeOpaque='true';
}

// Tavern Helper renders an HTML snapshot, which copies markup but not event
// listeners. Remove cloned RoleForge controls, retaining only the native story
// content, then mount fresh controls on the visible streaming surface.
export function releaseClonedPresentation(host) {
    host.querySelectorAll('[data-roleforge-control]').forEach(node=>{if(!foreignFrontend([node]))node.remove();});
    for (const root of [...host.querySelectorAll('[data-roleforge-mount]')]) {
        if (!host.contains(root)) continue;
        if(foreignFrontend([root])||root.closest('.TH-render')){relinquishPresentation(root);continue;}
        const contents = [...root.querySelectorAll('[data-roleforge-native-content]')];
        for (const content of contents) for (const node of [...content.childNodes]) root.before(node);
        root.remove();
    }
}

const compact = text => String(text ?? '').replace(/\s+/g,'');
const markerKind = node => node.dataset?.roleforgeStory || (/^TR-(HEADER|NARRATIVE|DIALOGUE)$/.test(node.tagName) ? node.tagName.slice(3).toLowerCase() : '');
const markerName = node => node.dataset?.roleforgeName ?? node.getAttribute('name') ?? '';
function protocolNodes(nodes) {
    const result = [];
    for (const root of nodes) {
        if (root.nodeType !== 1) continue;
        for (const node of [root,...root.querySelectorAll('[data-roleforge-story],tr-header,tr-narrative,tr-dialogue')]) {
            if (markerKind(node) && !node.closest('pre,code,style,script,custom-style,.TH-render,[data-roleforge-opaque]') && !foreignFrontend([node])) result.push(node);
        }
    }
    return result;
}

function trimPlayerDelimiters(target,type,doc){
    if(!['dialogue','thought'].includes(type))return [];
    const walker=doc.createTreeWalker(target,4),nodes=[];let node;while((node=walker.nextNode()))if(node.data)nodes.push(node);
    const first=nodes[0],last=nodes.at(-1);if(!first||!last)return [];
    const opener=type==='thought'?/[|]/:/["“]/,closer=type==='thought'?/[|]/:/["”]/;
    const edits=new Map();
    const change=(text,value)=>{if(!edits.has(text))edits.set(text,{node:text,before:text.data});text.data=value;edits.get(text).after=value;};
    if(opener.test(first.data[0]))change(first,first.data.slice(1));
    if(closer.test(last.data.at(-1)))change(last,last.data.slice(0,-1));
    return [...edits.values()];
}

function statefulNative(node,doc){
    return node.contains(doc.activeElement)||node.matches?.('iframe,audio,video,canvas,svg')||Boolean(node.querySelector?.('iframe,audio,video,canvas,svg'));
}
function moveNative(parent,node,before=null){
    // Atomic moves preserve iframe documents, focus, media and animations in
    // supporting browsers. Ordinary nodes can fall back to insertBefore.
    if(typeof parent.moveBefore==='function'&&parent.isConnected&&node.isConnected){parent.moveBefore(node,before);return;}
    parent.insertBefore(node,before);
}

// Old hosts sanitize the custom protocol away. Match only ordinary, unchanged
// paragraphs; never partition an unknown widget/table/iframe by guessing at its
// text, and never extract a partial subtree (which would clone bound elements).
function paragraphTargets(nodes, blocks, textFor) {
    const allowed = new Set(['DIV','P','SPAN','BR','STRONG','EM','Q','B','I']);
    const candidates = [];
    for (const root of nodes) {
        if (root.nodeType === 3) { if (root.textContent.trim()) return null;continue; }
        if (root.nodeType !== 1) continue;
        for (const node of [root,...root.querySelectorAll('*')]) {
            if (!allowed.has(node.tagName) || [...node.attributes].some(attr => !['dir','class'].includes(attr.name)
                || attr.name === 'class' && !/^(?:markdown|mes_markdown)?$/.test(attr.value))) return null;
            candidates.push(node);
        }
    }
    const targets = [];let previous = null;
    for (const block of blocks) {
        if (block.type === 'header' || !block.text?.trim()) {targets.push(null);continue;}
        const expected = compact(textFor(block));
        const target = candidates.find(node => compact(node.textContent) === expected
            && (!previous || previous.compareDocumentPosition(node) & 4)
            && !targets.some(old => old && (old.contains(node) || node.contains(old))));
        if (!target) return null;
        targets.push(target);previous = target;
    }
    return targets;
}

export function mountSharedStory({host,nodes,blocks,header,narrative,textFor,fallbackName,previousSpeaker,voiceEnabled,language,user,document:doc=globalThis.document}) {
    const roots = [], wrappers = [], targets = Array(blocks.length).fill(null), voiceBlocks = blocks.map(block => ({...block}));
    const create = (tag,cls,text) => {const node=doc.createElement(tag);node.className=cls;if(cls.includes('trpg-chat'))node.dataset.roleforgeMount='shared';if(text!==undefined)node.textContent=text;return node;};
    const markers = protocolNodes(nodes);
    const boundaries=markers.map(node=>({node,kind:markerKind(node),name:markerName(node)}));
    const paragraphs = markers.length ? null : paragraphTargets(nodes,blocks,textFor);
    let markerCursor = 0, speaker = previousSpeaker, currentName = fallbackName;
    const addHeader = (name,before) => {
        name ||= fallbackName || 'NPC';currentName = name;
        const rendered = header(name,speaker);speaker = rendered.key;
        if (!rendered.node) return;
        const root=create('div','trpg-chat rf-shared-header');root.append(rendered.node);
        const anchor=before?.parentNode ? before : nodes.find(node=>node.parentNode===host)||host.firstChild;
        (anchor?.parentNode || host).insertBefore(root,anchor);
        roots.push(root);
    };
    for (const [index,block] of blocks.entries()) {
        let target = paragraphs?.[index];
        if (markers.length && block.type !== 'plain') {
            const found = markers.slice(markerCursor).findIndex(node => markerKind(node) === block.type);
            if (found >= 0) {markerCursor += found;target = markers[markerCursor++];}
        }
        const nativeName=target?markerName(target):'';
        if (block.type === 'header') {if(!user)addHeader(nativeName || block.name,target || nodes[0]);continue;}
        if (block.type === 'dialogue'&&!user) {
            const name=nativeName || block.name || currentName || fallbackName;
            // A dialogue can start a speaker without an explicit header.
            addHeader(name,target || nodes[0]);
        }
        if (!target || !['narrative','dialogue','plain','thought'].includes(block.type)) continue;
        if(typeof doc.documentElement.moveBefore!=='function'&&statefulNative(target,doc))continue;
        const shell=user?user.render([{...block,text:''}]):create('div','trpg-chat rf-shared-block');
        shell.dataset.roleforgeMount='shared';
        shell.classList.add('rf-shared-block');shell.querySelector('.trpg-user-header')?.remove();
        const body=user?shell.querySelector(block.type==='thought'?'.trpg-user-thought':`.trpg-${block.type}`):block.type === 'narrative' ? narrative('') : create('div',block.type === 'dialogue' ? 'trpg-dialogue' : 'trpg-plain');
        if(!body)continue;
        let content=block.type === 'narrative' ? body.querySelector('.trpg-prose-copy') : block.type==='thought'?body.querySelector('p'):body;
        if(block.type === 'narrative'){const copy=create('div','trpg-prose-copy');content.replaceWith(copy);content=copy;}
        content.dataset.roleforgeNativeContent='';
        const name=nativeName || block.name || currentName || fallbackName;
        if(!user){const rendered=header(name,speaker,true);shell.style.setProperty('--speaker',rendered.color);shell.append(body);}
        const textEdits=user?trimPlayerDelimiters(target,block.type,doc):[];
        const ownedBodyChildren=new Set(body.childNodes),nativeText=target.textContent;
        target.before(shell);moveNative(content,target);roots.push(shell);wrappers.push({shell,body,content,target,ownedBodyChildren,nativeText,textEdits});targets[index]=body;
        // Host-processed speech may change words. Read prose only, excluding
        // interactive/widget UI labels, and keep the raw story as a fallback.
        if (markers.length) {
            const walker=doc.createTreeWalker(target,4,{acceptNode:node=>node.parentElement?.closest('button,input,textarea,select,summary,style,script,pre,code,[aria-hidden="true"]') ? 2 : 1});
            let node,parts=[];while((node=walker.nextNode()))parts.push(node.textContent);
            const spoken=parts.join('').trim();if(spoken)voiceBlocks[index].text=spoken;
            voiceBlocks[index].name=markerName(target) || block.name;
        }
    }
    if(user){const root=user.render([]),anchor=nodes.find(node=>node.parentNode===host)||host.firstChild;root.dataset.roleforgeMount='user';host.insertBefore(root,anchor);roots.push(root);}
    // A whole-message regex may remove all story boundaries. Keep its exact
    // card in place; expose Voice for the original structured blocks separately
    // without duplicating the story or inferring new gameplay data.
    let voiceRoot = null;
    const missing = blocks.map((block,index)=>({block,index})).filter(({block,index})=>['dialogue','narrative'].includes(block.type)&&!targets[index]&&block.text?.trim());
    if (voiceEnabled && missing.length) {
        voiceRoot=create('details','trpg-chat rf-native-speech');
        voiceRoot.append(create('summary','',language === 'th' ? 'บทพากย์ RoleForge' : 'RoleForge speech'));
        const list=create('div','rf-native-speech-list');voiceRoot.append(list);
        for (const {block,index} of missing) {
            const target=create('div','rf-native-voice-target');
            target.append(create('small','',block.type === 'narrative' ? (language === 'th' ? 'ผู้บรรยาย' : 'Narrator') : block.name || fallbackName || 'NPC'));
            list.append(target);targets[index]=target;
        }
        host.append(voiceRoot);roots.push(voiceRoot);
    }
    return {roots,targets,voiceBlocks,voiceRoot,native:nodes,
        valid:()=>nodes.every(node=>host.contains(node))&&boundaries.every(({node,kind,name})=>host.contains(node)&&markerKind(node)===kind&&markerName(node)===name)
            &&wrappers.every(({shell,target,nativeText})=>host.contains(shell)&&shell.contains(target)&&target.textContent===nativeText)&&roots.every(root=>host.contains(root)),
        restore(){
            // Unwrap only our shells. Keep original nodes, bound listeners and
            // any foreign nodes added inside the content after our mount.
            for (const {shell,body,content,ownedBodyChildren,textEdits} of wrappers) if (host.contains(shell)) {
                if(foreignFrontend([shell])||shell.closest('.TH-render')){relinquishPresentation(shell);continue;}
                for(const {node,before,after} of textEdits)if(node.data===after)node.data=before;
                const native=[...content.childNodes];
                const addedBody=[...body.childNodes].filter(node=>!ownedBodyChildren.has(node)&&node!==content&&!native.includes(node));
                const added=[...shell.childNodes].filter(node=>node!==body);
                for(const node of [...native,...addedBody,...added])moveNative(shell.parentNode,node,shell);
                shell.remove();
            }
            for (const root of roots) if(root.isConnected){if(foreignFrontend([root])||root.closest('.TH-render'))relinquishPresentation(root);else root.remove();}
        },
    };
}

// Hosts without formatter hooks may have already flattened private envelopes
// into a styled card. Delete only the known private text, in existing Text nodes;
// never replace the card, clone controls, or expose raw model HTML as trusted UI.
export function scrubNativePrivateText(nodes, raw, visible, doc=globalThis.document) {
    if (raw===visible || raw.length>1000000) return;
    const removed=[];
    for (const match of raw.matchAll(/<(think|thinking|analysis|reasoning|planning)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>|\[(think|thinking|analysis|reasoning|planning)\]([\s\S]*?)\[\/\3\]/gi)) {
        removed.push(match[0],match[2]??match[4]);
    }
    const preamble=/(?:^|\n)\s*(?:\{\s*CoT\s*\}|S1\s*[·:.\-]\s*INGEST\b)[\s\S]*?(?=<tr-(?:header|narrative|dialogue)\b)/iu.exec(raw);
    if(preamble)removed.push(preamble[0]);
    for (const root of nodes) if(root.nodeType===1){
        for(const node of [root,...root.querySelectorAll('think,thinking,analysis,reasoning,planning')]) {
            if(/^(THINK|THINKING|ANALYSIS|REASONING|PLANNING)$/.test(node.tagName)&&!node.closest('pre,code'))node.remove();
        }
    }
    for(const needle of removed.filter(value=>compact(value).length>=8)){
        const textNodes=[];
        for(const root of nodes){
            if(root.nodeType===3)textNodes.push(root);
            else if(root.nodeType===1){const walker=doc.createTreeWalker(root,4,{acceptNode:node=>node.parentElement?.closest('pre,code,style,script,custom-style,.TH-render')?2:1});let node;while((node=walker.nextNode()))textNodes.push(node);}
        }
        const segments=textNodes.map(node=>({node,text:compact(node.data)})),joined=segments.map(part=>part.text).join('');
        const search=compact(needle),start=joined.indexOf(search),end=start+search.length;
        if(start<0)continue;
        let cursor=0;
        for(const {node,text} of segments){
            const stop=cursor+text.length;
            if(stop>start&&cursor<end){
                const from=Math.max(0,start-cursor),through=Math.min(text.length,end-cursor);
                let count=0,a=-1,b=node.data.length;
                for(let offset=0;offset<node.data.length;offset++)if(!/\s/.test(node.data[offset])){if(count===from)a=offset;if(++count===through){b=offset+1;break;}}
                if(a>=0)node.deleteData(a,b-a);
            }
            cursor=stop;if(cursor>=end)break;
        }
    }
}
