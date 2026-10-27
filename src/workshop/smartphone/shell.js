import {mountPhoneUI} from './ui.js?v=0.89.1';
import {mountKeitaiUI} from './keitai/ui.js?v=0.89.1';

// Both handsets share one runtime, queue, phone save and branch journal.
export function mountPhoneShell(runtime){
 let ui,type='';
 function select(){const next=runtime.get().config.deviceType;if(next===type&&ui)return;const opened=ui?.isOpen?.();ui?.destroy();type=next;ui=type==='keitai'?mountKeitaiUI(runtime):mountPhoneUI(runtime);if(opened)ui.open('settings');}
 return {get root(){return ui?.root;},render(){select();ui.render();},open(view){select();ui.open(view);},close(){ui?.close();},reset(){ui?.reset();},destroy(){ui?.destroy();ui=null;}};
}
