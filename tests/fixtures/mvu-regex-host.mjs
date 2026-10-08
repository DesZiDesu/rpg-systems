// Pin actual upstream rules/layout; do not ship the third-party frontend bundle.
// The browser test uses a renderer contract adapter, not a live Helper install.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import vm from 'node:vm';
const run=promisify(execFile);
export const gameMakerRevision='46840f39ca006b22870507f155145fa6324d9aa2';
export const builderRevision='0ecf70bb53262091c5c41a40b3a9dff0830de2c2';
export async function mvuRegexHost(){
    const cache=process.env.MVU_REGEX_CACHE||join(tmpdir(),`roleforge-mvu-regex-${gameMakerRevision}`);
    await mkdir(cache,{recursive:true});
    async function source(name,url){
        const path=join(cache,name);try{return await readFile(path,'utf8');}catch{}
        const {stdout:body}=await run('curl',['--location','--fail','--silent','--show-error','--max-time','45',url],{maxBuffer:4*1024*1024});
        await writeFile(path,body);return body;
    }
    const [html,layoutText]=await Promise.all([
        source('game-maker.html',`https://raw.githubusercontent.com/KritBlade/MVU_Game_Maker/${gameMakerRevision}/dist/index.html`),
        source('layout-rpg.json',`https://raw.githubusercontent.com/KritBlade/MVU_Zod_StatusMenuBuilder/${builderRevision}/dist/layout-rpg.json`),
    ]);
    // Read only the embedded string literal; never execute the application.
    const prefix='JSON.parse(',start=html.indexOf(prefix+'`')+prefix.length;
    if(start<prefix.length)throw Error('Pinned MVU base-card literal not found');
    let end=start+1;
    for(;end<html.length;end++){
        if(html[end]==='\\'){end++;continue;}
        if(html[end]==='$'&&html[end+1]==='{')throw Error('MVU fixture must not evaluate template expressions');
        if(html[end]==='`')break;
    }
    if(end===html.length)throw Error('Unterminated MVU base-card fixture');
    const card=JSON.parse(vm.runInNewContext(html.slice(start,end+1),Object.create(null),{timeout:1000}));
    const rules=card.extensions.regex_scripts.filter(rule=>!rule.scriptName.startsWith('[Love]')).map(rule=>({...rule,scriptName:rule.scriptName.replace('[RPG] ', '')}));
    return {rules,layout:JSON.parse(layoutText)};
}
