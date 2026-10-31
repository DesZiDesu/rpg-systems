import {TRANSFORMATION_SYSTEMS,TERA_TYPES,megaForms} from './transformations.js?v=0.97.1';
import {normalizeWeather} from './mechanics.js?v=0.97.1';
import {sha256} from '../../vendor/js-sha256/index.js?v=0.97.1';
import {buyable,TRAINER_CLASSES} from './shop.js?v=0.97.1';
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
  let proof=String(e.evidence||'').trim().replace(/\s+/gu,' ');const modern=Number(data.version)>=2,version=Number(data.version)>=5?5:Number(data.version)>=4?4:Number(data.version)>=3?3:modern?2:1;
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
  // Protocol 5: a named NPC's fixed team. The NPC must be in the visible scene;
  // members need not be shown yet, but a known roster only grows from members
  // the evidence names.
  if(e.type==='roster'&&version>=5){
   const name=String(e.name||'').trim(),team=(Array.isArray(e.team)?e.team:[]).slice(0,6).map(mon=>{const p=dex.get(mon?.key||mon?.speciesId),level=Number(mon?.level);return p&&!p.battleOnly&&Number.isInteger(level)&&level>=1&&level<=100?{key:p.key,level,proven:known(proof,p.name,mon),...typeof mon.nickname==='string'&&mon.nickname.trim()?{nickname:mon.nickname.trim().slice(0,36)}:{}}:null;}).filter(Boolean);
   if(name.length<2||name.length>80||!proof.includes(name)||!team.length){reject('unproven-roster');continue;}
   events.push({...common,id:'story-'+m.index+'-'+i+'-roster',type:'roster',name,team});continue;
  }
  // Protocol 5: the player is inside a shop now. Names and items come from the
  // story; prices never do. Specialty shops list catalogue items only.
  if(e.type==='shop'&&version>=5){
   const name=String(e.name||'').trim(),place=String(e.place||'').trim(),kind=e.kind==='specialty'?'specialty':'mart';
   if(name.length<2||name.length>80||place.length<2||place.length>120||!(proof.includes(name)||proof.includes(place))||!/shop|store|mart|market|boutique|counter|ร้าน|ตลาด|ห้าง|เคาน์เตอร์/iu.test(proof)){reject('unproven-shop');continue;}
   const items=kind==='specialty'?[...new Set((Array.isArray(e.items)?e.items:[]).map(String))].filter(id=>buyable(dex,id)).slice(0,24):[];
   if(kind==='specialty'&&!items.length){reject('empty-shop');continue;}
   events.push({...common,id:'story-'+m.index+'-'+i+'-shop',type:'shop-open',name,place,kind,...items.length?{items}:{}});continue;
  }
  if(e.type==='trainer'&&version>=3){
   const open=version>=5,name=String(e.name||'').trim(),place=String(e.place||'').trim(),team=open&&e.team===undefined?[]:e.team;
   if(name.length<2||name.length>80||!proof.includes(name)||!/คุณ|ผู้เล่น|\byou\b|\byour\b/iu.test(proof)||!(open?/ท้า|ประลอง|ต่อสู้|สู้|ดวล|แบทเทิล|challenge|battle|fight|duel|spar/iu:/ท้า|ประลอง|ต่อสู้|challenge|battle/iu).test(proof)||!open&&(!place||!proof.includes(place))||place.length>160||!Array.isArray(team)||!open&&team.length<1||team.length>6){reject('unproven-trainer');continue;}
   const equipment={};let badEquipment=false;if(e.equipment!==undefined){if(!e.equipment||typeof e.equipment!=='object'||Array.isArray(e.equipment)||Object.keys(e.equipment).length>8)badEquipment=true;else for(const[id,n]of Object.entries(e.equipment)){const item=dex.items.get(id);if(!item||!Number.isInteger(n)||n<1||n>10||!proof.toLowerCase().includes(item.name.toLowerCase())){badEquipment=true;break;}equipment[id]=n;}}
   if(badEquipment){reject('unproven-trainer-equipment');continue;}
   const resolved=team.map(mon=>{const p=dex.get(mon?.key||mon?.speciesId),level=Number(mon?.level);if(!p||p.battleOnly||!Number.isInteger(level)||level<1||level>100||!open&&!known(proof,p.name,mon))return null;const entry={key:p.key,level,...open?{proven:known(proof,p.name,mon)}:{}};
    if(mon.heldItem!==undefined){const item=dex.items.get(mon.heldItem);if(!item||!proof.toLowerCase().includes(item.name.toLowerCase()))return null;entry.heldItem=item.id;}
    if(mon.teraType!==undefined){if(!TERA_TYPES.includes(mon.teraType)||!proof.toLowerCase().includes(mon.teraType))return null;entry.teraType=mon.teraType;}
    if(mon.transform!==undefined){if(version<4||!mon.transform||!['mega','primal','ultra','dynamax','gigantamax','tera','zmove'].includes(mon.transform.kind))return null;const kind=mon.transform.kind,key=String(mon.transform.key||'');
     const form=dex.get(key);if(['mega','primal','ultra','gigantamax'].includes(kind)){if(!form||form.speciesId!==p.speciesId||!form.form||!proof.toLowerCase().includes(form.form.toLowerCase()))return null;if(kind==='mega'&&!megaForms(dex,{key:p.key}).some(f=>f.key===key))return null;}
     else if(!proof.toLowerCase().includes(({tera:'tera',zmove:'z-move',dynamax:'dynamax'})[kind]))return null;
     entry.transform={kind,...key?{key}:{}};
    }return entry;
   });
   if(resolved.some(x=>!x)){reject('unproven-trainer-team');continue;}
   // Immediate battles need an actual start in the visible player scene. A plain
   // invitation (including one mislabeled by the model) remains an offer.
   const started=open&&/\b(?:sends?|sent|throws?|releases?) out\b|\baccepts? (?:your|the) (?:challenge|battle)\b|\bchallenge accepted\b|\blet'?s (?:battle|go)\b|\bbattle is on\b|ส่ง.{0,40}ออกมา|ปล่อย.{0,40}ออกมา|มา(?:ประลอง|สู้)กัน/iu.test(proof);
   const immediate=e.mode==='immediate'&&!/\bwill\b|จะเริ่ม|จะบังคับ|จะรับคำท้า/iu.test(proof)&&(started||/\b(?:battle (?:begins|starts)|forces? you (?:into|to) (?:a )?battle|attacks? you|you accept|you accepted)\b|เริ่ม(?:การ)?(?:ต่อสู้|ประลอง)|(?:การต่อสู้|การประลอง)เริ่ม|บังคับ(?:ให้)?คุณ(?:ต้อง)?(?:ต่อสู้|ประลอง)|คุณ(?:ตอบ)?รับคำท้า/iu.test(proof));
   const partner=typeof e.partner==='string'?e.partner.trim().slice(0,60):'',rank=TRAINER_CLASSES.includes(e.class)&&({'gym-leader':/gym|leader|ยิม/iu,'elite-four':/elite|จตุรเทพ/iu,champion:/champion|แชมป์/iu})[e.class].test(proof)?e.class:'';events.push({...common,type:'trainer-offer',trainerKey:'npc-'+sha256(name.toLocaleLowerCase()).slice(0,20),name,place,team:resolved,equipment,...rank?{class:rank}:{},...immediate?{mode:'immediate'}:{},...partner&&partner.toLocaleLowerCase()!==name.toLocaleLowerCase()&&proof.toLowerCase().includes(partner.toLowerCase())?{partner}:{}});continue;
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
