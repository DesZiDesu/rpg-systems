import {validatePowerConfig} from './power-presets.js?v=0.85.0';
import {validateForgePreset} from './forge-presets.js?v=0.85.0';
import {loreOptions,writeLoreOptions,assertLoreCapacity} from './lore-core.js?v=0.85.0';
import {validatePresetConfig} from './world-presets.js?v=0.85.0';
import {assertNpcCapacity} from './npc-capacity.js?v=0.85.0';
import {WORLD_REF_FIELD,WORLD_PAYLOAD_FIELD,worldRef,worldKey,validateInlinePayload} from './world-pack-core.js?v=0.85.0';
import {STORY_PACK_FIELD,validateStoryPack} from './story-core.js?v=0.85.0';

// Large, character-wide records belong to the character card, not the global
// SillyTavern settings payload. Keep legacy settings as a fallback until the
// server has acknowledged each archive migration.
export const ARCHIVE_FIELDS = Object.freeze({
    npcs: 'tretaresia_rpg_npcs',
    lore: 'tretaresia_rpg_lore',
});
const LEGACY_FIELDS = Object.freeze({npcs:'npcCharacterLibraries',lore:'loreCharacterLibraries'});
const writes = new Map();
const packs = new WeakMap();
const cardJsons = new WeakMap();
const EMPTY_ARCHIVE=Object.freeze([]);
export const CHARACTER_PACK_FIELD = 'roleforge_character_pack';
export const characterArchiveBusy = owner => writes.has(owner);
const STATE_LIMIT = 1024 * 1024;
const UNSET_SENTINEL = '__@@UNSET@@__'; // Native merge-attributes deletion marker.
const plain = value => value && typeof value==='object'&&!Array.isArray(value);

function replacementUpdate(previous, next) {
    if(plain(next)&&previous!==undefined&&!plain(previous))throw Error('Existing character pack has a malformed object. Correct its card JSON before saving.');
    if(!plain(previous)||!plain(next))return next;
    const update={...next};
    for(const key of Object.keys(previous)){
        if(['__proto__','constructor','prototype'].includes(key))continue;
        if(!Object.hasOwn(next,key))update[key]=UNSET_SENTINEL;
        else if(plain(next[key]))update[key]=replacementUpdate(previous[key],next[key]);
    }
    return update;
}

function cardFor(context, owner) {
    if (!owner?.startsWith('card:')) return null;
    const avatar = owner.slice(5);
    const current=context.characters?.[context.characterId??context.chid];
    if(current?.avatar===avatar)return current;
    return context.characters?.find(card => card?.avatar === avatar) || null;
}

function parsedCardJson(card) {
    const source=card?.json_data;
    if(typeof source!=='string')return null;
    const cached=cardJsons.get(card);
    if(cached?.source===source)return cached.value;
    let value=null;try{value=JSON.parse(source);}catch{}
    cardJsons.set(card,{source,value});return value;
}

function cardArchive(card, kind) {
    const field = ARCHIVE_FIELDS[kind];
    if (!field || !card) return null;
    let archive = card.data?.extensions?.[field];
    if (!Array.isArray(archive) && typeof card.json_data === 'string') {
        try { archive = parsedCardJson(card)?.data?.extensions?.[field]; }
        catch { /* An unparsed card cannot replace the intact legacy archive. */ }
    }
    return Array.isArray(archive) ? archive : null;
}

export function readCharacterArchive(context, settings, owner, kind) {
    const stored = cardArchive(cardFor(context, owner), kind);
    if (stored) return stored;
    const legacy = settings?.[LEGACY_FIELDS[kind]]?.[owner];
    return Array.isArray(legacy) ? legacy : EMPTY_ARCHIVE;
}
export function readCharacterExtension(context,owner,field){
    const card=cardFor(context,owner);return card?.data?.extensions?.[field]??parsedCardJson(card)?.data?.extensions?.[field];
}
export const readCharacterWorldPayload=(context,owner)=>readCharacterExtension(context,owner,WORLD_PAYLOAD_FIELD);

function packDefaults(raw) {
    if (!raw || raw.format !== 'roleforge-character-pack' || raw.version !== 1) return {};
    const result = {format:'roleforge-character-pack',version:1};
    for (const key of ['id','name']) if(typeof raw[key]==='string')result[key]=raw[key].slice(0,120);
    // Each invalid component falls back independently; scripts/API settings
    // are never part of the schema and are never executed or applied.
    try { if (raw.powerPreset) result.powerPreset=validatePowerConfig(raw.powerPreset); } catch {}
    try { if (raw.forgePreset) result.forgePreset=validateForgePreset(raw.forgePreset); } catch {}
    for(const key of ['currencyPreset','trainingPreset','weaponPreset','relationshipPreset','npcOptions','systems','chatAppearance','storyPreset'])if(Object.hasOwn(raw,key))try{Object.assign(result,validatePresetConfig({[key]:raw[key]}));}catch{}
    if(raw.storyPresetRef&&typeof raw.storyPresetRef.id==='string'&&Number.isSafeInteger(raw.storyPresetRef.revision))result.storyPresetRef={id:raw.storyPresetRef.id,revision:raw.storyPresetRef.revision};
    if(raw.loreOptions&&typeof raw.loreOptions==='object'&&!Array.isArray(raw.loreOptions))
        result.loreOptions=loreOptions({loreCharacterOptions:{card:raw.loreOptions}},'card');
    if(raw.initialState&&typeof raw.initialState==='object'&&!Array.isArray(raw.initialState)) {
        try {
            const json=JSON.stringify(raw.initialState);
            if(new TextEncoder().encode(json).length<=STATE_LIMIT)result.initialState=JSON.parse(json);
        } catch {}
    }
    return result;
}

export function readCharacterPack(context, owner) {
    const card=cardFor(context,owner);if(!card)return {};
    const raw=card.data?.extensions?.[CHARACTER_PACK_FIELD],cached=packs.get(card);
    if(cached&&cached.raw===raw&&cached.json===card.json_data)return cached.value;
    let source=raw;
    if(source===undefined&&typeof card.json_data==='string') {
        try {source=parsedCardJson(card)?.data?.extensions?.[CHARACTER_PACK_FIELD];} catch {}
    }
    const value=packDefaults(source);packs.set(card,{raw,json:card.json_data,value});return value;
}

export function characterDefaultSettings(settings, owner, pack) {
    const next={...settings};
    for(const [field,key] of [['roleforgePowerPresets','powerPreset'],['roleforgeForgePresets','forgePreset'],['loreCharacterOptions','loreOptions']]) {
        if(owner&&pack[key]&&!Object.hasOwn(settings[field]||{},owner))next[field]={...settings[field],[owner]:pack[key]};
    }
    return next;
}

async function saveCardExtensions(context, owner, fields) {
    let card=cardFor(context,owner);
    if(!card)throw Error('Character card is unavailable. Open it again.');
    // Native card writes deep-merge objects. Explicitly unset obsolete keys in
    // our pack so the server/export matches the replacement kept in memory.
    let previous=card.data?.extensions?.[CHARACTER_PACK_FIELD];
    if(previous===undefined&&typeof card.json_data==='string')try{previous=JSON.parse(card.json_data)?.data?.extensions?.[CHARACTER_PACK_FIELD];}catch{}
    const update={...fields,[CHARACTER_PACK_FIELD]:replacementUpdate(previous,fields[CHARACTER_PACK_FIELD])};
    for(const field of [WORLD_REF_FIELD,WORLD_PAYLOAD_FIELD])if(Object.hasOwn(fields,field))update[field]=replacementUpdate(readCharacterExtension(context,owner,field),fields[field]);
    const response=await (context.fetch||fetch)('/api/characters/merge-attributes',{
        method:'POST',headers:context.getRequestHeaders(),body:JSON.stringify({avatar:card.avatar,data:{extensions:update}}),
    });
    if(!response.ok){const error=Error(`Character card save failed (HTTP ${response.status})`);error.status=response.status;throw error;}
    card=cardFor(context,owner);
    if(card){
        card.data||={};card.data.extensions||={};Object.assign(card.data.extensions,fields);packs.delete(card);
        if(typeof card.json_data==='string')try{
            const json=JSON.parse(card.json_data);json.data||={};json.data.extensions||={};Object.assign(json.data.extensions,fields);
            card.json_data=JSON.stringify(json);
            if(context.characters?.[context.characterId]?.avatar===card.avatar){const editor=globalThis.document?.getElementById?.('character_json_data');if(editor)editor.value=card.json_data;}
        }catch(error){console.warn('[RoleForge] Could not refresh character JSON after saving its pack.',error);}
    }
}

// Explicit author action: persist setup and both archives in one card write.
// It shares the archive queue, so concurrent Lore/NPC edits cannot race it.
export function writeCharacterPack(context, settings, owner, raw, {npcs,lore}={}) {
    const pack=packDefaults(raw);
    if(!pack.format)throw Error('Unsupported RoleForge character pack');
    for(const key of ['powerPreset','forgePreset','currencyPreset','trainingPreset','weaponPreset','relationshipPreset','systems','loreOptions','npcOptions','chatAppearance','storyPreset','initialState'])
        if(Object.hasOwn(raw,key)&&!Object.hasOwn(pack,key))throw Error(`Invalid character pack ${key}`);
    const fields={[CHARACTER_PACK_FIELD]:pack};
    if(pack.storyPreset){fields[STORY_PACK_FIELD]=pack.storyPreset;pack.storyPresetRef={id:pack.storyPreset.id,revision:pack.storyPreset.revision};delete pack.storyPreset;}
    if(raw.loreOptions)writeLoreOptions({}, {...pack.loreOptions,...raw.loreOptions},'pack','pack');
    for(const [kind,records] of Object.entries({npcs,lore}))if(records!==undefined){
        if(!Array.isArray(records))throw Error(`Invalid character pack ${kind}`);
        if(kind==='npcs')assertNpcCapacity(records.length,pack.npcOptions,readCharacterArchive(context,settings,owner,kind).length);
        if(kind==='lore')assertLoreCapacity(records.length,pack.loreOptions,readCharacterArchive(context,settings,owner,kind).length);
        fields[ARCHIVE_FIELDS[kind]]=records;
    }
    // Snapshot inputs now: a pending write must not publish later in-memory edits.
    const snapshot=JSON.parse(JSON.stringify(fields));
    return queueCardWrite(owner,async()=>{
        await saveCardExtensions(context,owner,snapshot);
        for(const kind of ['npcs','lore'])if(Object.hasOwn(snapshot,ARCHIVE_FIELDS[kind]))clearLegacy(context,settings,owner,kind,false);
        context.saveSettingsDebounced?.();return snapshot[CHARACTER_PACK_FIELD];
    });
}

export function writeCharacterStoryPack(context,owner,raw,{valid=()=>true}={}){
    const pack=validateStoryPack(raw),snapshot=JSON.parse(JSON.stringify(pack));
    return queueCardWrite(owner,async()=>{if(!valid())throw Error('Chat/card changed. Story templates were kept.');await saveCardExtensions(context,owner,{[STORY_PACK_FIELD]:snapshot});return pack;});
}

function clearLegacy(context, settings, owner, kind, save = true) {
    const legacy = settings?.[LEGACY_FIELDS[kind]];
    if (!legacy || !Object.hasOwn(legacy, owner)) return false;
    delete legacy[owner];
    if (!Object.keys(legacy).length) delete settings[LEGACY_FIELDS[kind]];
    if (save) context.saveSettingsDebounced?.();
    return true;
}

function queueCardWrite(owner, operation) {
    const previous = writes.get(owner) || Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    writes.set(owner, result);
    void result.finally(() => { if (writes.get(owner) === result) writes.delete(owner); }).catch(() => undefined);
    return result;
}

// Called only after the Worker has durably committed a complete archive.
// Embedded data is retained unless the caller explicitly migrates it.
export function writeCharacterWorldReference(context,owner,raw,{clearEmbedded=false,payload,valid=()=>true}={}) {
    const ref=worldRef(raw);if(!ref)throw Error('Invalid World Pack reference');
    if(payload!==undefined)validateInlinePayload(payload);
    const fields={[WORLD_REF_FIELD]:ref};
    if(payload!==undefined)fields[WORLD_PAYLOAD_FIELD]=payload;
    if(clearEmbedded)Object.assign(fields,{[ARCHIVE_FIELDS.npcs]:[],[ARCHIVE_FIELDS.lore]:[],[STORY_PACK_FIELD]:null});
    return queueCardWrite(owner,()=>{
        if(!valid())throw Error('Chat/card or archive changed before saving. Existing card data was kept.');
        // A ZIP/link to another revision must not leave an unrelated payload
        // pretending that the new reference is portable.
        if(payload===undefined&&worldKey(readCharacterExtension(context,owner,WORLD_REF_FIELD)||{})!==worldKey(ref)&&readCharacterWorldPayload(context,owner))fields[WORLD_PAYLOAD_FIELD]=null;
        return saveCardExtensions(context,owner,fields);
    });
}

export async function writeCharacterArchive(context, settings, owner, kind, records, {migration = false, valid = () => true} = {}) {
    const field = ARCHIVE_FIELDS[kind];
    if (!field || !Array.isArray(records)) throw Error('Invalid character archive');
    return queueCardWrite(owner, async () => {
        if(!valid())throw Error('Chat/card or archive changed. Existing data was kept.');
        let card = cardFor(context, owner);
        if (!card) throw Error('การ์ดตัวละครนี้ไม่พร้อมใช้งาน กรุณาเปิดการ์ดอีกครั้ง');
        if (migration && cardArchive(card, kind)) {
            clearLegacy(context, settings, owner, kind, false);
            return cardArchive(card, kind);
        }
        const response = await (context.fetch || fetch)('/api/characters/merge-attributes', {
            method: 'POST', headers: context.getRequestHeaders(),
            body: JSON.stringify({avatar:card.avatar,data:{extensions:{[field]:records}}}),
        });
        if (!response.ok) {
            const error = Error(`บันทึกคลัง ${kind === 'npcs' ? 'NPC' : 'Lore'} ไม่สำเร็จ (HTTP ${response.status})`);
            error.status = response.status;
            throw error;
        }
        // Update memory only after the server accepts the card write. A later
        // character edit must also see the new value in its JSON editor field.
        card = cardFor(context, owner);
        if (card) {
            card.data ||= {};
            card.data.extensions ||= {};
            card.data.extensions[field] = records;
            if (typeof card.json_data === 'string') {
                try {
                    const json = JSON.parse(card.json_data);
                    json.data ||= {};
                    json.data.extensions ||= {};
                    json.data.extensions[field] = records;
                    card.json_data = JSON.stringify(json);
                    if (context.characters?.[context.characterId]?.avatar === card.avatar) {
                        const editor = globalThis.document?.getElementById?.('character_json_data');
                        if (editor) editor.value = card.json_data;
                    }
                } catch (error) { console.warn('[RoleForge] Could not refresh character JSON after saving the archive.', error); }
            }
        }
        clearLegacy(context, settings, owner, kind, !migration);
        return records;
    });
}

export async function migrateCharacterArchives(context, settings) {
    let cleaned = false;
    archiveKinds: for (const kind of Object.keys(ARCHIVE_FIELDS)) {
        const legacy = settings?.[LEGACY_FIELDS[kind]];
        if (!legacy || typeof legacy !== 'object') continue;
        for (const [owner, records] of Object.entries(legacy)) {
            if (!cardFor(context, owner)) continue; // Preserve data for cards not loaded here.
            if(readCharacterExtension(context,owner,'roleforge_world_archive'))continue; // External readiness is checked separately; retain legacy fallback data.
            try {
                if (cardArchive(cardFor(context, owner), kind) || Array.isArray(records) && !records.length) {
                    cleaned = clearLegacy(context, settings, owner, kind, false) || cleaned;
                } else if (Array.isArray(records)) {
                    await writeCharacterArchive(context, settings, owner, kind, records, {migration:true});
                    cleaned = true;
                }
            } catch (error) {
                console.warn(`[RoleForge] ${kind} archive migration for ${owner} was deferred; original settings remain intact.`, error);
                // An unavailable server/session affects every card. Avoid a
                // burst of doomed writes; retry when the chat changes.
                if (!error.status || error.status === 401 || error.status === 403 || error.status >= 500) break archiveKinds;
            }
        }
    }
    if (cleaned) context.saveSettingsDebounced?.();
}

