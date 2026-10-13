import {uiText} from './ui-language.js?v=0.68.4';
import {element} from './npc-chat.js?v=0.68.4';

const enabledByDefault = item => item.enabled !== false;
const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();

// Selection belongs to the current list, never to saved NPC/Lore data. Changing
// the search or state filter clears it; changing pages deliberately keeps it.
export function createArchiveBrowser({isEnabled=enabledByDefault, searchText=item=>item.name, normalizeQuery=normalize, pageSize=20}={}) {
    let query='', filter='all', page=0, selecting=false;
    const selected=new Set();
    const clear=()=>selected.clear();
    return {
        get selecting(){return selecting;},
        get filter(){return filter;},
        get query(){return query;},
        reset(){query='';filter='all';page=0;selecting=false;clear();},
        setQuery(value){const next=normalizeQuery(value);if(next!==query){query=next;page=0;clear();}},
        setFilter(value){if(['all','enabled','disabled'].includes(value)&&value!==filter){filter=value;page=0;clear();}},
        setPage(value){page=Math.max(0,Math.floor(Number(value)||0));},
        setSelecting(value){selecting=Boolean(value);if(!selecting)clear();},
        select(id,value){if(value)selected.add(id);else selected.delete(id);},
        selectMany(items){for(const item of items)selected.add(item.id);},
        clear,
        has:id=>selected.has(id),
        view(all){
            const ids=new Set(all.map(item=>item.id));
            for(const id of selected)if(!ids.has(id))selected.delete(id);
            const matched=query?all.filter(item=>normalizeQuery(searchText(item)).includes(query)):all;
            const enabled=matched.filter(isEnabled).length;
            const filtered=matched.filter(item=>filter==='all'||isEnabled(item)===(filter==='enabled'));
            const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages-1);
            return {matched,filtered,items:filtered.slice(page*pageSize,(page+1)*pageSize),page,pages,
                counts:{all:matched.length,enabled,disabled:matched.length-enabled},selected:[...selected]};
        },
    };
}

// Only the enabled field changes. The receipt lets Undo restore these fields
// without overwriting newer biography, keywords, portraits or alternate forms.
export function changeArchiveEnabled(all,ids,enabled,isEnabled=enabledByDefault) {
    const targets=new Set(ids),changes=[];
    const entries=all.map(item=>{
        if(!targets.has(item.id)||isEnabled(item)===enabled)return item;
        changes.push({id:item.id,before:isEnabled(item),after:enabled});
        return {...item,enabled};
    });
    return {entries,changes};
}

export function undoArchiveEnabled(all,receipt,isEnabled=enabledByDefault) {
    const targets=new Map(receipt.map(change=>[change.id,change])),changes=[];
    const entries=all.map(item=>{
        const previous=targets.get(item.id);
        if(!previous||isEnabled(item)!==previous.after)return item;
        changes.push({id:item.id,before:previous.after,after:previous.before});
        return {...item,enabled:previous.before};
    });
    return {entries,changes};
}

export function archiveStateText(enabled){return uiText(enabled?'Enabled entries':'Disabled entries');}

export function removeArchiveEntries(all,ids) {
    const targets=new Set(ids),entries=[],removed=[];
    for(const item of all)(targets.has(item.id)?removed:entries).push(item);
    return {entries,removed};
}

export function createArchiveTools(browser,{refresh,change,undo,remove,pager=element('div','trpg-pagination')}={}) {
    const root=element('div','trpg-archive-tools');
    const filters=element('div','trpg-archive-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label',uiText('Filter by enabled state'));
    let current=null,blocked=false,undoInMenu=false;
    function button(label,key,action){const node=element('button','',uiText(label));node.type='button';node.setAttribute(`data-archive-${key}`,'');node.addEventListener('click',()=>{if(!blocked)return action();});return node;}
    const filterButtons=new Map();
    for(const [value,label]of [['all','All entries'],['enabled','Enabled entries'],['disabled','Disabled entries']]){
        const node=button(label,'filter',()=>{browser.setFilter(value);refresh({resetScroll:true});});node.setAttribute('data-archive-filter',value);filterButtons.set(value,node);filters.append(node);
    }
    const mode=button('Archive select action','select-mode',()=>{browser.setSelecting(!browser.selecting);refresh();});
    root.append(filters);
    const dock=element('div','trpg-archive-dock'),navigation=element('div','trpg-archive-dock-nav');
    const undoButton=button('Archive undo action','undo',()=>undo());undoButton.setAttribute('aria-label',uiText('Undo last change'));
    dock.append(navigation);
    const batch=element('div','trpg-archive-batch'),menu=element('details','trpg-archive-selection-menu'),summary=element('summary','', '⋯'),choices=element('div','trpg-archive-selection-tools'),count=element('strong','trpg-archive-selected-count');
    summary.setAttribute('data-archive-selection-menu','');summary.setAttribute('aria-label',uiText('Selection options'));summary.title=uiText('Selection options');menu.append(summary,choices);
    navigation.append(pager,undoButton,count,mode);
    count.setAttribute('aria-live','polite');
    const finishChoice=()=>{menu.open=false;refresh();summary.focus();};
    const selectPage=button('Select this page','select-page',()=>{browser.selectMany(current.items);finishChoice();});
    const selectResults=button('Select all results','select-results',()=>{browser.selectMany(current.filtered);finishChoice();});
    const clear=button('Clear selection','clear',()=>{browser.clear();finishChoice();});choices.append(selectPage,selectResults,clear);
    const deleteButton=button('Archive delete action','delete',()=>remove?.([...current.selected]));deleteButton.className='trpg-danger';deleteButton.hidden=typeof remove!=='function';choices.append(deleteButton);
    menu.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopPropagation();menu.open=false;summary.focus();}});
    dock.addEventListener('focusout',event=>{if(!menu.contains?.(event.relatedTarget))menu.open=false;});
    const actions=element('div','trpg-archive-batch-actions');
    const enable=button('Enable selected','enable',()=>change(current.selected,true));
    const disable=button('Disable selected','disable',()=>change(current.selected,false));actions.append(enable,disable,menu);
    batch.append(actions);dock.append(batch);
    const hint=element('small','trpg-archive-selection-hint',uiText('Selection stays across pages. Changing search or filter clears it.'));choices.append(hint);
    function update(view,{busy=false,canUndo=false}={}){
        current=view;blocked=busy;root.setAttribute('aria-busy',String(busy));dock.setAttribute('aria-busy',String(busy));
        for(const [value,node]of filterButtons){node.textContent=`${uiText(value==='all'?'All entries':value==='enabled'?'Enabled entries':'Disabled entries')} · ${view.counts[value]}`;node.setAttribute('aria-pressed',String(value===browser.filter));node.disabled=busy;}
        mode.textContent=uiText(browser.selecting?'Archive done action':'Archive select action');mode.setAttribute('aria-label',uiText(browser.selecting?'Done selecting':'Select multiple'));mode.setAttribute('aria-pressed',String(browser.selecting));mode.disabled=busy;batch.hidden=!browser.selecting;
        if(!browser.selecting||busy)menu.open=false;
        count.hidden=!browser.selecting;
        if(browser.selecting&&!undoInMenu){choices.append(undoButton);undoInMenu=true;}else if(!browser.selecting&&undoInMenu){navigation.insertBefore(undoButton,count);undoInMenu=false;}
        count.textContent=uiText('{0} selected',[view.selected.length]);
        selectPage.textContent=uiText('Select this page · {0}',[view.items.length]);selectPage.disabled=busy||!view.items.length;
        selectResults.textContent=uiText('Select all {0} results (all pages)',[view.filtered.length]);selectResults.disabled=busy||!view.filtered.length;
        clear.disabled=busy||!view.selected.length;enable.disabled=disable.disabled=deleteButton.disabled=busy||!view.selected.length;
        undoButton.hidden=!canUndo;undoButton.disabled=busy;
    }
    return {root,dock,update};
}

// Secondary tools live in a sheet instead of taking space from the list. All
// nodes belong to this manager; nothing in the SillyTavern chat DOM is moved.
export function createArchiveOptions(dialog,trigger) {
    const root=element('div','trpg-archive-options');root.hidden=true;root.setAttribute('data-archive-menu','');
    const sheet=element('section','trpg-archive-options-sheet');sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','trpg-archive-options-title');
    const heading=element('header'),title=element('h3','',uiText('Archive management tools')),closeButton=element('button','', '×');title.id='trpg-archive-options-title';closeButton.type='button';closeButton.setAttribute('data-archive-menu-close','');closeButton.setAttribute('aria-label',uiText('Close management tools'));
    const body=element('div','trpg-archive-options-body'),npc=element('div'),lore=element('div'),status=element('p','trpg-archive-options-status');status.setAttribute('aria-live','polite');body.append(npc,lore);heading.append(title,closeButton);sheet.append(heading,body,status);root.append(sheet);dialog.append(root);
    let opener=null,blocked=false;
    const background=()=>[...dialog.children].filter(node=>node!==root);
    function close({restoreFocus=true,force=false}={}){
        if(blocked&&!force)return;
        root.hidden=true;trigger.setAttribute('aria-expanded','false');for(const node of background())node.inert=false;
        if(force)setBusy(false);
        if(restoreFocus&&opener?.isConnected)opener.focus({preventScroll:true});
    }
    function open(){if(blocked)return;opener=document.activeElement;root.hidden=false;status.textContent='';trigger.setAttribute('aria-expanded','true');for(const node of background())node.inert=true;closeButton.focus({preventScroll:true});}
    function setBusy(value){blocked=value;body.inert=value;closeButton.disabled=value;trigger.disabled=value;}
    trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','dialog');
    trigger.addEventListener('click',()=>root.hidden?open():close());closeButton.addEventListener('click',()=>close());root.addEventListener('click',event=>{if(event.target===root)close();});
    dialog.addEventListener('keydown',event=>{
        if(root.hidden)return;
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
        if(event.key!=='Tab')return;
        const focusable=[...sheet.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(node=>node.getClientRects().length&&!node.closest('[inert]'));
        if(!focusable.length){event.preventDefault();return;}
        const index=focusable.indexOf(document.activeElement);
        if(index<0||!event.shiftKey&&index===focusable.length-1||event.shiftKey&&index===0){event.preventDefault();focusable[event.shiftKey?focusable.length-1:0].focus();}
    });
    return {root,npc,lore,open,close,setBusy,get isOpen(){return !root.hidden;},setTab(tab){npc.hidden=tab!=='npc';lore.hidden=tab!=='lore';},say(message){status.textContent=root.hidden?'':message;}};
}
