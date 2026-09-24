import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAdultPromptControls} from '../src/nsfw-prompt-ui.js';
import {DEFAULT_ADULT_STYLE} from '../src/nsfw-enhance.js';

class Element{
 constructor(){this.value='';this.textContent='';this.dataset={};this.listeners={};}
 addEventListener(event,callback){this.listeners[event]=callback}
 querySelector(selector){return this.controls.get(selector)}
}
globalThis.document={activeElement:null};

test('live prompt preview is read-only and edits save only on commit or reset',()=>{
 const root=new Element();root.controls=new Map(['style-editor','prompt-preview','prompt-status','style-reset'].map(name=>[`[data-adult-${name}]`,new Element()]));
 const get=name=>root.querySelector(`[data-adult-${name}]`);
 const settings={nsfwEnhance:true,roleplayLanguage:'th',language:'en',nsfwTags:['Kissing'],nsfwWritingStyle:''};
 let saves=0,updates=0;
 const controls=mountAdultPromptControls(root,{settings,getChat:()=>[{is_user:true,mes:'Please answer in English.'}],save:()=>saves++,refreshPrompt:()=>updates++});
 assert.equal(get('style-editor').value,DEFAULT_ADULT_STYLE);
 assert.match(get('prompt-preview').value,/Thai/);
 assert.match(get('prompt-preview').value,/Japanese-style opening\/closing brackets/);
 assert.match(get('prompt-preview').value,/"Kissing"/);
 assert.equal(saves,0);
 const editor=get('style-editor');document.activeElement=editor;editor.value='Write slower, with more dialogue.';editor.listeners.input();
 assert.match(get('prompt-preview').value,/Write slower/);assert.equal(saves,0);
 editor.listeners.change();document.activeElement=null;
 assert.equal(settings.nsfwWritingStyle,'Write slower, with more dialogue.');assert.equal(saves,1);assert.equal(updates,1);
 settings.nsfwEnhance=false;controls.refresh();
 assert.doesNotMatch(get('prompt-preview').value,/Kissing|Write slower/);
 get('style-reset').listeners.click();assert.equal(settings.nsfwWritingStyle,'');
 assert.equal(editor.value,DEFAULT_ADULT_STYLE);assert.equal(saves,2);assert.equal(updates,2);
});
