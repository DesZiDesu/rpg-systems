// A local speech draft: no message edits, model requests or credentials.
export function createSpeechEditor({document:doc=globalThis.document,t,runtime,storage,options,settings,busy,run,refresh,openSettings}={}) {
    let dialog,entry,opener,voiceSignature='';
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function close(){dialog?.close();entry=null;}
    function mount(){
        if(dialog?.isConnected)return;
        dialog=doc.createElement('dialog');dialog.className='rf-speech-editor';
        dialog.innerHTML=`<form method="dialog" class="rf-speech-editor-head"><div><small>${t('Speech draft','บทพากย์')}</small><strong data-speech-speaker></strong></div><button class="rf-voice-button" type="submit" aria-label="${t('Close speech editor','ปิดกล่องบทพากย์')}">×</button></form>
        <div class="rf-speech-editor-body"><p>${t('Only audio changes. The original AI message stays as written.','แก้เฉพาะบทที่ส่งสร้างเสียง · ข้อความ AI เดิมคงอยู่')}</p>
        <label>${t('Voice for this block','เสียงสำหรับบทนี้')}<select data-speech-voice></select></label>
        <button type="button" class="rf-voice-button rf-speech-settings" data-speech-action="settings">${t('Voice settings','ตั้งค่าเสียง / เชื่อมต่อ')}</button>
        <label>${t('Text sent to ElevenLabs','ข้อความที่จะส่งให้ ElevenLabs')}<textarea data-speech-text rows="6" maxlength="20000" spellcheck="false"></textarea></label>
        <div class="rf-speech-directions" aria-label="${t('Insert a voice direction','แทรกอารมณ์หรือเสียง')}">${[['whispers','กระซิบ'],['laughs','หัวเราะ'],['sighs','ถอนหายใจ'],['sniff','สูดจมูก'],['angry','โกรธ'],['short pause','เว้นจังหวะ']].map(([tag,label])=>`<button type="button" class="rf-voice-button" data-speech-tag="${tag}" title="[${tag}]">${t(tag,label)}</button>`).join('')}</div>
        <small>${t('Insert directions at the cursor, or type your own [tags]. The voice model determines their delivery.','แทรกตรงตำแหน่งเคอร์เซอร์ หรือพิมพ์ [tag] เองได้ · การแสดงอารมณ์ขึ้นกับโมเดลเสียง')}</small>
        <div data-speech-status role="status"></div>
        <div class="rf-speech-secondary"><button type="button" class="rf-voice-button" data-speech-action="restore">${t('Restore original','คืนต้นฉบับ')}</button><button type="button" class="rf-voice-button" data-speech-action="save">${t('Save speech draft','บันทึกบทพากย์')}</button><button type="button" class="rf-voice-button" data-speech-action="stop">${t('Stop audio','หยุดเสียง')}</button></div>
        <button type="button" class="rf-voice-button is-primary rf-speech-generate" data-speech-action="generate">${t('Generate & listen','สร้างและฟัง')}</button>
        <small>${t('Opening, editing and saving use no API. Playback reuses matching cached audio; new audio uses ElevenLabs quota.','เปิด แก้ และบันทึกไม่เรียก API · ฟังจากแคชเมื่อมีเสียงตรงกัน การสร้างเสียงใหม่ใช้โควตา ElevenLabs')}</small></div>`;
        doc.body.append(dialog);
        dialog.addEventListener('close',()=>{entry=null;opener?.isConnected&&opener.focus({preventScroll:true});});
        dialog.addEventListener('click',event=>{
            if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();return;}
            const tag=event.target.closest('[data-speech-tag]')?.dataset.speechTag;
            if(tag){const text=dialog.querySelector('textarea');text.setRangeText(`[${tag}] `,text.selectionStart,text.selectionEnd,'end');text.focus();status('');update();return;}
            const action=event.target.closest('[data-speech-action]')?.dataset.speechAction;if(!action||!entry)return;
            if(action==='settings'){const key=entry.speakerKey;close();openSettings(key);return;}
            if(action==='stop'){runtime.stop();return;}
            if(!entry.valid()){close();return;}
            if(action==='restore'){dialog.querySelector('textarea').value=entry.originalText;dialog.querySelector('select').value='';status(t('Original restored in this editor. Save to remove the previous draft.','คืนต้นฉบับในกล่องแล้ว · กดบันทึกเพื่อล้างบทพากย์เดิม'));update();return;}
            const target=entry,text=dialog.querySelector('textarea').value.trim(),voice=dialog.querySelector('select').value;
            if(action==='save')run(async()=>{
                const draft=text===target.originalText&&!voice?null:{text,voice};
                await storage.saveDraft(target.draftKey,draft);if(!target.valid())return;
                target.draft=draft;refresh();if(entry===target)status(t('Speech draft saved on this browser.','บันทึกบทพากย์ในเบราว์เซอร์นี้แล้ว'));
            });
            if(action==='generate'){
                runtime.activate();status(t('Using this draft. Save if you want to reuse these edits.','ใช้บทในกล่องครั้งนี้ · กดบันทึกหากต้องการเก็บการแก้ไขนี้'));
                run(()=>runtime.listen([{...target,text,voiceOverride:voice||undefined}]));
            }
        });
        dialog.addEventListener('input',()=>{status('');update();});dialog.addEventListener('change',()=>{status('');update();});
    }
    function status(message){if(dialog)dialog.querySelector('[data-speech-status]').textContent=message;}
    function update(){
        if(!entry||!dialog?.open)return;
        if(!entry.valid()||!settings().enableVoiceAddon){close();return;}
        const select=dialog.querySelector('select'),current=select.value;
        const defaultVoice=runtime.selectedVoice({...entry,voiceOverride:''}),name=runtime.state.voices.find(v=>v.voice_id===defaultVoice)?.name||t('Choose in settings','ยังไม่ได้เลือกในตั้งค่า');
        const signature=JSON.stringify([runtime.state.voices,defaultVoice,settings().language]);
        if(signature!==voiceSignature){voiceSignature=signature;select.innerHTML=`<option value="">${escape(t('Use assigned voice','ใช้เสียงที่ตั้งไว้'))} · ${escape(name)}</option>`+options(current).replace(/<option value="">.*?<\/option>/,'');select.value=current;}
        select.disabled=!runtime.state.connected;
        const voice=current||defaultVoice,ready=runtime.state.connected&&runtime.state.voices.some(v=>v.voice_id===voice);
        const button=dialog.querySelector('[data-speech-action="generate"]'),active=runtime.state.currentId===entry.id,loading=active&&runtime.state.phase==='loading',playing=active&&runtime.state.phase==='playing';button.disabled=!ready||busy()||loading||playing||!dialog.querySelector('textarea').value.trim();
        button.textContent=loading?t('Generating audio…','กำลังสร้างเสียง…'):playing?t('Playing audio','กำลังเล่นเสียง'):t('Generate & listen','สร้างและฟัง');
        button.title=!ready?t('Connect and choose a voice first','เชื่อมต่อและเลือกเสียงก่อน'):busy()?t('Wait for the story reply to finish','รอให้คำตอบเขียนเสร็จก่อน'):t('Uses quota for new audio; cached audio is reused','เสียงใหม่ใช้โควตา · เสียงเดิมใช้แคช');
        dialog.querySelector('[data-speech-action="stop"]').disabled=runtime.state.phase==='idle';
        dialog.querySelector('[data-speech-action="save"]').disabled=!dialog.querySelector('textarea').value.trim();
    }
    function open(target,button){
        if(!target.valid())return;mount();entry=target;opener=button;voiceSignature='';
        dialog.querySelector('[data-speech-speaker]').textContent=target.name;
        dialog.querySelector('textarea').value=target.text;
        const select=dialog.querySelector('select');select.innerHTML=options(target.voiceOverride);select.value=target.voiceOverride||'';
        status('');if(!dialog.open)dialog.showModal();update();
    }
    return {open,update,close,destroy(){close();dialog?.remove();}};
}
