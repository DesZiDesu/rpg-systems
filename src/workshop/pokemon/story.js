import {normalizeWeather} from './mechanics.js?v=0.90.0';
import {sha256} from '../../vendor/js-sha256/index.js?v=0.90.0';
const regions=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
const known=(proof,canonical,e)=>proof.toLocaleLowerCase().includes(canonical.toLocaleLowerCase())||typeof e.displayName==='string'&&e.displayName.length>=2&&e.displayName.length<=100&&/[\u0e00-\u0e7f]/u.test(e.displayName)&&proof.includes(e.displayName);
const negative=/ไม่พบ|ไม่ได้รับ|สมมติ|\b(?:not|would|could|if|might|will)\b|กำลังจะ|จะได้รับ/iu;
function parseBlock(value){try{return JSON.parse(value);}catch{let quote=false,escape=false,out='';for(const ch of value){if(ch==='"'&&!escape)quote=!quote;out+=quote&&/[\n\r\t]/u.test(ch)?' ':ch;if(ch==='\\'&&!escape)escape=true;else escape=false;}const data=JSON.parse(out);const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k.trim(),clean(x)])):v;return clean(data);}}
function hasQuantity(proof,quantity){if(new RegExp('(?<!\\d)'+quantity+'(?!\\d)','u').test(proof))return true;const en=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'][quantity],th=['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ'][quantity];return Boolean(en&&new RegExp('\\b'+en+'\\b','iu').test(proof)||th&&proof.includes(th));}
const handover=/(?:คุณได้รับ|คุณรับ|มอบให้คุณ|ยื่นให้คุณ|ส่งมอบให้คุณ|you (?:have |had |just |have just )*(?:received|obtained|accepted|picked up)|(?:hand(?:s|ed|ing)?|giv(?:e|es|ing)|gav(?:e)|grant(?:s|ed|ing)?) you)/iu;
function recoverReceipt(visible,e,dex){const item=dex.items?.get(e.item);if(!item)return'';return visible.split(/(?<=[.!?。])\s+|\n/u).find(sentence=>sentence.length<=600&&!negative.test(sentence)&&known(sentence,item.name,e)&&hasQuantity(sentence,Number(e.quantity))&&handover.test(sentence))||'';}
export function parsePokemonStory(source,dex){
 const raw=String(source||'').replace(/<(think|analysis|thinking|reasoning)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/giu,''),visible=raw.replace(/<!--[\s\S]*?-->/gu,'').replace(/<rf-pokemon\b[^>]*>[\s\S]*?<\/rf-pokemon>/giu,'').replace(/<[^>]+>/gu,' ').replace(/\s+/gu,' '),events=[],rejected=[];
 const blocks=[...raw.matchAll(/<!--\s*roleforge_pokemon\s*:\s*([\s\S]*?)-->/gu),...raw.matchAll(/<rf-pokemon\b[^>]*>([\s\S]*?)<\/rf-pokemon>/giu)].sort((a,b)=>a.index-b.index);
 for(const m of blocks){let data;try{data=parseBlock(m[1]);}catch{rejected.push('invalid-json');continue;}
 if(!data||typeof data!=='object'){rejected.push('invalid-schema');continue;}
 for(const[i,e]of(Array.isArray(data.events)?data.events:[]).slice(0,8).entries()){
  if(!e||typeof e!=='object'||Array.isArray(e)){rejected.push('invalid-event');continue;}
  let proof=String(e.evidence||'').trim().replace(/\s+/gu,' ');const modern=Number(data.version)>=2,version=Number(data.version)>=3?3:modern?2:1;
  const reject=reason=>rejected.push(reason);if(e.type==='item'&&modern&&!visible.includes(proof)){const recovered=recoverReceipt(visible,e,dex);if(recovered)proof=recovered;}
  if(proof.length<8||proof.length>600||!visible.includes(proof)){reject('missing-visible-evidence');continue;}
  if(/ไม่พบ|ไม่ได้รับ|สมมติ|\b(?:not|would|could|if|might)\b|กำลังจะ|จะได้รับ/iu.test(proof)){reject('hypothetical-or-negative');continue;}
  const common={id:'story-'+m.index+'-'+i+'-'+(e.item||e.key||e.speciesId||e.weather),source:'story',engine:version,offset:m.index+m[0].length};
  if(e.type==='weather'&&version>=3){if(!['clear','rain','sun','sand','hail','snow'].includes(e.weather)||normalizeWeather(proof)!==e.weather||!/\byou\b|\byour\b|คุณ|ผู้เล่น/iu.test(proof)||!/ฝน|แดด|หิมะ|ลูกเห็บ|พายุทราย|อากาศ|rain|sunlight|sunny|snow|hail|sandstorm|weather|clear sky/iu.test(proof)){reject('unproven-weather');continue;}events.push({...common,type:'weather',weather:e.weather});continue;}
  if(e.type==='item'&&modern){const item=dex.items?.get(e.item),quantity=Number(e.quantity);
   if(!item||!Number.isInteger(quantity)||quantity<1||quantity>9999||!known(proof,item.name,e)||!hasQuantity(proof,quantity)||!/(?:ได้รับ|มอบ|ส่งมอบ|ยื่นให้|เก็บได้|รับรางวัล|received|obtained|handed|hands|handing|gave|gives|giving|granted|granting|gained|picked up)/iu.test(proof)||/\bwill\b/iu.test(proof)){reject('unproven-item-receipt');continue;}
   if(version>=3&&!(typeof e.receipt==='string'&&e.receipt.trim()&&e.receipt.length<=120)){reject('missing-receipt-id');continue;}
   events.push({...common,type:'grant-item',item:item.id,quantity,receipt:typeof e.receipt==='string'&&e.receipt.length<=120?'id:'+e.receipt:'proof:'+sha256(item.id+':'+quantity+':'+proof)});continue;
  }
  const p=dex.get(e.key||e.speciesId);if(!p||!known(proof,p.name,e)){reject('unproven-species');continue;}
  if(e.type==='quest'&&modern){const place=String(e.place||'').trim();if(!(p.legendary||p.mythical)||place.length<2||place.length>160||!proof.includes(place)||!/quest|mission|task|ภารกิจ|มอบหมาย/iu.test(proof)){reject('unproven-quest');continue;}events.push({...common,type:'quest-offer',speciesId:p.speciesId,place,region:regions.includes(e.region)?e.region:undefined,wins:Math.max(0,Math.min(20,Number(e.wins)||0))});continue;}
  if(e.type!=='encounter'||!/ปรากฏ|พบ|เจอ|โผล่|wild|appear|encounter/iu.test(proof)||modern&&!/ตรงหน้า|ข้างคุณ|คุณพบ|คุณเจอ|ต่อหน้าคุณ|\byou\b|\byour\b/iu.test(proof)){reject('not-a-player-encounter');continue;}
  events.push({...common,type:'encounter',key:p.key,level:Math.max(1,Math.min(100,Number(e.level)||1)),place:String(e.place||''),context:{place:String(e.place||'')}});
 }
 }
 // Recover only an unambiguous present-tense wild encounter if the model omitted metadata.
 // No guessing from dialogue, future plans, NPC scenes, or unnamed species.
 if(!events.some(e=>e.type==='encounter')){
  const sentences=visible.split(/(?<=[.!?。])\s+/u);
  for(const sentence of sentences){
   if(sentence.length>300||negative.test(sentence)||/["“”]/u.test(sentence))continue;
   const hit=sentence.match(/\b(?:a |the )?wild ([a-z][a-z0-9 .'-]{1,35}?) (?:appears|emerges|shows up) (?:in front of|beside|near|before) you\b/iu)||sentence.match(/\byou (?:encounter|meet|see|spot) (?:a |the )wild ([a-z][a-z0-9 .'-]{1,35}?)(?:[.!?]|$)/iu);
   if(!hit)continue;const name=hit[1].trim().toLocaleLowerCase(),matches=[...dex.bySpecies.values()].filter(p=>p.name.toLocaleLowerCase()===name);
   if(matches.length===1){const p=matches[0];events.push({id:'natural-'+sha256(sentence).slice(0,24),source:'story',engine:3,offset:raw.length,type:'encounter',key:p.key,level:3,place:'',context:{place:''}});break;}
  }
 }
 return{events,rejected};
}
