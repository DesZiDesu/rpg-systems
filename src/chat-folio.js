import {usable,keyName} from './npc-core.js?v=0.68.1';
const fact=value=>typeof value==='string'&&usable(value);
export const illustratedChatTheme=theme=>['chapter','codex','aincrad'].includes(theme);

const designPaths={book:'M3 4.5c3.5-1 6.5-.5 9 1.5 2.5-2 5.5-2.5 9-1.5v15c-3.5-1-6.5-.5-9 1.5-2.5-2-5.5-2.5-9-1.5zM12 6v15M6 8h3m-3 4h3m6-4h3m-3 4h3',pen:'M3 21 15 9M7 17C4 8 10 3 21 3c0 9-5 14-14 14ZM11 13h6M14 9h5',chevron:'m9 5 7 7-7 7'};
export function chatDesignIcon(key,doc=globalThis.document){
    const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','trpg-design-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',designPaths[key]||designPaths.book);svg.append(path);return svg;
}

// No invented health maximum: HP is a number, not a percentage gauge.
export function npcHeaderVitals(profile={},appearance={}) {
    if(appearance.npcVitals===false)return [];
    return [['hp','HP'],['level','Lv']].flatMap(([key,label])=>{
        const raw=profile.stats?.[key];
        if(!(typeof raw==='number'||typeof raw==='string'&&raw.trim()!==''))return [];
        const value=Number(raw);return Number.isFinite(value)&&value>=0?[{key,label,value}]:[];
    });
}

// Read existing NPC facts only. Overall rank is not a skill's mastery level.
export function headerBadge(profile={},appearance={}) {
    if(appearance.badgeMode==='off')return null;
    if(appearance.badgeMode==='ability'){
        const selected=keyName(appearance.badgeAbility||'');if(!selected)return null;
        const abilities=Array.isArray(profile.abilities)?profile.abilities:[];
        const exact=abilities.filter(item=>item&&keyName(item.name)===selected);
        const matches=exact.length?exact:abilities.filter(item=>item&&keyName(item.category)===selected);
        // Ambiguous categories need an explicit ability name, rather than a guess.
        if(matches.length!==1||!fact(matches[0].name))return null;
        return {label:matches[0].name,level:fact(matches[0].level)?matches[0].level:''};
    }
    if(!fact(profile.occupation))return null;
    const rank=profile.stats?.rank;
    return {label:profile.occupation,level:fact(rank)&&keyName(rank)!=='unranked'?rank:''};
}

// Only owned presentation nodes are added. Saved story/Regex text stays intact.
export function dialogueFrame(name,appearance={},doc=globalThis.document) {
    const body=doc.createElement('div');body.className=`trpg-dialogue${appearance.dialogue===false?' trpg-unframed':''}`;
    if(appearance.theme==='folio'&&appearance.dialogue!==false){
        const label=doc.createElement('span');label.className='trpg-dialogue-label';label.textContent=name||'NPC';label.setAttribute('aria-hidden','true');body.append(label);
    }
    if(illustratedChatTheme(appearance.theme)&&appearance.dialogue!==false){
        const top=doc.createElement('span');top.className='trpg-speech-top';top.setAttribute('aria-hidden','true');
        const book=chatDesignIcon('book',doc);
        const label=doc.createElement('span');label.className='trpg-dialogue-label';label.textContent=name||'NPC';top.append(book,label);body.append(top);
    }
    const copy=doc.createElement('span');copy.className='trpg-dialogue-copy';body.append(copy);return body;
}
