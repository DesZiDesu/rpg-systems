import {VOICE_MODELS,normalizeVoiceSettings,speakerVoiceKey,speechText,speechDraftKey} from './voice-core.js?v=0.58.13';
import {resolveNpcSpeaker} from './npc-core.js?v=0.58.13';
import {createVoiceStorage} from './voice-storage.js?v=0.58.13';
import {createElevenLabsClient} from './voice-api.js?v=0.58.13';
import {createSpeechEditor} from './voice-editor.js?v=0.58.13';
import {createVoiceRuntime} from './voice-runtime.js?v=0.58.13';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shapes={play:'<path d="m9 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',wave:'<path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4"/>',chevron:'<path d="m9 5 7 7-7 7"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5M18 5a8 8 0 0 0-14 5M6 19a8 8 0 0 0 14-5"/>'};
const svg=key=>`<svg viewBox="0 0 24 24" aria-hidden="true">${shapes[key]||shapes.play}</svg>`;

export function createVoiceAddons({settings,context,state,visible=value=>value,save=()=>{},prompt=()=>{},notice=()=>{},notify=()=>{},busy=()=>false,close=()=>{},document:doc=globalThis.document}={}) {
    let editor;
    const storage=createVoiceStorage(),controls=new Set(),messages=new Map(),subscriptions=[];
    let root,drawer,panel,runtime,enabled=false,locale='',voicesSignature='',npcSignature='',library=[],libraryPage=0,libraryMore=false,autoTimer,pendingAuto=null,libraryTicket=0;
    const autoPlayed=new Set();
    const t=(en,th)=>settings().language==='th'?th:en;
    const client=createElevenLabsClient({key:()=>runtime?.key()||'',notice,language:()=>settings().language});
    runtime=createVoiceRuntime({settings,storage,client,notify,changed:()=>{render();refreshButtons();editor?.update();}});
    const config=()=>normalizeVoiceSettings(settings());
    editor=createSpeechEditor({document:doc,t,runtime,storage,options,settings,busy,run,refresh:refreshButtons,openSettings:open});
    const report=error=>{if(error.name!=='AbortError')notify('error',error.message);};
    function run(action){Promise.resolve().then(action).catch(report);}
    function mount(){
        if(root?.isConnected)return true;
        const container=doc.getElementById('extensions_settings2');if(!container)return false;
        root=doc.createElement('div');root.id='roleforge-voice-addons';root.className='extension_container';root.hidden=true;
        root.innerHTML=`<details class="rf-voice-drawer inline-drawer"><summary class="rf-voice-header inline-drawer-header">${svg('chevron')}${svg('wave')}<b>RoleForge Voice Addon</b><span data-voice-connection></span></summary><div class="rf-voice-settings inline-drawer-content" data-voice-panel></div></details>`;
        drawer=root.querySelector('details');panel=root.querySelector('[data-voice-panel]');
        container.append(root);drawer.addEventListener('toggle',()=>{if(drawer.open)render();});
        root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('submit',onSubmit);
        root.addEventListener('input',event=>{if(event.target.name==='key')render();});
        return true;
    }
    function build(){
        panel.innerHTML=`<p class="rf-voice-copy">${t('Speak dialogue and narration. Generate audio when you press Play.','พากย์บทพูดและคำบรรยาย · สร้างเสียงเมื่อกดฟัง')}</p>
            <form data-voice-connect class="rf-voice-connect"><label>${t('ElevenLabs API key','ElevenLabs API key · แยกจากเจนข้อความ')}<input type="password" name="key" autocomplete="new-password" placeholder="sk_…" aria-label="ElevenLabs API key"></label><div class="rf-voice-row"><label class="rf-voice-check"><input type="checkbox" name="remember"${config().voiceRememberKey&&storage.canRemember()?' checked':''}${storage.canRemember()?'':' disabled'}>${t('Remember on this browser','จำ key ในเบราว์เซอร์นี้')}</label><button type="submit" class="rf-voice-button is-primary" data-voice-connect-button>${t('Connect','เชื่อมต่อ')}</button><button type="button" class="rf-voice-button" data-voice-action="disconnect">${t('Forget key','ลืม key')}</button></div><small>${storage.canRemember()?t('Remembered keys are stored separately from chat and exported settings.','key ที่จำไว้เก็บแยกจากแชตและไฟล์ตั้งค่าที่ส่งออก'):t('This address supports a session key only. Use HTTPS to remember it.','ที่อยู่เว็บนี้ใช้ key เฉพาะรอบที่เปิดหน้า ใช้ HTTPS หากต้องการจำ key')}</small></form>
            <div class="rf-voice-status" role="status" data-voice-status></div>
            <section class="rf-voice-quota"><div class="rf-voice-row"><span>${t('Quota remaining','โควตาคงเหลือ')}</span><strong data-voice-quota>—</strong><button type="button" class="rf-voice-button rf-voice-icon-button" data-voice-action="quota" aria-label="${t('Refresh quota','รีเฟรชโควตา')}">${svg('refresh')}</button></div><div class="rf-voice-meter" role="progressbar" aria-label="${t('Quota remaining','โควตาคงเหลือ')}" aria-valuemin="0" aria-valuemax="100"><i></i></div><small data-voice-quota-note></small><small data-voice-quota-error></small></section>
            <div class="rf-voice-grid"><label>${t('Model','โมเดล')}<select name="model">${VOICE_MODELS.map(model=>`<option value="${model.id}">${model.name}</option>`).join('')}</select></label><label>${t('Playback speed','ความเร็วตอนฟัง')}<select name="speed">${[.75,1,1.25,1.5].map(speed=>`<option value="${speed}">${speed}×</option>`).join('')}</select></label></div>
            <div class="rf-voice-grid"><label>${t('Default male voice','เสียงเริ่มต้น · ชาย')}<select name="male" data-voice-select></select></label><label>${t('Default female voice','เสียงเริ่มต้น · หญิง')}<select name="female" data-voice-select></select></label></div>
            <label class="rf-voice-field">${t('Narrator voice','เสียงผู้บรรยาย')}<select name="narrator" data-voice-select></select></label><small>${t('Choose a narrator voice to use Play all or auto-play with narration.','เลือกเสียงผู้บรรยายเพื่อใช้ฟังทั้งหมดหรือฟังอัตโนมัติพร้อมคำบรรยาย')}</small>
            <label class="rf-voice-field">${t('Fallback voice · unknown gender','เสียงสำรอง · ไม่ทราบเพศ')}<select name="default" data-voice-select></select></label><small>${t('An NPC assignment overrides gender defaults. Gender comes from the character profile.','เสียงเฉพาะตัวละครมาก่อนเสียงเริ่มต้น · ใช้เพศจากข้อมูลตัวละคร')}</small>
            <label class="rf-voice-check"><input type="checkbox" name="autoplay">${t('Auto-play new AI replies','ฟังคำตอบ AI ใหม่อัตโนมัติ')}</label><small class="rf-voice-copy">${t('Auto-play creates audio and uses quota. Some browsers require a manual Play first.','ฟังอัตโนมัติจะสร้างเสียงและใช้โควตา บางเบราว์เซอร์ต้องกดฟังเองก่อน')}</small>
            <p class="rf-voice-copy" data-voice-presentation-help></p>
            <details class="rf-voice-fold" data-voice-npcs><summary>${t('NPC voices','เสียงของตัวละคร')}<span data-voice-npc-count></span></summary><input name="npc-search" type="search" placeholder="${t('Find NPC','ค้นหาตัวละคร')}" aria-label="${t('Find NPC','ค้นหาตัวละคร')}"><div class="rf-voice-npc-list" data-voice-npc-list></div></details>
            <details class="rf-voice-fold"><summary>My Voices<button type="button" class="rf-voice-button rf-voice-icon-button" data-voice-action="voices" aria-label="${t('Refresh voices','รีเฟรชรายชื่อเสียง')}">${svg('refresh')}</button></summary><div data-voice-my-list class="rf-voice-list"></div></details>
            <details class="rf-voice-fold" data-voice-library><summary>Voice Library</summary><p class="rf-voice-copy">${t('Search public voices and add them to My Voices. Library API use requires a paid account.','ค้นหาเสียงสาธารณะแล้วเพิ่มใน My Voices · ใช้ Library ผ่าน API ต้องเป็นบัญชีที่มีสิทธิ์แบบเสียเงิน')}</p><form data-voice-library-search class="rf-voice-row"><input name="library-search" type="search" placeholder="${t('Name, style or accent','ชื่อเสียง สไตล์ หรือสำเนียง')}" aria-label="Voice Library"><button type="submit" class="rf-voice-button">${t('Search','ค้นหา')}</button></form><label class="rf-voice-check"><input type="checkbox" name="custom-rates">${t('Include voices with custom rates','รวมเสียงอัตราพิเศษ')}</label><div data-voice-library-results class="rf-voice-list"></div><div class="rf-voice-row"><button type="button" class="rf-voice-button" data-voice-action="library-prev">${t('Previous','ก่อนหน้า')}</button><span data-voice-library-page></span><button type="button" class="rf-voice-button" data-voice-action="library-next">${t('Next','ถัดไป')}</button></div></details>
            <details class="rf-voice-fold"><summary>${t('Try a dialogue','ทดลองพากย์บทพูด')}</summary><form data-voice-test><textarea name="test-text" rows="2" maxlength="2000" aria-label="${t('Test dialogue','บทพูดทดลอง')}">${t('Your room is ready. Please follow me.','ห้องพักของท่านพร้อมแล้วครับ เชิญตามข้ามา')}</textarea><button type="submit" class="rf-voice-button">${svg('play')}${t('Generate test · uses quota','สร้างเสียงทดลอง · ใช้โควตา')}</button></form></details>
            <div class="rf-voice-footer"><button type="button" class="rf-voice-button" data-voice-action="stop">${svg('stop')}${t('Stop audio','หยุดเสียง')}</button><button type="button" class="rf-voice-button" data-voice-action="clear-cache">${t('Clear audio cache','ล้างแคชเสียง')}</button></div>`;
        panel.querySelector('[name="npc-search"]').addEventListener('input',()=>renderNpcs(true));
        voicesSignature='';npcSignature='';locale=settings().language;
    }
    function options(selected=''){
        const voices=runtime.state.voices;
        return `<option value="">${t('Choose a voice','เลือกเสียง')}</option>${selected&&!voices.some(v=>v.voice_id===selected)?`<option value="${escape(selected)}">${t('Voice unavailable · choose again','เสียงไม่อยู่ในบัญชี · เลือกใหม่')}</option>`:''}${voices.map(voice=>`<option value="${escape(voice.voice_id)}">${escape(voice.name)}</option>`).join('')}`;
    }
    function voiceRows(voices,shared=false){
        return voices.map(voice=>`<div class="rf-voice-choice"><div><strong>${escape(voice.name)}</strong><small>${escape(shared?[voice.language,voice.accent,voice.gender].filter(Boolean).join(' · '):Object.values(voice.labels||{}).slice(0,3).join(' · '))}</small></div><button type="button" class="rf-voice-button" data-voice-action="preview" data-voice-id="${escape(voice.voice_id)}" data-shared="${shared}"${voice.preview_url?'':' disabled'}>${svg('play')}${t('Sample','ตัวอย่าง')}</button>${shared?`<button type="button" class="rf-voice-button" data-voice-action="add" data-voice-id="${escape(voice.voice_id)}">${t('Add','เพิ่ม')}</button>`:''}</div>`).join('')||`<p class="rf-voice-copy">${t('No voices loaded','ยังไม่มีรายชื่อเสียง')}</p>`;
    }
    function renderNpcs(force=false){
        if(!panel)return;const search=panel.querySelector('[name="npc-search"]').value.trim().toLowerCase();
        const profiles=state().npcs||[],list=profiles.filter(profile=>`${profile.name} ${(profile.aliases||[]).join(' ')}`.toLowerCase().includes(search));
        const signature=JSON.stringify([list.map(profile=>[profile.id,profile.name,profile.npcScope,profile.npcOwner]),config().voiceBindings,runtime.state.voices.map(v=>v.voice_id),runtime.state.connected,settings().language]);
        panel.querySelector('[data-voice-npc-count]').textContent=String(profiles.length);
        if(!force&&signature===npcSignature)return;npcSignature=signature;
        const container=panel.querySelector('[data-voice-npc-list]');container.innerHTML=list.map(profile=>{
            const key=speakerVoiceKey(profile,profile.name,context()),selected=config().voiceBindings[key]||'';
            return `<label class="rf-voice-npc"><span>${escape(profile.name)}</span><select data-voice-npc="${escape(key)}" aria-label="${escape(t('Voice for ','เสียงของ ')+profile.name)}"${runtime.state.connected?'':' disabled'}><option value="">${t('Use automatic default','ใช้เสียงเริ่มต้น')}</option>${options(selected).replace(/<option value="">.*?<\/option>/,'')}</select></label>`;
        }).join('')||`<p class="rf-voice-copy">${t('No matching NPCs in this chat','ยังไม่มีตัวละครที่ตรงกับการค้นหาในแชตนี้')}</p>`;
        for(const select of container.querySelectorAll('select'))select.value=config().voiceBindings[select.dataset.voiceNpc]||'';
    }
    function render(){
        if(!panel)return;if(locale!==settings().language)build();
        const data=runtime.state,configRef=config();
        root.querySelector('[data-voice-connection]').textContent=data.connected?t('Connected','เชื่อมแล้ว'):data.connecting?t('Connecting…','กำลังเชื่อม…'):t('Not connected','ยังไม่เชื่อม');
        const status=panel.querySelector('[data-voice-status]');status.textContent=data.error||(!data.connected&&!data.connecting?t('Connect a key to load voices and account quota.','เชื่อม key เพื่อโหลดรายชื่อเสียงและโควตาจากบัญชี'):data.connecting?t('Loading your account…','กำลังอ่านข้อมูลบัญชี…'):t('Ready · dialogue and narration','พร้อมพากย์บทพูดและคำบรรยาย'));
        status.dataset.error=String(Boolean(data.error));
        panel.querySelector('[data-voice-connect-button]').disabled=data.connecting||!panel.querySelector('[name="key"]').value.trim();
        panel.querySelector('[data-voice-connect-button]').textContent=data.connecting?t('Connecting…','กำลังเชื่อม…'):t('Connect','เชื่อมต่อ');
        panel.querySelector('[data-voice-action="disconnect"]').disabled=!runtime.hasKey()&&!configRef.voiceRememberKey;
        for(const control of panel.querySelectorAll('[data-voice-action="quota"],[data-voice-action="voices"],[data-voice-library-search] button,[data-voice-test] button'))control.disabled=!data.connected;
        const q=data.quota,number=value=>Number(value).toLocaleString(settings().language==='th'?'th-TH':'en-US');
        panel.querySelector('[data-voice-quota]').textContent=q?.remaining!==null&&q?.remaining!==undefined?`${number(q.remaining)} / ${number(q.limit)}`:'—';
        const meter=panel.querySelector('.rf-voice-meter');meter.querySelector('i').style.width=`${q?.percent??0}%`;if(q?.percent!==null&&q?.percent!==undefined)meter.setAttribute('aria-valuenow',String(Math.round(q.percent)));else meter.removeAttribute('aria-valuenow');
        const date=value=>new Date(value).toLocaleDateString(settings().language==='th'?'th-TH':'en-US',{day:'numeric',month:'short'});
        panel.querySelector('[data-voice-quota-note]').textContent=q?[q.tier,q.resetAt?t('Resets ','รีเซ็ต ')+date(q.resetAt):'',t('Updated ','อัปเดต ')+new Date(q.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),t('Speech allowance depends on model and voice rates.','จำนวนที่พากย์ได้ขึ้นกับโมเดลและอัตราของเสียง')].filter(Boolean).join(' · '):t('Quota has not been read from the account.','ยังไม่ได้อ่านยอดโควตาจากบัญชี');
        panel.querySelector('[data-voice-quota-error]').textContent=data.quotaError;
        for(const [name,value]of [['model',configRef.voiceModel],['speed',configRef.voiceSpeed]])panel.querySelector(`[name="${name}"]`).value=String(value);
        panel.querySelector('[name="autoplay"]').checked=configRef.voiceAutoplay;
        panel.querySelector('[data-voice-presentation-help]').textContent=settings().chatPresentation===false?t('Enable Header / Dialogue / Narrative in RoleForge to show Play buttons.','เปิด Header / Dialogue / Narrative ใน RoleForge เพื่อแสดงปุ่มฟัง'):'';
        const signature=JSON.stringify([data.voices,configRef.voiceDefaultId,configRef.voiceMaleId,configRef.voiceFemaleId,configRef.voiceNarratorId,settings().language]);
        if(signature!==voicesSignature){voicesSignature=signature;for(const[name,field]of [['default','voiceDefaultId'],['male','voiceMaleId'],['female','voiceFemaleId'],['narrator','voiceNarratorId']]){const select=panel.querySelector(`[name="${name}"]`);select.innerHTML=options(configRef[field]);select.value=configRef[field];}panel.querySelector('[data-voice-my-list]').innerHTML=voiceRows(data.voices);}
        for(const select of panel.querySelectorAll('[data-voice-select]'))select.disabled=!data.connected;renderNpcs();
        panel.querySelector('[data-voice-action="library-prev"]').disabled=!data.connected||libraryPage===0;
        panel.querySelector('[data-voice-action="library-next"]').disabled=!data.connected||!libraryMore;
        panel.querySelector('[data-voice-library-page]').textContent=library.length?String(libraryPage+1):'';
        panel.querySelector('[data-voice-action="stop"]').disabled=data.phase==='idle';
    }
    function refreshButtons(){
        for(const control of controls){
            if(!control.root.isConnected){controls.delete(control);continue;}
            const data=runtime.state,entry=control.entry,current=data.currentId===entry?.id;
            if(control.all){const missing=control.entries.filter(entry=>!data.voices.some(voice=>voice.voice_id===runtime.selectedVoice(entry)));control.play.disabled=!data.connected||busy()||missing.length>0;control.play.title=!data.connected?t('Connect ElevenLabs first','เชื่อม ElevenLabs ก่อน'):busy()?t('Wait for this reply to finish','รอให้คำตอบเขียนเสร็จก่อน'):missing.length?t('Choose a voice for: ','เลือกเสียงให้: ')+[...new Set(missing.map(entry=>entry.name))].join(', '):t('Read narration and dialogue in story order','อ่านคำบรรยายและบทพูดตามลำดับเรื่อง');control.stop.disabled=data.phase==='idle';continue;}
            const voice=runtime.selectedVoice(entry),ready=data.connected&&Boolean(voice)&&data.voices.some(v=>v.voice_id===voice);
            control.play.disabled=!ready||busy();
            const loading=current&&data.phase==='loading',paused=current&&data.phase==='paused',playing=current&&data.phase==='playing';
            control.play.innerHTML=svg(playing?'pause':loading?'stop':'play')+`<span>${t(playing?'Pause':loading?'Cancel':paused?'Resume':'Listen',playing?'พักเสียง':loading?'ยกเลิก':paused?'ฟังต่อ':entry.kind==='narrative'?'ฟังคำบรรยาย':'ฟังบทพูด')}</span>`;
            control.play.classList.toggle('is-playing',playing||paused);control.play.setAttribute('aria-label',(entry.kind==='narrative'?t('Narration: ','คำบรรยาย: '):t('Dialogue: ','บทพูด: '))+(playing?t('Pause','พักเสียง'):loading?t('Cancel audio request','ยกเลิกการสร้างเสียง'):t('Play','ฟัง'))+' · '+entry.name);
            control.play.setAttribute('aria-busy',String(loading));control.play.title=!ready?t('Connect and choose a voice in Voice Addon','เชื่อมต่อและเลือกเสียงใน Voice Addon'):busy()?t('Wait for this reply to finish','รอให้คำตอบเขียนเสร็จก่อน'):control.play.getAttribute('aria-label');
            control.setup.textContent=t('✎ Speech draft','✎ บทพากย์');
            control.setup.title=t('Edit speech for ','แก้บทพากย์ของ ')+entry.name;
            control.setup.setAttribute('aria-label',control.setup.title);
            control.stop.hidden=!current;control.stop.disabled=data.phase==='idle';
        }
    }
    function open(profileKey=''){
        update();if(!enabled)return false;close();
        const host=doc.getElementById('rm_extensions_block');if(host?.classList.contains('closedDrawer'))doc.querySelector('#extensions-settings-button > .drawer-toggle')?.click();
        drawer.open=true;
        if(profileKey){const fold=panel.querySelector('[data-voice-npcs]');fold.open=true;const select=[...fold.querySelectorAll('select')].find(node=>node.dataset.voiceNpc===profileKey);select?.focus({preventScroll:true});}
        requestAnimationFrame(()=>root.scrollIntoView({block:'start',behavior:'smooth'}));return true;
    }
    function decorateMessage(storyRoot,blocks,{id,message}={}){
        if(!settings().enableVoiceAddon)return;
        const chat=context().getCurrentChatId?.()||'',source=visible(message.mes),swipe=message.swipe_id||0,profiles=state().npcs||[];
        const nodes={dialogue:[...storyRoot.querySelectorAll('.trpg-dialogue')],narrative:[...storyRoot.querySelectorAll('.trpg-narrative')]},counts={dialogue:0,narrative:0},entries=[];
        blocks.forEach((block,blockIndex)=>{
            if(!nodes[block.type]||!block.text?.trim())return;
            const node=nodes[block.type][counts[block.type]++];if(!node)return;
            const narrative=block.type==='narrative',name=narrative?t('Narrator','ผู้บรรยาย'):block.name||message.name||'NPC',profile=narrative?{}:resolveNpcSpeaker(profiles,name)||{name};
            const entry={id:`${chat}:${id}:${message.swipe_id||0}:${blockIndex}`,kind:block.type,name:profile.name||name,gender:profile.gender||'',speakerKey:narrative?'':speakerVoiceKey(profile,name,context()),originalText:speechText(block),draft:null,draftKey:speechDraftKey(context(),id,message.swipe_id,blockIndex,block),
                get text(){return this.draft?.text??this.originalText;},get voiceOverride(){return this.draft?.voice||'';},
                valid:()=>settings().enableVoiceAddon&&storyRoot.isConnected&&(context().getCurrentChatId?.()||'')===chat&&context().chat?.[id]===message&&(message.swipe_id||0)===swipe&&visible(message.mes)===source};
            entries.push(entry);
            const row=doc.createElement('div');row.className=narrative?'rf-voice-dialogue-controls rf-voice-narrative-controls':'rf-voice-dialogue-controls';
            row.innerHTML=`<button type="button" class="rf-voice-button rf-voice-play">${svg('play')}${t('Play','ฟัง')}</button><button type="button" class="rf-voice-button rf-voice-stop" aria-label="${t('Stop audio','หยุดเสียง')}" hidden>${svg('stop')}</button><button type="button" class="rf-voice-button rf-voice-setup">${t('✎ Speech draft','✎ บทพากย์')}</button>`;
            const play=row.querySelector('.rf-voice-play'),stop=row.querySelector('.rf-voice-stop'),setup=row.querySelector('.rf-voice-setup');
            row.setAttribute('role','group');row.setAttribute('aria-label',t('Speech for ','บทพากย์ของ ')+entry.name);
            const loaded=storage.readDraft(entry.draftKey).then(draft=>{if(entry.valid()){entry.draft=draft;refreshButtons();}});
            entry.loaded=loaded;
            play.addEventListener('click',()=>{runtime.activate();run(async()=>{await loaded;if(entry.valid())await runtime.toggle(entry);});});stop.addEventListener('click',()=>runtime.stop());setup.addEventListener('click',()=>run(async()=>{await loaded;if(entry.valid())editor.open(entry,setup);}));node.append(row);controls.add({root:row,play,stop,setup,entry});
        });
        if(entries.length>1){const bar=doc.createElement('div');bar.className='rf-voice-message-controls';bar.innerHTML=`<span>${t('Narration + dialogue','คำบรรยาย + บทพูด')}</span><button type="button" class="rf-voice-button" data-voice-play-all>${svg('play')}${t('Play all','ฟังทั้งหมด')}</button><button type="button" class="rf-voice-button" data-voice-stop-all>${svg('stop')}${t('Stop','หยุด')}</button>`;const play=bar.querySelector('[data-voice-play-all]'),stop=bar.querySelector('[data-voice-stop-all]');play.addEventListener('click',()=>{runtime.activate();run(async()=>{await Promise.all(entries.map(e=>e.loaded));await runtime.listen(entries,{queue:true});});});stop.addEventListener('click',()=>runtime.stop());storyRoot.append(bar);controls.add({root:bar,play,stop,all:true,entries});}
        messages.set(id,{root:storyRoot,entries,message});for(const [key,value]of messages)if(!value.root.isConnected&&key!==id)messages.delete(key);refreshButtons();
    }
    async function searchLibrary(page=0){
        const ticket=++libraryTicket;libraryPage=page;const button=panel.querySelector('[data-voice-library-search] button');button.disabled=true;
        try{const result=await client.library(panel.querySelector('[name="library-search"]').value.trim(),page,undefined,panel.querySelector('[name="custom-rates"]').checked);if(ticket!==libraryTicket||!enabled)return;library=result.voices||[];libraryMore=result.has_more===true;panel.querySelector('[data-voice-library-results]').innerHTML=voiceRows(library,true);}
        finally{if(ticket===libraryTicket)render();}
    }
    function onClick(event){
        const button=event.target.closest('[data-voice-action]');if(!button)return;event.preventDefault();
        const action=button.dataset.voiceAction;
        if(action==='disconnect'){runtime.disconnect({forget:true});save();return;}
        if(action==='stop'){runtime.stop();return;}
        if(action==='preview')runtime.activate();
        run(async()=>{
            if(action==='quota')await runtime.quota();
            if(action==='voices')await runtime.refreshVoices();
            if(action==='clear-cache'){runtime.stop();await storage.clearAudio(config().voiceCacheId||config().voiceVaultId);notify('success',t('Audio cache cleared','ล้างแคชเสียงแล้ว'));}
            if(action==='library-prev'||action==='library-next')await searchLibrary(libraryPage+(action==='library-next'?1:-1));
            if(action==='preview'){const voice=(button.dataset.shared==='true'?library:runtime.state.voices).find(v=>v.voice_id===button.dataset.voiceId);if(voice){notice('voicePreview','Voice preview');await runtime.preview(voice);}}
            if(action==='add'){
                const voice=library.find(v=>v.voice_id===button.dataset.voiceId);if(!voice)return;button.disabled=true;
                try{await client.addVoice(voice);await runtime.refreshVoices();notify('success',t('Voice added to My Voices','เพิ่มเสียงใน My Voices แล้ว'));}finally{if(button.isConnected)button.disabled=false;}
            }
        });
    }
    function onChange(event){
        const target=event.target,c=config();
        if(target.dataset.voiceNpc){runtime.stop();if(target.value)c.voiceBindings[target.dataset.voiceNpc]=target.value;else delete c.voiceBindings[target.dataset.voiceNpc];save();refreshButtons();return;}
        if(target.name==='model'){runtime.stop();c.voiceModel=target.value;prompt();}
        else if(target.name==='speed')runtime.setSpeed(Number(target.value));
        else if(['default','male','female','narrator'].includes(target.name)){runtime.stop();c[{default:'voiceDefaultId',male:'voiceMaleId',female:'voiceFemaleId',narrator:'voiceNarratorId'}[target.name]]=target.value;}
        else if(target.name==='autoplay'){c.voiceAutoplay=target.checked;if(target.checked)runtime.activate();}
        else return;
        save();render();refreshButtons();editor?.update();
    }
    function onSubmit(event){
        event.preventDefault();const form=event.target;
        if(form.matches('[data-voice-connect]'))run(async()=>{const input=form.elements.key,ok=await runtime.connect(input.value,{remember:form.elements.remember.checked});if(ok){input.value='';form.elements.remember.checked=config().voiceRememberKey;save();render();}});
        if(form.matches('[data-voice-library-search]'))run(()=>searchLibrary());
        if(form.matches('[data-voice-test]')){runtime.activate();run(()=>runtime.listen([{id:'voice-test',speakerKey:'',name:t('Test','ทดลอง'),text:form.elements['test-text'].value.trim()}]));}
    }
    function update(){
        if(!mount())return;const next=config().enableVoiceAddon;root.hidden=!next;
        if(next&&!enabled)drawer.open=false;
        if(!next&&enabled){editor.close();libraryTicket++;clearTimeout(autoTimer);pendingAuto=null;messages.clear();}
        enabled=next;render();run(()=>runtime.update());refreshButtons();
    }
    function onNewReply(id){
        if(!config().enableVoiceAddon||!config().voiceAutoplay)return;
        pendingAuto={id:Number(id),chat:context().getCurrentChatId?.()||''};scheduleAuto();
    }
    function scheduleAuto(attempt=0){
        clearTimeout(autoTimer);if(!pendingAuto)return;
        autoTimer=setTimeout(()=>{
            if(!pendingAuto||!config().enableVoiceAddon||!config().voiceAutoplay||busy())return;
            if((context().getCurrentChatId?.()||'')!==pendingAuto.chat){pendingAuto=null;return;}
            const message=messages.get(pendingAuto.id);
            if(!message?.entries.length||!message.entries.every(entry=>entry.valid())){if(attempt<10)scheduleAuto(attempt+1);return;}
            const key=`${pendingAuto.chat}:${pendingAuto.id}:${message.message.swipe_id||0}`;pendingAuto=null;
            if(autoPlayed.has(key)||runtime.state.phase!=='idle'||!runtime.state.connected||message.entries.some(entry=>!runtime.selectedVoice(entry)))return;
            autoPlayed.add(key);if(autoPlayed.size>500)autoPlayed.delete(autoPlayed.values().next().value);
            run(async()=>{await Promise.all(message.entries.map(e=>e.loaded));await runtime.listen(message.entries,{queue:true});});
        },400);
    }
    const host=context(),events=host.eventTypes||host.event_types||{};
    for(const name of ['CHAT_CHANGED','MESSAGE_SWIPED','MESSAGE_UPDATED','MESSAGE_EDITED','MESSAGE_DELETED','GENERATION_STARTED']){
        const event=events[name];if(!event)continue;const handler=()=>{editor.close();runtime.stop();clearTimeout(autoTimer);pendingAuto=null;if(name==='CHAT_CHANGED'){messages.clear();npcSignature='';}render();};host.eventSource?.on(event,handler);subscriptions.push([event,handler]);
    }
    if(events.MESSAGE_RECEIVED){host.eventSource?.on(events.MESSAGE_RECEIVED,onNewReply);subscriptions.push([events.MESSAGE_RECEIVED,onNewReply]);}
    if(events.GENERATION_ENDED){const handler=()=>{scheduleAuto();refreshButtons();};host.eventSource?.on(events.GENERATION_ENDED,handler);subscriptions.push([events.GENERATION_ENDED,handler]);}
    return {update,open,decorateMessage,stop:()=>runtime.stop(),destroy(){clearTimeout(autoTimer);editor.destroy();runtime.destroy();for(const[event,handler]of subscriptions)host.eventSource?.off?.(event,handler);root?.remove();controls.clear();messages.clear();}};
}
