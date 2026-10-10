import {validatePowerConfig, importPowerPreset} from './power-presets.js?v=0.63.0';
import {validateForgePreset, importForgePreset} from './forge-presets.js?v=0.63.0';
import {validateCurrencyScheme, currencyScheme, reconfigureCurrencyWallet, MONEY_ICON_SETS} from './currency-config.js?v=0.63.0';
import {normalizeStatTraining} from './stat-training.js?v=0.63.0';
import {writeLoreOptions} from './lore-core.js?v=0.63.0';
import {validateChatAppearance} from './chat-themes.js?v=0.63.0';

export const CHAT_PRESET_KEY = 'roleforge_chat_presets';
export const PRESET_LIBRARY_KEY = 'roleforgePresetLibrary';
export const PRESET_FILE_LIMIT = 1024 * 1024;
export const PRESET_COMPONENTS = ['powerPreset','forgePreset','currencyPreset','trainingPreset','loreOptions','systems','chatAppearance'];
export const WORLD_SYSTEM_KEYS = ['enableIncantation','npcIncantation','incantationLanguage','incantationCustomLanguage','enableMissionBoard','enableGroupBoard','enableAuctions','enableMarketplace','enableStoryMemory','enableStoryAgenda','enableQuestObjectives','showSceneTracker','autoTrack','injectState','npcDiaryFrequency'];
const languages = ['auto','en','th','ja','zh','la','custom'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const name = value => typeof value === 'string' && value.trim() && value.length <= 120 ? value.trim() : '';
const chatCache=new WeakMap(),libraryCache=new WeakMap(),emptyLibrary=Object.freeze([]);
export function validateWorldSystems(raw) {
    if (!object(raw)) throw Error('Invalid world system settings.');
    const result = {};
    for (const key of WORLD_SYSTEM_KEYS) if (Object.hasOwn(raw,key)) {
        const value = raw[key];
        if (key === 'incantationLanguage' ? !languages.includes(value)
            : key === 'incantationCustomLanguage' ? typeof value !== 'string' || value.length > 100
            : key === 'npcDiaryFrequency' ? !['off','rare','normal','often'].includes(value)
            : typeof value !== 'boolean') throw Error(`Invalid world setting: ${key}`);
        result[key] = value;
    }
    return result;
}
export function validateCurrencyPreset(raw) {
    if (!object(raw) || !name(raw.name)) throw Error('Enter a currency name (1–120 characters).');
    return {name:name(raw.name),scheme:validateCurrencyScheme(raw.scheme)};
}
export function validateTrainingPreset(raw) {
    if (!object(raw) || !Array.isArray(raw.definitions) || raw.definitions.length > 32 || !Array.isArray(raw.hidden)) throw Error('Invalid training preset.');
    const next = normalizeStatTraining(raw);
    if (next.definitions.length !== raw.definitions.length) throw Error('Every stat needs a unique ID, name, meaning and practice methods.');
    for (const d of raw.definitions) if (![d.min,d.max,d.initial,d.gain].every(Number.isFinite) || d.max < d.min || d.initial < d.min || d.initial > d.max || d.gain <= 0) throw Error('Invalid stat bounds or gain.');
    return next;
}
export function validatePresetConfig(raw) {
    if (!object(raw)) throw Error('Invalid preset configuration.');
    const result = {};
    for (const key of PRESET_COMPONENTS) if (Object.hasOwn(raw,key)) {
        if (key === 'powerPreset') result[key] = validatePowerConfig(raw[key]);
        if (key === 'forgePreset') result[key] = validateForgePreset(raw[key]);
        if (key === 'currencyPreset') result[key] = validateCurrencyPreset(raw[key]);
        if (key === 'trainingPreset') result[key] = validateTrainingPreset(raw[key]);
        if (key === 'loreOptions') {const settings={};writeLoreOptions(settings,raw[key],'preset','preset');result[key]=settings.loreCharacterOptions.preset;}
        if (key === 'systems') result[key] = validateWorldSystems(raw[key]);
        if (key === 'chatAppearance') result[key] = validateChatAppearance(raw[key]);
    }
    if (!Object.keys(result).length) throw Error('The preset has no supported configuration.');
    return result;
}
export function readChatPreset(metadata) {
    const stored = metadata?.[CHAT_PRESET_KEY];
    if (stored?.version !== 1) return {};
    if(chatCache.has(stored))return chatCache.get(stored);
    const result = {};
    // Corrupt components cannot disable the remaining intact components.
    for (const key of PRESET_COMPONENTS) if (Object.hasOwn(stored.config||{},key)) try {Object.assign(result,validatePresetConfig({[key]:stored.config[key]}));} catch {}
    chatCache.set(stored,result);return result;
}
export function applyPresetState(state, config) {
    const validated = validatePresetConfig(config);
    let next = structuredClone(state);
    if (validated.currencyPreset) next = reconfigureCurrencyWallet(next,validated.currencyPreset.scheme,validated.currencyPreset.name);
    if (validated.trainingPreset) {
        next.player.customStats ||= {};
        for (const d of validated.trainingPreset.definitions) {
            const value = next.player.customStats[d.id];
            if (typeof value === 'number' && (value < d.min || value > d.max)) throw Error(`Existing ${d.name} value is outside this preset's range. Adjust the preset bounds first.`);
            if (value === undefined) next.player.customStats[d.id] = d.initial;
        }
        next.statTraining = validated.trainingPreset;
    }
    return next;
}
export function currentCurrencyPreset(state, legacyIconSet='stack') {
    const wallet=state.progression.currency,scheme=currencyScheme(wallet);
    if(!wallet.scheme&&MONEY_ICON_SETS.includes(legacyIconSet))for(const unit of scheme.units)unit.iconSet=legacyIconSet;
    return {name:wallet.name || 'Currency',scheme};
}
export function exportWorldPreset(config, label) {
    if (!name(label)) throw Error('Enter a preset name (1–120 characters).');
    return JSON.stringify({format:'roleforge-world-preset',version:1,name:name(label),config:validatePresetConfig(config)},null,2);
}
export function importWorldPreset(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > PRESET_FILE_LIMIT) throw Error('Preset files must be at most 1 MB.');
    let data;try {data=JSON.parse(text.replace(/^\uFEFF/u,''));} catch {throw Error('Invalid preset JSON.');}
    if (data?.format === 'roleforge-power-preset') {const powerPreset=importPowerPreset(text);return {name:powerPreset.name,config:{powerPreset}};}
    if (data?.format === 'roleforge-character-forge-preset') {const forgePreset=importForgePreset(text);return {name:forgePreset.name,config:{forgePreset}};}
    if (data?.format === 'roleforge-currency-preset' && data.version === 1) {const currencyPreset=validateCurrencyPreset(data.preset);return {name:currencyPreset.name,config:{currencyPreset}};}
    if (data?.format !== 'roleforge-world-preset' || data.version !== 1 || !name(data.name)) throw Error('Unsupported RoleForge preset file.');
    return {name:name(data.name),config:validatePresetConfig(data.config)};
}
export function presetLibrary(settings) {
    const raw=settings?.[PRESET_LIBRARY_KEY];
    if(!Array.isArray(raw))return emptyLibrary;
    if(libraryCache.has(raw))return libraryCache.get(raw);
    const ids=new Set();
    const result=raw.slice(0,100).flatMap(record=>{try {
        if (typeof record?.id!=='string'||!/^[a-z0-9_-]{1,80}$/iu.test(record.id)||ids.has(record.id)||!name(record.name))return [];
        ids.add(record.id);
        return [{id:record.id,name:name(record.name),config:validatePresetConfig(record.config)}];
    } catch {return [];}});
    libraryCache.set(raw,result);return result;
}
export function saveLibraryPreset(records, raw, id = '') {
    const config=validatePresetConfig(raw.config),label=name(raw.name);
    if (!label) throw Error('Enter a preset name (1–120 characters).');
    if (records.some(r=>r.id!==id&&r.name.toLocaleLowerCase()===label.toLocaleLowerCase())) throw Error('A preset with this name already exists.');
    if (id && !records.some(r=>r.id===id)) throw Error('This preset no longer exists.');
    if (!id && records.length >= 100) throw Error('The library supports up to 100 presets.');
    const record={id:id||`preset_${globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)}`,name:label,config};
    const next=id?records.map(r=>r.id===id?record:r):[...records,record];
    if (new TextEncoder().encode(JSON.stringify(next)).length > 2*PRESET_FILE_LIMIT) throw Error('The preset library is limited to 2 MB. Export unused presets before removing them.');
    return next;
}
