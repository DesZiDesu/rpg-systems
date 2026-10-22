import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
const dir=dirname(fileURLToPath(import.meta.url)),artifacts=process.env.DN_QUIET_OUTPUT||'/workspace/artifacts/death-note-quiet-ink';
await mkdir(resolve(dir,'screenshots'),{recursive:true});await mkdir(resolve(dir,'validation'),{recursive:true});
for(const name of ['gallery','native']){const r=JSON.parse(await readFile(resolve(artifacts,name+'-validation.json'),'utf8'));if(!r.pass)throw Error(name+' validation has not passed');await copyFile(resolve(artifacts,name+'-validation.json'),resolve(dir,'validation',name+'-validation.json'));}
for(const file of await readdir(artifacts))if(/^(desktop|mobile|native)-.*\.png$/.test(file))await copyFile(resolve(artifacts,file),resolve(dir,'screenshots',file));
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const p=await browser.newPage({viewport:{width:804,height:1000}});
 const image=async file=>'data:image/png;base64,'+(await readFile(resolve(dir,'screenshots',file))).toString('base64');
 const pair='<img alt="Voice off" src="'+await image('mobile-voice-off-shinigami.png')+'"><img alt="Voice on" src="'+await image('mobile-voice-on-shinigami.png')+'">';
 await p.setContent('<!doctype html><html><head><style>html,body{margin:0;background:#101010}main{display:grid;grid-template-columns:390px 390px;gap:24px;align-items:start}img{display:block;width:390px;height:auto}</style></head><body><main>'+pair+'</main></body></html>');await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await p.locator('main').screenshot({path:resolve(dir,'screenshots','mobile-voice-comparison.png'),animations:'disabled'});
}finally{await browser.close();}
let css=await readFile(resolve(dir,'theme.css'),'utf8');for(const[,url]of [...css.matchAll(/url\('([^']+)'\)/g)])css=css.replace("url('"+url+"')",'url("data:font/woff2;base64,'+(await readFile(resolve(dir,url))).toString('base64')+'")');css+='\n'+await readFile(resolve(dir,'gallery.css'),'utf8');
const nativeShots={};for(const device of ['desktop','mobile'])for(const voice of ['off','on'])nativeShots[device+'-'+voice]='data:image/png;base64,'+(await readFile(resolve(dir,'screenshots','native-'+device+'-voice-'+voice+'.png'))).toString('base64');
const theme=(await readFile(resolve(dir,'theme.js'),'utf8')).replaceAll('export ','');let gallery=(await readFile(resolve(dir,'gallery.js'),'utf8')).replace(/^import .*;\n/,'');const needle="a.href='./screenshots/native-'+device+'-voice-'+voice+'.png';";if(!gallery.includes(needle))throw Error('Native image template changed');gallery=gallery.replace(needle,"a.href=nativeShots[device+'-'+voice];");
let html=await readFile(resolve(dir,'index.html'),'utf8');html=html.replace('<link rel="stylesheet" href="./theme.css"><link rel="stylesheet" href="./gallery.css">','<style>'+css+'</style>');html=html.replace('<script type="module" src="./gallery.js"></script>','<script type="module">'+theme+'\nconst nativeShots='+JSON.stringify(nativeShots)+';\n'+gallery+'</script>');await writeFile(resolve(dir,'Death-Note-Refined-Preview.html'),html);console.log('Built refined offline preview:',Math.round(Buffer.byteLength(html)/1024),'KB; Voice defaults off.');
