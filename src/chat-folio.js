import {usable,keyName} from './npc-core.js?v=0.66.0';
const fact=value=>typeof value==='string'&&usable(value);

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
    const copy=doc.createElement('span');copy.className='trpg-dialogue-copy';body.append(copy);return body;
}
