import {sha256} from './vendor/js-sha256/index.js?v=0.92.0';
// Registration choices are chat-local author decisions, never model commands.
export const CREATION_RECORD='tretaresia_rpg_character_creation';
export const DELETED_GREETING='roleforge_creation_after_delete';
export const CREATION_REGIONS=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
export const CREATION_STARTERS=[[1,4,7],[152,155,158],[252,255,258],[387,390,393],[495,498,501],[650,653,656],[722,725,728],[810,813,816],[906,909,912]];
const choice=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
const str=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
export function blankCreationChat(context){const rows=(context.chat||[]).filter(m=>!m?.is_system);return rows.length<=1&&rows.every(m=>!String(m?.mes||'').trim());}
export function creationEligible(context){const card=context.characters?.[context.characterId],greeting=card?.data?.first_mes??card?.first_mes,marker=context.chatMetadata?.[DELETED_GREETING],deleted=marker===true||Boolean(marker?.hash&&marker.chatId===context.getCurrentChatId?.()&&(!marker.avatar||marker.avatar===card?.avatar));return Boolean(context.getCurrentChatId?.()&&!context.groupId&&card&&typeof greeting==='string'&&blankCreationChat(context)&&(!greeting.trim()||deleted||context.chatMetadata?.tainted===true));}
export function deletedGreetingMarker(context,message){return {hash:sha256(String(message?.mes||'')),chatId:context.getCurrentChatId?.()||'',avatar:context.characters?.[context.characterId]?.avatar||''};}
export function restoredDeletedGreeting(context){const marker=context.chatMetadata?.[DELETED_GREETING],rows=(context.chat||[]).filter(m=>!m?.is_system),first=rows[0];return Boolean(marker?.hash&&marker.chatId===context.getCurrentChatId?.()&&(!marker.avatar||marker.avatar===context.characters?.[context.characterId]?.avatar)&&!context.groupId&&rows.length===1&&!first.is_user&&!first.gen_started&&!first.gen_finished&&sha256(String(first.mes||''))===marker.hash);}
export function creationVariant(enabled=[],preferred,preferences={}){const modes=['death-note','pokemon'].filter(id=>enabled.includes(id)&&preferences[id]!==false);return !modes.length?'roleforge':modes.includes(preferred)?preferred:modes.length===1?modes[0]:'choose';}
export function creationNotebookItem(item){return item?.quantity>0&&((item.properties||[]).includes('roleforge:addon:death-note')||['death note','เดธโน้ต','สมุดเดธโน้ต','สมุดเดธโน๊ต'].includes(String(item.name||'').normalize('NFKC').trim().toLowerCase()));}
export function normalizeForgeAddon(raw={},variant='roleforge'){
 if(variant==='death-note')return {continuity:choice(raw.continuity,['card','manga','movies'],'card'),notebook:choice(raw.notebook,['inherit','none','owned'],'inherit'),eyes:choice(raw.eyes,['inherit','none','innate','gift'],'inherit'),alias:str(raw.alias,100),eyeBaseline:str(raw.eyeBaseline,180),reuseNotebook:raw.reuseNotebook===true};
 if(variant==='pokemon'){const region=choice(raw.region,CREATION_REGIONS,'Kanto'),partner=choice(raw.partner,['inherit','none','starter'],'starter'),allowed=CREATION_STARTERS[CREATION_REGIONS.indexOf(region)];return {region,partner,speciesId:allowed.includes(Number(raw.speciesId))?Number(raw.speciesId):null,nickname:str(raw.nickname,36),kit:choice(raw.kit,['inherit','standard','none'],'standard')};}
 return {};
}
export function registrationRules(record,kind){
 const profile=record?.profile;if(!profile||profile.variant!==kind||!['generating','completed','failed'].includes(record.phase))return {};
 const a=normalizeForgeAddon(profile.addon,kind);
 if(kind==='pokemon')return {engineVersion:3,region:a.region,...(a.partner!=='inherit'?{initialParty:a.partner==='starter'&&a.speciesId?[{speciesId:a.speciesId,level:5,nickname:a.nickname,seed:record.id||'registered-player'}]:[],started:a.partner==='starter'&&Boolean(a.speciesId)}:{}),...(a.kit!=='inherit'?{initialInventory:a.kit==='standard'?{'poke-ball':5,potion:2}:{}}:{})};
 if(kind==='death-note')return {creationNoNotebook:a.notebook==='none',creationEvents:[...(a.notebook==='owned'&&!a.reuseNotebook?[{type:'register',bookId:'forge-item-death-note',itemId:'forge-item-death-note',ownerId:'player',holderId:'player',firstHumanOwnerId:'player'}]:[]),...(a.eyes!=='inherit'?[{type:'eye-ability',actorId:'player',source:a.eyes,knownToPlayer:true,...(a.eyeBaseline?{configRevision:a.eyeBaseline}:{})}]:[])]};
 return {};
}
export function registrationGuidance(profile){
 if(profile?.variant==='death-note'){const a=normalizeForgeAddon(profile.addon,'death-note');return `DEATH NOTE PLAYER SETUP: continuity=${a.continuity}; notebook=${a.notebook}; eye source=${a.eyes}; public alias=${JSON.stringify(a.alias)}. Respect the selected manga/anime or Japanese-film continuity; card means follow the card's route. Do not merge continuities. A chosen owned notebook and non-deal eyes are established starting facts, not a new pickup or bargain. Innate/granted eyes do not halve lifespan. Do not invent an original Shinigami or reveal private NPC names. The registered true name/background remain private unless shared in the scene.`;}
 if(profile?.variant==='pokemon'){const a=normalizeForgeAddon(profile.addon,'pokemon');return `POKEMON PLAYER SETUP: ${JSON.stringify(a)}. Chosen starter at level 5 and starting kit are already seeded by the engine; never award a second copy. No companion means the player starts without one; do not invent a capture or force a starter. Follow the chosen region and registered opening. Leave player dialogue/actions to the player.`;}
 return '';
}

// Changing presentation keeps each creator's draft, without altering committed RPG state.
export function switchCreationDraft(session,variant){
 if(!['roleforge','death-note','pokemon'].includes(variant)||session.draft?.variant===variant)return session.draft;
 const previous=session.draft;session.variantDrafts||={};
 if(previous&&previous.variant!=='choose')session.variantDrafts[previous.variant||'roleforge']=previous;
 session.draft=session.variantDrafts[variant]||{version:2,variant,fields:{...previous?.fields},originEnabled:false,addon:{}};
 return session.draft;
}
