// The approved League Circuit design. Native RoleForge copy nodes and theme
// font selectors are retained; only Pokémon-owned presentation is decorated.
import {isPokemonSpeaker} from './chat.js?v=0.91.0';
const make=(doc,tag,cls,text)=>{const node=doc.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const t=(th,en,language)=>language==='th'?th:en;
function icon(doc,kind='ball'){
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','pkc-mark');
 const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',kind==='speech'?'M7 8h26v19H21l-9 7v-7H7ZM13 15h14m-14 6h9':'M35 20a15 15 0 1 1-30 0 15 15 0 0 1 30 0ZM5 20h9m12 0h9M26 20a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z');svg.append(path);return svg;
}
export function pokemonSpeakerLabel(profile,doc=globalThis.document){
 const node=make(doc,'div','trpg-speaker-label pkc-speaker-label');node.append(icon(doc),make(doc,'span','',profile.pokemon.name));node.dataset.pokemonChat='label';node.style.setProperty('--speaker',profile.identityColor);return node;
}
export function pokemonSpeakerHeader(profile,{language='en',open=()=>{},document:doc=globalThis.document}={}){
 const p=profile.pokemon,button=make(doc,'button','trpg-header pkc-header');button.type='button';button.dataset.pokemonChat='header';button.dataset.pokemonUid=p.uid;button.dataset.roleforgeControl='pokemon';button.style.setProperty('--speaker',profile.identityColor);button.setAttribute('aria-label',t('เปิดข้อมูล ','Open ',language)+p.name);button.addEventListener('click',()=>open(p.uid));
 const frame=make(doc,'span','pkc-plate'),cap=make(doc,'span','pkc-cap'),lamps=make(doc,'span','pkc-lamps');for(let i=0;i<3;i++)lamps.append(make(doc,'i',''));cap.append(lamps,make(doc,'span','pkc-number','#'+String(p.speciesId).padStart(4,'0')),icon(doc));
 const hero=make(doc,'span','pkc-hero'),identity=make(doc,'span','pkc-identity'),nameRow=make(doc,'span','trpg-identity pkc-name-row'),name=make(doc,'strong','pkc-name',p.name),gender=make(doc,'span','pkc-gender',p.gender==='male'?'♂':p.gender==='female'?'♀':p.gender==='genderless'?'◇':'—');gender.dataset.gender=p.gender;gender.setAttribute('aria-label',({male:t('เพศผู้','Male',language),female:t('เพศเมีย','Female',language),genderless:t('ไร้เพศ','Genderless',language),unknown:t('ไม่ทราบเพศ','Unknown gender',language)})[p.gender]);nameRow.append(name,gender);
 const facts=make(doc,'span','pkc-facts');facts.append(make(doc,'span','pkc-level','Lv. '+(p.level??'—')));for(const type of p.types)facts.append(make(doc,'span','pkc-type',type.toUpperCase()));identity.append(nameRow,facts);
 const art=make(doc,'span','pkc-art'),ring=make(doc,'span','pkc-ring'),img=make(doc,'img','pkc-image');let index=0;const next=()=>{const v=p.images[index++];if(!v){img.remove();const missing=make(doc,'span','pkc-art-missing','—');missing.setAttribute('aria-label',t('ไม่มีภาพฟอร์มนี้','Image unavailable for this form',language));art.append(missing);return;}img.dataset.mode=v.mode;img.dataset.animated=String(v.animated);img.classList.toggle('pkc-sprite-idle',p.motion&&v.mode==='sprite'&&!v.animated);img.src=v.url;};img.alt=p.speciesName+(p.form?' · '+p.form:'');img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',next);art.append(ring,img);next();hero.append(identity,art);
 const vitals=make(doc,'span','pkc-vitals'),owner=make(doc,'span','pkc-owner'),ownerName=p.ownerKind==='wild'?t('ป่า · ไม่มีเจ้าของ','Wild · unowned',language):p.owner||t('ไม่ทราบ','Unknown',language);owner.append(make(doc,'span','pkc-owner-label',t('เจ้าของ','Owner',language)),make(doc,'span','pkc-owner-name',ownerName));
 const hp=make(doc,'span','pkc-hp'),hpRow=make(doc,'span','pkc-hp-row'),valid=p.hp!==null&&p.maxHp>0;hpRow.append(make(doc,'span','','HP'),make(doc,'span','pkc-hp-value',valid?p.hp+' / '+p.maxHp:'—'));const track=make(doc,'span','pkc-hp-track'),fill=make(doc,'span','pkc-hp-fill');fill.style.width=valid?Math.min(100,p.hp/p.maxHp*100)+'%':'0%';vitals.dataset.hpTone=!valid?'unknown':p.hp/p.maxHp<=.2?'low':p.hp/p.maxHp<=.5?'mid':'high';if(valid){track.setAttribute('role','progressbar');track.setAttribute('aria-label','HP');track.setAttribute('aria-valuenow',String(p.hp));track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(p.maxHp));}track.append(fill);hp.append(hpRow,track);vitals.append(owner,hp);frame.append(cap,hero,vitals,make(doc,'span','pkc-track'));button.append(frame);return button;
}
export function pokemonStoryBody(node,profile,kind){
 if(!isPokemonSpeaker(profile)||!['dialogue','narrative'].includes(kind))return node;
 node.dataset.pokemonChat=kind;node.style.setProperty('--speaker',profile.identityColor);
 if(node.classList.contains('trpg-unframed'))return node;
 const doc=node.ownerDocument,copy=node.querySelector(kind==='dialogue'?'.trpg-dialogue-copy':'.trpg-prose-copy'),shell=make(doc,'span','pkc-'+kind+'-shell'),mark=make(doc,'span','pkc-body-mark');mark.setAttribute('aria-hidden','true');mark.append(icon(doc,kind==='dialogue'?'speech':'ball'));shell.append(mark,copy,make(doc,'span','pkc-body-rule'));node.replaceChildren(shell);return node;
}
