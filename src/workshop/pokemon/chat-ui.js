// Pokémon speakers in the main chat. Frameless by design: no plate, border or
// background, so the header, narration and lines sit on whatever SillyTavern
// background or RoleForge theme surrounds them. Type colour is the only accent.
// Native RoleForge copy nodes are kept; only Pokémon-owned presentation changes.
import {isPokemonSpeaker} from './chat.js?v=0.95.0';
const make=(doc,tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const t=(th,en,language)=>language==='th'?th:en;
export const TYPE_COLORS={normal:'#a8a878',fire:'#f08030',water:'#6890f0',grass:'#78c850',electric:'#f8d030',ice:'#98d8d8',fighting:'#c03028',poison:'#a040a0',ground:'#e0c068',flying:'#a890f0',psychic:'#f85888',bug:'#a8b820',rock:'#b8a038',ghost:'#705898',dragon:'#7038f8',dark:'#705848',steel:'#b8b8d0',fairy:'#ee99ac',stellar:'#7163cd'};
const STATUS={burn:['ไหม้','BRN'],poison:['พิษ','PSN'],toxic:['พิษร้าย','PSN'],paralysis:['อัมพาต','PAR'],sleep:['หลับ','SLP'],freeze:['แข็ง','FRZ']};
function icon(doc,kind='ball'){
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','pkc-mark');
 const paths=kind==='speech'?['M7.9 20A9 9 0 1 0 4 16.1L2 22Z']:['M2 12h7','M15 12h7'];
 if(kind!=='speech'){const c=doc.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx','12');c.setAttribute('cy','12');c.setAttribute('r','10');svg.append(c);const d=doc.createElementNS(svg.namespaceURI,'circle');d.setAttribute('cx','12');d.setAttribute('cy','12');d.setAttribute('r','3');svg.append(d);}
 for(const d of paths){const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}
 return svg;
}
const typeColor=type=>TYPE_COLORS[type]||'#9aa7b4';
function paint(node,profile){const types=profile.pokemon?.types||[];node.style.setProperty('--speaker',profile.identityColor);node.style.setProperty('--pkc-type',typeColor(types[0]));node.style.setProperty('--pkc-type2',typeColor(types[1]||types[0]));}
export function pokemonSpeakerLabel(profile,doc=globalThis.document){
 const node=make(doc,'div','trpg-speaker-label pkc-speaker-label');node.append(icon(doc),make(doc,'span','',profile.pokemon.name));node.dataset.pokemonChat='label';paint(node,profile);return node;
}
export function pokemonSpeakerHeader(profile,{language='en',open=()=>{},document:doc=globalThis.document}={}){
 const p=profile.pokemon,button=make(doc,'button','trpg-header pkc-header');button.type='button';button.dataset.pokemonChat='header';button.dataset.pokemonUid=p.uid;button.dataset.roleforgeControl='pokemon';paint(button,profile);button.setAttribute('aria-label',t('เปิดข้อมูล ','Open ',language)+p.name);button.addEventListener('click',()=>open(p.uid));
 if(p.shiny)button.dataset.shiny='true';if(p.hp===0)button.dataset.fainted='true';
 // Art: a soft type-coloured light behind the Pokémon, never a frame.
 const art=make(doc,'span','pkc-art'),halo=make(doc,'span','pkc-halo'),img=make(doc,'img','pkc-image');let index=0;
 const next=()=>{const v=p.images[index++];if(!v){img.remove();const missing=make(doc,'span','pkc-art-missing');missing.append(icon(doc));missing.setAttribute('role','img');missing.setAttribute('aria-label',t('ไม่มีภาพฟอร์มนี้','Image unavailable for this form',language));art.append(missing);return;}img.dataset.mode=v.mode;img.dataset.animated=String(v.animated);img.classList.toggle('pkc-sprite-idle',p.motion&&!v.animated);img.src=v.url;};
 img.alt=p.speciesName+(p.form?' · '+p.form:'');img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',next);art.append(halo,img);next();
 if(p.shiny){const sparkle=make(doc,'span','pkc-shiny','✦');sparkle.setAttribute('aria-label','Shiny');sparkle.setAttribute('role','img');art.append(sparkle);}
 const main=make(doc,'span','pkc-main');
 const kicker=make(doc,'span','pkc-kicker'),ownerName=p.ownerKind==='wild'?t('ป่า','Wild',language):p.owner||t('ไม่ทราบเจ้าของ','Unknown owner',language);
 kicker.append(make(doc,'span','pkc-number','#'+String(p.speciesId).padStart(4,'0')));
 if(p.speciesName&&p.speciesName!==p.name)kicker.append(make(doc,'span','pkc-species',p.speciesName+(p.form?' · '+p.form:'')));
 const owner=make(doc,'span','pkc-owner');owner.append(make(doc,'span','pkc-owner-label',p.ownerKind==='wild'?'':t('เจ้าของ ','Trainer ',language)),make(doc,'span','pkc-owner-name',ownerName));kicker.append(owner);
 const nameRow=make(doc,'span','trpg-identity pkc-name-row'),name=make(doc,'strong','pkc-name',p.name),gender=make(doc,'span','pkc-gender',p.gender==='male'?'♂':p.gender==='female'?'♀':'');gender.dataset.gender=p.gender;gender.setAttribute('aria-label',({male:t('เพศผู้','Male',language),female:t('เพศเมีย','Female',language),genderless:t('ไร้เพศ','Genderless',language),unknown:t('ไม่ทราบเพศ','Unknown gender',language)})[p.gender]);nameRow.append(name,gender);
 const facts=make(doc,'span','pkc-facts');if(!p.speciesOnly)facts.append(make(doc,'span','pkc-level','Lv. '+(p.level??'—')));
 for(const type of p.types){const chip=make(doc,'span','pkc-type',type.toUpperCase());chip.style.setProperty('--pkc-chip',typeColor(type));facts.append(chip);}
 const status=p.hp===0?[t('หมดสภาพ','Fainted',language),'FNT']:STATUS[p.status];if(status){const badge=make(doc,'span','pkc-status',language==='th'?status[0]:status[1]);badge.title=status[0];facts.append(badge);}
 const vitals=make(doc,'span','pkc-vitals'),valid=p.hp!==null&&p.maxHp>0,ratio=valid?Math.max(0,Math.min(1,p.hp/p.maxHp)):0;
 vitals.dataset.hpTone=!valid?'unknown':ratio<=.2?'low':ratio<=.5?'mid':'high';
 const track=make(doc,'span','pkc-hp-track'),fill=make(doc,'span','pkc-hp-fill');fill.style.setProperty('--pkc-hp',String(ratio));
 if(valid){track.setAttribute('role','progressbar');track.setAttribute('aria-label','HP');track.setAttribute('aria-valuenow',String(p.hp));track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(p.maxHp));}
 track.append(fill);vitals.append(make(doc,'span','pkc-hp-label','HP'),track,make(doc,'span','pkc-hp-value',valid?p.hp+' / '+p.maxHp:'—'));
 // A species-only header (no individual in this chat) has no level or HP.
 main.append(kicker,nameRow,facts,...p.speciesOnly?[]:[vitals]);button.append(art,main);return button;
}
// Lines the author already wrapped in quotes keep theirs; others get “ ”.
const QUOTED=/^\s*["“”「『«‘']/u;
export function pokemonStoryBody(node,profile,kind){
 if(!isPokemonSpeaker(profile)||!['dialogue','narrative'].includes(kind))return node;
 node.dataset.pokemonChat=kind;paint(node,profile);
 if(node.classList.contains('trpg-unframed'))return node;
 const doc=node.ownerDocument,copy=node.querySelector(kind==='dialogue'?'.trpg-dialogue-copy':'.trpg-prose-copy');
 if(kind==='dialogue'&&copy&&QUOTED.test(copy.textContent||''))copy.dataset.pkcQuoted='true';
 const shell=make(doc,'span','pkc-'+kind+'-shell'),mark=make(doc,'span','pkc-body-mark');mark.setAttribute('aria-hidden','true');mark.append(icon(doc,kind==='dialogue'?'speech':'ball'));
 if(kind==='dialogue')shell.append(mark,make(doc,'span','pkc-voice',profile.pokemon?.name||''),copy);else shell.append(mark,copy);
 node.replaceChildren(shell);return node;
}
