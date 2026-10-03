import {UI_STRINGS} from './ui-strings.js?v=0.51.10';

let languageProvider=()=>globalThis.SillyTavern?.getContext?.().extensionSettings?.tretaresia_rpg?.language||'en';
export const setUiLanguageProvider=provider=>{languageProvider=provider;};
export const uiLanguage=()=>languageProvider()==='th'?'th':'en';
// Only built-in interface strings go through this function. Never translate saved
// names, descriptions, chat prose, custom definitions or prompt editor values.
export function uiText(source,values=[],language=uiLanguage()){
    const pair=Object.hasOwn(UI_STRINGS,source)?UI_STRINGS[source]:null;
    const template=pair?pair[language==='th'?1:0]:String(source??'');
    return template.replace(/\{(\d+)\}/g,(match,index)=>index<values.length?String(values[index]??''):match);
}
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const uiHtml=(source,values=[])=>escape(uiText(source,values));
// Called only on static source markup, before any user data is interpolated.
export function uiMarkup(source){
    return source.replace(/(>)([^<>]*?)(?=<|$)/g,(all,prefix,text)=>{
        const key=text.trim();return UI_STRINGS[key]?prefix+text.replace(key,escape(uiText(key))):all;
    }).replace(/\b(title|placeholder|aria-label)="([^"<>]+)"/g,(all,key,text)=>UI_STRINGS[text]?`${key}="${escape(uiText(text))}"`:all);
}
const staticBindings=new Set();
export function bindStaticUi(root){
    if(!root)return;
    const visit=node=>{
        if(node.nodeType===3){const key=node.textContent.trim();if(UI_STRINGS[key])staticBindings.add({node,key,original:node.textContent});return;}
        if(node.nodeType!==1||node.matches('script,style,textarea,[data-user-content]'))return;
        for(const attr of ['title','placeholder','aria-label']){const key=node.getAttribute(attr);if(UI_STRINGS[key])staticBindings.add({node,key,attr});}
        for(const child of node.childNodes)visit(child);
    };visit(root);refreshStaticUi();
}
export function refreshStaticUi(){
    for(const entry of staticBindings){
        if(!entry.node.isConnected){staticBindings.delete(entry);continue;}
        const value=uiText(entry.key);
        if(entry.attr)entry.node.setAttribute(entry.attr,value);
        else entry.node.textContent=entry.original.replace(entry.key,value);
    }
}
