// Downloads a pinned SillyTavern formatting implementation into an external
// cache for browser integration tests. Upstream code is not shipped in RoleForge.
// Only imports and host dependencies are adapted; engine/formatting/hook bodies
// and the actual Showdown, DOMPurify and ST sanitizer hooks stay unchanged.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
export const upstreamRevision='06bde939fb1e9c4c8d8641d810f0a916b5bce127';
export async function stRegexHost(){
    const cache=process.env.ST_REGEX_CACHE || join(tmpdir(),`roleforge-st-regex-${upstreamRevision}`);
    await mkdir(cache,{recursive:true});
    async function source(name,url){
        const path=join(cache,name);
        try{return await readFile(path,'utf8');}catch{}
        // curl honors the environment's configured network proxy/CA trust.
        const {stdout:body}=await run('curl',['--location','--fail','--silent','--show-error','--max-time','45',url],{maxBuffer:4*1024*1024});
        await writeFile(path,body);return body;
    }
    const base=`https://raw.githubusercontent.com/SillyTavern/SillyTavern/${upstreamRevision}/public/`;
    const [engine,formatter,script,chats,showdown,purify,css]=await Promise.all([
        source('engine.js',base+'scripts/extensions/regex/engine.js'),
        source('formatter.js',base+'scripts/message-formatter.js'),source('script.js',base+'script.js'),source('chats.js',base+'scripts/chats.js'),
        source('showdown.js','https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js'),
        source('purify.js','https://cdn.jsdelivr.net/npm/dompurify@3.4.2/dist/purify.min.js'),
        source('css.js','https://cdn.jsdelivr.net/npm/@adobe/css-tools@4.4.4/dist/umd/adobe-css-tools.js'),
    ]);
    const functionBody=script.slice(script.indexOf('export function messageFormatting('),script.indexOf('\n/**',script.indexOf('export function messageFormatting(')));
    const styles=chats.slice(chats.indexOf('export function encodeStyleTags('),chats.indexOf('\n/**\n * Class to manage style preferences',chats.indexOf('export function encodeStyleTags(')));
    const sanitizer=chats.slice(chats.indexOf('export function addDOMPurifyHooks('));
    const hooks=sanitizer.slice(0,sanitizer.indexOf('\n}\n')+3);
    const adapter=`
import {getRegexedString,regex_placement} from './engine.js';
import {MessageFormatter} from './formatter.js';
export let characters=[],this_chid=0,extension_settings={},chat=[];
let host;
export const lodash={set:(obj,path,value)=>{let target=obj;for(const key of path.slice(0,-1))target=target[key]||=( {} );target[path.at(-1)]=value;}};
export const saveSettingsDebounced=()=>{},writeExtensionField=()=>{};
export const getPresetManager=()=>host?.getPresetManager?.();
export function substituteParams(value,options={}){return String(value).replace(/{{char}}/gi,options.name2Override||host?.characters?.[host.characterId]?.name||'Narrator').replace(/{{user}}/gi,host?.name1||'Nova');}
export function substituteParamsExtended(value,_options={},transform){return substituteParams(value).replace(/{{(?:char|user)}}/g,text=>transform?transform(text):text);}
export function regexFromString(value){try{const match=String(value).match(/^\\/(.*)\\/([a-z]*)$/s);return match?new RegExp(match[1],match[2]):new RegExp(value);}catch{return null;}}
const DOMPurify=window.DOMPurify,converter=new window.showdown.Converter({tables:true,simpleLineBreaks:true}),css=window.cssTools;
const COMMENT_NAME_DEFAULT='Note',systemUserName='System',fixMarkdown=text=>text,canUseNegativeLookbehind=()=>true;
const escapeRegex=text=>text.replace(/[.*+?^\u0024{}()|[\u005d\\\\]/g,'\\\\\u0024&'),escapeHtml=text=>text.replaceAll('<','&lt;').replaceAll('>','&gt;');
export const power_user={reasoning:{prefix:'',suffix:''},encode_tags:false,allow_name2_display:true};
let mesForShowdownParse;
const isExternalMediaAllowed=()=>true,getCurrentEntityId=()=>0,accountStorage={getItem:()=>null,setItem:()=>{}},toastr=window.toastr,t=(parts)=>parts[0];
${styles}
${hooks}
addDOMPurifyHooks();
${functionBody}
export function attachHost(value){host=value;value.extensionSettings.disabledExtensions||=[];characters=value.characters;this_chid=value.characterId;extension_settings=value.extensionSettings;chat=value.chat;
 value.messageFormatter=MessageFormatter;value.messageFormatting=(...args)=>{chat=value.chat;characters=value.characters;this_chid=value.characterId;return messageFormatting(...args);};
 value.updateMessageBlock=async(id,message)=>{const node=document.querySelector('#chat .mes[mesid="'+id+'"] .mes_text');if(node)node.innerHTML=value.messageFormatting(message.extra?.display_text??message.mes,message.name,message.is_system,message.is_user,id);};
 window.stRegex={power_user,MessageFormatter,getRegexedString,regex_placement,revision:'${upstreamRevision}'};
}
`;
    return new Map([
        ['/st-regex/engine.js',engine.replace(/^import .*;\n/gm,'').replace(/^\n/,"import {characters,saveSettingsDebounced,substituteParams,substituteParamsExtended,this_chid,extension_settings,writeExtensionField,getPresetManager,regexFromString,lodash} from './adapter.js';\n")],
        ['/st-regex/formatter.js',formatter.replace("from '../script.js'","from './adapter.js'")],
        ['/st-regex/adapter.js',adapter],['/st-regex/showdown.js',showdown],['/st-regex/purify.js',purify],['/st-regex/css.js',css],
    ]);
}
