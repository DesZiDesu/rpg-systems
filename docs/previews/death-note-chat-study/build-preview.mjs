import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
const dir=dirname(fileURLToPath(import.meta.url));
const artifacts=process.env.DN_STUDY_OUTPUT||'/workspace/artifacts/death-note-theme-study';
await mkdir(resolve(dir,'screenshots'),{recursive:true});
await mkdir(resolve(dir,'validation'),{recursive:true});
for(const file of await readdir(artifacts)){
 if(/^(gallery-|native-)(?!failed).*\.png$/.test(file))await copyFile(resolve(artifacts,file),resolve(dir,'screenshots',file));
 if(/^(gallery|native)-validation\.json$/.test(file))await copyFile(resolve(artifacts,file),resolve(dir,'validation',file));
}
for(const name of ['gallery','native']){const r=JSON.parse(await readFile(resolve(dir,'validation',name+'-validation.json'),'utf8'));if(!r.pass)throw Error(name+' checks have not passed');}
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}});
 for(const theme of ['notebook','casefile']){
  const panels=(await Promise.all(['npc','user','shinigami'].map(async(actor,i)=>'<section><h2>'+['NPC','USER','SHINIGAMI'][i]+'</h2><img alt="'+actor+' · 390px" src="data:image/png;base64,'+(await readFile(resolve(dir,'screenshots','gallery-'+theme+'-mobile-'+actor+'.png'))).toString('base64')+'"></section>'))).join('');
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>html,body{margin:0;background:#0c0d0e;color:#d7ccb7;font-family:Arial,sans-serif}main{padding:28px 20px 22px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #6b5e4240;padding:0 4px 22px;margin-bottom:20px}header strong{font:400 25px/1.4 Georgia,serif}header span{font:400 11px/1.5 Arial,sans-serif;color:#9f9179;letter-spacing:1.5px}article{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:start}h2{font:400 10px/1.5 Arial,sans-serif;letter-spacing:1.5px;color:#a4947b;margin:0 0 8px 2px}img{display:block;width:100%;height:auto}</style></head><body><main><header><strong>'+(theme==='notebook'?'A · The Black Notebook':'B · Midnight Casefile')+'</strong><span>MOBILE / 390px / TOUCH PREVIEW</span></header><article>'+panels+'</article></main></body></html>');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.locator('main').screenshot({path:resolve(dir,'screenshots','mobile-'+theme+'-comparison.png'),animations:'disabled'});
 }
}finally{await browser.close();}
let css=await readFile(resolve(dir,'theme.css'),'utf8');
const fontUrls=[...css.matchAll(/url\('([^']+)'\)/g)];
for(const [,url] of fontUrls){const data=(await readFile(resolve(dir,url))).toString('base64');css=css.replace("url('"+url+"')",'url("data:font/woff2;base64,'+data+'")');}
css+='\n'+await readFile(resolve(dir,'gallery.css'),'utf8');
const seal=(await readFile(resolve(dir,'../../../assets/workshop/death-note/rules-seal.png'))).toString('base64');
let themeSource=(await readFile(resolve(dir,'theme.js'),'utf8')).replaceAll('export ','');
let gallerySource=(await readFile(resolve(dir,'gallery.js'),'utf8')).replace(/^import .*;\n/,'').replace(/new URL\('\.\.\/\.\.\/\.\.\/assets\/workshop\/death-note\/rules-seal\.png',import.meta.url\)\.href/,JSON.stringify('data:image/png;base64,'+seal));
const nativeShots={};for(const theme of ['notebook','casefile'])for(const device of ['desktop','mobile'])nativeShots[theme+'-'+device]='data:image/png;base64,'+(await readFile(resolve(dir,'screenshots','native-'+theme+'-'+device+'-shinigami.png'))).toString('base64');
const needle="a.href='./screenshots/native-'+theme+'-'+device+'-shinigami.png';";
if(!gallerySource.includes(needle))throw Error('Native image link template changed');
gallerySource=gallerySource.replace(needle,"a.href=nativeShots[theme+'-'+device];");
let html=await readFile(resolve(dir,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="./theme.css"><link rel="stylesheet" href="./gallery.css">','<style>'+css+'</style>');
html=html.replace('<script type="module" src="./gallery.js"></script>','<script type="module">'+themeSource+'\nconst nativeShots='+JSON.stringify(nativeShots)+';\n'+gallerySource+'</script>');
await writeFile(resolve(dir,'Death-Note-Chat-Themes-Preview.html'),html);
console.log('Built offline preview:',Math.round(Buffer.byteLength(html)/1024)+' KB; 2 designs; desktop/mobile screenshots.');
