import {uiText,uiMarkup} from './ui-language.js?v=0.55.2';
import {DEFAULT_ADULT_STYLE,normalizeWritingStyle,selectAdultWriting,writingPreferencePrompt} from './nsfw-enhance.js?v=0.55.2';

// This renders the exact optional writing block sent by updatePrompt. Reading
// or editing it never calls the model; only committed changes save settings.
export function mountAdultPromptControls(root,{settings,getChat,save,refreshPrompt}){
 if(!root)return null;
 const editor=root.querySelector('[data-adult-style-editor]');
 const preview=root.querySelector('[data-adult-prompt-preview]');
 const status=root.querySelector('[data-adult-prompt-status]');
 const reset=root.querySelector('[data-adult-style-reset]');
 const mode=root.querySelector('[data-adult-prompt-mode]');
 mode.value=settings.nsfwPromptMode==='always'?'always':'auto';
 editor.value=settings.nsfwWritingStyle||DEFAULT_ADULT_STYLE;
 function render(){
  const draft=document.activeElement===editor?editor.value:settings.nsfwWritingStyle||DEFAULT_ADULT_STYLE;
  const effective={...settings,nsfwWritingStyle:draft,nsfwPromptMode:mode.value},chat=getChat();
  const selected=selectAdultWriting(effective,chat);
  preview.value=writingPreferencePrompt(effective,chat);
  status.textContent=!settings.nsfwEnhance?uiText('NSFW Enhance is off · writing style and tags are omitted')
   :!selected.active?uiText('Auto · no relevant scene in recent chat · writing style and tags are omitted')
   :selected.mode==='always'?uiText('Always · full style and all selected tags are sent')
   :uiText('Auto · {0}/{1} sections and {2} tags selected',[selected.sections.length,selected.total,selected.tags.length]);
 }
 mode.addEventListener('change',()=>{
  const next=mode.value==='always'?'always':'auto';
  mode.value=next;
  if(settings.nsfwPromptMode!==next){settings.nsfwPromptMode=next;save();refreshPrompt();}
  render();
 });
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

