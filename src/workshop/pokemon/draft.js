// Continue may clear the host composer. Never send its draft to the model, and
// restore only in the original chat without overwriting new nonempty input.
// execCommand can emit a trusted input event, so input.isTrusted alone is not
// proof that the user changed the draft.
export function preserveDraft(doc,identity){
 const box=doc.getElementById('send_textarea'),origin=identity();let desired=box?.value||'',intent=false;
 const userIntent=e=>{if(!e.isTrusted)return;if(e.type==='beforeinput'&&!/^delete|^insertComposition/u.test(e.inputType||''))return;if(e.type==='keydown'&&!['Backspace','Delete','Enter'].includes(e.key)&&e.key?.length!==1)return;intent=true;};
 const input=e=>{if(e.isTrusted&&intent){desired=box.value;intent=false;}};
 const types=['beforeinput','keydown','paste','cut','drop','compositionstart'];for(const type of types)box?.addEventListener(type,userIntent);box?.addEventListener('input',input);
 return()=>{for(const type of types)box?.removeEventListener(type,userIntent);box?.removeEventListener('input',input);const active=identity(),target=doc.getElementById('send_textarea');if(desired&&origin.key===active.key&&origin.nonce===active.nonce&&target&&!target.value){target.value=desired;target.dispatchEvent(new Event('input',{bubbles:true}));}};
}
