// Expand short scope tokens in tools/css-src/*.src.css into the shipped sheets.
// K/D (Kinetic window/dock) and P/N (Pokémon chat themes) stand for long
// selectors, so the sources stay readable. `--check` fails if a sheet is stale.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
export const SHEETS=[
 {src:'tools/css-src/pokemon-kinetic.src.css',out:'styles/pokemon-kinetic.css',tokens:{K:'#roleforge-pokemon[data-pk-layout][data-pk-theme=kinetic]',D:'#roleforge-pokemon-dock[data-pk-theme=kinetic]'}},
 {src:'tools/css-src/chat-pokemon-theme.src.css',out:'styles/chat-pokemon-theme.css',tokens:{P:'.trpg-chat:is([data-rf-chat-theme="pokemon"],[data-rf-chat-theme="pokemon-dark"])',N:'.trpg-chat[data-rf-chat-theme="pokemon-dark"]'}},
];
// Tokens are replaced only as whole selector words after the header comment.
export function expand(source,tokens){
 const end=source.indexOf('*/')+2,head=source.slice(0,end).replace(/\n\s*[A-Z](?:\/[A-Z])? =[^\n]*\./gu,'').replace(/ [A-Z] = [^*]*?\./gu,''),body=source.slice(end);
 return head+body.replace(new RegExp('(?<![\\w-])('+Object.keys(tokens).join('|')+')(?=[\\s.\\[:{,>)*])','gu'),key=>tokens[key]);
}
export async function build({check=false}={}){
 const stale=[];
 for(const sheet of SHEETS){const text=expand(await readFile(new URL(sheet.src,root),'utf8'),sheet.tokens),target=new URL(sheet.out,root),current=await readFile(target,'utf8').catch(()=>'');
  if(current===text)continue;if(check)stale.push(sheet.out);else await writeFile(target,text);}
 return stale;
}
if(import.meta.url===`file://${process.argv[1]}`){const stale=await build({check:process.argv.includes('--check')});if(stale.length){console.error('Stale: '+stale.join(', ')+' (run node tools/build-scoped-css.mjs)');process.exit(1);}}
