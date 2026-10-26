import {element} from './npc-chat.js?v=0.88.2';
import {uiText} from './ui-language.js?v=0.88.2';
import {npcEntryLimit} from './npc-capacity.js?v=0.88.2';

export function mountNpcCapacityControls(root,api) {
    const panel=element('details','trpg-generation-options trpg-capacity-options');panel.dataset.npcCapacityPanel='';
    const summary=element('summary','',uiText('Character capacity')),body=element('div','trpg-lore-preferences');
    const modeLabel=element('label','',uiText('Character entry capacity')),mode=element('select');mode.dataset.npcCapacityMode='';
    for(const [value,label]of [['unlimited','Unlimited entries'],['limited','Set an entry limit']]){const option=element('option','',uiText(label));option.value=value;mode.append(option);}
    const limitLabel=element('label','',uiText('Maximum characters per library')),limit=element('input');limit.type='number';limit.min='1';limit.step='1';limit.inputMode='numeric';limit.dataset.npcCapacityLimit='';
    const counts=element('p','tretaresia-rpg-settings-copy'),help=element('p','tretaresia-rpg-settings-copy',uiText('The limit counts enabled and disabled characters separately in each Character or Chat library. Lowering it keeps existing records.'));
    const save=element('button','',uiText('Save character settings'));save.type='button';save.dataset.npcCapacitySave='';
    modeLabel.append(mode);limitLabel.append(limit);body.append(modeLabel,limitLabel,counts,help,save);panel.append(summary,body);root.append(panel);
    let dirty=false,metadata=null,chatId=null,owner=null,busy=false;
    const selectMode=()=>{limitLabel.hidden=mode.value==='unlimited';limit.disabled=mode.value==='unlimited';};
    mode.addEventListener('change',()=>{dirty=true;selectMode();});limit.addEventListener('input',()=>{dirty=true;});
    function update({reset=false}={}){
        const context=api.context(),nextOwner=api.scopeInfo()?.key||'';
        if(reset||context.chatMetadata!==metadata||context.getCurrentChatId?.()!==chatId||nextOwner!==owner)dirty=false;
        if(!dirty){const cap=npcEntryLimit(api.options());mode.value=cap?'limited':'unlimited';limit.value=String(cap||500);selectMode();metadata=context.chatMetadata;chatId=context.getCurrentChatId?.();owner=nextOwner;}
        const entries=api.records(),cap=npcEntryLimit(api.options());
        counts.textContent=uiText('Stored: {0} characters · Enabled: {1} · Capacity: {2}',[entries.length.toLocaleString(),entries.filter(n=>n.enabled!==false).length.toLocaleString(),cap?cap.toLocaleString():uiText('Unlimited entries')]);
        save.disabled=busy||!chatId||!api.save;
    }
    save.addEventListener('click',async()=>{
        if(busy)return;
        const current=api.context();
        const currentChatId=current.getCurrentChatId?.(),currentOwner=owner;
        const session=api.session?.(),sameContext=()=>session===api.session?.()&&api.context().chatMetadata===current.chatMetadata&&api.context().getCurrentChatId?.()===currentChatId&&(api.scopeInfo()?.key||'')===currentOwner;
        if(current.chatMetadata!==metadata||current.getCurrentChatId?.()!==chatId||(api.scopeInfo()?.key||'')!==owner){api.say(uiText('Chat changed. Reopen Character Management.'));return;}
        const entryLimit=mode.value==='unlimited'?0:Number(limit.value);
        if(mode.value!=='unlimited'&&(!Number.isSafeInteger(entryLimit)||entryLimit<1)){api.say(uiText('Enter a positive whole number for the character limit.'));limit.focus();return;}
        busy=true;save.disabled=true;api.lock(true);
        try{await api.save({entryLimit},currentOwner);if(!sameContext())return;dirty=false;api.refresh();api.say(uiText('Character settings saved.'));}
        catch(error){if(sameContext())api.say(error.message);}
        finally{busy=false;if(sameContext())api.lock(false);update();}
    });
    update();return {update};
}
