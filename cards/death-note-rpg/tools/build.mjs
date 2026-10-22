import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {CANON_NAME_SPELLINGS} from '../../../src/workshop/death-note/canon-spellings.js';
import {MAJOR_CHARACTERS} from '../data/major-characters.mjs';
import {SUPPORTING} from '../data/supporting-characters.mjs';
import {MINOR} from '../data/minor-characters.mjs';
import {ROUTES,PACK_ID,campaignTemplates} from '../data/campaigns.mjs';
import {routesFor,makeVersions} from '../data/versions.mjs';
import {LORE} from '../data/lore.mjs';
import {encodeInlineFiles,decodeInlineFiles} from '../../../src/world-pack-inline.js';
import {validateWorldManifest,validateWorldIndexes} from '../../../src/world-pack-core.js';
import {validateStoryPack,storyEligibility,storyFlagKey} from '../../../src/story-core.js';
import {validatePresetConfig} from '../../../src/world-presets.js';
import {embeddedPortraitBlob} from '../../../src/embedded-portrait.js';
import {normalizeNpcAlternates,alternatePortraitRecord} from '../../../src/npc-alternates.js';
import {cardPng,readCardPng} from './png-card.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),dest=process.env.DN_CARD_OUT||'/workspace/artifacts/death-note-rpg/download';
await mkdir(dest,{recursive:true});await mkdir(path.join(root,'build'),{recursive:true});
const utf8=new TextEncoder(),hash=value=>createHash('sha256').update(value).digest('hex'),slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),json=v=>JSON.stringify(v)+'\n';
const portraitRows=JSON.parse(await readFile(path.join(root,'data/portrait-sources.json'),'utf8')),photos=new Map(portraitRows.filter(r=>r.file).map(r=>[r.name,r]));
const rejectedPortraits=new Set(['A','Beyond Birthday','J','Shiniichiro Yamasaki','Tasayoshi Yoda','Yoshio Anderson','Sanami','David Hoope','Y462','Unnamed Shinigami']);
const photoName=name=>name==='L'?'L (character)':name==='Ryuzaki'?'Ryuzaki (film character)':name;
const portraitUses=[];
async function imageFor(name,owner,version='base'){
 if(rejectedPortraits.has(name))return null;const record=photos.get(name);if(!record)return null;
 const bytes=await readFile(path.join(root,record.file));assert.equal(hash(bytes),record.sha256);
 const source=`data:${record.mime};base64,`+bytes.toString('base64');assert(embeddedPortraitBlob(source),record.file);
 portraitUses.push({npcId:owner,version,name,file:record.file,page:record.page,url:record.url,sha256:record.sha256,kind:record.assetKind,modified:false});
 return{hasPortrait:true,portraitSource:'embedded',portraitImage:source,portraitSize:84,portraitView:{desktop:{x:50,y:50,zoom:1},mobile:{x:50,y:50,zoom:1}},...(source.length<=32768?{roleIconImage:source}:{})};
}
const npcMap=new Map();
for(const n of MAJOR_CHARACTERS)npcMap.set(n.name,{...n,referenceTier:'detailed'});
for(const [name,routes,occupation,background] of [...SUPPORTING,...MINOR]){
 if(npcMap.has(name))continue;
 npcMap.set(name,{id:'dn-'+slug(name),name,aliases:[],occupation,background,continuities:routes.split(' '),referenceTier:SUPPORTING.some(r=>r[0]===name)?'supporting':'brief',sources:[`https://deathnote.fandom.com/wiki/${encodeURIComponent(name.replaceAll(' ','_'))}`]});
}
// These are one identity each, not extra adaptation records.
const knownBirthNames={L:'L Lawliet',Watari:'Quillsh Wammy',Near:'Nate River',Mello:'Mihael Keehl',Matt:'Mail Jeevas',Aiber:'Thierry Morello',Wedy:'Merrie Kenwood','Halle Lidner':'Halle Bullook','Anthony Rester':'Anthony Carter','Stephen Gevanni':'Stephen Loud',Ryuzaki:'Masayuki Arai','Jack Neylon':'Kal Snydar','Rod Ross':'Dwhite Gordon','Glen Humphreys':'Ralph Bay','John McEnroe':'Larry Conners','Yitzak Ghazanin':'Joe Morton','Taichi Amazawa':'Taichi Amazawa'};
const unknownNames=new Set(['A','F','J','Q','Deneuve','Eraldo Coil','C-Kira','Housekeeper','FBI Agent (Spiraling Trap)','N-Suke Yamanaka','Takagi','Sasaki','Detective Sasaki','Agent Young','Miller','Eddie','Jose','Roy','Skyer','Y462','Misa Amane\'s friend','Misa Amane\'s stalker','Ms. Mikami','English teacher','Unnamed woman','Unnamed Kira worshiper','Yamamoto','Yamamoto (student)','Takahashi','Hikari Yagami','Sonny Hound','Emi','Maki','Shiho','Mayu','Nori','Nakajima','Imai','Kyoko','Yuri']);
const trueNames={},trueNameSpellings={},npcs=[],coverage=[];
for(const source of npcMap.values()){
 const shinigami=source.continuities?.includes('relight')&&source.name==='Unnamed Shinigami'||['Ryuk','Rem','Gelus','Sidoh','Midora','Armonia Justin Beyondormason','King of Death','Arma','Bepo','Calikarcha','Daril Ghiroza','Deridovely','Gook','Kinddara Guivelostain','Nu','Zellogi'].includes(source.name);
 const child=['Sayu Yagami','Maki Nikaido','Taro Kagami','Miura','Yumi Aizawa','Quarter Queen','Hikari Yagami'].includes(source.name);
 const base={...source,race:shinigami?'Shinigami':'Human',age:source.age||(child?'Child / adolescent in the relevant era':'Unspecified; use the selected source period'),gender:undefined,
  title:'',relationship:'Stranger',faction:source.faction||source.occupation,met:false,enabled:false,isHostile:false,npcScope:'character',npcOwner:'',
  appearance:source.appearance||'Use the attached source portrait, if present. Further visual details are not established by this short reference.',
  personality:source.personality||'No detailed canonical personality is asserted in this short reference. Any scene-specific interpretation must stay consistent with the known role and remain distinct from verified biography.',
  goals:source.goals||'Pursue the established role and actual current circumstances; no automatic allegiance or secret knowledge.',speechStyle:source.speechStyle||'Use original dialogue consistent with the scene and social role; do not claim invented phrases are quotations.',
  notes:'PRIVATE CANON REFERENCE · '+source.referenceTier+'. RPG stats are an adaptation, not official guide scores. Source participation: '+routesFor(source).join(', ')+'. No encounter or notebook rights granted. Unpublished facts stay unknown.',
  affection:0,trust:10,loyalty:0,fear:0,corruption:0,lust:0,
  stats:{level:1,rank:shinigami?'Shinigami':'Human',hp:100,mp:0,stamina:100,strength:10,agility:10,intelligence:['L','Light Yagami','Near','Mello','Beyond Birthday'].includes(source.name)?30:10,endurance:10},
  abilities:(source.skills||[]).map(name=>({name,category:'Source reference',level:'Context-dependent',description:'Available only if the selected period and actual equipment/conditions establish it.',proficiency:0})),
  hasPortrait:false,portraitSource:'none',portraitImage:'',roleIcon:shinigami?'moon':'book',identityColor:shinigami?'#aa878a':'#c9b077',activeAlternateId:'',alternateProfiles:[],
 };
 // Moon is not a native NPC role icon; use the host's allowlisted family.
 base.roleIcon=shinigami?'mage':/investigator|detective|agent|police|inspector/i.test(source.occupation)?'scholar':'book';
 const basePhoto=await imageFor(source.name==='Light Yagami'&&photos.has('Light Yagami/School')?'Light Yagami/School':photoName(source.name),base.id);
 if(basePhoto)Object.assign(base,basePhoto);
 for(const version of makeVersions(source)){
  let portrait=null;const route=version.continuity;
  if(route==='drama')portrait=await imageFor(photos.has(photoName(source.name)+'/Drama')?photoName(source.name)+'/Drama':['Shoko Himura','Mako Kitano','Serina Kudo'].includes(source.name)?source.name:'',base.id,version.id);
  if(route==='us-film')portrait=await imageFor(['L','Watari'].includes(source.name)?photoName(source.name)+'/Netflix':source.name,base.id,version.id);
  if(route==='jp-films')portrait=await imageFor(['new-world','new-generation'].includes(version.period)&&photos.has(photoName(source.name)+'/Films 2016')?photoName(source.name)+'/Films 2016':photos.has(photoName(source.name)+'/Films')?photoName(source.name)+'/Films':earlyNativeFilm(source.name)?photoName(source.name):'',base.id,version.id);
  if(portrait)Object.assign(version,portrait);
  else if(['drama','us-film','jp-films'].includes(route)&&basePhoto)Object.assign(version,{hasPortrait:false,portraitSource:'none',portraitImage:'',roleIconImage:''});
  base.alternateProfiles.push(version);
 }
 // Native normalizer validates all user-owned alternate portrait metadata.
 const normalized=normalizeNpcAlternates(base);assert.equal(normalized.alternateProfiles.length,base.alternateProfiles.length);assert(base.alternateProfiles.length<=20);
 const name=source.name;
 let identity=unknownNames.has(name)||shinigami?null:knownBirthNames[name]||name;
 if(name==='L')identity={default:'L Lawliet',versions:{'us-film-opening':null}};
 if(name==='Watari')identity={default:'Quillsh Wammy',versions:{'us-film-opening':'Watari'}};
 if(name==='Near')identity={default:'Nate River',versions:{'jp-films-lctw':null}};
 if(name==='Beck Wallese')identity={default:null,versions:Object.fromEntries(base.alternateProfiles.filter(v=>v.continuity==='anime').map(v=>[v.id,'Billy Morgan']))};
 if(name==='Danny Bloyer')identity={default:null,versions:Object.fromEntries(base.alternateProfiles.filter(v=>v.continuity==='anime').map(v=>[v.id,'Robert Rangdon']))};
 if(name==='Seam Solt')identity={default:null,versions:Object.fromEntries(base.alternateProfiles.filter(v=>v.continuity==='anime').map(v=>[v.id,'George Michel']))};
 if(name==='Ellickson Gardner')identity={default:null,versions:{'relight-framing':'Ellickson Tohmas'}};
 if(name==='Kurt McBride')identity='Cirt Macbride';
 if(name==='Freddi Guntair')identity={default:name,versions:Object.fromEntries(base.alternateProfiles.filter(v=>v.continuity==='anime').map(v=>[v.id,'David Lincher']))};
 if(name==='Haley Belle')identity={default:name,versions:Object.fromEntries(base.alternateProfiles.filter(v=>v.continuity==='drama').map(v=>[v.id,'Henneth Belle']))};
 if(name==='Yoshio Anderson')identity={default:null,versions:Object.fromEntries(base.alternateProfiles.filter(v=>v.continuity==='drama').map(v=>[v.id,'L Lawliet']))};
 if(name==='Misa Amane\'s stalker')identity={default:null,versions:Object.fromEntries(base.alternateProfiles.filter(v=>['drama','jp-films'].includes(v.continuity)).map(v=>[v.id,v.continuity==='drama'?'Tsutomu Yukida':'Ryotaro Sakajo']))};
 trueNames[base.id]=identity;
 const spelling=CANON_NAME_SPELLINGS[base.id],canonical=typeof identity==='string'?identity:identity?.default;
 if(spelling&&canonical===spelling.name){
  trueNameSpellings[base.id]={default:spelling.names,versions:Object.fromEntries(Object.entries(identity?.versions||{}).filter(([,name])=>name!==canonical).map(([id])=>[id,[]]))};
  base.aliases=[...new Set([...base.aliases||[],...spelling.names])];
 }
 npcs.push(base);coverage.push({id:base.id,name:base.name,tier:base.referenceTier,continuities:routesFor(source),versions:base.alternateProfiles.length,portrait:Boolean(basePhoto),source:base.sources[0]});
}
function earlyNativeFilm(name){return ['Shiori Akino','Sanami','Saeko Nishiyama','Tsukuru Mishima','Ryuzaki','Yuki Shien','Maki Nikaido','Kimiko Kujo','Daisuke Matoba','Sho Nanase','Arma','Bepo','Sakura Aoi','Junrou Sugawara','Uei Uragami','Shin Kuromoto','Shoko Himura'].includes(name);}

const currencyPreset={name:'BANK / CASH / COIN',scheme:{version:1,animated:false,units:[['bank','BANK',10000,'#c7b782'],['cash','CASH',100,'#8eaf9b'],['coin','COIN',1,'#c2b8a1']].map(([id,name,value,color])=>({id,name,symbol:'',aliases:[],value,color,iconSet:'banknote',icon:id==='coin'?'coin':'note'}))}};
const forgePreset={mode:'custom',name:'Death Note · Character Creation',rankLabel:'Affiliation',showRank:false,
 origins:['Tokyo / Kanto','Winchester / Wammy’s House','Los Angeles','Seattle','Other location agreed in the selected continuity'],
 standings:['Civilian','Student','Investigator','Journalist','Police officer — established appointment','Wammy’s alumnus — agreed history','Independent researcher','Performer','Notebook finder — only after discovery'],
 skillCategories:['Investigation','Observation','Research','Interviewing','Languages','Evidence handling','Physical conditioning','Professional skill','Notebook literacy — actually learned'],
 masteryRanks:['Untrained','Learning','Practiced','Proficient','Specialist','Exceptional'],pathRanks:['Unaffiliated','Student','Professional','Agency member','Source-established authority'],arsenalTypes:['Notebook','Authentic scrap','Case file','Photograph','Recording','Phone','Everyday tool','Medical supply','Other'],alignments:['Compassionate','Dutiful','Pragmatic','Skeptical','Ambitious','Conflicted']};
const trainingPreset={version:1,hidden:[],definitions:[['observation','Observation / การสังเกต','Record visible facts before interpreting them.'],['reasoning','Reasoning / การวิเคราะห์','Compare competing explanations with evidence.'],['research','Research / การค้นคว้า','Read accessible records and evaluate reliability.'],['interview','Interviewing / การสอบถาม','Ask questions without assuming a confession.']].map(([id,name,description])=>({id,name,description:description+' Gameplay measure, not an official canon score.',methods:['Practise using a concrete scene or accessible case file.','Review actual mistakes and record what was learned.'],min:0,max:100,initial:0,gain:1,showTraining:true,showStatus:false,unit:''}))};
const config={powerPreset:{mode:'custom',name:'Death Note · Human world',definitions:[]},forgePreset,currencyPreset,trainingPreset,npcOptions:{entryLimit:0},loreOptions:{mode:'relevant',budget:16000,entryLimit:0},systems:{enableWeapons:true,enableIncantation:false,npcIncantation:false,enableMissionBoard:false,enableGroupBoard:false,enableAuctions:false,enableMarketplace:false,enableStoryMemory:true,enableStoryAgenda:true,enableQuestObjectives:true,showSceneTracker:true,injectState:true,npcDiaryFrequency:'rare'},chatAppearance:{theme:'roleforge',header:true,dialogue:true,narrative:true,effects:false}};
validatePresetConfig(config);
const pack={format:'roleforge-character-pack',version:1,id:PACK_ID,name:'Death Note RPG',...config,initialState:{player:{powerType:'Human skills / ทักษะมนุษย์',originSkill:'Chosen during Character Creation',mp:{current:0,max:0}},inventory:[],progression:{currency:{name:currencyPreset.name,scheme:currencyPreset.scheme,bank:0,cash:0,coin:0},adventurerRank:'Custom Rank',customRankName:'Unaffiliated',magicRank:'None',swordRank:'Untrained'},onboarding:{identitySeeded:false,locationSeeded:false,loadoutSeeded:false},storyMissions:{flags:{[storyFlagKey(PACK_ID,'continuity')]:'unselected',[storyFlagKey(PACK_ID,'mode')]:'unselected'},instances:[],facts:[]}}};
const campaigns={format:'roleforge-campaign-menu',version:1,packId:PACK_ID,title:'Death Note · Campaign',options:ROUTES.map(r=>({id:r.id,label:r.name,description:r.scope,versions:Object.fromEntries(npcs.flatMap(n=>{const v=n.alternateProfiles.find(v=>v.continuity===r.id);return v?[[n.id,v.id]]:[];}))}))};
const stories=validateStoryPack({format:'roleforge-story-preset',version:1,id:PACK_ID,revision:1,name:'Death Note · Stories / Missions',entries:campaignTemplates().entries});
assert.equal(stories.entries.length,146);
// Every route must expose only its own first chapter; free play exposes none.
for(const route of ROUTES)for(const mode of ['canon','free']){
 const state={...pack.initialState,quests:[],storyMissions:{flags:{[storyFlagKey(PACK_ID,'continuity')]:route.id,[storyFlagKey(PACK_ID,'mode')]:mode},instances:[],facts:[]}};
 const first=stories.entries.filter(e=>{const r=storyEligibility(e,state,{packId:PACK_ID});return r.result===null&&r.rows.filter(row=>row.result===null).every(row=>row.rule.type==='event');});
 assert.deepEqual(first.map(e=>e.id),mode==='free'?[]:[route.id+'-01']);
}
const files=new Map(),put=(name,value)=>files.set(name,utf8.encode(json(value))),npcIndex=[],loreIndex=[],storyIndex=[];
for(const n of npcs){const {alternateProfiles,...base}=n,basePath=`npcs/${n.id}/base.json`;put(basePath,base);const versions=[];for(const v of alternateProfiles){const p=`npcs/${n.id}/${v.id}.json`;put(p,v);versions.push({id:v.id,label:v.label,path:p});}npcIndex.push({id:n.id,name:n.name,aliases:n.aliases,identityColor:n.identityColor,roleIcon:n.roleIcon,sourceHint:routesFor(n).join(' '),basePath,defaultVersionId:'',versions});}
for(const l of LORE){const p=`lore/${l.id}.json`;put(p,l);loreIndex.push({id:l.id,title:l.title,keywords:l.keywords,enabled:true,always:l.always,path:p});}
for(const e of stories.entries){const p=`stories/${e.id}.json`;put(p,e);storyIndex.push({id:e.id,path:p});}
put('indexes/npcs.json',npcIndex);put('indexes/lore.json',loreIndex);put('indexes/stories.json',storyIndex);put('presets.json',pack);
const counts={npcBodies:npcs.length,nativeVersions:npcs.reduce((s,n)=>s+n.alternateProfiles.length,0),worldLore:LORE.length,storyTemplates:stories.entries.length};
const manifest={format:'roleforge-world-pack',version:1,archiveId:PACK_ID,revision:'1.0.1',name:'Death Note RPG',counts,indexes:{npcs:'indexes/npcs.json',lore:'indexes/lore.json',stories:'indexes/stories.json'},storyPack:{...stories,entries:undefined},presets:'presets.json',files:[...files].map(([path,bytes])=>({path,bytes:bytes.length,sha256:hash(bytes)}))};
validateWorldManifest(manifest);validateWorldIndexes(manifest,npcIndex,loreIndex);put('manifest.json',manifest);
const ref={format:'roleforge-world-archive-ref',version:1,archiveId:PACK_ID,revision:manifest.revision,manifestPath:'manifest.json',manifestSha256:hash(files.get('manifest.json')),required:true};
const payload=await encodeInlineFiles(files);const decoded=await decodeInlineFiles(payload);assert.equal(decoded.size,files.size);
for(const [p,bytes]of files)assert.equal(hash(await decoded.get(p)()),hash(bytes),p);
const note=`Requires RoleForge 0.82.2+ in SillyTavern. Import this ONE PNG or JSON card; no extra World Pack or portrait import. Open Wand → Campaign to choose source + canon/free before beginning Character Creation. Death Note installs/enables once for this chat; explicit later disable is respected. No model/API/voice settings are changed.\nต้องใช้ RoleForge 0.82.2 ขึ้นไป นำเข้าการ์ด PNG หรือ JSON เพียงไฟล์เดียว เปิดเมนูไม้กายสิทธิ์ → Campaign เลือกฉบับและโหมดก่อนเริ่ม ไม่ได้รับสมุดหรือดวงตาฟรี ชื่อ NPC เป็น ??? จนรู้ชื่อจากการโรล\nBANK/CASH/COIN use a convertible wallet: 1 BANK=100 CASH=10,000 COIN, not separate protected bank accounts. Source-specific pilot eraser and US-film page-burning effects are narrated source events, not paper-clear buttons. Some incidental references have only brief published facts; missing/unpublished face portraits remain blank. Public reference art belongs to its respective rights holders; detailed provenance is included.`;
const data={name:'Death Note RPG',description:'A complete playable investigation-world framework for Death Note. '+LORE.filter(l=>l.always).map(l=>l.content).join('\n\n'),personality:'A patient, atmospheric narrator. Precise about evidence, private knowledge, adaptation boundaries and consequences; never controls the player.',scenario:'Choose a continuity and play style using Campaign, then create the player and opening scene. The human world begins without any automatic notebook possession. Events follow the selected source only when their actual prerequisites remain possible.',first_mes:'',mes_example:'',creator_notes:note,system_prompt:'Use the selected campaign and RoleForge reference records. Respond in Thai or English to match {{user}}. Never mix adaptation timelines or reveal private names, assume player actions, or force canonical deaths after a valid divergence. Reference metadata is not a current scene. No explicit sexual content involving minors. Use original prose. Author-declared trueNameSpellings are full-name translations or romanizations of the same private true name; they are valid spellings, unlike codenames, partial names and unverified aliases. Read the ACTIVE opening only: clearly established player notebook possession is seeded by RoleForge when the addon is enabled. Do not grant another copy. A tagged Shinigami may explicitly identify itself as attached to this notebook; preserve known original bindings and separate the current holder from the rights owner.',post_history_instructions:'Keep notebook holder, rights owner, name claim, true name, face knowledge and current memory separate. Follow RoleForge evidence protocols in the same assistant reply. Do not send text on behalf of the player.',alternate_greetings:[],tags:['Death Note','RPG','RoleForge','Investigation','Thai','English'],creator:'RoleForge · DesZiDesu',character_version:'1.0.1',extensions:{roleforge_character_pack:pack,roleforge_campaigns:campaigns,roleforge_workshop:{format:'roleforge-workshop-card-defaults',version:1,enabled:['death-note']},roleforge_death_note:{format:'roleforge-death-note-rules',version:1,canon:'manga',knownFaces:{},trueNames,trueNameSpellings,originalLifespans:{}},roleforge_world_archive:ref,roleforge_world_archive_payload:payload,tretaresia_rpg_npcs:[],tretaresia_rpg_lore:LORE.filter(l=>l.always),roleforge_mention_activation:{version:1,enabled:true},roleforge_sources:{version:1,coverage,portraits:portraitUses,notes:'Original authored roleplay outlines, not scripts. Source reference images remain unchanged; square framing is UI metadata. Brief incidental dossiers explicitly preserve unknown facts.'}}};
const card={spec:'chara_card_v2',spec_version:'2.0',data};
const output=path.join(dest,'Death-Note-RPG.json');await writeFile(output,JSON.stringify(card));await copyFile(output,path.join(root,'build/Death-Note-RPG.json'));
const png=cardPng(await readFile(path.join(root,'assets/cover.png')),card);assert.deepEqual(readCardPng(png),card);await writeFile(path.join(dest,'Death-Note-RPG.png'),png);await writeFile(path.join(root,'build/Death-Note-RPG.png'),png);
const report={...counts,portraits:npcs.filter(n=>n.hasPortrait).length,portraitUses:portraitUses.length,uniquePortraits:new Set(portraitUses.map(p=>p.sha256)).size,tiers:Object.fromEntries(['detailed','supporting','brief'].map(t=>[t,npcs.filter(n=>n.referenceTier===t).length])),routes:ROUTES.length,compressedBytes:payload.compressedBytes,jsonBytes:(await readFile(output)).length,hash:hash(await readFile(output)),allRouteIsolationChecks:26,allSubfileHashesVerified:true};
await writeFile(path.join(root,'build/coverage.json'),json({report,characters:coverage,missingPortraits:npcs.filter(n=>!n.hasPortrait).map(n=>n.name)}));await writeFile(path.join(dest,'coverage.json'),json({report,characters:coverage,missingPortraits:npcs.filter(n=>!n.hasPortrait).map(n=>n.name)}));
await writeFile(path.join(root,'data/source-map.json'),json({sources:['https://www.ntv.co.jp/deathnote/','https://www.ntv.co.jp/drama-deathnote/static/story.html','https://www.ntv.co.jp/english/pc/2016/06/death-note-light-up-the-new-world.html','https://jfdb.jp/en/title/489','https://deathnote.fandom.com/wiki/Death_Note','https://deathnote.fandom.com/wiki/Death_Note:_Another_Note:_The_Los_Angeles_BB_Murder_Cases','https://deathnote.fandom.com/wiki/L:_Change_the_WorLd_(novel)'],characters:coverage,portraits:portraitUses}));
console.log(JSON.stringify(report,null,2));
