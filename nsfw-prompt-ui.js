import {DEFAULT_ADULT_STYLE,normalizeWritingStyle,writingPreferencePrompt} from './nsfw-enhance.js?v=0.40.0';

// This renders the exact optional writing block sent by updatePrompt. Reading
// or editing it never calls the model; only committed changes save settings.
export function mountAdultPromptControls(root,{settings,getChat,save,refreshPrompt}){
 if(!root)return null;
 const editor=root.querySelector('[data-adult-style-editor]');
 const preview=root.querySelector('[data-adult-prompt-preview]');
 const status=root.querySelector('[data-adult-prompt-status]');
 const reset=root.querySelector('[data-adult-style-reset]');
 editor.value=settings.nsfwWritingStyle||DEFAULT_ADULT_STYLE;
 function render(){
  const draft=document.activeElement===editor?editor.value:settings.nsfwWritingStyle||DEFAULT_ADULT_STYLE;
  preview.value=writingPreferencePrompt({...settings,nsfwWritingStyle:draft},getChat());
  status.textContent=settings.nsfwEnhance
   ?'NSFW Enhance เปิดอยู่ · ข้อความด้านล่างคือส่วนคำสั่งการเขียนที่จะเพิ่มหลังผู้เล่นเริ่มตอบ'
   :'NSFW Enhance ปิดอยู่ · ตอนนี้จะไม่ส่งคำสั่งสไตล์หรือแท็ก NSFW (คำสั่งภาษาอาจยังทำงานแยกต่างหาก)';
 }
 editor.addEventListener('input',render);
 editor.addEventListener('change',()=>{
  const next=normalizeWritingStyle(editor.value);
  settings.nsfwWritingStyle=next===DEFAULT_ADULT_STYLE?'':next;
  editor.value=settings.nsfwWritingStyle||DEFAULT_ADULT_STYLE;
  if(settings.nsfwWritingStyle!==editor.dataset.savedStyle){
   editor.dataset.savedStyle=settings.nsfwWritingStyle;save();refreshPrompt();
  }
  render();
 });
 editor.dataset.savedStyle=settings.nsfwWritingStyle||'';
 reset.addEventListener('click',()=>{
  editor.value=DEFAULT_ADULT_STYLE;
  if(settings.nsfwWritingStyle){settings.nsfwWritingStyle='';editor.dataset.savedStyle='';save();refreshPrompt();}
  render();
 });
 root.addEventListener('toggle',render);
 render();
 return {refresh:render};
}

