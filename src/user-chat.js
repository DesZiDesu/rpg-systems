import {normalizeChatAppearance,applyChatTheme} from './chat-themes.js?v=0.64.0';
// This shorthand is a player display convention, never an assistant protocol.
const escaped=(source,index)=>{let slashes=0;while(index>0&&source[--index]==='\\')slashes++;return slashes%2===1;};
function richMarkdown(source){
    if(/`|^ {4}\S|^[\t ]*~{3,}|<\/?[a-z!]|\[[^\[\]\n]*\][\t ]*\(|^[\t ]*\[[^\[\]\n]+\]:/imu.test(source))return true;
    return source.split('\n').some(line=>line.includes('|')&&line.trim().split('|').filter(part=>part.trim()).every(part=>/^\s*:?-{3,}:?\s*$/u.test(part)));
}
export function parseUserMessage(message){
    if(message?.is_user!==true||message.is_system||typeof message.mes!=='string')return null;
    const source=message.mes;if(source.length>100000||richMarkdown(source))return null;
    // Exclude both curly delimiters so repeated unmatched openings stay bounded.
    const pattern=/"((?:\\.|[^"\\])+?)"|“((?:\\.|[^“”\\])+?)”|(?<!\*)\*((?:\\.|[^*\\])+?)\*(?!\*)|\|((?:\\.|[^|\\])+?)\|/gu;
    const blocks=[];let cursor=0,part;
    while((part=pattern.exec(source))){
        const mark=part[0][0],before=source[part.index-1]||'',after=source[pattern.lastIndex]||'';
        if(escaped(source,part.index)||/[\p{L}\p{N}_]/u.test(before)||/[\p{L}\p{N}_]/u.test(after)||(mark==='|'&&(before==='|'||after==='|')))continue;
        if(mark==='*'&&(/\s/u.test(part[0][1])||/\s/u.test(part[0].at(-2))))continue;
        const body=(part[1]??part[2]??part[3]??part[4]).replace(/\\(["“”*|\\])/gu,'$1').trim();
        if(!body)continue;
        if(part.index>cursor)blocks.push({type:'plain',text:source.slice(cursor,part.index)});
        blocks.push({type:part[3]!==undefined?'narrative':part[4]!==undefined?'thought':'dialogue',text:body});cursor=pattern.lastIndex;
        if(blocks.length>150)return null;
    }
    if(!blocks.length)return null;
    if(cursor<source.length)blocks.push({type:'plain',text:source.slice(cursor)});
    return blocks;
}

export function renderUserBlocks(blocks,{name='User',language='en',accent='#d6b458',ink='#d6d0c1',narrative,appendText,appearance,document:doc=globalThis.document}={}){
    const node=(tag,cls,text)=>{const result=doc.createElement(tag);result.className=cls;if(text!==undefined)result.textContent=text;return result;};
    const root=node('div','trpg-chat trpg-user-chat');
    const view=normalizeChatAppearance(appearance);applyChatTheme(root,view);
    if(/^#[0-9a-f]{6}$/iu.test(accent))root.style.setProperty('--speaker',`var(--tretaresia-accent, ${accent})`);
    if(/^#[0-9a-f]{6}$/iu.test(ink))root.style.setProperty('--prose',`var(--tretaresia-ink, ${ink})`);
    if(view.header){const header=node('header','trpg-user-header');header.append(node('small','',language==='th'?'ผู้เล่น':'PLAYER'),node('strong','',name));root.append(header);}
    for(const block of blocks){
        if(block.type==='narrative'){
            const prose=narrative(block.text,view.narrative),mark=prose.querySelector?.('.trpg-prose-mark');
            // Keep the player pen visible even if the host's icon font is unavailable.
            if(mark){
                const pen=doc.createElementNS('http://www.w3.org/2000/svg','svg');pen.setAttribute('viewBox','0 0 24 24');pen.setAttribute('aria-hidden','true');pen.setAttribute('fill','none');pen.setAttribute('stroke','currentColor');pen.setAttribute('stroke-width','1.4');pen.setAttribute('stroke-linecap','round');pen.setAttribute('stroke-linejoin','round');
                const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M20 3c-8-1-13 3-14 11l4 1c6-2 9-6 10-12ZM3 21 17 7M7 14l-1 4 4-1');pen.append(path);mark.replaceChildren(pen);
            }
            root.append(prose);continue;
        }
        if(block.type==='thought'){
            const thought=node('aside','trpg-user-thought'),label=language==='th'?'พูดในใจ':'Inner thought';thought.setAttribute('aria-label',label);
            thought.append(node('small','',label),appendText(node('p','',undefined),block.text));root.append(thought);continue;
        }
        if(block.type==='plain'&&!block.text.trim())continue;
        root.append(appendText(node('div',block.type==='dialogue'?`trpg-dialogue${view.dialogue?'':' trpg-unframed'}`:'trpg-plain'),block.text));
    }
    return root;
}
