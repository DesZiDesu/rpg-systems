import {validatePowerConfig} from './power-presets.js?v=0.64.1';
import {validateForgePreset} from './forge-presets.js?v=0.64.1';
import {loreOptions} from './lore-core.js?v=0.64.1';
import {validatePresetConfig} from './world-presets.js?v=0.64.1';

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
    return context.characters?.find(card => card?.avatar === avatar) || null;
}

function cardArchive(card, kind) {
    const field = ARCHIVE_FIELDS[kind];
    if (!field || !card) return null;
    let archive = card.data?.extensions?.[field];
    if (!Array.isArray(archive) && typeof card.json_data === 'string') {
        try { archive = JSON.parse(card.json_data)?.data?.extensions?.[field]; }
        catch { /* An unparsed card cannot replace the intact legacy archive. */ }
    }
    return Array.isArray(archive) ? archive : null;
}

export function readCharacterArchive(context, settings, owner, kind) {
    const stored = cardArchive(cardFor(context, owner), kind);
    if (stored) return stored;
    const legacy = settings?.[LEGACY_FIELDS[kind]]?.[owner];
    return Array.isArray(legacy) ? legacy : [];
}

function packDefaults(raw) {
    if (!raw || raw.format !== 'roleforge-character-pack' || raw.version !== 1) return {};
    const result = {format:'roleforge-character-pack',version:1};
    for (const key of ['id','name']) if(typeof raw[key]==='string')result[key]=raw[key].slice(0,120);
    // Each invalid component falls back independently; scripts/API settings
    // are never part of the schema and are never executed or applied.
    try { if (raw.powerPreset) result.powerPreset=validatePowerConfig(raw.powerPreset); } catch {}
    try { if (raw.forgePreset) result.forgePreset=validateForgePreset(raw.forgePreset); } catch {}
    for(const key of ['currencyPreset','trainingPreset','systems','chatAppearance'])if(Object.hasOwn(raw,key))try{Object.assign(result,validatePresetConfig({[key]:raw[key]}));}catch{}
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
        try {source=JSON.parse(card.json_data)?.data?.extensions?.[CHARACTER_PACK_FIELD];} catch {}
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
    for(const key of ['powerPreset','forgePreset','currencyPreset','trainingPreset','systems','loreOptions','chatAppearance','initialState'])
        if(Object.hasOwn(raw,key)&&!Object.hasOwn(pack,key))throw Error(`Invalid character pack ${key}`);
    const fields={[CHARACTER_PACK_FIELD]:pack};
    for(const [kind,records] of Object.entries({npcs,lore}))if(records!==undefined){
        if(!Array.isArray(records)||records.length>200)throw Error(`Invalid character pack ${kind}`);
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

export async function writeCharacterArchive(context, settings, owner, kind, records, {migration = false} = {}) {
    const field = ARCHIVE_FIELDS[kind];
    if (!field || !Array.isArray(records)) throw Error('Invalid character archive');
    return queueCardWrite(owner, async () => {
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

