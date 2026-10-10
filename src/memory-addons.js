import {renderMemorySummaries} from './memory-summary-ui.js?v=0.64.0';

// A separate extension drawer, using the existing memory runtime and library.
export function createMemoryAddons({settings,view,profiles=()=>[],stamp=()=>{},click,submit,change,document:doc=globalThis.document}) {
    let root,drawer,panel,enabled=false;
    function mount() {
        if(root?.isConnected)return true;
        const container=doc.getElementById('extensions_settings2');if(!container)return false;
        root=doc.createElement('div');root.id='roleforge-memory-addons';root.className='extension_container';root.hidden=true;
        root.innerHTML='<details class="rf-memory-addon-drawer inline-drawer"><summary class="rf-memory-addon-header inline-drawer-header"><svg viewBox="0 0 24 24" class="rf-memory-chevron" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg><b>RoleForge Memory Addons</b></summary><div class="rf-memory-addon-content inline-drawer-content" data-memory-addons-panel></div></details>';
        drawer=root.querySelector('details');panel=root.querySelector('[data-memory-addons-panel]');
        if(click)root.addEventListener('click',click);if(submit)root.addEventListener('submit',submit);if(change)root.addEventListener('change',change);
        drawer.addEventListener('toggle',()=>{if(drawer.open&&!root.hidden)render();});
        const main=doc.getElementById('tretaresia-rpg-settings');
        if(main?.parentElement===container)main.insertAdjacentElement('afterend',root);else container.append(root);
        return true;
    }
    function render(current=view()) {
        if(!panel||!current)return;
        const scroll=[];
        for(let node=panel.parentElement;node;node=node.parentElement)if(node.scrollTop)scroll.push([node,node.scrollTop]);
        renderMemorySummaries(panel,current,profiles());stamp(panel);
        for(const [node,top] of scroll)if(node.isConnected)node.scrollTop=top;
    }
    function update(current=view()) {
        if(!mount())return;
        const next=settings().enableMemorySummaries===true;
        root.hidden=!next;
        if(next&&!enabled)drawer.open=false;
        enabled=next;
        // Update ownership and visible state even when the drawer is collapsed.
        render(current);
    }
    function open() {
        update();if(!enabled)return false;
        const host=doc.getElementById('rm_extensions_block');
        if(host?.classList.contains('closedDrawer'))doc.querySelector('#extensions-settings-button > .drawer-toggle')?.click();
        drawer.open=true;render();
        requestAnimationFrame(()=>{root.scrollIntoView({block:'start',behavior:'smooth'});drawer.querySelector('summary').focus({preventScroll:true});});
        return true;
    }
    function reveal(section,focus=false) {
        const target=panel?.querySelector(`[data-memory-section="${section}"]`);if(!target)return;
        for(let node=target;node&&node!==root;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
        if(focus)target.querySelector('input[name="query"]')?.focus({preventScroll:true});
        target.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
    return {update,open,reveal};
}
